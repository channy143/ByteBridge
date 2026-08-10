import { useMemo, useState } from 'react';
import useAdminData, { subjectLabel, teacherName, sectionName } from './useAdminData';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/admin/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Link2, Plus, Trash2, Loader2, X, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

const inputClass = 'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';

function AssignFormModal({ assignments, teachers, subjects, sections, onClose, onSaved }) {
  const [form, setForm] = useState({
    teacher_id: '',
    subject_id: '',
    section_id: '',
    academic_year: '',
    semester: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedSubject = subjects.find((s) => s.id === form.subject_id);

  // Keep the section list aligned with the chosen subject's program.
  const availableSections = useMemo(
    () => (selectedSubject?.program_id
      ? sections.filter((s) => s.program_id === selectedSubject.program_id)
      : sections),
    [selectedSubject, sections]
  );

  const schoolYears = useMemo(() => {
    const set = new Set([
      ...subjects.map((s) => s.academic_year),
      ...sections.map((s) => s.academic_year),
    ].filter(Boolean));
    return [...set].sort();
  }, [subjects, sections]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.teacher_id || !form.subject_id) {
      setError('Select a teacher and a subject.');
      return;
    }

    // Duplicate: this teacher already teaches this subject+section.
    const dup = assignments.find(
      (a) => a.teacher_id === form.teacher_id
        && a.subject_id === form.subject_id
        && (a.section_id || null) === (form.section_id || null),
    );
    if (dup) {
      setError('This teacher is already assigned to that subject for this section.');
      return;
    }

    // Conflict: another teacher already teaches this subject for this section.
    const conflict = assignments.find(
      (a) => a.subject_id === form.subject_id
        && (a.section_id || null) === (form.section_id || null)
        && a.teacher_id !== form.teacher_id,
    );
    if (conflict) {
      setError(`Another teacher (${teacherName(teachers, conflict.teacher_id)}) already teaches this subject for this section.`);
      return;
    }

    setSaving(true);
    try {
      const { error: insError } = await supabase
        .from('teacher_subjects')
        .insert({
          teacher_id: form.teacher_id,
          subject_id: form.subject_id,
          section_id: form.section_id || null,
          academic_year: form.academic_year || null,
          semester: form.semester || null,
        });
      if (insError) throw insError;
      onSaved('Subject assigned.');
      onClose();
    } catch (err) {
      setError(err.message || 'Assignment failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Assign a Subject"
      subtitle="Link a teacher to a subject — optionally within a section and term."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="ws-label">Teacher</label>
            <select required value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className={inputClass}>
              <option value="">Select a teacher…</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name} ({t.teacher_id})</option>)}
            </select>
          </div>
          <div>
            <label className="ws-label">Subject</label>
            <select required value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className={inputClass}>
              <option value="">Select a subject…</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.subject_code} – {s.subject_title}</option>)}
            </select>
          </div>
          <div>
            <label className="ws-label">Section <span className="text-slate-400 font-normal">(optional)</span></label>
            <select value={form.section_id} onChange={(e) => setForm({ ...form, section_id: e.target.value })} className={inputClass}>
              <option value="">No section</option>
              {availableSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="ws-label">Academic Year</label>
            <select value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} className={inputClass}>
              <option value="">—</option>
              {schoolYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="ws-label">Semester</label>
            <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className={inputClass}>
              <option value="">—</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer">Summer</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="px-3.5 py-2.5 rounded-lg text-[13px] font-medium bg-red-50 text-red-700 border border-red-100 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="ws-btn-secondary"><X className="w-4 h-4" /> Cancel</button>
          <button type="submit" disabled={saving} className="ws-btn-primary">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning…</> : <><Link2 className="w-4 h-4" /> Assign Subject</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminAssignments() {
  const { loading, assignments, teachers, subjects, sections, reload } = useAdminData();

  const [teacherFilter, setTeacherFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [syFilter, setSyFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [assignOpen, setAssignOpen] = useState(false);
  const [flash, setFlash] = useState(null);

  const notify = (text, tone = 'ok') => {
    setFlash({ text, tone });
    setTimeout(() => setFlash(null), 5000);
  };

  const schoolYears = useMemo(() => {
    const set = new Set(assignments.map((a) => a.academic_year).filter(Boolean));
    return [...set].sort();
  }, [assignments]);

  const withNames = assignments.map((a) => ({
    ...a,
    teacherName: teacherName(teachers, a.teacher_id),
    subjectLabel: subjectLabel(subjects, a.subject_id),
    sectionLabel: sectionName(sections, a.section_id),
  }));

  const filtered = withNames.filter((a) => {
    if (teacherFilter !== 'All' && a.teacher_id !== teacherFilter) return false;
    if (subjectFilter !== 'All' && a.subject_id !== subjectFilter) return false;
    if (syFilter !== 'All' && a.academic_year !== syFilter) return false;
    if (semesterFilter !== 'All' && a.semester !== semesterFilter) return false;
    return true;
  });

  const handleRemove = async (a) => {
    if (!window.confirm(`Remove ${a.subjectLabel} from ${a.teacherName}?`)) return;
    const { error } = await supabase.from('teacher_subjects').delete().eq('id', a.id);
    if (error) {
      notify(error.message, 'err');
      return;
    }
    notify('Assignment removed.');
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Subject Assignments"
        subtitle="Link teachers to subjects and sections for each school year and semester."
        actions={
          <button onClick={() => setAssignOpen(true)} className="ws-btn-primary">
            <Plus className="w-4 h-4" /> Assign Subject
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
        <select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} className="ws-input">
          <option value="All">All teachers</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="ws-input">
          <option value="All">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.subject_code}</option>)}
        </select>
        <select value={syFilter} onChange={(e) => setSyFilter(e.target.value)} className="ws-input">
          <option value="All">All school years</option>
          {schoolYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className="ws-input">
          <option value="All">All semesters</option>
          <option value="1st Semester">1st Semester</option>
          <option value="2nd Semester">2nd Semester</option>
          <option value="Summer">Summer</option>
        </select>
      </div>

      <div className="ws-card">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Link2 className="w-8 h-8" />}
            title="No assignments match"
            description="Assign a teacher to a subject to get started, or adjust the filters."
            action={
              <button onClick={() => setAssignOpen(true)} className="ws-btn-primary">
                <Plus className="w-4 h-4" /> Assign Subject
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Subject</th>
                  <th>Section</th>
                  <th>School Year</th>
                  <th>Semester</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="text-slate-800 font-medium">{a.teacherName}</td>
                    <td className="text-slate-800">{a.subjectLabel}</td>
                    <td className="text-slate-500">{a.sectionLabel}</td>
                    <td className="text-slate-500">{a.academic_year || '—'}</td>
                    <td className="text-slate-500">{a.semester || '—'}</td>
                    <td>
                      <div className="flex items-center justify-end">
                        <button onClick={() => handleRemove(a)} className="p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50" title="Remove assignment">
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

      {assignOpen && (
        <AssignFormModal
          assignments={assignments}
          teachers={teachers}
          subjects={subjects}
          sections={sections}
          onClose={() => setAssignOpen(false)}
          onSaved={(text) => notify(text)}
        />
      )}
    </div>
  );
}