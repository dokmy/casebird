import { readFileSync } from "fs";
import { resolve } from "path";

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

// Usage: npx tsx scripts/search-section.ts [--cap 282] <sectionNumber> <sectionRegex> <query1> <query2> ...
// Example: npx tsx scripts/search-section.ts "8" "section\\s*8\\b" "summary dismissal misconduct"
// Example: npx tsx scripts/search-section.ts --cap 282 "5" "s\\.?\\s*5\\b|section\\s*5\\b|第\\s*5\\s*條" "employer liability compensation"

// Parse --cap flag
let capNumber = 57; // default
const args = process.argv.slice(2);
if (args[0] === "--cap") {
  capNumber = parseInt(args[1]);
  args.splice(0, 2);
}

const SECTION = args[0];
const SECTION_REGEX_STR = args[1];
const QUERIES = args.slice(2);

if (!SECTION || !SECTION_REGEX_STR || QUERIES.length === 0) {
  console.error("Usage: npx tsx scripts/search-section.ts [--cap N] <section> <sectionRegex> <query1> <query2> ...");
  process.exit(1);
}

// Ordinance-specific regex
const CAP_REGEXES: Record<number, RegExp> = {
  57: /employment ordinance|cap\.?\s*57|僱傭條例/i,
  282: /employees.?\s*compensation ordinance|cap\.?\s*282|僱員補償條例/i,
};
const capRe = CAP_REGEXES[capNumber];
if (!capRe) {
  console.error(`No regex defined for Cap ${capNumber}. Add it to CAP_REGEXES in search-section.ts.`);
  process.exit(1);
}
console.log(`Using Cap ${capNumber} regex: ${capRe}`);
const sectionRe = new RegExp(SECTION_REGEX_STR, "i");

async function main() {
  const allChunks = new Map<string, any>();

  for (const query of QUERIES) {
    console.log(`\nSearch: "${query}"`);
    const results = await searchCasesRaw(query, { numResults: 30 });
    console.log(`  → ${results.length} chunks`);
    for (const r of results) {
      const key = `${r.citation}|${r.chunkIndex}`;
      if (!allChunks.has(key)) allChunks.set(key, r);
    }
  }

  console.log(`\n========================================`);
  console.log(`Total unique chunks: ${allChunks.size}`);

  // Filter: Cap 57 + section regex
  const relevant = new Map<string, any[]>();
  for (const chunk of allChunks.values()) {
    if (capRe.test(chunk.text) && sectionRe.test(chunk.text)) {
      if (!relevant.has(chunk.citation)) relevant.set(chunk.citation, []);
      relevant.get(chunk.citation)!.push(chunk);
    }
  }

  console.log(`Cases mentioning Cap ${capNumber} + section ${SECTION}: ${relevant.size}`);

  const sorted = [...relevant.entries()].sort((a, b) =>
    Math.max(...b[1].map((c: any) => c.score)) - Math.max(...a[1].map((c: any) => c.score))
  );

  for (const [citation, chunks] of sorted.slice(0, 12)) {
    const best = chunks.sort((a: any, b: any) => b.score - a.score)[0];
    console.log(`\n--- ${citation} (${best.court}, ${best.year}) - ${chunks.length} chunks, score ${best.score.toFixed(4)} ---`);
    console.log(best.text.slice(0, 500));
    console.log("...");
  }

  // Fetch full judgments for top 6
  console.log(`\n\n${"#".repeat(60)}`);
  console.log(`FETCHING FULL JUDGMENTS FOR TOP 6`);
  console.log(`${"#".repeat(60)}`);

  for (const [citation, chunks] of sorted.slice(0, 6)) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`FETCHING: ${citation} (${chunks[0].court}, ${chunks[0].year})`);
    const fullText = await getCaseDetails(citation);
    console.log(`Full text length: ${fullText.length} chars`);
    console.log(`\n--- HEADER ---`);
    console.log(fullText.slice(0, 1500));

    const matches = [...fullText.matchAll(new RegExp(SECTION_REGEX_STR, "gi"))];
    console.log(`\n--- SECTION ${SECTION} MENTIONS (${matches.length}) ---`);
    for (const m of matches.slice(0, 5)) {
      const start = Math.max(0, m.index! - 200);
      const end = Math.min(fullText.length, m.index! + 500);
      console.log(`\n[at char ${m.index}]:`);
      console.log("..." + fullText.slice(start, end) + "...");
    }
  }
}

main().catch(console.error);
