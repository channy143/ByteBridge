import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import {
  User, Mail, GraduationCap, Edit2, Save, X, Loader2, CheckCircle, Lock, ChevronRight,
} from 'lucide-react';

const PROGRAM = 'BTLED – ICT Major';

const StatCell = ({ value, label, tone, dark = false, onClick }) => {
  const tones = { emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600' };
  if (dark) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-left transition-colors ${onClick ? 'cursor-pointer hover:bg-white/20' : 'cursor-default'}`}
      >
        <p className="text-[18px] font-bold text-white leading-none">{value}</p>
        <p className="text-[10.5px] text-primary-100/85 mt-1">{label}</p>
      </button>
    );
  }
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
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', contact_email: '', photo_url: '', student_id: '', program: '', year_level: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        contact_email: profile.contact_email || '',
        photo_url: profile.photo_url || '',
      });
    }
    fetchAcademic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const startEditing = () => {
    setFormData({
      full_name: profile.full_name || '',
      contact_email: profile.contact_email || '',
      photo_url: profile.photo_url || '',
      student_id: profile.student_id || studentRec?.student_id || '',
      program: studentRec?.program || (isTeacher ? 'BTLED – ICT' : PROGRAM),
      year_level: studentRec?.year_level || '',
    });
    setIsEditing(true);
  };

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
      const profilePatch = {
        full_name: formData.full_name,
        contact_email: formData.contact_email,
        photo_url: formData.photo_url || null,
        updated_at: new Date().toISOString(),
      };
      if (!isTeacher) profilePatch.student_id = formData.student_id;

      const { error } = await supabase
        .from('profiles')
        .update(profilePatch)
        .eq('id', profile.id);
      if (error) throw error;

      if (isTeacher) {
        const { error: tErr } = await supabase
          .from('teachers')
          .update({ full_name: formData.full_name })
          .eq('id', profile.id);
        if (tErr) throw tErr;
      } else {
        const { error: sErr } = await supabase
          .from('students')
          .update({
            full_name: formData.full_name,
            student_id: formData.student_id,
            program: formData.program,
            year_level: formData.year_level,
          })
          .eq('id', profile.id);
        if (sErr) throw sErr;
      }

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
        {/* Blue header: identity + compact academic overview */}
        <div className="relative bg-gradient-to-r from-primary-700 to-primary-900 px-5 sm:px-8 pt-6 pb-5">
          {!isEditing && (
            <button
              onClick={startEditing}
              className="absolute top-4 right-4 bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-lg flex items-center text-[12.5px] font-medium backdrop-blur-sm transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
            </button>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-white p-1 rounded-full border-4 border-white/20 shadow-md flex-shrink-0">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="Profile" className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover" />
              ) : (
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-8 w-8 sm:h-9 sm:w-9 text-primary-600" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-[19px] sm:text-[21px] font-bold text-white tracking-tight truncate">{profile.full_name}</h1>
              <p className="text-[12.5px] font-medium text-primary-100/90">
                {isTeacher ? 'BTLED – ICT · Teacher' : `${studentRec?.program || PROGRAM} · Student`}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-emerald-500/90 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Verified {isTeacher ? 'Teacher' : 'Student'}
              </span>
            </div>
          </div>

          {/* Compact stats + progress */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatCell
              dark
              value={stats.courses}
              label="Courses"
              onClick={() => navigate('/materials')}
            />
            <StatCell
              dark
              value={stats.completed}
              label={isTeacher ? 'Modules' : 'Completed'}
              onClick={() => navigate('/materials')}
            />
            <StatCell
              dark
              value={stats.pending}
              label={isTeacher ? 'Materials' : 'Pending'}
              onClick={() => navigate('/roster')}
            />
            <StatCell
              dark
              value={stats.overdue}
              label={isTeacher ? 'Announcements' : 'Overdue'}
              onClick={() => navigate('/roster')}
            />
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-primary-100/90 mb-1.5">
              <span className="font-medium">{isTeacher ? 'Content readiness' : 'Overall course progress'}</span>
              <span className="font-semibold">{modulePct}%</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${modulePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Body: main content + right sidebar */}
        <div className="px-5 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          <div className="min-w-0">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
                <div>
                  <h3 className="text-[12px] font-semibold text-slate-500 flex items-center gap-1.5 mb-3">
                    <User className="w-3.5 h-3.5" /> Profile
                  </h3>
                  <div className="space-y-4">
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
                      <label className="ws-label">Photo URL (optional)</label>
                      <input
                        type="url"
                        name="photo_url"
                        value={formData.photo_url}
                        onChange={handleChange}
                        placeholder="https://…"
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </div>

                {!isTeacher && (
                  <div>
                    <h3 className="text-[12px] font-semibold text-slate-500 flex items-center gap-1.5 mb-3">
                      <GraduationCap className="w-3.5 h-3.5" /> Academic Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="ws-label">Student ID</label>
                        <input
                          type="text"
                          name="student_id"
                          value={formData.student_id}
                          onChange={handleChange}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className="ws-label">Program</label>
                        <input
                          type="text"
                          name="program"
                          value={formData.program}
                          onChange={handleChange}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className="ws-label">Year Level</label>
                        <input
                          type="text"
                          name="year_level"
                          value={formData.year_level}
                          onChange={handleChange}
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="ws-card p-4">
                  <h3 className="text-[12px] font-semibold text-slate-500 flex items-center gap-1.5 mb-3">
                    <Mail className="w-3.5 h-3.5" /> Contact Information
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-[11px] text-slate-400">Account Email</dt>
                      <dd className="text-[13px] text-slate-900 break-all">{user.email}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-slate-400">Contact Email</dt>
                      <dd className="text-[13px] text-slate-900 break-all">{profile.contact_email || 'Not provided'}</dd>
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
                          <dt className="text-[11px] text-slate-400">Program</dt>
                          <dd className="text-[13px] text-slate-900 font-medium">BTLED – ICT</dd>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <dt className="text-[11px] text-slate-400">Student ID</dt>
                          <dd className="text-[13px] text-slate-900 font-medium">{studentRec?.student_id || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-slate-400">Program</dt>
                          <dd className="text-[13px] text-slate-900 font-medium">{studentRec?.program || PROGRAM}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-slate-400">Year Level</dt>
                          <dd className="text-[13px] text-slate-900 font-medium">{studentRec?.year_level || '—'}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                  <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                    Editable — click Edit above to update.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar: courses */}
          <aside className="min-w-0">
            <div className="ws-card overflow-hidden">
              <div className="ws-card-header">
                <h2 className="ws-section-title">{isTeacher ? 'Courses you teach' : 'Enrolled courses'}</h2>
                {courses.length > 0 && (
                  <button
                    onClick={() => navigate('/materials')}
                    className="text-[12px] font-medium text-primary-600 hover:text-primary-700"
                  >
                    View all
                  </button>
                )}
              </div>
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-5 w-14 rounded flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-1/2 rounded" />
                        <Skeleton className="h-2.5 w-1/3 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <p className="px-4 py-6 text-center text-[12.5px] text-slate-400">
                  {isTeacher ? 'You are not assigned to any courses yet.' : 'You are not enrolled in any courses yet.'}
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {courses.map((c) => (
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
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
