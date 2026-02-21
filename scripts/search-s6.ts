import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex);
  const value = trimmed.slice(eqIndex + 1);
  if (!process.env[key]) process.env[key] = value;
}

import { searchCasesRaw, getCaseDetails } from "../src/lib/pinecone";

const QUERIES = [
  "section 6 employment ordinance contract",
  "employment contract terms conditions cap 57",
  "implied terms employment contract Hong Kong",
  "contract of employment enforceable wages",
  "僱傭合約 僱傭條例 第6條",
  "employment contract less favourable ordinance",
];

async function main() {
  const allChunks = new Map<string, { citation: string; court: string; year: number; text: string; score: number; chunkIndex: number }>();
  const caseCitations = new Set<string>();

  for (const query of QUERIES) {
    console.log(`\nSearch: "${query}"`);
    try {
      const results = await searchCasesRaw(query, { numResults: 15 });
      console.log(`  → ${results.length} chunks`);
      for (const r of results) {
        const key = `${r.citation}|${r.chunkIndex}`;
        if (!allChunks.has(key)) {
          allChunks.set(key, { citation: r.citation, court: r.court, year: r.year, text: r.text, score: r.score, chunkIndex: r.chunkIndex });
        }
        caseCitations.add(r.citation);
      }
    } catch (e: any) {
      console.log(`  ERROR: ${e.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Total unique chunks: ${allChunks.size}`);
  console.log(`Total unique cases: ${caseCitations.size}`);
  // Filter: chunk must mention Cap 57 / Employment Ordinance AND "section 6"
  const cap57Re = /employment ordinance|cap\.?\s*57|僱傭條例/i;
  const s6Re = /(?:section|s\.?)\s*6(?:\b|[^0-9A-Z])|第\s*6\s*條/i;

  const relevant = new Map<string, { citation: string; court: string; year: number; text: string; score: number; chunkIndex: number }[]>();

  for (const chunk of allChunks.values()) {
    if (cap57Re.test(chunk.text) && s6Re.test(chunk.text)) {
      if (!relevant.has(chunk.citation)) relevant.set(chunk.citation, []);
      relevant.get(chunk.citation)!.push(chunk);
    }
  }

  console.log(`Cases with chunks mentioning Cap 57 + section 6: ${relevant.size}`);

  // Fetch full judgments
  for (const [citation, chunks] of relevant) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`FETCHING FULL: ${citation} (${chunks[0].court}, ${chunks[0].year})`);
    const fullText = await getCaseDetails(citation);
    console.log(`Full text length: ${fullText.length} chars`);
    // Print first 3000 chars (header + case name) and chunks around section 6 mentions
    console.log(`\n--- HEADER ---`);
    console.log(fullText.slice(0, 2000));

    // Find all occurrences of "section 6" in full text and print context
    const s6Matches = [...fullText.matchAll(/(?:section|s\.?)\s*6(?:\b|[^0-9A-Z])/gi)];
    console.log(`\n--- SECTION 6 MENTIONS (${s6Matches.length}) ---`);
    for (const m of s6Matches.slice(0, 5)) {
      const start = Math.max(0, m.index! - 200);
      const end = Math.min(fullText.length, m.index! + 500);
      console.log(`\n[at char ${m.index}]:`);
      console.log("..." + fullText.slice(start, end) + "...");
    }
  }
}

main().catch(console.error);
