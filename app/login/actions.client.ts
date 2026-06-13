// Client-side auth actions using the Supabase browser client.
// This file replaces the 'use server' actions.ts for static export (Electron build).
// All Supabase auth calls are made directly from the browser — no server required.
import { createClient } from '@/lib/supabase/client';

type ActionResult = { error?: string; success?: boolean };

export async function login(_state: unknown, formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Veuillez saisir votre e-mail et votre mot de passe.' };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message || 'Identifiants invalides.' };

  // Client-side navigation after login
  window.location.replace('/today');
  return {};
}

export async function signup(_state: unknown, formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) return { error: 'Veuillez saisir votre e-mail et votre mot de passe.' };
  if (password.length < 6) return { error: 'Le mot de passe doit contenir au moins 6 caractères.' };

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message || "Erreur lors de l'inscription." };

  window.location.replace('/welcome');
  return {};
}

export async function signout(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.replace('/login');
}

export async function requestOtp(
  _state: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = createClient();
  const email = formData.get('email') as string;
  if (!email) return { error: 'Veuillez saisir votre adresse e-mail.' };

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function verifyOtp(
  _state: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = createClient();
  const email = formData.get('email') as string;
  const token = formData.get('token') as string;

  if (!email || !token || token.length !== 6) {
    return { error: 'Code invalide. Vérifiez le code à 6 chiffres.' };
  }

  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) return { error: error.message };

  window.location.replace('/today');
  return {};
}

export async function requestPasswordReset(
  _state: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = createClient();
  const email = formData.get('email') as string;
  if (!email) return { error: 'Veuillez saisir votre adresse e-mail.' };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
  const redirectTo = `${appUrl}/api/auth/confirm-reset`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateUserPassword(
  _state: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = createClient();
  const password = formData.get('password') as string;
  const confirm = formData.get('confirm') as string;

  if (!password || password.length < 8) {
    return { error: 'Le mot de passe doit contenir au moins 8 caractères.' };
  }
  if (password !== confirm) {
    return { error: 'Les mots de passe ne correspondent pas.' };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  window.location.replace('/today');
  return {};
}
