import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import Drawer from '../components/ui/Drawer';
import {
  Search,
  Plus,
  Users,
  ChevronRight,
  Send,
  X,
  ClipboardList,
  CalendarClock,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { getActivityStatus, formatDue, formatTimeLeft, isDueSoon } from '../lib/status';

const STATUS_FILTERS = ['all', 'to do', 'submitted', 'graded', 'overdue'];

export default function RosterAndDockets() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');

  const [selected, setSelected] = useState(null);
  const [submitContent, setSubmitContent] = useState('');
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

  const filteredActivities = activities.filter((a) => {
    if (courseFilter !== 'all' && a.subject_id !== courseFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !(a.description || '').toLowerCase().includes(q)) return false;
    }
    if (!isTeacher && statusFilter !== 'all') {
      const st = getActivityStatus(a, getSubmission(a.id), now).label.toLowerCase();
      if (st !== statusFilter) return false;
    }
    return true;
  });

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
    if (!selected || !submitContent.trim()) return;
    setSubmitting(true);
    try {
      const isLate = selected.deadline && new Date(selected.deadline) < new Date();
      const { error } = await supabase.from('submissions').insert([{
        activity_id: selected.id,
        student_id: profile.id,
        content: submitContent.trim(),
        status: isLate ? 'Late' : 'Submitted',
      }]);
      if (error) throw error;
      setSubmitContent('');
      fetchData();
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

  return (
    <div>
      <PageHeader
        title="My Work"
        subtitle={isTeacher ? 'Activities you created and their submission status.' : 'Assignments, tasks, and deadlines from your courses.'}
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
      <div className="ws-card mb-4 px-3 py-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="ws-input w-full pl-8"
          />
        </div>
        {!isTeacher && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ws-input">
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>
            ))}
          </select>
        )}
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="ws-input">
          <option value="all">All courses</option>
          {(assignedSubjects.length ? assignedSubjects : subjects).map((s) => (
            <option key={s.id} value={s.id}>{s.subject_code}</option>
          ))}
        </select>
      </div>

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
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-7 h-7" />}
            title={isTeacher ? 'No activities yet' : 'No tasks match your filters'}
            description={isTeacher ? "You haven't created any activities yet." : "Try adjusting your filters, or you're all caught up."}
            action={isTeacher ? <button onClick={() => setShowCreate(true)} className="ws-btn-primary"><Plus className="w-4 h-4" /> Create Activity</button> : null}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Course</th>
                  <th>Due</th>
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
                    : getActivityStatus(a, sub, now);
                  const left = a.deadline ? formatTimeLeft(a.deadline, now) : null;
                  const course = (assignedSubjects.length ? assignedSubjects : subjects).find((s) => s.id === a.subject_id);
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
                          {course?.subject_code || 'Global'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`flex items-center gap-1.5 ${isDueSoon(a, now) && !sub ? 'text-amber-600' : 'text-slate-500'}`}>
                          <CalendarClock className="w-3.5 h-3.5" />
                          {a.deadline ? (
                            <>
                              {formatDue(a.deadline, now)}
                              {left && !isTeacher && !sub && (
                                <span className="text-[11px] text-red-500">{left}</span>
                              )}
                            </>
                          ) : 'No deadline'}
                        </span>
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
                {(assignedSubjects.length ? assignedSubjects : subjects).find((s) => s.id === selected.subject_id)?.subject_code || 'Global'}
              </span>
              {!isTeacher && <StatusBadge {...getActivityStatus(selected, selectedSub, now)} dot />}
              {isTeacher && (
                <StatusBadge label={`${drawerSubs.length} submissions`} tone={drawerSubs.length > 0 ? 'green' : 'gray'} />
              )}
            </div>

            {selected.deadline && (
              <div className={`flex items-center gap-2 text-[12.5px] ${new Date(selected.deadline) < new Date() ? 'text-red-600' : 'text-amber-600'}`}>
                <CalendarClock className="w-4 h-4" />
                Due {new Date(selected.deadline).toLocaleString()}
                {!isTeacher && !selectedSub && formatTimeLeft(selected.deadline, now) && (
                  <span className="font-semibold">· {formatTimeLeft(selected.deadline, now)} left</span>
                )}
              </div>
            )}

            {selected.description && (
              <div>
                <h3 className="ws-label mb-1.5">Instructions</h3>
                <p className="text-[13px] text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-md p-3">
                  {selected.description}
                </p>
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
                      {selectedSub.status === 'Late' && (
                        <StatusBadge label="Late" tone="amber" />
                      )}
                    </div>
                    {selectedSub.content && (
                      <p className="text-[13px] text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-md p-3">
                        {selectedSub.content}
                      </p>
                    )}
                    {selectedSub.status === 'Graded' && selectedSub.grade != null ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
                        <p className="text-[13px] font-semibold text-emerald-700">
                          Grade: {selectedSub.grade}/{selected.points}
                        </p>
                        {selectedSub.feedback && (
                          <p className="mt-1 text-[12.5px] text-emerald-800">{selectedSub.feedback}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[12px] text-slate-400">Awaiting grade.</p>
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
                    <div className="flex justify-end">
                      <button
                        onClick={handleSubmitActivity}
                        disabled={submitting || !submitContent.trim()}
                        className="ws-btn-primary"
                      >
                        {submitting ? 'Submitting…' : (<><Send className="w-4 h-4" /> Submit Activity</>)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Teacher: grading */}
            {isTeacher && (
              <div className="border-t border-slate-100 pt-4">
                <h3 className="ws-label mb-2">Submissions ({drawerSubs.length})</h3>
                {drawerSubsLoading ? (
                  <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 text-primary-500 animate-spin" /></div>
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
                              label={sub.status === 'Graded' && sub.grade != null ? `Graded ${sub.grade}/${selected.points}` : sub.status}
                              tone={sub.status === 'Graded' ? 'green' : sub.status === 'Late' ? 'amber' : 'gray'}
                            />
                          </div>
                          {sub.content && (
                            <p className="mt-2 text-[12.5px] text-slate-600 whitespace-pre-wrap bg-slate-50 rounded p-2.5">
                              {sub.content}
                            </p>
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
