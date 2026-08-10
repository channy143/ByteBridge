import { useMemo, useState } from 'react';
import useAdminData, { programName, teacherName } from './useAdminData';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/admin/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  FolderOpen, Plus, Pencil, Archive, Search, Loader2, X, Users, BookOpen,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

const inputClass = 'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';

function SectionFormModal({ section, programs, teachers, onClose, onSaved }) {
  const isEdit = !!section;
  const [form, setForm] = useState({
    name: section?.name || '',
    program_id: section?.program_id || '',
    year_level: section?.year_level || '',
    academic_year: section?.academic_year || '',
    semester: section?.semester || '',
    adviser_id: section?.adviser_id || '',
    status: section?.status || 'Active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const name = form.name.trim();
    if (!name) {
      setError('Section name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        program_id: form.program_id || null,
        year_level: form.year_level || null,
        academic_year: form.academic_year || null,
        semester: form.semester || null,
        adviser_id: form.adviser_id || null,
        status: form.status,
      };
      if (isEdit) {
        const { error: upError } = await supabase.from('sections').update(payload).eq('id', section.id);
        if (upError) throw upError;
        onSaved('Section updated.');
      } else {
        const { error: insError } = await supabase.from('sections').insert(payload);
        if (insError) throw insError;
        onSaved(`Section ${name} created.`);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save section.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit ${section.name}` : 'Create Section'}
      subtitle="Sections group students under an adviser for an academic term."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="ws-label">Section Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. BTLED 1-A" className={inputClass} />
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
            <label className="ws-label">Academic Year</label>
            <input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="e.g. 2025-2026" className={inputClass} />
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
            <label className="ws-label">Adviser</label>
            <select value={form.adviser_id} onChange={(e) => setForm({ ...form, adviser_id: e.target.value })} className={inputClass}>
              <option value="">No adviser</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
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
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Create Section'}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminSections() {
  const { loading, sections, programs, teachers, enrollments, assignments, reload } = useAdminData();
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modal, setModal] = useState(null);
  const [flash, setFlash] = useState(null);

  const notify = (text, tone = 'ok') => {
    setFlash({ text, tone });
    setTimeout(() => setFlash(null), 5000);
  };

  const withCounts = useMemo(
    () => sections.map((s) => ({
      ...s,
      studentCount: new Set(enrollments.filter((e) => e.section_id === s.id).map((e) => e.student_id)).size,
      subjectCount: new Set(assignments.filter((a) => a.section_id === s.id).map((a) => a.subject_id)).size,
    })),
    [sections, enrollments, assignments]
  );

  const filtered = withCounts.filter((s) => {
    const q = search.trim().toLowerCase();
    if (q && !s.name.toLowerCase().includes(q)) return false;
    if (programFilter !== 'All' && s.program_id !== programFilter) return false;
    if (statusFilter !== 'All' && s.status !== statusFilter) return false;
    return true;
  });

  const handleToggleStatus = async (s) => {
    const next = s.status === 'Active' ? 'Inactive' : 'Active';
    if (!window.confirm(`Set section ${s.name} to ${next}?`)) return;
    const { error } = await supabase.from('sections').update({ status: next }).eq('id', s.id);
    if (error) {
      notify(error.message, 'err');
      return;
    }
    notify(`Section ${s.name} is now ${next.toLowerCase()}.`);
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Sections"
        subtitle="Manage section groupings, advisers, and active status."
        actions={
          <button onClick={() => setModal('create')} className="ws-btn-primary">
            <Plus className="w-4 h-4" /> Create Section
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sections…" className="ws-input w-full pl-9" />
        </div>
        <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="ws-input">
          <option value="All">All programs</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="w-8 h-8" />}
            title="No sections found"
            description="Create a section to start grouping students under advisers."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Program</th>
                  <th>Year</th>
                  <th>Academic Year</th>
                  <th>Semester</th>
                  <th>Adviser</th>
                  <th>Students</th>
                  <th>Subjects</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td className="text-[13px] font-semibold text-slate-800">{s.name}</td>
                    <td className="text-slate-500">{programName(s.program_id)}</td>
                    <td className="text-slate-500">{s.year_level ? `Year ${s.year_level}` : '—'}</td>
                    <td className="text-slate-500">{s.academic_year || '—'}</td>
                    <td className="text-slate-500">{s.semester || '—'}</td>
                    <td className="text-slate-500">{s.adviser_id ? teacherName(teachers, s.adviser_id) : <span className="text-amber-600 text-[11.5px]">No adviser</span>}</td>
                    <td className="text-slate-600"><span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /> {s.studentCount}</span></td>
                    <td className="text-slate-600"><span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-slate-400" /> {s.subjectCount}</span></td>
                    <td>
                      <StatusBadge label={s.status} tone={(s.status || 'Active') === 'Active' ? 'green' : 'red'} dot />
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModal(s)} className="p-1.5 rounded-md text-slate-400 hover:text-primary-700 hover:bg-primary-50" title="Edit section">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleToggleStatus(s)} className="p-1.5 rounded-md text-slate-400 hover:text-amber-700 hover:bg-amber-50" title={s.status === 'Active' ? 'Set inactive' : 'Set active'}>
                          <Archive className="w-3.5 h-3.5" />
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
        <SectionFormModal
          section={modal === 'create' ? null : modal}
          programs={programs}
          teachers={teachers}
          onClose={() => setModal(null)}
          onSaved={(text) => { notify(text); reload(); }}
        />
      )}
    </div>
  );
}