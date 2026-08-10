-- ============================================================
-- ByteBridge: Admin Student Management (Phase 4)
-- Run this in Supabase SQL Editor AFTER supabase_admin_auth.sql
-- and supabase_profile_enhancement.sql. Safe to re-run.
--
--  1. admin_create_student  — admin creates a full student account
--     (auth user + profile + roster record) so the student can sign
--     in with Student ID + Birthday.
--  2. admin_update_student  — admin edits the student record (ID,
--     name, birthdate, program, year level). Keeping the derived
--     sign-in email in sync.
--  3. admin_delete_student  — removes the student account and every
--     related row (enrollments, submissions, progress) cleanly.
-- ============================================================

-- ------------------------------------------------------------
-- Helper: derived sign-in email for an admin-created student
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.student_signin_email(p_student_id TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(lower(trim(p_student_id)), '[^a-z0-9]', '', 'g') || '@student.bytebridge.local';
$$;

-- ------------------------------------------------------------
-- 1. admin_create_student
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_create_student(
  p_student_id TEXT,
  p_full_name TEXT,
  p_birthdate DATE,
  p_email TEXT DEFAULT NULL,
  p_program TEXT DEFAULT 'BTLED - ICT Major',
  p_year_level TEXT DEFAULT '1'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin BOOLEAN;
  v_user_id UUID;
  v_email TEXT;
BEGIN
  -- Only an administrator can create student accounts
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'admin'
  ) INTO v_admin;

  IF NOT v_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can create student accounts.');
  END IF;

  -- Student ID must be unique in the roster
  IF EXISTS (SELECT 1 FROM public.students WHERE student_id = p_student_id) THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Student ID "' || p_student_id || '" is already registered.');
  END IF;

  -- Derive the sign-in email from the Student ID (keeps login_student flow intact)
  v_email := COALESCE(NULLIF(trim(p_email), ''), public.student_signin_email(p_student_id));

  -- The derived email must be unique: if the ID is edited later the email
  -- must not collide with another auth account.
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RETURN jsonb_build_object('success', false,
      'error', 'An account with email "' || v_email || '" already exists. Provide a different student email.');
  END IF;

  v_user_id := uuid_generate_v4();

  -- 1. Auth user (auto-confirmed; email confirmations are disabled anyway)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt('SetByLogin', extensions.gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'student', 'full_name', p_full_name,
      'student_id', p_student_id, 'birthdate', p_birthdate::text),
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

  -- 2. Profile (id == auth uid, mirrors all other flows)
  INSERT INTO public.profiles (id, auth_user_id, student_id, role, full_name, email)
  VALUES (v_user_id, v_user_id, p_student_id, 'student', p_full_name, v_email);

  -- 3. Roster record
  INSERT INTO public.students (id, student_id, full_name, birthdate, program, year_level)
  VALUES (v_user_id, p_student_id, p_full_name, p_birthdate, p_program, p_year_level);

  RETURN jsonb_build_object(
    'success', true,
    'student_id', p_student_id,
    'email', v_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_student(TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 2. admin_update_student
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_student(
  p_id UUID,
  p_student_id TEXT,
  p_full_name TEXT,
  p_birthdate DATE,
  p_program TEXT,
  p_year_level TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin BOOLEAN;
  v_uid UUID;
  v_email TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'admin'
  ) INTO v_admin;

  IF NOT v_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can update students.');
  END IF;

  -- Student ID must stay unique across the roster
  IF EXISTS (
    SELECT 1 FROM public.students
    WHERE student_id = p_student_id AND id <> p_id
  ) THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Student ID "' || p_student_id || '" is already in use by another student.');
  END IF;

  -- The linked auth user for this student
  SELECT auth_user_id INTO v_uid
  FROM public.profiles
  WHERE id = p_id OR auth_user_id = p_id
  LIMIT 1;

  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student record not found.');
  END IF;

  v_email := public.student_signin_email(p_student_id);

  -- If the ID changed, keep the derived sign-in email unique
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email AND id <> v_uid) THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Student ID change would create an email conflict (' || v_email || ').');
  END IF;

  -- 1. Roster record
  UPDATE public.students
  SET student_id = p_student_id,
      full_name = p_full_name,
      birthdate = p_birthdate,
      program = COALESCE(p_program, program),
      year_level = COALESCE(p_year_level, year_level)
  WHERE id = p_id;

  -- 2. Profile
  UPDATE public.profiles
  SET student_id = p_student_id,
      full_name = p_full_name,
      email = v_email
  WHERE id = p_id OR auth_user_id = p_id;

  -- 3. Auth user + identity email (so login_student still resolves)
  UPDATE auth.users
  SET email = v_email
  WHERE id = v_uid;

  UPDATE auth.identities
  SET provider_id = v_email,
      identity_data = jsonb_build_object('sub', v_uid::text, 'email', v_email,
        'email_verified', true, 'phone_verified', false)
  WHERE user_id = v_uid;

  RETURN jsonb_build_object('success', true, 'student_id', p_student_id, 'email', v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_student(UUID, TEXT, TEXT, DATE, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 3. admin_delete_student
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_student(p_student_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin BOOLEAN;
  v_id UUID;
  v_uid UUID;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'admin'
  ) INTO v_admin;

  IF NOT v_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can delete students.');
  END IF;

  SELECT id INTO v_id FROM public.students WHERE student_id = p_student_id;
  IF v_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student not found in the roster.');
  END IF;

  SELECT auth_user_id INTO v_uid FROM public.profiles WHERE id = v_id LIMIT 1;

  -- Remove dependent rows in explicit order (bypasses any RLS gaps)
  DELETE FROM public.notifications   WHERE user_id = v_uid OR user_id = v_id;
  DELETE FROM public.module_progress WHERE student_id = v_id;
  DELETE FROM public.submissions     WHERE student_id = v_id;
  DELETE FROM public.enrollments     WHERE student_id = v_id;
  DELETE FROM public.students        WHERE id = v_id;

  IF v_uid IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id = v_uid OR auth_user_id = v_uid;
    DELETE FROM auth.users     WHERE id = v_uid;
  END IF;

  RETURN jsonb_build_object('success', true, 'student_id', p_student_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_student(TEXT) TO authenticated;