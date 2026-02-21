/**
 * Queries Pinecone for each case's language metadata and adds it to annotation JSONs.
 * Usage: npx tsx scripts/add-language-to-annotations.ts
 */
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually (no dotenv dependency)
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex);
  const value = trimmed.slice(eqIndex + 1);
  if (!process.env[key]) process.env[key] = value;
}

const PINECONE_API_KEY = process.env.PINECONE_API_KEY!;
const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST!;

async function queryPinecone(citation: string): Promise<string | null> {
  const dummyVector = new Array(512).fill(0);

  const res = await fetch(`${PINECONE_INDEX_HOST}/query`, {
    method: "POST",
    headers: {
      "Api-Key": PINECONE_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vector: dummyVector,
      topK: 1,
      includeMetadata: true,
      filter: { neutral_citation: citation },
    }),
  });

  const data = await res.json();
  if (data.matches && data.matches.length > 0) {
    return data.matches[0].metadata.language as string;
  }
  return null;
}

async function processFile(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  const allCases: { citation: string; sectionIdx: number; caseIdx: number }[] = [];
  for (let si = 0; si < data.sections.length; si++) {
    for (let ci = 0; ci < data.sections[si].cases.length; ci++) {
      allCases.push({
        citation: data.sections[si].cases[ci].citation,
        sectionIdx: si,
        caseIdx: ci,
      });
    }
  }

  // Deduplicate citations (same case may appear in multiple sections)
  const uniqueCitations = [...new Set(allCases.map((c) => c.citation))];
  console.log(`  ${uniqueCitations.length} unique citations to look up`);

  const languageMap: Record<string, string> = {};

  // Process in batches of 5
  for (let i = 0; i < uniqueCitations.length; i += 5) {
    const batch = uniqueCitations.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (citation) => {
        const lang = await queryPinecone(citation);
        return { citation, lang };
      })
    );

    for (const { citation, lang } of results) {
      if (lang) {
        languageMap[citation] = lang;
        console.log(`  ${citation} → ${lang}`);
      } else {
        console.log(`  ${citation} → NOT FOUND (defaulting to EN)`);
        languageMap[citation] = "EN";
      }
    }
  }

  // Write language back to all cases
  for (const { citation, sectionIdx, caseIdx } of allCases) {
    data.sections[sectionIdx].cases[caseIdx].language =
      languageMap[citation] || "EN";
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  console.log(`  Written to ${filePath}`);
}

async function main() {
  const files = [
    path.join(__dirname, "../src/data/cap57-annotations.json"),
    path.join(__dirname, "../src/data/cap282-annotations.json"),
  ];

  for (const f of files) {
    console.log(`Processing ${path.basename(f)}...`);
    await processFile(f);
    console.log();
  }
}

main().catch(console.error);
