'use client';

import { Flame, Sun, Snowflake } from 'lucide-react';
import { computeLeadScoreV2 } from '@/lib/lead-score';
import type { Lead } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const HEAT_CONFIG: Record<Lead['temperature'], { label: string; color: string; bg: string; Icon: typeof Flame }> = {
  Hot: { label: 'Chaud', color: '#ef4444', bg: '#ef444414', Icon: Flame },
  Warm: { label: 'Tiède', color: '#059669', bg: '#05966914', Icon: Sun },
  Cold: { label: 'Froid', color: '#3b82f6', bg: '#3b82f614', Icon: Snowflake },
};

/**
 * Surfaces the lead's existing Hot/Warm/Cold temperature + score (already
 * computed in lib/lead-score.ts, nothing new to calculate) prominently on
 * call/field-prepare screens.
 */
export function LeadHeatBadge({ lead, showScore = true, className }: { lead: Lead; showScore?: boolean; className?: string }) {
  const cfg = HEAT_CONFIG[lead.temperature] || HEAT_CONFIG.Warm;
  const { Icon } = cfg;
  const score = showScore ? computeLeadScoreV2(lead).total : null;

  return (
    <div
      className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold', className)}
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33` }}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>Lead {cfg.label}</span>
      {score !== null && <span className="opacity-70 font-semibold">· {score}/100</span>}
    </div>
  );
}
