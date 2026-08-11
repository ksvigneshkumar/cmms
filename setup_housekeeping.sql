-- Run this script in your Supabase SQL Editor

-- 1. Create the locations table
CREATE TABLE housekeeping_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the logs table
CREATE TABLE housekeeping_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES housekeeping_locations(id) ON DELETE CASCADE,
  cleaned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  cleaned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE housekeeping_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_logs ENABLE ROW LEVEL SECURITY;

-- 4. Add policies (allow all for ease of development in this simulated app)
CREATE POLICY "Enable all access for all users" ON housekeeping_locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON housekeeping_logs FOR ALL USING (true) WITH CHECK (true);

-- 5. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE housekeeping_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE housekeeping_logs;

-- 6. Insert initial locations
INSERT INTO housekeeping_locations (name, type) VALUES 
  ('Working Hall', 'Hall'),
  ('Room 1', 'Room');
