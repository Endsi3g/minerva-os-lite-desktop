'use client';

import React, { useState, useEffect } from 'react';
import { Zap, RefreshCw, Loader2, Brain, Mail, Phone, MapPin, CalendarCheck2, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';

interface LeadNbaData {
  nba_score: number | null;
  nba_action: string | null;
  nba_reason: string | null;
  nba_channel: string | null;
  nba_computed_at: string | null;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  email_followup: Mail,
  call: Phone,
  switch_channel: Phone,
  field_visit: MapPin,
  book_meeting: CalendarCheck2,
  nurture: Zap,
  pause: Pause,
};

const ACTION_LABELS: Record<string, string> = {
  email_followup: 'Envoyer un email de relance',
  call: 'Appeler le prospect',
  switch_channel: 'Changer de canal — appeler',
  field_visit: 'Planifier une visite terrain',
  book_meeting: 'Proposer un rendez-vous',
  nurture: 'Ajouter à une séquence',
  pause: 'Mettre en pause',
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? '#dc2626' : score >= 50 ? '#d97706' : '#6b7280';
  const label = score >= 70 ? 'Urgent' : score >= 50 ? 'Moyen' : 'Faible';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{ background: color }}>
        {score}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
    </div>
  );
}

export function LeadNbaCard({ leadId, workspaceId }: { leadId: string; workspaceId: string }) {
  const [data, setData] = useState<LeadNbaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [rescoring, setRescoring] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/nba/score?workspace_id=${workspaceId}&lead_id=${leadId}`));
      if (res.ok) {
        const json = await res.json();
        const leadData = json.lead ?? json.leads?.find((l: { id: string }) => l.id === leadId);
        if (leadData) {
          setData({
            nba_score: leadData.nba_score,
            nba_action: leadData.nba_action,
            nba_reason: leadData.nba_reason,
            nba_channel: leadData.nba_channel,
            nba_computed_at: leadData.nba_computed_at,
          });
        } else {
          setData(null);
        }
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRescore = async () => {
    setRescoring(true);
    try {
      await fetch(getApiUrl('/api/nba/score'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      await fetchData();
      toast.success('Score NBA recalculé');
    } catch {
      toast.error('Erreur lors du calcul');
    } finally {
      setRescoring(false);
    }
  };

  const handleExplain = async () => {
    if (explanation) { setExplanation(null); return; }
    setExplaining(true);
    try {
      const res = await fetch(getApiUrl('/api/nba/explain'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, workspace_id: workspaceId }),
      });
      const json = await res.json();
      setExplanation(json.explanation ?? 'Aucune explication disponible');
    } catch {
      toast.error("Erreur lors de l'explication");
    } finally {
      setExplaining(false);
    }
  };

  useEffect(() => { fetchData(); }, [leadId, workspaceId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-2 animate-pulse">
        <div className="h-3 w-24 rounded bg-[#e5e5e0]" />
        <div className="h-8 w-16 rounded-full bg-[#e5e5e0]" />
        <div className="h-3 w-full rounded bg-[#e5e5e0]" />
      </div>
    );
  }

  if (!data || data.nba_score === null) {
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#26251e]">Score NBA non calculé</p>
          <p className="text-[11px] text-[#7a7a76]">Lancez le calcul pour obtenir une recommandation</p>
        </div>
        <button
          onClick={handleRescore}
          disabled={rescoring}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold disabled:opacity-60 transition-colors"
        >
          {rescoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          Calculer
        </button>
      </div>
    );
  }

  const Icon = ACTION_ICONS[data.nba_action ?? ''] ?? Zap;
  const label = ACTION_LABELS[data.nba_action ?? ''] ?? (data.nba_action ?? 'Action recommandée');

  return (
    <div className="rounded-xl border-l-[3px] border-l-[#059669] border border-[#e5e5e0] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-[#059669] fill-[#059669]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#059669]">Prochaine meilleure action</span>
        </div>
        <button
          onClick={handleRescore}
          disabled={rescoring}
          className="p-1 hover:bg-[#f4f4f3] rounded text-[#a3a197] hover:text-[#26251e] transition-colors"
          title="Recalculer"
        >
          <RefreshCw className={cn('h-3 w-3', rescoring && 'animate-spin')} />
        </button>
      </div>

      <ScoreBadge score={Math.round(data.nba_score)} />

      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[#059669] shrink-0" />
        <span className="text-sm font-semibold text-[#26251e]">{label}</span>
      </div>

      {data.nba_reason && (
        <p className="text-[11px] text-[#555552] leading-relaxed bg-[#fafaf8] border border-[#e5e5e0] rounded-lg px-3 py-2">
          {data.nba_reason}
        </p>
      )}

      {explanation && (
        <div className="rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] px-3 py-2 space-y-1">
          <p className="text-[10px] font-bold text-[#059669] uppercase tracking-wider">Analyse IA</p>
          <p className="text-[11px] text-[#15803d] leading-relaxed italic">{explanation}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleExplain}
          disabled={explaining}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e5e5e0] hover:bg-[#f4f4f3] text-xs font-semibold text-[#555552] hover:text-[#26251e] transition-colors"
        >
          {explaining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
          {explanation ? 'Masquer' : 'Pourquoi ?'}
        </button>
        {data.nba_computed_at && (
          <span className="ml-auto text-[10px] text-[#a3a197] self-center">
            {new Date(data.nba_computed_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  );
}
