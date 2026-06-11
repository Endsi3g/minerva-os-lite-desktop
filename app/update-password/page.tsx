'use client';

import React, { useRef, useState, useActionState } from 'react';
import { updateUserPassword } from '../login/actions';
import { MinervaIcon } from '@/components/icons';
import { Lock, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UpdatePasswordPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, isPending] = useActionState(updateUserPassword, null);

  const strength = (() => {
    if (password.length === 0) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-500'][strength];

  const passwordsMatch = confirm.length > 0 && password === confirm;
  const canSubmit = password.length >= 8 && passwordsMatch;

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#f7f7f4] text-[#26251e] font-sans px-4">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.06)_0%,_transparent_60%)] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white border border-[#e6e5e0] rounded-3xl shadow-sm p-8 space-y-6 animate-in fade-in zoom-in-95 duration-500">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#10b981]/10 border border-[#10b981]/20">
              <MinervaIcon size={22} className="text-[#10b981]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#26251e]">
                Nouveau mot de passe
              </h1>
              <p className="text-xs text-[#807d72] font-semibold mt-1">
                Choisissez un mot de passe sécurisé pour votre compte Minerva.
              </p>
            </div>
          </div>

          {/* Error banner */}
          {state?.error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-semibold animate-in fade-in slide-in-from-top-2 duration-300">
              {state.error}
            </div>
          )}

          <form ref={formRef} action={action} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-[#807d72]">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Min. 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isPending}
                  className="w-full rounded-full border border-[#e6e5e0] bg-white px-4 py-2.5 pl-10 pr-10 text-xs font-semibold text-[#26251e] outline-none transition-colors focus:border-[#10b981] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute inset-y-0 right-3.5 flex items-center text-[#807d72] hover:text-[#26251e] transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-all duration-300',
                          i <= strength ? strengthColor : 'bg-[#e6e5e0]',
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-[#807d72]">{strengthLabel}</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-[#807d72]">
                  {passwordsMatch ? (
                    <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </span>
                <input
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Répétez le mot de passe"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  disabled={isPending}
                  className={cn(
                    'w-full rounded-full border bg-white px-4 py-2.5 pl-10 pr-10 text-xs font-semibold text-[#26251e] outline-none transition-colors disabled:opacity-60',
                    confirm.length > 0 && !passwordsMatch
                      ? 'border-red-300 focus:border-red-400'
                      : passwordsMatch
                      ? 'border-[#10b981] focus:border-[#10b981]'
                      : 'border-[#e6e5e0] focus:border-[#10b981]',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-3.5 flex items-center text-[#807d72] hover:text-[#26251e] transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirm.length > 0 && !passwordsMatch && (
                <p className="text-[10px] font-bold text-red-500 animate-in fade-in duration-200">
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit || isPending}
              className={cn(
                'w-full rounded-full py-3 text-xs font-bold transition-all duration-300 shadow-sm flex items-center justify-center gap-2 mt-2',
                canSubmit && !isPending
                  ? 'bg-[#26251e] hover:bg-[#1a1a19] text-white cursor-pointer'
                  : 'bg-neutral-100 text-[#807d72] border border-[#e6e5e0] cursor-not-allowed',
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mise à jour...</span>
                </>
              ) : (
                <span>Mettre à jour le mot de passe</span>
              )}
            </button>
          </form>

          {/* Back link */}
          <p className="text-center text-[10px] text-[#807d72] font-semibold">
            <a href="/login" className="underline hover:text-[#26251e] transition-colors">
              Retour à la connexion
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
