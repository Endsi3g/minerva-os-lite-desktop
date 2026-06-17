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
      version: 'v2.22.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_22_0_title',
      descKey: 'changelog.v2_22_0_desc',
      highlights: [
        'Agents: cliquer sur GPT-4o affiche une modal "Clé API requise" expliquant qu\'une clé OpenRouter est nécessaire, avec bouton "Configurer la clé" → Paramètres et "Sélectionner quand même".',
        'Bibliothèque: insertion d\'images dans l\'éditeur TipTap — bouton dans la toolbar, upload depuis le disque, stocké en base64 dans le document.',
        'Services: bannière d\'erreur visible lorsque l\'insert/update échoue (ex. table manquante) avec message explicatif et référence à DEPLOYMENT.md.',
        'Invitations équipe: quand l\'utilisateur a déjà un compte Supabase, on retrouve son user_id via l\'API admin et le membre est créé avec status "active" immédiatement.',
        'API team/members: corrigé l\'ordre par "created_at" (était "invited_at" qui n\'existe pas, causant des erreurs silencieuses).',
        'DEPLOYMENT.md: ajout du SQL de création de la table "services" dans le script de setup Supabase.',
      ],
    },
    {
      version: 'v2.21.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_21_0_title',
      descKey: 'changelog.v2_21_0_desc',
      highlights: [
        'Critical fix: removed non-existent image_url column from Supabase leads insert — adding leads no longer crashes.',
        'Get Started: all 8 onboarding tasks translated to French with direct navigation to the relevant page on click.',
        'Welcome page: progress bar now updates in real time using useRef + useEffect instead of a callback ref that only fired on mount.',
        'Sidebar Today section: replaced hardcoded mock files with real leads from ReachContext; shows nothing if no leads exist.',
        'Team chat: profile avatars now displayed in message bubbles; @mention autocomplete with member list filter.',
        'Analytics: GitHub-style activity heatmap (8starlabs component) tracking days with at least one lead created or task completed over the last 12 months.',
        'Library editor: "Partager" button opens a share modal with a copyable link; automatically sets is_shared=true on the document.',
        'DESIGN.md: full design system documentation (colors, typography, spacing, component patterns, animation, i18n rules).',
        'DEPLOYMENT.md: step-by-step deployment guide for a 100% free production stack (Supabase + Vercel + Cloudflare).',
        'README: full rewrite reflecting v2.21.0 feature set, architecture, security model, and roadmap.',
      ],
    },
    {
      version: 'v2.20.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_20_0_title',
      descKey: 'changelog.v2_20_0_desc',
      highlights: [
        'Agent creation flow: "Add input field" now opens a full Langdock-style modal with 8 field types (Text, Multi-line, Number, Select, Email, Checkbox, Date, File), optional description, and required toggle.',
        'Field type badges are color-coded per type (gray/blue/orange/purple/emerald/teal/yellow/red) in the agent creation UI.',
        'Live preview panel updated for all 8 field types including checkbox, date picker (jj/mm/aaaa), select dropdown, and file attach button.',
        'Settings: grouped navigation (Compte / Espace de travail / Gestion des utilisateurs / Outils) matching Langdock architecture.',
        'New settings sections: Instructions personnalisées, Sécurité (active sessions), Vue d\'ensemble workspace, Général workspace (icon upload, danger zone), Facturation (3-plan comparison).',
        'New settings sections: Modèles IA (default chat + image model, providers list), Personnalisations (brand color, bg image, workspace logo toggle, chat disclaimer, info boxes).',
        'New settings sections: API workspace (cost/budget, monthly limit, workspace ID, API key management), Membres (invite + manage members table), Groupes (create/search/delete groups), Rôles (permission matrix for Member/Editor/Admin).',
      ],
    },
    {
      version: 'v2.17.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_17_0_title',
      descKey: 'changelog.v2_17_0_desc',
      highlights: [
        'Chat page: dot pattern background, always-visible input bar at the bottom, backdrop-blur header/footer.',
        'Settings: prominent "Sauvegarder" button in the Profile section header.',
        'Settings: new dedicated API Keys section to manage OpenRouter, Groq, and Together AI keys with masked display and one-click delete.',
        'Agent detail page: custom banner image upload (stored locally) and inline description editing via hover pencil icon.',
        'Library: 4 entrepreneur templates (Business plan, GMB Audit, Prospecting email, Weekly report) in the create grid.',
        'Library document cards now show a content text preview instead of a plain icon.',
        'Library editor: PDF export button (browser print dialog) added alongside the existing Markdown export.'
      ]
    },
    {
      version: 'v2.16.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_16_0_title',
      descKey: 'changelog.v2_16_0_desc',
      highlights: [
        'Welcome page moved into the (app) layout — inherits the real sidebar and topbar; 10% promo incentive (MINERVA10) unlocked on 100% task completion.',
        'Today page simplified: 6 essential cards (Agenda, Tasks, Follow-ups, Focus, Projects, Stats) with Cult UI dot pattern background.',
        'Sidebar restructured: 5 permanently pinned items + 3 collapsible categories (Intelligence IA, Données & Fichiers, Plateforme).',
        'Prospecting — 25 Montreal niches with multi-select picker and search; result limiter slider (5–100); no-website filter.',
        '4 scraping sources with live availability indicators: Google Maps/OSM, Yelp, PagesJaunes, Apify (requires API key).',
        'Map markers enriched: color-coded by status (red = no website, orange = low rating, green = ok), popup shows address + phone.',
        'Fixed Supabase presence error on lead detail page by calling removeChannel() in the useEffect cleanup.'
      ]
    },
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
