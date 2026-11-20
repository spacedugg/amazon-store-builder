import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`reference URLs and design preferences are copied together at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => {
      window.__copiedStorePrompt = '';
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.__copiedStorePrompt = value; } } });
    });
    await page.route('**/api/feedback?counts=1', route => route.fulfill({ json: { counts: {} } }));
    await page.goto('/tests/workflow-browser.html');
    await page.getByRole('button', { name: 'Neuer Store', exact: true }).click();
    await page.getByLabel('Amazon-Store-Link 1', { exact: true }).fill('https://www.amazon.de/stores/page/123');
    await page.getByLabel('Was gefällt dir an Referenz 1? (optional)', { exact: true }).fill('Bildfolge der Homepage');
    await page.getByRole('button', { name: 'Referenz hinzufügen', exact: true }).click();
    await page.getByLabel('Amazon-Store-Link 2', { exact: true }).fill('https://www.amazon.de/stores/page/456');
    await page.getByLabel('Was gefällt dir an Referenz 2? (optional)', { exact: true }).fill('Kategorie-Aufbau');
    await page.screenshot({ path: test.info().outputPath('reference-inputs.png'), fullPage: true });
    await page.getByRole('button', { name: 'Prompt kopieren', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Prompt in Zwischenablage' })).toHaveText('Prompt in Zwischenablage');
    const copied = await page.evaluate(() => window.__copiedStorePrompt);
    expect(copied).toContain('https://www.amazon.de/stores/page/123');
    expect(copied).toContain('Bildfolge der Homepage');
    expect(copied).toContain('https://www.amazon.de/stores/page/456');
    expect(copied).toContain('Kategorie-Aufbau');
    await page.getByLabel('Amazon-Store-Link 2', { exact: true }).fill('https://www.amazon.de/dp/B012345678');
    await expect(page.getByRole('button', { name: 'Prompt kopieren', exact: true })).toBeDisabled();
    await expect(page.getByRole('alert')).toContainText('Amazon-Brand-Store-Link');
    await expect(page.getByRole('status').filter({ hasText: 'Prompt in Zwischenablage' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Referenz 2 entfernen', exact: true }).click();
    await page.getByRole('button', { name: 'Prompt kopieren', exact: true }).click();
    expect(await page.evaluate(() => window.__copiedStorePrompt)).not.toContain('Kategorie-Aufbau');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('link', { name: 'Aktualisierten Skill herunterladen' })).toHaveAttribute('href', '/brand-store-claude/amazon-storefront-design.zip');
  });
}
