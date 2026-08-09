-- ByteBridge: Course material progress
-- Run this after supabase_schema.sql to enable per-item completion inside modules.
-- Students can check off individual learning items (PDFs, videos, links, etc.).
-- The existing module_progress table remains the source of truth for module-level completion.

CREATE TABLE IF NOT EXISTS course_material_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    material_id UUID REFERENCES course_materials(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT TRUE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, material_id)
);

ALTER TABLE course_material_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view all material progress"
  ON public.course_material_progress FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Students can upsert own material progress"
  ON public.course_material_progress FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = course_material_progress.student_id)
  );

CREATE POLICY "Students can update own material progress"
  ON public.course_material_progress FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = course_material_progress.student_id)
  );

CREATE POLICY "Students can delete own material progress"
  ON public.course_material_progress FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid()) AND p.id = course_material_progress.student_id)
  );
