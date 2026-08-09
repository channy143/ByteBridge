-- ============================================================
-- ByteBridge Feature Policies
-- Run this in Supabase SQL Editor AFTER supabase_schema.sql and
-- supabase_auth_migration.sql. Adds RLS policies for the tables
-- that were created with RLS enabled but no policies (which
-- would deny every query). Safe to re-run (drops + recreates).
-- ============================================================

-- ------------------------------------------------------------
-- teachers / teacher_subjects / enrollments
-- ------------------------------------------------------------
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('teachers', 'teacher_subjects', 'enrollments'))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "Teachers viewable by everyone"
  ON public.teachers FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teacher subjects viewable by everyone"
  ON public.teacher_subjects FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Students can view own enrollments"
  ON public.enrollments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = enrollments.student_id)
  );

CREATE POLICY "Students can enroll themselves"
  ON public.enrollments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = enrollments.student_id)
  );

-- ------------------------------------------------------------
-- announcements / announcement_attachments
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('announcements', 'announcement_attachments'))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "Announcements viewable by everyone"
  ON public.announcements FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can post announcements"
  ON public.announcements FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = announcements.created_by AND p.role = 'teacher')
  );

CREATE POLICY "Teachers can update own announcements"
  ON public.announcements FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = announcements.created_by)
  );

CREATE POLICY "Teachers can delete own announcements"
  ON public.announcements FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = announcements.created_by)
  );

CREATE POLICY "Announcement attachments viewable by everyone"
  ON public.announcement_attachments FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can manage attachments"
  ON public.announcement_attachments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.announcements a WHERE a.id = announcement_attachments.announcement_id)
  );

-- ------------------------------------------------------------
-- modules / course_materials / module_progress
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('modules', 'course_materials', 'module_progress'))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "Modules viewable by everyone"
  ON public.modules FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can create modules"
  ON public.modules FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = modules.created_by AND p.role = 'teacher')
  );

CREATE POLICY "Teachers can update own modules"
  ON public.modules FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = modules.created_by)
  );

CREATE POLICY "Teachers can delete own modules"
  ON public.modules FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = modules.created_by)
  );

CREATE POLICY "Course materials viewable by everyone"
  ON public.course_materials FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can create materials"
  ON public.course_materials FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.role = 'teacher' AND (p.auth_user_id = auth.uid() OR p.id = auth.uid()))
  );

CREATE POLICY "Teachers can update materials"
  ON public.course_materials FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.role = 'teacher' AND (p.auth_user_id = auth.uid() OR p.id = auth.uid()))
  );

CREATE POLICY "Teachers can delete materials"
  ON public.course_materials FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.role = 'teacher' AND (p.auth_user_id = auth.uid() OR p.id = auth.uid()))
  );

CREATE POLICY "Students can view all progress"
  ON public.module_progress FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Students can upsert own progress"
  ON public.module_progress FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = module_progress.student_id)
  );

CREATE POLICY "Students can update own progress"
  ON public.module_progress FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = module_progress.student_id)
  );

-- ------------------------------------------------------------
-- meeting_sessions
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'meeting_sessions')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.meeting_sessions', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Sessions viewable by everyone"
  ON public.meeting_sessions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can start sessions"
  ON public.meeting_sessions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = meeting_sessions.started_by AND p.role = 'teacher')
  );

CREATE POLICY "Teachers can end own sessions"
  ON public.meeting_sessions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = meeting_sessions.started_by)
  );

CREATE POLICY "Teachers can delete own sessions"
  ON public.meeting_sessions FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = meeting_sessions.started_by)
  );

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = notifications.user_id)
  );

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = notifications.user_id)
  );

CREATE POLICY "Teachers can create notifications"
  ON public.notifications FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.role = 'teacher' AND (p.auth_user_id = auth.uid() OR p.id = auth.uid()))
  );

-- ------------------------------------------------------------
-- activities / submissions: relax teacher write access so any
-- assigned teacher can manage activities (original policies only
-- allowed via teacher_subjects matches; keep those, add fallback
-- for teacher-created activities with subject_id NULL).
-- ------------------------------------------------------------
CREATE POLICY "Teachers can manage own global activities"
  ON public.activities FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = activities.created_by AND p.role = 'teacher')
  );
