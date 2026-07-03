'use client';
import React, { useState } from 'react';
import { Copy, Check, Mail, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmailDraft {
  subject: string;
  body: string;
}

export interface EmailVariant {
  id: string;
  label: string;
  draft: EmailDraft;
}

interface AiEmailToolProps {
  title?: string;
  variants: EmailVariant[];
  recipientEmail?: string;
  onReset?: () => void;
  className?: string;
}

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('w-4 h-4', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="#fff" />
      <path d="M2 6l10 7 10-7" stroke="#e5e5e0" strokeWidth="0.5" />
      <path d="M2 6l10 7 10-7" stroke="none" />
      {/* M shape */}
      <path d="M2 7.5l10 6.5 10-6.5V6L12 12.5 2 6v1.5z" fill="#EA4335" />
      <path d="M2 7.5V18h4V11l6 4 6-4v7h4V7.5L12 14 2 7.5z" fill="#34A853" fillOpacity="0" />
      {/* Simplified colorful M envelope */}
      <rect x="2" y="6" width="20" height="12" rx="1" fill="none" />
      <path d="M2 6.5L12 13l10-6.5" stroke="#FBBC05" strokeWidth="1.5" fill="none" />
      <path d="M2 6.5V17.5h4v-7l6 4 6-4v7h4V6.5L12 13 2 6.5z" fill="#34A853" fillOpacity="0.15" />
      <path d="M2 6.5L12 13l10-6.5" stroke="#EA4335" strokeWidth="0" />
      {/* Clean version */}
      <path
        d="M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z"
        fill="#ffffff"
        stroke="#e5e5e0"
        strokeWidth="1"
      />
      <path d="M3 7l9 6 9-6" stroke="#EA4335" strokeWidth="1.5" fill="none" />
      <path d="M3 7v10M21 7v10" stroke="#34A853" strokeWidth="1" />
    </svg>
  );
}

function GmailIconClean() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M5 40V15.5l19 13 19-13V40H5z" />
      <path fill="#FBBC05" d="M5 15.5L24 28.5l19-13L24 8 5 15.5z" />
      <path fill="#34A853" d="M5 15.5V40H14V22l10 6.5 10-6.5V40H43V15.5L24 28.5 5 15.5z" />
      <path fill="#4285F4" d="M14 22v18H5V15.5L14 22z" />
      <path fill="#C5221F" d="M43 40H34V22l9-6.5V40z" />
    </svg>
  );
}

export function AiEmailTool({
  title = 'Email de prospection',
  variants,
  recipientEmail,
  onReset,
  className,
}: AiEmailToolProps) {
  const [activeVariantId, setActiveVariantId] = useState(variants[0]?.id ?? '');
  const [copied, setCopied] = useState(false);

  const activeVariant = variants.find((v) => v.id === activeVariantId) ?? variants[0];

  function handleCopy() {
    if (!activeVariant) return;
    const text = `Sujet: ${activeVariant.draft.subject}\n\n${activeVariant.draft.body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleGmailOpen() {
    if (!activeVariant) return;
    const params = new URLSearchParams({
      su: activeVariant.draft.subject,
      body: activeVariant.draft.body,
    });
    if (recipientEmail) {
      params.set('to', recipientEmail);
    }
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`, '_blank');
  }

  function handleMailto() {
    if (!activeVariant) return;
    const to = recipientEmail ?? '';
    const subject = encodeURIComponent(activeVariant.draft.subject);
    const body = encodeURIComponent(activeVariant.draft.body);
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-[#e5e5e0] shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#e5e5e0]">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#7a7a76]" />
          <span className="text-sm font-semibold text-[#26251e]">{title}</span>
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg hover:bg-[#fafaf8] text-[#7a7a76] hover:text-[#26251e] transition-colors"
            title="Réinitialiser"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Variant toggle */}
      {variants.length > 1 && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          {variants.map((variant, idx) => (
            <button
              key={variant.id}
              onClick={() => setActiveVariantId(variant.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all',
                activeVariantId === variant.id
                  ? 'bg-[#059669] border-[#059669] text-white'
                  : 'bg-[#fafaf8] border-[#e5e5e0] text-[#7a7a76] hover:border-[#059669] hover:text-[#059669]'
              )}
            >
              <span className="font-bold">{String.fromCharCode(65 + idx)}</span>
              <span>{variant.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Subject */}
      <div className="px-4 py-3 bg-[#fafaf8] mx-4 mt-2 rounded-xl border border-[#e5e5e0]">
        <p className="text-xs text-[#7a7a76] font-medium mb-0.5">Sujet</p>
        <p className="text-sm font-medium text-[#26251e]">{activeVariant?.draft.subject}</p>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-sm text-[#26251e] leading-relaxed whitespace-pre-wrap">
          {activeVariant?.draft.body}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 pt-2 pb-4 mt-1 border-t border-[#e5e5e0]">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5e0] text-xs text-[#7a7a76] hover:text-[#26251e] hover:border-[#26251e] transition-all"
            title="Copier"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#059669]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Copié !' : 'Copier'}</span>
          </button>
          <button
            onClick={handleMailto}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5e0] text-xs text-[#7a7a76] hover:text-[#26251e] hover:border-[#26251e] transition-all"
            title="Ouvrir dans le client mail"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Mailto</span>
          </button>
        </div>
        <button
          onClick={handleGmailOpen}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#26251e] hover:bg-[#3a3930] text-white text-xs font-medium transition-colors"
        >
          <GmailIconClean />
          <span>Envoyer via Gmail</span>
        </button>
      </div>
    </div>
  );
}

export default AiEmailTool;
