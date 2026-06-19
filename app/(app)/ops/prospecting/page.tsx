"use client";

import React, { useState, useEffect } from "react";
import { useReach } from "@/lib/reach-context";
import { Activity, Target, Zap, Bot, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function OpsProspectingDashboard() {
  const { activeWorkspace, leads, campaigns } = useReach();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    contactedLeads: 0,
    hotLeads: 0,
    meetingsBooked: 0,
    automationsTriggered: 0
  });

  useEffect(() => {
    if (!activeWorkspace) return;
    
    // Compute simple metrics from local context
    const contacted = leads.filter(l => ['Contacted', 'Meeting Booked', 'Won'].includes(l.status)).length;
    const hot = leads.filter(l => l.temperature === 'Hot' || (l.intentScore && l.intentScore > 75)).length;
    const meetings = leads.filter(l => l.status === 'Meeting Booked').length;

    // Load automation logs
    const loadLogs = async () => {
      const electronObj = typeof window !== 'undefined' && (window as any).electron;
      let triggersCount = 0;
      if (electronObj) {
        try {
          const row = await electronObj.dbGet(`SELECT COUNT(*) as cnt FROM automation_logs WHERE workspace_id = ?`, [activeWorkspace.id]);
          triggersCount = row?.cnt || 0;
        } catch (e) {}
      } else {
        const supabase = createClient();
        const { count } = await supabase.from('automation_logs').select('*', { count: 'exact', head: true }).eq('workspace_id', activeWorkspace.id);
        triggersCount = count || 0;
      }
      
      setMetrics({
        totalLeads: leads.length,
        contactedLeads: contacted,
        hotLeads: hot,
        meetingsBooked: meetings,
        automationsTriggered: triggersCount
      });
      setLoading(false);
    };

    loadLogs();
  }, [activeWorkspace, leads]);

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf9] text-[#26251e] font-sans">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-600" />
              Cockpit Ops
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Surveillance et pilotage de l'écosystème de prospection autonome.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Agent Actif
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Leads Totaux</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black">{metrics.totalLeads}</span>
              <span className="text-xs text-emerald-600 font-semibold flex items-center"><ArrowUpRight className="w-3 h-3" /> 12%</span>
            </div>
          </div>
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Taux de Contact</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black">{metrics.totalLeads > 0 ? Math.round((metrics.contactedLeads / metrics.totalLeads) * 100) : 0}%</span>
            </div>
          </div>
          <div className="bg-white border rounded-xl p-4 shadow-sm border-rose-200 bg-rose-50/30">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Leads Chauds (Intent)</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-700">{metrics.hotLeads}</span>
            </div>
          </div>
          <div className="bg-white border rounded-xl p-4 shadow-sm border-emerald-200 bg-emerald-50/30">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Automations Jouées</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-700">{metrics.automationsTriggered}</span>
              <Zap className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Live Feed & Agent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="p-4 border-b flex items-center gap-2 bg-slate-50">
              <Bot className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-800">Flux de Décision (Agent Interne)</h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-slate-900 font-mono text-[11px] text-slate-300">
              <div className="flex gap-3 text-emerald-400">
                <span className="shrink-0">[10:04:12]</span>
                <span>Analyse de la boîte de réception... 0 nouveaux messages.</span>
              </div>
              <div className="flex gap-3 text-emerald-400">
                <span className="shrink-0">[10:04:13]</span>
                <span>Évaluation des automations pour le workspace {activeWorkspace?.id.slice(0,6)}...</span>
              </div>
              <div className="flex gap-3 text-amber-400">
                <span className="shrink-0">[10:05:01]</span>
                <span>Condition "Relance si pas de réponse" validée pour Lead-2. Création de la tâche.</span>
              </div>
              <div className="flex gap-3 text-sky-400">
                <span className="shrink-0">[10:05:02]</span>
                <span>Lead-5 intent score a dépassé 80. Déclenchement de l'alerte.</span>
              </div>
              <div className="flex gap-3 text-slate-500">
                <span className="shrink-0">[10:05:03]</span>
                <span>Mise en veille jusqu'à la prochaine vérification (interval: 5m)...</span>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-4 flex flex-col h-[400px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Prochaines Actions Recommandées</h3>
            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="p-3 border rounded-lg bg-amber-50 border-amber-200">
                <p className="text-[10px] font-bold text-amber-800 mb-1">Priorité Haute</p>
                <p className="text-xs font-medium">Appeler "Boulangerie L'Épi d'Or" - Intent à 95%</p>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" className="h-6 text-[10px] bg-amber-600 hover:bg-amber-700 text-white">Traiter</Button>
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-[10px] font-bold text-muted-foreground mb-1">Routine</p>
                <p className="text-xs font-medium">Lancer la campagne "Garages Avril"</p>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="outline" className="h-6 text-[10px]">Voir</Button>
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-[10px] font-bold text-muted-foreground mb-1">Routine</p>
                <p className="text-xs font-medium">Valider 3 nouveaux brouillons d'emails</p>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="outline" className="h-6 text-[10px]">Voir</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
