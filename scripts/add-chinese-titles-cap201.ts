/**
 * Adds Chinese titles to Cap 201 structure from HKLII API
 */
import * as fs from "fs";
import * as path from "path";

interface TocItem {
  subpath: string;
  title: string;
  prov_num: string;
  section_type: string;
}

async function fetchToc(versionId: number): Promise<TocItem[]> {
  const res = await fetch(
    `https://www.hklii.hk/api/getcapversiontoc?id=${versionId}`
  );
  return res.json();
}

async function main() {
  // Get Chinese version ID
  const cap201ZhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=201")
  ).json();
  const cap201ZhId = cap201ZhVersions[0].id;

  console.log(`Fetching Chinese TOC for Cap 201 (version ${cap201ZhId})...`);

  const zhToc = await fetchToc(cap201ZhId);

  // Build lookup maps by prov_num for Parts and by subpath for Sections
  const zhPartMap = new Map<string, string>();
  const zhSectionMap = new Map<string, string>();

  for (const item of zhToc) {
    if (item.section_type === "P") {
      // Part - extract roman numeral from "第I部" format and map to "Part I"
      const match = item.prov_num.match(/([IVX]+)/);
      if (match) {
        const romanNumeral = match[1];
        zhPartMap.set(`Part ${romanNumeral}`, item.title);
      }
    } else if (item.section_type === "S") {
      // Section - use subpath as key (e.g., "s1", "s2")
      zhSectionMap.set(item.subpath, item.title);
    }
  }

  console.log(`Found ${zhPartMap.size} Parts, ${zhSectionMap.size} Sections`);

  // Load existing structure
  const structureFile = path.join(__dirname, "../src/data/cap201-structure.json");
  const raw = fs.readFileSync(structureFile, "utf-8");
  const data = JSON.parse(raw);

  // Add Chinese titles
  for (const part of data.parts) {
    const zhTitle = zhPartMap.get(part.id);
    if (zhTitle) {
      part.titleZh = zhTitle;
    } else {
      console.log(`WARNING: No Chinese title for ${part.id}`);
    }

    for (const section of part.sections) {
      const zhTitle = zhSectionMap.get(section.subpath);
      if (zhTitle) {
        section.titleZh = zhTitle;
      } else {
        console.log(`WARNING: No Chinese title for ${section.subpath}`);
      }
    }
  }

  // Save
  fs.writeFileSync(structureFile, JSON.stringify(data, null, 2) + "\n");
  console.log(`✅ Added Chinese titles to ${structureFile}`);
}

main().catch(console.error);
