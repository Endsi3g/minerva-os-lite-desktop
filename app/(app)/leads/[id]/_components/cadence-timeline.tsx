'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  Phone,
  MapPin,
  CalendarCheck2,
  FileText,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/lib/api-helper';

type CadencePhase =
  | 'initial_email'
  | 'followup_email'
  | 'call'
  | 'field_visit'
  | 'booking'
  | 'proposal'
  | 'post_proposal'
  | 'closed';

interface CadenceData {
  currentPhase: CadencePhase;
  nextPhase: CadencePhase;
  currentPhaseLabel: string;
  nextPhaseLabel: string;
  channel: string;
  recommendedAt: string;
  reasoning: string;
  urgency: 'high' | 'medium' | 'low';
  daysSinceLastActivity: number;
}

const PHASES: CadencePhase[] = [
  'initial_email',
  'followup_email',
  'call',
  'field_visit',
  'booking',
  'proposal',
  'post_proposal',
  'closed',
];

const PHASE_LABELS: Record<CadencePhase, string> = {
  initial_email: 'Email initial',
  followup_email: 'Relance email',
  call: 'Appel',
  field_visit: 'Visite terrain',
  booking: 'RDV',
  proposal: 'Proposition',
  post_proposal: 'Suivi',
  closed: 'Terminé',
};

const PHASE_ICONS: Record<CadencePhase, React.ElementType> = {
  initial_email: Mail,
  followup_email: RefreshCw,
  call: Phone,
  field_visit: MapPin,
  booking: CalendarCheck2,
  proposal: FileText,
  post_proposal: ClipboardList,
  closed: CheckCircle2,
};

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  call: 'Appel',
  visit: 'Visite',
  none: '—',
};

const URGENCY_COLORS: Record<string, string> = {
  high: '#dc2626',
  medium: '#d97706',
  low: '#6b7280',
};

const URGENCY_LABELS: Record<string, string> = {
  high: 'Urgent',
  medium: 'Cette semaine',
  low: 'Quand disponible',
};

const ACTION_URLS: Record<CadencePhase, string> = {
  initial_email: '/outreach',
  followup_email: '/outreach',
  call: '/outreach',
  field_visit: '/field',
  booking: '/agenda',
  proposal: '/outreach',
  post_proposal: '/outreach',
  closed: '/leads',
};

function formatRecommendedDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Urgent — aujourd'hui";
  if (diffDays === 1) return 'Demain';
  return `Le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

export function CadenceTimeline({
  leadId,
  workspaceId,
}: {
  leadId: string;
  workspaceId: string;
}) {
  const [data, setData] = useState<CadenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!leadId || !workspaceId) return;
    setLoading(true);
    setError(false);
    fetch(
      getApiUrl(
        `/api/outreach/cadence?lead_id=${encodeURIComponent(leadId)}&workspace_id=${encodeURIComponent(workspaceId)}`
      )
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => setData(json))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [leadId, workspaceId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3 animate-pulse">
        <div className="h-3 w-32 rounded bg-[#e5e5e0]" />
        <div className="flex gap-1.5">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-1 h-8 rounded bg-[#e5e5e0]" />
          ))}
        </div>
        <div className="h-16 rounded-lg bg-[#e5e5e0]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-4">
        <p className="text-[11px] text-[#8A9098] italic">
          Démarrez le cycle de prospection en envoyant un premier email.
        </p>
      </div>
    );
  }

  const currentIdx = PHASES.indexOf(data.currentPhase);
  const isDone = (phase: CadencePhase) => PHASES.indexOf(phase) < currentIdx;
  const isCurrent = (phase: CadencePhase) => phase === data.currentPhase;

  const CurrentIcon = PHASE_ICONS[data.currentPhase];
  const actionUrl = ACTION_URLS[data.currentPhase];
  const urgencyColor = URGENCY_COLORS[data.urgency];
  const urgencyLabel = URGENCY_LABELS[data.urgency];
  const channelLabel = CHANNEL_LABELS[data.channel] ?? data.channel;
  const dateLabel = formatRecommendedDate(data.recommendedAt);

  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-4">
      <div className="flex items-center gap-1.5">
        <CalendarCheck2 className="h-3 w-3 text-[#167f5b]" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#167f5b]">
          Cadence de prospection
        </span>
      </div>

      {/* Horizontal step timeline */}
      <div className="flex items-start gap-0.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {PHASES.filter((p) => p !== 'closed').map((phase, i) => {
          const Icon = PHASE_ICONS[phase];
          const done = isDone(phase);
          const current = isCurrent(phase);
          const future = !done && !current;
          const isLast = i === PHASES.filter((p) => p !== 'closed').length - 1;

          return (
            <React.Fragment key={phase}>
              <div className="flex flex-col items-center gap-1 min-w-[44px]">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all',
                    done && 'bg-[#167f5b]',
                    current && 'bg-white ring-2 ring-[#167f5b] ring-offset-1',
                    future && 'bg-[#f4f4f3] border border-[#e5e5e0]'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-3 w-3',
                      done && 'text-white',
                      current && 'text-[#167f5b]',
                      future && 'text-[#b0b0aa]'
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'text-[8px] font-semibold text-center leading-tight w-10 truncate',
                    done && 'text-[#167f5b]',
                    current && 'text-[#14171A] font-bold',
                    future && 'text-[#b0b0aa]'
                  )}
                >
                  {PHASE_LABELS[phase]}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-px mt-3.5 min-w-[6px]',
                    done ? 'bg-[#167f5b]' : 'bg-[#e5e5e0]'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current phase card */}
      {data.currentPhase !== 'closed' && (
        <div className="rounded-xl border-l-[3px] border-l-[#167f5b] border border-[#e5e5e0] bg-white p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <CurrentIcon className="h-3.5 w-3.5 text-[#167f5b] shrink-0" />
            <span className="text-sm font-semibold text-[#14171A]">
              {data.currentPhaseLabel}
            </span>
            <span
              className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                color: urgencyColor,
                background: `${urgencyColor}18`,
              }}
            >
              {urgencyLabel}
            </span>
          </div>

          <p className="text-[11px] text-[#555552] leading-relaxed">
            {data.reasoning}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-[#8A9098]">
              {dateLabel}
            </span>
            <span className="w-1 h-1 rounded-full bg-[#e5e5e0]" />
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f4f4f3] border border-[#e5e5e0] text-[#14171A] font-semibold">
              {channelLabel}
            </span>
          </div>

          <a
            href={actionUrl}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#167f5b] hover:text-[#0f6b4c] transition-colors group"
          >
            Exécuter maintenant
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      )}

      {data.currentPhase === 'closed' && (
        <div className="rounded-xl border border-[#e5e5e0] bg-[#f4f4f3]/60 p-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#167f5b] shrink-0" />
          <p className="text-[11px] font-semibold text-[#14171A]">
            Cycle commercial terminé.
          </p>
        </div>
      )}
    </div>
  );
}
