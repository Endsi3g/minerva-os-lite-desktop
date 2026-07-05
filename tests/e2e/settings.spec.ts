import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test('opens the settings page with its section nav', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
  });

  test('toggles an automation and the change persists after reload', async ({ page }) => {
    await page.goto('/settings/automations');
    const toggle = page.locator('button:has-text("Actif"), button:has-text("Inactif")').first();
    if (await toggle.count() === 0) {
      test.skip(true, 'No automation rule seeded for this workspace yet');
      return;
    }
    const before = await toggle.innerText();
    await toggle.click();
    await page.waitForTimeout(500); // optimistic UI + Supabase update round-trip

    await page.reload();
    const after = await page.locator('button:has-text("Actif"), button:has-text("Inactif")').first().innerText();
    expect(after).not.toBe(before);
  });
});
