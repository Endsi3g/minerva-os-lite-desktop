'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export async function login(state: unknown, formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Veuillez saisir votre e-mail et votre mot de passe.' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message || 'Identifiants invalides.' };
  }

  revalidatePath('/', 'layout');
  redirect('/today');
}

export async function signup(state: unknown, formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Veuillez saisir votre e-mail et votre mot de passe.' };
  }

  if (password.length < 6) {
    return { error: 'Le mot de passe doit contenir au moins 6 caractères.' };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message || "Erreur lors de l'inscription." };
  }

  revalidatePath('/', 'layout');
  redirect('/welcome');
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Sends a magic-link OTP to the user's email via Supabase Auth.
 * Returns { error } if it fails, or { success: true } on success.
 */
export async function requestOtp(
  state: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const email = formData.get('email') as string;

  if (!email) return { error: 'Veuillez saisir votre adresse e-mail.' };

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Verifies the 6-digit OTP code the user typed in the browser.
 * On success, redirects to /today.
 */
export async function verifyOtp(
  state: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const token = formData.get('token') as string;

  if (!email || !token || token.length !== 6) {
    return { error: 'Code invalide. Vérifiez le code à 6 chiffres.' };
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  redirect('/today');
}

/**
 * Triggers a password-reset email via Supabase Auth (PKCE flow).
 * The email contains a link to /api/auth/confirm-reset?code=...
 */
export async function requestPasswordReset(
  state: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const email = formData.get('email') as string;

  if (!email) return { error: 'Veuillez saisir votre adresse e-mail.' };

  // Derive origin from server-side request headers
  const headerList = await headers();
  const origin = headerList.get('origin') ?? headerList.get('x-forwarded-host') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectTo = `${origin}/api/auth/confirm-reset`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Updates the authenticated user's password.
 * Must be called from /update-password page after the session has been
 * established via /api/auth/confirm-reset.
 */
export async function updateUserPassword(
  state: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient();
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

  revalidatePath('/', 'layout');
  redirect('/today');
}
