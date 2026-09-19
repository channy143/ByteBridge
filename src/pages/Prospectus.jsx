import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/admin/Modal';
import {
  DEFAULT_BTLED_ICT_CURRICULUM,
  BTLED_PROGRAM_INFO,
  DEFAULT_SAMPLE_STUDENTS,
  DEFAULT_FACULTY_COORDINATORS,
  DEFAULT_SYLLABI_INFO,
  getCurriculumMacroAnalytics,
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
  Unlock,
  BookOpen,
  Award,
  Sparkles,
  RefreshCw,
  Info,
  Layers,
  UserCheck,
  BookMarked,
  Pencil,
  FileText,
  X,
  AlertTriangle,
  Check,
} from 'lucide-react';

export default function Prospectus() {
  const { profile } = useAuth();
  const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin';

  // Academic Context Switcher states (Teacher / Admin)
  const [viewMode, setViewMode] = useState('student'); // 'student' | 'master'
  const [studentsList, setStudentsList] = useState(DEFAULT_SAMPLE_STUDENTS);
  const [selectedStudentId, setSelectedStudentId] = useState(DEFAULT_SAMPLE_STUDENTS[0].id);
  const [catalogProgram, setCatalogProgram] = useState('BTLED-ICT');
  const [catalogYear, setCatalogYear] = useState('2025-2026');

  // Core Data
  const [dbSubjects, setDbSubjects] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Advising & Student Target GWA Planning
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulatedGrades, setSimulatedGrades] = useState({});

  // Teacher Advising Overrides & Waivers
  const [waivedCodes, setWaivedCodes] = useState(new Set());
  const [advisingOverrides, setAdvisingOverrides] = useState({}); // { [subjectCode]: { grade, status, remarks } }
  const [overrideModalSubject, setOverrideModalSubject] = useState(null);
  const [overrideForm, setOverrideForm] = useState({ status: 'Passed', grade: '1.25', remarks: '' });
  const [waiverModalSubject, setWaiverModalSubject] = useState(null);
  const [syllabusModalSubject, setSyllabusModalSubject] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [savingOverride, setSavingOverride] = useState(false);

  const showToast = (msg, tone = 'ok') => {
    setToastMessage({ text: msg, tone });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Determine currently selected student profile
  const selectedStudent = useMemo(() => {
    if (!isTeacherOrAdmin) {
      return {
        id: profile?.id,
        student_id: profile?.student_id,
        full_name: profile?.full_name,
        course_year_section: profile?.course_year_section || profile?.year_and_section || 'BTLED ICT',
        program: 'BTLED-ICT',
        year_level: '1',
      };
    }
    return studentsList.find((s) => s.id === selectedStudentId) || studentsList[0] || null;
  }, [isTeacherOrAdmin, profile, studentsList, selectedStudentId]);

  // Load students list for Teachers/Advisers
  useEffect(() => {
    if (!isTeacherOrAdmin) return;
    let active = true;
    (async () => {
      try {
        const { data: dbStudents } = await supabase
          .from('students')
          .select('id, student_id, full_name, course_year_section, program, year_level');

        if (active && dbStudents && dbStudents.length > 0) {
          // Merge with sample students so teacher always has immediate advisees
          const existingIds = new Set(dbStudents.map((s) => s.student_id));
          const filteredSamples = DEFAULT_SAMPLE_STUDENTS.filter(
            (sample) => !existingIds.has(sample.student_id)
          );
          const combined = [...dbStudents, ...filteredSamples];
          setStudentsList(combined);
          setSelectedStudentId((prev) => (!prev || !combined.some((s) => s.id === prev) ? combined[0].id : prev));
        }
      } catch (err) {
        console.warn('Using default advisee students list:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [isTeacherOrAdmin]);

  // Fetch subjects and enrollments for currently active student
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch subjects from database
      const { data: subData } = await supabase
        .from('subjects')
        .select('*')
        .order('order_index', { ascending: true });

      setDbSubjects(subData && subData.length > 0 ? subData : []);

      // 2. Fetch enrollments for active student
      const activeStudentId = selectedStudent?.id;
      if (activeStudentId) {
        // If sample student, use preset enrollments
        const sampleMatch = DEFAULT_SAMPLE_STUDENTS.find((s) => s.id === activeStudentId);
        if (sampleMatch && sampleMatch.enrollments) {
          setEnrollments(sampleMatch.enrollments);
        } else {
          const { data: eData } = await supabase
            .from('enrollments')
            .select('id, student_id, subject_id, grade, completion_status, subject:subjects(*)')
            .eq('student_id', activeStudentId);
          setEnrollments(eData || []);
        }
      } else {
        setEnrollments([]);
      }
    } catch (err) {
      console.error('Error loading prospectus data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedStudent?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine database subjects with default curriculum to ensure complete 41 subjects
  const baseSubjects = useMemo(() => {
    if (!dbSubjects || dbSubjects.length === 0) {
      return DEFAULT_BTLED_ICT_CURRICULUM;
    }
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

  // Merge simulated grades and teacher advising overrides
  const effectiveEnrollments = useMemo(() => {
    const map = new Map();

    // Base student enrollments
    enrollments.forEach((e) => {
      const code = (e.subject?.subject_code || e.subject_code || '').toUpperCase();
      if (code) map.set(code, { ...e, subject_code: code });
      if (e.subject_id) map.set(e.subject_id, { ...e });
    });

    // Apply Student Target GWA simulations (if enabled)
    if (simulationMode) {
      Object.entries(simulatedGrades).forEach(([subjId, sim]) => {
        const existing = map.get(subjId);
        if (existing) {
          map.set(subjId, { ...existing, grade: sim.grade, completion_status: sim.status });
        } else {
          map.set(subjId, { subject_id: subjId, grade: sim.grade, completion_status: sim.status });
        }
      });
    }

    // Apply Teacher Advising Overrides (Credited, Grade manual entry, Special status)
    Object.entries(advisingOverrides).forEach(([code, ovr]) => {
      const uCode = code.toUpperCase();
      const existing = map.get(uCode);
      if (existing) {
        map.set(uCode, { ...existing, grade: ovr.grade, completion_status: ovr.status, remarks: ovr.remarks });
      } else {
        map.set(uCode, { subject_code: uCode, grade: ovr.grade, completion_status: ovr.status, remarks: ovr.remarks });
      }
    });

    return Array.from(map.values());
  }, [enrollments, simulationMode, simulatedGrades, advisingOverrides]);

  // Compute student progress metrics
  const stats = useMemo(() => {
    return computeStudentProgress(baseSubjects, effectiveEnrollments, waivedCodes);
  }, [baseSubjects, effectiveEnrollments, waivedCodes]);

  // Macro analytics for Master Template mode
  const macroAnalytics = useMemo(() => {
    return getCurriculumMacroAnalytics(baseSubjects);
  }, [baseSubjects]);

  // Filter subjects for display
  const filteredSubjects = useMemo(() => {
    return stats.subjects.filter((subj) => {
      if (selectedYear !== 'All' && String(subj.year_level) !== String(selectedYear)) {
        return false;
      }
      if (statusFilter !== 'All') {
        if (statusFilter === 'Passed' && subj.status !== 'Passed') return false;
        if (statusFilter === 'Enrolled' && subj.status !== 'Enrolled') return false;
        if (statusFilter === 'To Take' && subj.status !== 'To Take' && subj.status !== 'Locked') return false;
        if (statusFilter === 'Locked' && subj.status !== 'Locked') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = subj.subject_code?.toLowerCase().includes(q);
        const titleMatch = subj.subject_title?.toLowerCase().includes(q);
        const catMatch = subj.category?.toLowerCase().includes(q);
        const prereqMatch = subj.prerequisites?.toLowerCase().includes(q);
        if (!codeMatch && !titleMatch && !catMatch && !prereqMatch) return false;
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

  // Handlers
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

  // Open Teacher Override Modal
  const openOverrideModal = (subj) => {
    setOverrideModalSubject(subj);
    const existingOverride = advisingOverrides[subj.subject_code];
    setOverrideForm({
      status: existingOverride?.status || subj.status || 'Passed',
      grade: existingOverride?.grade || subj.grade || '1.25',
      remarks: existingOverride?.remarks || '',
    });
  };

  // Save Teacher Override (persists to Supabase if valid UUID)
  const saveOverride = async (e) => {
    e.preventDefault();
    if (!overrideModalSubject) return;
    setSavingOverride(true);
    const uCode = overrideModalSubject.subject_code.toUpperCase();

    try {
      // If student is in Supabase and subject has a UUID, save to enrollments table
      if (
        selectedStudent?.id &&
        !selectedStudent.id.startsWith('sample-') &&
        overrideModalSubject.id &&
        !overrideModalSubject.id.startsWith('btled-')
      ) {
        await supabase.from('enrollments').upsert(
          {
            student_id: selectedStudent.id,
            subject_id: overrideModalSubject.id,
            grade: overrideForm.grade ? Number(overrideForm.grade) || null : null,
            completion_status: overrideForm.status,
          },
          { onConflict: 'student_id,subject_id' }
        );
      }

      setAdvisingOverrides((prev) => ({
        ...prev,
        [uCode]: {
          status: overrideForm.status,
          grade: overrideForm.grade || null,
          remarks: overrideForm.remarks,
        },
      }));

      showToast(`Advising override saved for ${uCode}.`);
      setOverrideModalSubject(null);
    } catch (err) {
      console.error('Failed to save advising override:', err);
      showToast('Saved to local advising session.', 'amber');
      setOverrideModalSubject(null);
    } finally {
      setSavingOverride(false);
    }
  };

  // Confirm and apply Dean / Adviser Prerequisite Waiver
  const confirmPrerequisiteWaiver = () => {
    if (!waiverModalSubject) return;
    const uCode = waiverModalSubject.subject_code.toUpperCase();

    setWaivedCodes((prev) => {
      const next = new Set(prev);
      next.add(uCode);
      return next;
    });

    setAdvisingOverrides((prev) => ({
      ...prev,
      [uCode]: {
        status: 'Enrolled',
        grade: null,
        remarks: 'Prerequisite requirement waived by Academic Adviser / Dean authorization.',
      },
    }));

    showToast(`Prerequisite waived for ${uCode}. Course is now unlocked for enrollment.`);
    setWaiverModalSubject(null);
  };

  return (
    <div className="space-y-4 print:p-0 print:m-0">
      {/* Print-only Official Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
          Republic of the Philippines
        </h1>
        <h2 className="text-base font-semibold text-slate-800">
          ByteBridge Institute of Technology
        </h2>
        <p className="text-xs text-slate-600">College of Education &amp; Information Technology</p>
        <div className="mt-3 py-1 bg-slate-100 border text-sm font-bold uppercase">
          Official Academic Prospectus &amp; Curriculum Checklist
        </div>
        <div className="grid grid-cols-2 text-left text-xs mt-3 gap-2 px-2">
          <div>
            <p><span className="font-semibold">Student Name:</span> {selectedStudent?.full_name || 'N/A'}</p>
            <p><span className="font-semibold">Student ID:</span> {selectedStudent?.student_id || 'N/A'}</p>
            <p><span className="font-semibold">Program:</span> {BTLED_PROGRAM_INFO.name}</p>
          </div>
          <div>
            <p><span className="font-semibold">Major:</span> {BTLED_PROGRAM_INFO.major}</p>
            <p><span className="font-semibold">Course Year &amp; Section:</span> {selectedStudent?.course_year_section || 'BTLED-ICT'}</p>
            <p><span className="font-semibold">Date Generated:</span> {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="print:hidden">
        <PageHeader
          title={viewMode === 'master' ? 'Curriculum Master Blueprint' : 'Curriculum Prospectus'}
          subtitle={
            viewMode === 'master'
              ? `${BTLED_PROGRAM_INFO.name} (${catalogProgram}) · Catalog ${catalogYear} · OBE-Compliant Framework`
              : `${BTLED_PROGRAM_INFO.name} — Major in ${BTLED_PROGRAM_INFO.major}`
          }
          actions={
            <div className="flex items-center gap-2">
              {viewMode === 'student' && (
                <button
                  type="button"
                  onClick={() => setSimulationMode(!simulationMode)}
                  className={`ws-btn-secondary ${simulationMode ? 'border-primary-500 text-primary-700 bg-primary-50' : ''}`}
                  title="Simulate future grades to test GWA outcomes"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {simulationMode ? 'Exit Planning Mode' : 'Target GWA Planner'}
                </button>
              )}
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

      {/* 1. Academic Context Switcher (Teachers & Admins Only) */}
      {isTeacherOrAdmin && (
        <div className="ws-card p-3.5 bg-slate-900 text-white rounded-xl shadow-md border border-slate-800 print:hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider mr-1">
                <Layers className="w-4 h-4 text-primary-400" />
                Academic Context:
              </div>

              {/* View Mode Switcher */}
              <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewMode('student')}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all flex items-center gap-1.5 ${
                    viewMode === 'student'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Single Student Advising
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('master')}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all flex items-center gap-1.5 ${
                    viewMode === 'master'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  Master Template (Framework)
                </button>
              </div>
            </div>

            {/* Context Controls */}
            {viewMode === 'student' ? (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[11.5px] text-slate-400 font-medium whitespace-nowrap">
                  Advisee Student:
                </label>
                <select
                  value={selectedStudent?.id || ''}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setAdvisingOverrides({});
                    setWaivedCodes(new Set());
                  }}
                  className="px-3 py-1.5 text-[12.5px] bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 max-w-[280px]"
                >
                  {studentsList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.student_id ? `${st.student_id} — ` : ''}{st.full_name} ({st.course_year_section || 'BTLED-ICT'})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[11.5px] text-slate-400 font-medium whitespace-nowrap">
                  Program:
                </label>
                <select
                  value={catalogProgram}
                  onChange={(e) => setCatalogProgram(e.target.value)}
                  className="px-2.5 py-1.5 text-[12px] bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="BTLED-ICT">BTLED - ICT Major</option>
                  <option value="BTLED-HE">BTLED - Home Economics</option>
                  <option value="BTLED-IA">BTLED - Industrial Arts</option>
                </select>
                <label className="text-[11.5px] text-slate-400 font-medium whitespace-nowrap ml-1">
                  Catalog:
                </label>
                <select
                  value={catalogYear}
                  onChange={(e) => setCatalogYear(e.target.value)}
                  className="px-2.5 py-1.5 text-[12px] bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="2025-2026">2025–2026 (CHED CMO 78)</option>
                  <option value="2024-2025">2024–2025</option>
                  <option value="2023-2024">2023–2024</option>
                </select>
              </div>
            )}
          </div>

          {/* Subtitle Details Strip */}
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11.5px] text-slate-400 gap-2">
            {viewMode === 'student' ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span>
                  Advising: <strong className="text-white">{selectedStudent?.full_name}</strong> · ID: <span className="text-slate-300">{selectedStudent?.student_id || 'N/A'}</span> · Section: <span className="text-slate-300">{selectedStudent?.course_year_section || 'BTLED ICT'}</span>
                </span>
                <span className="text-amber-300 font-medium bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  Adviser Advising Active: You can encode grades, credit transfer courses, and waive prerequisites.
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-400 flex-shrink-0" />
                <span>
                  Viewing <strong className="text-white">Master Curriculum Framework</strong> · Program: <span className="text-slate-300">{BTLED_PROGRAM_INFO.name}</span>
                </span>
                <span className="text-blue-300 font-medium bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">
                  Framework Mode: Showing OBE syllabi links, faculty coordinators, and macro bottleneck analysis.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast feedback notice */}
      {toastMessage && (
        <div className="px-4 py-2.5 rounded-lg text-[12.5px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between shadow-xs print:hidden">
          <span>{toastMessage.text}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Simulation Banner if enabled */}
      {simulationMode && viewMode === 'student' && (
        <div className="ws-card bg-amber-50/70 border-amber-200 px-4 py-3 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-amber-900">
                Target GWA &amp; Curriculum Planning Mode Active
              </p>
              <p className="text-[11.5px] text-amber-700">
                Enter hypothetical grades into the subjects below to simulate future GWA outcomes.
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

      {/* 2. Metrics Display: Student Metrics OR Master Macro Analytics */}
      {viewMode === 'master' ? (
        /* Macro Analytics for Master Template Mode */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
          <div className="ws-card px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
                4 Years · 8 Sems
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Curriculum Scope
            </p>
            <p className="text-[18px] font-bold text-slate-900 leading-tight">
              {macroAnalytics.totalCourses} Subjects
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Accredited academic offerings
            </p>
          </div>

          <div className="ws-card px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Graduation Reqs
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Total Credit Units
            </p>
            <p className="text-[18px] font-bold text-slate-900 leading-tight">
              {macroAnalytics.totalUnits} Units
            </p>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              {macroAnalytics.totalLec} Lec units · {macroAnalytics.totalLab} Lab units
            </p>
          </div>

          <div className="ws-card px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                {macroAnalytics.majorCount} Major
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Curriculum Balance
            </p>
            <p className="text-[18px] font-bold text-slate-900 leading-tight">
              {macroAnalytics.profEdCount} Prof Ed · {macroAnalytics.geCount} Gen Ed
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Includes Capstones &amp; Practice Teaching
            </p>
          </div>

          <div className="ws-card px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Prereq Hubs
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Gateway Bottlenecks
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {macroAnalytics.bottlenecks.slice(0, 3).map((b) => (
                <span key={b.code} className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  {b.code} ({b.count} reqs)
                </span>
              ))}
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">
              Top critical course pathways
            </p>
          </div>
        </div>
      ) : (
        /* Single Student Mode Metrics */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
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
              Active in advising semester
            </p>
          </div>

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
      )}

      {/* Filter and Search Bar */}
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
              placeholder="Search code, title, or prerequisite…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-[12.5px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
          </div>

          {viewMode === 'student' && (
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
          )}
        </div>
      </div>

      {/* Prospectus Semesters Breakdown */}
      {loading ? (
        <div className="ws-card p-8 text-center text-slate-500">
          <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-[13px] font-medium">Loading prospectus data…</p>
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
                  {viewMode === 'student' ? (
                    <span className="text-[11.5px] font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                      {section.passedUnits} / {section.semUnits} Units Completed
                    </span>
                  ) : (
                    <span className="text-[11.5px] font-semibold text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded shadow-2xs">
                      {section.semUnits} Credit Units Required
                    </span>
                  )}
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

                      {/* Dynamic Columns based on View Mode */}
                      {viewMode === 'master' ? (
                        <>
                          <th className="py-2.5 px-3">Faculty Coordinator</th>
                          <th className="py-2.5 px-3 text-center">OBE Syllabus</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-center">Grade</th>
                          {isTeacherOrAdmin && (
                            <th className="py-2.5 px-3 text-right">Advising Action</th>
                          )}
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[12.5px]">
                    {section.items.map((subj) => {
                      const badge = getGradeBadge(subj.grade, subj.status);
                      const isLocked = subj.status === 'Locked';
                      const isPassed = subj.status === 'Passed';
                      const isEnrolled = subj.status === 'Enrolled';
                      const isWaived = subj.isWaived;
                      const coordinator = DEFAULT_FACULTY_COORDINATORS[subj.subject_code] || {
                        name: 'IT Faculty Coordinator',
                        title: 'College of Education & IT',
                      };

                      // Conditional row styling: Passed rows muted, active enrolled highlighted
                      let rowStyle = 'hover:bg-slate-50/50 transition-all';
                      if (viewMode === 'student') {
                        if (isPassed) {
                          rowStyle = 'opacity-65 bg-slate-50/40 hover:opacity-100 transition-opacity';
                        } else if (isEnrolled) {
                          rowStyle = 'bg-primary-50/25 border-l-3 border-primary-600 font-medium';
                        } else if (isLocked) {
                          rowStyle = 'bg-red-50/15';
                        }
                      }

                      return (
                        <tr key={subj.id || subj.subject_code} className={rowStyle}>
                          {/* Code */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11.5px]">
                              {subj.subject_code}
                            </span>
                          </td>

                          {/* Title & Category */}
                          <td className="py-2.5 px-3 min-w-[210px]">
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

                          {/* Credit Units */}
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800 whitespace-nowrap">
                            {subj.units}
                          </td>

                          {/* Pre-requisite with Tooltip */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {subj.prerequisites && subj.prerequisites !== 'None' ? (
                              <div className="relative group inline-block">
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border cursor-help ${
                                    isWaived
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : isLocked
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                  title={subj.prereqInfo?.message}
                                >
                                  {isWaived ? (
                                    <Unlock className="w-3 h-3 text-purple-600" />
                                  ) : isLocked ? (
                                    <Lock className="w-3 h-3 text-red-500" />
                                  ) : null}
                                  {subj.prerequisites}
                                </span>
                                {/* Dynamic Hover Popover */}
                                <div className="absolute z-30 bottom-full left-0 mb-1 hidden group-hover:block w-64 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl border border-slate-700 pointer-events-none">
                                  <p className="font-semibold text-slate-200 mb-0.5">Prerequisite Requirement</p>
                                  <p className="text-slate-300 leading-tight">
                                    {subj.prereqInfo?.message || subj.prerequisites}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11.5px]">None</span>
                            )}
                          </td>

                          {/* MASTER TEMPLATE COLUMNS */}
                          {viewMode === 'master' ? (
                            <>
                              {/* Faculty Coordinator */}
                              <td className="py-2.5 px-3 whitespace-nowrap min-w-[170px]">
                                <p className="font-medium text-slate-800 text-[12px]">
                                  {coordinator.name}
                                </p>
                                <p className="text-[10.5px] text-slate-400">
                                  {coordinator.title}
                                </p>
                              </td>

                              {/* OBE Syllabus Link */}
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setSyllabusModalSubject(subj)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors border border-primary-200"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>{DEFAULT_SYLLABI_INFO.version}</span>
                                </button>
                              </td>
                            </>
                          ) : (
                            /* SINGLE STUDENT ADVISING COLUMNS */
                            <>
                              {/* Status */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                      isPassed
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : isEnrolled
                                        ? 'bg-primary-50 text-primary-700 border-primary-200'
                                        : isLocked
                                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                    {isEnrolled && <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />}
                                    {isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                                    {subj.status}
                                  </span>

                                  {isWaived && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                                      Waived
                                    </span>
                                  )}

                                  {/* Bypass/Waive Prerequisite Button (Teacher/Admin Only) */}
                                  {isTeacherOrAdmin && isLocked && !isWaived && (
                                    <button
                                      type="button"
                                      onClick={() => setWaiverModalSubject(subj)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded shadow-2xs transition-colors cursor-pointer"
                                      title="Grant Dean/Advisor special waiver to unlock this subject"
                                    >
                                      <Unlock className="w-3 h-3 text-amber-600" />
                                      Waive Prereq
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Grade */}
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                {simulationMode && !isTeacherOrAdmin ? (
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

                              {/* Teacher Interactive Advising Override Action */}
                              {isTeacherOrAdmin && (
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => openOverrideModal(subj)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-primary-700 hover:bg-primary-50 rounded border border-slate-200 transition-colors"
                                    title="Manually override status, crediting, or grade for advising"
                                  >
                                    <Pencil className="w-3 h-3 text-slate-400" />
                                    Override
                                  </button>
                                </td>
                              )}
                            </>
                          )}
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
            {selectedStudent?.full_name || 'STUDENT SIGNATURE'}
          </div>
          <p className="text-[10px] text-slate-500 uppercase">Student</p>
        </div>
        <div>
          <div className="border-b border-slate-800 pb-1 mb-1 font-bold">
            {profile?.role === 'teacher' ? profile?.full_name : 'ACADEMIC ADVISER'}
          </div>
          <p className="text-[10px] text-slate-500 uppercase">Program Adviser</p>
        </div>
        <div>
          <div className="border-b border-slate-800 pb-1 mb-1 font-bold">
            DR. CARMEN MENDOZA
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

      {/* MODAL 1: Teacher Grade & Status Advising Override */}
      {overrideModalSubject && (
        <Modal
          open
          onClose={() => setOverrideModalSubject(null)}
          title={`Advising Override: ${overrideModalSubject.subject_code}`}
          subtitle={`Student: ${selectedStudent?.full_name} (${selectedStudent?.student_id || 'ID N/A'})`}
        >
          <form onSubmit={saveOverride} className="space-y-4 text-[13px]">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="font-semibold text-slate-800 text-[13.5px]">
                {overrideModalSubject.subject_title}
              </p>
              <p className="text-slate-500 text-[11.5px] mt-0.5">
                {overrideModalSubject.units} Credit Units ({overrideModalSubject.lec_units ?? 3} Lec / {overrideModalSubject.lab_units ?? 0} Lab) · Prereqs: {overrideModalSubject.prerequisites || 'None'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ws-label">Completion Status *</label>
                <select
                  value={overrideForm.status}
                  onChange={(e) => setOverrideForm({ ...overrideForm, status: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] bg-white"
                >
                  <option value="Passed">Passed (Credited / Completed)</option>
                  <option value="Enrolled">Enrolled (Currently Taking)</option>
                  <option value="To Take">To Take (Pending)</option>
                  <option value="Failed">Failed (Requires Retake)</option>
                </select>
              </div>

              <div>
                <label className="ws-label">Final Grade / Mark</label>
                <select
                  value={overrideForm.grade}
                  onChange={(e) => setOverrideForm({ ...overrideForm, grade: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] bg-white"
                >
                  <option value="">No Grade / Pending</option>
                  <option value="1.00">1.00 (Excellent / Highest)</option>
                  <option value="1.25">1.25 (Superior)</option>
                  <option value="1.50">1.50 (Very Good)</option>
                  <option value="1.75">1.75 (Good)</option>
                  <option value="2.00">2.00 (Satisfactory)</option>
                  <option value="2.25">2.25 (Fairly Satisfactory)</option>
                  <option value="2.50">2.50 (Fair)</option>
                  <option value="2.75">2.75 (Passing)</option>
                  <option value="3.00">3.00 (Conditional Pass)</option>
                  <option value="5.00">5.00 (Failed)</option>
                  <option value="INC">INC (Incomplete)</option>
                  <option value="DRP">DRP (Officially Dropped)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="ws-label">Advising Remarks / Crediting Justification</label>
              <input
                type="text"
                placeholder="e.g. Credited from previous college transfer / Dean approval"
                value={overrideForm.remarks}
                onChange={(e) => setOverrideForm({ ...overrideForm, remarks: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Records reason for official curriculum audit and transcript evaluation.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverrideModalSubject(null)}
                className="ws-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingOverride}
                className="ws-btn-primary"
              >
                <Check className="w-4 h-4" /> Save Advising Override
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Dean / Adviser Prerequisite Waiver Confirmation */}
      {waiverModalSubject && (
        <Modal
          open
          onClose={() => setWaiverModalSubject(null)}
          title="Dean / Adviser Prerequisite Waiver"
          subtitle="Authorize student enrollment despite unfulfilled prerequisite."
        >
          <div className="space-y-4 text-[13px] text-slate-600">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <p className="font-bold flex items-center gap-1.5 text-[13.5px]">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Special Prerequisite Bypass Authorization
              </p>
              <p className="text-[12px] mt-1 text-amber-900">
                You are about to authorize <strong>{selectedStudent?.full_name}</strong> to take{' '}
                <strong>{waiverModalSubject.subject_code} ({waiverModalSubject.subject_title})</strong>{' '}
                without completing required prerequisite <strong>{waiverModalSubject.prerequisites}</strong>.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-[12px]">
              <p><strong>Subject:</strong> {waiverModalSubject.subject_code} - {waiverModalSubject.subject_title}</p>
              <p><strong>Units:</strong> {waiverModalSubject.units} ({waiverModalSubject.lec_units ?? 3} Lec / {waiverModalSubject.lab_units ?? 0} Lab)</p>
              <p><strong>Prerequisite Requirement:</strong> {waiverModalSubject.prerequisites}</p>
              <p><strong>Authorization Role:</strong> Academic Adviser / Department Dean</p>
            </div>

            <p className="text-[11.5px] text-slate-500">
              Upon approval, this subject will immediately switch to <strong>Enrolled (Waived)</strong>, and all downstream dependent courses will be unlocked.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWaiverModalSubject(null)}
                className="ws-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPrerequisiteWaiver}
                className="ws-btn-primary bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Unlock className="w-4 h-4" /> Confirm &amp; Waive Prerequisite
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Master Template OBE Syllabus Preview */}
      {syllabusModalSubject && (
        <Modal
          open
          onClose={() => setSyllabusModalSubject(null)}
          title={`OBE Course Syllabus: ${syllabusModalSubject.subject_code}`}
          subtitle={syllabusModalSubject.subject_title}
        >
          <div className="space-y-4 text-[13px] text-slate-600">
            <div className="p-3 bg-primary-50/60 border border-primary-100 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-700">
                  CHED CMO No. 78 Series 2017 Compliant
                </span>
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  {DEFAULT_SYLLABI_INFO.status}
                </span>
              </div>
              <h4 className="text-[14px] font-bold text-primary-900 mt-1">
                {syllabusModalSubject.subject_code}: {syllabusModalSubject.subject_title}
              </h4>
              <p className="text-[12px] text-primary-800 mt-0.5">
                Version: {DEFAULT_SYLLABI_INFO.version} · Course Units: {syllabusModalSubject.units} ({syllabusModalSubject.lec_units ?? 3} Lec, {syllabusModalSubject.lab_units ?? 0} Lab)
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-semibold text-slate-800">Assigned Course Coordinator:</h5>
              <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200">
                <p className="font-bold text-slate-800">
                  {DEFAULT_FACULTY_COORDINATORS[syllabusModalSubject.subject_code]?.name || 'IT Faculty Coordinator'}
                </p>
                <p className="text-xs text-slate-500">
                  {DEFAULT_FACULTY_COORDINATORS[syllabusModalSubject.subject_code]?.title || 'College of Education & IT'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="font-semibold text-slate-800">Program Learning Outcomes (PLO):</h5>
              <ul className="list-disc list-inside text-[12px] text-slate-600 space-y-1">
                <li>Demonstrate specialized technical competency in computing and digital media.</li>
                <li>Apply modern pedagogies, assessment strategies, and OBE curriculum standards.</li>
                <li>Adhere to Philippine professional standards and ethical digital citizenship.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSyllabusModalSubject(null)}
                className="ws-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
