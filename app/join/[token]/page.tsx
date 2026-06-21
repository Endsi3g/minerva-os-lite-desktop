'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, Loader2, UserPlus, AlertCircle, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import Link from 'next/link';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'success' | 'error' | 'needsLogin'>('loading');
  const [error, setError] = useState('');
  const [role, setRole] = useState('');
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u?.email) {
        setUser({ email: u.email });
        setStatus('ready');
      } else {
        setStatus('needsLogin');
      }
    }
    checkAuth();
  }, []);

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
        setError(data.error || 'Failed to accept invitation');
        setStatus('error');
      } else {
        setRole(data.role);
        setStatus('success');
        setTimeout(() => router.push('/today'), 2000);
      }
    } catch {
      setError('Network error. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-4">
      <div className="bg-white border border-[#e6e5e0] rounded-2xl p-8 max-w-md w-full shadow-sm text-center">
        {/* Logo */}
        <div className="w-12 h-12 bg-[#26251e] rounded-xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-extrabold text-xl tracking-tight">M</span>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#807d72]" />
            <p className="text-sm text-[#807d72]">Vérification en cours…</p>
          </div>
        )}

        {status === 'needsLogin' && (
          <>
            <h1 className="text-xl font-bold text-[#26251e] mb-2">Invitation Minerva OS</h1>
            <p className="text-sm text-[#807d72] mb-6">
              Vous avez été invité(e) à rejoindre un espace de travail Minerva OS Lite.
              Connectez-vous pour accepter l'invitation.
            </p>
            <Link
              href={`/login?redirect=/join/${token}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#26251e] text-white text-sm font-bold rounded-xl hover:bg-[#1a1a19] transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Se connecter
            </Link>
            <p className="mt-4 text-[11px] text-[#807d72]">
              Pas encore de compte ?{' '}
              <Link href={`/login?redirect=/join/${token}&mode=signup`} className="text-[#f54e00] hover:underline font-semibold">
                Créer un compte gratuit
              </Link>
            </p>
          </>
        )}

        {status === 'ready' && (
          <>
            <UserPlus className="h-8 w-8 text-[#059669] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-[#26251e] mb-2">Rejoindre l'équipe</h1>
            <p className="text-sm text-[#807d72] mb-1">
              Vous êtes connecté en tant que{' '}
              <span className="font-semibold text-[#26251e]">{user?.email}</span>
            </p>
            <p className="text-sm text-[#807d72] mb-6">
              Cliquez ci-dessous pour accepter l'invitation et rejoindre l'espace de travail.
            </p>
            <button
              onClick={handleAccept}
              className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl transition-colors text-sm"
            >
              Accepter l'invitation
            </button>
          </>
        )}

        {status === 'accepting' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
            <p className="text-sm text-[#807d72]">Acceptation en cours…</p>
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-7 w-7 text-[#059669]" />
            </div>
            <h1 className="text-xl font-bold text-[#26251e] mb-2">Invitation acceptée !</h1>
            <p className="text-sm text-[#807d72]">
              Vous avez rejoint l'équipe en tant que{' '}
              <span className="font-semibold capitalize">{role}</span>. Redirection…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-[#26251e] mb-2">Lien invalide</h1>
            <p className="text-sm text-[#807d72] mb-4">{error}</p>
            <Link href="/today" className="text-sm text-[#f54e00] hover:underline font-semibold">
              Retour à l'accueil
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
