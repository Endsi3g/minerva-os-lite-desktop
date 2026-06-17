'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Target, Users, MapPin, ChevronRight, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useReach } from '@/lib/reach-context';
import { usePersonas, type Persona } from '@/lib/use-personas';
import { DEFAULT_SCORING, SCORING_LABELS, scoreLeadByPersona, type ScoringCriteria } from '@/lib/lead-scoring';

const SCORING_KEYS = Object.keys(DEFAULT_SCORING) as (keyof ScoringCriteria)[];

const BLANK_FORM = {
  name: '',
  description: '',
  targetNichesInput: '',
  targetCitiesInput: '',
  targetNiches: [] as string[],
  targetCities: [] as string[],
  scoringCriteria: { ...DEFAULT_SCORING },
};

type FormState = typeof BLANK_FORM;

export function PersonasRoot() {
  const { leads, activeWorkspace } = useReach();
  const { personas, loading, addPersona, updatePersona, deletePersona } = usePersonas(activeWorkspace?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...BLANK_FORM, scoringCriteria: { ...DEFAULT_SCORING } });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const suggestedNiches = useMemo(
    () => Array.from(new Set(leads.map(l => l.niche).filter(Boolean))).slice(0, 20),
    [leads]
  );

  function openCreate() {
    setEditingId(null);
    setForm({ ...BLANK_FORM, scoringCriteria: { ...DEFAULT_SCORING } });
    setDialogOpen(true);
  }

  function openEdit(persona: Persona) {
    setEditingId(persona.id);
    setForm({
      name: persona.name,
      description: persona.description,
      targetNichesInput: '',
      targetCitiesInput: '',
      targetNiches: [...persona.targetNiches],
      targetCities: [...persona.targetCities],
      scoringCriteria: { ...persona.scoringCriteria },
    });
    setDialogOpen(true);
  }

  function addNiche(raw: string) {
    const tag = raw.trim();
    if (!tag || form.targetNiches.includes(tag)) return;
    setForm(prev => ({ ...prev, targetNiches: [...prev.targetNiches, tag], targetNichesInput: '' }));
  }

  function addCity(raw: string) {
    const tag = raw.trim();
    if (!tag || form.targetCities.includes(tag)) return;
    setForm(prev => ({ ...prev, targetCities: [...prev.targetCities, tag], targetCitiesInput: '' }));
  }

  function removeNiche(tag: string) {
    setForm(prev => ({ ...prev, targetNiches: prev.targetNiches.filter(n => n !== tag) }));
  }

  function removeCity(tag: string) {
    setForm(prev => ({ ...prev, targetCities: prev.targetCities.filter(c => c !== tag) }));
  }

  function setCriteria(key: keyof ScoringCriteria, value: number) {
    setForm(prev => ({ ...prev, scoringCriteria: { ...prev.scoringCriteria, [key]: value } }));
  }

  async function handleSave() {
    if (!form.name.trim() || !activeWorkspace) return;
    setSaving(true);
    const payload = {
      workspaceId: activeWorkspace.id,
      name: form.name.trim(),
      description: form.description.trim(),
      targetNiches: form.targetNiches,
      targetCities: form.targetCities,
      scoringCriteria: form.scoringCriteria,
    };
    if (editingId) {
      await updatePersona(editingId, payload);
    } else {
      await addPersona(payload);
    }
    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    await deletePersona(id);
    setConfirmDeleteId(null);
  }

  function matchCount(persona: Persona): number {
    if (persona.targetNiches.length === 0 && persona.targetCities.length === 0) return leads.length;
    return leads.filter(l => {
      const nicheOk =
        persona.targetNiches.length === 0 ||
        (l.niche && persona.targetNiches.some(n =>
          l.niche!.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(l.niche!.toLowerCase())
        ));
      const cityOk =
        persona.targetCities.length === 0 ||
        (l.city && persona.targetCities.some(c =>
          l.city!.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(l.city!.toLowerCase())
        ));
      return nicheOk && cityOk;
    }).length;
  }

  function avgScore(persona: Persona): number {
    const matching = leads.filter(l => {
      if (persona.targetNiches.length === 0 && persona.targetCities.length === 0) return true;
      const nicheOk =
        persona.targetNiches.length === 0 ||
        (l.niche && persona.targetNiches.some(n => l.niche!.toLowerCase().includes(n.toLowerCase())));
      const cityOk =
        persona.targetCities.length === 0 ||
        (l.city && persona.targetCities.some(c => l.city!.toLowerCase().includes(c.toLowerCase())));
      return nicheOk || cityOk;
    });
    if (!matching.length) return 0;
    const total = matching.reduce(
      (s, l) => s + scoreLeadByPersona(l, persona.scoringCriteria, persona.targetNiches, persona.targetCities),
      0
    );
    return Math.round(total / matching.length);
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-200">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Profils cibles (ICP)</h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Définissez vos clients idéaux avec des niches cibles, des villes et des critères de scoring personnalisés.
              Chaque profil calcule automatiquement la compatibilité de vos leads.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="h-9 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-lg gap-2 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau profil
          </Button>
        </div>

        {/* Supabase info banner */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Configuration Supabase requise</span>{' '}
            pour persister les profils hors Electron. Exécutez dans votre dashboard :{' '}
            <code className="font-mono bg-[#e5e5e2] px-1 py-0.5 rounded text-[10px] text-foreground">
              CREATE TABLE IF NOT EXISTS personas (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, workspace_id UUID NOT NULL, name TEXT NOT NULL, description TEXT, target_niches JSONB DEFAULT &apos;[]&apos;, target_cities JSONB DEFAULT &apos;[]&apos;, scoring_criteria JSONB, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
            </code>
          </p>
        </div>

        {/* Persona cards grid */}
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">
            Chargement…
          </div>
        ) : personas.length === 0 ? (
          <EmptyState onCreateClick={openCreate} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personas.map(persona => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                matchCount={matchCount(persona)}
                avgScore={avgScore(persona)}
                onEdit={() => openEdit(persona)}
                onDelete={() => setConfirmDeleteId(persona.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white font-sans animate-in zoom-in-95 duration-150">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">
              {editingId ? 'Modifier le profil cible' : 'Nouveau profil cible (ICP)'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Nom du profil *
              </label>
              <Input
                placeholder="ex : Restaurant sans site web"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <Textarea
                placeholder="ex : Cibler les restaurants locaux sans présence web dans les villes moyennes"
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Target niches */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Niches cibles
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Taper une niche et appuyer Entrée…"
                  value={form.targetNichesInput}
                  onChange={e => setForm(prev => ({ ...prev, targetNichesInput: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); addNiche(form.targetNichesInput); }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs font-semibold border-border"
                  onClick={() => addNiche(form.targetNichesInput)}
                >
                  Ajouter
                </Button>
              </div>

              {/* Suggestions from existing leads */}
              {suggestedNiches.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestedNiches
                    .filter(n => !form.targetNiches.includes(n))
                    .slice(0, 8)
                    .map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => addNiche(n)}
                        className="text-[10px] px-2 py-0.5 border border-dashed border-border rounded-full text-muted-foreground hover:border-[#059669] hover:text-[#059669] transition-colors font-medium"
                      >
                        + {n}
                      </button>
                    ))}
                </div>
              )}

              {form.targetNiches.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.targetNiches.map(n => (
                    <span
                      key={n}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#e5e5e2] text-foreground border border-border"
                    >
                      {n}
                      <button
                        onClick={() => removeNiche(n)}
                        className="hover:text-red-600 ml-0.5 transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Target cities */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Villes cibles
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Montréal, Québec, Lyon…"
                  value={form.targetCitiesInput}
                  onChange={e => setForm(prev => ({ ...prev, targetCitiesInput: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); addCity(form.targetCitiesInput); }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs font-semibold border-border"
                  onClick={() => addCity(form.targetCitiesInput)}
                >
                  Ajouter
                </Button>
              </div>
              {form.targetCities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.targetCities.map(c => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#e5e5e2] text-foreground border border-border"
                    >
                      <MapPin className="h-2.5 w-2.5" />
                      {c}
                      <button
                        onClick={() => removeCity(c)}
                        className="hover:text-red-600 ml-0.5 transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* Scoring criteria */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Critères de scoring
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Ajustez le poids de chaque signal. 0 = ignoré, 40 = très important.
                </p>
              </div>
              <div className="space-y-2.5">
                {SCORING_KEYS.map(key => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-foreground font-medium w-52 shrink-0">
                      {SCORING_LABELS[key]}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={5}
                      value={form.scoringCriteria[key]}
                      onChange={e => setCriteria(key, Number(e.target.value))}
                      className="flex-1 accent-[#059669] h-1.5"
                    />
                    <span className="text-xs font-bold text-foreground w-8 text-right font-mono">
                      +{form.scoringCriteria[key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="h-9 text-xs border-border"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="h-9 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-lg"
            >
              {saving
                ? 'Enregistrement…'
                : editingId
                ? 'Enregistrer les modifications'
                : 'Créer le profil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm bg-white font-sans animate-in zoom-in-95 duration-150">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">Supprimer le profil ?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Cette action est irréversible. Le profil et ses critères de scoring seront définitivement supprimés.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              className="h-8 text-xs border-border"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="h-8 text-xs font-bold"
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScoreBar({ value, max = 40 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1 bg-[#e5e5e2] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#059669] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] font-bold font-mono text-foreground w-5 text-right">
        +{value}
      </span>
    </div>
  );
}

function PersonaCard({
  persona,
  matchCount,
  avgScore,
  onEdit,
  onDelete,
}: {
  persona: Persona;
  matchCount: number;
  avgScore: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const topCriteria = (Object.entries(persona.scoringCriteria) as [keyof ScoringCriteria, number][])
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const scoreColor =
    avgScore >= 50 ? 'text-[#059669]' : avgScore >= 30 ? 'text-[#f54e00]' : 'text-muted-foreground';

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 transition-colors hover:border-[#d4d4ce]">
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-md bg-[#f54e00]/10 flex items-center justify-center shrink-0">
            <Target className="h-4 w-4 text-[#f54e00]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{persona.name}</h3>
            {persona.description && (
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{persona.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button
            onClick={onEdit}
            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-[#e5e5e2] text-muted-foreground hover:text-foreground transition-colors"
            title="Modifier"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Tags: niches + cities */}
      <div className="space-y-1.5">
        {persona.targetNiches.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {persona.targetNiches.map(n => (
              <span
                key={n}
                className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-border bg-white text-foreground"
              >
                {n}
              </span>
            ))}
          </div>
        )}
        {persona.targetCities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {persona.targetCities.map(c => (
              <span
                key={c}
                className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground border border-border rounded-full px-1.5 py-0.5 bg-white"
              >
                <MapPin className="h-2 w-2 shrink-0" />
                {c}
              </span>
            ))}
          </div>
        )}
        {persona.targetNiches.length === 0 && persona.targetCities.length === 0 && (
          <p className="text-[10px] text-muted-foreground italic">
            Aucune niche/ville définie — correspond à tous les leads
          </p>
        )}
      </div>

      {/* Top scoring criteria preview */}
      {topCriteria.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          {topCriteria.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground w-44 truncate shrink-0">
                {SCORING_LABELS[key]}
              </span>
              <ScoreBar value={value} />
            </div>
          ))}
        </div>
      )}

      {/* Footer: stats + configure link */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          <span>
            <strong className="text-foreground">{matchCount}</strong>{' '}
            lead{matchCount !== 1 ? 's' : ''} correspondant{matchCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Score moyen :</span>
          <span className={`font-bold font-mono text-xs ${scoreColor}`}>{avgScore}/100</span>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-0.5 text-[10px] text-[#059669] font-semibold hover:underline transition-colors"
        >
          Configurer
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="h-12 w-12 rounded-xl border border-border bg-card flex items-center justify-center">
        <Target className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-foreground">Aucun profil cible créé</h3>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Définissez vos clients idéaux (ICP) pour personnaliser le scoring des leads
          et prioriser votre prospection.
        </p>
      </div>
      <Button
        onClick={onCreateClick}
        className="h-9 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-lg gap-2"
      >
        <Plus className="h-3.5 w-3.5" />
        Créer un profil cible
      </Button>
    </div>
  );
}
