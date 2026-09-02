import { createBrowserClient } from '@supabase/ssr';

// Persisted on globalThis so HMR module reloads in dev don't create a second
// GoTrueClient instance (which would cause the "multiple instances" warning).
type BrowserClient = ReturnType<typeof createBrowserClient>;
const g = globalThis as typeof globalThis & { _supabaseBrowserClient?: BrowserClient };

export function createClient(): BrowserClient {
  if (g._supabaseBrowserClient) return g._supabaseBrowserClient;

  const fallbackUrl = 'https://eqpoqksvdmyuqmiogsyk.supabase.co';
  const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxcG9xa3N2ZG15dXFtaW9nc3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTkyMzEsImV4cCI6MjA5Njc3NTIzMX0.fxAhX_HtBenZdccygLr09V4UmC1lsHKH34FOyui2mOU';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackKey;

  // createBrowserClient stores the session in cookies (not just localStorage),
  // making it readable by the SSR middleware and server-side API routes.
  g._supabaseBrowserClient = createBrowserClient(url, anonKey);
  return g._supabaseBrowserClient;
}
