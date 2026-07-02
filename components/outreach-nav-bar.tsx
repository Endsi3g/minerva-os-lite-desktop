'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, GitBranch, Megaphone, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'inbox',     label: 'Inbox',         icon: Inbox,         href: '/inbox' },
  { id: 'sequences', label: 'Séquences',      icon: GitBranch,     href: '/sequences' },
  { id: 'campaigns', label: 'Campagnes',      icon: Megaphone,     href: '/campaigns' },
  { id: 'templates', label: 'Templates',      icon: FileText,      href: '/email-templates' },
  { id: 'approvals', label: 'Approbations',   icon: CheckCircle2,  href: '/outreach' },
] as const;

export function OutreachNavBar() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-0 border-b border-[#e5e5e0] bg-white px-4 shrink-0 overflow-x-auto">
      {TABS.map(tab => {
        const isOutreachApprovals = tab.href === '/outreach' && pathname === '/outreach';
        const isActive = tab.href !== '/outreach'
          ? (pathname === tab.href || pathname.startsWith(tab.href + '/'))
          : isOutreachApprovals;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
              isActive
                ? 'border-[#059669] text-[#059669]'
                : 'border-transparent text-[#7a7a76] hover:text-[#26251e] hover:border-[#e5e5e0]'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
