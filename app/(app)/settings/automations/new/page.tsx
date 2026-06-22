'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Check, Loader2, Zap, Clock, MessageSquare, TrendingUp, Webhook, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';
import type { TriggerType, Condition, Action } from '@/lib/automations-engine';

const TRIGGERS: { key: TriggerType; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'time_passed', label: 'Délai écoulé', desc: 'Se déclenche après X jours sans activité sur un lead.', icon: <Clock className="h-4 w-4" /> },
  { key: 'lead_replied', label: 'Lead a répondu', desc: 'Un lead répond à un email ou message.', icon: <MessageSquare className="h-4 w-4" /> },
  { key: 'intent_increased', label: 'Hausse d\'intention', desc: 'Le score d\'intention d\'un lead augmente.', icon: <TrendingUp className="h-4 w-4" /> },
  { key: 'lead_updated', label: 'Lead mis à jour', desc: 'Un champ du lead est modifié.', icon: <Zap className="h-4 w-4" /> },
  { key: 'webhook_received', label: 'Webhook reçu', desc: 'Un appel webhook externe déclenche l\'automation.', icon: <Webhook className="h-4 w-4" /> },
];

const CONDITION_FIELDS = [
  { key: 'status', label: 'Statut' },
  { key: 'temperature', label: 'Température' },
  { key: 'score', label: 'Score' },
  { key: 'niche', label: 'Niche' },
  { key: 'website', label: 'Site web' },
  { key: 'contactEmail', label: 'Email' },
  { key: 'rating', label: 'Note GMB' },
];

const CONDITION_OPERATORS = [
  { key: 'equals', label: 'est égal à' },
  { key: 'not_equals', label: 'est différent de' },
  { key: 'contains', label: 'contient' },
  { key: 'greater_than', label: 'est supérieur à' },
  { key: 'less_than', label: 'est inférieur à' },
  { key: 'is_empty', label: 'est vide' },
  { key: 'is_not_empty', label: 'n\'est pas vide' },
];

const ACTIONS: { key: Action['type']; label: string; desc: string; fields?: string[] }[] = [
  { key: 'notify', label: 'Envoyer une notification', desc: 'Notifie l\'utilisateur dans l\'app et sur l\'appareil.', fields: ['message'] },
  { key: 'create_task', label: 'Créer une tâche', desc: 'Ajoute automatiquement une tâche de suivi.', fields: ['title', 'dueInDays'] },
  { key: 'update_lead_status', label: 'Mettre à jour le statut', desc: 'Change le statut du lead automatiquement.', fields: ['status'] },
  { key: 'send_email', label: 'Envoyer un email (bientôt)', desc: 'Envoie un email via Gmail.', fields: ['templateId'] },
];

type Step = 'trigger' | 'conditions' | 'actions' | 'review';

function StepIndicator({ current, steps }: { current: Step; steps: Step[] }) {
  const labels: Record<Step, string> = {
    trigger: 'Déclencheur',
    conditions: 'Conditions',
    actions: 'Actions',
    review: 'Confirmer',
  };
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className={cn(
            'flex items-center gap-1.5 text-[10px] font-bold',
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
}

const STEPS: Step[] = ['trigger', 'conditions', 'actions', 'review'];

export default function NewAutomationPage() {
  const router = useRouter();
  const { activeWorkspace } = useReach();

  const [step, setStep] = useState<Step>('trigger');
  const [triggerType, setTriggerType] = useState<TriggerType | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<Array<{ type: Action['type']; payload: Record<string, any> }>>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    <div className="h-full overflow-y-auto bg-[#fafaf8] text-[#26251e] font-sans">
      <div className="max-w-2xl mx-auto px-8 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl border border-[#e5e5e0] hover:bg-[#f4f4f3] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-black">Nouvelle règle d&apos;automatisation</h1>
            <p className="text-xs text-[#7a7a76] mt-0.5">Configurez un déclencheur, des conditions et des actions.</p>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} steps={STEPS} />

        {/* ── Step: Trigger ── */}
        {step === 'trigger' && (
          <div className="space-y-3">
            <h2 className="text-sm font-black">Quand déclencher cette règle ?</h2>
            <div className="space-y-2">
              {TRIGGERS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTriggerType(t.key)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3',
                    triggerType === t.key ? 'border-[#26251e] bg-[#26251e]/5' : 'border-[#e5e5e0] hover:border-[#c5c5c0]'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', triggerType === t.key ? 'bg-[#26251e] text-white' : 'bg-[#f4f4f3] text-[#7a7a76]')}>
                    {t.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black">{t.label}</p>
                    <p className="text-xs text-[#7a7a76] mt-0.5">{t.desc}</p>
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
              <h2 className="text-sm font-black">Conditions (optionnel)</h2>
              <button onClick={addCondition} className="flex items-center gap-1 text-xs font-bold text-[#059669] hover:underline">
                <Plus className="h-3 w-3" /> Ajouter
              </button>
            </div>
            {conditions.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-[#e5e5e0] rounded-xl">
                <p className="text-xs text-[#7a7a76]">Aucune condition — la règle s&apos;applique à tous les leads.</p>
                <button onClick={addCondition} className="mt-2 text-xs font-bold text-[#059669] hover:underline">Ajouter une condition</button>
              </div>
            )}
            {conditions.map((c, i) => (
              <div key={i} className="flex items-start gap-2 p-3 border border-[#e5e5e0] rounded-xl bg-white">
                <select value={c.field} onChange={e => updateCondition(i, { field: e.target.value })} className="flex-1 h-8 border border-[#e5e5e0] rounded-lg px-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#059669]">
                  {CONDITION_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                <select value={c.operator} onChange={e => updateCondition(i, { operator: e.target.value as any })} className="flex-1 h-8 border border-[#e5e5e0] rounded-lg px-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#059669]">
                  {CONDITION_OPERATORS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                {!['is_empty', 'is_not_empty'].includes(c.operator) && (
                  <input value={c.value ?? ''} onChange={e => updateCondition(i, { value: e.target.value })} placeholder="valeur" className="flex-1 h-8 border border-[#e5e5e0] rounded-lg px-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#059669]" />
                )}
                <button onClick={() => removeCondition(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#7a7a76] hover:text-red-600 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Step: Actions ── */}
        {step === 'actions' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black">Que faire ?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACTIONS.map(a => {
                const selected = actions.some(x => x.type === a.key);
                return (
                  <button
                    key={a.key}
                    onClick={() => !selected ? addAction(a.key) : removeAction(actions.findIndex(x => x.type === a.key))}
                    className={cn(
                      'text-left p-3.5 rounded-xl border-2 transition-all space-y-1',
                      selected ? 'border-[#059669] bg-[#059669]/5' : 'border-[#e5e5e0] hover:border-[#c5c5c0]'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black flex-1">{a.label}</p>
                      {selected && <Check className="h-3.5 w-3.5 text-[#059669] shrink-0" />}
                    </div>
                    <p className="text-[10px] text-[#7a7a76]">{a.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Action payloads */}
            {actions.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Paramètres des actions</p>
                {actions.map((a, i) => {
                  const cfg = ACTIONS.find(x => x.key === a.type);
                  if (!cfg?.fields?.length) return null;
                  return (
                    <div key={i} className="p-4 border border-[#e5e5e0] rounded-xl bg-white space-y-3">
                      <p className="text-xs font-black text-[#26251e]">{cfg.label}</p>
                      {cfg.fields.map(field => (
                        <div key={field} className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                            {field === 'title' ? 'Titre' : field === 'message' ? 'Message' : field === 'dueInDays' ? 'Délai (jours)' : field === 'status' ? 'Statut' : field}
                          </label>
                          <input
                            value={a.payload[field] ?? ''}
                            onChange={e => updateActionPayload(i, field, e.target.value)}
                            placeholder={field === 'title' ? 'ex: Relancer le lead' : field === 'message' ? 'ex: Le lead a bougé !' : field === 'dueInDays' ? '3' : field === 'status' ? 'Won' : ''}
                            className="w-full h-8 border border-[#e5e5e0] rounded-lg px-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#059669]"
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
            <h2 className="text-sm font-black">Nommez et confirmez votre règle</h2>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom de la règle *</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ex: Relance automatique après 3 jours"
                className="w-full h-10 border border-[#e5e5e0] rounded-xl px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#26251e]"
              />
            </div>

            {/* Summary */}
            <div className="border border-[#e5e5e0] rounded-xl p-4 space-y-3 bg-[#fafaf8]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Résumé</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="font-black text-[#7a7a76] w-16 shrink-0">SI</span>
                  <span className="font-semibold">{TRIGGERS.find(t => t.key === triggerType)?.label ?? '—'}</span>
                </div>
                {conditions.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="font-black text-[#7a7a76] w-16 shrink-0">ET QUE</span>
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
                  <span className="font-black text-[#059669] w-16 shrink-0">ALORS</span>
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
              <div className="flex items-center gap-2 text-[#059669] text-sm font-bold">
                <Check className="h-4 w-4" /> Règle créée avec succès !
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[#e5e5e0]">
          <button
            onClick={prev}
            disabled={step === 'trigger'}
            className="flex items-center gap-1.5 text-xs font-bold text-[#7a7a76] hover:text-[#26251e] disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour
          </button>

          {step !== 'review' ? (
            <button
              onClick={next}
              disabled={!canNext()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#26251e] hover:bg-[#3d3c35] disabled:opacity-40 transition-all"
            >
              Suivant
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || saved || !name.trim()}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 transition-all"
              style={{ background: '#059669' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              {saved ? 'Enregistrée !' : 'Créer la règle'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
