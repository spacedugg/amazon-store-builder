import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const style of ['bold', 'minimal', 'lifestyle']) {
  test(`${style} generated concept imports and reaches the designer intact`, async ({ page }, info) => {
    const concept = JSON.parse(await readFile(`tests/fixtures/reference-concepts/${style}.json`, 'utf8'));
    let imported;
    await page.route('**/api/**', async route => {
      const request = route.request();
      const url = request.url();
      if (url.includes('/api/translate')) return route.fulfill({ json: { translations: request.postDataJSON().texts } });
      if (url.includes('/api/stores') && url.includes('shareToken=')) return route.fulfill({ json: { id: 'trial', shareToken: 'trial', data: imported } });
      if (url.includes('/api/timer')) return route.fulfill({ json: { seconds: 0, running: false } });
      return route.fulfill({ json: { stores: [], counts: {}, items: [] } });
    });
    await page.goto('/');
    await page.getByRole('button', { name: '+ Neuer Store', exact: true }).click();
    await page.getByLabel('Stilreferenzen auswählen', { exact: true }).check();
    const reference = concept.designReferences[0];
    await page.getByLabel('Referenz-Link 1', { exact: true }).fill(reference.url);
    await page.getByLabel('Stilhinweis 1').fill(reference.notes);
    await page.getByLabel('Briefing JSON', { exact: true }).fill(JSON.stringify(concept));
    await page.getByRole('button', { name: 'Importieren', exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('amazon-store-builder-autosave') || '{}').pages?.length)).toBe(4);
    imported = await page.evaluate(() => JSON.parse(localStorage.getItem('amazon-store-builder-autosave')));
    expect(imported.manualCI).toEqual(concept.manualCI);
    expect(imported.productCI).toEqual(concept.productCI);
    for (let p = 0; p < concept.pages.length; p++) {
      expect(imported.pages[p].heroBannerBrief).toBe(concept.pages[p].heroBannerBrief);
      for (let s = 0; s < concept.pages[p].sections.length; s++) {
        const expected = concept.pages[p].sections[s].tiles;
        for (let t = 0; t < expected.length; t++) expect(imported.pages[p].sections[s].tiles[t].brief).toBe(expected[t].brief);
      }
    }
    await page.goto('/share/trial');
    const direction = page.getByRole('region', { name: 'Design direction' });
    await expect(direction).toContainText(concept.manualCI.notes);
    await expect(direction).toContainText(concept.productCI.designerNotes);
    await expect(direction.getByRole('link').first()).toHaveAttribute('href', reference.url);
    const firstBrief = concept.pages[0].sections.flatMap(s => s.tiles).find(t => t.brief)?.brief;
    await expect(page.getByText(firstBrief, { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${style}-desktop.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(direction).toBeVisible();
    await expect(page.getByText(firstBrief, { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${style}-mobile.png`), fullPage: true });
  });
}
