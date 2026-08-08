import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import Navbar from '../components/layout/Navbar';
import PostComposer from '../components/ui/PostComposer';
import { FileText, Users, Clock, ChevronRight, File } from 'lucide-react';

export default function RosterAndDockets() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const mockSubjects = [
    { id: '1', code: 'ICT 101' },
    { id: '2', code: 'ICT 102' }
  ];

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          teacher:created_by (full_name)
        `)
        .order('deadline', { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

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
              <button className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors">
                <Users className="w-4 h-4 mr-2" />
                View Class Roster
              </button>
            </div>
          )}
        </div>

        {profile?.role === 'teacher' && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Create New Activity</h2>
            <PostComposer 
              onSubmit={() => {}}
              subjects={mockSubjects}
              showPinOption={false}
              placeholder="Provide instructions for the activity..."
            />
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
            {profile?.role === 'teacher' ? 'Active Dockets' : 'Your Activities'}
          </h2>
          
          {loading ? (
             <div className="text-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
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
              {activities.map((activity) => (
                <div key={activity.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:border-primary-300 transition-colors cursor-pointer group">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded">
                        {mockSubjects.find(s => s.id === activity.subject_id)?.code || 'Subject'}
                      </span>
                      {activity.deadline && new Date(activity.deadline) < new Date() && (
                         <span className="text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-0.5 rounded">
                           Overdue
                         </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">{activity.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{activity.description}</p>
                    
                    <div className="flex items-center text-xs text-slate-500 mt-4 space-x-4">
                      {activity.deadline && (
                        <span className="flex items-center text-amber-600 font-medium">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          Due: {new Date(activity.deadline).toLocaleString()}
                        </span>
                      )}
                      <span className="flex items-center">
                        <File className="w-3.5 h-3.5 mr-1" />
                        {activity.points} pts
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-0 sm:ml-6 flex items-center">
                    {profile?.role === 'student' ? (
                      <div className="text-right flex flex-col sm:items-end">
                        <span className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full inline-block mb-2">Pending</span>
                        <ChevronRight className="w-5 h-5 text-slate-400 hidden sm:block" />
                      </div>
                    ) : (
                      <div className="text-right flex flex-col sm:items-end">
                        <div className="text-sm font-medium text-slate-700 mb-1">0 Submitted</div>
                        <div className="text-xs text-slate-500">0 Graded</div>
                        <ChevronRight className="w-5 h-5 text-slate-400 hidden sm:block mt-2" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
