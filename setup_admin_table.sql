-- 1. Create the admin table
CREATE TABLE IF NOT EXISTS admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insert the admin credentials into the new admin table
INSERT INTO admin (email, password, full_name, role)
VALUES ('admin@cmms.com', 'Admin@123', 'Admin User', 'admin')
ON CONFLICT (email) 
DO UPDATE SET password = 'Admin@123';

-- 3. Delete the admin from the profiles table so it only contains tech users
DELETE FROM profiles WHERE email = 'admin@cmms.com';
