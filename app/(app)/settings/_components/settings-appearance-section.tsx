'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface AppearanceData {
  density: 'comfortable' | 'compact';
  theme: 'system' | 'light' | 'dark';
}

interface SettingsAppearanceSectionProps {
  data: AppearanceData;
  onChange: (updates: Partial<AppearanceData>) => void;
  isSaving: boolean;
}

export function SettingsAppearanceSection({ data, onChange, isSaving }: SettingsAppearanceSectionProps) {
  const { setTheme } = useTheme();

  const handleThemeChange = (val: 'system' | 'light' | 'dark') => {
    onChange({ theme: val });
    setTheme(val);
  };

  const densities = [
    { id: 'comfortable' as const, name: 'Confortable', description: 'Layout aéré et Notion-like avec espacements généreux (recommandé).' },
    { id: 'compact' as const, name: 'Compact', description: 'Layout dense optimisé pour maximiser le nombre de leads affichés sur l\'écran.' }
  ];

  return (
    <SettingsSectionWrapper
      title="Apparence"
      description="Configure le thème visuel et la densité de l&apos;interface de Minerva Reach."
      isSaving={isSaving}
    >
      {/* Density Card switcher buttons */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Densité de l&apos;affichage</h3>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Ajuste le niveau d&apos;espacement dans les tableaux et fiches détaillées de l&apos;application.
          </p>

          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {densities.map((d) => {
              const isSelected = data.density === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onChange({ density: d.id })}
                  className={cn(
                    "text-left p-3 rounded-lg border transition-all flex flex-col gap-1 w-full",
                    isSelected 
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30" 
                      : "border-border/60 bg-card hover:border-border text-muted-foreground"
                  )}
                >
                  <span className="text-xs font-bold text-foreground">{d.name}</span>
                  <span className="text-[10px] text-muted-foreground leading-normal">{d.description}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Theme Card Selector */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-sans">Thème visuel</h3>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Bascule l&apos;interface en mode clair, sombre, ou laisse le système choisir.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Thème de l&apos;application</label>
              <Select 
                value={data.theme} 
                onValueChange={(val: 'system' | 'light' | 'dark') => handleThemeChange(val)}
              >
                <SelectTrigger className="text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system" className="text-xs">Identique au système (Automatique)</SelectItem>
                  <SelectItem value="light" className="text-xs">Clair (Light Mode)</SelectItem>
                  <SelectItem value="dark" className="text-xs">Sombre (Dark Mode)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </SettingsSectionWrapper>
  );
}

export default SettingsAppearanceSection;
