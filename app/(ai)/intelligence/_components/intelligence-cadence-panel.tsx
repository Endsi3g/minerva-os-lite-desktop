'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CalendarRange, Clock } from 'lucide-react';

export function IntelligenceCadencePanel() {
  // Mock metrics
  const activeRate = 60; // 60%
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (activeRate / 100) * circumference;

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarRange className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Cadence & Distribution</CardTitle>
            <p className="text-[11px] text-muted-foreground">Vue d&apos;ensemble sur le rythme de ton activité commerciale.</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-5">
        {/* Top metrics with circular gauge */}
        <div className="grid grid-cols-2 gap-4">
          {/* Active vs Inactive Circular Gauge */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/15">
            {/* SVG circular progress */}
            <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
              <svg className="h-full w-full -rotate-90">
                {/* Background Track */}
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  className="stroke-muted fill-none"
                  strokeWidth="5"
                />
                {/* Foreground Progress */}
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  className="stroke-primary fill-none transition-all duration-500"
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              {/* Text overlay */}
              <span className="absolute text-xs font-black text-foreground">{activeRate}%</span>
            </div>
            <div className="min-w-0">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Suivis actifs</h4>
              <p className="text-[11px] text-foreground font-semibold mt-0.5 leading-tight">Leads en cours d&apos;action</p>
            </div>
          </div>

          {/* Time to follow up */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/15">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/5 text-primary shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Relance moyenne</h4>
              <p className="text-sm font-black text-foreground mt-0.5">3.5 jours</p>
            </div>
          </div>
        </div>

        {/* Niche distribution stacked bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            <span>Répartition des efforts par Secteur</span>
            <span className="text-primary font-bold">5 leads</span>
          </div>

          {/* Stacked bar segments */}
          <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
            <div className="h-full bg-indigo-500 hover:opacity-95 transition-opacity w-[40%]" title="Boulangerie : 40%" />
            <div className="h-full bg-amber-500 hover:opacity-95 transition-opacity w-[20%]" title="Automobile : 20%" />
            <div className="h-full bg-purple-500 hover:opacity-95 transition-opacity w-[20%]" title="Coiffure : 20%" />
            <div className="h-full bg-blue-500 hover:opacity-95 transition-opacity w-[20%]" title="Restauration : 20%" />
          </div>

          {/* Color key labels */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
              <span className="truncate">Boulangerie (40%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <span className="truncate">Automobile (20%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
              <span className="truncate">Coiffure (20%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              <span className="truncate">Restauration (20%)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default IntelligenceCadencePanel;
