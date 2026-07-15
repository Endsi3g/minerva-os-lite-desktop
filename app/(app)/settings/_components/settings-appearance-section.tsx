'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/language-context';
import { Globe } from 'lucide-react';

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
  const { locale, setLocale } = useLanguage();

  // Local states for custom properties
  const [radius, setRadius] = useState('10px');
  const [gridOpacity, setGridOpacity] = useState(100);

  // Load UI preferences from Supabase on mount
  useEffect(() => {
    fetch('/api/settings/user-prefs')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.ui_preferences) {
          const prefs = d.ui_preferences;
          if (prefs.radius) {
            setRadius(prefs.radius);
            document.documentElement.style.setProperty('--radius', prefs.radius);
          }
          if (prefs.gridOpacity !== undefined) {
            setGridOpacity(prefs.gridOpacity);
            document.documentElement.style.setProperty('--grid-opacity', String(prefs.gridOpacity / 100));
          }
          if (prefs.density) {
            document.documentElement.classList.toggle('compact', prefs.density === 'compact');
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleThemeChange = (val: 'system' | 'light' | 'dark') => {
    onChange({ theme: val });
    setTheme(val);
  };

  const persistPrefs = (patch: Record<string, unknown>) => {
    fetch('/api/settings/user-prefs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ui_preferences: patch }),
    }).catch(() => {});
  };

  const handleDensityChange = (val: 'comfortable' | 'compact') => {
    onChange({ density: val });
    document.documentElement.classList.toggle('compact', val === 'compact');
    persistPrefs({ radius, density: val, gridOpacity });
  };

  const handleRadiusChange = (val: string) => {
    setRadius(val);
    document.documentElement.style.setProperty('--radius', val);
    persistPrefs({ radius: val, density: data.density, gridOpacity });
  };

  const handleGridOpacityChange = (val: number) => {
    setGridOpacity(val);
    document.documentElement.style.setProperty('--grid-opacity', String(val / 100));
    persistPrefs({ radius, density: data.density, gridOpacity: val });
  };

  const densities = [
    { id: 'comfortable' as const, name: 'Confortable', description: 'Layout aéré et Notion-like avec espacements généreux (recommandé).' },
    { id: 'compact' as const, name: 'Compact', description: 'Layout dense optimisé pour maximiser le nombre de leads affichés sur l\'écran.' }
  ];

  const radii = [
    { label: 'Carré (0px)', value: '0px' },
    { label: 'Fin (4px)', value: '4px' },
    { label: 'Standard (8px)', value: '8px' },
    { label: 'Arrondi (12px)', value: '12px' },
    { label: 'Très Arrondi (16px)', value: '16px' }
  ];

  return (
    <SettingsSectionWrapper
      title="Apparence"
      description="Configure le thème visuel et la densité de l'interface de Minerva Reach."
      isSaving={isSaving}
    >
      <div className="space-y-6 text-left">
        
        {/* Density Card */}
        <Card className="border border-[#e5e5e0] bg-white">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Densité de l'affichage</h3>
            <p className="text-[11px] text-[#7a7a76] leading-normal">
              Ajuste le niveau d'espacement dans les tableaux et fiches détaillées de l'application.
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {densities.map((d) => {
                const isSelected = data.density === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleDensityChange(d.id)}
                    className={cn(
                      "text-left p-3 rounded-lg border transition-all flex flex-col gap-1 w-full cursor-pointer",
                      isSelected 
                        ? "border-primary bg-[#059669]/5 text-[#26251e] ring-1 ring-primary/30" 
                        : "border-[#e5e5e0]/70 bg-white hover:border-[#e5e5e0] text-[#7a7a76]"
                    )}
                  >
                    <span className="text-xs font-bold text-[#26251e]">{d.name}</span>
                    <span className="text-[10px] text-[#7a7a76] leading-normal">{d.description}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Theme Card Selector */}
        <Card className="border border-[#e5e5e0] bg-white">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider font-sans">Thème visuel</h3>
            <p className="text-[11px] text-[#7a7a76] leading-normal">
              Bascule l'interface en mode clair, sombre, ou laisse le système choisir.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="grid gap-1.5">
                <label htmlFor="theme-select" className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Thème de l'application</label>
                <Select 
                  value={data.theme} 
                  onValueChange={(val: 'system' | 'light' | 'dark') => handleThemeChange(val)}
                >
                  <SelectTrigger id="theme-select" className="text-xs bg-white">
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

        {/* Language Card */}
        <Card className="border border-[#e5e5e0] bg-white">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-[#7a7a76]" />
              <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Langue de l'application</h3>
            </div>
            <p className="text-[11px] text-[#7a7a76] leading-normal">
              Change la langue de toute l'interface. Le choix est sauvegardé dans ton profil.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Langue / Language</label>
                <Select value={locale} onValueChange={(val) => setLocale(val as 'fr' | 'en' | 'de')}>
                  <SelectTrigger className="text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr" className="text-xs">🇫🇷 Français</SelectItem>
                    <SelectItem value="en" className="text-xs">🇬🇧 English</SelectItem>
                    <SelectItem value="de" className="text-xs">🇩🇪 Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Border Radius Card */}
        <Card className="border border-[#e5e5e0] bg-white">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider font-sans">Rayon des bordures (Border Radius)</h3>
            <p className="text-[11px] text-[#7a7a76] leading-normal">
              Ajuste l'arrondi des angles des cartes, boutons et éléments interactifs de l'application.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-1">
              {radii.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => handleRadiusChange(r.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                    radius === r.value
                      ? "border-primary bg-[#059669]/5 text-[#26251e] ring-1 ring-primary/30"
                      : "border-[#e5e5e0]/70 bg-white text-[#555552] hover:bg-slate-50"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Grid Opacity Card */}
        <Card className="border border-[#e5e5e0] bg-white">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider font-sans">Opacité du quadrillage</h3>
            <p className="text-[11px] text-[#7a7a76] leading-normal">
              Ajuste le niveau de visibilité des lignes de fond de grille esthétique (0% à 100%).
            </p>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#26251e]">
                <span>Visibilité du quadrillage</span>
                <span className="font-mono text-[#059669] font-bold">{gridOpacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={gridOpacity}
                onChange={(e) => handleGridOpacityChange(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
              />
            </div>
          </CardContent>
        </Card>

      </div>
    </SettingsSectionWrapper>
  );
}

export default SettingsAppearanceSection;
