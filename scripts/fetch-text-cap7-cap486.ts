/**
 * Fetches legislation text for Cap 7 and Cap 486 from HKLII API.
 * Usage: npx tsx scripts/fetch-text-cap7-cap486.ts
 */
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
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

interface TocItem {
  subpath: string;
  title: string;
  content: string;
  section_type: string;
  prov_num: string;
}

async function fetchToc(versionId: number): Promise<TocItem[]> {
  const res = await fetch(
    `https://www.hklii.hk/api/getcapversiontoc?id=${versionId}`
  );
  return res.json();
}

function cleanHtml(raw: string): string {
  let html = raw;
  html = html.replace(/<section[^>]*>\s*/, "");
  html = html.replace(/\s*<\/section>$/, "");
  html = html.replace(/<num[^>]*>[\s\S]*?<\/num>/, "");
  html = html.replace(/<num[^>]*>([\s\S]*?)<\/num>/g, '<span class="leg-num">$1</span>');
  html = html.replace(/<heading>[\s\S]*?<\/heading>/g, "");
  html = html.replace(/<sourcenote>[\s\S]*?<\/sourcenote>/g, "");
  html = html.replace(/<inline[^>]*>[\s\S]*?<\/inline>/g, "");
  html = html.replace(/<subsection([^>]*)>/g, '<div class="leg-subsection"$1>');
  html = html.replace(/<\/subsection>/g, "</div>");
  html = html.replace(/<paragraph([^>]*)>/g, '<div class="leg-paragraph"$1>');
  html = html.replace(/<\/paragraph>/g, "</div>");
  html = html.replace(/<subparagraph([^>]*)>/g, '<div class="leg-subparagraph"$1>');
  html = html.replace(/<\/subparagraph>/g, "</div>");
  html = html.replace(/<content>/g, '<span class="leg-content">');
  html = html.replace(/<\/content>/g, "</span>");
  html = html.replace(/<leadin>/g, '<span class="leg-leadin">');
  html = html.replace(/<\/leadin>/g, "</span>");
  html = html.replace(/<continued>/g, '<span class="leg-continued">');
  html = html.replace(/<\/continued>/g, "</span>");
  html = html.replace(/<ref[^>]*>/g, '<span class="leg-ref">');
  html = html.replace(/<\/ref>/g, "</span>");
  html = html.replace(/<a href="\/en\/legis/g, '<a target="_blank" href="https://www.hklii.hk/en/legis');
  html = html.replace(/<a href="\/tc\/legis/g, '<a target="_blank" href="https://www.hklii.hk/tc/legis');
  html = html.replace(/<a href="https:\/\/www\.elegislation/g, '<a target="_blank" href="https://www.elegislation');
  html = html.replace(/\s+/g, " ").trim();
  return html;
}

async function processStructure(
  capNum: number,
  enVersionId: number,
  zhVersionId: number,
  structureFile: string
) {
  console.log(`\nFetching Cap ${capNum} structure with text...`);

  const [enToc, zhToc] = await Promise.all([
    fetchToc(enVersionId),
    fetchToc(zhVersionId),
  ]);

  console.log(`  EN TOC: ${enToc.length} items, ZH TOC: ${zhToc.length} items`);

  const enMap = new Map<string, TocItem>();
  const zhMap = new Map<string, TocItem>();
  for (const item of enToc) {
    if (item.section_type === "S") enMap.set(item.subpath, item);
  }
  for (const item of zhToc) {
    if (item.section_type === "S") zhMap.set(item.subpath, item);
  }

  const raw = fs.readFileSync(structureFile, "utf-8");
  const data = JSON.parse(raw);

  let updated = 0;
  let noContent = 0;
  for (const part of data.parts) {
    for (const section of part.sections) {
      const enItem = enMap.get(section.subpath);
      const zhItem = zhMap.get(section.subpath);

      if (enItem?.content) {
        section.textEn = cleanHtml(enItem.content);
        updated++;
      } else {
        noContent++;
        console.log(`  WARNING: No EN content for ${section.subpath}`);
      }

      if (zhItem?.content) {
        section.textZh = cleanHtml(zhItem.content);
      } else {
        console.log(`  WARNING: No ZH content for ${section.subpath}`);
      }
    }
  }

  fs.writeFileSync(structureFile, JSON.stringify(data, null, 2) + "\n");
  console.log(`  Updated ${updated} sections, ${noContent} without content in ${path.basename(structureFile)}`);
}

async function main() {
  // Cap 7 — Landlord and Tenant (Consolidation) Ordinance
  await processStructure(
    7,
    49987,
    49988,
    path.join(__dirname, "../src/data/cap7-structure.json")
  );

  // Cap 486 — Personal Data (Privacy) Ordinance
  await processStructure(
    486,
    31561,
    48650,
    path.join(__dirname, "../src/data/cap486-structure.json")
  );
}

main().catch(console.error);
