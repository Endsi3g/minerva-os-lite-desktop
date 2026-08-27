'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Send, Inbox, Megaphone, Mail, FileText, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Cockpit Outreach', href: '/outreach', icon: Send, exact: true },
  { label: 'Boîte de réception', href: '/inbox', icon: Inbox },
  { label: 'Campagnes', href: '/campaigns', icon: Megaphone },
  { label: 'Séquences', href: '/sequences', icon: Mail },
  { label: 'Templates', href: '/email-templates', icon: FileText },
];

export function ContacterSubNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-0 border-b border-[#e5e5e0] bg-white px-4 sm:px-6 overflow-x-auto shrink-0 select-none">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0',
              isActive
                ? 'border-[#059669] text-[#059669]'
                : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
