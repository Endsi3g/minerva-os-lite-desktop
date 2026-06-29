'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Inbox, GitBranch, Megaphone, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafaf8]">
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
