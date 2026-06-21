'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, Loader2, AlertCircle, LogIn, X, Users, Sparkles, Shield, Eye, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  editor: 'Éditeur',
  viewer: 'Observateur',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Accès complet sauf facturation et configuration avancée.',
  editor: 'Leads, pipeline, campagnes, IA et carte terrain.',
  viewer: 'Lecture seule — leads et carte.',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <Shield className="h-4 w-4" />,
  editor: <Star className="h-4 w-4" />,
  viewer: <Eye className="h-4 w-4" />,
};

const ROLE_COLORS: Record<string, string> = {
  admin: '#f54e00',
  editor: '#059669',
  viewer: '#6366f1',
};

interface InvitePreview {
  role: string;
  inviterName: string;
  workspaceName: string;
  memberCount?: number;
  valid: boolean;
}

// Floating particle component
function Particles() {
  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 3 + Math.random() * 5,
    delay: Math.random() * 3,
    duration: 3 + Math.random() * 4,
    color: ['#f54e00', '#059669', '#6366f1', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 5)],
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          from { transform: translateY(0px) rotate(0deg); opacity: 0.15; }
          to   { transform: translateY(-20px) rotate(180deg); opacity: 0.35; }
        }
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes scaleIn {
          from { transform: scale(0) rotate(-20deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes slideUpFade {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Confetti burst on accept
function ConfettiBurst() {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: 30 + Math.random() * 40,
    color: ['#f54e00', '#059669', '#6366f1', '#f59e0b', '#ec4899', '#26251e'][Math.floor(Math.random() * 6)],
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random() * 1.5,
    size: 6 + Math.random() * 8,
    rotate: Math.random() * 720,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// Workspace avatar with animated ring
function WorkspaceAvatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  return (
    <div className="relative flex items-center justify-center">
      {/* Animated outer ring */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `${color}22`,
          animation: 'pulseRing 2s ease-out infinite',
        }}
      />
      <div
        className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg border-2"
        style={{ background: `${color}18`, borderColor: `${color}40` }}
      >
        <span className="text-2xl font-black" style={{ color }}>{initials || 'M'}</span>
      </div>
    </div>
  );
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

  const roleColor = preview ? (ROLE_COLORS[preview.role] ?? '#6366f1') : '#059669';

  useEffect(() => {
    async function init() {
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
        // Switch localStorage to the joined workspace so ReachContext loads it on /today
        if (data.workspaceId) {
          localStorage.setItem('minerva_active_workspace_id', data.workspaceId);
        }
        setStatus('success');
        setTimeout(() => router.push('/today'), 3000);
      }
    } catch {
      setError('Erreur réseau. Réessayez.');
      setStatus('error');
    }
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #fafaf8 0%, #f0fdf4 35%, #fff7f4 65%, #fafaf8 100%)',
      }}
    >
      <Particles />

      {/* Soft background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: `${roleColor}08`, filter: 'blur(80px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none" style={{ background: '#6366f108', filter: 'blur(60px)' }} />

      {/* Logo top-left */}
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <div className="w-8 h-8 bg-[#26251e] rounded-xl flex items-center justify-center">
          <span className="text-white font-extrabold text-base">M</span>
        </div>
        <span className="text-sm font-bold text-[#26251e] hidden sm:block">Minerva OS</span>
      </div>

      {/* Confetti on success */}
      {status === 'success' && <ConfettiBurst />}

      <div
        className="relative bg-white/90 backdrop-blur-sm border border-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{
          boxShadow: `0 25px 60px ${roleColor}18, 0 8px 20px rgba(0,0,0,0.06)`,
          animation: 'slideUpFade 0.5s ease-out forwards',
        }}
      >
        {/* Top color strip */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${roleColor}, ${roleColor}88)` }} />

        <div className="p-8 space-y-6 text-center">

          {/* ── Loading ── */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-2xl border-2 border-[#e5e5e0] flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-[#7a7a76] animate-spin" />
              </div>
              <p className="text-sm text-[#7a7a76] font-semibold">Vérification de l&apos;invitation…</p>
            </div>
          )}

          {/* ── Content: needsLogin or ready ── */}
          {(status === 'needsLogin' || status === 'ready') && (
            <>
              {/* Workspace avatar */}
              <div className="flex justify-center">
                <WorkspaceAvatar
                  name={previewError ? 'Minerva' : (preview?.workspaceName ?? 'M')}
                  color={roleColor}
                />
              </div>

              {/* Title */}
              <div style={{ animation: 'slideUpFade 0.5s ease-out 0.1s both' }}>
                <p className="text-xs font-bold uppercase tracking-widest text-[#7a7a76] mb-1">
                  Invitation à rejoindre
                </p>
                <h1 className="text-2xl font-black text-[#26251e] leading-tight">
                  {previewError ? 'Espace de travail' : (preview?.workspaceName ?? 'Minerva OS')}
                </h1>
                {preview?.inviterName && (
                  <p className="text-sm text-[#7a7a76] mt-1">
                    par <span className="font-bold text-[#26251e]">{preview.inviterName}</span>
                  </p>
                )}
              </div>

              {/* Role badge */}
              {preview?.role && (
                <div className="flex justify-center" style={{ animation: 'slideUpFade 0.5s ease-out 0.2s both' }}>
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-bold text-sm"
                    style={{
                      background: `${roleColor}12`,
                      borderColor: `${roleColor}30`,
                      color: roleColor,
                    }}
                  >
                    {ROLE_ICONS[preview.role]}
                    {ROLE_LABELS[preview.role] ?? preview.role}
                    <span className="text-[11px] font-medium opacity-70">·</span>
                    <span className="text-[11px] font-medium opacity-80">
                      {ROLE_DESCRIPTIONS[preview.role] ?? ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Features preview */}
              {preview && !previewError && (
                <div
                  className="bg-[#fafaf8] border border-[#e5e5e0] rounded-2xl p-4 text-left space-y-2"
                  style={{ animation: 'slideUpFade 0.5s ease-out 0.3s both' }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-3">
                    Vous aurez accès à
                  </p>
                  {(preview.role === 'admin'
                    ? ['Leads & Pipeline complet', 'Campagnes & Séquences', 'Analytics & KPIs', 'Gestion d\'équipe', 'IA & Agents']
                    : preview.role === 'editor'
                    ? ['Leads & Pipeline', 'Campagnes email', 'Assistant IA & Canvas', 'Carte terrain & GPS']
                    : ['Lecture des leads', 'Vue carte terrain', 'Assistant IA']
                  ).map((feature, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: `${roleColor}18` }}>
                        <Check className="h-2.5 w-2.5" style={{ color: roleColor }} />
                      </div>
                      <span className="font-semibold text-[#26251e]">{feature}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Needs login — CTA buttons */}
              {status === 'needsLogin' && (
                <div className="space-y-3" style={{ animation: 'slideUpFade 0.5s ease-out 0.4s both' }}>
                  <Link
                    href={`/login?next=/join/${token}`}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ background: roleColor }}
                  >
                    <LogIn className="h-4 w-4" />
                    Se connecter
                  </Link>
                  <Link
                    href={`/login?next=/join/${token}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm border border-[#e5e5e0] bg-white hover:bg-[#fafaf8] text-[#26251e] transition-all active:scale-[0.98]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Créer un compte gratuit
                  </Link>
                  <p className="text-[10px] text-[#7a7a76]">
                    Ce lien est à usage unique et personnel.
                  </p>
                </div>
              )}

              {/* Ready — accept/decline */}
              {status === 'ready' && (
                <div className="space-y-3" style={{ animation: 'slideUpFade 0.5s ease-out 0.4s both' }}>
                  <div className="bg-[#f4f4f3] rounded-xl px-4 py-2.5 text-xs text-[#7a7a76] font-semibold">
                    Connecté en tant que <span className="text-[#26251e] font-bold">{user?.email}</span>
                  </div>
                  <button
                    onClick={handleAccept}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ background: roleColor }}
                  >
                    <Check className="h-4 w-4" />
                    Accepter et rejoindre l&apos;équipe
                  </button>
                  <button
                    onClick={() => router.push('/today')}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl font-bold text-sm border border-[#e5e5e0] text-[#7a7a76] hover:bg-[#fafaf8] transition-all"
                  >
                    <X className="h-4 w-4" />
                    Refuser
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Accepting ── */}
          {status === 'accepting' && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center border-2"
                  style={{ background: `${roleColor}12`, borderColor: `${roleColor}40` }}
                >
                  <Loader2 className="h-9 w-9 animate-spin" style={{ color: roleColor }} />
                </div>
              </div>
              <div>
                <p className="text-base font-black text-[#26251e]">Vous rejoignez l&apos;équipe…</p>
                <p className="text-xs text-[#7a7a76] mt-1">Configuration de votre accès en cours.</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-1.5 w-6 rounded-full" style={{ background: roleColor, opacity: 0.3 + i * 0.3 }} />
                ))}
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center border-2"
                style={{
                  background: `${roleColor}15`,
                  borderColor: `${roleColor}40`,
                  animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                }}
              >
                <Check className="h-11 w-11" style={{ color: roleColor }} />
              </div>

              <div>
                <h2 className="text-2xl font-black text-[#26251e]">Bienvenue dans l&apos;équipe ! 🎉</h2>
                <p className="text-sm text-[#7a7a76] mt-1.5">
                  Vous avez rejoint{' '}
                  <span className="font-bold text-[#26251e]">{preview?.workspaceName || "l'espace de travail"}</span>
                  {' '}en tant que{' '}
                  <span className="font-bold" style={{ color: roleColor }}>{ROLE_LABELS[preview?.role ?? ''] ?? preview?.role ?? 'membre'}</span>.
                </p>
              </div>

              <div className="w-full bg-[#fafaf8] border border-[#e5e5e0] rounded-2xl p-4 text-xs text-[#7a7a76] text-center">
                <p className="font-semibold text-[#26251e]">Redirection vers l&apos;application dans 3s…</p>
                <p className="mt-1">Vos accès sont maintenant actifs.</p>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#26251e]">Invitation invalide</h2>
                <p className="text-sm text-[#7a7a76] mt-1.5">{error}</p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => { setStatus('ready'); setError(''); }}
                  className="w-full py-2.5 rounded-xl font-bold text-sm transition-colors"
                  style={{ background: `${roleColor}15`, color: roleColor }}
                >
                  Réessayer
                </button>
                <Link
                  href="/today"
                  className="w-full py-2.5 rounded-xl border border-[#e5e5e0] text-xs font-semibold text-[#7a7a76] hover:bg-[#fafaf8] transition-colors text-center"
                >
                  Retour à l&apos;accueil
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(status === 'needsLogin' || status === 'ready') && (
          <div className="border-t border-[#e5e5e0] px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-[#7a7a76]">
              <Sparkles className="h-3 w-3 text-[#059669]" />
              <span>Propulsé par Minerva OS</span>
            </div>
            <Users className="h-3.5 w-3.5 text-[#7a7a76]" />
          </div>
        )}
      </div>
    </div>
  );
}
