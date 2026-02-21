import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

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
      title: string;
      titleZh: string;
      subpath: string;
      textEn: string;
      textZh: string;
    }>;
  }>;
}

interface OrdinanceAnnotations {
  metadata: {
    capNumber: number;
    titleEn: string;
    titleZh: string;
    shortCitation: string;
    enactedYear: number;
    lastAmended: string;
    elegislationUrl: string;
    hkliiUrl: string;
  };
  sections: Array<{
    section: string;
    titleEn: string;
    titleZh: string;
    sectionTextEn?: string;
    sectionTextZh?: string;
    cases: Array<{
      citation: string;
      caseName: string;
      court: string;
      year: number;
      annotation: string;
      language: string;
    }>;
  }>;
}

async function migrateOrdinances() {
  console.log('🚀 Starting ordinance migration...\n');

  const stats = {
    ordinances: 0,
    parts: 0,
    sections: 0,
    annotations: 0,
    errors: [] as string[],
  };

  const dataDir = join(process.cwd(), 'src/data');
  const structureFiles = readdirSync(dataDir)
    .filter(f => f.startsWith('cap') && f.endsWith('-structure.json'))
    .sort((a, b) => {
      const aNum = parseInt(a.match(/cap(\d+)/)?.[1] || '0');
      const bNum = parseInt(b.match(/cap(\d+)/)?.[1] || '0');
      return aNum - bNum;
    });

  console.log(`Found ${structureFiles.length} ordinance structure files\n`);

  for (const filename of structureFiles) {
    const capNumber = filename.match(/cap(\d+)-structure\.json/)?.[1];
    if (!capNumber) continue;

    console.log(`Processing Cap ${capNumber}...`);

    try {
      // Load structure
      const structure: OrdinanceStructure = JSON.parse(
        readFileSync(join(dataDir, filename), 'utf-8')
      );

      // Load annotations (if exists)
      let annotations: OrdinanceAnnotations | null = null;
      const annotationFile = join(dataDir, `cap${capNumber}-annotations.json`);
      try {
        annotations = JSON.parse(readFileSync(annotationFile, 'utf-8'));
      } catch {
        console.log(`  ℹ️  No annotations file for Cap ${capNumber}`);
      }

      // Use annotation metadata if available, otherwise use structure data
      const ordinanceData = {
        cap_number: capNumber,
        title_en: annotations?.metadata.titleEn || structure.title,
        title_zh: annotations?.metadata.titleZh || structure.titleZh || structure.title, // Fallback to English if Chinese missing
        short_citation: annotations?.metadata.shortCitation || `Cap. ${capNumber}`,
        enacted_year: annotations?.metadata.enactedYear || null,
        last_amended: annotations?.metadata.lastAmended || null,
        elegislation_url: annotations?.metadata.elegislationUrl || null,
        hklii_url: annotations?.metadata.hkliiUrl || null,
      };

      // Insert ordinance
      const { data: ordinance, error: ordError } = await supabase
        .from('ordinances')
        .insert(ordinanceData)
        .select('id')
        .single();

      if (ordError) {
        if (ordError.code === '23505') { // Unique violation
          console.log(`  ⏭️  Cap ${capNumber} already exists, skipping`);
          continue;
        }
        throw ordError;
      }

      const ordinanceId = ordinance.id;
      stats.ordinances++;

      // Insert parts and sections
      for (let partIndex = 0; partIndex < structure.parts.length; partIndex++) {
        const part = structure.parts[partIndex];

        const { data: partData, error: partError } = await supabase
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

        if (partError) throw partError;
        const partId = partData.id;
        stats.parts++;

        // Insert sections
        const sectionsToInsert = part.sections.map((section, sectionIndex) => {
          // Extract section number from "Section 9" or "Section 31B"
          const sectionNumber = section.id.replace(/^Section\s+/i, '');

          // Get text from annotations if available, otherwise use structure
          let textEn = section.textEn;
          let textZh = section.textZh;

          if (annotations) {
            const annotatedSection = annotations.sections.find(
              s => s.section === sectionNumber
            );
            if (annotatedSection?.sectionTextEn) {
              textEn = annotatedSection.sectionTextEn;
              textZh = annotatedSection.sectionTextZh || section.textZh;
            }
          }

          return {
            part_id: partId,
            ordinance_id: ordinanceId,
            section_number: sectionNumber,
            section_identifier: section.id,
            title_en: section.title,
            title_zh: section.titleZh,
            subpath: section.subpath,
            text_en: textEn,
            text_zh: textZh,
            sort_order: sectionIndex,
          };
        });

        const { error: sectionsError } = await supabase
          .from('ordinance_sections')
          .insert(sectionsToInsert);

        if (sectionsError) throw sectionsError;
        stats.sections += sectionsToInsert.length;
      }

      // Insert schedules as a special part
      if (structure.schedules && structure.schedules.length > 0) {
        const { data: schedulesPart, error: schedulesPartError } = await supabase
          .from('ordinance_parts')
          .insert({
            ordinance_id: ordinanceId,
            part_identifier: 'Schedules',
            title_en: 'Schedules',
            title_zh: '附表',
            sort_order: structure.parts.length, // After all regular parts
          })
          .select('id')
          .single();

        if (schedulesPartError) throw schedulesPartError;
        stats.parts++;

        const schedulesToInsert = structure.schedules.map((schedule: any, scheduleIndex: number) => {
          // Extract schedule number/identifier (e.g., "Schedule", "Schedule 1")
          const scheduleNumber = schedule.id.replace(/^Schedule\s*/i, '') || '0';

          return {
            part_id: schedulesPart.id,
            ordinance_id: ordinanceId,
            section_number: `sch${scheduleNumber}`,
            section_identifier: schedule.id,
            title_en: schedule.title,
            title_zh: schedule.titleZh || schedule.title,
            subpath: schedule.subpath,
            text_en: schedule.textEn,
            text_zh: schedule.textZh,
            sort_order: scheduleIndex,
          };
        });

        const { error: schedulesError } = await supabase
          .from('ordinance_sections')
          .insert(schedulesToInsert);

        if (schedulesError) throw schedulesError;
        stats.sections += schedulesToInsert.length;
      }

      // Insert annotations
      if (annotations?.sections) {
        for (const annotatedSection of annotations.sections) {
          if (!annotatedSection.cases || annotatedSection.cases.length === 0) continue;

          const { data: sectionData } = await supabase
            .from('ordinance_sections')
            .select('id')
            .eq('ordinance_id', ordinanceId)
            .eq('section_number', annotatedSection.section)
            .single();

          if (!sectionData) {
            stats.errors.push(
              `Cap ${capNumber} s.${annotatedSection.section}: section not found in database`
            );
            continue;
          }

          const annotationsToInsert = annotatedSection.cases.map((c, index) => ({
            section_id: sectionData.id,
            ordinance_id: ordinanceId,
            citation: c.citation,
            case_name: c.caseName,
            court: c.court,
            year: c.year,
            annotation: c.annotation,
            language: c.language,
            sort_order: index,
          }));

          const { error: annotError } = await supabase
            .from('ordinance_annotations')
            .insert(annotationsToInsert);

          if (annotError) throw annotError;
          stats.annotations += annotationsToInsert.length;
        }
      }

      console.log(`  ✅ Cap ${capNumber} migrated (${structure.parts.reduce((sum, p) => sum + p.sections.length, 0)} sections)`);
    } catch (error) {
      const errMsg = `Cap ${capNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      stats.errors.push(errMsg);
      console.error(`  ❌ ${errMsg}`);
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`  Ordinances: ${stats.ordinances}`);
  console.log(`  Parts: ${stats.parts}`);
  console.log(`  Sections: ${stats.sections}`);
  console.log(`  Annotations: ${stats.annotations}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors (${stats.errors.length}):`);
    stats.errors.forEach(err => console.log(`  - ${err}`));
  } else {
    console.log('\n✅ Migration complete with no errors!');
  }

  return stats;
}

async function validateMigration() {
  console.log('\n🔍 Validating migration...\n');

  const { count: ordCount } = await supabase
    .from('ordinances')
    .select('*', { count: 'exact', head: true });

  const { count: partCount } = await supabase
    .from('ordinance_parts')
    .select('*', { count: 'exact', head: true });

  const { count: sectionCount } = await supabase
    .from('ordinance_sections')
    .select('*', { count: 'exact', head: true });

  const { count: annotationCount } = await supabase
    .from('ordinance_annotations')
    .select('*', { count: 'exact', head: true });

  console.log('Database row counts:');
  console.log(`  Ordinances: ${ordCount} (expect 22)`);
  console.log(`  Parts: ${partCount} (expect ~235)`);
  console.log(`  Sections: ${sectionCount} (expect ~3,524)`);
  console.log(`  Annotations: ${annotationCount} (expect 168)`);

  // Test query performance
  console.log('\n⚡ Testing query performance...');
  const start = Date.now();
  const { data, error } = await supabase.rpc('get_ordinance_section_text', {
    p_cap_number: '57',
    p_section_number: '9',
  });
  const time = Date.now() - start;

  if (error) {
    console.error(`  ❌ Query failed:`, error);
  } else if (data && data.length > 0) {
    console.log(`  ✅ Cap 57 s.9 query: ${time}ms`);
    console.log(`  ✅ Title: "${data[0].title_en}"`);
  } else {
    console.log(`  ⚠️  Query returned no results`);
  }

  console.log('\n✅ Validation complete!');
}

// Run migration
migrateOrdinances()
  .then(validateMigration)
  .catch(error => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
