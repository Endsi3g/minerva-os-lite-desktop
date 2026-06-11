'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSectionWrapper } from './settings-section-wrapper';

interface ProfileData {
  fullName: string;
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
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nom complet</label>
              <Input 
                value={data.fullName} 
                onChange={(e) => onChange({ fullName: e.target.value })} 
                placeholder="Uprising Studio"
                className="text-xs bg-card"
              />
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Numéro de téléphone</label>
              <Input 
                value={data.phone} 
                onChange={(e) => onChange({ phone: e.target.value })} 
                placeholder="+33 6 12 34 56 78"
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
                  <SelectItem value="fr" className="text-xs">Français (FR)</SelectItem>
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
    </SettingsSectionWrapper>
  );
}

export default SettingsProfileSection;
