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
import { SettingsApiKeysSection } from './settings-api-keys-section';
import { SettingsCustomInstructionsSection, CustomInstructionsData } from './settings-custom-instructions-section';
import { SettingsSecuritySection } from './settings-security-section';
import { SettingsWorkspaceOverviewSection } from './settings-workspace-overview-section';
import { SettingsWorkspaceGeneralSection } from './settings-workspace-general-section';
import { SettingsBillingSection } from './settings-billing-section';
import { SettingsModelsSection, ModelsData } from './settings-models-section';
import { SettingsCustomizationsSection, CustomizationsData } from './settings-customizations-section';
import { SettingsWorkspaceApiSection } from './settings-workspace-api-section';
import { SettingsMembersSection } from './settings-members-section';
import { SettingsGroupsSection } from './settings-groups-section';
import { SettingsRolesSection } from './settings-roles-section';
import { SettingsGoalsSection } from './settings-goals-section';
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
  bio: string;
  avatarBase64: string;
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
  dailyEmailLimit: number;
}

interface AiData {
  tone: 'casual' | 'professional' | 'storytelling';
  customization: 'low' | 'medium' | 'high';
  autoInsights: boolean;
  autoFollowUps: boolean;
  aiProvider: 'anthropic' | 'openrouter' | 'groq' | 'together';
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

interface WorkspaceGeneralData {
  workspaceName: string;
  companyDescription: string;
  workspaceIconBase64: string;
}

interface AppSettings {
  profile: ProfileData;
  prospecting: ProspectingData;
  ai: AiData;
  notifications: NotificationsData;
  appearance: AppearanceData;
  preferences: PreferencesData;
  customInstructions: CustomInstructionsData;
  models: ModelsData;
  customizations: CustomizationsData;
  workspaceGeneral: WorkspaceGeneralData;
}

const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    firstName: 'Uprising',
    lastName: 'Studio',
    email: 'contact@uprising.studio',
    phone: '+1 (514) 123-4567',
    language: 'fr',
    timezone: 'America/Montreal',
    bio: '',
    avatarBase64: '',
  },
  prospecting: {
    niches: ['Boulangerie / Artisanat', 'Automobile', 'Restauration', 'Coiffure & Beauté'],
    cities: ['Montréal', 'Laval'],
    services: { website: true, seoAudit: true, acquisition: false },
    language: 'both',
    dailyEmailLimit: 50,
  },
  ai: {
    tone: 'casual',
    customization: 'medium',
    autoInsights: true,
    autoFollowUps: false,
    aiProvider: 'anthropic',
    openrouterKeyMasked: null,
    groqKeyMasked: null,
    togetherKeyMasked: null,
    aiModel: 'meta-llama/llama-3-8b-instruct:free',
  },
  notifications: {
    reminderOverdue: true,
    dailyDigest: true,
    weeklyReport: false,
    digestTime: '20:00',
  },
  appearance: {
    density: 'comfortable',
    theme: 'system',
  },
  preferences: {
    defaultModel: 'None',
    defaultImageModel: 'None',
    chatCapabilities: ['web_search', 'image_generation', 'data_analyst', 'canvas'],
    language: 'fr',
  },
  customInstructions: {
    active: true,
    aboutYou: '',
    modelInstructions: '',
  },
  models: {
    defaultChatModel: '',
    defaultImageModel: '',
  },
  customizations: {
    customColor: '#f54e00',
    backgroundImageBase64: '',
    showWorkspaceLogo: true,
    hideModelLogo: false,
    chatDisclaimer: '',
    infoBoxes: [],
  },
  workspaceGeneral: {
    workspaceName: '',
    companyDescription: '',
    workspaceIconBase64: '',
  },
};

export function SettingsRoot() {
  const [section, setSection] = useState<SettingsSection>('profile');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savingSection, setSavingSection] = useState<Record<string, boolean>>({});

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
            setSettings((prev) => ({
              ...prev,
              profile: {
                firstName: dbSettings.full_name || '',
                lastName: dbSettings.last_name || '',
                email: dbSettings.email || dbSettings.company_name || '',
                phone: dbSettings.phone || '',
                language: dbSettings.language || 'fr',
                timezone: dbSettings.timezone || 'Europe/Paris',
                bio: dbSettings.bio || '',
                avatarBase64: dbSettings.avatar_base64 || '',
              },
              prospecting: {
                niches: dbSettings.niches || [],
                cities: dbSettings.cities || [],
                services: { website: true, seoAudit: true, acquisition: false },
                language: 'both',
                dailyEmailLimit: dbSettings.daily_email_limit ?? 50,
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
                aiModel: dbSettings.ai_model || 'meta-llama/llama-3-8b-instruct:free',
              },
              notifications: {
                reminderOverdue: true,
                dailyDigest: true,
                weeklyReport: false,
                digestTime: '20:00',
              },
              appearance: {
                density: 'comfortable',
                theme: ((typeof window !== 'undefined' && localStorage.getItem('theme')) as AppearanceData['theme']) || 'system',
              },
              preferences: {
                defaultModel: dbSettings.default_model || 'None',
                defaultImageModel: dbSettings.default_image_model || 'None',
                chatCapabilities: dbSettings.chat_capabilities || ['web_search', 'image_generation', 'data_analyst', 'canvas'],
                language: (dbSettings.language as Locale) || 'fr',
              },
              customInstructions: {
                active: dbSettings.custom_instructions_enabled ?? true,
                aboutYou: dbSettings.custom_instructions_about || '',
                modelInstructions: dbSettings.custom_instructions_model || '',
              },
              workspaceGeneral: {
                workspaceName: dbSettings.workspace_name || dbSettings.company_name || '',
                companyDescription: dbSettings.company_description || '',
                workspaceIconBase64: dbSettings.workspace_icon_base64 || '',
              },
            }));
            return;
          }
        }
      } catch (e) {
        console.error('Failed to fetch settings from Supabase', e);
      }

      const stored = localStorage.getItem('minerva_reach_settings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.ai) {
            delete parsed.ai.openrouterKey;
            delete parsed.ai.groqKey;
            delete parsed.ai.togetherKey;
          }
          setSettings((prev) => ({ ...prev, ...parsed }));
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

  const updateSettingsSection = <K extends keyof AppSettings>(
    secKey: K,
    updates: Partial<AppSettings[K]>
  ) => {
    setSettings((prev) => {
      const newSectionData = { ...prev[secKey], ...updates } as AppSettings[K];
      const nextSettings = { ...prev, [secKey]: newSectionData };
      localStorage.setItem('minerva_reach_settings', JSON.stringify(nextSettings));

      // Broadcast avatar update so the topbar reflects it immediately
      if (secKey === 'profile' && nextSettings.profile.avatarBase64) {
        localStorage.setItem('minerva_avatar', nextSettings.profile.avatarBase64);
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'minerva_avatar',
          newValue: nextSettings.profile.avatarBase64,
          storageArea: localStorage,
        }));
      }

      const saveToDb = async () => {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error: baseError } = await supabase.from('settings').upsert({
              user_id: user.id,
              full_name: nextSettings.profile.firstName,
              last_name: nextSettings.profile.lastName,
              phone: nextSettings.profile.phone,
              company_name: nextSettings.profile.email,
              timezone: nextSettings.profile.timezone,
              bio: nextSettings.profile.bio,
              avatar_base64: nextSettings.profile.avatarBase64,
              niches: nextSettings.prospecting.niches,
              cities: nextSettings.prospecting.cities,
              daily_email_limit: nextSettings.prospecting.dailyEmailLimit,
              ai_tone: nextSettings.ai.tone === 'casual' ? 'Calme & Conseil' : nextSettings.ai.tone === 'professional' ? 'Direct & Closer' : 'Storytelling',
              ai_density: nextSettings.ai.customization === 'low' ? 'Standard' : nextSettings.ai.customization === 'medium' ? 'Personnalisé' : 'Profond',
              ai_provider: nextSettings.ai.aiProvider,
              ai_model: nextSettings.ai.aiModel,
            });
            if (baseError) console.error('Error saving base settings:', baseError.message);

            if (secKey === 'preferences') {
              const pref = nextSettings.preferences;
              const { error: prefError } = await supabase.from('settings').upsert({
                user_id: user.id,
                language: pref.language,
                default_model: pref.defaultModel,
                default_image_model: pref.defaultImageModel,
                chat_capabilities: pref.chatCapabilities,
              });
              if (prefError) console.warn('Could not save preferences:', prefError.message);
            }

            if (secKey === 'customInstructions') {
              const ci = nextSettings.customInstructions;
              const { error: ciError } = await supabase.from('settings').upsert({
                user_id: user.id,
                custom_instructions_enabled: ci.active,
                custom_instructions_about: ci.aboutYou,
                custom_instructions_model: ci.modelInstructions,
              });
              if (ciError) console.warn('Could not save custom instructions:', ciError.message);
            }

            if (secKey === 'workspaceGeneral') {
              const wg = nextSettings.workspaceGeneral;
              const { error: wgError } = await supabase.from('settings').upsert({
                user_id: user.id,
                workspace_name: wg.workspaceName,
                company_description: wg.companyDescription,
                workspace_icon_base64: wg.workspaceIconBase64,
              });
              if (wgError) console.warn('Could not save workspace general:', wgError.message);
            }
          }
        } catch (err) {
          console.error('Error upserting settings to Supabase:', err);
        }
      };
      saveToDb();

      return nextSettings;
    });

    setSavingSection((prev) => ({ ...prev, [secKey]: true }));
    setTimeout(() => {
      setSavingSection((prev) => ({ ...prev, [secKey]: false }));
    }, 800);
  };

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
      <SettingsNav section={section} onSectionChange={setSection} />

      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        <div className={cn(
          'mx-auto flex flex-col gap-6 p-6',
          section === 'analytics' ? 'max-w-5xl' : 'max-w-2xl'
        )}>
          {section === 'profile' && (
            <SettingsProfileSection
              data={settings.profile}
              onChange={(updates) => updateSettingsSection('profile', updates)}
              onSave={() => updateSettingsSection('profile', {})}
              isSaving={!!savingSection.profile}
            />
          )}

          {section === 'preferences' && (
            <SettingsPreferencesSection
              data={settings.preferences}
              onChange={(updates) => updateSettingsSection('preferences', updates)}
              isSaving={!!savingSection.preferences}
            />
          )}

          {section === 'custom_instructions' && (
            <SettingsCustomInstructionsSection
              data={settings.customInstructions}
              onChange={(updates) => updateSettingsSection('customInstructions', updates)}
              isSaving={!!savingSection.customInstructions}
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

          {section === 'security' && <SettingsSecuritySection />}

          {section === 'workspace_overview' && <SettingsWorkspaceOverviewSection />}

          {section === 'workspace_general' && (
            <SettingsWorkspaceGeneralSection
              data={settings.workspaceGeneral}
              onChange={(updates) => updateSettingsSection('workspaceGeneral', updates)}
              isSaving={!!savingSection.workspaceGeneral}
            />
          )}

          {section === 'billing' && <SettingsBillingSection />}

          {section === 'models' && (
            <SettingsModelsSection
              data={settings.models}
              onChange={(updates) => updateSettingsSection('models', updates)}
              isSaving={!!savingSection.models}
            />
          )}

          {section === 'customizations' && (
            <SettingsCustomizationsSection
              data={settings.customizations}
              onChange={(updates) => updateSettingsSection('customizations', updates)}
              isSaving={!!savingSection.customizations}
            />
          )}

          {section === 'workspace_api' && <SettingsWorkspaceApiSection />}

          {section === 'members' && <SettingsMembersSection />}

          {section === 'groups' && <SettingsGroupsSection />}

          {section === 'roles' && <SettingsRolesSection />}

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

          {section === 'api_keys' && (
            <SettingsApiKeysSection
              data={{
                openrouterKeyMasked: settings.ai.openrouterKeyMasked,
                groqKeyMasked: settings.ai.groqKeyMasked,
                togetherKeyMasked: settings.ai.togetherKeyMasked,
              }}
              onSaveKey={saveAiKey}
              onDeleteKey={deleteAiKey}
              isSaving={!!savingSection.ai}
            />
          )}

          {section === 'integrations' && <SettingsIntegrationsSection />}

          {section === 'analytics' && <AnalyticsDashboard />}

          {section === 'goals' && <SettingsGoalsSection />}
        </div>
      </div>
    </div>
  );
}

export default SettingsRoot;
