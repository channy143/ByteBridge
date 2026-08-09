-- ============================================================
-- ByteBridge: Teacher Subject Management (Phase 3)
-- Run this in Supabase SQL Editor AFTER supabase_admin_auth.sql.
-- Safe to re-run.
--
--  1. activities.activity_type  — assignment/project/quiz/etc.
--  2. modules.is_published     — teachers can publish/unpublish
--     modules (students only see published ones)
-- ============================================================

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS activity_type VARCHAR(50) DEFAULT 'Assignment';

UPDATE public.activities
   SET activity_type = 'Assignment'
 WHERE activity_type IS NULL;

ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;

UPDATE public.modules
   SET is_published = TRUE
 WHERE is_published IS NULL;
