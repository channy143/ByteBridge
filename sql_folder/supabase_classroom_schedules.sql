-- ============================================================
-- ByteBridge Virtual Classroom: Class Schedules
-- Run this in Supabase SQL Editor AFTER supabase_schema.sql and
-- supabase_feature_policies.sql. Adds:
--   1. class_schedules table (teachers post upcoming class times)
--   2. schedule_id on meeting_sessions (links live sessions to a
--      scheduled class so the Recent Recordings list has subject
--      context)
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Schedules viewable by everyone" ON public.class_schedules;
CREATE POLICY "Schedules viewable by everyone"
  ON public.class_schedules FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Teachers can create schedules" ON public.class_schedules;
CREATE POLICY "Teachers can create schedules"
  ON public.class_schedules FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND p.id = class_schedules.created_by
        AND p.role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "Teachers can update own schedules" ON public.class_schedules;
CREATE POLICY "Teachers can update own schedules"
  ON public.class_schedules FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND p.id = class_schedules.created_by
    )
  );

DROP POLICY IF EXISTS "Teachers can delete own schedules" ON public.class_schedules;
CREATE POLICY "Teachers can delete own schedules"
  ON public.class_schedules FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND p.id = class_schedules.created_by
    )
  );

-- Link live sessions to their scheduled class (for recordings context)
ALTER TABLE public.meeting_sessions
  ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.class_schedules(id) ON DELETE SET NULL;
