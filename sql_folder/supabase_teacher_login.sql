-- ============================================================
-- ByteBridge Teacher Login via Full Name + Subject Code
-- Run this in Supabase SQL Editor AFTER the other migrations.
-- Verifies identity, resets password to the subject code, returns email.
-- ============================================================

CREATE OR REPLACE FUNCTION public.login_teacher(
  p_full_name TEXT,
  p_subject_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_password TEXT;
  v_hashed TEXT;
BEGIN
  -- 1. Find the teacher profile by name
  SELECT p.* INTO v_profile
  FROM public.profiles p
  WHERE LOWER(TRIM(p.full_name)) = LOWER(TRIM(p_full_name))
    AND p.role = 'teacher'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Teacher not found. Please check your name.'
    );
  END IF;

  -- 2. Verify the subject code matches an assigned subject
  IF NOT EXISTS (
    SELECT 1
    FROM public.teacher_subjects ts
    JOIN public.subjects s ON s.id = ts.subject_id
    WHERE ts.teacher_id = v_profile.id
      AND LOWER(TRIM(s.subject_code)) = LOWER(TRIM(p_subject_code))
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Subject code does not match. Please check your subject code.'
    );
  END IF;

  -- 3. Derive the password from the subject code (lowercase, no spaces)
  v_password := REPLACE(LOWER(TRIM(p_subject_code)), ' ', '');

  -- 4. Reset the auth password
  v_hashed := extensions.crypt(v_password, extensions.gen_salt('bf'));

  UPDATE auth.users
  SET encrypted_password = v_hashed
  WHERE id = v_profile.auth_user_id;

  -- 5. Return the auth email so the frontend can sign in
  RETURN jsonb_build_object(
    'success', true,
    'email', v_profile.email
  );
END;
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_teacher(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.login_teacher(TEXT, TEXT) TO authenticated;
