import { test, expect } from '@playwright/test';
import { newStory, newCard } from '../../src/brandStoryModel.mjs';

export function fixture() {
  const s = newStory('Markenstudio');
  s.brandFacts = 'PRIVATE_FACTS'; s.instructions = 'PRIVATE_INSTRUCTIONS';
  s.context = { audience: 'PRIVATE_AUDIENCE', products: 'Schlafmaske B012345678', destinations: 'https://www.amazon.de/stores/page/example' };
  s.background.brief = 'A calm scene with a real founder';
  for (let i = 0; i < 7; i++) {
    const c = newCard(i === 3 ? 'grid' : 'media', s.cards); c.brief = 'DESIGNER_BRIEF'; c.copy = 'Geplanter Kartentext ' + (i + 1);
    if (c.type === 'grid') { c.headline = 'Schlafmasken'; c.shopUrl = 'https://www.amazon.de/stores/page/example'; c.slots.forEach(slot => { slot.asin = 'B012345678'; }); }
    s.cards.push(c);
  }
  return s;
}
async function setup(page, mode = '') {
  const s = fixture();
  await page.route('**/api/brand-stories*', route => {
    const url = new URL(route.request().url());
    if (mode) return route.fulfill({ json: { mode, revision: 2, data: s } });
    if (url.searchParams.has('id')) return route.fulfill({ json: { id: 'saved', revision: 2, data: s } });
    return route.fulfill({ json: { stories: [{ id: 'saved', brandName: s.brandName, marketplace: 'de', cardCount: 7, mediaCount: 6, gridCount: 1, preview: { cards: [] } }] } });
  });
  if (!mode) await page.addInitScript(s => sessionStorage.setItem('brand-story-draft', JSON.stringify({ story: s, record: {} })), s);
  await page.goto('/brand-stories' + (mode ? '?token=' + mode : ''));
  return s;
}
async function resume(page) {
  const button = page.getByRole('button', { name: 'Letzten Entwurf fortsetzen' });
  if (await button.isVisible()) await button.click();
}
test('mobile shows precisely one complete card, including a four-slot grid, while background stays fixed', async ({ page }) => {
  await setup(page); await resume(page);
  await page.getByRole('button', { name: 'Mobil', exact: true }).click();
  const view = page.locator('.bs-carousel');
  const visibleCards = () => view.evaluate(el => {
    const clip = el.querySelector('.bs-card-viewport') || el;
    const r = clip.getBoundingClientRect();
    return [...el.querySelectorAll('.bs-card')].filter(c => { const a = c.getBoundingClientRect(); return a.right > r.left + 1 && a.left < r.right - 1; }).length;
  });
  await expect.poll(visibleCards).toBe(1);
  const background = await page.locator('.bs-backdrop').boundingBox();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Nächste Karten', exact: true }).click();
  await expect(page.locator('.bs-counter')).toHaveText('4 / 7');
  await expect.poll(visibleCards).toBe(1);
  expect(await page.locator('.bs-backdrop').boundingBox()).toEqual(background);
  await expect(page.locator('.bs-card').nth(3).locator('.bs-grid a')).toHaveCount(4);
  await page.screenshot({ path: 'test-results/brand-story-mobile.png', fullPage: true });
});
test('Claude import is reviewed before adoption and background descriptions remain editable', async ({ page }) => {
  const s = await setup(page);
  await page.getByRole('button', { name: 'Neue Brand Story', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Markenname', { exact: true }).fill('Markenstudio');
  await page.getByLabel('Zielgruppe', { exact: true }).fill('Erholung auf Reisen');
  await page.getByLabel('Brand Story JSON', { exact: true }).fill(JSON.stringify(s));
  await page.getByRole('button', { name: 'JSON prüfen', exact: true }).click();
  await expect(page.locator('.bs-import-review')).toContainText('7 Karten');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Konzept übernehmen', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.bs-card')).toHaveCount(7);
  await expect(page.getByLabel('Desktop-Motiv und Inhalt (English)', { exact: true })).toHaveValue(s.background.brief);
  await page.getByLabel('Mobiles Motiv und Inhalt (English)', { exact: true }).fill('Logo above the same shared cards');
  await page.getByRole('button', { name: 'Mobil', exact: true }).click();
  await expect(page.locator('.bs-backdrop')).toContainText('Logo above the same shared cards');
  await expect(page.locator('.bs-card')).toHaveCount(7);
  await page.screenshot({ path: 'test-results/brand-story-editor.png', fullPage: true });
});
test('designer receives specific element briefs, upload slots and interactive examples without internal context', async ({ page }) => {
  await setup(page, 'designer');
  await expect(page.locator('.bs-properties')).toContainText('A calm scene with a real founder');
  await expect(page.locator('body')).not.toContainText('PRIVATE_');
  await expect(page.getByRole('button', { name: 'Konzept mit Claude' })).toHaveCount(0);
  await page.getByRole('button', { name: /4\. Schlafmasken/ }).click();
  await expect(page.locator('.bs-properties')).toContainText('DESIGNER_BRIEF');
  await expect(page.locator('.bs-properties')).toContainText('1328 × 1456');
  await expect(page.locator('.bs-properties .bs-slot')).toHaveCount(4);
  await page.getByRole('button', { name: 'Beispiele ansehen', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Interaktive Brand-Story-Beispiele' })).toBeVisible();
  await expect(page.locator('.bs-reference-list .bs-carousel')).toHaveCount(6);
  await page.locator('.bs-reference-list article').first().getByRole('button', { name: 'Nächste Karten' }).click();
  await expect(page.locator('.bs-reference-list .bs-counter').first()).toHaveText('2 / 3');
});
test('customer reconstruction contains grid targets and file paths without briefings or internal context', async ({ page }) => {
  await setup(page, 'customer');
  await page.getByText('Angaben für Seller Central', { exact: true }).click();
  await expect(page.locator('.bs-delivery')).toContainText('Schlafmasken');
  await expect(page.locator('.bs-delivery')).toContainText('B012345678');
  await expect(page.locator('.bs-delivery')).toContainText('ASIN image 1a.jpg');
  await expect(page.locator('body')).not.toContainText('PRIVATE_');
  await expect(page.locator('body')).not.toContainText('DESIGNER_BRIEF');
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});
test('overview is the entry point and saved stories are large project tiles, not a dropdown', async ({ page }) => {
  await setup(page);
  await expect(page.getByRole('heading', { name: 'Deine Brand Stories' })).toBeVisible();
  await expect(page.locator('.store-home-card')).toHaveCount(1);
  await expect(page.locator('select[aria-label="Story öffnen"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Markenstudio öffnen' }).click();
  await expect(page.locator('.bs-carousel')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Alle Brand Stories' })).toBeVisible();
  for (const name of ['Anweisungen & Claude', 'JSON-Import', 'Editor']) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
});
