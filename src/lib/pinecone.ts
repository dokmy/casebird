import { getQueryEmbedding, generateSparseVector } from "./voyage";

export interface SearchResult {
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

export interface SearchOptions {
  numResults?: number;
  court?: string;
  language?: "EN" | "TC";
  yearFrom?: number;
  yearTo?: number;
  allowedCourts?: string[];
}

interface PineconeMatch {
  id: string;
  score: number;
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
}

interface PineconeQueryResponse {
  matches: PineconeMatch[];
  namespace: string;
  usage?: { readUnits: number };
}

async function queryPinecone(body: object): Promise<PineconeQueryResponse> {
  const response = await fetch(`${process.env.PINECONE_INDEX_HOST}/query`, {
    method: "POST",
    headers: {
      "Api-Key": process.env.PINECONE_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinecone error: ${error}`);
  }

  return response.json();
}

export async function searchCases(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const numResults = options.numResults || 10;

  const results = await searchCasesRaw(query, { ...options, numResults: numResults * 3 });

  // Deduplicate by case citation, keeping highest scoring chunk per case
  const seenCitations = new Set<string>();
  const deduped: SearchResult[] = [];

  for (const r of results) {
    if (!seenCitations.has(r.citation) && deduped.length < numResults) {
      seenCitations.add(r.citation);
      deduped.push(r);
    }
  }

  return deduped;
}

/**
 * Returns raw chunk-level results WITHOUT deduplicating by case.
 * Used by the filter phase so Gemini can see multiple chunks from the same case.
 */
export async function searchCasesRaw(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { numResults = 30, court, language, yearFrom, yearTo, allowedCourts } = options;

  // Build filter
  const filterConditions: object[] = [];
  if (court) {
    filterConditions.push({ court_code: court });
  } else if (allowedCourts && allowedCourts.length > 0) {
    filterConditions.push({ court_code: { $in: allowedCourts } });
  }
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

  // Fall back to dense-only search if sparse vector is empty (pure-CJK queries)
  // The BM25 tokenizer uses \b\w+\b which doesn't match CJK characters
  const hasSparseTokens = sparseVector.indices.length > 0;

  // Query Pinecone with hybrid search (or dense-only if no sparse tokens)
  const result = await queryPinecone({
    vector: denseVector,
    ...(hasSparseTokens ? { sparseVector } : {}),
    topK: numResults,
    includeMetadata: true,
    filter,
  });

  return result.matches.map((match) => ({
    citation: match.metadata.neutral_citation,
    court: match.metadata.court_code,
    year: match.metadata.year,
    language: match.metadata.language,
    text: match.metadata.text,
    score: match.score,
    chunkIndex: match.metadata.chunk_index,
    paragraphStart: match.metadata.paragraph_start,
    paragraphEnd: match.metadata.paragraph_end,
  }));
}

export async function getCaseDetails(citation: string): Promise<string> {
  // Fetch all chunks for this citation using a zero vector
  // (we're filtering by citation, so the vector similarity doesn't matter)
  const dummyVector = new Array(512).fill(0);

  const result = await queryPinecone({
    vector: dummyVector,
    topK: 500, // Cases can have many chunks
    includeMetadata: true,
    filter: { neutral_citation: citation },
  });

  if (!result.matches || result.matches.length === 0) {
    return `Case not found: ${citation}`;
  }

  // Sort chunks by chunk_index
  const chunks = result.matches
    .sort((a, b) => a.metadata.chunk_index - b.metadata.chunk_index)
    .map((match) => match.metadata.text);

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

export function getCaseUrl(
  citation: string,
  language: string = "EN",
  courtCode?: string,
  year?: number
): string {
  const lang = language.toUpperCase() === "TC" ? "tc" : "en";

  // If we have court and year from metadata, try to extract just the number from citation
  if (courtCode && year) {
    // Try to extract case number from citation
    // Handle formats like "[2024] HKCA 620", "HKCA 620", etc.
    const numberMatch = citation.match(/(\d+)\s*$/);
    if (numberMatch) {
      const number = numberMatch[1];
      return `https://www.hklii.hk/${lang}/cases/${courtCode.toLowerCase()}/${year}/${number}`;
    }
  }

  // Fallback: Parse citation like "[2024] HKCA 620" or "[2024] HKCA No. 620"
  // Robust regex to handle variations
  const citationTrimmed = citation.trim();

  // Try new format: [2024] HKCA 620
  let match = citationTrimmed.match(/\[(\d{4})\]\s*(\w+)\s+(?:No\.\s*)?(\d+)/i);

  // Try format without brackets: 2024 HKCA 620
  if (!match) {
    match = citationTrimmed.match(/^(\d{4})\s+(\w+)\s+(?:No\.\s*)?(\d+)/i);
  }

  // Try underscore format: 2024_HKCA_620
  if (!match) {
    match = citationTrimmed.match(/^(\d{4})_(\w+)_(\d+)/);
  }

  if (!match) {
    console.error("Failed to parse citation:", citation);
    return "";
  }

  const [, parsedYear, court, number] = match;
  return `https://www.hklii.hk/${lang}/cases/${court.toLowerCase()}/${parsedYear}/${number}`;
}
