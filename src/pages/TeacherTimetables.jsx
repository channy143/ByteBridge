import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Skeleton } from '../components/ui/Skeleton';
import { X, ChevronLeft, ChevronRight, CalendarDays, FileText, Clock, Plus } from 'lucide-react';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_COLORS = {
  schedule: { bg: 'bg-blue-500', light: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500', label: 'Scheduled Class' },
  deadline: { bg: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500', label: 'Activity Deadline' },
  live: { bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500', label: 'Live Session' },
};

const daysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const firstDayOfWeek = (d) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
const toDateKey = (d) => d.toISOString().slice(0, 10);
const isSameDay = (a, b) => toDateKey(a) === toDateKey(b);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function TeacherTimetables() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const now = new Date();

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [events, setEvents] = useState([]);
  const [viewMonth, setViewMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('month');
  const [addOpen, setAddOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

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
              .select('id, subject_id, title, starts_at, ends_at')
              .in('subject_id', subjectIds)
              .gte('ends_at', threeMonthsAgo.toISOString())
              .lte('starts_at', sixMonthsAhead.toISOString()),
            supabase
              .from('activities')
              .select('id, subject_id, title, deadline')
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
            })),
            ...(acts || []).map((a) => ({
              id: `act-${a.id}`,
              type: 'deadline',
              title: a.title,
              subject_id: a.subject_id,
              deadline: a.deadline,
              start: a.deadline,
            })),
            ...(sessions || []).map((s) => ({
              id: `ses-${s.id}`,
              type: 'live',
              title: s.room_name?.replace(/bytebridge-/i, '').replace(/-\d+$/, '').replace(/-/g, ' ') || 'Live Session',
              subject_id: s.subject_id,
              start: s.started_at,
              end: s.ended_at,
            })),
          ];
        }

        if (!cancelled) {
          setSubjects(subs);
          setEvents(evts);
        }
      } catch (err) {
        console.error('Error loading timetable:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const subjectName = (sid) => subjects.find((s) => s.id === sid)?.subject_title || '';
  subjectName.toString(); // suppress unused warning

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
  const handleToday = () => {
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const openDate = (day) => {
    if (!day) return;
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    const key = toDateKey(date);
    const dayEvents = eventsForDate(key);
    if (dayEvents.length > 0) {
      setSelectedDate({ day, date, key, events: dayEvents });
      setShowModal(true);
    }
  };

  const pickSubjectForAdd = (subjectId) => {
    setPickerOpen(false);
    setAddOpen(false);
    if (pendingAction === 'schedule') navigate(`/classroom?subject=${subjectId}`);
    else navigate(`/teacher/subjects/${subjectId}?tab=activities`);
    setPendingAction(null);
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

          <div className="relative">
            <button
              onClick={() => setAddOpen(!addOpen)}
              className="ws-btn-primary"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
            {addOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAddOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-1.5 overflow-hidden">
                  <button
                    onClick={() => { setPendingAction('schedule'); setAddOpen(false); setPickerOpen(true); }}
                    className="w-full px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <span className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="w-3.5 h-3.5" />
                    </span>
                    Schedule Class
                  </button>
                  <button
                    onClick={() => { setPendingAction('activity'); setAddOpen(false); setPickerOpen(true); }}
                    className="w-full px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <span className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                    New Activity
                  </button>
                </div>
              </>
            )}
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
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-200">
            {DAY_LABELS.map((d) => (
              <div key={d} className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-r border-slate-100 last:border-r-0">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calDays.map((day, i) => {
              const date = day ? new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day) : null;
              const dateKey = date ? toDateKey(date) : null;
              const isToday = date && isSameDay(date, now);
              const dayEvents = dateKey ? eventsForDate(dateKey) : [];
              const hasEvents = dayEvents.length > 0;

              return (
                <div
                  key={i}
                  onClick={() => hasEvents && openDate(day)}
                  className={`min-h-[100px] border-r border-b border-slate-100 last:border-r-0 p-2 ${
                    hasEvents ? 'cursor-pointer hover:bg-slate-50/80' : ''
                  } ${isToday ? 'bg-primary-50/40' : ''}`}
                >
                  {day && (
                    <>
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[13px] font-semibold ${
                        isToday ? 'bg-primary-600 text-white' : 'text-slate-700'
                      }`}>
                        {day}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 3).map((e) => {
                          const c = EVENT_COLORS[e.type];
                          return (
                            <div
                              key={e.id}
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${c.light} truncate`}
                            >
                              {e.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <p className="text-[10px] text-slate-400 font-medium">+{dayEvents.length - 3} more</p>
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
        /* Day view */
        <div className="ws-card">
          <div className="px-5 py-4">
            <p className="text-[14px] font-semibold text-slate-800">
              {selectedDate ? selectedDate.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {(selectedDate ? selectedDate.events : eventsForDate(toDateKey(now))).length === 0 ? (
              <p className="px-5 py-10 text-center text-[12.5px] text-slate-400">
                Nothing scheduled for this day.
              </p>
            ) : (
              (selectedDate ? selectedDate.events : eventsForDate(toDateKey(now))).map((e) => {
                const c = EVENT_COLORS[e.type];
                const time = e.start
                  ? new Date(e.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                  : null;
                return (
                  <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{e.title}</p>
                      <p className="text-[11px] text-slate-400">{c.label} · {subjectName(e.subject_id)}</p>
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
      {showModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
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
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
              {selectedDate.events.map((e) => {
                const c = EVENT_COLORS[e.type];
                const startTime = e.start ? new Date(e.start) : null;
                const endTime = e.end ? new Date(e.end) : null;
                const timeRange = startTime
                  ? `${startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${endTime ? ` – ${endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}`
                  : null;
                return (
                  <div key={e.id} className="px-5 py-3.5 flex items-start gap-3">
                    <span className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800">{e.title}</p>
                      <p className="text-[11.5px] text-slate-400 mt-0.5">
                        {c.label} · {subjectName(e.subject_id)}
                      </p>
                      {timeRange && (
                        <p className="text-[11.5px] text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {timeRange}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowModal(false);
                        if (e.type === 'schedule') navigate(`/classroom?subject=${e.subject_id}`);
                        else navigate(`/teacher/subjects/${e.subject_id}?tab=${e.type === 'deadline' ? 'activities' : 'classroom'}`);
                      }}
                      className="text-[11px] font-medium text-primary-600 hover:text-primary-700 flex-shrink-0 mt-0.5"
                    >
                      View
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setShowModal(false)}
                className="w-full ws-btn-secondary justify-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject picker for Add */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => { setPickerOpen(false); setPendingAction(null); }} />
          <div className="relative w-full max-w-[420px] bg-white rounded-xl border border-slate-200 shadow-xl p-5">
            <h3 className="text-[15px] font-bold text-slate-900">Choose a subject</h3>
            <p className="text-[12px] text-slate-400 mt-0.5 mb-4">
              {pendingAction === 'schedule' ? 'Schedule a class for one of your subjects.' : 'Create an activity for one of your subjects.'}
            </p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickSubjectForAdd(s.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50/50 text-left transition-colors"
                >
                  <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded shrink-0">
                    {s.subject_code}
                  </span>
                  <span className="text-[13px] font-medium text-slate-700 truncate">{s.subject_title}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { setPickerOpen(false); setPendingAction(null); }}
              className="mt-4 w-full ws-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}