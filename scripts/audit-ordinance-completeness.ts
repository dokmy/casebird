import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface HKLIISectionItem {
  section_type: string;
  prov_num: string;
  title: string;
  subpath?: string;
}

async function getHKLIISectionCount(cap: string): Promise<number> {
  try {
    // Get latest version ID
    const versionsRes = await fetch(`https://www.hklii.hk/api/getcapversions?lang=en&cap=${cap}`);
    const versions = await versionsRes.json();

    if (!versions || versions.length === 0) {
      console.log(`  ⚠️  No versions found for Cap ${cap}`);
      return 0;
    }

    const latestVersionId = versions[0].id;

    // Get TOC
    const tocRes = await fetch(`https://www.hklii.hk/api/getcapversiontoc?id=${latestVersionId}`);
    const toc: HKLIISectionItem[] = await tocRes.json();

    // Count non-repealed sections
    const sections = toc.filter(
      (item) => item.section_type === 'S' && !item.title.includes('(Repealed)')
    );

    return sections.length;
  } catch (error) {
    console.log(`  ❌ Error fetching HKLII data for Cap ${cap}:`, error instanceof Error ? error.message : 'Unknown error');
    return 0;
  }
}

async function auditOrdinances() {
  console.log('Auditing ordinance completeness...\n');

  // Get all ordinances from database
  const { data: ordinances, error } = await supabase
    .from('ordinances')
    .select('id, cap_number, title_en')
    .order('cap_number');

  if (error || !ordinances) {
    console.error('Failed to fetch ordinances:', error);
    return;
  }

  console.log(`Found ${ordinances.length} ordinances in database\n`);

  const results: Array<{
    cap: string;
    title: string;
    dbCount: number;
    hkliiCount: number;
    missing: number;
    status: string;
  }> = [];

  for (const ord of ordinances) {
    // Count sections in database
    const { count: dbCount } = await supabase
      .from('ordinance_sections')
      .select('id', { count: 'exact', head: true })
      .eq('ordinance_id', ord.id);

    // Get HKLII count
    const hkliiCount = await getHKLIISectionCount(ord.cap_number);

    const missing = hkliiCount - (dbCount || 0);
    const status = missing === 0 ? '✅' : missing > 0 ? '❌' : '⚠️';

    results.push({
      cap: ord.cap_number,
      title: ord.title_en,
      dbCount: dbCount || 0,
      hkliiCount,
      missing,
      status,
    });

    console.log(
      `${status} Cap ${ord.cap_number.padEnd(3)}: ${String(dbCount || 0).padStart(3)} in DB, ${String(hkliiCount).padStart(3)} on HKLII (${missing > 0 ? 'missing ' + missing : 'OK'})`
    );

    // Rate limit
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log('\n=== Summary ===\n');

  const incomplete = results.filter((r) => r.missing > 0);
  const complete = results.filter((r) => r.missing === 0);

  console.log(`Complete: ${complete.length} ordinances`);
  console.log(`Incomplete: ${incomplete.length} ordinances\n`);

  if (incomplete.length > 0) {
    console.log('Ordinances needing updates:');
    incomplete
      .sort((a, b) => b.missing - a.missing)
      .forEach((r) => {
        console.log(
          `  Cap ${r.cap.padEnd(3)}: missing ${String(r.missing).padStart(3)} sections (${r.dbCount}/${r.hkliiCount}) - ${r.title.substring(0, 50)}`
        );
      });
  }
}

auditOrdinances().catch(console.error);
