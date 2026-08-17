-- Supabase Schema for Enterprise CMMS
-- Run this in your Supabase SQL Editor

-- 1. PROFILES (Users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'manager', 'technician')) DEFAULT 'technician',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ASSETS
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  manufacturer TEXT,
  model_number TEXT,
  purchase_date DATE,
  warranty_expiry DATE,
  status TEXT CHECK (status IN ('Running', 'Stopped', 'Fault', 'Maintenance')) DEFAULT 'Running',
  health_score INTEGER DEFAULT 100,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SENSOR DATA
CREATE TABLE sensor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  temperature NUMERIC,
  humidity NUMERIC,
  vibration NUMERIC,
  voltage NUMERIC,
  current NUMERIC,
  pressure NUMERIC,
  battery_level NUMERIC,
  connection_status TEXT CHECK (connection_status IN ('Online', 'Offline')) DEFAULT 'Online',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ALERTS
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  issue TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')) NOT NULL,
  status TEXT CHECK (status IN ('Open', 'Acknowledged', 'Resolved')) DEFAULT 'Open',
  sensor_reading_id UUID REFERENCES sensor_data(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 5. WORK ORDERS
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
  issue TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')) NOT NULL,
  assigned_technician UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('Open', 'In Progress', 'Completed', 'Cancelled')) DEFAULT 'Open',
  estimated_time INTEGER, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- 6. MAINTENANCE HISTORY
CREATE TABLE maintenance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  issue TEXT NOT NULL,
  resolution TEXT NOT NULL,
  parts_used TEXT,
  maintenance_cost NUMERIC DEFAULT 0,
  time_taken INTEGER NOT NULL, -- in minutes
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL means broadcast to all
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Disable RLS constraints for ease of development in this simulated app
CREATE POLICY "Enable read access for all users" ON profiles FOR SELECT USING (true);
CREATE POLICY "Enable all access for all users" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON sensor_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON work_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON maintenance_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_data;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE assets;

-- 9. Insert Initial Assets (20 Dummy IoT Devices)
INSERT INTO assets (name, type, department, location) VALUES
  ('Motor-01', 'Motor', 'Production', 'Line A'),
  ('Motor-02', 'Motor', 'Production', 'Line B'),
  ('Pump-01', 'Pump', 'Utilities', 'Basement'),
  ('Pump-02', 'Pump', 'Utilities', 'Basement'),
  ('Boiler-01', 'Boiler', 'Heating', 'Boiler Room'),
  ('Boiler-02', 'Boiler', 'Heating', 'Boiler Room'),
  ('Compressor-01', 'Compressor', 'Pneumatics', 'Room C'),
  ('Generator-01', 'Generator', 'Power', 'Backyard'),
  ('Conveyor-01', 'Conveyor', 'Packaging', 'Line A'),
  ('Cooling Tower-01', 'Cooling System', 'HVAC', 'Roof'),
  ('Fan-01', 'HVAC', 'Ventilation', 'Floor 1'),
  ('Chiller-01', 'Cooling System', 'HVAC', 'Basement'),
  ('Mixer-01', 'Mixer', 'Production', 'Line B'),
  ('Pump-03', 'Pump', 'Water Treatment', 'Facility 2'),
  ('Motor-03', 'Motor', 'Assembly', 'Line C'),
  ('Generator-02', 'Generator', 'Power', 'Backup Room'),
  ('Compressor-02', 'Compressor', 'Pneumatics', 'Room D'),
  ('Conveyor-02', 'Conveyor', 'Packaging', 'Line B'),
  ('Robot-Arm-01', 'Robotics', 'Assembly', 'Cell 1'),
  ('Robot-Arm-02', 'Robotics', 'Assembly', 'Cell 2');
