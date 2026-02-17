/**
 * Fetches legislation text from HKLII API and stores in annotation JSONs.
 * Usage: npx tsx scripts/fetch-legislation-text.ts
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

/**
 * Clean HKLII HTML for safe rendering:
 * - Convert custom XML tags to HTML divs/spans with classes
 * - Fix internal links
 * - Remove source notes (amendment history)
 */
function cleanHtml(raw: string): string {
  let html = raw;

  // Remove the outer <section> wrapper
  html = html.replace(/<section[^>]*>\s*/, "");
  html = html.replace(/\s*<\/section>$/, "");

  // Remove <num> tags (section numbers — we already show these)
  html = html.replace(/<num[^>]*>[\s\S]*?<\/num>/g, "");

  // Remove <heading> tags (we already show titles)
  html = html.replace(/<heading>[\s\S]*?<\/heading>/g, "");

  // Remove sourcenotes (amendment history like "Amended 67 of 1996 s. 2")
  html = html.replace(/<sourcenote>[\s\S]*?<\/sourcenote>/g, "");

  // Remove inline spacers
  html = html.replace(/<inline[^>]*>[\s\S]*?<\/inline>/g, "");

  // Convert custom tags to divs with classes
  html = html.replace(/<subsection([^>]*)>/g, '<div class="leg-subsection"$1>');
  html = html.replace(/<\/subsection>/g, "</div>");

  html = html.replace(/<paragraph([^>]*)>/g, '<div class="leg-paragraph"$1>');
  html = html.replace(/<\/paragraph>/g, "</div>");

  html = html.replace(/<subparagraph([^>]*)>/g, '<div class="leg-subparagraph"$1>');
  html = html.replace(/<\/subparagraph>/g, "</div>");

  // Convert <content> and <leadin> and <continued> to spans
  html = html.replace(/<content>/g, '<span class="leg-content">');
  html = html.replace(/<\/content>/g, "</span>");

  html = html.replace(/<leadin>/g, '<span class="leg-leadin">');
  html = html.replace(/<\/leadin>/g, "</span>");

  html = html.replace(/<continued>/g, '<span class="leg-continued">');
  html = html.replace(/<\/continued>/g, "</span>");

  // Convert <ref> to spans
  html = html.replace(/<ref[^>]*>/g, '<span class="leg-ref">');
  html = html.replace(/<\/ref>/g, "</span>");

  // Fix internal links: /en/legis/ord/282/s3#... → just keep as-is or remove
  // Keep the <a> tags but make them open in new tab
  html = html.replace(/<a href="\/en\/legis/g, '<a target="_blank" href="https://www.hklii.hk/en/legis');
  html = html.replace(/<a href="\/tc\/legis/g, '<a target="_blank" href="https://www.hklii.hk/tc/legis');

  // External links (elegislation) — already have target="_blank"
  // Just ensure they open in new tab
  html = html.replace(/<a href="https:\/\/www\.elegislation/g, '<a target="_blank" href="https://www.elegislation');

  // Clean up excessive whitespace
  html = html.replace(/\s+/g, " ").trim();

  return html;
}

interface AnnotationData {
  sections: Array<{
    section: string;
    titleEn: string;
    titleZh?: string;
    sectionTextEn?: string;
    sectionTextZh?: string;
    cases: unknown[];
  }>;
}

async function processOrdinance(
  capNum: number,
  enVersionId: number,
  zhVersionId: number,
  annotationFile: string
) {
  console.log(`\nFetching Cap ${capNum}...`);

  const [enToc, zhToc] = await Promise.all([
    fetchToc(enVersionId),
    fetchToc(zhVersionId),
  ]);

  console.log(`  EN TOC: ${enToc.length} items, ZH TOC: ${zhToc.length} items`);

  // Build lookup maps by subpath
  const enMap = new Map<string, TocItem>();
  const zhMap = new Map<string, TocItem>();
  for (const item of enToc) {
    if (item.section_type === "S") enMap.set(item.subpath, item);
  }
  for (const item of zhToc) {
    if (item.section_type === "S") zhMap.set(item.subpath, item);
  }

  // Load annotation file
  const raw = fs.readFileSync(annotationFile, "utf-8");
  const data: AnnotationData = JSON.parse(raw);

  let updated = 0;
  for (const section of data.sections) {
    // Map section number to subpath (e.g., "5" → "s5", "10A" → "s10A")
    const subpath = `s${section.section}`;

    const enItem = enMap.get(subpath);
    const zhItem = zhMap.get(subpath);

    if (enItem?.content) {
      section.sectionTextEn = cleanHtml(enItem.content);
      updated++;
    } else {
      console.log(`  WARNING: No EN content for s.${section.section}`);
    }

    if (zhItem?.content) {
      section.sectionTextZh = cleanHtml(zhItem.content);
    } else {
      console.log(`  WARNING: No ZH content for s.${section.section}`);
    }
  }

  fs.writeFileSync(annotationFile, JSON.stringify(data, null, 2) + "\n");
  console.log(`  Updated ${updated}/${data.sections.length} sections in ${path.basename(annotationFile)}`);
}

async function main() {
  // Cap 57 — Employment Ordinance
  // Need to get version IDs first
  const cap57EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=57")
  ).json();
  const cap57ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=57")
  ).json();

  const cap57EnId = cap57EnVersions[0].id;
  const cap57ZhId = cap57ZhVersions[0].id;
  console.log(`Cap 57: EN version=${cap57EnId}, ZH version=${cap57ZhId}`);

  await processOrdinance(
    57,
    cap57EnId,
    cap57ZhId,
    path.join(__dirname, "../src/data/cap57-annotations.json")
  );

  // Cap 282 — Employees' Compensation Ordinance
  const cap282EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=282")
  ).json();
  const cap282ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=282")
  ).json();

  const cap282EnId = cap282EnVersions[0].id;
  const cap282ZhId = cap282ZhVersions[0].id;
  console.log(`Cap 282: EN version=${cap282EnId}, ZH version=${cap282ZhId}`);

  await processOrdinance(
    282,
    cap282EnId,
    cap282ZhId,
    path.join(__dirname, "../src/data/cap282-annotations.json")
  );
}

main().catch(console.error);
