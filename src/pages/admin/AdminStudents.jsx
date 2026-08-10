import { useMemo, useState } from 'react';
import useAdminData, { subjectLabel, sectionName } from './useAdminData';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/admin/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  GraduationCap, UserPlus, Search, Pencil, Trash2, Eye, GraduationCap as EnrollIcon,
  Loader2, X,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

const inputClass = 'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';

function StudentFormModal({ student, onClose, onSaved }) {
  const isEdit = !!student;
  const [form, setForm] = useState({
    full_name: student?.full_name || '',
    student_id: student?.student_id || '',
    birthdate: student?.birthdate || '',
    program: student?.program || 'BTLED - ICT Major',
    year_level: student?.year_level || '1',
    email: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.birthdate) {
      setError('Birthday is required — students sign in with their Student ID and birthday.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const { data, error: rpcError } = await supabase.rpc('admin_update_student', {
          p_id: student.id,
          p_student_id: form.student_id.trim(),
          p_full_name: form.full_name.trim(),
          p_birthdate: form.birthdate,
          p_program: form.program.trim(),
          p_year_level: form.year_level.trim(),
        });
        if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.error || 'Failed to update student.');
        onSaved(`Student ${data.student_id} updated.`);
      } else {
        const { data, error: rpcError } = await supabase.rpc('admin_create_student', {
          p_student_id: form.student_id.trim(),
          p_full_name: form.full_name.trim(),
          p_birthdate: form.birthdate,
          p_email: form.email.trim() || null,
          p_program: form.program.trim(),
          p_year_level: form.year_level.trim(),
        });
        if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.error || 'Failed to create student.');
        onSaved(`Student ${data.student_id} created — signs in with Student ID + birthday.`);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit ${student.full_name}` : 'Add Student'}
      subtitle={isEdit
        ? 'Update the roster record; the sign-in email stays in sync.'
        : 'Creates a full account — the student signs in with their Student ID and birthday.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="ws-label">Full Name</label>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Juan Dela Cruz" className={inputClass} />
          </div>
          <div>
            <label className="ws-label">Student ID</label>
            <input required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} placeholder="e.g. 2024-0001" className={inputClass} />
          </div>
          <div>
            <label className="ws-label">Birthday</label>
            <input required type="date" value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="ws-label">Year Level</label>
            <select value={form.year_level} onChange={(e) => setForm({ ...form, year_level: e.target.value })} className={inputClass}>
              {['1', '2', '3', '4'].map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="ws-label">Program</label>
            <input value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} placeholder="e.g. BTLED - ICT Major" className={inputClass} />
          </div>
          {!isEdit && (
            <div className="sm:col-span-2">
              <label className="ws-label">Sign-in Email <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Auto-derived from the Student ID if blank" className={inputClass} />
              <p className="text-[11px] text-slate-400 mt-1">The email is only the backing auth account; the student still signs in with ID + birthday.</p>
            </div>
          )}
        </div>

        {error && (
          <div className="px-3.5 py-2.5 rounded-lg text-[13px] font-medium bg-red-50 text-red-700 border border-red-100">{error}</div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="ws-btn-secondary"><X className="w-4 h-4" /> Cancel</button>
          <button type="submit" disabled={saving} className="ws-btn-primary">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><UserPlus className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Add Student'}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EnrollModal({ student, subjects, enrollments, onClose, onSaved }) {
  const studentEnrolls = enrollments.filter((e) => e.student_id === student.id);
  const enrolledSet = new Set(studentEnrolls.map((e) => e.subject_id));
  const [sel, setSel] = useState(Object.fromEntries(subjects.map((s) => [s.id, enrolledSet.has(s.id)])));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const toAdd = subjects
        .filter((s) => sel[s.id] && !enrolledSet.has(s.id))
        .map((s) => ({ student_id: student.id, subject_id: s.id }));
      const toRemove = subjects
        .filter((s) => !sel[s.id] && enrolledSet.has(s.id))
        .map((s) => s.id);

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('enrollments')
          .delete()
          .eq('student_id', student.id)
          .in('subject_id', toRemove);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { error } = await supabase.from('enrollments').insert(toAdd);
        if (error) throw error;
      }
      onSaved(`Enrollment updated for ${student.full_name}.`);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to update enrollment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Enroll ${student.full_name}`} subtitle={`${student.student_id} — tick the subjects to enroll them in.`}>
      {subjects.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-slate-400">Create a subject first before enrolling students.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {subjects.map((sub) => (
            <label key={sub.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={!!sel[sub.id]}
                onChange={(e) => setSel((s) => ({ ...s, [sub.id]: e.target.checked }))}
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
        <button type="button" onClick={onClose} className="ws-btn-secondary"><X className="w-4 h-4" /> Cancel</button>
        <button type="button" onClick={save} disabled={saving || subjects.length === 0} className="ws-btn-primary">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><EnrollIcon className="w-4 h-4" /> Save Enrollment</>}
        </button>
      </div>
    </Modal>
  );
}

function DetailModal({ student, subjects, enrollments, onClose, onEdit }) {
  const studentEnrolls = enrollments.filter((e) => e.student_id === student.id);

  return (
    <Modal open onClose={onClose} title="Student Profile" subtitle={student.student_id} size="lg">
      <div className="flex items-center gap-3.5 mb-4">
        <Avatar name={student.full_name} size={44} />
        <div>
          <p className="text-[15px] font-bold text-slate-900">{student.full_name}</p>
          <p className="text-[12px] text-slate-400">
            {student.program || '—'} · Year {student.year_level || '—'}
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge label={student.status} tone={(student.status || 'Active') === 'Active' ? 'green' : 'red'} dot />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <p className="text-[10.5px] uppercase tracking-wide text-slate-400 font-medium">Birthday</p>
          <p className="text-[13px] font-medium text-slate-800 mt-0.5">{student.birthdate || '—'}</p>
        </div>
        <div className="px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <p className="text-[10.5px] uppercase tracking-wide text-slate-400 font-medium">Enrolled Subjects</p>
          <p className="text-[13px] font-medium text-slate-800 mt-0.5">{studentEnrolls.length}</p>
        </div>
      </div>

      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Enrolled Subjects</h3>
      {studentEnrolls.length === 0 ? (
        <p className="text-[12px] text-slate-400 py-2">Not enrolled in any subjects yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {studentEnrolls.map((e) => (
            <span key={e.id} className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {subjectLabel(subjects, e.subject_id)}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
        <button onClick={onClose} className="ws-btn-secondary">Close</button>
        <button onClick={onEdit} className="ws-btn-primary"><Pencil className="w-4 h-4" /> Edit Student</button>
      </div>
    </Modal>
  );
}

export default function AdminStudents() {
  const { loading, students, subjects, enrollments, sections, reload } = useAdminData();

  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [modal, setModal] = useState(null); // null | 'create' | student (edit)
  const [enrollStudent, setEnrollStudent] = useState(null);
  const [detailStudent, setDetailStudent] = useState(null);
  const [flash, setFlash] = useState(null);

  const notify = (text, tone = 'ok') => {
    setFlash({ text, tone });
    setTimeout(() => setFlash(null), 5000);
  };

  const programs = useMemo(() => [...new Set(students.map((s) => s.program).filter(Boolean))].sort(), [students]);

  const filtered = students.filter((s) => {
    const q = search.trim().toLowerCase();
    if (q && !`${s.student_id} ${s.full_name}`.toLowerCase().includes(q)) return false;
    if (programFilter !== 'All' && s.program !== programFilter) return false;
    if (yearFilter !== 'All' && s.year_level !== yearFilter) return false;
    if (statusFilter !== 'All' && s.status !== statusFilter) return false;
    return true;
  });

  const enrolledCount = (id) => enrollments.filter((e) => e.student_id === id).length;

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete student ${s.full_name} (${s.student_id})? This removes their account, enrollments, and submissions.`)) return;
    const { data, error } = await supabase.rpc('admin_delete_student', { p_student_id: s.student_id });
    if (error || !data?.success) {
      notify(error?.message || data?.error || 'Failed to delete student.', 'err');
      return;
    }
    notify(`Student ${s.student_id} deleted.`);
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Student Roster"
        subtitle="Manage student accounts, enrollment, and roster records."
        actions={
          <button onClick={() => setModal('create')} className="ws-btn-primary">
            <UserPlus className="w-4 h-4" /> Add Student
          </button>
        }
      />

      {flash && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-[13px] font-medium border ${
          flash.tone === 'err' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
        }`}>
          {flash.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID or name…" className="ws-input w-full pl-9" />
        </div>
        <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="ws-input">
          <option value="All">All programs</option>
          {programs.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="ws-input">
          <option value="All">All year levels</option>
          {['1', '2', '3', '4'].map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ws-input">
          <option value="All">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div className="ws-card">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-8 h-8" />}
            title="No students found"
            description="Try adjusting the filters, or add a new student to the roster."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Program</th>
                  <th>Year</th>
                  <th>Enrolled</th>
                  <th>Section</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s) => {
                  const sEnrolls = enrollments.filter((e) => e.student_id === s.id);
                  const sectionsHere = [...new Set(sEnrolls.map((e) => e.section_id).filter(Boolean))];
                  return (
                    <tr key={s.id}>
                      <td className="text-[12.5px] font-semibold text-primary-700 whitespace-nowrap">{s.student_id}</td>
                      <td className="text-[12.5px] text-slate-800">{s.full_name}</td>
                      <td className="text-[12.5px] text-slate-500">{s.program || '—'}</td>
                      <td className="text-[12.5px] text-slate-500">{s.year_level ? `Year ${s.year_level}` : '—'}</td>
                      <td className="text-[12.5px] text-slate-600">{enrolledCount(s.id)}</td>
                      <td className="text-[12.5px] text-slate-500">{sectionsHere.map((id) => sectionName(sections, id)).join(', ') || '—'}</td>
                      <td>
                        <StatusBadge label={s.status} tone={(s.status || 'Active') === 'Active' ? 'green' : 'red'} dot />
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setDetailStudent(s)} className="p-1.5 rounded-md text-slate-400 hover:text-primary-700 hover:bg-primary-50" title="View profile">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEnrollStudent(s)} className="p-1.5 rounded-md text-slate-400 hover:text-primary-700 hover:bg-primary-50" title="Manage enrollment">
                            <GraduationCap className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setModal(s)} className="p-1.5 rounded-md text-slate-400 hover:text-primary-700 hover:bg-primary-50" title="Edit student">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(s)} className="p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50" title="Delete student">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <StudentFormModal
          student={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={(text) => { notify(text); reload(); }}
        />
      )}

      {enrollStudent && (
        <EnrollModal
          student={enrollStudent}
          subjects={subjects}
          enrollments={enrollments}
          onClose={() => setEnrollStudent(null)}
          onSaved={(text) => { notify(text); reload(); }}
        />
      )}

      {detailStudent && (
        <DetailModal
          student={detailStudent}
          subjects={subjects}
          enrollments={enrollments}
          onClose={() => setDetailStudent(null)}
          onEdit={() => { const s = detailStudent; setDetailStudent(null); setModal(s); }}
        />
      )}
    </div>
  );
}