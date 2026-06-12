'use client';

import React from 'react';
import { Megaphone, Calendar, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { TranslationKey } from '@/lib/translations';

interface ChangelogVersion {
  version: string;
  date: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  highlights: string[];
}

export default function ChangelogPage() {
  const { t } = useLanguage();

  const versions: ChangelogVersion[] = [
    {
      version: 'v1.4.0',
      date: '2026-06-12',
      titleKey: 'changelog.v1_4_0_title',
      descKey: 'changelog.v1_4_0_desc',
      highlights: [
        'Announcements & Version Timeline page (/changelog) integrated in the sidebar footer.',
        'Lucide Megaphone action button with dynamic pathname focus state.',
        'Fully localized product updates catalog in French, English, and German.'
      ]
    },
    {
      version: 'v1.3.0',
      date: '2026-06-12',
      titleKey: 'changelog.v1_3_0_title',
      descKey: 'changelog.v1_3_0_desc',
      highlights: [
        'Rebuilt the Members list table to match the premium Langdock layout exactly.',
        'Added real plan text column and usage_count integer column to Supabase database schema.',
        'Interactive inline selectors to toggle user roles (Admin, Editor, Viewer) and plans (Business, Pro, Free).',
        'Search bar filter, filter icon triggers, and CSV data spreadsheet exporter.',
        'Circular envelope avatar shapes for pending members and custom Invited badges.',
        'Floating success toast alert notification popups dismissing automatically after invite events.'
      ]
    },
    {
      version: 'v1.2.0',
      date: '2026-06-11',
      titleKey: 'changelog.v1_2_0_title',
      descKey: 'changelog.v1_2_0_desc',
      highlights: [
        'Interactive date range popover calendar widget supporting ranges and single selections.',
        'KPI report metrics cards displaying active users, total agents, total workflows, and groups.',
        'Responsive ApexCharts showing active users logs and stacked column graphs for chat messages vs. agent calls.',
        'One-click download button for analytics datasets in CSV format.'
      ]
    },
    {
      version: 'v1.1.0',
      date: '2026-06-11',
      titleKey: 'changelog.v1_1_0_title',
      descKey: 'changelog.v1_1_0_desc',
      highlights: [
        'Interactive side-by-side Canvas panel to draft, preview, format, and edit rich documents dynamically.',
        'Starting greeting assistant layout displaying suggestion cards and files attachment previews.',
        'Model selection popovers and active tool selectors (Canvas, web search, search tools).'
      ]
    },
    {
      version: 'v1.0.0',
      date: '2026-06-10',
      titleKey: 'changelog.v1_0_0_title',
      descKey: 'changelog.v1_0_0_desc',
      highlights: [
        'Refactored the core application settings (AI section, notifications) to use native Shadcn UI Switch elements.',
        'Language context provider translation maps supporting English, French, and German locales.',
        'Expandable onboarding progress checklist tracking workspace setup completion scores.'
      ]
    }
  ];

  return (
    <div className="h-full overflow-y-auto bg-neutral-50/40 text-neutral-800 font-sans selection:bg-blue-500/10">
      <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">
        
        {/* ── Header ── */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Megaphone className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
              {t('changelog.title')}
            </h1>
            <p className="text-xs text-neutral-500 font-medium">
              {t('changelog.subtitle')}
            </p>
          </div>
        </div>

        {/* ── Timeline Timeline ── */}
        <div className="relative border-l border-neutral-200/80 ml-5 pl-8 space-y-8 py-2">
          {versions.map((ver) => {
            const formattedDate = new Date(ver.date).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div key={ver.version} className="relative group">
                
                {/* Timeline node dot */}
                <div className="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-neutral-300 flex items-center justify-center transition-colors group-hover:border-neutral-900 z-10">
                  <div className="w-2 h-2 rounded-full bg-neutral-300 group-hover:bg-neutral-900 transition-colors" />
                </div>

                {/* Content Card */}
                <div className="bg-white border border-neutral-200/60 rounded-xl p-6 shadow-2xs hover:border-neutral-300 transition-all space-y-4">
                  
                  {/* Card Header metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-neutral-900 text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full select-none tracking-wider">
                        {ver.version}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                        {t('changelog.version')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{t('changelog.released')} {formattedDate}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-1.5 text-left">
                    <h3 className="text-sm font-extrabold text-neutral-950 tracking-tight leading-snug">
                      {t(ver.titleKey, ver.version)}
                    </h3>
                    <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                      {t(ver.descKey)}
                    </p>
                  </div>

                  {/* Highlights Bullet List */}
                  <ul className="space-y-2 pt-1 border-t border-neutral-50">
                    {ver.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-500 font-semibold leading-normal">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
