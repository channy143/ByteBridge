import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import Avatar from '../components/ui/Avatar';
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
  Loader2,
  FolderOpen,
  User,
} from 'lucide-react';

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

export default function Materials() {
  const { profile } = useAuth();
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

  const isTeacher = profile?.role === 'teacher';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subjRes, modRes, tsRes] = await Promise.all([
        supabase.from('subjects').select('id, subject_code, subject_title, description'),
        supabase
          .from('modules')
          .select('*, course_materials (*), module_progress (*)')
          .order('order_index', { ascending: true }),
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
      setSubjects(subjRes.data || []);
      setModules(modRes.data || []);
      if (modRes.data?.length > 0) {
        setExpandedModules({ [modRes.data[0].id]: true });
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

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Video': return <Video className="w-4 h-4 text-red-500" />;
      case 'Link': return <LinkIcon className="w-4 h-4 text-blue-500" />;
      default: return <FileText className="w-4 h-4 text-amber-500" />;
    }
  };

  const selected = subjects.find((s) => s.id === selectedId);
  const selectedMods = selected ? courseModules(selected.id) : [];
  const selectedProgress = getProgress(selectedMods);

  return (
    <div>
      {!selected ? (
        <>
          <PageHeader
            title="Courses"
            subtitle="Access your subjects, modules, and learning materials."
          />

          {loading ? (
            <div className="ws-card flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
            </div>
          ) : subjects.length === 0 ? (
            <div className="ws-card">
              <EmptyState
                icon={<BookOpen className="w-7 h-7" />}
                title="No courses yet"
                description="Courses will appear here once they are published."
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
                          {s.description || 'No description yet — course details are coming soon.'}
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
                        <span className="text-[10.5px] text-slate-400 whitespace-nowrap">· Course Teacher</span>
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
                        <span className="text-[11px] text-slate-500">You manage this course</span>
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
            <ChevronLeft className="w-4 h-4" /> All courses
          </button>

          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-bold text-slate-900 tracking-tight">{selected.subject_title}</h1>
                <span className="text-[12px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                  {selected.subject_code}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] text-slate-500">
                {selected.description || 'Course materials and modules.'}
              </p>
              {getTeacher(selected) && (
                <div className="mt-2 flex items-center gap-2">
                  <Avatar name={getTeacher(selected)?.full_name} size={24} />
                  <span className="text-[12.5px] font-medium text-slate-700">{getTeacher(selected)?.full_name}</span>
                  <span className="text-[11px] text-slate-400">· Course Teacher</span>
                </div>
              )}
              {!isTeacher && (
                <div className="flex items-center gap-2 mt-2.5">
                  <ProgressBar value={selectedProgress} className="w-40" />
                  <span className="text-[11.5px] text-slate-400">
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

          {loading ? (
            <div className="ws-card flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
            </div>
          ) : courseModules(selected.id).length === 0 ? (
            <div className="ws-card">
              <EmptyState
                icon={<FolderOpen className="w-7 h-7" />}
                title="No modules yet"
                description="Course materials will appear here once modules are created."
                action={isTeacher ? (
                  <button onClick={() => setShowAddModule(true)} className="ws-btn-primary">
                    <Plus className="w-4 h-4" /> Add Module
                  </button>
                ) : null}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {courseModules(selected.id).map((mod, idx) => (
                <div key={mod.id} className="ws-card overflow-hidden">
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center min-w-0">
                      {!isTeacher &&
                        (isModuleCompleted(mod) ? (
                          <CheckCircle className="w-[18px] h-[18px] text-emerald-500 mr-3 flex-shrink-0" />
                        ) : (
                          <Circle className="w-[18px] h-[18px] text-slate-300 mr-3 flex-shrink-0" />
                        ))}
                      {isTeacher && (
                        <span className="w-6 h-6 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center text-[11px] font-bold mr-3 flex-shrink-0">
                          {idx + 1}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold text-slate-800 truncate">{mod.title}</p>
                        {mod.description && <p className="text-[11.5px] text-slate-400 truncate">{mod.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <span className="text-[11.5px] text-slate-400 whitespace-nowrap">
                        {mod.course_materials?.length || 0} items
                      </span>
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
                            <CheckCircle className="w-3.5 h-3.5" /> Mark as Completed
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
    </div>
  );
}
