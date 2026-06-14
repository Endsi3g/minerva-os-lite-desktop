'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { useReach } from '@/lib/reach-context';
import { Button } from '@/components/ui/button';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  language: string;
  timezone: string;
}

interface SettingsProfileSectionProps {
  data: ProfileData;
  onChange: (updates: Partial<ProfileData>) => void;
  isSaving: boolean;
}

export function SettingsProfileSection({ data, onChange, isSaving }: SettingsProfileSectionProps) {
  const { importDemoData } = useReach();
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleImportDemo = async () => {
    setIsImporting(true);
    try {
      await importDemoData();
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (e) {
      console.error("Demo import failed:", e);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SettingsSectionWrapper
      title="Profil & Compte"
      description="Configure tes informations de contact et tes préférences linguistiques."
      isSaving={isSaving}
    >
      {/* Profile Info card */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Informations personnelles</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prénom</label>
              <Input 
                value={data.firstName} 
                onChange={(e) => onChange({ firstName: e.target.value })} 
                placeholder="Jean"
                className="text-xs bg-card"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nom de famille</label>
              <Input 
                value={data.lastName} 
                onChange={(e) => onChange({ lastName: e.target.value })} 
                placeholder="Dupont"
                className="text-xs bg-card"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Adresse e-mail</label>
              <Input 
                type="email" 
                value={data.email} 
                onChange={(e) => onChange({ email: e.target.value })} 
                placeholder="contact@uprising.studio"
                className="text-xs bg-card"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Numéro de téléphone</label>
              <Input 
                value={data.phone} 
                onChange={(e) => onChange({ phone: e.target.value })} 
                placeholder="+1 (514) 123-4567"
                className="text-xs bg-card"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locale Preferences Card */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Préférences régionales</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Langue de l&apos;interface</label>
              <Select 
                value={data.language} 
                onValueChange={(val) => onChange({ language: val })}
              >
                <SelectTrigger className="text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr" className="text-xs">Français (CA)</SelectItem>
                  <SelectItem value="en" className="text-xs">English (EN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fuseau horaire</label>
              <Select 
                value={data.timezone} 
                onValueChange={(val) => onChange({ timezone: val })}
              >
                <SelectTrigger className="text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Paris" className="text-xs">Europe/Paris (UTC+2)</SelectItem>
                  <SelectItem value="Europe/London" className="text-xs">Europe/London (UTC+1)</SelectItem>
                  <SelectItem value="America/New_York" className="text-xs">America/New_York (EST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Data Management Card */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Données & Tests</h3>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Par défaut, les nouveaux Espaces de travail démarrent vides pour tes vrais clients. Tu peux importer manuellement des données fictives de démonstration (leads et tâches) à des fins de test.
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              disabled={isImporting}
              onClick={handleImportDemo}
              className="text-xs font-bold h-8.5 bg-primary text-primary-foreground hover:bg-primary/95"
            >
              {isImporting ? "Importation..." : "Importer les données de démonstration"}
            </Button>
            {importSuccess && (
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
                Données de démonstration importées avec succès !
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </SettingsSectionWrapper>
  );
}

export default SettingsProfileSection;
