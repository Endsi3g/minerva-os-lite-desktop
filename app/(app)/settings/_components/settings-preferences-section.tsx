'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from 'next-themes';
import { Locale } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Check, Globe, Image as ImageIcon, Code, PenTool, Brain, Monitor, Sun, Moon } from 'lucide-react';

export interface PreferencesData {
  defaultModel: string;
  defaultImageModel: string;
  chatCapabilities: string[];
  language: Locale;
}

interface SettingsPreferencesSectionProps {
  data: PreferencesData;
  onChange: (updates: Partial<PreferencesData>) => void;
  isSaving: boolean;
}

export function SettingsPreferencesSection({ data, onChange, isSaving }: SettingsPreferencesSectionProps) {
  const { t, setLocale } = useLanguage();
  const { theme, setTheme } = useTheme();

  const defaultModels = [
    { id: 'None', name: 'None' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Anthropic Claude 3.5 Sonnet' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8B (Free)' },
    { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)' }
  ];

  const imageModels = [
    { id: 'None', name: 'None' },
    { id: 'openai/dall-e-3', name: 'DALL-E 3' },
    { id: 'stability-ai/stable-diffusion-xl', name: 'Stable Diffusion XL' },
    { id: 'black-forest-labs/flux-1-dev', name: 'FLUX.1' }
  ];

  const capabilities = [
    { id: 'web_search', label: t('pref.cap_web_search'), icon: Globe },
    { id: 'image_generation', label: t('pref.cap_image_gen'), icon: ImageIcon },
    { id: 'data_analyst', label: t('pref.cap_data_analyst'), icon: Code },
    { id: 'canvas', label: t('pref.cap_canvas'), icon: PenTool },
    { id: 'chat_memory', label: t('pref.cap_chat_memory'), icon: Brain }
  ];

  const toggleCapability = (id: string) => {
    const active = data.chatCapabilities || [];
    if (active.includes(id)) {
      onChange({ chatCapabilities: active.filter(c => c !== id) });
    } else {
      onChange({ chatCapabilities: [...active, id] });
    }
  };

  const handleLanguageChange = (lang: Locale) => {
    onChange({ language: lang });
    setLocale(lang);
  };

  return (
    <SettingsSectionWrapper
      title={t('pref.title')}
      description={t('pref.subtitle')}
      isSaving={isSaving}
    >
      {/* Model Configurations */}
      <Card className="border border-border bg-card">
        <CardContent className="p-6 space-y-6">
          
          {/* Default Model */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-md">
              <label className="text-xs font-bold text-foreground tracking-wide block">
                {t('pref.default_model')}
              </label>
              <p className="text-[10px] text-muted-foreground leading-normal">
                {t('pref.default_model_desc')}
              </p>
            </div>
            <div className="w-56 shrink-0">
              <Select 
                value={data.defaultModel || 'None'} 
                onValueChange={(val) => onChange({ defaultModel: val })}
              >
                <SelectTrigger className="text-xs bg-card border-border/80 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-3.5 h-3.5 flex items-center justify-center border border-muted-foreground/30 rounded-[4px] text-[8px] font-bold">▢</span>
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {defaultModels.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Default Image Generation Model */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-md">
              <label className="text-xs font-bold text-foreground tracking-wide block">
                {t('pref.default_image_model')}
              </label>
              <p className="text-[10px] text-muted-foreground leading-normal">
                {t('pref.default_image_model_desc')}
              </p>
            </div>
            <div className="w-56 shrink-0">
              <Select 
                value={data.defaultImageModel || 'None'} 
                onValueChange={(val) => onChange({ defaultImageModel: val })}
              >
                <SelectTrigger className="text-xs bg-card border-border/80 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-3.5 h-3.5 flex items-center justify-center border border-muted-foreground/30 rounded-[4px] text-[8px] font-bold">▢</span>
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {imageModels.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Chat Capabilities */}
      <Card className="border border-border bg-card">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground tracking-wide block">
              {t('pref.chat_capabilities')}
            </label>
            <p className="text-[10px] text-muted-foreground leading-normal">
              {t('pref.chat_capabilities_desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {capabilities.map((cap) => {
              const isChecked = (data.chatCapabilities || []).includes(cap.id);
              return (
                <button
                  key={cap.id}
                  type="button"
                  onClick={() => toggleCapability(cap.id)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-150 group",
                    isChecked
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/20"
                      : "border-border/60 bg-card hover:border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <cap.icon className={cn("w-4 h-4 shrink-0 transition-colors", isChecked ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    <span>{cap.label}</span>
                  </span>
                  
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                    isChecked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border bg-card group-hover:border-muted-foreground"
                  )}>
                    {isChecked && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card className="border border-border bg-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-md">
              <label className="text-xs font-bold text-foreground tracking-wide block">
                {t('pref.language')}
              </label>
              <p className="text-[10px] text-muted-foreground leading-normal">
                {t('pref.language_desc')}
              </p>
            </div>
            <div className="w-56 shrink-0">
              <Select 
                value={data.language || 'fr'} 
                onValueChange={(val: Locale) => handleLanguageChange(val)}
              >
                <SelectTrigger className="text-xs bg-card border-border/80 flex items-center justify-between">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr" className="text-xs flex items-center justify-between w-full">
                    <span>Français</span>
                  </SelectItem>
                  <SelectItem value="en" className="text-xs flex items-center justify-between w-full">
                    <span>English</span>
                  </SelectItem>
                  <SelectItem value="de" className="text-xs flex items-center justify-between w-full">
                    <span>Deutsch</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Cards (Langdock Switcher style) */}
      <Card className="border border-border bg-card">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground tracking-wide block">
              {t('pref.theme')}
            </label>
            <p className="text-[10px] text-muted-foreground leading-normal">
              {t('pref.theme_desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            
            {/* System Option */}
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={cn(
                "relative text-left rounded-xl border overflow-hidden p-1 flex flex-col gap-2 transition-all duration-200 bg-[#fbfbf9]/60 dark:bg-neutral-900/60",
                theme === 'system' 
                  ? "border-primary ring-1 ring-primary/30" 
                  : "border-border/60 hover:border-border/100"
              )}
            >
              <div className="aspect-[1.8/1] rounded-lg border border-border bg-white dark:bg-neutral-950 overflow-hidden relative p-1.5 flex gap-1.5">
                {/* Sidebar mock */}
                <div className="w-8 shrink-0 h-full border-r border-[#e5e5e0] dark:border-neutral-800 bg-[#f4f4f3] dark:bg-neutral-900 rounded-l flex flex-col gap-1 p-1">
                  <div className="w-4 h-1.5 bg-[#10b981]/20 rounded-full" />
                  <div className="w-5 h-1 bg-border rounded-full" />
                  <div className="w-3 h-1 bg-border rounded-full" />
                </div>
                {/* Content mock */}
                <div className="flex-1 h-full flex flex-col gap-1 pt-1.5 px-0.5">
                  <div className="w-10 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
                  <div className="w-14 h-1.5 bg-neutral-100 dark:bg-neutral-900 rounded-full" />
                  <div className="w-8 h-1.5 bg-neutral-100 dark:bg-neutral-900 rounded-full" />
                </div>
              </div>
              <div className="px-3 pb-2.5 pt-1.5 flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{t('pref.theme_system')}</span>
                </span>
                {theme === 'system' && <Check className="w-3.5 h-3.5 text-primary stroke-[3px]" />}
              </div>
            </button>

            {/* Light Option */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={cn(
                "relative text-left rounded-xl border overflow-hidden p-1 flex flex-col gap-2 transition-all duration-200 bg-white",
                theme === 'light' 
                  ? "border-primary ring-1 ring-primary/30" 
                  : "border-border/60 hover:border-border/100"
              )}
            >
              <div className="aspect-[1.8/1] rounded-lg border border-border/80 bg-white overflow-hidden relative p-1.5 flex gap-1.5">
                {/* Sidebar mock */}
                <div className="w-8 shrink-0 h-full border-r border-[#e5e5e0] bg-[#f4f4f3] rounded-l flex flex-col gap-1 p-1">
                  <div className="w-4 h-1.5 bg-[#10b981]/20 rounded-full" />
                  <div className="w-5 h-1 bg-border rounded-full" />
                  <div className="w-3 h-1 bg-border rounded-full" />
                </div>
                {/* Content mock */}
                <div className="flex-1 h-full flex flex-col gap-1 pt-1.5 px-0.5">
                  <div className="w-10 h-2 bg-neutral-200 rounded-full" />
                  <div className="w-14 h-1.5 bg-neutral-100 rounded-full" />
                  <div className="w-8 h-1.5 bg-neutral-100 rounded-full" />
                </div>
              </div>
              <div className="px-3 pb-2.5 pt-1.5 flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{t('pref.theme_light')}</span>
                </span>
                {theme === 'light' && <Check className="w-3.5 h-3.5 text-primary stroke-[3px]" />}
              </div>
            </button>

            {/* Dark Option */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={cn(
                "relative text-left rounded-xl border overflow-hidden p-1 flex flex-col gap-2 transition-all duration-200 bg-neutral-950",
                theme === 'dark' 
                  ? "border-primary ring-1 ring-primary/30" 
                  : "border-border/60 hover:border-border/100"
              )}
            >
              <div className="aspect-[1.8/1] rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden relative p-1.5 flex gap-1.5">
                {/* Sidebar mock */}
                <div className="w-8 shrink-0 h-full border-r border-neutral-900 bg-neutral-900 rounded-l flex flex-col gap-1 p-1">
                  <div className="w-4 h-1.5 bg-[#10b981]/30 rounded-full" />
                  <div className="w-5 h-1 bg-neutral-800 rounded-full" />
                  <div className="w-3 h-1 bg-neutral-800 rounded-full" />
                </div>
                {/* Content mock */}
                <div className="flex-1 h-full flex flex-col gap-1 pt-1.5 px-0.5">
                  <div className="w-10 h-2 bg-neutral-800 rounded-full" />
                  <div className="w-14 h-1.5 bg-neutral-900 rounded-full" />
                  <div className="w-8 h-1.5 bg-neutral-900 rounded-full" />
                </div>
              </div>
              <div className="px-3 pb-2.5 pt-1.5 flex items-center justify-between text-xs font-semibold text-white">
                <span className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{t('pref.theme_dark')}</span>
                </span>
                {theme === 'dark' && <Check className="w-3.5 h-3.5 text-primary stroke-[3px]" />}
              </div>
            </button>

          </div>
        </CardContent>
      </Card>
    </SettingsSectionWrapper>
  );
}

export default SettingsPreferencesSection;
