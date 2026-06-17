'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import {
  ChevronLeft, ChevronRight, Megaphone, Tag, MapPin, Target,
  Calendar, CheckCircle2, Loader2, X, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Step indicator ──────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Infos', description: 'Nom & type' },
  { label: 'Audience', description: 'Niches & villes' },
  { label: 'Objectif', description: 'Budget & KPI' },
  { label: 'Révision', description: 'Confirmer' },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1 min-w-[72px]">
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-black border-2 transition-all',
                  isDone
                    ? 'bg-[#059669] border-[#059669] text-white'
                    : isActive
                    ? 'bg-white border-[#059669] text-[#059669]'
                    : 'bg-white border-[#e5e5e0] text-[#7a7a76]',
                )}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[9px] font-bold uppercase tracking-wider',
                  isActive ? 'text-[#059669]' : isDone ? 'text-[#059669]/70' : 'text-[#7a7a76]',
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-[2px] mb-4 transition-all',
                  i < current ? 'bg-[#059669]' : 'bg-[#e5e5e0]',
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({
  values,
  onChange,
  placeholder,
  color = 'default',
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  color?: 'default' | 'blue';
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput('');
  };

  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  const tagClass =
    color === 'blue'
      ? 'bg-blue-50 border-blue-100 text-blue-600'
      : 'bg-[#f4f4f3] border-[#e5e5e0] text-[#555552]';

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 text-xs px-2.5 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] hover:bg-[#f4f4f3] text-[#7a7a76] disabled:opacity-40 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className={cn(
                'inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border',
                tagClass,
              )}
            >
              {v}
              <button type="button" onClick={() => remove(v)} className="opacity-60 hover:opacity-100">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Review row ───────────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[#e5e5e0]/60 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] w-28 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-xs text-[#26251e]">{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type CampaignType = 'email' | 'call' | 'linkedin';

const TYPE_OPTIONS: { value: CampaignType; label: string; desc: string }[] = [
  { value: 'email', label: 'Email', desc: 'Séquences d\'emails automatisées' },
  { value: 'call', label: 'Appel', desc: 'Campagne de prospection téléphonique' },
  { value: 'linkedin', label: 'LinkedIn', desc: 'Demandes de connexion et DMs' },
];

const METRIC_OPTIONS = [
  { value: 'leads_contacted', label: 'Leads contactés' },
  { value: 'leads_won', label: 'Leads gagnés' },
];

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
];

export function NewCampaignRoot() {
  const router = useRouter();
  const { addCampaign } = useReach();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CampaignType>('email');

  // Step 2 state
  const [niches, setNiches] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  // Step 3 state
  const [metric, setMetric] = useState('leads_contacted');
  const [targetNumber, setTargetNumber] = useState(50);
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    return true;
  };

  const handleCreate = async () => {
    setSaving(true);
    const c = await addCampaign({
      name: name.trim(),
      description: description.trim() || undefined,
      niches,
      cities,
      startDate: startDate || undefined,
    });
    setSaving(false);
    if (c) {
      router.push('/campaigns');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Top bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/campaigns')}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] hover:bg-[#f4f4f3] text-[#7a7a76] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#059669]" />
              <h1 className="text-sm font-bold text-[#26251e]">Nouvelle campagne</h1>
            </div>
            <p className="text-[10px] text-[#7a7a76] mt-0.5">Configuration en {STEPS.length} étapes</p>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Step panels */}
        {step === 0 && (
          <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-3">
                Informations générales
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                    Nom de la campagne *
                  </label>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Restaurants Montréal — Juin 2026"
                    className="w-full text-xs px-2.5 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Objectif, contexte, notes..."
                    rows={3}
                    className="w-full text-xs px-2.5 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] resize-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-3">
                Type de campagne
              </div>
              <div className="grid grid-cols-3 gap-3">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={cn(
                      'text-left p-3 rounded-xl border-2 transition-all',
                      type === opt.value
                        ? 'border-[#059669] bg-[#059669]/5'
                        : 'border-[#e5e5e0] hover:border-[#059669]/30',
                    )}
                  >
                    <div
                      className={cn(
                        'text-xs font-bold',
                        type === opt.value ? 'text-[#059669]' : 'text-[#26251e]',
                      )}
                    >
                      {opt.label}
                    </div>
                    <div className="text-[10px] text-[#7a7a76] mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
              Audience cible
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  <Tag className="h-3 w-3" />
                  Niches / secteurs
                </label>
                <p className="text-[10px] text-[#7a7a76]">
                  Appuyez sur Entrée ou la virgule pour ajouter un tag.
                </p>
                <TagInput
                  values={niches}
                  onChange={setNiches}
                  placeholder="ex: Restaurant, Coiffeur, Gym..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  <MapPin className="h-3 w-3" />
                  Villes cibles
                </label>
                <p className="text-[10px] text-[#7a7a76]">
                  Zones géographiques visées par la campagne.
                </p>
                <TagInput
                  values={cities}
                  onChange={setCities}
                  placeholder="ex: Montréal, Laval, Québec..."
                  color="blue"
                />
              </div>
            </div>

            {niches.length === 0 && cities.length === 0 && (
              <div className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Optionnel — vous pouvez laisser vide et affiner plus tard.
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
              Objectif & planning
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  <Target className="h-3 w-3" />
                  Métrique principale
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {METRIC_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMetric(m.value)}
                      className={cn(
                        'p-2.5 rounded-lg border-2 text-xs font-bold transition-all text-left',
                        metric === m.value
                          ? 'border-[#059669] text-[#059669] bg-[#059669]/5'
                          : 'border-[#e5e5e0] text-[#26251e] hover:border-[#059669]/30',
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                    Cible (nombre)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={targetNumber}
                    onChange={(e) => setTargetNumber(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                    Période
                  </label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white"
                  >
                    {PERIOD_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  <Calendar className="h-3 w-3" />
                  Date de début
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]"
                />
              </div>
            </div>

            <div className="p-3 bg-[#059669]/5 border border-[#059669]/20 rounded-lg">
              <p className="text-[10px] text-[#059669] font-semibold">
                Objectif : {targetNumber}{' '}
                {METRIC_OPTIONS.find((m) => m.value === metric)?.label.toLowerCase()}{' '}
                par {PERIOD_OPTIONS.find((p) => p.value === period)?.label.toLowerCase()}
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-3">
                Récapitulatif
              </div>
              <ReviewRow label="Nom" value={name} />
              <ReviewRow label="Type" value={TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type} />
              {description && <ReviewRow label="Description" value={description} />}
              <ReviewRow
                label="Niches"
                value={
                  niches.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {niches.map((n) => (
                        <span
                          key={n}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#f4f4f3] border border-[#e5e5e0] text-[#555552]"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#7a7a76]">—</span>
                  )
                }
              />
              <ReviewRow
                label="Villes"
                value={
                  cities.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {cities.map((c) => (
                        <span
                          key={c}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#7a7a76]">—</span>
                  )
                }
              />
              <ReviewRow
                label="Objectif"
                value={`${targetNumber} ${METRIC_OPTIONS.find((m) => m.value === metric)?.label.toLowerCase()} / ${PERIOD_OPTIONS.find((p) => p.value === period)?.label.toLowerCase()}`}
              />
              {startDate && (
                <ReviewRow
                  label="Début"
                  value={new Date(startDate + 'T12:00:00').toLocaleDateString('fr-CA')}
                />
              )}
            </div>

            <div className="text-[10px] text-[#7a7a76] bg-[#f4f4f3] rounded-lg px-3 py-2">
              La campagne sera créée avec le statut <strong>Active</strong>. Vous pourrez l&apos;éditer depuis la liste des campagnes.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : router.push('/campaigns'))}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold border border-[#e5e5e0] rounded-lg text-[#555552] hover:bg-[#f4f4f3] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {step === 0 ? 'Annuler' : 'Retour'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Suivant
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="inline-flex items-center gap-1.5 h-9 px-5 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {saving ? 'Création...' : 'Créer la campagne'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
