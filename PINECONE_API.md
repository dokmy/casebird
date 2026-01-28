Pine# Pinecone Vector Database - API Documentation

This document describes how to query the Hong Kong Legal Cases vector database stored in Pinecone.

## Overview

| Property      | Value                       |
| ------------- | --------------------------- |
| Total Vectors | 1,302,730                   |
| Dimensions    | 512 (dense) + sparse (BM25) |
| Metric        | `dotproduct`                |
| Search Type   | Hybrid (semantic + keyword) |

The database contains chunked legal judgments from Hong Kong courts, with both dense embeddings (for semantic search) and sparse embeddings (for keyword matching).

---

## Environment Variables Required

```env
# Voyage AI Configuration
VOYAGE_API_KEY=pa-trN051OIV47zB9oOp5gBvn9RMxgTMtD4O5KSaJnoCo5

# Pinecone Configuration
PINECONE_API_KEY=pcsk_bv6LU_CaJUWzkph4JW36UGWtDBgxCQJCKhvdER5vLSr2t7CJEP4UvdqTzQ57Jbr6oHahF
PINECONE_INDEX_HOST=https://2026-hk-cases-h6t8vc8.svc.aped-4627-b74a.pinecone.io
```

---

## Vector Metadata Schema

Each vector contains the following metadata:

| Field              | Type    | Description                                                     | Example                                  |
| ------------------ | ------- | --------------------------------------------------------------- | ---------------------------------------- |
| `text`             | string  | The chunk text content (may be truncated for very large chunks) | "The court finds that..."                |
| `neutral_citation` | string  | Unique case identifier                                          | "[2024] HKCA 620"                        |
| `court_code`       | string  | Court abbreviation                                              | "hkca", "hkcfi", "hkdc", "hkcfa", "hkfc" |
| `language`         | string  | Language code                                                   | "EN" or "TC"                             |
| `year`             | number  | Judgment year                                                   | 2024                                     |
| `judgment_date`    | string  | Full judgment date (ISO format or empty)                        | "2024-07-24"                             |
| `chunk_index`      | number  | Position of chunk within the case                               | 0, 1, 2, ...                             |
| `paragraph_start`  | number  | Starting paragraph number (-1 if unknown)                       | 1                                        |
| `paragraph_end`    | number  | Ending paragraph number (-1 if unknown)                         | 5                                        |
| `char_count`       | number  | Character count of the chunk                                    | 2400                                     |
| `is_truncated`     | boolean | Whether text was truncated for storage                          | false                                    |

---

## Court Codes

| Code    | Full Name                             |
| ------- | ------------------------------------- |
| `hkcfa` | Court of Final Appeal (highest court) |
| `hkca`  | Court of Appeal                       |
| `hkcfi` | Court of First Instance               |
| `hkdc`  | District Court                        |
| `hkfc`  | Family Court                          |

---

## Vector ID Format

Vector IDs follow the pattern: `{citation_normalized}-{chunk_index}`

Example: `_2024__HKCA_620-0` for the first chunk of [2024] HKCA 620

The citation is normalized by replacing `[`, `]`, and spaces with underscores.

---

## Querying the Database

### Step 1: Generate Query Embedding

Use Voyage AI to generate the query embedding:

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

### Step 2: Generate Sparse Vector (Optional, for Hybrid Search)

For hybrid search, you also need a sparse vector. Here's a simplified BM25 implementation:

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

### Step 3: Query Pinecone

#### Dense-Only Query (Semantic Search)

```typescript
async function semanticSearch(
  query: string,
  topK: number = 10,
  filters?: object,
) {
  const vector = await getQueryEmbedding(query);

  const response = await fetch(`${process.env.PINECONE_INDEX_HOST}/query`, {
    method: "POST",
    headers: {
      "Api-Key": process.env.PINECONE_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vector,
      topK,
      includeMetadata: true,
      filter: filters,
    }),
  });

  return response.json();
}
```

#### Hybrid Query (Semantic + Keyword)

```typescript
async function hybridSearch(
  query: string,
  topK: number = 10,
  alpha: number = 0.5, // 0 = sparse only, 1 = dense only
  filters?: object,
) {
  const denseVector = await getQueryEmbedding(query);
  const sparseVector = generateSparseVector(query);

  const response = await fetch(`${process.env.PINECONE_INDEX_HOST}/query`, {
    method: "POST",
    headers: {
      "Api-Key": process.env.PINECONE_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vector: denseVector,
      sparseVector: sparseVector,
      topK,
      includeMetadata: true,
      filter: filters,
    }),
  });

  return response.json();
}
```

---

## Filtering Examples

### Filter by Court

```typescript
// Only search Court of Appeal cases
const results = await semanticSearch("breach of contract", 10, {
  court_code: "hkca",
});
```

### Filter by Language

```typescript
// Only English cases
const results = await semanticSearch("negligence", 10, {
  language: "EN",
});

// Only Chinese cases
const results = await semanticSearch("合約違約", 10, {
  language: "TC",
});
```

### Filter by Year Range

```typescript
// Cases from 2020 onwards
const results = await semanticSearch("judicial review", 10, {
  year: { $gte: 2020 },
});

// Cases between 2015 and 2020
const results = await semanticSearch("employment dispute", 10, {
  $and: [{ year: { $gte: 2015 } }, { year: { $lte: 2020 } }],
});
```

### Combined Filters

```typescript
// English Court of Appeal cases from 2020+
const results = await semanticSearch("constitutional challenge", 10, {
  $and: [{ court_code: "hkca" }, { language: "EN" }, { year: { $gte: 2020 } }],
});
```

---

## Response Format

```typescript
interface QueryResponse {
  matches: Array<{
    id: string; // e.g., "_2024__HKCA_620-3"
    score: number; // Similarity score (higher = more relevant)
    metadata: {
      text: string;
      neutral_citation: string;
      court_code: string;
      language: string;
      year: number;
      judgment_date: string;
      chunk_index: number;
      paragraph_start: number;
      paragraph_end: number;
      char_count: number;
      is_truncated: boolean;
    };
  }>;
  namespace: string;
  usage?: { readUnits: number };
}
```

---

## Example: Full Search Implementation

```typescript
interface SearchResult {
  citation: string;
  court: string;
  year: number;
  language: string;
  text: string;
  score: number;
  chunkIndex: number;
}

async function searchLegalCases(
  query: string,
  options: {
    topK?: number;
    court?: string;
    language?: "EN" | "TC";
    yearFrom?: number;
    yearTo?: number;
    useHybrid?: boolean;
  } = {},
): Promise<SearchResult[]> {
  const {
    topK = 10,
    court,
    language,
    yearFrom,
    yearTo,
    useHybrid = true,
  } = options;

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

  // Get embeddings
  const denseVector = await getQueryEmbedding(query);

  // Build request body
  const body: any = {
    vector: denseVector,
    topK,
    includeMetadata: true,
  };

  if (filter) body.filter = filter;

  if (useHybrid) {
    body.sparseVector = generateSparseVector(query);
  }

  // Query Pinecone
  const response = await fetch(`${process.env.PINECONE_INDEX_HOST}/query`, {
    method: "POST",
    headers: {
      "Api-Key": process.env.PINECONE_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  // Transform results
  return result.matches.map((match: any) => ({
    citation: match.metadata.neutral_citation,
    court: match.metadata.court_code,
    year: match.metadata.year,
    language: match.metadata.language,
    text: match.metadata.text,
    score: match.score,
    chunkIndex: match.metadata.chunk_index,
  }));
}
```

---

## Usage Example

```typescript
// Search for contract breach cases in English
const results = await searchLegalCases(
  "breach of employment contract wrongful dismissal",
  {
    language: "EN",
    court: "hkcfi",
    yearFrom: 2018,
    topK: 20,
  },
);

// Display results
for (const result of results) {
  console.log(`${result.citation} (${result.court}, ${result.year})`);
  console.log(`Score: ${result.score.toFixed(4)}`);
  console.log(`Text: ${result.text.substring(0, 200)}...`);
  console.log("---");
}
```

---

## Grouping Results by Case

Since each case has multiple chunks, you may want to group results:

```typescript
function groupByCase(results: SearchResult[]): Map<string, SearchResult[]> {
  const grouped = new Map<string, SearchResult[]>();

  for (const result of results) {
    const existing = grouped.get(result.citation) || [];
    existing.push(result);
    grouped.set(result.citation, existing);
  }

  // Sort chunks within each case by chunk index
  for (const [citation, chunks] of grouped) {
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  return grouped;
}

// Usage
const results = await searchLegalCases("negligence", { topK: 50 });
const byCase = groupByCase(results);

for (const [citation, chunks] of byCase) {
  console.log(`\n${citation} (${chunks.length} relevant chunks)`);
  console.log(
    `Best score: ${Math.max(...chunks.map((c) => c.score)).toFixed(4)}`,
  );
}
```

---

## Rate Limits

- Pinecone: Depends on your plan (serverless has generous limits)
- Voyage AI: Check your plan's RPM (requests per minute) limit

---

## Tips for Best Results

1. **Use hybrid search** for legal queries - it combines semantic understanding with exact keyword matching
2. **Filter by court** when you know the jurisdiction level needed
3. **Request more results** (higher topK) then deduplicate by case citation
4. **Use Chinese queries** for TC cases - the embeddings are multilingual but work best with matching languages
5. **Consider chunk context** - lower chunk_index values are typically from the beginning of judgments (background/facts), higher values from the end (analysis/orders)
