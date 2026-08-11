require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createTechnicians() {
  const password = "Vignesh@2005";
  const techs = [
    { email: 'tech1@cmms.com', name: 'Ramesh Kumar' },
    { email: 'tech2@cmms.com', name: 'Suresh Babu' },
    { email: 'tech3@cmms.com', name: 'Murugan K' },
    { email: 'tech4@cmms.com', name: 'Arun Raj' },
    { email: 'tech5@cmms.com', name: 'Karthik S' },
    { email: 'tech6@cmms.com', name: 'Vijay P' },
    { email: 'tech7@cmms.com', name: 'Ajith M' },
    { email: 'tech8@cmms.com', name: 'Surya V' },
    { email: 'tech9@cmms.com', name: 'Vikram C' },
    { email: 'tech10@cmms.com', name: 'Dhanush T' },
    { email: 'tech11@cmms.com', name: 'Siva K' },
    { email: 'tech12@cmms.com', name: 'Gopal R' }
  ];

  console.log("Creating 12 Technicians...");

  for (const t of techs) {
    console.log(`Processing ${t.email}...`);
    // 1. Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: t.email,
      password: password,
    });
    
    if (authError) {
      // If user already exists, we might get an error. Just try to update profile if they exist.
      console.log(`Auth Error for ${t.email}:`, authError.message);
    }
    
    if (authData?.user) {
      // 2. Insert into profiles
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: t.email,
        full_name: t.name,
        role: 'technician'
      });
      
      if (profileError) {
        // If row already created by trigger, update it
        await supabase.from('profiles').update({
          full_name: t.name,
          role: 'technician'
        }).eq('id', authData.user.id);
        console.log(`Updated profile for ${t.name}`);
      } else {
        console.log(`Created profile for ${t.name}`);
      }
    }
    
    // Slight delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log("Finished creating 12 technicians!");
  process.exit(0);
}

createTechnicians();
