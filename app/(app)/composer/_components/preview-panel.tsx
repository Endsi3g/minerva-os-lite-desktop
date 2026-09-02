'use client';

import React, { useState } from 'react';
import { Mail, Share2, MessageSquare, PhoneCall, Copy, Check, AlertTriangle, ExternalLink, ShieldCheck, User, Building } from 'lucide-react';
import { ComposerChannel } from './composer-types';
import { SubstitutionContext, substituteVariables, detectTokens } from './composer-utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PreviewPanelProps {
  channel: ComposerChannel;
  rawSubject: string;
  rawBody: string;
  substitutionCtx: SubstitutionContext;
  onSelectChannel?: (channel: ComposerChannel) => void;
}

export function PreviewPanel({
  channel,
  rawSubject,
  rawBody,
  substitutionCtx,
}: PreviewPanelProps) {
  const [copied, setCopied] = useState(false);

  const { lead, userFirstName = 'Kael', userLastName = 'Belceus', userCompanyName = 'Minerva OS', userSignature = '' } = substitutionCtx;

  const renderedSubject = substituteVariables(rawSubject, substitutionCtx);
  const renderedBody = substituteVariables(rawBody, substitutionCtx);

  const rawTokens = detectTokens(`${rawSubject} ${rawBody}`);
  const unreplacedTokens = detectTokens(`${renderedSubject} ${renderedBody}`);

  const handleCopyRendered = () => {
    const fullText = channel === 'email'
      ? `Objet : ${renderedSubject}\n\n${renderedBody}`
      : renderedBody;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success('Rendu final copié dans le presse-papier !');
    setTimeout(() => setCopied(false), 2000);
  };

  const hasMissingContactInfo =
    (channel === 'email' && !lead?.contactEmail) ||
    (channel === 'sms' && !lead?.phone) ||
    (channel === 'call' && !lead?.phone);

  return (
    <div className="flex flex-col h-full bg-[#f7f7f4] border border-[#e5e5e0] rounded-2xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-[#e5e5e0]">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-[#059669]" />
          <span className="text-xs font-bold text-[#1a1f1c]">Aperçu Live Prospect</span>
          <span className="text-[10px] text-[#7a7a76] bg-[#fafaf8] px-2 py-0.5 rounded border border-[#e5e5e0]">
            {lead ? lead.businessName : 'Exemple générique'}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyRendered}
          className="h-7 text-[11px] font-semibold gap-1.5 border-[#e5e5e0] bg-white hover:bg-[#fafaf8] text-[#1a1f1c]"
        >
          {copied ? <Check className="h-3 w-3 text-[#059669]" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copié' : 'Copier le rendu'}</span>
        </Button>
      </div>

      {/* Warning banner for missing variables or missing lead contact */}
      {unreplacedTokens.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-[11px]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span className="font-medium">
            Variables non résolues : {unreplacedTokens.join(', ')}. Vérifiez les données du prospect.
          </span>
        </div>
      )}

      {hasMissingContactInfo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-[11px]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
          <span className="font-medium">
            Attention : Le prospect n'a pas de {channel === 'email' ? 'e-mail' : 'numéro de téléphone'} renseigné.
          </span>
        </div>
      )}

      {/* Preview Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-start items-center">
        {/* EMAIL MOCKUP */}
        {channel === 'email' && (
          <div className="w-full max-w-xl bg-white rounded-xl border border-[#e5e5e0] shadow-sm overflow-hidden flex flex-col">
            {/* Email Header */}
            <div className="p-4 bg-[#fafaf8] border-b border-[#e5e5e0] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#7a7a76] text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#059669]" />
                  <span>Nouveau message sortant</span>
                </div>
                <span>À l'instant</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#7a7a76] font-semibold min-w-[50px]">À :</span>
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-[#1a1f1c]">
                    {lead?.contactName || lead?.businessName || 'Destinataire'}
                  </span>
                  {lead?.contactEmail ? (
                    <span className="text-[#7a7a76]">&lt;{lead.contactEmail}&gt;</span>
                  ) : (
                    <span className="text-rose-600 italic">&lt;email manquant&gt;</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#7a7a76] font-semibold min-w-[50px]">De :</span>
                <span className="text-[#1a1f1c]">
                  {userFirstName} {userLastName} &lt;{userCompanyName.toLowerCase().replace(/\s+/g, '')}@prospecting.com&gt;
                </span>
              </div>
              <div className="flex items-start gap-2 pt-1 border-t border-[#e5e5e0]">
                <span className="text-[#7a7a76] font-semibold min-w-[50px]">Objet :</span>
                <span className="font-bold text-[#1a1f1c] text-sm">
                  {renderedSubject || <span className="text-[#9c9c96] italic font-normal">Sans objet</span>}
                </span>
              </div>
            </div>

            {/* Email Body */}
            <div className="p-5 text-xs sm:text-sm text-[#1a1f1c] leading-relaxed whitespace-pre-line font-sans">
              {renderedBody || (
                <span className="text-[#9c9c96] italic">
                  Rédigez votre message ou appliquez un template pour visualiser le rendu ici…
                </span>
              )}
            </div>
          </div>
        )}

        {/* LINKEDIN MOCKUP */}
        {channel === 'linkedin' && (
          <div className="w-full max-w-md bg-white rounded-xl border border-[#0a66c2]/30 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 bg-[#0a66c2] text-white flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
                  in
                </div>
                <span className="font-bold">Message LinkedIn</span>
              </div>
              <span className="text-[10px] text-white/80">
                {renderedBody.length} / 300 caractères (invitation)
              </span>
            </div>

            <div className="p-4 bg-[#f3f2ef] flex-1 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="h-9 w-9 rounded-full bg-[#0a66c2]/10 text-[#0a66c2] flex items-center justify-center font-bold text-xs shrink-0 border border-[#0a66c2]/20">
                  {userFirstName.charAt(0)}{userLastName.charAt(0)}
                </div>
                <div className="bg-white p-3.5 rounded-2xl rounded-tl-none border border-[#e5e5e0] shadow-xs text-xs text-[#1a1f1c] leading-relaxed whitespace-pre-line max-w-[90%]">
                  {renderedBody || <span className="text-[#9c9c96] italic">Texte LinkedIn…</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SMS MOCKUP */}
        {channel === 'sms' && (
          <div className="w-full max-w-sm bg-white rounded-3xl border-4 border-[#26251e] shadow-lg overflow-hidden flex flex-col">
            <div className="p-3 bg-[#f4f4f3] border-b border-[#e5e5e0] text-center">
              <p className="text-xs font-bold text-[#1a1f1c]">{lead?.contactName || lead?.businessName || 'Contact'}</p>
              <p className="text-[10px] text-[#7a7a76]">{lead?.phone || 'Numéro non renseigné'}</p>
            </div>
            <div className="p-4 bg-[#fafaf8] min-h-[220px] flex flex-col justify-end space-y-2">
              <div className="self-end bg-[#059669] text-white p-3 rounded-2xl rounded-br-none text-xs leading-relaxed max-w-[85%] whitespace-pre-line shadow-xs">
                {renderedBody || <span className="text-white/60 italic">Message SMS…</span>}
              </div>
              <p className="text-[9px] text-[#9c9c96] text-right">SMS direct · {renderedBody.length} car.</p>
            </div>
          </div>
        )}

        {/* SCRIPT D'APPEL MOCKUP */}
        {channel === 'call' && (
          <div className="w-full max-w-xl bg-white rounded-xl border border-[#e5e5e0] shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e0]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <PhoneCall className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1a1f1c]">Guide d'Appel / Pitch Téléphonique</h4>
                  <p className="text-[10px] text-[#7a7a76]">Prospect : {lead?.businessName} ({lead?.city || 'Ville'})</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded border border-[#a7f3d0]">
                Tél : {lead?.phone || 'À renseigner'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-[#fafaf8] rounded-lg border border-[#e5e5e0] text-xs leading-relaxed text-[#1a1f1c] whitespace-pre-line font-mono text-[11px]">
                {renderedBody || <span className="text-[#9c9c96] italic">Structurez votre argumentaire d'appel ici…</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Variable Count Footer */}
      <div className="px-4 py-2 bg-white border-t border-[#e5e5e0] flex items-center justify-between text-[11px] text-[#7a7a76] shrink-0">
        <div className="flex items-center gap-2">
          <span>Variables utilisées : <strong>{rawTokens.length}</strong></span>
          <span>·</span>
          <span>Non substituées : <strong className={unreplacedTokens.length > 0 ? 'text-amber-600' : 'text-[#059669]'}>{unreplacedTokens.length}</strong></span>
        </div>
        <div className="flex items-center gap-1 text-[#059669] font-semibold">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Prêt pour envoi réel</span>
        </div>
      </div>
    </div>
  );
}
