import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Drawer from '../components/ui/Drawer';
import Avatar from '../components/ui/Avatar';
import { Skeleton, SkeletonCircle } from '../components/ui/Skeleton';
import {
  Search, Megaphone, Pin, Plus, X,
  FileText, Image as ImageIcon, Video, Link2,
} from 'lucide-react';
import { timeAgo } from '../lib/status';

const ANNOUNCEMENT_TYPES = ['General', 'Course Update', 'Reminder', 'Schedule', 'Material', 'Important'];

const isUrgent = (a) => a.is_urgent || (a.type || 'General') === 'Important';

const attachmentMeta = (a) => {
  const t = (a.file_type || '').toLowerCase();
  const ext = (a.file_name || '').split('.').pop().toLowerCase();
  if (t === 'image' || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    return { icon: ImageIcon, cls: 'text-violet-600 bg-violet-50' };
  }
  if (t === 'video' || ['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
    return { icon: Video, cls: 'text-sky-600 bg-sky-50' };
  }
  if (t === 'pdf' || ext === 'pdf') {
    return { icon: FileText, cls: 'text-rose-600 bg-rose-50' };
  }
  return { icon: Link2, cls: 'text-slate-500 bg-slate-100' };
};

const inferFileType = (name, url) => {
  const ext = (name || url || '').split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  return 'link';
};

const formatFullDate = (iso) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
};

function NewAnnouncementModal({ open, onClose, subjects, onSubmit }) {
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState('General');
  const [urgent, setUrgent] = useState(false);
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([{ name: '', url: '' }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setSubjectId('');
      setType('General');
      setUrgent(false);
      setContent('');
      setAttachments([{ name: '', url: '' }]);
    }
  }, [open]);

  if (!open) return null;

  const validAttachments = attachments.filter((a) => a.name.trim() && a.url.trim());
  const canSubmit = title.trim() && content.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    await onSubmit({
      title: title.trim(),
      content: content.trim(),
      subject_id: subjectId || null,
      type,
      is_urgent: urgent,
      attachments: validAttachments,
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative ws-card w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="ws-card-header">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Create Announcement</h3>
            <p className="text-[12px] text-slate-500 mt-0.5">Share updates and important information with your students.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="ws-label block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Laboratory Schedule Update"
              required
              className="ws-input w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ws-label block mb-1">Course</label>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="ws-input w-full">
                <option value="">Global (All courses)</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.subject_code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="ws-label block mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="ws-input w-full">
                {ANNOUNCEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="ws-label block mb-1">Priority</label>
            <div className="flex gap-4 text-[13px] text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  checked={!urgent}
                  onChange={() => setUrgent(false)}
                  className="accent-primary-600"
                />
                Normal
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  checked={urgent}
                  onChange={() => setUrgent(true)}
                  className="accent-red-600"
                />
                Important
              </label>
            </div>
          </div>

          <div>
            <label className="ws-label block mb-1">Message</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement..."
              required
              className="ws-input w-full resize-none"
            />
          </div>

          <div>
            <label className="ws-label block mb-1">Attachments</label>
            <div className="space-y-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={att.name}
                    onChange={(e) => {
                      const next = [...attachments];
                      next[i] = { ...next[i], name: e.target.value };
                      setAttachments(next);
                    }}
                    placeholder="File name"
                    className="ws-input flex-1"
                  />
                  <input
                    value={att.url}
                    onChange={(e) => {
                      const next = [...attachments];
                      next[i] = { ...next[i], url: e.target.value };
                      setAttachments(next);
                    }}
                    placeholder="URL"
                    className="ws-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
                    disabled={attachments.length === 1}
                    className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAttachments([...attachments, { name: '', url: '' }])}
              className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-primary-700 hover:text-primary-800"
            >
              <Plus className="w-3.5 h-3.5" />
              Add attachment
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="ws-btn-secondary">Cancel</button>
            <button type="submit" disabled={loading || !canSubmit} className="ws-btn-primary">
              {loading ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Announcements() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [attachmentsMap, setAttachmentsMap] = useState({});
  const [readIds, setReadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const [courseFilter, setCourseFilter] = useState(() => searchParams.get('subject') || 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', profile.id)
      .then(({ data, error }) => {
        if (!cancelled && !error && data) {
          setReadIds(new Set(data.map((r) => r.announcement_id)));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [profile]);

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
      const list = annRes.data || [];
      setAnnouncements(list);

      if (list.length) {
        supabase
          .from('announcement_attachments')
          .select('*')
          .in('announcement_id', list.map((a) => a.id))
          .then(({ data, error }) => {
            if (!error && data) {
              const map = {};
              data.forEach((at) => {
                (map[at.announcement_id] = map[at.announcement_id] || []).push(at);
              });
              setAttachmentsMap(map);
            }
          })
          .catch(() => {});
      } else {
        setAttachmentsMap({});
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostAnnouncement = async (postData) => {
    try {
      const { data: ann, error } = await supabase
        .from('announcements')
        .insert([{
          title: postData.title,
          content: postData.content,
          subject_id: postData.subject_id,
          type: postData.type,
          is_pinned: false,
          is_urgent: postData.is_urgent,
          created_by: profile.id,
        }])
        .select()
        .single();
      if (error) throw error;

      if (postData.attachments.length) {
        supabase
          .from('announcement_attachments')
          .insert(postData.attachments.map((att) => ({
            announcement_id: ann.id,
            file_name: att.name,
            file_url: att.url,
            file_type: inferFileType(att.name, att.url),
          })))
          .catch(() => {});
      }

      setComposerOpen(false);
      fetchAnnouncements();
    } catch (err) {
      console.error('Error posting announcement:', err);
      alert('Failed to post announcement.');
    }
  };

  const markRead = (a) => {
    if (!profile) return;
    setReadIds((prev) => (prev.has(a.id) ? prev : new Set(prev).add(a.id)));
    supabase
      .from('announcement_reads')
      .insert({ announcement_id: a.id, user_id: profile.id }, { ignoreDuplicates: true })
      .catch(() => {});
  };

  const handleOpen = (a) => {
    markRead(a);
    setSelected(a);
  };

  const filtered = announcements.filter((a) => {
    if (courseFilter !== 'all' && a.subject_id !== courseFilter) return false;
    if (typeFilter !== 'all' && (a.type || 'General') !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.content.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const subjectCode = (id) => subjects.find((s) => s.id === id)?.subject_code;
  const subjectTitle = (id) => subjects.find((s) => s.id === id)?.subject_title;

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle={
          profile?.role === 'teacher'
            ? 'Share updates and important information with your students.'
            : 'Updates and important information from your instructors and courses.'
        }
        actions={
          profile?.role === 'teacher' ? (
            <button onClick={() => setComposerOpen(true)} className="ws-btn-primary">
              <Plus className="w-4 h-4" />
              New Announcement
            </button>
          ) : undefined
        }
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
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="ws-input">
          <option value="all">All types</option>
          {ANNOUNCEMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="ws-card divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-14 rounded" />
                <Skeleton className="h-3 w-16 rounded ml-auto" />
              </div>
              <Skeleton className="h-4 w-2/3 rounded mt-2.5" />
              <Skeleton className="h-3 w-full rounded mt-2" />
              <div className="flex items-center gap-2 mt-2.5">
                <SkeletonCircle size={18} />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ws-card">
          <EmptyState
            icon={<Megaphone className="w-7 h-7" />}
            title={search || courseFilter !== 'all' || typeFilter !== 'all' ? 'No announcements match' : 'No announcements yet'}
            description={search || courseFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Your instructors haven\'t posted any updates yet.'}
          />
        </div>
      ) : (
        <div>
          <h2 className="ws-section-title mb-2">Recent announcements</h2>
          <div className="ws-card divide-y divide-slate-100">
            {filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => handleOpen(a)}
                className="w-full px-5 py-3.5 text-left hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Megaphone className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                    <span className={`text-[11px] font-semibold px-1.5 py-px rounded shrink-0 ${a.subject_id ? 'text-primary-700 bg-primary-50' : 'text-slate-600 bg-slate-100'}`}>
                      {a.subject_id ? subjectCode(a.subject_id) || 'Subject' : 'Global'}
                    </span>
                    {a.subject_id && (
                      <span className="text-[11.5px] text-slate-400 truncate">{subjectTitle(a.subject_id)}</span>
                    )}
                  </span>
                  {isUrgent(a) && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-px rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      IMPORTANT
                    </span>
                  )}
                  {a.is_pinned && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-1.5 py-px rounded">
                      <Pin className="w-3 h-3" /> Pinned
                    </span>
                  )}
                  <span className="ml-auto text-[11.5px] text-slate-400 whitespace-nowrap">{timeAgo(a.created_at)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {!readIds.has(a.id) && (
                    <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0" title="Unread" />
                  )}
                  <h3 className={`text-[14px] truncate ${readIds.has(a.id) ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                    {a.title}
                  </h3>
                </div>
                <p className="mt-0.5 text-[12.5px] text-slate-500 line-clamp-2 whitespace-pre-wrap">{a.content}</p>
                {attachmentsMap[a.id]?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {attachmentsMap[a.id].map((at) => {
                      const meta = attachmentMeta(at);
                      const Icon = meta.icon;
                      return (
                        <span key={at.id} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${meta.cls}`}>
                          <Icon className="w-3 h-3 shrink-0" />
                          <span className="max-w-[160px] truncate">{at.file_name}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-slate-400">
                  <Avatar name={a.profiles?.full_name} size={18} />
                  {a.profiles?.full_name || 'Instructor'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Announcement"
        subtitle={selected
          ? `${selected.subject_id ? subjectCode(selected.subject_id) || 'Subject' : 'Global'}${selected.subject_id ? ` · ${subjectTitle(selected.subject_id) || ''}` : ''}`
          : ''}
      >
        {selected && (
          <div className="space-y-4">
            {isUrgent(selected) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-px rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                IMPORTANT
              </span>
            )}
            <h2 className="text-[16px] font-bold text-slate-900 leading-snug">{selected.title}</h2>
            <div className="flex items-center gap-2.5">
              <Avatar name={selected.profiles?.full_name} size={30} />
              <div>
                <p className="text-[12.5px] font-medium text-slate-800">
                  Posted by {selected.profiles?.full_name || 'Instructor'}
                </p>
                <p className="text-[11.5px] text-slate-400">{formatFullDate(selected.created_at)}</p>
              </div>
            </div>
            <div className="h-px bg-slate-100" />
            <p className="text-[13.5px] text-slate-700 whitespace-pre-wrap leading-relaxed">{selected.content}</p>
            {attachmentsMap[selected.id]?.length > 0 && (
              <div>
                <p className="ws-label mb-1.5">Attachments</p>
                <div className="space-y-1.5">
                  {attachmentsMap[selected.id].map((at) => {
                    const meta = attachmentMeta(at);
                    const Icon = meta.icon;
                    return (
                      <a
                        key={at.id}
                        href={at.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-2.5 py-2 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors text-[13px] text-slate-700"
                      >
                        <span className={`p-1 rounded shrink-0 ${meta.cls}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="truncate">{at.file_name}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <NewAnnouncementModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        subjects={subjects}
        onSubmit={handlePostAnnouncement}
      />
    </div>
  );
}
