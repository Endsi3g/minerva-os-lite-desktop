'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, Mail, CheckCircle2 } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';

export function TodayStatsCard() {
  const { leads, tasks, user } = useReach();

  const [todoistConnected, setTodoistConnected] = useState(false);
  const [todoistTaskCount, setTodoistTaskCount] = useState({ completed: 0, total: 0 });
  const [seqStats, setSeqStats] = useState({ sent: 0, total: 0 });

  // Funnel calculations based on real leads
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'New').length;
  const contactedLeads = leads.filter(l => l.status === 'Contacted').length;
  const qualifiedLeads = leads.filter(l => ['Meeting Booked', 'Won'].includes(l.status)).length;
  
  const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  // Local task completion
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const supabase = createClient();
        const electronObj = typeof window !== 'undefined' && (window as any).electron;
        if (electronObj) {
          const dbSettings = await electronObj.dbGet(
            "SELECT todoist_token, todoist_project_id FROM settings WHERE user_id = ? LIMIT 1",
            [user.id]
          );
          if (dbSettings?.todoist_token) {
            setTodoistConnected(true);
            const url = dbSettings.todoist_project_id
              ? `https://api.todoist.com/rest/v2/tasks?project_id=${dbSettings.todoist_project_id}`
              : 'https://api.todoist.com/rest/v2/tasks';
            const res = await fetch(url, { headers: { Authorization: `Bearer ${dbSettings.todoist_token}` } });
            if (res.ok) {
              const active = await res.json();
              setTodoistTaskCount({ completed: 0, total: active.length });
            }
          }
        } else {
          // Web: check Todoist token from Supabase settings
          const { data: settings } = await supabase.from('settings').select('todoist_token, todoist_project_id').eq('user_id', user.id).single();
          if ((settings as any)?.todoist_token) setTodoistConnected(true);
        }

        // Real email sequence stats
        const { data: steps } = await supabase
          .from('email_sequence_steps')
          .select('status, sequence_id, email_sequences!inner(user_id)')
          .eq('email_sequences.user_id', user.id);

        if (steps) {
          setSeqStats({ sent: steps.filter((s: any) => s.status === 'sent').length, total: steps.length });
        }
      } catch (err) {
        console.error("Stats widget error:", err);
      }
    };
    fetchStats();
  }, [tasks, user]);

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">Statistiques du jour</CardTitle>
            <CardDescription className="text-xs">Performance globale et statut d'intégration</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Funnel Widget */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between text-xs font-semibold text-[#26251e]">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span>Conversion du Tunnel</span>
            </span>
            <span className="font-mono text-primary font-bold">{conversionRate}%</span>
          </div>
          <div className="w-full bg-[#f4f4f3] h-2 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${totalLeads > 0 ? (newLeads / totalLeads) * 100 : 0}%` }} 
              className="bg-neutral-300 h-full" 
              title={`Nouveaux: ${newLeads}`}
            />
            <div 
              style={{ width: `${totalLeads > 0 ? (contactedLeads / totalLeads) * 100 : 0}%` }} 
              className="bg-[#9fc9a2] h-full" 
              title={`Contactés: ${contactedLeads}`}
            />
            <div 
              style={{ width: `${totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0}%` }} 
              className="bg-primary h-full" 
              title={`Qualifiés/Gagnés: ${qualifiedLeads}`}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
            <span>Nouveaux ({newLeads})</span>
            <span>Contactés ({contactedLeads})</span>
            <span>Qualifiés ({qualifiedLeads})</span>
          </div>
        </div>

        {/* Todoist Status */}
        <div className="border-t border-[#e5e5e0]/60 pt-3 text-left space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#26251e]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#de4c3a]" />
              <span>Intégration Todoist</span>
            </span>
            <span className="text-[10px] font-bold text-[#555552]">
              {todoistConnected ? (
                <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connecté
                </span>
              ) : (
                <span className="text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">Inactif</span>
              )}
            </span>
          </div>
          
          {todoistConnected ? (
            <p className="text-[10px] text-muted-foreground leading-normal">
              {todoistTaskCount.total > 0 
                ? `Il reste ${todoistTaskCount.total} tâches à accomplir aujourd'hui dans votre projet Todoist.` 
                : 'Toutes les tâches Todoist de votre projet cible ont été complétées !'}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground leading-normal">
              Connectez Todoist dans l'onglet Intégrations pour importer automatiquement vos tâches et planifications du jour.
            </p>
          )}
        </div>

        {/* Email Sequences Stats */}
        <div className="border-t border-[#e5e5e0]/60 pt-3 text-left space-y-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[#26251e]">
            <Mail className="w-3.5 h-3.5 text-primary" />
            <span>Séquences email</span>
          </span>
          {seqStats.total === 0 ? (
            <p className="text-[10px] text-muted-foreground leading-normal">
              Aucune séquence active. Créez votre première depuis <a href="/sequences" className="underline text-primary">Séquences email</a>.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#fafaf8] border border-[#e5e5e0] rounded-xl p-2.5 flex flex-col justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">Emails envoyés</span>
                <span className="text-lg font-bold text-[#26251e] tracking-tight font-sans mt-1">{seqStats.sent}</span>
                <div className="w-full bg-neutral-200 h-1 rounded-full overflow-hidden mt-1.5">
                  <div style={{ width: `${seqStats.total > 0 ? (seqStats.sent / seqStats.total) * 100 : 0}%` }} className="bg-primary h-full rounded-full" />
                </div>
              </div>
              <div className="bg-[#fafaf8] border border-[#e5e5e0] rounded-xl p-2.5 flex flex-col justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">En attente</span>
                <span className="text-lg font-bold text-[#26251e] tracking-tight font-sans mt-1">{seqStats.total - seqStats.sent}</span>
                <div className="w-full bg-neutral-200 h-1 rounded-full overflow-hidden mt-1.5">
                  <div style={{ width: `${seqStats.total > 0 ? ((seqStats.total - seqStats.sent) / seqStats.total) * 100 : 0}%` }} className="bg-amber-400 h-full rounded-full" />
                </div>
              </div>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
