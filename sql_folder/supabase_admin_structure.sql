-- ============================================================
-- ByteBridge: Academic Structure + Admin Management (Phase 6)
-- Run this in Supabase SQL Editor AFTER:
--   supabase_schema.sql
--   supabase_auth_migration.sql
--   supabase_feature_policies.sql
--   supabase_admin_auth.sql
--   supabase_profile_enhancement.sql
--   supabase_teacher_subject.sql
--   supabase_admin_students.sql
--   supabase_classroom_schedules.sql
--   supabase_announcements_enhancement.sql
--   supabase_role_enforcement.sql
-- Safe to re-run.
--
-- What this adds:
--   1. programs table (+ RLS)
--   2. academic metadata columns on subjects, sections, teacher_subjects,
--      enrollments, students (status)
--   3. syllabi table (+ RLS)  — official subject-level syllabus, versioned
--   4. learning_outcomes table (+ RLS)
--   5. syllabus storage bucket
--   6. Teacher authentication overhaul:
--        - Teacher sign in = Name + Password (login_teacher now only
--          resolves the name; the password is verified by auth)
--        - Open teacher self-registration (register_teacher_account +
--          register_new_teacher) — no subject auto-assignment
--        - Admin provisioning RPCs (create / update / reset password /
--          set status) that do NOT require a subject
--   7. audit triggers for the new tables
-- ============================================================

-- ------------------------------------------------------------
-- 1. programs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Programs viewable by everyone" ON public.programs;
CREATE POLICY "Programs viewable by everyone"
  ON public.programs FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can insert programs" ON public.programs;
CREATE POLICY "Admins can insert programs"
  ON public.programs FOR INSERT
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update programs" ON public.programs;
CREATE POLICY "Admins can update programs"
  ON public.programs FOR UPDATE
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can delete programs" ON public.programs;
CREATE POLICY "Admins can delete programs"
  ON public.programs FOR DELETE
  USING (public.current_user_is_admin());

-- ------------------------------------------------------------
-- 2. Academic metadata columns (idempotent)
-- ------------------------------------------------------------

-- subjects
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS year_level VARCHAR(50);
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS semester VARCHAR(50);
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50);
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS units INTEGER;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';

-- sections
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS year_level VARCHAR(50);
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50);
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS semester VARCHAR(50);
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS adviser_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL;
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';

-- teacher_subjects
ALTER TABLE public.teacher_subjects ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50);
ALTER TABLE public.teacher_subjects ADD COLUMN IF NOT EXISTS semester VARCHAR(50);

-- teachers
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';

-- enrollments
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50);
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS semester VARCHAR(50);

-- students (status for the admin roster / deactivation)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';

-- ------------------------------------------------------------
-- 3. syllabi — official subject-level document (versioned)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.syllabi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  academic_year VARCHAR(50),
  semester VARCHAR(50),
  version VARCHAR(20) DEFAULT 'v1.0',
  is_current BOOLEAN DEFAULT TRUE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.syllabi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Syllabi viewable by everyone" ON public.syllabi;
CREATE POLICY "Syllabi viewable by everyone"
  ON public.syllabi FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can insert syllabi" ON public.syllabi;
CREATE POLICY "Admins can insert syllabi"
  ON public.syllabi FOR INSERT
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update syllabi" ON public.syllabi;
CREATE POLICY "Admins can update syllabi"
  ON public.syllabi FOR UPDATE
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can delete syllabi" ON public.syllabi;
CREATE POLICY "Admins can delete syllabi"
  ON public.syllabi FOR DELETE
  USING (public.current_user_is_admin());

-- ------------------------------------------------------------
-- 4. learning_outcomes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

ALTER TABLE public.learning_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learning outcomes viewable by everyone" ON public.learning_outcomes;
CREATE POLICY "Learning outcomes viewable by everyone"
  ON public.learning_outcomes FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can insert learning outcomes" ON public.learning_outcomes;
CREATE POLICY "Admins can insert learning outcomes"
  ON public.learning_outcomes FOR INSERT
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update learning outcomes" ON public.learning_outcomes;
CREATE POLICY "Admins can update learning outcomes"
  ON public.learning_outcomes FOR UPDATE
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can delete learning outcomes" ON public.learning_outcomes;
CREATE POLICY "Admins can delete learning outcomes"
  ON public.learning_outcomes FOR DELETE
  USING (public.current_user_is_admin());

-- ------------------------------------------------------------
-- 5. Syllabus storage bucket (public read)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('syllabi', 'syllabi', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read syllabi docs" ON storage.objects;
CREATE POLICY "Public read syllabi docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'syllabi');

DROP POLICY IF EXISTS "Admin upload syllabi docs" ON storage.objects;
CREATE POLICY "Admin upload syllabi docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'syllabi' AND public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin update syllabi docs" ON storage.objects;
CREATE POLICY "Admin update syllabi docs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'syllabi' AND public.current_user_is_admin());

DROP POLICY IF EXISTS "Admin delete syllabi docs" ON storage.objects;
CREATE POLICY "Admin delete syllabi docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'syllabi' AND public.current_user_is_admin());

-- ------------------------------------------------------------
-- 6. Teacher authentication overhaul
-- ------------------------------------------------------------

-- 6a. Open teacher self-registration (full account, server-side).
--     No subject is auto-assigned — the administrator assigns subjects.
DROP FUNCTION IF EXISTS public.register_new_teacher(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.register_new_teacher(
  p_auth_id UUID,
  p_full_name TEXT,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_auth_id OR auth_user_id = p_auth_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'An account is already linked to this auth user.');
  END IF;

  v_teacher_id := 'T-' || upper(substr(md5(p_auth_id::text), 1, 6));

  INSERT INTO public.profiles (id, auth_user_id, role, full_name, email)
  VALUES (p_auth_id, p_auth_id, 'teacher', p_full_name, p_email)
  ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, full_name = EXCLUDED.full_name, email = EXCLUDED.email;

  INSERT INTO public.teachers (id, teacher_id, full_name, status)
  VALUES (p_auth_id, v_teacher_id, p_full_name, 'Active')
  ON CONFLICT (teacher_id) DO UPDATE
  SET id = EXCLUDED.id, full_name = EXCLUDED.full_name;

  RETURN jsonb_build_object('success', true, 'teacher_id', v_teacher_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_new_teacher(UUID, TEXT, TEXT) TO anon, authenticated;

-- 6b. One-shot self-service registration: creates the full auth account
--     (auth user + identity + profile + teacher record) so the teacher can
--     immediately sign in with Name + Password.
CREATE OR REPLACE FUNCTION public.register_teacher_account(
  p_full_name TEXT,
  p_email TEXT,
  p_password TEXT
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
BEGIN
  v_email := LOWER(TRIM(p_email));
  IF length(trim(p_full_name)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please enter your full name.');
  END IF;
  IF v_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please enter a valid email address.');
  END IF;
  IF length(coalesce(p_password, '')) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters.');
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'An account with this email already exists.');
  END IF;

  v_user_id := uuid_generate_v4();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'teacher', 'full_name', p_full_name),
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

  INSERT INTO public.profiles (id, auth_user_id, role, full_name, email)
  VALUES (v_user_id, v_user_id, 'teacher', p_full_name, v_email);

  v_teacher_id := 'T-' || upper(substr(md5(v_user_id::text), 1, 6));
  INSERT INTO public.teachers (id, teacher_id, full_name, status)
  VALUES (v_user_id, v_teacher_id, p_full_name, 'Active');

  RETURN jsonb_build_object('success', true, 'teacher_id', v_teacher_id, 'email', v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_teacher_account(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 6c. Teacher sign in = Name + Password. The password is verified by
--     auth (signInWithPassword); this RPC only resolves the name to the
--     account email and blocks inactive accounts.
DROP FUNCTION IF EXISTS public.login_teacher(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.login_teacher(p_full_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT p.*, t.status INTO v_profile
  FROM public.profiles p
  JOIN public.teachers t ON t.id = p.id
  WHERE LOWER(TRIM(p.full_name)) = LOWER(TRIM(p_full_name))
    AND p.role = 'teacher'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Teacher not found. Please check your name.');
  END IF;

  IF coalesce(v_profile.status, 'Active') <> 'Active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This teacher account is inactive. Contact your administrator.');
  END IF;

  RETURN jsonb_build_object('success', true, 'email', v_profile.email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_teacher(TEXT) TO anon, authenticated;

-- 6d. Admin provisioning RPCs (no subject required — assignments are done
--     separately via the Subject Assignment screen)
CREATE OR REPLACE FUNCTION public.admin_provision_teacher(
  p_full_name TEXT,
  p_email TEXT,
  p_teacher_id TEXT DEFAULT NULL,
  p_temp_password TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'Active'
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
  v_teacher_id TEXT;
  v_password TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'admin'
  ) INTO v_admin;

  IF NOT v_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can create teacher accounts.');
  END IF;

  v_email := LOWER(TRIM(p_email));
  IF v_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please enter a valid email address.');
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'An account with this email already exists.');
  END IF;

  -- Teacher ID: use the provided one or generate a stable one
  v_teacher_id := COALESCE(NULLIF(trim(p_teacher_id), ''), NULL);
  IF v_teacher_id IS NULL THEN
    v_user_id := uuid_generate_v4();
    v_teacher_id := 'T-' || upper(substr(md5(v_user_id::text), 1, 6));
  END IF;

  IF EXISTS (SELECT 1 FROM public.teachers WHERE teacher_id = v_teacher_id AND teacher_id <> '') THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Teacher ID "' || v_teacher_id || '" is already in use.');
  END IF;

  -- Temp password: use the provided one or generate one
  v_password := COALESCE(NULLIF(p_temp_password, ''), 'BB-' || upper(substr(md5(random()::text), 1, 8)));

  IF v_user_id IS NULL THEN
    v_user_id := uuid_generate_v4();
  END IF;

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
    jsonb_build_object('role', 'teacher', 'full_name', p_full_name),
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

  INSERT INTO public.profiles (id, auth_user_id, role, full_name, email)
  VALUES (v_user_id, v_user_id, 'teacher', p_full_name, v_email);

  INSERT INTO public.teachers (id, teacher_id, full_name, status)
  VALUES (v_user_id, v_teacher_id, p_full_name, p_status);

  RETURN jsonb_build_object(
    'success', true,
    'teacher_id', v_teacher_id,
    'email', v_email,
    'temp_password', v_password
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_provision_teacher(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_teacher(
  p_profile_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_teacher_id TEXT,
  p_status TEXT DEFAULT 'Active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_uid UUID;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can update teacher accounts.');
  END IF;

  SELECT auth_user_id INTO v_uid FROM public.profiles WHERE id = p_profile_id LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Teacher record not found.');
  END IF;

  v_email := LOWER(TRIM(coalesce(p_email, '')));
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email AND id <> v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'An account with this email already exists.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.teachers WHERE teacher_id = p_teacher_id AND id <> p_profile_id AND coalesce(p_teacher_id,'') <> '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Teacher ID "' || p_teacher_id || '" is already in use.');
  END IF;

  UPDATE public.profiles
  SET full_name = p_full_name, email = v_email
  WHERE id = p_profile_id;

  UPDATE public.teachers
  SET full_name = p_full_name, teacher_id = p_teacher_id, status = p_status
  WHERE id = p_profile_id;

  UPDATE auth.users SET email = v_email WHERE id = v_uid;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_teacher(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reset_teacher_password(
  p_profile_id UUID,
  p_new_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_password TEXT;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can reset teacher passwords.');
  END IF;

  SELECT auth_user_id INTO v_uid FROM public.profiles WHERE id = p_profile_id LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Teacher record not found.');
  END IF;

  v_password := COALESCE(NULLIF(p_new_password, ''), 'BB-' || upper(substr(md5(random()::text), 1, 8)));

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf', 10))
  WHERE id = v_uid;

  RETURN jsonb_build_object('success', true, 'temp_password', v_password);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_teacher_password(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_teacher_status(
  p_profile_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can change teacher status.');
  END IF;

  UPDATE public.teachers SET status = p_status WHERE id = p_profile_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_teacher_status(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 7. audit triggers for the new tables
-- ------------------------------------------------------------
DO $$
DECLARE
  t text;
  trigger_name text;
BEGIN
  FOREACH t IN ARRAY ARRAY['programs', 'syllabi', 'learning_outcomes']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      trigger_name := 'trg_audit_' || t;
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trigger_name, t);
      EXECUTE format(
        $q$
        CREATE TRIGGER %I
          AFTER INSERT OR UPDATE OR DELETE ON public.%I
          FOR EACH ROW EXECUTE FUNCTION public.log_audit();
        $q$,
        trigger_name, t
      );
    END IF;
  END LOOP;
END;
$$;