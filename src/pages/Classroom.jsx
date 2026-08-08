import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import Navbar from '../components/layout/Navbar';
import { Video, PhoneOff, Mic, MicOff, Camera, CameraOff, Monitor, MessageSquare, Hand } from 'lucide-react';

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

    // Subscribe to realtime meeting session changes
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
        .select(`
          *,
          subjects (subject_code, subject_title),
          teacher:started_by (full_name)
        `)
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
    // Cleanup previous instance
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
    }

    // Load Jitsi external API if not loaded
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
        // Waiting-room gate: students knock, the host (teacher) approves
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

    // If teacher, end the session in the DB
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

  // If in an active meeting, show full-screen Jitsi
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Video className="w-6 h-6 mr-2 text-primary-600" />
            Virtual Classroom
          </h1>
          <p className="text-slate-600 text-sm mt-1">Join or start live video classes.</p>
          <p className="text-slate-400 text-xs mt-1">
            Students joining a session wait in the waiting room until the host (teacher) admits them.
          </p>
        </div>

        {/* Teacher: Start a New Class */}
        {profile?.role === 'teacher' && (
          <div className="bg-gradient-to-br from-primary-900 to-primary-800 p-8 rounded-xl shadow-md mb-8 text-white">
            <h2 className="text-xl font-bold mb-2">Start a New Class</h2>
            <p className="text-primary-200 text-sm mb-6">Launch a live virtual classroom for your students.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Enter class name (e.g., ICT 101 - Lecture 5)"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                onClick={startClass}
                disabled={!roomName.trim()}
                className="px-6 py-3 bg-white text-primary-900 font-bold rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Video className="w-5 h-5 mr-2" />
                Start Class
              </button>
            </div>
          </div>
        )}

        {/* Active Sessions */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">
            {profile?.role === 'student' ? 'Available Classes' : 'Active Sessions'}
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <Video className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No Active Classes</h3>
              <p className="text-slate-500 mt-1">
                {profile?.role === 'student' 
                  ? 'There are no live classes at the moment. Check back later.'
                  : 'Start a new class to begin a live session.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSessions.map(session => (
                <div key={session.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-primary-300 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center mb-1">
                        <span className="relative flex h-2.5 w-2.5 mr-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium text-green-600">Live Now</span>
                      </div>
                      <h3 className="font-semibold text-slate-900">{session.room_name.replace(/bytebridge-/i, '').replace(/-\d+$/, '').replace(/-/g, ' ')}</h3>
                    </div>
                    {session.subjects && (
                      <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded">
                        {session.subjects.subject_code}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 mb-4 space-y-1">
                    <div>Hosted by: <span className="font-medium text-slate-700">{session.teacher?.full_name || 'Instructor'}</span></div>
                    <div>Started: {new Date(session.started_at).toLocaleTimeString()}</div>
                  </div>

                  <button
                    onClick={() => joinClass(session)}
                    className="w-full flex items-center justify-center px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Join Class
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
