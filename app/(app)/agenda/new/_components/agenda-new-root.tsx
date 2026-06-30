'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft, CalendarDays, Clock, Users, CheckSquare, CalendarPlus, Check, Loader2,
} from 'lucide-react';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AgendaNewRoot() {
  const router = useRouter();
  const search = useSearchParams();
  const { addTask, leads, activeWorkspace } = useReach();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(search.get('date') || todayStr());
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [leadId, setLeadId] = useState('');
  const [notes, setNotes] = useState('');
  const [notifyTeam, setNotifyTeam] = useState(true);
  const [addGoogle, setAddGoogle] = useState(true);
  const [addTodoist, setAddTodoist] = useState(false);
  const [booking, setBooking] = useState(false);

  const handleBook = async () => {
    if (!title.trim()) return;
    setBooking(true);
    try {
      const lead = leads.find(l => l.id === leadId);
      const fullTitle = lead ? `${title.trim()} — ${lead.businessName}` : title.trim();
      const startISO = new Date(`${date}T${time}:00`).toISOString();
      const endISO = new Date(new Date(startISO).getTime() + duration * 60000).toISOString();
      const description = [notes.trim(), lead ? `Lié au lead ${lead.businessName}${lead.city ? ` (${lead.city})` : ''}.` : ''].filter(Boolean).join('\n');

      addTask(`${time} — ${fullTitle}`, 'Meeting', date);

      let sideRes: { google?: boolean; todoist?: boolean } = {};
      if (addGoogle || addTodoist) {
        const res = await fetch(getApiUrl('/api/agenda/book'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: fullTitle, description, startISO, endISO,
            addToGoogle: addGoogle, addToTodoist: addTodoist,
            attendees: lead?.contactEmail ? [lead.contactEmail] : [],
          }),
        });
        if (res.ok) sideRes = await res.json();
      }

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
      router.push('/agenda');
    } catch {
      toast.error('Erreur lors de la création du rendez-vous');
    } finally {
      setBooking(false);
    }
  };

  const options = [
    { key: 'team', label: "Notifier l'équipe", icon: Users, value: notifyTeam, set: setNotifyTeam },
    { key: 'gcal', label: 'Ajouter à Google Agenda', icon: CalendarPlus, value: addGoogle, set: setAddGoogle },
    { key: 'todo', label: 'Créer une tâche Todoist', icon: CheckSquare, value: addTodoist, set: setAddTodoist },
  ] as const;

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/agenda')}
            className="p-2 rounded-lg border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-[#26251e]" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#059669]/10 flex items-center justify-center">
              <CalendarDays className="h-4.5 w-4.5 text-[#059669]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#26251e] tracking-tight">Nouveau rendez-vous</h1>
              <p className="text-xs text-[#7a7a76]">Planifiez et synchronisez avec votre équipe.</p>
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Titre</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex : Présentation offre SEO"
              autoFocus
              className="w-full h-9 text-xs bg-[#fafaf8] border border-[#e5e5e0] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#059669]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full h-9 text-xs bg-[#fafaf8] border border-[#e5e5e0] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#059669]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Heure</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full h-9 text-xs bg-[#fafaf8] border border-[#e5e5e0] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#059669]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Durée</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full h-9 text-xs bg-[#fafaf8] border border-[#e5e5e0] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#059669]">
                <option value={30}>30 min</option>
                <option value={60}>1 h</option>
                <option value={90}>1 h 30</option>
                <option value={120}>2 h</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Lead associé (optionnel)</label>
            <select value={leadId} onChange={e => setLeadId(e.target.value)} className="w-full h-9 text-xs bg-[#fafaf8] border border-[#e5e5e0] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#059669]">
              <option value="">Aucun</option>
              {leads.slice(0, 200).map(l => (
                <option key={l.id} value={l.id}>{l.businessName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Ordre du jour, contexte, points à aborder…"
              className="w-full text-xs bg-[#fafaf8] border border-[#e5e5e0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#059669] resize-none"
            />
          </div>
        </div>

        {/* Options */}
        <div className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1">
            <Clock className="h-3.5 w-3.5" />
            Synchronisation
          </div>
          {options.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => opt.set(!opt.value)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[#e5e5e0] bg-[#fafaf8] text-left hover:bg-[#f4f4f3] transition-colors"
              >
                <Icon className="h-3.5 w-3.5 text-[#7a7a76]" />
                <span className="text-xs font-semibold text-[#26251e] flex-1">{opt.label}</span>
                <span className={cn('h-4 w-4 rounded border flex items-center justify-center shrink-0', opt.value ? 'bg-[#059669] border-[#059669]' : 'border-[#e5e5e0]')}>
                  {opt.value && <Check className="h-3 w-3 text-white" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/agenda')}
            className="flex-1 h-10 rounded-lg border border-[#e5e5e0] bg-white text-sm font-semibold text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleBook}
            disabled={!title.trim() || booking}
            className="flex-1 h-10 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirmer le rendez-vous
          </button>
        </div>
      </div>
    </div>
  );
}

export default AgendaNewRoot;
