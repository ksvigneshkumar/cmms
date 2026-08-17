require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function wipeAll() {
  console.log("Wiping all dummy data to clean up Supabase space...");
  
  // Wipe in order to avoid foreign key issues (though ON DELETE CASCADE is enabled)
  await supabase.from('preventive_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deleted all preventive schedules.");

  await supabase.from('maintenance_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deleted all maintenance history.");
  
  await supabase.from('work_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deleted all work orders.");
  
  await supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deleted all alerts.");
  
  await supabase.from('sensor_data').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deleted all sensor data.");
  
  await supabase.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deleted all assets.");
  
  console.log("All dummy data successfully removed! The database is now completely clean.");
  process.exit(0);
}

wipeAll();
