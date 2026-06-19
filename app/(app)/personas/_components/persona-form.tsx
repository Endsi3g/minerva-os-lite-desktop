"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Target, MapPin, X, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useReach } from "@/lib/reach-context";
import { usePersonas } from "@/lib/use-personas";
import { DEFAULT_SCORING, SCORING_LABELS, type ScoringCriteria } from "@/lib/lead-scoring";

interface PersonaFormProps {
  personaId?: string;
}

const SCORING_KEYS = Object.keys(DEFAULT_SCORING) as (keyof ScoringCriteria)[];

export function PersonaForm({ personaId }: PersonaFormProps) {
  const router = useRouter();
  const { leads, activeWorkspace } = useReach();
  const { personas, loading, addPersona, updatePersona } = usePersonas(activeWorkspace?.id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetNichesInput, setTargetNichesInput] = useState("");
  const [targetCitiesInput, setTargetCitiesInput] = useState("");
  const [targetNiches, setTargetNiches] = useState<string[]>([]);
  const [targetCities, setTargetCities] = useState<string[]>([]);
  const [scoringCriteria, setScoringCriteria] = useState<ScoringCriteria>({ ...DEFAULT_SCORING });
  
  const [saving, setSaving] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Suggested niches from existing leads
  const suggestedNiches = useMemo(
    () => Array.from(new Set(leads.map((l) => l.niche).filter(Boolean))).slice(0, 15),
    [leads]
  );

  // Load existing persona data if editing
  useEffect(() => {
    if (!loading && personas.length > 0 && personaId && !initialLoaded) {
      const persona = personas.find((p) => p.id === personaId);
      if (persona) {
        setName(persona.name);
        setDescription(persona.description);
        setTargetNiches([...persona.targetNiches]);
        setTargetCities([...persona.targetCities]);
        setScoringCriteria({ ...persona.scoringCriteria });
        setInitialLoaded(true);
      }
    }
  }, [personas, loading, personaId, initialLoaded]);

  function addNiche(raw: string) {
    const tag = raw.trim();
    if (!tag || targetNiches.includes(tag)) return;
    setTargetNiches((prev) => [...prev, tag]);
    setTargetNichesInput("");
  }

  function addCity(raw: string) {
    const tag = raw.trim();
    if (!tag || targetCities.includes(tag)) return;
    setTargetCities((prev) => [...prev, tag]);
    setTargetCitiesInput("");
  }

  function removeNiche(tag: string) {
    setTargetNiches((prev) => prev.filter((n) => n !== tag));
  }

  function removeCity(tag: string) {
    setTargetCities((prev) => prev.filter((c) => c !== tag));
  }

  function setCriteria(key: keyof ScoringCriteria, value: number) {
    setScoringCriteria((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !activeWorkspace) return;
    setSaving(true);

    const payload = {
      workspaceId: activeWorkspace.id,
      name: name.trim(),
      description: description.trim(),
      targetNiches,
      targetCities,
      scoringCriteria,
    };

    try {
      if (personaId) {
        await updatePersona(personaId, payload);
      } else {
        await addPersona(payload);
      }
      router.push("/personas");
    } catch (err) {
      console.error("Error saving target profile:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading && personaId && !initialLoaded) {
    return (
      <div className="flex h-full items-center justify-center bg-[#fafaf9]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#10b981] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf9] text-[#26251e] font-sans">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        
        {/* Header navigation bar */}
        <div className="flex items-center gap-3 border-b border-[#e5e5e0] pb-4">
          <button
            onClick={() => router.push("/personas")}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] hover:bg-neutral-100 text-[#807d72] hover:text-[#26251e] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              {personaId ? "Modifier le profil cible" : "Nouveau profil cible (ICP)"}
            </h1>
            <p className="text-xs text-[#807d72] mt-0.5">
              Configurez les critères d'adéquation et de priorisation de vos prospects.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Card 1: Basic Information */}
          <div className="bg-white border border-[#e5e5e0] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#807d72] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#10b981]" />
              Informations de base
            </h2>

            <div className="space-y-1">
              <label htmlFor="persona-name" className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                Nom du profil *
              </label>
              <Input
                id="persona-name"
                placeholder="ex : Restaurants sans service de livraison"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full text-xs"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="persona-desc" className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                Description
              </label>
              <Textarea
                id="persona-desc"
                placeholder="Cibler les restaurants locaux indépendants pour leur vendre notre système de commande en ligne."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full text-xs"
              />
            </div>
          </div>

          {/* Card 2: Targets (Niches & Cities) */}
          <div className="bg-white border border-[#e5e5e0] rounded-2xl p-6 space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#807d72] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#10b981]" />
              Filtres géographiques & sectoriels
            </h2>

            {/* Target Niches */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72] block">
                Niches cibles
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Saisissez une niche (ex: Boulangerie, Spa...) et appuyez sur Entrée"
                  value={targetNichesInput}
                  onChange={(e) => setTargetNichesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addNiche(targetNichesInput);
                    }
                  }}
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addNiche(targetNichesInput)}
                  className="h-9 text-xs font-semibold border-[#e5e5e0] cursor-pointer"
                >
                  Ajouter
                </Button>
              </div>

              {/* Suggestions */}
              {suggestedNiches.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#807d72] uppercase block">Suggéré selon vos leads :</span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedNiches
                      .filter((n) => !targetNiches.includes(n))
                      .slice(0, 10)
                      .map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => addNiche(n)}
                          className="text-[10px] px-2 py-0.5 border border-dashed border-[#e5e5e0] rounded-full text-[#807d72] hover:border-[#10b981] hover:text-[#10b981] transition-colors font-medium cursor-pointer"
                        >
                          + {n}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Niches badges display */}
              {targetNiches.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {targetNiches.map((n) => (
                    <span
                      key={n}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-[#26251e] border border-[#e5e5e0]"
                    >
                      {n}
                      <button
                        type="button"
                        onClick={() => removeNiche(n)}
                        className="hover:text-red-600 ml-1 transition-colors cursor-pointer"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Target Cities */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72] block">
                Villes cibles
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Montréal, Québec, Sherbrooke..."
                  value={targetCitiesInput}
                  onChange={(e) => setTargetCitiesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCity(targetCitiesInput);
                    }
                  }}
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addCity(targetCitiesInput)}
                  className="h-9 text-xs font-semibold border-[#e5e5e0] cursor-pointer"
                >
                  Ajouter
                </Button>
              </div>

              {/* Cities badges display */}
              {targetCities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {targetCities.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-[#26251e] border border-[#e5e5e0]"
                    >
                      <MapPin className="h-2.5 w-2.5 text-[#807d72]" />
                      {c}
                      <button
                        type="button"
                        onClick={() => removeCity(c)}
                        className="hover:text-red-600 ml-1 transition-colors cursor-pointer"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Scoring weights */}
          <div className="bg-white border border-[#e5e5e0] rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#807d72]">
                Critères de scoring et pondération
              </h2>
              <p className="text-[10px] text-[#807d72] mt-1 leading-relaxed">
                Ajustez l'importance de chaque signal pour le calcul automatique de la compatibilité (0 = ignoré, 40 = importance capitale).
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {SCORING_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="text-xs text-foreground font-semibold w-52 shrink-0">
                    {SCORING_LABELS[key]}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={5}
                    value={scoringCriteria[key]}
                    onChange={(e) => setCriteria(key, Number(e.target.value))}
                    className="flex-1 accent-[#10b981] h-1.5 bg-neutral-100 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs font-bold text-foreground w-8 text-right font-mono">
                    +{scoringCriteria[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/personas")}
              disabled={saving}
              className="h-10 px-5 text-xs font-bold border-[#e5e5e0] cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim()}
              className="h-10 px-6 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              {saving
                ? "Enregistrement en cours..."
                : personaId
                ? "Enregistrer les modifications"
                : "Créer le profil cible"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
