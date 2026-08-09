import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { Video, PhoneOff, Loader2, Radio } from 'lucide-react';

export default function Classroom() {
  const { profile } = useAuth();
  const [activeSessions, setActiveSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState('');
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel('meeting_sessions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meeting_sessions'
      }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_sessions')
        .select('*, subjects (subject_code, subject_title), teacher:started_by (full_name)')
        .is('ended_at', null)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setActiveSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const startClass = async () => {
    if (!roomName.trim()) return;

    const room = `bytebridge-${roomName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

    try {
      const { data, error } = await supabase
        .from('meeting_sessions')
        .insert([{
          subject_id: null,
          section_id: null,
          started_by: profile.id,
          room_name: room,
        }])
        .select()
        .single();

      if (error) throw error;
      setCurrentSession(data);
      setRoomName('');
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

  const launchJitsi = (room) => {
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

    if (profile?.role === 'teacher' && currentSession) {
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
    fetchSessions();
  };

  const prettyName = (room) =>
    (room || '').replace(/bytebridge-/i, '').replace(/-\d+$/, '').replace(/-/g, ' ');

  if (currentSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center">
            <Video className="w-5 h-5 text-green-400 mr-2" />
            <span className="text-white font-semibold text-sm">ByteBridge Virtual Classroom</span>
            <span className="ml-3 text-xs text-slate-400">{currentSession.room_name}</span>
          </div>
          <button
            onClick={handleEndClass}
            className="flex items-center px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <PhoneOff className="w-4 h-4 mr-2" />
            {profile?.role === 'teacher' ? 'End Class' : 'Leave'}
          </button>
        </div>
        <div ref={jitsiContainerRef} className="flex-1" style={{ minHeight: 'calc(100vh - 56px)' }}></div>
      </div>
    );
  }

  const liveNow = activeSessions[0];
  const moreSessions = activeSessions.slice(1);

  return (
    <div>
      <PageHeader
        title="Classroom"
        subtitle="Join live classes and interact with your instructor."
      />

      {/* Teacher: start a class */}
      {profile?.role === 'teacher' && (
        <div className="ws-card px-4 py-3 mb-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
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
          <button
            onClick={startClass}
            disabled={!roomName.trim()}
            className="ws-btn-primary justify-center"
          >
            <Video className="w-4 h-4" /> Start Class
          </button>
        </div>
      )}

      {loading ? (
        <div className="ws-card flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
        </div>
      ) : activeSessions.length === 0 ? (
        <div className="ws-card">
          <EmptyState
            icon={<Video className="w-7 h-7" />}
            title="No live classes right now"
            description={profile?.role === 'teacher'
              ? 'Start a class to begin a live session.'
              : 'Check back later for live sessions from your instructors.'}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* LIVE NOW */}
          <section>
            <h2 className="ws-label mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live now
            </h2>
            <div className="ws-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="w-11 h-11 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                  <Radio className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900">{prettyName(liveNow.room_name)}</h3>
                  <p className="text-[12.5px] text-slate-500 mt-0.5">
                    {liveNow.teacher?.full_name || 'Instructor'} · started{' '}
                    {new Date(liveNow.started_at).toLocaleTimeString()}
                    {liveNow.subjects?.subject_code ? ` · ${liveNow.subjects.subject_code}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => joinClass(liveNow)} className="ws-btn-primary justify-center">
                <Video className="w-4 h-4" /> Join Class
              </button>
            </div>
          </section>

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
        </div>
      )}

      <p className="mt-4 text-[11.5px] text-slate-400">
        Students joining a session wait in the waiting room until the host (teacher) admits them.
      </p>
    </div>
  );
}
