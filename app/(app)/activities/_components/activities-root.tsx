'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import { Activity, Mail, Phone, FileText, CheckSquare, Plus, User, Clock, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lead, Note } from '@/lib/mock-data';

type ActivityEntry = {
  id: string;
  type: 'email_sent' | 'note' | 'task_completed' | 'call' | 'lead_created' | 'status_change';
  title: string;
  body?: string;
  leadId?: string;
  leadName?: string;
  createdAt: string;
};

const TYPE_ICONS: Record<ActivityEntry['type'], React.ElementType> = {
  email_sent: Mail,
  note: FileText,
  task_completed: CheckSquare,
  call: Phone,
  lead_created: Plus,
  status_change: Activity,
};
const TYPE_COLORS: Record<ActivityEntry['type'], string> = {
  email_sent: 'bg-blue-50 text-blue-600 border-blue-100',
  note: 'bg-[#f4f4f3] text-[#555552] border-[#e5e5e0]',
  task_completed: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20',
  call: 'bg-violet-50 text-violet-600 border-violet-100',
  lead_created: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20',
  status_change: 'bg-amber-50 text-amber-700 border-amber-200',
};
const TYPE_LABELS: Record<ActivityEntry['type'], string> = {
  email_sent: 'Email envoyé',
  note: 'Note ajoutée',
  task_completed: 'Tâche complétée',
  call: 'Appel',
  lead_created: 'Lead créé',
  status_change: 'Changement statut',
};

type FilterType = 'all' | ActivityEntry['type'];

export function ActivitiesRoot() {
  const { leads, tasks, campaigns } = useReach();
  const [filter, setFilter] = useState<FilterType>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');

  // Derive activities from existing data
  const activities = useMemo((): ActivityEntry[] => {
    const entries: ActivityEntry[] = [];

    // Lead creation events
    leads.forEach(l => {
      entries.push({
        id: `lead_created_${l.id}`,
        type: 'lead_created',
        title: `Lead créé : ${l.businessName}`,
        body: `${l.niche} — ${l.city}`,
        leadId: l.id,
        leadName: l.businessName,
        createdAt: l.createdAt,
      });
    });

    // Notes from leads
    leads.forEach(l => {
      l.notes.forEach((n: Note) => {
        entries.push({
          id: `note_${n.id}`,
          type: n.type === 'call' ? 'call' : n.type === 'email' ? 'email_sent' : 'note',
          title: n.type === 'call' ? `Appel — ${l.businessName}` : n.type === 'email' ? `Email — ${l.businessName}` : `Note — ${l.businessName}`,
          body: n.content.length > 120 ? n.content.slice(0, 120) + '…' : n.content,
          leadId: l.id,
          leadName: l.businessName,
          createdAt: n.createdAt,
        });
      });
    });

    // Completed tasks
    tasks.filter(t => t.completed).forEach(t => {
      entries.push({
        id: `task_${t.id}`,
        type: 'task_completed',
        title: `Tâche complétée : ${t.title}`,
        createdAt: t.dueDate || new Date().toISOString(),
      });
    });

    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads, tasks]);

  const filtered = useMemo(() => {
    let list = activities;
    if (filter !== 'all') list = list.filter(a => a.type === filter);
    if (campaignFilter !== 'all') {
      const campaignLeadIds = new Set(leads.filter(l => l.campaignId === campaignFilter).map(l => l.id));
      list = list.filter(a => a.leadId && campaignLeadIds.has(a.leadId));
    }
    return list;
  }, [activities, filter, campaignFilter, leads]);

  const filterButtons: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tout' },
    { id: 'lead_created', label: 'Leads' },
    { id: 'email_sent', label: 'Emails' },
    { id: 'call', label: 'Appels' },
    { id: 'note', label: 'Notes' },
    { id: 'task_completed', label: 'Tâches' },
  ];

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    filtered.forEach(a => {
      const key = new Date(a.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#059669]" />
              <h1 className="text-base font-bold text-[#26251e]">Activités</h1>
            </div>
            <p className="text-xs text-[#7a7a76] mt-0.5">{activities.length} entrée{activities.length !== 1 ? 's' : ''} au total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 p-1 rounded-lg bg-[#f4f4f3] border border-[#e5e5e0]">
            {filterButtons.map(b => (
              <button key={b.id} onClick={() => setFilter(b.id)} className={cn('px-3 py-1 rounded-md text-[10px] font-bold transition-all', filter === b.id ? 'bg-white text-[#26251e] shadow-sm border border-[#e5e5e0]' : 'text-[#7a7a76] hover:text-[#26251e]')}>
                {b.label}
              </button>
            ))}
          </div>
          {campaigns.length > 0 && (
            <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)} className="text-[10px] px-2 py-1.5 border border-[#e5e5e0] rounded-lg bg-white text-[#555552] focus:outline-none focus:ring-1 focus:ring-[#059669]/40">
              <option value="all">Toutes les campagnes</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {/* Timeline */}
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center rounded-xl border border-dashed border-[#e5e5e0]">
            <Activity className="h-8 w-8 text-[#7a7a76]/30" />
            <p className="text-xs text-[#7a7a76]">Aucune activité trouvée.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, entries]) => (
              <div key={date} className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] sticky top-0 bg-[#fafaf8] py-1">{date}</p>
                <div className="space-y-2">
                  {entries.map(entry => {
                    const Icon = TYPE_ICONS[entry.type];
                    return (
                      <div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#e5e5e0] bg-white hover:border-[#059669]/20 transition-all">
                        <div className={cn('w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5', TYPE_COLORS[entry.type])}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{TYPE_LABELS[entry.type]}</span>
                            {entry.leadName && (
                              <Link href={`/leads/${entry.leadId}`} className="text-[10px] text-[#059669] hover:underline font-semibold">{entry.leadName}</Link>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-[#26251e] mt-0.5">{entry.title}</p>
                          {entry.body && <p className="text-[10px] text-[#7a7a76] mt-0.5 line-clamp-2">{entry.body}</p>}
                        </div>
                        <div className="shrink-0 flex items-center gap-1 text-[9px] text-[#7a7a76]">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(entry.createdAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
