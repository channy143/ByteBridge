import { useMemo, useState } from 'react';
import useAdminData, { programName } from './useAdminData';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/admin/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Plus, Search, Pencil, Trash2, Loader2, X, Filter,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

const inputClass = 'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';

function SubjectFormModal({ subject, programs, subjects, onClose, onSaved }) {
  const isEdit = !!subject;
  const [form, setForm] = useState({
    subject_code: subject?.subject_code || '',
    subject_title: subject?.subject_title || '',
    description: subject?.description || '',
    program_id: subject?.program_id || '',
    year_level: subject?.year_level || '',
    semester: subject?.semester || '',
    academic_year: subject?.academic_year || '',
    units: subject?.units ?? 3,
    status: subject?.status || 'Active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const duplicate = subjects.find(
      (s) => s.subject_code.trim().toLowerCase() === form.subject_code.trim().toLowerCase() && s.id !== subject?.id,
    );
    if (duplicate) {
      setError('A subject with this code already exists.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const { error: upError } = await supabase
          .from('subjects')
          .update({
            subject_code: form.subject_code.trim(),
            subject_title: form.subject_title.trim(),
            description: form.description || null,
            program_id: form.program_id || null,
            year_level: form.year_level || null,
            semester: form.semester || null,
            academic_year: form.academic_year || null,
            units: form.units ? Number(form.units) : null,
            status: form.status,
          })
          .eq('id', subject.id);
        if (upError) throw upError;
        onSaved('Subject updated.');
      } else {
        const { error: insError } = await supabase
          .from('subjects')
          .insert({
            subject_code: form.subject_code.trim(),
            subject_title: form.subject_title.trim(),
            description: form.description || null,
            program_id: form.program_id || null,
            year_level: form.year_level || null,
            semester: form.semester || null,
            academic_year: form.academic_year || null,
            units: form.units ? Number(form.units) : null,
            status: form.status,
          });
        if (insError) throw insError;
        onSaved(`Subject ${form.subject_code.trim()} created.`);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save subject.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit ${subject.subject_code}` : 'Create Subject'}
      subtitle="Define the subject and its academic context. Teachers are assigned separately."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="ws-label">Subject Code</label>
            <input required value={form.subject_code} onChange={(e) => setForm({ ...form, subject_code: e.target.value })} placeholder="e.g. ICT 101" className={inputClass} />
          </div>
          <div>
            <label className="ws-label">Subject Title</label>
            <input required value={form.subject_title} onChange={(e) => setForm({ ...form, subject_title: e.target.value })} placeholder="e.g. Introduction to ICT" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="ws-label">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" className={inputClass} />
          </div>
          <div>
            <label className="ws-label">Program</label>
            <select value={form.program_id} onChange={(e) => setForm({ ...form, program_id: e.target.value })} className={inputClass}>
              <option value="">No program</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="ws-label">Year Level</label>
            <select value={form.year_level} onChange={(e) => setForm({ ...form, year_level: e.target.value })} className={inputClass}>
              <option value="">—</option>
              {['1', '2', '3', '4'].map((y) => <option key={y} value={y}>Year {y}</option>)}
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
          <div>
            <label className="ws-label">Academic Year</label>
            <input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="e.g. 2025-2026" className={inputClass} />
          </div>
          <div>
            <label className="ws-label">Units</label>
            <input type="number" min="0" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="ws-label">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="px-3.5 py-2.5 rounded-lg text-[13px] font-medium bg-red-50 text-red-700 border border-red-100">{error}</div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="ws-btn-secondary"><X className="w-4 h-4" /> Cancel</button>
          <button type="submit" disabled={saving} className="ws-btn-primary">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Create Subject'}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminSubjects() {
  const { loading, subjects, programs, assignments, teachers, reload } = useAdminData();

  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [syFilter, setSyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modal, setModal] = useState(null); // null | 'create' | subject (edit)
  const [flash, setFlash] = useState(null);

  const notify = (text, tone = 'ok') => {
    setFlash({ text, tone });
    setTimeout(() => setFlash(null), 5000);
  };

  const schoolYears = useMemo(() => {
    const set = new Set(subjects.map((s) => s.academic_year).filter(Boolean));
    return [...set].sort();
  }, [subjects]);

  const withTeachers = useMemo(
    () => subjects.map((s) => ({
      ...s,
      teacherNames: assignments.filter((a) => a.subject_id === s.id).map((a) => teachers.find((t) => t.id === a.teacher_id)?.full_name).filter(Boolean),
    })),
    [subjects, assignments, teachers]
  );

  const filtered = withTeachers.filter((s) => {
    const q = search.trim().toLowerCase();
    if (q && !`${s.subject_code} ${s.subject_title}`.toLowerCase().includes(q)) return false;
    if (programFilter !== 'All' && s.program_id !== programFilter) return false;
    if (yearFilter !== 'All' && s.year_level !== yearFilter) return false;
    if (semesterFilter !== 'All' && s.semester !== semesterFilter) return false;
    if (syFilter !== 'All' && s.academic_year !== syFilter) return false;
    if (statusFilter !== 'All' && s.status !== statusFilter) return false;
    return true;
  });

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete ${s.subject_code} – ${s.subject_title}? This removes its modules, activities, and assignments.`)) return;
    const { error } = await supabase.from('subjects').delete().eq('id', s.id);
    if (error) {
      notify(error.message, 'err');
      return;
    }
    notify(`Subject ${s.subject_code} deleted.`);
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Subjects"
        subtitle="Manage the subject catalog, academic context, and active status."
        actions={
          <button onClick={() => setModal('create')} className="ws-btn-primary">
            <Plus className="w-4 h-4" /> Create Subject
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject code or title…" className="ws-input w-full pl-9" />
        </div>
        <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="ws-input">
          <option value="All">All programs</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="ws-input">
          <option value="All">All years</option>
          {['1', '2', '3', '4'].map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className="ws-input">
          <option value="All">All semesters</option>
          <option value="1st Semester">1st Semester</option>
          <option value="2nd Semester">2nd Semester</option>
          <option value="Summer">Summer</option>
        </select>
        <select value={syFilter} onChange={(e) => setSyFilter(e.target.value)} className="ws-input">
          <option value="All">All school years</option>
          {schoolYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ws-input lg:col-span-1">
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
            icon={<Filter className="w-8 h-8" />}
            title="No subjects found"
            description="Try adjusting the filters above, or create a new subject."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Program</th>
                  <th>Year / Sem</th>
                  <th>School Year</th>
                  <th>Units</th>
                  <th>Teacher</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <p className="text-[13px] font-semibold text-slate-800">{s.subject_code}</p>
                      <p className="text-[11.5px] text-slate-400 max-w-[220px] truncate">{s.subject_title}</p>
                    </td>
                    <td className="text-slate-500">{programName(s.program_id)}</td>
                    <td className="text-slate-500">{(s.year_level ? `Yr ${s.year_level}` : '—')} · {(s.semester || '—')}</td>
                    <td className="text-slate-500">{s.academic_year || '—'}</td>
                    <td className="text-slate-500">{s.units ?? '—'}</td>
                    <td className="text-slate-500">
                      {s.teacherNames.length > 0 ? (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">{s.teacherNames.join(', ')}</span>
                      ) : (
                        <span className="text-[11.5px] text-amber-600">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge label={s.status} tone={(s.status || 'Active') === 'Active' ? 'green' : 'red'} dot />
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModal(s)} className="p-1.5 rounded-md text-slate-400 hover:text-primary-700 hover:bg-primary-50" title="Edit subject">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(s)} className="p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50" title="Delete subject">
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

      {modal && (
        <SubjectFormModal
          subject={modal === 'create' ? null : modal}
          programs={programs}
          subjects={subjects}
          onClose={() => setModal(null)}
          onSaved={(text) => { notify(text); reload(); }}
        />
      )}
    </div>
  );
}