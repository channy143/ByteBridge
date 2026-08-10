-- ============================================================
-- ByteBridge: Admin Authentication + Permissions
-- Run this in Supabase SQL Editor AFTER supabase_auth_migration.sql,
-- supabase_open_registration.sql, supabase_teacher_registration.sql,
-- and supabase_feature_policies.sql. Safe to re-run.
--
--  1. Allows the 'admin' role on profiles
--  2. Creates the administrator account (hidden login: Ctrl+Alt+A)
--  3. Admin RLS policies for the academic structure tables
--  4. admin_create_teacher RPC (admin creates teacher accounts)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Allow 'admin' role
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND contype = 'c'
  ) LOOP
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'teacher', 'admin'));

-- ------------------------------------------------------------
-- 2. Create the administrator account (idempotent)
--    Default credentials (CHANGE AFTER FIRST LOGIN):
--      Email:    admin@bytebridge.edu
--      Password: ByteBridge@2026
--    The password is stored as a bcrypt hash, never plaintext.
-- ------------------------------------------------------------
DO $$
DECLARE
  v_admin_id UUID := uuid_generate_v4();
  v_email TEXT := 'admin@bytebridge.edu';
  v_password TEXT := 'ByteBridge@2026';
  v_subject_code_hash TEXT := replace(lower(trim('ICT 101')), ' ', '');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf', 10)),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin","full_name":"System Administrator"}',
      NOW(), NOW()
    );

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_email, v_admin_id,
      jsonb_build_object('sub', v_admin_id::text, 'email', v_email,
        'email_verified', true, 'phone_verified', false),
      'email', NOW(), NOW(), NOW()
    );

    INSERT INTO public.profiles (id, auth_user_id, role, full_name, email)
    VALUES (v_admin_id, v_admin_id, 'admin', 'System Administrator', v_email);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. Admin RLS policies
--    Admin can manage the academic structure; teachers can only
--    create content inside subjects assigned to them; students
--    are read-only on structure.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (auth_user_id = auth.uid() OR id = auth.uid())
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- subjects: admin can create / update / delete
DROP POLICY IF EXISTS "Admins can insert subjects" ON public.subjects;
CREATE POLICY "Admins can insert subjects"
  ON public.subjects FOR INSERT WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update subjects" ON public.subjects;
CREATE POLICY "Admins can update subjects"
  ON public.subjects FOR UPDATE USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can delete subjects" ON public.subjects;
CREATE POLICY "Admins can delete subjects"
  ON public.subjects FOR DELETE USING (public.current_user_is_admin());

-- teacher_subjects: only admin assigns teachers to subjects
DROP POLICY IF EXISTS "Admins can insert teacher_subjects" ON public.teacher_subjects;
CREATE POLICY "Admins can insert teacher_subjects"
  ON public.teacher_subjects FOR INSERT WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update teacher_subjects" ON public.teacher_subjects;
CREATE POLICY "Admins can update teacher_subjects"
  ON public.teacher_subjects FOR UPDATE USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can delete teacher_subjects" ON public.teacher_subjects;
CREATE POLICY "Admins can delete teacher_subjects"
  ON public.teacher_subjects FOR DELETE USING (public.current_user_is_admin());

-- teachers: admin manages teacher records
DROP POLICY IF EXISTS "Admins can insert teachers" ON public.teachers;
CREATE POLICY "Admins can insert teachers"
  ON public.teachers FOR INSERT WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update teachers" ON public.teachers;
CREATE POLICY "Admins can update teachers"
  ON public.teachers FOR UPDATE USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can delete teachers" ON public.teachers;
CREATE POLICY "Admins can delete teachers"
  ON public.teachers FOR DELETE USING (public.current_user_is_admin());

-- students: admin can view the full roster and manage records
DROP POLICY IF EXISTS "Admins can view all student records" ON public.students;
CREATE POLICY "Admins can view all student records"
  ON public.students FOR SELECT USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can insert student records" ON public.students;
CREATE POLICY "Admins can insert student records"
  ON public.students FOR INSERT WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update student records" ON public.students;
CREATE POLICY "Admins can update student records"
  ON public.students FOR UPDATE USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can delete student records" ON public.students;
CREATE POLICY "Admins can delete student records"
  ON public.students FOR DELETE USING (public.current_user_is_admin());

-- enrollments: admin manages student enrollment
DROP POLICY IF EXISTS "Admins can insert enrollments" ON public.enrollments;
CREATE POLICY "Admins can insert enrollments"
  ON public.enrollments FOR INSERT WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update enrollments" ON public.enrollments;
CREATE POLICY "Admins can update enrollments"
  ON public.enrollments FOR UPDATE USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can delete enrollments" ON public.enrollments;
CREATE POLICY "Admins can delete enrollments"
  ON public.enrollments FOR DELETE USING (public.current_user_is_admin());

-- sections: admin manages sections
DROP POLICY IF EXISTS "Admins can insert sections" ON public.sections;
CREATE POLICY "Admins can insert sections"
  ON public.sections FOR INSERT WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update sections" ON public.sections;
CREATE POLICY "Admins can update sections"
  ON public.sections FOR UPDATE USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can delete sections" ON public.sections;
CREATE POLICY "Admins can delete sections"
  ON public.sections FOR DELETE USING (public.current_user_is_admin());

-- ------------------------------------------------------------
-- 4. admin_create_teacher RPC
--    Admin creates a teacher account with an assignment to an
--    EXISTING subject (created first by the admin). The teacher
--    logs in with their name + that subject code; login_teacher
--    resets the password on every login anyway.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_create_teacher(
  p_full_name TEXT,
  p_email TEXT,
  p_subject_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin BOOLEAN;
  v_user_id UUID;
  v_subject_id UUID;
  v_teacher_id TEXT;
  v_password TEXT;
BEGIN
  -- Only an admin can create teacher accounts
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'admin'
  ) INTO v_admin;

  IF NOT v_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can create teacher accounts.');
  END IF;

  -- Subject must already exist (admin creates subjects first)
  SELECT id INTO v_subject_id
  FROM public.subjects
  WHERE LOWER(TRIM(subject_code)) = LOWER(TRIM(p_subject_code))
  LIMIT 1;

  IF v_subject_id IS NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Subject "' || p_subject_code || '" does not exist. Create the subject first.');
  END IF;

  -- Existing auth user?
  SELECT id INTO v_user_id FROM auth.users WHERE email = LOWER(TRIM(p_email)) LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := uuid_generate_v4();
    v_password := replace(lower(trim(p_subject_code)), ' ', '');

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', LOWER(TRIM(p_email)),
      extensions.crypt(v_password, extensions.gen_salt('bf', 10)),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('role', 'teacher', 'full_name', p_full_name),
      NOW(), NOW()
    );

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      LOWER(TRIM(p_email)), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', LOWER(TRIM(p_email)),
        'email_verified', true, 'phone_verified', false),
      'email', NOW(), NOW(), NOW()
    );
  END IF;

  -- Profile + teacher record + subject assignment
  INSERT INTO public.profiles (id, auth_user_id, role, full_name, email)
  VALUES (v_user_id, v_user_id, 'teacher', p_full_name, LOWER(TRIM(p_email)))
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, role = EXCLUDED.role, full_name = EXCLUDED.full_name;

  v_teacher_id := 'T-' || upper(substr(md5(v_user_id::text), 1, 6));

  INSERT INTO public.teachers (id, teacher_id, full_name)
  VALUES (v_user_id, v_teacher_id, p_full_name)
  ON CONFLICT (teacher_id) DO UPDATE
  SET id = EXCLUDED.id, full_name = EXCLUDED.full_name;

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
    'subject_id', v_subject_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_teacher(TEXT, TEXT, TEXT) TO authenticated;
