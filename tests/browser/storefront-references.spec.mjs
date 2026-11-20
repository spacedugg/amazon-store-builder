import { test, expect } from '@playwright/test';
for (const width of [1440, 390]) {
  test(`project-only style references survive import and later edits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    let libraryWrites = 0;
    await page.route('**/api/**', route => {
      if (/reference/.test(route.request().url()) && route.request().method() !== 'GET') libraryWrites++;
      return route.fulfill({ json: { stores: [], counts: {} } });
    });
    await page.goto('/');
    await page.getByRole('button', { name: '+ Neuer Store', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Stattdessen leeren Store starten' })).toBeDisabled();
    await page.getByLabel('Stilreferenzen auswählen', { exact: true }).check();
    await page.getByLabel('Referenz-Link 1', { exact: true }).fill('https://example.com/style');
    await page.getByLabel('Designhinweis 1 (für den Designer)').fill('Warm colours and large lifestyle imagery');
    await page.getByLabel('Briefing JSON', { exact: true }).fill(JSON.stringify({ brandName: 'Style Test', pages: [{ name: 'Home', sections: [] }] }));
    await page.getByRole('button', { name: 'Importieren', exact: true }).click();
    await page.getByRole('button', { name: 'Designrichtung (1)', exact: true }).click();
    await expect(page.getByLabel('Referenz-Link 1', { exact: true })).toHaveValue('https://example.com/style');
    await expect(page.getByLabel('Designhinweis 1 (für den Designer)')).toHaveValue('Warm colours and large lifestyle imagery');
    await page.getByLabel('Referenz-Link 1', { exact: true }).fill('https://example.com/updated');
    await page.getByRole('button', { name: 'Übernehmen', exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('amazon-store-builder-autosave') || '{}').designReferences?.[0]?.url)).toBe('https://example.com/updated');
    expect(libraryWrites).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
