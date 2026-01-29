import { GoogleGenAI, Type, FunctionDeclaration, Tool } from "@google/genai";
import { searchCases, getCaseDetails, getCaseUrl } from "@/lib/pinecone";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT_EN = `You are an expert legal assistant specializing in Hong Kong law. You help lawyers research case precedents, analyze legal issues, and find relevant authorities.

## CRITICAL: Reading Full Cases
**YOU MUST use getCaseDetails to read the full case text before providing detailed analysis.**
- Search results only show snippets - these are NOT enough for proper legal analysis
- After finding relevant cases with searchCases, ALWAYS call getCaseDetails to read the full judgment
- Only after reading the full case can you accurately quote and cite it

## CRITICAL: Quote Original Case Text
**You MUST quote directly from the case text to support your analysis.**
- Use blockquote format (>) for all direct quotes from cases
- Include paragraph numbers when available
- Format:
  > "The court held that the defendant's conduct..."
  > — [Case Name](url), para. 45

## CRITICAL: Case References Must Be Hyperlinks
**EVERY case citation mentioned MUST be a clickable markdown hyperlink.**
- **Always use the exact URL provided in the search results** — do NOT construct URLs yourself
- Each search result includes a URL field — copy it exactly
- This applies to ALL case mentions - in text, tables, lists, everywhere
- Users click these links to open the case in the viewer panel

## Search Capabilities
You can search with filters:
- **court**: "hkcfa" (Court of Final Appeal), "ukpc" (UK Privy Council), "hkca" (Court of Appeal), "hkcfi" (Court of First Instance), "hkct" (Competition Tribunal), "hkdc" (District Court), "hkfc" (Family Court), "hkmagc" (Magistrates' Courts), "hkcrc" (Coroner's Court), "hklat" (Labour Tribunal), "hkldt" (Lands Tribunal), "hkoat" (Obscene Articles Tribunal), "hksct" (Small Claims Tribunal)
- **language**: "EN" (English) or "TC" (Traditional Chinese)
- **yearFrom/yearTo**: Filter by year range

Use these filters to narrow searches when the user specifies jurisdiction or time period.

## Response Format
1. Start with a brief summary answering the user's question
2. Provide detailed analysis with case citations
3. Quote relevant passages from cases using blockquotes
4. Include a summary table of relevant cases when appropriate:

| Case | Court | Year | Key Point | Outcome |
|------|-------|------|-----------|---------|
| [[2024] HKCA 620](use URL from search results) | CA | 2024 | Brief description | Outcome |

## Tool Usage Guidelines
- Use searchCases with specific, targeted queries
- Make multiple searches with different angles if needed (the search supports hybrid semantic + keyword matching)
- Use filters when appropriate (court level, language, year range)
- ALWAYS use getCaseDetails before quoting or analyzing a case in depth
- You can make up to 10 tool calls per response if needed

## CRITICAL: Never Translate Case Quotes
**When quoting from a case, you MUST use the EXACT original text from the judgment — never translate it.**
- If the case is in English, quote in English even if responding in Chinese
- If the case is in Chinese, quote in Chinese even if responding in English
- Your analysis and commentary can be in the user's preferred language, but all blockquotes must be verbatim from the source`;

const SYSTEM_PROMPT_TC = `你是一位專精於香港法律的法律研究助理。你幫助律師研究案例先例、分析法律問題，並尋找相關法律依據。

## 重要：閱讀完整案例
**你必須使用 getCaseDetails 閱讀完整案例全文，才能提供詳細分析。**
- 搜尋結果只顯示片段——這些不足以進行正確的法律分析
- 使用 searchCases 找到相關案例後，務必調用 getCaseDetails 閱讀完整判決書
- 只有閱讀完整案例後，你才能準確引用和分析

## 重要：引用原始案例文本
**你必須直接引用案例文本來支持你的分析。**
- 使用引用格式（>）引用案例中的原文
- 盡可能包含段落編號
- 格式：
  > "法庭裁定被告的行為..."
  > — [案件名稱](url)，第45段

## 重要：案例引用必須是超連結
**提及的每一個案例引用都必須是可點擊的 markdown 超連結。**
- **務必使用搜尋結果中提供的確切 URL**——不要自行構建 URL
- 每個搜尋結果都包含 URL 欄位——請直接複製使用
- 這適用於所有案例提及——在正文、表格、列表中都是如此
- 用戶點擊這些連結可在側面板中打開案例

## 搜尋功能
你可以使用以下篩選條件進行搜尋：
- **court**："hkcfa"（終審法院）、"ukpc"（英國樞密院）、"hkca"（上訴法庭）、"hkcfi"（原訟法庭）、"hkct"（競爭事務審裁處）、"hkdc"（區域法院）、"hkfc"（家事法庭）、"hkmagc"（裁判法院）、"hkcrc"（死因裁判法庭）、"hklat"（勞資審裁處）、"hkldt"（土地審裁處）、"hkoat"（淫褻物品審裁處）、"hksct"（小額錢債審裁處）
- **language**："EN"（英文）或 "TC"（繁體中文）
- **yearFrom/yearTo**：按年份範圍篩選

當用戶指定司法管轄區或時間範圍時，使用這些篩選條件縮小搜尋範圍。

## 回應格式
1. 首先簡要總結回答用戶的問題
2. 提供帶有案例引用的詳細分析
3. 使用引用格式引用案例中的相關段落
4. 適當時包含相關案例的摘要表格：

| 案例 | 法院 | 年份 | 要點 | 結果 |
|------|------|------|------|------|
| [[2024] HKCA 620](使用搜尋結果中的 URL) | CA | 2024 | 簡要描述 | 結果 |

## 工具使用指引
- 使用 searchCases 進行具體、有針對性的查詢
- 如有需要，從不同角度進行多次搜尋（搜尋支持語義+關鍵詞混合匹配）
- 適當使用篩選條件（法院級別、語言、年份範圍）
- 在深入引用或分析案例之前，務必使用 getCaseDetails
- 每次回應最多可進行10次工具調用

## 絕對重要：禁止翻譯案例引文
**引用案例原文時，你必須使用判決書中的原始文字——絕對不可翻譯。**
- 如果案例是英文的，即使你用中文回覆，引用也必須保持英文原文
- 如果案例是中文的，引用必須保持中文原文
- 你的分析和評論可以使用用戶偏好的語言，但所有引用區塊（blockquote）必須是原文逐字引用

## 重要：你必須全程使用繁體中文，包括你的思考過程和最終回覆。所有分析、摘要、推理和說明都必須以繁體中文撰寫。案例引用和法律術語可保留英文原文。`;

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
        description: "Number of cases to return (default 10, max 30)",
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

const tools: Tool[] = [
  {
    functionDeclarations: [searchCasesDeclaration, getCaseDetailsDeclaration],
  },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Helper to execute tools
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  caseLanguageOverride?: "EN" | "TC"
): Promise<{ result: string; summary: string }> {
  if (name === "searchCases") {
    const typedArgs = args as {
      query: string;
      numResults?: number;
      court?: string;
      language?: "EN" | "TC";
      yearFrom?: number;
      yearTo?: number;
    };

    // User's case language filter overrides whatever Gemini chose
    const effectiveLanguage = caseLanguageOverride || typedArgs.language;

    const searchResults = await searchCases(typedArgs.query, {
      numResults: typedArgs.numResults,
      court: typedArgs.court,
      language: effectiveLanguage,
      yearFrom: typedArgs.yearFrom,
      yearTo: typedArgs.yearTo,
    });

    const result = searchResults
      .map((r) => {
        const url = getCaseUrl(r.citation, r.language, r.court, r.year);
        return `**${r.citation}** (${r.court.toUpperCase()}, ${r.year}, ${r.language})
Score: ${r.score.toFixed(4)}
URL: ${url}
Snippet: ${r.text.substring(0, 500)}${r.text.length > 500 ? "..." : ""}`;
      })
      .join("\n\n---\n\n");

    return {
      result: result || "No cases found matching the search criteria.",
      summary: `Found ${searchResults.length} cases`,
    };
  } else if (name === "getCaseDetails") {
    const typedArgs = args as { citation: string };
    const result = await getCaseDetails(typedArgs.citation);
    return {
      result,
      summary: `Retrieved full text of ${typedArgs.citation}`,
    };
  }

  return { result: `Unknown function: ${name}`, summary: "Error" };
}

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check usage limits
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("message_count, message_limit, plan, status")
      .eq("user_id", user.id)
      .single();

    // Auto-create free subscription if none exists
    if (!subscription) {
      await supabase.from("subscriptions").insert({
        user_id: user.id,
        plan: "free",
        status: "active",
        message_count: 0,
        message_limit: 10,
      });
    } else if (subscription.message_count >= subscription.message_limit) {
      return Response.json(
        { error: "limit_reached", plan: subscription.plan, count: subscription.message_count, limit: subscription.message_limit },
        { status: 403 }
      );
    }

    // Increment message count
    await supabase
      .from("subscriptions")
      .update({ message_count: (subscription?.message_count ?? 0) + 1 })
      .eq("user_id", user.id);

    const { message, history, mode = "normal", outputLanguage = "EN", caseLanguage } = (await request.json()) as {
      message: string;
      history: Message[];
      mode?: "fast" | "normal" | "deep";
      outputLanguage?: "EN" | "TC";
      caseLanguage?: "EN" | "TC";
    };

    console.log("[chat] outputLanguage:", outputLanguage, "caseLanguage:", caseLanguage, "mode:", mode);
    const systemPrompt = outputLanguage === "TC" ? SYSTEM_PROMPT_TC : SYSTEM_PROMPT_EN;

    // Set max iterations based on mode
    const modeConfig = {
      fast: 3,
      normal: 5,
      deep: 10,
    };
    const maxIterations = modeConfig[mode] || 5;

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

        // Send a stage update with emoji and description
        const sendStage = (stage: string, description: string) => {
          sendEvent("stage", { stage, description });
        };

        try {
          let iteration = 0;
          let pendingFunctionCallParts: Array<unknown> = [];
          let finalText = "";

          // Stage 1: Understanding the query
          sendStage("understanding", "Understanding your question...");

          // Initial request with thinking mode enabled
          let response = await ai.models.generateContentStream({
            model: "gemini-3-flash-preview",
            contents: conversationContents,
            config: {
              systemInstruction: systemPrompt,
              tools: tools,
              // Enable native thinking mode
              thinkingConfig: {
                thinkingBudget: 2048,
                includeThoughts: true,
              },
            },
          });

          // Process the stream
          let modelParts: Array<unknown> = [];

          const processStream = async (
            streamResponse: AsyncIterable<unknown>
          ) => {
            modelParts = [];
            pendingFunctionCallParts = [];
            finalText = "";

            for await (const chunk of streamResponse) {
              const candidate = (
                chunk as {
                  candidates?: Array<{
                    content?: { parts?: Array<unknown> };
                  }>;
                }
              ).candidates?.[0];
              if (!candidate?.content?.parts) continue;

              for (const part of candidate.content.parts) {
                // Store ALL parts for conversation history (preserves thoughtSignature!)
                modelParts.push(part);

                const typedPart = part as {
                  thought?: boolean;
                  text?: string;
                  functionCall?: {
                    name: string;
                    args: Record<string, unknown>;
                  };
                };

                // 1. THINKING: Model's reasoning (native Gemini thinking!)
                if (typedPart.thought && typedPart.text) {
                  // Send the raw thought from Gemini
                  sendEvent("thinking", {
                    type: "thought",
                    content: typedPart.text,
                    iteration: iteration + 1,
                  });

                  // Try to extract a stage from the thought content
                  const thought = typedPart.text.toLowerCase();
                  if (thought.includes("search") || thought.includes("find") || thought.includes("look for")) {
                    sendStage("strategizing", "Creating search strategy...");
                  } else if (thought.includes("relevant") || thought.includes("promising") || thought.includes("interesting")) {
                    sendStage("analyzing", "Analyzing search results...");
                  } else if (thought.includes("full text") || thought.includes("read") || thought.includes("details")) {
                    sendStage("reading", "Reading case details...");
                  } else if (thought.includes("compare") || thought.includes("similar")) {
                    sendStage("comparing", "Comparing cases...");
                  } else if (thought.includes("answer") || thought.includes("respond") || thought.includes("enough")) {
                    sendStage("synthesizing", "Synthesizing findings...");
                  }
                }
                // 2. TEXT: Model's response text (not thinking)
                else if (typedPart.text && !typedPart.thought) {
                  if (!finalText) {
                    sendStage("responding", "Generating response...");
                  }
                  finalText += typedPart.text;
                  sendEvent("text", typedPart.text);
                }
                // 3. FUNCTION CALL: Model decided to use a tool
                else if (typedPart.functionCall) {
                  // Store FULL part object (critical for thoughtSignature!)
                  pendingFunctionCallParts.push(part);

                  // Send descriptive stage based on tool
                  if (typedPart.functionCall.name === "searchCases") {
                    const searchArgs = typedPart.functionCall.args as Record<string, unknown>;
                    const query = (searchArgs.query as string) || "";
                    // Build filter summary for visibility
                    const filters: string[] = [];
                    if (caseLanguage) filters.push(`lang=${caseLanguage}`);
                    else if (searchArgs.language) filters.push(`lang=${searchArgs.language}`);
                    if (searchArgs.court) filters.push(`court=${searchArgs.court}`);
                    if (searchArgs.yearFrom || searchArgs.yearTo) filters.push(`year=${searchArgs.yearFrom || "…"}-${searchArgs.yearTo || "…"}`);
                    const filterStr = filters.length > 0 ? ` [${filters.join(", ")}]` : "";
                    sendStage("searching", `Searching: "${query.substring(0, 50)}${query.length > 50 ? "..." : ""}"${filterStr}`);
                  } else if (typedPart.functionCall.name === "getCaseDetails") {
                    const citation = (typedPart.functionCall.args as { citation?: string })?.citation || "";
                    sendStage("retrieving", `Retrieving: ${citation}`);
                  }

                  // Show effective args (with case language override applied)
                  const displayArgs = { ...typedPart.functionCall.args };
                  if (typedPart.functionCall.name === "searchCases" && caseLanguage) {
                    displayArgs.language = caseLanguage;
                  }
                  sendEvent("tool_call", {
                    name: typedPart.functionCall.name,
                    args: displayArgs,
                    iteration: iteration + 1,
                  });
                }
              }
            }
          };

          // Process initial response
          await processStream(response as AsyncIterable<unknown>);

          // THE MAGIC LOOP: Keep going while model wants to use tools
          while (
            pendingFunctionCallParts.length > 0 &&
            iteration < maxIterations
          ) {
            iteration++;

            sendStage("executing", `Processing (round ${iteration} of ${maxIterations})...`);
            sendEvent("thinking", {
              type: "iteration",
              content: `Executing tool calls (iteration ${iteration}/${maxIterations})...`,
              iteration,
            });

            // Add model's response to conversation history (preserves thought signatures!)
            conversationContents.push({
              role: "model",
              parts: modelParts,
            });

            // Execute each tool the model requested
            const functionResponseParts: Array<{
              functionResponse: {
                name: string;
                response: { result: string };
              };
            }> = [];

            for (const fullPart of pendingFunctionCallParts) {
              const call = (
                fullPart as {
                  functionCall: {
                    name: string;
                    args: Record<string, unknown>;
                  };
                }
              ).functionCall;

              try {
                const { result, summary } = await executeTool(
                  call.name,
                  call.args || {},
                  caseLanguage
                );

                sendEvent("tool_result", {
                  name: call.name,
                  summary,
                  iteration,
                });

                functionResponseParts.push({
                  functionResponse: {
                    name: call.name,
                    response: { result },
                  },
                });
              } catch (error) {
                const errorMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
                sendEvent("tool_result", {
                  name: call.name,
                  summary: errorMsg,
                  iteration,
                });

                functionResponseParts.push({
                  functionResponse: {
                    name: call.name,
                    response: { result: errorMsg },
                  },
                });
              }
            }

            // Add tool results to conversation
            conversationContents.push({
              role: "user",
              parts: functionResponseParts,
            });

            // Ask model what to do next (with full history including thoughts + tool results)
            sendStage("thinking", "Analyzing results...");
            sendEvent("thinking", {
              type: "reasoning",
              content: "Analyzing results and deciding next action...",
              iteration,
            });

            const nextResponse = await ai.models.generateContentStream({
              model: "gemini-3-flash-preview",
              contents: conversationContents,
              config: {
                systemInstruction: systemPrompt,
                tools: tools,
                thinkingConfig: {
                  thinkingBudget: 2048,
                  includeThoughts: true,
                },
              },
            });

            // Process next response
            await processStream(nextResponse as AsyncIterable<unknown>);

            // If model wants more tools, show status
            if (pendingFunctionCallParts.length > 0) {
              sendEvent("thinking", {
                type: "continue",
                content: `Model requesting more information (${iteration + 1}/${maxIterations} iterations)...`,
                iteration: iteration + 1,
              });
            }
          }

          // Handle max iterations reached
          if (
            iteration >= maxIterations &&
            pendingFunctionCallParts.length > 0
          ) {
            sendEvent("thinking", {
              type: "limit",
              content: `Reached maximum iterations (${maxIterations}). Generating final response...`,
              iteration: maxIterations,
            });

            // Force a final answer with no more tools
            conversationContents.push({
              role: "model",
              parts: modelParts,
            });

            conversationContents.push({
              role: "user",
              parts: [
                {
                  text: "Please provide your best answer based on the cases found so far. Do not search anymore.",
                },
              ],
            });

            const finalResponse = await ai.models.generateContentStream({
              model: "gemini-3-flash-preview",
              contents: conversationContents,
              config: {
                systemInstruction: systemPrompt,
                // No tools - forces model to just answer
                thinkingConfig: {
                  thinkingBudget: 1024,
                  includeThoughts: true,
                },
              },
            });

            // Process final response
            for await (const chunk of finalResponse) {
              const candidate = (
                chunk as {
                  candidates?: Array<{
                    content?: { parts?: Array<unknown> };
                  }>;
                }
              ).candidates?.[0];
              if (!candidate?.content?.parts) continue;

              for (const part of candidate.content.parts) {
                const typedPart = part as {
                  thought?: boolean;
                  text?: string;
                };

                if (typedPart.text && !typedPart.thought) {
                  sendEvent("text", typedPart.text);
                } else if (typedPart.thought && typedPart.text) {
                  sendEvent("thinking", {
                    type: "thought",
                    content: typedPart.text,
                    iteration: maxIterations,
                  });
                }
              }
            }
          }

          sendEvent("done", { iterations: iteration });
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
