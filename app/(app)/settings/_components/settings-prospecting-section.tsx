'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { Plus, X, Tag, Mail } from 'lucide-react';

interface ProspectingData {
  niches: string[];
  cities: string[];
  services: {
    website: boolean;
    seoAudit: boolean;
    acquisition: boolean;
  };
  language: string;
  dailyEmailLimit: number;
}

interface SettingsProspectingSectionProps {
  data: ProspectingData;
  onChange: (updates: Partial<ProspectingData>) => void;
  isSaving: boolean;
}

export function SettingsProspectingSection({ data, onChange, isSaving }: SettingsProspectingSectionProps) {
  const [newNiche, setNewNiche] = useState('');
  const [newCity, setNewCity] = useState('');

  // Niche tag helpers
  const handleAddNiche = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNiche.trim()) return;
    if (!data.niches.includes(newNiche.trim())) {
      onChange({ niches: [...data.niches, newNiche.trim()] });
    }
    setNewNiche('');
  };

  const handleRemoveNiche = (nicheToRemove: string) => {
    onChange({ niches: data.niches.filter((n) => n !== nicheToRemove) });
  };

  // City tag helpers
  const handleAddCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity.trim()) return;
    if (!data.cities.includes(newCity.trim())) {
      onChange({ cities: [...data.cities, newCity.trim()] });
    }
    setNewCity('');
  };

  const handleRemoveCity = (cityToRemove: string) => {
    onChange({ cities: data.cities.filter((c) => c !== cityToRemove) });
  };

  // Service checkbox toggler
  const handleServiceChange = (key: keyof ProspectingData['services'], checked: boolean) => {
    onChange({
      services: {
        ...data.services,
        [key]: checked
      }
    });
  };

  return (
    <SettingsSectionWrapper
      title="Préférences de Prospection"
      description="Personnalise les niches, les zones géographiques, et les offres de prospection de ton agence."
      isSaving={isSaving}
    >
      {/* Target Niches Tag Manager */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-primary" />
            <span>Niches cibles</span>
          </h3>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Ajoute les secteurs d&apos;activité que tu souhaites cibler. Ils apparaîtront dans tes filtres et guides de prospection.
          </p>
          
          {/* Add niche input form */}
          <form onSubmit={handleAddNiche} className="flex gap-2">
            <Input 
              value={newNiche} 
              onChange={(e) => setNewNiche(e.target.value)} 
              placeholder="ex: Boulangerie, Salon de Coiffure..." 
              className="text-xs bg-card h-8 flex-1"
            />
            <Button type="submit" size="sm" className="h-8 gap-1">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          </form>

          {/* Niches badges list */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {data.niches.map((niche) => (
              <Badge 
                key={niche} 
                variant="secondary" 
                className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 bg-muted text-foreground"
              >
                <span>{niche}</span>
                <button 
                  type="button" 
                  onClick={() => handleRemoveNiche(niche)} 
                  className="hover:text-destructive text-muted-foreground ml-0.5"
                  title={`Supprimer ${niche}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Target Markets (Cities) Tag Manager */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-primary" />
            <span>Zones géographiques</span>
          </h3>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Définis tes villes ou régions de prospection pour cibler tes recherches.
          </p>
          
          {/* Add city input form */}
          <form onSubmit={handleAddCity} className="flex gap-2">
            <Input 
              value={newCity} 
              onChange={(e) => setNewCity(e.target.value)} 
              placeholder="ex: Lyon, Villeurbanne, Paris..." 
              className="text-xs bg-card h-8 flex-1"
            />
            <Button type="submit" size="sm" className="h-8 gap-1">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          </form>

          {/* Cities badges list */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {data.cities.map((city) => (
              <Badge 
                key={city} 
                variant="secondary" 
                className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 bg-muted text-foreground"
              >
                <span>{city}</span>
                <button 
                  type="button" 
                  onClick={() => handleRemoveCity(city)} 
                  className="hover:text-destructive text-muted-foreground ml-0.5"
                  title={`Supprimer ${city}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Services and Outreach parameters Card */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-5">
          {/* Services Checklist */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Services / Offres vendus</h3>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Sélectionne les offres commercialisées. L&apos;IA s&apos;appuiera dessus pour orienter l&apos;argumentaire des playbooks.
            </p>
            
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2.5">
                <Checkbox 
                  id="srv-web" 
                  checked={data.services.website} 
                  onCheckedChange={(checked) => handleServiceChange('website', !!checked)}
                />
                <label htmlFor="srv-web" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                  Création & Refonte de site Internet (Responsive, Mobile-first)
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <Checkbox 
                  id="srv-seo" 
                  checked={data.services.seoAudit} 
                  onCheckedChange={(checked) => handleServiceChange('seoAudit', !!checked)}
                />
                <label htmlFor="srv-seo" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                  Optimisation Référencement Local & Audit SEO Google Maps
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <Checkbox 
                  id="srv-acq" 
                  checked={data.services.acquisition} 
                  onCheckedChange={(checked) => handleServiceChange('acquisition', !!checked)}
                />
                <label htmlFor="srv-acq" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                  Système d&apos;acquisition client automatisé (Click & Collect, Widget de résas)
                </label>
              </div>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Languages of outreach templates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Langues de prospection</label>
              <Select 
                value={data.language} 
                onValueChange={(val) => onChange({ language: val })}
              >
                <SelectTrigger className="text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr" className="text-xs">Français uniquement (FR)</SelectItem>
                  <SelectItem value="en" className="text-xs">English only (EN)</SelectItem>
                  <SelectItem value="both" className="text-xs">Français & English (FR/EN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily email send cap */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-primary" />
            <span>Quota d&apos;envoi quotidien</span>
          </h3>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Nombre maximum d&apos;e-mails de séquence envoyés par jour, toutes séquences actives confondues. Les étapes excédentaires sont reportées au lendemain.
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={500}
              value={data.dailyEmailLimit}
              onChange={(e) => onChange({ dailyEmailLimit: Math.max(1, Math.min(500, Number(e.target.value) || 50)) })}
              className="w-24 text-xs h-8"
            />
            <span className="text-xs text-muted-foreground">e-mails / jour</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {[20, 50, 100, 200].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange({ dailyEmailLimit: preset })}
                className={`text-[10px] font-bold px-2.5 py-1 rounded border transition-colors ${
                  data.dailyEmailLimit === preset
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'border-border text-muted-foreground hover:border-primary/30 hover:text-primary'
                }`}
              >
                {preset}/jour
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </SettingsSectionWrapper>
  );
}

export default SettingsProspectingSection;
