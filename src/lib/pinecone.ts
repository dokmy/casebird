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
  const result = await queryPinecone({
    vector: denseVector,
    sparseVector: sparseVector,
    topK: numResults * 3, // Get more to deduplicate by case
    includeMetadata: true,
    filter,
  });

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

export function getCaseUrl(citation: string, language: string = "EN"): string {
  // Parse citation like "[2024] HKCA 620"
  const match = citation.match(/\[(\d{4})\]\s*(\w+)\s*(\d+)/);
  if (!match) return "";

  const [, year, court, number] = match;
  const lang = language.toUpperCase() === "TC" ? "tc" : "en";
  return `https://www.hklii.hk/${lang}/cases/${court.toLowerCase()}/${year}/${number}`;
}
