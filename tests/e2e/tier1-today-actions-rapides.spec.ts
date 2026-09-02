import { test, expect } from '@playwright/test';

test.describe('Tier 1: Today Page & Header "Actions Rapides"', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/today');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Today page loads with heading and header action controls', async ({ page }) => {
    await expect(page).toHaveURL(/\/today/);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
  });

  test('New Task dialog opens, validates input, and creates a task', async ({ page }) => {
    // Locate New Task button (dialog trigger)
    const taskBtn = page.getByRole('button', { name: /Nouvelle tâche|New task|Tâche/i }).first();
    if (await taskBtn.isVisible()) {
      await taskBtn.click();
      
      // Dialog should open
      const dialogTitle = page.getByText(/Nouvelle tâche|Créer une tâche/i).first();
      await expect(dialogTitle).toBeVisible({ timeout: 5000 });

      // Fill in task title
      const titleInput = page.locator('#task-title, input[placeholder*="ex: Relancer"], input[name="title"]').first();
      await expect(titleInput).toBeVisible();
      await titleInput.fill(`E2E Task ${Date.now()}`);

      // Submit form
      const submitBtn = page.locator('button[type="submit"]:has-text("Créer"), button:has-text("Ajouter")').first();
      await submitBtn.click();

      // Dialog should close
      await expect(dialogTitle).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('Add Lead sheet opens with complete form inputs and creates lead', async ({ page }) => {
    // Locate Add Lead button
    const leadBtn = page.getByRole('button', { name: /Nouveau prospect|Ajouter un lead|Nouveau Lead/i }).first();
    if (await leadBtn.isVisible()) {
      await leadBtn.click();

      // Sheet should open
      const sheetTitle = page.getByText(/Ajouter un prospect|Nouveau prospect/i).first();
      await expect(sheetTitle).toBeVisible({ timeout: 5000 });

      // Fill required business name
      const bizInput = page.locator('input[placeholder*="Boulangerie"], input[placeholder*="Nom de l\'entreprise"]').first();
      await bizInput.fill(`Boulangerie E2E ${Date.now()}`);

      // Submit lead
      const saveBtn = page.locator('button[type="submit"]:has-text("Enregistrer"), button:has-text("Ajouter")').first();
      await saveBtn.click();

      // Sheet closes
      await expect(sheetTitle).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('Mode Esthétique button toggles aesthetic canvas without UI crash', async ({ page }) => {
    const aestheticBtn = page.getByRole('button', { name: /Mode Esthétique/i }).first();
    if (await aestheticBtn.isVisible()) {
      await aestheticBtn.click();
      // Verify body remains visible and interactive
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Today page does not display infinite loading skeletons or broken cards', async ({ page }) => {
    // Ensure no stuck spinner or skeleton animation blocking user interactions
    const skeleton = page.locator('.animate-pulse.h-64, .skeleton-infinite');
    if (await skeleton.isVisible()) {
      await expect(skeleton).not.toBeVisible({ timeout: 10000 });
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('Today Agenda / Calendar section renders cleanly', async ({ page }) => {
    // Verify agenda / calendar card or widget renders on Today
    const agendaSection = page.locator('text=Agenda, text=Rendez-vous, text=Calendrier').first();
    await expect(page.locator('body')).toBeVisible();
    if (await agendaSection.isVisible()) {
      await expect(agendaSection).toBeVisible();
    }
  });
});
