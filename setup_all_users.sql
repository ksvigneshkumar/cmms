-- 1. Drop the foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Add the password column (ITHU THAAN MISS AAGIDUCHU)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- 3. Update the id column default
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Delete the existing admin account to prevent conflicts
DELETE FROM profiles WHERE email = 'admin@cmms.com';

-- 5. Insert Admin
INSERT INTO profiles (email, full_name, role, password)
VALUES ('admin@cmms.com', 'Admin User', 'admin', 'Admin@123');

-- 6. Insert Tech (Ramesh)
INSERT INTO profiles (email, full_name, role, password)
VALUES ('ramesh@cleaner.com', 'Ramesh', 'technician', 'password123')
ON CONFLICT (email) 
DO UPDATE SET password = 'password123';
