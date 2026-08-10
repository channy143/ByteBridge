-- ============================================================
-- Fix: Teacher overview shows 0 students per subject
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Root cause: reads on public.enrollments are blocked by RLS for
-- teachers unless the policy below exists. When it is missing, the
-- teacher's `enrollments` SELECT returns no rows, so the overview
-- and My Subjects show "0 students" even for enrolled subjects.
--
-- This creates the role helper (if missing) and the teacher SELECT
-- policy on enrollments. It is a subset of supabase_role_enforcement.sql.
-- ============================================================

-- 1. Role helper used by the policy (idempotent)
CREATE OR REPLACE FUNCTION public.current_user_is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (auth_user_id = auth.uid() OR id = auth.uid())
      AND role = 'teacher'
  );
$$;
GRANT EXECUTE ON FUNCTION public.current_user_is_teacher() TO authenticated;

-- 2. Teachers can read enrollments of subjects assigned to them
DROP POLICY IF EXISTS "Teachers can view enrollments for their subjects" ON public.enrollments;
CREATE POLICY "Teachers can view enrollments for their subjects"
  ON public.enrollments FOR SELECT
  USING (
    public.current_user_is_teacher()
    AND EXISTS (
      SELECT 1 FROM public.teacher_subjects ts
      JOIN public.profiles p ON p.id = ts.teacher_id
      WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND ts.subject_id = enrollments.subject_id
    )
  );