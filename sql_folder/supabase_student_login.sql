-- ============================================================
-- ByteBridge Student Login via Student ID + Birthday
-- Run this in Supabase SQL Editor AFTER the other migrations.
-- Verifies identity, resets password to birthdate, returns email.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.login_student(
  p_student_id TEXT,
  p_birthdate DATE
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
BEGIN
  -- 1. Find the student roster record
  SELECT * INTO v_student
  FROM public.students
  WHERE student_id = p_student_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Student ID not found. Please check your Student ID.'
    );
  END IF;

  -- 2. Verify birthdate
  IF v_student.birthdate != p_birthdate THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Incorrect birthday. Please check your birthdate.'
    );
  END IF;

  -- 3. Find the corresponding auth profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE student_id = p_student_id
    AND role = 'student';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No account found for this Student ID. Please register first.'
    );
  END IF;

  -- 4. Reset the auth password to the birthdate (YYYY-MM-DD format)
  v_birthdate_text := to_char(p_birthdate, 'YYYY-MM-DD');

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(v_birthdate_text, extensions.gen_salt('bf'))
  WHERE id = v_profile.auth_user_id;

  -- 5. Return the auth email so the frontend can sign in
  RETURN jsonb_build_object(
    'success', true,
    'email', v_profile.email
  );
END;
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_student(TEXT, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.login_student(TEXT, DATE) TO authenticated;
