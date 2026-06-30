/**
 * Returns the stable canonical base URL for OAuth redirect URIs.
 *
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL (explicit override, set this in Vercel env)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (Vercel system var: always the prod alias, never preview)
 * 3. localhost fallback for local dev
 *
 * Never use req.url.origin or VERCEL_URL — both can return preview/deployment-specific
 * URLs that are NOT registered in Google Cloud Console.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return 'http://localhost:3000';
}
