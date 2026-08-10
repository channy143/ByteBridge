import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { greeting, firstName } from '../lib/status';
import { BookOpen, ClipboardList, Inbox, Video, ChevronRight, CalendarDays, Clock, X } from 'lucide-react';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_DOT = {
  schedule: 'bg-blue-500',
  deadline: 'bg-amber-500',
  live: 'bg-emerald-500',
};

const EVENT_PRIORITY = ['live', 'schedule', 'deadline'];

const CALENDAR_COLORS = [
  { id: 'blue', label: 'Blue', dot: 'bg-blue-500', cellBg: 'bg-blue-50' },
  { id: 'amber', label: 'Amber', dot: 'bg-amber-500', cellBg: 'bg-amber-50' },
  { id: 'emerald', label: 'Emerald', dot: 'bg-emerald-500', cellBg: 'bg-emerald-50' },
  { id: 'rose', label: 'Rose', dot: 'bg-rose-500', cellBg: 'bg-rose-50' },
  { id: 'violet', label: 'Violet', dot: 'bg-violet-500', cellBg: 'bg-violet-50' },
  { id: 'sky', label: 'Sky', dot: 'bg-sky-500', cellBg: 'bg-sky-50' },
  { id: 'orange', label: 'Orange', dot: 'bg-orange-500', cellBg: 'bg-orange-50' },
  { id: 'lime', label: 'Lime', dot: 'bg-lime-500', cellBg: 'bg-lime-50' },
];

const getColorById = (id) => CALENDAR_COLORS.find((c) => c.id === id) || null;

const eventDot = (e) => {
  const custom = getColorById(e.color);
  return custom ? custom.dot : EVENT_DOT[e.type];
};

const resolveCellSolid = (evts) => {
  if (!evts.length) return '';
  const custom = evts.find((e) => e.color && getColorById(e.color));
  if (custom) return getColorById(custom.color).dot;
  for (const t of EVENT_PRIORITY) {
    if (evts.some((e) => e.type === t)) return EVENT_DOT[t];
  }
  return '';
};

const EVENT_BADGE = {
  schedule: { bg: 'bg-blue-50 text-blue-700 border-blue-100', label: 'Scheduled Class' },
  deadline: { bg: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Activity Deadline' },
  live: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Live Session' },
};

const daysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const firstDayOfWeek = (d) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
const toDateKey = (d) => d.toISOString().slice(0, 10);
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const now = new Date();

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [stats, setStats] = useState({ subjects: 0, activities: 0, pendingReviews: 0, upcomingClasses: 0 });
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const gridRef = useRef(null);
  const containerRef = useRef(null);
  const headersRef = useRef(null);
  const cellsRef = useRef(null);
  const dragRef = useRef({ id: null, sx: 0, sy: 0, moved: false });

  const [zoom, setZoom] = useState(null); // { scale, x, y }
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
        let pendingReviews = 0;
        let activityIds = [];

        if (subjectIds.length > 0) {
          const { data: enr } = await supabase
            .from('enrollments')
            .select('subject_id')
            .in('subject_id', subjectIds);
          (enr || []).forEach((e) => { counts.students[e.subject_id] = (counts.students[e.subject_id] || 0) + 1; });

          const { data: mods } = await supabase
            .from('modules')
            .select('subject_id')
            .in('subject_id', subjectIds);
          (mods || []).forEach((m) => { counts.modules[m.subject_id] = (counts.modules[m.subject_id] || 0) + 1; });

          const { data: acts } = await supabase
            .from('activities')
            .select('id, subject_id, deadline')
            .in('subject_id', subjectIds);
          activityIds = (acts || []).map((a) => a.id);
          (acts || []).forEach((a) => {
            counts.activities[a.subject_id] = (counts.activities[a.subject_id] || 0) + 1;
          });
        }

        if (activityIds.length > 0) {
          const { data: subms } = await supabase
            .from('submissions')
            .select('id')
            .in('activity_id', activityIds)
            .in('status', ['Submitted', 'Late']);
          pendingReviews = (subms || []).length;
        }

        let upcoming = 0;
        try {
          const { count } = await supabase
            .from('class_schedules')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', profile.id)
            .gte('starts_at', new Date().toISOString());
          upcoming = count || 0;
        } catch {
          upcoming = 0;
        }

        /* fetch events for the mini calendar */
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
              id: `sch-${s.id}`, type: 'schedule', title: s.title,
              subject_id: s.subject_id, start: s.starts_at, end: s.ends_at,
              color: s.color || '',
            })),
            ...(acts || []).map((a) => ({
              id: `act-${a.id}`, type: 'deadline', title: a.title,
              subject_id: a.subject_id, deadline: a.deadline, start: a.deadline,
              color: a.color || '',
            })),
            ...(sessions || []).map((s) => ({
              id: `ses-${s.id}`, type: 'live',
              title: s.room_name?.replace(/bytebridge-/i, '').replace(/-\d+$/, '').replace(/-/g, ' ') || 'Live Session',
              subject_id: s.subject_id, start: s.started_at, end: s.ended_at,
            })),
          ];
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
        setStats({
          subjects: subs.length,
          activities: activityIds.length,
          pendingReviews,
          upcomingClasses: upcoming,
        });
        setEvents(evts);
      } catch (err) {
        console.error('Error loading teacher dashboard:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  /* calendar helpers */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), []);

  const calDays = useMemo(() => {
    const total = daysInMonth(calMonth);
    const start = firstDayOfWeek(calMonth);
    const cells = [];
    for (let i = 0; i < start; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calMonth]);

  const eventsForDate = (dateKey) =>
    events.filter((e) => {
      const eDate = e.deadline || e.start;
      return eDate && toDateKey(new Date(eDate)) === dateKey;
    });

  const subjectName = (sid) => subjects.find((s) => s.id === sid)?.subject_title || '';

  const openDate = (day) => {
    if (!day) return;
    const date = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
    const key = toDateKey(date);
    const dayEvents = eventsForDate(key);
    if (dayEvents.length > 0) {
      setSelectedDate({ day, date, key, events: dayEvents });
      setShowModal(true);
    }
  };

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const headers = headersRef.current;
      const cells = cellsRef.current;
      if (!container || !headers || !cells) return;

      const first = firstDayOfWeek(calMonth);
      const startOfToday = new Date(calMonth.getFullYear(), calMonth.getMonth(), now.getDate());
      const featured = new Set([now.getDate()]);
      events.forEach((e) => {
        const d = new Date(e.deadline || e.start);
        if (
          d.getFullYear() === calMonth.getFullYear() &&
          d.getMonth() === calMonth.getMonth() &&
          d.getTime() >= startOfToday.getTime()
        ) {
          featured.add(d.getDate());
        }
      });

      const pos = (day) => {
        const idx = first + day - 1;
        return { col: Math.max(0, idx % 7), row: Math.max(0, Math.floor(idx / 7)) };
      };
      const ps = [...featured].map(pos);
      let minCol = Infinity, maxCol = -1, minRow = Infinity, maxRow = -1;
      ps.forEach((p) => {
        minCol = Math.min(minCol, p.col);
        maxCol = Math.max(maxCol, p.col);
        minRow = Math.min(minRow, p.row);
        maxRow = Math.max(maxRow, p.row);
      });
      minCol = Math.max(0, minCol);
      minRow = Math.max(0, minRow);

      const vw = container.offsetWidth;
      const vh = container.offsetHeight;
      const cellW = cells.offsetWidth / 7;
      const weeks = Math.max(1, calDays.length / 7);
      const rowH = cells.offsetHeight / weeks;
      const colSpan = Math.max(1, maxCol - minCol + 1);
      const headerH = headers.offsetHeight;

      const visibleCols = Math.min(5, Math.max(colSpan + 2, 3));
      const scaleX = vw / (cellW * visibleCols);
      const scaleY = vh / (headerH + (maxRow - minRow + 3) * rowH);
      const scale = Math.min(2.2, Math.max(1.0, Math.min(scaleX, scaleY)));

      const cx = ((minCol + maxCol) / 2 + 0.5) * cellW;
      const cy = headerH + ((minRow + maxRow) / 2 + 0.5) * rowH;
      setZoom({ scale, tx: vw / 2 - scale * cx, ty: vh / 2 - scale * cy });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, calMonth, events]);

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const cell = e.target?.closest?.('[data-cal-day]');
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      day: cell?.dataset?.calDay ? Number(cell.dataset.calDay) : null,
    };
    containerRef.current?.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
    setDragOffset({ x: dx, y: dy });
  };

  const onPointerEnd = (e) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    containerRef.current?.releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
    setDragging(false);
    setDragOffset({ x: 0, y: 0 });
    if (!d.moved && d.day) openDate(d.day);
  };

  const zoomTransform = zoom
    ? `translate(${zoom.tx + dragOffset.x}px, ${zoom.ty + dragOffset.y}px) scale(${zoom.scale})`
    : 'none';

  const statCells = [
    { label: 'My Subjects', value: stats.subjects, caption: 'Assigned subjects', icon: BookOpen, tone: 'bg-primary-50 text-primary-700' },
    { label: 'Active Activities', value: stats.activities, caption: 'Activities available to students', icon: ClipboardList, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Pending Reviews', value: stats.pendingReviews, caption: 'Submissions requiring review', icon: Inbox, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Upcoming Classes', value: stats.upcomingClasses, caption: 'Classes scheduled soon', icon: Video, tone: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName(profile?.full_name)}`}
        subtitle="Here's what's happening with your BTLED ICT subjects."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ws-card px-4 py-3">
              <Skeleton className="w-8 h-8 rounded-md" />
              <Skeleton className="h-3 w-20 mt-3" />
              <Skeleton className="h-4 w-10 mt-1.5" />
              <Skeleton className="h-3 w-16 mt-1.5" />
            </div>
          ))
        ) : statCells.map((s) => (
          <div key={s.label} className="ws-card px-4 py-3">
            <span className={`w-8 h-8 rounded-md flex items-center justify-center ${s.tone}`}>
              <s.icon className="w-4 h-4" />
            </span>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className="text-[18px] font-bold text-slate-900 leading-tight">{s.value}</p>
            <p className="text-[11px] text-slate-400">{s.caption}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* My Subjects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="ws-card">
            <div className="ws-card-header">
              <h2 className="ws-section-title">My Subjects</h2>
              {subjects.length > 0 && (
                <button
                  onClick={() => navigate('/teacher/subjects')}
                  className="text-[12px] font-medium text-primary-600 hover:text-primary-700"
                >
                  View all
                </button>
              )}
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-5 w-14 rounded flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-1/2 rounded" />
                      <Skeleton className="h-2.5 w-1/3 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12.5px] text-slate-400">
                You are not assigned to any subjects yet. Subjects are assigned by the administrator.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/teacher/subjects/${s.id}`)}
                    className="w-full px-4 py-3 hover:bg-slate-50/60 transition-colors text-left flex items-start gap-3"
                  >
                    <span className="w-8 h-8 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                      {s.subject_code?.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'SUB'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{s.subject_title}</p>
                        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      </div>
                      <span className="mt-1 inline-block text-[11px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-px rounded">
                        {s.subject_code}
                      </span>
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        <div className="rounded-md bg-slate-50 border border-slate-100 py-1.5 text-center">
                          <p className="text-[13px] font-bold text-slate-800 leading-tight">{s.students}</p>
                          <p className="text-[9.5px] text-slate-400 leading-tight">Students</p>
                        </div>
                        <div className="rounded-md bg-slate-50 border border-slate-100 py-1.5 text-center">
                          <p className="text-[13px] font-bold text-slate-800 leading-tight">{s.modules}</p>
                          <p className="text-[9.5px] text-slate-400 leading-tight">Modules</p>
                        </div>
                        <div className="rounded-md bg-slate-50 border border-slate-100 py-1.5 text-center">
                          <p className="text-[13px] font-bold text-slate-800 leading-tight">{s.activities}</p>
                          <p className="text-[9.5px] text-slate-400 leading-tight">Activities</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timetable mini calendar */}
        <div className="space-y-4">
          <div className="ws-card">
            <div className="ws-card-header">
              <h2 className="ws-section-title">Timetable</h2>
              <button
                onClick={() => navigate('/teacher/timetables')}
                className="flex items-center gap-1 text-[12px] font-medium text-primary-600 hover:text-primary-700"
              >
                View Timetable <CalendarDays className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-32 rounded" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-full rounded" />
                ))}
              </div>
            ) : (
              <>
                {/* Month label */}
                <div className="px-4 pt-1 pb-2">
                  <p className="text-[13px] font-semibold text-slate-800">
                    {MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
                  </p>
                </div>

                {/* Zoomable calendar viewport */}
                <div
                  ref={containerRef}
                  className="relative overflow-hidden px-2 select-none cursor-grab active:cursor-grabbing"
                  style={{ touchAction: 'none' }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerEnd}
                  onPointerCancel={onPointerEnd}
                >
                  <div
                    ref={gridRef}
                    className="will-change-transform origin-top-left"
                    style={{
                      transform: zoomTransform,
                      transition: dragging ? 'none' : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    {/* Day headers */}
                    <div ref={headersRef} className="grid grid-cols-7">
                      {DAY_LABELS.map((d) => (
                        <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 py-1">
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Day cells */}
                    <div ref={cellsRef} className="grid grid-cols-7 pb-3">
                      {calDays.map((day, i) => {
                        const date = day ? new Date(calMonth.getFullYear(), calMonth.getMonth(), day) : null;
                        const dateKey = date ? toDateKey(date) : null;
                        const isToday = date && toDateKey(date) === toDateKey(now);
                        const dayEvents = dateKey ? eventsForDate(dateKey) : [];
                        const hasEvents = dayEvents.length > 0;
                        const solidBg = !isToday && hasEvents ? resolveCellSolid(dayEvents) : '';

                        return (
                          <div
                            key={i}
                            data-cal-day={day || undefined}
                            className={`flex flex-col items-center py-1.5 ${
                              isToday
                                ? 'bg-primary-600 text-white cursor-pointer'
                                : solidBg
                                  ? `${solidBg} text-white cursor-pointer`
                                  : ''
                            }`}
                          >
                            {day ? (
                              <>
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-semibold ${
                                    isToday || hasEvents ? 'text-white' : 'text-slate-400'
                                  }`}
                                >
                                  {day}
                                </span>
                                {hasEvents && (
                                  <div className="flex items-center gap-0.5 mt-0.5">
                                    {dayEvents.slice(0, 3).map((e) => (
                                      <span key={e.id} className="w-1.5 h-1.5 rounded-full bg-white/80" />
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="w-7 h-7" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Edge fades */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white via-white to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white via-white to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white via-white to-transparent" />
                </div>

                {/* Legend */}
                <div className="px-4 pb-4 flex items-center gap-3 flex-wrap">
                  {Object.entries(EVENT_DOT).map(([key, dot]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${dot}`} />
                      <span className="text-[10px] text-slate-500 capitalize">
                        {key === 'deadline' ? 'Deadline' : key === 'schedule' ? 'Scheduled' : 'Live'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Date detail modal */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowModal(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl overflow-hidden flex flex-col">
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
            <div className="divide-y divide-slate-50 overflow-y-auto">
              {selectedDate.events.map((e) => {
                const c = EVENT_BADGE[e.type];
                const startTime = e.start ? new Date(e.start) : null;
                const endTime = e.end ? new Date(e.end) : null;
                const timeRange = startTime
                  ? `${startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${endTime ? ` – ${endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}`
                  : null;
                return (
                  <div key={e.id} className="px-5 py-3.5 flex items-start gap-3">
                    <span className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${eventDot(e)}`} />
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
    </div>
  );
}