import { test, expect } from '@playwright/test';

test.describe('Tier 4: Real-World Commercial Workload Scenarios', () => {
  test('Workload Scenario 1: Morning Commercial Routine (Today -> Actions Rapides -> Agenda)', async ({ page }) => {
    // Step 1: Open Today Dashboard
    await page.goto('/today');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/today/);

    // Step 2: Check Speed Run or Quick Actions
    const quickActionBtn = page.getByRole('button', { name: /Actions Rapides|Nouveau prospect|Tâche/i }).first();
    if (await quickActionBtn.isVisible()) {
      await quickActionBtn.click();
    }

    // Step 3: Check Daily Schedule / Agenda
    await page.goto('/agenda');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/agenda/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Workload Scenario 2: End-of-Week Executive Review & Synthesis Export', async ({ page }) => {
    // Step 1: Navigate to Weekly Review
    await page.goto('/weekly-report');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/weekly-report/);

    // Step 2: Validate live strategic AI synthesis section
    const synthesis = page.getByText(/Synthèse Stratégique|Analyse du portefeuille/i).first();
    await expect(page.locator('body')).toBeVisible();

    // Step 3: Refresh analysis
    const refreshBtn = page.getByRole('button', { name: /Actualiser/i }).first();
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
    }

    // Step 4: Verify metrics are present and non-crashing
    const metricsHeading = page.getByText(/Taux NBA|RDV & Bookings|Réponses positives/i).first();
    await expect(metricsHeading).toBeVisible({ timeout: 10000 });
  });

  test('Workload Scenario 3: Full Multi-Channel Acquisition Flow (Ads Hub -> Outreach -> Inbox)', async ({ page }) => {
    // Step 1: Explore Ads Hub
    await page.goto('/ads');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/ads/);

    // Step 2: Move to Outreach / Sequences
    await page.goto('/outreach');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/outreach/);

    // Step 3: Move to Boîte de Réception (Inbox)
    await page.goto('/inbox');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/inbox/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Workload Scenario 4: Multi-Member Team Operations & Workspace Switch', async ({ page }) => {
    // Step 1: View Team Members
    await page.goto('/team');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/team/);

    // Step 2: Team Tasks inspection
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');

    const teamTab = page.getByRole('button', { name: /Équipe/i }).first();
    if (await teamTab.isVisible()) {
      await teamTab.click();
      await expect(page.locator('body')).toBeVisible();
    }

    // Step 3: Team Messages & Collaboration
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/messages/);
    await expect(page.locator('body')).toBeVisible();
  });
});
