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
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2.5 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
            <CalendarCheck2 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">Agenda du jour</CardTitle>
            <CardDescription className="text-xs">Rien à faire aujourd'hui — bonne journée !</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
            <CalendarCheck2 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">Agenda du jour</CardTitle>
            <CardDescription className="text-xs">
              {totalItems} élément{totalItems > 1 ? 's' : ''} à traiter aujourd'hui
            </CardDescription>
          </div>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
          {dueTasks.length}t · {dueLeads.length}l
        </span>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {/* Tasks due today */}
        {dueTasks.map(task => (
          <div
            key={task.id}
            className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-card/60 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
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
                'shrink-0 text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5',
                task.category === 'Follow-up' && 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
                task.category === 'Preparation' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
                task.category === 'Meeting' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800',
                task.category === 'General' && 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800',
              )}
            >
              {task.category === 'Follow-up' ? 'Relance' : task.category === 'Preparation' ? 'Prép.' : task.category === 'Meeting' ? 'RDV' : 'Général'}
            </Badge>
          </div>
        ))}

        {/* Divider between tasks and leads */}
        {dueTasks.length > 0 && dueLeads.length > 0 && (
          <div className="flex items-center gap-2 my-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Relances</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}

        {/* Leads due today */}
        {dueLeads.map(lead => (
          <div
            key={lead.id}
            className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-card/60 hover:bg-muted/30 transition-colors group"
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
                    className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={() => handleLeadDone(lead.id, lead.nextAction, lead.status)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Fait — relance dans 7 jours</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    onClick={() => handleLeadSnooze(lead.id)}
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Reporter de 3 jours</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <Link href={`/leads/${lead.id}`}>
                      <ArrowRight className="h-3.5 w-3.5" />
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
