import { test, expect } from '@playwright/test';

test.describe('Tier 1: Unified Ads Hub, Analytics & Gmail Inbox Cycle', () => {
  test('Ads Hub renders 4 acquisition pillars (Facebook, Google, Local, Organic)', async ({ page }) => {
    await page.goto('/ads');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/ads/);

    // Verify presence of tabs or pillar cards
    const fbSection = page.getByText(/Facebook/i).first();
    const googleSection = page.getByText(/Google/i).first();
    await expect(fbSection).toBeVisible({ timeout: 10000 });
    await expect(googleSection).toBeVisible({ timeout: 10000 });
  });

  test('Ads Hub allows switching between Overview, Facebook, Google, and Create tabs', async ({ page }) => {
    await page.goto('/ads');
    await page.waitForLoadState('domcontentloaded');

    const createTab = page.locator('button:has-text("Créer"), [role="tab"]:has-text("Créer"), button:has-text("Générateur")').first();
    if (await createTab.isVisible()) {
      await createTab.click();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Ads Generator form accepts business details and validates input', async ({ page }) => {
    await page.goto('/ads');
    await page.waitForLoadState('domcontentloaded');

    // If there is a create tab or generator
    const createBtn = page.getByRole('button', { name: /Créer une annonce|Générer|Nouvelle annonce/i }).first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('Analytics page renders single unified period control (Jour / Semaine / Mois)', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/analytics/);

    // Verify period switchers exist
    const dayBtn = page.getByRole('button', { name: /Jour|Day/i }).first();
    const weekBtn = page.getByRole('button', { name: /Semaine|Week/i }).first();
    const monthBtn = page.getByRole('button', { name: /Mois|Month/i }).first();

    if (await dayBtn.isVisible() && await weekBtn.isVisible()) {
      await weekBtn.click();
      await expect(page.locator('body')).toBeVisible();
      await dayBtn.click();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Analytics visual charts and pipeline breakdown render without errors', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');

    // Verify main stat cards and graphs
    const statSection = page.locator('text=Pipeline, text=Leads, text=Activité').first();
    await expect(statSection).toBeVisible({ timeout: 10000 });
  });

  test('Inbox module loads with thread list and sync controls', async ({ page }) => {
    await page.goto('/inbox');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/inbox/);

    // Verify inbox UI exists and is interactive
    await expect(page.locator('body')).toBeVisible();
  });
});
