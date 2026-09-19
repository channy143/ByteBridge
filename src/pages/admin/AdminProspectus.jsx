import { useState, useMemo } from 'react';
import useAdminData, { programName } from './useAdminData';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/admin/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  X,
  GraduationCap,
  BookOpen,
  Layers,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  DEFAULT_BTLED_ICT_CURRICULUM,
  BTLED_PROGRAM_INFO,
  YEAR_LABELS,
} from '../../data/curriculumData';

const inputClass =
  'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';

function ProspectusSubjectModal({ subject, programs, allSubjects, onClose, onSaved }) {
  const isEdit = !!subject;
  const [form, setForm] = useState({
    subject_code: subject?.subject_code || '',
    subject_title: subject?.subject_title || '',
    description: subject?.description || '',
    program_id: subject?.program_id || '',
    year_level: subject?.year_level || '1',
    semester: subject?.semester || '1st Semester',
    lec_units: subject?.lec_units ?? (subject?.units ? Number(subject.units) : 3),
    lab_units: subject?.lab_units ?? 0,
    units: subject?.units ?? 3,
    prerequisites: subject?.prerequisites || 'None',
    co_requisites: subject?.co_requisites || 'None',
    order_index: subject?.order_index ?? 0,
    status: subject?.status || 'Active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleLecLabChange = (field, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    const updated = { ...form, [field]: num };
    updated.units = updated.lec_units + updated.lab_units;
    setForm(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const duplicate = allSubjects.find(
      (s) =>
        s.subject_code?.trim().toLowerCase() === form.subject_code?.trim().toLowerCase() &&
        s.id !== subject?.id
    );
    if (duplicate) {
      setError('A subject with this course code already exists.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        subject_code: form.subject_code.trim(),
        subject_title: form.subject_title.trim(),
        description: form.description || null,
        program_id: form.program_id || null,
        year_level: String(form.year_level),
        semester: form.semester,
        units: Number(form.units),
        lec_units: Number(form.lec_units),
        lab_units: Number(form.lab_units),
        prerequisites: form.prerequisites?.trim() || 'None',
        co_requisites: form.co_requisites?.trim() || 'None',
        order_index: Number(form.order_index) || 0,
        status: form.status,
      };

      if (isEdit) {
        const { error: upError } = await supabase
          .from('subjects')
          .update(payload)
          .eq('id', subject.id);
        if (upError) throw upError;
        onSaved(`Subject ${form.subject_code} updated successfully.`);
      } else {
        const { error: insError } = await supabase
          .from('subjects')
          .insert(payload);
        if (insError) throw insError;
        onSaved(`Subject ${form.subject_code} created successfully.`);
      }
      onClose();
    } catch (err) {
      console.error('Error saving subject:', err);
      // Fallback message if column doesn't exist yet
      if (err.message?.includes('column') || err.message?.includes('PGRST204')) {
        setError('Database schema needs updating. Please execute sql_folder/supabase_prospectus.sql in the Supabase SQL Editor to enable all prospectus columns.');
      } else {
        setError(err.message || 'Failed to save subject.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit ${subject.subject_code}` : 'Add Prospectus Subject'}
      subtitle="Configure subject details, units, semester placement, and prerequisites."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="ws-label">Course Code *</label>
            <input
              required
              value={form.subject_code}
              onChange={(e) => setForm({ ...form, subject_code: e.target.value })}
              placeholder="e.g. ICT 101"
              className={inputClass}
            />
          </div>
          <div>
            <label className="ws-label">Course Title *</label>
            <input
              required
              value={form.subject_title}
              onChange={(e) => setForm({ ...form, subject_title: e.target.value })}
              placeholder="e.g. Fundamentals of Computing"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="ws-label">Program</label>
            <select
              value={form.program_id}
              onChange={(e) => setForm({ ...form, program_id: e.target.value })}
              className={inputClass}
            >
              <option value="">All / General</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} - ` : ''}{p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ws-label">Year Level</label>
            <select
              value={form.year_level}
              onChange={(e) => setForm({ ...form, year_level: e.target.value })}
              className={inputClass}
            >
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
          <div>
            <label className="ws-label">Semester</label>
            <select
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
              className={inputClass}
            >
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer">Summer Term</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="ws-label">Lecture Units</label>
            <input
              type="number"
              min="0"
              value={form.lec_units}
              onChange={(e) => handleLecLabChange('lec_units', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="ws-label">Lab Units</label>
            <input
              type="number"
              min="0"
              value={form.lab_units}
              onChange={(e) => handleLecLabChange('lab_units', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="ws-label">Total Units</label>
            <input
              type="number"
              min="0"
              value={form.units}
              onChange={(e) => setForm({ ...form, units: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="ws-label">Pre-requisite(s)</label>
            <input
              value={form.prerequisites}
              onChange={(e) => setForm({ ...form, prerequisites: e.target.value })}
              placeholder="e.g. ICT 101, ICT 102 or None"
              className={inputClass}
            />
            <p className="text-[11px] text-slate-400 mt-1">Separate multiple codes with commas.</p>
          </div>
          <div>
            <label className="ws-label">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputClass}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg text-[12.5px] bg-red-50 text-red-700 border border-red-100 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="ws-btn-secondary">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button type="submit" disabled={saving} className="ws-btn-primary">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Create Subject'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SyncModal({ onClose, onSynced }) {
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sqlError, setSqlError] = useState(null);

  const sampleSql = `-- Run this in Supabase SQL Editor to seed the BTLED ICT Prospectus:
-- See sql_folder/supabase_prospectus.sql for full 41 subjects.`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sampleSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSyncToDb = async () => {
    setSyncing(true);
    setSqlError(null);
    try {
      // 1. Ensure BTLED-ICT program exists
      let progId = null;
      const { data: progs } = await supabase
        .from('programs')
        .select('id, code')
        .or('code.eq.BTLED-ICT,name.ilike.%BTLED%')
        .limit(1);

      if (progs && progs.length > 0) {
        progId = progs[0].id;
      } else {
        const { data: newProg, error: pErr } = await supabase
          .from('programs')
          .insert({
            name: BTLED_PROGRAM_INFO.name,
            code: BTLED_PROGRAM_INFO.code,
            status: 'Active',
          })
          .select()
          .single();
        if (!pErr && newProg) progId = newProg.id;
      }

      // 2. Insert standard subjects that don't exist yet
      const { data: existing } = await supabase.from('subjects').select('subject_code');
      const existingCodes = new Set((existing || []).map((s) => s.subject_code?.trim().toUpperCase()));

      const toInsert = DEFAULT_BTLED_ICT_CURRICULUM.filter(
        (def) => !existingCodes.has(def.subject_code.trim().toUpperCase())
      ).map((def) => ({
        subject_code: def.subject_code,
        subject_title: def.subject_title,
        program_id: progId,
        year_level: def.year_level,
        semester: def.semester,
        units: def.units,
        lec_units: def.lec_units,
        lab_units: def.lab_units,
        prerequisites: def.prerequisites,
        co_requisites: def.co_requisites,
        order_index: def.order_index,
        status: 'Active',
      }));

      if (toInsert.length === 0) {
        onSynced('All 41 BTLED ICT prospectus subjects already exist in the database.');
        onClose();
        return;
      }

      const { error: insErr } = await supabase.from('subjects').insert(toInsert);
      if (insErr) throw insErr;

      onSynced(`Successfully seeded ${toInsert.length} prospectus subjects to Supabase!`);
      onClose();
    } catch (err) {
      console.error('Sync failed:', err);
      setSqlError(
        'Direct batch insert requires prospectus database columns. Please run sql_folder/supabase_prospectus.sql in the Supabase SQL Editor.'
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Standard BTLED-ICT Prospectus Sync"
      subtitle="Instantly populate or verify the official 4-Year CHED curriculum checklist."
    >
      <div className="space-y-4 text-[13px] text-slate-600">
        <div className="bg-primary-50/60 border border-primary-100 rounded-lg p-3">
          <p className="font-semibold text-primary-900">
            Official 4-Year BTLED ICT Curriculum:
          </p>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-primary-800 text-[12px]">
            <li>41 total subjects across 8 semesters (1st Year to 4th Year)</li>
            <li>122 - 142 complete credit units (Lecture &amp; Laboratory breakdown)</li>
            <li>Pre-configured prerequisite chains (e.g. ICT 101 → ICT 102 / 103 → ICT 201)</li>
            <li>General Education, Professional Education, and Capstone Series</li>
          </ul>
        </div>

        {sqlError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 space-y-2">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" /> Database Migration Recommended
            </p>
            <p className="text-[12px]">
              {sqlError}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopySql}
                className="ws-btn-secondary text-[11.5px] py-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Instructions!' : 'Copy Migration SQL Path'}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="ws-btn-secondary">
            Close
          </button>
          <button
            type="button"
            onClick={handleSyncToDb}
            disabled={syncing}
            className="ws-btn-primary"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Syncing with Supabase…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Sync 41 Subjects Now
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminProspectus() {
  const { loading, subjects, programs, reload } = useAdminData();
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('All');
  const [semFilter, setSemFilter] = useState('All');
  const [programFilter, setProgramFilter] = useState('All');
  const [modal, setModal] = useState(null); // null | 'create' | subject (edit)
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [flash, setFlash] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const notify = (text, tone = 'ok') => {
    setFlash({ text, tone });
    setTimeout(() => setFlash(null), 5000);
  };

  // Fallback to default curriculum if database subjects are not populated yet
  const displayedSubjects = useMemo(() => {
    if (subjects && subjects.length > 0) {
      return subjects;
    }
    return DEFAULT_BTLED_ICT_CURRICULUM;
  }, [subjects]);

  const filtered = useMemo(() => {
    return displayedSubjects.filter((s) => {
      if (yearFilter !== 'All' && String(s.year_level) !== String(yearFilter)) return false;
      if (semFilter !== 'All' && s.semester !== semFilter) return false;
      if (programFilter !== 'All' && s.program_id !== programFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const code = s.subject_code?.toLowerCase() || '';
        const title = s.subject_title?.toLowerCase() || '';
        const prereq = s.prerequisites?.toLowerCase() || '';
        if (!code.includes(q) && !title.includes(q) && !prereq.includes(q)) return false;
      }
      return true;
    });
  }, [displayedSubjects, yearFilter, semFilter, programFilter, search]);

  // Metrics
  const stats = useMemo(() => {
    const totalCount = displayedSubjects.length;
    const totalUnits = displayedSubjects.reduce((acc, s) => acc + Number(s.units || 0), 0);
    const totalLec = displayedSubjects.reduce((acc, s) => acc + Number(s.lec_units ?? s.units ?? 0), 0);
    const totalLab = displayedSubjects.reduce((acc, s) => acc + Number(s.lab_units ?? 0), 0);
    return { totalCount, totalUnits, totalLec, totalLab };
  }, [displayedSubjects]);

  const handleDelete = async (subject) => {
    if (!window.confirm(`Delete ${subject.subject_code} - "${subject.subject_title}" from the prospectus?`)) {
      return;
    }
    setDeletingId(subject.id);
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', subject.id);
      if (error) throw error;
      notify(`Subject ${subject.subject_code} deleted.`);
      reload();
    } catch (err) {
      notify(err.message || 'Failed to delete subject.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Curriculum Prospectus Management"
        subtitle="Manage program checklist, course codes, prerequisite hierarchies, and academic unit loads."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSyncModalOpen(true)}
              className="ws-btn-secondary"
            >
              <Sparkles className="w-4 h-4 text-amber-500" /> Sync BTLED ICT Standard
            </button>
            <button
              type="button"
              onClick={() => setModal('create')}
              className="ws-btn-primary"
            >
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>
        }
      />

      {flash && (
        <div
          className={`px-4 py-3 rounded-lg text-[13px] font-medium border flex items-center justify-between ${
            flash.tone === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <span>{flash.text}</span>
          <button type="button" onClick={() => setFlash(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="ws-card px-4 py-3">
          <span className="w-8 h-8 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center">
            <GraduationCap className="w-4 h-4" />
          </span>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Total Subjects</p>
          <p className="text-[18px] font-bold text-slate-900 leading-tight">{stats.totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">In academic curriculum</p>
        </div>

        <div className="ws-card px-4 py-3">
          <span className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </span>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Total Credit Units</p>
          <p className="text-[18px] font-bold text-slate-900 leading-tight">{stats.totalUnits} Units</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Required for graduation</p>
        </div>

        <div className="ws-card px-4 py-3">
          <span className="w-8 h-8 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </span>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Lecture Load</p>
          <p className="text-[18px] font-bold text-slate-900 leading-tight">{stats.totalLec} Units</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Classroom instruction</p>
        </div>

        <div className="ws-card px-4 py-3">
          <span className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
            <HelpCircle className="w-4 h-4" />
          </span>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Laboratory Load</p>
          <p className="text-[18px] font-bold text-slate-900 leading-tight">{stats.totalLab} Units</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Hands-on computing labs</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="ws-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code, title, prereq…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[12.5px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-2.5 py-1.5 text-[12px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="All">All Year Levels</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          {/* Semester Filter */}
          <select
            value={semFilter}
            onChange={(e) => setSemFilter(e.target.value)}
            className="px-2.5 py-1.5 text-[12px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="All">All Semesters</option>
            <option value="1st Semester">1st Semester</option>
            <option value="2nd Semester">2nd Semester</option>
            <option value="Summer">Summer Term</option>
          </select>

          {/* Program Filter */}
          {programs && programs.length > 0 && (
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="px-2.5 py-1.5 text-[12px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            >
              <option value="All">All Programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code || p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="ws-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-60" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-8 h-8" />}
            title="No prospectus subjects found"
            description="No subjects matched your criteria. You can add one or sync the standard BTLED ICT checklist."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ws-table w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-2.5 px-3">Course Code</th>
                  <th className="py-2.5 px-3">Descriptive Title</th>
                  <th className="py-2.5 px-3">Year / Term</th>
                  <th className="py-2.5 px-3 text-center">Lec</th>
                  <th className="py-2.5 px-3 text-center">Lab</th>
                  <th className="py-2.5 px-3 text-center">Units</th>
                  <th className="py-2.5 px-3">Pre-requisite(s)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[12.5px]">
                {filtered.map((s) => (
                  <tr key={s.id || s.subject_code} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11.5px]">
                        {s.subject_code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 min-w-[200px]">
                      <p className="font-semibold text-slate-800">{s.subject_title}</p>
                      {s.program_id && (
                        <p className="text-[10.5px] text-slate-400">
                          {programName(programs, s.program_id)}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      {YEAR_LABELS[s.year_level] || `Year ${s.year_level || '1'}`} • {s.semester || '1st Semester'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 whitespace-nowrap">
                      {s.lec_units ?? s.units ?? 3}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 whitespace-nowrap">
                      {s.lab_units ?? 0}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 whitespace-nowrap">
                      {s.units ?? 3}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {s.prerequisites && s.prerequisites !== 'None' ? (
                        <span className="inline-block text-[11px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {s.prerequisites}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11.5px]">None</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StatusBadge status={s.status || 'Active'} dot />
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setModal(s)}
                          className="p-1 text-slate-400 hover:text-primary-600 rounded transition-colors"
                          title="Edit subject"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {s.id && (
                          <button
                            type="button"
                            disabled={deletingId === s.id}
                            onClick={() => handleDelete(s)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Delete subject"
                          >
                            {deletingId === s.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal && (
        <ProspectusSubjectModal
          subject={modal === 'create' ? null : modal}
          programs={programs}
          allSubjects={displayedSubjects}
          onClose={() => setModal(null)}
          onSaved={(msg) => {
            notify(msg);
            reload();
          }}
        />
      )}

      {syncModalOpen && (
        <SyncModal
          onClose={() => setSyncModalOpen(false)}
          onSynced={(msg) => {
            notify(msg);
            reload();
          }}
        />
      )}
    </div>
  );
}
