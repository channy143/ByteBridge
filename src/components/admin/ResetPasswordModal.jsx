import { useState } from 'react';
import { supabase } from '../../services/supabase';
import Modal from './Modal';
import { Loader2 } from 'lucide-react';

const inputClass = 'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';

export default function ResetPasswordModal({ teacher, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_reset_teacher_password', {
        p_profile_id: teacher.id,
        p_new_password: password.trim() || null,
      });
      if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.error || 'Failed to reset password.');
      setResult(`New temporary password: ${data.temp_password}`);
      setPassword('');
      if (onDone) onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Reset Password" subtitle={`Set a new password for ${teacher.full_name}.`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="ws-label">New Password <span className="text-slate-400 font-normal">(blank = auto-generate)</span></label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to generate one"
            className={inputClass}
          />
        </div>
        {result && (
          <div className="px-3.5 py-2.5 rounded-lg text-[13px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
            {result}
          </div>
        )}
        {error && (
          <div className="px-3.5 py-2.5 rounded-lg text-[13px] font-medium bg-red-50 text-red-700 border border-red-100">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="ws-btn-secondary">Close</button>
          <button type="submit" disabled={saving} className="ws-btn-primary">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</> : 'Reset Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}