import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Skeleton } from '../components/ui/Skeleton';
import StatusBadge from '../components/ui/StatusBadge';
import { timeAgo, formatDue } from '../lib/status';
import {
  ArrowLeft, Users, FolderOpen, ClipboardList, Megaphone, Video, CalendarClock,
  Plus, Edit2, Trash2, ChevronDown, ChevronUp, FileText, Link2, Image as ImageIcon,
  Upload, X, Loader2, Save, CalendarDays, Inbox, ShieldAlert,
  CheckCircle2, ExternalLink,
} from 'lucide-react';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'modules', label: 'Modules' },
  { key: 'activities', label: 'Activities' },
  { key: 'materials', label: 'Materials' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'students', label: 'Students' },
  { key: 'classroom', label: 'Classroom' },
];

const ACTIVITY_TYPES = ['Assignment', 'Project', 'Quiz', 'Performance Task', 'Activity', 'Practical Task'];
const MATERIAL_TYPES = ['PDF', 'Document', 'Video', 'Image', 'Link'];

const TYPE_ICON = {
  PDF: FileText, Document: FileText, Video: Video, Image: ImageIcon, Link: Link2,
};

export default function TeacherSubjectPage() {
  const { subjectId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [notAssigned, setNotAssigned] = useState(false);
  const [subject, setSubject] = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab');
    return TABS.some((x) => x.key === t) ? t : 'overview';
  });

  const [modules, setModules] = useState([]);
  const [activities, setActivities] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);

  // Module modal
  const [moduleModal, setModuleModal] = useState(null); // { mode: 'create' | 'edit', id }
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [moduleSaving, setModuleSaving] = useState(false);

  // Material modal
  const [materialModal, setMaterialModal] = useState(null); // moduleId
  const [materialForm, setMaterialForm] = useState({ title: '', material_type: 'PDF', url: '' });
  const [materialSaving, setMaterialSaving] = useState(false);

  // Activity modal
  const [activityModal, setActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({
    title: '', description: '', activity_type: 'Assignment', deadline: '', points: 100, grading_criteria: '',
  });
  const [activitySaving, setActivitySaving] = useState(false);

  // Review drawer
  const [reviewId, setReviewId] = useState(null);
  const [gradeDraft, setGradeDraft] = useState({});

  // Announcement modal
  const [annModal, setAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', content: '', is_urgent: false });
  const [annSaving, setAnnSaving] = useState(false);

  // Schedule modal
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ title: '', starts_at: '', ends_at: '' });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: subj } = await supabase.from('subjects').select('*').eq('id', subjectId).maybeSingle();
      setSubject(subj || null);

      const { data: ts } = await supabase
        .from('teacher_subjects')
        .select('teachers (full_name)')
        .eq('teacher_id', profile.id)
        .eq('subject_id', subjectId);
      setNotAssigned(!ts || ts.length === 0);
      setTeacherName(ts?.[0]?.teachers?.full_name || '');

      const [{ data: mods }, { data: acts }, { data: anns }, { data: scheds }, { data: enr }] = await Promise.all([
        supabase
          .from('modules')
          .select('*, course_materials (*)')
          .eq('subject_id', subjectId)
          .order('order_index', { ascending: true }),
        supabase
          .from('activities')
          .select('*, submissions (*)')
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('announcements')
          .select('*')
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('class_schedules')
          .select('*')
          .eq('subject_id', subjectId)
          .order('starts_at', { ascending: true }),
        supabase.from('enrollments').select('student_id').eq('subject_id', subjectId),
      ]);

      setModules(mods || []);
      setActivities(acts || []);
      setAnnouncements(anns || []);
      setSchedules(scheds || []);

      const studentIds = (enr || []).map((e) => e.student_id);
      if (studentIds.length > 0) {
        const { data: st } = await supabase
          .from('students')
          .select('id, student_id, full_name')
          .in('id', studentIds);
        const list = st || [];

        const modIds = (mods || []).map((m) => m.id);
        let progress = [];
        if (modIds.length > 0) {
          const { data: prog } = await supabase
            .from('module_progress')
            .select('student_id, module_id, completed')
            .in('module_id', modIds);
          progress = prog || [];
        }

        const submissions = (acts || []).flatMap((a) => a.submissions || []);
        const now = Date.now();
        const perStudent = list.map((s) => {
          const doneMods = new Set(progress.filter((p) => p.student_id === s.id && p.completed).map((p) => p.module_id));
          const mySubs = submissions.filter((sub) => sub.student_id === s.id).map((sub) => sub.activity_id);
          const doneActs = submissions.filter((sub) => sub.student_id === s.id && ['Submitted', 'Late', 'Graded'].includes(sub.status)).length;
          const missing = (acts || []).filter((a) => {
            if (mySubs.includes(a.id)) return false;
            return a.deadline && new Date(a.deadline).getTime() < now;
          }).length;
          return {
            ...s,
            doneModules: doneMods.size,
            totalModules: modIds.length,
            completed: doneActs,
            missing,
            progress: modIds.length ? Math.round((doneMods.size / modIds.length) * 100) : 0,
          };
        });
        setStudents(perStudent);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error('Error loading subject:', err);
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
    if (profile) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, subjectId]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && TABS.some((x) => x.key === t)) setTab(t);
  }, [searchParams]);

  // --- Modules -------------------------------------------------------------

  const openModuleModal = (mode, mod = null) => {
    setModuleModal({ mode, id: mod?.id || null });
    setModuleForm({
      title: mode === 'edit' ? mod.title : '',
      description: mode === 'edit' ? mod.description || '' : '',
    });
  };

  const saveModule = async (e) => {
    e.preventDefault();
    setModuleSaving(true);
    try {
      if (moduleModal.mode === 'create') {
        const maxIdx = modules.reduce((mx, m) => Math.max(mx, m.order_index || 0), 0);
        const { error } = await supabase.from('modules').insert({
          subject_id: subjectId,
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim() || null,
          order_index: maxIdx + 1,
          created_by: profile.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('modules')
          .update({ title: moduleForm.title.trim(), description: moduleForm.description.trim() || null })
          .eq('id', moduleModal.id);
        if (error) throw error;
      }
      setModuleModal(null);
      fetchAll();
    } catch (err) {
      console.error('Error saving module:', err);
      alert('Failed to save module.');
    } finally {
      setModuleSaving(false);
    }
  };

  const moveModule = async (index, dir) => {
    const sorted = [...modules].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    const target = index + dir;
    if (target < 0 || target >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[target];
    try {
      await supabase.from('modules').update({ order_index: b.order_index }).eq('id', a.id);
      await supabase.from('modules').update({ order_index: a.order_index }).eq('id', b.id);
      fetchAll();
    } catch (err) {
      console.error('Error reordering module:', err);
    }
  };

  const togglePublish = async (mod) => {
    try {
      const { error } = await supabase
        .from('modules')
        .update({ is_published: !mod.is_published })
        .eq('id', mod.id);
      if (error) throw error;
      fetchAll();
    } catch (err) {
      console.error('Error toggling module:', err);
      alert('Failed to update module visibility.');
    }
  };

  const deleteModule = async (mod) => {
    if (!window.confirm(`Delete "${mod.title}"? Its materials will also be removed.`)) return;
    try {
      const { error } = await supabase.from('modules').delete().eq('id', mod.id);
      if (error) throw error;
      fetchAll();
    } catch (err) {
      console.error('Error deleting module:', err);
      alert('Failed to delete module.');
    }
  };

  const saveMaterial = async (e) => {
    e.preventDefault();
    setMaterialSaving(true);
    try {
      const row = {
        module_id: materialModal,
        title: materialForm.title.trim(),
        material_type: materialForm.material_type,
      };
      if (materialForm.material_type === 'Link') row.external_url = materialForm.url.trim();
      else row.file_url = materialForm.url.trim();
      const { error } = await supabase.from('course_materials').insert(row);
      if (error) throw error;
      setMaterialModal(null);
      setMaterialForm({ title: '', material_type: 'PDF', url: '' });
      fetchAll();
    } catch (err) {
      console.error('Error saving material:', err);
      alert('Failed to add material.');
    } finally {
      setMaterialSaving(false);
    }
  };

  const deleteMaterial = async (mat) => {
    if (!window.confirm(`Delete material "${mat.title}"?`)) return;
    try {
      const { error } = await supabase.from('course_materials').delete().eq('id', mat.id);
      if (error) throw error;
      fetchAll();
    } catch (err) {
      console.error('Error deleting material:', err);
      alert('Failed to delete material.');
    }
  };

  // --- Activities ----------------------------------------------------------

  const saveActivity = async (e) => {
    e.preventDefault();
    setActivitySaving(true);
    try {
      const { error } = await supabase.from('activities').insert({
        subject_id: subjectId,
        title: activityForm.title.trim(),
        description: activityForm.description.trim() || null,
        activity_type: activityForm.activity_type,
        deadline: activityForm.deadline ? new Date(activityForm.deadline).toISOString() : null,
        points: parseInt(activityForm.points, 10) || 100,
        grading_criteria: activityForm.grading_criteria.trim() || null,
        created_by: profile.id,
      });
      if (error) throw error;
      setActivityModal(false);
      setActivityForm({ title: '', description: '', activity_type: 'Assignment', deadline: '', points: 100, grading_criteria: '' });
      fetchAll();
    } catch (err) {
      console.error('Error creating activity:', err);
      alert('Failed to create activity.');
    } finally {
      setActivitySaving(false);
    }
  };

  const deleteActivity = async (a) => {
    if (!window.confirm(`Delete activity "${a.title}"? Its submissions will also be removed.`)) return;
    try {
      const { error } = await supabase.from('activities').delete().eq('id', a.id);
      if (error) throw error;
      if (reviewId === a.id) setReviewId(null);
      fetchAll();
    } catch (err) {
      console.error('Error deleting activity:', err);
      alert('Failed to delete activity.');
    }
  };

  const saveGrade = async (sub) => {
    const draft = gradeDraft[sub.id] || {};
    const grade = draft.grade !== undefined && draft.grade !== '' ? parseInt(draft.grade, 10) : sub.grade;
    if (grade === undefined || grade === '' || isNaN(grade)) {
      alert('Enter a grade before saving.');
      return;
    }
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ grade, feedback: draft.feedback ?? sub.feedback ?? null, status: 'Graded' })
        .eq('id', sub.id);
      if (error) throw error;
      setGradeDraft((d) => ({ ...d, [sub.id]: {} }));
      fetchAll();
    } catch (err) {
      console.error('Error grading submission:', err);
      alert('Failed to save grade.');
    }
  };

  const subStatusOf = (activity, sub) => {
    if (sub) {
      if (sub.status === 'Graded' && sub.grade != null) return { label: `Graded ${sub.grade}/${activity.points}`, tone: 'green' };
      if (sub.status === 'Late') return { label: 'Late', tone: 'amber' };
      return { label: 'Submitted', tone: 'green' };
    }
    if (activity.deadline && new Date(activity.deadline).getTime() < Date.now()) return { label: 'Missing', tone: 'red' };
    return { label: 'Pending', tone: 'gray' };
  };

  // --- Announcements -------------------------------------------------------

  const saveAnnouncement = async (e) => {
    e.preventDefault();
    setAnnSaving(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        subject_id: subjectId,
        created_by: profile.id,
        title: annForm.title.trim(),
        content: annForm.content.trim(),
        is_urgent: annForm.is_urgent,
      });
      if (error) throw error;
      setAnnModal(false);
      setAnnForm({ title: '', content: '', is_urgent: false });
      fetchAll();
    } catch (err) {
      console.error('Error posting announcement:', err);
      alert('Failed to post announcement.');
    } finally {
      setAnnSaving(false);
    }
  };

  const deleteAnnouncement = async (a) => {
    if (!window.confirm(`Delete announcement "${a.title}"?`)) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', a.id);
      if (error) throw error;
      fetchAll();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      alert('Failed to delete announcement.');
    }
  };

  // --- Classroom -----------------------------------------------------------

  const saveSchedule = async (e) => {
    e.preventDefault();
    setScheduleSaving(true);
    try {
      const { error } = await supabase.from('class_schedules').insert({
        subject_id: subjectId,
        title: scheduleForm.title.trim(),
        starts_at: new Date(scheduleForm.starts_at).toISOString(),
        ends_at: new Date(scheduleForm.ends_at).toISOString(),
        created_by: profile.id,
      });
      if (error) throw error;
      setScheduleModal(false);
      setScheduleForm({ title: '', starts_at: '', ends_at: '' });
      fetchAll();
    } catch (err) {
      console.error('Error scheduling class:', err);
      alert('Failed to schedule class.');
    } finally {
      setScheduleSaving(false);
    }
  };

  const deleteSchedule = async (s) => {
    if (!window.confirm(`Delete scheduled class "${s.title}"?`)) return;
    try {
      const { error } = await supabase.from('class_schedules').delete().eq('id', s.id);
      if (error) throw error;
      fetchAll();
    } catch (err) {
      console.error('Error deleting schedule:', err);
      alert('Failed to delete schedule.');
    }
  };

  // --- Derived -------------------------------------------------------------

  const reviewActivity = activities.find((a) => a.id === reviewId);
  const pendingReviews = activities.reduce((n, a) => n + (a.submissions || []).filter((s) => ['Submitted', 'Late'].includes(s.status)).length, 0);
  const upcomingDeadlines = activities.filter((a) => a.deadline && new Date(a.deadline).getTime() > Date.now()).length;
  const now = Date.now();

  const recentItems = [
    ...announcements.map((a) => ({ key: `ann-${a.id}`, time: a.created_at, icon: Megaphone, text: `Posted announcement: ${a.title}` })),
    ...activities.map((a) => ({ key: `act-${a.id}`, time: a.created_at, icon: ClipboardList, text: `Created activity: ${a.title}` })),
    ...modules.map((m) => ({ key: `mod-${m.id}`, time: m.created_at, icon: FolderOpen, text: `Created module: ${m.title}` })),
    ...schedules.map((s) => ({ key: `sch-${s.id}`, time: s.created_at, icon: CalendarClock, text: `Scheduled class: ${s.title}` })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);

  const fieldClass = 'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';
  const modalShell = 'fixed inset-0 z-50 flex items-center justify-center px-4';
  const modalCard = 'relative w-full bg-white rounded-xl border border-slate-200 shadow-2xl p-5 max-h-[90vh] overflow-y-auto';

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-64 rounded" />
        <Skeleton className="h-4 w-96 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ws-card px-4 py-3">
              <Skeleton className="w-8 h-8 rounded-md" />
              <Skeleton className="h-3 w-20 mt-3" />
              <Skeleton className="h-4 w-10 mt-1.5" />
            </div>
          ))}
        </div>
        <div className="ws-card p-5">
          <Skeleton className="h-3 w-1/4 rounded mb-3" />
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full rounded mb-2.5" />)}
        </div>
      </div>
    );
  }

  if (notAssigned || !subject) {
    return (
      <div className="ws-card px-4 py-12 text-center max-w-md mx-auto mt-10">
        <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <p className="text-[14px] font-semibold text-slate-800">Access restricted</p>
        <p className="text-[12.5px] text-slate-400 mt-1">
          You are not assigned to this subject. Subjects are assigned by the administrator.
        </p>
        <button onClick={() => navigate('/teacher/subjects')} className="mt-4 ws-btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to My Subjects
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Subject header */}
      <button
        onClick={() => navigate('/teacher/subjects')}
        className="inline-flex items-center text-[12.5px] font-medium text-slate-500 hover:text-primary-700 transition-colors mb-3"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" /> My Subjects
      </button>

      <div className="ws-card overflow-hidden mb-4">
        <div className="bg-gradient-to-r from-primary-700 to-primary-900 px-5 sm:px-7 py-5">
          <span className="text-[11px] font-semibold text-primary-100 bg-white/15 border border-white/10 px-2 py-0.5 rounded">
            {subject.subject_code}
          </span>
          <h1 className="mt-2 text-[20px] font-bold text-white tracking-tight">{subject.subject_title}</h1>
          <p className="mt-1 text-[12.5px] text-primary-100/90">
            Teacher: <span className="font-semibold">{teacherName || profile.full_name}</span>
            <span className="mx-2 text-primary-100/50">·</span>
            {students.length} Student{students.length === 1 ? '' : 's'}
          </p>
        </div>
        {subject.description && (
          <p className="px-5 sm:px-7 py-3 text-[12.5px] text-slate-500 border-b border-slate-100">{subject.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-md text-[12.5px] font-medium capitalize transition-colors whitespace-nowrap ${
              tab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Students', value: students.length, icon: Users, tone: 'bg-primary-50 text-primary-700' },
              { label: 'Modules', value: modules.length, icon: FolderOpen, tone: 'bg-blue-50 text-blue-700' },
              { label: 'Activities', value: activities.length, icon: ClipboardList, tone: 'bg-emerald-50 text-emerald-700' },
              { label: 'Upcoming Deadlines', value: upcomingDeadlines, icon: CalendarDays, tone: 'bg-amber-50 text-amber-700' },
              { label: 'Pending Reviews', value: pendingReviews, icon: Inbox, tone: 'bg-red-50 text-red-700' },
            ].map((s) => (
              <div key={s.label} className="ws-card px-4 py-3">
                <span className={`w-8 h-8 rounded-md flex items-center justify-center ${s.tone}`}>
                  <s.icon className="w-4 h-4" />
                </span>
                <p className="mt-2 text-[18px] font-bold text-slate-900 leading-tight">{s.value}</p>
                <p className="text-[10.5px] uppercase tracking-wide text-slate-400 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="ws-card">
            <div className="ws-card-header">
              <h2 className="ws-section-title">Recent Activity</h2>
            </div>
            {recentItems.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12.5px] text-slate-400">
                Nothing here yet. Create a module, activity, announcement, or schedule a class to get started.
              </p>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentItems.map((r) => (
                  <div key={r.key} className="px-4 py-3 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                      <r.icon className="w-4 h-4" />
                    </span>
                    <p className="text-[13px] text-slate-700 flex-1 min-w-0 truncate">{r.text}</p>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(r.time)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULES */}
      {tab === 'modules' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => openModuleModal('create')} className="ws-btn-primary">
              <Plus className="w-4 h-4" /> Create Module
            </button>
          </div>
          {modules.length === 0 ? (
            <div className="ws-card px-4 py-10 text-center">
              <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-[13.5px] font-medium text-slate-600">No modules yet</p>
              <p className="text-[12.5px] text-slate-400 mt-1">Create your first module to start building the subject.</p>
            </div>
          ) : (
            [...modules]
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
              .map((m, i) => (
                <div key={m.id} className="ws-card overflow-hidden">
                  <div className="px-4 py-3 flex items-start gap-3">
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <button onClick={() => moveModule(i, -1)} disabled={i === 0} className="text-slate-300 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed" title="Move up">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => moveModule(i, 1)} disabled={i === modules.length - 1} className="text-slate-300 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed" title="Move down">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[14px] font-bold text-slate-900">Module {m.order_index}: {m.title}</h3>
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${m.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {m.is_published ? 'Published' : 'Unpublished'}
                        </span>
                      </div>
                      {m.description && <p className="text-[12.5px] text-slate-500 mt-1">{m.description}</p>}
                      <p className="text-[11.5px] text-slate-400 mt-1.5">
                        {(m.course_materials || []).length} material{(m.course_materials || []).length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => togglePublish(m)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" title={m.is_published ? 'Unpublish' : 'Publish'}>
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => openModuleModal('edit', m)} className="p-1.5 rounded-md text-slate-400 hover:text-primary-700 hover:bg-primary-50" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteModule(m)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="px-4 pb-3 pl-12 space-y-1.5">
                    {(m.course_materials || []).map((mat) => {
                      const Icon = TYPE_ICON[mat.material_type] || FileText;
                      return (
                        <div key={mat.id} className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                          <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-[12.5px] text-slate-700 flex-1 min-w-0 truncate">{mat.title}</span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase">{mat.material_type}</span>
                          <button onClick={() => deleteMaterial(mat)} className="text-slate-300 hover:text-red-600" title="Delete material">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    <button onClick={() => setMaterialModal(m.id)} className="text-[12px] font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add material
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* ACTIVITIES */}
      {tab === 'activities' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setActivityModal(true)} className="ws-btn-primary">
              <Plus className="w-4 h-4" /> Create Activity
            </button>
          </div>
          {activities.length === 0 ? (
            <div className="ws-card px-4 py-10 text-center">
              <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-[13.5px] font-medium text-slate-600">No activities yet</p>
              <p className="text-[12.5px] text-slate-400 mt-1">Activities appear on students' Roster & Dockets once published.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {activities.map((a) => {
                const subs = a.submissions || [];
                const submitted = subs.filter((s) => ['Submitted', 'Late', 'Graded'].includes(s.status)).length;
                return (
                  <div key={a.id} className="ws-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                            {a.activity_type || 'Assignment'}
                          </span>
                          {a.deadline && (
                            <span className={`text-[11px] font-medium ${new Date(a.deadline).getTime() < now ? 'text-red-600' : 'text-slate-500'}`}>
                              Due {formatDue(a.deadline)}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1.5 text-[14px] font-bold text-slate-900">{a.title}</h3>
                        {a.description && <p className="text-[12.5px] text-slate-500 mt-1 line-clamp-2">{a.description}</p>}
                        <p className="text-[11.5px] text-slate-400 mt-1.5">
                          {submitted}/{students.length || 0} submitted · {pendingReviews && `${subs.filter((s) => ['Submitted', 'Late'].includes(s.status)).length} pending review`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <button onClick={() => deleteActivity(a)} className="p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50" title="Delete activity">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => setReviewId(a.id)} className="mt-3 w-full ws-btn-secondary">
                      <Inbox className="w-4 h-4" /> Review Submissions
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MATERIALS */}
      {tab === 'materials' && (
        <div className="ws-card">
          <div className="ws-card-header">
            <h2 className="ws-section-title">Materials</h2>
          </div>
          {modules.flatMap((m) => m.course_materials || []).length === 0 ? (
            <p className="px-4 py-10 text-center text-[12.5px] text-slate-400">
              No materials yet. Add materials from the Modules tab.
            </p>
          ) : (
            <div className="divide-y divide-slate-50">
              {modules.map((m) =>
                (m.course_materials || []).map((mat) => {
                  const Icon = TYPE_ICON[mat.material_type] || FileText;
                  const url = mat.external_url || mat.file_url;
                  return (
                    <div key={mat.id} className="px-4 py-3 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-slate-800 truncate">{mat.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">Module {m.order_index}: {m.title} · {mat.material_type}</p>
                      </div>
                      {url && (
                        <a href={url} target="_blank" rel="noreferrer" className="p-1.5 rounded-md text-slate-400 hover:text-primary-700 hover:bg-primary-50" title="Open">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button onClick={() => deleteMaterial(mat)} className="p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ANNOUNCEMENTS */}
      {tab === 'announcements' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setAnnModal(true)} className="ws-btn-primary">
              <Plus className="w-4 h-4" /> New Announcement
            </button>
          </div>
          {announcements.length === 0 ? (
            <div className="ws-card px-4 py-10 text-center">
              <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-[13.5px] font-medium text-slate-600">No announcements yet</p>
              <p className="text-[12.5px] text-slate-400 mt-1">Announcements appear on students' Overview and Announcements pages.</p>
            </div>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className="ws-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {a.is_urgent && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-red-500 px-1.5 py-0.5 rounded">Urgent</span>
                      )}
                      <h3 className="text-[14px] font-bold text-slate-900">{a.title}</h3>
                    </div>
                    <p className="text-[12.5px] text-slate-500 mt-1 whitespace-pre-wrap">{a.content}</p>
                    <p className="text-[11px] text-slate-400 mt-2">{timeAgo(a.created_at)}</p>
                  </div>
                  <button onClick={() => deleteAnnouncement(a)} className="p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 flex-shrink-0" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* STUDENTS */}
      {tab === 'students' && (
        <div className="ws-card">
          <div className="ws-card-header">
            <h2 className="ws-section-title">{students.length} Student{students.length === 1 ? '' : 's'}</h2>
          </div>
          {students.length === 0 ? (
            <p className="px-4 py-10 text-center text-[12.5px] text-slate-400">No students enrolled in this subject yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10.5px] uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-2.5 font-semibold">Student</th>
                    <th className="px-4 py-2.5 font-semibold hidden sm:table-cell">Student ID</th>
                    <th className="px-4 py-2.5 font-semibold">Completed</th>
                    <th className="px-4 py-2.5 font-semibold">Missing</th>
                    <th className="px-4 py-2.5 font-semibold">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <p className="text-[12.5px] font-semibold text-slate-800">{s.full_name}</p>
                        <p className="text-[11px] text-slate-400 sm:hidden">{s.student_id}</p>
                      </td>
                      <td className="px-4 py-2.5 text-[12.5px] text-slate-500 hidden sm:table-cell">{s.student_id}</td>
                      <td className="px-4 py-2.5 text-[12.5px] text-slate-700">{s.completed}/{activities.length || 0}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[12.5px] font-medium ${s.missing > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {s.missing}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-600 rounded-full" style={{ width: `${s.progress}%` }} />
                          </div>
                          <span className="text-[11.5px] font-semibold text-slate-600">{s.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CLASSROOM */}
      {tab === 'classroom' && (
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <button onClick={() => navigate(`/classroom?subject=${subjectId}`)} className="ws-btn-primary">
              <Video className="w-4 h-4" /> Start Live Class
            </button>
            <button onClick={() => setScheduleModal(true)} className="ws-btn-secondary">
              <CalendarClock className="w-4 h-4" /> Schedule Class
            </button>
          </div>
          {schedules.length === 0 ? (
            <div className="ws-card px-4 py-10 text-center">
              <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-[13.5px] font-medium text-slate-600">No scheduled classes</p>
              <p className="text-[12.5px] text-slate-400 mt-1">Scheduled classes appear on students' Virtual Classroom page.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {schedules.map((s) => {
                const start = new Date(s.starts_at);
                const end = new Date(s.ends_at);
                const isLive = start.getTime() <= now && now < end.getTime();
                const isUpcoming = start.getTime() > now;
                return (
                  <div key={s.id} className="ws-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {isLive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                            isLive ? 'bg-emerald-50 text-emerald-700' : isUpcoming ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isLive ? 'Live now' : isUpcoming ? 'Upcoming' : 'Ended'}
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-[14px] font-bold text-slate-900">{s.title}</h3>
                        <p className="text-[12.5px] text-slate-500 mt-1">
                          {start.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} ·{' '}
                          {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} –{' '}
                          {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                      {isUpcoming && (
                        <button onClick={() => deleteSchedule(s)} className="p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 flex-shrink-0" title="Cancel class">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODULE MODAL */}
      {moduleModal && (
        <div className={modalShell}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setModuleModal(null)} />
          <div className={modalCard}>
            <h3 className="text-[15px] font-bold text-slate-900">
              {moduleModal.mode === 'create' ? 'Create Module' : 'Edit Module'}
            </h3>
            <form onSubmit={saveModule} className="mt-4 space-y-4">
              <div>
                <label className="ws-label">Module Title</label>
                <input required value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} placeholder="e.g. Introduction to Computer Hardware" className={fieldClass} />
              </div>
              <div>
                <label className="ws-label">Description</label>
                <textarea rows={3} value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} placeholder="What will students learn in this module?" className={`${fieldClass} resize-none`} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setModuleModal(null)} className="ws-btn-secondary">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button type="submit" disabled={moduleSaving} className="ws-btn-primary">
                  {moduleSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> {moduleModal.mode === 'create' ? 'Create Module' : 'Save Changes'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MATERIAL MODAL */}
      {materialModal && (
        <div className={modalShell}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMaterialModal(null)} />
          <div className={modalCard}>
            <h3 className="text-[15px] font-bold text-slate-900">Add Material</h3>
            <form onSubmit={saveMaterial} className="mt-4 space-y-4">
              <div>
                <label className="ws-label">Material Title</label>
                <input required value={materialForm.title} onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })} placeholder="e.g. Module 1 Presentation" className={fieldClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ws-label">Type</label>
                  <select value={materialForm.material_type} onChange={(e) => setMaterialForm({ ...materialForm, material_type: e.target.value })} className={fieldClass}>
                    {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ws-label">{materialForm.material_type === 'Link' ? 'External URL' : 'File URL'}</label>
                  <input required type="url" value={materialForm.url} onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })} placeholder={materialForm.material_type === 'Link' ? 'https://…' : 'https://…file.pdf'} className={fieldClass} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setMaterialModal(null)} className="ws-btn-secondary">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button type="submit" disabled={materialSaving} className="ws-btn-primary">
                  {materialSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : <><Upload className="w-4 h-4" /> Add Material</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVITY MODAL */}
      {activityModal && (
        <div className={modalShell}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setActivityModal(false)} />
          <div className={modalCard}>
            <h3 className="text-[15px] font-bold text-slate-900">Create Activity</h3>
            <form onSubmit={saveActivity} className="mt-4 space-y-4">
              <div>
                <label className="ws-label">Activity Title</label>
                <input required value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} placeholder="e.g. Video Editing Task" className={fieldClass} />
              </div>
              <div>
                <label className="ws-label">Instructions</label>
                <textarea rows={3} value={activityForm.description} onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })} placeholder="Provide instructions for the activity…" className={`${fieldClass} resize-none`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ws-label">Activity Type</label>
                  <select value={activityForm.activity_type} onChange={(e) => setActivityForm({ ...activityForm, activity_type: e.target.value })} className={fieldClass}>
                    {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ws-label">Deadline</label>
                  <input type="datetime-local" value={activityForm.deadline} onChange={(e) => setActivityForm({ ...activityForm, deadline: e.target.value })} className={fieldClass} />
                </div>
                <div>
                  <label className="ws-label">Points</label>
                  <input type="number" min={1} value={activityForm.points} onChange={(e) => setActivityForm({ ...activityForm, points: e.target.value })} className={fieldClass} />
                </div>
                <div>
                  <label className="ws-label">Grading Criteria (optional)</label>
                  <input value={activityForm.grading_criteria} onChange={(e) => setActivityForm({ ...activityForm, grading_criteria: e.target.value })} placeholder="Rubric summary" className={fieldClass} />
                </div>
              </div>
              <p className="text-[11.5px] text-slate-400">
                Once published, this activity automatically appears on students' Roster & Dockets with To Do / Due Soon / Missing / Passed status tracking.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setActivityModal(false)} className="ws-btn-secondary">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button type="submit" disabled={activitySaving} className="ws-btn-primary">
                  {activitySaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</> : <><Upload className="w-4 h-4" /> Publish Activity</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW DRAWER */}
      {reviewActivity && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setReviewId(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between sticky top-0 bg-white">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-700">{reviewActivity.activity_type || 'Assignment'}</p>
                <h3 className="text-[15px] font-bold text-slate-900 truncate">{reviewActivity.title}</h3>
                {reviewActivity.deadline && (
                  <p className="text-[11.5px] text-slate-400">Due {new Date(reviewActivity.deadline).toLocaleString()}</p>
                )}
              </div>
              <button onClick={() => setReviewId(null)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5">
              {students.length === 0 ? (
                <p className="text-center text-[12.5px] text-slate-400 py-8">No students enrolled in this subject.</p>
              ) : (
                students.map((s) => {
                  const sub = (reviewActivity.submissions || []).find((x) => x.student_id === s.id) || null;
                  const st = subStatusOf(reviewActivity, sub);
                  return (
                    <div key={s.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate">{s.full_name}</p>
                          <p className="text-[11px] text-slate-400">{s.student_id}</p>
                        </div>
                        <StatusBadge {...st} dot />
                      </div>
                      {sub && (
                        <>
                          <p className="text-[11px] text-slate-400 mt-2">
                            Submitted {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                            {sub.file_url && (
                              <>
                                {' · '}
                                <a href={sub.file_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline inline-flex items-center gap-0.5">
                                  View file <ExternalLink className="w-3 h-3" />
                                </a>
                              </>
                            )}
                          </p>
                          {sub.content && (
                            <p className="text-[12px] text-slate-600 mt-1 bg-slate-50 rounded-md px-2.5 py-1.5 whitespace-pre-wrap">{sub.content}</p>
                          )}
                          {sub.status === 'Graded' && sub.grade != null && (
                            <p className="text-[12px] font-semibold text-emerald-700 mt-1.5">
                              Graded {sub.grade}/{reviewActivity.points}
                              {sub.feedback && <span className="font-normal text-slate-500"> — {sub.feedback}</span>}
                            </p>
                          )}
                          <div className="mt-2.5 flex items-end gap-2">
                            <div className="flex-1">
                              <label className="ws-label text-[11px]">Grade (0–{reviewActivity.points})</label>
                              <input
                                type="number"
                                min={0}
                                max={reviewActivity.points}
                                defaultValue={sub.grade ?? ''}
                                onChange={(e) => setGradeDraft((d) => ({ ...d, [sub.id]: { ...d[sub.id], grade: e.target.value } }))}
                                className="ws-input w-full"
                              />
                            </div>
                            <button onClick={() => saveGrade(sub)} className="ws-btn-primary whitespace-nowrap">
                              {sub.status === 'Graded' && sub.grade != null ? 'Update' : 'Mark Reviewed'}
                            </button>
                          </div>
                          <div className="mt-2">
                            <label className="ws-label text-[11px]">Feedback</label>
                            <textarea
                              rows={2}
                              defaultValue={sub.feedback ?? ''}
                              onChange={(e) => setGradeDraft((d) => ({ ...d, [sub.id]: { ...d[sub.id], feedback: e.target.value } }))}
                              placeholder="Feedback for this student…"
                              className="ws-input w-full resize-none"
                            />
                          </div>
                        </>
                      )}
                      {!sub && (
                        <p className="text-[11.5px] text-slate-400 mt-1.5">
                          {st.label === 'Missing' ? 'No submission yet (deadline passed).' : 'Waiting for submission.'}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT MODAL */}
      {annModal && (
        <div className={modalShell}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setAnnModal(false)} />
          <div className={modalCard}>
            <h3 className="text-[15px] font-bold text-slate-900">New Announcement</h3>
            <form onSubmit={saveAnnouncement} className="mt-4 space-y-4">
              <div>
                <label className="ws-label">Title</label>
                <input required value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} placeholder="e.g. Reminder: Module 2 Activity" className={fieldClass} />
              </div>
              <div>
                <label className="ws-label">Message</label>
                <textarea required rows={3} value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} placeholder="Please submit your activity before Friday." className={`${fieldClass} resize-none`} />
              </div>
              <label className="flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer">
                <input type="checkbox" checked={annForm.is_urgent} onChange={(e) => setAnnForm({ ...annForm, is_urgent: e.target.checked })} className="accent-red-500" />
                Mark as urgent
              </label>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setAnnModal(false)} className="ws-btn-secondary">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button type="submit" disabled={annSaving} className="ws-btn-primary">
                  {annSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</> : <><Megaphone className="w-4 h-4" /> Publish Announcement</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {scheduleModal && (
        <div className={modalShell}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setScheduleModal(false)} />
          <div className={modalCard}>
            <h3 className="text-[15px] font-bold text-slate-900">Schedule Class — {subject.subject_code}</h3>
            <form onSubmit={saveSchedule} className="mt-4 space-y-4">
              <div>
                <label className="ws-label">Class Title</label>
                <input required value={scheduleForm.title} onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })} placeholder="e.g. Lecture 5 — Computer Hardware" className={fieldClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ws-label">Starts at</label>
                  <input required type="datetime-local" value={scheduleForm.starts_at} onChange={(e) => setScheduleForm({ ...scheduleForm, starts_at: e.target.value })} className={fieldClass} />
                </div>
                <div>
                  <label className="ws-label">Ends at</label>
                  <input required type="datetime-local" value={scheduleForm.ends_at} onChange={(e) => setScheduleForm({ ...scheduleForm, ends_at: e.target.value })} className={fieldClass} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setScheduleModal(false)} className="ws-btn-secondary">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button type="submit" disabled={scheduleSaving} className="ws-btn-primary">
                  {scheduleSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling…</> : <><CalendarClock className="w-4 h-4" /> Schedule Class</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
