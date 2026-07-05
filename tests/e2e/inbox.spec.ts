import { test, expect } from '@playwright/test';

// The E2E test account has no real Gmail OAuth connection, so this spec verifies the
// honest "not connected" state and its call-to-action rather than mocking a fake inbox —
// asserting on the real Google Connect button is a stronger signal than faking a connection.
test.describe('Inbox', () => {
  test('shows the Gmail connection prompt when not connected', async ({ page }) => {
    await page.goto('/inbox');
    await expect(page).toHaveURL(/\/inbox/);
    await expect(page.getByText('Connecter mon compte Gmail')).toBeVisible({ timeout: 15000 });
  });
});
