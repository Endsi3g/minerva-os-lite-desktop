'use client';

import React, { useState, useEffect } from 'react';
import { SettingsNav, SettingsSection } from './settings-nav';
import { SettingsProfileSection } from './settings-profile-section';
import { SettingsProspectingSection } from './settings-prospecting-section';
import { SettingsAiSection } from './settings-ai-section';
import { SettingsNotificationsSection } from './settings-notifications-section';
import { SettingsAppearanceSection } from './settings-appearance-section';
import { SettingsIntegrationsSection } from './settings-integrations-section';
import { SettingsPreferencesSection, PreferencesData } from './settings-preferences-section';
import { Locale } from '@/lib/translations';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { cn } from '@/lib/utils';

interface ProfileData {
  firstName: string;
  lastName: string;
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
  aiProvider: 'anthropic' | 'openrouter' | 'groq' | 'together';
  // Never the raw key — only a masked display value fetched from /api/settings/ai-keys.
  openrouterKeyMasked: string | null;
  groqKeyMasked: string | null;
  togetherKeyMasked: string | null;
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
  preferences: PreferencesData;
}

const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    firstName: "Uprising",
    lastName: "Studio",
    email: "contact@uprising.studio",
    phone: "+1 (514) 123-4567",
    language: "fr",
    timezone: "America/Montreal"
  },
  prospecting: {
    niches: ["Boulangerie / Artisanat", "Automobile", "Restauration", "Coiffure & Beauté"],
    cities: ["Montréal", "Laval"],
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
    openrouterKeyMasked: null,
    groqKeyMasked: null,
    togetherKeyMasked: null,
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
  },
  preferences: {
    defaultModel: "None",
    defaultImageModel: "None",
    chatCapabilities: ["web_search", "image_generation", "data_analyst", "canvas"],
    language: "fr"
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
                firstName: dbSettings.full_name || '',
                lastName: dbSettings.last_name || '',
                email: dbSettings.email || dbSettings.company_name || '',
                phone: dbSettings.phone || '',
                language: dbSettings.language || 'fr',
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
                openrouterKeyMasked: null,
                groqKeyMasked: null,
                togetherKeyMasked: null,
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
              },
              preferences: {
                defaultModel: dbSettings.default_model || 'None',
                defaultImageModel: dbSettings.default_image_model || 'None',
                chatCapabilities: dbSettings.chat_capabilities || ['web_search', 'image_generation', 'data_analyst', 'canvas'],
                language: (dbSettings.language as Locale) || 'fr'
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
          const parsed = JSON.parse(stored);
          // Scrub raw key values that may have been cached by older app versions —
          // this cache must never carry secrets, only masked display strings.
          if (parsed?.ai) {
            delete parsed.ai.openrouterKey;
            delete parsed.ai.groqKey;
            delete parsed.ai.togetherKey;
          }
          setSettings(parsed);
          localStorage.setItem('minerva_reach_settings', JSON.stringify(parsed));
        } catch (e) {
          console.error('Failed to parse settings', e);
        }
      }
    };

    const fetchAiKeysStatus = async () => {
      try {
        const res = await fetch(getApiUrl('/api/settings/ai-keys'));
        if (!res.ok) return;
        const keys = await res.json();
        setSettings((prev) => ({
          ...prev,
          ai: {
            ...prev.ai,
            openrouterKeyMasked: keys.openrouterKeyMasked,
            groqKeyMasked: keys.groqKeyMasked,
            togetherKeyMasked: keys.togetherKeyMasked,
          },
        }));
      } catch (e) {
        console.error('Failed to fetch AI key status', e);
      }
    };

    const timer = setTimeout(() => {
      fetchDbSettings();
      fetchAiKeysStatus();
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
            // Standard settings columns save
            const { error: baseError } = await supabase.from('settings').upsert({
              user_id: user.id,
              full_name: nextSettings.profile.firstName,
              last_name: nextSettings.profile.lastName,
              phone: nextSettings.profile.phone,
              email: nextSettings.profile.email,
              company_name: nextSettings.profile.email,
              timezone: nextSettings.profile.timezone,
              niches: nextSettings.prospecting.niches,
              cities: nextSettings.prospecting.cities,
              ai_tone: nextSettings.ai.tone === 'casual' ? 'Calme & Conseil' : nextSettings.ai.tone === 'professional' ? 'Direct & Closer' : 'Storytelling',
              ai_density: nextSettings.ai.customization === 'low' ? 'Standard' : nextSettings.ai.customization === 'medium' ? 'Personnalisé' : 'Profond',
              ai_provider: nextSettings.ai.aiProvider,
              ai_model: nextSettings.ai.aiModel,
            });
            if (baseError) console.error("Error saving base settings:", baseError.message);

            // Attempt preferences columns save (handle DDL missing column errors gracefully)
            if (secKey === 'preferences') {
              const pref = nextSettings.preferences;
              const { error: prefError } = await supabase.from('settings').upsert({
                user_id: user.id,
                language: pref.language,
                default_model: pref.defaultModel,
                default_image_model: pref.defaultImageModel,
                chat_capabilities: pref.chatCapabilities
              });
              if (prefError) {
                console.warn("Could not save preferences to settings table (columns might be missing):", prefError.message);
              }
            }
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

  // AI provider keys never flow through updateSettingsSection — they're written
  // via a dedicated server route that returns only a masked value, never the raw key.
  const FIELD_BY_PROVIDER = {
    openrouter: 'openrouter_key',
    groq: 'groq_api_key',
    together: 'together_api_key',
  } as const;
  const MASK_KEY_BY_PROVIDER = {
    openrouter: 'openrouterKeyMasked',
    groq: 'groqKeyMasked',
    together: 'togetherKeyMasked',
  } as const;

  const saveAiKey = async (provider: keyof typeof FIELD_BY_PROVIDER, value: string) => {
    const res = await fetch(getApiUrl('/api/settings/ai-keys'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: FIELD_BY_PROVIDER[provider], value }),
    });
    if (!res.ok) return;
    const { masked } = await res.json();
    setSettings((prev) => ({ ...prev, ai: { ...prev.ai, [MASK_KEY_BY_PROVIDER[provider]]: masked } }));
  };

  const deleteAiKey = async (provider: keyof typeof FIELD_BY_PROVIDER) => {
    const res = await fetch(getApiUrl(`/api/settings/ai-keys?field=${FIELD_BY_PROVIDER[provider]}`), {
      method: 'DELETE',
    });
    if (!res.ok) return;
    setSettings((prev) => ({ ...prev, ai: { ...prev.ai, [MASK_KEY_BY_PROVIDER[provider]]: null } }));
  };

  return (
    <div className="flex h-full min-h-0 bg-background overflow-hidden">
      {/* Sidebar nav selector */}
      <SettingsNav section={section} onSectionChange={setSection} />

      {/* Main configuration settings layout panel */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        <div className={cn(
          "mx-auto flex flex-col gap-6 p-6",
          section === 'analytics' ? "max-w-5xl" : "max-w-2xl"
        )}>
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
              onSaveKey={saveAiKey}
              onDeleteKey={deleteAiKey}
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

          {section === 'preferences' && (
            <SettingsPreferencesSection
              data={settings.preferences}
              onChange={(updates) => updateSettingsSection('preferences', updates)}
              isSaving={!!savingSection.preferences}
            />
          )}

          {section === 'integrations' && (
            <SettingsIntegrationsSection />
          )}

          {section === 'analytics' && (
            <AnalyticsDashboard />
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsRoot;
