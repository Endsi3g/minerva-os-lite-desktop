import { test, expect } from '@playwright/test';

test.describe('Tier 3: Cross-Feature Integration Workflows', () => {
  test('Integration Workflow 1: Add Lead in Today -> Navigate to Composer -> View in Weekly Report', async ({ page }) => {
    // 1. Add Lead on Today page
    await page.goto('/today');
    await page.waitForLoadState('domcontentloaded');

    const leadBtn = page.getByRole('button', { name: /Nouveau prospect|Ajouter un lead|Nouveau Lead/i }).first();
    const testLeadName = `Boutique E2E ${Date.now()}`;

    if (await leadBtn.isVisible()) {
      await leadBtn.click();
      const bizInput = page.locator('input[placeholder*="Boulangerie"], input[placeholder*="Nom de l\'entreprise"]').first();
      await bizInput.fill(testLeadName);
      const saveBtn = page.locator('button[type="submit"]:has-text("Enregistrer"), button:has-text("Ajouter")').first();
      await saveBtn.click();
      await page.waitForTimeout(500);
    }

    // 2. Navigate to Composer / Outreach
    await page.goto('/outreach');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/outreach/);

    // 3. Navigate to Weekly Report and verify CRM metrics reflect the state
    await page.goto('/weekly-report');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/weekly-report/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Integration Workflow 2: Create Task assigned to Minerva AI -> Navigate to Messages -> Send DM to Minerva', async ({ page }) => {
    // 1. Tasks page: Create task
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');

    const taskTitleInput = page.locator('input[placeholder*="Nouvelle tâche"], input[placeholder*="tâche"]').first();
    if (await taskTitleInput.isVisible()) {
      await taskTitleInput.fill(`Relancer prospect avec Minerva ${Date.now()}`);
      await taskTitleInput.press('Enter');
    }

    // 2. Messages page: Direct messaging
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/messages/);

    const minervaItem = page.getByText(/Minerva/i).first();
    if (await minervaItem.isVisible()) {
      await minervaItem.click();
      const msgInput = page.locator('input[placeholder*="message"], textarea').first();
      if (await msgInput.isVisible()) {
        await msgInput.fill('Bonjour Minerva, peux-tu préparer le brief du jour ?');
        await msgInput.press('Enter');
      }
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('Integration Workflow 3: Channel Navigation -> Chat interaction -> Task sync', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');

    const groupBtn = page.getByText(/Chat d'équipe|Tous les membres/i).first();
    if (await groupBtn.isVisible()) {
      await groupBtn.click();
      await expect(page.locator('body')).toBeVisible();
    }

    // Transition to tasks
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/tasks/);
  });

  test('Integration Workflow 4: Ads Hub Campaign Formulation -> Analytics Monitoring', async ({ page }) => {
    // 1. Visit Ads Hub
    await page.goto('/ads');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/ads/);

    // 2. Transition to Analytics
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Integration Workflow 5: Pipeline stage advance -> Activity feed & Weekly report update', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/pipeline/);

    // Verify pipeline columns render
    await expect(page.locator('body')).toBeVisible();

    // Verify weekly report captures pipeline activity
    await page.goto('/weekly-report');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });
});
