import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Skeleton } from '../components/ui/Skeleton';
import {
  X, ChevronLeft, ChevronRight, FileText, Clock, Plus, Video, AlertCircle, Loader2,
} from 'lucide-react';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const EVENT_COLORS = {
  schedule: { label: 'Scheduled Class', light: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500' },
  deadline: { label: 'Activity Deadline', light: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' },
  live: { label: 'Live Session', light: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
};

const CALENDAR_COLORS = [
  { id: 'blue', label: 'Blue', bg: 'bg-blue-500', light: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500', cellBg: 'bg-blue-50' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500', cellBg: 'bg-amber-50' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500', cellBg: 'bg-emerald-50' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500', light: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500', cellBg: 'bg-rose-50' },
  { id: 'violet', label: 'Violet', bg: 'bg-violet-500', light: 'bg-violet-50 text-violet-700 border-violet-100', dot: 'bg-violet-500', cellBg: 'bg-violet-50' },
  { id: 'sky', label: 'Sky', bg: 'bg-sky-500', light: 'bg-sky-50 text-sky-700 border-sky-100', dot: 'bg-sky-500', cellBg: 'bg-sky-50' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-500', light: 'bg-orange-50 text-orange-700 border-orange-100', dot: 'bg-orange-500', cellBg: 'bg-orange-50' },
  { id: 'lime', label: 'Lime', bg: 'bg-lime-500', light: 'bg-lime-50 text-lime-700 border-lime-100', dot: 'bg-lime-500', cellBg: 'bg-lime-50' },
];

const getColorById = (id) => CALENDAR_COLORS.find((c) => c.id === id) || null;

const EVENT_PRIORITY = ['live', 'schedule', 'deadline'];

const resolveCellSolid = (evts) => {
  if (!evts.length) return '';
  const custom = evts.find((e) => e.color && getColorById(e.color));
  if (custom) return getColorById(custom.color).bg;
  for (const t of EVENT_PRIORITY) {
    if (evts.some((e) => e.type === t)) return EVENT_COLORS[t].dot;
  }
  return '';
};

// The dot color always follows the event type (Scheduled/Deadline/Live).
// The teacher-selected color is reserved for the date cell background.
const typeDot = (e) => EVENT_COLORS[e.type]?.dot || '';

const resolveEventStyle = (e) => {
  const custom = getColorById(e.color);
  return custom || EVENT_COLORS[e.type];
};

const ACTIVITY_TYPES = ['Assignment', 'Project', 'Quiz', 'Performance Task', 'Activity', 'Practical Task'];

const daysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const firstDayOfWeek = (d) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
const toDateKey = (d) => d.toISOString().slice(0, 10);
const isSameDay = (a, b) => toDateKey(a) === toDateKey(b);

const pad = (n) => String(n).padStart(2, '0');
const toInputValue = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => onChange('')}
        title="Default"
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 ${
          value === '' ? 'border-slate-500' : 'border-slate-200'
        } bg-slate-100 text-slate-400`}
      >
        <span className="text-[10px] font-bold">A</span>
      </button>
      {CALENDAR_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          title={c.label}
          className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${c.bg} ${
            value === c.id ? 'border-slate-700' : 'border-white/60'
          }`}
        />
      ))}
    </div>
  );
}

export default function TeacherTimetables() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const now = new Date();

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [events, setEvents] = useState([]);
  const [viewMonth, setViewMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [viewMode, setViewMode] = useState('month');

  // date context shared by detail / create modals
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [activityOpen, setActivityOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({});
  const [activitySaving, setActivitySaving] = useState(false);

  const [classOpen, setClassOpen] = useState(false);
  const [classForm, setClassForm] = useState({});
  const [classSaving, setClassSaving] = useState(false);

  const fieldClass = 'mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-white';
  const modalShell = 'fixed inset-0 z-50 flex items-center justify-center px-4';
  const modalCard = 'relative w-full bg-white rounded-xl border border-slate-200 shadow-2xl p-5 max-h-[90vh] overflow-y-auto';

  const load = useCallback(async () => {
    if (!profile) return;
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
          .select('id, subject_code, subject_title')
          .in('id', subjectIds);
        subs = data || [];
      }

      let evts = [];
      if (subjectIds.length > 0) {
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const sixMonthsAhead = new Date(now);
        sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);

        const [{ data: scheds }, { data: acts }, { data: sessions }] = await Promise.all([
          supabase
            .from('class_schedules')
            .select('id, subject_id, title, starts_at, ends_at, color')
            .in('subject_id', subjectIds)
            .gte('ends_at', threeMonthsAgo.toISOString())
            .lte('starts_at', sixMonthsAhead.toISOString()),
          supabase
            .from('activities')
            .select('id, subject_id, title, deadline, color')
            .in('subject_id', subjectIds)
            .not('deadline', 'is', null)
            .gte('deadline', threeMonthsAgo.toISOString())
            .lte('deadline', sixMonthsAhead.toISOString()),
          supabase
            .from('meeting_sessions')
            .select('id, subject_id, room_name, started_at, ended_at')
            .in('subject_id', subjectIds)
            .gte('started_at', threeMonthsAgo.toISOString())
            .lte('started_at', sixMonthsAhead.toISOString()),
        ]);

        evts = [
          ...(scheds || []).map((s) => ({
            id: `sch-${s.id}`,
            type: 'schedule',
            title: s.title,
            subject_id: s.subject_id,
            start: s.starts_at,
            end: s.ends_at,
            color: s.color || '',
          })),
          ...(acts || []).map((a) => ({
            id: `act-${a.id}`,
            type: 'deadline',
            title: a.title,
            subject_id: a.subject_id,
            deadline: a.deadline,
            start: a.deadline,
            color: a.color || '',
          })),
          ...(sessions || []).map((s) => ({
            id: `ses-${s.id}`,
            type: 'live',
            title: s.room_name?.replace(/bytebridge-/i, '').replace(/-\d+$/, '').replace(/-/g, ' ') || 'Live Session',
            subject_id: s.subject_id,
            start: s.started_at,
            end: s.ended_at,
            color: '',
          })),
        ];
      }

      setSubjects(subs);
      setEvents(evts);
    } catch (err) {
      console.error('Error loading timetable:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (profile) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const subjectName = (sid) => subjects.find((s) => s.id === sid)?.subject_title || '';

  const calDays = useMemo(() => {
    const total = daysInMonth(viewMonth);
    const start = firstDayOfWeek(viewMonth);
    const cells = [];
    for (let i = 0; i < start; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth]);

  const eventsForDate = (dateKey) =>
    events.filter((e) => {
      const eDate = e.deadline || e.start;
      return eDate && toDateKey(new Date(eDate)) === dateKey;
    });

  const handlePrev = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const handleNext = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  const handleToday = () => setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));

  const openDate = (day) => {
    if (!day) return;
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    const dateKey = toDateKey(date);
    const dayEvents = eventsForDate(dateKey);
    setSelectedDate({ day, date, dateKey, events: dayEvents });
    if (dayEvents.length > 0) setDetailOpen(true);
    else setCreateOpen(true);
  };

  const openActivityModal = () => {
    const d = selectedDate.date;
    setActivityForm({
      subject_id: subjects[0]?.id || '',
      title: '',
      description: '',
      activity_type: 'Assignment',
      deadline: toInputValue(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59)),
      points: 100,
      grading_criteria: '',
      color: '',
    });
    setDetailOpen(false);
    setCreateOpen(false);
    setActivityOpen(true);
  };

  const openClassModal = () => {
    const d = selectedDate.date;
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0);
    setClassForm({
      subject_id: subjects[0]?.id || '',
      title: '',
      starts_at: toInputValue(start),
      ends_at: toInputValue(end),
      color: '',
    });
    setDetailOpen(false);
    setCreateOpen(false);
    setClassOpen(true);
  };

  const insertEvent = async (table, row) => {
    const { error } = await supabase.from(table).insert(row);
    if (error && /color/i.test(error.message || '')) {
      const { color: _color, ...rest } = row;
      return supabase.from(table).insert(rest);
    }
    return { error };
  };

  const saveActivity = async (e) => {
    e.preventDefault();
    setActivitySaving(true);
    try {
      const row = {
        subject_id: activityForm.subject_id,
        title: activityForm.title.trim(),
        description: activityForm.description.trim() || null,
        activity_type: activityForm.activity_type,
        deadline: activityForm.deadline ? new Date(activityForm.deadline).toISOString() : null,
        points: parseInt(activityForm.points, 10) || 100,
        grading_criteria: activityForm.grading_criteria.trim() || null,
        created_by: profile.id,
      };
      if (activityForm.color) row.color = activityForm.color;
      const { error } = await insertEvent('activities', row);
      if (error) throw error;
      setActivityOpen(false);
      setDetailOpen(false);
      setCreateOpen(false);
      setSelectedDate(null);
      load();
    } catch (err) {
      console.error('Error creating activity:', err);
      alert('Failed to create activity.');
    } finally {
      setActivitySaving(false);
    }
  };

  const saveClass = async (e) => {
    e.preventDefault();
    setClassSaving(true);
    try {
      const row = {
        subject_id: classForm.subject_id,
        title: classForm.title.trim(),
        starts_at: new Date(classForm.starts_at).toISOString(),
        ends_at: new Date(classForm.ends_at).toISOString(),
        created_by: profile.id,
      };
      if (classForm.color) row.color = classForm.color;
      const { error } = await insertEvent('class_schedules', row);
      if (error) throw error;
      setClassOpen(false);
      setDetailOpen(false);
      setCreateOpen(false);
      setSelectedDate(null);
      load();
    } catch (err) {
      console.error('Error scheduling class:', err);
      alert('Failed to schedule class.');
    } finally {
      setClassSaving(false);
    }
  };

  return (
    <div>
      {/* Controls bar */}
      <div className="ws-card px-5 py-4 mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[18px] font-bold text-slate-900">Calendar</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-colors text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 rounded-md text-[12px] font-medium text-slate-700 hover:bg-white hover:shadow-sm transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-colors text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {['month', 'day'].map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1 rounded-md text-[12px] font-medium capitalize transition-colors ${
                  viewMode === m ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'month' ? 'Month' : 'Day'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 px-1">
        {Object.entries(EVENT_COLORS).map(([key, c]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
            <span className="text-[11.5px] font-medium text-slate-500">{c.label}</span>
          </div>
        ))}
        <div className="text-[11px] text-slate-400 ml-auto">Click a day to add or view events.</div>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="ws-card p-5">
          <Skeleton className="h-6 w-40 rounded mb-4" />
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24">
                <Skeleton className="h-3 w-6 rounded mb-2" />
                <Skeleton className="h-2 w-full rounded mb-1" />
                <Skeleton className="h-2 w-2/3 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'month' ? (
        <div className="ws-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200">
            {DAY_LABELS.map((d) => (
              <div key={d} className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-r border-slate-100 last:border-r-0">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calDays.map((day, i) => {
              const date = day ? new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day) : null;
              const dateKey = date ? toDateKey(date) : null;
              const isToday = date && isSameDay(date, now);
              const dayEvents = dateKey ? eventsForDate(dateKey) : [];
              const solidBg = day && dayEvents.length > 0 ? resolveCellSolid(dayEvents) : '';

              return (
                <div
                  key={i}
                  onClick={() => day && openDate(day)}
                  className={`min-h-[100px] border-r border-b border-slate-100 last:border-r-0 p-2 ${
                    day ? 'cursor-pointer hover:brightness-[0.98]' : ''
                  } ${solidBg || (isToday ? 'bg-primary-50/40' : '')}`}
                >
                  {day && (
                    <>
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[13px] font-semibold ${
                        isToday ? 'bg-primary-600 text-white' : solidBg ? 'text-white' : 'text-slate-700'
                      }`}>
                        {day}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border truncate ${
                              solidBg
                                ? 'bg-white/80 text-slate-800 border-white/60'
                                : resolveEventStyle(e).light
                            }`}
                          >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${typeDot(e)}`} />
                            {e.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className={`text-[10px] font-medium ${solidBg ? 'text-white' : 'text-slate-400'}`}>
                            +{dayEvents.length - 3} more
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="ws-card">
          <div className="px-5 py-4">
            <p className="text-[14px] font-semibold text-slate-800">
              {selectedDate
                ? selectedDate.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                : now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {(selectedDate ? selectedDate.events : eventsForDate(toDateKey(now))).length === 0 ? (
              <p className="px-5 py-10 text-center text-[12.5px] text-slate-400">
                Nothing scheduled for this day.
              </p>
            ) : (
              (selectedDate ? selectedDate.events : eventsForDate(toDateKey(now))).map((e) => {
                const style = resolveEventStyle(e);
                const time = e.start
                  ? new Date(e.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                  : null;
                return (
                  <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${typeDot(e)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{e.title}</p>
                      <p className="text-[11px] text-slate-400">{style.label} · {subjectName(e.subject_id)}</p>
                    </div>
                    {time && <span className="text-[12px] font-medium text-slate-500">{time}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Date detail modal */}
      {detailOpen && selectedDate && (
        <div className={modalShell}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDetailOpen(false)} />
          <div className={`${modalCard} max-w-md`}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-primary-600">
                  {selectedDate.date.toLocaleDateString(undefined, { weekday: 'long' })}
                </p>
                <h3 className="text-[16px] font-bold text-slate-900 mt-0.5">
                  {selectedDate.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  {selectedDate.events.length} event{selectedDate.events.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
              {selectedDate.events.length === 0 ? (
                <p className="px-5 py-10 text-center text-[12.5px] text-slate-400">
                  Nothing scheduled for this day.
                </p>
              ) : (
                selectedDate.events.map((e) => {
                  const style = resolveEventStyle(e);
                  const startTime = e.start ? new Date(e.start) : null;
                  const endTime = e.end ? new Date(e.end) : null;
                  const timeRange = startTime
                    ? `${startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${endTime ? ` – ${endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}`
                    : null;
                  return (
                    <div key={e.id} className="px-5 py-3.5 flex items-start gap-3">
                      <span className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${typeDot(e)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800">{e.title}</p>
                        <p className="text-[11.5px] text-slate-400 mt-0.5">
                          {style.label} · {subjectName(e.subject_id)}
                        </p>
                        {timeRange && (
                          <p className="text-[11.5px] text-slate-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {timeRange}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setDetailOpen(false);
                          if (e.type === 'schedule') navigate(`/classroom?subject=${e.subject_id}`);
                          else navigate(`/teacher/subjects/${e.subject_id}?tab=${e.type === 'deadline' ? 'activities' : 'classroom'}`);
                        }}
                        className="text-[11px] font-medium text-primary-600 hover:text-primary-700 flex-shrink-0 mt-0.5"
                      >
                        View
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
              <button
                onClick={() => { setDetailOpen(false); setCreateOpen(true); }}
                className="w-full ws-btn-primary justify-center"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
              <button
                onClick={() => setDetailOpen(false)}
                className="w-full ws-btn-secondary justify-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create options modal */}
      {createOpen && selectedDate && (
        <div className={modalShell}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setCreateOpen(false)} />
          <div className={`${modalCard} max-w-md`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">Add to {selectedDate.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">Choose what to create for this day.</p>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 mt-4">
              <button
                onClick={openActivityModal}
                className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50/50 text-left transition-colors group"
              >
                <span className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100">
                  <FileText className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-slate-800">New Activity</p>
                  <p className="text-[11.5px] text-slate-400">Create an assignment, quiz, or project with a deadline.</p>
                </div>
              </button>

              <button
                onClick={openClassModal}
                className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-blue-50/40 text-left transition-colors group"
              >
                <span className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100">
                  <Video className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-slate-800">Scheduled Video Class</p>
                  <p className="text-[11.5px] text-slate-400">Set a class time for a live session on this day.</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setCreateOpen(false)}
              className="mt-4 w-full ws-btn-secondary justify-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Activity modal */}
      {activityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => { setActivityOpen(false); setCreateOpen(true); }} />
          <div className="relative w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
              <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14.5px] font-bold text-slate-900">New Activity</h3>
                <p className="text-[11.5px] text-slate-400 truncate">
                  Due <span className="font-medium text-slate-600">{selectedDate.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span> · editable
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 flex-shrink-0">
                {activityForm.activity_type || 'Assignment'}
              </span>
              <button onClick={() => { setActivityOpen(false); setCreateOpen(true); }} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="activity-form" onSubmit={saveActivity} className="px-5 py-4 space-y-4 max-h-[calc(90vh-110px)] overflow-y-auto">
              <div>
                <label className="ws-label">Subject</label>
                <select value={activityForm.subject_id} onChange={(e) => setActivityForm({ ...activityForm, subject_id: e.target.value })} className={fieldClass} required>
                  <option value="" disabled>Select a subject…</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_title}</option>
                  ))}
                </select>
                {subjects.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> No subjects assigned yet. Contact your administrator.
                  </p>
                )}
              </div>

              <div>
                <label className="ws-label">Activity Title</label>
                <input required value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} placeholder="e.g. Video Editing Task" className={fieldClass} />
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
              </div>

              <div>
                <label className="ws-label">Instructions</label>
                <textarea rows={2} value={activityForm.description} onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })} placeholder="Optional — provide instructions for the activity…" className={`${fieldClass} resize-none`} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ws-label">Points</label>
                  <input type="number" min={1} value={activityForm.points} onChange={(e) => setActivityForm({ ...activityForm, points: e.target.value })} className={fieldClass} />
                </div>
                <div>
                  <label className="ws-label">Grading Criteria</label>
                  <input value={activityForm.grading_criteria} onChange={(e) => setActivityForm({ ...activityForm, grading_criteria: e.target.value })} placeholder="Rubric summary (optional)" className={fieldClass} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Calendar color</span>
                <ColorPicker value={activityForm.color} onChange={(color) => setActivityForm({ ...activityForm, color })} />
              </div>
            </form>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
              <button type="button" onClick={() => { setActivityOpen(false); setCreateOpen(true); }} className="ws-btn-secondary">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button type="submit" form="activity-form" disabled={activitySaving || !activityForm.subject_id} className="ws-btn-primary">
                {activitySaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><FileText className="w-4 h-4" /> Create Activity</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled class modal */}
      {classOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => { setClassOpen(false); setCreateOpen(true); }} />
          <div className="relative w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
              <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Video className="w-4.5 h-4.5" />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14.5px] font-bold text-slate-900">Schedule Video Class</h3>
                <p className="text-[11.5px] text-slate-400 truncate">
                  {selectedDate.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · editable
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 flex-shrink-0">
                Live session
              </span>
              <button onClick={() => { setClassOpen(false); setCreateOpen(true); }} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="class-form" onSubmit={saveClass} className="px-5 py-4 space-y-4 max-h-[calc(90vh-110px)] overflow-y-auto">
              <div>
                <label className="ws-label">Subject</label>
                <select value={classForm.subject_id} onChange={(e) => setClassForm({ ...classForm, subject_id: e.target.value })} className={fieldClass} required>
                  <option value="" disabled>Select a subject…</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_title}</option>
                  ))}
                </select>
                {subjects.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> No subjects assigned yet. Contact your administrator.
                  </p>
                )}
              </div>

              <div>
                <label className="ws-label">Class Title</label>
                <input required value={classForm.title} onChange={(e) => setClassForm({ ...classForm, title: e.target.value })} placeholder="e.g. Lecture: Network Fundamentals" className={fieldClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ws-label">Start</label>
                  <input type="datetime-local" value={classForm.starts_at} onChange={(e) => setClassForm({ ...classForm, starts_at: e.target.value })} className={fieldClass} required />
                </div>
                <div>
                  <label className="ws-label">End</label>
                  <input type="datetime-local" value={classForm.ends_at} onChange={(e) => setClassForm({ ...classForm, ends_at: e.target.value })} className={fieldClass} required />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Calendar color</span>
                <ColorPicker value={classForm.color} onChange={(color) => setClassForm({ ...classForm, color })} />
              </div>
            </form>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
              <button type="button" onClick={() => { setClassOpen(false); setCreateOpen(true); }} className="ws-btn-secondary">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button type="submit" form="class-form" disabled={classSaving || !classForm.subject_id} className="ws-btn-primary">
                {classSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling…</> : <><Video className="w-4 h-4" /> Schedule Class</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}