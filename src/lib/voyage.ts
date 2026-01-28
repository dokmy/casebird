const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

export async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "voyage-3-lite",
      input: [query],
      input_type: "query",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI error: ${error}`);
  }

  const result = await response.json();
  return result.data[0].embedding;
}

export function generateSparseVector(text: string): {
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
