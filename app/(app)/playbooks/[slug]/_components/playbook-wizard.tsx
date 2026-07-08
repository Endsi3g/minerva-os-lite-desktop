'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Play,
  User, MapPin, Mail,
  Target, Zap, ChevronRight, AlertCircle,
} from 'lucide-react';
import { PLAYBOOKS, CHANNEL_ICONS } from '../../data';

type GoalType = 'rdv' | 'clients' | 'mrr';

const GOAL_TYPE_OPTIONS: { value: GoalType; label: string; unit: string }[] = [
  { value: 'rdv', label: 'Remplir mon agenda', unit: 'RDV' },
  { value: 'clients', label: 'Signer des clients', unit: 'clients' },
  { value: 'mrr', label: 'Faire croître le MRR', unit: '$ MRR' },
];

const SOURCES = [
  { id: 'google', label: 'Google Maps (Apify)' },
  { id: 'here', label: 'HERE Maps' },
  { id: 'yelp', label: 'Yelp' },
  { id: 'osm', label: 'OpenStreetMap' },
  { id: 'pagesjaunes', label: 'PagesJaunes' },
];

const STEPS = ['Persona & Objectifs', 'Scraping', 'Séquence', 'Lancement'];

interface WizardState {
  goalMetric: string;
  goalTarget: number;
  niches: string[];
  cities: string[];
  radius: number;
  sources: string[];
  useDefaultSequence: boolean;
  campaignName: string;
}

function TagInput({ tags, setTags, placeholder }: { tags: string[]; setTags: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) setTags([...tags, val]);
    setInput('');
  };
  return (
    <div className="border border-[#e5e5e0] rounded-lg p-2 flex flex-wrap gap-1.5 min-h-[40px] focus-within:ring-1 focus-within:ring-[#059669]">
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-[#059669]/10 text-[#059669] rounded-full text-[10px] font-semibold border border-[#059669]/20">
          {t}
          <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-red-500 leading-none">&times;</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] text-xs outline-none bg-transparent"
      />
    </div>
  );
}

export function PlaybookWizard({ slug }: { slug: string }) {
  const router = useRouter();
  const { addCampaign, addLead, addLeadToProgram, activeWorkspace } = useReach();
  const pb = PLAYBOOKS.find((p) => p.id === slug);
  const [step, setStep] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Objectif de croissance (Programmes) — optionnel : lancer ce playbook crée
  // un vrai programme suivable dès qu'un objectif est choisi ici, au lieu
  // d'une simple campagne sans cible de croissance.
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [goalTargetValue, setGoalTargetValue] = useState(10);

  const [state, setState] = useState<WizardState>(() => ({
    goalMetric: 'leads',
    goalTarget: 50,
    niches: pb?.scraping.niches ?? [],
    cities: pb?.scraping.cities ?? [],
    radius: pb?.scraping.radius ?? 15,
    sources: pb?.scraping.sources ?? ['google', 'osm'],
    useDefaultSequence: true,
    campaignName: pb?.title ?? slug,
  }));

  if (!pb) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-[#059669] mx-auto" />
          <p className="text-sm font-bold text-[#26251e]">Playbook introuvable</p>
          <button onClick={() => router.push('/playbooks')} className="text-xs text-[#059669] underline">← Retour aux playbooks</button>
        </div>
      </div>
    );
  }

  // Scrape puis persiste réellement les leads dans la campagne, et met à jour le
  // statut du run en conséquence. Tourne en arrière-plan après l'écran de succès —
  // avant ce correctif, la réponse de /api/scrape-maps était lue puis jetée, donc
  // un playbook "lancé" ne créait jamais aucun lead et le run restait "En cours"
  // pour toujours (aucun appel PATCH n'existait dans ce fichier).
  const finalizeRun = async (cId: string | null, runId: string | null) => {
    let leadsScraped = 0;
    try {
      const scrapeRes = await fetch(getApiUrl('/api/scrape-maps'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niches: state.niches,
          cities: state.cities,
          radius: state.radius * 1000,
          sources: state.sources,
          campaignId: cId,
          workspaceId: activeWorkspace?.id,
          maxResults: 100,
        }),
      });
      const scrapeData = scrapeRes.ok ? await scrapeRes.json() : null;
      const scrapedLeads: Array<Record<string, unknown>> = scrapeData?.leads ?? [];

      const CONCURRENCY = 5;
      for (let i = 0; i < scrapedLeads.length; i += CONCURRENCY) {
        const chunk = scrapedLeads.slice(i, i + CONCURRENCY);
        const created = await Promise.all(chunk.map((item) => addLead({
          businessName: String(item.businessName ?? 'Sans nom'),
          contactName: '',
          contactEmail: '',
          niche: String(item.niche ?? state.niches[0] ?? ''),
          city: String(item.city ?? state.cities[0] ?? ''),
          source: `Playbook — ${pb!.title}`,
          status: 'New',
          temperature: 'Warm',
          nextAction: 'Vérifier la fiche et lancer la séquence',
          nextActionDate: new Date().toISOString().split('T')[0],
          website: item.website ? String(item.website) : undefined,
          rating: typeof item.rating === 'number' ? item.rating : undefined,
          reviewsCount: typeof item.reviewsCount === 'number' ? item.reviewsCount : undefined,
          mapsUrl: item.mapsUrl ? String(item.mapsUrl) : undefined,
          latitude: typeof item.latitude === 'number' ? item.latitude : undefined,
          longitude: typeof item.longitude === 'number' ? item.longitude : undefined,
          phone: item.phone ? String(item.phone) : undefined,
          campaignId: cId ?? undefined,
        })));
        leadsScraped += chunk.length;

        // Orchestration Programmes (Phase 2) : rattache chaque lead scrapé au
        // programme (growth_program_leads) quand un objectif de croissance a
        // été choisi — permet le suivi multi-programme dès l'acquisition,
        // sans attendre une action manuelle sur la fiche lead.
        if (goalType && cId) {
          await Promise.all(
            created
              .filter((lead): lead is NonNullable<typeof lead> => !!lead)
              .map((lead) => addLeadToProgram(cId, lead.id).catch(() => {}))
          );
        }
      }

      if (runId) {
        await fetch(getApiUrl('/api/playbook-runs'), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: runId, status: 'done', leads_scraped: leadsScraped }),
        });
      }
    } catch (err) {
      console.error('finalizeRun error:', err);
      if (runId) {
        try {
          await fetch(getApiUrl('/api/playbook-runs'), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: runId, status: 'error', leads_scraped: leadsScraped }),
          });
        } catch { /* best-effort */ }
      }
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);
    try {
      // 1. Create campaign
      const campaign = await addCampaign({
        name: state.campaignName,
        description: pb!.description,
        niches: state.niches,
        cities: state.cities,
        personaId: pb!.id,
        sequenceConfig: state.useDefaultSequence ? JSON.stringify(pb!.sequence) : undefined,
        goals: JSON.stringify({ metric: state.goalMetric, target: state.goalTarget }),
        goalType: goalType || undefined,
        targetValue: goalType ? goalTargetValue : undefined,
      });

      const cId = (campaign as { id: string } | undefined)?.id ?? null;

      // 2. Create playbook_run
      let runId: string | null = null;
      try {
        const runRes = await fetch(getApiUrl('/api/playbook-runs'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playbook_id: pb!.id,
            workspace_id: activeWorkspace?.id,
            campaign_id: cId,
            status: 'running',
          }),
        });
        if (runRes.ok) {
          const runData = await runRes.json();
          runId = runData?.id ?? null;
        } else {
          console.warn('playbook_run creation failed (non-blocking)');
        }
      } catch { /* non-blocking */ }

      setCampaignId(cId);
      setLaunched(true);

      // 3. Scrape + persist leads + finalize run status — fire-and-forget, the
      // success screen is already shown, this doesn't block the user.
      void finalizeRun(cId, runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du lancement');
    } finally {
      setLaunching(false);
    }
  };

  if (launched) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[#059669]/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-[#059669]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#26251e]">Playbook lancé ! 🎉</h2>
            <p className="text-xs text-[#7a7a76] mt-1">La campagne a été créée et le scraping est en cours en arrière-plan.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/campaigns')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              Voir la campagne
            </button>
            <button
              onClick={() => router.push('/playbooks')}
              className="px-4 py-2 rounded-lg border border-[#e5e5e0] text-xs font-semibold text-[#555552] hover:bg-[#f4f4f3] transition-colors"
            >
              ← Playbooks
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <button onClick={() => router.push('/playbooks')} className="flex items-center gap-1.5 text-xs text-[#7a7a76] hover:text-[#26251e] transition-colors mb-4">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux playbooks
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{pb.emoji}</span>
            <div>
              <h1 className="text-base font-black text-[#26251e]">{pb.title}</h1>
              <p className="text-xs text-[#7a7a76]">{pb.description}</p>
            </div>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={cn(
                'flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all',
                i === step ? 'bg-[#26251e] text-white border-[#26251e]' :
                i < step ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20' :
                'bg-white text-[#7a7a76] border-[#e5e5e0]'
              )}>
                {i < step ? <CheckCircle2 className="h-3 w-3" /> : <span className="w-3 h-3 flex items-center justify-center rounded-full border border-current text-[8px]">{i + 1}</span>}
                <span className="hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn('flex-1 h-px', i < step ? 'bg-[#059669]/30' : 'bg-[#e5e5e0]')} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-[#e5e5e0] p-6 space-y-5">

          {/* ── Step 0: Persona & Objectifs ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-3.5 w-3.5 text-[#7a7a76]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Persona cible</span>
                </div>
                <div className="bg-[#f7f7f4] rounded-xl p-4 border border-[#e5e5e0]">
                  <p className="text-xs text-[#26251e] leading-relaxed">{pb.icp.persona}</p>
                  <div className="mt-3 space-y-1.5">
                    {pb.icp.painPoints.map((pt, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[#555552]">
                        <span className="text-[#059669] shrink-0 font-bold mt-0.5">✗</span>
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-6 mt-3 text-xs">
                    <div><span className="text-[10px] font-bold uppercase text-[#7a7a76]">Budget</span><p className="font-semibold text-[#26251e]">{pb.icp.budget}</p></div>
                    <div><span className="text-[10px] font-bold uppercase text-[#7a7a76]">Secteur</span><p className="font-semibold text-[#26251e]">{pb.icp.sector}</p></div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-3.5 w-3.5 text-[#7a7a76]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Objectif de croissance <span className="normal-case font-normal">(optionnel — en fait un programme suivable)</span></span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                  {GOAL_TYPE_OPTIONS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGoalType((prev) => (prev === g.value ? null : g.value))}
                      className={cn(
                        'text-left p-2.5 rounded-lg border-2 text-xs font-bold transition-all',
                        goalType === g.value
                          ? 'border-[#059669] text-[#059669] bg-[#059669]/5'
                          : 'border-[#e5e5e0] text-[#26251e] hover:border-[#059669]/30',
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                {goalType && (
                  <div className="flex items-center gap-2 mb-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] shrink-0">Cible</label>
                    <input
                      type="number"
                      min={1}
                      value={goalTargetValue}
                      onChange={(e) => setGoalTargetValue(Number(e.target.value))}
                      className="w-24 text-xs border border-[#e5e5e0] rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                    />
                    <span className="text-[10px] text-[#7a7a76]">{GOAL_TYPE_OPTIONS.find((g) => g.value === goalType)?.unit}</span>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-[#26251e] block mb-1.5">Nom de la campagne</label>
                    <input
                      value={state.campaignName}
                      onChange={(e) => setState((s) => ({ ...s, campaignName: e.target.value }))}
                      className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-[#26251e] block mb-1.5">Métrique cible</label>
                      <select
                        value={state.goalMetric}
                        onChange={(e) => setState((s) => ({ ...s, goalMetric: e.target.value }))}
                        className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white"
                      >
                        <option value="leads">Leads scrapés</option>
                        <option value="emails_sent">Emails envoyés</option>
                        <option value="replies">Réponses reçues</option>
                        <option value="meetings">RDV pris</option>
                        <option value="deals">Deals signés</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-[#26251e] block mb-1.5">Objectif chiffré</label>
                      <input
                        type="number"
                        min={1}
                        value={state.goalTarget}
                        onChange={(e) => setState((s) => ({ ...s, goalTarget: Number(e.target.value) }))}
                        className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Scraping Presets ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-3.5 w-3.5 text-[#7a7a76]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Preset de scraping</span>
                </div>
                <p className="text-[10px] text-[#7a7a76] mb-4">Pré-rempli depuis le playbook — modifiez selon vos besoins. Appuyez sur Entrée pour ajouter une valeur.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#26251e] block mb-1.5">Niches ciblées</label>
                  <TagInput tags={state.niches} setTags={(t) => setState((s) => ({ ...s, niches: t }))} placeholder="ex. Dentiste, Restaurant…" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#26251e] block mb-1.5">Villes</label>
                  <TagInput tags={state.cities} setTags={(t) => setState((s) => ({ ...s, cities: t }))} placeholder="ex. Montréal, Laval…" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#26251e] block mb-1.5">
                    Rayon de recherche — <span className="text-[#059669]">{state.radius} km</span>
                  </label>
                  <input
                    type="range" min={2} max={50} step={1}
                    value={state.radius}
                    onChange={(e) => setState((s) => ({ ...s, radius: Number(e.target.value) }))}
                    className="w-full accent-[#059669]"
                  />
                  <div className="flex justify-between text-[10px] text-[#7a7a76] mt-0.5"><span>2 km</span><span>50 km</span></div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#26251e] block mb-1.5">Sources de données</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SOURCES.map((src) => (
                      <label key={src.id} className={cn(
                        'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-xs',
                        state.sources.includes(src.id)
                          ? 'border-[#059669]/40 bg-[#059669]/5 text-[#059669] font-semibold'
                          : 'border-[#e5e5e0] text-[#555552] hover:border-[#26251e]/20'
                      )}>
                        <input
                          type="checkbox"
                          checked={state.sources.includes(src.id)}
                          onChange={(e) => setState((s) => ({
                            ...s,
                            sources: e.target.checked ? [...s.sources, src.id] : s.sources.filter((x) => x !== src.id),
                          }))}
                          className="accent-[#059669]"
                        />
                        {src.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Séquence ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-[#7a7a76]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Séquence de contact</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#7a7a76]">Utiliser telle quelle</span>
                  <button
                    onClick={() => setState((s) => ({ ...s, useDefaultSequence: !s.useDefaultSequence }))}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                      state.useDefaultSequence ? 'bg-[#059669]' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200', state.useDefaultSequence ? 'translate-x-4' : 'translate-x-0')} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {pb.sequence.map((step_item, i) => (
                  <div key={i} className="rounded-xl border border-[#e5e5e0] p-3.5 space-y-2 bg-white">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#059669] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                      <span className="text-[#7a7a76]">{CHANNEL_ICONS[step_item.channel] ?? <Mail className="h-3.5 w-3.5" />}</span>
                      <span className="text-xs font-bold text-[#26251e] capitalize">{step_item.channel}</span>
                      <span className="text-[10px] text-[#7a7a76] ml-auto">Jour {step_item.day}</span>
                    </div>
                    {step_item.subject && (
                      <p className="text-[10px] font-semibold text-[#555552] pl-8">Objet : {step_item.subject}</p>
                    )}
                    <pre className="text-[10px] text-[#7a7a76] leading-relaxed whitespace-pre-wrap font-sans pl-8 line-clamp-3">
                      {step_item.template}
                    </pre>
                  </div>
                ))}
              </div>

              {!state.useDefaultSequence && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
                  <p className="font-semibold mb-1">Personnaliser la séquence</p>
                  <p>La séquence sera créée sans contenu pré-rempli. Vous pourrez la modifier dans <strong>/sequences/new</strong> après le lancement.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Résumé & Lancement ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Play className="h-3.5 w-3.5 text-[#7a7a76]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Résumé du lancement</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Campagne', value: state.campaignName },
                    ...(goalType ? [{ label: 'Programme', value: `${GOAL_TYPE_OPTIONS.find((g) => g.value === goalType)?.label} — cible ${goalTargetValue} ${GOAL_TYPE_OPTIONS.find((g) => g.value === goalType)?.unit}` }] : []),
                    { label: 'Objectif', value: `${state.goalTarget} ${state.goalMetric}` },
                    { label: 'Niches', value: state.niches.join(', ') || '—' },
                    { label: 'Villes', value: state.cities.join(', ') || '—' },
                    { label: 'Rayon', value: `${state.radius} km` },
                    { label: 'Sources', value: state.sources.join(', ') },
                    { label: 'Séquence', value: state.useDefaultSequence ? `${pb.sequence.length} steps pré-configurés` : 'Vide (à personnaliser)' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-3 text-xs">
                      <span className="w-24 shrink-0 text-[#7a7a76] font-semibold">{label}</span>
                      <span className="text-[#26251e] font-medium flex-1">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#059669]/5 border border-[#059669]/20 rounded-xl p-4 text-xs text-[#059669]">
                <p className="font-semibold mb-1">Ce qui sera créé :</p>
                <ul className="space-y-0.5 text-[#059669]/80">
                  <li>✓ Une campagne &quot;{state.campaignName}&quot;</li>
                  <li>✓ Un run playbook pour le suivi</li>
                  <li>✓ Un job de scraping ({state.niches.length} niches × {state.cities.length} villes)</li>
                </ul>
              </div>

              {error && (
                <div className="border border-red-200 bg-red-50 rounded-xl p-3 text-xs text-red-600 flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => step === 0 ? router.push('/playbooks') : setStep((s) => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e5e5e0] text-xs font-semibold text-[#555552] hover:bg-[#f4f4f3] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {step === 0 ? 'Annuler' : 'Précédent'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#26251e] hover:bg-[#3a3930] text-white text-xs font-bold transition-colors"
            >
              Suivant
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={launching || state.niches.length === 0 || state.cities.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors disabled:opacity-60"
            >
              {launching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {launching ? 'Lancement…' : 'Lancer le playbook'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
