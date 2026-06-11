'use client';

import React, { useState, useActionState } from 'react';
import { login, signup } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Lock, Mail, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  // React 19 useActionState
  const [loginState, loginAction, isLoginPending] = useActionState(login, null);
  const [signupState, signupAction, isSignupPending] = useActionState(signup, null);

  const activeState = mode === 'login' ? loginState : signupState;
  const isPending = isLoginPending || isSignupPending;
  const currentAction = mode === 'login' ? loginAction : signupAction;

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-background px-4 font-sans text-foreground">
      {/* Background soft highlights */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />

      <Card className="relative w-full max-w-md border border-border bg-card shadow-none animate-in fade-in-50 zoom-in-95 duration-500">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-black">
              M
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              Minerva Reach
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {mode === 'login' 
                ? "Connecte-toi à ton espace de prospection locale" 
                : "Crée ton compte et commence à qualifier tes prospects"}
            </CardDescription>
          </div>
        </CardHeader>

        <form action={currentAction}>
          <CardContent className="space-y-4">
            {/* Toggle Modes */}
            <div className="grid grid-cols-2 rounded-lg bg-muted p-1 border border-border">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`rounded-md py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  mode === 'login' 
                    ? 'bg-card text-foreground border border-border/80 shadow-none' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                disabled={isPending}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`rounded-md py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  mode === 'signup' 
                    ? 'bg-card text-foreground border border-border/80 shadow-none' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                disabled={isPending}
              >
                Créer un compte
              </button>
            </div>

            {/* Error Message */}
            {activeState?.error && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {activeState.error}
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1">
              <label htmlFor="email" className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Adresse E-mail
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </span>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nom@entreprise.fr"
                  className="pl-9 bg-card border-border focus:border-primary text-xs text-foreground"
                  required
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label htmlFor="password" className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Mot de passe
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 bg-card border-border focus:border-primary text-xs text-foreground"
                  required
                  disabled={isPending}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-wider h-9 transition-all duration-300 shadow-none"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary-foreground" />
                  {mode === 'login' ? "Connexion..." : "Création..."}
                </>
              ) : (
                <>
                  {mode === 'login' ? "Se connecter" : "S'inscrire"}
                </>
              )}
            </Button>

            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-1 justify-center">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Propulsé par Minerva OS</span>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
