'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import {
  Plus, Mail, CheckCircle2, Clock, XCircle, Pause,
  Play, Trash2, ChevronDown, ChevronRight, Loader2,
  Calendar, MailCheck, Phone, Link2, MessageSquare, Layers, ListTodo,
} from 'lucide-react';
import { ComposerQueueCadenceRoot } from './composer-queue-cadence-root';
import { ContacterSubNav } from '@/app/(app)/_components/hub-nav/contacter-sub-nav';

type SequencesView = 'by_lead' | 'composer';

type StepChannel = 'Email' | 'Call' | 'LinkedIn' | 'SMS';

const CHANNEL_CONFIG: Record<StepChannel, { icon: React.ReactNode; label: string; color: string; bodyLabel: string }> = {
  Email:    { icon: <Mail className="h-3 w-3" />, label: 'Email', color: 'text-blue-600 bg-blue-50 border-blue-200', bodyLabel: 'Corps de l\'email' },
  Call:     { icon: <Phone className="h-3 w-3" />, label: 'Appel', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', bodyLabel: 'Script d\'appel' },
  LinkedIn: { icon: <Link2 className="h-3 w-3" />, label: 'LinkedIn DM', color: 'text-[#0077b5]/80 bg-[#0077b5]/10 border-[#0077b5]/20', bodyLabel: 'Message LinkedIn' },
  SMS:      { icon: <MessageSquare className="h-3 w-3" />, label: 'SMS', color: 'text-purple-600 bg-purple-50 border-purple-200', bodyLabel: 'Texte SMS' },
};

interface SequenceStep {
  id: string;
  step_number: number;
  delay_days: number;
  channel?: StepChannel;
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

export function SequencesRoot() {
  const [view, setView] = useState<SequencesView>('by_lead');
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null);

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
    <div className="flex flex-col h-full overflow-hidden bg-[#fafaf8]">
      <ContacterSubNav />
      <div className="flex-1 overflow-y-auto relative min-h-0">
        <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
        <div className="relative z-10 w-full p-3 sm:p-4 md:p-8 pb-32 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#26251e]">Séquences & Cadences</h1>
            <p className="text-xs text-[#7a7a76] mt-1 max-w-xl">
              Planifie et automatise tes relances par lead : séquences automatiques, modèles réutilisables,
              file d'attente et calendrier de relances. Pour composer et envoyer un message maintenant, direction Outreach.
            </p>
          </div>
          {view === 'by_lead' && (
            <Link
              href="/sequences/new"
              className="inline-flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold h-8 px-3 rounded-lg transition-colors shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Nouvelle séquence
            </Link>
          )}
        </div>

        {/* View switcher */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-[#e5e5e0] bg-white p-1 w-fit">
          <button
            onClick={() => setView('by_lead')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors',
              view === 'by_lead' ? 'bg-[#26251e] text-white' : 'text-[#7a7a76] hover:bg-[#f4f4f3]'
            )}
          >
            <ListTodo className="h-3.5 w-3.5" />
            Séquences par lead
          </button>
          <button
            onClick={() => setView('composer')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors',
              view === 'composer' ? 'bg-[#26251e] text-white' : 'text-[#7a7a76] hover:bg-[#f4f4f3]'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Modèles & Queue
          </button>
        </div>

        {view === 'composer' && (
          <div className="-mx-3 sm:-mx-4 md:-mx-8 border-t border-[#e5e5e0]">
            <ComposerQueueCadenceRoot />
          </div>
        )}

        {/* Stats row */}
        {view === 'by_lead' && sequences.length > 0 && (
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
        {view === 'by_lead' && (isLoading ? (
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
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                {STEP_STATUS_ICON[step.status]}
                                {step.channel && step.channel !== 'Email' && (() => {
                                  const cfg = CHANNEL_CONFIG[step.channel];
                                  return (
                                    <span className={`text-[9px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded border ${cfg.color}`}>
                                      {cfg.icon}{cfg.label}
                                    </span>
                                  );
                                })()}
                                <span className="text-xs font-bold text-[#26251e] truncate">
                                  {step.channel && step.channel !== 'Email'
                                    ? (CHANNEL_CONFIG[step.channel]?.bodyLabel ?? step.subject)
                                    : step.subject}
                                </span>
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
        ))}
      </div>

    </div>
    </div>
  );
}
