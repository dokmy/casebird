/**
 * Builds cap57-structure.json and cap282-structure.json from annotations
 * Organizes sections by Parts (like cap201-structure.json)
 */
import * as fs from "fs";
import * as path from "path";

// Cap 57
const cap57Annotations = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/data/cap57-annotations.json"), "utf-8")
);

const { CAP57_SECTIONS } = require("../src/data/cap57-sections.ts");

// Build Cap 57 structure organized by Parts
const cap57Parts = new Map<string, any>();

for (const section of cap57Annotations.sections) {
  const sectionDef = CAP57_SECTIONS.find((s: any) => s.section === section.section);
  if (!sectionDef) {
    console.log(`WARNING: No definition found for Cap 57 section ${section.section}`);
    continue;
  }

  const partKey = `Part ${sectionDef.part}`;
  if (!cap57Parts.has(partKey)) {
    cap57Parts.set(partKey, {
      id: partKey,
      title: sectionDef.partTitleEn,
      titleZh: sectionDef.partTitleZh,
      sections: [],
    });
  }

  const part = cap57Parts.get(partKey);
  part.sections.push({
    id: `Section ${section.section}`,
    title: section.titleEn,
    titleZh: section.titleZh,
    subpath: `s${section.section}`,
    textEn: section.sectionTextEn || "",
    textZh: section.sectionTextZh || "",
  });
}

const cap57Structure = {
  cap: "57",
  title: "Employment Ordinance",
  titleZh: "僱傭條例",
  parts: Array.from(cap57Parts.values()),
};

fs.writeFileSync(
  path.join(__dirname, "../src/data/cap57-structure.json"),
  JSON.stringify(cap57Structure, null, 2) + "\n"
);
console.log(`Created cap57-structure.json with ${cap57Parts.size} parts`);

// Cap 282
const cap282Annotations = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/data/cap282-annotations.json"), "utf-8")
);

// Fetch Cap 282 TOC to get Part organization
async function buildCap282Structure() {
  const enVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=en&cap=282")
  ).json();
  const zhVersions = await (
    await fetch("https://www.hklii.hk/api/getcapversions?lang=tc&cap=282")
  ).json();

  const enToc = await (
    await fetch(`https://www.hklii.hk/api/getcapversiontoc?id=${enVersions[0].id}`)
  ).json();
  const zhToc = await (
    await fetch(`https://www.hklii.hk/api/getcapversiontoc?id=${zhVersions[0].id}`)
  ).json();

  // Build lookup for ZH titles
  const zhTitleMap = new Map<string, string>();
  for (const item of zhToc) {
    if (item.section_type === "S") {
      zhTitleMap.set(item.subpath, item.title);
    }
  }

  // Organize by Parts
  const parts = new Map<string, any>();
  let currentPart: any = null;

  for (const item of enToc) {
    if (item.section_type === "P") {
      // New Part
      const zhPart = zhToc.find((z: any) => z.subpath === item.subpath);
      currentPart = {
        id: item.prov_num,
        title: item.title,
        titleZh: zhPart?.title || "",
        sections: [],
      };
      parts.set(item.prov_num, currentPart);
    } else if (item.section_type === "S" && currentPart) {
      // Section - add to current part
      const sectionNum = item.subpath.replace("s", "");
      const sectionData = cap282Annotations.sections.find(
        (s: any) => s.section === sectionNum
      );

      if (sectionData) {
        currentPart.sections.push({
          id: item.prov_num,
          title: item.title,
          titleZh: zhTitleMap.get(item.subpath) || "",
          subpath: item.subpath,
          textEn: sectionData.sectionTextEn || "",
          textZh: sectionData.sectionTextZh || "",
        });
      }
    }
  }

  const cap282Structure = {
    cap: "282",
    title: "Employees' Compensation Ordinance",
    titleZh: "僱員補償條例",
    parts: Array.from(parts.values()).filter((p) => p.sections.length > 0),
  };

  fs.writeFileSync(
    path.join(__dirname, "../src/data/cap282-structure.json"),
    JSON.stringify(cap282Structure, null, 2) + "\n"
  );
  console.log(`Created cap282-structure.json with ${parts.size} parts`);
}

buildCap282Structure().catch(console.error);
