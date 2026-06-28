import { createClient, SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, 'public', any>;

const g = globalThis as typeof globalThis & { _supabaseAdminClient?: AdminClient };

export function getAdminClient(): AdminClient {
  if (g._supabaseAdminClient) return g._supabaseAdminClient;
  g._supabaseAdminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  ) as AdminClient;
  return g._supabaseAdminClient;
}
