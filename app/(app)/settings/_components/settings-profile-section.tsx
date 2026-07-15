'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { Button } from '@/components/ui/button';
import { Camera, Trash2 } from 'lucide-react';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  language: string;
  timezone: string;
  bio: string;
  avatarBase64: string;
}

interface SettingsProfileSectionProps {
  data: ProfileData;
  onChange: (updates: Partial<ProfileData>) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function SettingsProfileSection({ data, onChange, onSave, isSaving }: SettingsProfileSectionProps) {
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      setAvatarError("Image trop lourde (max 1.5 Mo).");
      return;
    }
    setAvatarError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({ avatarBase64: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const initials = `${data.firstName.charAt(0)}${data.lastName.charAt(0)}`.toUpperCase() || '?';

  return (
    <SettingsSectionWrapper
      title="Profil & Compte"
      description="Configure tes informations de contact et tes préférences linguistiques."
      isSaving={isSaving}
      onSave={onSave}
    >
      {/* Avatar + Bio card */}
      <Card className="border border-[#e5e5e0] bg-white">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Identité & Biographie</h3>

          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className="relative w-16 h-16 rounded-full border-2 border-[#e5e5e0] overflow-hidden bg-[#f4f4f3] cursor-pointer group"
                onClick={() => avatarInputRef.current?.click()}
              >
                {data.avatarBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.avatarBase64}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-lg font-bold text-[#7a7a76]">
                    {initials}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              {data.avatarBase64 && (
                <button
                  type="button"
                  onClick={() => onChange({ avatarBase64: '' })}
                  className="flex items-center gap-1 text-[10px] text-destructive hover:underline"
                >
                  <Trash2 className="w-3 h-3" />
                  Supprimer
                </button>
              )}
              {avatarError && (
                <p className="text-[10px] text-destructive">{avatarError}</p>
              )}
            </div>

            {/* Bio */}
            <div className="flex-1 grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                Biographie courte
              </label>
              <Textarea
                value={data.bio}
                onChange={(e) => onChange({ bio: e.target.value })}
                placeholder="Quelques mots sur vous, votre rôle, votre approche..."
                className="text-xs bg-white resize-none"
                rows={4}
              />
              <p className="text-[10px] text-[#7a7a76]">{data.bio.length}/300 caractères</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Info card */}
      <Card className="border border-[#e5e5e0] bg-white">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Informations personnelles</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Prénom</label>
              <Input
                value={data.firstName}
                onChange={(e) => onChange({ firstName: e.target.value })}
                placeholder="Jean"
                className="text-xs bg-white"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom de famille</label>
              <Input
                value={data.lastName}
                onChange={(e) => onChange({ lastName: e.target.value })}
                placeholder="Dupont"
                className="text-xs bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Adresse e-mail</label>
              <Input
                type="email"
                value={data.email}
                onChange={(e) => onChange({ email: e.target.value })}
                placeholder="contact@uprising.studio"
                className="text-xs bg-white"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Numéro de téléphone</label>
              <Input
                value={data.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
                placeholder="+1 (514) 123-4567"
                className="text-xs bg-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locale Preferences Card */}
      <Card className="border border-[#e5e5e0] bg-white">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Préférences régionales</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Langue de l&apos;interface</label>
              <Select
                value={data.language}
                onValueChange={(val) => onChange({ language: val })}
              >
                <SelectTrigger className="text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr" className="text-xs">Français (CA)</SelectItem>
                  <SelectItem value="en" className="text-xs">English (EN)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Fuseau horaire</label>
              <Select
                value={data.timezone}
                onValueChange={(val) => onChange({ timezone: val })}
              >
                <SelectTrigger className="text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Paris" className="text-xs">Europe/Paris (UTC+2)</SelectItem>
                  <SelectItem value="Europe/London" className="text-xs">Europe/London (UTC+1)</SelectItem>
                  <SelectItem value="America/New_York" className="text-xs">America/New_York (EST)</SelectItem>
                  <SelectItem value="America/Montreal" className="text-xs">America/Montréal (EST)</SelectItem>
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
