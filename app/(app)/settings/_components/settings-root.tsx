'use client';

import React, { useState, useEffect } from 'react';
import { SettingsNav, SettingsSection } from './settings-nav';
import { SettingsProfileSection } from './settings-profile-section';
import { SettingsProspectingSection } from './settings-prospecting-section';
import { SettingsAiSection } from './settings-ai-section';
import { SettingsNotificationsSection } from './settings-notifications-section';
import { SettingsAppearanceSection } from './settings-appearance-section';
import { SettingsIntegrationsSection } from './settings-integrations-section';
import { createClient } from '@/lib/supabase/client';


interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  language: string;
  timezone: string;
}

interface ProspectingData {
  niches: string[];
  cities: string[];
  services: {
    website: boolean;
    seoAudit: boolean;
    acquisition: boolean;
  };
  language: string;
}

interface AiData {
  tone: 'casual' | 'professional' | 'storytelling';
  customization: 'low' | 'medium' | 'high';
  autoInsights: boolean;
  autoFollowUps: boolean;
  aiProvider: 'anthropic' | 'openrouter';
  openrouterKey: string;
  aiModel: string;
}

interface NotificationsData {
  reminderOverdue: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  digestTime: string;
}

interface AppearanceData {
  density: 'comfortable' | 'compact';
  theme: 'system' | 'light' | 'dark';
}

interface AppSettings {
  profile: ProfileData;
  prospecting: ProspectingData;
  ai: AiData;
  notifications: NotificationsData;
  appearance: AppearanceData;
}

const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    fullName: "Uprising Studio",
    email: "contact@uprising.studio",
    phone: "+33 6 12 34 56 78",
    language: "fr",
    timezone: "Europe/Paris"
  },
  prospecting: {
    niches: ["Boulangerie / Artisanat", "Automobile", "Restauration", "Coiffure & Beauté"],
    cities: ["Lyon", "Villeurbanne"],
    services: {
      website: true,
      seoAudit: true,
      acquisition: false
    },
    language: "both"
  },
  ai: {
    tone: "casual",
    customization: "medium",
    autoInsights: true,
    autoFollowUps: false,
    aiProvider: "anthropic",
    openrouterKey: "",
    aiModel: "meta-llama/llama-3-8b-instruct:free"
  },
  notifications: {
    reminderOverdue: true,
    dailyDigest: true,
    weeklyReport: false,
    digestTime: "20:00"
  },
  appearance: {
    density: "comfortable",
    theme: "light"
  }
};

export function SettingsRoot() {
  const [section, setSection] = useState<SettingsSection>('profile');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savingSection, setSavingSection] = useState<Record<string, boolean>>({});

  // Load settings on mount
  useEffect(() => {
    const fetchDbSettings = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dbSettings } = await supabase
            .from('settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (dbSettings) {
            setSettings({
              profile: {
                fullName: dbSettings.full_name || '',
                email: dbSettings.company_name || '',
                phone: '+33 6 12 34 56 78',
                language: 'fr',
                timezone: dbSettings.timezone || 'Europe/Paris'
              },
              prospecting: {
                niches: dbSettings.niches || [],
                cities: dbSettings.cities || [],
                services: { website: true, seoAudit: true, acquisition: false },
                language: 'both'
              },
              ai: {
                tone: dbSettings.ai_tone === 'Direct & Closer' ? 'professional' : dbSettings.ai_tone === 'Storytelling' ? 'storytelling' : 'casual',
                customization: dbSettings.ai_density === 'Standard' ? 'low' : dbSettings.ai_density === 'Profond' ? 'high' : 'medium',
                autoInsights: true,
                autoFollowUps: false,
                aiProvider: dbSettings.ai_provider || 'anthropic',
                openrouterKey: dbSettings.openrouter_key || '',
                aiModel: dbSettings.ai_model || 'meta-llama/llama-3-8b-instruct:free'
              },
              notifications: {
                reminderOverdue: true,
                dailyDigest: true,
                weeklyReport: false,
                digestTime: '20:00'
              },
              appearance: {
                density: 'comfortable',
                theme: 'dark'
              }
            });
            return;
          }
        }
      } catch (e) {
        console.error('Failed to fetch settings from Supabase', e);
      }

      // LocalStorage fallback
      const stored = localStorage.getItem('minerva_reach_settings');
      if (stored) {
        try {
          setSettings(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse settings', e);
        }
      }
    };

    const timer = setTimeout(() => {
      fetchDbSettings();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Generic updater function that triggers save indicators
  const updateSettingsSection = <K extends keyof AppSettings>(
    secKey: K,
    updates: Partial<AppSettings[K]>
  ) => {
    setSettings((prev) => {
      const newSectionData = { ...prev[secKey], ...updates } as AppSettings[K];
      const nextSettings = { ...prev, [secKey]: newSectionData };
      localStorage.setItem('minerva_reach_settings', JSON.stringify(nextSettings));
      
      // Upsert changes to Supabase in background
      const saveToDb = async () => {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('settings').upsert({
              user_id: user.id,
              full_name: nextSettings.profile.fullName,
              company_name: nextSettings.profile.email,
              timezone: nextSettings.profile.timezone,
              niches: nextSettings.prospecting.niches,
              cities: nextSettings.prospecting.cities,
              ai_tone: nextSettings.ai.tone === 'casual' ? 'Calme & Conseil' : nextSettings.ai.tone === 'professional' ? 'Direct & Closer' : 'Storytelling',
              ai_density: nextSettings.ai.customization === 'low' ? 'Standard' : nextSettings.ai.customization === 'medium' ? 'Personnalisé' : 'Profond',
              ai_provider: nextSettings.ai.aiProvider,
              openrouter_key: nextSettings.ai.openrouterKey,
              ai_model: nextSettings.ai.aiModel,
            });
          }
        } catch (err) {
          console.error("Error upserting settings to Supabase:", err);
        }
      };
      saveToDb();
      
      return nextSettings;
    });

    // Trigger visual saving indicator for this section
    setSavingSection((prev) => ({ ...prev, [secKey]: true }));
    setTimeout(() => {
      setSavingSection((prev) => ({ ...prev, [secKey]: false }));
    }, 800);
  };

  return (
    <div className="flex h-full min-h-0 bg-background overflow-hidden">
      {/* Sidebar nav selector */}
      <SettingsNav section={section} onSectionChange={setSection} />

      {/* Main configuration settings layout panel */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
          {section === 'profile' && (
            <SettingsProfileSection
              data={settings.profile}
              onChange={(updates) => updateSettingsSection('profile', updates)}
              isSaving={!!savingSection.profile}
            />
          )}

          {section === 'prospecting' && (
            <SettingsProspectingSection
              data={settings.prospecting}
              onChange={(updates) => updateSettingsSection('prospecting', updates)}
              isSaving={!!savingSection.prospecting}
            />
          )}

          {section === 'ai' && (
            <SettingsAiSection
              data={settings.ai}
              onChange={(updates) => updateSettingsSection('ai', updates)}
              isSaving={!!savingSection.ai}
            />
          )}

          {section === 'notifications' && (
            <SettingsNotificationsSection
              data={settings.notifications}
              onChange={(updates) => updateSettingsSection('notifications', updates)}
              isSaving={!!savingSection.notifications}
            />
          )}

          {section === 'appearance' && (
            <SettingsAppearanceSection
              data={settings.appearance}
              onChange={(updates) => updateSettingsSection('appearance', updates)}
              isSaving={!!savingSection.appearance}
            />
          )}

          {section === 'integrations' && (
            <SettingsIntegrationsSection />
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsRoot;
