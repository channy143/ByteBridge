import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { greeting, firstName } from '../lib/status';
import {
  BookOpen, ClipboardList, Inbox, Video, FileText, Megaphone,
  Upload, CalendarPlus, Plus, ChevronRight, ShieldCheck,
} from 'lucide-react';

const QUICK_ACTIONS = [
  { key: 'activity', label: 'Create Activity', icon: ClipboardList, to: '/roster' },
  { key: 'module', label: 'Create Module', icon: FileText, to: '/materials' },
  { key: 'announcement', label: 'Post Announcement', icon: Megaphone, to: '/announcements' },
  { key: 'material', label: 'Upload Material', icon: Upload, to: '/materials' },
  { key: 'class', label: 'Schedule Class', icon: CalendarPlus, to: '/classroom' },
];

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [stats, setStats] = useState({ subjects: 0, activities: 0, pendingReviews: 0, upcomingClasses: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data: ts } = await supabase
          .from('teacher_subjects')
          .select('subject_id')
          .eq('teacher_id', profile.id);
        const subjectIds = (ts || []).map((t) => t.subject_id);

        let subs = [];
        if (subjectIds.length > 0) {
          const { data } = await supabase
            .from('subjects')
            .select('id, subject_code, subject_title, description')
            .in('id', subjectIds);
          subs = data || [];
        }

        const counts = { students: {}, modules: {}, activities: {} };
        let pendingReviews = 0;
        let activityIds = [];

        if (subjectIds.length > 0) {
          const { data: enr } = await supabase
            .from('enrollments')
            .select('subject_id')
            .in('subject_id', subjectIds);
          (enr || []).forEach((e) => { counts.students[e.subject_id] = (counts.students[e.subject_id] || 0) + 1; });

          const { data: mods } = await supabase
            .from('modules')
            .select('subject_id')
            .in('subject_id', subjectIds);
          (mods || []).forEach((m) => { counts.modules[m.subject_id] = (counts.modules[m.subject_id] || 0) + 1; });

          const { data: acts } = await supabase
            .from('activities')
            .select('id, subject_id, deadline')
            .in('subject_id', subjectIds);
          activityIds = (acts || []).map((a) => a.id);
          (acts || []).forEach((a) => {
            counts.activities[a.subject_id] = (counts.activities[a.subject_id] || 0) + 1;
          });
        }

        if (activityIds.length > 0) {
          const { data: subms } = await supabase
            .from('submissions')
            .select('id')
            .in('activity_id', activityIds)
            .in('status', ['Submitted', 'Late']);
          pendingReviews = (subms || []).length;
        }

        let upcoming = 0;
        try {
          const { count } = await supabase
            .from('class_schedules')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', profile.id)
            .gte('starts_at', new Date().toISOString());
          upcoming = count || 0;
        } catch {
          upcoming = 0;
        }

        if (cancelled) return;
        setSubjects(
          subs.map((s) => ({
            ...s,
            students: counts.students[s.id] || 0,
            modules: counts.modules[s.id] || 0,
            activities: counts.activities[s.id] || 0,
          }))
        );
        setStats({
          subjects: subs.length,
          activities: activityIds.length,
          pendingReviews,
          upcomingClasses: upcoming,
        });
      } catch (err) {
        console.error('Error loading teacher dashboard:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [profile]);

  const runQuickAction = (action) => {
    if (subjects.length === 0) {
      navigate(action.to);
      return;
    }
    setPendingAction(action);
    setPickerOpen(true);
  };

  const pickSubject = (subjectId) => {
    const action = pendingAction;
    setPickerOpen(false);
    setPendingAction(null);
    navigate(action.to === '/classroom' ? '/classroom' : `${action.to}?subject=${subjectId}`);
  };

  const statCells = [
    { label: 'My Subjects', value: stats.subjects, caption: 'Assigned subjects', icon: BookOpen, tone: 'bg-primary-50 text-primary-700' },
    { label: 'Active Activities', value: stats.activities, caption: 'Activities available to students', icon: ClipboardList, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Pending Reviews', value: stats.pendingReviews, caption: 'Submissions requiring review', icon: Inbox, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Upcoming Classes', value: stats.upcomingClasses, caption: 'Classes scheduled soon', icon: Video, tone: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName(profile?.full_name)}`}
        subtitle="Here's what's happening with your BTLED ICT subjects."
        actions={
          <button
            onClick={() => runQuickAction({ key: 'activity', label: 'Create Activity', icon: ClipboardList, to: '/roster' })}
            className="ws-btn-primary"
          >
            <Plus className="w-4 h-4" /> Quick Action
          </button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ws-card px-4 py-3">
              <Skeleton className="w-8 h-8 rounded-md" />
              <Skeleton className="h-3 w-20 mt-3" />
              <Skeleton className="h-4 w-10 mt-1.5" />
              <Skeleton className="h-3 w-16 mt-1.5" />
            </div>
          ))
        ) : statCells.map((s) => (
          <div key={s.label} className="ws-card px-4 py-3">
            <span className={`w-8 h-8 rounded-md flex items-center justify-center ${s.tone}`}>
              <s.icon className="w-4 h-4" />
            </span>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className="text-[18px] font-bold text-slate-900 leading-tight">{s.value}</p>
            <p className="text-[11px] text-slate-400">{s.caption}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* My Subjects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="ws-card">
            <div className="ws-card-header">
              <h2 className="ws-section-title">My Subjects</h2>
              {subjects.length > 0 && (
                <button
                  onClick={() => navigate('/teacher/subjects')}
                  className="text-[12px] font-medium text-primary-600 hover:text-primary-700"
                >
                  View all
                </button>
              )}
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-5 w-14 rounded flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-1/2 rounded" />
                      <Skeleton className="h-2.5 w-1/3 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12.5px] text-slate-400">
                You are not assigned to any subjects yet. Subjects are assigned by the administrator.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {subjects.map((s) => (
                  <div key={s.id} className="px-4 py-3.5 flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded shrink-0">
                      {s.subject_code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{s.subject_title}</p>
                      <p className="text-[11.5px] text-slate-400 truncate">
                        {s.students} student{s.students === 1 ? '' : 's'} · {s.modules} module{s.modules === 1 ? '' : 's'} · {s.activities} activit{s.activities === 1 ? 'y' : 'ies'}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/teacher/subjects/${s.id}`)}
                      className="text-[12px] font-medium text-primary-600 hover:text-primary-700 whitespace-nowrap"
                    >
                      Open Subject
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="ws-card">
            <div className="ws-card-header">
              <h2 className="ws-section-title">Quick Actions</h2>
            </div>
            <div className="p-3 grid grid-cols-1 gap-1.5">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => runQuickAction(a)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-primary-50/60 transition-colors group"
                >
                  <span className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-700 flex items-center justify-center flex-shrink-0">
                    <a.icon className="w-4 h-4" />
                  </span>
                  <span className="text-[13px] font-medium text-slate-700">{a.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                </button>
              ))}
            </div>
            <p className="px-4 pb-4 text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Content is linked to subjects assigned to you by the administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Subject picker for quick actions */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => { setPickerOpen(false); setPendingAction(null); }} />
          <div className="relative w-full max-w-[420px] bg-white rounded-xl border border-slate-200 shadow-xl p-5">
            <h3 className="text-[15px] font-bold text-slate-900">Choose a subject</h3>
            <p className="text-[12px] text-slate-400 mt-0.5 mb-4">
              {pendingAction?.label} will be linked to one of your assigned subjects.
            </p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickSubject(s.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50/50 text-left transition-colors"
                >
                  <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded shrink-0">
                    {s.subject_code}
                  </span>
                  <span className="text-[13px] font-medium text-slate-700 truncate">{s.subject_title}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { setPickerOpen(false); setPendingAction(null); }}
              className="mt-4 w-full ws-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
