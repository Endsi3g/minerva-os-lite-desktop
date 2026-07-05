import { test, expect } from '@playwright/test';

// This spec deliberately starts logged out — every other spec reuses the saved session
// from global-setup.ts, but the login/logout flow itself needs a clean slate to test.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('redirects an unauthenticated visitor to /login', async ({ page }) => {
    await page.goto('/today');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs in with password and lands in the authenticated app', async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL!;
    const password = process.env.E2E_TEST_PASSWORD!;

    await page.goto('/login');
    await page.click('text=Connexion');
    await page.fill('#email-login', email);
    await page.fill('#pwd-login', password);
    await page.click('button[type="submit"]:has-text("Se connecter")');

    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('rejects an invalid password with a visible error', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Connexion');
    await page.fill('#email-login', 'not-a-real-account@example.com');
    await page.fill('#pwd-login', 'wrong-password-123');
    await page.click('button[type="submit"]:has-text("Se connecter")');

    await expect(page.locator('.border-red-200, .bg-red-50')).toBeVisible({ timeout: 10000 });
  });
});
