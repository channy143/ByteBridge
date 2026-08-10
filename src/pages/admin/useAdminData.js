import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';

// One shared loader for the admin screens. Every page pulls the reference
// tables it needs from here so the queries stay in one place.
export default function useAdminData() {
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [teachers, setTeachers] = useState([]); // profiles (role=teacher) + teachers record
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]); // teacher_subjects
  const [enrollments, setEnrollments] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        pRes, tRes, subRes, secRes, stRes, tsRes, enrRes, progRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').eq('role', 'teacher').order('full_name'),
        supabase.from('teachers').select('id, teacher_id, full_name, status'),
        supabase.from('subjects').select('id, subject_code, subject_title, description, program_id, year_level, semester, academic_year, units, status').order('subject_code'),
        supabase.from('sections').select('id, name, program_id, year_level, academic_year, semester, adviser_id, status').order('name'),
        supabase.from('students').select('id, student_id, full_name, birthdate, program, year_level, status'),
        supabase.from('teacher_subjects').select('id, teacher_id, subject_id, section_id, academic_year, semester'),
        supabase.from('enrollments').select('id, student_id, subject_id, section_id, academic_year, semester'),
        supabase.from('programs').select('id, name, code, status').order('name'),
      ]);

      setPrograms(progRes.data || []);
      setSubjects(subRes.data || []);
      setSections(secRes.data || []);
      setStudents(stRes.data || []);
      setAssignments(tsRes.data || []);
      setEnrollments(enrRes.data || []);

      const tMap = new Map((tRes.data || []).map((t) => [t.id, t]));
      setTeachers(
        (pRes.data || []).map((p) => ({
          ...p,
          teacher_id: tMap.get(p.id)?.teacher_id || '—',
          status: tMap.get(p.id)?.status || 'Active',
        }))
      );
    } catch (err) {
      console.error('Admin data load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return {
    loading,
    programs,
    teachers,
    subjects,
    sections,
    students,
    assignments,
    enrollments,
    reload: load,
  };
}

// Utility lookups shared across admin pages.
export const byId = (list) => new Map((list || []).map((x) => [x.id, x]));

export const teacherName = (teachers, id) => {
  const t = (teachers || []).find((x) => x.id === id);
  return t ? t.full_name : '—';
};

export const subjectLabel = (subjects, id) => {
  const s = (subjects || []).find((x) => x.id === id);
  return s ? `${s.subject_code} – ${s.subject_title}` : '—';
};

export const programName = (programs, id) => {
  const p = (programs || []).find((x) => x.id === id);
  return p ? p.name : '—';
};

export const sectionName = (sections, id) => {
  const s = (sections || []).find((x) => x.id === id);
  return s ? s.name : '—';
};