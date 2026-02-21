/**
 * Rebuilds complete ordinance structure from HKLII API.
 * Fetches ALL sections (not just the incomplete JSON files).
 *
 * Usage: npx tsx scripts/rebuild-ordinance-from-hklii.ts <cap_number>
 * Example: npx tsx scripts/rebuild-ordinance-from-hklii.ts 282
 */
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TocItem {
  section_type: string;
  prov_num: string;
  title: string;
  subpath?: string;
  content?: string;
}

interface Section {
  id: string;
  number: string;
  title: string;
  titleZh: string;
  subpath: string;
  textEn: string;
  textZh: string;
}

interface Part {
  id: string;
  title: string;
  titleZh: string;
  sections: Section[];
}

interface OrdinanceStructure {
  cap: string;
  title: string;
  titleZh: string;
  parts: Part[];
  schedules: Array<{
    id: string;
    title: string;
    titleZh: string;
    subpath: string;
    textEn: string;
    textZh: string;
  }>;
}

/**
 * Clean HKLII HTML for safe rendering
 */
function cleanHtml(raw: string): string {
  let html = raw;

  // Remove the outer <section> wrapper
  html = html.replace(/<section[^>]*>\s*/, '');
  html = html.replace(/\s*<\/section>$/, '');

  // Convert <num> tags to bold spans
  html = html.replace(/<num[^>]*>[\s\S]*?<\/num>/, ''); // remove first occurrence (section number)
  html = html.replace(/<num[^>]*>([\s\S]*?)<\/num>/g, '<span class="leg-num">$1</span>');

  // Remove <heading> tags
  html = html.replace(/<heading>[\s\S]*?<\/heading>/g, '');

  // Remove sourcenotes (amendment history)
  html = html.replace(/<sourcenote>[\s\S]*?<\/sourcenote>/g, '');

  // Remove inline spacers
  html = html.replace(/<inline[^>]*>[\s\S]*?<\/inline>/g, '');

  // Convert custom tags to divs with classes
  html = html.replace(/<subsection([^>]*)>/g, '<div class="leg-subsection"$1>');
  html = html.replace(/<\/subsection>/g, '</div>');
  html = html.replace(/<paragraph([^>]*)>/g, '<div class="leg-paragraph"$1>');
  html = html.replace(/<\/paragraph>/g, '</div>');
  html = html.replace(/<subparagraph([^>]*)>/g, '<div class="leg-subparagraph"$1>');
  html = html.replace(/<\/subparagraph>/g, '</div>');

  // Convert <content>, <leadin>, <continued> to spans
  html = html.replace(/<content>/g, '<span class="leg-content">');
  html = html.replace(/<\/content>/g, '</span>');
  html = html.replace(/<leadin>/g, '<span class="leg-leadin">');
  html = html.replace(/<\/leadin>/g, '</span>');
  html = html.replace(/<continued>/g, '<span class="leg-continued">');
  html = html.replace(/<\/continued>/g, '</span>');

  // Convert <ref> to spans
  html = html.replace(/<ref[^>]*>/g, '<span class="leg-ref">');
  html = html.replace(/<\/ref>/g, '</span>');

  // Fix internal links
  html = html.replace(/<a href="\/en\/legis/g, '<a target="_blank" href="https://www.hklii.hk/en/legis');
  html = html.replace(/<a href="\/tc\/legis/g, '<a target="_blank" href="https://www.hklii.hk/tc/legis');
  html = html.replace(/<a href="https:\/\/www\.elegislation/g, '<a target="_blank" href="https://www.elegislation');

  // Clean up excessive whitespace
  html = html.replace(/\s+/g, ' ').trim();

  return html;
}

async function fetchVersionId(cap: string, lang: 'en' | 'tc'): Promise<number> {
  const res = await fetch(`https://www.hklii.hk/api/getcapversions?lang=${lang}&cap=${cap}`);
  const versions = await res.json();
  return versions[0].id;
}

async function fetchToc(versionId: number): Promise<TocItem[]> {
  const res = await fetch(`https://www.hklii.hk/api/getcapversiontoc?id=${versionId}`);
  return res.json();
}

async function rebuildOrdinance(cap: string) {
  console.log(`\n=== Rebuilding Cap ${cap} from HKLII ===\n`);

  // Fetch version IDs for both languages
  console.log('Fetching version IDs...');
  const [enVersionId, zhVersionId] = await Promise.all([
    fetchVersionId(cap, 'en'),
    fetchVersionId(cap, 'tc'),
  ]);

  console.log(`  EN version: ${enVersionId}`);
  console.log(`  ZH version: ${zhVersionId}\n`);

  // Fetch TOCs for both languages
  console.log('Fetching TOCs...');
  const [enToc, zhToc] = await Promise.all([
    fetchToc(enVersionId),
    fetchToc(zhVersionId),
  ]);

  console.log(`  EN TOC: ${enToc.length} items`);
  console.log(`  ZH TOC: ${zhToc.length} items\n`);

  // Build section map (EN + ZH)
  const enSections = enToc.filter(
    (item) => item.section_type === 'S' && !item.title.includes('(Repealed)')
  );
  const zhSections = zhToc.filter(
    (item) => item.section_type === 'S' && !item.title.includes('(已廢除)')
  );

  console.log(`Found ${enSections.length} non-repealed sections\n`);

  // Build part map
  const enParts = enToc.filter((item) => item.section_type === 'P');
  const zhParts = zhToc.filter((item) => item.section_type === 'P');

  console.log(`Found ${enParts.length} parts\n`);

  // Get ordinance metadata from database
  const { data: ordinance } = await supabase
    .from('ordinances')
    .select('title_en, title_zh')
    .eq('cap_number', cap)
    .single();

  if (!ordinance) {
    console.error(`Cap ${cap} not found in database!`);
    process.exit(1);
  }

  const structure: OrdinanceStructure = {
    cap,
    title: ordinance.title_en,
    titleZh: ordinance.title_zh || ordinance.title_en,
    parts: [],
    schedules: [],
  };

  // Build parts
  const partMap = new Map<string, Part>();

  for (let i = 0; i < enParts.length; i++) {
    const enPart = enParts[i];
    const zhPart = zhParts[i]; // Assume same order

    const partId = enPart.prov_num; // e.g., "Part I", "Part II"

    partMap.set(partId, {
      id: partId,
      title: enPart.title,
      titleZh: zhPart?.title || enPart.title,
      sections: [],
    });
  }

  console.log('Fetching section texts...');

  // Process sections
  for (let i = 0; i < enSections.length; i++) {
    const enSection = enSections[i];
    const zhSection = zhSections[i]; // Assume same order

    const sectionNumber = enSection.prov_num.replace('Section ', '');
    const sectionId = `Section ${sectionNumber}`;

    // Determine which part this section belongs to
    // (HKLII doesn't provide part grouping directly, so we'll infer from section numbers)
    // For now, put all sections in a single "Sections" part
    // TODO: Improve part grouping logic

    // Clean the HTML content
    const textEn = enSection.content ? cleanHtml(enSection.content) : '';
    const textZh = zhSection?.content ? cleanHtml(zhSection.content) : '';

    const section: Section = {
      id: sectionId,
      number: sectionNumber,
      title: enSection.title,
      titleZh: zhSection?.title || enSection.title,
      subpath: enSection.subpath || `s${sectionNumber}`,
      textEn,
      textZh,
    };

    // Add to first part (or create a default part)
    if (structure.parts.length === 0) {
      structure.parts.push({
        id: 'Part I',
        title: 'Sections',
        titleZh: '條文',
        sections: [],
      });
    }

    structure.parts[0].sections.push(section);

    if ((i + 1) % 10 === 0) {
      console.log(`  Processed ${i + 1}/${enSections.length} sections...`);
    }
  }

  console.log(`  Processed all ${enSections.length} sections\n`);

  // Handle schedules
  const enSchedules = enToc.filter((item) => item.section_type === 'Sch');
  const zhSchedules = zhToc.filter((item) => item.section_type === 'Sch');

  if (enSchedules.length > 0) {
    console.log(`Found ${enSchedules.length} schedules\n`);

    for (let i = 0; i < enSchedules.length; i++) {
      const enSch = enSchedules[i];
      const zhSch = zhSchedules[i];

      structure.schedules.push({
        id: enSch.prov_num,
        title: enSch.title,
        titleZh: zhSch?.title || enSch.title,
        subpath: enSch.subpath || `sch${i}`,
        textEn: enSch.content ? cleanHtml(enSch.content) : '',
        textZh: zhSch?.content ? cleanHtml(zhSch.content) : '',
      });
    }
  }

  // Save to JSON file
  const outputPath = path.resolve(__dirname, `../src/data/cap${cap}-structure-rebuilt.json`);
  fs.writeFileSync(outputPath, JSON.stringify(structure, null, 2));

  console.log(`✅ Saved to ${outputPath}\n`);
  console.log('Summary:');
  console.log(`  Parts: ${structure.parts.length}`);
  console.log(`  Total sections: ${structure.parts.reduce((sum, p) => sum + p.sections.length, 0)}`);
  console.log(`  Schedules: ${structure.schedules.length}`);
}

// Main
const capNumber = process.argv[2];

if (!capNumber) {
  console.error('Usage: npx tsx scripts/rebuild-ordinance-from-hklii.ts <cap_number>');
  console.error('Example: npx tsx scripts/rebuild-ordinance-from-hklii.ts 282');
  process.exit(1);
}

rebuildOrdinance(capNumber).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
