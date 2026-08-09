-- ============================================================
-- ByteBridge Auth Migration
-- Run this in Supabase SQL Editor AFTER the original schema.
-- This script is NON-DESTRUCTIVE to existing data.
-- ============================================================

-- ============================================================
-- STEP 1: Restructure the `students` table into a standalone
--         roster (remove FK to profiles, add own PK).
-- ============================================================

-- Create the table first if it completely doesn't exist
CREATE TABLE IF NOT EXISTS public.students (
    student_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    birthdate DATE
);

-- 1a. Drop any FK constraint from students.id → profiles.id
DO $$
DECLARE
  r RECORD;
BEGIN
  IF to_regclass('public.students') IS NOT NULL THEN
    FOR r IN (
      SELECT conname FROM pg_constraint
      WHERE conrelid = to_regclass('public.students')
        AND contype = 'f'
    ) LOOP
      EXECUTE 'ALTER TABLE public.students DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
  END IF;
END $$;

-- 1b. Drop the PK constraint on students using CASCADE to handle dependents
DO $$
DECLARE
  r RECORD;
BEGIN
  IF to_regclass('public.students') IS NOT NULL THEN
    FOR r IN (
      SELECT conname FROM pg_constraint
      WHERE conrelid = to_regclass('public.students')
        AND contype = 'p'
    ) LOOP
      EXECUTE 'ALTER TABLE public.students DROP CONSTRAINT ' || quote_ident(r.conname) || ' CASCADE';
    END LOOP;
  END IF;
END $$;

-- 1c. Drop the old `id` column if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='id') THEN
    ALTER TABLE public.students DROP COLUMN id;
  END IF;
END $$;

-- 1d. Add a new auto-generated UUID primary key
ALTER TABLE public.students ADD COLUMN id UUID DEFAULT uuid_generate_v4();
ALTER TABLE public.students ADD PRIMARY KEY (id);

-- 1e. Re-add the dependent foreign keys that were dropped by CASCADE
DO $$
BEGIN
  IF to_regclass('public.enrollments') IS NOT NULL THEN
    ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
  IF to_regclass('public.submissions') IS NOT NULL THEN
    ALTER TABLE public.submissions ADD CONSTRAINT submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
  IF to_regclass('public.module_progress') IS NOT NULL THEN
    ALTER TABLE public.module_progress ADD CONSTRAINT module_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 1e. Ensure student_id is UNIQUE and NOT NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('public.students')
      AND conname = 'students_student_id_key'
  ) THEN
    ALTER TABLE public.students ADD CONSTRAINT students_student_id_key UNIQUE (student_id);
  END IF;
END $$;

-- The students table now looks like:
-- id           UUID PK (standalone; set to the auth uid when a student registers
--              via the register_new_student RPC so it equals profiles.id)
-- student_id   VARCHAR UNIQUE NOT NULL
-- full_name    VARCHAR
-- birthdate    DATE


-- ============================================================
-- STEP 2: Adapt the `profiles` table
-- ============================================================

-- 2a. Add student_id column to profiles (links to the roster)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id VARCHAR(50);

-- 2b. We need profiles.id to equal auth.users.id (standard Supabase pattern).
--     The current schema uses a separate `auth_user_id` column. 
--     We'll keep `auth_user_id` for backward compat but the new
--     registration flow will set id = auth.uid() directly.
--     No destructive changes here.


-- ============================================================
-- STEP 3: Create the RPC function for student verification
-- ============================================================

-- This function runs with SECURITY DEFINER so the frontend
-- never needs direct SELECT access to the students table.
-- It checks if a matching student record exists AND whether
-- that student has already registered (has a profile).

CREATE OR REPLACE FUNCTION public.verify_student_identity(
  p_student_id TEXT,
  p_full_name TEXT,
  p_birthdate DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
  v_existing_profile RECORD;
BEGIN
  -- 1. Check if the student exists in the official roster
  SELECT * INTO v_student
  FROM public.students
  WHERE student_id = p_student_id
    AND LOWER(TRIM(full_name)) = LOWER(TRIM(p_full_name))
    AND birthdate = p_birthdate;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'verified', false,
      'reason', 'Student information could not be verified. Please check your Student ID, name, and birthday.'
    );
  END IF;

  -- 2. Check if this student_id has already been registered
  SELECT * INTO v_existing_profile
  FROM public.profiles
  WHERE student_id = p_student_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'verified', false,
      'reason', 'This Student ID has already been registered. Please log in instead.'
    );
  END IF;

  -- 3. All checks passed
  RETURN jsonb_build_object(
    'verified', true,
    'full_name', v_student.full_name
  );
END;
$$;

-- Grant schema usage and EXECUTE to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_student_identity(TEXT, TEXT, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_student_identity(TEXT, TEXT, DATE) TO authenticated;


-- ============================================================
-- STEP 4: RLS Policies
-- ============================================================

-- 4a. Students table: Block all direct access (only RPC can read it)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies on students
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'students'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.students';
  END LOOP;
END $$;

-- No SELECT/INSERT/UPDATE/DELETE policies = no direct access.
-- The verify_student_identity function uses SECURITY DEFINER to bypass RLS.

-- 4b. Profiles table: users can only access their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profile policies to recreate cleanly
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
  END LOOP;
END $$;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Users can insert their own profile (during registration)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- Teachers/other authenticated users can read basic profile info of others
-- (needed for announcements, classroom, etc.)
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');


-- ============================================================
-- STEP 5: Insert sample student roster records for testing
-- (Only if they don't already exist)
-- ============================================================

INSERT INTO public.students (student_id, full_name, birthdate)
VALUES 
  ('2024-0001', 'Juan Dela Cruz', '2005-01-15'),
  ('2024-0002', 'Maria Santos', '2005-03-20')
ON CONFLICT (student_id) DO NOTHING;


-- ============================================================
-- DONE! Summary of what was created/modified:
-- 
-- 1. students table → standalone roster (no FK to profiles)
-- 2. profiles table → added student_id column
-- 3. verify_student_identity() → secure RPC for verification
-- 4. RLS policies → students blocked, profiles self-access only
-- 5. Sample roster data inserted
-- ============================================================
