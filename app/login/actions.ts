// Universal auth actions — compatible with both Next.js server-rendered mode
// and static export (Electron) mode.
//
// Implementation: uses the Supabase browser client directly. In server-rendered
// mode this works because the pages that call these actions are all 'use client'
// components. In export/Electron mode, there is no server at all — all calls
// happen in the browser.
//
// Historically this file used 'use server' + createClient (cookie-based SSR).
// That is incompatible with output:'export'. The browser client approach works
// in both modes because signout/auth state changes are picked up via
// supabase.auth.onAuthStateChange in the layout.
import { createClient } from '@/lib/supabase/client';

type ActionResult = { error?: string; success?: boolean };

function navigate(path: string) {
  if (typeof window !== 'undefined') {
    window.location.href = path;
  }
}

export async function login(_state: unknown, formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const next = (formData.get('next') as string) || '/today';

  if (!email || !password) {
    return { error: 'Veuillez saisir votre e-mail et votre mot de passe.' };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message || 'Identifiants invalides.' };

  navigate(next);
  return {};
}

export async function signup(_state: unknown, formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const phone = formData.get('phone') as string;
  const companyName = formData.get('companyName') as string;
  const next = (formData.get('next') as string) || null;

  if (!email || !password) return { error: 'Veuillez saisir votre e-mail et votre mot de passe.' };
  if (password.length < 6) return { error: 'Le mot de passe doit contenir au moins 6 caractères.' };

  const finalFirstName = firstName?.trim() || '';
  const finalLastName = lastName?.trim() || '';
  const finalFullName = `${finalFirstName} ${finalLastName}`.trim() || 'Utilisateur Minerva';
  const finalPhone = phone?.trim() || '';
  const finalCompanyName = companyName?.trim() || 'Mon Workspace';
  const finalEmail = email?.trim() || '';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: finalFirstName || undefined,
        last_name: finalLastName || undefined,
        full_name: finalFullName,
        phone: finalPhone || undefined,
        company_name: finalCompanyName || undefined,
      },
    },
  });
  if (error) return { error: error.message || "Erreur lors de l'inscription." };

  if (data?.user) {
    const { error: settingsError } = await supabase.from('settings').upsert({
      user_id: data.user.id,
      full_name: finalFullName,
      last_name: finalLastName,
      phone: finalPhone,
      email: finalEmail,
      company_name: finalCompanyName,
      timezone: 'Europe/Paris',
      niches: ['Boulangerie', 'Coiffure'],
      cities: ['Paris'],
      ai_tone: 'Calme & Conseil',
      ai_density: 'Standard',
    });
    if (settingsError) {
      console.error("Error creating settings during signup:", settingsError);
    }
  }

  // If there's a pending invite, go to onboarding first then redirect
  // For new signups with a next path, store it in sessionStorage so onboarding can pick it up
  if (next && next !== '/today' && typeof window !== 'undefined') {
    try { sessionStorage.setItem('minerva_post_onboarding_next', next); } catch {}
  }
  navigate('/onboarding');
  return {};
}

export async function signout(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  navigate('/login');
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
  const next = (formData.get('next') as string) || '/today';

  if (!email || !token || token.length !== 6) {
    return { error: 'Code invalide. Vérifiez le code à 6 chiffres.' };
  }

  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) return { error: error.message };

  navigate(next);
  return {};
}

export async function requestPasswordReset(
  _state: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = createClient();
  const email = formData.get('email') as string;
  if (!email) return { error: 'Veuillez saisir votre adresse e-mail.' };

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
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

  navigate('/today');
  return {};
}
