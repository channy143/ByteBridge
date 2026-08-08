-- ============================================================
-- ByteBridge Open Registration SQL
-- Run this in Supabase SQL Editor
-- ============================================================

-- This function is called automatically by the frontend when a
-- student logs in for the very first time. It creates their
-- profile AND their official student record simultaneously.

CREATE OR REPLACE FUNCTION public.register_new_student(
  p_auth_id UUID,
  p_student_id TEXT,
  p_full_name TEXT,
  p_birthdate DATE,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_student_uuid UUID;
  v_new_profile_id UUID;
BEGIN
  -- 1. Insert into students table (if not exists), using the auth uid as id
  --    so students.id == profiles.id == auth uid. This keeps every FK that
  --    points at students(id) (enrollments, submissions, module_progress)
  --    aligned with the frontend, which always uses profile.id.
  INSERT INTO public.students (id, student_id, full_name, birthdate)
  VALUES (p_auth_id, p_student_id, p_full_name, p_birthdate)
  ON CONFLICT (student_id) DO UPDATE 
  SET id = EXCLUDED.id,
      full_name = EXCLUDED.full_name,
      birthdate = EXCLUDED.birthdate
  RETURNING id INTO v_new_student_uuid;

  -- 2. Insert into profiles table
  INSERT INTO public.profiles (id, auth_user_id, student_id, role, full_name, email)
  VALUES (p_auth_id, p_auth_id, p_student_id, 'student', p_full_name, p_email)
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_new_profile_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'profile_id', v_new_profile_id,
    'student_uuid', v_new_student_uuid
  );
END;
$$;

-- Grant permissions so the authenticated user can call this
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_new_student(UUID, TEXT, TEXT, DATE, TEXT) TO authenticated;
