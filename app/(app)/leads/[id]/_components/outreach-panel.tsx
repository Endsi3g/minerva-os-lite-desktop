'use client';

import React, { useState } from 'react';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';
import Link from 'next/link';
import { Lead } from '@/lib/mock-data';
import {
  Mail, Phone, Loader2, CheckCircle2, AlertCircle,
  Zap, BookOpen, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateComposer } from './template-composer';

interface OutreachPanelProps {
  lead: Lead;
}

export function OutreachPanel({ lead }: OutreachPanelProps) {
  const voicemailEnabled = !!lead.phone;

  const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');
  const [voicemailStatus, setVoicemailStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [voicemailScript, setVoicemailScript] = useState('');
  const [voicemailError, setVoicemailError] = useState('');
  const [sendingVoicemail, setSendingVoicemail] = useState(false);

  const handleEnrollSmartlead = async () => {
    setEmailStatus('loading');
    setEmailError('');
    try {
      const res = await fetch(getApiUrl('/api/outreach/smartlead'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const data = await res.json();
      if (!res.ok) { setEmailStatus('error'); setEmailError(data.error || 'Erreur Smartlead'); return; }
      setEmailStatus('ok');
      toast.success('Lead ajouté à la séquence Smartlead');
    } catch {
      setEmailStatus('error');
      setEmailError('Erreur réseau');
    }
  };

  const handleGenerateVoicemail = async () => {
    setVoicemailStatus('loading');
    setVoicemailScript('');
    setVoicemailError('');
    try {
      const res = await fetch(getApiUrl('/api/outreach/voicemail'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, send: false }),
      });
      const data = await res.json();
      if (!res.ok) { setVoicemailStatus('error'); setVoicemailError(data.error || 'Erreur génération'); return; }
      setVoicemailStatus('ok');
      setVoicemailScript(data.script || '');
    } catch {
      setVoicemailStatus('error');
      setVoicemailError('Erreur réseau');
    }
  };

  const handleSendVoicemail = async () => {
    if (!voicemailScript || !lead.phone) return;
    setSendingVoicemail(true);
    try {
      const res = await fetch(getApiUrl('/api/outreach/voicemail'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, send: true }),
      });
      const data = await res.json();
      if (res.ok && data.delivered) {
        toast.success('Voicemail envoyé via Drop Cowboy');
      } else if (res.ok) {
        toast.success('Script sauvegardé — configurez Drop Cowboy dans Paramètres pour l\'envoi automatique');
      } else {
        toast.error(data.error || 'Erreur envoi voicemail');
      }
    } finally {
      setSendingVoicemail(false);
    }
  };

  return (
    <div className="space-y-5 py-2">
      {/* Native Minerva Multi-channel Sequence Card */}
      <div className="rounded-xl border border-[#1E4B33]/30 bg-[#1E4B33]/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#1E4B33] text-white flex items-center justify-center">
              <Zap className="h-4 w-4 text-emerald-300" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#111827]">Séquence Native Minerva OS</span>
              <p className="text-[10px] text-[#6B7280]">Automatisez vos relances Email, SMS et LinkedIn pour ce prospect</p>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#065F46]">
            Recommandé
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <Link
            href={`/sequences/new?leadId=${lead.id}`}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#1E4B33] hover:bg-[#1E4B33]/90 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Lancer la séquence</span>
            <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
          <Link
            href={`/composer?leadId=${lead.id}`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[#111827] text-xs font-semibold transition-all"
          >
            <span>Ouvrir dans le Studio Composer</span>
          </Link>
        </div>
      </div>

      {/* Email composer with template picker */}
      <TemplateComposer lead={lead} />

      {/* Email sequence — Smartlead */}
      <div className="border border-[#e5e5e0] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-[#167f5b]" />
          <span className="text-xs font-bold text-[#14171A]">Séquence email — Smartlead</span>
        </div>
        {lead.contactEmail ? (
          <div className="space-y-2">
            <p className="text-[10px] text-[#8A9098]">
              Ajouter <span className="font-bold text-[#14171A]">{lead.contactEmail}</span> à la campagne Smartlead configurée dans Paramètres.
            </p>
            {emailStatus === 'ok' && (
              <div className="flex items-center gap-1.5 text-[#167f5b] text-[10px] font-bold">
                <CheckCircle2 className="h-3 w-3" />Lead enrollé dans la séquence
              </div>
            )}
            {emailStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-red-600 text-[10px]">
                <AlertCircle className="h-3 w-3" />{emailError}
              </div>
            )}
            <Button
              onClick={handleEnrollSmartlead}
              disabled={emailStatus === 'loading' || emailStatus === 'ok'}
              className="h-7 bg-[#167f5b] hover:bg-[#0f6b4c] text-white text-[10px] font-bold gap-1"
            >
              {emailStatus === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
              {emailStatus === 'ok' ? 'Enrollé' : 'Enroller dans Smartlead'}
            </Button>
          </div>
        ) : (
          <p className="text-[10px] text-[#8A9098] italic">Aucun email de contact — renseignez-le pour activer la séquence.</p>
        )}
      </div>

      {/* Voicemail — Drop Cowboy */}
      {voicemailEnabled && (
        <div className="border border-[#e5e5e0] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-bold text-[#14171A]">Voicemail — Drop Cowboy</span>
          </div>

          {voicemailStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-red-600 text-[10px]">
              <AlertCircle className="h-3 w-3" />{voicemailError}
            </div>
          )}

          {voicemailScript && (
            <div className="bg-[#f4f4f3] border border-[#e5e5e0] rounded-lg p-3 space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A9098]">Script IA généré</p>
              <p className="text-[11px] text-[#14171A] leading-relaxed whitespace-pre-wrap">{voicemailScript}</p>
              {lead.phone ? (
                <Button
                  onClick={handleSendVoicemail}
                  disabled={sendingVoicemail}
                  className="h-7 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold gap-1 mt-1"
                >
                  {sendingVoicemail ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3" />}
                  Envoyer le voicemail
                </Button>
              ) : (
                <p className="text-[10px] text-[#8A9098] italic">Ajoutez un téléphone pour envoyer.</p>
              )}
            </div>
          )}

          <Button
            onClick={handleGenerateVoicemail}
            disabled={voicemailStatus === 'loading'}
            variant="outline"
            className="h-7 border-[#e5e5e0] text-[10px] font-bold gap-1"
          >
            {voicemailStatus === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 text-[#167f5b]" />}
            {voicemailScript ? 'Regénérer le script' : 'Générer un script IA'}
          </Button>
        </div>
      )}

      {/* Leverage library hint */}
      <div className="border border-dashed border-[#e5e5e0] rounded-xl p-4 flex items-start gap-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#167f5b]/10 mt-0.5">
          <BookOpen className="h-3 w-3 text-[#167f5b]" />
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold text-[#14171A]">Preuves sociales</p>
          <p className="text-[10px] text-[#8A9098]">
            L'IA sélectionne automatiquement l'étude de cas la plus pertinente pour {lead.niche || 'ce secteur'} depuis votre{' '}
            <a href="/leverage-library" className="text-[#167f5b] font-bold hover:underline">Bibliothèque de preuves</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
