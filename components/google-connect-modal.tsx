'use client';

import React from 'react';
import { Mail, CalendarClock, Workflow, ShieldCheck, Check, Loader2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';

// Multicolour Google "G" mark
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

interface GoogleConnectModalProps {
  open: boolean;
  onClose: () => void;
  /** OAuth scope pack to request */
  pack?: 'identity' | 'communication' | 'documents';
  /** Path to return to after the OAuth flow */
  redirect?: string;
  onSkip?: () => void;
}

export function GoogleConnectModal({ open, onClose, pack = 'communication', redirect = '/integrations', onSkip }: GoogleConnectModalProps) {
  const [connecting, setConnecting] = React.useState(false);
  if (!open) return null;

  const handleConnect = () => {
    setConnecting(true);
    if (typeof window !== 'undefined') {
      window.location.href = getApiUrl(`/api/google/auth/start?pack=${pack}&redirect=${encodeURIComponent(redirect)}`);
    }
  };

  const today = new Date().toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-[760px] max-w-[96vw] p-3 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-3">
          {/* Left — connect panel */}
          <div className="p-5">
            <h2 className="text-lg font-bold text-[#26251e] tracking-tight">Connectez votre compte Google</h2>
            <p className="text-xs text-[#7a7a76] mt-1">Connectez Gmail et Agenda pour activer les fonctionnalités clés.</p>

            {/* Integration card */}
            <div className="mt-5 rounded-xl border border-[#e5e5e0] p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg border border-[#e5e5e0] bg-white flex items-center justify-center shrink-0">
                  <GoogleG className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#26251e]">Intégration Google</p>
                  <p className="text-[11px] text-[#7a7a76]">Connectez une fois pour activer e-mail et agenda.</p>
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                {[
                  { icon: Mail, label: 'Suivez les e-mails avec vos prospects' },
                  { icon: CalendarClock, label: 'Planifiez et synchronisez vos rendez-vous' },
                  { icon: Workflow, label: 'Automatisez intelligemment vos relances' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 text-xs text-[#26251e]">
                    <Icon className="h-3.5 w-3.5 text-[#7a7a76] shrink-0" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security note */}
            <div className="mt-3 rounded-xl border border-[#e5e5e0] bg-[#fafaf8] p-3.5 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#26251e]">Vos données sont sécurisées.</p>
                <p className="text-[11px] text-[#7a7a76] mt-0.5">Minerva n&apos;utilise que les permissions minimales nécessaires au service.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                onClick={onClose}
                className="px-4 h-9 rounded-lg border border-[#e5e5e0] bg-white text-xs font-bold text-[#555552] hover:bg-[#f4f4f3] transition-colors"
              >
                Retour
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onSkip ? onSkip() : onClose(); }}
                  className="px-4 h-9 rounded-lg text-xs font-bold text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors"
                >
                  Ignorer
                </button>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="px-4 h-9 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-70"
                >
                  {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GoogleG className="h-3.5 w-3.5" />}
                  Connecter Google
                </button>
              </div>
            </div>
          </div>

          {/* Right — onboarding preview */}
          <div className="rounded-xl bg-[#f4f4f3] p-4 hidden md:flex md:flex-col">
            <div className="rounded-xl bg-white border border-[#e5e5e0] p-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-[#059669]/10 text-[#059669] flex items-center justify-center font-bold text-sm">M</div>
                  <span className="text-sm font-bold text-[#26251e]">Votre espace</span>
                </div>
                <span className="text-[10px] font-bold text-[#7a7a76] bg-[#f4f4f3] border border-[#e5e5e0] rounded-full px-2 py-0.5">1/3</span>
              </div>

              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mt-5 mb-2">Statut d&apos;intégration</p>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-6 rounded-md bg-[#059669]/10 text-[#059669] flex items-center justify-center shrink-0">
                    <GoogleG className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#26251e]">Intégration Google</p>
                    <p className="text-[10px] text-[#f54e00]">En attente de permission…</p>
                  </div>
                </div>
                {[
                  { label: 'Configuration espace', sub: 'Non démarré…' },
                  { label: "Inviter l'équipe", sub: 'Non démarré…' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2.5 opacity-60">
                    <div className="h-6 w-6 rounded-md bg-[#f4f4f3] border border-[#e5e5e0] shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-[#26251e]">{s.label}</p>
                      <p className="text-[10px] text-[#7a7a76]">{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#e5e5e0]/60 mt-4">
                <span className="text-[10px] font-bold text-[#7a7a76] flex items-center gap-1">
                  <Check className="h-3 w-3 text-[#059669]" /> Minerva
                </span>
                <span className="text-[10px] text-[#a3a39c]">{today}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GoogleConnectModal;
