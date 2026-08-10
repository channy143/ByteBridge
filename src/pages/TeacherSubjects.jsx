import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { BookOpen, Users, FolderOpen, ClipboardList, ChevronRight, User } from 'lucide-react';

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

export default function TeacherSubjects() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data: ts } = await supabase
          .from('teacher_subjects')
          .select('subject_id')
          .eq('teacher_id', profile.id);
        const subjectIds = (ts || []).map((t) => t.subject_id);

        let subs = [];
        if (subjectIds.length > 0) {
          const { data } = await supabase
            .from('subjects')
            .select('id, subject_code, subject_title, description')
            .in('id', subjectIds);
          subs = data || [];
        }

        const counts = { students: {}, modules: {}, activities: {} };
        if (subjectIds.length > 0) {
          const { data: enr } = await supabase.from('enrollments').select('subject_id').in('subject_id', subjectIds);
          (enr || []).forEach((e) => { counts.students[e.subject_id] = (counts.students[e.subject_id] || 0) + 1; });

          const { data: mods } = await supabase.from('modules').select('subject_id').in('subject_id', subjectIds);
          (mods || []).forEach((m) => { counts.modules[m.subject_id] = (counts.modules[m.subject_id] || 0) + 1; });

          const { data: acts } = await supabase.from('activities').select('subject_id').in('subject_id', subjectIds);
          (acts || []).forEach((a) => { counts.activities[a.subject_id] = (counts.activities[a.subject_id] || 0) + 1; });
        }

        if (cancelled) return;
        setSubjects(
          subs.map((s) => ({
            ...s,
            students: counts.students[s.id] || 0,
            modules: counts.modules[s.id] || 0,
            activities: counts.activities[s.id] || 0,
          }))
        );
      } catch (err) {
        console.error('Error loading subjects:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [profile]);

  return (
    <div>
      <PageHeader
        title="My Subjects"
        subtitle="Subjects assigned to you by the administrator."
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ws-card overflow-hidden flex flex-col">
              <div className="relative h-[104px] flex-shrink-0 bg-slate-200/80">
                <div className="px-4 pt-3.5 space-y-2">
                  <Skeleton className="h-4 w-16 rounded-full bg-slate-300/60" />
                  <Skeleton className="h-4 w-3/4 rounded bg-slate-300/60" />
                  <Skeleton className="h-3 w-1/2 rounded bg-slate-300/60" />
                </div>
              </div>
              <div className="relative flex-1 px-4 pb-4 pt-12 space-y-3">
                <div className="absolute -top-6 right-[46px] w-[86px] h-[86px] rounded-full bg-slate-200 ring-4 ring-white" />
                <Skeleton className="h-3 w-1/3 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
                <Skeleton className="h-8 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="ws-card px-4 py-10 text-center">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-[13.5px] font-medium text-slate-600">No subjects assigned yet</p>
          <p className="text-[12.5px] text-slate-400 mt-1">
            Subjects are assigned by the administrator. Please contact your administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map((s) => {
            const colorIdx = hashColor(s.id, CARD_GRADS.length);
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/teacher/subjects/${s.id}`)}
                className="ws-card group text-left flex flex-col overflow-hidden hover:shadow-lg hover:-translate-y-0.5 hover:border-primary-200 transition-all duration-200 appearance-none p-0"
              >
                <div className={`relative flex-shrink-0 w-full ${CARD_SOLIDS[colorIdx]} bg-gradient-to-br ${CARD_GRADS[colorIdx]}`}>
                  <div className="px-4 pt-3.5 pb-8 pr-[160px]">
                    <span className="inline-block mb-2 text-[10.5px] font-bold text-white/95 bg-white/15 backdrop-blur px-2 py-0.5 rounded-full">
                      {s.subject_code}
                    </span>
                    <h3 className="text-[15px] font-bold text-white leading-snug drop-shadow-sm">{s.subject_title}</h3>
                    {s.description && (
                      <p className="mt-1 text-[11.5px] text-white/80 leading-relaxed line-clamp-2">{s.description}</p>
                    )}
                  </div>
                  <span className={`absolute right-[56px] bottom-0 translate-y-1/2 w-[86px] h-[86px] rounded-full ring-4 ring-white shadow-md flex items-center justify-center overflow-hidden flex-shrink-0 ${CARD_SOLIDS[colorIdx]} text-white`}>
                    {profile?.full_name ? (
                      <span className="text-[28px] font-bold leading-none">{profile.full_name.trim().charAt(0).toUpperCase()}</span>
                    ) : (
                      <User className="w-7 h-7 text-white/70" />
                    )}
                  </span>
                </div>

                <div className="px-4 pt-3 pr-[150px] pb-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-800 truncate">{profile?.full_name || 'You'}</p>
                    <span className="text-[10.5px] text-slate-400 whitespace-nowrap">· Subject Teacher</span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-slate-50 border border-slate-100 py-2 text-center">
                      <Users className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                      <p className="mt-0.5 text-[13px] font-bold text-slate-800 leading-tight">{s.students}</p>
                      <p className="text-[10px] text-slate-400">Students</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-100 py-2 text-center">
                      <FolderOpen className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                      <p className="mt-0.5 text-[13px] font-bold text-slate-800 leading-tight">{s.modules}</p>
                      <p className="text-[10px] text-slate-400">Modules</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-100 py-2 text-center">
                      <ClipboardList className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                      <p className="mt-0.5 text-[13px] font-bold text-slate-800 leading-tight">{s.activities}</p>
                      <p className="text-[10px] text-slate-400">Activities</p>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4 flex-shrink-0">
                  <span className="w-full ws-btn-primary justify-center">
                    Open Subject <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}