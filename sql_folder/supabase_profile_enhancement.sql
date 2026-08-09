-- ByteBridge: Profile enhancement
-- Run this after supabase_schema.sql (and supabase_auth_migration.sql if used) to enable
-- the academic identity block on the Profile page:
--   1. program + year_level columns on students (locked, not editable by the student)
--   2. self-view policy so a student can read their own record (student_id, program, year_level)

-- 1. Academic columns
ALTER TABLE students ADD COLUMN IF NOT EXISTS program VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS year_level VARCHAR(50);

-- 2. Self-view policy (students.id == profiles.id in the standard flow)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own student record" ON public.students;

CREATE POLICY "Users can view own student record"
  ON public.students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND p.id = students.id
    )
  );

-- Backfill existing students with the portal program
UPDATE public.students
   SET program = 'BTLED - ICT Major'
 WHERE program IS NULL;
