import { createAIAdapter, type AIProvider, type AIMessage, type AIPart, type AIToolDefinition, type NormalizedPart } from "@/lib/ai";
import { searchCasesRaw, getCaseDetails, getCaseUrl, SearchResult } from "@/lib/pinecone";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPTS, DIRECT_PROMPTS, INSURANCE_COURTS } from "@/lib/prompts";
import { getOrdinanceSectionFromDB, getOrdinanceSections } from "@/lib/supabase/ordinances";

// Provider-agnostic tool definitions
const searchCasesTool: AIToolDefinition = {
  name: "searchCases",
  description:
    "Search Hong Kong legal cases using hybrid search (semantic + keyword matching). Returns case citations with relevant text snippets.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query for finding relevant cases" },
      numResults: { type: "number", description: "Number of results to return (default 15, max 30)" },
      court: {
        type: "string",
        description:
          "Filter by court: hkcfa (Court of Final Appeal), ukpc (UK Privy Council), hkca (Court of Appeal), hkcfi (Court of First Instance), hkct (Competition Tribunal), hkdc (District Court), hkfc (Family Court), hkmagc (Magistrates' Courts), hkcrc (Coroner's Court), hklat (Labour Tribunal), hkldt (Lands Tribunal), hkoat (Obscene Articles Tribunal), hksct (Small Claims Tribunal)",
      },
      language: { type: "string", description: "Filter by language: EN (English) or TC (Traditional Chinese)" },
      yearFrom: { type: "number", description: "Filter cases from this year onwards" },
      yearTo: { type: "number", description: "Filter cases up to this year" },
    },
    required: ["query"],
  },
};

const getCaseDetailsTool: AIToolDefinition = {
  name: "getCaseDetails",
  description:
    "Get the full text of a specific case by its neutral citation. Use this to read the complete judgment before quoting or analyzing.",
  parameters: {
    type: "object",
    properties: {
      citation: { type: "string", description: "The neutral citation, e.g., '[2024] HKCA 620'" },
    },
    required: ["citation"],
  },
};

const getOrdinanceSectionTool: AIToolDefinition = {
  name: "getOrdinanceSection",
  description: `Get the full statutory text (English and Chinese) of a Hong Kong ordinance section. Use this when the user asks about a specific section, wants the exact wording of a provision, or is viewing an ordinance page and asks about a section.

Available ordinances (22 total):
Cap. 6 (Bankruptcy 破產條例), Cap. 7 (Landlord and Tenant 業主與租客(綜合)條例), Cap. 26 (Sale of Goods 貨品售賣條例), Cap. 32 (Companies Winding Up 公司(清盤及雜項條文)條例), Cap. 57 (Employment 僱傭條例), Cap. 112 (Inland Revenue 稅務條例), Cap. 115 (Immigration 入境條例), Cap. 128 (Land Registration 土地註冊條例), Cap. 179 (Matrimonial Causes 婚姻訴訟條例), Cap. 201 (Prevention of Bribery 防止賄賂條例), Cap. 210 (Theft 盜竊罪條例), Cap. 221 (Criminal Procedure 刑事訴訟程序條例), Cap. 282 (Employees' Compensation 僱員補償條例), Cap. 344 (Building Management 建築物管理條例), Cap. 374 (Road Traffic 道路交通條例), Cap. 455 (Organized and Serious Crimes 有組織及嚴重罪行條例), Cap. 486 (Personal Data Privacy 個人資料(私隱)條例), Cap. 509 (Occupational Safety and Health 職業安全及健康條例), Cap. 528 (Copyright 版權條例), Cap. 553 (Electronic Transactions 電子交易條例), Cap. 559 (Trade Marks 商標條例), Cap. 571 (Securities and Futures 證券及期貨條例)

Always use this tool when the user asks for the text of a section from any of these ordinances. If the section is not found, the tool will return a list of available sections.`,
  parameters: {
    type: "object",
    properties: {
      cap: {
        type: "number",
        description: "The ordinance chapter number (e.g., 6, 7, 26, 32, 57, 112, 115, 128, 179, 201, 210, 221, 282, 344, 374, 455, 486, 509, 528, 553, 559, 571)",
      },
      section: { type: "string", description: "The section number, e.g., '4', '9', '31B', '6A'" },
    },
    required: ["cap", "section"],
  },
};

const searchOnlyTools: AIToolDefinition[] = [searchCasesTool, getOrdinanceSectionTool];
const readOnlyTools: AIToolDefinition[] = [getCaseDetailsTool, getOrdinanceSectionTool];

// Phase types: which tools are available at each iteration
type Phase = "search" | "filter" | "read" | "answer";

// Phase schedules per mode
const PHASE_SCHEDULES: Record<string, Phase[]> = {
  fast: ["search", "filter", "read", "answer"],
  normal: ["search", "search", "filter", "read", "read", "answer"],
  deep: ["search", "search", "filter", "read", "read", "read", "read", "answer"],
};

function getToolsForPhase(phase: Phase): AIToolDefinition[] | undefined {
  switch (phase) {
    case "search": return searchOnlyTools;
    case "read": return readOnlyTools;
    case "filter": return undefined;
    case "answer": return undefined;
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
  adapter: ReturnType<typeof createAIAdapter>,
  conversationMessages: AIMessage[],
  userMessage: string
): Promise<string[]> {
  try {
    // Extract the last model message text
    const lastModelMessage = [...conversationMessages]
      .reverse()
      .find(msg => msg.role === "model" && msg.parts.some(p => p.type === "text" && p.text.length > 50));

    if (!lastModelMessage) {
      console.log("[follow-up] No model message found");
      return [];
    }

    const answerText = lastModelMessage.parts.find(p => p.type === "text")?.text || "";

    const followUpPrompt = `Legal answer: "${(answerText as string).slice(0, 500)}..."\n\nYou MUST call the suggestFollowUpQuestions function with 2-3 follow-up questions. Do not write text - only call the function.`;

    const suggestTool: AIToolDefinition = {
      name: "suggestFollowUpQuestions",
      description: "Suggest follow-up questions",
      parameters: {
        type: "object",
        properties: {
          questions: { type: "array", items: { type: "string" } },
        },
        required: ["questions"],
      },
    };

    const response = await adapter.generateContent(
      [{ role: "user", parts: [{ type: "text", text: followUpPrompt }] }],
      "pipeline",
      { temperature: 0.7, tools: [suggestTool], toolChoice: "required" }
    );

    const functionCallPart = response.parts.find(p => p.type === "functionCall");
    if (functionCallPart && functionCallPart.name === "suggestFollowUpQuestions" && functionCallPart.args?.questions) {
      const questions = (functionCallPart.args.questions as string[])
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

// Helper: collect all parts from a streaming response
async function collectStreamParts(
  stream: AsyncIterable<NormalizedPart[]>,
  onPart: (part: NormalizedPart) => void
): Promise<AIPart[]> {
  const collectedParts: AIPart[] = [];
  for await (const parts of stream) {
    for (const part of parts) {
      onPart(part);
      // Convert NormalizedPart to AIPart for conversation history
      if (part.type === "text") {
        collectedParts.push({ type: "text", text: part.text! });
      } else if (part.type === "thought") {
        collectedParts.push({ type: "text", text: part.text!, thought: true });
      } else if (part.type === "functionCall") {
        collectedParts.push({ type: "functionCall", name: part.name!, args: part.args!, toolCallId: part.toolCallId });
      }
    }
  }
  return collectedParts;
}

export async function POST(request: Request) {
  try {
    // Auth check - allow anonymous users (for ordinance landing pages)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Only enforce message limits for authenticated users
    if (user) {
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

    const { message, history, mode = "normal", outputLanguage = "EN", userRole = "lawyer", caseLanguage, provider: requestedProvider = "gemini" } = (await request.json()) as {
      message: string;
      history: Message[];
      mode?: "fast" | "normal" | "deep";
      outputLanguage?: "EN" | "TC";
      userRole?: "insurance" | "lawyer";
      caseLanguage?: "EN" | "TC";
      provider?: AIProvider;
    };

    console.log("[chat] provider:", requestedProvider, "outputLanguage:", outputLanguage, "userRole:", userRole, "caseLanguage:", caseLanguage, "mode:", mode);
    const systemPrompt = SYSTEM_PROMPTS[userRole]?.[outputLanguage] || SYSTEM_PROMPTS.lawyer.EN;
    const allowedCourts = userRole === "insurance" ? INSURANCE_COURTS : undefined;

    const thinkingLevelMap: Record<string, "low" | "medium" | "high"> = {
      fast: "low",
      normal: "medium",
      deep: "high",
    };
    const thinkingLevel = thinkingLevelMap[mode] || "medium";

    const adapter = createAIAdapter(requestedProvider);

    // Build conversation contents from history (provider-agnostic format)
    const conversationMessages: AIMessage[] = [];

    for (const msg of history) {
      conversationMessages.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ type: "text", text: msg.content }],
      });
    }

    // Add the new user message
    conversationMessages.push({
      role: "user",
      parts: [{ type: "text", text: message }],
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

          const triageResponse = await adapter.generateContent(
            conversationMessages,
            "triage",
            {
              systemInstruction: `You are a routing classifier for a Hong Kong legal research tool. Given the user's message (and any conversation history), determine whether the user needs to SEARCH the case law database, or whether the question can be answered DIRECTLY without research.

Reply with EXACTLY one word:
- SEARCH — if the user wants to find specific cases, compare quantum/compensation awards, or needs case law evidence
- DIRECT — if the question is general legal knowledge (e.g., "what is PSLA?"), a follow-up on previous conversation (e.g., drafting a letter, summarizing), or does not require searching for specific cases`,
            }
          );

          const triageText = triageResponse.text?.trim().toUpperCase() || "SEARCH";
          const needsResearch = triageText !== "DIRECT";
          console.log("[chat] triage:", triageText, "needsResearch:", needsResearch);

          // ────────────────────────────────────────────────────────────
          // DIRECT PATH: No research needed — just answer
          // ────────────────────────────────────────────────────────────
          if (!needsResearch) {
            sendStage("responding", "Generating response...");

            const directPrompt = DIRECT_PROMPTS[userRole]?.[outputLanguage] || DIRECT_PROMPTS.lawyer.EN;

            const directStream = adapter.generateContentStream(
              conversationMessages,
              "pipeline",
              {
                systemInstruction: directPrompt,
                tools: [getOrdinanceSectionTool],
                thinkingLevel,
                includeThoughts: true,
              }
            );

            const directOrdinanceCalls: Array<{ cap: number; section: string; toolCallId?: string }> = [];
            const directParts = await collectStreamParts(directStream, (part) => {
              if (part.type === "text") {
                sendEvent("text", part.text);
              } else if (part.type === "thought") {
                sendEvent("thinking", { type: "thought", content: part.text, iteration: 1 });
              } else if (part.type === "functionCall" && part.name === "getOrdinanceSection") {
                const cap = part.args?.cap as number;
                const section = part.args?.section as string;
                if (cap && section) {
                  directOrdinanceCalls.push({ cap, section, toolCallId: part.toolCallId });
                  sendEvent("tool_call", { name: "getOrdinanceSection", args: { cap, section }, iteration: 1 });
                }
              }
            });

            // If ordinance calls were made, execute them and continue
            if (directOrdinanceCalls.length > 0) {
              conversationMessages.push({ role: "model", parts: directParts });

              const ordinanceResponseParts: AIPart[] = [];
              for (const { cap, section, toolCallId } of directOrdinanceCalls) {
                try {
                  const sectionText = await executeGetOrdinanceSection(cap, section);
                  ordinanceResponseParts.push({
                    type: "functionResponse", name: "getOrdinanceSection", result: sectionText, toolCallId,
                  });
                  sendEvent("tool_result", { name: "getOrdinanceSection", summary: `Retrieved Cap. ${cap} s.${section}`, iteration: 1 });
                } catch (error) {
                  const errorMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
                  ordinanceResponseParts.push({
                    type: "functionResponse", name: "getOrdinanceSection", result: errorMsg, toolCallId,
                  });
                }
              }

              conversationMessages.push({ role: "user", parts: ordinanceResponseParts });

              // Generate final response with ordinance context
              const finalDirectStream = adapter.generateContentStream(
                conversationMessages,
                "pipeline",
                {
                  systemInstruction: directPrompt,
                  thinkingLevel: "low",
                  includeThoughts: true,
                }
              );

              await collectStreamParts(finalDirectStream, (part) => {
                if (part.type === "text") {
                  sendEvent("text", part.text);
                } else if (part.type === "thought") {
                  sendEvent("thinking", { type: "thought", content: part.text, iteration: 1 });
                }
              });
            }

            sendEvent("done", { iterations: 1 });

            const followUpQuestions = await generateFollowUpQuestions(adapter, conversationMessages, message);
            sendEvent("follow_up_questions", followUpQuestions);

            return;
          }

          // ────────────────────────────────────────────────────────────
          // RESEARCH PATH: search → filter → read → answer
          // ────────────────────────────────────────────────────────────
          const phases = PHASE_SCHEDULES[mode] || PHASE_SCHEDULES.normal;
          let iteration = 0;
          let searchCount = 0;
          let readCount = 0;

          const allChunks: Map<string, { result: SearchResult; url: string }> = new Map();
          const caseUrlMap: Record<string, string> = {};
          const casesRead = new Set<string>();
          const caseReadCache = new Map<string, string>();
          let filterSelectedCitations: string[] = [];
          const previousQueries: string[] = [];

          // ── SEARCH PHASES ──
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
              const uniqueCitations = new Set<string>();
              for (const { result } of allChunks.values()) {
                uniqueCitations.add(result.citation);
              }
              const prevQueryList = previousQueries.map((q, i) => `  ${i + 1}. "${q}"`).join("\n");
              searchGuidance = `\n\nYou have already run ${searchCount} searches and found ${uniqueCitations.size} unique cases.\n\nPrevious queries:\n${prevQueryList}\n\nDo NOT repeat similar queries. Search from DIFFERENT angles — try different legal concepts, broader/narrower terms, or different injury comparisons.`;
            }

            // Ask LLM to generate search queries
            const searchMessages: AIMessage[] = [...conversationMessages];
            if (searchGuidance) {
              searchMessages.push({ role: "user", parts: [{ type: "text", text: searchGuidance }] });
            }

            const searchStream = adapter.generateContentStream(
              searchMessages,
              "pipeline",
              {
                systemInstruction: systemPrompt,
                tools: searchOnlyTools,
                thinkingLevel,
                includeThoughts: true,
              }
            );

            // Process search response — collect function calls
            const searchFunctionCalls: Array<{ name: string; args: Record<string, unknown>; toolCallId?: string }> = [];

            const searchModelParts = await collectStreamParts(searchStream, (part) => {
              if (part.type === "thought") {
                sendEvent("thinking", { type: "thought", content: part.text, iteration: phaseNum });
                const thought = (part.text || "").toLowerCase();
                if (thought.includes("search") || thought.includes("find")) sendStage("strategizing", "Creating search strategy...");
              } else if (part.type === "functionCall") {
                searchFunctionCalls.push({ name: part.name!, args: part.args!, toolCallId: part.toolCallId });

                if (part.name === "searchCases") {
                  const query = (part.args?.query as string) || "";
                  const filters: string[] = [];
                  if (caseLanguage) filters.push(`lang=${caseLanguage}`);
                  else if (part.args?.language) filters.push(`lang=${part.args.language}`);
                  if (part.args?.court) filters.push(`court=${part.args.court}`);
                  const filterStr = filters.length > 0 ? ` [${filters.join(", ")}]` : "";
                  sendStage("searching", `Searching: "${query.substring(0, 50)}${query.length > 50 ? "..." : ""}"${filterStr}`);
                }

                const displayArgs = { ...part.args! };
                if (part.name === "searchCases" && caseLanguage) {
                  displayArgs.language = caseLanguage;
                }
                sendEvent("tool_call", { name: part.name, args: displayArgs, iteration: phaseNum });
              }
            });

            // Track queries for next round's guidance
            for (const call of searchFunctionCalls) {
              if (call.name === "searchCases" && call.args.query) {
                previousQueries.push(call.args.query as string);
              }
            }

            // Execute all tool calls
            if (searchFunctionCalls.length > 0) {
              conversationMessages.push({ role: "model", parts: searchModelParts });
            }

            // Execute all tool calls concurrently
            const toolCallResults = await Promise.all(
              searchFunctionCalls.map(async (call) => {
                if (call.name === "searchCases") {
                  try {
                    const { results, formattedResult, urls } = await executeSearch(call.args, caseLanguage, allowedCourts);
                    return { name: "searchCases" as const, success: true, results, formattedResult, urls, toolCallId: call.toolCallId } as const;
                  } catch (error) {
                    return { name: "searchCases" as const, success: false, error: error instanceof Error ? error.message : "Unknown error", toolCallId: call.toolCallId } as const;
                  }
                } else {
                  const cap = call.args.cap as number;
                  const section = call.args.section as string;
                  try {
                    const sectionText = await executeGetOrdinanceSection(cap, section);
                    return { name: "getOrdinanceSection" as const, success: true, cap, section, sectionText, toolCallId: call.toolCallId } as const;
                  } catch (error) {
                    return { name: "getOrdinanceSection" as const, success: false, cap, section, error: error instanceof Error ? error.message : "Unknown error", toolCallId: call.toolCallId } as const;
                  }
                }
              })
            );

            // Process results in order
            const toolResponseParts: AIPart[] = [];

            for (const result of toolCallResults) {
              if (result.name === "searchCases") {
                searchCount++;
                if (result.success) {
                  Object.assign(caseUrlMap, result.urls);
                  sendEvent("case_urls", result.urls);

                  for (const r of result.results) {
                    const chunkKey = `${r.citation}|${r.chunkIndex}`;
                    if (!allChunks.has(chunkKey)) {
                      allChunks.set(chunkKey, { result: r, url: result.urls[r.citation] || "" });
                    }
                  }

                  toolResponseParts.push({
                    type: "functionResponse", name: "searchCases", result: result.formattedResult, toolCallId: result.toolCallId,
                  });
                  sendEvent("tool_result", { name: "searchCases", summary: `Found ${result.results.length} chunks`, iteration: phaseNum });
                } else {
                  const errorMsg = `Error: ${result.error}`;
                  toolResponseParts.push({
                    type: "functionResponse", name: "searchCases", result: errorMsg, toolCallId: result.toolCallId,
                  });
                  sendEvent("tool_result", { name: "searchCases", summary: errorMsg, iteration: phaseNum });
                }
              } else if (result.name === "getOrdinanceSection") {
                if (result.success) {
                  toolResponseParts.push({
                    type: "functionResponse", name: "getOrdinanceSection", result: result.sectionText, toolCallId: result.toolCallId,
                  });
                  sendEvent("tool_result", { name: "getOrdinanceSection", summary: `Retrieved Cap. ${result.cap} s.${result.section}`, iteration: phaseNum });
                } else {
                  const errorMsg = `Error: ${result.error}`;
                  toolResponseParts.push({
                    type: "functionResponse", name: "getOrdinanceSection", result: errorMsg, toolCallId: result.toolCallId,
                  });
                  sendEvent("tool_result", { name: "getOrdinanceSection", summary: errorMsg, iteration: phaseNum });
                }
              }
            }

            if (toolResponseParts.length > 0) {
              conversationMessages.push({ role: "user", parts: toolResponseParts });
            }
          }

          // ── FILTER PHASE ──
          if (iteration < phases.length && phases[iteration] === "filter") {
            const phaseNum = iteration + 1;
            sendStage("analyzing", "Filtering cases for relevance...");
            sendEvent("thinking", {
              type: "reasoning",
              content: `Phase: FILTER (iteration ${phaseNum}/${phases.length}) — ${allChunks.size} chunks from ${new Set([...allChunks.values()].map(c => c.result.citation)).size} cases`,
              iteration: phaseNum,
            });

            // Build the chunk summary
            const chunkSummary = [...allChunks.values()]
              .sort((a, b) => b.result.score - a.result.score)
              .map(({ result, url }) =>
                `**${result.citation}** (${result.court.toUpperCase()}, ${result.year}) [chunk ${result.chunkIndex}]\nURL: ${url}\nSnippet: ${result.text.substring(0, 400)}${result.text.length > 400 ? "..." : ""}`
              )
              .join("\n\n---\n\n");

            const readPhasesRemaining = phases.slice(iteration + 1).filter(p => p === "read").length;
            const maxReads = Math.max(readPhasesRemaining * 3, 3);

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

            const filterMessages: AIMessage[] = [...conversationMessages, { role: "user", parts: [{ type: "text", text: filterPrompt }] }];

            const filterResponse = await adapter.generateContent(
              filterMessages,
              "pipeline",
              {
                systemInstruction: systemPrompt,
                thinkingLevel,
                includeThoughts: true,
              }
            );

            // Send thinking from filter
            for (const part of filterResponse.parts) {
              if (part.type === "thought") {
                sendEvent("thinking", { type: "thought", content: part.text, iteration: phaseNum });
              }
            }

            const filterText = filterResponse.text || "";

            // Extract citations from numbered list
            const citationRegex = /\[(\d{4})\]\s*(\w+)\s+(?:No\.\s*)?(\d+)/g;
            let match;
            const selectedCitations: string[] = [];
            while ((match = citationRegex.exec(filterText)) !== null) {
              const citation = `[${match[1]}] ${match[2]} ${match[3]}`;
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
          let readQueueIndex = 0;
          for (; iteration < phases.length; iteration++) {
            const phase = phases[iteration];
            if (phase !== "read") break;

            const phaseNum = iteration + 1;

            const casesToReadThisRound: string[] = [];
            while (readQueueIndex < filterSelectedCitations.length && casesToReadThisRound.length < 3) {
              const citation = filterSelectedCitations[readQueueIndex];
              readQueueIndex++;
              if (!casesRead.has(citation)) {
                casesToReadThisRound.push(citation);
              }
            }

            if (casesToReadThisRound.length === 0) {
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

            // Simulate tool calls for getCaseDetails
            const readModelParts: AIPart[] = casesToReadThisRound.map((citation, i) => ({
              type: "functionCall" as const,
              name: "getCaseDetails",
              args: { citation },
              toolCallId: `read_${phaseNum}_${i}`,
            }));

            conversationMessages.push({ role: "model", parts: readModelParts });

            for (const citation of casesToReadThisRound) {
              sendEvent("tool_call", { name: "getCaseDetails", args: { citation }, iteration: phaseNum });
            }
            sendStage("retrieving", `Retrieving ${casesToReadThisRound.length} cases...`);

            // Fetch all cases concurrently
            const readResults = await Promise.all(
              casesToReadThisRound.map(async (citation) => {
                try {
                  const caseText = await executeRead(citation, caseReadCache);
                  return { citation, success: true, caseText } as const;
                } catch (error) {
                  return { citation, success: false, error: error instanceof Error ? error.message : "Unknown error" } as const;
                }
              })
            );

            const readResponseParts: AIPart[] = [];

            for (let i = 0; i < readResults.length; i++) {
              const result = readResults[i];
              const toolCallId = `read_${phaseNum}_${i}`;
              if (result.success) {
                casesRead.add(result.citation);
                readCount++;
                readResponseParts.push({
                  type: "functionResponse", name: "getCaseDetails", result: result.caseText, toolCallId,
                });
                sendEvent("tool_result", { name: "getCaseDetails", summary: `Retrieved full text of ${result.citation}`, iteration: phaseNum });
              } else {
                const errorMsg = `Error: ${result.error}`;
                readResponseParts.push({
                  type: "functionResponse", name: "getCaseDetails", result: errorMsg, toolCallId,
                });
                sendEvent("tool_result", { name: "getCaseDetails", summary: errorMsg, iteration: phaseNum });
              }
            }

            conversationMessages.push({ role: "user", parts: readResponseParts });

            // Have LLM process the read results
            const readGuidance = readQueueIndex < filterSelectedCitations.length
              ? `You have read ${casesRead.size} cases so far. More cases will be read in the next round. For now, analyze what you've read and note key findings.`
              : `You have now read all ${casesRead.size} selected cases. Analyze the key findings from all cases.`;

            conversationMessages.push({ role: "user", parts: [{ type: "text", text: readGuidance }] });

            const readStream = adapter.generateContentStream(
              conversationMessages,
              "pipeline",
              {
                systemInstruction: systemPrompt,
                tools: readOnlyTools,
                thinkingLevel,
                includeThoughts: true,
              }
            );

            const additionalReads: Array<{ citation: string; toolCallId?: string }> = [];
            const additionalOrdinanceCalls: Array<{ cap: number; section: string; toolCallId?: string }> = [];

            const readProcessParts = await collectStreamParts(readStream, (part) => {
              if (part.type === "thought") {
                sendEvent("thinking", { type: "thought", content: part.text, iteration: phaseNum });
              } else if (part.type === "functionCall" && part.name === "getCaseDetails") {
                const citation = part.args?.citation as string;
                if (citation && !casesRead.has(citation) && caseUrlMap[citation]) {
                  additionalReads.push({ citation, toolCallId: part.toolCallId });
                }
              } else if (part.type === "functionCall" && part.name === "getOrdinanceSection") {
                const cap = part.args?.cap as number;
                const section = part.args?.section as string;
                if (cap && section) {
                  additionalOrdinanceCalls.push({ cap, section, toolCallId: part.toolCallId });
                }
              }
            });

            // Handle any additional tool calls
            if (additionalReads.length > 0 || additionalOrdinanceCalls.length > 0) {
              conversationMessages.push({ role: "model", parts: readProcessParts });

              const additionalResponseParts: AIPart[] = [];

              for (const { citation, toolCallId } of additionalReads) {
                sendStage("retrieving", `Retrieving: ${citation}`);
                sendEvent("tool_call", { name: "getCaseDetails", args: { citation }, iteration: phaseNum });

                try {
                  const caseText = await executeRead(citation, caseReadCache);
                  casesRead.add(citation);
                  readCount++;
                  additionalResponseParts.push({
                    type: "functionResponse", name: "getCaseDetails", result: caseText, toolCallId,
                  });
                  sendEvent("tool_result", { name: "getCaseDetails", summary: `Retrieved full text of ${citation}`, iteration: phaseNum });
                } catch (error) {
                  const errorMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
                  additionalResponseParts.push({
                    type: "functionResponse", name: "getCaseDetails", result: errorMsg, toolCallId,
                  });
                }
              }

              for (const { cap, section, toolCallId } of additionalOrdinanceCalls) {
                sendStage("retrieving", `Retrieving: Cap. ${cap} s.${section}`);
                sendEvent("tool_call", { name: "getOrdinanceSection", args: { cap, section }, iteration: phaseNum });

                try {
                  const sectionText = await executeGetOrdinanceSection(cap, section);
                  additionalResponseParts.push({
                    type: "functionResponse", name: "getOrdinanceSection", result: sectionText, toolCallId,
                  });
                  sendEvent("tool_result", { name: "getOrdinanceSection", summary: `Retrieved Cap. ${cap} s.${section}`, iteration: phaseNum });
                } catch (error) {
                  const errorMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
                  additionalResponseParts.push({
                    type: "functionResponse", name: "getOrdinanceSection", result: errorMsg, toolCallId,
                  });
                }
              }

              conversationMessages.push({ role: "user", parts: additionalResponseParts });
            } else {
              conversationMessages.push({ role: "model", parts: readProcessParts });
            }
          }

          // ── ANSWER PHASE ──
          sendEvent("thinking", {
            type: "reasoning",
            content: `Research complete (${searchCount} searches, ${readCount} reads from ${allChunks.size} chunks). Generating final answer...`,
            iteration: phases.length,
          });

          const foundCitations = Object.entries(caseUrlMap);
          const citationList = foundCitations.length > 0
            ? `\n\n## CITATION → URL MAPPING (use EXACTLY these URLs)\n${foundCitations.map(([c, u]) => `${c} → ${u}`).join("\n")}\n\nWhen you mention ANY case above, you MUST link it as [Case Name [YEAR] COURT NUMBER](exact URL from mapping). Do NOT construct URLs yourself. Do NOT use any other domain. Copy the URL exactly as shown.`
            : "\n\nYou did not find any relevant cases during research. Do NOT invent or fabricate any case citations.";

          conversationMessages.push({
            role: "user",
            parts: [{
              type: "text",
              text: `Please provide your final answer based on the research so far. Do not search anymore.

IMPORTANT RULES FOR YOUR RESPONSE:
1. You must ONLY reference cases that appeared in your search results. Do NOT cite any case from your training data.
2. Do NOT use blockquotes (>) to quote any case you did not read with getCaseDetails. If you only saw a search snippet, do NOT fabricate a quote.
3. **CRITICAL: URLs** — Every case link MUST use the exact URL from the citation mapping below. Do NOT construct your own URLs. Do NOT use domains like law-tech.ai, austlii.edu.au, or any other site. The ONLY valid domain is hklii.hk. Copy the URL exactly from the mapping.
4. If the search results were not relevant, acknowledge this honestly and provide general legal commentary without fabricated citations.${citationList}`,
            }],
          });

          sendStage("responding", "Generating final response...");

          const finalStream = adapter.generateContentStream(
            conversationMessages,
            "pipeline",
            {
              systemInstruction: systemPrompt,
              thinkingLevel: "low",
              includeThoughts: true,
            }
          );

          await collectStreamParts(finalStream, (part) => {
            if (part.type === "text") {
              sendEvent("text", part.text);
            } else if (part.type === "thought") {
              sendEvent("thinking", { type: "thought", content: part.text, iteration: phases.length });
            }
          });

          sendEvent("done", { iterations: phases.length });

          const followUpQuestions = await generateFollowUpQuestions(adapter, conversationMessages, message);
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
