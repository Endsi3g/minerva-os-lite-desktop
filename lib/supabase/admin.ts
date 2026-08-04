import { createClient, SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, 'public', any>;

const g = globalThis as typeof globalThis & { _supabaseAdminClient?: AdminClient };

export function getAdminClient(): AdminClient {
  if (g._supabaseAdminClient) return g._supabaseAdminClient;
  // Deliberately no fallback to the anon key: this client is used to bypass RLS for
  // privileged operations (e.g. team notification fan-out). Silently downgrading to the
  // anon key on a misconfigured env would make RLS-protected writes fail in a confusing,
  // hard-to-diagnose way instead of a clear crash at startup.
  g._supabaseAdminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  ) as AdminClient;
  return g._supabaseAdminClient;
}
