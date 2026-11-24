import { openStoreBuilder, TEST_DRIVE_FOLDER } from './store-drive-fixture.mjs';
import { test, expect } from '@playwright/test';
for (const width of [1440, 390]) {
  test(`project-only style references survive import and later edits at ${width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 850 });
    let libraryWrites = 0;
    await page.route('**/api/**', route => {
      if (/reference/.test(route.request().url()) && route.request().method() !== 'GET') libraryWrites++;
      return route.fulfill({ json: { stores: [], counts: {} } });
    });
    const app = await openStoreBuilder(page, baseURL);
    await app.getByRole('button', { name: '+ Neuer Store', exact: true }).click();
    await expect(app.getByRole('button', { name: 'Stattdessen leeren Store starten' })).toBeDisabled();
    await app.getByLabel('Stilreferenzen auswählen', { exact: true }).check();
    await app.getByLabel('Referenz-Link 1', { exact: true }).fill('https://example.com/style');
    await app.getByLabel('Stilhinweis 1').fill('Warm colours and large lifestyle imagery');
    await app.getByLabel('Briefing JSON', { exact: true }).fill(JSON.stringify({ brandName: 'Style Test', pages: [{ name: 'Home', sections: [] }] }));
    await expect(app.getByRole('button', { name: 'Importieren', exact: true })).toBeDisabled();
    await app.getByLabel('Google-Drive-Kundenordner (Pflichtfeld)').fill(TEST_DRIVE_FOLDER);
    await app.getByRole('button', { name: 'Importieren', exact: true }).click();
    await app.getByRole('button', { name: 'Designrichtung (1)', exact: true }).click();
    await expect(app.getByLabel('Referenz-Link 1', { exact: true })).toHaveValue('https://example.com/style');
    await expect(app.getByLabel('Stilhinweis 1')).toHaveValue('Warm colours and large lifestyle imagery');
    await app.getByLabel('Referenz-Link 1', { exact: true }).fill('https://example.com/updated');
    await app.getByRole('button', { name: 'Übernehmen', exact: true }).click();
    await expect.poll(() => app.evaluate(() => JSON.parse(localStorage.getItem('amazon-store-builder-autosave') || '{}').designReferences?.[0]?.url)).toBe('https://example.com/updated');
    expect(libraryWrites).toBe(0);
    expect(await app.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('designer sees project direction above the work area', async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ json: route.request().url().includes('/api/stores') ? { id: 'fixture', shareToken: 'example', data: { brandName: 'Design', pages: [], products: [], asins: [], designReferences: [{ url: 'https://example.com/style', notes: 'Warm colours' }] } } : { items: [], totalSeconds: 0, running: false } }));
  await page.goto('/share/example');
  const direction = page.getByRole('region', { name: 'Design direction' });
  await expect(direction).toContainText('Warm colours');
  await expect(direction.getByRole('link')).toHaveAttribute('href', 'https://example.com/style');
  await expect(direction.getByRole('button')).toHaveCount(0);
});
