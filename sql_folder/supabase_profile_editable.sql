-- ByteBridge: Editable profile data
-- Run this AFTER supabase_profile_enhancement.sql (and supabase_auth_migration.sql if used).
-- Enables the Profile page "Edit" flow:
--   - students can update their own record (full_name, student_id, program, year_level)
--   - teachers can update their own record (full_name)
-- (profiles already has a self-update policy from supabase_schema.sql / supabase_auth_migration.sql)

-- 1. Students may update their own record
DROP POLICY IF EXISTS "Users can update own student record" ON public.students;
CREATE POLICY "Users can update own student record"
  ON public.students FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND p.id = students.id
    )
  );

-- 2. Teachers may update their own record (teachers.id == profiles.id == auth uid)
DROP POLICY IF EXISTS "Users can update own teacher record" ON public.teachers;
CREATE POLICY "Users can update own teacher record"
  ON public.teachers FOR UPDATE
  USING (auth.uid() = teachers.id);
