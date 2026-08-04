import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const screenshotDir = path.join(process.cwd(), '.playwright-screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
});

const pagesToCapture = [
  { name: '01_today_dashboard', path: '/today' },
  { name: '02_leads_list', path: '/leads' },
  { name: '03_map_terrain_mode', path: '/map' },
  { name: '04_ads_hub', path: '/ads' },
  { name: '05_weekly_report_analytics', path: '/weekly-report' },
  { name: '06_unified_library', path: '/library' },
  { name: '07_ai_agents', path: '/agents' },
  { name: '08_outreach', path: '/outreach' },
  { name: '09_agenda', path: '/agenda' },
  { name: '10_team', path: '/team' },
  { name: '11_prospecting', path: '/prospecting' },
  { name: '12_personas', path: '/personas' },
  { name: '13_pipeline', path: '/pipeline' },
  { name: '14_inbox', path: '/inbox' },
  { name: '15_tasks', path: '/tasks' },
  { name: '16_activities', path: '/activities' },
  { name: '17_messages', path: '/messages' },
  { name: '18_contacts', path: '/contacts' },
  { name: '19_notifications', path: '/notifications' },
  { name: '20_website_builder', path: '/website-builder' },
  { name: '21_seo_audit', path: '/audit' },
  { name: '22_client_reports', path: '/client-reports' },
  { name: '23_webhooks', path: '/webhooks' },
  { name: '24_sequences', path: '/sequences' },
  { name: '25_campaigns', path: '/campaigns' },
  { name: '26_assistant', path: '/assistant' },
  { name: '27_settings', path: '/settings' },
  { name: '28_setup', path: '/setup' },
  { name: '29_platform', path: '/platform' },
];

for (const { name, path: pagePath } of pagesToCapture) {
  test(`Capture screenshot of ${name} (${pagePath})`, async ({ page }) => {
    await page.goto(pagePath, { waitUntil: 'domcontentloaded', timeout: 25000 });
    // Wait for the app layout / h1 title to appear past the loading spinner
    try {
      await page.waitForSelector('h1', { timeout: 8000 });
    } catch { /* fallback timeout */ }
    await page.waitForTimeout(2000);
    const savePath = path.join(screenshotDir, `${name}.png`);
    await page.screenshot({ path: savePath, fullPage: true });
    console.log(`[Visual Test] Captured screenshot saved to: ${savePath}`);
  });
}
