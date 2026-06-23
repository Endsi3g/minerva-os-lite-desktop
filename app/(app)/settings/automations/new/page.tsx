'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Check, Loader2, Zap, Clock, MessageSquare, TrendingUp, Webhook, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { cn } from '@/lib/utils';
import type { TriggerType, Condition, Action } from '@/lib/automations-engine';

type Step = 'trigger' | 'conditions' | 'actions' | 'review';

const STEPS: Step[] = ['trigger', 'conditions', 'actions', 'review'];

export default function NewAutomationPage() {
  const router = useRouter();
  const { activeWorkspace } = useReach();
  const { t, locale } = useLanguage();

  const [step, setStep] = useState<Step>('trigger');
  const [triggerType, setTriggerType] = useState<TriggerType | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<Array<{ type: Action['type']; payload: Record<string, any> }>>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const TRIGGERS = useMemo(() => {
    return [
      { key: 'time_passed' as TriggerType, label: locale === 'en' ? 'Delay elapsed' : locale === 'de' ? 'Frist abgelaufen' : 'Délai écoulé', desc: locale === 'en' ? 'Triggers after X days of inactivity on a lead.' : locale === 'de' ? 'Wird nach X Tagen Inaktivität bei einem Lead ausgelöst.' : 'Se déclenche après X jours sans activité sur un lead.', icon: <Clock className="h-4 w-4" /> },
      { key: 'lead_replied' as TriggerType, label: locale === 'en' ? 'Lead replied' : locale === 'de' ? 'Lead hat geantwortet' : 'Lead a répondu', desc: locale === 'en' ? 'A lead replies to an email or message.' : locale === 'de' ? 'Ein Lead antwortet auf eine E-Mail oder Nachricht.' : 'Un lead répond à un email ou message.', icon: <MessageSquare className="h-4 w-4" /> },
      { key: 'intent_increased' as TriggerType, label: locale === 'en' ? 'Intent increased' : locale === 'de' ? 'Kaufabsicht gestiegen' : 'Hausse d\'intention', desc: locale === 'en' ? 'A lead\'s intent score increases.' : locale === 'de' ? 'Der Intent-Score eines Leads steigt.' : 'Le score d\'intention d\'un lead augmente.', icon: <TrendingUp className="h-4 w-4" /> },
      { key: 'lead_updated' as TriggerType, label: locale === 'en' ? 'Lead updated' : locale === 'de' ? 'Lead aktualisiert' : 'Lead mis à jour', desc: locale === 'en' ? 'A lead field is modified.' : locale === 'de' ? 'Ein Feld des Leads wird geändert.' : 'Un champ du lead est modifié.', icon: <Zap className="h-4 w-4" /> },
      { key: 'webhook_received' as TriggerType, label: locale === 'en' ? 'Webhook received' : locale === 'de' ? 'Webhook erhalten' : 'Webhook reçu', desc: locale === 'en' ? 'An external webhook call triggers the automation.' : locale === 'de' ? 'Ein externer Webhook-Aufruf löst die Automatisierung aus.' : 'Un appel webhook externe déclenche l\'automation.', icon: <Webhook className="h-4 w-4" /> },
    ];
  }, [locale]);

  const CONDITION_FIELDS = useMemo(() => {
    return [
      { key: 'status', label: locale === 'en' ? 'Status' : locale === 'de' ? 'Status' : 'Statut' },
      { key: 'temperature', label: locale === 'en' ? 'Temperature' : locale === 'de' ? 'Temperatur' : 'Température' },
      { key: 'score', label: 'Score' },
      { key: 'niche', label: 'Niche' },
      { key: 'website', label: locale === 'en' ? 'Website' : locale === 'de' ? 'Webseite' : 'Site web' },
      { key: 'contactEmail', label: 'Email' },
      { key: 'rating', label: locale === 'en' ? 'GMB Rating' : locale === 'de' ? 'GMB-Bewertung' : 'Note GMB' },
    ];
  }, [locale]);

  const CONDITION_OPERATORS = useMemo(() => {
    return [
      { key: 'equals', label: locale === 'en' ? 'equals' : locale === 'de' ? 'ist gleich' : 'est égal à' },
      { key: 'not_equals', label: locale === 'en' ? 'does not equal' : locale === 'de' ? 'ist ungleich' : 'est différent de' },
      { key: 'contains', label: locale === 'en' ? 'contains' : locale === 'de' ? 'enthält' : 'contient' },
      { key: 'greater_than', label: locale === 'en' ? 'is greater than' : locale === 'de' ? 'ist größer als' : 'est supérieur à' },
      { key: 'less_than', label: locale === 'en' ? 'is less than' : locale === 'de' ? 'ist kleiner als' : 'est inférieur à' },
      { key: 'is_empty', label: locale === 'en' ? 'is empty' : locale === 'de' ? 'ist leer' : 'est vide' },
      { key: 'is_not_empty', label: locale === 'en' ? 'is not empty' : locale === 'de' ? 'ist nicht leer' : 'n\'est pas vide' },
    ];
  }, [locale]);

  const ACTIONS = useMemo(() => {
    return [
      { key: 'notify' as Action['type'], label: locale === 'en' ? 'Send a notification' : locale === 'de' ? 'Benachrichtigung senden' : 'Envoyer une notification', desc: locale === 'en' ? 'Notifies the user in-app and on-device.' : locale === 'de' ? 'Benachrichtigt den Benutzer in der App und auf dem Gerät.' : 'Notifie l\'utilisateur dans l\'app et sur l\'appareil.', fields: ['message'] },
      { key: 'create_task' as Action['type'], label: locale === 'en' ? 'Create a task' : locale === 'de' ? 'Aufgabe erstellen' : 'Créer une tâche', desc: locale === 'en' ? 'Automatically adds a follow-up task.' : locale === 'de' ? 'Fügt automatisch eine Folgeaufgabe hinzu.' : 'Ajoute automatiquement une tâche de suivi.', fields: ['title', 'dueInDays'] },
      { key: 'update_lead_status' as Action['type'], label: locale === 'en' ? 'Update status' : locale === 'de' ? 'Status aktualisieren' : 'Mettre à jour le statut', desc: locale === 'en' ? 'Changes lead status automatically.' : locale === 'de' ? 'Ändert den Lead-Status automatisch.' : 'Change le statut du lead automatiquement.', fields: ['status'] },
      { key: 'send_email' as Action['type'], label: locale === 'en' ? 'Send an email (soon)' : locale === 'de' ? 'E-Mail senden (in Kürze)' : 'Envoyer un email (bientôt)', desc: locale === 'en' ? 'Sends an email via Gmail.' : locale === 'de' ? 'Sendet eine E-Mail über Gmail.' : 'Envoie un email via Gmail.', fields: ['templateId'] },
    ];
  }, [locale]);

  const StepIndicator = ({ current, steps }: { current: Step; steps: Step[] }) => {
    const labels: Record<Step, string> = {
      trigger: t('automations.step_trigger'),
      conditions: t('automations.step_conditions'),
      actions: t('automations.step_actions'),
      review: t('automations.step_confirm'),
    };
    const idx = steps.indexOf(current);
    return (
      <div className="flex items-center gap-0 relative z-10">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={cn(
              'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider',
              s === current ? 'text-[#26251e]' : i < idx ? 'text-[#059669]' : 'text-[#b0b0a8]'
            )}>
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black',
                s === current ? 'bg-[#26251e] text-white' : i < idx ? 'bg-[#059669] text-white' : 'bg-[#e5e5e0] text-[#7a7a76]'
              )}>
                {i < idx ? <Check className="h-2.5 w-2.5" /> : i + 1}
              </div>
              <span className="hidden sm:inline">{labels[s]}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-px flex-1 mx-2 min-w-4', i < idx ? 'bg-[#059669]' : 'bg-[#e5e5e0]')} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const addCondition = () => {
    setConditions(prev => [...prev, { field: 'status', operator: 'equals', value: '' }]);
  };

  const updateCondition = (i: number, partial: Partial<Condition>) => {
    setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, ...partial } : c));
  };

  const removeCondition = (i: number) => {
    setConditions(prev => prev.filter((_, idx) => idx !== i));
  };

  const addAction = (type: Action['type']) => {
    setActions(prev => [...prev, { type, payload: {} }]);
  };

  const updateActionPayload = (i: number, key: string, value: string) => {
    setActions(prev => prev.map((a, idx) => idx === i ? { ...a, payload: { ...a.payload, [key]: value } } : a));
  };

  const removeAction = (i: number) => {
    setActions(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!activeWorkspace || !triggerType || !name.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from('automations').insert({
        workspace_id: activeWorkspace.id,
        name: name.trim(),
        trigger_type: triggerType,
        conditions: conditions,
        actions: actions,
        is_active: true,
      });
      setSaved(true);
      setTimeout(() => router.push('/settings/automations'), 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 'trigger') return triggerType !== null;
    if (step === 'conditions') return true; // optional
    if (step === 'actions') return actions.length > 0;
    if (step === 'review') return name.trim().length > 0;
    return false;
  };

  const next = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const prev = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  return (
    <div className="h-full overflow-y-auto bg-white text-[#26251e] font-sans selection:bg-[#059669]/10 relative animate-page-enter">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
      
      <div className="max-w-2xl mx-auto px-8 py-10 space-y-8 relative z-10">

        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <button onClick={() => router.back()} className="p-2 rounded-lg border border-border hover:bg-[#f4f4f3] transition-colors bg-white text-[#26251e] cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#26251e]">{t('automations.new_title')}</h1>
            <p className="text-xs text-[#807d72] mt-0.5">{locale === 'en' ? 'Set up a trigger, conditions, and actions.' : locale === 'de' ? 'Richten Sie einen Auslöser, Bedingungen und Aktionen ein.' : 'Configurez un déclencheur, des conditions et des actions.'}</p>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} steps={STEPS} />

        {/* ── Step: Trigger ── */}
        {step === 'trigger' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#807d72]">{locale === 'en' ? 'When to trigger this rule?' : locale === 'de' ? 'Wann soll diese Regel ausgelöst werden?' : 'Quand déclencher cette règle ?'}</h2>
            <div className="space-y-2">
              {TRIGGERS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTriggerType(t.key)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 bg-white cursor-pointer',
                    triggerType === t.key ? 'border-[#059669] bg-[#059669]/5' : 'border-border hover:border-neutral-300'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border border-border', triggerType === t.key ? 'bg-[#059669] text-white border-transparent' : 'bg-[#f4f4f3] text-[#7a7a76]')}>
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#26251e]">{t.label}</p>
                    <p className="text-[11px] text-[#807d72] mt-0.5 leading-relaxed">{t.desc}</p>
                  </div>
                  {triggerType === t.key && <Check className="h-4 w-4 text-[#059669] shrink-0 mt-1" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Conditions ── */}
        {step === 'conditions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#807d72]">{locale === 'en' ? 'Conditions (optional)' : locale === 'de' ? 'Bedingungen (optional)' : 'Conditions (optionnel)'}</h2>
              <button onClick={addCondition} className="flex items-center gap-1 text-xs font-bold text-[#059669] hover:underline bg-transparent border-0 cursor-pointer">
                <Plus className="h-3 w-3" /> {locale === 'en' ? 'Add' : locale === 'de' ? 'Hinzufügen' : 'Ajouter'}
              </button>
            </div>
            {conditions.length === 0 && (
              <div className="text-center py-8 border border-dashed border-border bg-white rounded-xl">
                <p className="text-xs text-[#807d72] font-semibold">{locale === 'en' ? 'No conditions — rule applies to all leads.' : locale === 'de' ? 'Keine Bedingungen — die Regel gilt für alle Leads.' : "Aucune condition — la règle s'applique à tous les leads."}</p>
                <button onClick={addCondition} className="mt-2 text-xs font-bold text-[#059669] hover:underline bg-transparent border-0 cursor-pointer">{locale === 'en' ? 'Add condition' : locale === 'de' ? 'Bedingung hinzufügen' : 'Ajouter une condition'}</button>
              </div>
            )}
            {conditions.map((c, i) => (
              <div key={i} className="flex items-start gap-2 p-3 border border-border rounded-xl bg-white">
                <select value={c.field} onChange={e => updateCondition(i, { field: e.target.value })} className="flex-1 h-8 border border-border rounded-lg px-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e]">
                  {CONDITION_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                <select value={c.operator} onChange={e => updateCondition(i, { operator: e.target.value as any })} className="flex-1 h-8 border border-border rounded-lg px-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e]">
                  {CONDITION_OPERATORS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                {!['is_empty', 'is_not_empty'].includes(c.operator) && (
                  <input value={c.value ?? ''} onChange={e => updateCondition(i, { value: e.target.value })} placeholder="valeur" className="flex-1 h-8 border border-border rounded-lg px-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e]" />
                )}
                <button onClick={() => removeCondition(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#7a7a76] hover:text-red-600 transition-colors border-0 bg-transparent cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Step: Actions ── */}
        {step === 'actions' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#807d72]">{locale === 'en' ? 'What to do?' : locale === 'de' ? 'Was ist zu tun?' : 'Que faire ?'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACTIONS.map(a => {
                const selected = actions.some(x => x.type === a.key);
                return (
                  <button
                    key={a.key}
                    onClick={() => !selected ? addAction(a.key) : removeAction(actions.findIndex(x => x.type === a.key))}
                    className={cn(
                      'text-left p-4 rounded-xl border transition-all space-y-1 bg-white cursor-pointer',
                      selected ? 'border-[#059669] bg-[#059669]/5' : 'border-border hover:border-neutral-300'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#26251e] flex-1">{a.label}</p>
                      {selected && <Check className="h-3.5 w-3.5 text-[#059669] shrink-0" />}
                    </div>
                    <p className="text-[10px] text-[#807d72] font-semibold">{a.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Action payloads */}
            {actions.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{locale === 'en' ? 'Action parameters' : locale === 'de' ? 'Aktionsparameter' : 'Paramètres des actions'}</p>
                {actions.map((a, i) => {
                  const cfg = ACTIONS.find(x => x.key === a.type);
                  if (!cfg?.fields?.length) return null;
                  return (
                    <div key={i} className="p-4 border border-border rounded-xl bg-white space-y-3">
                      <p className="text-xs font-bold text-[#26251e]">{cfg.label}</p>
                      {cfg.fields.map(field => (
                        <div key={field} className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                            {field === 'title' ? (locale === 'en' ? 'Title' : locale === 'de' ? 'Titel' : 'Titre') : field === 'message' ? 'Message' : field === 'dueInDays' ? (locale === 'en' ? 'Delay (days)' : locale === 'de' ? 'Frist (Tage)' : 'Délai (jours)') : field === 'status' ? 'Statut' : field}
                          </label>
                          <input
                            value={a.payload[field] ?? ''}
                            onChange={e => updateActionPayload(i, field, e.target.value)}
                            placeholder={field === 'title' ? 'ex: Relancer le lead' : field === 'message' ? 'ex: Le lead a bougé !' : field === 'dueInDays' ? '3' : field === 'status' ? 'Won' : ''}
                            className="w-full h-8 border border-border rounded-lg px-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e]"
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Review & Name ── */}
        {step === 'review' && (
          <div className="space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#807d72]">{t('automations.rule_name')}</h2>
            <div className="space-y-1.5">
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('automations.rule_name_placeholder')}
                className="w-full h-10 border border-border rounded-xl px-4 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e]"
              />
            </div>

            {/* Summary */}
            <div className="border border-border rounded-xl p-4 space-y-3 bg-[#f4f4f3]/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{locale === 'en' ? 'Summary' : locale === 'de' ? 'Zusammenfassung' : 'Résumé'}</p>
              <div className="space-y-2 text-xs font-bold">
                <div className="flex items-start gap-2">
                  <span className="text-[#807d72] w-16 shrink-0">{t('automations.si')}</span>
                  <span className="text-[#26251e]">{TRIGGERS.find(t => t.key === triggerType)?.label ?? '—'}</span>
                </div>
                {conditions.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-[#807d72] w-16 shrink-0">ET QUE</span>
                    <div className="space-y-1">
                      {conditions.map((c, i) => (
                        <div key={i} className="text-[11px] text-[#26251e]">
                          {c.field} {c.operator.replace('_', ' ')} {c.value || ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-[#059669] w-16 shrink-0">{t('automations.alors')}</span>
                  <div className="space-y-1">
                    {actions.map((a, i) => (
                      <div key={i} className="text-[11px] text-[#26251e]">
                        {ACTIONS.find(x => x.key === a.type)?.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {saved && (
              <div className="flex items-center gap-2 text-[#059669] text-xs font-bold">
                <Check className="h-4 w-4" /> {locale === 'en' ? 'Rule created successfully!' : locale === 'de' ? 'Regel erfolgreich erstellt!' : 'Règle créée avec succès !'}
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            onClick={prev}
            disabled={step === 'trigger'}
            className="flex items-center gap-1.5 text-xs font-bold text-[#807d72] hover:text-[#26251e] disabled:opacity-30 transition-colors bg-transparent border-0 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {locale === 'en' ? 'Back' : locale === 'de' ? 'Zurück' : 'Retour'}
          </button>

          {step !== 'review' ? (
            <button
              onClick={next}
              disabled={!canNext()}
              className="flex items-center gap-1.5 px-4 h-9 rounded-lg font-bold text-xs text-white bg-[#26251e] hover:bg-[#3d3c35] disabled:opacity-40 transition-all border-0 cursor-pointer"
            >
              {locale === 'en' ? 'Next' : locale === 'de' ? 'Weiter' : 'Suivant'}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || saved || !name.trim()}
              className="flex items-center gap-1.5 px-5 h-9 rounded-lg font-bold text-xs text-white disabled:opacity-50 transition-all border-0 cursor-pointer"
              style={{ background: '#059669' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              {saved ? (locale === 'en' ? 'Saved!' : locale === 'de' ? 'Gespeichert!' : 'Enregistrée !') : (locale === 'en' ? 'Create rule' : locale === 'de' ? 'Regel erstellen' : 'Créer la règle')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
