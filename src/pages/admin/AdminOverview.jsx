import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAdminData, { programName } from './useAdminData';
import StatCard from '../../components/admin/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  GraduationCap, Users, BookOpen, FolderOpen, UserPlus, Plus, Link2,
  AlertTriangle, CheckCircle2, ClipboardList,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

export default function AdminOverview() {
  const { loading, teachers, subjects, sections, students, assignments } = useAdminData();
  const [recentLogs, setRecentLogs] = useState([]);
  const [logsLoaded, setLogsLoaded] = useState(false);

  const loadLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, actor_id, actor_role, action, table_name, details, created_at')
      .order('created_at', { ascending: false })
      .limit(8);
    if (!error) setRecentLogs(data || []);
    setLogsLoaded(true);
  };

  useEffect(() => {
    if (loading) return;
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const assignedSubjectIds = new Set(assignments.map((a) => a.subject_id));
  const unassignedSubjects = subjects.filter((s) => !assignedSubjectIds.has(s.id));
  const sectionsWithoutAdviser = sections.filter((s) => !s.adviser_id);

  const activeSubjects = subjects.filter((s) => (s.status || 'Active') === 'Active');
  const activeTeachers = teachers.filter((t) => (t.status || 'Active') === 'Active');
  const activeStudents = students.filter((s) => (s.status || 'Active') === 'Active');

  return (
    <div>
      <PageHeader
        title="Administration Overview"
        subtitle="A snapshot of the academic structure, rosters, and recent administrator activity."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/admin/students" className="ws-btn-secondary">
              <UserPlus className="w-4 h-4" /> Add Student
            </Link>
            <Link to="/admin/teachers" className="ws-btn-secondary">
              <Users className="w-4 h-4" /> Manage Teachers
            </Link>
            <Link to="/admin/subjects" className="ws-btn-primary">
              <Plus className="w-4 h-4" /> New Subject
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Students"
          value={activeStudents.length}
          icon={GraduationCap}
          accent="bg-blue-50 text-blue-700"
          sub={`${students.length} total in roster`}
        />
        <StatCard
          label="Teachers"
          value={activeTeachers.length}
          icon={Users}
          accent="bg-violet-50 text-violet-700"
          sub={`${teachers.length} total accounts`}
        />
        <StatCard
          label="Subjects"
          value={activeSubjects.length}
          icon={BookOpen}
          accent="bg-emerald-50 text-emerald-700"
          sub={`${unassignedSubjects.length} without an assigned teacher`}
        />
        <StatCard
          label="Sections"
          value={sections.length}
          icon={FolderOpen}
          accent="bg-amber-50 text-amber-700"
          sub={`${sectionsWithoutAdviser.length} without an adviser`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="ws-card">
            <div className="ws-card-header">
              <h2 className="ws-section-title">Subjects without a teacher</h2>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : unassignedSubjects.length === 0 ? (
              <div className="px-4 py-6 text-center text-[11.5px] text-emerald-600 flex flex-col items-center gap-1">
                <CheckCircle2 className="w-5 h-5" />
                Every subject has an assigned teacher.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {unassignedSubjects.slice(0, 6).map((s) => (
                  <div key={s.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-slate-800 truncate">
                        {s.subject_code} <span className="font-normal text-slate-500">— {s.subject_title}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {programName(s.program_id)} · {(s.year_level || '—')} · {(s.semester || '—')}
                      </p>
                    </div>
                    <Link to="/admin/assignments" className="ws-btn-secondary flex-shrink-0">
                      <Link2 className="w-3.5 h-3.5" /> Assign
                    </Link>
                  </div>
                ))}
                {unassignedSubjects.length > 6 && (
                  <p className="px-4 py-2 text-[11.5px] text-slate-400">
                    +{unassignedSubjects.length - 6} more
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="ws-card">
            <div className="ws-card-header">
              <h2 className="ws-section-title">Sections without an adviser</h2>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : sectionsWithoutAdviser.length === 0 ? (
              <div className="px-4 py-6 text-center text-[11.5px] text-emerald-600 flex flex-col items-center gap-1">
                <CheckCircle2 className="w-5 h-5" />
                Every section has an adviser.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sectionsWithoutAdviser.slice(0, 6).map((s) => (
                  <div key={s.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-slate-800 truncate">{s.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {programName(s.program_id)} · Year {(s.year_level || '—')} · {(s.academic_year || '—')}
                      </p>
                    </div>
                    <Link to="/admin/sections" className="ws-btn-secondary flex-shrink-0">
                      <Users className="w-3.5 h-3.5" /> Assign
                    </Link>
                  </div>
                ))}
                {sectionsWithoutAdviser.length > 6 && (
                  <p className="px-4 py-2 text-[11.5px] text-slate-400">
                    +{sectionsWithoutAdviser.length - 6} more
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ws-card">
          <div className="ws-card-header">
            <h2 className="ws-section-title flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-slate-400" /> Recent Activity
            </h2>
          </div>
          {!logsLoaded ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="px-4 py-6 text-center text-[11.5px] text-slate-400">
              No administrative activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLogs.map((l) => (
                <div key={l.id} className="px-4 py-2.5 flex items-start gap-2.5">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-slate-700">
                      <span className="font-semibold capitalize">{l.action}</span>
                      <span className="text-slate-400"> on {l.table_name.replaceAll('_', ' ')}</span>
                    </p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">{timeAgo(l.created_at)}</p>
                  </div>
                </div>
              ))}
              <Link to="/admin/logs" className="block px-4 py-2 text-[11.5px] font-medium text-primary-700 hover:bg-primary-50/60">
                View all audit logs →
              </Link>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-slate-400 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> Administrators manage structure and accounts; teachers create content only inside subjects assigned to them.
      </p>
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}