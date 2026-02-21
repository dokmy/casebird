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

// These are the cases from the search that mention "continuous contract" -- the actual Cap 57 s.6A topic
const CASES = [
  "[1994] HKCFI 364",   // continuous employment concept
  "[2004] HKCFI 1595",  // 連續性僱傭
  "[2006] HKCA 271",    // 18 hours per week for 4 continuous weeks
  "[2007] HKCFI 1984",  // 連續性合約 Schedule 1
  "[2003] HKCFI 748",   // continuity, severance payment
  "[2003] HKCFI 742",   // 18 hours
  "[2010] HKCFI 552",   // continuous contract First Schedule
  "[2005] HKCFI 431",   // 18 hours
  "[1995] HKCFI 223",   // long service payment continuous contract
  "[1995] HKCFI 455",   // dismissed, continuous contract
  "[2004] HKDC 198",    // continuous contract threshold
  "[1970] HKDC 18",     // continuous contract Schedule
  "[1975] HKDC 33",     // continuous contract s.5 s.6
  "[1980] HKDC 24",     // continuous contract
  "[1989] HKCFI 51",    // continuous contract maternity
  "[2007] HKCFI 13",    // continuous contract daily worker
  "[2006] HKCA 233",    // count towards period of employment
  "[2009] HKCFI 266",   // Cap 57 s.6(2)
  "[2009] HKCFI 1335",  // 連續性合約 annual leave
  "[2012] HKCFA 22",    // continuous contract unfair dismissal
  "[2017] HKDC 886",    // continuous contract
  "[2017] HKDC 107",    // concurrent/successive contracts
  "[2021] HKCFI 412",   // 連續性合約
  "[2024] HKCFI 3688",  // 連續性合約
  "[2014] HKCA 591",    // severance payment continuous contract
];

const sectionRe = /(?:section|s\.?)\s*6A\b|第\s*6A\s*條/gi;
const scheduleRe = /first\s*schedule|schedule\s*1|附表\s*1/gi;
const contRe = /continuous\s*contract|continuous\s*employment|連續性合約|連續性僱傭/gi;
const hourRe = /18\s*hour|十八小時|eighteen\s*hour/gi;

async function main() {
  for (const citation of CASES) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`FETCHING: ${citation}`);
    const fullText = await getCaseDetails(citation);
    if (fullText.startsWith("Case not found")) {
      console.log("NOT FOUND IN PINECONE");
      continue;
    }
    console.log(`Full text length: ${fullText.length} chars`);

    // Header
    const headerEnd = Math.min(fullText.length, 800);
    console.log(`\n--- HEADER ---`);
    console.log(fullText.slice(0, headerEnd));

    // Count mentions
    const s6aMatches = [...fullText.matchAll(sectionRe)];
    const schedMatches = [...fullText.matchAll(scheduleRe)];
    const contMatches = [...fullText.matchAll(contRe)];
    const hourMatches = [...fullText.matchAll(hourRe)];

    console.log(`\n--- STATS: s.6A=${s6aMatches.length}, Schedule=${schedMatches.length}, continuous=${contMatches.length}, 18hrs=${hourMatches.length} ---`);

    // Show continuous contract context
    for (const m of contMatches.slice(0, 3)) {
      const start = Math.max(0, m.index! - 150);
      const end = Math.min(fullText.length, m.index! + 400);
      console.log(`\n[continuous contract at char ${m.index}]:`);
      console.log("..." + fullText.slice(start, end) + "...");
    }

    // Show 18 hour context
    for (const m of hourMatches.slice(0, 2)) {
      const start = Math.max(0, m.index! - 150);
      const end = Math.min(fullText.length, m.index! + 400);
      console.log(`\n[18 hours at char ${m.index}]:`);
      console.log("..." + fullText.slice(start, end) + "...");
    }

    // Show section 6A context (if Employment Ordinance, not FIUO)
    for (const m of s6aMatches.slice(0, 2)) {
      const start = Math.max(0, m.index! - 200);
      const end = Math.min(fullText.length, m.index! + 400);
      const context = fullText.slice(start, end);
      if (/cap\.?\s*57|employment\s*ordinance|僱傭條例/i.test(context)) {
        console.log(`\n[s.6A (Cap 57) at char ${m.index}]:`);
        console.log("..." + context + "...");
      }
    }
  }
}

main().catch(console.error);
