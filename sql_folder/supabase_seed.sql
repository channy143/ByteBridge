-- Seed Data for ByteBridge (Run this after the main schema)
-- This creates test accounts for custom login testing

-- Ensure pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create a Test Student User
DO $$
DECLARE
  student_uid UUID := '11111111-1111-1111-1111-111111111111';
  profile_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = '20240001@student.bytebridge.local') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      student_uid, 
      '00000000-0000-0000-0000-000000000000', 
      'authenticated', 
      'authenticated', 
      '20240001@student.bytebridge.local', 
      crypt('2000-01-01', gen_salt('bf')), 
      now(), 
      '{"provider": "email", "providers": ["email"]}', 
      '{}', 
      now(), 
      now()
    );

    INSERT INTO public.profiles (id, auth_user_id, student_id, role, full_name, email)
    VALUES (student_uid, student_uid, '2024-0003', 'student', 'Jane Doe', '20240001@student.bytebridge.local')
    RETURNING id INTO profile_id;
    
    -- Use a student_id NOT in the sample roster from supabase_auth_migration.sql
    -- (2024-0001/2024-0002 are taken by Juan Dela Cruz / Maria Santos).
    -- ON CONFLICT makes this safe to re-run if a previous partial run
    -- already inserted the roster row.
    INSERT INTO public.students (id, student_id, full_name, birthdate)
    VALUES (student_uid, '2024-0003', 'Jane Doe', '2000-01-01')
    ON CONFLICT (student_id) DO UPDATE
    SET id = EXCLUDED.id,
        full_name = EXCLUDED.full_name,
        birthdate = EXCLUDED.birthdate;
  END IF;
END $$;


-- 2. Create a Test Teacher User
DO $$
DECLARE
  teacher_uid UUID := '22222222-2222-2222-2222-222222222222';
  profile_id UUID;
  new_subject_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'johnsmith@teacher.bytebridge.local') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      teacher_uid, 
      '00000000-0000-0000-0000-000000000000', 
      'authenticated', 
      'authenticated', 
      'johnsmith@teacher.bytebridge.local', 
      crypt('ict101', gen_salt('bf')), 
      now(), 
      '{"provider": "email", "providers": ["email"]}', 
      '{}', 
      now(), 
      now()
    );

    INSERT INTO public.profiles (id, auth_user_id, role, full_name, email)
    VALUES (teacher_uid, teacher_uid, 'teacher', 'John Smith', 'johnsmith@teacher.bytebridge.local')
    RETURNING id INTO profile_id;
    
    INSERT INTO public.teachers (id, teacher_id, full_name)
    VALUES (teacher_uid, 'T-1001', 'John Smith')
    ON CONFLICT (teacher_id) DO UPDATE
    SET id = EXCLUDED.id,
        full_name = EXCLUDED.full_name;
    
    -- Create Subject
    INSERT INTO public.subjects (subject_code, subject_title, description)
    VALUES ('ICT 101', 'Introduction to ICT', 'Basic ICT concepts.')
    RETURNING id INTO new_subject_id;
    
    -- Assign subject to teacher
    INSERT INTO public.teacher_subjects (teacher_id, subject_id)
    VALUES (profile_id, new_subject_id);
    
  END IF;
END $$;
