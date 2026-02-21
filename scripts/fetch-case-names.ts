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

import { getCaseDetails } from "../src/lib/pinecone";

async function main() {
  const citations = ["[2021] HKDC 386", "[2017] HKDC 1019"];

  for (const citation of citations) {
    console.log(`\nFetching: ${citation}`);
    const chunks = await getCaseDetails(citation);
    // getCaseDetails returns a string; use raw Pinecone query instead
    console.log(`  result (first 300 chars): ${String(chunks).slice(0, 300)}`);

  }
}

main().catch(console.error);
