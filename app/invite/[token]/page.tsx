'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ShieldCheck, Mail, Lock, User, Briefcase, LogOut, ArrowRight, Sparkles } from 'lucide-react';

export default function InviteJoinPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  // Invitation info
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    role: string;
    workspaceName: string;
    inviterName: string;
  } | null>(null);

  // Auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load and validate token
  useEffect(() => {
    if (!token) return;

    const validateInvite = async () => {
      try {
        const res = await fetch(`/api/team/invite/validate?token=${token}`);
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || 'Invitation invalide');
          setLoading(false);
          return;
        }

        setInviteInfo({
          email: data.email,
          role: data.role,
          workspaceName: data.workspaceName,
          inviterName: data.inviterName,
        });
        setEmail(data.email);

        // Check if there is a logged in user
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch (err) {
        console.error('Validate invite error:', err);
        setError('Impossible de valider l\'invitation. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };

    validateInvite();
  }, [token]);

  // Handle accept invite for logged in user
  const handleAcceptInvite = async () => {
    if (!token) return;
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/team/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Erreur lors de l\'acceptation de l\'invitation');
        setAuthLoading(false);
        return;
      }

      // Success -> redirect directly to welcome (bypassing onboarding!)
      router.push('/welcome');
    } catch (err) {
      console.error('Accept invite error:', err);
      setAuthError('Erreur de connexion. Veuillez réessayer.');
      setAuthLoading(false);
    }
  };

  // Handle signup/login forms
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !inviteInfo) return;
    setAuthLoading(true);
    setAuthError(null);

    const supabase = createClient();

    try {
      if (authMode === 'signup') {
        // Signup flow
        if (password.length < 6) {
          setAuthError('Le mot de passe doit contenir au moins 6 caractères.');
          setAuthLoading(false);
          return;
        }

        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || 'Collaborateur';

        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: fullName,
              company_name: inviteInfo.workspaceName, // Pre-fill workspace name
            }
          }
        });

        if (signUpErr) {
          setAuthError(signUpErr.message);
          setAuthLoading(false);
          return;
        }

        if (signUpData.user) {
          // Accept the invite using the accept endpoint (which will initialize settings with company_name)
          const res = await fetch('/api/team/invite/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          
          if (!res.ok) {
            const acceptData = await res.json();
            setAuthError(acceptData.error || 'Compte créé mais erreur lors de la liaison au workspace');
            setAuthLoading(false);
            return;
          }

          router.push('/welcome');
        }
      } else {
        // Login flow
        const { data: logInData, error: logInErr } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });

        if (logInErr) {
          setAuthError(logInErr.message || 'Identifiants invalides');
          setAuthLoading(false);
          return;
        }

        if (logInData.user) {
          const res = await fetch('/api/team/invite/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          
          if (!res.ok) {
            const acceptData = await res.json();
            setAuthError(acceptData.error || 'Connecté mais erreur lors de la liaison au workspace');
            setAuthLoading(false);
            return;
          }

          router.push('/welcome');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setAuthError(err.message || 'Une erreur est survenue lors de l\'authentification');
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs font-semibold text-[#7a7a76]">Validation de l'invitation en cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex flex-col items-center justify-center px-4">
        <Card className="max-w-md w-full border-[#e5e5e0] shadow-md rounded-2xl overflow-hidden text-center">
          <CardContent className="p-8 space-y-5">
            <div className="h-12 w-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6 rotate-180" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-bold text-[#26251e]">Invitation Invalide</h1>
              <p className="text-xs text-[#7a7a76] leading-relaxed">{error}</p>
            </div>
            <Button onClick={() => router.push('/login')} className="w-full bg-[#26251e] hover:bg-neutral-800 text-white font-bold text-xs h-10 rounded-xl">
              Retourner à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col lg:flex-row">
      
      {/* Left side: branding & welcome invite */}
      <div className="flex-1 bg-[#26251e] text-white flex flex-col justify-between p-8 lg:p-16 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-45 -right-45 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        
        {/* Top header */}
        <div className="z-10 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-white text-base">
            M
          </div>
          <span className="font-extrabold tracking-tight text-sm">Minerva OS</span>
        </div>

        {/* Center: Invite Details */}
        <div className="z-10 max-w-lg my-12 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase rounded-full tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Invitation reçu</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              Rejoignez l'espace <span className="text-emerald-400">{inviteInfo?.workspaceName}</span>
            </h1>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Vous avez été invité(e) par <strong className="text-white">{inviteInfo?.inviterName}</strong> à rejoindre son équipe sur Minerva OS en tant que <strong className="capitalize text-emerald-400">{inviteInfo?.role === 'editor' ? 'Éditeur' : inviteInfo?.role === 'viewer' ? 'Lecteur' : 'Administrateur'}</strong>.
            </p>
          </div>

          <div className="border-t border-neutral-800 pt-6 space-y-3.5">
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center text-emerald-400 text-xs shrink-0 mt-0.5">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold">Bypass de l'onboarding</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">L'espace est déjà entièrement configuré pour vous, commencez à prospecter immédiatement.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center text-emerald-400 text-xs shrink-0 mt-0.5">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold">Collaboration en temps réel</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Visualisez qui travaille sur les leads, discutez par chat et répartissez les tâches.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="z-10 text-[10px] text-neutral-500">
          © {new Date().getFullYear()} Minerva OS Reach Lite. Sécurisé avec Supabase Auth.
        </p>
      </div>

      {/* Right side: Register / Login / Join Form */}
      <div className="w-full lg:w-[480px] bg-white flex flex-col justify-center p-8 lg:p-12 border-l border-[#e5e5e0]">
        <div className="max-w-sm w-full mx-auto space-y-6">
          
          {currentUser ? (
            /* User is already logged in */
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-[#26251e]">Accepter l'invitation</h2>
                <p className="text-xs text-[#7a7a76]">
                  Vous êtes actuellement connecté en tant que <strong className="text-[#26251e]">{currentUser.email}</strong>.
                </p>
              </div>

              {currentUser.email?.toLowerCase() !== inviteInfo?.email?.toLowerCase() && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xl leading-normal">
                  ⚠️ <strong>Attention :</strong> Cette invitation a été envoyée à <strong>{inviteInfo?.email}</strong>. Êtes-vous sûr de vouloir l'accepter avec votre compte actuel ?
                </div>
              )}

              {authError && (
                <p className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">
                  {authError}
                </p>
              )}

              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleAcceptInvite}
                  disabled={authLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2"
                >
                  {authLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Rejoindre l'espace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#807d72] hover:text-red-600 transition-colors border border-transparent hover:border-neutral-200 hover:bg-[#fafaf8] rounded-xl"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Se déconnecter de ce compte</span>
                </button>
              </div>
            </div>
          ) : (
            /* User needs to register or login */
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-[#26251e]">
                  {authMode === 'signup' ? 'Créer un compte' : 'Se connecter'}
                </h2>
                <p className="text-xs text-[#7a7a76]">
                  {authMode === 'signup' 
                    ? 'Rejoignez votre équipe en créant un mot de passe.' 
                    : 'Connectez-vous pour rejoindre l\'espace de travail.'}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {authMode === 'signup' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">Prénom</label>
                      <div className="relative">
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                        <Input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Jean"
                          className="h-9 text-xs pl-8 border-[#e5e5e0] focus:ring-1 focus:ring-emerald-600 rounded-lg placeholder-neutral-300"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom</label>
                      <div className="relative">
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                        <Input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Dupont"
                          className="h-9 text-xs pl-8 border-[#e5e5e0] focus:ring-1 focus:ring-emerald-600 rounded-lg placeholder-neutral-300"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">Adresse e-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                    <Input
                      type="email"
                      required
                      disabled
                      value={email}
                      className="h-9 text-xs pl-8 bg-[#f4f4f3] text-[#7a7a76] border-[#e5e5e0] rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                    <Input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-9 text-xs pl-8 border-[#e5e5e0] focus:ring-1 focus:ring-emerald-600 rounded-lg placeholder-neutral-300"
                    />
                  </div>
                </div>

                {authError && (
                  <p className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5 leading-normal">
                    {authError}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#26251e] hover:bg-neutral-800 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2 pt-1"
                >
                  {authLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>{authMode === 'signup' ? 'Créer mon compte et rejoindre' : 'Se connecter et rejoindre'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                    setAuthError(null);
                  }}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-all"
                >
                  {authMode === 'signup' 
                    ? 'Vous avez déjà un compte ? Connectez-vous' 
                    : 'Nouveau collaborateur ? Créez un compte'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
