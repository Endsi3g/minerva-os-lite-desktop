'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Target, Users, MapPin, ChevronRight, X } from 'lucide-react';
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

  const suggestedNiches = useMemo(() =>
    Array.from(new Set(leads.map(l => l.niche).filter(Boolean))).slice(0, 20),
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
      const nicheOk = persona.targetNiches.length === 0 || (l.niche && persona.targetNiches.some(n =>
        l.niche!.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(l.niche!.toLowerCase())
      ));
      const cityOk = persona.targetCities.length === 0 || (l.city && persona.targetCities.some(c =>
        l.city!.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(l.city!.toLowerCase())
      ));
      return nicheOk && cityOk;
    }).length;
  }

  function avgScore(persona: Persona): number {
    const matching = leads.filter(l => {
      if (persona.targetNiches.length === 0 && persona.targetCities.length === 0) return true;
      const nicheOk = persona.targetNiches.length === 0 || (l.niche && persona.targetNiches.some(n =>
        l.niche!.toLowerCase().includes(n.toLowerCase())
      ));
      const cityOk = persona.targetCities.length === 0 || (l.city && persona.targetCities.some(c =>
        l.city!.toLowerCase().includes(c.toLowerCase())
      ));
      return nicheOk || cityOk;
    });
    if (!matching.length) return 0;
    const total = matching.reduce((s, l) =>
      s + scoreLeadByPersona(l, persona.scoringCriteria, persona.targetNiches, persona.targetCities), 0
    );
    return Math.round(total / matching.length);
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f7f7f4]">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#26251e]">Profils cibles (ICP)</h1>
            <p className="text-xs text-[#78716c] mt-1 max-w-xl">
              Définissez vos clients idéaux avec des niches cibles, des villes et des critères de scoring personnalisés.
              Chaque profil calcule automatiquement la compatibilité de vos leads.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="h-9 bg-[#f54e00] hover:bg-[#d94400] text-white font-bold gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Nouveau profil
          </Button>
        </div>

        {/* SQL note banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
          <strong>Note Supabase :</strong> Pour persister les profils hors Electron, exécutez dans votre dashboard :{' '}
          <code className="font-mono bg-amber-100 px-1 rounded text-[10px]">
            CREATE TABLE IF NOT EXISTS personas (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, workspace_id UUID NOT NULL, name TEXT NOT NULL, description TEXT, target_niches JSONB DEFAULT &apos;[]&apos;, target_cities JSONB DEFAULT &apos;[]&apos;, scoring_criteria JSONB, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()); ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
          </code>
        </div>

        {/* Persona cards */}
        {loading ? (
          <div className="flex items-center justify-center h-32 text-[#78716c] text-sm">Chargement...</div>
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#26251e]">
              {editingId ? 'Modifier le profil cible' : 'Nouveau profil cible (ICP)'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#78716c]">Nom du profil *</label>
              <Input
                placeholder="ex : Restaurant sans site web"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#78716c]">Description</label>
              <Textarea
                placeholder="ex : Cibler les restaurants locaux sans présence web dans les villes moyennes"
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Target niches */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#78716c] block">Niches cibles</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Taper une niche et appuyer Entrée…"
                  value={form.targetNichesInput}
                  onChange={e => setForm(prev => ({ ...prev, targetNichesInput: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNiche(form.targetNichesInput); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addNiche(form.targetNichesInput)}>
                  Ajouter
                </Button>
              </div>
              {suggestedNiches.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestedNiches.filter(n => !form.targetNiches.includes(n)).slice(0, 8).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => addNiche(n)}
                      className="text-[10px] px-2 py-0.5 border border-dashed border-[#e5e5e0] rounded-full text-[#78716c] hover:border-[#f54e00] hover:text-[#f54e00] transition-colors"
                    >
                      + {n}
                    </button>
                  ))}
                </div>
              )}
              {form.targetNiches.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.targetNiches.map(n => (
                    <Badge key={n} variant="secondary" className="gap-1 text-xs">
                      {n}
                      <button onClick={() => removeNiche(n)} className="hover:text-red-600 ml-0.5">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Target cities */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#78716c] block">Villes cibles</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Montréal, Québec, Lyon…"
                  value={form.targetCitiesInput}
                  onChange={e => setForm(prev => ({ ...prev, targetCitiesInput: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCity(form.targetCitiesInput); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addCity(form.targetCitiesInput)}>
                  Ajouter
                </Button>
              </div>
              {form.targetCities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.targetCities.map(c => (
                    <Badge key={c} variant="secondary" className="gap-1 text-xs">
                      <MapPin className="h-2.5 w-2.5" />
                      {c}
                      <button onClick={() => removeCity(c)} className="hover:text-red-600 ml-0.5">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Scoring criteria sliders */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#78716c] block mb-0.5">
                  Critères de scoring
                </label>
                <p className="text-[10px] text-[#a8a29e]">
                  Ajustez le poids de chaque signal (0 = ignoré, 40 = très important).
                </p>
              </div>
              <div className="space-y-3">
                {SCORING_KEYS.map(key => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-[#555552] font-medium w-52 shrink-0">{SCORING_LABELS[key]}</span>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={5}
                      value={form.scoringCriteria[key]}
                      onChange={e => setCriteria(key, Number(e.target.value))}
                      className="flex-1 accent-[#f54e00]"
                    />
                    <span className="text-xs font-bold text-[#26251e] w-8 text-right">+{form.scoringCriteria[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="bg-[#f54e00] hover:bg-[#d94400] text-white font-bold"
            >
              {saving ? 'Enregistrement…' : (editingId ? 'Enregistrer les modifications' : 'Créer le profil')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm bg-white font-sans">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#26251e]">Supprimer le profil ?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#78716c]">Cette action est irréversible.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
            <Button
              variant="destructive"
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

function ScoreBar({ value, max = 40 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1 bg-[#f4f4f3] rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-[#f54e00]/70 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] font-bold text-[#26251e] w-5 text-right">+{value}</span>
    </div>
  );
}

function PersonaCard({
  persona, matchCount, avgScore, onEdit, onDelete
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

  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-[#f54e00]/10 flex items-center justify-center shrink-0">
            <Target className="h-4 w-4 text-[#f54e00]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#26251e] truncate">{persona.name}</h3>
            {persona.description && (
              <p className="text-[10px] text-[#78716c] truncate">{persona.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-[#f4f4f3] text-[#78716c] hover:text-[#26251e] transition-colors"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 text-[#78716c] hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {persona.targetNiches.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {persona.targetNiches.map(n => (
              <Badge key={n} variant="secondary" className="text-[10px] px-1.5 py-0">{n}</Badge>
            ))}
          </div>
        )}
        {persona.targetCities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {persona.targetCities.map(c => (
              <span key={c} className="inline-flex items-center gap-1 text-[10px] text-[#78716c] border border-[#e5e5e0] rounded-full px-1.5 py-0">
                <MapPin className="h-2 w-2" />
                {c}
              </span>
            ))}
          </div>
        )}
        {persona.targetNiches.length === 0 && persona.targetCities.length === 0 && (
          <span className="text-[10px] text-[#a8a29e]">Aucune niche/ville — correspond à tous les leads</span>
        )}
      </div>

      {topCriteria.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-[#f4f4f3]">
          {topCriteria.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[9px] text-[#78716c] w-44 truncate">{SCORING_LABELS[key]}</span>
              <ScoreBar value={value} />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-[#f4f4f3]">
        <div className="flex items-center gap-1 text-[10px] text-[#78716c]">
          <Users className="h-3 w-3" />
          <span><strong className="text-[#26251e]">{matchCount}</strong> lead{matchCount !== 1 ? 's' : ''} correspondant{matchCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[#78716c]">
          <span>Score moyen :</span>
          <span className={`font-bold text-xs ${avgScore >= 50 ? 'text-[#059669]' : avgScore >= 30 ? 'text-[#f59e0b]' : 'text-[#78716c]'}`}>
            {avgScore}/100
          </span>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-0.5 text-[10px] text-[#f54e00] font-semibold hover:underline"
        >
          Configurer <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="h-14 w-14 rounded-2xl bg-[#f54e00]/10 flex items-center justify-center">
        <Target className="h-7 w-7 text-[#f54e00]" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-[#26251e] mb-1">Aucun profil cible créé</h3>
        <p className="text-xs text-[#78716c] max-w-xs">
          Créez votre premier ICP pour définir vos clients idéaux, personnaliser le scoring des leads et prioriser votre prospection.
        </p>
      </div>
      <Button onClick={onCreateClick} className="bg-[#f54e00] hover:bg-[#d94400] text-white font-bold gap-2">
        <Plus className="h-4 w-4" />
        Créer un profil cible
      </Button>
    </div>
  );
}
