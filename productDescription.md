# Legal Chat - Full Product Specification (v2 - Voyage AI + Hybrid Search)

## Overview

Build a ChatGPT-like legal research assistant for Hong Kong lawyers. The app allows lawyers to ask questions about Hong Kong case law, and an AI assistant searches a vector database of legal cases using hybrid search (semantic + keyword), retrieves full case texts, and provides well-cited answers with direct quotes from the source material.

## Tech Stack

- **Framework**: Next.js with App Router
- **AI Model**: Google Gemini 3 Flash (`gemini-3-flash-preview`) with native thinking mode
- **AI SDK**: `@google/genai` (NOT the deprecated `@google/generative-ai`)
- **Vector Database**: Pinecone with hybrid search (1.3M+ vectors)
- **Embeddings**: Voyage AI `voyage-3-lite` (512 dimensions)
- **Search Type**: Hybrid (dense semantic + sparse BM25 keyword matching)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Clerk (optional)
- **Streaming**: Server-Sent Events (SSE)

## Environment Variables Required

```env
GEMINI_API_KEY=AIzaSyDNd-e2I-svyJVIrU3lt_7udAQp19vTwKA
```

---

## Core Features

### 1. Chat Interface

- Clean, modern chat UI similar to ChatGPT/Claude
- User messages on right, AI responses on left
- Auto-expanding textarea input (min 60px, max 200px height)
- Send button with loading state
- Markdown rendering for AI responses (tables, lists, bold, links, etc.)
- Message history maintained in conversation

### 2. AI Thinking Process Panel

- Collapsible panel showing the AI's reasoning process
- Displays:
  - Native thinking/reasoning from Gemini 3
  - Tool calls being made (search queries, case retrievals)
  - Tool results (cases found, snippets)
- Expandable/collapsible with chevron icon
- Styled distinctly (dark background, monospace for queries)
- Prevents horizontal scroll on long content

### 3. Split-Screen Case Viewer

- When user clicks a case link, screen splits 50/50
- Left side: Chat conversation
- Right side: Case viewer iframe showing the actual case on hklii.hk
- Case viewer features:
  - Header with case name
  - Close button (X) to return to full chat
  - Fullscreen toggle button
  - "Open in new tab" button
- iframe with proper sandbox attributes: `allow-same-origin allow-scripts allow-popups allow-forms`

### 4. Tool Calling System

The AI has access to two tools:

**Tool 1: searchCases**

```typescript
{
  name: "searchCases",
  description: "Search the Hong Kong legal case database using hybrid search (semantic + keyword)",
  parameters: {
    query: string,       // Search query
    numResults: number,  // Default 10, max 30
    court: string,       // Optional: "hkcfa", "hkca", "hkcfi", "hkdc", "hkfc"
    language: string,    // Optional: "EN" or "TC"
    yearFrom: number,    // Optional: filter cases from this year
    yearTo: number       // Optional: filter cases up to this year
  }
}
```

- Uses Pinecone hybrid search (dense + sparse vectors)
- Returns: neutral citation, court, year, language, text snippet, relevance score

**Tool 2: getCaseDetails**

```typescript
{
  name: "getCaseDetails",
  description: "Get the full text of a specific case by its neutral citation",
  parameters: {
    citation: string  // e.g., "[2024] HKCA 620"
  }
}
```

- Retrieves all chunks of a case from Pinecone by filtering on `neutral_citation`
- Sorts chunks by `chunk_index` and concatenates
- Returns full case text
- Critical for the AI to read actual case content before answering

### 5. Streaming Response

- Use Server-Sent Events (SSE) for real-time streaming
- Stream types:
  - `thinking`: AI's reasoning process
  - `tool_call`: When AI invokes a tool
  - `tool_result`: Results from tool execution
  - `text`: Final response text chunks
  - `done`: Stream complete
  - `error`: Error occurred

---

## Pinecone Database Schema

| Property      | Value                       |
| ------------- | --------------------------- |
| Total Vectors | 1,302,730                   |
| Dimensions    | 512 (dense) + sparse (BM25) |
| Metric        | `dotproduct`                |
| Search Type   | Hybrid (semantic + keyword) |

### Vector Metadata

| Field              | Type    | Description            | Example                                  |
| ------------------ | ------- | ---------------------- | ---------------------------------------- |
| `text`             | string  | Chunk text content     | "The court finds that..."                |
| `neutral_citation` | string  | Unique case identifier | "[2024] HKCA 620"                        |
| `court_code`       | string  | Court abbreviation     | "hkca", "hkcfi", "hkdc", "hkcfa", "hkfc" |
| `language`         | string  | Language code          | "EN" or "TC"                             |
| `year`             | number  | Judgment year          | 2024                                     |
| `judgment_date`    | string  | Full judgment date     | "2024-07-24"                             |
| `chunk_index`      | number  | Position in case       | 0, 1, 2, ...                             |
| `paragraph_start`  | number  | Starting paragraph     | 1                                        |
| `paragraph_end`    | number  | Ending paragraph       | 5                                        |
| `char_count`       | number  | Character count        | 2400                                     |
| `is_truncated`     | boolean | Whether truncated      | false                                    |

### Vector ID Format

`{citation_normalized}-{chunk_index}`

Example: `_2024__HKCA_620-0` for first chunk of [2024] HKCA 620

### Court Codes

| Code    | Full Name                       |
| ------- | ------------------------------- |
| `hkcfa` | Court of Final Appeal (highest) |
| `hkca`  | Court of Appeal                 |
| `hkcfi` | Court of First Instance         |
| `hkdc`  | District Court                  |
| `hkfc`  | Family Court                    |

---

## Implementation Details

### Voyage AI Embedding Generation

```typescript
const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "voyage-3-lite",
      input: [query],
      input_type: "query", // Use 'query' for search queries
    }),
  });

  const result = await response.json();
  return result.data[0].embedding;
}
```

### Sparse Vector Generation (BM25)

```typescript
function generateSparseVector(text: string): {
  indices: number[];
  values: number[];
} {
  // Tokenize
  const tokens = text.toLowerCase().match(/\b\w+\b/g) || [];

  // Count term frequencies
  const termFreq = new Map<string, number>();
  for (const token of tokens) {
    termFreq.set(token, (termFreq.get(token) || 0) + 1);
  }

  // Convert to sparse vector
  const indices: number[] = [];
  const values: number[] = [];

  for (const [term, freq] of termFreq) {
    // Hash term to 32-bit index
    let hash = 0;
    for (let i = 0; i < term.length; i++) {
      hash = ((hash << 5) - hash + term.charCodeAt(i)) | 0;
    }
    indices.push(Math.abs(hash) % 2147483647);
    values.push(Math.log(1 + freq)); // BM25-style weighting
  }

  return { indices, values };
}
```

### Hybrid Search Implementation

```typescript
interface SearchResult {
  citation: string;
  court: string;
  year: number;
  language: string;
  text: string;
  score: number;
  chunkIndex: number;
  paragraphStart: number;
  paragraphEnd: number;
}

async function searchCases(
  query: string,
  options: {
    numResults?: number;
    court?: string;
    language?: "EN" | "TC";
    yearFrom?: number;
    yearTo?: number;
  } = {},
): Promise<SearchResult[]> {
  const { numResults = 10, court, language, yearFrom, yearTo } = options;

  // Build filter
  const filterConditions: object[] = [];
  if (court) filterConditions.push({ court_code: court });
  if (language) filterConditions.push({ language });
  if (yearFrom) filterConditions.push({ year: { $gte: yearFrom } });
  if (yearTo) filterConditions.push({ year: { $lte: yearTo } });

  const filter =
    filterConditions.length > 0
      ? filterConditions.length === 1
        ? filterConditions[0]
        : { $and: filterConditions }
      : undefined;

  // Get embeddings (dense + sparse for hybrid search)
  const denseVector = await getQueryEmbedding(query);
  const sparseVector = generateSparseVector(query);

  // Query Pinecone with hybrid search
  const response = await fetch(`${process.env.PINECONE_INDEX_HOST}/query`, {
    method: "POST",
    headers: {
      "Api-Key": process.env.PINECONE_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vector: denseVector,
      sparseVector: sparseVector,
      topK: numResults * 3, // Get more to deduplicate by case
      includeMetadata: true,
      filter,
    }),
  });

  const result = await response.json();

  // Deduplicate by case citation, keeping highest scoring chunk per case
  const seenCitations = new Set<string>();
  const results: SearchResult[] = [];

  for (const match of result.matches) {
    const citation = match.metadata.neutral_citation;
    if (!seenCitations.has(citation) && results.length < numResults) {
      seenCitations.add(citation);
      results.push({
        citation,
        court: match.metadata.court_code,
        year: match.metadata.year,
        language: match.metadata.language,
        text: match.metadata.text,
        score: match.score,
        chunkIndex: match.metadata.chunk_index,
        paragraphStart: match.metadata.paragraph_start,
        paragraphEnd: match.metadata.paragraph_end,
      });
    }
  }

  return results;
}
```

### Get Full Case Details

```typescript
async function getCaseDetails(citation: string): Promise<string> {
  // Fetch all chunks for this citation
  // We need to use a filter query with a dummy vector
  const dummyVector = new Array(512).fill(0);

  const response = await fetch(`${process.env.PINECONE_INDEX_HOST}/query`, {
    method: "POST",
    headers: {
      "Api-Key": process.env.PINECONE_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vector: dummyVector,
      topK: 500, // Cases can have many chunks
      includeMetadata: true,
      filter: { neutral_citation: citation },
    }),
  });

  const result = await response.json();

  if (!result.matches || result.matches.length === 0) {
    return `Case not found: ${citation}`;
  }

  // Sort chunks by chunk_index
  const chunks = result.matches
    .sort((a: any, b: any) => a.metadata.chunk_index - b.metadata.chunk_index)
    .map((match: any) => match.metadata.text);

  // Get case metadata from first chunk
  const metadata = result.matches[0].metadata;

  return `
# ${citation}
**Court:** ${metadata.court_code.toUpperCase()}
**Date:** ${metadata.judgment_date || metadata.year}
**Language:** ${metadata.language}

---

${chunks.join("\n\n")}
  `.trim();
}
```

### Case URL Generation

Generate HKLII URLs from neutral citations:

```typescript
function getCaseUrl(citation: string): string {
  // Parse citation like "[2024] HKCA 620"
  const match = citation.match(/\[(\d{4})\]\s*(\w+)\s*(\d+)/);
  if (!match) return "";

  const [, year, court, number] = match;
  return `https://www.hklii.hk/en/cases/${court.toLowerCase()}/${year}/${number}`;
}

// Examples:
// "[2024] HKCA 620" -> "https://www.hklii.hk/en/cases/hkca/2024/620"
// "[2019] HKCFI 1234" -> "https://www.hklii.hk/en/cases/hkcfi/2019/1234"
```

---

## System Prompt (Critical)

```
You are an expert legal assistant specializing in Hong Kong law. You help lawyers research case precedents, analyze legal issues, and find relevant authorities.

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
- Format: [Citation](https://www.hklii.hk/en/cases/COURT/YEAR/NUMBER)
- Example: [[2024] HKCA 620](https://www.hklii.hk/en/cases/hkca/2024/620)
- This applies to ALL case mentions - in text, tables, lists, everywhere
- Users click these links to open the case in the viewer panel

## Search Capabilities
You can search with filters:
- **court**: "hkcfa" (Court of Final Appeal), "hkca" (Court of Appeal), "hkcfi" (Court of First Instance), "hkdc" (District Court), "hkfc" (Family Court)
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
| [[2024] HKCA 620](url) | CA | 2024 | Brief description | Outcome |

## Tool Usage Guidelines
- Use searchCases with specific, targeted queries
- Make multiple searches with different angles if needed (the search supports hybrid semantic + keyword matching)
- Use filters when appropriate (court level, language, year range)
- ALWAYS use getCaseDetails before quoting or analyzing a case in depth
- You can make up to 10 tool calls per response if needed
```

---

## API Route Implementation

**POST /api/legal-chat**

Request body:

```typescript
{
  message: string,           // User's question
  history: ConversationTurn[] // Previous conversation
}
```

### Gemini 3 Native Thinking Mode

```typescript
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const chat = ai.chats.create({
  model: "gemini-3-flash-preview",
  config: {
    systemInstruction: SYSTEM_PROMPT,
    tools: toolDefinitions,
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.MEDIUM, // Options: MINIMAL, LOW, MEDIUM, HIGH
      includeThoughts: true,
    },
  },
});
```

### Tool Definitions

```typescript
const tools = [
  {
    functionDeclarations: [
      {
        name: "searchCases",
        description:
          "Search Hong Kong legal cases using hybrid search (semantic + keyword)",
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
              description: "Filter by court: hkcfa, hkca, hkcfi, hkdc, hkfc",
            },
            language: {
              type: Type.STRING,
              description: "Filter by language: EN or TC",
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
      },
    ],
  },
  {
    functionDeclarations: [
      {
        name: "getCaseDetails",
        description: "Get the full text of a case by its neutral citation",
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
      },
    ],
  },
];
```

### Thought Signature Preservation (CRITICAL)

When doing multi-turn tool calling, you MUST preserve the full `part` objects including `thoughtSignature`. This is required by Gemini 3's thinking mode:

```typescript
// Store FULL parts, not just functionCall
let pendingFunctionCallParts: any[] = [];

for await (const chunk of response) {
  for (const part of chunk.candidates[0].content.parts) {
    if (part.thought) {
      // Stream thinking to client
    } else if (part.functionCall) {
      pendingFunctionCallParts.push(part); // Keep full part with thoughtSignature!
    } else if (part.text) {
      // Stream text to client
    }
  }
}

// When sending function results back, include the original parts
conversationContents.push({ role: "model", parts: modelParts });
conversationContents.push({
  role: "user",
  parts: functionResultParts, // FunctionResponse parts
});
```

### Tool Execution Loop

```typescript
let maxIterations = 10; // Allow multiple tool calls
while (pendingFunctionCallParts.length > 0 && iteration < maxIterations) {
  // Execute tools
  // Send results back to model
  // Continue conversation
}
```

---

## UI Component Structure

```
/app
  /legal-chat
    page.tsx           # Main chat page (client component)
    layout.tsx         # Auth protection (server component)
    /components
      CaseViewer.tsx   # Split-screen iframe viewer
```

### Page Layout (Fixed Height)

```tsx
<div className="h-full flex flex-col overflow-hidden">
  <div className="flex flex-1 min-h-0">
    {/* Chat Panel - 50% or 100% width */}
    <div className={`flex flex-col ${selectedCase ? 'w-1/2' : 'w-full'}`}>
      {/* Messages area - scrollable */}
      <div className="flex-1 overflow-y-auto">
        {messages.map(...)}
      </div>

      {/* Input area - fixed at bottom */}
      <div className="border-t p-4">
        <textarea />
        <button>Send</button>
      </div>
    </div>

    {/* Case Viewer Panel - 50% width when open */}
    {selectedCase && (
      <div className="w-1/2 border-l">
        <CaseViewer url={selectedCase.url} onClose={() => setSelectedCase(null)} />
      </div>
    )}
  </div>
</div>
```

### Markdown Rendering with Custom Components

```tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    // Case links open in viewer panel, not new tab
    a: ({ href, children }) => {
      if (href?.includes("hklii.hk/en/cases/")) {
        return (
          <button onClick={() => openCaseViewer(href)}>
            <Scale className="w-3 h-3" />
            {children}
          </button>
        );
      }
      return (
        <a href={href} target="_blank">
          {children}
        </a>
      );
    },

    // Styled blockquotes for case citations
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-amber-500 bg-amber-950/30 pl-4 py-2 italic">
        {children}
      </blockquote>
    ),

    // Tables, code blocks, etc.
  }}
/>
```

---

## Error Handling

1. Handle Pinecone connection errors gracefully
2. Handle Gemini API rate limits (1000 RPM, 1M TPM)
3. Handle Voyage AI rate limits
4. Show error messages in the chat UI
5. Don't crash on malformed tool responses

---

## Tips for Best Results

1. **Use hybrid search** - it combines semantic understanding with exact keyword matching, great for legal terms
2. **Filter by court** when jurisdiction matters
3. **Filter by language** - use Chinese queries for TC cases
4. **Consider chunk context** - lower `chunk_index` = beginning of judgment (facts), higher = end (analysis/orders)
5. **Paragraph numbers** help lawyers cite specific parts of judgments
