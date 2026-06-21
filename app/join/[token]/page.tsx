'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, Loader2, UserPlus, AlertCircle, LogIn, X, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import Link from 'next/link';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  editor: 'Éditeur',
  viewer: 'Observateur',
};

interface InvitePreview {
  role: string;
  inviterName: string;
  workspaceName: string;
  valid: boolean;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'success' | 'error' | 'needsLogin'>('loading');
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    // Always persist the token so login/signup can redirect back here
    try {
      localStorage.setItem('minerva_pending_invite', token);
    } catch {}

    async function init() {
      // Fetch invite preview (public, no auth needed)
      try {
        const previewRes = await fetch(getApiUrl(`/api/team/invite-preview?token=${token}`));
        if (previewRes.ok) {
          const data = await previewRes.json();
          setPreview(data);
        } else {
          setPreviewError(true);
        }
      } catch {
        setPreviewError(true);
      }

      // Check auth
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u?.email) {
        setUser({ email: u.email });
        setStatus('ready');
      } else {
        setStatus('needsLogin');
      }
    }
    init();
  }, [token]);

  const handleAccept = async () => {
    setStatus('accepting');
    try {
      const res = await fetch(getApiUrl('/api/team/accept-link'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible d'accepter l'invitation");
        setStatus('error');
      } else {
        // Clear pending invite from localStorage
        try { localStorage.removeItem('minerva_pending_invite'); } catch {}
        setStatus('success');
        setTimeout(() => router.push('/today'), 2200);
      }
    } catch {
      setError('Erreur réseau. Réessayez.');
      setStatus('error');
    }
  };

  const handleDecline = () => {
    try { localStorage.removeItem('minerva_pending_invite'); } catch {}
    router.push('/today');
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-4">
      <div className="bg-white border border-[#e6e5e0] rounded-2xl p-8 max-w-md w-full shadow-sm text-center relative">

        {/* Logo */}
        <div className="w-12 h-12 bg-[#26251e] rounded-xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-extrabold text-xl tracking-tight">M</span>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#807d72]" />
            <p className="text-sm text-[#807d72]">Vérification de l&apos;invitation…</p>
          </div>
        )}

        {/* Invite preview card — shown in both needsLogin and ready states */}
        {(status === 'needsLogin' || status === 'ready') && !previewError && preview && (
          <div className="mb-6 bg-[#fafaf9] border border-[#e6e5e0] rounded-xl p-4 text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-[#059669]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#807d72] uppercase tracking-wider">Espace de travail</p>
                <p className="text-sm font-extrabold text-[#26251e]">{preview.workspaceName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#807d72]">
              <span>Invité par</span>
              <span className="font-semibold text-[#26251e]">{preview.inviterName}</span>
              <span>·</span>
              <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                {ROLE_LABELS[preview.role] ?? preview.role}
              </span>
            </div>
          </div>
        )}

        {/* Needs login */}
        {status === 'needsLogin' && (
          <>
            <h1 className="text-xl font-bold text-[#26251e] mb-2">
              {previewError ? 'Invitation Minerva OS' : `Rejoignez ${preview?.workspaceName || "l'équipe"}`}
            </h1>
            <p className="text-sm text-[#807d72] mb-6">
              Connectez-vous ou créez un compte pour accepter cette invitation.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#26251e] text-white text-sm font-bold rounded-xl hover:bg-[#1a1a19] transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Se connecter
              </Link>
              <Link
                href="/login"
                onClick={() => {
                  // Force signup mode via sessionStorage hint
                  try { sessionStorage.setItem('minerva_login_mode', 'signup'); } catch {}
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-[#e6e5e0] text-[#26251e] text-sm font-bold rounded-xl hover:bg-[#fafaf9] transition-colors"
              >
                Créer un compte gratuit
              </Link>
            </div>
            <p className="mt-4 text-[10px] text-[#807d72]">
              Le lien d&apos;invitation est à usage unique et expirera après acceptation.
            </p>
          </>
        )}

        {/* Ready to accept */}
        {status === 'ready' && (
          <>
            <UserPlus className="h-8 w-8 text-[#059669] mx-auto mb-3" />
            <h1 className="text-xl font-bold text-[#26251e] mb-1">
              Rejoindre {preview?.workspaceName || "l'équipe"} ?
            </h1>
            <p className="text-xs text-[#807d72] mb-6">
              Connecté en tant que <span className="font-semibold text-[#26251e]">{user?.email}</span>
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleAccept}
                className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Accepter l&apos;invitation
              </button>
              <button
                onClick={handleDecline}
                className="w-full py-2.5 border border-[#e6e5e0] hover:bg-[#fafaf9] text-[#807d72] font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" />
                Refuser
              </button>
            </div>
          </>
        )}

        {/* Accepting */}
        {status === 'accepting' && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-[#059669] animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-[#26251e]">Rejoindre l&apos;équipe…</p>
              <p className="text-xs text-[#807d72] mt-0.5">Un instant, nous configurons votre accès.</p>
            </div>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center animate-scale-up">
              <Check className="h-8 w-8 text-[#059669]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#26251e] mb-1">Bienvenue dans l&apos;équipe !</h1>
              <p className="text-sm text-[#807d72]">
                Vous avez rejoint <span className="font-semibold text-[#26251e]">{preview?.workspaceName || "l'espace de travail"}</span>.
              </p>
              <p className="text-xs text-[#807d72] mt-2">Redirection vers l&apos;application…</p>
            </div>
            <div className="flex gap-1 mt-2">
              {[0, 1, 2].map(i => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#059669] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-[#26251e] mb-2">Invitation invalide</h1>
            <p className="text-sm text-[#807d72] mb-5">{error}</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { setStatus('ready'); setError(''); }} className="text-sm font-bold text-[#f54e00] hover:underline">
                Réessayer
              </button>
              <Link href="/today" className="text-xs text-[#807d72] hover:underline">
                Retour à l&apos;accueil
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
