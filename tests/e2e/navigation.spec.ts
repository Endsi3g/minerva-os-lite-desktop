import { test, expect } from '@playwright/test';

// Mirrors app/(app)/layout.tsx's pinnedItems + navCategories — every entry a real user
// can click from the sidebar must render, not 404/500. New nav items added later should
// be appended here too.
const NAV_ROUTES = [
  '/today', '/leads', '/outreach', '/map', '/agenda', '/team',
  '/prospecting', '/personas', '/pipeline', '/inbox', '/field',
  '/tasks', '/activities', '/messages', '/contacts', '/notifications',
  '/assistant', '/agents', '/intelligence', '/skills',
  '/ads', '/acquisition', '/website-builder', '/audit', '/client-reports', '/performance', '/webhooks',
  '/sequences', '/campaigns', '/playbooks',
  '/leads/rescue',
];

test.describe('Navigation', () => {
  for (const route of NAV_ROUTES) {
    test(`${route} renders without error`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status(), `${route} responded with an error status`).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
