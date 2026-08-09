import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import Avatar from '../components/ui/Avatar';
import {
  BookOpen,
  ClipboardList,
  CalendarClock,
  Video,
  Megaphone,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { getActivityStatus, isDueSoon, greeting, firstName, timeAgo, formatDue } from '../lib/status';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [liveSession, setLiveSession] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const isTeacher = profile?.role === 'teacher';
        const [subjRes, actRes, annRes, sesRes, modRes, subRes, tsRes] = await Promise.all([
          supabase.from('subjects').select('id, subject_code, subject_title'),
          supabase
            .from('activities')
            .select('*, teacher:created_by (full_name), submissions (count)')
            .order('deadline', { ascending: true }),
          supabase
            .from('announcements')
            .select('id, title, content, subject_id, is_pinned, is_urgent, created_at, profiles:created_by (full_name)')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('meeting_sessions')
            .select('id, room_name, started_at')
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1),
          supabase.from('modules').select('id, subject_id, module_progress (*)'),
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

  const pendingCount = isTeacher
    ? activities.filter((a) => (a.submissions?.[0]?.count ?? 0) < 1).length
    : activities.filter((a) => !mySubs.has(a.id)).length;
  const dueSoonCount = activities.filter((a) => isDueSoon(a, now)).length;

  const statCells = [
    { label: 'Courses', value: subjects.length, icon: BookOpen, tone: 'text-primary-600 bg-primary-50' },
    { label: isTeacher ? 'Awaiting work' : 'To do', value: pendingCount, icon: ClipboardList, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Due soon', value: dueSoonCount, icon: CalendarClock, tone: 'text-red-600 bg-red-50' },
    { label: 'Live class', value: liveSession ? 'Live' : 'None', icon: Video, tone: 'text-emerald-600 bg-emerald-50' },
  ];

  const courseProgress = (subjectId) => {
    const courseModules = modules.filter((m) => m.subject_id === subjectId);
    if (courseModules.length === 0) return 0;
    const done = courseModules.filter((m) =>
      m.module_progress?.some((p) => p.student_id === profile?.id && p.completed)
    ).length;
    return Math.round((done / courseModules.length) * 100);
  };

  const upcoming = activities
    .filter((a) => a.deadline && new Date(a.deadline).getTime() > now)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  const workRows = (isTeacher ? activities : activities.filter((a) => !mySubs.has(a.id) || mySubs.get(a.id).status !== 'Graded')).slice(0, 6);

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName(profile?.full_name)}`}
        subtitle="Here's what's happening with your courses."
        actions={
          <button onClick={() => navigate('/roster')} className="ws-btn-primary">
            <ClipboardList className="w-4 h-4" /> Quick action
          </button>
        }
      />

      {/* Compact stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {statCells.map((s) => (
          <div key={s.label} className="ws-card flex items-center gap-3 px-4 py-3">
            <span className={`w-8 h-8 rounded-md flex items-center justify-center ${s.tone}`}>
              <s.icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 truncate">{s.label}</p>
              <p className="text-[17px] font-bold text-slate-900 leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Primary column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="ws-card">
            <div className="ws-card-header">
              <h2 className="ws-section-title">Your Work</h2>
              <button onClick={() => navigate('/roster')} className="flex items-center gap-1 text-[12.5px] font-medium text-primary-600 hover:text-primary-700">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {loading ? (
              <div className="text-center py-10 text-[13px] text-slate-400">Loading…</div>
            ) : workRows.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="w-7 h-7" />}
                title="You're all caught up"
                description="No assignments or deadlines require your attention."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="ws-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Course</th>
                      <th>Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workRows.map((a) => {
                      const sub = mySubs.get(a.id);
                      const st = isTeacher
                        ? { label: `${a.submissions?.[0]?.count ?? 0} submitted`, tone: a.submissions?.[0]?.count > 0 ? 'green' : 'gray' }
                        : getActivityStatus(a, sub, now);
                      return (
                        <tr key={a.id} className="cursor-pointer" onClick={() => navigate('/roster')}>
                          <td className="max-w-[260px]">
                            <p className="font-medium text-slate-800 truncate">{a.title}</p>
                          </td>
                          <td>
                            <span className="text-[12px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                              {subjects.find((s) => s.id === a.subject_id)?.subject_code || 'Global'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap text-slate-500">
                            {a.deadline ? formatDue(a.deadline, now) : '—'}
                          </td>
                          <td>
                            <StatusBadge {...st} dot />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* My Courses */}
          <div className="ws-card">
            <div className="ws-card-header">
              <h2 className="ws-section-title">My Courses</h2>
              <button onClick={() => navigate('/materials')} className="flex items-center gap-1 text-[12.5px] font-medium text-primary-600 hover:text-primary-700">
                Open courses <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {subjects.length === 0 ? (
              <EmptyState icon={<BookOpen className="w-7 h-7" />} title="No courses published yet" description="Courses will appear here once published." />
            ) : (
              <div className="divide-y divide-slate-100">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => navigate('/materials')}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50/60 transition-colors text-left"
                  >
                    <span className="w-8 h-8 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                      {s.subject_code?.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'CRS'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{s.subject_title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11.5px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-px rounded">{s.subject_code}</span>
                        {!isTeacher && (
                          <ProgressBar value={courseProgress(s.id)} className="w-24" />
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Secondary column */}
        <div className="space-y-4">
          <div className="ws-card">
            <div className="ws-card-header">
              <h2 className="ws-section-title">Upcoming</h2>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState icon={<CalendarClock className="w-7 h-7" />} title="Nothing due soon" />
            ) : (
              <div className="divide-y divide-slate-100">
                {upcoming.map((a) => (
                  <div key={a.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-slate-800 truncate">{a.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {subjects.find((s) => s.id === a.subject_id)?.subject_code || 'Global'}
                      </p>
                    </div>
                    <span className="text-[11.5px] font-semibold text-amber-600 whitespace-nowrap">
                      {formatDue(a.deadline, now)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live class */}
          <div className="ws-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${liveSession ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <h2 className="ws-section-title">Live Class</h2>
            </div>
            {liveSession ? (
              <>
                <p className="text-[12.5px] text-slate-600 mb-3">
                  {liveSession.room_name.replace(/bytebridge-/i, '').replace(/-\d+$/, '').replace(/-/g, ' ')} is live now.
                </p>
                <button onClick={() => navigate('/classroom')} className="ws-btn-primary w-full justify-center">
                  <Video className="w-4 h-4" /> Join Class
                </button>
              </>
            ) : (
              <p className="text-[12.5px] text-slate-400">No class is live right now.</p>
            )}
          </div>

          {/* Recent updates */}
          <div className="ws-card">
            <div className="ws-card-header">
              <h2 className="ws-section-title">Recent Updates</h2>
              <button onClick={() => navigate('/announcements')} className="flex items-center gap-1 text-[12.5px] font-medium text-primary-600 hover:text-primary-700">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {announcements.length === 0 ? (
              <EmptyState icon={<Megaphone className="w-7 h-7" />} title="No announcements yet" />
            ) : (
              <div className="divide-y divide-slate-100">
                {announcements.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate('/announcements')}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-px rounded">
                        {subjects.find((s) => s.id === a.subject_id)?.subject_code || 'Global'}
                      </span>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(a.created_at)}</span>
                    </div>
                    <p className="mt-1 text-[12.5px] font-medium text-slate-800 line-clamp-1">{a.title}</p>
                    <p className="text-[11.5px] text-slate-500 line-clamp-1">{a.content}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Avatar name={a.profiles?.full_name} size={16} />
                      {a.profiles?.full_name || 'Instructor'}
                    </p>
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
