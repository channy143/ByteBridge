import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAdminData, { subjectLabel } from './useAdminData';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/admin/Modal';
import ResetPasswordModal from '../../components/admin/ResetPasswordModal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Users, UserPlus, Search, Pencil, KeyRound, ShieldOff, Shield, Eye, Loader2, X,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

const inputClass = 'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';

function TeacherFormModal({ teacher, onClose, onSaved }) {
  const isEdit = !!teacher;
  const [form, setForm] = useState({
    full_name: teacher?.full_name || '',
    email: teacher?.email || '',
    teacher_id: teacher?.teacher_id && teacher.teacher_id !== '—' ? teacher.teacher_id : '',
    temp_password: '',
    status: teacher?.status || 'Active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        const { data, error: rpcError } = await supabase.rpc('admin_update_teacher', {
          p_profile_id: teacher.id,
          p_full_name: form.full_name.trim(),
          p_email: form.email.trim(),
          p_teacher_id: form.teacher_id.trim() || teacher.teacher_id || '',
          p_status: form.status,
        });
        if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.error || 'Failed to update teacher.');
        onSaved(`Teacher updated.`);
      } else {
        const { data, error: rpcError } = await supabase.rpc('admin_provision_teacher', {
          p_full_name: form.full_name.trim(),
          p_email: form.email.trim(),
          p_teacher_id: form.teacher_id.trim() || null,
          p_temp_password: form.temp_password.trim() || null,
          p_status: form.status,
        });
        if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.error || 'Failed to create teacher.');
        setForm((f) => ({ ...f, temp_password: '' }));
        setResult(
          `Teacher account created — ID ${data.teacher_id}. ` +
          (data.temp_password ? `Temporary password: ${data.temp_password}` : '')
        );
        onSaved(`Teacher ${data.teacher_id} created.`, data.temp_password);
      }
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
      title={isEdit ? `Edit ${teacher.full_name}` : 'Add Teacher'}
      subtitle={isEdit
        ? 'Update the teacher profile, ID, or account status.'
        : 'Creates a full account. Assign subjects from the Subject Assignments screen.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="ws-label">Full Name</label>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. John Smith" className={inputClass} />
          </div>
          <div>
            <label className="ws-label">Email</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="teacher@bytebridge.edu" className={inputClass} />
          </div>
          <div>
            <label className="ws-label">Teacher ID <span className="text-slate-400 font-normal">(optional)</span></label>
            <input value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} placeholder="Auto-generated if blank" className={inputClass} />
          </div>
          <div>
            <label className="ws-label">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          {!isEdit && (
            <div className="sm:col-span-2">
              <label className="ws-label">Temporary Password <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="text" value={form.temp_password} onChange={(e) => setForm({ ...form, temp_password: e.target.value })} placeholder="Leave blank to auto-generate" className={inputClass} />
              <p className="text-[11px] text-slate-400 mt-1">The teacher signs in with their name + this password.</p>
            </div>
          )}
        </div>

        {result && !isEdit && (
          <div className="px-3.5 py-2.5 rounded-lg text-[13px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 break-words">
            {result}
          </div>
        )}
        {error && (
          <div className="px-3.5 py-2.5 rounded-lg text-[13px] font-medium bg-red-50 text-red-700 border border-red-100">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="ws-btn-secondary"><X className="w-4 h-4" /> Cancel</button>
          <button type="submit" disabled={saving} className="ws-btn-primary">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><UserPlus className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Create Teacher'}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminTeachers() {
  const navigate = useNavigate();
  const { loading, teachers, subjects, assignments, reload } = useAdminData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');

  const [modal, setModal] = useState(null); // null | 'create' | teacher (edit)
  const [resetTeacher, setResetTeacher] = useState(null);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('ok');

  const notify = (text, tone = 'ok') => {
    setMessage(text);
    setMessageTone(tone);
    setTimeout(() => setMessage(''), 5000);
  };

  const teachersWithSubjects = useMemo(
    () => teachers.map((t) => ({
      ...t,
      subjectIds: assignments.filter((a) => a.teacher_id === t.id).map((a) => a.subject_id),
    })),
    [teachers, assignments]
  );

  const filtered = teachersWithSubjects.filter((t) => {
    const q = search.trim().toLowerCase();
    if (q && !`${t.full_name} ${t.teacher_id} ${t.email}`.toLowerCase().includes(q)) return false;
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (subjectFilter !== 'All' && !t.subjectIds.includes(subjectFilter)) return false;
    return true;
  });

  const handleToggleStatus = async (t) => {
    const next = t.status === 'Active' ? 'Inactive' : 'Active';
    if (!window.confirm(`${next === 'Inactive' ? 'Deactivate' : 'Reactivate'} ${t.full_name}? ${next === 'Inactive' ? 'They will no longer be able to sign in.' : 'They will regain access immediately.'}`)) return;
    const { data, error } = await supabase.rpc('admin_set_teacher_status', {
      p_profile_id: t.id,
      p_status: next,
    });
    if (error || !data?.success) {
      notify(error?.message || data?.error || 'Failed to update status.', 'err');
      return;
    }
    notify(`${t.full_name} is now ${next.toLowerCase()}.`);
    reload();
  };

  const handleUnassign = async (teacherId, subjectId) => {
    if (!window.confirm('Remove this subject assignment?')) return;
    const { error } = await supabase
      .from('teacher_subjects')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('subject_id', subjectId);
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
        title="Teachers"
        subtitle="Manage teacher accounts, status, and subject assignments."
        actions={
          <button onClick={() => setModal('create')} className="ws-btn-primary">
            <UserPlus className="w-4 h-4" /> Add Teacher
          </button>
        }
      />

      {message && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-[13px] font-medium border ${
          messageTone === 'err' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
        }`}>
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, or email…"
            className="ws-input w-full pl-9"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ws-input">
          <option value="All">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="ws-input">
          <option value="All">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.subject_code} – {s.subject_title}</option>
          ))}
        </select>
      </div>

      <div className="ws-card">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="No teachers found"
            description="Try adjusting the filters, or add a new teacher account."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Email</th>
                  <th>Assigned Subjects</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link to={`/admin/teachers/${t.id}`} className="group">
                        <p className="text-[13px] font-semibold text-slate-800 group-hover:text-primary-700">{t.full_name}</p>
                        <p className="text-[11px] text-slate-400">{t.teacher_id}</p>
                      </Link>
                    </td>
                    <td className="text-slate-500">{t.email}</td>
                    <td>
                      {t.subjectIds.length === 0 ? (
                        <span className="text-[11.5px] text-slate-400">No subjects yet</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {t.subjectIds.slice(0, 3).map((sid) => (
                            <span key={sid} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {subjectLabel(subjects, sid)}
                              <button type="button" onClick={() => handleUnassign(t.id, sid)} className="text-slate-400 hover:text-red-600" title="Remove assignment">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          {t.subjectIds.length > 3 && (
                            <span className="text-[11px] text-slate-400">+{t.subjectIds.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge
                        label={t.status}
                        tone={(t.status || 'Active') === 'Active' ? 'green' : 'red'}
                        dot
                      />
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/admin/teachers/${t.id}`)} className="p-1.5 rounded-md text-slate-400 hover:text-primary-700 hover:bg-primary-50" title="View profile">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setModal(t)} className="p-1.5 rounded-md text-slate-400 hover:text-primary-700 hover:bg-primary-50" title="Edit teacher">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setResetTeacher(t)} className="p-1.5 rounded-md text-slate-400 hover:text-primary-700 hover:bg-primary-50" title="Reset password">
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(t)}
                          className={`p-1.5 rounded-md ${t.status === 'Active' ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'}`}
                          title={t.status === 'Active' ? 'Deactivate account' : 'Reactivate account'}
                        >
                          {t.status === 'Active' ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
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
        <TeacherFormModal
          teacher={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={(text) => { notify(text); reload(); }}
        />
      )}

      {resetTeacher && (
        <ResetPasswordModal
          teacher={resetTeacher}
          onClose={() => setResetTeacher(null)}
          onDone={() => undefined}
        />
      )}
    </div>
  );
}