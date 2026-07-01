'use client';

import React, { useState, useEffect } from 'react';
import { Mail, CalendarCheck2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const STORAGE_KEY = 'minerva_v7_strategy_done';

const PRESET_NICHES = [
  'Restaurants',
  'Plombiers',
  'Coiffeurs',
  'Avocats',
  'Agences web',
  'PME générales',
];

type Goal = 'emails' | 'rdv' | 'pipeline';

interface GoalOption {
  id: Goal;
  label: string;
  icon: React.ElementType;
}

const GOAL_OPTIONS: GoalOption[] = [
  { id: 'emails', label: 'Maximiser les réponses emails', icon: Mail },
  { id: 'rdv', label: 'Décrocher des rendez-vous', icon: CalendarCheck2 },
  { id: 'pipeline', label: 'Convertir le pipeline actuel', icon: TrendingUp },
];

export function V7StrategyModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [niche, setNiche] = useState('');
  const [goal, setGoal] = useState<Goal | ''>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        setOpen(true);
      }
    }
  }, []);

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!niche || !goal || submitting) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('settings')
          .update({
            v7_strategy_niche: niche,
            v7_strategy_goal: goal,
            v7_strategy_done: true,
          })
          .eq('user_id', user.id);
      }

      await fetch(getApiUrl('/api/nba/insights'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: undefined }),
      }).catch(() => {});

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, 'true');
      }

      setOpen(false);
      toast.success('Minerva v7 initialisée — recommandations adaptées à votre stratégie');
    } catch {
      toast.error('Erreur lors de la configuration');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = step === 1 ? niche.trim().length > 0 : !!goal;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-md bg-white border border-[#e5e5e0] rounded-2xl p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader className="space-y-1 mb-6">
            <DialogTitle className="text-base font-black text-[#26251e] tracking-tight">
              Configurez votre stratégie v7
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7a7a76]">
              Minerva va apprendre de vos résultats pour optimiser vos recommandations
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-5">
            {([1, 2] as const).map((s) => (
              <React.Fragment key={s}>
                <div
                  className={cn(
                    'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-colors',
                    step >= s
                      ? 'bg-[#059669] text-white'
                      : 'bg-[#e5e5e0] text-[#7a7a76]'
                  )}
                >
                  {s}
                </div>
                {s < 2 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 rounded-full transition-colors',
                      step > s ? 'bg-[#059669]' : 'bg-[#e5e5e0]'
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#26251e] mb-2">
                  Quelle est votre niche principale ?
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="Ex: Restaurants, Plombiers…"
                  className="w-full rounded-lg border border-[#e5e5e0] bg-[#fafaf8] px-3 py-2 text-xs text-[#26251e] placeholder:text-[#a3a197] focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669] transition-all"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_NICHES.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setNiche(preset)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors',
                      niche === preset
                        ? 'border-[#059669] bg-[#059669] text-white'
                        : 'border-[#e5e5e0] bg-white text-[#555552] hover:border-[#059669] hover:text-[#059669]'
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#26251e] mb-3">
                Quel est votre objectif principal cette semaine ?
              </label>
              {GOAL_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = goal === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setGoal(option.id)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                      selected
                        ? 'border-[#059669] bg-[#f0fdf4]'
                        : 'border-[#e5e5e0] bg-white hover:border-[#059669]/40'
                    )}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                        selected ? 'bg-[#059669] text-white' : 'bg-[#f4f4f3] text-[#7a7a76]'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        selected ? 'text-[#059669]' : 'text-[#26251e]'
                      )}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={dismiss}
              className="text-[11px] text-[#a3a197] hover:text-[#7a7a76] transition-colors underline underline-offset-2"
            >
              Passer pour l&apos;instant
            </button>
            <div className="flex gap-2">
              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-[#e5e5e0] bg-white px-3 py-2 text-xs font-semibold text-[#7a7a76] hover:text-[#26251e] hover:bg-[#f4f4f3] transition-colors"
                >
                  Retour
                </button>
              )}
              {step === 1 ? (
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceed}
                  className="rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-xs font-bold text-white transition-colors"
                >
                  Continuer →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed || submitting}
                  className="rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-xs font-bold text-white transition-colors"
                >
                  {submitting ? 'Initialisation…' : 'Lancer Minerva v7 →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default V7StrategyModal;
