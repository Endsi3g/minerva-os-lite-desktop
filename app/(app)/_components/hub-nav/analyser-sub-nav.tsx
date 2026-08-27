'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, TrendingUp, FileText, Activity, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Bilan Hebdo', href: '/weekly-report', icon: BarChart3, exact: true },
  { label: 'Analytics', href: '/analytics', icon: TrendingUp },
  { label: 'Rapports Clients', href: '/client-reports', icon: FileText },
  { label: 'Activités & Audit', href: '/activities', icon: Activity },
  { label: 'Audit Technique', href: '/audit', icon: ShieldCheck },
];

export function AnalyserSubNav() {
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
