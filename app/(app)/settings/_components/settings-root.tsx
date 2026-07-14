'use client';

import React, { useState, useEffect } from 'react';
import { SettingsNav, SettingsSection } from './settings-nav';
import { SettingsProfileSection } from './settings-profile-section';
import { SettingsAiSection, type AgentAutonomy } from './settings-ai-section';
import { SettingsAppearanceSection } from './settings-appearance-section';
import { SettingsIntegrationsSection } from './settings-integrations-section';
import { SettingsWorkspaceGeneralSection } from './settings-workspace-general-section';
import { SettingsGoalsSection } from './settings-goals-section';
import SettingsAgencySection from './settings-agency-section';
import { SettingsAutomationsSection } from './settings-automations-section';
import { SettingsDiagnosticsIA } from './settings-diagnostics-ia';
import { SettingsMonitoring } from './settings-monitoring';
import { SettingsMinervaAiSection } from './settings-minerva-ai-section';
import { SettingsBillingSection } from './settings-billing-section';
import { SettingsSecuritySection } from './settings-security-section';
import { SettingsNotificationsSection } from './settings-notifications-section';
import { SettingsProspectingSection } from './settings-prospecting-section';
import { SettingsRolesSection } from './settings-roles-section';
import { SettingsApiKeysSection } from './settings-api-keys-section';
import { SettingsCustomizationsSection, type CustomizationsData } from './settings-customizations-section';
import { SettingsCustomInstructionsSection, type CustomInstructionsData } from './settings-custom-instructions-section';
import { SettingsWorkspaceApiSection } from './settings-workspace-api-section';
import { SettingsWorkspaceOverviewSection } from './settings-workspace-overview-section';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';

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

interface AiData {
  tone: 'casual' | 'professional' | 'storytelling';
  customization: 'low' | 'medium' | 'high';
  autoInsights: boolean;
  autoFollowUps: boolean;
  aiProvider: 'anthropic' | 'openrouter';
  openrouterKeyMasked: string | null;
  aiModel: string;
  agentAutonomy: AgentAutonomy;
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
  ai: AiData;
  appearance: AppearanceData;
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
  ai: {
    tone: 'casual',
    customization: 'medium',
    autoInsights: true,
    autoFollowUps: false,
    aiProvider: 'anthropic',
    openrouterKeyMasked: null,
    aiModel: 'meta-llama/llama-3.3-70b-instruct:free',
    agentAutonomy: {
      tasks: 'suggest', pipeline: 'suggest', sequences: 'off', emails: 'prepare', field: 'suggest',
      outreach_draft: 'prepare', outreach_initial_send: 'act_with_approval',
      outreach_followup: 'auto', outreach_reply: 'prepare',
      outreach_sequence_pause: 'auto', outreach_pipeline_update: 'act_with_approval',
    },
  },
  appearance: {
    density: 'comfortable',
    theme: 'system',
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

  const [notificationsData, setNotificationsData] = useState({
    reminderOverdue: true,
    dailyDigest: true,
    weeklyReport: false,
    digestTime: '08:00',
  });

  const [prospectingData, setProspectingData] = useState({
    niches: [] as string[],
    cities: [] as string[],
    services: { website: true, seoAudit: true, acquisition: false },
    language: 'fr',
    dailyEmailLimit: 50,
  });

  const [customizationsData, setCustomizationsData] = useState<CustomizationsData>({
    customColor: '#059669',
    backgroundImageBase64: '',
    showWorkspaceLogo: true,
    hideModelLogo: false,
    chatDisclaimer: '',
    infoBoxes: [],
  });

  const [customInstructionsData, setCustomInstructionsData] = useState<CustomInstructionsData>({
    active: false,
    aboutYou: '',
    modelInstructions: '',
  });

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
              ai: {
                tone: dbSettings.ai_tone === 'Direct & Closer' ? 'professional' : dbSettings.ai_tone === 'Storytelling' ? 'storytelling' : 'casual',
                customization: dbSettings.ai_density === 'Standard' ? 'low' : dbSettings.ai_density === 'Profond' ? 'high' : 'medium',
                autoInsights: dbSettings.auto_insights ?? true,
                autoFollowUps: dbSettings.auto_follow_ups ?? false,
                // Purement informatif ici — settings-minerva-ai-section.tsx est la
                // seule source de vérité pour ai_provider/ai_model (voir saveToDb
                // ci-dessous). Ne PAS forcer à 'anthropic' quand la vraie valeur est
                // 'cloudflare' ou autre chose : ça ne sert plus qu'à l'affichage.
                aiProvider: (dbSettings.ai_provider || 'anthropic') as 'anthropic' | 'openrouter',
                openrouterKeyMasked: null,
                aiModel: dbSettings.ai_model || 'meta-llama/llama-3.3-70b-instruct:free',
                agentAutonomy: dbSettings.agent_autonomy ?? {
                  tasks: 'suggest', pipeline: 'suggest', sequences: 'off', emails: 'prepare', field: 'suggest',
                  outreach_draft: 'prepare', outreach_initial_send: 'act_with_approval',
                  outreach_followup: 'auto', outreach_reply: 'prepare',
                  outreach_sequence_pause: 'auto', outreach_pipeline_update: 'act_with_approval',
                },
              },
              appearance: {
                density: 'comfortable',
                theme: ((typeof window !== 'undefined' && localStorage.getItem('theme')) as AppearanceData['theme']) || 'system',
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
          }
          const { profile, ai, appearance, workspaceGeneral } = parsed;
          setSettings((prev) => ({ ...prev, ...(profile && { profile }), ...(ai && { ai }), ...(appearance && { appearance }), ...(workspaceGeneral && { workspaceGeneral }) }));
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
          ai: { ...prev.ai, openrouterKeyMasked: keys.openrouterKeyMasked },
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

      // Broadcast avatar, name and company updates so the topbar reflects it immediately
      if (secKey === 'profile') {
        if (nextSettings.profile.avatarBase64) {
          localStorage.setItem('minerva_avatar', nextSettings.profile.avatarBase64);
        } else {
          localStorage.removeItem('minerva_avatar');
        }
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'minerva_avatar',
          newValue: nextSettings.profile.avatarBase64 || null,
          storageArea: localStorage,
        }));

        const fullName = `${nextSettings.profile.firstName} ${nextSettings.profile.lastName}`.trim();
        localStorage.setItem('minerva_profile_name', fullName);
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'minerva_profile_name',
          newValue: fullName,
          storageArea: localStorage,
        }));
      }

      if (secKey === 'workspaceGeneral') {
        localStorage.setItem('minerva_company_name', nextSettings.workspaceGeneral.workspaceName);
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'minerva_company_name',
          newValue: nextSettings.workspaceGeneral.workspaceName,
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
              full_name: `${nextSettings.profile.firstName} ${nextSettings.profile.lastName}`.trim(),
              last_name: nextSettings.profile.lastName,
              phone: nextSettings.profile.phone,
              email: nextSettings.profile.email,
              timezone: nextSettings.profile.timezone,
              bio: nextSettings.profile.bio,
              avatar_base64: nextSettings.profile.avatarBase64,
              ai_tone: nextSettings.ai.tone === 'casual' ? 'Calme & Conseil' : nextSettings.ai.tone === 'professional' ? 'Direct & Closer' : 'Storytelling',
              ai_density: nextSettings.ai.customization === 'low' ? 'Standard' : nextSettings.ai.customization === 'medium' ? 'Personnalisé' : 'Profond',
              // ai_provider / ai_model NE SONT PLUS écrits ici volontairement.
              // Cette section réécrivait ces deux colonnes à CHAQUE sauvegarde
              // de N'IMPORTE QUEL onglet (profil, apparence, workspace...), avec
              // une valeur locale qui coerçait silencieusement tout provider ≠
              // 'openrouter' vers 'anthropic' (donc 'cloudflare' → 'anthropic').
              // Un utilisateur sélectionnant Kimi K2 (Cloudflare) dans l'onglet
              // Minerva AI puis changeant simplement sa photo de profil voyait
              // son choix silencieusement écrasé. settings-minerva-ai-section.tsx
              // est désormais le seul propriétaire de ces deux colonnes.
              auto_insights: nextSettings.ai.autoInsights,
              auto_follow_ups: nextSettings.ai.autoFollowUps,
              agent_autonomy: nextSettings.ai.agentAutonomy,
            });
            if (baseError) console.error('Error saving base settings:', baseError.message);

            if (secKey === 'workspaceGeneral') {
              const wg = nextSettings.workspaceGeneral;
              const { error: wgError } = await supabase.from('settings').upsert({
                user_id: user.id,
                workspace_name: wg.workspaceName,
                company_name: wg.workspaceName,
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

  const saveAiKey = async (_provider: 'openrouter', value: string) => {
    const res = await fetch(getApiUrl('/api/settings/ai-keys'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'openrouter_key', value }),
    });
    if (!res.ok) return;
    const { masked } = await res.json();
    setSettings((prev) => ({ ...prev, ai: { ...prev.ai, openrouterKeyMasked: masked } }));
  };

  const deleteAiKey = async (_provider: 'openrouter') => {
    const res = await fetch(getApiUrl('/api/settings/ai-keys?field=openrouter_key'), { method: 'DELETE' });
    if (!res.ok) return;
    setSettings((prev) => ({ ...prev, ai: { ...prev.ai, openrouterKeyMasked: null } }));
  };

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0 bg-[#fafaf8] overflow-hidden">
      <SettingsNav section={section} onSectionChange={setSection} />

      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        <div className="mx-auto flex flex-col gap-6 p-4 sm:p-6 max-w-2xl w-full">
          {section === 'profile' && (
            <SettingsProfileSection
              data={settings.profile}
              onChange={(updates) => updateSettingsSection('profile', updates)}
              onSave={() => updateSettingsSection('profile', {})}
              isSaving={!!savingSection.profile}
            />
          )}

          {section === 'appearance' && (
            <SettingsAppearanceSection
              data={settings.appearance}
              onChange={(updates) => updateSettingsSection('appearance', updates)}
              isSaving={!!savingSection.appearance}
            />
          )}

          {section === 'notifications' && (
            <SettingsNotificationsSection
              data={notificationsData}
              onChange={(updates) => setNotificationsData((prev) => ({ ...prev, ...updates }))}
              isSaving={false}
            />
          )}

          {section === 'security' && <SettingsSecuritySection />}

          {section === 'workspace_general' && (
            <SettingsWorkspaceGeneralSection
              data={settings.workspaceGeneral}
              onChange={(updates) => updateSettingsSection('workspaceGeneral', updates)}
              isSaving={!!savingSection.workspaceGeneral}
            />
          )}

          {section === 'workspace_overview' && <SettingsWorkspaceOverviewSection />}

          {section === 'workspace_api' && <SettingsWorkspaceApiSection />}

          {section === 'ai' && (
            <SettingsAiSection
              data={settings.ai}
              onChange={(updates) => updateSettingsSection('ai', updates)}
              onSaveKey={saveAiKey}
              onDeleteKey={deleteAiKey}
              isSaving={!!savingSection.ai}
            />
          )}

          {section === 'minerva_ai' && <SettingsMinervaAiSection />}

          {section === 'api_keys' && (
            <SettingsApiKeysSection
              data={{ openrouterKeyMasked: settings.ai.openrouterKeyMasked }}
              onSaveKey={saveAiKey}
              onDeleteKey={deleteAiKey}
              isSaving={!!savingSection.ai}
            />
          )}

          {section === 'diagnostics' && <SettingsDiagnosticsIA />}

          {section === 'monitoring' && <SettingsMonitoring />}

          {section === 'automations' && <SettingsAutomationsSection />}

          {section === 'prospecting' && (
            <SettingsProspectingSection
              data={prospectingData}
              onChange={(updates) => setProspectingData((prev) => ({ ...prev, ...updates }))}
              isSaving={false}
            />
          )}

          {section === 'custom_instructions' && (
            <SettingsCustomInstructionsSection
              data={customInstructionsData}
              onChange={(updates) => setCustomInstructionsData((prev) => ({ ...prev, ...updates }))}
              isSaving={false}
            />
          )}

          {section === 'customizations' && (
            <SettingsCustomizationsSection
              data={customizationsData}
              onChange={(updates) => setCustomizationsData((prev) => ({ ...prev, ...updates }))}
              isSaving={false}
            />
          )}

          {section === 'roles' && <SettingsRolesSection />}

          {section === 'agency' && <SettingsAgencySection />}

          {section === 'integrations' && <SettingsIntegrationsSection />}

          {section === 'goals' && <SettingsGoalsSection />}

          {section === 'billing' && <SettingsBillingSection />}
        </div>
      </div>
    </div>
  );
}

export default SettingsRoot;
