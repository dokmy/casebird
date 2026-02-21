import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifySchedules() {
  console.log('Verifying schedules migration...\n');

  // Check Cap 112 (should have 107 schedules)
  const { data: cap112 } = await supabase
    .from('ordinances')
    .select('id, cap_number, title_en')
    .eq('cap_number', '112')
    .single();

  if (!cap112) {
    console.error('Cap 112 not found!');
    return;
  }

  console.log(`Cap 112: ${cap112.title_en}`);

  const { data: schedules } = await supabase
    .from('ordinance_sections')
    .select('section_number, title_en')
    .eq('ordinance_id', cap112.id)
    .ilike('section_number', 'sch%')
    .order('sort_order');

  console.log(`Found ${schedules?.length} schedule sections:\n`);
  schedules?.slice(0, 10).forEach(s =>
    console.log(`  ${s.section_number}: ${s.title_en}`)
  );
  if (schedules && schedules.length > 10) {
    console.log(`  ... and ${schedules.length - 10} more`);
  }

  // Check Cap 210 (should have 1 schedule)
  console.log('\n---\n');
  const { data: cap210 } = await supabase
    .from('ordinances')
    .select('id')
    .eq('cap_number', '210')
    .single();

  const { data: cap210Schedules } = await supabase
    .from('ordinance_sections')
    .select('section_number, title_en')
    .eq('ordinance_id', cap210!.id)
    .ilike('section_number', 'sch%');

  console.log(`Cap 210: ${cap210Schedules?.length} schedule(s)`);
  cap210Schedules?.forEach(s =>
    console.log(`  ${s.section_number}: ${s.title_en}`)
  );
}

verifySchedules().catch(console.error);
