'use client';

import React from 'react';
import { User, Target, Brain, Bell, Sun, Link2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/language-context';

export type SettingsSection = 'profile' | 'prospecting' | 'ai' | 'notifications' | 'appearance' | 'integrations' | 'preferences';

interface SettingsNavProps {
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

export function SettingsNav({ section, onSectionChange }: SettingsNavProps) {
  const { t } = useLanguage();

  const items = [
    { id: 'profile' as SettingsSection, name: t('settings.tab_profile'), icon: User },
    { id: 'preferences' as SettingsSection, name: t('settings.tab_preferences'), icon: Settings2 },
    { id: 'prospecting' as SettingsSection, name: t('settings.tab_prospecting'), icon: Target },
    { id: 'ai' as SettingsSection, name: t('settings.tab_ai'), icon: Brain },
    { id: 'notifications' as SettingsSection, name: t('settings.tab_notifications'), icon: Bell },
    { id: 'appearance' as SettingsSection, name: t('settings.tab_appearance'), icon: Sun },
    { id: 'integrations' as SettingsSection, name: t('settings.tab_integrations'), icon: Link2 },
  ];

  return (
    <nav className="w-64 border-r border-border bg-card/40 p-4 space-y-1 select-none shrink-0 hidden md:block">
      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {t('settings.nav_title')}
      </div>
      {items.map((item) => {
        const isActive = section === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "flex items-center gap-3 w-full rounded-md px-3 py-2 text-xs font-semibold tracking-wide transition-colors text-left",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.name}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default SettingsNav;
