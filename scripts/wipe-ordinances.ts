import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function wipeOrdinances() {
  console.log('⚠️  Deleting ALL ordinances from database...');

  const { error } = await supabase
    .from('ordinances')
    .delete()
    .neq('cap_number', 'nonexistent'); // Delete all rows

  if (error) {
    console.error('Error deleting:', error);
    process.exit(1);
  }

  console.log('✅ All ordinances deleted (cascade removed all parts, sections, annotations)');
  console.log('\nNow run: npx tsx scripts/migrate-ordinances-to-supabase.ts');
}

wipeOrdinances().catch(console.error);
