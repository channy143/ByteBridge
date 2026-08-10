import { useMemo, useState } from 'react';
import useAdminData from './useAdminData';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/admin/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Layers, Plus, Pencil, Archive, Loader2, X, BookOpen, FolderOpen, GraduationCap,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

const inputClass = 'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';

function ProgramFormModal({ program, onClose, onSaved }) {
  const isEdit = !!program;
  const [form, setForm] = useState({
    name: program?.name || '',
    code: program?.code || '',
    status: program?.status || 'Active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), code: form.code.trim() || null, status: form.status };
      if (isEdit) {
        const { error: upError } = await supabase.from('programs').update(payload).eq('id', program.id);
        if (upError) throw upError;
        onSaved('Program updated.');
      } else {
        const { error: insError } = await supabase.from('programs').insert(payload);
        if (insError) throw insError;
        onSaved(`Program ${form.name.trim()} created.`);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save program.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit ${program.name}` : 'Create Program'}
      subtitle="Programs group subjects and sections into a degree offering."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="ws-label">Program Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bachelor of Technology and Livelihood Education" className={inputClass} />
          </div>
          <div>
            <label className="ws-label">Program Code <span className="text-slate-400 font-normal">(optional)</span></label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. BTLED" className={inputClass} />
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
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Create Program'}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminPrograms() {
  const { loading, programs, subjects, sections, students, reload } = useAdminData();
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [flash, setFlash] = useState(null);

  const notify = (text, tone = 'ok') => {
    setFlash({ text, tone });
    setTimeout(() => setFlash(null), 5000);
  };

  const withCounts = useMemo(
    () => programs.map((p) => ({
      ...p,
      subjectCount: subjects.filter((s) => s.program_id === p.id).length,
      sectionCount: sections.filter((s) => s.program_id === p.id).length,
      studentCount: students.filter((s) => s.program === p.name).length,
    })),
    [programs, subjects, sections, students]
  );

  const filtered = withCounts.filter((p) => {
    const q = search.trim().toLowerCase();
    if (q && !`${p.name} ${p.code || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const handleArchive = async (p) => {
    if (!window.confirm(`Set ${p.name} to ${p.status === 'Active' ? 'Inactive' : 'Active'}?`)) return;
    const { error } = await supabase
      .from('programs')
      .update({ status: p.status === 'Active' ? 'Inactive' : 'Active' })
      .eq('id', p.id);
    if (error) {
      notify(error.message, 'err');
      return;
    }
    notify(`${p.name} is now ${p.status === 'Active' ? 'inactive' : 'active'}.`);
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Programs"
        subtitle="Define the degree offerings that subjects and sections belong to."
        actions={
          <button onClick={() => setModal('create')} className="ws-btn-primary">
            <Plus className="w-4 h-4" /> Create Program
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

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search programs…"
          className="ws-input w-full sm:w-80"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
        ) : filtered.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3 ws-card">
            <EmptyState
              icon={<Layers className="w-8 h-8" />}
              title="No programs found"
              description="Create your first program to start grouping subjects and sections."
            />
          </div>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="ws-card px-4 py-3.5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-slate-900 truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-400">{p.code || '—'}</p>
                </div>
                <StatusBadge label={p.status} tone={(p.status || 'Active') === 'Active' ? 'green' : 'gray'} dot />
              </div>
              <div className="flex items-center gap-3 text-[11.5px] text-slate-500">
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-slate-400" /> {p.subjectCount} subjects</span>
                <span className="flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5 text-slate-400" /> {p.sectionCount} sections</span>
                <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5 text-slate-400" /> {p.studentCount} students</span>
              </div>
              <div className="flex items-center justify-end gap-1 border-t border-slate-100 pt-2.5">
                <button onClick={() => setModal(p)} className="p-1.5 rounded-md text-slate-400 hover:text-primary-700 hover:bg-primary-50" title="Edit program">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleArchive(p)} className="p-1.5 rounded-md text-slate-400 hover:text-amber-700 hover:bg-amber-50" title={p.status === 'Active' ? 'Set inactive' : 'Set active'}>
                  <Archive className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modal && (
        <ProgramFormModal
          program={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={(text) => { notify(text); reload(); }}
        />
      )}
    </div>
  );
}