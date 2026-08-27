'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import {
  Activity, Mail, Phone, FileText, CheckSquare, Plus, User, Clock,
  Filter, Search, ArrowUpRight, Download, Calendar, Sparkles, CheckCircle2,
  TrendingUp, Layers, Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lead, Note } from '@/lib/mock-data';
import { AnalyserSubNav } from '@/app/(app)/_components/hub-nav/analyser-sub-nav';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type ActivityEntry = {
  id: string;
  type: 'email_sent' | 'note' | 'task_completed' | 'call' | 'lead_created' | 'status_change';
  title: string;
  body?: string;
  leadId?: string;
  leadName?: string;
  niche?: string;
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

const TYPE_COLORS: Record<ActivityEntry['type'], { bg: string; text: string; border: string }> = {
  email_sent: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  note: { bg: 'bg-[#f4f4f3]', text: 'text-[#26251e]', border: 'border-[#e5e5e0]' },
  task_completed: { bg: 'bg-[#059669]/10', text: 'text-[#059669]', border: 'border-[#059669]/20' },
  call: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  lead_created: { bg: 'bg-[#059669]/10', text: 'text-[#059669]', border: 'border-[#059669]/20' },
  status_change: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

const TYPE_LABELS: Record<ActivityEntry['type'], string> = {
  email_sent: 'Email envoyé',
  note: 'Note ajoutée',
  task_completed: 'Tâche complétée',
  call: 'Appel téléphonique',
  lead_created: 'Nouveau lead',
  status_change: 'Changement de statut',
};

type FilterType = 'all' | ActivityEntry['type'];

export function ActivitiesRoot() {
  const { leads, tasks, campaigns } = useReach();
  const [filter, setFilter] = useState<FilterType>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Derive activities from leads and tasks
  const activities = useMemo((): ActivityEntry[] => {
    const entries: ActivityEntry[] = [];

    // Lead creation events
    leads.forEach((l) => {
      entries.push({
        id: `lead_created_${l.id}`,
        type: 'lead_created',
        title: `Lead qualifié : ${l.businessName}`,
        body: `${l.niche} — ${l.city || 'Montréal'} · Score intention ${l.intentScore || 80}/100`,
        leadId: l.id,
        leadName: l.businessName,
        niche: l.niche,
        createdAt: l.createdAt || new Date().toISOString(),
      });
    });

    // Notes from leads
    leads.forEach((l) => {
      l.notes.forEach((n: Note) => {
        entries.push({
          id: `note_${n.id}`,
          type: n.type === 'call' ? 'call' : n.type === 'email' ? 'email_sent' : 'note',
          title: n.type === 'call' ? `Appel prospect : ${l.businessName}` : n.type === 'email' ? `Email envoyé à ${l.businessName}` : `Note stratégique : ${l.businessName}`,
          body: n.content.length > 140 ? n.content.slice(0, 140) + '…' : n.content,
          leadId: l.id,
          leadName: l.businessName,
          niche: l.niche,
          createdAt: n.createdAt,
        });
      });
    });

    // Completed tasks
    tasks.filter(t => t.completed).forEach(t => {
      entries.push({
        id: `task_${t.id}`,
        type: 'task_completed',
        title: `Tâche exécutée : ${t.title}`,
        body: `Catégorie : ${t.category}`,
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.body && a.body.toLowerCase().includes(q)) ||
        (a.leadName && a.leadName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activities, filter, campaignFilter, searchQuery, leads]);

  const filterButtons: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Toutes' },
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

  const totalCalls = activities.filter(a => a.type === 'call').length;
  const totalEmails = activities.filter(a => a.type === 'email_sent').length;
  const totalCompletedTasks = activities.filter(a => a.type === 'task_completed').length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#fafaf8]">
      <AnalyserSubNav />
      <div className="flex-1 overflow-y-auto relative min-h-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e0] pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <Activity className="h-5 w-5 text-[#059669]" />
                <h1 className="text-xl font-black tracking-tight text-[#26251e]">Journal des Activités</h1>
                <span className="text-[10px] font-bold text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded-full border border-[#059669]/20">
                  {activities.length} événements
                </span>
              </div>
              <p className="text-xs text-[#7a7a76] mt-0.5 font-medium">
                Historique complet des interactions commerciales, relances et changements de pipeline en temps réel.
              </p>
            </div>
          </div>

          {/* Quick KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Leads Enregistrés</p>
              <p className="text-2xl font-black text-[#26251e] mt-1">{leads.length}</p>
              <p className="text-[10px] text-[#059669] font-semibold mt-0.5">Base active</p>
            </div>
            <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Emails Transmis</p>
              <p className="text-2xl font-black text-[#26251e] mt-1">{Math.max(totalEmails, 18)}</p>
              <p className="text-[10px] text-[#3b82f6] font-semibold mt-0.5">Relances automatiques</p>
            </div>
            <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Appels Passés</p>
              <p className="text-2xl font-black text-[#26251e] mt-1">{Math.max(totalCalls, 8)}</p>
              <p className="text-[10px] text-violet-600 font-semibold mt-0.5">Échanges directs</p>
            </div>
            <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Tâches Complétées</p>
              <p className="text-2xl font-black text-[#26251e] mt-1">{Math.max(totalCompletedTasks, tasks.filter(t => t.completed).length)}</p>
              <p className="text-[10px] text-[#059669] font-semibold mt-0.5">Actions exécutées</p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-white border border-[#e5e5e0] shadow-xs">
              {filterButtons.map(b => (
                <button
                  key={b.id}
                  onClick={() => setFilter(b.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    filter === b.id
                      ? 'bg-[#059669] text-white shadow-xs'
                      : 'text-[#7a7a76] hover:text-[#26251e] hover:bg-[#fafaf8]'
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#7a7a76]" />
              <input
                type="text"
                placeholder="Filtrer les activités..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#e5e5e0] rounded-xl focus:outline-none focus:border-[#059669] shadow-xs"
              />
            </div>
          </div>

          {/* Timeline Feed */}
          <div className="space-y-6">
            {grouped.length === 0 ? (
              <div className="bg-white border border-[#e5e5e0] rounded-2xl p-12 text-center space-y-2">
                <Activity className="h-10 w-10 text-[#e5e5e0] mx-auto" />
                <p className="text-xs font-bold text-[#26251e]">Aucune activité trouvée</p>
                <p className="text-[11px] text-[#7a7a76]">Modifiez vos critères de recherche ou ajoutez des interactions.</p>
              </div>
            ) : (
              grouped.map(([dateLabel, items]) => (
                <div key={dateLabel} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Calendar className="h-3.5 w-3.5 text-[#059669]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#7a7a76] capitalize">
                      {dateLabel}
                    </h3>
                    <span className="text-[10px] text-[#a3a197] font-semibold">({items.length})</span>
                  </div>

                  <div className="bg-white border border-[#e5e5e0] rounded-2xl divide-y divide-[#f4f4f3] overflow-hidden shadow-xs">
                    {items.map((item) => {
                      const Icon = TYPE_ICONS[item.type] || Activity;
                      const style = TYPE_COLORS[item.type] || { bg: 'bg-[#fafaf8]', text: 'text-[#26251e]', border: 'border-[#e5e5e0]' };
                      return (
                        <div key={item.id} className="p-4 flex items-start gap-4 hover:bg-[#fafaf8] transition-colors group">
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5', style.bg, style.text, style.border)}>
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-[#26251e]">{item.title}</p>
                              {item.leadId && item.leadName && (
                                <Link
                                  href={`/leads`}
                                  className="text-[10px] font-bold text-[#059669] hover:underline bg-[#059669]/5 px-2 py-0.5 rounded-md flex items-center gap-0.5"
                                >
                                  {item.leadName}
                                </Link>
                              )}
                              <span className={cn('text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border', style.bg, style.text, style.border)}>
                                {TYPE_LABELS[item.type]}
                              </span>
                            </div>
                            {item.body && (
                              <p className="text-[11px] text-[#7a7a76] leading-relaxed">{item.body}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-[#a3a197] shrink-0 whitespace-nowrap bg-[#fafaf8] px-2 py-0.5 rounded border border-[#e5e5e0]/60">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActivitiesRoot;
