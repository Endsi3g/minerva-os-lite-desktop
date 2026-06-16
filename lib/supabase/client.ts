import { createBrowserClient } from '@supabase/ssr';

// Persisted on globalThis so HMR module reloads in dev don't create a second
// GoTrueClient instance (which would cause the "multiple instances" warning).
type BrowserClient = ReturnType<typeof createBrowserClient>;
const g = globalThis as typeof globalThis & { _supabaseBrowserClient?: BrowserClient };

export function createClient(): BrowserClient {
  if (g._supabaseBrowserClient) return g._supabaseBrowserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (typeof window !== 'undefined') {
      console.warn(
        'Supabase credentials missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). ' +
        'Using placeholder client.'
      );
    }
    g._supabaseBrowserClient = createBrowserClient(
      url || 'https://placeholder.supabase.co',
      anonKey || 'placeholder'
    );
    return g._supabaseBrowserClient;
  }

  // createBrowserClient stores the session in cookies (not just localStorage),
  // making it readable by the SSR middleware and server-side API routes.
  g._supabaseBrowserClient = createBrowserClient(url, anonKey);
  return g._supabaseBrowserClient;
}
