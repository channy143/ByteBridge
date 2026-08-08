import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import Navbar from '../components/layout/Navbar';
import { FileText, Users, Clock, ChevronRight, Plus, CheckCircle2, AlertTriangle, Loader2, Send, X, CalendarClock } from 'lucide-react';

function useNowTick() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function timeLeft(deadline, now) {
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function RosterAndDockets() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', deadline: '', points: 100, subject_id: '' });
  const [creating, setCreating] = useState(false);
  const [showSubmit, setShowSubmit] = useState(null);
  const [submitContent, setSubmitContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const now = useNowTick();

  useEffect(() => {
    if (profile) fetchData();
  }, [fetchData, profile]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (profile?.role === 'teacher') {
        const [actRes, subRes] = await Promise.all([
          supabase
            .from('activities')
            .select('*, teacher:created_by (full_name), submissions (count)')
            .order('deadline', { ascending: true }),
          supabase
            .from('teacher_subjects')
            .select('subject_id, subjects (subject_code, subject_title)'),
        ]);
        if (actRes.error) throw actRes.error;
        if (subRes.error) throw subRes.error;
        setActivities(actRes.data || []);
        setAssignedSubjects(
          (subRes.data || [])
            .map(r => ({ id: r.subject_id, code: r.subjects?.subject_code, title: r.subjects?.subject_title }))
            .filter(s => s.code)
        );
      } else {
        const [actRes, subRes] = await Promise.all([
          supabase
            .from('activities')
            .select('*, teacher:created_by (full_name)')
            .order('deadline', { ascending: true }),
          supabase
            .from('submissions')
            .select('*')
            .eq('student_id', profile?.id),
        ]);
        if (actRes.error) throw actRes.error;
        if (subRes.error) throw subRes.error;
        setActivities(actRes.data || []);
        setSubmissions(subRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

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

  const handleSubmitActivity = async (activityId) => {
    const activity = activities.find(a => a.id === activityId);
    setSubmitting(true);
    try {
      const isLate = activity?.deadline && new Date(activity.deadline) < new Date();
      const { error } = await supabase.from('submissions').insert([{
        activity_id: activityId,
        student_id: profile.id,
        content: submitContent.trim(),
        status: isLate ? 'Late' : 'Submitted',
      }]);
      if (error) throw error;
      setShowSubmit(null);
      setSubmitContent('');
      fetchData();
    } catch (err) {
      console.error('Error submitting:', err);
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
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

  const getSubmission = (activityId) =>
    submissions.find(s => s.activity_id === activityId);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-primary-600" />
              Roster & Dockets
            </h1>
            <p className="text-slate-600 text-sm mt-1">Manage activities, deadlines, and submissions.</p>
          </div>
          {profile?.role === 'teacher' && (
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={fetchRegisteredStudents}
                className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                <Users className="w-4 h-4 mr-2" />
                View Class Roster
              </button>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Activity
              </button>
            </div>
          )}
        </div>

        {/* Class roster (registered students) */}
        {showRoster && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Registered Students ({registeredStudents.length})</h3>
              <button onClick={() => setShowRoster(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {registeredStudents.length === 0 && (
                <p className="text-sm text-slate-400 p-6 text-center">No students have registered yet.</p>
              )}
              {registeredStudents.map(s => (
                <div key={s.student_id || s.email} className="px-6 py-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-slate-800">{s.full_name}</span>
                    <span className="ml-3 text-xs text-slate-400">{s.email}</span>
                  </div>
                  <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded">
                    {s.student_id || 'No ID'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create activity form */}
        {showCreate && profile?.role === 'teacher' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-primary-200 mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4">New Activity</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Lab Assignment 1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Instructions</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Provide instructions for the activity..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                  <input
                    type="datetime-local"
                    value={form.deadline}
                    onChange={e => setForm({ ...form, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Points</label>
                  <input
                    type="number"
                    min={1}
                    value={form.points}
                    onChange={e => setForm({ ...form, points: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <select
                    value={form.subject_id}
                    onChange={e => setForm({ ...form, subject_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Global (All Subjects)</option>
                    {assignedSubjects.map(s => (
                      <option key={s.id} value={s.id}>{s.code} — {s.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center"
                >
                  {creating ? 'Creating...' : (
                    <>
                      <Plus className="w-4 h-4 mr-1.5" /> Create Activity
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
            {profile?.role === 'teacher' ? 'Active Dockets' : 'Your Activities'}
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-primary-600 animate-spin mx-auto" />
            </div>
          ) : activities.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No Activities Found</h3>
              <p className="text-slate-500 mt-1">
                {profile?.role === 'teacher' ? "You haven't created any activities yet." : "You have no pending activities."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {activities.map((activity) => {
                const submission = getSubmission(activity.id);
                const count = activity.submissions?.[0]?.count ?? 0;
                const isOverdue = activity.deadline && new Date(activity.deadline).getTime() < now;
                const left = activity.deadline ? timeLeft(activity.deadline, now) : null;

                return (
                  <div key={activity.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:border-primary-300 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded">
                          {assignedSubjects.find(s => s.id === activity.subject_id)?.code || 'Subject'}
                        </span>
                        {isOverdue && (
                          <span className="text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-0.5 rounded">
                            Overdue
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">{activity.title}</h3>
                      {activity.description && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2 whitespace-pre-wrap">{activity.description}</p>
                      )}

                      <div className="flex flex-wrap items-center text-xs text-slate-500 mt-4 space-x-4">
                        {activity.deadline ? (
                          <span className={`flex items-center font-medium ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                            <CalendarClock className="w-3.5 h-3.5 mr-1" />
                            Due: {new Date(activity.deadline).toLocaleString()}
                          </span>
                        ) : (
                          <span className="flex items-center text-slate-400">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            No deadline
                          </span>
                        )}
                        <span className="flex items-center">
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          {activity.points} pts
                        </span>
                        <span className="flex items-center">
                          <Users className="w-3.5 h-3.5 mr-1" />
                          {activity.teacher?.full_name || 'Instructor'}
                        </span>
                      </div>

                      {/* Student: status + countdown */}
                      {profile?.role === 'student' && (
                        <div className="mt-3">
                          {submission ? (
                            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                              submission.status === 'Late'
                                ? 'bg-amber-50 text-amber-700'
                                : submission.status === 'Graded'
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-green-50 text-green-700'
                            }`}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              {submission.status === 'Late' ? 'Submitted Late' : 'Submitted'} — {new Date(submission.submitted_at).toLocaleString()}
                            </span>
                          ) : left ? (
                            <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700">
                              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                              Time left: {left}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                              No submission — overdue
                            </span>
                          )}
                        </div>
                      )}

                      {/* Teacher: submission count */}
                      {profile?.role === 'teacher' && (
                        <div className="mt-3 text-sm font-medium text-slate-700">
                          {count} Submitted
                        </div>
                      )}
                    </div>

                    <div className="mt-4 sm:mt-0 sm:ml-6 flex items-center">
                      {profile?.role === 'student' ? (
                        submission ? (
                          <span className="text-xs text-slate-400 flex items-center">
                            <ChevronRight className="w-4 h-4 mr-1" />
                            {submission.status === 'Graded' && submission.grade != null ? `Grade: ${submission.grade}/${activity.points}` : 'Awaiting grade'}
                          </span>
                        ) : (
                          <button
                            onClick={() => setShowSubmit(showSubmit === activity.id ? null : activity.id)}
                            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                          >
                            <Send className="w-4 h-4 mr-1.5" />
                            Submit
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-slate-400 flex items-center">
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      )}
                    </div>

                    {showSubmit === activity.id && !submission && profile?.role === 'student' && (
                      <div className="w-full mt-4 pt-4 border-t border-slate-100">
                        <textarea
                          rows={3}
                          value={submitContent}
                          onChange={e => setSubmitContent(e.target.value)}
                          placeholder="Type your answer or submission notes..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        />
                        <div className="mt-3 flex justify-end space-x-3">
                          <button
                            onClick={() => { setShowSubmit(null); setSubmitContent(''); }}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSubmitActivity(activity.id)}
                            disabled={submitting || !submitContent.trim()}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center"
                          >
                            {submitting ? 'Submitting...' : (
                              <>
                                <Send className="w-4 h-4 mr-1.5" /> Submit Activity
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
