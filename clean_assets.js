require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanAndSeed() {
  console.log("Cleaning old assets...");
  // Since we don't have service role, we can delete by ID or just delete where true.
  // Wait, the RLS policy "Enable all access for all users" ON assets FOR ALL USING (true) allows this!
  const { error: delError } = await supabase.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (delError) {
    console.error("Failed to delete assets:", delError.message);
  } else {
    console.log("Old assets deleted. Cascaded to alerts and work orders.");
  }

  console.log("Inserting exactly 4 clean machines...");
  const assetsToInsert = [
    { name: 'AC Unit-01', type: 'HVAC', department: 'Office', location: 'Floor 1' },
    { name: 'CCTV Camera-01', type: 'Security', department: 'Security', location: 'Gate 1' },
    { name: 'Diesel Generator-01', type: 'Generator', department: 'Power', location: 'Backyard' },
    { name: 'Water Pump-01', type: 'Pump', department: 'Utilities', location: 'Basement' }
  ];
  
  const { error: insError } = await supabase.from('assets').insert(assetsToInsert);
  
  if (insError) {
    console.error("Failed to insert new assets:", insError.message);
  } else {
    console.log("4 clean machines inserted successfully.");
  }
  
  process.exit(0);
}

cleanAndSeed();
