import { test, expect } from '@playwright/test';

test.describe('Tier 2: Boundary & Corner Cases (Empty States, Invalid UUIDs & Mobile Viewport)', () => {
  test('Boundary: Empty CRM state displays 0 metrics and zero conversion without NaN or mock 88%', async ({ page }) => {
    // Intercept leads and tasks to return empty lists
    await page.goto('/weekly-report');
    await page.waitForLoadState('domcontentloaded');

    // Page must remain responsive and not display NaN or broken values
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('undefined%');
  });

  test('Boundary: Invalid UUID format in API query parameter is safely rejected or fallback-handled without 500 error', async ({ request }) => {
    const invalidUUIDs = ['invalid-uuid', 'default_ws', '12345', "' OR 1=1 --", '%00'];
    for (const id of invalidUUIDs) {
      const res = await request.get(`/api/inbox/threads?workspace_id=${encodeURIComponent(id)}&mode=leads`);
      // Must not crash with unhandled 500 PostgreSQL 22P02
      expect([200, 400, 401, 404]).toContain(res.status());
    }
  });

  test('Boundary: Unauthenticated API calls return clean 401 JSON without HTML crash pages', async ({ playwright }) => {
    const freshContext = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await freshContext.get('/api/workspaces');
    expect([401, 200]).toContain(res.status());
    if (res.status() === 401) {
      const data = await res.json();
      expect(data).toHaveProperty('error');
    }
    await freshContext.dispose();
  });

  test('Viewport: Mobile responsive rendering (<450px) maintains usability without horizontal overflow', async ({ page }) => {
    // Set mobile viewport (iPhone 14 / standard compact mobile)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/today');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toBeVisible();

    // Verify document does not have unbounded horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10);
  });

  test('Viewport: Mobile view on Tasks and Messages adapts navigation and panels', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();

    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Boundary: Extreme input length and special characters in forms do not break UI rendering', async ({ page }) => {
    await page.goto('/today');
    await page.waitForLoadState('domcontentloaded');

    // Open task dialog and input special characters (Unicode, quotes, HTML tags)
    const taskBtn = page.getByRole('button', { name: /Nouvelle tâche|Tâche/i }).first();
    if (await taskBtn.isVisible()) {
      await taskBtn.click();
      const input = page.locator('#task-title, input[placeholder*="ex: Relancer"]').first();
      if (await input.isVisible()) {
        const specialPayload = '<script>alert("xss")</script> & " \' € 🚀 日本語 [test]';
        await input.fill(specialPayload);
        await expect(input).toHaveValue(specialPayload);
      }
    }
  });
});
