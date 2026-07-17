'use client';

import { createClient } from '@/lib/supabase/client';

interface GuestSessionResult {
  error?: string;
}

// Starts a Supabase anonymous session so a visitor can try the product
// without creating an account. Also writes a placeholder profile to
// `settings` so proxy.ts treats onboarding as already complete and sends
// the guest straight into the app instead of through the onboarding wizard
// — the whole point of this flow is removing friction, not adding a
// different one. Workspace + demo data are seeded lazily once inside the
// app shell (see app/(app)/today/_components/today-root.tsx), since that's
// where the existing addLead/addTask helpers (correct across
// Electron/web storage) are available.
export async function startGuestSession(): Promise<GuestSessionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error || !data.user) {
    return { error: error?.message || "Impossible de démarrer une session d'essai. Réessayez." };
  }

  try {
    await supabase.from('settings').upsert({
      user_id: data.user.id,
      full_name: 'Visiteur',
      company_name: "Espace d'essai",
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Non-blocking — worst case the guest goes through /onboarding once.
  }

  return {};
}
