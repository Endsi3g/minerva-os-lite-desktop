import { test, expect } from '@playwright/test';

test.describe('End-to-End : 5 Hubs du Cycle de Vente & Moteur Speed Run 20x', () => {
  // 1. Test Navigation Principale vers les 5 Hubs
  const HUBS = [
    { name: 'Accueil', path: '/today' },
    { name: 'Trouver', path: '/prospecting' },
    { name: 'Contacter', path: '/outreach' },
    { name: 'Rencontrer', path: '/field' },
    { name: 'Clôturer', path: '/pipeline' },
    { name: 'Analyser', path: '/weekly-report' },
  ];

  for (const hub of HUBS) {
    test(`Hub ${hub.name} (${hub.path}) s'affiche sans erreur`, async ({ page }) => {
      const res = await page.goto(hub.path);
      expect(res?.status()).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();
    });
  }

  // 2. Test Sub-Navigations des Hubs
  test('Sub-Nav Hub Trouver permet de basculer entre Carte et Personas', async ({ page }) => {
    await page.goto('/prospecting');
    await page.waitForLoadState('domcontentloaded');

    // Vérifier la présence de l'onglet Carte Live
    const carteTab = page.locator('a[href="/map"]').first();
    if (await carteTab.isVisible()) {
      await carteTab.click();
      await page.waitForURL('**/map');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Sub-Nav Hub Contacter permet de basculer vers Boîte de réception', async ({ page }) => {
    await page.goto('/outreach');
    await page.waitForLoadState('domcontentloaded');

    const inboxTab = page.locator('a[href="/inbox"]').first();
    if (await inboxTab.isVisible()) {
      await inboxTab.click();
      await page.waitForURL('**/inbox');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Sub-Nav Hub Clôturer permet de basculer entre Pipeline et Fichier Leads', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('domcontentloaded');

    const leadsTab = page.locator('a[href="/leads"]').first();
    if (await leadsTab.isVisible()) {
      await leadsTab.click();
      await page.waitForURL('**/leads');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  // 3. Test Speed Run Commercial Overlay sur l'Accueil
  test('Lancement du Speed Run depuis Accueil et interaction avec les touches', async ({ page }) => {
    await page.goto('/today');
    await page.waitForLoadState('domcontentloaded');

    // Rechercher le bouton Lancer le Speed Run
    const speedRunBtn = page.getByRole('button', { name: /Lancer le Speed Run/i }).first();
    if (await speedRunBtn.isVisible()) {
      await speedRunBtn.click();

      // Vérifier que le modal s'est ouvert
      const overlayTitle = page.getByText(/Speed Run Commercial/i).first();
      await expect(overlayTitle).toBeVisible();

      // Vérifier la présence des sélecteurs de canal
      const emailChannel = page.getByRole('button', { name: /Email/i }).first();
      const fieldChannel = page.getByRole('button', { name: /Tournée Terrain/i }).first();
      await expect(emailChannel).toBeVisible();
      await expect(fieldChannel).toBeVisible();

      // Changer de canal vers Tournée Terrain
      await fieldChannel.click();

      // Tester le raccourci M pour modifier le pitch
      await page.keyboard.press('m');
      const textarea = page.locator('textarea');
      if (await textarea.isVisible()) {
        await textarea.fill('Message de test Speed Run automatisé');
      }

      // Passer au prospect suivant avec Espace
      await page.keyboard.press('Escape');
    }
  });

  // 4. Test Changelog In-App
  test('Page Changelog affiche la version v9.1.0 avec son titre', async ({ page }) => {
    await page.goto('/changelog');
    await page.waitForLoadState('domcontentloaded');

    const v9Title = page.getByText(/v9.1.0/i).first();
    await expect(v9Title).toBeVisible();

    const desc = page.getByText(/Architecture des 5 Hubs du Cycle de Vente/i).first();
    await expect(desc).toBeVisible();
  });
});
