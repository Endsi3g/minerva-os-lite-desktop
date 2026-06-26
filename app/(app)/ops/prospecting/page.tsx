"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReach } from "@/lib/reach-context";
import { Activity, Target, Zap, Bot, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  TerminalAnimationRoot,
  TerminalAnimationWindow,
  TerminalAnimationContent,
  TerminalAnimationCommandBar,
  TerminalAnimationOutput,
  TerminalAnimationTabList,
  TerminalAnimationTabTrigger,
} from "@/components/ui/terminal-animation";

const terminalTabs = [
  {
    label: "inbox",
    command: "minerva inbox --check",
    lines: [
      { text: "  Checking Gmail inbox for active threads...", color: "text-[#b39aff]", delay: 300 },
      { text: "  Found 0 new unread messages.", color: "text-slate-400", delay: 200 },
      { text: "  Evaluating reply intent scores for recent threads...", color: "text-slate-500", delay: 300 },
      { text: "  All inbox processing complete. Waiting for next cron cycle.", color: "text-[#22ff73]", delay: 200 },
    ],
  },
  {
    label: "automation",
    command: "minerva autocrons --run",
    lines: [
      { text: "  Running active automation rules for workspace...", color: "text-[#b39aff]", delay: 400 },
      { text: "  Checking rule: 'Follow-up if no reply' for lead queue...", color: "text-slate-400", delay: 200 },
      { text: "  ✓ Rule matched for lead: 'Boulangerie L'Épi d'Or'", color: "text-[#22ff73]", delay: 300 },
      { text: "  Action: Created follow-up task and generated draft email.", color: "text-amber-400", delay: 250 },
      { text: "  All autocrons rules executed successfully.", color: "text-slate-500", delay: 200 },
    ],
  },
  {
    label: "leads",
    command: "minerva leads --enrich",
    lines: [
      { text: "  Scanning database for leads needing enrichment...", color: "text-[#b39aff]", delay: 300 },
      { text: "  Lead: 'Garage St-Laurent' -- enrichment in progress...", color: "text-slate-400", delay: 400 },
      { text: "  ✓ Google Places rating: 4.2★ (12 reviews)", color: "text-[#22ff73]", delay: 200 },
      { text: "  ✓ Calculated quality score: 85/100", color: "text-[#32f3e9]", delay: 150 },
      { text: "  ✓ Calculated opportunity score: 75/100", color: "text-[#32f3e9]", delay: 150 },
      { text: "  Database records successfully updated.", color: "text-slate-500", delay: 200 },
    ],
  },
];

export default function OpsProspectingDashboard() {
  const router = useRouter();
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
      <div className="w-full p-3 sm:p-4 md:p-6 pb-24 space-y-6">
        
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
            <div className="p-4 border-b flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-800">Flux de Décision (Agent Interne)</h3>
              </div>
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live</span>
              </div>
            </div>

            <TerminalAnimationRoot tabs={terminalTabs} defaultActiveTab={0} className="flex-1 flex flex-col overflow-hidden">
              <TerminalAnimationWindow className="flex-1 min-h-0 bg-slate-950 border-0 rounded-none text-slate-300" animateOnVisible={false}>
                <TerminalAnimationContent className="font-mono text-[11px] leading-relaxed p-4 h-full overflow-y-auto">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-2">
                    <span>$</span>
                    <TerminalAnimationCommandBar className="font-mono" />
                  </div>
                  <TerminalAnimationOutput className="space-y-1" />
                </TerminalAnimationContent>
              </TerminalAnimationWindow>
              <TerminalAnimationTabList className="flex border-t border-[#e6e5e0] bg-slate-50 h-9 shrink-0">
                {terminalTabs.map((tab, index) => (
                  <TerminalAnimationTabTrigger key={tab.label} index={index}>
                    {tab.label}
                  </TerminalAnimationTabTrigger>
                ))}
              </TerminalAnimationTabList>
            </TerminalAnimationRoot>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-4 flex flex-col h-[400px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Prochaines Actions Recommandées</h3>
            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="p-3 border rounded-lg bg-amber-50 border-amber-200">
                <p className="text-[10px] font-bold text-amber-800 mb-1">Priorité Haute</p>
                <p className="text-xs font-medium">Appeler "Boulangerie L'Épi d'Or" - Intent à 95%</p>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" className="h-6 text-[10px] bg-amber-600 hover:bg-amber-700 text-white cursor-pointer" onClick={() => router.push('/prospecting')}>Traiter</Button>
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-[10px] font-bold text-muted-foreground mb-1">Routine</p>
                <p className="text-xs font-medium">Lancer la campagne "Garages Avril"</p>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="outline" className="h-6 text-[10px] cursor-pointer" onClick={() => router.push('/campaigns')}>Voir</Button>
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-[10px] font-bold text-muted-foreground mb-1">Routine</p>
                <p className="text-xs font-medium">Valider 3 nouveaux brouillons d'emails</p>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="outline" className="h-6 text-[10px] cursor-pointer" onClick={() => router.push('/sequences')}>Voir</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

