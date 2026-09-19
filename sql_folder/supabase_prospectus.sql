-- ============================================================
-- ByteBridge: Curriculum Prospectus System
-- Run this in the Supabase SQL Editor.
-- Enhances subjects and enrollments with prospectus metadata
-- and seeds the complete 4-Year BTLED ICT Program Checklist.
-- Safe to re-run.
-- ============================================================

-- 1. Ensure columns exist on subjects
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS year_level VARCHAR(50);
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS semester VARCHAR(50);
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50);
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS units INTEGER DEFAULT 3;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS lec_units INTEGER DEFAULT 3;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS lab_units INTEGER DEFAULT 0;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS prerequisites TEXT DEFAULT 'None';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS co_requisites TEXT DEFAULT 'None';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';

-- 2. Ensure columns exist on enrollments
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS grade NUMERIC(4,2);
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS completion_status VARCHAR(20) DEFAULT 'Enrolled';

-- 3. Ensure the BTLED ICT Program exists
DO $$
DECLARE
  v_prog_id UUID;
BEGIN
  SELECT id INTO v_prog_id FROM public.programs WHERE code = 'BTLED-ICT' OR name ILIKE '%BTLED%' LIMIT 1;
  IF v_prog_id IS NULL THEN
    INSERT INTO public.programs (name, code, status)
    VALUES ('Bachelor of Technology and Livelihood Education - ICT', 'BTLED-ICT', 'Active')
    RETURNING id INTO v_prog_id;
  END IF;

  -- 4. Seed the BTLED ICT 4-Year Curriculum Prospectus
  -- Year 1, 1st Semester
  INSERT INTO public.subjects (program_id, subject_code, subject_title, year_level, semester, units, lec_units, lab_units, prerequisites, order_index)
  VALUES 
    (v_prog_id, 'GE 1', 'Understanding the Self', '1', '1st Semester', 3, 3, 0, 'None', 1),
    (v_prog_id, 'GE 2', 'Readings in Philippine History', '1', '1st Semester', 3, 3, 0, 'None', 2),
    (v_prog_id, 'GE 4', 'Mathematics in the Modern World', '1', '1st Semester', 3, 3, 0, 'None', 3),
    (v_prog_id, 'BTLED 101', 'Introduction to Technology & Livelihood Education', '1', '1st Semester', 3, 3, 0, 'None', 4),
    (v_prog_id, 'ICT 101', 'Fundamentals of Computing & Information Technology', '1', '1st Semester', 3, 2, 1, 'None', 5),
    (v_prog_id, 'PE 1', 'Physical Fitness and Wellness', '1', '1st Semester', 2, 2, 0, 'None', 6),
    (v_prog_id, 'NSTP 1', 'National Service Training Program 1', '1', '1st Semester', 3, 3, 0, 'None', 7)
  ON CONFLICT DO NOTHING;

  -- Year 1, 2nd Semester
  INSERT INTO public.subjects (program_id, subject_code, subject_title, year_level, semester, units, lec_units, lab_units, prerequisites, order_index)
  VALUES 
    (v_prog_id, 'GE 3', 'The Contemporary World', '1', '2nd Semester', 3, 3, 0, 'None', 8),
    (v_prog_id, 'GE 5', 'Purposive Communication', '1', '2nd Semester', 3, 3, 0, 'None', 9),
    (v_prog_id, 'GE 6', 'Art Appreciation', '1', '2nd Semester', 3, 3, 0, 'None', 10),
    (v_prog_id, 'ICT 102', 'Computer Hardware and Software Servicing', '1', '2nd Semester', 3, 2, 1, 'ICT 101', 11),
    (v_prog_id, 'ICT 103', 'Computer Programming 1', '1', '2nd Semester', 3, 2, 1, 'ICT 101', 12),
    (v_prog_id, 'PE 2', 'Rhythmic Activities', '1', '2nd Semester', 2, 2, 0, 'PE 1', 13),
    (v_prog_id, 'NSTP 2', 'National Service Training Program 2', '1', '2nd Semester', 3, 3, 0, 'NSTP 1', 14)
  ON CONFLICT DO NOTHING;

  -- Year 2, 1st Semester
  INSERT INTO public.subjects (program_id, subject_code, subject_title, year_level, semester, units, lec_units, lab_units, prerequisites, order_index)
  VALUES 
    (v_prog_id, 'GE 7', 'Science, Technology, and Society', '2', '1st Semester', 3, 3, 0, 'None', 15),
    (v_prog_id, 'GE 8', 'Ethics', '2', '1st Semester', 3, 3, 0, 'None', 16),
    (v_prog_id, 'ICT 201', 'Data Structures and Algorithms', '2', '1st Semester', 3, 2, 1, 'ICT 103', 17),
    (v_prog_id, 'ICT 202', 'Networking and Communication Technologies', '2', '1st Semester', 3, 2, 1, 'ICT 102', 18),
    (v_prog_id, 'EDUC 101', 'The Child and Adolescent Learners and Learning Principles', '2', '1st Semester', 3, 3, 0, 'None', 19),
    (v_prog_id, 'PE 3', 'Individual and Dual Sports', '2', '1st Semester', 2, 2, 0, 'PE 1', 20)
  ON CONFLICT DO NOTHING;

  -- Year 2, 2nd Semester
  INSERT INTO public.subjects (program_id, subject_code, subject_title, year_level, semester, units, lec_units, lab_units, prerequisites, order_index)
  VALUES 
    (v_prog_id, 'GE 9', 'The Life and Works of Jose Rizal', '2', '2nd Semester', 3, 3, 0, 'None', 21),
    (v_prog_id, 'ICT 203', 'Database Management Systems', '2', '2nd Semester', 3, 2, 1, 'ICT 201', 22),
    (v_prog_id, 'ICT 204', 'Web Systems and Technologies', '2', '2nd Semester', 3, 2, 1, 'ICT 201', 23),
    (v_prog_id, 'EDUC 102', 'The Teaching Profession', '2', '2nd Semester', 3, 3, 0, 'EDUC 101', 24),
    (v_prog_id, 'EDUC 103', 'The Teacher and the School Curriculum', '2', '2nd Semester', 3, 3, 0, 'EDUC 101', 25),
    (v_prog_id, 'PE 4', 'Team Sports', '2', '2nd Semester', 2, 2, 0, 'PE 1', 26)
  ON CONFLICT DO NOTHING;

  -- Year 3, 1st Semester
  INSERT INTO public.subjects (program_id, subject_code, subject_title, year_level, semester, units, lec_units, lab_units, prerequisites, order_index)
  VALUES 
    (v_prog_id, 'ICT 301', 'Systems Analysis and Design', '3', '1st Semester', 3, 2, 1, 'ICT 203', 27),
    (v_prog_id, 'ICT 302', 'Multimedia and Digital Content Development', '3', '1st Semester', 3, 2, 1, 'ICT 204', 28),
    (v_prog_id, 'EDUC 104', 'Assessment of Learning 1', '3', '1st Semester', 3, 3, 0, 'EDUC 103', 29),
    (v_prog_id, 'EDUC 105', 'Facilitating Learner-Centered Teaching', '3', '1st Semester', 3, 3, 0, 'EDUC 101', 30),
    (v_prog_id, 'BTLED 201', 'Technology for Teaching and Learning 1', '3', '1st Semester', 3, 3, 0, 'BTLED 101', 31)
  ON CONFLICT DO NOTHING;

  -- Year 3, 2nd Semester
  INSERT INTO public.subjects (program_id, subject_code, subject_title, year_level, semester, units, lec_units, lab_units, prerequisites, order_index)
  VALUES 
    (v_prog_id, 'ICT 303', 'Information Assurance, Cybersecurity and Ethics', '3', '2nd Semester', 3, 2, 1, 'ICT 202', 32),
    (v_prog_id, 'ICT 304', 'Mobile Application Development', '3', '2nd Semester', 3, 2, 1, 'ICT 204', 33),
    (v_prog_id, 'EDUC 106', 'Assessment of Learning 2', '3', '2nd Semester', 3, 3, 0, 'EDUC 104', 34),
    (v_prog_id, 'EDUC 107', 'Building and Enhancing New Literacies Across Curriculum', '3', '2nd Semester', 3, 3, 0, 'EDUC 105', 35),
    (v_prog_id, 'BTLED 301', 'Technology for Teaching and Learning 2 (ICT)', '3', '2nd Semester', 3, 3, 0, 'BTLED 201', 36)
  ON CONFLICT DO NOTHING;

  -- Year 4, 1st Semester
  INSERT INTO public.subjects (program_id, subject_code, subject_title, year_level, semester, units, lec_units, lab_units, prerequisites, order_index)
  VALUES 
    (v_prog_id, 'ICT 401', 'Undergraduate Thesis & Capstone Project 1', '4', '1st Semester', 3, 3, 0, 'ICT 301', 37),
    (v_prog_id, 'EDUC 108', 'Field Study 1: Observations of Teaching-Learning', '4', '1st Semester', 3, 3, 0, 'EDUC 106, EDUC 107', 38),
    (v_prog_id, 'EDUC 109', 'Field Study 2: Participation & Teaching Assistantship', '4', '1st Semester', 3, 3, 0, 'EDUC 108', 39)
  ON CONFLICT DO NOTHING;

  -- Year 4, 2nd Semester
  INSERT INTO public.subjects (program_id, subject_code, subject_title, year_level, semester, units, lec_units, lab_units, prerequisites, order_index)
  VALUES 
    (v_prog_id, 'ICT 402', 'Undergraduate Thesis & Capstone Project 2', '4', '2nd Semester', 3, 3, 0, 'ICT 401', 40),
    (v_prog_id, 'EDUC 110', 'Teaching Internship (Practice Teaching)', '4', '2nd Semester', 6, 0, 6, 'EDUC 108, EDUC 109', 41)
  ON CONFLICT DO NOTHING;

END $$;
