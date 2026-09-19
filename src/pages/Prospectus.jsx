import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import ProgressBar from '../components/ui/ProgressBar';
import {
  DEFAULT_BTLED_ICT_CURRICULUM,
  BTLED_PROGRAM_INFO,
  computeStudentProgress,
  getGradeBadge,
  YEAR_LABELS,
} from '../data/curriculumData';
import {
  GraduationCap,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  Lock,
  BookOpen,
  Award,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';

export default function Prospectus() {
  const { profile } = useAuth();
  const [dbSubjects, setDbSubjects] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulatedGrades, setSimulatedGrades] = useState({});

  // Fetch subjects and enrollments
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch subjects from database
      const { data: subData } = await supabase
        .from('subjects')
        .select('*')
        .order('order_index', { ascending: true });

      // 2. Fetch enrollments if student
      let enrData = [];
      if (profile?.id) {
        const { data: eData } = await supabase
          .from('enrollments')
          .select('id, student_id, subject_id, grade, completion_status, subject:subjects(*)')
          .eq('student_id', profile.id);
        enrData = eData || [];
      }

      setDbSubjects(subData && subData.length > 0 ? subData : []);
      setEnrollments(enrData);
    } catch (err) {
      console.error('Error loading prospectus data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine database subjects with default curriculum to ensure all 41 BTLED ICT subjects exist
  const baseSubjects = useMemo(() => {
    if (!dbSubjects || dbSubjects.length === 0) {
      return DEFAULT_BTLED_ICT_CURRICULUM;
    }
    // If DB has subjects, merge them with defaults so any missing fields (like lec/lab/prereqs) are filled
    const dbMap = new Map();
    dbSubjects.forEach((s) => {
      if (s.subject_code) dbMap.set(s.subject_code.trim().toUpperCase(), s);
    });

    return DEFAULT_BTLED_ICT_CURRICULUM.map((def) => {
      const existing = dbMap.get(def.subject_code.trim().toUpperCase());
      if (existing) {
        return {
          ...def,
          ...existing,
          units: existing.units ?? def.units,
          lec_units: existing.lec_units ?? def.lec_units,
          lab_units: existing.lab_units ?? def.lab_units,
          prerequisites: existing.prerequisites || def.prerequisites,
          order_index: existing.order_index ?? def.order_index,
        };
      }
      return def;
    });
  }, [dbSubjects]);

  // Merge simulated grades if in simulation mode
  const effectiveEnrollments = useMemo(() => {
    if (!simulationMode || Object.keys(simulatedGrades).length === 0) {
      return enrollments;
    }
    // Clone and override
    const map = new Map(enrollments.map((e) => [e.subject_id, { ...e }]));
    Object.entries(simulatedGrades).forEach(([subjId, sim]) => {
      const existing = map.get(subjId);
      if (existing) {
        map.set(subjId, {
          ...existing,
          grade: sim.grade,
          completion_status: sim.status,
        });
      } else {
        map.set(subjId, {
          id: `sim-${subjId}`,
          student_id: profile?.id,
          subject_id: subjId,
          grade: sim.grade,
          completion_status: sim.status,
        });
      }
    });
    return Array.from(map.values());
  }, [enrollments, simulationMode, simulatedGrades, profile?.id]);

  // Calculate full progress metrics
  const stats = useMemo(() => {
    return computeStudentProgress(baseSubjects, effectiveEnrollments);
  }, [baseSubjects, effectiveEnrollments]);

  // Filter subjects for display
  const filteredSubjects = useMemo(() => {
    return stats.subjects.filter((subj) => {
      // Year filter
      if (selectedYear !== 'All' && String(subj.year_level) !== String(selectedYear)) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Passed' && subj.status !== 'Passed') return false;
        if (statusFilter === 'Enrolled' && subj.status !== 'Enrolled') return false;
        if (statusFilter === 'To Take' && subj.status !== 'To Take' && subj.status !== 'Locked') return false;
        if (statusFilter === 'Locked' && subj.status !== 'Locked') return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = subj.subject_code?.toLowerCase().includes(q);
        const titleMatch = subj.subject_title?.toLowerCase().includes(q);
        const catMatch = subj.category?.toLowerCase().includes(q);
        if (!codeMatch && !titleMatch && !catMatch) return false;
      }
      return true;
    });
  }, [stats.subjects, selectedYear, statusFilter, searchQuery]);

  // Group filtered subjects by Year and Semester
  const groupedSections = useMemo(() => {
    const groups = [];
    const years = ['1', '2', '3', '4'];
    const semesters = ['1st Semester', '2nd Semester'];

    years.forEach((yr) => {
      if (selectedYear !== 'All' && selectedYear !== yr) return;
      semesters.forEach((sem) => {
        const items = filteredSubjects.filter(
          (s) => String(s.year_level) === yr && s.semester === sem
        );
        if (items.length > 0) {
          const semUnits = items.reduce((acc, curr) => acc + Number(curr.units || 0), 0);
          const passedUnits = items
            .filter((s) => s.status === 'Passed')
            .reduce((acc, curr) => acc + Number(curr.units || 0), 0);

          groups.push({
            yearLevel: yr,
            semester: sem,
            title: `${YEAR_LABELS[yr] || `Year ${yr}`} • ${sem}`,
            items,
            semUnits,
            passedUnits,
          });
        }
      });
    });
    return groups;
  }, [filteredSubjects, selectedYear]);

  const handlePrint = () => {
    window.print();
  };

  const handleSimulateChange = (subjId, grade) => {
    const num = parseFloat(grade);
    let status = 'Enrolled';
    if (!isNaN(num) && num > 0) {
      status = num <= 3.0 ? 'Passed' : 'Failed';
    }
    setSimulatedGrades((prev) => ({
      ...prev,
      [subjId]: { grade: grade || null, status },
    }));
  };

  return (
    <div className="space-y-5 print:p-0 print:m-0">
      {/* Print-only Official Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
          Republic of the Philippines
        </h1>
        <h2 className="text-base font-semibold text-slate-800">
          ByteBridge Institute of Technology
        </h2>
        <p className="text-xs text-slate-600">College of Education & Information Technology</p>
        <div className="mt-3 py-1 bg-slate-100 border text-sm font-bold uppercase">
          Official Academic Prospectus & Curriculum Checklist
        </div>
        <div className="grid grid-cols-2 text-left text-xs mt-3 gap-2 px-2">
          <div>
            <p><span className="font-semibold">Student Name:</span> {profile?.full_name || 'N/A'}</p>
            <p><span className="font-semibold">Student ID:</span> {profile?.student_id || 'N/A'}</p>
            <p><span className="font-semibold">Program:</span> {BTLED_PROGRAM_INFO.name}</p>
          </div>
          <div>
            <p><span className="font-semibold">Major:</span> {BTLED_PROGRAM_INFO.major}</p>
            <p><span className="font-semibold">Course Year & Section:</span> {profile?.year_and_section || 'BTLED-ICT'}</p>
            <p><span className="font-semibold">Date Generated:</span> {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="print:hidden">
        <PageHeader
          title="Curriculum Prospectus"
          subtitle={`${BTLED_PROGRAM_INFO.name} (${BTLED_PROGRAM_INFO.code}) — Major in ${BTLED_PROGRAM_INFO.major}`}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSimulationMode(!simulationMode)}
                className={`ws-btn-secondary ${simulationMode ? 'border-primary-500 text-primary-700 bg-primary-50' : ''}`}
                title="Simulate future grades to test GWA outcomes"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                {simulationMode ? 'Exit Planning Mode' : 'Target GWA Planner'}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="ws-btn-primary"
              >
                <Printer className="w-4 h-4" />
                Print / Export PDF
              </button>
            </div>
          }
        />
      </div>

      {/* Simulation Banner if enabled */}
      {simulationMode && (
        <div className="ws-card bg-amber-50/70 border-amber-200 px-4 py-3 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-amber-900">
                Target GWA & Curriculum Planning Mode Active
              </p>
              <p className="text-[11.5px] text-amber-700">
                Enter target grades into the subjects below to simulate your future GWA and curriculum completion.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSimulatedGrades({})}
            className="text-[12px] font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Simulation
          </button>
        </div>
      )}

      {/* Degree Overview Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
        {/* Progress */}
        <div className="ws-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {stats.progressPercent}%
            </span>
          </div>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Degree Progress
          </p>
          <p className="text-[18px] font-bold text-slate-900 leading-tight">
            {stats.passedUnits} <span className="text-slate-400 font-normal text-[13px]">/ {stats.totalUnits} Units</span>
          </p>
          <ProgressBar value={stats.progressPercent} className="mt-2" />
        </div>

        {/* GWA */}
        <div className="ws-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </span>
            {stats.gwa && (
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 truncate max-w-[110px]">
                {stats.academicStanding}
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            General Weighted Average
          </p>
          <p className="text-[18px] font-bold text-slate-900 leading-tight">
            {stats.gwa || '—'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.academicStanding}
          </p>
        </div>

        {/* Current Load */}
        <div className="ws-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
              {stats.enrolledCount} Subjects
            </span>
          </div>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Current Enrolled Load
          </p>
          <p className="text-[18px] font-bold text-slate-900 leading-tight">
            {stats.enrolledUnits} <span className="text-slate-400 font-normal text-[13px]">Units</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Active in current term
          </p>
        </div>

        {/* Remaining */}
        <div className="ws-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              {stats.totalSubjects - stats.passedCount - stats.enrolledCount} left
            </span>
          </div>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Remaining To Graduate
          </p>
          <p className="text-[18px] font-bold text-slate-900 leading-tight">
            {stats.remainingUnits} <span className="text-slate-400 font-normal text-[13px]">Units</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Across remaining semesters
          </p>
        </div>
      </div>

      {/* Interactive Controls & Filters (Screen Only) */}
      <div className="ws-card p-3 space-y-3 print:hidden">
        {/* Year Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100">
          {['All', '1', '2', '3', '4'].map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap transition-colors ${
                selectedYear === yr
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {yr === 'All' ? 'All Curriculum Years' : `${YEAR_LABELS[yr]}`}
            </button>
          ))}
        </div>

        {/* Search and Status Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code or subject title…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-[12.5px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mr-1">
              Status:
            </span>
            {['All', 'Passed', 'Enrolled', 'To Take', 'Locked'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prospectus Semesters Breakdown */}
      {loading ? (
        <div className="ws-card p-8 text-center text-slate-500">
          <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-[13px] font-medium">Loading academic prospectus…</p>
        </div>
      ) : groupedSections.length === 0 ? (
        <div className="ws-card p-8 text-center">
          <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">No subjects found</p>
          <p className="text-xs text-slate-500 mt-1">
            No subjects matched the selected year, status, or search query.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedSections.map((section) => (
            <div key={`${section.yearLevel}-${section.semester}`} className="ws-card overflow-hidden">
              {/* Semester Header */}
              <div className="ws-card-header bg-slate-50/70 border-b border-slate-100 py-2.5 px-4 flex items-center justify-between">
                <div>
                  <h3 className="text-[13.5px] font-bold text-slate-800">
                    {section.title}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {section.items.length} Course{section.items.length === 1 ? '' : 's'} • {section.semUnits} Total Units
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                    {section.passedUnits} / {section.semUnits} Units Completed
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="ws-table w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/40 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <th className="py-2.5 px-3">Subject Code</th>
                      <th className="py-2.5 px-3">Course Title</th>
                      <th className="py-2.5 px-3 text-center">Lec</th>
                      <th className="py-2.5 px-3 text-center">Lab</th>
                      <th className="py-2.5 px-3 text-center">Units</th>
                      <th className="py-2.5 px-3">Pre-requisite(s)</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[12.5px]">
                    {section.items.map((subj) => {
                      const badge = getGradeBadge(subj.grade, subj.status);
                      const isLocked = subj.status === 'Locked';
                      const isPassed = subj.status === 'Passed';
                      const isEnrolled = subj.status === 'Enrolled';

                      return (
                        <tr
                          key={subj.id || subj.subject_code}
                          className={`hover:bg-slate-50/50 transition-colors ${
                            isPassed ? 'bg-emerald-50/20' : isEnrolled ? 'bg-primary-50/15' : ''
                          }`}
                        >
                          {/* Code */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11.5px]">
                              {subj.subject_code}
                            </span>
                          </td>

                          {/* Title & Category */}
                          <td className="py-2.5 px-3 min-w-[220px]">
                            <p className="font-semibold text-slate-800 leading-snug">
                              {subj.subject_title}
                            </p>
                            {subj.category && (
                              <span className="inline-block mt-0.5 text-[10.5px] font-medium text-slate-400">
                                {subj.category}
                              </span>
                            )}
                          </td>

                          {/* Lec */}
                          <td className="py-2.5 px-3 text-center text-slate-600 whitespace-nowrap">
                            {subj.lec_units ?? subj.units ?? 3}
                          </td>

                          {/* Lab */}
                          <td className="py-2.5 px-3 text-center text-slate-600 whitespace-nowrap">
                            {subj.lab_units ?? 0}
                          </td>

                          {/* Units */}
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800 whitespace-nowrap">
                            {subj.units}
                          </td>

                          {/* Pre-requisite */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {subj.prerequisites && subj.prerequisites !== 'None' ? (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${
                                isLocked
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {isLocked && <Lock className="w-3 h-3 text-red-500" />}
                                {subj.prerequisites}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11.5px]">None</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              isPassed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isEnrolled
                                ? 'bg-primary-50 text-primary-700 border-primary-200'
                                : isLocked
                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {isEnrolled && <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />}
                              {isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                              {subj.status}
                            </span>
                          </td>

                          {/* Grade */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {simulationMode ? (
                              <input
                                type="text"
                                placeholder="1.00"
                                value={simulatedGrades[subj.id]?.grade ?? subj.grade ?? ''}
                                onChange={(e) => handleSimulateChange(subj.id, e.target.value)}
                                className="w-14 text-center px-1 py-0.5 border border-amber-300 rounded bg-white text-[12px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span className={`inline-block px-2 py-0.5 rounded text-[11.5px] border ${badge.tone}`}>
                                {badge.label}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Official Sign-off Section (Print-Only) */}
      <div className="hidden print:grid grid-cols-4 gap-6 mt-12 pt-8 text-center text-xs text-slate-800">
        <div>
          <div className="border-b border-slate-800 pb-1 mb-1 font-bold">
            {profile?.full_name || 'STUDENT SIGNATURE'}
          </div>
          <p className="text-[10px] text-slate-500 uppercase">Student</p>
        </div>
        <div>
          <div className="border-b border-slate-800 pb-1 mb-1 font-bold">
            ACADEMIC ADVISER
          </div>
          <p className="text-[10px] text-slate-500 uppercase">Program Adviser</p>
        </div>
        <div>
          <div className="border-b border-slate-800 pb-1 mb-1 font-bold">
            DEPARTMENT CHAIR
          </div>
          <p className="text-[10px] text-slate-500 uppercase">BTLED-ICT Coordinator</p>
        </div>
        <div>
          <div className="border-b border-slate-800 pb-1 mb-1 font-bold">
            UNIVERSITY REGISTRAR
          </div>
          <p className="text-[10px] text-slate-500 uppercase">Registrar's Office</p>
        </div>
      </div>
    </div>
  );
}
