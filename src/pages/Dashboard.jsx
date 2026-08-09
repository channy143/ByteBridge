import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import {
  BookOpen,
  ClipboardList,
  CalendarClock,
  Video,
  Megaphone,
  FileText,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { greeting, firstName, timeAgo, formatDue } from '../lib/status';

const STATUS_ORDER = { red: 0, amber: 1, green: 2 };

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [liveSession, setLiveSession] = useState(null);
  const [modules, setModules] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const isTeacher = profile?.role === 'teacher';
        const [subjRes, actRes, annRes, sesRes, modRes, matRes, subRes, tsRes] = await Promise.all([
          supabase.from('subjects').select('id, subject_code, subject_title'),
          supabase
            .from('activities')
            .select('id, title, subject_id, deadline, created_at, submissions (count)')
            .order('deadline', { ascending: true }),
          supabase
            .from('announcements')
            .select('id, title, subject_id, created_at')
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('meeting_sessions')
            .select('id, room_name, started_at')
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1),
          supabase.from('modules').select('id, subject_id, title, created_at, module_progress (*)'),
          supabase
            .from('course_materials')
            .select('id, title, created_at, module:modules (subject_id)')
            .order('created_at', { ascending: false })
            .limit(8),
          isTeacher
            ? Promise.resolve({ data: [], error: null })
            : supabase.from('submissions').select('activity_id, status, grade').eq('student_id', profile?.id),
          isTeacher
            ? supabase.from('teacher_subjects').select('subject_id')
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (!active) return;
        if (!subjRes.error) setSubjects(subjRes.data || []);
        if (!actRes.error) setActivities(actRes.data || []);
        if (!annRes.error) setAnnouncements(annRes.data || []);
        if (!sesRes.error) setLiveSession(sesRes.data?.[0] || null);
        if (!modRes.error) setModules(modRes.data || []);
        if (!matRes.error) setMaterials(matRes.data || []);
        if (!subRes.error) setSubmissions(subRes.data || []);
        if (isTeacher && !tsRes.error) {
          const mine = new Set((tsRes.data || []).map((r) => r.subject_id));
          setActivities((prev) => prev.filter((a) => a.subject_id == null || mine.has(a.subject_id)));
        }
      } catch (err) {
        console.error('Error loading overview:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [profile?.id, profile?.role]);

  const now = Date.now();
  const isTeacher = profile?.role === 'teacher';
  const mySubs = new Map(submissions.map((s) => [s.activity_id, s]));

  const subjectCode = (id) => subjects.find((s) => s.id === id)?.subject_code || 'Global';

  // --- Status helpers -----------------------------------------------------
  const rosterStatus = (a, sub) => {
    if (sub) {
      if (sub.status === 'Graded' && sub.grade != null) return { label: 'Graded', tone: 'green' };
      if (sub.status === 'Lacking') return { label: 'Lacking', tone: 'red' };
      if (sub.status === 'Late') return { label: 'Late', tone: 'amber' };
      return { label: 'Submitted', tone: 'green' };
    }
    const dl = a.deadline && new Date(a.deadline).getTime();
    if (dl && dl < now) return { label: 'Missing', tone: 'red' };
    return { label: 'To Do', tone: 'amber' };
  };

  const isMissing = (a, sub) => {
    const dl = a.deadline && new Date(a.deadline).getTime();
    return !sub && !!dl && dl < now;
  };

  const isDueSoon = (a, sub) => {
    const dl = a.deadline && new Date(a.deadline).getTime();
    return !sub && !!dl && dl >= now && dl - now <= 7 * 86400000;
  };

  const dueIn = (deadline) => {
    const days = Math.ceil((new Date(deadline).getTime() - now) / 86400000);
    if (days <= 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days <= 7) return `Due in ${days} days`;
    return formatDue(deadline, now);
  };

  // --- Derived data -------------------------------------------------------
  const pendingCount = isTeacher
    ? activities.filter((a) => (a.submissions?.[0]?.count ?? 0) < 1).length
    : activities.filter((a) => !mySubs.has(a.id)).length;
  const dueSoonCount = activities.filter((a) => isDueSoon(a, mySubs.get(a.id))).length;
  const missingCount = isTeacher ? 0 : activities.filter((a) => isMissing(a, mySubs.get(a.id))).length;

  const statCells = [
    { label: 'Courses', value: subjects.length, caption: 'Active subjects', icon: BookOpen, tone: 'text-primary-600 bg-primary-50' },
    { label: isTeacher ? 'Awaiting Work' : 'To Do', value: pendingCount, caption: isTeacher ? 'Unsubmitted activities' : 'Requirements remaining', icon: ClipboardList, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Due Soon', value: dueSoonCount, caption: 'Within 7 days', icon: CalendarClock, tone: 'text-red-600 bg-red-50' },
    { label: 'Live Class', value: liveSession ? 'Live' : 'None', caption: liveSession ? 'Class in session' : 'No active class', icon: Video, tone: 'text-emerald-600 bg-emerald-50' },
  ];

  const rosterRows = isTeacher
    ? activities.slice(0, 5).map((a) => ({
        a,
        status: { label: `${a.submissions?.[0]?.count ?? 0} submitted`, tone: a.submissions?.[0]?.count > 0 ? 'green' : 'gray' },
      }))
    : activities
        .map((a) => ({ a, sub: mySubs.get(a.id), status: rosterStatus(a, mySubs.get(a.id)) }))
        .sort((x, y) => {
          const rank = (r) => STATUS_ORDER[r.status.tone] ?? 3;
          const d = (r) => (r.a.deadline ? new Date(r.a.deadline).getTime() : Infinity);
          return rank(x) - rank(y) || d(x) - d(y);
        })
        .slice(0, 5);

  const firstMissing = !isTeacher
    ? rosterRows.find((r) => r.status.tone === 'red')
    : null;

  const upcoming = activities
    .filter((a) => a.deadline && new Date(a.deadline).getTime() >= now)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  const courseProgress = (subjectId) => {
    const courseModules = modules.filter((m) => m.subject_id === subjectId);
    if (courseModules.length === 0) return 0;
    const done = courseModules.filter((m) =>
      m.module_progress?.some((p) => p.student_id === profile?.id && p.completed)
    ).length;
    return Math.round((done / courseModules.length) * 100);
  };

  const courseItemsDone = (subjectId) => {
    const courseModules = modules.filter((m) => m.subject_id === subjectId);
    const done = courseModules.filter((m) =>
      m.module_progress?.some((p) => p.student_id === profile?.id && p.completed)
    ).length;
    return { done, total: courseModules.length };
  };

  const requirementsRemaining = (subjectId) =>
    isTeacher ? 0 : activities.filter((a) => a.subject_id === subjectId && !mySubs.has(a.id)).length;

  // Recent activity: announcements + modules + materials + new activities
  const feed = [
    ...announcements.map((a) => ({
      key: `a${a.id}`,
      icon: Megaphone,
      iconTone: 'text-blue-600 bg-blue-50',
      label: 'New announcement',
      title: a.title,
      subject_id: a.subject_id,
      time: a.created_at,
      to: '/announcements',
    })),
    ...activities.slice(0, 8).map((a) => ({
      key: `act${a.id}`,
      icon: ClipboardList,
      iconTone: 'text-amber-600 bg-amber-50',
      label: 'New activity assigned',
      title: a.title,
      subject_id: a.subject_id,
      time: a.created_at,
      to: '/roster',
    })),
    ...modules.slice(0, 8).map((m) => ({
      key: `mod${m.id}`,
      icon: BookOpen,
      iconTone: 'text-purple-600 bg-purple-50',
      label: 'New module available',
      title: m.title,
      subject_id: m.subject_id,
      time: m.created_at,
      to: '/materials',
    })),
    ...materials.map((mat) => ({
      key: `mat${mat.id}`,
      icon: FileText,
      iconTone: 'text-emerald-600 bg-emerald-50',
      label: 'New material',
      title: mat.title,
      subject_id: mat.module?.subject_id,
      time: mat.created_at,
      to: '/materials',
    })),
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 5);

  const liveName = liveSession?.room_name?.replace(/bytebridge-/i, '').replace(/-\d+$/, '').replace(/-/g, ' ');

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName(profile?.full_name)}`}
        subtitle={isTeacher ? "Here's what's happening with your courses." : "Here's what's happening with your BTLED ICT courses."}
        actions={
          <button onClick={() => navigate('/roster')} className="ws-btn-primary">
            <ClipboardList className="w-4 h-4" /> Quick Action
          </button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {statCells.map((s) => (
          <div key={s.label} className="ws-card px-4 py-3">
            <div className="flex items-center justify-between">
              <span className={`w-8 h-8 rounded-md flex items-center justify-center ${s.tone}`}>
                <s.icon className="w-4 h-4" />
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className="text-[18px] font-bold text-slate-900 leading-tight">{s.value}</p>
            <p className="text-[11px] text-slate-400">{s.caption}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Primary column */}
        <div className="lg:col-span-2 space-y-4 flex flex-col">
          {/* Roster & Dockets */}
          <div className="ws-card">
            <div className="ws-card-header">
              <div>
                <h2 className="ws-section-title">Roster & Dockets</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Your activities, projects, and requirements</p>
              </div>
              <button onClick={() => navigate('/roster')} className="flex items-center gap-1 text-[12.5px] font-medium text-primary-600 hover:text-primary-700">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!isTeacher && firstMissing && (
              <div className="mx-4 mt-3 flex items-start justify-between gap-3 rounded-md bg-red-50 border border-red-100 px-3 py-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-red-800">
                      {missingCount} requirement{missingCount > 1 ? 's are' : ' is'} missing
                    </p>
                    <p className="text-[11.5px] text-red-600 mt-0.5 truncate">
                      {firstMissing.a.title} · {subjectCode(firstMissing.a.subject_id)}
                    </p>
                  </div>
                </div>
                <button onClick={() => navigate('/roster')} className="text-[11.5px] font-semibold text-red-700 hover:text-red-800 whitespace-nowrap flex-shrink-0">
                  View requirement →
                </button>
              </div>
            )}

            {loading ? (
              <div className="text-center py-10 text-[13px] text-slate-400">Loading…</div>
            ) : rosterRows.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="w-7 h-7" />}
                title="You're all caught up"
                description="No requirements need your attention right now."
              />
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="ws-table">
                  <thead>
                    <tr>
                      <th>Activity</th>
                      <th>Subject</th>
                      <th>Deadline</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterRows.map(({ a, status }) => (
                      <tr key={a.id} className="cursor-pointer" onClick={() => navigate('/roster')}>
                        <td className="max-w-[240px]">
                          <p className="font-medium text-slate-800 truncate">{a.title}</p>
                        </td>
                        <td>
                          <span className="text-[12px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                            {subjectCode(a.subject_id)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap text-slate-500">{a.deadline ? formatDue(a.deadline, now) : '—'}</td>
                        <td><StatusBadge {...status} dot /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* My Courses */}
          <div className="ws-card flex-1">
            <div className="ws-card-header">
              <div>
                <h2 className="ws-section-title">My Courses</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Your subjects and learning progress</p>
              </div>
              <button onClick={() => navigate('/materials')} className="flex items-center gap-1 text-[12.5px] font-medium text-primary-600 hover:text-primary-700">
                Open courses <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {subjects.length === 0 ? (
              <EmptyState icon={<BookOpen className="w-7 h-7" />} title="No courses published yet" description="Courses will appear here once published." />
            ) : (
              <div className="divide-y divide-slate-100">
                {subjects.map((s) => {
                  const { done, total } = courseItemsDone(s.id);
                  const pct = courseProgress(s.id);
                  const reqs = requirementsRemaining(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate('/materials')}
                      className="w-full px-4 py-3 hover:bg-slate-50/60 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                          {s.subject_code?.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'CRS'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] font-semibold text-slate-800 truncate">{s.subject_title}</p>
                            <span className="text-[12.5px] font-bold text-slate-900 whitespace-nowrap">{pct}%</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-px rounded flex-shrink-0">{s.subject_code}</span>
                            {!isTeacher && <ProgressBar value={pct} className="flex-1" />}
                          </div>
                          {!isTeacher && (
                            <p className="mt-1.5 text-[11px] text-slate-400">
                              {total > 0 ? `${done} of ${total} learning item${total === 1 ? '' : 's'} completed` : 'No learning items yet'}
                              {reqs > 0 && <span className="text-amber-600 font-medium"> · {reqs} requirement{reqs > 1 ? 's' : ''} remaining</span>}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Secondary column */}
        <div className="space-y-4">
          {/* Upcoming: deadline timeline */}
          <div className="ws-card">
            <div className="ws-card-header">
              <div>
                <h2 className="ws-section-title">Upcoming</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Deadline timeline</p>
              </div>
              <button onClick={() => navigate('/roster')} className="flex items-center gap-1 text-[12.5px] font-medium text-primary-600 hover:text-primary-700">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {loading ? (
              <div className="text-center py-8 text-[13px] text-slate-400">Loading…</div>
            ) : upcoming.length === 0 ? (
              <EmptyState icon={<CalendarClock className="w-7 h-7" />} title="Nothing due soon" description="You're ahead of schedule." />
            ) : (
              <div className="divide-y divide-slate-100">
                {upcoming.map((a) => {
                  const sub = mySubs.get(a.id);
                  const dl = new Date(a.deadline);
                  const dateLabel = dl.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
                  const dot = sub ? 'bg-emerald-500' : isDueSoon(a, sub) ? 'bg-red-500' : 'bg-slate-300';
                  const dueLabel = sub ? 'Submitted' : dueIn(a.deadline);
                  return (
                    <div key={a.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="w-[54px] flex-shrink-0">
                        <p className="text-[11px] font-bold text-slate-500 tracking-wide">{dateLabel}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-medium text-slate-800 truncate">{a.title}</p>
                        <p className="text-[10.5px] text-slate-400">{subjectCode(a.subject_id)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                        <span className={`text-[11px] font-semibold whitespace-nowrap ${sub ? 'text-emerald-600' : isDueSoon(a, sub) ? 'text-red-600' : 'text-slate-500'}`}>
                          {dueLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next Class */}
          <div className="ws-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${liveSession ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <h2 className="ws-section-title">{liveSession ? 'Live Now' : 'Next Class'}</h2>
            </div>
            {liveSession ? (
              <>
                <p className="text-[12.5px] text-slate-600">{liveName || 'Your instructor'} is live now.</p>
                <p className="text-[11px] text-emerald-600 mt-0.5 mb-3">● Your instructor is live</p>
                <button onClick={() => navigate('/classroom')} className="ws-btn-primary w-full justify-center">
                  <Video className="w-4 h-4" /> Join Classroom
                </button>
              </>
            ) : (
              <>
                <p className="text-[12.5px] text-slate-500">No upcoming classes scheduled.</p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Check Classroom for updates.</p>
                <button onClick={() => navigate('/classroom')} className="ws-btn-secondary w-full justify-center">
                  <Video className="w-4 h-4" /> View Classroom
                </button>
              </>
            )}
          </div>

          {/* Recent Activity */}
          <div className="ws-card">
            <div className="ws-card-header">
              <div>
                <h2 className="ws-section-title">Recent Activity</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Announcements, materials &amp; updates</p>
              </div>
              <button onClick={() => navigate('/announcements')} className="flex items-center gap-1 text-[12.5px] font-medium text-primary-600 hover:text-primary-700">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {feed.length === 0 ? (
              <EmptyState icon={<Megaphone className="w-7 h-7" />} title="No recent activity" description="Updates from your instructors will show up here." />
            ) : (
              <div className="divide-y divide-slate-100">
                {feed.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => navigate(f.to)}
                    className="w-full px-4 py-2.5 flex items-start gap-3 text-left hover:bg-slate-50/60 transition-colors"
                  >
                    <span className={`mt-0.5 w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${f.iconTone}`}>
                      <f.icon className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-slate-500">{f.label}</p>
                        <span className="text-[10.5px] text-slate-400 whitespace-nowrap">{timeAgo(f.time)}</span>
                      </div>
                      <p className="text-[12.5px] font-medium text-slate-800 truncate">{f.title}</p>
                      <p className="text-[10.5px] text-slate-400">{subjectCode(f.subject_id)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
