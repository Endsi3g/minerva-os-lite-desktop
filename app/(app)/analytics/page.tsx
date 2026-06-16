'use client';

import React, { useState } from 'react';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { ProspectionDashboard } from '@/components/prospection-dashboard';
import { cn } from '@/lib/utils';

type Tab = 'equipe' | 'prospection';

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('prospection');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'prospection', label: 'Prospection' },
    { id: 'equipe', label: 'Activité équipe' },
  ];

  return (
    <div className="h-full overflow-y-auto min-h-0 scrollbar-thin">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border/60 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-1.5 rounded-md text-xs font-bold transition-all',
                tab === t.id
                  ? 'bg-background text-foreground shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'prospection' && <ProspectionDashboard />}
        {tab === 'equipe' && <AnalyticsDashboard />}
      </div>
    </div>
  );
}
