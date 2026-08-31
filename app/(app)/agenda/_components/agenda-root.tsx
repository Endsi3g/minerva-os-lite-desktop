'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/language-context';
import {
  ChevronLeft, ChevronRight, Plus, X, Loader2, CalendarDays,
  Clock, Users, CheckSquare, CalendarPlus, Check, Video, RefreshCw, ExternalLink
} from 'lucide-react';
import { RencontrerSubNav } from '@/app/(app)/_components/hub-nav/rencontrer-sub-nav';

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: string | null;
  end: string | null;
  hangoutLink: string | null;
  location: string | null;
}

export function AgendaRoot() {
  const { tasks, addTask, leads, activeWorkspace } = useReach();
  const router = useRouter();
  const { t, locale } = useLanguage();

  const WEEKDAYS = useMemo(() => {
    if (locale === 'en') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (locale === 'de') return ['Mon', 'Die', 'Mit', 'Don', 'Fre', 'Sam', 'Son'];
    return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  }, [locale]);

  const MONTHS = useMemo(() => {
    if (locale === 'en') return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (locale === 'de') return ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  }, [locale]);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(ymd(today));
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  // Google Calendar Integration State
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [syncingGoogle, setSyncingGoogle] = useState(false);

  // Booking modal
  const [showBook, setShowBook] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [leadId, setLeadId] = useState('');
  const [notifyTeam, setNotifyTeam] = useState(true);
  const [addGoogle, setAddGoogle] = useState(true);
  const [addTodoist, setAddTodoist] = useState(false);
  const [booking, setBooking] = useState(false);

  // Load Google Calendar events
  const loadGoogleEvents = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/google/calendar/today'));
      if (res.ok) {
        const data = await res.json();
        setGoogleConnected(Boolean(data.connected));
        setGoogleEvents(data.events || []);
      }
    } catch {
      setGoogleConnected(false);
    }
  }, []);

  useEffect(() => {
    loadGoogleEvents();
  }, [loadGoogleEvents]);

  const handleSyncGoogle = async () => {
    setSyncingGoogle(true);
    try {
      const res = await fetch(getApiUrl('/api/google/calendar/sync'), { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Google Calendar synchronisé (${data.syncedCount || 0} rendez-vous mis à jour)`);
        loadGoogleEvents();
      } else {
        toast.error(data.error || 'Erreur lors de la synchronisation Google Calendar');
      }
    } catch {
      toast.error('Impossible de contacter le service Google Calendar');
    } finally {
      setSyncingGoogle(false);
    }
  };

  // Tasks grouped by day
  const tasksByDay = useMemo(() => {
    const map: Record<string, typeof tasks> = {};
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const key = t.dueDate.slice(0, 10);
      (map[key] ||= []).push(t);
    }
    return map;
  }, [tasks]);

  // Google events grouped by day
  const googleEventsByDay = useMemo(() => {
    const map: Record<string, GoogleCalendarEvent[]> = {};
    for (const ev of googleEvents) {
      if (!ev.start) continue;
      const key = ev.start.slice(0, 10);
      (map[key] ||= []).push(ev);
    }
    return map;
  }, [googleEvents]);

  // Build the month grid (Mon-first)
  const grid = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startOffset = (first.getDay() + 6) % 7; // 0 = Monday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectedTasks = tasksByDay[selectedDate] || [];
  const selectedGoogleEvents = googleEventsByDay[selectedDate] || [];

  // Days of the week containing selectedDate (Mon-first)
  const weekDays = useMemo(() => {
    const d = new Date(`${selectedDate}T00:00`);
    const offset = (d.getDay() + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - offset);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return day;
    });
  }, [selectedDate]);

  // Navigate prev/next according to the active view
  const shiftSelected = (dir: number) => {
    if (view === 'month') { dir < 0 ? prevMonth() : nextMonth(); return; }
    const d = new Date(`${selectedDate}T00:00`);
    d.setDate(d.getDate() + dir * (view === 'week' ? 7 : 1));
    setSelectedDate(ymd(d));
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const openBooking = (date: string) => {
    setSelectedDate(date);
    setTitle('');
    setTime('09:00');
    setDuration(60);
    setLeadId('');
    setShowBook(true);
  };

  const handleBook = async () => {
    if (!title.trim()) return;
    setBooking(true);
    try {
      const lead = leads.find(l => l.id === leadId);
      const fullTitle = lead ? `${title.trim()} — ${lead.businessName}` : title.trim();
      const startISO = new Date(`${selectedDate}T${time}:00`).toISOString();
      const endISO = new Date(new Date(startISO).getTime() + duration * 60000).toISOString();

      // 1. In-app task (Meeting) — instant, persisted
      addTask(`${time} — ${fullTitle}`, 'Meeting', selectedDate, lead?.id);

      // 2. Google Calendar + Todoist
      let sideRes: { google?: boolean; todoist?: boolean } = {};
      if (addGoogle || addTodoist) {
        const res = await fetch(getApiUrl('/api/agenda/book'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: fullTitle,
            description: lead ? `Rendez-vous lié au prospect ${lead.businessName}${lead.city ? ` (${lead.city})` : ''}.` : '',
            startISO,
            endISO,
            addToGoogle: addGoogle,
            addToTodoist: addTodoist,
            attendees: lead?.contactEmail ? [lead.contactEmail] : [],
          }),
        });
        if (res.ok) sideRes = await res.json();
      }

      // 3. Notify the team
      if (notifyTeam && activeWorkspace) {
        const ownerId = (activeWorkspace as { owner_id?: string }).owner_id;
        await fetch(getApiUrl('/api/notifications/team'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: activeWorkspace.id,
            workspaceOwnerId: ownerId,
            title: `Nouveau rendez-vous — ${fullTitle}`,
            body: `Planifié le ${new Date(startISO).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' })}.`,
            type: 'meeting',
            link: '/agenda',
          }),
        }).catch(() => {});
      }

      const bits = [t('agenda.toast_success')];
      if (sideRes.google) bits.push('Google Agenda synchronisé');
      if (sideRes.todoist) bits.push('Todoist');
      if (notifyTeam) bits.push('équipe notifiée');
      toast.success(bits.join(' · '));
      setShowBook(false);
      loadGoogleEvents();
    } catch {
      toast.error(t('agenda.toast_error'));
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <RencontrerSubNav />
      <div className="flex-1 overflow-y-auto bg-white text-[#26251e] font-sans selection:bg-[#059669]/10 relative animate-page-enter">
        <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
        
        <div className="w-full px-3 sm:px-4 md:px-8 py-6 md:py-10 space-y-6 relative z-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#26251e] tracking-tight">
              {t('agenda.title')}
            </h1>
            <p className="text-xs text-neutral-500 font-medium">
              {t('agenda.subtitle')}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncGoogle}
              disabled={syncingGoogle}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] text-[#26251e] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Synchroniser avec Google Calendar"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-blue-600", syncingGoogle && "animate-spin")} />
              <span>{syncingGoogle ? 'Synchronisation…' : 'Sync Google Calendar'}</span>
              {googleConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5" title="Google Calendar Connecté" />
              )}
            </button>

            <button
              onClick={() => router.push(`/agenda/new?date=${selectedDate}`)}
              className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors border-0 cursor-pointer shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('agenda.new_meeting')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 rounded-xl border border-[#e5e5e0] bg-white p-4">
            {/* Nav + view switcher */}
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2">
                <button onClick={() => shiftSelected(-1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] hover:bg-[#f4f4f3] transition-colors bg-white text-[#26251e] cursor-pointer">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => shiftSelected(1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] hover:bg-[#f4f4f3] transition-colors bg-white text-[#26251e] cursor-pointer">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <p className="text-xs font-bold text-[#26251e] ml-1">
                  {view === 'month'
                    ? `${MONTHS[viewMonth]} ${viewYear}`
                    : view === 'week'
                    ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()]}`
                    : new Date(`${selectedDate}T00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div className="flex items-center gap-0.5 bg-[#f4f4f3] rounded-lg p-0.5 border border-[#e5e5e0]">
                {(['month', 'week', 'day'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn('px-2.5 h-7 rounded-md text-[11px] font-bold transition-colors border-0 cursor-pointer',
                      view === v ? 'bg-white text-[#26251e] shadow-2xs' : 'text-[#807d72] hover:text-[#26251e] bg-transparent')}
                  >
                    {v === 'month' ? t('analytics.month') : v === 'week' ? t('analytics.week') : t('analytics.day')}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Month view ── */}
            {view === 'month' && (
              <>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAYS.map(d => (
                    <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-[#807d72] text-center py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {grid.map((date, i) => {
                    if (!date) return <div key={i} className="aspect-square" />;
                    const key = ymd(date);
                    const dayTasks = tasksByDay[key] || [];
                    const dayGcal = googleEventsByDay[key] || [];
                    const isSelected = key === selectedDate;
                    const isToday = key === ymd(today);
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDate(key)}
                        className={cn(
                          'aspect-square rounded-lg p-1.5 flex flex-col justify-between text-left transition-all border cursor-pointer',
                          isSelected ? 'border-[#059669] bg-[#059669]/10' : isToday ? 'border-[#059669]/40 bg-[#fafaf8]' : 'border-[#e5e5e0] hover:bg-[#f4f4f3] bg-white'
                        )}
                      >
                        <span className={cn('text-[11px] font-bold', isToday ? 'text-[#059669]' : 'text-[#26251e]')}>
                          {date.getDate()}
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {dayTasks.length > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" title={`${dayTasks.length} RDV Minerva`} />
                          )}
                          {dayGcal.length > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" title={`${dayGcal.length} événement Google Calendar`} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── Week view ── */}
            {view === 'week' && (
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map(d => {
                  const key = ymd(d);
                  const dayTasks = tasksByDay[key] || [];
                  const dayGcal = googleEventsByDay[key] || [];
                  const isSelected = key === selectedDate;
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedDate(key)}
                      className={cn(
                        'min-h-[220px] rounded-lg p-2 border flex flex-col gap-1.5 cursor-pointer transition-colors',
                        isSelected ? 'border-[#059669] bg-[#059669]/5' : 'border-[#e5e5e0] hover:bg-[#f4f4f3] bg-white'
                      )}
                    >
                      <div className="text-center pb-1 border-b border-[#e5e5e0]">
                        <p className="text-[10px] font-bold uppercase text-[#807d72]">{WEEKDAYS[(d.getDay() + 6) % 7]}</p>
                        <p className="text-xs font-bold text-[#26251e]">{d.getDate()}</p>
                      </div>
                      <div className="space-y-1 overflow-y-auto flex-1 text-[10px]">
                        {dayGcal.map(ev => (
                          <div key={ev.id} className="p-1 rounded bg-blue-50 border border-blue-200 text-blue-800 truncate font-medium">
                            {ev.summary}
                          </div>
                        ))}
                        {dayTasks.map(t => (
                          <div key={t.id} className="p-1 rounded bg-[#059669]/10 border border-[#059669]/20 text-[#059669] truncate font-medium">
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Day view ── */}
            {view === 'day' && (
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e0]">
                  <p className="text-xs font-bold text-[#26251e]">
                    {new Date(`${selectedDate}T00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                {selectedTasks.length === 0 && selectedGoogleEvents.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-6 text-center">Aucun rendez-vous sur cette journée.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedGoogleEvents.map(ev => (
                      <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg bg-blue-50/70 border border-blue-200">
                        <div className="flex items-center gap-2.5">
                          <CalendarDays className="h-4 w-4 text-blue-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-blue-950">{ev.summary}</p>
                            <p className="text-[10px] text-blue-700">Google Calendar</p>
                          </div>
                        </div>
                        {ev.hangoutLink && (
                          <a
                            href={ev.hangoutLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline"
                          >
                            <Video className="h-3 w-3" /> Meet <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                    {selectedTasks.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[#fafaf8] border border-[#e5e5e0]">
                        <div className="flex items-center gap-2.5">
                          <Clock className="h-4 w-4 text-[#059669] shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-[#26251e]">{t.title}</p>
                            <p className="text-[10px] text-neutral-500">{t.category}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Day Sidebar */}
          <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#26251e]">
                {new Date(`${selectedDate}T00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <button
                onClick={() => openBooking(selectedDate)}
                className="h-7 w-7 flex items-center justify-center rounded-lg bg-[#059669]/10 text-[#059669] hover:bg-[#059669]/20 transition-colors border-0 cursor-pointer"
                title="Ajouter un RDV"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {selectedTasks.length === 0 && selectedGoogleEvents.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#807d72]">
                {t('agenda.no_meetings')}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Google events first */}
                {selectedGoogleEvents.map(ev => (
                  <div key={ev.id} className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-blue-200 bg-blue-50/50">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="h-6 w-6 rounded flex items-center justify-center shrink-0 bg-blue-100 text-blue-700 mt-0.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-snug text-blue-950 truncate">{ev.summary}</p>
                        <p className="text-[10px] text-blue-700 mt-0.5">Google Agenda</p>
                      </div>
                    </div>
                    {ev.hangoutLink && (
                      <a
                        href={ev.hangoutLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-blue-700 hover:bg-blue-100 rounded"
                        title="Rejoindre l'appel Google Meet"
                      >
                        <Video className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}

                {/* CRM Tasks */}
                {selectedTasks.map(taskItem => (
                  <div key={taskItem.id} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[#e5e5e0] bg-white">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 bg-[#059669]/10 text-[#059669]">
                      {taskItem.category === 'Meeting' ? <Clock className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-xs font-semibold leading-snug text-[#26251e]', taskItem.completed && 'line-through text-[#807d72]')}>{taskItem.title}</p>
                      <p className="text-[10px] text-[#807d72] mt-0.5">{taskItem.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking modal */}
      {showBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" onClick={() => setShowBook(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-[460px] max-w-[95vw] p-6 space-y-4 animate-in zoom-in-95 duration-150 border border-[#e5e5e0]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#26251e]">{t('agenda.new_meeting_modal')}</h2>
              <button onClick={() => setShowBook(false)} className="text-[#807d72] hover:text-[#26251e] bg-transparent border-0 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{t('agenda.meeting_title')}</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t('agenda.meeting_title_placeholder')}
                  autoFocus
                  className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-3 focus:outline-hidden focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{t('agenda.meeting_date')}</label>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-2 focus:outline-hidden focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{t('agenda.meeting_time')}</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-2 focus:outline-hidden focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{t('agenda.meeting_duration')}</label>
                  <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-2 focus:outline-hidden focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e]">
                    <option value={30}>30 min</option>
                    <option value={60}>1 h</option>
                    <option value={90}>1 h 30</option>
                    <option value={120}>2 h</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{t('agenda.meeting_lead')}</label>
                <select value={leadId} onChange={e => setLeadId(e.target.value)} className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-2 focus:outline-hidden focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e]">
                  <option value="">{t('agenda.meeting_no_lead')}</option>
                  {leads.slice(0, 100).map(l => (
                    <option key={l.id} value={l.id}>{l.businessName}</option>
                  ))}
                </select>
              </div>

              {/* Options */}
              <div className="space-y-1.5 pt-1">
                {([
                  { key: 'team', label: t('agenda.meeting_notify_team'), icon: Users, value: notifyTeam, set: setNotifyTeam },
                  { key: 'gcal', label: t('agenda.meeting_add_gcal'), icon: CalendarPlus, value: addGoogle, set: setAddGoogle },
                  { key: 'todo', label: t('agenda.meeting_add_todoist'), icon: CheckSquare, value: addTodoist, set: setAddTodoist },
                ] as const).map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => opt.set(!opt.value)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[#e5e5e0] text-left hover:bg-[#f4f4f3] transition-colors bg-white cursor-pointer"
                    >
                      <Icon className="h-3.5 w-3.5 text-[#807d72]" />
                      <span className="text-xs font-semibold text-[#26251e] flex-1">{opt.label}</span>
                      <span className={cn(
                        'h-4 w-4 rounded border flex items-center justify-center shrink-0',
                        opt.value ? 'bg-[#059669] border-[#059669]' : 'border-[#e5e5e0]',
                      )}>
                        {opt.value && <Check className="h-3 w-3 text-white" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleBook}
              disabled={!title.trim() || booking}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-bold transition-colors disabled:opacity-60 border-0 cursor-pointer"
            >
              {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t('agenda.meeting_confirm')}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default AgendaRoot;
