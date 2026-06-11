'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
