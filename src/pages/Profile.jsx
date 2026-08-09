import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import ProgressBar from '../components/ui/ProgressBar';
import {
  User, Mail, GraduationCap, Edit2, Save, X, Loader2, CheckCircle, Lock, ChevronRight,
} from 'lucide-react';

const PROGRAM = 'BTLED – ICT Major';

const StatCell = ({ value, label, tone }) => {
  const tones = { emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600' };
  return (
    <div className="ws-card px-4 py-3">
      <p className={`text-[20px] font-bold ${tone ? tones[tone] : 'text-slate-900'}`}>{value}</p>
      <p className="text-[11.5px] text-slate-400 mt-0.5">{label}</p>
    </div>
  );
};

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isTeacher = profile?.role === 'teacher';

  const [studentRec, setStudentRec] = useState(null);
  const [teacherRec, setTeacherRec] = useState(null);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({ courses: 0, completed: 0, pending: 0, overdue: 0, modulesDone: 0, modulesTotal: 0, materials: 0, announcements: 0 });
  const [enrolledSince, setEnrolledSince] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', contact_email: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({ full_name: profile.full_name || '', contact_email: profile.contact_email || '' });
    }
    fetchAcademic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const fetchAcademic = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      if (isTeacher) {
        try {
          const { data } = await supabase
            .from('teachers')
            .select('teacher_id')
            .eq('id', profile.id)
            .maybeSingle();
          setTeacherRec(data || null);
        } catch {
          setTeacherRec(null);
        }

        const { data: ts } = await supabase
          .from('teacher_subjects')
          .select('subject_id')
          .eq('teacher_id', profile.id);
        const subjectIds = (ts || []).map((t) => t.subject_id);

        let subjects = [];
        if (subjectIds.length > 0) {
          const { data } = await supabase
            .from('subjects')
            .select('id, subject_code, subject_title')
            .in('id', subjectIds);
          subjects = data || [];
        }

        let mods = [];
        if (subjectIds.length > 0) {
          const { data } = await supabase
            .from('modules')
            .select('id, subject_id, course_materials (id)')
            .in('subject_id', subjectIds);
          mods = data || [];
        }

        let announcements = 0;
        try {
          const { count } = await supabase
            .from('announcements')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', profile.id);
          announcements = count || 0;
        } catch {
          announcements = 0;
        }

        const materials = mods.reduce((n, m) => n + (m.course_materials?.length || 0), 0);
        const withContent = mods.filter((m) => (m.course_materials?.length || 0) > 0).length;

        setCourses(
          subjects.map((s) => {
            const sMods = mods.filter((m) => m.subject_id === s.id);
            const sMats = sMods.reduce((n, m) => n + (m.course_materials?.length || 0), 0);
            return {
              id: s.id,
              code: s.subject_code,
              title: s.subject_title,
              subtitle: `${sMods.length} module${sMods.length === 1 ? '' : 's'} · ${sMats} material${sMats === 1 ? '' : 's'}`,
            };
          })
        );
        setStats({
          courses: subjects.length,
          completed: mods.length,
          pending: materials,
          overdue: announcements,
          modulesDone: withContent,
          modulesTotal: mods.length,
          materials,
          announcements,
        });
      } else {
        try {
          const { data } = await supabase
            .from('students')
            .select('student_id, program, year_level')
            .eq('id', profile.id)
            .maybeSingle();
          setStudentRec(data || null);
        } catch {
          setStudentRec(null);
        }

        const { data: enr } = await supabase
          .from('enrollments')
          .select('subject_id, section_id, enrolled_at')
          .eq('student_id', profile.id);
        const enrollments = enr || [];
        const subjectIds = enrollments.map((e) => e.subject_id);

        let subjects = [];
        if (subjectIds.length > 0) {
          const { data } = await supabase
            .from('subjects')
            .select('id, subject_code, subject_title')
            .in('id', subjectIds);
          subjects = data || [];
        }

        const sectionNames = {};
        const sectionIds = [...new Set(enrollments.map((e) => e.section_id).filter(Boolean))];
        if (sectionIds.length > 0) {
          const { data } = await supabase
            .from('sections')
            .select('id, name')
            .in('id', sectionIds);
          (data || []).forEach((s) => { sectionNames[s.id] = s.name; });
        }

        let mods = [];
        if (subjectIds.length > 0) {
          const { data } = await supabase
            .from('modules')
            .select('id, subject_id, module_progress (student_id, completed)')
            .in('subject_id', subjectIds);
          mods = data || [];
        }

        let subs = [];
        try {
          const { data } = await supabase
            .from('submissions')
            .select('id, activity_id, status')
            .eq('student_id', profile.id);
          subs = data || [];
        } catch {
          subs = [];
        }

        let acts = [];
        if (subjectIds.length > 0) {
          const { data } = await supabase
            .from('activities')
            .select('id, subject_id, deadline')
            .in('subject_id', subjectIds);
          acts = data || [];
        }

        const { data: ts } = await supabase
          .from('teacher_subjects')
          .select('teacher_id, subject_id');
        const teacherIds = [...new Set((ts || []).filter((t) => subjectIds.includes(t.subject_id)).map((t) => t.teacher_id))];
        const teacherNames = {};
        if (teacherIds.length > 0) {
          const { data } = await supabase
            .from('teachers')
            .select('id, full_name')
            .in('id', teacherIds);
          (data || []).forEach((t) => { teacherNames[t.id] = t.full_name; });
        }
        const subjectTeacher = {};
        (ts || []).forEach((t) => {
          if (subjectIds.includes(t.subject_id) && !subjectTeacher[t.subject_id]) {
            subjectTeacher[t.subject_id] = teacherNames[t.teacher_id] || null;
          }
        });

        const now = Date.now();
        const submitted = new Set(subs.map((s) => s.activity_id));
        const completedSubs = subs.filter((s) => ['Submitted', 'Late', 'Graded'].includes(s.status)).length;
        const pending = acts.filter((a) => !submitted.has(a.id) && (!a.deadline || new Date(a.deadline).getTime() > now)).length;
        const overdue = acts.filter((a) => !submitted.has(a.id) && a.deadline && new Date(a.deadline).getTime() <= now).length;

        const doneFor = (ms) => ms.filter((m) => m.module_progress?.some((p) => p.student_id === profile.id && p.completed)).length;

        setCourses(
          enrollments.map((e) => {
            const s = subjects.find((x) => x.id === e.subject_id);
            const ms = mods.filter((m) => m.subject_id === e.subject_id);
            const done = doneFor(ms);
            return {
              id: e.subject_id,
              code: s?.subject_code || '',
              title: s?.subject_title || 'Unknown course',
              teacherName: subjectTeacher[e.subject_id] || 'To be assigned',
              section: sectionNames[e.section_id] || null,
              progress: ms.length ? Math.round((done / ms.length) * 100) : 0,
            };
          })
        );

        let earliest = null;
        enrollments.forEach((e) => {
          if (e.enrolled_at && (!earliest || new Date(e.enrolled_at) < new Date(earliest))) earliest = e.enrolled_at;
        });
        setEnrolledSince(earliest || profile.created_at);

        setStats({
          courses: enrollments.length,
          completed: completedSubs,
          pending,
          overdue,
          modulesDone: doneFor(mods),
          modulesTotal: mods.length,
          materials: 0,
          announcements: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching academic data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          contact_email: formData.contact_email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (error) throw error;

      setMessage('Profile updated successfully!');
      setIsEditing(false);
      await refreshProfile();
      fetchAcademic();
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  const fieldClass = 'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';
  const modulePct = stats.modulesTotal ? Math.round((stats.modulesDone / stats.modulesTotal) * 100) : 0;
  const formatEnrolled = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—');

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Manage your account and academic information."
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
          <div className="-mt-10 mb-5 flex flex-wrap items-end gap-4">
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
              <p className="text-[12.5px] font-medium text-primary-600">
                {isTeacher ? 'BTLED – ICT · Teacher' : `${studentRec?.program || PROGRAM} · Student`}
              </p>
              <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Verified {isTeacher ? 'Teacher' : 'Student'}
              </span>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
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
              <p className="text-[11.5px] text-slate-400">
                Your student ID, program, and section are managed by your school and cannot be edited here.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsEditing(false)} className="ws-btn-secondary">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button type="submit" disabled={saving} className="ws-btn-primary">
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Changes</>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="ws-card p-4">
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
                  <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                    You can update these anytime.
                  </p>
                </div>

                <div className="ws-card p-4">
                  <h3 className="text-[12px] font-semibold text-slate-500 flex items-center gap-1.5 mb-3">
                    <GraduationCap className="w-3.5 h-3.5" /> Academic Information
                  </h3>
                  <dl className="space-y-3">
                    {isTeacher ? (
                      <>
                        <div>
                          <dt className="text-[11px] text-slate-400 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Teacher ID</dt>
                          <dd className="text-[13px] text-slate-900 font-medium">{teacherRec?.teacher_id || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-slate-400 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Program</dt>
                          <dd className="text-[13px] text-slate-900 font-medium">BTLED – ICT</dd>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <dt className="text-[11px] text-slate-400 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Student ID</dt>
                          <dd className="text-[13px] text-slate-900 font-medium">{studentRec?.student_id || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-slate-400 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Program</dt>
                          <dd className="text-[13px] text-slate-900 font-medium">{studentRec?.program || PROGRAM}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-slate-400 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Year Level</dt>
                          <dd className="text-[13px] text-slate-900 font-medium">{studentRec?.year_level || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-slate-400 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Section</dt>
                          <dd className="text-[13px] text-slate-900 font-medium">{courses[0]?.section || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-slate-400 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Enrolled Since</dt>
                          <dd className="text-[13px] text-slate-900 font-medium">{formatEnrolled(enrolledSince)}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                  <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Managed by your school — contact your administrator to update.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="ws-section-title mb-2">{isTeacher ? 'Teaching overview' : 'Academic overview'}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCell value={stats.courses} label="Courses" />
                  <StatCell
                    value={isTeacher ? stats.completed : stats.completed}
                    label={isTeacher ? 'Modules' : 'Completed'}
                    tone={isTeacher ? null : 'emerald'}
                  />
                  <StatCell
                    value={isTeacher ? stats.pending : stats.pending}
                    label={isTeacher ? 'Materials' : 'Pending'}
                    tone={isTeacher ? null : 'amber'}
                  />
                  <StatCell
                    value={isTeacher ? stats.overdue : stats.overdue}
                    label={isTeacher ? 'Announcements' : 'Overdue'}
                    tone={isTeacher ? null : 'red'}
                  />
                </div>
                <div className="ws-card p-4 mt-3">
                  <div className="flex justify-between text-[12px] text-slate-500 mb-1.5">
                    <span className="font-medium">{isTeacher ? 'Content readiness' : 'Overall course progress'}</span>
                    <span>{modulePct}%</span>
                  </div>
                  <ProgressBar value={modulePct} className="w-full" />
                </div>
              </div>

              <div className="mt-6">
                <h2 className="ws-section-title mb-2">{isTeacher ? 'Courses you teach' : 'Enrolled courses'}</h2>
                <div className="ws-card divide-y divide-slate-100">
                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-5 w-5 text-primary-500 animate-spin" />
                    </div>
                  ) : courses.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[12.5px] text-slate-400">
                      {isTeacher ? 'You are not assigned to any courses yet.' : 'You are not enrolled in any courses yet.'}
                    </p>
                  ) : (
                    courses.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => navigate('/materials')}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50/60 transition-colors"
                      >
                        <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded shrink-0">
                          {c.code}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-slate-800 truncate">{c.title}</p>
                          <p className="text-[11.5px] text-slate-400 truncate">
                            {isTeacher ? c.subtitle : `${c.teacherName}${c.section ? ` · ${c.section}` : ''}`}
                          </p>
                        </div>
                        {!isTeacher && (
                          <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">{c.progress}%</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
                {courses.length > 0 && (
                  <button
                    onClick={() => navigate('/materials')}
                    className="mt-2 flex items-center gap-1 text-[12.5px] font-medium text-primary-600 hover:text-primary-700"
                  >
                    View courses
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
