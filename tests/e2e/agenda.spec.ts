import { test, expect } from '@playwright/test';

test.describe('Agenda', () => {
  test('shows the monthly calendar', async ({ page }) => {
    await page.goto('/agenda');
    await expect(page).toHaveURL(/\/agenda/);
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
  });

  test('creates a new appointment', async ({ page }) => {
    const title = `E2E RDV ${Date.now()}`;
    await page.goto('/agenda/new');
    await page.getByPlaceholder('Ex : Présentation offre SEO').fill(title);
    await page.click('button:has-text("Confirmer le rendez-vous")');

    await page.waitForURL((url) => !url.pathname.endsWith('/agenda/new'), { timeout: 15000 });
    await expect(page).toHaveURL(/\/agenda/);
  });
});
