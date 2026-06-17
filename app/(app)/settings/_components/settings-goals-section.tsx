'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReach, Goal } from '@/lib/reach-context';
import { cn } from '@/lib/utils';
import { startOfWeek, startOfMonth, isAfter } from 'date-fns';

const METRIC_LABELS: Record<Goal['metric'], string> = {
  leads_created: 'Leads créés',
  leads_contacted: 'Leads contactés',
  leads_won: 'Leads gagnés',
  emails_sent: 'E-mails envoyés',
};

const PERIOD_LABELS: Record<Goal['period'], string> = {
  week: 'Cette semaine',
  month: 'Ce mois',
};

function computeProgress(metric: Goal['metric'], period: Goal['period'], leads: ReturnType<typeof useReach>['leads'], tasks: ReturnType<typeof useReach>['tasks']): number {
  const now = new Date();
  const start = period === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);

  switch (metric) {
    case 'leads_created':
      return leads.filter(l => l.createdAt && isAfter(new Date(l.createdAt), start)).length;
    case 'leads_contacted':
      return leads.filter(l => l.createdAt && isAfter(new Date(l.createdAt), start) && l.status !== 'New').length;
    case 'leads_won':
      return leads.filter(l => l.createdAt && isAfter(new Date(l.createdAt), start) && l.status === 'Won').length;
    case 'emails_sent':
      return leads.filter(l => l.createdAt && isAfter(new Date(l.createdAt), start) && l.status !== 'New').length;
    default:
      return 0;
  }
}

export function SettingsGoalsSection() {
  const { goals, leads, tasks, addGoal, updateGoal, deleteGoal } = useReach();

  const [adding, setAdding] = useState(false);
  const [newMetric, setNewMetric] = useState<Goal['metric']>('leads_created');
  const [newTarget, setNewTarget] = useState(10);
  const [newPeriod, setNewPeriod] = useState<Goal['period']>('month');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (newTarget <= 0) return;
    setSaving(true);
    await addGoal({ metric: newMetric, target: newTarget, period: newPeriod });
    setSaving(false);
    setAdding(false);
    setNewTarget(10);
  };

  const progressByGoal = useMemo(() =>
    Object.fromEntries(goals.map(g => [g.id, computeProgress(g.metric, g.period, leads, tasks)])),
    [goals, leads, tasks]
  );

  const selectClass = "w-full text-xs border border-border rounded-md bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Objectifs & Quotas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Suivez vos quotas de prospection par période.</p>
        </div>
        <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="w-3.5 h-3.5" />
          Ajouter un objectif
        </Button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
          <p className="text-xs font-semibold text-foreground">Nouvel objectif</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Métrique</label>
              <select className={selectClass} value={newMetric} onChange={e => setNewMetric(e.target.value as Goal['metric'])}>
                {Object.entries(METRIC_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Cible</label>
              <input
                type="number"
                min={1}
                value={newTarget}
                onChange={e => setNewTarget(Number(e.target.value))}
                className={selectClass}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Période</label>
              <select className={selectClass} value={newPeriod} onChange={e => setNewPeriod(e.target.value as Goal['period'])}>
                <option value="week">Semaine</option>
                <option value="month">Mois</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 && !adding ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <Target className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Aucun objectif défini. Ajoutez-en un pour suivre votre progression.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const progress = progressByGoal[goal.id] ?? 0;
            const pct = Math.min(100, Math.round((progress / Math.max(goal.target, 1)) * 100));
            const done = pct >= 100;
            return (
              <div key={goal.id} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold text-foreground">{METRIC_LABELS[goal.metric]}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">{PERIOD_LABELS[goal.period]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-bold", done ? "text-emerald-600" : "text-foreground")}>
                      {progress} / {goal.target}
                    </span>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", done ? "bg-emerald-500" : "bg-primary")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{pct}% atteint</span>
                  {done && <span className="text-[10px] font-bold text-emerald-600">Objectif atteint ✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
