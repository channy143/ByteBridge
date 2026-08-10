-- ============================================================
-- ByteBridge Calendar: teacher-chosen event colors
-- Run this in Supabase SQL Editor AFTER supabase_schema.sql and
-- supabase_classroom_schedules.sql. Adds a color column to
-- activities and class_schedules so teachers can assign a custom
-- color to events that is shown on the timetable date cells.
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS color VARCHAR(32);

ALTER TABLE public.class_schedules
  ADD COLUMN IF NOT EXISTS color VARCHAR(32);