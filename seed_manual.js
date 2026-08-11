require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Starting manual data seeding...");

  // 1. Insert Assets
  const assetsToInsert = [
    { name: 'AC Unit-01', type: 'HVAC', department: 'Office', location: 'Floor 1' },
    { name: 'CCTV Camera-01', type: 'Security', department: 'Security', location: 'Gate 1' }
  ];
  
  const { error: assetError } = await supabase.from('assets').insert(assetsToInsert);
  if (assetError) {
    console.error("Error inserting assets:", assetError.message);
  } else {
    console.log("Assets inserted successfully.");
  }

  // 2. Create Specialized Technicians
  const techs = [
    { email: 'ac_tech@cmms.com', name: 'Ramesh (AC Technician)' },
    { email: 'cam_tech@cmms.com', name: 'Suresh (Camera Technician)' },
    { email: 'elec_tech@cmms.com', name: 'Vijay (Electrical Tech)' },
    { email: 'mech_tech@cmms.com', name: 'Karthi (Mechanical Tech)' }
  ];

  for (const tech of techs) {
    const { data, error } = await supabase.auth.signUp({
      email: tech.email,
      password: 'password123',
    });
    
    if (error) {
      console.log(`Failed to create user ${tech.email}:`, error.message);
    } else if (data.user) {
      // Update the profile to set full name and role
      const { error: updateError } = await supabase.from('profiles').update({
        full_name: tech.name,
        role: 'technician'
      }).eq('id', data.user.id);
      
      if (updateError) {
         console.log(`Failed to update profile for ${tech.name}:`, updateError.message);
      } else {
         console.log(`Created Technician: ${tech.name}`);
      }
    }
  }
  
  console.log("Manual Data Seeding Complete!");
  process.exit(0);
}

seed();
