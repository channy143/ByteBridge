-- ============================================================
-- ByteBridge: Strict Role Separation (Phase 5)
-- Run this in Supabase SQL Editor AFTER:
--   supabase_schema.sql
--   supabase_feature_policies.sql
--   supabase_admin_auth.sql
--   supabase_admin_students.sql
--   supabase_teacher_subject.sql        (adds modules.is_published)
--   supabase_classroom_schedules.sql
--   supabase_announcements_enhancement.sql
--   supabase_profile_enhancement.sql
-- Safe to re-run.
--
-- Responsibilities enforced here:
--   Admin   : manages accounts + academic structure (subjects, sections,
--             teacher/student accounts, enrollments, teacher_subjects,
--             system-wide announcements). NOT responsible for teaching
--             content, but retains override rights.
--   Teacher : manages CONTENT ONLY inside subjects assigned to them
--             (modules, materials, activities, subject announcements,
--             class schedules, live sessions). Cannot assign themselves,
--             create subjects/sections, or post system-wide.
--   Student : read-only. Sees published modules of ENROLLED subjects
--             only. CANNOT self-enroll.
--
--  1. Role helper functions
--  2. enrollments       — admins manage, teachers view assigned, students
--                         view own only (self-enrollment REMOVED)
--  3. modules           — teacher writes scoped to assigned subjects;
--                         students see only published modules
--  4. course_materials  — scoped through the parent module
--  5. activities        — teacher writes scoped to assigned subjects;
--                         "global" activities are admin-only now
--  6. announcements     — system-wide (subject_id IS NULL) is admin-only;
--                         teachers post only to assigned subjects
--  7. class_schedules / meeting_sessions — teachers may only create for
--                         assigned subjects (general, subject-less classes
--                         remain allowed)
--  8. register_new_teacher — no longer self-assigns subjects; admin-only
--  9. audit_logs        — append-only activity log + table triggers
-- ============================================================

-- ------------------------------------------------------------
-- 0. Safety net: ensure modules.is_published exists
-- ------------------------------------------------------------
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
UPDATE public.modules SET is_published = TRUE WHERE is_published IS NULL;

-- ------------------------------------------------------------
-- 1. Role helper functions
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.current_profile_id();
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE auth_user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;

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

CREATE OR REPLACE FUNCTION public.current_user_is_student()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (auth_user_id = auth.uid() OR id = auth.uid())
      AND role = 'student'
  );
$$;
GRANT EXECUTE ON FUNCTION public.current_user_is_student() TO authenticated;

-- Is the current user (a teacher) assigned to the given subject?
CREATE OR REPLACE FUNCTION public.teacher_can_manage_subject(p_subject_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_subjects ts
    JOIN public.profiles p ON p.id = ts.teacher_id
    WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
      AND ts.subject_id = p_subject_id
  );
$$;
GRANT EXECUTE ON FUNCTION public.teacher_can_manage_subject(UUID) TO authenticated;

-- Is the current user (a student) enrolled in the given subject?
CREATE OR REPLACE FUNCTION public.student_enrolled(p_subject_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.profiles p ON p.id = e.student_id
    WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
      AND e.subject_id = p_subject_id
  );
$$;
GRANT EXECUTE ON FUNCTION public.student_enrolled(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 2. enrollments — enrollment is an ADMIN responsibility
--    (removes "Students can enroll themselves")
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Students can enroll themselves" ON public.enrollments;

-- Admins can read every enrollment (roster counts + enrollment manager)
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
CREATE POLICY "Admins can view all enrollments"
  ON public.enrollments FOR SELECT
  USING (public.current_user_is_admin());

-- Teachers can read enrollments of subjects assigned to them
-- (needed for "View students enrolled in their subject")
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

-- ------------------------------------------------------------
-- 3. modules — teacher content scoped to assigned subjects;
--    students only see published modules of enrolled subjects
-- ------------------------------------------------------------
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Modules viewable by everyone" ON public.modules;
DROP POLICY IF EXISTS "Teachers can create modules" ON public.modules;
DROP POLICY IF EXISTS "Teachers can update own modules" ON public.modules;
DROP POLICY IF EXISTS "Teachers can delete own modules" ON public.modules;

CREATE POLICY "Modules visible by scope"
  ON public.modules FOR SELECT
  USING (
    public.current_user_is_admin()
    OR public.teacher_can_manage_subject(modules.subject_id)
    OR (public.current_user_is_student()
        AND public.student_enrolled(modules.subject_id)
        AND modules.is_published = TRUE)
  );

CREATE POLICY "Modules inserted by assigned teachers or admins"
  ON public.modules FOR INSERT
  WITH CHECK (public.current_user_is_admin() OR public.teacher_can_manage_subject(modules.subject_id));

CREATE POLICY "Modules updated by assigned teachers or admins"
  ON public.modules FOR UPDATE
  USING (public.current_user_is_admin() OR public.teacher_can_manage_subject(modules.subject_id));

CREATE POLICY "Modules deleted by assigned teachers or admins"
  ON public.modules FOR DELETE
  USING (public.current_user_is_admin() OR public.teacher_can_manage_subject(modules.subject_id));

-- ------------------------------------------------------------
-- 4. course_materials — scoped through the parent module's subject
-- ------------------------------------------------------------
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Course materials viewable by everyone" ON public.course_materials;
DROP POLICY IF EXISTS "Teachers can create materials" ON public.course_materials;
DROP POLICY IF EXISTS "Teachers can update materials" ON public.course_materials;
DROP POLICY IF EXISTS "Teachers can delete materials" ON public.course_materials;

CREATE POLICY "Materials visible by scope"
  ON public.course_materials FOR SELECT
  USING (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = course_materials.module_id
        AND public.teacher_can_manage_subject(m.subject_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = course_materials.module_id
        AND public.current_user_is_student()
        AND public.student_enrolled(m.subject_id)
        AND m.is_published = TRUE
    )
  );

CREATE POLICY "Materials inserted by assigned teachers or admins"
  ON public.course_materials FOR INSERT
  WITH CHECK (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = course_materials.module_id
        AND public.teacher_can_manage_subject(m.subject_id)
    )
  );

CREATE POLICY "Materials updated by assigned teachers or admins"
  ON public.course_materials FOR UPDATE
  USING (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = course_materials.module_id
        AND public.teacher_can_manage_subject(m.subject_id)
    )
  );

CREATE POLICY "Materials deleted by assigned teachers or admins"
  ON public.course_materials FOR DELETE
  USING (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = course_materials.module_id
        AND public.teacher_can_manage_subject(m.subject_id)
    )
  );

-- ------------------------------------------------------------
-- 5. activities — teacher writes scoped to assigned subjects;
--    "global" (subject_id NULL) activities are ADMIN-only
-- ------------------------------------------------------------
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Activities viewable by everyone" ON public.activities;
DROP POLICY IF EXISTS "Teachers can insert activities for their subjects" ON public.activities;
DROP POLICY IF EXISTS "Teachers can update their activities" ON public.activities;
DROP POLICY IF EXISTS "Teachers can delete their activities" ON public.activities;
DROP POLICY IF EXISTS "Teachers can manage own global activities" ON public.activities;

CREATE POLICY "Activities visible by scope"
  ON public.activities FOR SELECT
  USING (
    public.current_user_is_admin()
    OR activities.subject_id IS NULL
    OR public.teacher_can_manage_subject(activities.subject_id)
    OR (public.current_user_is_student() AND public.student_enrolled(activities.subject_id))
  );

CREATE POLICY "Activities inserted by assigned teachers or admins"
  ON public.activities FOR INSERT
  WITH CHECK (
    public.current_user_is_admin()
    OR (public.current_user_is_teacher()
        AND activities.subject_id IS NOT NULL
        AND public.teacher_can_manage_subject(activities.subject_id))
  );

CREATE POLICY "Activities updated by assigned teachers or admins"
  ON public.activities FOR UPDATE
  USING (
    public.current_user_is_admin()
    OR (activities.subject_id IS NOT NULL AND public.teacher_can_manage_subject(activities.subject_id))
  );

CREATE POLICY "Activities deleted by assigned teachers or admins"
  ON public.activities FOR DELETE
  USING (
    public.current_user_is_admin()
    OR (activities.subject_id IS NOT NULL AND public.teacher_can_manage_subject(activities.subject_id))
  );

-- ------------------------------------------------------------
-- 6. announcements — system-wide (subject_id NULL) is admin-only;
--    teachers can only post to assigned subjects
-- ------------------------------------------------------------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Announcements viewable by everyone" ON public.announcements;
DROP POLICY IF EXISTS "Teachers can post announcements" ON public.announcements;
DROP POLICY IF EXISTS "Teachers can update own announcements" ON public.announcements;
DROP POLICY IF EXISTS "Teachers can delete own announcements" ON public.announcements;

CREATE POLICY "Announcements visible by scope"
  ON public.announcements FOR SELECT
  USING (
    public.current_user_is_admin()
    OR announcements.subject_id IS NULL
    OR public.teacher_can_manage_subject(announcements.subject_id)
    OR (public.current_user_is_student() AND public.student_enrolled(announcements.subject_id))
  );

CREATE POLICY "Announcements inserted by admins or assigned teachers"
  ON public.announcements FOR INSERT
  WITH CHECK (
    announcements.created_by = public.current_profile_id()
    AND (
      public.current_user_is_admin()
      OR (public.current_user_is_teacher()
          AND announcements.subject_id IS NOT NULL
          AND public.teacher_can_manage_subject(announcements.subject_id))
    )
  );

CREATE POLICY "Announcements updated by admins or owner teacher"
  ON public.announcements FOR UPDATE
  USING (
    public.current_user_is_admin()
    OR (announcements.created_by = public.current_profile_id()
        AND announcements.subject_id IS NOT NULL
        AND public.teacher_can_manage_subject(announcements.subject_id))
  );

CREATE POLICY "Announcements deleted by admins or owner teacher"
  ON public.announcements FOR DELETE
  USING (
    public.current_user_is_admin()
    OR (announcements.created_by = public.current_profile_id()
        AND announcements.subject_id IS NOT NULL
        AND public.teacher_can_manage_subject(announcements.subject_id))
  );

-- Announcement attachments: only the posting teacher (within an assigned
-- subject) or an admin can manage files.
DROP POLICY IF EXISTS "Teachers can manage attachments" ON public.announcement_attachments;
CREATE POLICY "Attachments managed by owner teacher or admin"
  ON public.announcement_attachments FOR ALL
  USING (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_attachments.announcement_id
        AND a.created_by = public.current_profile_id()
        AND a.subject_id IS NOT NULL
        AND public.teacher_can_manage_subject(a.subject_id)
    )
  );

-- ------------------------------------------------------------
-- 7. class_schedules / meeting_sessions — teachers may create
--    only for subjects assigned to them. Subject-less general
--    classes remain allowed (the virtual waiting room).
-- ------------------------------------------------------------
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can create schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Teachers can update own schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Teachers can delete own schedules" ON public.class_schedules;

CREATE POLICY "Schedules inserted by assigned teachers or admins"
  ON public.class_schedules FOR INSERT
  WITH CHECK (
    class_schedules.created_by = public.current_profile_id()
    AND (
      public.current_user_is_admin()
      OR (public.current_user_is_teacher()
          AND (class_schedules.subject_id IS NULL
               OR public.teacher_can_manage_subject(class_schedules.subject_id)))
    )
  );

CREATE POLICY "Schedules updated by owner teachers or admins"
  ON public.class_schedules FOR UPDATE
  USING (
    public.current_user_is_admin()
    OR (class_schedules.created_by = public.current_profile_id()
        AND (class_schedules.subject_id IS NULL
             OR public.teacher_can_manage_subject(class_schedules.subject_id)))
  );

CREATE POLICY "Schedules deleted by owner teachers or admins"
  ON public.class_schedules FOR DELETE
  USING (
    public.current_user_is_admin()
    OR (class_schedules.created_by = public.current_profile_id()
        AND (class_schedules.subject_id IS NULL
             OR public.teacher_can_manage_subject(class_schedules.subject_id)))
  );

ALTER TABLE public.meeting_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can start sessions" ON public.meeting_sessions;
DROP POLICY IF EXISTS "Teachers can end own sessions" ON public.meeting_sessions;
DROP POLICY IF EXISTS "Teachers can delete own sessions" ON public.meeting_sessions;

CREATE POLICY "Sessions started by assigned teachers or admins"
  ON public.meeting_sessions FOR INSERT
  WITH CHECK (
    meeting_sessions.started_by = public.current_profile_id()
    AND (
      public.current_user_is_admin()
      OR (public.current_user_is_teacher()
          AND (meeting_sessions.subject_id IS NULL
               OR public.teacher_can_manage_subject(meeting_sessions.subject_id)))
    )
  );

CREATE POLICY "Sessions ended by owner teachers or admins"
  ON public.meeting_sessions FOR UPDATE
  USING (
    public.current_user_is_admin()
    OR (meeting_sessions.started_by = public.current_profile_id()
        AND (meeting_sessions.subject_id IS NULL
             OR public.teacher_can_manage_subject(meeting_sessions.subject_id)))
  );

CREATE POLICY "Sessions deleted by owner teachers or admins"
  ON public.meeting_sessions FOR DELETE
  USING (
    public.current_user_is_admin()
    OR (meeting_sessions.started_by = public.current_profile_id()
        AND (meeting_sessions.subject_id IS NULL
             OR public.teacher_can_manage_subject(meeting_sessions.subject_id)))
  );

-- ------------------------------------------------------------
-- 8. register_new_teacher — no longer self-assigns subjects.
--    Teacher accounts are created by the administrator only.
-- ------------------------------------------------------------
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
BEGIN
  -- Only an administrator may provision teacher accounts.
  IF NOT public.current_user_is_admin() THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Teacher accounts are created by the administrator only. Contact your administrator.');
  END IF;

  -- Administrators should use admin_create_teacher (which requires an
  -- existing subject). This legacy function is intentionally inert.
  RETURN jsonb_build_object('success', false,
    'error', 'Use the Administration panel to create teacher accounts.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_new_teacher(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 9. audit_logs — append-only activity log with table triggers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID,
  actor_role TEXT,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := public.current_profile_id();
  v_role TEXT;
  v_details JSONB;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = v_actor LIMIT 1;
  v_details := jsonb_build_object(
    'old', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    'new', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
  );
  INSERT INTO public.audit_logs (actor_id, actor_role, action, table_name, record_id, details)
  VALUES (v_actor, v_role, TG_OP, TG_TABLE_NAME, COALESCE(new.id, old.id)::text, v_details);
  RETURN COALESCE(NEW, OLD);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit() TO authenticated;

DO $$
DECLARE
  t text;
  trigger_name text;
  full_tbl text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'students', 'teachers', 'subjects', 'sections', 'enrollments',
    'teacher_subjects', 'activities', 'modules', 'course_materials',
    'announcements', 'submissions', 'class_schedules', 'meeting_sessions'
  ] LOOP
    full_tbl := 'public.' || t;
    IF to_regclass(full_tbl) IS NOT NULL THEN
      trigger_name := 'trg_audit_' || t;
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trigger_name, full_tbl);
      EXECUTE format(
        $q$
        CREATE TRIGGER %I
          AFTER INSERT OR UPDATE OR DELETE ON %s
          FOR EACH ROW EXECUTE FUNCTION public.log_audit();
        $q$,
        trigger_name, full_tbl
      );
    END IF;
  END LOOP;
END;
$$;