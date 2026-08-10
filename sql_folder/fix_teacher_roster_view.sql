-- ============================================================
-- Fix: Subject page shows 0 students (and the review-submissions
-- drawer is empty) even though My Subjects counts them enrolled.
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Root cause: the public.students table only had SELECT policies
-- for admins and for a student's own record, so a teacher's
-- `students` SELECT returned no rows. Enrollments were readable
-- (fix_teacher_student_counts.sql), which is why the card showed a
-- count, but the roster look-up inside the subject page was empty.
--
-- This lets a teacher read the student records of students enrolled
-- in subjects assigned to them. It relies on the role helpers from
-- supabase_role_enforcement.sql (current_user_is_teacher,
-- teacher_can_manage_subject); both are CREATE OR REPLACE there.
-- ============================================================

DROP POLICY IF EXISTS "Teachers can view students in their assigned subjects" ON public.students;
CREATE POLICY "Teachers can view students in their assigned subjects"
  ON public.students FOR SELECT
  USING (
    public.current_user_is_teacher()
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = students.id
        AND public.teacher_can_manage_subject(e.subject_id)
    )
  );