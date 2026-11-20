import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`internal catalogue previews and multi-selection feed the concept at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.__referencePrompt = value; } } }));
    await page.route('**/api/feedback?counts=1', route => route.fulfill({ json: { counts: {} } }));
    await page.route('**/api/reference-stores', route => route.fulfill({ json: { stores: [] } }));
    await page.route('**/api/stores', route => route.fulfill({ json: { stores: [] } }));
    await page.goto('/');
    await page.getByRole('button', { name: 'Store-Beispiele', exact: true }).click();
    const library = page.getByRole('dialog', { name: 'Brand-Store-Beispiele', exact: true });
    await expect(library).toBeVisible();
    await library.screenshot({ path: test.info().outputPath('store-library-' + width + '.png') });
    await library.getByLabel('Beispiele suchen', { exact: true }).fill('MasterChef');
    await library.getByRole('button', { name: 'Beispiel ansehen: MasterChef', exact: true }).click();
    await expect(library).toContainText('kein aktueller Screenshot');
    await library.getByText('Ergänzendes Archiv: Motive und aufgezeichneter Aufbau', { exact: true }).click();
    await expect.poll(() => library.locator('figure img').first().evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await library.getByRole('button', { name: '← Alle Beispiele', exact: true }).click();
    await library.getByLabel('Beispiele suchen', { exact: true }).fill('Einhell');
    await library.getByLabel('Als Referenz wählen: Einhell', { exact: true }).check();
    await library.getByLabel('Beispiele suchen', { exact: true }).fill('HSHOP');
    await expect(library.locator('.srl-card')).toHaveCount(1);
    await library.getByLabel('Als Referenz wählen: HSHOP-SPORT', { exact: true }).check();
    await library.getByRole('button', { name: 'Auswahl übernehmen', exact: true }).click();
    await expect(library).toBeHidden();
    await expect(page.getByLabel('Amazon-Store-Link 1', { exact: true })).toHaveValue(/C36736E3/);
    await expect(page.getByLabel('Amazon-Store-Link 2', { exact: true })).toHaveValue(/8B640FD7/);
    await page.getByRole('button', { name: 'Prompt kopieren', exact: true }).click();
    const copied = await page.evaluate(() => window.__referencePrompt);
    expect(copied).toContain('C36736E3-EDE2-46C1-812C-9030BDA1EEEB');
    expect(copied).toContain('8B640FD7-98E9-4C48-9BF0-422ED3F14A3A');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Aus Beispielen auswählen', exact: true }).click();
    await library.getByLabel('Beispiele suchen', { exact: true }).fill('B0CLDWHKCB');
    await expect(library.getByRole('checkbox')).toHaveCount(0);
    await expect(library).toContainText('Store-Zuordnung offen');
    await page.keyboard.press('Escape');
    await expect(library).toBeHidden();
  });
}

test('designer share links expose the same catalogue without editing controls; API failures preserve built-ins', async ({ page }) => {
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/reference-stores') return route.fulfill({ status: 503, json: { error: 'offline' } });
    if (url.pathname === '/api/stores') return route.fulfill({ json: { id: 'fixture', shareToken: 'example', data: { brandName: 'Designer Test', pages: [{ id: 'p', name: 'Home', sections: [] }], products: [], asins: [] } } });
    return route.fulfill({ json: { items: [], totalSeconds: 0, running: false } });
  });
  await page.goto('/share/example');
  await page.getByRole('button', { name: 'Store examples', exact: true }).click();
  const library = page.getByRole('dialog', { name: 'Brand Store examples', exact: true });
  await expect(library).toContainText('shared catalogue remains available');
  await library.getByLabel('Search examples', { exact: true }).fill('felmo');
  await expect(library.locator('.srl-card')).toHaveCount(1);
  await expect(library.getByRole('checkbox')).toHaveCount(0);
  await library.getByRole('button', { name: 'View example: felmo', exact: true }).click();
  await expect(library.getByRole('link', { name: 'Open Amazon Store ↗' })).toHaveAttribute('href', /77AE223F/);
});
