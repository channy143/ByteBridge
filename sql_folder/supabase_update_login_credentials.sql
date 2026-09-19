-- ============================================================
-- ByteBridge: Student & Teacher Login & Registration Alignment
-- Run this script in the Supabase SQL Editor.
-- Safe to re-run (idempotent).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1. Ensure columns exist on tables
-- ------------------------------------------------------------

-- students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS course_year_section VARCHAR(255);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS section VARCHAR(100);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS program VARCHAR(255);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS year_level VARCHAR(50);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';

-- profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS course_year_section VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS section VARCHAR(100);

-- teachers table
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS year_level VARCHAR(50);
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS course_year VARCHAR(50);
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';

-- subjects table
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS year_level VARCHAR(50);

-- ------------------------------------------------------------
-- 2. Normalization helper for flexible comparisons
--    Removes spaces, hyphens, and non-alphanumerics, lowercases.
--    e.g. 'BTLED ICT 1-A' -> 'btledict1a'
--    e.g. '1st Year' -> '1styear' or '1'
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clean_academic_str(p_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(lower(coalesce(p_input, '')), '[^a-z0-9]', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.normalize_year_level(p_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(p_input) ~* '(1st|first|\m1\M)' THEN '1'
    WHEN lower(p_input) ~* '(2nd|second|\m2\M)' THEN '2'
    WHEN lower(p_input) ~* '(3rd|third|\m3\M)' THEN '3'
    WHEN lower(p_input) ~* '(4th|fourth|\m4\M)' THEN '4'
    ELSE public.clean_academic_str(p_input)
  END;
$$;

-- ------------------------------------------------------------
-- 3. Student Registration RPC: register_new_student
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_new_student(
  p_auth_id UUID,
  p_student_id TEXT,
  p_full_name TEXT,
  p_birthdate DATE,
  p_email TEXT,
  p_course_year_section TEXT DEFAULT NULL,
  p_program TEXT DEFAULT NULL,
  p_year_level TEXT DEFAULT NULL,
  p_section TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_student_uuid UUID;
  v_new_profile_id UUID;
  v_cys TEXT;
BEGIN
  v_cys := COALESCE(
    NULLIF(TRIM(p_course_year_section), ''),
    CONCAT_WS(' ', NULLIF(TRIM(p_program), ''), NULLIF(TRIM(p_year_level), ''), NULLIF(TRIM(p_section), ''))
  );

  -- 1. Insert or update profiles table
  INSERT INTO public.profiles (
    id, auth_user_id, student_id, role, full_name, email, course_year_section, section
  )
  VALUES (
    p_auth_id, p_auth_id, p_student_id, 'student', p_full_name, p_email, v_cys, p_section
  )
  ON CONFLICT (id) DO UPDATE
  SET auth_user_id = EXCLUDED.auth_user_id,
      student_id = EXCLUDED.student_id,
      role = EXCLUDED.role,
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      course_year_section = COALESCE(EXCLUDED.course_year_section, profiles.course_year_section),
      section = COALESCE(EXCLUDED.section, profiles.section)
  RETURNING id INTO v_new_profile_id;

  -- 2. Insert or update students table
  INSERT INTO public.students (
    id, student_id, full_name, birthdate, course_year_section, program, year_level, section, status
  )
  VALUES (
    p_auth_id, p_student_id, p_full_name, p_birthdate, v_cys, p_program, p_year_level, p_section, 'Active'
  )
  ON CONFLICT (student_id) DO UPDATE 
  SET id = EXCLUDED.id,
      full_name = EXCLUDED.full_name,
      birthdate = EXCLUDED.birthdate,
      course_year_section = COALESCE(EXCLUDED.course_year_section, students.course_year_section),
      program = COALESCE(EXCLUDED.program, students.program),
      year_level = COALESCE(EXCLUDED.year_level, students.year_level),
      section = COALESCE(EXCLUDED.section, students.section),
      status = 'Active'
  RETURNING id INTO v_new_student_uuid;

  RETURN jsonb_build_object(
    'success', true,
    'profile_id', v_new_profile_id,
    'student_uuid', v_new_student_uuid
  );
END;
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_new_student(UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;

-- ------------------------------------------------------------
-- 4. Student Login RPC: login_student
--    Verifies:
--      1. student_id
--      2. birthdate
--      3. course_year_section
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.login_student(TEXT, DATE);
DROP FUNCTION IF EXISTS public.login_student(TEXT, DATE, TEXT);

CREATE OR REPLACE FUNCTION public.login_student(
  p_student_id TEXT,
  p_birthdate DATE,
  p_course_year_section TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_student RECORD;
  v_birthdate_text TEXT;
  v_input_cys TEXT;
  v_stored_cys TEXT;
  v_cys_matched BOOLEAN := false;
BEGIN
  -- 1. Find the student record in public.students
  SELECT * INTO v_student
  FROM public.students
  WHERE LOWER(TRIM(student_id)) = LOWER(TRIM(p_student_id));

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Student ID not found. Please check your Student ID.'
    );
  END IF;

  -- 2. Verify birthdate
  IF v_student.birthdate IS NOT NULL AND v_student.birthdate != p_birthdate THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Incorrect birthday. Please check your birthdate.'
    );
  END IF;

  -- 3. Verify Course Year and Section
  v_input_cys := public.clean_academic_str(p_course_year_section);
  v_stored_cys := public.clean_academic_str(v_student.course_year_section);

  IF v_stored_cys IS NOT NULL AND v_stored_cys <> '' THEN
    IF v_stored_cys = v_input_cys OR v_stored_cys LIKE '%' || v_input_cys || '%' OR v_input_cys LIKE '%' || v_stored_cys || '%' THEN
      v_cys_matched := true;
    END IF;
  END IF;

  -- Also check against program + year_level + section if combined field was empty or didn't match
  IF NOT v_cys_matched THEN
    DECLARE
      v_combined_alt TEXT;
    BEGIN
      v_combined_alt := public.clean_academic_str(
        CONCAT_WS(' ', v_student.program, v_student.year_level, v_student.section)
      );
      IF v_combined_alt <> '' AND (v_combined_alt = v_input_cys OR v_combined_alt LIKE '%' || v_input_cys || '%' OR v_input_cys LIKE '%' || v_combined_alt || '%') THEN
        v_cys_matched := true;
      END IF;
    END;
  END IF;

  -- If the student has no stored CYS yet (e.g. older account), update it with the provided CYS
  IF v_stored_cys IS NULL OR v_stored_cys = '' THEN
    UPDATE public.students
    SET course_year_section = TRIM(p_course_year_section)
    WHERE id = v_student.id;

    UPDATE public.profiles
    SET course_year_section = TRIM(p_course_year_section)
    WHERE id = v_student.id;

    v_cys_matched := true;
  END IF;

  IF NOT v_cys_matched THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Course, Year, and Section did not match our records. Please verify your details.'
    );
  END IF;

  -- 4. Find the corresponding auth profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE (student_id = v_student.student_id OR id = v_student.id)
    AND role = 'student'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No account found for this Student ID. Please register first.'
    );
  END IF;

  -- 5. Reset the auth password to the birthdate (YYYY-MM-DD format)
  v_birthdate_text := to_char(p_birthdate, 'YYYY-MM-DD');

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(v_birthdate_text, extensions.gen_salt('bf', 10))
  WHERE id = v_profile.auth_user_id;

  -- 6. Return the auth email so client signs in with (email, birthdate)
  RETURN jsonb_build_object(
    'success', true,
    'email', v_profile.email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_student(TEXT, DATE, TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 5. Teacher Registration RPC: register_teacher_account
--    Captures:
--      1. Full Name
--      2. Email
--      3. Subject Code
--      4. Course Year
--      5. (Optional password, defaults to stable subject+year token)
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.register_teacher_account(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.register_teacher_account(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.register_teacher_account(
  p_full_name TEXT,
  p_email TEXT,
  p_subject_code TEXT,
  p_course_year TEXT,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_teacher_id TEXT;
  v_subject_id UUID;
  v_password TEXT;
BEGIN
  v_email := LOWER(TRIM(p_email));
  IF length(trim(p_full_name)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please enter your full name.');
  END IF;
  IF v_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please enter a valid email address.');
  END IF;
  IF length(trim(coalesce(p_subject_code, ''))) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please enter a valid Subject Code (e.g. ICT 101).');
  END IF;
  IF length(trim(coalesce(p_course_year, ''))) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please select or enter the Course Year (e.g. 1st Year).');
  END IF;

  -- If password not provided, derive default from subject_code + year
  v_password := COALESCE(NULLIF(trim(p_password), ''), public.clean_academic_str(p_subject_code || p_course_year));
  IF length(v_password) < 6 THEN
    v_password := v_password || '2026@bytebridge';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'An account with this email already exists.');
  END IF;

  v_user_id := uuid_generate_v4();

  -- 1. Create auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(v_password, extensions.gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'teacher', 'full_name', p_full_name,
      'subject_code', p_subject_code, 'course_year', p_course_year),
    NOW(), NOW()
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_email, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email,
      'email_verified', true, 'phone_verified', false),
    'email', NOW(), NOW(), NOW()
  );

  -- 2. Create teacher profile
  INSERT INTO public.profiles (id, auth_user_id, role, full_name, email)
  VALUES (v_user_id, v_user_id, 'teacher', p_full_name, v_email);

  -- 3. Create teachers roster record
  v_teacher_id := 'T-' || upper(substr(md5(v_user_id::text), 1, 6));
  INSERT INTO public.teachers (id, teacher_id, full_name, year_level, course_year, status)
  VALUES (v_user_id, v_teacher_id, p_full_name, p_course_year, p_course_year, 'Active');

  -- 4. Find or create Subject and assign to teacher
  SELECT id INTO v_subject_id
  FROM public.subjects
  WHERE public.clean_academic_str(subject_code) = public.clean_academic_str(p_subject_code)
  LIMIT 1;

  IF v_subject_id IS NULL THEN
    INSERT INTO public.subjects (subject_code, subject_title, description, year_level, status)
    VALUES (TRIM(p_subject_code), TRIM(p_subject_code), 'Subject handled by ' || p_full_name, p_course_year, 'Active')
    RETURNING id INTO v_subject_id;
  ELSE
    -- Ensure subject year_level is assigned if empty
    UPDATE public.subjects
    SET year_level = COALESCE(year_level, p_course_year)
    WHERE id = v_subject_id;
  END IF;

  -- 5. Link teacher to subject in teacher_subjects
  IF NOT EXISTS (
    SELECT 1 FROM public.teacher_subjects
    WHERE teacher_id = v_user_id AND subject_id = v_subject_id
  ) THEN
    INSERT INTO public.teacher_subjects (teacher_id, subject_id)
    VALUES (v_user_id, v_subject_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'teacher_id', v_teacher_id,
    'email', v_email,
    'subject_id', v_subject_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_teacher_account(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 6. Teacher Login RPC: login_teacher
--    Verifies:
--      1. Full Name
--      2. Subject Code
--      3. Course Year
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.login_teacher(TEXT);
DROP FUNCTION IF EXISTS public.login_teacher(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.login_teacher(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.login_teacher(
  p_full_name TEXT,
  p_subject_code TEXT,
  p_course_year TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_teacher RECORD;
  v_subject RECORD;
  v_subject_matched BOOLEAN := false;
  v_year_matched BOOLEAN := false;
  v_clean_code TEXT;
  v_norm_year TEXT;
  v_derived_password TEXT;
BEGIN
  -- 1. Locate teacher profile by Full Name
  SELECT p.* INTO v_profile
  FROM public.profiles p
  WHERE LOWER(TRIM(p.full_name)) = LOWER(TRIM(p_full_name))
    AND p.role = 'teacher'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Teacher account not found with the name "' || TRIM(p_full_name) || '". Please verify your name.'
    );
  END IF;

  -- 2. Verify teacher status
  SELECT * INTO v_teacher
  FROM public.teachers
  WHERE id = v_profile.id
  LIMIT 1;

  IF v_teacher.status IS NOT NULL AND v_teacher.status <> 'Active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This teacher account is inactive. Please contact the portal administrator.'
    );
  END IF;

  -- 3. Verify Subject Code
  v_clean_code := public.clean_academic_str(p_subject_code);
  v_norm_year := public.normalize_year_level(p_course_year);

  -- Check assigned subjects in teacher_subjects
  FOR v_subject IN
    SELECT s.id, s.subject_code, s.year_level
    FROM public.teacher_subjects ts
    JOIN public.subjects s ON s.id = ts.subject_id
    WHERE ts.teacher_id = v_profile.id
  LOOP
    IF public.clean_academic_str(v_subject.subject_code) = v_clean_code THEN
      v_subject_matched := true;

      -- Check course year on this subject or teacher
      IF public.normalize_year_level(v_subject.year_level) = v_norm_year
         OR public.normalize_year_level(v_teacher.year_level) = v_norm_year
         OR public.normalize_year_level(v_teacher.course_year) = v_norm_year
         OR v_subject.year_level IS NULL
         OR v_norm_year = '' THEN
        v_year_matched := true;
      END IF;
    END IF;
  END LOOP;

  -- If not assigned via teacher_subjects yet, check if subject exists and assign or check teacher metadata
  IF NOT v_subject_matched THEN
    -- Fallback: check if the subject exists and matches
    SELECT s.id, s.subject_code, s.year_level INTO v_subject
    FROM public.subjects s
    WHERE public.clean_academic_str(s.subject_code) = v_clean_code
    LIMIT 1;

    IF FOUND THEN
      -- Assign this subject to the teacher so future lookups succeed
      INSERT INTO public.teacher_subjects (teacher_id, subject_id)
      VALUES (v_profile.id, v_subject.id)
      ON CONFLICT DO NOTHING;

      v_subject_matched := true;

      IF public.normalize_year_level(v_subject.year_level) = v_norm_year
         OR public.normalize_year_level(v_teacher.year_level) = v_norm_year
         OR public.normalize_year_level(v_teacher.course_year) = v_norm_year
         OR v_subject.year_level IS NULL THEN
        v_year_matched := true;
      END IF;
    END IF;
  END IF;

  IF NOT v_subject_matched THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Subject code "' || TRIM(p_subject_code) || '" is not assigned to ' || v_profile.full_name || '.'
    );
  END IF;

  -- 4. Check year level
  IF NOT v_year_matched THEN
    -- If teacher year_level was not set, save it now
    IF v_teacher.year_level IS NULL OR v_teacher.year_level = '' THEN
      UPDATE public.teachers
      SET year_level = TRIM(p_course_year), course_year = TRIM(p_course_year)
      WHERE id = v_profile.id;
      v_year_matched := true;
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Course Year "' || TRIM(p_course_year) || '" does not match the year level assigned to this instructor.'
      );
    END IF;
  END IF;

  -- 5. Derive a session password for auth login
  v_derived_password := 'BBTeacher_' || v_clean_code || '_' || v_norm_year || '_Auth';

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(v_derived_password, extensions.gen_salt('bf', 10))
  WHERE id = v_profile.auth_user_id;

  -- 6. Return email & derived token so client can call signInWithPassword(email, sessionPassword)
  RETURN jsonb_build_object(
    'success', true,
    'email', v_profile.email,
    'session_token', v_derived_password
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_teacher(TEXT, TEXT, TEXT) TO anon, authenticated;
