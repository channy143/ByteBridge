import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Users, Calendar, Bell, PlusCircle, MonitorPlay, Activity, ChevronRight } from 'lucide-react';

export default function TeacherDashboard({ profile }) {
  const navigate = useNavigate();
  const [assigned, setAssigned] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [pendingToGrade, setPendingToGrade] = useState(0);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ts, pc, subs, acts] = await Promise.all([
          supabase
            .from('teacher_subjects')
            .select('subject_id, subjects (subject_code, subject_title)'),
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student'),
          supabase
            .from('submissions')
            .select('id, activities!inner(created_by)')
            .is('grade', null),
          supabase
            .from('activities')
            .select('*')
            .order('deadline', { ascending: true }),
        ]);
        if (!active) return;
        if (!ts.error) {
          setAssigned(
            (ts.data || [])
              .map(r => ({ id: r.subject_id, code: r.subjects?.subject_code, title: r.subjects?.subject_title }))
              .filter(s => s.code)
          );
        }
        if (!pc.error) setTotalStudents(pc.count || 0);
        if (!subs.error) {
          setPendingToGrade((subs.data || []).filter(s => s.activities?.created_by === profile?.id).length);
        }
        if (!acts.error) {
          setUpcomingDeadlines((acts.data || []).filter(a => a.deadline && new Date(a.deadline) > new Date()).length);
          setRecentActivities((acts.data || []).filter(a => a.created_by === profile?.id).slice(0, 3));
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [profile?.id]);

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => navigate('/roster')}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Create Activity
        </button>
        <button
          onClick={() => navigate('/announcements')}
          className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Bell className="w-4 h-4 mr-2" />
          Post Announcement
        </button>
        <button
          onClick={() => navigate('/classroom')}
          className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <MonitorPlay className="w-4 h-4 mr-2 text-green-600" />
          Start Class
        </button>
      </div>

      {/* Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Registered Students</p>
              <h3 className="text-2xl font-bold text-slate-900">{totalStudents}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
              <Activity className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Pending to Grade</p>
              <h3 className="text-2xl font-bold text-slate-900">{pendingToGrade}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Upcoming Deadlines</p>
              <h3 className="text-2xl font-bold text-slate-900">{upcomingDeadlines}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Assigned Subjects */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Assigned Subjects</h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : assigned.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No subjects assigned yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assigned.map(sub => (
                  <div key={sub.id} className="border border-slate-200 p-4 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-primary-50 text-primary-700 text-xs font-semibold px-2.5 py-0.5 rounded">
                        {sub.code}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">{sub.title}</h3>
                    <button
                      onClick={() => navigate('/roster')}
                      className="text-sm text-primary-600 font-medium hover:text-primary-700"
                    >
                      Manage Course &rarr;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Recent Activities */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Your Recent Activities</h2>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No activities yet.</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map(a => (
                  <div key={a.id} className="flex items-start p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-slate-900">{a.title}</h4>
                      <p className="text-xs text-slate-500">
                        {a.deadline ? `Due ${new Date(a.deadline).toLocaleString()}` : 'No deadline'} · {a.points} pts
                      </p>
                    </div>
                    <button onClick={() => navigate('/roster')} className="text-slate-400 hover:text-primary-600 ml-2">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => navigate('/roster')}
              className="w-full mt-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              View All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
