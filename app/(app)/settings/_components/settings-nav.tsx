'use client';

import React from 'react';
import {
  User, Sun, Briefcase, Users, Brain, Link2, Target, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/language-context';

export type SettingsSection =
  | 'profile' | 'appearance'
  | 'workspace_general' | 'members'
  | 'ai' | 'integrations' | 'goals';

interface NavGroup {
  label: string;
  items: { id: SettingsSection; name: string; icon: React.ElementType }[];
}

interface SettingsNavProps {
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

export function SettingsNav({ section, onSectionChange }: SettingsNavProps) {
  const { t } = useLanguage();

  const groups: NavGroup[] = [
    {
      label: 'Compte',
      items: [
        { id: 'profile', name: t('settings.tab_profile'), icon: User },
        { id: 'appearance', name: t('settings.tab_appearance'), icon: Sun },
      ],
    },
    {
      label: 'Espace de travail',
      items: [
        { id: 'workspace_general', name: 'Général', icon: Briefcase },
        { id: 'members', name: 'Membres', icon: Users },
      ],
    },
    {
      label: 'Outils',
      items: [
        { id: 'ai', name: t('settings.tab_ai'), icon: Brain },
        { id: 'integrations', name: t('settings.tab_integrations'), icon: Link2 },
        { id: 'goals', name: 'Objectifs', icon: Target },
      ],
    },
  ];

  const allItems = groups.flatMap(g => g.items.map(item => ({ ...item, group: g.label })));
  const activeItem = allItems.find(i => i.id === section);

  return (
    <>
      {/* Mobile: full-width select dropdown */}
      <div className="md:hidden border-b border-border bg-card/40 px-4 py-3 shrink-0">
        <select
          value={section}
          onChange={(e) => onSectionChange(e.target.value as SettingsSection)}
          className="w-full text-xs font-medium bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {activeItem && (
          <p className="text-[10px] text-muted-foreground mt-1.5 px-1">{activeItem.group} › {activeItem.name}</p>
        )}
      </div>

      {/* Desktop: sidebar nav */}
      <nav className="w-56 border-r border-border bg-card/40 p-3 space-y-5 select-none shrink-0 hidden md:block overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
            <div className="space-y-0.5 mt-1">
              {group.items.map((item) => {
                const isActive = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSectionChange(item.id)}
                    className={cn(
                      'flex items-center gap-2.5 w-full rounded-md px-3 py-1.5 text-xs font-medium tracking-wide transition-colors text-left',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="pt-4 mt-4 border-t border-border/60 px-3 space-y-2">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>Terms of Use</span>
          </a>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>Privacy Policy</span>
          </a>
        </div>
      </nav>
    </>
  );
}

export default SettingsNav;
