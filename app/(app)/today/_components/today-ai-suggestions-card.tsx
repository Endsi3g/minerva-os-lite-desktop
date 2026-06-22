'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Mail, Phone, Globe, CalendarClock, ArrowRight, Brain } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';
import type { Lead } from '@/lib/mock-data';

interface Suggestion {
  lead: Lead;
  label: string;
  taskTitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Preconfigured action suggestions for warm/cold prospects
function suggestFor(lead: Lead): Suggestion | null {
  if (lead.status === 'Won' || lead.status === 'Lost') return null;
  if (lead.temperature === 'Hot') return null; // hot leads handled elsewhere
  if (!lead.website) {
    return { lead, label: 'Proposer un audit de site web', taskTitle: `Proposer un audit web — ${lead.businessName}`, icon: Globe };
  }
  if (lead.temperature === 'Cold' && lead.contactEmail) {
    return { lead, label: 'Envoyer un email de réactivation', taskTitle: `Email de réactivation — ${lead.businessName}`, icon: Mail };
  }
  if (lead.phone) {
    return { lead, label: 'Appeler pour requalifier', taskTitle: `Appeler — ${lead.businessName}`, icon: Phone };
  }
  return { lead, label: 'Planifier une relance', taskTitle: `Relancer — ${lead.businessName}`, icon: CalendarClock };
}

export function TodayAiSuggestionsCard() {
  const { leads, addTask, addNotification, activeWorkspace } = useReach();
  const router = useRouter();

  const [autoInsights, setAutoInsights] = useState(false);
  const [autoFollowUps, setAutoFollowUps] = useState(false);
  const [report, setReport] = useState<string>('');
  const [reportLoading, setReportLoading] = useState(false);

  // Read the behavioral-intelligence toggles
  useEffect(() => {
    const run = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('settings')
          .select('auto_insights, auto_follow_ups')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) {
          setAutoInsights(data.auto_insights ?? false);
          setAutoFollowUps(data.auto_follow_ups ?? false);
        }
      } catch { /* ignore */ }
    };
    run();
  }, []);

  const generateInsights = useCallback(async () => {
    if (!activeWorkspace) return;
    setReportLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/insights/weekly'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: activeWorkspace.id }),
      });
      const data = await res.json();
      if (res.ok && data.report) setReport(data.report);
    } catch { /* ignore */ }
    finally { setReportLoading(false); }
  }, [activeWorkspace]);

  // Auto-run weekly insights on weekends, once per ISO week
  useEffect(() => {
    if (!autoInsights || !activeWorkspace) return;
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    if (!isWeekend) return;
    const weekKey = `minerva_weekly_insight_${activeWorkspace.id}_${now.getFullYear()}-${Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000)}`;
    if (localStorage.getItem(weekKey)) return;
    localStorage.setItem(weekKey, '1');
    generateInsights();
  }, [autoInsights, activeWorkspace, generateInsights]);

  const suggestions = useMemo(() => {
    if (!autoFollowUps) return [];
    return leads
      .map(suggestFor)
      .filter((s): s is Suggestion => s !== null)
      .slice(0, 5);
  }, [leads, autoFollowUps]);

  // Notify the user once per day when follow-up suggestions are available
  useEffect(() => {
    if (!autoFollowUps || !activeWorkspace || suggestions.length === 0) return;
    const dayKey = `minerva_followup_notif_${activeWorkspace.id}_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(dayKey)) return;
    localStorage.setItem(dayKey, '1');
    addNotification({
      userId: '',
      workspaceId: activeWorkspace.id,
      type: 'report',
      title: 'Relances suggérées par l\'IA',
      body: `${suggestions.length} prospect${suggestions.length > 1 ? 's' : ''} tiède/froid à relancer aujourd'hui.`,
      link: '/today',
    });
  }, [autoFollowUps, activeWorkspace, suggestions, addNotification]);

  // Nothing enabled → render nothing
  if (!autoInsights && !autoFollowUps) return null;

  const handleAct = (s: Suggestion) => {
    const today = new Date().toISOString().slice(0, 10);
    addTask(s.taskTitle, 'Follow-up', today);
    toast.success('Tâche de relance créée');
  };

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#059669]/10 text-[#059669]">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">Intelligence comportementale</CardTitle>
            <CardDescription className="text-xs">Suggestions et bilans générés par l&apos;IA</CardDescription>
          </div>
        </div>
        {autoInsights && (
          <button
            onClick={generateInsights}
            disabled={reportLoading}
            className="flex items-center gap-1.5 text-[11px] font-bold text-[#059669] hover:underline disabled:opacity-50"
          >
            {reportLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Bilan
          </button>
        )}
      </CardHeader>

      <CardContent className="px-6 pb-6 space-y-4">
        {/* Weekly insight report */}
        {autoInsights && report && (
          <div className="rounded-lg border border-[#e5e5e0] bg-[#fafaf8] p-3 text-xs text-[#26251e] leading-relaxed whitespace-pre-line">
            {report}
          </div>
        )}
        {autoInsights && !report && !reportLoading && (
          <p className="text-[11px] text-[#7a7a76]">
            Le bilan hebdomadaire se génère automatiquement le week-end. Cliquez sur « Bilan » pour le lancer maintenant.
          </p>
        )}

        {/* Action suggestions for warm/cold leads */}
        {autoFollowUps && (
          suggestions.length === 0 ? (
            <p className="text-[11px] text-[#7a7a76]">Aucune relance suggérée pour le moment.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Relances suggérées</p>
              {suggestions.map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.lead.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-[#e5e5e0] hover:bg-[#fafaf8] transition-colors">
                    <div className="h-7 w-7 rounded-lg bg-[#f4f4f3] flex items-center justify-center shrink-0 text-[#7a7a76]">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#26251e] truncate">{s.lead.businessName}</p>
                      <p className="text-[10px] text-[#7a7a76]">{s.label}</p>
                    </div>
                    <button
                      onClick={() => handleAct(s)}
                      className="text-[10px] font-bold text-[#059669] hover:underline shrink-0"
                    >
                      Créer
                    </button>
                    <button
                      onClick={() => router.push(`/leads/${s.lead.id}`)}
                      className="h-6 w-6 flex items-center justify-center rounded-md text-[#7a7a76] hover:bg-[#f4f4f3] shrink-0"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

export default TodayAiSuggestionsCard;
