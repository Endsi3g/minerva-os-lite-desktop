import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';

// Loaded here (not just in global-setup.ts) so the `pnpm dev` webServer child process — which
// Next.js's own .env.local loading will NOT override once process.env already has these keys —
// talks to the same Supabase project the admin-provisioned test user actually lives in.
// Hand-rolled parser: process.loadEnvFile() does not reliably handle the quoted
// KEY="value" format that `vercel env pull` writes to .env.production.local.
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
    if (process.env[key]) continue; // don't clobber explicitly-set env vars
    const value = rawValue.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    process.env[key] = value;
  }
}

loadEnvFileManually(new URL('./.env.production.local', import.meta.url).pathname);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Every spec starts already authenticated (see global-setup.ts) except auth.spec.ts,
    // which explicitly clears storageState to exercise the login/logout flow itself.
    storageState: 'tests/e2e/.auth/user.json',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
