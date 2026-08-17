require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTech() {
  console.log("Adding 5th Technician...");

  const tech = { email: 'network_tech@cmms.com', name: 'Mani (Network/IT Technician)' };

  const { data, error } = await supabase.auth.signUp({
    email: tech.email,
    password: 'password123',
  });
  
  if (error) {
    console.log(`Failed to create user:`, error.message);
  } else if (data.user) {
    await supabase.from('profiles').update({
      full_name: tech.name,
      role: 'technician'
    }).eq('id', data.user.id);
    console.log(`Created Technician: ${tech.name}`);
  }
  process.exit(0);
}

addTech();
