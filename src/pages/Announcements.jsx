import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import Navbar from '../components/layout/Navbar';
import PostComposer from '../components/ui/PostComposer';
import { Megaphone, Pin, Clock } from 'lucide-react';

export default function Announcements() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // In a real app we'd fetch this from the database
  const mockSubjects = [
    { id: '1', code: 'ICT 101' },
    { id: '2', code: 'ICT 102' }
  ];

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          profiles:created_by (full_name, role)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostAnnouncement = async (postData) => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert([{
          title: postData.title,
          content: postData.content,
          subject_id: postData.subject_id,
          is_pinned: postData.is_pinned,
          is_urgent: postData.is_urgent,
          created_by: profile.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      // If there are attachments, upload them to Storage and create records
      if (postData.attachments.length > 0) {
        console.log('Would upload attachments here:', postData.attachments);
      }

      fetchAnnouncements();
    } catch (err) {
      console.error('Error posting announcement:', err);
      alert('Failed to post announcement.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <Megaphone className="w-6 h-6 mr-2 text-primary-600" />
              Announcements
            </h1>
            <p className="text-slate-600 text-sm mt-1">Updates and important information from your subjects.</p>
          </div>
        </div>

        {profile?.role === 'teacher' && (
          <div className="mb-8">
            <PostComposer 
              onSubmit={handlePostAnnouncement}
              subjects={mockSubjects}
              showPinOption={true}
              placeholder="Post a new announcement to your classes..."
            />
          </div>
        )}

        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No Announcements Yet</h3>
              <p className="text-slate-500 mt-1">Check back later for updates from your instructors.</p>
            </div>
          ) : (
            announcements.map((announcement) => (
              <div 
                key={announcement.id} 
                className={`bg-white rounded-xl shadow-sm border ${
                  announcement.is_urgent ? 'border-red-200 border-l-4 border-l-red-500' : 'border-slate-200'
                } overflow-hidden`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        {announcement.is_pinned && (
                          <span className="flex items-center text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                            <Pin className="w-3 h-3 mr-1" /> Pinned
                          </span>
                        )}
                        {announcement.is_urgent && (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
                            Urgent
                          </span>
                        )}
                        {announcement.subject_id && (
                          <span className="text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                            {mockSubjects.find(s => s.id === announcement.subject_id)?.code || 'Subject'}
                          </span>
                        )}
                        {!announcement.subject_id && (
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            Global
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">{announcement.title}</h2>
                      <div className="flex items-center text-xs text-slate-500 mt-2 space-x-4">
                        <span className="font-medium text-slate-700">{announcement.profiles?.full_name || 'Instructor'}</span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="prose prose-slate max-w-none text-slate-700 text-sm whitespace-pre-wrap">
                    {announcement.content}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
