import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Drawer from '../components/ui/Drawer';
import Avatar from '../components/ui/Avatar';
import PostComposer from '../components/ui/PostComposer';
import { Search, Megaphone, Pin, Loader2 } from 'lucide-react';
import { timeAgo } from '../lib/status';

export default function Announcements() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const [annRes, subjRes] = await Promise.all([
        supabase
          .from('announcements')
          .select('*, profiles:created_by (full_name, role)')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('subjects').select('id, subject_code, subject_title'),
      ]);
      if (annRes.error) throw annRes.error;
      if (!subjRes.error) setSubjects(subjRes.data || []);
      setAnnouncements(annRes.data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostAnnouncement = async (postData) => {
    try {
      const { error } = await supabase.from('announcements').insert([{
        title: postData.title,
        content: postData.content,
        subject_id: postData.subject_id,
        is_pinned: postData.is_pinned,
        is_urgent: postData.is_urgent,
        created_by: profile.id,
      }]);
      if (error) throw error;
      fetchAnnouncements();
    } catch (err) {
      console.error('Error posting announcement:', err);
      alert('Failed to post announcement.');
    }
  };

  const filtered = announcements.filter((a) => {
    if (courseFilter !== 'all' && a.subject_id !== courseFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.content.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const subjectCode = (id) => subjects.find((s) => s.id === id)?.subject_code;

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Updates from your instructors and courses."
      />

      {/* Toolbar */}
      <div className="ws-card mb-4 px-3 py-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements…"
            className="ws-input w-full pl-8"
          />
        </div>
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="ws-input">
          <option value="all">All courses</option>
          <option value="">Global</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.subject_code}</option>
          ))}
        </select>
      </div>

      {profile?.role === 'teacher' && (
        <div className="ws-card mb-5 overflow-hidden">
          <PostComposer
            onSubmit={handlePostAnnouncement}
            subjects={subjects.map((s) => ({ id: s.id, code: s.subject_code }))}
            showPinOption
            placeholder="Post a new announcement to your classes…"
          />
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="ws-card flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="ws-card">
          <EmptyState
            icon={<Megaphone className="w-7 h-7" />}
            title={search || courseFilter !== 'all' ? 'No announcements match' : 'No announcements yet'}
            description="Check back later for updates from your instructors."
          />
        </div>
      ) : (
        <div className="ws-card divide-y divide-slate-100">
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className="w-full px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-semibold px-1.5 py-px rounded ${a.subject_id ? 'text-primary-700 bg-primary-50' : 'text-slate-600 bg-slate-100'}`}>
                  {a.subject_id ? subjectCode(a.subject_id) || 'Subject' : 'Global'}
                </span>
                {a.is_pinned && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-1.5 py-px rounded">
                    <Pin className="w-3 h-3" /> Pinned
                  </span>
                )}
                {a.is_urgent && (
                  <span className="text-[11px] font-medium text-red-600 bg-red-50 px-1.5 py-px rounded">Urgent</span>
                )}
                <span className="ml-auto text-[11.5px] text-slate-400 whitespace-nowrap">{timeAgo(a.created_at)}</span>
              </div>
              <h2 className="mt-1.5 text-[14px] font-semibold text-slate-900">{a.title}</h2>
              <p className="mt-0.5 text-[12.5px] text-slate-500 line-clamp-2 whitespace-pre-wrap">{a.content}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-slate-400">
                <Avatar name={a.profiles?.full_name} size={18} />
                {a.profiles?.full_name || 'Instructor'}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || ''}
        subtitle={selected ? `${selected.profiles?.full_name || 'Instructor'} · ${new Date(selected.created_at).toLocaleString()}` : ''}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold px-1.5 py-px rounded ${selected.subject_id ? 'text-primary-700 bg-primary-50' : 'text-slate-600 bg-slate-100'}`}>
                {selected.subject_id ? subjectCode(selected.subject_id) || 'Subject' : 'Global'}
              </span>
              {selected.is_pinned && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-1.5 py-px rounded">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}
              {selected.is_urgent && (
                <span className="text-[11px] font-medium text-red-600 bg-red-50 px-1.5 py-px rounded">Urgent</span>
              )}
            </div>
            <p className="text-[13.5px] text-slate-700 whitespace-pre-wrap leading-relaxed">{selected.content}</p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
