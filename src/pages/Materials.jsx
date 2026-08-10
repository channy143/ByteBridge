import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import Avatar from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import {
  BookOpen,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  Link as LinkIcon,
  Download,
  ExternalLink,
  Plus,
  X,
  CheckCircle,
  Circle,
  FolderOpen,
  User,
  Search,
  Presentation,
  Code as CodeIcon,
} from 'lucide-react';
import { timeAgo } from '../lib/status';

const CARD_GRADS = [
  'from-primary-500 to-primary-700',
  'from-sky-500 to-indigo-600',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-700',
  'from-violet-500 to-purple-700',
];

const CARD_SOLIDS = [
  'bg-primary-600',
  'bg-sky-600',
  'bg-teal-600',
  'bg-orange-600',
  'bg-pink-600',
  'bg-purple-600',
];

const hashColor = (str, len) => {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % len;
};

const TABS = ['overview', 'modules', 'resources'];

const getTypeIcon = (type) => {
  switch (type) {
    case 'Video': return <Video className="w-4 h-4 text-red-500" />;
    case 'Link': return <LinkIcon className="w-4 h-4 text-blue-500" />;
    case 'Code': return <CodeIcon className="w-4 h-4 text-purple-500" />;
    case 'Presentation': return <Presentation className="w-4 h-4 text-sky-500" />;
    case 'PDF':
    case 'Document':
    default: return <FileText className="w-4 h-4 text-amber-500" />;
  }
};

const shortDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function Materials() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModule, setNewModule] = useState({ title: '', description: '' });
  const [showAddMaterial, setShowAddMaterial] = useState(null);
  const [newMaterial, setNewMaterial] = useState({ title: '', external_url: '', material_type: 'PDF' });

  const [tab, setTab] = useState('overview');
  const [matProgress, setMatProgress] = useState(new Set());
  const [liveSession, setLiveSession] = useState(null);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceType, setResourceType] = useState('all');

  const isTeacher = profile?.role === 'teacher';

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setTab('overview');
    setExpandedModules({});
    setResourceSearch('');
    setResourceType('all');
    setMatProgress(new Set());
    setLiveSession(null);
    setRecentUpdates([]);

    if (!isTeacher && profile?.id) {
      supabase
        .from('course_material_progress')
        .select('material_id')
        .eq('student_id', profile.id)
        .then(({ data, error }) => {
          if (!error && data) setMatProgress(new Set(data.map((r) => r.material_id)));
        })
        .catch(() => {});
    }

    supabase
      .from('meeting_sessions')
      .select('*, teachers (full_name)')
      .eq('subject_id', selectedId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (!error && data?.length) setLiveSession(data[0]);
      })
      .catch(() => {});

    supabase
      .from('announcements')
      .select('id, title, created_at')
      .eq('subject_id', selectedId)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data, error }) => {
        if (!error) setRecentUpdates(data || []);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const fetchData = async () => {
    try {
      let modQuery = supabase
        .from('modules')
        .select('*, course_materials (*), module_progress (*)')
        .order('order_index', { ascending: true });
      // Students only see published modules; teachers see everything.
      if (!isTeacher) modQuery = modQuery.eq('is_published', true);

      const [subjRes, modRes, tsRes] = await Promise.all([
        supabase.from('subjects').select('id, subject_code, subject_title, description'),
        modQuery,
        supabase.from('teacher_subjects').select('teacher_id, subject_id'),
      ]);
      if (subjRes.error) throw subjRes.error;
      if (modRes.error) throw modRes.error;
      if (tsRes.error) throw tsRes.error;

      const teacherIds = [...new Set((tsRes.data || []).map((t) => t.teacher_id))];
      let teachers = [];
      if (teacherIds.length > 0) {
        const tRes = await supabase.from('teachers').select('id, full_name, profiles (photo_url)').in('id', teacherIds);
        if (tRes.error) throw tRes.error;
        teachers = tRes.data || [];
      }
      const teacherInfo = Object.fromEntries(
        teachers.map((t) => [t.id, { full_name: t.full_name, photo_url: t.profiles?.photo_url }])
      );

      setTeacherAssignments(
        Object.fromEntries((tsRes.data || []).map((t) => [t.subject_id, teacherInfo[t.teacher_id] || null]))
      );
let visibleSubjects = subjRes.data || [];
      if (isTeacher) {
        const mine = new Set((tsRes.data || []).map((t) => t.subject_id));
        visibleSubjects = visibleSubjects.filter((s) => mine.has(s.id));
      } else if (profile?.id) {
        const { data: enr } = await supabase
          .from('enrollments')
          .select('subject_id')
          .eq('student_id', profile.id);
        const mine = new Set((enr || []).map((e) => e.subject_id));
        visibleSubjects = visibleSubjects.filter((s) => mine.has(s.id));
      }
      setSubjects(visibleSubjects);
      setModules(modRes.data || []);

      const target = searchParams.get('subject');
      if (target && visibleSubjects.some((s) => s.id === target)) {
        setSelectedId(target);
      }
    } catch (err) {
      console.error('Error fetching modules:', err);
    } finally {
      setLoading(false);
    }
  };

  const courseModules = (subjectId) => {
    const owned = modules.filter((m) => m.subject_id === subjectId);
    return owned.length > 0 ? owned : modules.filter((m) => m.subject_id == null);
  };

  const getTeacher = (subject) => (subject ? teacherAssignments[subject.id] : undefined);

  const materialCount = (mods) =>
    mods.reduce((n, m) => n + (m.course_materials?.length || 0), 0);

  const getProgress = (mods) => {
    if (mods.length === 0) return 0;
    const done = mods.filter((m) =>
      m.module_progress?.some((p) => p.student_id === profile?.id && p.completed)
    ).length;
    return Math.round((done / mods.length) * 100);
  };

  const isModuleCompleted = (mod) =>
    mod.module_progress?.some((p) => p.student_id === profile?.id && p.completed);

  const moduleItemsDone = (mod) =>
    (mod.course_materials || []).filter((mat) => matProgress.has(mat.id)).length;

  const itemsLine = (mod) => {
    const mats = mod.course_materials || [];
    const videos = mats.filter((m) => m.material_type === 'Video').length;
    const links = mats.filter((m) => m.material_type === 'Link').length;
    let line = `${mats.length} item${mats.length === 1 ? '' : 's'}`;
    if (videos) line += ` · ${videos} video${videos === 1 ? '' : 's'}`;
    if (links) line += ` · ${links} link${links === 1 ? '' : 's'}`;
    return line;
  };

  const toggleModule = (id) => setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleMarkComplete = async (moduleId) => {
    try {
      const { error } = await supabase.from('module_progress').upsert({
        student_id: profile.id,
        module_id: moduleId,
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'student_id,module_id' });
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error marking module complete:', err);
    }
  };

  const toggleMaterial = async (mat) => {
    if (!profile) return;
    const done = matProgress.has(mat.id);
    setMatProgress((prev) => {
      const next = new Set(prev);
      if (done) next.delete(mat.id);
      else next.add(mat.id);
      return next;
    });
    if (done) {
      supabase
        .from('course_material_progress')
        .delete()
        .eq('student_id', profile.id)
        .eq('material_id', mat.id)
        .catch(() => {});
    } else {
      supabase
        .from('course_material_progress')
        .upsert({
          student_id: profile.id,
          material_id: mat.id,
          completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'student_id,material_id' })
        .catch(() => {});
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('modules').insert([{
        ...newModule,
        subject_id: selectedId,
        created_by: profile.id,
        order_index: courseModules(selectedId).length,
      }]);
      if (error) throw error;
      setNewModule({ title: '', description: '' });
      setShowAddModule(false);
      fetchData();
    } catch (err) {
      console.error('Error adding module:', err);
    }
  };

  const handleAddMaterial = async (e, moduleId) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('course_materials').insert([{
        module_id: moduleId,
        title: newMaterial.title,
        external_url: newMaterial.external_url,
        material_type: newMaterial.material_type,
      }]);
      if (error) throw error;
      setNewMaterial({ title: '', external_url: '', material_type: 'PDF' });
      setShowAddMaterial(null);
      fetchData();
    } catch (err) {
      console.error('Error adding material:', err);
    }
  };

  const selected = subjects.find((s) => s.id === selectedId);
  const selectedMods = selected ? courseModules(selected.id) : [];
  const selectedProgress = getProgress(selectedMods);
  const allMaterials = selectedMods.flatMap((m) => m.course_materials || []);
  const materialsDone = allMaterials.filter((mat) => matProgress.has(mat.id)).length;
  const modulesDone = selectedMods.filter(isModuleCompleted).length;
  const nextModule = selectedMods.find((m) => !isModuleCompleted(m));
  const nextModuleIdx = selectedMods.findIndex((m) => m.id === nextModule?.id);
  const syllabus = allMaterials.find((m) => (m.title || '').toLowerCase().includes('syllabus'));
  const resourceUrl = (m) => m.external_url || m.file_url;
  const resourceTypes = ['all', ...new Set(allMaterials.map((m) => m.material_type).filter(Boolean))];
  const filteredResources = allMaterials.filter((m) => {
    if (resourceType !== 'all' && m.material_type !== resourceType) return false;
    if (resourceSearch && !m.title.toLowerCase().includes(resourceSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {!selected ? (
        <>
          <PageHeader
            title="Subjects"
            subtitle="Access your subjects, modules, and learning materials."
          />

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="ws-card overflow-hidden flex flex-col">
                  {/* Cover */}
                  <div className="relative h-[104px] flex-shrink-0 bg-slate-200/80">
                    <div className="px-4 pt-3.5 space-y-2">
                      <Skeleton className="h-4 w-16 rounded-full bg-slate-300/60" />
                      <Skeleton className="h-4 w-3/4 rounded bg-slate-300/60" />
                      <Skeleton className="h-3 w-1/2 rounded bg-slate-300/60" />
                    </div>
                  </div>
                  {/* Body + teacher circle */}
                  <div className="relative flex-1 px-4 pb-4 pt-12 space-y-3">
                    <div className="absolute -top-6 right-[46px] w-[86px] h-[86px] rounded-full bg-slate-200 ring-4 ring-white" />
                    <Skeleton className="h-3 w-1/3 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                    <div className="flex items-center gap-2.5 pt-1 border-t border-slate-100">
                      <Skeleton className="h-2 flex-1 rounded" />
                      <Skeleton className="h-2.5 w-8 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <div className="ws-card">
              <EmptyState
                icon={<BookOpen className="w-7 h-7" />}
                title="No subjects yet"
                description="Subjects will appear here once they are published."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {subjects.map((s) => {
                const mods = courseModules(s.id);
                const progress = getProgress(mods);
                const matCount = materialCount(mods);
                const teacher = getTeacher(s);
                const teacherName = teacher?.full_name;
                const teacherPhoto = teacher?.photo_url;
                const colorIdx = hashColor(s.id, CARD_GRADS.length);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className="ws-card group text-left flex flex-col overflow-hidden hover:shadow-lg hover:-translate-y-0.5 hover:border-primary-200 transition-all duration-200 appearance-none p-0"
                  >
                    {/* Colored cover: from the top down below the course title */}
                    <div className={`relative flex-shrink-0 w-full ${CARD_SOLIDS[colorIdx]} bg-gradient-to-br ${CARD_GRADS[colorIdx]}`}>
                      <div className="px-4 pt-3.5 pb-8 pr-[160px]">
                        <span className="inline-block mb-2 text-[10.5px] font-bold text-white/95 bg-white/15 backdrop-blur px-2 py-0.5 rounded-full">
                          {s.subject_code}
                        </span>
                        <h3 className="text-[15px] font-bold text-white leading-snug drop-shadow-sm">{s.subject_title}</h3>
                        <p className="mt-1 text-[11.5px] text-white/80 leading-relaxed line-clamp-2">
                          {s.description || 'No description yet — subject details are coming soon.'}
                        </p>
                      </div>
                      {/* Teacher profile circle (photo, or random-color first letter) */}
                      <span className={`absolute right-[56px] bottom-0 translate-y-1/2 w-[86px] h-[86px] rounded-full ring-4 ring-white shadow-md flex items-center justify-center overflow-hidden flex-shrink-0 ${teacherPhoto ? '' : `${CARD_SOLIDS[colorIdx]} text-white`}`}>
                        {teacherPhoto ? (
                          <img src={teacherPhoto} alt={teacherName || 'teacher'} className="w-full h-full object-cover" />
                        ) : teacherName ? (
                          <span className="text-[28px] font-bold leading-none">{teacherName.charAt(0).toUpperCase()}</span>
                        ) : (
                          <User className="w-7 h-7 text-white/70" />
                        )}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="px-4 pt-3 pr-[150px] pb-[76px] flex-1 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-800 truncate">
                          {teacherName || 'To be assigned'}
                        </p>
                        <span className="text-[10.5px] text-slate-400 whitespace-nowrap">· Subject Teacher</span>
                      </div>
                      <p className="text-[11px] text-slate-400 whitespace-nowrap">
                        {mods.length} module{mods.length === 1 ? '' : 's'} · {matCount} item{matCount === 1 ? '' : 's'}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2.5 flex-shrink-0">
                      {!isTeacher ? (
                        <>
                          <ProgressBar value={progress} className="flex-1" />
                          <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">{progress}%</span>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-500">You manage this subject</span>
                      )}
                      <span className="ml-auto flex items-center gap-0.5 text-[11px] font-semibold text-primary-600 group-hover:text-primary-700">
                        Open
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <button
            onClick={() => setSelectedId(null)}
            className="mb-3 flex items-center gap-1 text-[12.5px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> All subjects
          </button>

          {/* Course header */}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-bold text-slate-900 tracking-tight">{selected.subject_title}</h1>
                <span className="text-[12px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                  {selected.subject_code}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] text-slate-500">
                {selected.description || 'Subject materials and modules.'}
              </p>
              {getTeacher(selected) && (
                <div className="mt-2 flex items-center gap-2">
                  <Avatar name={getTeacher(selected)?.full_name} size={24} />
                  <span className="text-[12.5px] font-medium text-slate-700">{getTeacher(selected)?.full_name}</span>
                  <span className="text-[11px] text-slate-400">· Subject Teacher</span>
                </div>
              )}
              {!isTeacher && (
                <div className="flex items-center gap-2 mt-2.5">
                  <ProgressBar value={selectedProgress} className="w-full" />
                  <span className="text-[11.5px] text-slate-400 whitespace-nowrap">
                    {selectedProgress}% complete
                  </span>
                </div>
              )}
            </div>
            {isTeacher && (
              <button onClick={() => setShowAddModule(!showAddModule)} className="ws-btn-primary">
                <Plus className="w-4 h-4" /> Add Module
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 mb-5 w-fit">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3.5 py-1.5 rounded-md text-[12.5px] font-medium capitalize transition-colors ${
                  tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="ws-card p-5">
                <Skeleton className="h-5 w-1/3 rounded mb-3" />
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-2/3 rounded mt-2" />
              </div>
              <div className="ws-card p-5 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-1/2 rounded" />
                      <Skeleton className="h-2.5 w-full rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* ============ OVERVIEW ============ */}
              {tab === 'overview' && (
                <div className="space-y-5">
                  {!isTeacher && (
                    <>
                      <div>
                        <h2 className="ws-section-title mb-2">Continue learning</h2>
                        {nextModule ? (
                          <div className="ws-card p-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-primary-700">
                                Module {nextModuleIdx + 1} · {nextModule.title}
                              </p>
                              <p className="text-[12.5px] text-slate-500 mt-0.5 line-clamp-1">
                                {nextModule.description || 'Continue working through this module.'}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-1">{itemsLine(nextModule)}</p>
                            </div>
                            <button
                              onClick={() => {
                                setTab('modules');
                                setExpandedModules((prev) => ({ ...prev, [nextModule.id]: true }));
                              }}
                              className="ws-btn-primary"
                            >
                              Continue
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : selectedMods.length > 0 ? (
                          <div className="ws-card px-4 py-3.5 text-[13px] text-slate-500">
                            You're all caught up — every module is complete.
                          </div>
                        ) : (
                          <div className="ws-card px-4 py-3.5 text-[13px] text-slate-500">
                            No modules yet — check back soon.
                          </div>
                        )}
                      </div>

                      <div>
                        <h2 className="ws-section-title mb-2">Your progress</h2>
                        <div className="ws-card p-4 space-y-4">
                          <div>
                            <div className="flex justify-between text-[12px] text-slate-500 mb-1.5">
                              <span className="font-medium">Modules</span>
                              <span>{modulesDone} / {selectedMods.length} completed</span>
                            </div>
                            <ProgressBar value={selectedMods.length ? Math.round((modulesDone / selectedMods.length) * 100) : 0} />
                          </div>
                          <div>
                            <div className="flex justify-between text-[12px] text-slate-500 mb-1.5">
                              <span className="font-medium">Materials</span>
                              <span>{materialsDone} / {allMaterials.length} completed</span>
                            </div>
                            <ProgressBar value={allMaterials.length ? Math.round((materialsDone / allMaterials.length) * 100) : 0} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <h2 className="ws-section-title mb-2">Live class</h2>
                    {liveSession ? (
                      <div className="ws-card p-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                          </span>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800">
                              {liveSession.teachers?.full_name || 'A teacher'} is teaching now
                            </p>
                            <p className="text-[11px] text-slate-400">{selected.subject_code} · {liveSession.room_name}</p>
                          </div>
                        </div>
                        <button onClick={() => navigate('/classroom')} className="ws-btn-primary">
                          Join classroom
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="ws-card px-4 py-3 text-[12.5px] text-slate-500">No live class right now.</div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="ws-section-title">Recent updates</h2>
                      <button
                        onClick={() => navigate('/announcements')}
                        className="text-[12px] font-medium text-primary-600 hover:text-primary-700"
                      >
                        View all updates →
                      </button>
                    </div>
                    <div className="ws-card divide-y divide-slate-100">
                      {recentUpdates.length > 0 ? (
                        recentUpdates.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => navigate('/announcements')}
                            className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-slate-50/60 transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                            <span className="text-[13px] font-medium text-slate-700 truncate">{u.title}</span>
                            <span className="ml-auto text-[11.5px] text-slate-400 whitespace-nowrap">{timeAgo(u.created_at)}</span>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-[12.5px] text-slate-400">No updates posted yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ============ MODULES ============ */}
              {tab === 'modules' && (
                <>
                  {showAddModule && isTeacher && (
                    <form onSubmit={handleAddModule} className="ws-card p-4 mb-4 space-y-3">
                      <input
                        required
                        value={newModule.title}
                        onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                        placeholder="Module title"
                        className="ws-input w-full"
                      />
                      <textarea
                        rows={2}
                        value={newModule.description}
                        onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                        placeholder="Description (optional)"
                        className="ws-input w-full resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowAddModule(false)} className="ws-btn-secondary">Cancel</button>
                        <button type="submit" className="ws-btn-primary"><Plus className="w-4 h-4" /> Create Module</button>
                      </div>
                    </form>
                  )}

                  {selectedMods.length === 0 ? (
                    <div className="ws-card">
                      <EmptyState
                        icon={<FolderOpen className="w-7 h-7" />}
                        title="No modules yet"
                        description="Materials will appear here once modules are created."
                        action={isTeacher ? (
                          <button onClick={() => setShowAddModule(true)} className="ws-btn-primary">
                            <Plus className="w-4 h-4" /> Add Module
                          </button>
                        ) : null}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedMods.map((mod, idx) => (
                        <div key={mod.id} className="ws-card overflow-hidden">
                          <button
                            onClick={() => toggleModule(mod.id)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/60 transition-colors"
                          >
                            <div className="flex items-center min-w-0">
                              <span className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-bold mr-3 flex-shrink-0">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[13.5px] font-semibold text-slate-800 truncate">{mod.title}</p>
                                {mod.description && <p className="text-[11.5px] text-slate-400 truncate">{mod.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-3">
                              {!isTeacher ? (
                                isModuleCompleted(mod) ? (
                                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                    ✓ Complete
                                  </span>
                                ) : (
                                  <span className="text-[11.5px] text-slate-400 whitespace-nowrap">
                                    {moduleItemsDone(mod)} / {mod.course_materials?.length || 0} completed
                                  </span>
                                )
                              ) : (
                                <span className="text-[11.5px] text-slate-400 whitespace-nowrap">
                                  {mod.course_materials?.length || 0} items
                                </span>
                              )}
                              {expandedModules[mod.id] ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </button>

                          {expandedModules[mod.id] && (
                            <div className="px-4 pb-3 border-t border-slate-100">
                              {mod.course_materials && mod.course_materials.length > 0 ? (
                                <ul className="divide-y divide-slate-100">
                                  {mod.course_materials.map((mat) => (
                                    <li key={mat.id} className="py-2 flex items-center justify-between gap-3 group">
                                      <div className="flex items-center min-w-0">
                                        {!isTeacher && (
                                          <button
                                            onClick={() => toggleMaterial(mat)}
                                            className="mr-2 flex-shrink-0"
                                            title={matProgress.has(mat.id) ? 'Mark as not completed' : 'Mark as completed'}
                                          >
                                            {matProgress.has(mat.id) ? (
                                              <CheckCircle className="w-[18px] h-[18px] text-emerald-500" />
                                            ) : (
                                              <Circle className="w-[18px] h-[18px] text-slate-300 hover:text-slate-400" />
                                            )}
                                          </button>
                                        )}
                                        {getTypeIcon(mat.material_type)}
                                        <span className="ml-2.5 text-[13px] font-medium text-slate-700 truncate">{mat.title}</span>
                                        <span className="ml-2 text-[10.5px] text-slate-400 bg-slate-100 px-1.5 py-px rounded flex-shrink-0">
                                          {mat.material_type}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        {mat.external_url && (
                                          <a href={mat.external_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-primary-600 hover:bg-primary-50" title="Open">
                                            <ExternalLink className="w-4 h-4" />
                                          </a>
                                        )}
                                        {mat.file_url && (
                                          <a href={mat.file_url} download className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Download">
                                            <Download className="w-4 h-4" />
                                          </a>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[12.5px] text-slate-400 py-3 text-center">No materials in this module yet.</p>
                              )}

                              {isTeacher && (
                                <div className="mt-2 pt-2.5 border-t border-slate-100">
                                  {showAddMaterial === mod.id ? (
                                    <form onSubmit={(e) => handleAddMaterial(e, mod.id)} className="flex flex-wrap items-center gap-2">
                                      <input required placeholder="Material title" value={newMaterial.title}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                                        className="ws-input flex-1 min-w-[160px]" />
                                      <input type="url" placeholder="External URL" value={newMaterial.external_url}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, external_url: e.target.value })}
                                        className="ws-input flex-1 min-w-[160px]" />
                                      <select value={newMaterial.material_type}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, material_type: e.target.value })}
                                        className="ws-input">
                                        <option>PDF</option><option>Video</option><option>Link</option>
                                        <option>Document</option><option>Presentation</option><option>Code</option>
                                      </select>
                                      <button type="button" onClick={() => setShowAddMaterial(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                                        <X className="w-4 h-4" />
                                      </button>
                                      <button type="submit" className="ws-btn-primary text-[12px] px-2.5 py-1.5">Add</button>
                                    </form>
                                  ) : (
                                    <button onClick={() => setShowAddMaterial(mod.id)} className="flex items-center gap-1 text-[12.5px] font-medium text-primary-600 hover:text-primary-700">
                                      <Plus className="w-3.5 h-3.5" /> Add Material
                                    </button>
                                  )}
                                </div>
                              )}

                              {!isTeacher && !isModuleCompleted(mod) && (
                                <div className="mt-2 pt-2.5 border-t border-slate-100">
                                  <button onClick={() => handleMarkComplete(mod.id)} className="flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-600 hover:text-emerald-700">
                                    <CheckCircle className="w-3.5 h-3.5" /> Mark module as Completed
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ============ RESOURCES ============ */}
              {tab === 'resources' && (
                <div className="space-y-4">
                  {syllabus && (
                    <div className="ws-card p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
                          <FileText className="w-5 h-5" />
                        </span>
                        <div>
                          <p className="text-[13.5px] font-semibold text-slate-800">Semester Syllabus</p>
                          <p className="text-[11.5px] text-slate-400">{selected.subject_code} · {selected.subject_title}</p>
                        </div>
                      </div>
                      {resourceUrl(syllabus) && (
                        <a href={resourceUrl(syllabus)} target="_blank" rel="noreferrer" className="ws-btn-secondary">
                          View syllabus
                          <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}

                  <div className="ws-card overflow-hidden">
                    <div className="ws-card-header">
                      <div className="relative w-full max-w-xs">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          value={resourceSearch}
                          onChange={(e) => setResourceSearch(e.target.value)}
                          placeholder="Search resources…"
                          className="ws-input w-full pl-8"
                        />
                      </div>
                      <select value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="ws-input">
                        {resourceTypes.map((t) => (
                          <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>
                        ))}
                      </select>
                    </div>

                    {filteredResources.length > 0 ? (
                      <table className="ws-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredResources.map((m) => {
                            const url = resourceUrl(m);
                            return (
                              <tr key={m.id} className="hover:bg-slate-50/60">
                                <td>
                                  {url ? (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700 hover:text-primary-700"
                                    >
                                      {getTypeIcon(m.material_type)}
                                      <span className="truncate max-w-[300px]">{m.title}</span>
                                      <ExternalLink className="w-3 h-3 text-slate-300" />
                                    </a>
                                  ) : (
                                    <span className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700">
                                      {getTypeIcon(m.material_type)}
                                      <span className="truncate max-w-[300px]">{m.title}</span>
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className="text-[10.5px] text-slate-500 bg-slate-100 px-1.5 py-px rounded">
                                    {m.material_type}
                                  </span>
                                </td>
                                <td className="text-slate-400 whitespace-nowrap">{shortDate(m.created_at)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="px-4 py-10 text-center">
                        <p className="text-[13px] font-medium text-slate-600">
                          {allMaterials.length > 0 ? 'No resources match' : 'No resources yet'}
                        </p>
                        <p className="text-[12px] text-slate-400 mt-0.5">
                          {allMaterials.length > 0
                            ? 'Try adjusting your search or filters.'
                            : 'Materials will appear here once the teacher adds them.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
