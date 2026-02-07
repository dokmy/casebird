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
The search engine uses hybrid semantic + keyword matching against a database of Hong Kong judgments.

### CRITICAL: DO NOT use exact-phrase searches
**NEVER wrap your queries in quotation marks.** The search engine is SEMANTIC — it understands meaning, not exact phrases. Exact-phrase searches like "take the plaintiff's case to the highest" will FAIL because they look for that exact string. Instead, describe the CONCEPT using words that would appear in a judgment.

### BAD searches (DO NOT do this):
- "take the plaintiff's case to the highest" ← exact phrase, will miss relevant cases
- "inflate the PSLA a bit" ← trying to find a remembered phrase
- "highest and inflate the PSLA" solicitor ← combining fragments from memory

### GOOD searches (DO this):
- pitch claim higher PSLA negotiation ← describes the concept
- gross inflation quantum personal injury ← legal terms a judge would write
- wasted costs order solicitor exaggerated claim ← outcome-focused
- solicitor duty realistic assessment damages ← principle-focused

### Search rules:
1. **Search for CONCEPTS, not phrases.** Use 3-8 unquoted words describing what a judge would write about.
2. **Each query must be genuinely different.** Not just rearranging the same words. Attack the problem from different legal angles:
   - Query 1: The legal principle (e.g., "solicitor duty realistic quantum assessment")
   - Query 2: The consequence/remedy (e.g., "wasted costs order inflated claim plaintiff")
   - Query 3: The factual pattern (e.g., "PSLA pleaded much higher than awarded")
3. **Think like a judge writing the judgment**, not a lawyer remembering a phrase from a seminar.
4. **Use filters strategically.** Filter by court level (e.g., "hkdc" for District Court PI cases), language, or year range.
5. **If initial searches fail, CHANGE your approach entirely.** Try different legal concepts, broader terms, adjacent areas of law, or remove filters. Do NOT just rephrase the same idea.

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
搜尋引擎使用語義+關鍵詞混合匹配，搜尋香港判決書數據庫。

### 絕對重要：不要使用精確短語搜尋
**絕對不要在查詢中使用引號。** 搜尋引擎是語義化的——它理解含義，而非精確短語。精確短語搜尋如「take the plaintiff's case to the highest」會失敗，因為它尋找完全匹配的字串。請用判決書中會出現的詞彙描述概念。

### 錯誤的搜尋（不要這樣做）：
- "take the plaintiff's case to the highest" ← 精確短語，會遺漏相關案例
- "inflate the PSLA a bit" ← 試圖尋找記憶中的短語
- "highest and inflate the PSLA" solicitor ← 拼湊記憶中的片段

### 正確的搜尋（這樣做）：
- pitch claim higher PSLA negotiation ← 描述概念
- gross inflation quantum personal injury ← 法官會使用的法律術語
- wasted costs order solicitor exaggerated claim ← 以結果為導向
- solicitor duty realistic assessment damages ← 以原則為導向

### 搜尋規則：
1. **搜尋概念，而非短語。** 使用3-8個不加引號的詞彙，描述法官會在判決書中寫的內容。
2. **每個查詢必須真正不同。** 不要只是重新排列相同的詞彙。從不同的法律角度切入：
   - 查詢1：法律原則（例如：「solicitor duty realistic quantum assessment」）
   - 查詢2：後果/救濟（例如：「wasted costs order inflated claim plaintiff」）
   - 查詢3：事實模式（例如：「PSLA pleaded much higher than awarded」）
3. **像撰寫判決書的法官一樣思考**，而非回憶研討會上某個短語的律師。
4. **策略性地使用篩選條件。** 按法院級別（例如「hkdc」用於區域法院人身傷害案件）、語言或年份範圍篩選。
5. **如果初始搜尋失敗，徹底改變你的方法。** 嘗試不同的法律概念、更廣泛的術語、相鄰法律領域，或移除篩選條件。不要只是換個方式表達同一個想法。

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
// Rule: the phase before "answer" must always be "read" (not "both"), because
// searching right before answer is wasteful — those results never get read.
const PHASE_SCHEDULES: Record<string, Phase[]> = {
  // Fast (3 iterations): search → read → answer
  fast: ["search", "read", "answer"],
  // Normal (6 iterations): search → read → read → both → read → answer
  normal: ["search", "read", "read", "both", "read", "answer"],
  // Deep (10 iterations): search → search → read → read → read → both → both → read → read → answer
  deep: ["search", "search", "read", "read", "read", "both", "both", "read", "read", "answer"],
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
): Promise<{ result: string; summary: string; urls?: Record<string, string>; scores?: Record<string, number> }> {
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
    const scores: Record<string, number> = {};
    const result = searchResults
      .map((r) => {
        const url = getCaseUrl(r.citation, r.language, r.court, r.year);
        urls[r.citation] = url;
        scores[r.citation] = r.score;
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
      scores,
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
          // Track best search score per case (for ranking READ suggestions)
          const caseScoreMap: Record<string, number> = {};
          // Track which cases have been read via getCaseDetails
          const casesRead = new Set<string>();
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

                const { result, summary, urls, scores } = await executeTool(
                  call.name,
                  call.args || {},
                  caseLanguage
                );

                // Collect citation→URL mappings from search results
                if (urls) {
                  Object.assign(caseUrlMap, urls);
                  sendEvent("case_urls", urls);
                }

                // Track best score per case across all searches
                if (scores) {
                  for (const [citation, score] of Object.entries(scores)) {
                    if (!caseScoreMap[citation] || score > caseScoreMap[citation]) {
                      caseScoreMap[citation] = score;
                    }
                  }
                }

                // Track which cases have been read
                if (call.name === "getCaseDetails") {
                  const citation = (call.args as { citation?: string })?.citation;
                  if (citation) casesRead.add(citation);
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

            // Determine what tools to provide for the NEXT Gemini call
            // phases[iteration] (not iteration+1) because the initial call outside the loop
            // used phases[0], and this loop iteration processed results from the previous call
            const nextPhase = phases[iteration] || "answer";
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
            if (nextPhase === "read" && Object.keys(caseScoreMap).length > 0) {
              // Rank cases by best score across ALL searches, excluding already-read cases
              const unreadByScore = Object.entries(caseScoreMap)
                .filter(([citation]) => !casesRead.has(citation))
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4)
                .map(([citation]) => citation);
              const suggestions = unreadByScore.length > 0
                ? `Suggested cases (ranked by relevance across all searches): ${unreadByScore.join(", ")}.`
                : `Choose the most promising cases from your search results.`;
              phaseGuidance = `\n\nNEXT PHASE: READ. You must now use getCaseDetails to read cases. ${suggestions} Do NOT search — read the cases you found.`;
            } else if (nextPhase === "search") {
              phaseGuidance = `\n\nNEXT PHASE: SEARCH. Continue searching from different angles. Try different legal terms, broader/narrower queries, or different filters.`;
            } else if (nextPhase === "both") {
              // In BOTH phase, nudge toward reading unread cases if there are good ones
              const unreadByScore = Object.entries(caseScoreMap)
                .filter(([citation]) => !casesRead.has(citation))
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([citation]) => citation);
              if (unreadByScore.length > 0) {
                phaseGuidance = `\n\nNEXT PHASE: FLEXIBLE. You may search for more cases or read cases you haven't read yet. Unread cases worth reading: ${unreadByScore.join(", ")}. Prefer reading unread cases over searching unless you have a specific gap to fill.`;
              } else {
                phaseGuidance = `\n\nNEXT PHASE: FLEXIBLE. You may search for more cases or read cases you haven't read yet. Use your judgment on what will help most.`;
              }
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
              content: `Entering ${nextPhaseLabel} phase (iteration ${iteration + 1}/${phases.length})...`,
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
