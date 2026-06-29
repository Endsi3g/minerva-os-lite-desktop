'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { List, Kanban, Building2, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Liste', href: '/leads', icon: List, exact: true },
  { label: 'Pipeline', href: '/pipeline', icon: Kanban },
  { label: 'Comptes', href: '/accounts', icon: Building2 },
  { label: 'Prospection', href: '/prospecting', icon: MapPin },
  { label: 'Timeline', href: '/leads/timeline', icon: Clock },
];

export function LeadsSubNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-0 border-b border-[#e5e5e0] bg-white px-4 sm:px-6 overflow-x-auto">
      {TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href) && tab.href !== '/leads';
        return (
          <Link key={tab.href} href={tab.href}
            className={cn('flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0',
              isActive ? 'border-[#059669] text-[#059669]' : 'border-transparent text-[#7a7a76] hover:text-[#26251e]')}>
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
