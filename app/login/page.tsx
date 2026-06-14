'use client';

import React, { useState, useActionState, useRef, useCallback, useEffect } from 'react';
import { login, signup, requestOtp, verifyOtp, requestPasswordReset } from './actions';
import { MinervaIcon } from '@/components/icons';
import { Lock, Mail, Loader2, Sparkles, Eye, EyeOff, ArrowLeft, CheckCircle2, User, Building2, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TextureOverlay } from '@/components/ui/texture-overlay';

// ─── types ────────────────────────────────────────────────────────────────────
type MainMode = 'login' | 'signup' | 'otp';
type SubView = 'main' | 'forgot' | 'forgot-sent' | 'otp-sent';

// ─── helper: OTP 6-box grid ───────────────────────────────────────────────────
function OtpGrid({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, raw: string) => {
    if (!/^\d*$/.test(raw)) return;
    const digit = raw.slice(-1);
    const next = [...value];
    next[idx] = digit;
    onChange(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      const next = [...value];
      next[idx - 1] = '';
      onChange(next);
      refs.current[idx - 1]?.focus();
    }
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      {value.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => { refs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          placeholder="0"
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          className="aspect-square text-center text-sm font-bold bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-xl outline-none transition-colors shadow-none text-[#26251e] placeholder:text-neutral-300"
        />
      ))}
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [mode, setMode] = useState<MainMode>('login');
  const [view, setView] = useState<SubView>('main');
  const [showPwd, setShowPwd] = useState(false);

  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const splashShown = sessionStorage.getItem('minerva_splash_shown');
    if (!splashShown) {
      setShowSplash(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem('minerva_splash_shown', 'true');
      }, 6500); // 6.5 seconds
      return () => clearTimeout(timer);
    }
  }, []);

  // Height morphing state for smooth transitions
  const [height, setHeight] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const rect = entries[0].contentRect;
      setHeight(rect.height);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // OTP state
  const [otpEmail, setOtpEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');

  // Track success transitions using stable action-wrapping callbacks
  // We use useRef to store the latest action result key so we can detect changes
  // without triggering setState in effects.
  const otpReqSucceededRef = useRef(false);
  const resetSucceededRef = useRef(false);

  // Server action wrappers that switch view immediately after success
  const otpReqActionWrapped = useCallback(
    async (state: unknown, formData: FormData) => {
      const result = await requestOtp(state, formData);
      if (result?.success && !otpReqSucceededRef.current) {
        otpReqSucceededRef.current = true;
        setView('otp-sent');
      }
      return result;
    },
    [],
  );

  const resetActionWrapped = useCallback(
    async (state: unknown, formData: FormData) => {
      const result = await requestPasswordReset(state, formData);
      if (result?.success && !resetSucceededRef.current) {
        resetSucceededRef.current = true;
        setView('forgot-sent');
      }
      return result;
    },
    [],
  );

  // Server actions
  const [loginState, loginAction, isLoginPending] = useActionState(login, null);
  const [signupState, signupAction, isSignupPending] = useActionState(signup, null);
  const [otpReqState, otpReqAction, isOtpReqPending] = useActionState(otpReqActionWrapped, null);
  const [otpVerState, otpVerAction, isOtpVerPending] = useActionState(verifyOtp, null);
  const [resetState, resetAction, isResetPending] = useActionState(resetActionWrapped, null);

  const switchMode = (m: MainMode) => {
    setMode(m);
    setView('main');
  };

  const otpToken = otpDigits.join('');
  const isOtpComplete = otpToken.length === 6;

  const activeState =
    view === 'forgot' ? resetState
    : view === 'otp-sent' ? otpVerState
    : mode === 'login' ? loginState
    : mode === 'otp' ? otpReqState
    : signupState;

  const isPending =
    isLoginPending || isSignupPending || isOtpReqPending || isOtpVerPending || isResetPending;

  // ── render ─────────────────────────────────────────────────────────────────
  if (showSplash) {
    return (
      <div className="relative flex min-h-screen w-screen flex-col items-center justify-center bg-[#f7f7f4] px-4 font-sans text-[#26251e] overflow-hidden">
        {/* Grid pattern background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-grid-pattern" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.06)_0%,_transparent_60%)] pointer-events-none" />

        {/* Skip button top-right */}
        <button
          onClick={() => {
            setShowSplash(false);
            sessionStorage.setItem('minerva_splash_shown', 'true');
          }}
          className="absolute top-6 right-6 rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 text-[10px] font-bold px-4 py-1.5 text-[#807d72] hover:text-[#26251e] transition-all cursor-pointer select-none uppercase tracking-wider shadow-none"
        >
          Passer
        </button>

        {/* Core content */}
        <div className="flex flex-col items-center gap-6 text-center z-10 max-w-sm">
          {/* Animated pulsing/rotating logo */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-[#10b981]/10 border border-[#10b981]/25 animate-pulse duration-1000 shadow-[0_0_50px_rgba(16,185,129,0.12)]">
            <MinervaIcon size={38} className="text-[#10b981] animate-in spin-in-12 duration-1000" />
            
            {/* Spinning decorative frame */}
            <div className="absolute inset-0 rounded-3xl border border-dashed border-[#10b981]/30 animate-[spin_20s_linear_infinite]" />
          </div>

          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <h1 className="text-3xl font-bold tracking-tight text-[#26251e] font-georgia font-serif">
              Minerva Reach
            </h1>
            <p className="text-[10px] text-[#807d72] font-bold tracking-widest uppercase">
              Superintelligence pour la prospection
            </p>
          </div>

          {/* Loader bar with animation */}
          <div className="w-48 bg-neutral-200/80 h-[2.5px] rounded-full overflow-hidden mt-6 relative border border-neutral-300/30">
            <div 
              className="bg-gradient-to-r from-[#10b981] to-[#f54e00] h-full rounded-full"
              style={{
                animation: 'loadProgress 6s cubic-bezier(0.1, 0.85, 0.25, 1) forwards',
              }}
            />
          </div>
        </div>

        {/* Global style inject keyframes */}
        <style jsx global>{`
          @keyframes loadProgress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-[#f7f7f4] px-4 font-sans text-[#26251e]">
      <TextureOverlay texture="grid" opacity={0.6} />
      {/* Background soft glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.06)_0%,_transparent_60%)] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="bg-white border border-[#e6e5e0] rounded-3xl shadow-sm p-8 space-y-6 animate-in fade-in zoom-in-95 duration-500">

          {/* ── Logo ── */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#10b981]/10 border border-[#10b981]/20">
              <MinervaIcon size={22} className="text-[#10b981]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#26251e]">
                Minerva Reach
              </h1>
              <p className="text-xs text-[#807d72] font-semibold mt-1">
                {view === 'forgot' || view === 'forgot-sent'
                  ? 'Réinitialisation du mot de passe'
                  : view === 'otp-sent'
                  ? 'Vérification du code'
                  : mode === 'login'
                  ? 'Connecte-toi à ton espace de prospection'
                  : mode === 'signup'
                  ? 'Crée ton compte Minerva gratuitement'
                  : 'Connexion sans mot de passe'}
              </p>
            </div>
          </div>

          {/* ── Mode tabs (hidden on sub-views) ── */}
          {view === 'main' && (
            <div className="relative grid grid-cols-3 rounded-xl bg-[#f7f7f4] p-1 border border-[#e6e5e0] overflow-hidden">
              {/* Sliding background indicator */}
              <div 
                className="absolute top-1 bottom-1 rounded-lg bg-white border border-[#e6e5e0] shadow-none transition-all duration-300 ease-out"
                style={{
                  left: mode === 'login' ? '4px' : mode === 'otp' ? 'calc(33.333% + 2px)' : 'calc(66.666% + 1px)',
                  width: 'calc(33.333% - 6px)'
                }}
              />
              {(['login', 'otp', 'signup'] as MainMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  disabled={isPending}
                  className={cn(
                    'relative z-10 rounded-lg py-1.5 text-[11px] font-semibold transition-all duration-300 cursor-pointer',
                    mode === m
                      ? 'text-[#26251e]'
                      : 'text-[#807d72] hover:text-[#26251e]',
                  )}
                >
                  {m === 'login' ? 'Connexion' : m === 'otp' ? 'Code OTP' : 'S\'inscrire'}
                </button>
              ))}
            </div>
          )}

          {/* Height morphing container */}
          <div 
            className="overflow-hidden transition-[height] duration-300 ease-in-out relative"
            style={{ height: height ? `${height}px` : 'auto' }}
          >
            <div ref={containerRef} className="space-y-6">
              {/* ── Error / info banner ── */}
              {activeState?.error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-semibold animate-in fade-in slide-in-from-top-2 duration-300">
                  {activeState.error}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════════
                  VIEW: FORGOT PASSWORD — Email request form
              ══════════════════════════════════════════════════════════════════ */}
              {view === 'forgot' && (
                <div key="forgot" className="animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
                  <form action={resetAction} className="space-y-4">
                    <input type="hidden" name="email" value={forgotEmail} />

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                        Adresse e-mail
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3.5 flex items-center text-[#807d72]">
                          <Mail className="h-4 w-4" />
                        </span>
                        <input
                          type="email"
                          name="email"
                          placeholder="nom@entreprise.fr"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          disabled={isPending}
                          className="w-full rounded-full border border-[#e6e5e0] bg-white px-4 py-2.5 pl-10 text-xs font-semibold text-[#26251e] outline-none transition-colors focus:border-[#10b981] disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!forgotEmail || isPending}
                      className={cn(
                        'w-full rounded-full py-3 text-xs font-bold transition-all flex items-center justify-center gap-2',
                        forgotEmail && !isPending
                          ? 'bg-[#26251e] hover:bg-[#1a1a19] text-white cursor-pointer'
                          : 'bg-neutral-100 text-[#807d72] border border-[#e6e5e0] cursor-not-allowed',
                      )}
                    >
                      {isPending ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /><span>Envoi...</span></>
                      ) : (
                        'Envoyer le lien de réinitialisation'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setView('main')}
                      className="flex items-center gap-1.5 text-[10px] font-semibold text-[#807d72] hover:text-[#26251e] transition-colors mx-auto"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Retour à la connexion
                    </button>
                  </form>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════════
                  VIEW: FORGOT-SENT confirmation
              ══════════════════════════════════════════════════════════════════ */}
              {view === 'forgot-sent' && (
                <div key="forgot-sent" className="text-center space-y-4 animate-in fade-in duration-300">
                  <div className="flex justify-center">
                    <CheckCircle2 className="h-12 w-12 text-[#10b981]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#26251e]">Email envoyé !</p>
                    <p className="text-xs text-[#807d72] font-semibold mt-1 leading-relaxed">
                      Vérifiez votre boîte de réception à{' '}
                      <span className="text-[#26251e] underline">{forgotEmail}</span>.{' '}
                      Cliquez sur le lien pour réinitialiser votre mot de passe.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setView('main'); setMode('login'); }}
                    className="text-[11px] font-bold text-[#807d72] hover:text-[#26251e] underline transition-colors"
                  >
                    Retour à la connexion
                  </button>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════════
                  VIEW: OTP-SENT — verify code
              ══════════════════════════════════════════════════════════════════ */}
              {view === 'otp-sent' && (
                <div key="otp-sent" className="animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
                  <form action={otpVerAction} className="space-y-4">
                    <input type="hidden" name="email" value={otpEmail} />
                    <input type="hidden" name="token" value={otpToken} />

                    <p className="text-xs text-[#807d72] font-semibold leading-relaxed">
                      Code envoyé à{' '}
                      <span className="text-[#26251e] underline">{otpEmail}</span>.
                      Entrez le code à 6 chiffres ci-dessous.
                    </p>

                    <OtpGrid value={otpDigits} onChange={setOtpDigits} />

                    {otpVerState?.error && (
                      <p className="text-xs font-semibold text-red-600 animate-in fade-in duration-200">
                        {otpVerState.error}
                      </p>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setView('main')}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-5 py-2.5 text-xs font-bold text-[#26251e] shadow-none transition-colors"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Retour
                      </button>

                      <button
                        type="submit"
                        disabled={!isOtpComplete || isPending}
                        className={cn(
                          'flex-1 rounded-full py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2',
                          isOtpComplete && !isPending
                            ? 'bg-[#26251e] hover:bg-[#1a1a19] text-white cursor-pointer'
                            : 'bg-neutral-100 text-[#807d72] border border-[#e6e5e0] cursor-not-allowed',
                        )}
                      >
                        {isPending ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /><span>Vérification...</span></>
                        ) : (
                          'Vérifier le code'
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setView('main')}
                      className="text-[10px] font-bold text-[#807d72] hover:text-[#26251e] underline transition-colors block text-center"
                    >
                      Renvoyer le code
                    </button>
                  </form>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════════
                  VIEW: MAIN — login / signup / otp-request forms
              ══════════════════════════════════════════════════════════════════ */}
              {view === 'main' && (
                <div key={`${mode}-form`} className="animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
                  {/* ── LOGIN mode ─────────────────────────────────────────── */}
                  {mode === 'login' && (
                    <form action={loginAction} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="email-login" className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                          Adresse e-mail
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3.5 flex items-center text-[#807d72]">
                            <Mail className="h-4 w-4" />
                          </span>
                          <input
                            id="email-login"
                            name="email"
                            type="email"
                            placeholder="nom@entreprise.fr"
                            required
                            disabled={isPending}
                            className="w-full rounded-full border border-[#e6e5e0] bg-white px-4 py-2.5 pl-10 text-xs font-semibold text-[#26251e] outline-none transition-colors focus:border-[#10b981] disabled:opacity-60"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label htmlFor="pwd-login" className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                            Mot de passe
                          </label>
                          <button
                            type="button"
                            onClick={() => setView('forgot')}
                            className="text-[10px] font-semibold text-[#10b981] hover:text-[#059669] underline transition-colors"
                          >
                            Mot de passe oublié ?
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3.5 flex items-center text-[#807d72]">
                            <Lock className="h-4 w-4" />
                          </span>
                          <input
                            id="pwd-login"
                            name="password"
                            type={showPwd ? 'text' : 'password'}
                            placeholder="••••••••"
                            required
                            disabled={isPending}
                            className="w-full rounded-full border border-[#e6e5e0] bg-white px-4 py-2.5 pl-10 pr-10 text-xs font-semibold text-[#26251e] outline-none transition-colors focus:border-[#10b981] disabled:opacity-60"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPwd((v) => !v)}
                            className="absolute inset-y-0 right-3.5 flex items-center text-[#807d72] hover:text-[#26251e] transition-colors"
                          >
                            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {loginState?.error && (
                        <p className="text-xs font-semibold text-red-600 animate-in fade-in duration-200">
                          {loginState.error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={isPending}
                        className="w-full rounded-full bg-[#26251e] hover:bg-[#1a1a19] text-white py-3 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                      >
                        {isLoginPending ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /><span>Connexion...</span></>
                        ) : (
                          'Se connecter'
                        )}
                      </button>
                    </form>
                  )}

                  {/* ── SIGNUP mode ─────────────────────────────────────────── */}
                  {mode === 'signup' && (
                    <form action={signupAction} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label htmlFor="firstname-signup" className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                            Prénom
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3.5 flex items-center text-[#807d72]">
                              <User className="h-4 w-4" />
                            </span>
                            <input
                              id="firstname-signup"
                              name="firstName"
                              type="text"
                              placeholder="Jean"
                              required
                              disabled={isPending}
                              className="w-full rounded-full border border-[#e6e5e0] bg-white px-4 py-2.5 pl-10 text-xs font-semibold text-[#26251e] outline-none transition-colors focus:border-[#10b981] disabled:opacity-60"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="lastname-signup" className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                            Nom de famille
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3.5 flex items-center text-[#807d72]">
                              <User className="h-4 w-4" />
                            </span>
                            <input
                              id="lastname-signup"
                              name="lastName"
                              type="text"
                              placeholder="Dupont"
                              required
                              disabled={isPending}
                              className="w-full rounded-full border border-[#e6e5e0] bg-white px-4 py-2.5 pl-10 text-xs font-semibold text-[#26251e] outline-none transition-colors focus:border-[#10b981] disabled:opacity-60"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="phone-signup" className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                          Numéro de téléphone
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3.5 flex items-center text-[#807d72]">
                            <Phone className="h-4 w-4" />
                          </span>
                          <input
                            id="phone-signup"
                            name="phone"
                            type="tel"
                            placeholder="+1 (514) 123-4567"
                            required
                            disabled={isPending}
                            className="w-full rounded-full border border-[#e6e5e0] bg-white px-4 py-2.5 pl-10 text-xs font-semibold text-[#26251e] outline-none transition-colors focus:border-[#10b981] disabled:opacity-60"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="company-signup" className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                          Nom de l'entreprise (optionnel)
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3.5 flex items-center text-[#807d72]">
                            <Building2 className="h-4 w-4" />
                          </span>
                          <input
                            id="company-signup"
                            name="companyName"
                            type="text"
                            placeholder="Mon Entreprise"
                            disabled={isPending}
                            className="w-full rounded-full border border-[#e6e5e0] bg-white px-4 py-2.5 pl-10 text-xs font-semibold text-[#26251e] outline-none transition-colors focus:border-[#10b981] disabled:opacity-60"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="email-signup" className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                          Adresse e-mail
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3.5 flex items-center text-[#807d72]">
                            <Mail className="h-4 w-4" />
                          </span>
                          <input
                            id="email-signup"
                            name="email"
                            type="email"
                            placeholder="nom@entreprise.fr"
                            required
                            disabled={isPending}
                            className="w-full rounded-full border border-[#e6e5e0] bg-white px-4 py-2.5 pl-10 text-xs font-semibold text-[#26251e] outline-none transition-colors focus:border-[#10b981] disabled:opacity-60"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="pwd-signup" className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                          Mot de passe
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3.5 flex items-center text-[#807d72]">
                            <Lock className="h-4 w-4" />
                          </span>
                          <input
                            id="pwd-signup"
                            name="password"
                            type={showPwd ? 'text' : 'password'}
                            placeholder="Min. 6 caractères"
                            required
                            disabled={isPending}
                            className="w-full rounded-full border border-[#e6e5e0] bg-white px-4 py-2.5 pl-10 pr-10 text-xs font-semibold text-[#26251e] outline-none transition-colors focus:border-[#10b981] disabled:opacity-60"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPwd((v) => !v)}
                            className="absolute inset-y-0 right-3.5 flex items-center text-[#807d72] hover:text-[#26251e] transition-colors"
                          >
                            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {signupState?.error && (
                        <p className="text-xs font-semibold text-red-600 animate-in fade-in duration-200">
                          {signupState.error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={isPending}
                        className="w-full rounded-full bg-[#26251e] hover:bg-[#1a1a19] text-white py-3 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                      >
                        {isSignupPending ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /><span>Création...</span></>
                        ) : (
                          "S'inscrire gratuitement"
                        )}
                      </button>
                    </form>
                  )}

                  {/* ── OTP REQUEST mode ────────────────────────────────────── */}
                  {mode === 'otp' && (
                    <form action={otpReqAction} className="space-y-4">
                      <p className="text-xs text-[#807d72] font-semibold leading-relaxed">
                        Entrez votre adresse e-mail. Nous vous enverrons un code à usage unique pour vous connecter sans mot de passe.
                      </p>

                      <div className="space-y-1.5">
                        <label htmlFor="email-otp" className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                          Adresse e-mail
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3.5 flex items-center text-[#807d72]">
                            <Mail className="h-4 w-4" />
                          </span>
                          <input
                            id="email-otp"
                            name="email"
                            type="email"
                            placeholder="nom@entreprise.fr"
                            value={otpEmail}
                            onChange={(e) => setOtpEmail(e.target.value)}
                            required
                            disabled={isPending}
                            className="w-full rounded-full border border-[#e6e5e0] bg-white px-4 py-2.5 pl-10 text-xs font-semibold text-[#26251e] outline-none transition-colors focus:border-[#10b981] disabled:opacity-60"
                          />
                        </div>
                      </div>

                      {otpReqState?.error && (
                        <p className="text-xs font-semibold text-red-600 animate-in fade-in duration-200">
                          {otpReqState.error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={!otpEmail || isPending}
                        className={cn(
                          'w-full rounded-full py-3 text-xs font-bold transition-all flex items-center justify-center gap-2',
                          otpEmail && !isPending
                            ? 'bg-[#26251e] hover:bg-[#1a1a19] text-white cursor-pointer'
                            : 'bg-neutral-100 text-[#807d72] border border-[#e6e5e0] cursor-not-allowed',
                        )}
                      >
                        {isOtpReqPending ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /><span>Envoi du code...</span></>
                        ) : (
                          'Envoyer le code OTP'
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Footer branding ── */}
          <div className="flex items-center justify-center gap-1.5 text-[9px] text-[#807d72] font-semibold pt-2 border-t border-[#e6e5e0]">
            <Sparkles className="h-3 w-3 text-[#10b981]" />
            <span>Propulsé par Minerva OS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
