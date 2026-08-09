-- ============================================================
-- ByteBridge Teacher Registration
-- Run this in Supabase SQL Editor AFTER supabase_schema.sql and
-- supabase_auth_migration.sql. Adds the RPC that creates a
-- teacher profile, teacher record, and subject assignment on
-- first login, mirroring the student flow. Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.register_new_teacher(
  p_auth_id UUID,
  p_full_name TEXT,
  p_subject_code TEXT,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject_id UUID;
  v_teacher_id TEXT;
BEGIN
  -- 1. Find or create the subject the teacher manages
  SELECT id INTO v_subject_id
  FROM public.subjects
  WHERE subject_code = p_subject_code
  LIMIT 1;

  IF v_subject_id IS NULL THEN
    INSERT INTO public.subjects (subject_code, subject_title, description)
    VALUES (p_subject_code, p_subject_code, 'Subject managed by a ByteBridge teacher.')
    RETURNING id INTO v_subject_id;
  END IF;

  -- 2. Generate a stable teacher identifier
  v_teacher_id := 'T-' || upper(substr(md5(p_auth_id::text), 1, 6));

  -- 3. Insert into profiles table FIRST (teachers.id has an FK to profiles.id)
  INSERT INTO public.profiles (id, auth_user_id, role, full_name, email)
  VALUES (p_auth_id, p_auth_id, 'teacher', p_full_name, p_email)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = EXCLUDED.role,
      full_name = EXCLUDED.full_name;

  -- 4. Insert into teachers table (id = auth uid, mirrors students)
  INSERT INTO public.teachers (id, teacher_id, full_name)
  VALUES (p_auth_id, v_teacher_id, p_full_name)
  ON CONFLICT (teacher_id) DO UPDATE
  SET id = EXCLUDED.id,
      full_name = EXCLUDED.full_name;

  -- 5. Assign the subject to the teacher (if not already assigned)
  IF NOT EXISTS (
    SELECT 1 FROM public.teacher_subjects
    WHERE teacher_id = p_auth_id AND subject_id = v_subject_id
  ) THEN
    INSERT INTO public.teacher_subjects (teacher_id, subject_id)
    VALUES (p_auth_id, v_subject_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'teacher_id', v_teacher_id,
    'subject_id', v_subject_id
  );
END;
$$;

-- Grant permissions so the authenticated user can call this
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_new_teacher(UUID, TEXT, TEXT, TEXT) TO authenticated;
