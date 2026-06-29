'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import {
  Clock, Mail, MapPin, CheckSquare, Tag, TrendingUp, Database,
  Activity, RefreshCw, Bot, CalendarCheck, List,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { LeadsSubNav } from '../../_components/leads-sub-nav';

// ── Types ──────────────────────────────────────────────────────────────────────

type EventType =
  | 'email' | 'field_visit' | 'task' | 'status_change'
  | 'enrichment' | 'note' | 'tag'
  | 'agent_action' | 'sequence' | 'booking';

interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  leadId?: string;
  leadName?: string;
  timestamp: string;
  meta?: Record<string, any>;
  // agent-specific
  reasoning?: string;
  data_signals?: string;
  executed?: boolean;
  autonomy_level?: string;
}

// ── Config ─────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<EventType, { icon: React.ElementType; color: string; label: string }> = {
  email:         { icon: Mail,         color: '#2563eb', label: 'Email' },
  field_visit:   { icon: MapPin,       color: '#059669', label: 'Terrain' },
  task:          { icon: CheckSquare,  color: '#7c3aed', label: 'Tâche' },
  status_change: { icon: TrendingUp,   color: '#d97706', label: 'Statut' },
  enrichment:    { icon: Database,     color: '#059669', label: 'Enrichissement' },
  note:          { icon: Tag,          color: '#64748b', label: 'Note' },
  tag:           { icon: Tag,          color: '#7c3aed', label: 'Tag' },
  agent_action:  { icon: Bot,          color: '#059669', label: 'Agent Minerva' },
  sequence:      { icon: List,         color: '#d97706', label: 'Séquence' },
  booking:       { icon: CalendarCheck,color: '#2563eb', label: 'RDV' },
};

const ALL_TYPES: EventType[] = [
  'email', 'field_visit', 'task', 'status_change',
  'enrichment', 'agent_action', 'sequence', 'booking',
];

const AGENT_ACTION_LABELS: Record<string, string> = {
  create_task:           'Tâche créée',
  update_pipeline_stage: 'Pipeline mis à jour',
  generate_email_draft:  'Brouillon généré',
  enroll_in_sequence:    'Enrôlé en séquence',
  plan_field_route:      'Tournée planifiée',
  summarize_pipeline:    'Pipeline résumé',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

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
  return new Date(iso).toLocaleDateString('fr-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
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

// ── Sub-component: Agent Action Card ─────────────────────────────────────────

function AgentActionExpander({ event }: { event: TimelineEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
        className="flex items-center gap-1 text-[9px] font-bold text-[#7a7a76] hover:text-[#26251e] transition-colors"
      >
        {open ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
        {open ? 'Masquer le raisonnement' : 'Voir le raisonnement'}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5 text-[10px]">
          {event.reasoning && (
            <div className="bg-[#f7f7f5] rounded-lg p-2 border border-[#e5e5e0]">
              <p className="font-bold text-[#059669] mb-0.5">Raisonnement</p>
              <p className="text-[#555552] leading-relaxed">{event.reasoning}</p>
            </div>
          )}
          {event.data_signals && (
            <div className="bg-[#f7f7f5] rounded-lg p-2 border border-[#e5e5e0]">
              <p className="font-bold text-[#7c3aed] mb-0.5">Signaux détectés</p>
              <p className="text-[#555552] leading-relaxed">{event.data_signals}</p>
            </div>
          )}
          {event.autonomy_level && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#26251e]/5 text-[#26251e] font-bold">
              Autonomie : {event.autonomy_level}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TimelineRootProps {
  /** If provided, filters events to this lead only */
  leadId?: string;
  /** Hide the LeadsSubNav (e.g. when embedded in lead detail) */
  hideSubNav?: boolean;
}

export function TimelineRoot({ leadId: filterLeadId, hideSubNav }: TimelineRootProps = {}) {
  const { tasks } = useReach();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventType | 'all'>('all');

  // Build a map from lead_id → lead_name for agent actions
  const { leads } = useReach();
  const leadNameMap = Object.fromEntries(leads.map(l => [l.id, l.businessName]));

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const all: TimelineEvent[] = [];

    // ── 1. Notifications (status changes, enrichments, emails, tags) ──────────
    {
      let q = supabase
        .from('notifications')
        .select('id, type, title, body, link, lead_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (filterLeadId) q = q.eq('lead_id', filterLeadId);

      const { data: notifs } = await q;
      for (const n of notifs || []) {
        let type: EventType = 'note';
        if (n.type === 'email_sent' || n.type === 'email_received') type = 'email';
        else if (n.type === 'scraping_done') type = 'enrichment';
        else if (n.type === 'info' && n.title?.includes('tag')) type = 'tag';
        else if (n.type === 'info' && n.title?.includes('statut')) type = 'status_change';
        else if (n.type === 'info') type = 'note';
        else continue;

        all.push({
          id: `notif_${n.id}`,
          type,
          title: n.title,
          description: n.body || undefined,
          leadId: n.lead_id || undefined,
          leadName: n.lead_id ? leadNameMap[n.lead_id] : undefined,
          timestamp: n.created_at,
          meta: { link: n.link },
        });
      }
    }

    // ── 2. Tasks ──────────────────────────────────────────────────────────────
    if (filterLeadId) {
      // When scoped to a lead, query Supabase directly for tasks with lead_id
      try {
        const { data: leadTasks } = await supabase
          .from('tasks')
          .select('id, description, due_date, status, type, created_at')
          .eq('lead_id', filterLeadId)
          .order('due_date', { ascending: false })
          .limit(50);
        for (const t of leadTasks || []) {
          all.push({
            id: `task_${t.id}`,
            type: 'task',
            title: t.description || t.type || 'Tâche',
            description: t.status === 'completed' ? 'Tâche complétée' : undefined,
            leadId: filterLeadId,
            timestamp: t.due_date || t.created_at,
            meta: { completed: t.status === 'completed' },
          });
        }
      } catch { /* ignore */ }
    } else {
      // Global view: use context tasks (no lead scoping needed)
      for (const task of tasks.slice(0, 50)) {
        if (!task.dueDate) continue;
        all.push({
          id: `task_${task.id}`,
          type: 'task',
          title: task.title || 'Tâche',
          description: task.completed ? 'Tâche complétée' : task.description || undefined,
          timestamp: task.dueDate,
          meta: { completed: task.completed },
        });
      }
    }

    // ── 3. Field visits (route_plans) ─────────────────────────────────────────
    try {
      const { data: plans } = await supabase
        .from('route_plans')
        .select('id, title, created_at, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      for (const plan of plans || []) {
        all.push({
          id: `field_${plan.id}`,
          type: 'field_visit',
          title: plan.title || 'Tournée terrain',
          description: `Statut : ${plan.status || 'inconnu'}`,
          timestamp: plan.created_at,
        });
      }
    } catch { /* table might not exist */ }

    // ── 4. Agent actions ──────────────────────────────────────────────────────
    try {
      let q = supabase
        .from('agent_actions')
        .select('id, action_type, lead_id, reasoning, data_signals, result, autonomy_level, executed, created_at')
        .eq('workspace_id', (await supabase.from('settings').select('workspace_id').eq('user_id', user.id).maybeSingle()).data?.workspace_id || '')
        .order('created_at', { ascending: false })
        .limit(50);
      if (filterLeadId) q = q.eq('lead_id', filterLeadId);

      const { data: actions } = await q;
      for (const a of actions || []) {
        const actionLabel = AGENT_ACTION_LABELS[a.action_type] || a.action_type;
        const leadName = a.lead_id ? leadNameMap[a.lead_id] : undefined;
        all.push({
          id: `agent_${a.id}`,
          type: 'agent_action',
          title: `Agent Minerva — ${actionLabel}`,
          description: leadName ? `Pour : ${leadName}` : undefined,
          leadId: a.lead_id || undefined,
          leadName,
          timestamp: a.created_at,
          reasoning: a.reasoning || undefined,
          data_signals: a.data_signals || undefined,
          executed: a.executed,
          autonomy_level: a.autonomy_level || undefined,
          meta: { result: a.result, executed: a.executed },
        });
      }
    } catch { /* agent_actions might not exist yet */ }

    // ── 5. Sequence enrollments ───────────────────────────────────────────────
    try {
      let q = supabase
        .from('sequence_enrollments')
        .select('id, lead_id, status, current_step, created_at, sequence_templates(name)')
        .eq('workspace_id', '')
        .order('created_at', { ascending: false })
        .limit(30);
      // Note: workspace_id filter omitted since we don't easily have it here; use user_id join if available
      const { data: enrollments } = await supabase
        .from('sequence_enrollments')
        .select('id, lead_id, status, current_step, created_at, sequence_templates(name)')
        .order('created_at', { ascending: false })
        .limit(30);

      for (const e of enrollments || []) {
        if (filterLeadId && e.lead_id !== filterLeadId) continue;
        const seqName = (e.sequence_templates as any)?.name || 'Séquence';
        const leadName = e.lead_id ? leadNameMap[e.lead_id] : undefined;
        all.push({
          id: `seq_${e.id}`,
          type: 'sequence',
          title: `Enrôlé : ${seqName}`,
          description: `Étape ${(e.current_step || 0) + 1} — Statut : ${e.status || 'actif'}`,
          leadId: e.lead_id || undefined,
          leadName,
          timestamp: e.created_at,
        });
      }
    } catch { /* sequence_enrollments might not exist yet */ }

    // ── 6. Bookings / Agenda ──────────────────────────────────────────────────
    try {
      const { data: appts } = await supabase
        .from('appointments')
        .select('id, title, start_time, lead_id, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      for (const a of appts || []) {
        if (filterLeadId && a.lead_id !== filterLeadId) continue;
        const leadName = a.lead_id ? leadNameMap[a.lead_id] : undefined;
        all.push({
          id: `booking_${a.id}`,
          type: 'booking',
          title: a.title || 'Rendez-vous',
          description: a.start_time
            ? new Date(a.start_time).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' })
            : undefined,
          leadId: a.lead_id || undefined,
          leadName,
          timestamp: a.created_at || a.start_time,
        });
      }
    } catch { /* appointments table might not exist */ }

    // Sort by timestamp DESC
    all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEvents(all);
    setLoading(false);
  }, [tasks, leadNameMap, filterLeadId]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);
  const grouped = groupByDate(filtered);

  return (
    <div className="flex flex-col h-full w-full bg-[#fafaf8]">
      {!hideSubNav && <LeadsSubNav />}

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-[#26251e] flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#059669]" />
                Timeline
                {filterLeadId && <span className="text-sm font-normal text-[#7a7a76]">— ce lead</span>}
              </h1>
              <p className="text-xs text-[#7a7a76] mt-0.5">
                Historique chronologique — emails, terrain, agent, séquences, RDV
              </p>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3 h-7 rounded-lg border border-[#e5e5e0] bg-white text-[10px] font-bold text-[#555552] hover:bg-[#f4f4f3] transition-colors"
            >
              <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
              Actualiser
            </button>
          </div>

          {/* Filtres */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-wrap">
            {(['all', ...ALL_TYPES] as const).map(t => {
              const conf = t === 'all' ? null : TYPE_CONFIG[t];
              const Icon = conf?.icon;
              const count = t === 'all' ? events.length : events.filter(e => e.type === t).length;
              if (count === 0 && t !== 'all') return null;
              return (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors shrink-0',
                    filter === t
                      ? 'bg-[#059669] text-white'
                      : 'bg-white border border-[#e5e5e0] text-[#555552] hover:bg-[#f4f4f3]',
                  )}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {t === 'all' ? 'Tout' : conf!.label}
                  <span className={cn('text-[8px] px-1 rounded-full', filter === t ? 'bg-white/30 text-white' : 'bg-[#e5e5e0] text-[#7a7a76]')}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Timeline */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-16 bg-white rounded-xl border border-[#e5e5e0] animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="h-10 w-10 text-[#e5e5e0] mb-3" />
              <p className="text-sm font-semibold text-[#26251e]">Aucun événement</p>
              <p className="text-xs text-[#7a7a76] mt-1">
                Les interactions avec tes leads apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(group => (
                <div key={group.dateLabel}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-3">
                    {group.dateLabel}
                  </p>
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-[#e5e5e0]" />
                    <div className="space-y-2 pl-8">
                      {group.events.map(event => {
                        const conf = TYPE_CONFIG[event.type] || { icon: Activity, color: '#7a7a76', label: event.type };
                        const Icon = conf.icon;

                        const isAgentAction = event.type === 'agent_action';
                        const href = event.meta?.link || (event.leadId ? `/leads/${event.leadId}` : null);

                        const card = (
                          <div
                            key={event.id}
                            className={cn(
                              'relative bg-white rounded-xl border p-3 transition-shadow',
                              isAgentAction
                                ? 'border-[#059669]/30 bg-[#f0faf6] hover:shadow-sm'
                                : 'border-[#e5e5e0] hover:shadow-sm',
                            )}
                          >
                            {/* Timeline dot */}
                            <div
                              className="absolute -left-[26px] top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white border-2"
                              style={{ borderColor: conf.color }}
                            >
                              <Icon className="h-2.5 w-2.5" style={{ color: conf.color }} />
                            </div>

                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {/* Type badge */}
                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                  <span
                                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${conf.color}18`, color: conf.color }}
                                  >
                                    {conf.label}
                                  </span>
                                  {isAgentAction && event.executed !== undefined && (
                                    <span className={cn(
                                      'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                                      event.executed
                                        ? 'bg-[#059669]/10 text-[#059669]'
                                        : 'bg-[#d97706]/10 text-[#d97706]',
                                    )}>
                                      {event.executed ? 'Exécuté' : 'Suggéré'}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-semibold text-[#26251e] leading-snug">{event.title}</p>

                                {event.description && (
                                  <p className="text-[10px] text-[#7a7a76] mt-0.5 line-clamp-2">{event.description}</p>
                                )}

                                {event.leadName && event.leadId && (
                                  <Link
                                    href={`/leads/${event.leadId}`}
                                    className="text-[10px] text-[#059669] font-semibold hover:underline mt-0.5 inline-block"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    {event.leadName}
                                  </Link>
                                )}

                                {/* Agent reasoning expander */}
                                {isAgentAction && (event.reasoning || event.data_signals) && (
                                  <AgentActionExpander event={event} />
                                )}
                              </div>

                              <span className="text-[9px] text-[#7a7a76] shrink-0 mt-0.5">
                                {timeAgo(event.timestamp)}
                              </span>
                            </div>
                          </div>
                        );

                        return href ? (
                          <Link key={event.id} href={href} className="block">{card}</Link>
                        ) : (
                          <div key={event.id}>{card}</div>
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
