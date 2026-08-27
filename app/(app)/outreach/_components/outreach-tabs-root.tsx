'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Megaphone, FileText, CheckCircle2, SquarePen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/lib/api-helper';
import { OutreachApprovals } from './outreach-approvals';
import { OutreachCampaigns } from './outreach-campaigns';
import { OutreachComposer } from './outreach-composer';
import EmailTemplatesPage from '@/app/(app)/settings/email-templates/page';
import { ContacterSubNav } from '@/app/(app)/_components/hub-nav/contacter-sub-nav';

type OutreachTab = 'composer' | 'campaigns' | 'templates' | 'approvals';

const TABS: { id: OutreachTab; label: string; icon: React.ElementType; badgeKey?: string }[] = [
  { id: 'composer', label: 'Composer', icon: SquarePen },
  { id: 'campaigns', label: 'Campagnes', icon: Megaphone },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'approvals', label: 'Approbations', icon: CheckCircle2, badgeKey: 'approvals' },
];

export function OutreachTabsRoot() {
  const [activeTab, setActiveTab] = useState<OutreachTab>('composer');
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('minerva_active_workspace_id') : null;
    if (!workspaceId) return;
    fetch(getApiUrl(`/api/outreach/approvals?workspace_id=${workspaceId}`))
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPendingApprovals(d.total ?? 0); })
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafaf8]">
      <ContacterSubNav />
      {/* Inner Tab bar with Action CTA */}
      <div className="flex items-center justify-between border-b border-[#e5e5e0] bg-white px-4 sm:px-6 overflow-x-auto shrink-0">
        <div className="flex items-center gap-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0',
                  isActive
                    ? 'border-[#059669] text-[#059669]'
                    : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.badgeKey === 'approvals' && pendingApprovals > 0 && (
                  <span className="ml-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#d97706] text-[8px] font-black text-white">
                    {pendingApprovals > 9 ? '9+' : pendingApprovals}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action CTA Button per Tab */}
        <div className="py-2">
          {activeTab === 'campaigns' && (
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#059669] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#047857] shadow-xs"
            >
              + Créer une campagne
            </Link>
          )}
          {activeTab === 'templates' && (
            <Link
              href="/settings/email-templates"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#059669] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#047857] shadow-xs"
            >
              + Nouveau template
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'composer' && (
          <div className="h-full">
            <OutreachComposer />
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="h-full">
            <OutreachCampaigns />
          </div>
        )}

        {activeTab === 'templates' && <EmailTemplatesPage />}

        {activeTab === 'approvals' && (
          <div className="h-full">
            <OutreachApprovals />
          </div>
        )}
      </div>
    </div>
  );
}

export default OutreachTabsRoot;
