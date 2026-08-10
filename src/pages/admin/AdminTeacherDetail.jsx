import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useAdminData, { subjectLabel, sectionName } from './useAdminData';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/admin/Modal';
import ResetPasswordModal from '../../components/admin/ResetPasswordModal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  ArrowLeft, Mail, Hash, KeyRound, ShieldOff, Shield, Pencil, Link2, X, Loader2, UserPlus, BookOpen,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

const inputClass = 'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';

export default function AdminTeacherDetail() {
  const { teacherId } = useParams();
  const { loading, teachers, subjects, assignments, sections, reload } = useAdminData();

  const teacher = teachers.find((t) => t.id === teacherId);

  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const notify = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 5000);
  };

  if (loading || !teacher) {
    return (
      <div>
        <PageHeader title="Teacher Profile" subtitle={loading ? 'Loading…' : 'Teacher not found.'} />
        {!loading && (
          <div className="ws-card">
            <EmptyState
              icon={<BookOpen className="w-8 h-8" />}
              title="Teacher not found"
              description="The teacher record does not exist or has been removed."
              action={<Link to="/admin/teachers" className="ws-btn-secondary"><ArrowLeft className="w-4 h-4" /> Back to Teachers</Link>}
            />
          </div>
        )}
        {loading && (
          <div className="ws-card p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        )}
      </div>
    );
  }

  const teacherAssignments = assignments.filter((a) => a.teacher_id === teacher.id);

  const openEdit = () => {
    setForm({
      full_name: teacher.full_name || '',
      email: teacher.email || '',
      teacher_id: teacher.teacher_id && teacher.teacher_id !== '—' ? teacher.teacher_id : '',
      status: teacher.status || 'Active',
    });
    setEditOpen(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_update_teacher', {
        p_profile_id: teacher.id,
        p_full_name: form.full_name.trim(),
        p_email: form.email.trim(),
        p_teacher_id: form.teacher_id.trim() || teacher.teacher_id || '',
        p_status: form.status,
      });
      if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.error || 'Failed to update teacher.');
      setEditOpen(false);
      notify('Teacher updated.');
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    const next = teacher.status === 'Active' ? 'Inactive' : 'Active';
    if (!window.confirm(`${next === 'Inactive' ? 'Deactivate' : 'Reactivate'} ${teacher.full_name}?`)) return;
    const { data, error: rpcError } = await supabase.rpc('admin_set_teacher_status', {
      p_profile_id: teacher.id,
      p_status: next,
    });
    if (rpcError || !data?.success) {
      notify(rpcError?.message || data?.error || 'Failed to update status.');
      return;
    }
    notify(`${teacher.full_name} is now ${next.toLowerCase()}.`);
    reload();
  };

  const removeAssignment = async (a) => {
    if (!window.confirm(`Remove ${subjectLabel(subjects, a.subject_id)} from ${teacher.full_name}?`)) return;
    const { error } = await supabase
      .from('teacher_subjects')
      .delete()
      .eq('id', a.id);
    if (error) {
      notify(error.message);
      return;
    }
    notify('Assignment removed.');
    reload();
  };

  const active = (teacher.status || 'Active') === 'Active';

  return (
    <div>
      <div className="mb-4">
        <Link to="/admin/teachers" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-primary-700">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Teachers
        </Link>
      </div>

      {message && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-[13px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
          {message}
        </div>
      )}

      <div className="ws-card px-5 py-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Avatar name={teacher.full_name} size={48} />
            <div>
              <h1 className="text-[17px] font-bold text-slate-900">{teacher.full_name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                <span className="text-[12px] text-slate-400 flex items-center gap-1"><Hash className="w-3 h-3" /> {teacher.teacher_id}</span>
                <span className="text-[12px] text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {teacher.email}</span>
                <StatusBadge label={teacher.status} tone={active ? 'green' : 'red'} dot />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openEdit} className="ws-btn-secondary"><Pencil className="w-4 h-4" /> Edit</button>
            <button onClick={() => setResetOpen(true)} className="ws-btn-secondary"><KeyRound className="w-4 h-4" /> Reset Password</button>
            {active ? (
              <button onClick={toggleStatus} className="ws-btn-secondary text-red-600 border-red-200 hover:bg-red-50"><ShieldOff className="w-4 h-4" /> Deactivate</button>
            ) : (
              <button onClick={toggleStatus} className="ws-btn-secondary text-emerald-700 border-emerald-200 hover:bg-emerald-50"><Shield className="w-4 h-4" /> Reactivate</button>
            )}
          </div>
        </div>
      </div>

      <div className="ws-card">
        <div className="ws-card-header">
          <h2 className="ws-section-title flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-slate-400" /> Assigned Subjects</h2>
          <Link to="/admin/assignments" className="ws-btn-secondary">
            <Link2 className="w-4 h-4" /> Assign a Subject
          </Link>
        </div>
        {teacherAssignments.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-8 h-8" />}
            title="No subject assignments"
            description="Assign subjects to this teacher from the Subject Assignments screen."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {teacherAssignments.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{subjectLabel(subjects, a.subject_id)}</p>
                  <p className="text-[11.5px] text-slate-400">
                    {sectionName(sections, a.section_id)} · {(a.academic_year || '—')} · {(a.semester || '—')}
                  </p>
                </div>
                <button
                  onClick={() => removeAssignment(a)}
                  className="p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                  title="Remove assignment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editOpen && form && (
        <Modal open onClose={() => setEditOpen(false)} title={`Edit ${teacher.full_name}`} subtitle="Update the teacher profile, ID, or account status.">
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ws-label">Full Name</label>
                <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="ws-label">Email</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="ws-label">Teacher ID</label>
                <input value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className={inputClass} />
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
              <button type="button" onClick={() => setEditOpen(false)} className="ws-btn-secondary"><X className="w-4 h-4" /> Cancel</button>
              <button type="submit" disabled={saving} className="ws-btn-primary">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><UserPlus className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {resetOpen && (
        <ResetPasswordModal teacher={teacher} onClose={() => setResetOpen(false)} onDone={() => undefined} />
      )}
    </div>
  );
}