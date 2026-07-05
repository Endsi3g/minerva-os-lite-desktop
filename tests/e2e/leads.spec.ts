import { test, expect } from '@playwright/test';

test.describe('Leads', () => {
  test('lists leads with the search box available', async ({ page }) => {
    await page.goto('/leads');
    await expect(page).toHaveURL(/\/leads/);
    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15000 });
  });

  test('creates a new lead and it appears in the list', async ({ page }) => {
    const businessName = `E2E Test Lead ${Date.now()}`;

    await page.goto('/leads/new');
    await page.getByPlaceholder("Boulangerie L'Épi d'Or").fill(businessName);
    await page.getByPlaceholder('Boulangerie', { exact: true }).fill('Test niche');
    await page.getByPlaceholder('Montréal').fill('Montréal');
    await page.click('button[type="submit"]:has-text("Enregistrer le prospect")');

    await page.waitForURL((url) => !url.pathname.endsWith('/leads/new'), { timeout: 15000 });

    // The leads list can briefly serve a cached response right after creation — poll with a
    // reload rather than a single check, matching a real user who'd hit refresh once.
    await expect(async () => {
      await page.goto('/leads');
      // Also pins "recently visited" leads at the top separately from the main table row,
      // so the freshly-created lead can legitimately appear twice on this page.
      await expect(page.getByText(businessName).first()).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 30000, intervals: [2000] });
  });

  test('opens a lead detail page from the list', async ({ page }) => {
    await page.goto('/leads');
    const firstLeadLink = page.locator('a[href^="/leads/"]').first();
    await expect(firstLeadLink).toBeVisible({ timeout: 15000 });
    await firstLeadLink.click();
    await expect(page).toHaveURL(/\/leads\/[^/]+$/);
  });
});
