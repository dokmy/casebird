/**
 * Compare Cap 282 sections between our database and HKLII
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function compareSections() {
  console.log('Comparing Cap 282 sections: Database vs HKLII\n');

  // Get sections from database
  const { data: ord } = await supabase
    .from('ordinances')
    .select('id')
    .eq('cap_number', '282')
    .single();

  const { data: dbSections } = await supabase
    .from('ordinance_sections')
    .select('section_number, title_en')
    .eq('ordinance_id', ord!.id)
    .order('section_number');

  const dbSectionNumbers = new Set(
    dbSections?.map((s) => s.section_number).filter((n) => !n.startsWith('sch')) || []
  );

  console.log(`Database: ${dbSectionNumbers.size} sections (excluding schedules)\n`);

  // Get sections from HKLII
  const versionsRes = await fetch('https://www.hklii.hk/api/getcapversions?lang=en&cap=282');
  const versions = await versionsRes.json();
  const versionId = versions[0].id;

  const tocRes = await fetch(`https://www.hklii.hk/api/getcapversiontoc?id=${versionId}`);
  const toc = await tocRes.json();

  const hkliiSections = toc.filter(
    (item: any) => item.section_type === 'S' && !item.title.includes('(Repealed)')
  );

  const hkliiSectionNumbers = new Set(
    hkliiSections.map((s: any) => s.prov_num.replace('Section ', ''))
  );

  console.log(`HKLII: ${hkliiSectionNumbers.size} sections\n`);

  // Find missing in DB
  const missingInDB = [...hkliiSectionNumbers].filter((n) => !dbSectionNumbers.has(n));

  // Find extra in DB
  const extraInDB = [...dbSectionNumbers].filter((n) => !hkliiSectionNumbers.has(n));

  if (missingInDB.length === 0 && extraInDB.length === 0) {
    console.log('✅ Perfect match! All sections present.\n');
  } else {
    if (missingInDB.length > 0) {
      console.log(`❌ Missing in database (${missingInDB.length}):`);
      missingInDB.forEach((n) => {
        const hkliiSection = hkliiSections.find(
          (s: any) => s.prov_num.replace('Section ', '') === n
        );
        console.log(`  - Section ${n}: ${hkliiSection?.title || 'Unknown'}`);
      });
      console.log();
    }

    if (extraInDB.length > 0) {
      console.log(`⚠️  Extra in database (${extraInDB.length}):`);
      extraInDB.slice(0, 10).forEach((n) => {
        const dbSection = dbSections?.find((s) => s.section_number === n);
        console.log(`  - Section ${n}: ${dbSection?.title_en || 'Unknown'}`);
      });
      if (extraInDB.length > 10) {
        console.log(`  ... and ${extraInDB.length - 10} more`);
      }
      console.log();
    }
  }

  // Show sample sections from both
  console.log('Sample sections (first 20):');
  console.log('\nDatabase sections:');
  dbSections?.slice(0, 20).forEach((s) => {
    if (!s.section_number.startsWith('sch')) {
      console.log(`  ${s.section_number.padEnd(6)} ${s.title_en}`);
    }
  });

  console.log('\nHKLII sections:');
  hkliiSections.slice(0, 20).forEach((s: any) => {
    const num = s.prov_num.replace('Section ', '');
    console.log(`  ${num.padEnd(6)} ${s.title}`);
  });
}

compareSections().catch(console.error);
