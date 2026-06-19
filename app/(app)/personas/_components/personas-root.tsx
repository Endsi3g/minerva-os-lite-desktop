"use client";

import React, { useState, useMemo } from "react";
import { Plus, Trash2, Edit2, Target, Users, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useReach } from "@/lib/reach-context";
import { usePersonas, type Persona } from "@/lib/use-personas";
import { scoreLeadByPersona, type ScoringCriteria } from "@/lib/lead-scoring";
import { SCORING_LABELS } from "@/lib/lead-scoring";
import { useRouter } from "next/navigation";

export function PersonasRoot() {
  const router = useRouter();
  const { leads, activeWorkspace } = useReach();
  const { personas, loading, deletePersona } = usePersonas(activeWorkspace?.id);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const suggestedNiches = useMemo(
    () => Array.from(new Set(leads.map((l) => l.niche).filter(Boolean))).slice(0, 20),
    [leads]
  );

  async function handleDelete(id: string) {
    await deletePersona(id);
    setConfirmDeleteId(null);
  }

  function matchCount(persona: Persona): number {
    if (persona.targetNiches.length === 0 && persona.targetCities.length === 0) return leads.length;
    return leads.filter((l) => {
      const nicheOk =
        persona.targetNiches.length === 0 ||
        (l.niche &&
          persona.targetNiches.some(
            (n) =>
              l.niche!.toLowerCase().includes(n.toLowerCase()) ||
              n.toLowerCase().includes(l.niche!.toLowerCase())
          ));
      const cityOk =
        persona.targetCities.length === 0 ||
        (l.city &&
          persona.targetCities.some(
            (c) =>
              l.city!.toLowerCase().includes(c.toLowerCase()) ||
              c.toLowerCase().includes(l.city!.toLowerCase())
          ));
      return nicheOk && cityOk;
    }).length;
  }

  function avgScore(persona: Persona): number {
    const matching = leads.filter((l) => {
      if (persona.targetNiches.length === 0 && persona.targetCities.length === 0) return true;
      const nicheOk =
        persona.targetNiches.length === 0 ||
        (l.niche && persona.targetNiches.some((n) => l.niche!.toLowerCase().includes(n.toLowerCase())));
      const cityOk =
        persona.targetCities.length === 0 ||
        (l.city && persona.targetCities.some((c) => l.city!.toLowerCase().includes(c.toLowerCase())));
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
    <div className="h-full overflow-y-auto bg-[#fafaf9]">
      <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-200">
        
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#e5e5e0]">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#26251e] font-sans">Profils cibles (ICP)</h1>
            <p className="text-xs text-[#807d72] mt-1 max-w-xl">
              Définissez vos clients idéaux avec des niches cibles, des villes et des critères de scoring personnalisés.
              Chaque profil calcule automatiquement la compatibilité de vos leads.
            </p>
          </div>
          <Button
            onClick={() => router.push("/personas/new")}
            className="h-9 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau profil
          </Button>
        </div>

        {/* Persona cards grid */}
        {loading ? (
          <div className="flex items-center justify-center h-32 text-[#807d72] text-xs">
            Chargement des profils...
          </div>
        ) : personas.length === 0 ? (
          <EmptyState onCreateClick={() => router.push("/personas/new")} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                matchCount={matchCount(persona)}
                avgScore={avgScore(persona)}
                onEdit={() => router.push(`/personas/${persona.id}/edit`)}
                onDelete={() => setConfirmDeleteId(persona.id)}
              />
            ))}
          </div>
        )}
      </div>

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
              className="h-8 text-xs border-border cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="h-8 text-xs font-bold cursor-pointer"
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
          className="h-full rounded-full bg-[#10b981] transition-all duration-500"
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
    avgScore >= 50 ? "text-[#059669]" : avgScore >= 30 ? "text-[#10b981]" : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-4 transition-colors hover:border-[#10b981]/30 hover:shadow-xs">
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-[#10b981]/10 flex items-center justify-center shrink-0">
            <Target className="h-4 w-4 text-[#10b981]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{persona.name}</h3>
            {persona.description && (
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{persona.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Modifier"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
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
            {persona.targetNiches.map((n) => (
              <span
                key={n}
                className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border border-[#e5e5e0] bg-white text-foreground"
              >
                {n}
              </span>
            ))}
          </div>
        )}
        {persona.targetCities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {persona.targetCities.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground border border-[#e5e5e0] rounded-full px-2 py-0.5 bg-white"
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
        <div className="space-y-1.5 pt-3 border-t border-[#e5e5e0]">
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
      <div className="flex items-center justify-between pt-3 border-t border-[#e5e5e0]">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          <span>
            <strong className="text-foreground">{matchCount}</strong>{" "}
            lead{matchCount !== 1 ? "s" : ""} correspondant{matchCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Score moyen :</span>
          <span className={`font-bold font-mono text-xs ${scoreColor}`}>{avgScore}/100</span>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-0.5 text-[10px] text-[#10b981] font-semibold hover:underline transition-colors cursor-pointer"
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
      <div className="h-12 w-12 rounded-xl border border-[#e5e5e0] bg-white flex items-center justify-center">
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
        className="h-9 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl gap-2 cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        Créer un profil cible
      </Button>
    </div>
  );
}
