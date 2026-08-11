-- Run this script in your Supabase SQL Editor

CREATE TABLE preventive_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name TEXT NOT NULL,
  type TEXT NOT NULL,
  frequency TEXT NOT NULL,
  last_checked TEXT DEFAULT 'Never',
  next_due DATE NOT NULL,
  status TEXT DEFAULT 'Scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE preventive_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON preventive_schedules FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE preventive_schedules;
