import { test, expect } from '@playwright/test';

test.describe('Assistant IA', () => {
  test('sends a message and receives a reply', async ({ page }) => {
    await page.goto('/assistant');
    const input = page.getByPlaceholder('Comment puis-je vous aider aujourd\'hui ?');
    await expect(input).toBeVisible({ timeout: 15000 });

    const prompt = `E2E ping ${Date.now()}`;
    await input.click();
    await input.pressSequentially(prompt, { delay: 20 });
    await expect(input).toHaveValue(prompt);
    await input.press('Enter');

    // The sent message renders as its own bubble first.
    await expect(page.getByText(prompt).first()).toBeVisible({ timeout: 10000 });

    // Real AI call — generous timeout, and we only assert a reply rendered, not its exact
    // content, since the model/wording can vary by provider (Anthropic/OpenRouter/Cloudflare).
    await expect(async () => {
      const bodyText = await page.locator('body').innerText();
      const afterPrompt = bodyText.split(prompt)[1] ?? '';
      expect(afterPrompt.trim().length).toBeGreaterThan(0);
    }).toPass({ timeout: 30000 });
  });
});
