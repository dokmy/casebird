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

## CRITICAL: Research Workflow — Phases Are Enforced
**The system controls which tools you can use at each phase. Follow the guidance provided.**

1. **SEARCH phase:** You can ONLY use searchCases. Run 2-3 diverse queries from different angles. Think like a judge — use terms that appear in written judgments.
2. **READ phase:** You can ONLY use getCaseDetails. Read the most promising cases from your search results in full. You MUST read a case before you can cite it.
3. **FLEXIBLE phase:** You may search or read. Fill in gaps — search if you need more cases, or read cases you haven't read yet.
4. **ANSWER phase:** No tools available. Provide your final analysis using only cases you have actually read.

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
- **searchCases**: Use for discovery. In each search round, run 2-3 diverse queries. Vary your terms — do not repeat similar queries.
- **getCaseDetails**: Use to read full judgments. This is MANDATORY before citing any case. Call this on the 2-4 most promising cases from your search results.
- **The system controls your workflow.** Only the tools allowed for the current phase will be available. Follow the phase guidance provided.
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

## 絕對重要：研究流程——系統強制執行各階段
**系統控制你在每個階段可以使用的工具。請遵循提供的指引。**

1. **搜尋階段：** 你只能使用 searchCases。從不同角度進行2-3次多樣化搜尋。像法官一樣思考——使用書面判決中會出現的術語。
2. **閱讀階段：** 你只能使用 getCaseDetails。完整閱讀搜尋結果中最有希望的案例。在引用案例之前你必須先閱讀它。
3. **靈活階段：** 你可以搜尋或閱讀。填補不足——如果需要更多案例就搜尋，或閱讀尚未閱讀的案例。
4. **回答階段：** 沒有工具可用。僅使用你實際閱讀過的案例提供最終分析。

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
- **searchCases**：用於發現案例。在每輪搜尋中進行2-3次多樣化查詢。變換你的用詞——不要重複相似的查詢。
- **getCaseDetails**：用於閱讀完整判決書。在引用任何案例前這是必須的。對搜尋結果中最有希望的2-4個案例調用此工具。
- **系統控制你的流程。** 當前階段允許的工具才會可用。請遵循提供的階段指引。
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

const searchOnlyTools: Tool[] = [
  { functionDeclarations: [searchCasesDeclaration] },
];

const readOnlyTools: Tool[] = [
  { functionDeclarations: [getCaseDetailsDeclaration] },
];

const bothTools: Tool[] = [
  { functionDeclarations: [searchCasesDeclaration, getCaseDetailsDeclaration] },
];

// Phase types: which tools are available at each iteration
type Phase = "search" | "read" | "both" | "answer";

// Phase schedules per mode — controls exactly which tools Gemini can use at each iteration
const PHASE_SCHEDULES: Record<string, Phase[]> = {
  // Fast (3 iterations): search → read → answer
  fast: ["search", "read", "answer"],
  // Normal (5 iterations): search → read → read → both → answer
  normal: ["search", "read", "read", "both", "answer"],
  // Deep (10 iterations): search → search → read → read → read → both → both → read → both → answer
  deep: ["search", "search", "read", "read", "read", "both", "both", "read", "both", "answer"],
};

function getToolsForPhase(phase: Phase): Tool[] | undefined {
  switch (phase) {
    case "search": return searchOnlyTools;
    case "read": return readOnlyTools;
    case "both": return bothTools;
    case "answer": return undefined; // No tools — force final answer
  }
}

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

    // Set thinking level based on mode (iteration count is controlled by PHASE_SCHEDULES)
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
          // Track tool usage
          let searchCount = 0;
          let readCount = 0;

          // Get the phase schedule for this mode
          const phases = PHASE_SCHEDULES[mode] || PHASE_SCHEDULES.normal;
          const currentPhase = phases[0]; // First phase (always "search")
          const currentTools = getToolsForPhase(currentPhase);

          // Stage 1: Understanding the query
          sendStage("understanding", "Understanding your question...");

          sendEvent("thinking", {
            type: "reasoning",
            content: `Phase: SEARCH (iteration 1/${phases.length})`,
            iteration: 1,
          });

          // Initial request with thinking mode enabled — SEARCH phase only
          const response = await ai.models.generateContentStream({
            model: "gemini-3-flash-preview",
            contents: conversationContents,
            config: {
              systemInstruction: systemPrompt,
              tools: currentTools,
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

          // STATE MACHINE LOOP: Phase-based tool control
          // Each iteration has a defined phase that controls which tools are available
          while (
            pendingFunctionCallParts.length > 0 &&
            iteration < phases.length - 1 // Last phase is always "answer"
          ) {
            iteration++;

            const phase = phases[iteration] || "answer";
            const phaseLabel = phase.toUpperCase();

            sendStage("executing", `Processing (round ${iteration + 1} of ${phases.length})...`);
            sendEvent("thinking", {
              type: "iteration",
              content: `Phase: ${phaseLabel} (iteration ${iteration + 1}/${phases.length})`,
              iteration: iteration + 1,
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
                  iteration: iteration + 1,
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
                  iteration: iteration + 1,
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

            // Determine what tools to provide for the NEXT iteration
            const nextPhase = phases[iteration + 1] || "answer";
            const nextTools = getToolsForPhase(nextPhase);

            // If next phase is "answer", break out and generate final response
            if (nextPhase === "answer") {
              sendEvent("thinking", {
                type: "reasoning",
                content: `Research complete (${searchCount} searches, ${readCount} reads). Generating final answer...`,
                iteration: iteration + 1,
              });
              break;
            }

            // Inject phase guidance so Gemini knows what to do next
            const nextPhaseLabel = nextPhase.toUpperCase();
            let phaseGuidance = "";
            if (nextPhase === "read" && Object.keys(caseUrlMap).length > 0) {
              const topCitations = Object.keys(caseUrlMap).slice(0, 4);
              phaseGuidance = `\n\nNEXT PHASE: READ. You must now use getCaseDetails to read the most promising cases from your search results. Suggested cases: ${topCitations.join(", ")}. Do NOT search — read the cases you found.`;
            } else if (nextPhase === "search") {
              phaseGuidance = `\n\nNEXT PHASE: SEARCH. Continue searching from different angles. Try different legal terms, broader/narrower queries, or different filters.`;
            } else if (nextPhase === "both") {
              phaseGuidance = `\n\nNEXT PHASE: FLEXIBLE. You may search for more cases or read cases you haven't read yet. Use your judgment on what will help most.`;
            }

            if (phaseGuidance) {
              conversationContents.push({
                role: "user",
                parts: [{ text: phaseGuidance }],
              });
            }

            // Ask model what to do next — with phase-appropriate tools only
            sendStage("thinking", `${nextPhaseLabel} phase...`);
            sendEvent("thinking", {
              type: "reasoning",
              content: `Entering ${nextPhaseLabel} phase (iteration ${iteration + 2}/${phases.length})...`,
              iteration: iteration + 1,
            });

            const nextResponse = await ai.models.generateContentStream({
              model: "gemini-3-flash-preview",
              contents: conversationContents,
              config: {
                systemInstruction: systemPrompt,
                tools: nextTools,
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
                content: `Model requesting more actions (phase: ${nextPhaseLabel})...`,
                iteration: iteration + 1,
              });
            }
          }

          // ANSWER PHASE: Force a final response with citation whitelist
          // This runs if: (1) we exited the loop at the answer phase, or (2) model still had pending tool calls
          if (!finalText || pendingFunctionCallParts.length > 0) {
            sendEvent("thinking", {
              type: "limit",
              content: `Generating final response (${searchCount} searches, ${readCount} reads)...`,
              iteration: phases.length,
            });

            // Add last model response to history if there were pending tool calls
            if (pendingFunctionCallParts.length > 0) {
              conversationContents.push({
                role: "model",
                parts: modelParts,
              });
            }

            // Build list of citations actually found during research
            const foundCitations = Object.entries(caseUrlMap);
            const citationList = foundCitations.length > 0
              ? `\n\nCases you found during research (ONLY cite these):\n${foundCitations.map(([citation, url]) => `- [${citation}](${url})`).join("\n")}`
              : "\n\nYou did not find any relevant cases during research. Do NOT invent or fabricate any case citations.";

            conversationContents.push({
              role: "user",
              parts: [
                {
                  text: `Please provide your final answer based on the research so far. Do not search anymore.

IMPORTANT RULES FOR YOUR RESPONSE:
1. You must ONLY reference cases that appeared in your search results. Do NOT cite any case from your training data.
2. Do NOT use blockquotes (>) to quote any case you did not read with getCaseDetails. If you only saw a search snippet, do NOT fabricate a quote.
3. If the search results were not relevant, acknowledge this honestly and provide general legal commentary without fabricated citations.
4. It is acceptable to say "Based on my search, I found the following potentially relevant cases but was unable to read them in full" — this is far better than fabricating quotes.${citationList}`,
                },
              ],
            });

            sendStage("responding", "Generating final response...");

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
                    iteration: phases.length,
                  });
                }
              }
            }
          }

          sendEvent("done", { iterations: iteration + 1 });
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
