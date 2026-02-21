/**
 * Updates an ordinance in the database from a rebuilt JSON file.
 * Deletes existing sections and re-inserts from the JSON.
 *
 * Usage: npx tsx scripts/update-ordinance-in-db.ts <cap_number> <json_file>
 * Example: npx tsx scripts/update-ordinance-in-db.ts 282 src/data/cap282-structure-rebuilt.json
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface OrdinanceStructure {
  cap: string;
  title: string;
  titleZh: string;
  parts: Array<{
    id: string;
    title: string;
    titleZh: string;
    sections: Array<{
      id: string;
      number: string;
      title: string;
      titleZh: string;
      subpath: string;
      textEn: string;
      textZh: string;
    }>;
  }>;
  schedules?: Array<{
    id: string;
    title: string;
    titleZh: string;
    subpath: string;
    textEn: string;
    textZh: string;
  }>;
}

async function updateOrdinance(capNumber: string, jsonFile: string) {
  console.log(`\n=== Updating Cap ${capNumber} in database ===\n`);

  // Load JSON
  console.log(`Loading ${jsonFile}...`);
  const structure: OrdinanceStructure = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));

  console.log(`  Title: ${structure.title}`);
  console.log(`  Parts: ${structure.parts.length}`);
  console.log(`  Total sections: ${structure.parts.reduce((sum, p) => sum + p.sections.length, 0)}`);
  console.log(`  Schedules: ${structure.schedules?.length || 0}\n`);

  // Get ordinance ID from database
  const { data: ordinance, error: ordError } = await supabase
    .from('ordinances')
    .select('id, title_en')
    .eq('cap_number', capNumber)
    .single();

  if (ordError || !ordinance) {
    console.error(`❌ Ordinance Cap ${capNumber} not found in database`);
    process.exit(1);
  }

  console.log(`Found ordinance in database: ${ordinance.title_en}\n`);

  const ordinanceId = ordinance.id;

  // Step 1: Delete existing parts and sections (cascade will handle sections)
  console.log('Deleting existing parts and sections...');
  const { error: deletePartsError } = await supabase
    .from('ordinance_parts')
    .delete()
    .eq('ordinance_id', ordinanceId);

  if (deletePartsError) {
    console.error('❌ Error deleting parts:', deletePartsError);
    process.exit(1);
  }

  console.log('  ✅ Deleted old parts and sections\n');

  // Step 2: Insert new parts and sections
  console.log('Inserting new parts and sections...');

  let totalSectionsInserted = 0;

  for (let partIndex = 0; partIndex < structure.parts.length; partIndex++) {
    const part = structure.parts[partIndex];

    console.log(`  Part ${partIndex + 1}/${structure.parts.length}: ${part.title} (${part.sections.length} sections)`);

    // Insert part
    const { data: insertedPart, error: partError } = await supabase
      .from('ordinance_parts')
      .insert({
        ordinance_id: ordinanceId,
        part_identifier: part.id,
        title_en: part.title,
        title_zh: part.titleZh,
        sort_order: partIndex,
      })
      .select('id')
      .single();

    if (partError || !insertedPart) {
      console.error(`❌ Error inserting part ${part.id}:`, partError);
      process.exit(1);
    }

    // Insert sections for this part
    const sectionsToInsert = part.sections.map((section, sectionIndex) => ({
      part_id: insertedPart.id,
      ordinance_id: ordinanceId,
      section_number: section.number,
      section_identifier: section.id,
      title_en: section.title,
      title_zh: section.titleZh,
      subpath: section.subpath,
      text_en: section.textEn,
      text_zh: section.textZh,
      sort_order: sectionIndex,
    }));

    const { error: sectionsError } = await supabase
      .from('ordinance_sections')
      .insert(sectionsToInsert);

    if (sectionsError) {
      console.error(`❌ Error inserting sections for part ${part.id}:`, sectionsError);
      process.exit(1);
    }

    totalSectionsInserted += part.sections.length;
  }

  console.log(`  ✅ Inserted ${totalSectionsInserted} sections\n`);

  // Step 3: Handle schedules if present
  if (structure.schedules && structure.schedules.length > 0) {
    console.log('Inserting schedules...');

    // Create Schedules part
    const { data: schedulesPart, error: schedulesPartError } = await supabase
      .from('ordinance_parts')
      .insert({
        ordinance_id: ordinanceId,
        part_identifier: 'Schedules',
        title_en: 'Schedules',
        title_zh: '附表',
        sort_order: structure.parts.length,
      })
      .select('id')
      .single();

    if (schedulesPartError || !schedulesPart) {
      console.error('❌ Error creating Schedules part:', schedulesPartError);
      process.exit(1);
    }

    const schedulesToInsert = structure.schedules.map((schedule, scheduleIndex) => {
      const scheduleNumber = schedule.id.replace(/^Schedule\s*/i, '') || '0';
      return {
        part_id: schedulesPart.id,
        ordinance_id: ordinanceId,
        section_number: `sch${scheduleNumber}`,
        section_identifier: schedule.id,
        title_en: schedule.title,
        title_zh: schedule.titleZh,
        subpath: schedule.subpath,
        text_en: schedule.textEn,
        text_zh: schedule.textZh,
        sort_order: scheduleIndex,
      };
    });

    const { error: schedulesError } = await supabase
      .from('ordinance_sections')
      .insert(schedulesToInsert);

    if (schedulesError) {
      console.error('❌ Error inserting schedules:', schedulesError);
      process.exit(1);
    }

    console.log(`  ✅ Inserted ${structure.schedules.length} schedules\n`);
  }

  // Verify
  const { count: finalCount } = await supabase
    .from('ordinance_sections')
    .select('id', { count: 'exact', head: true })
    .eq('ordinance_id', ordinanceId);

  console.log('✅ Update complete!\n');
  console.log('Final counts:');
  console.log(`  Parts: ${structure.parts.length + (structure.schedules?.length ? 1 : 0)}`);
  console.log(`  Sections: ${finalCount}`);
}

// Main
const capNumber = process.argv[2];
const jsonFile = process.argv[3];

if (!capNumber || !jsonFile) {
  console.error('Usage: npx tsx scripts/update-ordinance-in-db.ts <cap_number> <json_file>');
  console.error('Example: npx tsx scripts/update-ordinance-in-db.ts 282 src/data/cap282-structure-rebuilt.json');
  process.exit(1);
}

updateOrdinance(capNumber, jsonFile).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
