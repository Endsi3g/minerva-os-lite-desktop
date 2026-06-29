'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import {
  Clock, Mail, MapPin, CheckSquare, Tag, TrendingUp, Database,
  Activity, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { LeadsSubNav } from '../../_components/leads-sub-nav';

type EventType = 'email' | 'field_visit' | 'task' | 'status_change' | 'enrichment' | 'note' | 'tag';

interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  leadId?: string;
  leadName?: string;
  timestamp: string;
  meta?: Record<string, any>;
}

const TYPE_CONFIG: Record<EventType, { icon: React.ElementType; color: string; label: string }> = {
  email:         { icon: Mail,        color: '#2563eb', label: 'Email' },
  field_visit:   { icon: MapPin,      color: '#059669', label: 'Visite terrain' },
  task:          { icon: CheckSquare, color: '#7c3aed', label: 'Tâche' },
  status_change: { icon: TrendingUp,  color: '#d97706', label: 'Statut' },
  enrichment:    { icon: Database,    color: '#059669', label: 'Enrichissement' },
  note:          { icon: Tag,         color: '#64748b', label: 'Note' },
  tag:           { icon: Tag,         color: '#7c3aed', label: 'Tag' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'À l\'instant';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}j`;
  return new Date(iso).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function groupByDate(events: TimelineEvent[]): Array<{ dateLabel: string; events: TimelineEvent[] }> {
  const groups: Record<string, TimelineEvent[]> = {};
  for (const e of events) {
    const d = new Date(e.timestamp).toDateString();
    if (!groups[d]) groups[d] = [];
    groups[d].push(e);
  }
  return Object.entries(groups).map(([d, evs]) => ({
    dateLabel: formatDate(new Date(d).toISOString()),
    events: evs,
  }));
}

const ALL_TYPES: EventType[] = ['email', 'field_visit', 'task', 'status_change', 'enrichment'];

export function TimelineRoot() {
  const { tasks, leads } = useReach();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventType | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const allEvents: TimelineEvent[] = [];

    // 1. Notifications (status changes, enrichments, emails, tags)
    const { data: notifs } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    for (const n of notifs || []) {
      let type: EventType = 'note';
      if (n.type === 'email_sent' || n.type === 'email_received') type = 'email';
      else if (n.type === 'scraping_done') type = 'enrichment';
      else if (n.type === 'info' && n.title?.includes('tag')) type = 'tag';
      else if (n.type === 'info' && n.title?.includes('statut')) type = 'status_change';
      else if (n.type === 'info') type = 'note';
      else continue; // skip team notifications

      allEvents.push({
        id: `notif_${n.id}`,
        type,
        title: n.title,
        description: n.body || undefined,
        timestamp: n.created_at,
        meta: { link: n.link },
      });
    }

    // 2. Tasks (completed / scheduled)
    for (const task of tasks.slice(0, 50)) {
      const ts = task.dueDate;
      if (!ts) continue;
      allEvents.push({
        id: `task_${task.id}`,
        type: 'task',
        title: task.title || 'Tâche',
        description: task.completed ? 'Tâche complétée' : task.description || undefined,
        timestamp: ts,
        meta: { completed: task.completed },
      });
    }

    // 3. Try to load field visits from route_plans / outcomes
    try {
      const { data: plans } = await supabase
        .from('route_plans')
        .select('id, title, created_at, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      for (const plan of plans || []) {
        allEvents.push({
          id: `field_${plan.id}`,
          type: 'field_visit',
          title: plan.title || 'Tournée terrain',
          description: `Statut : ${plan.status || 'inconnue'}`,
          timestamp: plan.created_at,
        });
      }
    } catch { /* table might not exist */ }

    // Sort by timestamp DESC
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEvents(allEvents);
    setLoading(false);
  }, [tasks, leads]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);
  const grouped = groupByDate(filtered);

  return (
    <div className="flex flex-col h-full w-full bg-[#fafaf8]">
      <LeadsSubNav />

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-[#26251e] flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#059669]" />
                Timeline
              </h1>
              <p className="text-xs text-[#7a7a76] mt-0.5">Historique chronologique de toutes les interactions</p>
            </div>
            <button onClick={load} className="flex items-center gap-1.5 px-3 h-7 rounded-lg border border-[#e5e5e0] bg-white text-[10px] font-bold text-[#555552] hover:bg-[#f4f4f3] transition-colors">
              <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
              Actualiser
            </button>
          </div>

          {/* Filtres */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(['all', ...ALL_TYPES] as const).map(t => {
              const conf = t === 'all' ? null : TYPE_CONFIG[t];
              const Icon = conf?.icon;
              return (
                <button key={t} onClick={() => setFilter(t)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors shrink-0',
                    filter === t ? 'bg-[#059669] text-white' : 'bg-white border border-[#e5e5e0] text-[#555552] hover:bg-[#f4f4f3]')}>
                  {Icon && <Icon className="h-3 w-3" />}
                  {t === 'all' ? 'Tout' : conf!.label}
                </button>
              );
            })}
          </div>

          {/* Timeline */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white rounded-xl border border-[#e5e5e0] animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="h-10 w-10 text-[#e5e5e0] mb-3" />
              <p className="text-sm font-semibold text-[#26251e]">Aucun événement</p>
              <p className="text-xs text-[#7a7a76] mt-1">Les interactions avec tes leads apparaîtront ici.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(group => (
                <div key={group.dateLabel}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-3">{group.dateLabel}</p>
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-[#e5e5e0]" />
                    <div className="space-y-2 pl-8">
                      {group.events.map(event => {
                        const conf = TYPE_CONFIG[event.type] || { icon: Activity, color: '#7a7a76', label: event.type };
                        const Icon = conf.icon;
                        const inner = (
                          <div className="relative bg-white rounded-xl border border-[#e5e5e0] p-3 hover:shadow-sm transition-shadow">
                            <div className="absolute -left-[26px] top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white border-2 border-[#e5e5e0]"
                              style={{ borderColor: conf.color }}>
                              <Icon className="h-2.5 w-2.5" style={{ color: conf.color }} />
                            </div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${conf.color}18`, color: conf.color }}>{conf.label}</span>
                                </div>
                                <p className="text-xs font-semibold text-[#26251e] leading-snug">{event.title}</p>
                                {event.description && <p className="text-[10px] text-[#7a7a76] mt-0.5 line-clamp-2">{event.description}</p>}
                                {event.leadName && event.leadId && (
                                  <Link href={`/leads/${event.leadId}`}
                                    className="text-[10px] text-[#059669] font-semibold hover:underline mt-0.5 inline-block">
                                    {event.leadName}
                                  </Link>
                                )}
                              </div>
                              <span className="text-[9px] text-[#7a7a76] shrink-0 mt-0.5">{timeAgo(event.timestamp)}</span>
                            </div>
                          </div>
                        );
                        const href = event.meta?.link || (event.leadId ? `/leads/${event.leadId}` : null);
                        return href ? (
                          <Link key={event.id} href={href}>{inner}</Link>
                        ) : (
                          <div key={event.id}>{inner}</div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
