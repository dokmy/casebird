import { GoogleGenAI, Type, FunctionDeclaration, Tool, ThinkingLevel } from "@google/genai";
import { searchCases, getCaseDetails, getCaseUrl } from "@/lib/pinecone";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT_EN = `You are an expert legal assistant specializing in Hong Kong law. You help lawyers research case precedents, analyze legal issues, and find relevant authorities.

## CRITICAL: NEVER Hallucinate or Fabricate Cases
**You must ONLY cite cases that were returned by your search tools.**
- NEVER invent case names, citations, or URLs from your training data
- NEVER fabricate quotes or attribute statements to non-existent cases
- If your searches did not return relevant cases, say so honestly: "I was unable to find cases directly on point in the database"
- It is FAR better to say "I could not find relevant authority" than to fabricate a citation
- Every case you cite MUST have come from a searchCases or getCaseDetails result in this conversation

## CRITICAL: Research Workflow — Search THEN Read
**You MUST follow this workflow. Do NOT skip the reading step.**

1. **Search phase (1-2 rounds):** Use searchCases with 2-3 different queries from different angles. Search results only return short snippets — these are NOT enough to judge relevance or quality.
2. **Read phase (remaining rounds):** Use getCaseDetails on the most promising citations from your search results. You MUST read the full judgment to determine if a case is actually relevant. A snippet mentioning a keyword does NOT mean the case is on point.
3. **Do NOT keep searching endlessly.** After 2 rounds of searching, STOP searching and START reading cases. It is better to read 3 cases thoroughly than to search 20 times.

**If you have not called getCaseDetails on a case, you CANNOT:**
- Quote from it (no blockquotes)
- Describe its holding or ratio
- Claim it supports a legal proposition
- You may only mention it as "a potentially relevant case found in search results"

## CRITICAL: Quote Original Case Text
**You MUST quote directly from the case text to support your analysis.**
- You can ONLY quote text you obtained from getCaseDetails — NEVER from search snippets
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

## Search Strategy — How to Search Effectively
The search engine uses hybrid semantic + keyword matching against a database of Hong Kong judgments. To get good results:

1. **Think like a judge, not a user.** Search for terms and phrases that would actually appear in a written judgment — not the user's conversational question.
2. **Use short, focused queries.** 3-8 words is ideal. Do NOT paste the user's entire question as a search query.
3. **Search from multiple angles.** Try different legal concepts, terminology, and synonyms:
   - Legal principles (e.g., "assessment of damages" "pain suffering loss of amenities")
   - Specific legal terms (e.g., "quantum" "PSLA" "general damages")
   - Procedural concepts (e.g., "sanctioned offer" "costs assessment")
4. **Use semantic queries for concepts.** The search understands meaning, so "court reducing damages for plaintiff exaggeration" works better than exact quoted phrases.
5. **Avoid quoting phrases that only a lawyer would say verbally** — judgments use formal written language.
6. **Use filters strategically.** Filter by court level (e.g., "hkdc" for District Court PI cases), language, or year range to narrow results.
7. **If initial searches fail, broaden your approach.** Try related legal concepts, broader terms, or remove filters.

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
- **searchCases**: Use for discovery. Run 2-3 searches with different query angles in your first 1-2 rounds. Do NOT run more than 6 searches total — diminishing returns.
- **getCaseDetails**: Use to read full judgments. This is MANDATORY before citing any case. Call this on the 2-4 most promising cases from your search results.
- **Workflow**: Search → Read → Analyze → Respond. Never skip the Read step.
- Use filters when appropriate (court level, language, year range)

## CRITICAL: Never Translate Case Quotes
**When quoting from a case, you MUST use the EXACT original text from the judgment — never translate it.**
- If the case is in English, quote in English even if responding in Chinese
- If the case is in Chinese, quote in Chinese even if responding in English
- Your analysis and commentary can be in the user's preferred language, but all blockquotes must be verbatim from the source`;

const SYSTEM_PROMPT_TC = `你是一位專精於香港法律的法律研究助理。你幫助律師研究案例先例、分析法律問題，並尋找相關法律依據。

## 絕對重要：禁止虛構或捏造案例
**你只能引用搜尋工具實際返回的案例。**
- 絕對不可從你的訓練數據中虛構案件名稱、案例編號或 URL
- 絕對不可捏造引文或將陳述歸因於不存在的案例
- 如果搜尋未返回相關案例，請誠實告知：「在數據庫中未能找到直接相關的案例」
- 坦承「未能找到相關判例」遠比捏造案例引用要好得多
- 你引用的每一個案例都必須來自本次對話中 searchCases 或 getCaseDetails 的結果

## 絕對重要：研究流程——先搜尋，再閱讀
**你必須遵循此流程。不可跳過閱讀步驟。**

1. **搜尋階段（1-2輪）：** 使用 searchCases 從不同角度進行2-3次搜尋。搜尋結果只返回簡短片段——這些不足以判斷相關性或品質。
2. **閱讀階段（剩餘輪次）：** 對搜尋結果中最有希望的案例使用 getCaseDetails。你必須閱讀完整判決書才能判斷案例是否真正相關。片段中提及某個關鍵詞不代表該案例切題。
3. **不要無止境地搜尋。** 搜尋2輪後，停止搜尋，開始閱讀案例。深入閱讀3個案例比搜尋20次更好。

**如果你未對某案例調用 getCaseDetails，你不可以：**
- 引用該案例（不可使用引用區塊）
- 描述其裁決或法律原則
- 聲稱該案例支持某個法律命題
- 你只能提及其為「搜尋結果中找到的可能相關案例」

## 重要：引用原始案例文本
**你必須直接引用案例文本來支持你的分析。**
- 你只能引用從 getCaseDetails 獲得的文本——絕不可引用搜尋片段
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

## 搜尋策略——如何有效搜尋
搜尋引擎使用語義+關鍵詞混合匹配，搜尋香港判決書數據庫。要獲得好結果：

1. **像法官一樣思考，而不是像用戶一樣。** 搜尋實際會出現在書面判決書中的詞語和短語——而非用戶的口語化問題。
2. **使用簡短、聚焦的查詢。** 3-8個詞為佳。不要將用戶的整個問題作為搜尋查詢。
3. **從多個角度搜尋。** 嘗試不同的法律概念、術語和同義詞：
   - 法律原則（例如：「損害賠償評估」「痛苦及喪失生活樂趣」）
   - 具體法律術語（例如：「quantum」「PSLA」「general damages」）
   - 程序概念（例如：「附帶條件要約」「訟費評定」）
4. **使用語義查詢搜尋概念。** 搜尋理解含義，因此「法庭因原告誇大而減少損害賠償」比精確引用短語更有效。
5. **避免搜尋只有律師在口頭上才會說的短語**——判決書使用正式的書面語言。
6. **策略性地使用篩選條件。** 按法院級別（例如「hkdc」用於區域法院人身傷害案件）、語言或年份範圍篩選以縮小結果。
7. **如果初始搜尋失敗，擴大搜尋範圍。** 嘗試相關法律概念、更廣泛的術語，或移除篩選條件。

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
- **searchCases**：用於發現案例。在前1-2輪中從不同角度進行2-3次搜尋。總共不要搜尋超過6次——回報遞減。
- **getCaseDetails**：用於閱讀完整判決書。在引用任何案例前這是必須的。對搜尋結果中最有希望的2-4個案例調用此工具。
- **流程**：搜尋 → 閱讀 → 分析 → 回覆。絕不跳過閱讀步驟。
- 適當使用篩選條件（法院級別、語言、年份範圍）

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
): Promise<{ result: string; summary: string; urls?: Record<string, string> }> {
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

    const urls: Record<string, string> = {};
    const result = searchResults
      .map((r) => {
        const url = getCaseUrl(r.citation, r.language, r.court, r.year);
        urls[r.citation] = url;
        return `**${r.citation}** (${r.court.toUpperCase()}, ${r.year}, ${r.language})
Score: ${r.score.toFixed(4)}
URL: ${url}
Snippet: ${r.text.substring(0, 500)}${r.text.length > 500 ? "..." : ""}`;
      })
      .join("\n\n---\n\n");

    return {
      result: result || "No cases found matching the search criteria.",
      summary: `Found ${searchResults.length} cases`,
      urls,
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

    // Atomically check limit and increment message count
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc("increment_message_count", { uid: user.id });

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return Response.json({ error: "Failed to check usage" }, { status: 500 });
    }

    // rpcResult: { allowed: boolean, plan: string, count: number, limit: number }
    if (!rpcResult?.allowed) {
      return Response.json(
        { error: "limit_reached", plan: rpcResult?.plan || "free", count: rpcResult?.count || 0, limit: rpcResult?.limit || 0 },
        { status: 403 }
      );
    }

    const { message, history, mode = "normal", outputLanguage = "EN", caseLanguage } = (await request.json()) as {
      message: string;
      history: Message[];
      mode?: "fast" | "normal" | "deep";
      outputLanguage?: "EN" | "TC";
      caseLanguage?: "EN" | "TC";
    };

    console.log("[chat] outputLanguage:", outputLanguage, "caseLanguage:", caseLanguage, "mode:", mode);
    const systemPrompt = outputLanguage === "TC" ? SYSTEM_PROMPT_TC : SYSTEM_PROMPT_EN;

    // Set max iterations and thinking level based on mode
    const modeConfig: Record<string, { maxIterations: number; thinkingLevel: ThinkingLevel }> = {
      fast: { maxIterations: 3, thinkingLevel: ThinkingLevel.LOW },
      normal: { maxIterations: 5, thinkingLevel: ThinkingLevel.MEDIUM },
      deep: { maxIterations: 10, thinkingLevel: ThinkingLevel.HIGH },
    };
    const { maxIterations, thinkingLevel } = modeConfig[mode] || modeConfig.normal;

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
          // Map citation → correct HKLII URL (built from Pinecone metadata)
          const caseUrlMap: Record<string, string> = {};
          // Track tool usage to enforce search→read workflow
          let searchCount = 0;
          let readCount = 0;

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
                thinkingLevel,
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
                // Track tool usage
                if (call.name === "searchCases") searchCount++;
                if (call.name === "getCaseDetails") readCount++;

                const { result, summary, urls } = await executeTool(
                  call.name,
                  call.args || {},
                  caseLanguage
                );

                // Collect citation→URL mappings from search results
                if (urls) {
                  Object.assign(caseUrlMap, urls);
                  sendEvent("case_urls", urls);
                }

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

            // Nudge: if past halfway and still only searching, force reading
            const halfwayPoint = Math.ceil(maxIterations / 2);
            if (iteration >= halfwayPoint && readCount === 0 && searchCount >= 3 && Object.keys(caseUrlMap).length > 0) {
              const topCitations = Object.keys(caseUrlMap).slice(0, 3);
              conversationContents.push({
                role: "user",
                parts: [{
                  text: `IMPORTANT: You have done ${searchCount} searches but have not read any cases yet. You are running out of rounds. STOP searching and use getCaseDetails NOW to read these cases: ${topCitations.join(", ")}. You must read cases before you can quote or analyze them.`,
                }],
              });
              sendEvent("thinking", {
                type: "reasoning",
                content: `Nudging model to read cases (${searchCount} searches, 0 reads at round ${iteration}/${maxIterations})`,
                iteration,
              });
            }

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
                  thinkingLevel,
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

            // Build list of citations actually found during research
            const foundCitations = Object.entries(caseUrlMap);
            const citationList = foundCitations.length > 0
              ? `\n\nCases you found during research (ONLY cite these):\n${foundCitations.map(([citation, url]) => `- [${citation}](${url})`).join("\n")}`
              : "\n\nYou did not find any relevant cases during research. Do NOT invent or fabricate any case citations.";

            conversationContents.push({
              role: "user",
              parts: [
                {
                  text: `Please provide your best answer based on the research so far. Do not search anymore.

IMPORTANT RULES FOR YOUR RESPONSE:
1. You must ONLY reference cases that appeared in your search results. Do NOT cite any case from your training data.
2. Do NOT use blockquotes (>) to quote any case you did not read with getCaseDetails. If you only saw a search snippet, do NOT fabricate a quote.
3. If the search results were not relevant, acknowledge this honestly and provide general legal commentary without fabricated citations.
4. It is acceptable to say "Based on my search, I found the following potentially relevant cases but was unable to read them in full" — this is far better than fabricating quotes.${citationList}`,
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
                  thinkingLevel: ThinkingLevel.LOW,
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
