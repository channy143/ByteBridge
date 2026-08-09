import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import { User, Mail, BookOpen, Edit2, Save, X, Loader2 } from 'lucide-react';

export default function Profile() {
  const { user, profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    contact_email: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        contact_email: profile.contact_email || '',
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          bio: formData.bio,
          contact_email: formData.contact_email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      setMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  const fieldClass = 'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Manage your account details and information."
        action={!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="ws-btn-secondary">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        ) : null}
      />

      {message && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-[13px] font-medium ${
          message.includes('Error')
            ? 'bg-red-50 text-red-700 border border-red-100'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
        }`}>
          {message}
        </div>
      )}

      <div className="ws-card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-primary-600 to-primary-800 relative">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg flex items-center text-[12.5px] font-medium backdrop-blur-sm transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
            </button>
          )}
        </div>

        <div className="px-6 sm:px-8 pb-8">
          <div className="-mt-10 mb-5 flex items-end gap-4">
            <div className="bg-white p-1 rounded-full border-4 border-slate-100 shadow-sm">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary-50 flex items-center justify-center">
                  <User className="h-9 w-9 text-primary-400" />
                </div>
              )}
            </div>
            <div className="pb-1">
              <h1 className="text-[19px] font-bold text-slate-900 tracking-tight">{profile.full_name}</h1>
              <p className="text-[12.5px] font-medium text-primary-600 capitalize">{profile.role} Account</p>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="ws-label">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className={fieldClass}
                  required
                />
              </div>
              <div>
                <label className="ws-label">Contact Email</label>
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="ws-label">Bio</label>
                <textarea
                  name="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleChange}
                  className={`${fieldClass} resize-none`}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="ws-btn-secondary"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button type="submit" disabled={loading} className="ws-btn-primary">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Changes</>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="ws-subcard">
                <h3 className="text-[12px] font-semibold text-slate-500 flex items-center gap-1.5 mb-3">
                  <Mail className="w-3.5 h-3.5" /> Contact Information
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-[11px] text-slate-400">Account Email</dt>
                    <dd className="text-[13px] text-slate-900">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">Contact Email</dt>
                    <dd className="text-[13px] text-slate-900">{profile.contact_email || 'Not provided'}</dd>
                  </div>
                </dl>
              </div>

              <div className="ws-subcard">
                <h3 className="text-[12px] font-semibold text-slate-500 flex items-center gap-1.5 mb-3">
                  <BookOpen className="w-3.5 h-3.5" /> Academic Info
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-[11px] text-slate-400">{profile.role === 'student' ? 'Student ID' : 'Teacher ID'}</dt>
                    <dd className="text-[13px] text-slate-900 font-medium">Coming soon</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">Enrolled Since</dt>
                    <dd className="text-[13px] text-slate-900">{new Date(profile.created_at).toLocaleDateString()}</dd>
                  </div>
                </dl>
              </div>

              <div className="md:col-span-2 ws-subcard">
                <h3 className="text-[12px] font-semibold text-slate-500 mb-3">Bio</h3>
                {profile.bio ? (
                  <p className="text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
                ) : (
                  <p className="text-[13px] text-slate-400 italic">No bio provided.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
