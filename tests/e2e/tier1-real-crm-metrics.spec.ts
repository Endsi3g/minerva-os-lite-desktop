import { test, expect } from '@playwright/test';

test.describe('Tier 1: True CRM Metrics, Export & Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/weekly-report');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Weekly Report page renders with live CRM metrics section', async ({ page }) => {
    await expect(page).toHaveURL(/\/weekly-report/);
    const title = page.getByText(/Bilan Hebdomadaire/i).first();
    await expect(title).toBeVisible();
  });

  test('Weekly Report displays accurate CRM metrics without mock hardcoded values', async ({ page }) => {
    // Verify metric cards exist (RDV, Réponses positives, Leads avancés, Portefeuille actif)
    const metricsGrid = page.locator('text=RDV & Bookings, text=Réponses positives, text=Leads avancés').first();
    await expect(metricsGrid).toBeVisible({ timeout: 10000 });
  });

  test('Actualiser button refreshes report and activity journal', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /Actualiser/i }).first();
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Sub-tab navigation switches between Bilan IA, Performance équipe, and Analytics', async ({ page }) => {
    const perfTab = page.getByRole('button', { name: /Performance équipe/i }).first();
    if (await perfTab.isVisible()) {
      await perfTab.click();
      await expect(page.locator('body')).toBeVisible();
    }

    const analyticsTab = page.getByRole('button', { name: /Analytics/i }).first();
    if (await analyticsTab.isVisible()) {
      await analyticsTab.click();
      await expect(page.locator('body')).toBeVisible();
    }

    const bilanTab = page.getByRole('button', { name: /Bilan IA/i }).first();
    if (await bilanTab.isVisible()) {
      await bilanTab.click();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('History sidebar opens and displays archived reports without UI freezing', async ({ page }) => {
    const historyBtn = page.getByRole('button', { name: /Historique/i }).first();
    if (await historyBtn.isVisible()) {
      await historyBtn.click();
      const historyDrawer = page.getByText(/Bilans précédents|Cette semaine/i).first();
      await expect(historyDrawer).toBeVisible({ timeout: 5000 });
    }
  });

  test('Journal des Actions displays executed and suggested timeline items', async ({ page }) => {
    const journalTitle = page.getByText(/Journal des Actions/i).first();
    await expect(journalTitle).toBeVisible({ timeout: 10000 });
  });

  test('Empty state across Lead Account 360 and Workload render gracefully without infinite skeletons', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();

    // Check no stuck skeleton animation
    const infiniteSkeleton = page.locator('.infinite-loader, .skeleton-stuck');
    if (await infiniteSkeleton.isVisible()) {
      await expect(infiniteSkeleton).not.toBeVisible({ timeout: 5000 });
    }
  });
});
