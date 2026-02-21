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

  // Convert <num> tags to bold spans (subsection numbers like (1), (a), etc.)
  // Remove only the top-level section number (first <num> before any <subsection>)
  html = html.replace(/<num[^>]*>[\s\S]*?<\/num>/, ""); // remove first occurrence only (section number)
  html = html.replace(/<num[^>]*>([\s\S]*?)<\/num>/g, '<span class="leg-num">$1</span>');

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

async function processOrdinanceStructure(
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

  // Build lookup maps by subpath for sections
  const enMap = new Map<string, TocItem>();
  const zhMap = new Map<string, TocItem>();
  for (const item of enToc) {
    if (item.section_type === "S") enMap.set(item.subpath, item);
  }
  for (const item of zhToc) {
    if (item.section_type === "S") zhMap.set(item.subpath, item);
  }

  // Build schedule lists
  const enSchedules: TocItem[] = [];
  const zhSchedules: TocItem[] = [];
  for (const item of enToc) {
    if (item.section_type === "SCH") enSchedules.push(item);
  }
  for (const item of zhToc) {
    if (item.section_type === "SCH") zhSchedules.push(item);
  }

  // Load structure file
  const raw = fs.readFileSync(structureFile, "utf-8");
  const data = JSON.parse(raw);

  let updated = 0;
  for (const part of data.parts) {
    for (const section of part.sections) {
      const enItem = enMap.get(section.subpath);
      const zhItem = zhMap.get(section.subpath);

      if (enItem?.content) {
        section.textEn = cleanHtml(enItem.content);
        updated++;
      } else {
        console.log(`  WARNING: No EN content for ${section.subpath}`);
      }

      if (zhItem?.content) {
        section.textZh = cleanHtml(zhItem.content);
      } else {
        console.log(`  WARNING: No ZH content for ${section.subpath}`);
      }
    }
  }

  // Add schedules if they exist
  if (enSchedules.length > 0) {
    const schedules = [];
    for (let i = 0; i < enSchedules.length; i++) {
      const enSch = enSchedules[i];
      const zhSch = zhSchedules.find(s => s.subpath === enSch.subpath);

      schedules.push({
        id: enSch.prov_num,
        title: enSch.title,
        titleZh: zhSch?.title || "",
        subpath: enSch.subpath,
        textEn: enSch.content ? cleanHtml(enSch.content) : "",
        textZh: zhSch?.content ? cleanHtml(zhSch.content) : "",
      });
    }
    data.schedules = schedules;
    console.log(`  Added ${schedules.length} schedules`);
  }

  fs.writeFileSync(structureFile, JSON.stringify(data, null, 2) + "\n");
  console.log(`  Updated ${updated} sections in ${path.basename(structureFile)}`);
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

  // Cap 201 — Prevention of Bribery Ordinance (structure file, not annotations)
  const cap201EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=201")
  ).json();
  const cap201ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=201")
  ).json();

  const cap201EnId = cap201EnVersions[0].id;
  const cap201ZhId = cap201ZhVersions[0].id;
  console.log(`Cap 201: EN version=${cap201EnId}, ZH version=${cap201ZhId}`);

  await processOrdinanceStructure(
    201,
    cap201EnId,
    cap201ZhId,
    path.join(__dirname, "../src/data/cap201-structure.json")
  );

  // Cap 553 — Electronic Transactions Ordinance (structure file)
  const cap553EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=553")
  ).json();
  const cap553ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=553")
  ).json();

  const cap553EnId = cap553EnVersions[0].id;
  const cap553ZhId = cap553ZhVersions[0].id;
  console.log(`Cap 553: EN version=${cap553EnId}, ZH version=${cap553ZhId}`);

  await processOrdinanceStructure(
    553,
    cap553EnId,
    cap553ZhId,
    path.join(__dirname, "../src/data/cap553-structure.json")
  );

  // Cap 128 — Land Registration Ordinance (structure file)
  const cap128EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=128")
  ).json();
  const cap128ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=128")
  ).json();

  const cap128EnId = cap128EnVersions[0].id;
  const cap128ZhId = cap128ZhVersions[0].id;
  console.log(`Cap 128: EN version=${cap128EnId}, ZH version=${cap128ZhId}`);

  await processOrdinanceStructure(
    128,
    cap128EnId,
    cap128ZhId,
    path.join(__dirname, "../src/data/cap128-structure.json")
  );

  // Cap 112 — Inland Revenue Ordinance (structure file)
  const cap112EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=112")
  ).json();
  const cap112ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=112")
  ).json();

  const cap112EnId = cap112EnVersions[0].id;
  const cap112ZhId = cap112ZhVersions[0].id;
  console.log(`Cap 112: EN version=${cap112EnId}, ZH version=${cap112ZhId}`);

  await processOrdinanceStructure(
    112,
    cap112EnId,
    cap112ZhId,
    path.join(__dirname, "../src/data/cap112-structure.json")
  );

  // Cap 509 — Occupational Safety and Health Ordinance (structure file)
  const cap509EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=509")
  ).json();
  const cap509ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=509")
  ).json();

  const cap509EnId = cap509EnVersions[0].id;
  const cap509ZhId = cap509ZhVersions[0].id;
  console.log(`Cap 509: EN version=${cap509EnId}, ZH version=${cap509ZhId}`);

  await processOrdinanceStructure(
    509,
    cap509EnId,
    cap509ZhId,
    path.join(__dirname, "../src/data/cap509-structure.json")
  );

  // Cap 7 — Landlord and Tenant (Consolidation) Ordinance (structure file)
  const cap7EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=7")
  ).json();
  const cap7ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=7")
  ).json();

  const cap7EnId = cap7EnVersions[0].id;
  const cap7ZhId = cap7ZhVersions[0].id;
  console.log(`Cap 7: EN version=${cap7EnId}, ZH version=${cap7ZhId}`);

  await processOrdinanceStructure(
    7,
    cap7EnId,
    cap7ZhId,
    path.join(__dirname, "../src/data/cap7-structure.json")
  );

  // Cap 486 — Personal Data (Privacy) Ordinance (structure file)
  const cap486EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=486")
  ).json();
  const cap486ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=486")
  ).json();

  const cap486EnId = cap486EnVersions[0].id;
  const cap486ZhId = cap486ZhVersions[0].id;
  console.log(`Cap 486: EN version=${cap486EnId}, ZH version=${cap486ZhId}`);

  await processOrdinanceStructure(
    486,
    cap486EnId,
    cap486ZhId,
    path.join(__dirname, "../src/data/cap486-structure.json")
  );

  // Cap 32 — Companies (Winding Up and Miscellaneous Provisions) Ordinance (structure file)
  const cap32EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=32")
  ).json();
  const cap32ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=32")
  ).json();

  const cap32EnId = cap32EnVersions[0].id;
  const cap32ZhId = cap32ZhVersions[0].id;
  console.log(`Cap 32: EN version=${cap32EnId}, ZH version=${cap32ZhId}`);

  await processOrdinanceStructure(
    32,
    cap32EnId,
    cap32ZhId,
    path.join(__dirname, "../src/data/cap32-structure.json")
  );

  // Cap 571 — Securities and Futures Ordinance (structure file)
  const cap571EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=571")
  ).json();
  const cap571ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=571")
  ).json();

  const cap571EnId = cap571EnVersions[0].id;
  const cap571ZhId = cap571ZhVersions[0].id;
  console.log(`Cap 571: EN version=${cap571EnId}, ZH version=${cap571ZhId}`);

  await processOrdinanceStructure(
    571,
    cap571EnId,
    cap571ZhId,
    path.join(__dirname, "../src/data/cap571-structure.json")
  );

  // Cap 374 — Road Traffic Ordinance (structure file)
  const cap374EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=374")
  ).json();
  const cap374ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=374")
  ).json();

  const cap374EnId = cap374EnVersions[0].id;
  const cap374ZhId = cap374ZhVersions[0].id;
  console.log(`Cap 374: EN version=${cap374EnId}, ZH version=${cap374ZhId}`);

  await processOrdinanceStructure(
    374,
    cap374EnId,
    cap374ZhId,
    path.join(__dirname, "../src/data/cap374-structure.json")
  );

  // Cap 221 — Criminal Procedure Ordinance (structure file)
  const cap221EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=221")
  ).json();
  const cap221ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=221")
  ).json();

  const cap221EnId = cap221EnVersions[0].id;
  const cap221ZhId = cap221ZhVersions[0].id;
  console.log(`Cap 221: EN version=${cap221EnId}, ZH version=${cap221ZhId}`);

  await processOrdinanceStructure(
    221,
    cap221EnId,
    cap221ZhId,
    path.join(__dirname, "../src/data/cap221-structure.json")
  );

  // Cap 455 — Organized and Serious Crimes Ordinance (structure file)
  const cap455EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=455")
  ).json();
  const cap455ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=455")
  ).json();

  const cap455EnId = cap455EnVersions[0].id;
  const cap455ZhId = cap455ZhVersions[0].id;
  console.log(`Cap 455: EN version=${cap455EnId}, ZH version=${cap455ZhId}`);

  await processOrdinanceStructure(
    455,
    cap455EnId,
    cap455ZhId,
    path.join(__dirname, "../src/data/cap455-structure.json")
  );

  // Cap 115 — Immigration Ordinance (structure file)
  const cap115EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=115")
  ).json();
  const cap115ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=115")
  ).json();

  const cap115EnId = cap115EnVersions[0].id;
  const cap115ZhId = cap115ZhVersions[0].id;
  console.log(`Cap 115: EN version=${cap115EnId}, ZH version=${cap115ZhId}`);

  await processOrdinanceStructure(
    115,
    cap115EnId,
    cap115ZhId,
    path.join(__dirname, "../src/data/cap115-structure.json")
  );

  // Cap 179 — Matrimonial Causes Ordinance (structure file)
  const cap179EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=179")
  ).json();
  const cap179ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=179")
  ).json();

  const cap179EnId = cap179EnVersions[0].id;
  const cap179ZhId = cap179ZhVersions[0].id;
  console.log(`Cap 179: EN version=${cap179EnId}, ZH version=${cap179ZhId}`);

  await processOrdinanceStructure(
    179,
    cap179EnId,
    cap179ZhId,
    path.join(__dirname, "../src/data/cap179-structure.json")
  );

  // Cap 26 — Sale of Goods Ordinance (structure file)
  const cap26EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=26")
  ).json();
  const cap26ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=26")
  ).json();

  const cap26EnId = cap26EnVersions[0].id;
  const cap26ZhId = cap26ZhVersions[0].id;
  console.log(`Cap 26: EN version=${cap26EnId}, ZH version=${cap26ZhId}`);

  await processOrdinanceStructure(
    26,
    cap26EnId,
    cap26ZhId,
    path.join(__dirname, "../src/data/cap26-structure.json")
  );

  // Cap 528 — Copyright Ordinance (structure file)
  const cap528EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=528")
  ).json();
  const cap528ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=528")
  ).json();

  const cap528EnId = cap528EnVersions[0].id;
  const cap528ZhId = cap528ZhVersions[0].id;
  console.log(`Cap 528: EN version=${cap528EnId}, ZH version=${cap528ZhId}`);

  await processOrdinanceStructure(
    528,
    cap528EnId,
    cap528ZhId,
    path.join(__dirname, "../src/data/cap528-structure.json")
  );

  // Cap 344 — Building Management Ordinance (structure file)
  const cap344EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=344")
  ).json();
  const cap344ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=344")
  ).json();

  const cap344EnId = cap344EnVersions[0].id;
  const cap344ZhId = cap344ZhVersions[0].id;
  console.log(`Cap 344: EN version=${cap344EnId}, ZH version=${cap344ZhId}`);

  await processOrdinanceStructure(
    344,
    cap344EnId,
    cap344ZhId,
    path.join(__dirname, "../src/data/cap344-structure.json")
  );

  // Cap 6 — Bankruptcy Ordinance (structure file)
  const cap6EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=6")
  ).json();
  const cap6ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=6")
  ).json();

  const cap6EnId = cap6EnVersions[0].id;
  const cap6ZhId = cap6ZhVersions[0].id;
  console.log(`Cap 6: EN version=${cap6EnId}, ZH version=${cap6ZhId}`);

  await processOrdinanceStructure(
    6,
    cap6EnId,
    cap6ZhId,
    path.join(__dirname, "../src/data/cap6-structure.json")
  );

  // Cap 210 — Theft Ordinance (structure file)
  const cap210EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=210")
  ).json();
  const cap210ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=210")
  ).json();

  const cap210EnId = cap210EnVersions[0].id;
  const cap210ZhId = cap210ZhVersions[0].id;
  console.log(`Cap 210: EN version=${cap210EnId}, ZH version=${cap210ZhId}`);

  await processOrdinanceStructure(
    210,
    cap210EnId,
    cap210ZhId,
    path.join(__dirname, "../src/data/cap210-structure.json")
  );

  // Cap 559 — Trade Marks Ordinance (structure file)
  const cap559EnVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=559")
  ).json();
  const cap559ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=559")
  ).json();

  const cap559EnId = cap559EnVersions[0].id;
  const cap559ZhId = cap559ZhVersions[0].id;
  console.log(`Cap 559: EN version=${cap559EnId}, ZH version=${cap559ZhId}`);

  await processOrdinanceStructure(
    559,
    cap559EnId,
    cap559ZhId,
    path.join(__dirname, "../src/data/cap559-structure.json")
  );
}

main().catch(console.error);
