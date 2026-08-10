import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Video,
  PhoneOff,
  Radio,
  Plus,
  X,
  Clock,
  Film,
  CalendarClock,
  Users,
  BookOpen,
} from 'lucide-react';
import { timeAgo } from '../lib/status';

const slug = (str) =>
  (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const prettyName = (room) =>
  (room || '').replace(/bytebridge-/i, '').replace(/-\d+$/, '').replace(/-/g, ' ');

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const fmtDuration = (start, end) => {
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

function ScheduleModal({ open, onClose, subjects, onSubmit }) {
  const [form, setForm] = useState({ title: '', subject_id: '', starts_at: '', ends_at: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ title: '', subject_id: '', starts_at: '', ends_at: '' });
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.starts_at || !form.ends_at) return;
    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      setError('End time must be after the start time.');
      return;
    }
    setSaving(true);
    setError('');
    await onSubmit({
      title: form.title.trim(),
      subject_id: form.subject_id || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative ws-card w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="ws-card-header">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Schedule a Class</h3>
            <p className="text-[12px] text-slate-500 mt-0.5">Post an upcoming session for your students.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="ws-label block mb-1">Class title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. ICT 101 — Lecture 5"
              className="ws-input w-full"
            />
          </div>
          <div>
            <label className="ws-label block mb-1">Subject</label>
            <select
              value={form.subject_id}
              onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
              className="ws-input w-full"
            >
              <option value="">General class (no subject)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="ws-label block mb-1">Starts at</label>
              <input
                type="datetime-local"
                required
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                className="ws-input w-full"
              />
            </div>
            <div>
              <label className="ws-label block mb-1">Ends at</label>
              <input
                type="datetime-local"
                required
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                className="ws-input w-full"
              />
            </div>
          </div>
          {error && <p className="text-[12.5px] text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="ws-btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="ws-btn-primary">
              <CalendarClock className="w-4 h-4" /> {saving ? 'Scheduling…' : 'Schedule Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Classroom() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSessions, setActiveSessions] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [roomSubject, setRoomSubject] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  const isTeacher = profile?.role === 'teacher';
  const now = Date.now();

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chSessions = supabase
      .channel('classroom-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_sessions' }, () => fetchAll())
      .subscribe();
    const chSchedules = supabase
      .channel('classroom-schedules')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_schedules' }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(chSessions);
      supabase.removeChannel(chSchedules);
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = async () => {
    try {
      const [actRes, pastRes, schedRes, subjRes] = await Promise.all([
        supabase
          .from('meeting_sessions')
          .select('*, subjects (subject_code, subject_title), teacher:started_by (full_name)')
          .is('ended_at', null)
          .order('started_at', { ascending: false }),
        supabase
          .from('meeting_sessions')
          .select('*, subjects (subject_code, subject_title), teacher:started_by (full_name)')
          .not('ended_at', 'is', null)
          .order('ended_at', { ascending: false })
          .limit(20),
        supabase
          .from('class_schedules')
          .select('*, subjects (subject_code, subject_title), teacher:created_by (full_name)')
          .order('starts_at', { ascending: true }),
isTeacher
          ? (async () => {
              const { data: ts } = await supabase
                .from('teacher_subjects')
                .select('subject_id')
                .eq('teacher_id', profile.id);
              const ids = (ts || []).map((t) => t.subject_id);
              if (!ids.length) return { data: [], error: null };
              return supabase
                .from('subjects')
                .select('id, subject_code, subject_title')
                .in('id', ids)
                .order('subject_code');
            })()
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!actRes.error) setActiveSessions(actRes.data || []);
      if (!pastRes.error) setPastSessions(pastRes.data || []);
      if (!schedRes.error) setSchedules(schedRes.data || []);
      if (!subjRes.error) {
        setSubjects(subjRes.data || []);
        const target = searchParams.get('subject');
        if (target && (subjRes.data || []).some((s) => s.id === target)) setRoomSubject(target);
      }
    } catch (err) {
      console.error('Error fetching classroom data:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Starting / joining -------------------------------------------------

  const startClass = async () => {
    if (!roomName.trim()) return;
    const room = `bytebridge-${slug(roomName)}-${Date.now()}`;
    try {
      const { data, error } = await supabase
        .from('meeting_sessions')
        .insert([{
          subject_id: roomSubject || null,
          section_id: null,
          started_by: profile.id,
          room_name: room,
        }])
        .select()
        .single();
      if (error) throw error;
      setCurrentSession(data);
      setRoomName('');
      setRoomSubject('');
      launchJitsi(room);
    } catch (err) {
      console.error('Error starting class:', err);
      alert('Failed to start class. Please try again.');
    }
  };

  const joinClass = (session) => {
    setCurrentSession(session);
    launchJitsi(session.room_name);
  };

  // Join a scheduled class: teacher creates/attaches a live session row,
  // students go straight into the Jitsi room.
  const joinSchedule = async (s) => {
    const room = `bytebridge-${slug(s.title) || 'class'}-${s.id.slice(0, 8)}`;
    if (isTeacher) {
      const existing = activeSessions.find((x) => x.schedule_id === s.id);
      if (existing) {
        joinClass(existing);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('meeting_sessions')
          .insert([{
            subject_id: s.subject_id || null,
            section_id: null,
            started_by: profile.id,
            room_name: room,
            schedule_id: s.id,
          }])
          .select()
          .single();
        if (error) throw error;
        setCurrentSession(data);
        launchJitsi(room);
      } catch (err) {
        console.error('Error starting scheduled class:', err);
        alert('Failed to start the class. Please try again.');
      }
    } else {
      setCurrentSession({ room_name: room });
      launchJitsi(room);
    }
  };

  const handleSchedule = async (payload) => {
    try {
      const { error } = await supabase.from('class_schedules').insert([{
        ...payload,
        created_by: profile.id,
      }]);
      if (error) throw error;
      setShowSchedule(false);
      fetchAll();
    } catch (err) {
      console.error('Error scheduling class:', err);
      alert('Failed to schedule the class. Please try again.');
    }
  };

  const deleteSchedule = async (s) => {
    if (!window.confirm(`Remove "${s.title}" from the schedule?`)) return;
    try {
      const { error } = await supabase.from('class_schedules').delete().eq('id', s.id);
      if (error) throw error;
      fetchAll();
    } catch (err) {
      console.error('Error deleting schedule:', err);
      alert('Failed to remove the class.');
    }
  };

  // --- Jitsi ---------------------------------------------------------------

  const launchJitsi = (room) => {
    setParticipantCount(1);
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
    }

    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => initJitsi(room);
      document.head.appendChild(script);
    } else {
      initJitsi(room);
    }
  };

  const initJitsi = (room) => {
    if (!jitsiContainerRef.current) return;

    const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
      roomName: room,
      parentNode: jitsiContainerRef.current,
      width: '100%',
      height: '100%',
      userInfo: {
        displayName: profile?.full_name || 'ByteBridge User',
        email: profile?.email || ''
      },
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        prejoinPageEnabled: false,
        lobby: { enabled: true, autoKnock: true },
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_BACKGROUND: '#1e3a5f',
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'desktop', 'chat',
          'raisehand', 'participants-pane', 'tileview',
          'hangup', 'settings', 'fullscreen'
        ],
      }
    });

    api.addEventListener('videoConferenceJoined', (e) => {
      if (e?.participantCount != null) setParticipantCount(e.participantCount);
    });
    api.addEventListener('participantJoined', () => {
      setParticipantCount((c) => c + 1);
    });
    api.addEventListener('participantLeft', () => {
      setParticipantCount((c) => Math.max(1, (c || 1) - 1));
    });
    api.addEventListener('readyToClose', () => {
      handleEndClass();
    });

    jitsiApiRef.current = api;
  };

  const handleEndClass = async () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    setParticipantCount(1);

    if (isTeacher && currentSession?.id) {
      try {
        await supabase
          .from('meeting_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', currentSession.id);
      } catch (err) {
        console.error('Error ending session:', err);
      }
    }

    setCurrentSession(null);
    fetchAll();
  };

  // --- Room view (full screen) --------------------------------------------

  if (currentSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center min-w-0">
            <Video className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
            <span className="text-white font-semibold text-sm">ByteBridge Virtual Classroom</span>
            {currentSession.subjects?.subject_code && (
              <span className="ml-3 text-[11px] font-semibold text-green-300 bg-green-900/40 px-1.5 py-0.5 rounded flex-shrink-0">
                {currentSession.subjects.subject_code}
              </span>
            )}
            <span className="ml-3 hidden sm:block text-xs text-slate-400 truncate">{prettyName(currentSession.room_name)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300">
              <Users className="w-3.5 h-3.5" /> {participantCount} in class
            </span>
            <button
              onClick={handleEndClass}
              className="flex items-center px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              {isTeacher ? 'End Class' : 'Leave'}
            </button>
          </div>
        </div>
        <div ref={jitsiContainerRef} className="flex-1" style={{ minHeight: 'calc(100vh - 56px)' }}></div>
      </div>
    );
  }

  // --- Hub view -------------------------------------------------------------

  const liveNow = activeSessions[0];
  const moreSessions = activeSessions.slice(1);
  const upcoming = schedules.filter((s) => new Date(s.ends_at).getTime() >= now);
  const visiblePast = showAllPast ? pastSessions : pastSessions.slice(0, 5);

  const scheduleStatus = (s) => {
    const start = new Date(s.starts_at).getTime();
    const end = new Date(s.ends_at).getTime();
    if (start <= now && now <= end) return 'live';
    if (now < start) return 'upcoming';
    return 'ended';
  };

  const dateBlock = (iso) => {
    const d = new Date(iso);
    return {
      weekday: d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
      day: d.getDate(),
      month: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    };
  };

  return (
    <div>
      <PageHeader
        title="Virtual Classroom"
        subtitle="Join live classes, see what's scheduled, and watch recorded sessions."
      />

      {/* Teacher: start a class */}
      {isTeacher && (
        <div className="ws-card px-4 py-3 mb-5 flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="ws-section-title">Start a new class</span>
          </div>
          <input
            type="text"
            placeholder="Class name (e.g., ICT 101 — Lecture 5)"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="ws-input flex-1 min-w-[200px]"
          />
          <select
            value={roomSubject}
            onChange={(e) => setRoomSubject(e.target.value)}
            className="ws-input"
            title="Subject"
          >
            <option value="">General class</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.subject_code}</option>
            ))}
          </select>
          <button
            onClick={startClass}
            disabled={!roomName.trim()}
            className="ws-btn-primary justify-center"
          >
            <Video className="w-4 h-4" /> Start Class
          </button>
          <button onClick={() => setShowSchedule(true)} className="ws-btn-secondary justify-center">
            <CalendarClock className="w-4 h-4" /> Schedule Class
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="ws-card p-5 flex items-center gap-4">
            <Skeleton className="h-11 w-11 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          </div>
          <div className="ws-card p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3 rounded" />
                  <Skeleton className="h-3 w-1/3 rounded" />
                </div>
                <Skeleton className="h-7 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* LIVE NOW */}
          <section>
            <h2 className="ws-label mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live now
            </h2>
            {liveNow ? (
              <div className="ws-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="w-11 h-11 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                    <Radio className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] font-bold text-slate-900">{prettyName(liveNow.room_name)}</h3>
                      {liveNow.subjects?.subject_code && (
                        <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                          {liveNow.subjects.subject_code}
                        </span>
                      )}
                    </div>
                    <p className="text-[12.5px] text-slate-500 mt-0.5">
                      {liveNow.teacher?.full_name || 'Instructor'} · Subject Teacher
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Started {timeAgo(liveNow.started_at)}
                    </p>
                  </div>
                </div>
                <button onClick={() => joinClass(liveNow)} className="ws-btn-primary justify-center">
                  <Video className="w-4 h-4" /> Join Classroom
                </button>
              </div>
            ) : (
              <div className="ws-card">
                <EmptyState
                  icon={<Video className="w-7 h-7" />}
                  title="No live classes right now"
                  description="Scheduled classes and recorded sessions from your instructors will appear here."
                  action={
                    <button onClick={() => navigate('/materials')} className="ws-btn-primary">
                      <BookOpen className="w-4 h-4" /> View My Subjects
                    </button>
                  }
                />
              </div>
            )}
          </section>

          {/* Other active sessions */}
          {moreSessions.length > 0 && (
            <section>
              <h2 className="ws-label mb-2">Active sessions</h2>
              <div className="ws-card divide-y divide-slate-100">
                {moreSessions.map((session) => (
                  <div key={session.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{prettyName(session.room_name)}</p>
                      <p className="text-[11.5px] text-slate-400">
                        {session.teacher?.full_name || 'Instructor'} · {new Date(session.started_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <button onClick={() => joinClass(session)} className="ws-btn-secondary text-[12px] px-2.5 py-1.5">
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* UPCOMING CLASSES */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="ws-label">Upcoming classes</h2>
              {isTeacher && (
                <button onClick={() => setShowSchedule(true)} className="text-[12px] font-medium text-primary-600 hover:text-primary-700">
                  <Plus className="w-3.5 h-3.5 inline -mt-0.5" /> Schedule class
                </button>
              )}
            </div>
            {upcoming.length === 0 ? (
              <div className="ws-card px-5 py-6 text-center">
                <CalendarClock className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="mt-2 text-[13px] font-medium text-slate-600">No classes scheduled yet</p>
                <p className="mt-0.5 text-[12px] text-slate-400">Your instructors will post upcoming sessions here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcoming.map((s) => {
                  const db = dateBlock(s.starts_at);
                  const status = scheduleStatus(s);
                  return (
                    <div key={s.id} className="ws-card px-4 py-3.5 flex items-center gap-4">
                      <div className="w-14 flex-shrink-0 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{db.weekday}</p>
                        <p className="text-[20px] font-bold text-slate-900 leading-none mt-0.5">{db.day}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{db.month}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[13.5px] font-semibold text-slate-800 truncate">{s.title}</h3>
                          {s.subjects?.subject_code && (
                            <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                              {s.subjects.subject_code}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-slate-500 mt-0.5">{s.teacher?.full_name || 'Instructor'}</p>
                        <p className="text-[11.5px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {fmtTime(s.starts_at)} – {fmtTime(s.ends_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isTeacher && (
                          <button
                            onClick={() => deleteSchedule(s)}
                            title="Remove from schedule"
                            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {status === 'live' ? (
                          <button onClick={() => joinSchedule(s)} className="ws-btn-primary justify-center">
                            <Video className="w-4 h-4" /> Join Now
                          </button>
                        ) : status === 'upcoming' ? (
                          <span className="text-[12px] font-medium text-slate-400 whitespace-nowrap">
                            Starts {fmtTime(s.starts_at)}
                          </span>
                        ) : (
                          <span className="text-[12px] font-medium text-slate-400 whitespace-nowrap">Ended</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* RECENT CLASS SESSIONS */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="ws-label">Recent class sessions</h2>
              {pastSessions.length > 5 && (
                <button
                  onClick={() => setShowAllPast(!showAllPast)}
                  className="text-[12px] font-medium text-primary-600 hover:text-primary-700"
                >
                  {showAllPast ? 'Show less' : 'View all →'}
                </button>
              )}
            </div>
            {pastSessions.length === 0 ? (
              <div className="ws-card px-5 py-6 text-center">
                <Film className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="mt-2 text-[13px] font-medium text-slate-600">No recorded sessions yet</p>
                <p className="mt-0.5 text-[12px] text-slate-400">Classes that have ended will show up here with recordings.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visiblePast.map((p) => (
                  <div key={p.id} className="ws-card px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                        <Film className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{prettyName(p.room_name)}</p>
                        <p className="text-[11.5px] text-slate-400 truncate">
                          {p.subjects?.subject_code ? `${p.subjects.subject_code} · ` : ''}
                          {p.teacher?.full_name || 'Instructor'} · {fmtDateTime(p.started_at)}
                          {p.ended_at ? ` · ${fmtDuration(p.started_at, p.ended_at)}` : ''}
                        </p>
                      </div>
                    </div>
                    {p.recording_url ? (
                      <a href={p.recording_url} target="_blank" rel="noreferrer" className="ws-btn-secondary text-[12px] px-2.5 py-1.5 flex-shrink-0">
                        <Film className="w-3.5 h-3.5" /> Watch
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 flex-shrink-0">No recording</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <p className="text-[11.5px] text-slate-400">
            Students joining a session wait in the waiting room until the host (teacher) admits them.
          </p>
        </div>
      )}

      <ScheduleModal
        open={showSchedule}
        onClose={() => setShowSchedule(false)}
        subjects={subjects}
        onSubmit={handleSchedule}
      />
    </div>
  );
}
