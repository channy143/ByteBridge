import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import Drawer from '../components/ui/Drawer';
import { Skeleton, SkeletonText } from '../components/ui/Skeleton';
import {
  Search,
  Plus,
  Users,
  ChevronRight,
  Send,
  X,
  ClipboardList,
  FileText,
  Link2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { formatDue, formatTimeLeft } from '../lib/status';

const STUDENT_STATUSES = ['all', 'todo', 'submitted', 'passed', 'missing'];
const TEACHER_STATUSES = ['all', 'nosubs', 'submitted'];
const DEADLINE_FILTERS = [
  { value: 'all', label: 'All deadlines' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'Due this week' },
  { value: 'nextweek', label: 'Due next week' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'none', label: 'No deadline' },
];

export default function RosterAndDockets() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchParams] = useSearchParams();
  const [courseFilter, setCourseFilter] = useState(() => searchParams.get('subject') || 'all');
  const [deadlineFilter, setDeadlineFilter] = useState('all');

  const [selected, setSelected] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [submitContent, setSubmitContent] = useState('');
  const [submitLink, setSubmitLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [drawerSubs, setDrawerSubs] = useState([]);
  const [drawerSubsLoading, setDrawerSubsLoading] = useState(false);
  const [gradeDraft, setGradeDraft] = useState({});

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', deadline: '', points: 100, subject_id: '' });
  const [creating, setCreating] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [registeredStudents, setRegisteredStudents] = useState([]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const isTeacher = profile?.role === 'teacher';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [actRes, subjRes] = await Promise.all([
        supabase
          .from('activities')
          .select('*, teacher:created_by (full_name), submissions (count)')
          .order('deadline', { ascending: true }),
        supabase.from('subjects').select('id, subject_code, subject_title'),
      ]);
      if (actRes.error) throw actRes.error;
      if (subjRes.error) throw subjRes.error;
      setActivities(actRes.data || []);
      setSubjects(subjRes.data || []);

      if (isTeacher) {
        const tsRes = await supabase.from('teacher_subjects').select('subject_id, subjects (subject_code, subject_title)');
        if (!tsRes.error) {
          setAssignedSubjects(
            (tsRes.data || [])
              .map((r) => ({ id: r.subject_id, code: r.subjects?.subject_code, title: r.subjects?.subject_title }))
              .filter((s) => s.code)
          );
        }
        setDrawerSubs([]);
      } else {
        const subRes = await supabase.from('submissions').select('*').eq('student_id', profile?.id);
        if (subRes.error) throw subRes.error;
        setSubmissions(subRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, isTeacher]);

  useEffect(() => {
    if (profile) fetchData();
  }, [fetchData, profile]);

  const getSubmission = (activityId) => submissions.find((s) => s.activity_id === activityId);

  // --- Status helpers -----------------------------------------------------
  const rosterStatus = (a, sub) => {
    if (sub) {
      if (sub.status === 'Graded' && sub.grade != null) return { label: 'Passed', tone: 'green' };
      if (sub.status === 'Lacking') return { label: 'Lacking', tone: 'red' };
      if (sub.status === 'Late') return { label: 'Late', tone: 'amber' };
      return { label: 'Submitted', tone: 'green' };
    }
    const dl = a.deadline && new Date(a.deadline).getTime();
    if (dl && dl < now) return { label: 'Missing', tone: 'red' };
    return { label: 'To Do', tone: 'amber' };
  };

  const isDueSoon7 = (a) => {
    const dl = a.deadline && new Date(a.deadline).getTime();
    return !!dl && dl >= now && dl - now <= 7 * 86400000;
  };

  const deadlineNote = (a, sub) => {
    if (sub) return null;
    if (!a.deadline) return null;
    const days = Math.ceil((new Date(a.deadline).getTime() - now) / 86400000);
    if (days < 0) return { text: 'Missing', tone: 'text-red-600' };
    if (days === 0) return { text: 'Due today', tone: 'text-red-600' };
    if (days === 1) return { text: 'Due tomorrow', tone: 'text-amber-600' };
    if (days <= 7) return { text: `${days} days left`, tone: 'text-amber-600' };
    return { text: `${days} days left`, tone: 'text-slate-400' };
  };

  const matchesDeadline = (a) => {
    const dl = a.deadline && new Date(a.deadline).getTime();
    if (deadlineFilter === 'none') return !a.deadline;
    if (!dl) return false;
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const t = startToday.getTime();
    const day = 86400000;
    if (deadlineFilter === 'today') return dl >= t && dl < t + day;
    if (deadlineFilter === 'week') return dl >= t && dl < t + 7 * day;
    if (deadlineFilter === 'nextweek') return dl >= t + 7 * day && dl < t + 14 * day;
    if (deadlineFilter === 'overdue') return dl < now;
    return true;
  };

  // --- Overview counts ----------------------------------------------------
  const withStatus = activities.map((a) => ({ a, sub: getSubmission(a.id), status: rosterStatus(a, getSubmission(a.id)) }));
  const counts = isTeacher
    ? {
        all: activities.length,
        nosubs: activities.filter((a) => (a.submissions?.[0]?.count ?? 0) < 1).length,
        submitted: activities.filter((a) => (a.submissions?.[0]?.count ?? 0) > 0).length,
      }
    : {
        all: withStatus.length,
        todo: withStatus.filter((r) => r.status.label === 'To Do').length,
        duesoon: withStatus.filter((r) => r.status.label === 'To Do' && isDueSoon7(r.a)).length,
        missing: withStatus.filter((r) => r.status.label === 'Missing').length,
        passed: withStatus.filter((r) => r.status.label === 'Passed').length,
      };
  const missingCount = isTeacher ? 0 : counts.missing;

  const CHIPS = isTeacher
    ? [
        { key: 'all', label: 'Total' },
        { key: 'nosubs', label: 'No submissions' },
        { key: 'submitted', label: 'Submitted' },
      ]
    : [
        { key: 'all', label: 'Total' },
        { key: 'todo', label: 'To Do' },
        { key: 'duesoon', label: 'Due Soon' },
        { key: 'missing', label: 'Missing' },
        { key: 'passed', label: 'Passed' },
      ];

  const filteredActivities = activities.filter((a) => {
    if (courseFilter !== 'all' && a.subject_id !== courseFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !(a.description || '').toLowerCase().includes(q)) return false;
    }
    if (!matchesDeadline(a)) return false;
    if (statusFilter !== 'all') {
      if (isTeacher) {
        const count = a.submissions?.[0]?.count ?? 0;
        if (statusFilter === 'nosubs' && count >= 1) return false;
        if (statusFilter === 'submitted' && count < 1) return false;
      } else {
        const st = rosterStatus(a, getSubmission(a.id)).label.toLowerCase();
        if (statusFilter === 'duesoon') {
          if (st !== 'to do' || !isDueSoon7(a)) return false;
        } else if (st !== statusFilter) {
          return false;
        }
      }
    }
    return true;
  });

  const statusOptions = isTeacher ? TEACHER_STATUSES : STUDENT_STATUSES;
  const statusLabel = (v) =>
    v === 'all' ? 'All statuses'
    : v === 'nosubs' ? 'No submissions'
    : v === 'duesoon' ? 'Due soon'
    : v.charAt(0).toUpperCase() + v.slice(1);

  // --- Actions ------------------------------------------------------------
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { error } = await supabase.from('activities').insert([{
        subject_id: form.subject_id || null,
        section_id: null,
        title: form.title.trim(),
        description: form.description.trim(),
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        points: parseInt(form.points, 10) || 100,
        created_by: profile.id,
      }]);
      if (error) throw error;
      setForm({ title: '', description: '', deadline: '', points: 100, subject_id: '' });
      setShowCreate(false);
      fetchData();
    } catch (err) {
      console.error('Error creating activity:', err);
      alert('Failed to create activity. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const openActivity = async (activity) => {
    setSelected(activity);
    setSubmitContent('');
    setSubmitLink('');
    setAttachments([]);
    try {
      const attRes = await supabase.from('activity_attachments').select('*').eq('activity_id', activity.id);
      if (!attRes.error) setAttachments(attRes.data || []);
    } catch (err) {
      console.error('Error loading attachments:', err);
    }
    if (!isTeacher) return;
    setDrawerSubsLoading(true);
    setDrawerSubs([]);
    setGradeDraft({});
    try {
      const { data, error } = await supabase.from('submissions').select('*').eq('activity_id', activity.id);
      if (error) throw error;
      const rows = data || [];
      if (rows.length > 0) {
        const ids = rows.map((s) => s.student_id);
        const { data: profs } = await supabase.from('profiles').select('id, full_name, student_id').in('id', ids);
        const map = Object.fromEntries((profs || []).map((p) => [p.id, p]));
        setDrawerSubs(rows.map((s) => ({ ...s, student: map[s.student_id] })));
      } else {
        setDrawerSubs([]);
      }
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setDrawerSubsLoading(false);
    }
  };

  const handleSubmitActivity = async () => {
    if (!selected || (!submitContent.trim() && !submitLink.trim())) return;
    setSubmitting(true);
    try {
      const isLate = selected.deadline && new Date(selected.deadline) < new Date();
      const { error } = await supabase.from('submissions').insert([{
        activity_id: selected.id,
        student_id: profile.id,
        content: submitContent.trim() || null,
        file_url: submitLink.trim() || null,
        status: isLate ? 'Late' : 'Submitted',
      }]);
      if (error) throw error;
      setSubmitContent('');
      setSubmitLink('');
      await fetchData();
      setSelected((prev) => ({ ...prev }));
      openActivity(selected);
    } catch (err) {
      console.error('Error submitting:', err);
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrade = async (sub) => {
    const draft = gradeDraft[sub.id] || {};
    const grade = draft.grade !== undefined && draft.grade !== '' ? parseInt(draft.grade, 10) : sub.grade;
    if (grade === undefined || grade === '' || isNaN(grade)) return;
    const { error } = await supabase
      .from('submissions')
      .update({ grade, feedback: draft.feedback ?? sub.feedback ?? null, status: 'Graded' })
      .eq('id', sub.id);
    if (error) {
      console.error('Error grading:', error);
      alert('Failed to save grade.');
      return;
    }
    openActivity(selected);
  };

  const fetchRegisteredStudents = async () => {
    if (registeredStudents.length > 0) {
      setShowRoster(!showRoster);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, student_id, email')
        .eq('role', 'student')
        .order('full_name');
      if (error) throw error;
      setRegisteredStudents(data || []);
      setShowRoster(true);
    } catch (err) {
      console.error('Error fetching roster:', err);
    }
  };

  const selectedSub = selected ? getSubmission(selected.id) : null;
  const selectedStatus = selected && !isTeacher ? rosterStatus(selected, selectedSub) : null;
  const gradedCount = drawerSubs.filter((s) => s.status === 'Graded' && s.grade != null).length;

  const courseList = assignedSubjects.length ? assignedSubjects : subjects;
  const courseLabel = (id) => courseList.find((s) => s.id === id)?.subject_code || 'Global';

  return (
    <div>
      <PageHeader
        title="Roster & Dockets"
        subtitle={isTeacher
          ? 'Manage activities and student submissions.'
          : 'Track activities, projects, deadlines, and submissions from your courses.'}
        actions={
          isTeacher ? (
            <>
              <button onClick={fetchRegisteredStudents} className="ws-btn-secondary">
                <Users className="w-4 h-4" /> Class Roster
              </button>
              <button onClick={() => setShowCreate(true)} className="ws-btn-primary">
                <Plus className="w-4 h-4" /> Create Activity
              </button>
            </>
          ) : null
        }
      />

      {/* Toolbar */}
      <div className="ws-card mb-3 px-3 py-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities…"
            className="ws-input w-full pl-8"
          />
        </div>
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="ws-input">
          <option value="all">All courses</option>
          {courseList.map((s) => (
            <option key={s.id} value={s.id}>{s.subject_code}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ws-input">
          {statusOptions.map((v) => (
            <option key={v} value={v}>{statusLabel(v)}</option>
          ))}
        </select>
        <select value={deadlineFilter} onChange={(e) => setDeadlineFilter(e.target.value)} className="ws-input">
          {DEADLINE_FILTERS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      {/* Work overview: clickable status chips */}
      <div className="ws-card mb-4 px-3 py-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mr-1">Overview</span>
        {CHIPS.map((c) => (
          <button
            key={c.key}
            onClick={() => setStatusFilter(c.key)}
            className={`px-2.5 py-1 rounded-md border text-[12px] font-medium transition-colors ${
              statusFilter === c.key
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-700'
            }`}
          >
            <span className="font-bold">{counts[c.key] ?? 0}</span> {c.label}
          </button>
        ))}
      </div>

      {/* Missing alert */}
      {!isTeacher && missingCount > 0 && (
        <div className="ws-card mb-4 px-4 py-2.5 flex items-center gap-2.5 bg-red-50 border-red-100">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-[12.5px] text-red-800">
            <span className="font-bold">{missingCount}</span> requirement{missingCount > 1 ? 's are' : ' is'} missing — deadline passed without submission.
          </p>
          <button onClick={() => setStatusFilter('missing')} className="ml-auto text-[12px] font-semibold text-red-700 hover:text-red-900 whitespace-nowrap flex-shrink-0">
            View missing →
          </button>
        </div>
      )}

      {/* Class roster modal */}
      {showRoster && isTeacher && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setShowRoster(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,540px)] bg-white rounded-lg border border-slate-200 shadow-xl">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-slate-900">
                Registered Students ({registeredStudents.length})
              </h3>
              <button onClick={() => setShowRoster(false)} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
              {registeredStudents.length === 0 && (
                <p className="text-[13px] text-slate-400 p-6 text-center">No students have registered yet.</p>
              )}
              {registeredStudents.map((s) => (
                <div key={s.student_id || s.email} className="px-5 py-2.5 flex items-center justify-between text-[13px]">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{s.full_name}</p>
                    <p className="text-[11.5px] text-slate-400 truncate">{s.email}</p>
                  </div>
                  <span className="text-[11.5px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                    {s.student_id || 'No ID'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create activity modal */}
      {showCreate && isTeacher && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setShowCreate(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,560px)] bg-white rounded-lg border border-slate-200 shadow-xl">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-slate-900">New Activity</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-slate-600 mb-1">Title</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lab Assignment 1" className="ws-input w-full" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-600 mb-1">Instructions</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Provide instructions for the activity…" className="ws-input w-full resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-slate-600 mb-1">Deadline</label>
                  <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="ws-input w-full" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-600 mb-1">Points</label>
                  <input type="number" min={1} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} className="ws-input w-full" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-600 mb-1">Course</label>
                  <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="ws-input w-full">
                    <option value="">Global</option>
                    {assignedSubjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.code} — {s.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="ws-btn-secondary">Cancel</button>
                <button type="submit" disabled={creating} className="ws-btn-primary">
                  {creating ? 'Creating…' : (<><Plus className="w-4 h-4" /> Create Activity</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main table */}
      <div className="ws-card overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Course</th>
                  <th>Deadline</th>
                  <th>{isTeacher ? 'Submissions' : 'Status'}</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="max-w-[300px]"><SkeletonText lines={2} className="pr-6" /></td>
                    <td><Skeleton className="h-5 w-16 rounded" /></td>
                    <td><SkeletonText lines={2} className="w-28" /></td>
                    <td><Skeleton className="h-5 w-20 rounded" /></td>
                    <td><Skeleton className="h-4 w-4 rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredActivities.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-7 h-7" />}
            title={isTeacher ? 'No activities yet' : 'No requirements match your filters'}
            description={isTeacher
              ? "You haven't created any activities yet."
              : "Try adjusting your filters, or you're all caught up."}
            action={isTeacher ? <button onClick={() => setShowCreate(true)} className="ws-btn-primary"><Plus className="w-4 h-4" /> Create Activity</button> : null}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Course</th>
                  <th>Deadline</th>
                  <th>{isTeacher ? 'Submissions' : 'Status'}</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((a) => {
                  const sub = getSubmission(a.id);
                  const count = a.submissions?.[0]?.count ?? 0;
                  const st = isTeacher
                    ? { label: `${count} submitted`, tone: count > 0 ? 'green' : 'gray' }
                    : rosterStatus(a, sub);
                  const note = isTeacher ? null : deadlineNote(a, sub);
                  const left = a.deadline ? formatTimeLeft(a.deadline, now) : null;
                  return (
                    <tr key={a.id} className="cursor-pointer" onClick={() => openActivity(a)}>
                      <td className="max-w-[300px]">
                        <p className="font-medium text-slate-800 truncate">{a.title}</p>
                        <p className="text-[11.5px] text-slate-400 truncate">
                          {a.teacher?.full_name || 'Instructor'}
                          {a.deadline ? ` · ${a.points} pts` : ''}
                        </p>
                      </td>
                      <td>
                        <span className="text-[12px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                          {courseLabel(a.subject_id)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        {a.deadline ? (
                          <>
                            <p className="text-[12.5px] font-medium text-slate-700">
                              {formatDue(a.deadline, now)}
                            </p>
                            <p className={`text-[10.5px] ${note?.tone || 'text-slate-400'}`}>
                              {note ? note.text : (sub ? 'Submitted' : '')}
                              {left && !isTeacher && !sub && note?.text !== 'Missing' && (
                                <span className="text-slate-300"> · {left}</span>
                              )}
                            </p>
                          </>
                        ) : (
                          <p className="text-[12.5px] text-slate-400">No deadline</p>
                        )}
                      </td>
                      <td>
                        <StatusBadge {...st} dot />
                      </td>
                      <td>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || ''}
        subtitle={selected ? `${selected.points} pts · by ${selected.teacher?.full_name || 'Instructor'}` : ''}
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                {courseLabel(selected.subject_id)}
              </span>
              {!isTeacher && selectedStatus && <StatusBadge {...selectedStatus} dot />}
              {isTeacher && (
                <StatusBadge label={`${drawerSubs.length} submissions`} tone={drawerSubs.length > 0 ? 'green' : 'gray'} />
              )}
            </div>

            {/* Deadline */}
            {selected.deadline && (
              <div className="bg-slate-50 border border-slate-100 rounded-md p-3">
                <p className="ws-label mb-1">Deadline</p>
                <p className="text-[13px] font-semibold text-slate-800">
                  {new Date(selected.deadline).toLocaleString()}
                </p>
                {!isTeacher && (
                  <p className={`text-[11.5px] mt-0.5 font-medium ${selectedSub ? 'text-emerald-600' : deadlineNote(selected, selectedSub)?.text === 'Missing' ? 'text-red-600' : deadlineNote(selected, selectedSub)?.text ? 'text-amber-600' : 'text-slate-400'}`}>
                    {selectedSub
                      ? 'Submitted'
                      : deadlineNote(selected, selectedSub)?.text || 'No relative deadline'}
                  </p>
                )}
              </div>
            )}

            {/* Missing warning */}
            {!isTeacher && !selectedSub && deadlineNote(selected, selectedSub)?.text === 'Missing' && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-md p-3">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[12.5px] font-semibold text-red-800">No submission received</p>
                  <p className="text-[11.5px] text-red-700 mt-0.5">
                    Deadline: {new Date(selected.deadline).toLocaleString()}. This requirement is now marked as missing.
                  </p>
                </div>
              </div>
            )}

            {/* Instructions */}
            {selected.description && (
              <div>
                <h3 className="ws-label mb-1.5">Instructions</h3>
                <p className="text-[13px] text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-md p-3 leading-relaxed">
                  {selected.description}
                </p>
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div>
                <h3 className="ws-label mb-1.5">Attachments</h3>
                <div className="space-y-1.5">
                  {attachments.map((at) => (
                    <a
                      key={at.id}
                      href={at.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 hover:border-primary-300 hover:bg-primary-50/40 transition-colors text-[12.5px] font-medium text-slate-700"
                    >
                      <FileText className="w-4 h-4 text-primary-600 flex-shrink-0" />
                      <span className="truncate">{at.file_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Student: submission */}
            {!isTeacher && (
              <div className="border-t border-slate-100 pt-4">
                <h3 className="ws-label mb-2">Your submission</h3>
                {selectedSub ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[12.5px] text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Submitted {new Date(selectedSub.submitted_at).toLocaleString()}
                      {selectedSub.status === 'Late' && <StatusBadge label="Late" tone="amber" />}
                    </div>
                    {selectedSub.content && (
                      <p className="text-[13px] text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-md p-3">
                        {selectedSub.content}
                      </p>
                    )}
                    {selectedSub.file_url && (
                      <a href={selectedSub.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[12.5px] font-medium text-primary-600 hover:text-primary-700">
                        <Link2 className="w-3.5 h-3.5" /> View submitted link
                      </a>
                    )}
                    {selectedSub.status === 'Graded' && selectedSub.grade != null ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
                        <p className="text-[13px] font-semibold text-emerald-700">
                          Passed · {selectedSub.grade}/{selected.points}
                        </p>
                        {selectedSub.feedback && (
                          <p className="mt-1 text-[12.5px] text-emerald-800">"{selectedSub.feedback}"</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[12px] text-slate-400">Awaiting teacher review.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <textarea
                      rows={4}
                      value={submitContent}
                      onChange={(e) => setSubmitContent(e.target.value)}
                      placeholder="Type your answer or submission notes…"
                      className="ws-input w-full resize-none"
                    />
                    <input
                      type="url"
                      value={submitLink}
                      onChange={(e) => setSubmitLink(e.target.value)}
                      placeholder="Add a link to your work (optional)"
                      className="ws-input w-full"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSubmitActivity}
                        disabled={submitting || (!submitContent.trim() && !submitLink.trim())}
                        className="ws-btn-primary"
                      >
                        {submitting ? 'Submitting…' : (<><Send className="w-4 h-4" /> Submit Work</>)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Teacher: grading */}
            {isTeacher && (
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <h3 className="ws-label">Submissions ({drawerSubs.length})</h3>
                  {drawerSubs.length > 0 && (
                    <div className="ml-auto flex gap-1.5">
                      <StatusBadge label={`${gradedCount} passed`} tone="green" />
                      <StatusBadge label={`${drawerSubs.length - gradedCount} pending`} tone="amber" />
                    </div>
                  )}
                </div>
                {drawerSubsLoading ? (
                  <div className="space-y-3 py-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="border border-slate-200 rounded-md p-3">
                        <Skeleton className="h-4 w-1/3 rounded mb-2" />
                        <Skeleton className="h-3 w-full rounded" />
                      </div>
                    ))}
                  </div>
                ) : drawerSubs.length === 0 ? (
                  <div className="flex items-center gap-2 text-[12.5px] text-slate-400 py-4">
                    <AlertTriangle className="w-4 h-4" /> No submissions yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {drawerSubs.map((sub) => {
                      const draft = gradeDraft[sub.id] || {};
                      return (
                        <div key={sub.id} className="border border-slate-200 rounded-md p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-slate-800 truncate">
                                {sub.student?.full_name || 'Student'}
                              </p>
                              <p className="text-[11px] text-slate-400">{sub.student?.student_id || ''}</p>
                            </div>
                            <StatusBadge
                              label={sub.status === 'Graded' && sub.grade != null ? `Passed ${sub.grade}/${selected.points}` : sub.status}
                              tone={sub.status === 'Graded' ? 'green' : sub.status === 'Late' ? 'amber' : 'gray'}
                            />
                          </div>
                          {sub.content && (
                            <p className="mt-2 text-[12.5px] text-slate-600 whitespace-pre-wrap bg-slate-50 rounded p-2.5">
                              {sub.content}
                            </p>
                          )}
                          {sub.file_url && (
                            <a href={sub.file_url} target="_blank" rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-primary-600 hover:text-primary-700">
                              <Link2 className="w-3.5 h-3.5" /> Open submission link
                            </a>
                          )}
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={selected.points}
                              placeholder={`Grade /${selected.points}`}
                              defaultValue={sub.grade ?? ''}
                              onChange={(e) => setGradeDraft({ ...gradeDraft, [sub.id]: { ...draft, grade: e.target.value } })}
                              className="ws-input w-28"
                            />
                            <input
                              type="text"
                              placeholder="Feedback (optional)"
                              defaultValue={sub.feedback ?? ''}
                              onChange={(e) => setGradeDraft({ ...gradeDraft, [sub.id]: { ...draft, feedback: e.target.value } })}
                              className="ws-input flex-1 min-w-[140px]"
                            />
                            <button onClick={() => handleGrade(sub)} className="ws-btn-secondary text-[12px] px-2.5 py-1.5">
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
