'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, Mail, CheckCircle2, Clock, XCircle, Pause,
  Play, Trash2, ChevronDown, ChevronRight, Loader2,
  Send, Calendar, MailCheck,
} from 'lucide-react';

interface SequenceStep {
  id: string;
  step_number: number;
  delay_days: number;
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed';
  scheduled_at: string | null;
  sent_at: string | null;
}

interface Sequence {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_email: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  email_sequence_steps: SequenceStep[];
}

interface NewStep {
  stepNumber: number;
  delayDays: number;
  subject: string;
  body: string;
}

const STATUS_COLORS = {
  active: 'text-[#059669] bg-[#059669]/10 border-[#059669]/20',
  paused: 'text-amber-600 bg-amber-50 border-amber-200',
  completed: 'text-[#7a7a76] bg-[#f4f4f3] border-[#e5e5e0]',
};

const STEP_STATUS_ICON = {
  sent: <MailCheck className="h-3.5 w-3.5 text-[#059669]" />,
  pending: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-500" />,
};

const DEFAULT_STEPS: NewStep[] = [
  { stepNumber: 1, delayDays: 0, subject: '', body: '' },
  { stepNumber: 2, delayDays: 3, subject: '', body: '' },
  { stepNumber: 3, delayDays: 7, subject: '', body: '' },
];

export function SequencesRoot() {
  const { leads } = useReach();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newLeadId, setNewLeadId] = useState('');
  const [newSteps, setNewSteps] = useState<NewStep[]>(DEFAULT_STEPS);
  const [sendFirstNow, setSendFirstNow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [generatingStep, setGeneratingStep] = useState<number | null>(null);

  const fetchSequences = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/email-sequences'));
      if (res.ok) setSequences(await res.json());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSequences(); }, [fetchSequences]);

  const selectedLead = leads.find((l) => l.id === newLeadId);

  const generateDraftForStep = async (stepIndex: number) => {
    if (!selectedLead) return;
    setGeneratingStep(stepIndex);
    try {
      const step = newSteps[stepIndex];
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
        // Parse subject and body from draft
        const lines = (draft as string).split('\n');
        const subjectLine = lines.find((l: string) => l.toLowerCase().startsWith('objet:') || l.toLowerCase().startsWith('sujet:'));
        const subject = subjectLine
          ? subjectLine.replace(/^(objet|sujet)\s*:\s*/i, '').trim()
          : `${isFollowUp ? 'Suite' : 'Contact'} — ${selectedLead.businessName}`;
        const body = lines.filter((l: string) => l !== subjectLine).join('\n').trim();

        setNewSteps((prev) => prev.map((s, i) => i === stepIndex ? { ...s, subject, body } : s));
      }
    } finally {
      setGeneratingStep(null);
    }
  };

  const handleCreate = async () => {
    if (!selectedLead) return;
    if (newSteps.some((s) => !s.subject.trim() || !s.body.trim())) {
      setSaveError('Remplissez le sujet et le corps de chaque étape.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(getApiUrl('/api/email-sequences'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          leadName: selectedLead.businessName,
          leadEmail: selectedLead.contactEmail || '',
          sequenceName: `Séquence — ${selectedLead.businessName}`,
          steps: newSteps,
          workspaceId: null,
          sendFirstNow,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setShowNewModal(false);
      setNewLeadId('');
      setNewSteps(DEFAULT_STEPS);
      setSendFirstNow(false);
      await fetchSequences();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (seq: Sequence) => {
    const newStatus = seq.status === 'active' ? 'paused' : 'active';
    await fetch(getApiUrl('/api/email-sequences'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequenceId: seq.id, status: newStatus }),
    });
    setSequences((prev) => prev.map((s) => s.id === seq.id ? { ...s, status: newStatus } : s));
  };

  const handleDelete = async (seqId: string) => {
    await fetch(`${getApiUrl('/api/email-sequences')}?id=${seqId}`, { method: 'DELETE' });
    setSequences((prev) => prev.filter((s) => s.id !== seqId));
  };

  const sentCount = (seq: Sequence) => seq.email_sequence_steps.filter((s) => s.status === 'sent').length;
  const totalCount = (seq: Sequence) => seq.email_sequence_steps.length;

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#26251e]">Séquences email</h1>
            <p className="text-xs text-[#7a7a76] mt-1">
              Automatisez vos relances — 2 à 3 emails espacés sur plusieurs jours, envoyés via votre Gmail connecté.
            </p>
          </div>
          <Button
            onClick={() => setShowNewModal(true)}
            className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold gap-1.5 h-8 px-3"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvelle séquence
          </Button>
        </div>

        {/* Stats row */}
        {sequences.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Séquences actives', value: sequences.filter((s) => s.status === 'active').length, color: '#059669' },
              { label: 'Emails envoyés', value: sequences.reduce((acc, s) => acc + sentCount(s), 0), color: '#3b82f6' },
              { label: 'Terminées', value: sequences.filter((s) => s.status === 'completed').length, color: '#7a7a76' },
            ].map((stat) => (
              <div key={stat.label} className="border border-[#e5e5e0] rounded-lg p-4">
                <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-[#7a7a76] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Sequence list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-[#059669]" />
          </div>
        ) : sequences.length === 0 ? (
          <div className="border border-dashed border-[#e5e5e0] rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-[#059669]/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-[#059669]" />
            </div>
            <h3 className="text-sm font-bold text-[#26251e] mb-1">Aucune séquence</h3>
            <p className="text-xs text-[#7a7a76] max-w-xs">
              Créez votre première séquence pour automatiser les relances d'un lead.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sequences.map((seq) => {
              const isExpanded = expandedSeq === seq.id;
              const progress = totalCount(seq) > 0 ? (sentCount(seq) / totalCount(seq)) * 100 : 0;

              return (
                <div key={seq.id} className="border border-[#e5e5e0] rounded-xl overflow-hidden">
                  {/* Sequence header */}
                  <div className="p-4 flex items-center gap-4">
                    <button
                      onClick={() => setExpandedSeq(isExpanded ? null : seq.id)}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-[#7a7a76] shrink-0" /> : <ChevronRight className="h-4 w-4 text-[#7a7a76] shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[#26251e] truncate">{seq.name}</span>
                          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border', STATUS_COLORS[seq.status])}>
                            {seq.status === 'active' ? 'Actif' : seq.status === 'paused' ? 'En pause' : 'Terminé'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-[#7a7a76]">{seq.lead_name}</span>
                          <span className="text-[10px] text-[#7a7a76]">·</span>
                          <span className="text-[10px] text-[#7a7a76]">{seq.lead_email}</span>
                        </div>
                        {/* Progress bar */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1 bg-[#e5e5e0] rounded-full overflow-hidden">
                            <div className="h-full bg-[#059669] rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[9px] text-[#7a7a76] font-semibold whitespace-nowrap">
                            {sentCount(seq)}/{totalCount(seq)} envoyés
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {seq.status !== 'completed' && (
                        <button
                          onClick={() => handleToggleStatus(seq)}
                          className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f4f3] text-[#7a7a76] hover:text-[#26251e] transition-colors"
                          title={seq.status === 'active' ? 'Mettre en pause' : 'Reprendre'}
                        >
                          {seq.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(seq.id)}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50 text-[#7a7a76] hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Steps detail */}
                  {isExpanded && (
                    <div className="border-t border-[#e5e5e0] divide-y divide-[#e5e5e0]/60">
                      {seq.email_sequence_steps
                        .sort((a, b) => a.step_number - b.step_number)
                        .map((step) => (
                          <div key={step.id} className="px-6 py-3 flex items-start gap-3">
                            <div className="flex flex-col items-center gap-1 pt-0.5">
                              <div className="h-6 w-6 rounded-full border-2 border-[#e5e5e0] flex items-center justify-center text-[10px] font-bold text-[#7a7a76]">
                                {step.step_number}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                {STEP_STATUS_ICON[step.status]}
                                <span className="text-xs font-bold text-[#26251e] truncate">{step.subject}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-[#7a7a76]">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {step.delay_days === 0 ? 'Immédiatement' : `J+${step.delay_days}`}
                                </span>
                                {step.sent_at && (
                                  <span className="flex items-center gap-1 text-[#059669]">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Envoyé le {new Date(step.sent_at).toLocaleDateString('fr-CA')}
                                  </span>
                                )}
                                {step.status === 'pending' && step.scheduled_at && (
                                  <span>Planifié le {new Date(step.scheduled_at).toLocaleDateString('fr-CA')}</span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#7a7a76] mt-1 line-clamp-2">{step.body}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Sequence Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e0]">
              <div>
                <h2 className="text-sm font-black text-[#26251e]">Nouvelle séquence de relance</h2>
                <p className="text-[10px] text-[#7a7a76] mt-0.5">Configurez 2 à 3 emails automatiques pour un lead.</p>
              </div>
              <button onClick={() => { setShowNewModal(false); setSaveError(null); }} className="text-[#7a7a76] hover:text-[#26251e]">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {/* Lead selector */}
              <div>
                <label className="text-xs font-bold text-[#26251e] block mb-1.5">Lead *</label>
                <select
                  value={newLeadId}
                  onChange={(e) => setNewLeadId(e.target.value)}
                  className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white"
                >
                  <option value="">— Sélectionner un lead —</option>
                  {leads.filter((l) => l.contactEmail).map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.businessName} — {lead.contactEmail}
                    </option>
                  ))}
                </select>
                {selectedLead && !selectedLead.contactEmail && (
                  <p className="text-[10px] text-red-500 mt-1">Ce lead n'a pas d'email de contact.</p>
                )}
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {newSteps.map((step, i) => (
                  <div key={step.stepNumber} className="border border-[#e5e5e0] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-[#059669] text-white text-[10px] font-bold flex items-center justify-center">
                          {step.stepNumber}
                        </div>
                        <span className="text-xs font-bold text-[#26251e]">
                          {step.delayDays === 0 ? 'Email immédiat' : `Relance J+${step.delayDays}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-[#7a7a76]">Délai (jours)</label>
                        <input
                          type="number"
                          min={0}
                          value={step.delayDays}
                          onChange={(e) => setNewSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, delayDays: Number(e.target.value) } : s))}
                          className="w-14 text-xs border border-[#e5e5e0] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                          disabled={i === 0}
                        />
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
                      </div>
                    </div>

                    <Input
                      placeholder="Sujet de l'email *"
                      value={step.subject}
                      onChange={(e) => setNewSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, subject: e.target.value } : s))}
                      className="text-xs h-8"
                    />
                    <textarea
                      placeholder="Corps de l'email *"
                      value={step.body}
                      onChange={(e) => setNewSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, body: e.target.value } : s))}
                      rows={4}
                      className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#059669] resize-none"
                    />
                  </div>
                ))}
              </div>

              {/* Send step 1 now toggle */}
              <div className="flex items-center gap-2.5 p-3 border border-[#059669]/20 bg-[#059669]/5 rounded-lg">
                <input
                  type="checkbox"
                  id="sendNow"
                  checked={sendFirstNow}
                  onChange={(e) => setSendFirstNow(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="sendNow" className="text-xs text-[#26251e] cursor-pointer">
                  Envoyer le premier email maintenant (nécessite Gmail connecté)
                </label>
              </div>

              {saveError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {saveError}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-[#e5e5e0] flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setShowNewModal(false); setSaveError(null); }} className="h-8 text-xs">
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!selectedLead || saving}
                className="h-8 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                {saving ? 'Création...' : 'Créer la séquence'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
