INSERT INTO profiles (email, full_name, role, password)
VALUES ('ramesh@cleaner.com', 'Ramesh', 'technician', 'password123')
ON CONFLICT (email) 
DO UPDATE SET password = 'password123';
