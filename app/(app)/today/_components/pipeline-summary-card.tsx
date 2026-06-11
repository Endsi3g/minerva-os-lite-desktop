'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useReach } from '@/lib/reach-context';
import { LayoutDashboard, Users, CalendarCheck2, Trophy, BarChart3 } from 'lucide-react';

export function PipelineSummaryCard() {
  const { leads } = useReach();

  // Compute metrics
  const newLeadsCount = leads.filter(l => l.status === 'New').length;
  const contactedCount = leads.filter(l => l.status === 'Contacted').length;
  const meetingCount = leads.filter(l => l.status === 'Meeting Booked').length;
  const wonCount = leads.filter(l => l.status === 'Won').length;

  const metrics = [
    { name: 'Nouveaux leads', value: newLeadsCount, icon: Users, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
    { name: 'Prospects contactés', value: contactedCount, icon: BarChart3, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' },
    { name: 'RDV fixés', value: meetingCount, icon: CalendarCheck2, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20' },
    { name: 'Contrats signés', value: wonCount, icon: Trophy, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
  ];

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">Résumé Pipeline</CardTitle>
            <CardDescription className="text-xs">Indicateurs clés de performance commerciale.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric, idx) => (
            <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-lg border border-border/80 bg-secondary/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                  {metric.name}
                </span>
                <div className={`flex h-5 w-5 items-center justify-center rounded ${metric.color}`}>
                  <metric.icon className="h-3 w-3" />
                </div>
              </div>
              <span className="text-xl font-bold font-sans tracking-tight text-foreground mt-0.5">
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
export default PipelineSummaryCard;
