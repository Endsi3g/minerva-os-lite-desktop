'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Plus, X, Loader2, CalendarDays,
  Clock, Users, CheckSquare, CalendarPlus, Check,
} from 'lucide-react';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AgendaRoot() {
  const { tasks, addTask, leads, activeWorkspace } = useReach();
  const router = useRouter();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(ymd(today));

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
      addTask(`${time} — ${fullTitle}`, 'Meeting', selectedDate);

      // 2. Google Calendar + Todoist (server-side side-effects)
      let sideRes: { google?: boolean; todoist?: boolean } = {};
      if (addGoogle || addTodoist) {
        const res = await fetch(getApiUrl('/api/agenda/book'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: fullTitle,
            description: lead ? `Rendez-vous lié au lead ${lead.businessName}${lead.city ? ` (${lead.city})` : ''}.` : '',
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

      const bits = ['Rendez-vous créé'];
      if (sideRes.google) bits.push('Google Agenda');
      if (sideRes.todoist) bits.push('Todoist');
      if (notifyTeam) bits.push('équipe notifiée');
      toast.success(bits.join(' · '));
      setShowBook(false);
    } catch {
      toast.error('Erreur lors de la création du rendez-vous');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#059669]/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-[#059669]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Agenda</h1>
              <p className="text-sm text-muted-foreground">Planifiez et suivez vos rendez-vous.</p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/agenda/new?date=${selectedDate}`)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau RDV
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-bold text-foreground">{MONTHS[viewMonth]} {viewYear}</p>
              <button onClick={nextMonth} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {grid.map((date, i) => {
                if (!date) return <div key={i} className="aspect-square" />;
                const key = ymd(date);
                const dayTasks = tasksByDay[key] || [];
                const isToday = key === ymd(today);
                const isSelected = key === selectedDate;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(key)}
                    onDoubleClick={() => openBooking(key)}
                    className={cn(
                      'aspect-square rounded-lg border p-1 flex flex-col items-center gap-0.5 transition-all text-left',
                      isSelected ? 'border-[#059669] bg-[#059669]/5' : 'border-transparent hover:border-border hover:bg-muted/40',
                    )}
                  >
                    <span className={cn(
                      'text-xs font-semibold h-5 w-5 flex items-center justify-center rounded-full',
                      isToday ? 'bg-[#059669] text-white' : 'text-foreground',
                    )}>
                      {date.getDate()}
                    </span>
                    {dayTasks.length > 0 && (
                      <div className="flex gap-0.5 flex-wrap justify-center">
                        {dayTasks.slice(0, 3).map((t, j) => (
                          <span key={j} className={cn('h-1.5 w-1.5 rounded-full', t.category === 'Meeting' ? 'bg-[#059669]' : 'bg-[#059669]')} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day detail */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">
                {new Date(`${selectedDate}T00:00`).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <button
                onClick={() => openBooking(selectedDate)}
                className="h-7 w-7 flex items-center justify-center rounded-lg bg-[#059669]/10 text-[#059669] hover:bg-[#059669]/20 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {selectedTasks.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                Aucun rendez-vous ce jour.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedTasks.map(t => (
                  <div key={t.id} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-background">
                    <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0', t.category === 'Meeting' ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#059669]/10 text-[#059669]')}>
                      {t.category === 'Meeting' ? <Clock className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-xs font-semibold leading-snug', t.completed && 'line-through text-muted-foreground')}>{t.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t.category}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowBook(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-[460px] max-w-[95vw] p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#26251e]">Nouveau rendez-vous</h2>
              <button onClick={() => setShowBook(false)} className="text-[#7a7a76] hover:text-[#26251e]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Titre</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex : Présentation offre SEO"
                  autoFocus
                  className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Date</label>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#059669]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Heure</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#059669]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Durée</label>
                  <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#059669]">
                    <option value={30}>30 min</option>
                    <option value={60}>1 h</option>
                    <option value={90}>1 h 30</option>
                    <option value={120}>2 h</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Lead associé (optionnel)</label>
                <select value={leadId} onChange={e => setLeadId(e.target.value)} className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#059669]">
                  <option value="">Aucun</option>
                  {leads.slice(0, 100).map(l => (
                    <option key={l.id} value={l.id}>{l.businessName}</option>
                  ))}
                </select>
              </div>

              {/* Options */}
              <div className="space-y-1.5 pt-1">
                {([
                  { key: 'team', label: "Notifier l'équipe", icon: Users, value: notifyTeam, set: setNotifyTeam },
                  { key: 'gcal', label: 'Ajouter à Google Agenda', icon: CalendarPlus, value: addGoogle, set: setAddGoogle },
                  { key: 'todo', label: 'Créer une tâche Todoist', icon: CheckSquare, value: addTodoist, set: setAddTodoist },
                ] as const).map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => opt.set(!opt.value)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[#e5e5e0] text-left hover:bg-[#f4f4f3] transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5 text-[#7a7a76]" />
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
              className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-bold transition-colors disabled:opacity-60"
            >
              {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirmer le rendez-vous
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgendaRoot;
