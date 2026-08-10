-- ByteBridge: Announcements enhancement
-- Run this after supabase_schema.sql to enable:
--   1. A "type" on announcements (General, Course Update, Reminder, Schedule, Material, Important)
--   2. Per-user read/unread tracking so the Announcements feed can mark items as read

-- 1. Announcement type
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'General';

-- 2. Read/unread tracking
CREATE TABLE IF NOT EXISTS announcement_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(announcement_id, user_id)
);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own announcement reads"
  ON public.announcement_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND p.id = announcement_reads.user_id
    )
  );

CREATE POLICY "Users can insert their own announcement reads"
  ON public.announcement_reads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND p.id = announcement_reads.user_id
    )
  );
