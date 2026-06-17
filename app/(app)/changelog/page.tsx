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
      version: 'v2.15.0',
      date: '2026-06-16',
      titleKey: 'changelog.v2_15_0_title',
      descKey: 'changelog.v2_15_0_desc',
      highlights: [
        'New /assistant page: full AI assistant chat with stats dashboard (active leads, pending tasks, projects, weekly leads).',
        'Animated TreeMascot SVG component — idle / thinking / writing / searching states — integrated in /chat and /assistant.',
        'Analytics dashboard now aggregates real lead and task data instead of seeded random mock values.',
        'Contact support form at /help with a dedicated /api/support/contact SMTP route (nodemailer, graceful no-SMTP fallback).'
      ]
    },
    {
      version: 'v2.14.0',
      date: '2026-06-16',
      titleKey: 'changelog.v2_14_0_title',
      descKey: 'changelog.v2_14_0_desc',
      highlights: [
        'Integrations detail panel: intermediate view with description and "How to use" steps before opening the full editor.',
        'JSON manifest import for custom integrations — validates name, description, authType, endpoints.',
        'Agent store detail pages (/agents/[id]) with star ratings, written reviews, and creator info.',
        'Creator profile pages (/agents/creator/[userId]) showing bio, role, company, and published agents.'
      ]
    },
    {
      version: 'v2.13.0',
      date: '2026-06-16',
      titleKey: 'changelog.v2_13_0_title',
      descKey: 'changelog.v2_13_0_desc',
      highlights: [
        'Unified today agenda card merging tasks due today and leads with nextActionDate = today (done/snooze actions).',
        'Projects card on the Today dashboard showing active projects with direct links.',
        'Apify Google Maps Scraper added as a fourth prospecting source with min-rating and "exclude existing CRM leads" filters.',
        'Agent auto-launch via ?launch=id URL param — navigates directly into the agent workspace.'
      ]
    },
    {
      version: 'v2.12.3',
      date: '2026-06-16',
      titleKey: 'changelog.v2_12_3_title',
      descKey: 'changelog.v2_12_3_desc',
      highlights: [
        'Sidebar project items are now clickable links routing to /projects/[id].',
        'Dedicated project detail page listing associated library files and chat threads.'
      ]
    },
    {
      version: 'v2.12.2',
      date: '2026-06-16',
      titleKey: 'changelog.v2_12_2_title',
      descKey: 'changelog.v2_12_2_desc',
      highlights: [
        'Real-time team chat powered by Supabase Realtime — messages delivered instantly across sessions.',
        'New messaging tab in /team with per-workspace message history and dual-store SQLite/Supabase persistence.'
      ]
    },
    {
      version: 'v2.12.1',
      date: '2026-06-16',
      titleKey: 'changelog.v2_12_1_title',
      descKey: 'changelog.v2_12_1_desc',
      highlights: [
        'Fully functional notification system with a bell icon in the topbar and unread count badge.',
        'Vercel Cron routes for overdue task/lead reminders, daily digest, and weekly performance report.',
        'Notifications delivered in real time via Supabase Realtime subscription filtered by user and workspace.'
      ]
    },
    {
      version: 'v2.12.0',
      date: '2026-06-16',
      titleKey: 'changelog.v2_12_0_title',
      descKey: 'changelog.v2_12_0_desc',
      highlights: [
        'System dark theme enabled (enableSystem: true) and full dark-mode token sweep across all pages.',
        'Complete i18n coverage for /integrations and /agents — all visible strings use t() keys in fr/en/de.',
        'User avatar (base64 upload) and bio field in profile settings, stored in SQLite and Supabase.',
        'Leads enriched with website, Google Maps rating, review count, photos, social links, and team member assignment.',
        'Dedicated /leads/new creation page replacing the previous modal sheet.',
        'New /services page: CRUD catalog of offered services/audits, linked from the lead detail view.'
      ]
    },
    {
      version: 'v2.11.1',
      date: '2026-06-16',
      titleKey: 'changelog.v2_11_1_title',
      descKey: 'changelog.v2_11_1_desc',
      highlights: [
        'Fixed all 8 remaining TS7006 implicit-any TypeScript errors flagged after the v2.11.0 audit.',
        'pnpm typecheck now passes with 0 errors.'
      ]
    },
    {
      version: 'v2.11.0',
      date: '2026-06-16',
      titleKey: 'changelog.v2_11_0_title',
      descKey: 'changelog.v2_11_0_desc',
      highlights: [
        'AI provider keys (OpenRouter, Groq, Together.ai) are now masked end-to-end — never returned in clear text to the browser or cached in localStorage.',
        'Hardened /api/team/members and /api/team/invite with explicit workspace-membership checks before returning or mutating data.',
        'New dedicated pages: /integrations/import (catalog + JSON import) and /help/guides/[slug] (six real step-by-step guides).',
        'Removed every dead link, inert menu, and placeholder alert across /team, /welcome, /integrations and /billing.',
        'Consolidated duplicated lead-temperature badge logic into lib/lead-badges.ts and removed an unused mock export.'
      ]
    },
    {
      version: 'v2.10.0',
      date: '2026-06-16',
      titleKey: 'changelog.v2_10_0_title',
      descKey: 'changelog.v2_10_0_desc',
      highlights: [
        'Interactive Quebec map for geolocated prospecting.',
        'Custom AI agents marketplace.',
        'TipTap-based rich text editor for the library.'
      ]
    },
    {
      version: 'v2.9.1',
      date: '2026-06-15',
      titleKey: 'changelog.v2_9_1_title',
      descKey: 'changelog.v2_9_1_desc',
      highlights: [
        'New profile step in the onboarding flow.',
        'Dynamically generated user avatar.',
        'AI-generated email signature.'
      ]
    },
    {
      version: 'v2.9.0',
      date: '2026-06-15',
      titleKey: 'changelog.v2_9_0_title',
      descKey: 'changelog.v2_9_0_desc',
      highlights: [
        'Persisted lead scoring.',
        'Generic SMTP configuration beyond Gmail.',
        'New prospecting dashboard.',
        'Groq and Together.ai provider support.',
        'New /billing and /help pages.'
      ]
    },
    {
      version: 'v2.8.0',
      date: '2026-06-15',
      titleKey: 'changelog.v2_8_0_title',
      descKey: 'changelog.v2_8_0_desc',
      highlights: [
        'Upgraded to Electron 43 with macOS 26 Tahoe support.'
      ]
    },
    {
      version: 'v2.7.0',
      date: '2026-06-15',
      titleKey: 'changelog.v2_7_0_title',
      descKey: 'changelog.v2_7_0_desc',
      highlights: [
        'Real-time presence and anti-collision handling for shared data.',
        'JIT-less main-process restart mechanism fixing a recurring macOS Sequoia crash.'
      ]
    },
    {
      version: 'v2.5.x',
      date: '2026-06-14',
      titleKey: 'changelog.v2_5_x_title',
      descKey: 'changelog.v2_5_x_desc',
      highlights: [
        'Replaced orange with green across the whole UI; Welcome is now the home screen, Today remains in the sidebar.',
        'Disabled concurrent V8 JIT (--jitless) to eliminate a recurring EXC_BREAKPOINT crash on macOS 26.',
        'Disabled Chromium background networking to mitigate a DCHECK crash.',
        'Auto-recovery from renderer crashes during navigation; removed an OOM-causing heap cap.'
      ]
    },
    {
      version: 'v2.4.0',
      date: '2026-06-14',
      titleKey: 'changelog.v2_4_0_title',
      descKey: 'changelog.v2_4_0_desc',
      highlights: [
        'Landing page extracted to the root route.',
        'Fixed onboarding flow and startup theme flash.'
      ]
    },
    {
      version: 'v2.3.0',
      date: '2026-06-14',
      titleKey: 'changelog.v2_3_0_title',
      descKey: 'changelog.v2_3_0_desc',
      highlights: [
        'New system tray popover widget with glassmorphism design.',
        'On-demand scraping trigger and SQLite task check from the tray.'
      ]
    },
    {
      version: 'v2.1.0',
      date: '2026-06-13',
      titleKey: 'changelog.v2_1_0_title',
      descKey: 'changelog.v2_1_0_desc',
      highlights: [
        'Capacitor native-bridge for iOS/Android.',
        'Android platform configuration and Fastlane CI/CD workflows.'
      ]
    },
    {
      version: 'v2.0.0',
      date: '2026-06-13',
      titleKey: 'changelog.v2_0_0_title',
      descKey: 'changelog.v2_0_0_desc',
      highlights: [
        'Electron system tray icon and window close-to-tray behavior.',
        'Native application menu shortcuts and auto-updater.'
      ]
    },
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
