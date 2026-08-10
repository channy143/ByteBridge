import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Users, BookOpen, UserPlus, Plus, Trash2, ShieldCheck, GraduationCap, X, Loader2, Pencil,
} from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('ok');

  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [teacherForm, setTeacherForm] = useState({ full_name: '', email: '', subject_code: '' });
  const [teacherSaving, setTeacherSaving] = useState(false);

  const [subjectForm, setSubjectForm] = useState({ subject_code: '', subject_title: '', description: '' });
  const [subjectSaving, setSubjectSaving] = useState(false);

  const [assignments, setAssignments] = useState({}); // subjectId -> teacherId

  // Student management
  const [studentModal, setStudentModal] = useState(null); // null | 'create' | student record (edit)
  const [studentForm, setStudentForm] = useState({
    full_name: '', student_id: '', birthdate: '', program: 'BTLED - ICT Major', year_level: '1', email: '',
  });
  const [studentSaving, setStudentSaving] = useState(false);

  // Enrollment management
  const [enrollStudent, setEnrollStudent] = useState(null);
  const [enrollSel, setEnrollSel] = useState({});
  const [enrollSaving, setEnrollSaving] = useState(false);

  const modalShell = 'fixed inset-0 z-50 flex items-center justify-center px-4';
  const modalCard = 'relative w-full bg-white rounded-xl border border-slate-200 shadow-2xl p-5 max-h-[90vh] overflow-y-auto';

  const notify = (text, tone = 'ok') => {
    setMessage(text);
    setMessageTone(tone);
    setTimeout(() => setMessage(''), 5000);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'teacher');
      const teacherIds = (profs || []).map((p) => p.id);

      const teacherRecs = {};
      if (teacherIds.length > 0) {
        const { data: tRecs } = await supabase
          .from('teachers')
          .select('id, teacher_id')
          .in('id', teacherIds);
        (tRecs || []).forEach((t) => { teacherRecs[t.id] = t.teacher_id; });
      }

      const { data: allSubjects } = await supabase
        .from('subjects')
        .select('id, subject_code, subject_title, description')
        .order('subject_code');

      const teacherSubs = {};
      const subjectTeachers = {};
      if (allSubjects?.length && teacherIds.length) {
        const { data: tSubs } = await supabase
          .from('teacher_subjects')
          .select('teacher_id, subject_id')
          .in('teacher_id', teacherIds);
        (tSubs || []).forEach((ts) => {
          if (!teacherSubs[ts.teacher_id]) teacherSubs[ts.teacher_id] = [];
          teacherSubs[ts.teacher_id].push(ts.subject_id);
          if (!subjectTeachers[ts.subject_id]) subjectTeachers[ts.subject_id] = [];
          subjectTeachers[ts.subject_id].push(ts.teacher_id);
        });
      }

      const subjectName = (id) => {
        const s = (allSubjects || []).find((x) => x.id === id);
        return s ? `${s.subject_code} – ${s.subject_title}` : 'Unknown subject';
      };
      const teacherName = (id) => {
        const p = (profs || []).find((x) => x.id === id);
        return p ? p.full_name : 'Unknown teacher';
      };

      setTeachers(
        (profs || []).map((p) => ({
          ...p,
          teacher_id: teacherRecs[p.id] || '—',
          subjects: (teacherSubs[p.id] || []).map(subjectName),
        }))
      );

      setSubjects(
        (allSubjects || []).map((s) => ({
          ...s,
          teachers: (subjectTeachers[s.id] || []).map(teacherName),
        }))
      );

      const { data: roster } = await supabase
        .from('students')
        .select('student_id, full_name, program, year_level');

      const enrollCounts = {};
      if ((roster || []).length > 0) {
        const { data: enr } = await supabase
          .from('enrollments')
          .select('student_id');
        (enr || []).forEach((e) => { enrollCounts[e.student_id] = (enrollCounts[e.student_id] || 0) + 1; });
      }

      setStudents(
        (roster || []).map((s) => ({
          ...s,
          enrolled: enrollCounts[s.id] || 0,
        }))
      );
    } catch (err) {
      console.error('Error loading admin data:', err);
      notify('Failed to load portal data.', 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setTeacherSaving(true);
    try {
      const { data, error } = await supabase.rpc('admin_create_teacher', {
        p_full_name: teacherForm.full_name,
        p_email: teacherForm.email,
        p_subject_code: teacherForm.subject_code,
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed to create teacher.');

      notify(`Teacher account created (${data.teacher_id}). They can sign in with their name + ${teacherForm.subject_code}.`);
      setTeacherForm({ full_name: '', email: '', subject_code: '' });
      loadAll();
    } catch (err) {
      notify(err.message, 'err');
    } finally {
      setTeacherSaving(false);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setSubjectSaving(true);
    try {
      const { error } = await supabase
        .from('subjects')
        .insert({
          subject_code: subjectForm.subject_code,
          subject_title: subjectForm.subject_title,
          description: subjectForm.description || null,
        });
      if (error) throw error;

      notify(`Subject ${subjectForm.subject_code} created.`);
      setSubjectForm({ subject_code: '', subject_title: '', description: '' });
      loadAll();
    } catch (err) {
      notify(err.message || 'Failed to create subject.', 'err');
    } finally {
      setSubjectSaving(false);
    }
  };

  const handleAssign = async (subjectId) => {
    const teacherId = assignments[subjectId];
    if (!teacherId) return;
    try {
      const { error } = await supabase
        .from('teacher_subjects')
        .insert({ teacher_id: teacherId, subject_id: subjectId });
      if (error) throw error;
      notify('Teacher assigned to subject.');
      setAssignments((a) => ({ ...a, [subjectId]: '' }));
      loadAll();
    } catch (err) {
      notify(err.message || 'Assignment failed. Is the teacher already assigned?', 'err');
    }
  };

  const handleUnassign = async (teacherId, subjectId) => {
    try {
      const { error } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('teacher_id', teacherId)
        .eq('subject_id', subjectId);
      if (error) throw error;
      notify('Assignment removed.');
      loadAll();
    } catch (err) {
      notify(err.message || 'Failed to remove assignment.', 'err');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Delete this subject? This removes its modules, activities, and assignments.')) return;
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
      if (error) throw error;
      notify('Subject deleted.');
      loadAll();
    } catch (err) {
      notify(err.message || 'Failed to delete subject.', 'err');
    }
  };

  // --- Student account management ---------------------------------------------

  const openCreateStudent = () => {
    setStudentForm({
      full_name: '', student_id: '', birthdate: '', program: 'BTLED - ICT Major', year_level: '1', email: '',
    });
    setStudentModal('create');
  };

  const openEditStudent = (s) => {
    setStudentForm({
      full_name: s.full_name || '',
      student_id: s.student_id || '',
      birthdate: s.birthdate || '',
      program: s.program || 'BTLED - ICT Major',
      year_level: s.year_level || '1',
      email: '',
    });
    setStudentModal(s);
  };

  const saveStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.birthdate) {
      notify('Birthday is required — students sign in with their Student ID and birthday.', 'err');
      return;
    }
    setStudentSaving(true);
    try {
      if (studentModal === 'create') {
        const { data, error } = await supabase.rpc('admin_create_student', {
          p_student_id: studentForm.student_id.trim(),
          p_full_name: studentForm.full_name.trim(),
          p_birthdate: studentForm.birthdate,
          p_email: studentForm.email.trim(),
          p_program: studentForm.program.trim(),
          p_year_level: studentForm.year_level.trim(),
        });
        if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed to create student.');
        notify(`Student ${data.student_id} created. They can sign in with their Student ID and birthday.`);
      } else {
        const { data, error } = await supabase.rpc('admin_update_student', {
          p_id: studentModal.id,
          p_student_id: studentForm.student_id.trim(),
          p_full_name: studentForm.full_name.trim(),
          p_birthdate: studentForm.birthdate,
          p_program: studentForm.program.trim(),
          p_year_level: studentForm.year_level.trim(),
        });
        if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed to update student.');
        notify(`Student ${data.student_id} updated.`);
      }
      setStudentModal(null);
      loadAll();
    } catch (err) {
      notify(err.message, 'err');
    } finally {
      setStudentSaving(false);
    }
  };

  const handleDeleteStudent = async (s) => {
    if (!window.confirm(`Delete student ${s.full_name} (${s.student_id})? This removes their account, enrollments, and submissions.`)) return;
    try {
      const { data, error } = await supabase.rpc('admin_delete_student', { p_student_id: s.student_id });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed to delete student.');
      notify(`Student ${s.student_id} deleted.`);
      loadAll();
    } catch (err) {
      notify(err.message, 'err');
    }
  };

  // --- Enrollment management --------------------------------------------------

  const openEnroll = async (s) => {
    setEnrollStudent(s);
    const sel = {};
    (subjects || []).forEach((sub) => { sel[sub.id] = false; });
    const { data: enr } = await supabase.from('enrollments').select('subject_id').eq('student_id', s.id);
    (enr || []).forEach((e) => { if (sel[e.subject_id] !== undefined) sel[e.subject_id] = true; });
    setEnrollSel(sel);
  };

  const saveEnroll = async () => {
    setEnrollSaving(true);
    try {
      const current = {};
      const { data: enr } = await supabase
        .from('enrollments')
        .select('subject_id')
        .eq('student_id', enrollStudent.id);
      (enr || []).forEach((e) => { current[e.subject_id] = true; });

      const toAdd = (subjects || [])
        .filter((sub) => enrollSel[sub.id] && !current[sub.id])
        .map((sub) => ({ student_id: enrollStudent.id, subject_id: sub.id }));
      const toRemove = (subjects || [])
        .filter((sub) => !enrollSel[sub.id] && current[sub.id])
        .map((sub) => sub.id);

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('enrollments')
          .delete()
          .eq('student_id', enrollStudent.id)
          .in('subject_id', toRemove);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { error } = await supabase.from('enrollments').insert(toAdd);
        if (error) throw error;
      }
      notify(`Enrollment updated for ${enrollStudent.full_name}.`);
      setEnrollStudent(null);
      loadAll();
    } catch (err) {
      notify(err.message || 'Failed to update enrollment.', 'err');
    } finally {
      setEnrollSaving(false);
    }
  };

  const inputClass = 'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';

  return (
    <div>
      <PageHeader
        title="Administration"
        subtitle="Manage teachers, subjects, assignments, and the student roster."
      />

      {message && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-[13px] font-medium border ${
          messageTone === 'err'
            ? 'bg-red-50 text-red-700 border-red-100'
            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Teachers */}
        <div className="ws-card">
          <div className="ws-card-header">
            <h2 className="ws-section-title flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Teachers</h2>
          </div>

          <form onSubmit={handleCreateTeacher} className="p-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
            <p className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-primary-600" /> Create teacher account
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ws-label">Full Name</label>
                <input required value={teacherForm.full_name} onChange={(e) => setTeacherForm({ ...teacherForm, full_name: e.target.value })} placeholder="e.g. John Smith" className={inputClass} />
              </div>
              <div>
                <label className="ws-label">Email</label>
                <input required type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} placeholder="teacher@bytebridge.edu" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="ws-label">Assigned Subject Code (must exist)</label>
                <input required value={teacherForm.subject_code} onChange={(e) => setTeacherForm({ ...teacherForm, subject_code: e.target.value })} placeholder="e.g. ICT 101" className={inputClass} />
              </div>
            </div>
            <button type="submit" disabled={teacherSaving} className="ws-btn-primary">
              {teacherSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><UserPlus className="w-4 h-4" /> Create Teacher</>}
            </button>
          </form>

          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : teachers.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-slate-400">No teacher accounts yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {teachers.map((t) => (
                <div key={t.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{t.full_name}</p>
                      <p className="text-[11.5px] text-slate-400 truncate">{t.teacher_id} · {t.email}</p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded flex-shrink-0">
                      Teacher
                    </span>
                  </div>
                  {t.subjects.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.subjects.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {s}
                          <button
                            type="button"
                            onClick={() => {
                              const id = subjects.find((x) => `${x.subject_code} – ${x.subject_title}` === s)?.id;
                              if (id) handleUnassign(t.id, id);
                            }}
                            className="text-slate-400 hover:text-red-600"
                            title="Remove assignment"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-slate-400">No subject assignments yet.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subjects */}
        <div className="ws-card">
          <div className="ws-card-header">
            <h2 className="ws-section-title flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Subjects</h2>
          </div>

          <form onSubmit={handleCreateSubject} className="p-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
            <p className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary-600" /> Create subject
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ws-label">Subject Code</label>
                <input required value={subjectForm.subject_code} onChange={(e) => setSubjectForm({ ...subjectForm, subject_code: e.target.value })} placeholder="e.g. ICT 101" className={inputClass} />
              </div>
              <div>
                <label className="ws-label">Subject Title</label>
                <input required value={subjectForm.subject_title} onChange={(e) => setSubjectForm({ ...subjectForm, subject_title: e.target.value })} placeholder="e.g. Introduction to ICT" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="ws-label">Description (optional)</label>
                <input value={subjectForm.description} onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })} placeholder="Short description" className={inputClass} />
              </div>
            </div>
            <button type="submit" disabled={subjectSaving} className="ws-btn-primary">
              {subjectSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Plus className="w-4 h-4" /> Create Subject</>}
            </button>
          </form>

          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : subjects.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-slate-400">No subjects yet. Create one to start.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {subjects.map((s) => (
                <div key={s.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800">
                        {s.subject_code} <span className="font-normal text-slate-500">— {s.subject_title}</span>
                      </p>
                      <p className="text-[11.5px] text-slate-400 mt-0.5">
                        {s.teachers.length > 0 ? `Assigned: ${s.teachers.join(', ')}` : 'No teacher assigned yet.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubject(s.id)}
                      className="p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                      title="Delete subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={assignments[s.id] || ''}
                      onChange={(e) => setAssignments((a) => ({ ...a, [s.id]: e.target.value }))}
                      className="ws-input flex-1 min-w-0"
                    >
                      <option value="">Assign a teacher…</option>
                      {teachers.filter((t) => !s.teachers.includes(t.full_name)).map((t) => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAssign(s.id)}
                      disabled={!assignments[s.id]}
                      className="ws-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Student roster */}
      <div className="ws-card">
        <div className="ws-card-header">
          <h2 className="ws-section-title flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Student Roster</h2>
          <button onClick={openCreateStudent} className="ws-btn-primary">
            <UserPlus className="w-4 h-4" /> Add Student
          </button>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
        ) : students.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12.5px] text-slate-400">No students in the roster.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10.5px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2.5 font-semibold">Student ID</th>
                  <th className="px-4 py-2.5 font-semibold">Full Name</th>
                  <th className="px-4 py-2.5 font-semibold hidden sm:table-cell">Program</th>
                  <th className="px-4 py-2.5 font-semibold hidden md:table-cell">Year Level</th>
                  <th className="px-4 py-2.5 font-semibold">Enrolled Subjects</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-[12.5px] font-semibold text-primary-700 whitespace-nowrap">{s.student_id}</td>
                    <td className="px-4 py-2.5 text-[12.5px] text-slate-800">{s.full_name}</td>
                    <td className="px-4 py-2.5 text-[12.5px] text-slate-500 hidden sm:table-cell">{s.program || '—'}</td>
                    <td className="px-4 py-2.5 text-[12.5px] text-slate-500 hidden md:table-cell">{s.year_level || '—'}</td>
                    <td className="px-4 py-2.5 text-[12.5px] text-slate-600">{s.enrolled}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEnroll(s)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-primary-700 hover:bg-primary-50"
                          title="Manage enrollment"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditStudent(s)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-primary-700 hover:bg-primary-50"
                          title="Edit student"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s)}
                          className="p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50"
                          title="Delete student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STUDENT MODAL */}
      {studentModal && (
        <div className={modalShell}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setStudentModal(null)} />
          <div className={modalCard}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">
                  {studentModal === 'create' ? 'Add Student' : `Edit ${studentModal.full_name || 'Student'}`}
                </h3>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  {studentModal === 'create'
                    ? "Creates a full account — the student signs in with their Student ID and birthday."
                    : 'Updates the roster record and keeps the sign-in email in sync.'}
                </p>
              </div>
              <button onClick={() => setStudentModal(null)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={saveStudent} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ws-label">Full Name</label>
                  <input required value={studentForm.full_name} onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })} placeholder="e.g. Juan Dela Cruz" className={inputClass} />
                </div>
                <div>
                  <label className="ws-label">Student ID</label>
                  <input required value={studentForm.student_id} onChange={(e) => setStudentForm({ ...studentForm, student_id: e.target.value })} placeholder="e.g. 2024-0001" className={inputClass} />
                </div>
                <div>
                  <label className="ws-label">Birthday</label>
                  <input required type="date" value={studentForm.birthdate} onChange={(e) => setStudentForm({ ...studentForm, birthdate: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="ws-label">Year Level</label>
                  <select value={studentForm.year_level} onChange={(e) => setStudentForm({ ...studentForm, year_level: e.target.value })} className={inputClass}>
                    {['1', '2', '3', '4'].map((y) => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="ws-label">Program</label>
                  <input value={studentForm.program} onChange={(e) => setStudentForm({ ...studentForm, program: e.target.value })} placeholder="e.g. BTLED - ICT Major" className={inputClass} />
                </div>
                {studentModal === 'create' && (
                  <div className="sm:col-span-2">
                    <label className="ws-label">Sign-in Email <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input type="email" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} placeholder="Auto-derived from the Student ID if blank" className={inputClass} />
                    <p className="text-[11px] text-slate-400 mt-1">
                      The student uses their Student ID + birthday to sign in; the email is only the backing auth account.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setStudentModal(null)} className="ws-btn-secondary">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button type="submit" disabled={studentSaving} className="ws-btn-primary">
                  {studentSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><UserPlus className="w-4 h-4" /> {studentModal === 'create' ? 'Add Student' : 'Save Changes'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENROLLMENT MODAL */}
      {enrollStudent && (
        <div className={modalShell}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setEnrollStudent(null)} />
          <div className={modalCard}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">Enroll {enrollStudent.full_name}</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">{enrollStudent.student_id} — tick the subjects to enroll them in.</p>
              </div>
              <button onClick={() => setEnrollStudent(null)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {subjects.length === 0 ? (
              <p className="py-6 text-center text-[12.5px] text-slate-400">Create a subject first before enrolling students.</p>
            ) : (
              <div className="mt-4 space-y-1.5 max-h-72 overflow-y-auto">
                {subjects.map((sub) => (
                  <label
                    key={sub.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50/40 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={!!enrollSel[sub.id]}
                      onChange={(e) => setEnrollSel((sel) => ({ ...sel, [sub.id]: e.target.checked }))}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-slate-800 truncate">{sub.subject_code}</p>
                      <p className="text-[11.5px] text-slate-400 truncate">{sub.subject_title}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-4">
              <button type="button" onClick={() => setEnrollStudent(null)} className="ws-btn-secondary">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button type="button" onClick={saveEnroll} disabled={enrollSaving || subjects.length === 0} className="ws-btn-primary">
                {enrollSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><GraduationCap className="w-4 h-4" /> Save Enrollment</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] text-slate-400 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> Teachers can only create content inside subjects assigned to them. Only administrators can create subjects and manage assignments.
      </p>
    </div>
  );
}
