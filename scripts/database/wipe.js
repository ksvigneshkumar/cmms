require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeDummyData() {
  console.log("Wiping dummy data...");
  // Delete all alerts where asset is not one of our 4 new ones
  // Actually, easiest is just delete all alerts and work orders, since they just started manual testing
  await supabase.from('work_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deleted all work orders.");
  
  await supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deleted all alerts.");
  
  await supabase.from('sensor_data').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deleted all sensor data.");
  
  // Get all assets
  const { data: assets } = await supabase.from('assets').select('id, name');
  const validNames = ['AC Unit-01', 'CCTV Camera-01', 'Diesel Generator-01', 'Water Pump-01'];
  
  for (const asset of assets) {
    if (!validNames.includes(asset.name)) {
      await supabase.from('assets').delete().eq('id', asset.id);
    }
  }
  console.log("Deleted old dummy assets. Only 4 manual assets remain.");
  
  process.exit(0);
}

wipeDummyData();
