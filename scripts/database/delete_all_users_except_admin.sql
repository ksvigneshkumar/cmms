-- 1. Delete all users from Supabase Authentication EXCEPT admin@cmms.com
DELETE FROM auth.users WHERE email != 'admin@cmms.com';

-- 2. (Optional) Delete all users from our custom profiles table EXCEPT admin@cmms.com
DELETE FROM public.profiles WHERE email != 'admin@cmms.com';
