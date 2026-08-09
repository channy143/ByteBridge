import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { BookOpen, Users, FolderOpen, ClipboardList, ChevronRight } from 'lucide-react';

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
            <div key={i} className="ws-card p-5">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-4 w-2/3 mt-3" />
              <Skeleton className="h-3 w-1/2 mt-2" />
              <Skeleton className="h-8 w-full mt-5" />
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
          {subjects.map((s) => (
            <div key={s.id} className="ws-card p-5 flex flex-col">
              <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded self-start">
                {s.subject_code}
              </span>
              <h3 className="mt-3 text-[15px] font-bold text-slate-900 leading-snug">{s.subject_title}</h3>
              {s.description && (
                <p className="mt-1 text-[12px] text-slate-400 line-clamp-2">{s.description}</p>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 border border-slate-100 py-2">
                  <Users className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                  <p className="mt-1 text-[13px] font-bold text-slate-800">{s.students}</p>
                  <p className="text-[10px] text-slate-400">Students</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 py-2">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                  <p className="mt-1 text-[13px] font-bold text-slate-800">{s.modules}</p>
                  <p className="text-[10px] text-slate-400">Modules</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 py-2">
                  <ClipboardList className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                  <p className="mt-1 text-[13px] font-bold text-slate-800">{s.activities}</p>
                  <p className="text-[10px] text-slate-400">Activities</p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/teacher/subjects/${s.id}`)}
                className="mt-5 ws-btn-primary w-full"
              >
                Open Subject <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
