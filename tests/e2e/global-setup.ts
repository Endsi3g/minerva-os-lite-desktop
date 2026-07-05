import { chromium, type FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Loading env vars from playwright.config.ts does not reliably propagate into this file's
// execution context, so this module loads .env.production.local itself. Hand-rolled parser:
// process.loadEnvFile() does not handle the quoted KEY="value" format `vercel env pull` writes.
function loadEnvFileManually(filePath: string) {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue; // don't clobber explicitly-set env vars (e.g. E2E_TEST_EMAIL)
    process.env[key] = rawValue.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
}

loadEnvFileManually(new URL('../../.env.production.local', import.meta.url).pathname);

/**
 * Provisions (or reuses) a dedicated E2E test account + workspace, then logs in once
 * via the real password-login form and saves the session so every spec starts authenticated.
 *
 * Deliberately requires E2E_TEST_EMAIL/E2E_TEST_PASSWORD to be set explicitly rather than
 * defaulting to a hardcoded address — this script writes real rows (auth.users, settings,
 * workspaces) via SUPABASE_SERVICE_ROLE_KEY, so it must never run silently against a
 * project the caller didn't knowingly point it at.
 */
export default async function globalSetup(config: FullConfig) {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!email || !password) {
    throw new Error(
      'E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set before running the e2e suite.\n' +
      'These provision a dedicated test account — pick an address you do not use for real, ' +
      'e.g. e2e-tests@yourdomain.tld, so it is never confused with real user data.',
    );
  }
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.production.local, loaded by playwright.config.ts).');
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // Find or create the test user (idempotent across repeated test runs).
  let userId: string;
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users.find((u) => u.email === email);
  if (found) {
    userId = found.id;
    // E2E_TEST_PASSWORD may differ from a previous run (e.g. freshly generated) — keep the
    // real auth record in sync so the login step below always uses the current password.
    await admin.auth.admin.updateUserById(userId, { password });
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(`Failed to create E2E test user: ${error?.message}`);
    userId = created.user.id;
  }

  // Ensure a workspace exists and settings point onboarding-complete at it — mirrors what
  // app/onboarding/page.tsx writes on real signup, so the proxy never redirects to /onboarding.
  const { data: ws } = await admin.from('workspaces').select('id').eq('owner_id', userId).limit(1).maybeSingle();
  let workspaceId = ws?.id as string | undefined;
  if (!workspaceId) {
    const { data: newWs, error } = await admin
      .from('workspaces')
      .insert({ name: 'E2E Test Workspace', owner_id: userId })
      .select('id')
      .single();
    if (error || !newWs) throw new Error(`Failed to create E2E test workspace: ${error?.message}`);
    workspaceId = newWs.id;
  }

  await admin.from('settings').upsert({
    user_id: userId,
    full_name: 'E2E Test User',
    company_name: 'E2E Test Co',
    workspace_id: workspaceId,
    active_workspace_id: workspaceId,
  });

  // Log in through the real UI once, then persist the session for every spec to reuse.
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}/login`);
  await page.click('text=Connexion');
  await page.fill('#email-login', email);
  await page.fill('#pwd-login', password);
  await page.click('button[type="submit"]:has-text("Se connecter")');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
  await browser.close();
}
