'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft, ChevronRight, Mail, CheckCircle2, Loader2, Plus, Trash2,
  Phone, Link2, MessageSquare, Send, Calendar, Sparkles, ChevronDown, ChevronUp,
  User, Layers, Megaphone, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSegmentMembers, SEGMENT_FIELDS, SEGMENT_OPERATORS, type SegmentRule, type LeadSegment } from '@/lib/lead-segments';

// ─── Types ────────────────────────────────────────────────────────────────────

type StepChannel = 'Email' | 'Call' | 'LinkedIn' | 'SMS';

const CHANNEL_CONFIG: Record<StepChannel, { icon: React.ReactNode; label: string; color: string; bodyLabel: string }> = {
  Email:    { icon: <Mail className="h-3 w-3" />, label: 'Email', color: 'text-blue-600 bg-blue-50 border-blue-200', bodyLabel: 'Corps de l\'email' },
  Call:     { icon: <Phone className="h-3 w-3" />, label: 'Appel', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', bodyLabel: 'Script d\'appel' },
  LinkedIn: { icon: <Link2 className="h-3 w-3" />, label: 'LinkedIn DM', color: 'text-[#0077b5]/80 bg-[#0077b5]/10 border-[#0077b5]/20', bodyLabel: 'Message LinkedIn' },
  SMS:      { icon: <MessageSquare className="h-3 w-3" />, label: 'SMS', color: 'text-purple-600 bg-purple-50 border-purple-200', bodyLabel: 'Texte SMS' },
};

interface NewStep {
  stepNumber: number;
  delayDays: number;
  channel: StepChannel;
  subject: string;
  body: string;
}

const DEFAULT_STEPS: NewStep[] = [
  { stepNumber: 1, delayDays: 0, channel: 'Email', subject: '', body: '' },
  { stepNumber: 2, delayDays: 3, channel: 'Call', subject: 'Appel de suivi', body: '' },
  { stepNumber: 3, delayDays: 7, channel: 'Email', subject: '', body: '' },
];

// ─── Step indicator ──────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { label: 'Lead', description: 'Sélectionner' },
  { label: 'Étapes', description: 'Configurer' },
  { label: 'Lancer', description: 'Réviser & créer' },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {WIZARD_STEPS.map((step, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1 min-w-[80px]">
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
            {i < WIZARD_STEPS.length - 1 && (
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

// ─── Step builder (reused logic from sequences-root) ─────────────────────────

function StepBuilder({
  steps,
  onChange,
  selectedLeadId,
  leads,
}: {
  steps: NewStep[];
  onChange: (steps: NewStep[]) => void;
  selectedLeadId: string;
  leads: ReturnType<typeof useReach>['leads'];
}) {
  const [generatingStep, setGeneratingStep] = useState<number | null>(null);
  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  const update = (i: number, patch: Partial<NewStep>) =>
    onChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const addStep = () => {
    const lastDelay = steps[steps.length - 1]?.delayDays ?? 0;
    onChange([
      ...steps,
      {
        stepNumber: steps.length + 1,
        delayDays: lastDelay + 3,
        channel: 'Email',
        subject: '',
        body: '',
      },
    ]);
  };

  const removeStep = (i: number) => {
    const next = steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    onChange(next);
  };

  const generateDraftForStep = async (stepIndex: number) => {
    if (!selectedLead) return;
    setGeneratingStep(stepIndex);
    try {
      const step = steps[stepIndex];
      const isFollowUp = step.delayDays > 0;
      const tone = isFollowUp ? 'relance douce' : 'prospection initiale';

      const res = await fetch(getApiUrl('/api/generate-draft'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          channel: 'Email',
          tone,
          context: isFollowUp
            ? `Relance #${stepIndex} — ${step.delayDays} jour${step.delayDays > 1 ? 's' : ''} après l'email précédent.`
            : 'Premier contact par email.',
        }),
      });

      if (res.ok) {
        const { draft } = await res.json();
        const lines = (draft as string).split('\n');
        const subjectLine = lines.find(
          (l: string) => l.toLowerCase().startsWith('objet:') || l.toLowerCase().startsWith('sujet:'),
        );
        const subject = subjectLine
          ? subjectLine.replace(/^(objet|sujet)\s*:\s*/i, '').trim()
          : `${isFollowUp ? 'Suite' : 'Contact'} — ${selectedLead.businessName}`;
        const body = lines.filter((l: string) => l !== subjectLine).join('\n').trim();
        update(stepIndex, { subject, body });
      }
    } finally {
      setGeneratingStep(null);
    }
  };

  return (
    <div className="space-y-4">
      {steps.map((step, i) => {
        const cfg = CHANNEL_CONFIG[step.channel];
        return (
          <div key={step.stepNumber} className="border border-[#e5e5e0] rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-[#059669] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {step.stepNumber}
                </div>
                <span className="text-xs font-bold text-[#26251e]">
                  {step.delayDays === 0 ? 'Étape immédiate' : `Étape J+${step.delayDays}`}
                </span>
                <span className={`text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded border ${cfg.color}`}>
                  {cfg.icon}{cfg.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Channel selector */}
                <select
                  value={step.channel}
                  onChange={(e) => update(i, { channel: e.target.value as StepChannel })}
                  className="text-[10px] border border-[#e5e5e0] rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white"
                >
                  {(Object.keys(CHANNEL_CONFIG) as StepChannel[]).map((c) => (
                    <option key={c} value={c}>{CHANNEL_CONFIG[c].label}</option>
                  ))}
                </select>
                <label className="text-[10px] text-[#7a7a76]">J+</label>
                <input
                  type="number"
                  min={0}
                  value={step.delayDays}
                  onChange={(e) => update(i, { delayDays: Number(e.target.value) })}
                  className="w-12 text-xs border border-[#e5e5e0] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                  disabled={i === 0}
                />
                {step.channel === 'Email' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateDraftForStep(i)}
                    disabled={!selectedLead || generatingStep === i}
                    className="h-7 text-[10px] gap-1 border-[#e5e5e0] text-[#7a7a76]"
                  >
                    {generatingStep === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    IA
                  </Button>
                )}
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50 text-[#7a7a76] hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {step.channel === 'Email' && (
              <Input
                placeholder="Sujet de l'email *"
                value={step.subject}
                onChange={(e) => update(i, { subject: e.target.value })}
                className="text-xs h-8"
              />
            )}
            <textarea
              placeholder={
                step.channel !== 'Email'
                  ? `${cfg.bodyLabel} (action manuelle — rappel)`
                  : "Corps de l'email *"
              }
              value={step.body}
              onChange={(e) => update(i, { body: e.target.value })}
              rows={step.channel === 'Call' ? 5 : 4}
              className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#059669] resize-none"
            />
            {step.channel !== 'Email' && (
              <p className="text-[9px] text-amber-600 flex items-center gap-1">
                ⚠ Cette étape est manuelle — un rappel de tâche sera créé automatiquement à J+{step.delayDays}.
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addStep}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-[#e5e5e0] rounded-xl text-[10px] font-bold text-[#7a7a76] hover:border-[#059669]/40 hover:text-[#059669] transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter une étape
      </button>
    </div>
  );
}

// ─── AI Assisted Mode Panel ───────────────────────────────────────────────────

type CampaignType = 'cold' | 'relance' | 'upsell';
type Intensity = 'light' | 'standard' | 'aggressive';

const CAMPAIGN_TYPES: { id: CampaignType; label: string; description: string }[] = [
  { id: 'cold', label: 'Prospection froide', description: 'Premier contact, aucune relation existante' },
  { id: 'relance', label: 'Relance', description: 'Prospect qui n\'a pas répondu à une première approche' },
  { id: 'upsell', label: 'Upsell', description: 'Client existant ou semi-qualifié' },
];

const INTENSITIES: { id: Intensity; label: string; steps: number }[] = [
  { id: 'light', label: 'Light', steps: 3 },
  { id: 'standard', label: 'Standard', steps: 5 },
  { id: 'aggressive', label: 'Aggressive', steps: 8 },
];

function AIAssistedPanel({ onGenerate }: { onGenerate: (steps: NewStep[]) => void }) {
  const [open, setOpen] = useState(false);
  const [personaDesc, setPersonaDesc] = useState('');
  const [campaignType, setCampaignType] = useState<CampaignType>('cold');
  const [durationDays, setDurationDays] = useState(21);
  const [intensity, setIntensity] = useState<Intensity>('standard');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/generate-sequence'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_description: personaDesc || 'PME locale au Québec cherchant à améliorer sa présence web',
          campaign_type: campaignType,
          duration_days: durationDays,
          intensity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur IA');

      const generatedSteps: NewStep[] = data.steps.map((s: {
        day: number; channel: string; subject_hint?: string; body_hint?: string; objective?: string; angle?: string;
      }, i: number) => ({
        stepNumber: i + 1,
        delayDays: s.day,
        channel: (['Email', 'Call', 'LinkedIn', 'SMS'].includes(s.channel) ? s.channel : 'Email') as NewStep['channel'],
        subject: s.subject_hint || '',
        body: [s.objective && `Objectif : ${s.objective}`, s.angle && `Angle : ${s.angle}`, s.body_hint && `\n${s.body_hint}`].filter(Boolean).join('\n'),
      }));

      onGenerate(generatedSteps);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border border-[#059669]/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#059669]/5 hover:bg-[#059669]/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#059669]" />
          <span className="text-xs font-bold text-[#059669]">Mode assisté IA</span>
          <span className="text-[10px] text-[#059669]/70 bg-[#059669]/10 px-1.5 py-0.5 rounded-full">Nouveau</span>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-[#059669]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#059669]" />}
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-white">
          <p className="text-[10px] text-[#7a7a76]">Décrivez votre persona cible et l&apos;IA génère automatiquement une cadence optimisée.</p>

          <div>
            <label className="text-xs font-bold text-[#26251e] block mb-1.5">Persona cible</label>
            <textarea
              value={personaDesc}
              onChange={(e) => setPersonaDesc(e.target.value)}
              rows={2}
              placeholder="ex. Dentiste indépendant à Montréal, site web daté, peu présent sur Google Maps…"
              className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#059669] resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#26251e] block mb-1.5">Type de campagne</label>
            <div className="grid grid-cols-3 gap-2">
              {CAMPAIGN_TYPES.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => setCampaignType(ct.id)}
                  className={cn(
                    'p-2 rounded-lg border text-left transition-all',
                    campaignType === ct.id
                      ? 'border-[#059669] bg-[#059669]/5'
                      : 'border-[#e5e5e0] hover:border-[#059669]/30'
                  )}
                >
                  <p className="text-[10px] font-bold text-[#26251e]">{ct.label}</p>
                  <p className="text-[9px] text-[#7a7a76] mt-0.5 leading-snug">{ct.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-[#26251e] block mb-1.5">Durée — <span className="text-[#059669]">{durationDays} jours</span></label>
              <input type="range" min={7} max={60} step={1} value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} className="w-full accent-[#059669]" />
              <div className="flex justify-between text-[9px] text-[#7a7a76] mt-0.5"><span>7j</span><span>60j</span></div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-[#26251e] block mb-1.5">Intensité</label>
              <div className="flex gap-1">
                {INTENSITIES.map((int) => (
                  <button
                    key={int.id}
                    onClick={() => setIntensity(int.id)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all',
                      intensity === int.id
                        ? 'border-[#059669] bg-[#059669] text-white'
                        : 'border-[#e5e5e0] text-[#555552] hover:border-[#059669]/30'
                    )}
                  >
                    {int.label}
                    <span className="block text-[9px] font-normal opacity-70">{int.steps} steps</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-[10px] text-red-500 bg-red-50 border border-red-100 rounded px-2 py-1.5">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors disabled:opacity-60"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {generating ? 'Génération en cours…' : 'Générer la cadence'}
          </button>
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

type TargetMode = 'lead' | 'segment' | 'campaign';

export function NewSequenceRoot() {
  const router = useRouter();
  const { leads, campaigns, activeWorkspace, user } = useReach();

  const [step, setStep] = useState(0);
  const [targetMode, setTargetMode] = useState<TargetMode>('lead');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [steps, setSteps] = useState<NewStep[]>(DEFAULT_STEPS);
  const [sendFirstNow, setSendFirstNow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Segments dynamiques (groupes de leads par règles)
  const [segments, setSegments] = useState<LeadSegment[]>([]);
  const [showCreateSegment, setShowCreateSegment] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [newSegmentRules, setNewSegmentRules] = useState<SegmentRule[]>([{ field: 'score', operator: 'greater_than', value: 80 }]);
  const [savingSegment, setSavingSegment] = useState(false);

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('lead_segments')
        .select('id, workspace_id, name, rules, created_at')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });
      setSegments((data || []).map((s: { id: string; workspace_id: string; name: string; rules: unknown; created_at: string }) => ({
        id: s.id, workspaceId: s.workspace_id, name: s.name,
        rules: Array.isArray(s.rules) ? s.rules as SegmentRule[] : [], createdAt: s.created_at,
      })));
    })();
  }, [activeWorkspace?.id]);

  const selectedLead = leads.find((l) => l.id === selectedLeadId);
  const selectedSegment = segments.find((s) => s.id === selectedSegmentId);
  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  const segmentMatches = useMemo(
    () => (selectedSegment ? getSegmentMembers(leads, selectedSegment.rules) : []),
    [leads, selectedSegment],
  );
  const campaignMatches = useMemo(
    () => (selectedCampaign ? leads.filter((l) => l.campaignId === selectedCampaign.id) : []),
    [leads, selectedCampaign],
  );

  // Les leads réellement ciblés par la séquence, selon le mode choisi.
  const targetLeads = useMemo(() => {
    if (targetMode === 'lead') return selectedLead ? [selectedLead] : [];
    if (targetMode === 'segment') return segmentMatches.filter((l) => l.contactEmail);
    if (targetMode === 'campaign') return campaignMatches.filter((l) => l.contactEmail);
    return [];
  }, [targetMode, selectedLead, segmentMatches, campaignMatches]);

  const filteredLeads = leads.filter((l) => {
    const q = leadSearch.toLowerCase();
    return (
      l.businessName.toLowerCase().includes(q) ||
      (l.contactEmail ?? '').toLowerCase().includes(q)
    );
  });

  const handleCreateSegment = async () => {
    if (!newSegmentName.trim() || !activeWorkspace?.id) return;
    setSavingSegment(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('lead_segments')
        .insert({ workspace_id: activeWorkspace.id, name: newSegmentName.trim(), rules: newSegmentRules, created_by: user?.id })
        .select('id, workspace_id, name, rules, created_at')
        .single();
      if (error || !data) throw error;
      const created: LeadSegment = { id: data.id, workspaceId: data.workspace_id, name: data.name, rules: data.rules, createdAt: data.created_at };
      setSegments((prev) => [created, ...prev]);
      setSelectedSegmentId(created.id);
      setShowCreateSegment(false);
      setNewSegmentName('');
      setNewSegmentRules([{ field: 'score', operator: 'greater_than', value: 80 }]);
    } catch (err) {
      console.error('Failed to create segment:', err);
    } finally {
      setSavingSegment(false);
    }
  };

  const canNext = () => {
    if (step === 0) {
      if (targetMode === 'lead') return !!selectedLeadId;
      if (targetMode === 'segment') return !!selectedSegmentId && segmentMatches.length > 0;
      if (targetMode === 'campaign') return !!selectedCampaignId && campaignMatches.length > 0;
      return false;
    }
    if (step === 1) return steps.length > 0;
    return true;
  };

  const handleCreate = async () => {
    if (targetLeads.length === 0) return;
    if (steps.some((s) => s.channel === 'Email' && (!s.subject.trim() || !s.body.trim()))) {
      setSaveError('Remplissez le sujet et le corps de chaque étape Email.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    setProgress({ done: 0, total: targetLeads.length });
    try {
      const groupLabel = targetMode === 'segment' ? selectedSegment?.name : targetMode === 'campaign' ? selectedCampaign?.name : undefined;
      let failures = 0;
      for (let i = 0; i < targetLeads.length; i++) {
        const lead = targetLeads[i];
        try {
          const res = await fetch(getApiUrl('/api/email-sequences'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadId: lead.id,
              leadName: lead.businessName,
              leadEmail: lead.contactEmail || '',
              sequenceName: groupLabel ? `Séquence — ${groupLabel} — ${lead.businessName}` : `Séquence — ${lead.businessName}`,
              steps,
              workspaceId: null,
              sendFirstNow,
            }),
          });
          if (!res.ok) failures++;
        } catch {
          failures++;
        }
        setProgress({ done: i + 1, total: targetLeads.length });
      }
      if (failures === targetLeads.length) {
        throw new Error("Aucune séquence n'a pu être créée.");
      }
      router.push('/sequences');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Top bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/sequences')}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] hover:bg-[#f4f4f3] text-[#7a7a76] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#059669]" />
              <h1 className="text-sm font-bold text-[#26251e]">Nouvelle séquence</h1>
            </div>
            <p className="text-[10px] text-[#7a7a76] mt-0.5">Configuration en {WIZARD_STEPS.length} étapes</p>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Step 0 — Choose target */}
        {step === 0 && (
          <div className="space-y-4">
            {/* Target mode toggle */}
            <div className="inline-flex items-center gap-1 rounded-lg border border-[#e5e5e0] bg-white p-1">
              {([
                { mode: 'lead' as const, icon: User, label: 'Lead unique' },
                { mode: 'segment' as const, icon: Layers, label: 'Segment dynamique' },
                { mode: 'campaign' as const, icon: Megaphone, label: 'Campagne' },
              ]).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTargetMode(mode)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors',
                    targetMode === mode ? 'bg-[#26251e] text-white' : 'text-[#7a7a76] hover:bg-[#f4f4f3]'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {targetMode === 'lead' && (
              <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  Sélectionner un lead
                </div>

                <input
                  autoFocus
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Rechercher par nom ou email..."
                  className="w-full text-xs px-2.5 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]"
                />

                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {filteredLeads.length === 0 && (
                    <p className="text-xs text-[#7a7a76] py-4 text-center">Aucun lead trouvé.</p>
                  )}
                  {filteredLeads.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                        selectedLeadId === lead.id
                          ? 'border-[#059669] bg-[#059669]/5'
                          : 'border-[#e5e5e0] hover:border-[#059669]/30 hover:bg-[#f4f4f3]',
                      )}
                    >
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0',
                          selectedLeadId === lead.id ? 'border-[#059669] bg-[#059669]' : 'border-[#e5e5e0]',
                        )}
                      >
                        {selectedLeadId === lead.id && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#26251e] truncate">{lead.businessName}</p>
                        {lead.contactEmail && (
                          <p className="text-[10px] text-[#7a7a76] truncate">{lead.contactEmail}</p>
                        )}
                        {!lead.contactEmail && (
                          <p className="text-[10px] text-amber-600">Pas d&apos;email — les étapes Email seront ignorées</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {targetMode === 'segment' && (
              <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                    Segment dynamique — mis à jour automatiquement selon les règles
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateSegment((v) => !v)}
                    className="text-[10px] font-bold text-[#059669] hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Nouveau segment
                  </button>
                </div>

                {showCreateSegment && (
                  <div className="border border-[#e5e5e0] rounded-lg p-3 space-y-2 bg-[#fafaf8]">
                    <input
                      value={newSegmentName}
                      onChange={(e) => setNewSegmentName(e.target.value)}
                      placeholder="Nom du segment (ex: Leads très chauds)"
                      className="w-full text-xs px-2.5 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]"
                    />
                    {newSegmentRules.map((rule, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <select
                          value={rule.field}
                          onChange={(e) => setNewSegmentRules((prev) => prev.map((r, idx) => idx === i ? { ...r, field: e.target.value } : r))}
                          className="text-[11px] border border-[#e5e5e0] rounded px-1.5 py-1.5 bg-white flex-1"
                        >
                          {SEGMENT_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                        <select
                          value={rule.operator}
                          onChange={(e) => setNewSegmentRules((prev) => prev.map((r, idx) => idx === i ? { ...r, operator: e.target.value as SegmentRule['operator'] } : r))}
                          className="text-[11px] border border-[#e5e5e0] rounded px-1.5 py-1.5 bg-white"
                        >
                          {SEGMENT_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <input
                          value={rule.value}
                          onChange={(e) => setNewSegmentRules((prev) => prev.map((r, idx) => idx === i ? { ...r, value: e.target.value } : r))}
                          placeholder="Valeur"
                          className="w-24 text-[11px] px-2 py-1.5 border border-[#e5e5e0] rounded focus:outline-none focus:ring-1 focus:ring-[#059669]"
                        />
                        <button type="button" onClick={() => setNewSegmentRules((prev) => prev.filter((_, idx) => idx !== i))} className="text-[#7a7a76] hover:text-red-500 p-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewSegmentRules((prev) => [...prev, { field: 'score', operator: 'greater_than', value: 50 }])}
                      className="text-[10px] font-bold text-[#7a7a76] hover:text-[#26251e] flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Ajouter une règle (ET)
                    </button>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => setShowCreateSegment(false)} className="h-7 text-[10px]">Annuler</Button>
                      <Button size="sm" onClick={handleCreateSegment} disabled={!newSegmentName.trim() || savingSegment} className="h-7 text-[10px] bg-[#059669] hover:bg-[#047857]">
                        {savingSegment ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Créer le segment'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {segments.length === 0 ? (
                    <p className="text-xs text-[#7a7a76] py-4 text-center">Aucun segment. Créez-en un pour cibler plusieurs leads d&apos;un coup.</p>
                  ) : segments.map((seg) => {
                    const count = getSegmentMembers(leads, seg.rules).length;
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => setSelectedSegmentId(seg.id)}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all',
                          selectedSegmentId === seg.id ? 'border-[#059669] bg-[#059669]/5' : 'border-[#e5e5e0] hover:border-[#059669]/30 hover:bg-[#f4f4f3]',
                        )}
                      >
                        <span className="text-xs font-bold text-[#26251e]">{seg.name}</span>
                        <span className="text-[10px] text-[#7a7a76]">{count} lead{count !== 1 ? 's' : ''}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedSegment && segmentMatches.length === 0 && (
                  <p className="text-[10px] text-amber-600">Aucun lead ne correspond à ce segment actuellement.</p>
                )}
              </div>
            )}

            {targetMode === 'campaign' && (
              <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  Tous les leads d&apos;une campagne
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {campaigns.length === 0 ? (
                    <p className="text-xs text-[#7a7a76] py-4 text-center">Aucune campagne. Créez-en une depuis /campaigns.</p>
                  ) : campaigns.map((c) => {
                    const count = leads.filter((l) => l.campaignId === c.id).length;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCampaignId(c.id)}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all',
                          selectedCampaignId === c.id ? 'border-[#059669] bg-[#059669]/5' : 'border-[#e5e5e0] hover:border-[#059669]/30 hover:bg-[#f4f4f3]',
                        )}
                      >
                        <span className="text-xs font-bold text-[#26251e]">{c.name}</span>
                        <span className="text-[10px] text-[#7a7a76]">{count} lead{count !== 1 ? 's' : ''}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {targetMode !== 'lead' && targetLeads.length > 0 && (
              <p className="text-[10px] text-[#059669] bg-[#059669]/5 border border-[#059669]/20 rounded-lg px-3 py-2">
                {targetLeads.length} lead{targetLeads.length !== 1 ? 's' : ''} avec email seront inscrits dans une séquence individuelle chacun.
              </p>
            )}
          </div>
        )}

        {/* Step 1 — Configure steps */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1">
                {targetMode === 'lead' ? 'Lead sélectionné' : targetMode === 'segment' ? 'Segment ciblé' : 'Campagne ciblée'}
              </div>
              {targetMode === 'lead' ? (
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-7 w-7 rounded-full bg-[#059669]/10 flex items-center justify-center text-[10px] font-black text-[#059669]">
                    {selectedLead?.businessName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#26251e]">{selectedLead?.businessName}</p>
                    <p className="text-[10px] text-[#7a7a76]">{selectedLead?.contactEmail || 'Pas d\'email'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-bold text-[#26251e] mt-2">
                  {targetMode === 'segment' ? selectedSegment?.name : selectedCampaign?.name}
                  <span className="text-[10px] font-normal text-[#7a7a76] ml-2">
                    {targetLeads.length} lead{targetLeads.length !== 1 ? 's' : ''} avec email
                  </span>
                </p>
              )}
            </div>

            <AIAssistedPanel onGenerate={(generated) => setSteps(generated)} />

            <StepBuilder
              steps={steps}
              onChange={setSteps}
              selectedLeadId={selectedLeadId}
              leads={leads}
            />
          </div>
        )}

        {/* Step 2 — Review & Launch */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-3">
                Récapitulatif
              </div>
              <ReviewRow label="Lead" value={selectedLead?.businessName ?? '—'} />
              <ReviewRow label="Email" value={selectedLead?.contactEmail ?? <span className="text-amber-600">Aucun email</span>} />
              <ReviewRow
                label="Étapes"
                value={
                  <div className="space-y-1 w-full">
                    {steps.map((s) => {
                      const cfg = CHANNEL_CONFIG[s.channel];
                      return (
                        <div key={s.stepNumber} className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full bg-[#059669] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                            {s.stepNumber}
                          </div>
                          <span className={`text-[9px] font-semibold flex items-center gap-0.5 px-1 py-0.5 rounded border ${cfg.color}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                          <span className="text-[10px] text-[#7a7a76] flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {s.delayDays === 0 ? 'Immédiat' : `J+${s.delayDays}`}
                          </span>
                          {s.channel === 'Email' && s.subject && (
                            <span className="text-[10px] text-[#26251e] truncate max-w-[180px]">{s.subject}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                }
              />
            </div>

            {/* Send first now toggle */}
            <div className="flex items-center gap-2.5 p-3 border border-[#059669]/20 bg-[#059669]/5 rounded-lg">
              <input
                type="checkbox"
                id="sendNowWizard"
                checked={sendFirstNow}
                onChange={(e) => setSendFirstNow(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="sendNowWizard" className="text-xs text-[#26251e] cursor-pointer">
                Envoyer le premier email maintenant (nécessite Gmail connecté)
              </label>
            </div>

            {saveError && (
              <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {saveError}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : router.push('/sequences'))}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold border border-[#e5e5e0] rounded-lg text-[#555552] hover:bg-[#f4f4f3] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {step === 0 ? 'Annuler' : 'Retour'}
          </button>

          {step < WIZARD_STEPS.length - 1 ? (
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
              disabled={targetLeads.length === 0 || saving}
              className="inline-flex items-center gap-1.5 h-9 px-5 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              {saving
                ? (progress ? `Création… ${progress.done}/${progress.total}` : 'Création...')
                : targetLeads.length > 1 ? `Lancer ${targetLeads.length} séquences` : 'Lancer la séquence'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
