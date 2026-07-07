'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { getActionLabel, getUrgencyColor } from '@/lib/nba-engine';
import { LeadsSubNav } from '../../_components/leads-sub-nav';
import { Loader2, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface RescueLead {
  id: string;
  business_name: string;
  niche: string;
  city: string | null;
  status: string;
  temperature: string;
  nba_score: number;
  nba_action: string;
  nba_reason: string;
  nba_channel: string;
  daysSinceContact: number;
}

export function LeadRescueRoot() {
  useEffect(() => { document.title = 'Leads à relancer — Minerva'; }, []);
  const { activeWorkspace, addTask } = useReach();
  const [leads, setLeads] = useState<RescueLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescuingIds, setRescuingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/leads/rescue?workspace_id=${activeWorkspace.id}`));
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads ?? []);
      }
    } catch (err) {
      console.error('Error loading rescue leads:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => { load(); }, [load]);

  const handleRescue = async (lead: RescueLead) => {
    setRescuingIds(prev => new Set(prev).add(lead.id));
    try {
      await addTask(`Relancer ${lead.business_name} (${getActionLabel(lead.nba_action)})`, 'Follow-up');

      try {
        await fetch(getApiUrl('/api/generate-draft'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead.id,
            channel: 'Email',
            tone: 'Calme & Conseil',
            instructions: `Relance automatique via la page de sauvetage (Action recommandée : ${getActionLabel(lead.nba_action)})`,
            templateType: 'follow_up',
          }),
        });
      } catch (e) {
        console.error('Error generating AI draft for rescued lead:', e);
      }

      toast.success(`Tâche de relance et brouillon IA créés pour ${lead.business_name}`);
      setLeads(prev => prev.filter(l => l.id !== lead.id));
    } catch (err) {
      console.error(err);
      toast.error('Impossible de créer la tâche');
    } finally {
      setRescuingIds(prev => { const next = new Set(prev); next.delete(lead.id); return next; });
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white text-[#26251e] font-sans">
      <LeadsSubNav />

      <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#26251e]">Leads à relancer</h1>
            <p className="text-sm text-[#7a7a76] mt-1">
              Prospects silencieux ou en nurture depuis un moment — {leads.length} lead{leads.length !== 1 ? 's' : ''} à rescaper.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="h-9 px-3 rounded-lg border border-[#e5e5e0] text-xs font-semibold text-[#555552] hover:bg-[#f4f4f3] flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            Actualiser
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#7a7a76]">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Analyse des leads en cours…
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center p-12 border border-[#e5e5e0] rounded-xl bg-[#fafaf8]">
            <CheckCircle2 className="h-8 w-8 text-[#059669] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#26251e]">Aucun lead à secourir pour le moment.</p>
            <p className="text-xs text-[#7a7a76] mt-1">Tous vos prospects actifs ont une activité récente ou sont bien engagés.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map(lead => (
              <div key={lead.id} className="border border-[#e5e5e0] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white hover:border-[#059669]/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/leads/${lead.id}`} className="font-bold text-sm text-[#26251e] hover:text-[#059669]">
                      {lead.business_name}
                    </Link>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border" style={{ color: getUrgencyColor('low'), borderColor: '#e5e5e0' }}>
                      {getActionLabel(lead.nba_action)}
                    </span>
                  </div>
                  <p className="text-xs text-[#7a7a76] mt-1">{lead.niche}{lead.city ? ` · ${lead.city}` : ''}</p>
                  <p className="text-xs text-[#555552] mt-1.5 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-[#7a7a76]" />
                    {lead.daysSinceContact} jour{lead.daysSinceContact !== 1 ? 's' : ''} sans contact · {lead.nba_reason}
                  </p>
                </div>
                <button
                  onClick={() => handleRescue(lead)}
                  disabled={rescuingIds.has(lead.id)}
                  className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {rescuingIds.has(lead.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Créer une relance
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
