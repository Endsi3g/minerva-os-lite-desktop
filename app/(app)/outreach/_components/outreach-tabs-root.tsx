'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Inbox, GitBranch, Megaphone, FileText, CheckCircle2, ArrowRight, Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/lib/api-helper';
import { InboxRoot } from '@/app/(app)/inbox/_components/inbox-root';
import { OutreachRoot } from './outreach-root';

type OutreachTab = 'inbox' | 'sequences' | 'campaigns' | 'templates' | 'approvals';

const TABS: { id: OutreachTab; label: string; icon: React.ElementType }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sequences', label: 'Séquences', icon: GitBranch },
  { id: 'campaigns', label: 'Campagnes', icon: Megaphone },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'approvals', label: 'Approbations', icon: CheckCircle2 },
];

function ShellTab({ icon: Icon, title, description, href, cta }: { icon: React.ElementType; title: string; description: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#059669]/10 mb-4">
        <Icon className="h-6 w-6 text-[#059669]" />
      </div>
      <p className="text-sm font-semibold text-[#26251e]">{title}</p>
      <p className="text-xs text-[#7a7a76] mt-1 max-w-sm">{description}</p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#059669] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#047857]"
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export function OutreachTabsRoot() {
  const [activeTab, setActiveTab] = useState<OutreachTab>('inbox');
  const [showSetupBanner, setShowSetupBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('minerva_ai_setup_dismissed') === '1') {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(getApiUrl('/api/ai/setup'));
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.ai_setup_complete === false) {
          setShowSetupBanner(true);
        }
      } catch {
        // ignore — banner is non-blocking
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafaf8]">
      {showSetupBanner && (
        <div className="mx-4 mt-3 p-4 bg-[#059669]/8 border border-[#059669]/20 rounded-2xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#059669] flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#26251e]">Configure ton assistant IA</p>
            <p className="text-xs text-[#7a7a76] mt-0.5">Personnalise tes messages de prospection en 3 minutes avec un flow guidé.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings/ai/setup" className="h-7 px-3 bg-[#059669] text-white text-[10px] font-bold rounded-lg flex items-center hover:bg-[#047857] transition-colors">
              Configurer →
            </Link>
            <button onClick={() => { setShowSetupBanner(false); localStorage.setItem('minerva_ai_setup_dismissed', '1'); }}
              className="w-7 h-7 rounded-lg hover:bg-[#059669]/10 flex items-center justify-center text-[#7a7a76]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-[#e5e5e0] bg-white px-4 sm:px-6 overflow-x-auto shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0',
                isActive
                  ? 'border-[#059669] text-[#059669]'
                  : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'inbox' && (
          <div className="h-full">
            <InboxRoot />
          </div>
        )}

        {activeTab === 'sequences' && <OutreachRoot />}

        {activeTab === 'campaigns' && (
          <ShellTab
            icon={Megaphone}
            title="Campagnes d'approche"
            description="Lance et pilote des campagnes multi-canales à grande échelle. Suivi des ouvertures, réponses et conversions."
            href="/campaigns"
            cta="Ouvrir les campagnes"
          />
        )}

        {activeTab === 'templates' && (
          <ShellTab
            icon={FileText}
            title="Templates Email"
            description="Crée et gère tes modèles d'emails réutilisables avec variables dynamiques pour personnaliser chaque envoi."
            href="/email-templates"
            cta="Gérer les templates"
          />
        )}

        {activeTab === 'approvals' && (
          <ShellTab
            icon={CheckCircle2}
            title="Approbations (human-in-the-loop)"
            description="Validez les emails et actions générés par l'IA avant leur envoi. File d'attente d'approbation pour garder le contrôle. Bientôt disponible."
            href="/outreach"
            cta="Configurer les approbations"
          />
        )}
      </div>
    </div>
  );
}

export default OutreachTabsRoot;
