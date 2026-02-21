import { GoogleGenAI, Type, FunctionDeclaration, Tool, ThinkingLevel, FunctionCallingConfigMode } from "@google/genai";
import { searchCasesRaw, getCaseDetails, getCaseUrl, SearchResult } from "@/lib/pinecone";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPTS, DIRECT_PROMPTS, INSURANCE_COURTS } from "@/lib/prompts";

// Load ordinance structures for getOrdinanceSection tool
import { getOrdinanceSectionFromDB, getOrdinanceSections } from "@/lib/supabase/ordinances";


const searchCasesDeclaration: FunctionDeclaration = {
  name: "searchCases",
  description:
    "Search Hong Kong legal cases using hybrid search (semantic + keyword matching). Returns case citations with relevant text snippets.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Search query for finding relevant cases",
      },
      numResults: {
        type: Type.NUMBER,
        description: "Number of results to return (default 15, max 30)",
      },
      court: {
        type: Type.STRING,
        description:
          "Filter by court: hkcfa (Court of Final Appeal), ukpc (UK Privy Council), hkca (Court of Appeal), hkcfi (Court of First Instance), hkct (Competition Tribunal), hkdc (District Court), hkfc (Family Court), hkmagc (Magistrates' Courts), hkcrc (Coroner's Court), hklat (Labour Tribunal), hkldt (Lands Tribunal), hkoat (Obscene Articles Tribunal), hksct (Small Claims Tribunal)",
      },
      language: {
        type: Type.STRING,
        description:
          "Filter by language: EN (English) or TC (Traditional Chinese)",
      },
      yearFrom: {
        type: Type.NUMBER,
        description: "Filter cases from this year onwards",
      },
      yearTo: {
        type: Type.NUMBER,
        description: "Filter cases up to this year",
      },
    },
    required: ["query"],
  },
};

const getCaseDetailsDeclaration: FunctionDeclaration = {
  name: "getCaseDetails",
  description:
    "Get the full text of a specific case by its neutral citation. Use this to read the complete judgment before quoting or analyzing.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      citation: {
        type: Type.STRING,
        description: "The neutral citation, e.g., '[2024] HKCA 620'",
      },
    },
    required: ["citation"],
  },
};

const getOrdinanceSectionDeclaration: FunctionDeclaration = {
  name: "getOrdinanceSection",
  description: `Get the full statutory text (English and Chinese) of a Hong Kong ordinance section. Use this when the user asks about a specific section, wants the exact wording of a provision, or is viewing an ordinance page and asks about a section.

Available ordinances (22 total):
Cap. 6 (Bankruptcy 破產條例), Cap. 7 (Landlord and Tenant 業主與租客(綜合)條例), Cap. 26 (Sale of Goods 貨品售賣條例), Cap. 32 (Companies Winding Up 公司(清盤及雜項條文)條例), Cap. 57 (Employment 僱傭條例), Cap. 112 (Inland Revenue 稅務條例), Cap. 115 (Immigration 入境條例), Cap. 128 (Land Registration 土地註冊條例), Cap. 179 (Matrimonial Causes 婚姻訴訟條例), Cap. 201 (Prevention of Bribery 防止賄賂條例), Cap. 210 (Theft 盜竊罪條例), Cap. 221 (Criminal Procedure 刑事訴訟程序條例), Cap. 282 (Employees' Compensation 僱員補償條例), Cap. 344 (Building Management 建築物管理條例), Cap. 374 (Road Traffic 道路交通條例), Cap. 455 (Organized and Serious Crimes 有組織及嚴重罪行條例), Cap. 486 (Personal Data Privacy 個人資料(私隱)條例), Cap. 509 (Occupational Safety and Health 職業安全及健康條例), Cap. 528 (Copyright 版權條例), Cap. 553 (Electronic Transactions 電子交易條例), Cap. 559 (Trade Marks 商標條例), Cap. 571 (Securities and Futures 證券及期貨條例)

Always use this tool when the user asks for the text of a section from any of these ordinances. If the section is not found, the tool will return a list of available sections.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      cap: {
        type: Type.NUMBER,
        description: "The ordinance chapter number (e.g., 6, 7, 26, 32, 57, 112, 115, 128, 179, 201, 210, 221, 282, 344, 374, 455, 486, 509, 528, 553, 559, 571)",
      },
      section: {
        type: Type.STRING,
        description: "The section number, e.g., '4', '9', '31B', '6A'",
      },
    },
    required: ["cap", "section"],
  },
};

const searchOnlyTools: Tool[] = [
  { functionDeclarations: [searchCasesDeclaration, getOrdinanceSectionDeclaration] },
];

const readOnlyTools: Tool[] = [
  { functionDeclarations: [getCaseDetailsDeclaration, getOrdinanceSectionDeclaration] },
];

// Phase types: which tools are available at each iteration
// "filter" has no tools — Gemini just sees accumulated chunks and picks cases
type Phase = "search" | "filter" | "read" | "answer";

// Phase schedules per mode
// Pipeline: search wide → filter smart → read deep → answer
const PHASE_SCHEDULES: Record<string, Phase[]> = {
  // Fast (4 phases): search → filter → read → answer
  fast: ["search", "filter", "read", "answer"],
  // Normal (6 phases): search → search → filter → read → read → answer
  normal: ["search", "search", "filter", "read", "read", "answer"],
  // Deep (8 phases): search → search → filter → read → read → read → read → answer
  deep: ["search", "search", "filter", "read", "read", "read", "read", "answer"],
};

function getToolsForPhase(phase: Phase): Tool[] | undefined {
  switch (phase) {
    case "search": return searchOnlyTools;
    case "read": return readOnlyTools;
    case "filter": return undefined; // No tools — Gemini just picks cases
    case "answer": return undefined; // No tools — force final answer
  }
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Execute a search and return raw chunk-level results
async function executeSearch(
  args: Record<string, unknown>,
  caseLanguageOverride?: "EN" | "TC",
  allowedCourts?: string[]
): Promise<{ results: SearchResult[]; formattedResult: string; urls: Record<string, string> }> {
  const typedArgs = args as {
    query: string;
    numResults?: number;
    court?: string;
    language?: "EN" | "TC";
    yearFrom?: number;
    yearTo?: number;
  };

  const effectiveLanguage = caseLanguageOverride || typedArgs.language;

  const searchResults = await searchCasesRaw(typedArgs.query, {
    numResults: typedArgs.numResults || 15,
    court: typedArgs.court,
    language: effectiveLanguage,
    yearFrom: typedArgs.yearFrom,
    yearTo: typedArgs.yearTo,
    allowedCourts,
  });

  const urls: Record<string, string> = {};
  const formattedResult = searchResults
    .map((r) => {
      const url = getCaseUrl(r.citation, r.language, r.court, r.year);
      urls[r.citation] = url;
      return `**${r.citation}** (${r.court.toUpperCase()}, ${r.year}, ${r.language}) [chunk ${r.chunkIndex}]
Score: ${r.score.toFixed(4)}
URL: ${url}
Snippet: ${r.text.substring(0, 500)}${r.text.length > 500 ? "..." : ""}`;
    })
    .join("\n\n---\n\n");

  return {
    results: searchResults,
    formattedResult: formattedResult || "No cases found matching the search criteria.",
    urls,
  };
}

// Execute getCaseDetails with caching to prevent duplicate reads
async function executeRead(
  citation: string,
  caseReadCache: Map<string, string>
): Promise<string> {
  if (caseReadCache.has(citation)) {
    return caseReadCache.get(citation)!;
  }
  const result = await getCaseDetails(citation);
  caseReadCache.set(citation, result);
  return result;
}

// Generate follow-up questions based on conversation context
async function generateFollowUpQuestions(
  ai: GoogleGenAI,
  conversationContents: Array<{ role: string; parts: Array<unknown> }>,
  userMessage: string
): Promise<string[]> {
  try {
    // Extract the last assistant message text
    const lastModelMessage = conversationContents
      .reverse()
      .find(msg => {
        const parts = msg.parts as Array<{ text?: string }>;
        return msg.role === "model" && parts.some(p => p.text && p.text.length > 50);
      });

    if (!lastModelMessage) {
      console.log("[follow-up] No model message found");
      return [];
    }

    const parts = lastModelMessage.parts as Array<{ text?: string }>;
    const answerText = parts.find(p => p.text)?.text || "";

    // Use function calling for structured output
    const suggestQuestionsTool: Tool = {
      functionDeclarations: [{
        name: "suggestFollowUpQuestions",
        description: "Suggest follow-up questions",
        parameters: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["questions"],
        },
      }],
    };

    const followUpPrompt = `Legal answer: "${answerText.slice(0, 500)}..."\n\nYou MUST call the suggestFollowUpQuestions function with 2-3 follow-up questions. Do not write text - only call the function.`;

    const followUpResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: "user", parts: [{ text: followUpPrompt }] },
      ],
      config: {
        temperature: 0.7,
        tools: [suggestQuestionsTool],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
      },
    });

    // Extract function call result
    const candidate = followUpResponse.candidates?.[0];
    const functionCall = candidate?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;

    console.log("[follow-up] Function call:", JSON.stringify(functionCall));

    if (functionCall?.name === "suggestFollowUpQuestions" && (functionCall.args as any)?.questions) {
      const questions = ((functionCall.args as any).questions as string[])
        .filter((q: string) => q && q.length > 5)
        .slice(0, 3);
      console.log("[follow-up] Parsed questions:", questions);
      return questions;
    }

    console.log("[follow-up] No function call found");
    return [];
  } catch (error) {
    console.error("[follow-up] Error generating questions:", error);
    return [];
  }
}

// Execute getOrdinanceSection to fetch statutory text
async function executeGetOrdinanceSection(cap: number, section: string): Promise<string> {
  const normalizedSection = section.replace(/^s\.?\s*/i, "");

  try {
    const sectionData = await getOrdinanceSectionFromDB(cap.toString(), normalizedSection);

    if (!sectionData) {
      const availableSections = await getOrdinanceSections(cap.toString());
      if (availableSections.length === 0) {
        return `Ordinance Cap. ${cap} not found in database.`;
      }
      return `Section ${section} not found in Cap. ${cap}. Available sections: ${availableSections.map(s => "s." + s).join(", ")}`;
    }

    return `**Cap. ${cap} ${sectionData.section_identifier}: ${sectionData.title_en}**\n\nEnglish text:\n${sectionData.text_en}\n\nChinese text (中文文本):\n${sectionData.text_zh}`;
  } catch (error) {
    return `Error retrieving section: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

export async function POST(request: Request) {
  try {
    // Auth check - allow anonymous users (for ordinance landing pages)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Only enforce message limits for authenticated users
    if (user) {
      // Atomically check limit and increment message count
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc("increment_message_count", { uid: user.id });

      if (rpcError) {
        console.error("RPC error:", rpcError);
        return Response.json({ error: "Failed to check usage" }, { status: 500 });
      }

      if (!rpcResult?.allowed) {
        return Response.json(
          { error: "limit_reached", plan: rpcResult?.plan || "free", count: rpcResult?.count || 0, limit: rpcResult?.limit || 0 },
          { status: 403 }
        );
      }
    }
    // Anonymous users can proceed without message counting (limited by frontend)

    const { message, history, mode = "normal", outputLanguage = "EN", userRole = "lawyer", caseLanguage } = (await request.json()) as {
      message: string;
      history: Message[];
      mode?: "fast" | "normal" | "deep";
      outputLanguage?: "EN" | "TC";
      userRole?: "insurance" | "lawyer";
      caseLanguage?: "EN" | "TC";
    };

    console.log("[chat] outputLanguage:", outputLanguage, "userRole:", userRole, "caseLanguage:", caseLanguage, "mode:", mode);
    const systemPrompt = SYSTEM_PROMPTS[userRole]?.[outputLanguage] || SYSTEM_PROMPTS.lawyer.EN;
    const allowedCourts = userRole === "insurance" ? INSURANCE_COURTS : undefined;

    const thinkingLevelConfig: Record<string, ThinkingLevel> = {
      fast: ThinkingLevel.LOW,
      normal: ThinkingLevel.MEDIUM,
      deep: ThinkingLevel.HIGH,
    };
    const thinkingLevel = thinkingLevelConfig[mode] || ThinkingLevel.MEDIUM;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    // Build conversation contents from history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conversationContents: any[] = [];

    for (const msg of history) {
      conversationContents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }

    // Add the new user message
    conversationContents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
          );
        };

        const sendStage = (stage: string, description: string) => {
          sendEvent("stage", { stage, description });
        };

        try {
          // ────────────────────────────────────────────────────────────
          // STEP 0: TRIAGE — Does this query need research or direct answer?
          // ────────────────────────────────────────────────────────────
          sendStage("understanding", "Understanding your question...");

          const triageResponse = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: conversationContents,
            config: {
              systemInstruction: `You are a routing classifier for a Hong Kong legal research tool. Given the user's message (and any conversation history), determine whether the user needs to SEARCH the case law database, or whether the question can be answered DIRECTLY without research.

Reply with EXACTLY one word:
- SEARCH — if the user wants to find specific cases, compare quantum/compensation awards, or needs case law evidence
- DIRECT — if the question is general legal knowledge (e.g., "what is PSLA?"), a follow-up on previous conversation (e.g., drafting a letter, summarizing), or does not require searching for specific cases`,
              // Note: gemini-2.0-flash does not support thinkingConfig
            },
          });

          const triageText = triageResponse.text?.trim().toUpperCase() || "SEARCH";
          const needsResearch = triageText !== "DIRECT";
          console.log("[chat] triage:", triageText, "needsResearch:", needsResearch);

          // ────────────────────────────────────────────────────────────
          // DIRECT PATH: No research needed — just answer
          // ────────────────────────────────────────────────────────────
          if (!needsResearch) {
            sendStage("responding", "Generating response...");

            const directPrompt = DIRECT_PROMPTS[userRole]?.[outputLanguage] || DIRECT_PROMPTS.lawyer.EN;
            const directTools: Tool[] = [{ functionDeclarations: [getOrdinanceSectionDeclaration] }];

            const directResponse = await ai.models.generateContentStream({
              model: "gemini-3-flash-preview",
              contents: conversationContents,
              config: {
                systemInstruction: directPrompt,
                tools: directTools,
                thinkingConfig: { thinkingLevel, includeThoughts: true },
              },
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const directParts: any[] = [];
            const directOrdinanceCalls: Array<{ cap: number; section: string }> = [];

            for await (const chunk of directResponse) {
              const candidate = (chunk as { candidates?: Array<{ content?: { parts?: Array<unknown> } }> }).candidates?.[0];
              if (!candidate?.content?.parts) continue;

              for (const part of candidate.content.parts) {
                directParts.push(part);
                const typedPart = part as { thought?: boolean; text?: string; functionCall?: { name: string; args: Record<string, unknown> } };

                if (typedPart.text && !typedPart.thought) {
                  sendEvent("text", typedPart.text);
                } else if (typedPart.thought && typedPart.text) {
                  sendEvent("thinking", { type: "thought", content: typedPart.text, iteration: 1 });
                } else if (typedPart.functionCall?.name === "getOrdinanceSection") {
                  const cap = typedPart.functionCall.args.cap as number;
                  const section = typedPart.functionCall.args.section as string;
                  if (cap && section) {
                    directOrdinanceCalls.push({ cap, section });
                    sendEvent("tool_call", { name: "getOrdinanceSection", args: { cap, section }, iteration: 1 });
                  }
                }
              }
            }

            // If ordinance calls were made, execute them and continue
            if (directOrdinanceCalls.length > 0) {
              conversationContents.push({ role: "model", parts: directParts });

              const ordinanceResponseParts: Array<{ functionResponse: { name: string; response: { result: string } } }> = [];
              for (const { cap, section } of directOrdinanceCalls) {
                try {
                  const sectionText = await executeGetOrdinanceSection(cap, section);
                  ordinanceResponseParts.push({
                    functionResponse: { name: "getOrdinanceSection", response: { result: sectionText } },
                  });
                  sendEvent("tool_result", { name: "getOrdinanceSection", summary: `Retrieved Cap. ${cap} s.${section}`, iteration: 1 });
                } catch (error) {
                  const errorMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
                  ordinanceResponseParts.push({
                    functionResponse: { name: "getOrdinanceSection", response: { result: errorMsg } },
                  });
                }
              }

              conversationContents.push({ role: "user", parts: ordinanceResponseParts });

              // Generate final response with ordinance context
              const finalDirectResponse = await ai.models.generateContentStream({
                model: "gemini-3-flash-preview",
                contents: conversationContents,
                config: {
                  systemInstruction: directPrompt,
                  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW, includeThoughts: true },
                },
              });

              for await (const chunk of finalDirectResponse) {
                const candidate = (chunk as { candidates?: Array<{ content?: { parts?: Array<unknown> } }> }).candidates?.[0];
                if (!candidate?.content?.parts) continue;

                for (const part of candidate.content.parts) {
                  const typedPart = part as { thought?: boolean; text?: string };
                  if (typedPart.text && !typedPart.thought) {
                    sendEvent("text", typedPart.text);
                  } else if (typedPart.thought && typedPart.text) {
                    sendEvent("thinking", { type: "thought", content: typedPart.text, iteration: 1 });
                  }
                }
              }
            }

            sendEvent("done", { iterations: 1 });

            // Generate follow-up questions AFTER sending done
            const followUpQuestions = await generateFollowUpQuestions(ai, conversationContents, message);
            // Always send the event, even if empty, to clear loading state
            sendEvent("follow_up_questions", followUpQuestions);

            return; // Don't close here - let finally block handle it
          }

          // ────────────────────────────────────────────────────────────
          // RESEARCH PATH: search → filter → read → answer
          // ────────────────────────────────────────────────────────────
          const phases = PHASE_SCHEDULES[mode] || PHASE_SCHEDULES.normal;
          let iteration = 0;
          let searchCount = 0;
          let readCount = 0;

          // Accumulated state across all search phases
          // Key: "citation|chunkIndex" to deduplicate identical chunks across queries
          const allChunks: Map<string, { result: SearchResult; url: string }> = new Map();
          const caseUrlMap: Record<string, string> = {};
          const casesRead = new Set<string>();
          const caseReadCache = new Map<string, string>();
          // Citations selected by filter phase for reading
          let filterSelectedCitations: string[] = [];
          // Track queries across search rounds so later rounds know what was already searched
          const previousQueries: string[] = [];

          // ── SEARCH PHASES ──
          // Front-load all searching. Gemini generates queries, we execute them.
          for (; iteration < phases.length; iteration++) {
            const phase = phases[iteration];
            if (phase !== "search") break;

            const phaseNum = iteration + 1;
            sendStage("searching", `Search round ${searchCount + 1}...`);
            sendEvent("thinking", {
              type: "reasoning",
              content: `Phase: SEARCH (iteration ${phaseNum}/${phases.length})`,
              iteration: phaseNum,
            });

            // Build search guidance
            let searchGuidance = "";
            if (iteration > 0 && allChunks.size > 0) {
              // Second+ search round: tell Gemini what was already searched and found
              const uniqueCitations = new Set<string>();
              for (const { result } of allChunks.values()) {
                uniqueCitations.add(result.citation);
              }
              const prevQueryList = previousQueries.map((q, i) => `  ${i + 1}. "${q}"`).join("\n");
              searchGuidance = `\n\nYou have already run ${searchCount} searches and found ${uniqueCitations.size} unique cases.\n\nPrevious queries:\n${prevQueryList}\n\nDo NOT repeat similar queries. Search from DIFFERENT angles — try different legal concepts, broader/narrower terms, or different injury comparisons.`;
            }

            // Ask Gemini to generate search queries
            const searchContents = [...conversationContents];
            if (searchGuidance) {
              searchContents.push({ role: "user", parts: [{ text: searchGuidance }] });
            }

            const searchResponse = await ai.models.generateContentStream({
              model: "gemini-3-flash-preview",
              contents: searchContents,
              config: {
                systemInstruction: systemPrompt,
                tools: searchOnlyTools,
                thinkingConfig: { thinkingLevel, includeThoughts: true },
              },
            });

            // Process search response — collect function calls
            const searchFunctionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const searchModelParts: any[] = [];

            for await (const chunk of searchResponse) {
              const candidate = (chunk as { candidates?: Array<{ content?: { parts?: Array<unknown> } }> }).candidates?.[0];
              if (!candidate?.content?.parts) continue;

              for (const part of candidate.content.parts) {
                searchModelParts.push(part);
                const typedPart = part as { thought?: boolean; text?: string; functionCall?: { name: string; args: Record<string, unknown> } };

                if (typedPart.thought && typedPart.text) {
                  sendEvent("thinking", { type: "thought", content: typedPart.text, iteration: phaseNum });
                  const thought = typedPart.text.toLowerCase();
                  if (thought.includes("search") || thought.includes("find")) sendStage("strategizing", "Creating search strategy...");
                } else if (typedPart.functionCall) {
                  searchFunctionCalls.push({ name: typedPart.functionCall.name, args: typedPart.functionCall.args });

                  if (typedPart.functionCall.name === "searchCases") {
                    const query = (typedPart.functionCall.args.query as string) || "";
                    const filters: string[] = [];
                    if (caseLanguage) filters.push(`lang=${caseLanguage}`);
                    else if (typedPart.functionCall.args.language) filters.push(`lang=${typedPart.functionCall.args.language}`);
                    if (typedPart.functionCall.args.court) filters.push(`court=${typedPart.functionCall.args.court}`);
                    const filterStr = filters.length > 0 ? ` [${filters.join(", ")}]` : "";
                    sendStage("searching", `Searching: "${query.substring(0, 50)}${query.length > 50 ? "..." : ""}"${filterStr}`);
                  }

                  const displayArgs = { ...typedPart.functionCall.args };
                  if (typedPart.functionCall.name === "searchCases" && caseLanguage) {
                    displayArgs.language = caseLanguage;
                  }
                  sendEvent("tool_call", { name: typedPart.functionCall.name, args: displayArgs, iteration: phaseNum });
                }
              }
            }

            // Track queries for next round's guidance
            for (const call of searchFunctionCalls) {
              if (call.name === "searchCases" && call.args.query) {
                previousQueries.push(call.args.query as string);
              }
            }

            // Execute all tool calls
            // First add model's function calls to conversation
            if (searchFunctionCalls.length > 0) {
              conversationContents.push({ role: "model", parts: searchModelParts });
            }

            const toolResponseParts: Array<{ functionResponse: { name: string; response: { result: string } } }> = [];

            for (const call of searchFunctionCalls) {
              if (call.name === "searchCases") {
                searchCount++;
                try {
                  const { results, formattedResult, urls } = await executeSearch(call.args, caseLanguage, allowedCourts);

                  // Merge URLs
                  Object.assign(caseUrlMap, urls);
                  sendEvent("case_urls", urls);

                  // Accumulate unique chunks (deduplicate identical chunks, keep different chunks from same case)
                  for (const r of results) {
                    const chunkKey = `${r.citation}|${r.chunkIndex}`;
                    if (!allChunks.has(chunkKey)) {
                      allChunks.set(chunkKey, { result: r, url: urls[r.citation] || "" });
                    }
                  }

                  // Add formatted result to tool responses for Gemini to see
                  toolResponseParts.push({
                    functionResponse: { name: "searchCases", response: { result: formattedResult } },
                  });

                  sendEvent("tool_result", { name: "searchCases", summary: `Found ${results.length} chunks`, iteration: phaseNum });
                } catch (error) {
                  const errorMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
                  toolResponseParts.push({
                    functionResponse: { name: "searchCases", response: { result: errorMsg } },
                  });
                  sendEvent("tool_result", { name: "searchCases", summary: errorMsg, iteration: phaseNum });
                }
              } else if (call.name === "getOrdinanceSection") {
                try {
                  const cap = call.args.cap as number;
                  const section = call.args.section as string;
                  const sectionText = await executeGetOrdinanceSection(cap, section);

                  toolResponseParts.push({
                    functionResponse: { name: "getOrdinanceSection", response: { result: sectionText } },
                  });

                  sendEvent("tool_result", { name: "getOrdinanceSection", summary: `Retrieved Cap. ${cap} s.${section}`, iteration: phaseNum });
                } catch (error) {
                  const errorMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
                  toolResponseParts.push({
                    functionResponse: { name: "getOrdinanceSection", response: { result: errorMsg } },
                  });
                  sendEvent("tool_result", { name: "getOrdinanceSection", summary: errorMsg, iteration: phaseNum });
                }
              }
            }

            // Add tool responses to conversation if any tools were called
            if (toolResponseParts.length > 0) {
              conversationContents.push({ role: "user", parts: toolResponseParts });
            }
          }

          // ── FILTER PHASE ──
          // Gemini sees ALL accumulated chunks and picks which cases to read
          if (iteration < phases.length && phases[iteration] === "filter") {
            const phaseNum = iteration + 1;
            sendStage("analyzing", "Filtering cases for relevance...");
            sendEvent("thinking", {
              type: "reasoning",
              content: `Phase: FILTER (iteration ${phaseNum}/${phases.length}) — ${allChunks.size} chunks from ${new Set([...allChunks.values()].map(c => c.result.citation)).size} cases`,
              iteration: phaseNum,
            });

            // Build the chunk summary for Gemini
            const chunkSummary = [...allChunks.values()]
              .sort((a, b) => b.result.score - a.result.score)
              .map(({ result, url }) =>
                `**${result.citation}** (${result.court.toUpperCase()}, ${result.year}) [chunk ${result.chunkIndex}]\nURL: ${url}\nSnippet: ${result.text.substring(0, 400)}${result.text.length > 400 ? "..." : ""}`
              )
              .join("\n\n---\n\n");

            // Count how many reads we have available
            const readPhasesRemaining = phases.slice(iteration + 1).filter(p => p === "read").length;
            const maxReads = Math.max(readPhasesRemaining * 3, 3); // ~3 cases per read phase

            const filterPrompt = `You have searched for cases and found the following ${allChunks.size} chunks from ${new Set([...allChunks.values()].map(c => c.result.citation)).size} unique cases.

Review ALL chunks below and select the TOP ${maxReads} most relevant cases to read in full. Consider:
- How closely the case matches the user's question
- Injury type, severity, and circumstances similarity
- Whether the chunk mentions specific quantum figures, legal principles, or relevant facts

Reply with ONLY a numbered list of neutral citations to read, most relevant first. Example:
1. [2024] HKDC 620
2. [2023] HKCFI 1234
3. [2022] HKCA 456

CHUNKS:

${chunkSummary}`;

            const filterContents = [...conversationContents, { role: "user", parts: [{ text: filterPrompt }] }];

            const filterResponse = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: filterContents,
              config: {
                systemInstruction: systemPrompt,
                thinkingConfig: { thinkingLevel, includeThoughts: true },
              },
            });

            // Parse the citation list from Gemini's response
            const filterText = filterResponse.text || "";

            // Send thinking from filter
            const filterCandidates = filterResponse.candidates;
            if (filterCandidates?.[0]?.content?.parts) {
              for (const part of filterCandidates[0].content.parts) {
                const typedPart = part as { thought?: boolean; text?: string };
                if (typedPart.thought && typedPart.text) {
                  sendEvent("thinking", { type: "thought", content: typedPart.text, iteration: phaseNum });
                }
              }
            }

            // Extract citations from numbered list (e.g., "1. [2024] HKDC 620")
            const citationRegex = /\[(\d{4})\]\s*(\w+)\s+(?:No\.\s*)?(\d+)/g;
            let match;
            const selectedCitations: string[] = [];
            while ((match = citationRegex.exec(filterText)) !== null) {
              const citation = `[${match[1]}] ${match[2]} ${match[3]}`;
              // Only include if we actually have this citation in our search results
              if (caseUrlMap[citation] && !selectedCitations.includes(citation)) {
                selectedCitations.push(citation);
              }
            }

            filterSelectedCitations = selectedCitations.slice(0, maxReads);

            sendEvent("thinking", {
              type: "reasoning",
              content: `Filter selected ${filterSelectedCitations.length} cases to read: ${filterSelectedCitations.join(", ")}`,
              iteration: phaseNum,
            });

            iteration++;
          }

          // ── READ PHASES ──
          // Read the cases selected by the filter phase
          let readQueueIndex = 0;
          for (; iteration < phases.length; iteration++) {
            const phase = phases[iteration];
            if (phase !== "read") break;

            const phaseNum = iteration + 1;

            // Determine which cases to read this round
            const casesToReadThisRound: string[] = [];
            while (readQueueIndex < filterSelectedCitations.length && casesToReadThisRound.length < 3) {
              const citation = filterSelectedCitations[readQueueIndex];
              readQueueIndex++;
              if (!casesRead.has(citation)) {
                casesToReadThisRound.push(citation);
              }
            }

            if (casesToReadThisRound.length === 0) {
              // No more cases to read — skip remaining read phases
              sendEvent("thinking", {
                type: "reasoning",
                content: `Phase: READ (iteration ${phaseNum}/${phases.length}) — No more unread cases, skipping.`,
                iteration: phaseNum,
              });
              continue;
            }

            sendStage("reading", `Reading ${casesToReadThisRound.length} cases...`);
            sendEvent("thinking", {
              type: "reasoning",
              content: `Phase: READ (iteration ${phaseNum}/${phases.length}) — Reading: ${casesToReadThisRound.join(", ")}`,
              iteration: phaseNum,
            });

            // Read each case and add to conversation as tool results
            // We simulate tool calls for getCaseDetails so the conversation history
            // looks natural to Gemini
            const readModelParts = casesToReadThisRound.map(citation => ({
              functionCall: { name: "getCaseDetails", args: { citation } },
            }));

            conversationContents.push({ role: "model", parts: readModelParts });

            const readResponseParts: Array<{ functionResponse: { name: string; response: { result: string } } }> = [];

            for (const citation of casesToReadThisRound) {
              sendStage("retrieving", `Retrieving: ${citation}`);
              sendEvent("tool_call", { name: "getCaseDetails", args: { citation }, iteration: phaseNum });

              try {
                const caseText = await executeRead(citation, caseReadCache);
                casesRead.add(citation);
                readCount++;

                readResponseParts.push({
                  functionResponse: { name: "getCaseDetails", response: { result: caseText } },
                });

                sendEvent("tool_result", { name: "getCaseDetails", summary: `Retrieved full text of ${citation}`, iteration: phaseNum });
              } catch (error) {
                const errorMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
                readResponseParts.push({
                  functionResponse: { name: "getCaseDetails", response: { result: errorMsg } },
                });
                sendEvent("tool_result", { name: "getCaseDetails", summary: errorMsg, iteration: phaseNum });
              }
            }

            conversationContents.push({ role: "user", parts: readResponseParts });

            // Have Gemini process the read results (to absorb the case content)
            const readGuidance = readQueueIndex < filterSelectedCitations.length
              ? `You have read ${casesRead.size} cases so far. More cases will be read in the next round. For now, analyze what you've read and note key findings.`
              : `You have now read all ${casesRead.size} selected cases. Analyze the key findings from all cases.`;

            conversationContents.push({ role: "user", parts: [{ text: readGuidance }] });

            const readResponse = await ai.models.generateContentStream({
              model: "gemini-3-flash-preview",
              contents: conversationContents,
              config: {
                systemInstruction: systemPrompt,
                tools: readOnlyTools,
                thinkingConfig: { thinkingLevel, includeThoughts: true },
              },
            });

            // Process — collect any thoughts or additional read requests
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const readProcessParts: any[] = [];
            const additionalReads: string[] = [];
            const additionalOrdinanceCalls: Array<{ cap: number; section: string }> = [];

            for await (const chunk of readResponse) {
              const candidate = (chunk as { candidates?: Array<{ content?: { parts?: Array<unknown> } }> }).candidates?.[0];
              if (!candidate?.content?.parts) continue;

              for (const part of candidate.content.parts) {
                readProcessParts.push(part);
                const typedPart = part as { thought?: boolean; text?: string; functionCall?: { name: string; args: Record<string, unknown> } };

                if (typedPart.thought && typedPart.text) {
                  sendEvent("thinking", { type: "thought", content: typedPart.text, iteration: phaseNum });
                } else if (typedPart.functionCall?.name === "getCaseDetails") {
                  // Gemini wants to read an additional case — allow it
                  const citation = (typedPart.functionCall.args as { citation?: string })?.citation;
                  if (citation && !casesRead.has(citation) && caseUrlMap[citation]) {
                    additionalReads.push(citation);
                  }
                } else if (typedPart.functionCall?.name === "getOrdinanceSection") {
                  // Gemini wants to reference an ordinance section
                  const cap = typedPart.functionCall.args.cap as number;
                  const section = typedPart.functionCall.args.section as string;
                  if (cap && section) {
                    additionalOrdinanceCalls.push({ cap, section });
                  }
                }
              }
            }

            // Handle any additional tool calls Gemini requested
            if (additionalReads.length > 0 || additionalOrdinanceCalls.length > 0) {
              conversationContents.push({ role: "model", parts: readProcessParts });

              const additionalResponseParts: Array<{ functionResponse: { name: string; response: { result: string } } }> = [];

              // Handle additional case reads
              for (const citation of additionalReads) {
                sendStage("retrieving", `Retrieving: ${citation}`);
                sendEvent("tool_call", { name: "getCaseDetails", args: { citation }, iteration: phaseNum });

                try {
                  const caseText = await executeRead(citation, caseReadCache);
                  casesRead.add(citation);
                  readCount++;
                  additionalResponseParts.push({
                    functionResponse: { name: "getCaseDetails", response: { result: caseText } },
                  });
                  sendEvent("tool_result", { name: "getCaseDetails", summary: `Retrieved full text of ${citation}`, iteration: phaseNum });
                } catch (error) {
                  const errorMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
                  additionalResponseParts.push({
                    functionResponse: { name: "getCaseDetails", response: { result: errorMsg } },
                  });
                }
              }

              // Handle additional ordinance section requests
              for (const { cap, section } of additionalOrdinanceCalls) {
                sendStage("retrieving", `Retrieving: Cap. ${cap} s.${section}`);
                sendEvent("tool_call", { name: "getOrdinanceSection", args: { cap, section }, iteration: phaseNum });

                try {
                  const sectionText = await executeGetOrdinanceSection(cap, section);
                  additionalResponseParts.push({
                    functionResponse: { name: "getOrdinanceSection", response: { result: sectionText } },
                  });
                  sendEvent("tool_result", { name: "getOrdinanceSection", summary: `Retrieved Cap. ${cap} s.${section}`, iteration: phaseNum });
                } catch (error) {
                  const errorMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
                  additionalResponseParts.push({
                    functionResponse: { name: "getOrdinanceSection", response: { result: errorMsg } },
                  });
                }
              }

              conversationContents.push({ role: "user", parts: additionalResponseParts });
            } else {
              // Add model's analysis to conversation
              conversationContents.push({ role: "model", parts: readProcessParts });
            }
          }

          // ── ANSWER PHASE ──
          sendEvent("thinking", {
            type: "reasoning",
            content: `Research complete (${searchCount} searches, ${readCount} reads from ${allChunks.size} chunks). Generating final answer...`,
            iteration: phases.length,
          });

          // Build citation whitelist with explicit URL mapping
          const foundCitations = Object.entries(caseUrlMap);
          const citationList = foundCitations.length > 0
            ? `\n\n## CITATION → URL MAPPING (use EXACTLY these URLs)\n${foundCitations.map(([c, u]) => `${c} → ${u}`).join("\n")}\n\nWhen you mention ANY case above, you MUST link it as [Case Name [YEAR] COURT NUMBER](exact URL from mapping). Do NOT construct URLs yourself. Do NOT use any other domain. Copy the URL exactly as shown.`
            : "\n\nYou did not find any relevant cases during research. Do NOT invent or fabricate any case citations.";

          conversationContents.push({
            role: "user",
            parts: [{
              text: `Please provide your final answer based on the research so far. Do not search anymore.

IMPORTANT RULES FOR YOUR RESPONSE:
1. You must ONLY reference cases that appeared in your search results. Do NOT cite any case from your training data.
2. Do NOT use blockquotes (>) to quote any case you did not read with getCaseDetails. If you only saw a search snippet, do NOT fabricate a quote.
3. **CRITICAL: URLs** — Every case link MUST use the exact URL from the citation mapping below. Do NOT construct your own URLs. Do NOT use domains like law-tech.ai, austlii.edu.au, or any other site. The ONLY valid domain is hklii.hk. Copy the URL exactly from the mapping.
4. If the search results were not relevant, acknowledge this honestly and provide general legal commentary without fabricated citations.${citationList}`,
            }],
          });

          sendStage("responding", "Generating final response...");

          const finalResponse = await ai.models.generateContentStream({
            model: "gemini-3-flash-preview",
            contents: conversationContents,
            config: {
              systemInstruction: systemPrompt,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW, includeThoughts: true },
            },
          });

          for await (const chunk of finalResponse) {
            const candidate = (chunk as { candidates?: Array<{ content?: { parts?: Array<unknown> } }> }).candidates?.[0];
            if (!candidate?.content?.parts) continue;

            for (const part of candidate.content.parts) {
              const typedPart = part as { thought?: boolean; text?: string };
              if (typedPart.text && !typedPart.thought) {
                sendEvent("text", typedPart.text);
              } else if (typedPart.thought && typedPart.text) {
                sendEvent("thinking", { type: "thought", content: typedPart.text, iteration: phases.length });
              }
            }
          }

          sendEvent("done", { iterations: phases.length });

          // Generate follow-up questions AFTER sending done
          const followUpQuestions = await generateFollowUpQuestions(ai, conversationContents, message);
          // Always send the event, even if empty, to clear loading state
          sendEvent("follow_up_questions", followUpQuestions);

        } catch (error) {
          console.error("Stream error:", error);
          sendEvent("error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
