'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { Zap, Moon, Mail, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AutomationSettings {
  autoEnrichOnImport: boolean;
  autoEnrichScheduled: boolean;
  autoEmailOnEnrichment: boolean;
  autoTagReplies: boolean;
  autoEmailTemplateId: string;
  autoEmailDelayHours: number;
}

interface EmailTemplate {
  id: string;
  name: string;
}

const DEFAULT_AUTOMATIONS: AutomationSettings = {
  autoEnrichOnImport: false,
  autoEnrichScheduled: false,
  autoEmailOnEnrichment: false,
  autoTagReplies: true,
  autoEmailTemplateId: '',
  autoEmailDelayHours: 0,
};

export function SettingsAutomationsSection() {
  const [data, setData] = useState<AutomationSettings>(DEFAULT_AUTOMATIONS);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: settings }, { data: tpls }] = await Promise.all([
          supabase
            .from('settings')
            .select('auto_enrich_on_import, auto_enrich_scheduled, auto_email_on_enrichment, auto_tag_replies, auto_email_template_id, auto_email_delay_hours')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('email_templates')
            .select('id, name')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

        if (settings) {
          setData({
            autoEnrichOnImport: Boolean(settings.auto_enrich_on_import),
            autoEnrichScheduled: Boolean(settings.auto_enrich_scheduled),
            autoEmailOnEnrichment: Boolean(settings.auto_email_on_enrichment),
            autoTagReplies: settings.auto_tag_replies !== false,
            autoEmailTemplateId: settings.auto_email_template_id || '',
            autoEmailDelayHours: settings.auto_email_delay_hours ?? 0,
          });
        }

        if (tpls) setTemplates(tpls);
      } catch (err) {
        console.error('Failed to load automation settings', err);
      }
    };
    load();
  }, []);

  const save = async (updates: Partial<AutomationSettings>) => {
    const next = { ...data, ...updates };
    setData(next);
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('settings').upsert({
        user_id: user.id,
        auto_enrich_on_import: next.autoEnrichOnImport,
        auto_enrich_scheduled: next.autoEnrichScheduled,
        auto_email_on_enrichment: next.autoEmailOnEnrichment,
        auto_tag_replies: next.autoTagReplies,
        auto_email_template_id: next.autoEmailTemplateId || null,
        auto_email_delay_hours: next.autoEmailDelayHours,
      });
    } catch (err) {
      console.error('Failed to save automation settings', err);
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const toggles: {
    key: keyof Pick<AutomationSettings, 'autoEnrichOnImport' | 'autoEnrichScheduled' | 'autoEmailOnEnrichment' | 'autoTagReplies'>;
    icon: React.ElementType;
    label: string;
    desc: string;
  }[] = [
    {
      key: 'autoEnrichOnImport',
      icon: Zap,
      label: 'Enrichir automatiquement à l\'import',
      desc: 'Lance l\'enrichissement complet (contact + avancé) dès qu\'un lead est importé depuis la page Prospection.',
    },
    {
      key: 'autoEnrichScheduled',
      icon: Moon,
      label: 'Enrichissement nocturne (quotidien à 2h)',
      desc: 'Traite jusqu\'à 50 leads non enrichis ou enrichis il y a plus de 7 jours, chaque nuit à 2h du matin.',
    },
    {
      key: 'autoEmailOnEnrichment',
      icon: Mail,
      label: 'Envoyer l\'email de prospection après enrichissement',
      desc: 'Génère et envoie automatiquement un email personnalisé depuis le template sélectionné dès l\'enrichissement terminé (si un email de contact existe).',
    },
    {
      key: 'autoTagReplies',
      icon: Tag,
      label: 'Tagger les leads selon leurs réponses',
      desc: 'Applique automatiquement un tag (Intéressé, RDV demandé, Pas intéressé, etc.) quand une réponse email est classifiée par l\'IA.',
    },
  ];

  return (
    <SettingsSectionWrapper
      title="Automatisations"
      description="Configure les comportements automatiques de Minerva : enrichissement, envoi email, tagging des réponses."
      isSaving={isSaving}
    >
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-5">
          {toggles.map(({ key, icon: Icon, label, desc }) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <Icon className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
              <Switch
                checked={data[key] as boolean}
                onCheckedChange={(checked) => save({ [key]: checked })}
                className="shrink-0 data-[state=checked]:bg-[#059669]"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Email template selector — only shown when auto_email_on_enrichment is enabled */}
      {data.autoEmailOnEnrichment && (
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-[#059669]" />
              Configuration de l&apos;email automatique
            </h3>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Template email
              </label>
              <Select
                value={data.autoEmailTemplateId || '__none__'}
                onValueChange={(v) => save({ autoEmailTemplateId: v === '__none__' ? '' : v })}
              >
                <SelectTrigger className="h-8 text-xs bg-card">
                  <SelectValue placeholder="Sélectionner un template…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">
                    — Générer automatiquement par l&apos;IA —
                  </SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Aucun template disponible. L&apos;IA générera le contenu automatiquement.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Délai avant envoi
              </label>
              <Select
                value={String(data.autoEmailDelayHours)}
                onValueChange={(v) => save({ autoEmailDelayHours: Number(v) })}
              >
                <SelectTrigger className="h-8 text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="text-xs">Immédiatement après enrichissement</SelectItem>
                  <SelectItem value="1" className="text-xs">1 heure après</SelectItem>
                  <SelectItem value="2" className="text-xs">2 heures après</SelectItem>
                  <SelectItem value="6" className="text-xs">6 heures après</SelectItem>
                  <SelectItem value="12" className="text-xs">12 heures après</SelectItem>
                  <SelectItem value="24" className="text-xs">24 heures après</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </SettingsSectionWrapper>
  );
}

export default SettingsAutomationsSection;
