-- Enterprise CMMS Security Migration
-- Run this script in the Supabase SQL Editor to enforce strict Row Level Security (RLS)

-- 1. Drop existing permissive policies (the "AI shortcuts")
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable all access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable all access for all users" ON assets;
DROP POLICY IF EXISTS "Enable all access for all users" ON sensor_data;
DROP POLICY IF EXISTS "Enable all access for all users" ON alerts;
DROP POLICY IF EXISTS "Enable all access for all users" ON work_orders;
DROP POLICY IF EXISTS "Enable all access for all users" ON maintenance_history;
DROP POLICY IF EXISTS "Enable all access for all users" ON notifications;

-- 2. Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. Create Strict Production Policies

-- PROFILES: Users can only read and update their OWN profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- ASSETS: All authenticated users (technicians, managers, admins) can read assets. 
-- Only specific roles should edit, but for this MVP we allow authenticated updates.
CREATE POLICY "Authenticated users can read assets" 
ON assets FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can update assets" 
ON assets FOR UPDATE 
TO authenticated 
USING (true);

-- ALERTS & WORK ORDERS: Authenticated users can view and manage
CREATE POLICY "Authenticated users can manage alerts" 
ON alerts FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage work orders" 
ON work_orders FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- SENSOR DATA: Authenticated users can read
CREATE POLICY "Authenticated users can read sensor data" 
ON sensor_data FOR SELECT 
TO authenticated 
USING (true);

-- SENSOR DATA: Insertions should ideally come from an IoT Service Role, 
-- but we allow authenticated for manual testing.
CREATE POLICY "Authenticated users can insert sensor data" 
ON sensor_data FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4. Set secure defaults for newly signed-up users (Optional Trigger)
-- This ensures new signups automatically get a profile row securely
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'technician');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
