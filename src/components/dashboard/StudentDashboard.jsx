import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { BookOpen, Calendar, Bell, Clock, MonitorPlay, Activity, Video, Megaphone } from 'lucide-react';

export default function StudentDashboard({ profile }) {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [submittedIds, setSubmittedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, a, an, ses, sub] = await Promise.all([
          supabase.from('subjects').select('subject_code, subject_title'),
          supabase.from('activities').select('id, title, deadline'),
          supabase
            .from('announcements')
            .select('id, title, content, created_at, profiles:created_by (full_name)')
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('meeting_sessions')
            .select('id, room_name')
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1),
          supabase
            .from('submissions')
            .select('activity_id')
            .eq('student_id', profile?.id),
        ]);
        if (!active) return;
        if (!s.error) setSubjects(s.data || []);
        if (!a.error) setActivities(a.data || []);
        if (!an.error) setAnnouncements(an.data || []);
        if (!ses.error) setActiveSession(ses.data?.[0] || null);
        if (!sub.error) setSubmittedIds((sub.data || []).map(x => x.activity_id));
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [profile?.id]);

  const now = Date.now();
  const upcomingDeadlines = activities.filter(a => a.deadline && new Date(a.deadline).getTime() > now);
  const pendingSubmissions = activities.filter(a => !submittedIds.includes(a.id));

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Active Subjects</p>
              <h3 className="text-2xl font-bold text-slate-900">{subjects.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Upcoming Deadlines</p>
              <h3 className="text-2xl font-bold text-slate-900">{upcomingDeadlines.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <Activity className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Pending Submissions</p>
              <h3 className="text-2xl font-bold text-slate-900">{pendingSubmissions.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Subjects */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <MonitorPlay className="w-5 h-5 mr-2 text-primary-600" />
              My Subjects
            </h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No subjects published yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subjects.map(sub => (
                  <div key={sub.subject_code} className="border border-slate-200 p-4 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-primary-50 text-primary-700 text-xs font-semibold px-2.5 py-0.5 rounded">
                        {sub.subject_code}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900">{sub.subject_title}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Announcements */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-primary-600" />
              Recent Announcements
            </h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : announcements.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No announcements yet.</p>
            ) : (
              <div className="space-y-4">
                {announcements.map(a => (
                  <div key={a.id} className="p-4 border border-slate-100 bg-slate-50 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <h4 className="font-semibold text-slate-900 text-sm flex items-center">
                        <Megaphone className="w-3.5 h-3.5 mr-1.5 text-primary-500" />
                        {a.title}
                      </h4>
                      <span className="text-xs text-slate-500">{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{a.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Due soon */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-red-500" />
              Due Soon
            </h2>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Nothing due right now.</p>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.slice(0, 3).map(a => (
                  <div key={a.id} className="flex p-3 rounded-lg border border-red-100 bg-red-50">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-900">{a.title}</h4>
                      <p className="text-xs text-red-700">Due {new Date(a.deadline).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active class */}
          <div className="bg-gradient-to-br from-primary-900 to-primary-800 p-6 rounded-xl shadow-md text-white">
            <h2 className="text-lg font-bold mb-2 flex items-center">
              <span className="relative flex h-3 w-3 mr-3">
                <span className={`absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 ${activeSession ? 'animate-ping' : ''}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${activeSession ? 'bg-green-500' : 'bg-slate-400'}`}></span>
              </span>
              Active Class
            </h2>
            {activeSession ? (
              <>
                <p className="text-sm text-primary-100 mb-4">
                  {activeSession.room_name.replace(/bytebridge-/i, '').replace(/-\d+$/, '').replace(/-/g, ' ')} is live now.
                </p>
                <button
                  onClick={() => navigate('/classroom')}
                  className="w-full bg-white text-primary-900 font-semibold py-2 px-4 rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-center"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Join Class
                </button>
              </>
            ) : (
              <p className="text-sm text-primary-100 mb-4">No class is live right now.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
