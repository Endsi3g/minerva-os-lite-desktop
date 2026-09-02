'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarCheck2, Check, Clock, ArrowRight } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';

export function TodayAgendaCard() {
  const { tasks, leads, toggleTask, updateLead, addNoteToLead } = useReach();

  const today = new Date().toISOString().split('T')[0];

  const dueTasks = tasks.filter(t => !t.completed && t.dueDate === today);
  const dueLeads = leads.filter(l => l.nextActionDate === today && l.status !== 'Won' && l.status !== 'Lost');

  const totalItems = dueTasks.length + dueLeads.length;

  const handleLeadDone = (leadId: string, nextAction: string, currentStatus: string) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7);
    addNoteToLead(leadId, `Relance effectuée : "${nextAction}"`, 'general');
    updateLead(leadId, {
      nextAction: 'Relance programmée suite au dernier contact',
      nextActionDate: nextDate.toISOString().split('T')[0],
      status: currentStatus === 'New' ? 'Contacted' : (currentStatus as any),
    });
  };

  const handleLeadSnooze = (leadId: string) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 3);
    updateLead(leadId, { nextActionDate: nextDate.toISOString().split('T')[0] });
  };

  if (totalItems === 0) {
    return (
      <Card className="border border-border bg-card shadow-none">
        <CardHeader className="flex flex-row items-center gap-2.5 p-3 sm:p-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CalendarCheck2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold font-sans text-foreground">Agenda du jour</CardTitle>
            <CardDescription className="text-xs text-muted-foreground truncate">Rien à faire aujourd'hui — journée libre !</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card shadow-none">
      <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CalendarCheck2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold font-sans text-foreground">Agenda du jour</CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground truncate">
              {totalItems} élément{totalItems > 1 ? 's' : ''} à traiter
            </CardDescription>
          </div>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 border border-border px-2 py-0.5 rounded-full shrink-0">
          {dueTasks.length}t · {dueLeads.length}l
        </span>
      </CardHeader>

      <CardContent className="p-3 flex flex-col gap-1.5">
        {/* Tasks due today */}
        {dueTasks.map(task => (
          <div
            key={task.id}
            className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Checkbox
                id={`agenda-task-${task.id}`}
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
                className="shrink-0"
              />
              <label
                htmlFor={`agenda-task-${task.id}`}
                className="text-xs font-medium text-foreground cursor-pointer truncate select-none"
              >
                {task.title}
              </label>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'shrink-0 text-[8.5px] font-semibold tracking-wider uppercase px-1.5 py-0.2 rounded-md',
                task.category === 'Follow-up' && 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
                task.category === 'Preparation' && 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
                task.category === 'Meeting' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
                task.category === 'General' && 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
              )}
            >
              {task.category === 'Follow-up' ? 'Relance' : task.category === 'Preparation' ? 'Prép.' : task.category === 'Meeting' ? 'RDV' : 'Général'}
            </Badge>
          </div>
        ))}

        {/* Divider between tasks and leads */}
        {dueTasks.length > 0 && dueLeads.length > 0 && (
          <div className="flex items-center gap-2 my-0.5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[8.5px] text-muted-foreground uppercase tracking-wider font-bold">Relances leads</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}

        {/* Leads due today */}
        {dueLeads.map(lead => (
          <div
            key={lead.id}
            className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors group"
          >
            <Link href={`/leads/${lead.id}`} className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground truncate">{lead.businessName}</span>
              <span className="text-[10px] text-muted-foreground truncate">{lead.nextAction}</span>
            </Link>
            <div className="flex items-center gap-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                    onClick={() => handleLeadDone(lead.id, lead.nextAction, lead.status)}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Fait — relance dans 7 jours</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                    onClick={() => handleLeadSnooze(lead.id)}
                  >
                    <Clock className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Reporter de 3 jours</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                    asChild
                  >
                    <Link href={`/leads/${lead.id}`}>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Voir le lead</p></TooltipContent>
              </Tooltip>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default TodayAgendaCard;
