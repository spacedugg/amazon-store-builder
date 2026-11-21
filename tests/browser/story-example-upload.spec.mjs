import { test, expect } from '@playwright/test';
import { newStory, newCard } from '../../src/brandStoryModel.mjs';
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=', 'base64');
async function setup(page, designer = false) {
  let examples = [];
  let failSaveOnce = true;
  await page.route('**/api/brand-story-examples', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { examples } });
    if (failSaveOnce) { failSaveOnce = false; return route.fulfill({ status: 503, json: { error: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' } }); }
    const input = route.request().postDataJSON();
    const record = { ...input, id: 'custom-example', revision: (input.revision || 0) + 1 };
    examples = [record];
    return route.fulfill({ json: { id: record.id, revision: record.revision } });
  });
  const data = newStory('Designer-Projekt'); data.cards = [newCard('media')];
  await page.route('**/api/brand-stories*', route => route.fulfill({ json: designer ? { mode: 'designer', data, revision: 1 } : { stories: [] } }));
  await page.route('**/api/blob-upload', route => route.fulfill({ json: { clientToken: 'vercel_blob_client_test_token' } }));
  await page.route('https://vercel.com/api/blob/**', route => route.fulfill({ json: { url: 'https://example.com/upload.png', pathname: 'upload.png', contentType: 'image/png', contentDisposition: 'inline', downloadUrl: 'https://example.com/upload.png' } }));
  await page.route('https://example.com/upload.png', route => route.fulfill({ contentType: 'image/png', body: pixel }));
  await page.goto('/brand-stories' + (designer ? '?token=designer' : ''));
  await page.getByRole('button', { name: designer ? 'Brand-Story-Beispiele ansehen' : 'Beispiele', exact: !designer }).click();
  return () => examples;
}
async function uploadAsset(scope, label) {
  await scope.locator('.bs-example-upload').filter({ has: scope.page().getByText(label, { exact: true }) }).locator('input[type=file]').setInputFiles({ name: 'reference.png', mimeType: 'image/png', buffer: pixel });
}
test('upload, preview, reorder and persist a custom story, then edit after reopening', async ({ page }) => {
  const records = await setup(page);
  await page.getByRole('button', { name: '+ Beispiel hinzufügen', exact: true }).click();
  await page.getByLabel('Marke', { exact: true }).fill('Eigene Beispielmarke');
  await page.getByRole('button', { name: 'Beispiel speichern', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Desktop-Hintergrund fehlt.');
  const editor = page.locator('.bs-example-editor');
  await uploadAsset(editor, 'Desktop-Hintergrund');
  await expect(editor.locator('.bs-example-backgrounds img')).toHaveCount(1);
  await uploadAsset(editor, 'Mobil-Hintergrund (optional)');
  await expect(editor.locator('.bs-example-backgrounds img')).toHaveCount(2);
  await page.getByRole('button', { name: '+ Brand Media Asset', exact: true }).click();
  await uploadAsset(page.getByRole('region', { name: 'Beispielkarte 1', exact: true }), 'Full-Image-Datei');
  await expect(editor.locator('.bs-example-card img')).toHaveCount(1);
  await page.getByRole('button', { name: '+ ASIN-Grid', exact: true }).click();
  const grid = page.getByRole('region', { name: 'Beispielkarte 2', exact: true });
  await grid.getByLabel('Grid-Überschrift').fill('Entdecke die Vielfalt');
  for (const [i, label] of ['Oben links', 'Oben rechts', 'Unten links', 'Unten rechts'].entries()) {
    await uploadAsset(grid, label);
    await expect(grid.locator('.bs-example-grid img')).toHaveCount(i + 1);
  }
  await page.getByRole('button', { name: 'Karte 2 nach vorne', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Beispielkarte 1', exact: true }).getByLabel('Grid-Überschrift')).toHaveValue('Entdecke die Vielfalt');
  await editor.getByRole('button', { name: 'Mobil-Beispiel', exact: true }).click();
  await expect(editor.locator('.bs-carousel')).toHaveClass(/bs-mobile/);
  await page.getByRole('button', { name: 'Beispiel speichern', exact: true }).click();
  await expect(editor.getByRole('alert').filter({ hasText: 'Speichern fehlgeschlagen.' })).toHaveText('Speichern fehlgeschlagen. Bitte erneut versuchen.');
  await expect(page.getByLabel('Marke', { exact: true })).toHaveValue('Eigene Beispielmarke');
  await expect(editor.locator('.bs-example-card img')).toHaveCount(5);
  await page.getByRole('button', { name: 'Beispiel speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Beispiel gespeichert');
  expect(records()[0].data.cards[0].type).toBe('grid');
  expect(records()[0].data.cards[0].slots).toHaveLength(4);
  await page.getByRole('button', { name: 'Dialog schließen', exact: true }).click();
  await page.getByRole('button', { name: 'Beispiele', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Eigene Beispielmarke', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Beispiel bearbeiten', exact: true }).click();
  await expect(page.getByLabel('Marke', { exact: true })).toHaveValue('Eigene Beispielmarke');
  await expect(page.locator('.bs-example-card')).toHaveCount(2);
});
test('designer example library remains read-only', async ({ page }) => {
  await setup(page, true);
  await expect(page.locator('.bs-reference-list article')).toHaveCount(7);
  await expect(page.getByRole('button', { name: '+ Beispiel hinzufügen', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Beispiel bearbeiten', exact: true })).toHaveCount(0);
});

test('HOLY ZIP is available from overview and imports exact artwork assignments and product links without AI', async ({page})=>{
  const {zipSync,strToU8}=await import('fflate');
  const {readFileSync}=await import('node:fs');
  const manifest=JSON.parse(readFileSync(new URL('../fixtures/holy-brand-story-manifest.json',import.meta.url)));
  const files={'HOLY/brand-story.json':strToU8(JSON.stringify(manifest))};
  for(const file of [manifest.background.desktop,...manifest.cards.flatMap(c=>c.type==='media'?[c.file]:c.slots.map(s=>s.file))])files['HOLY/'+file]=pixel;
  const records=await setup(page);let visionRequests=0;
  await page.route('**/api/brand-story-zip-analysis',route=>{visionRequests++;return route.fulfill({status:500,json:{error:'Must not request AI for explicit metadata'}});});
  await expect(page.getByRole('button',{name:'Brand-Story-ZIP hochladen',exact:true})).toBeVisible();
  await page.getByLabel('Brand-Story-ZIP',{exact:true}).setInputFiles({name:'HOLY.zip',mimeType:'application/zip',buffer:Buffer.from(zipSync(files))});
  const editor=page.locator('.bs-example-editor');await expect(editor).toBeVisible({timeout:30000});
  await expect(page.getByLabel('Marke',{exact:true})).toHaveValue('HOLY');
  await expect(editor.locator('.bs-example-card')).toHaveCount(8);
  expect(visionRequests).toBe(0);
  await page.getByRole('button',{name:'Beispiel speichern',exact:true}).click();
  await expect(editor.getByRole('alert').filter({hasText:'Speichern fehlgeschlagen'})).toContainText('Speichern fehlgeschlagen');
  await page.getByRole('button',{name:'Beispiel speichern',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Beispiel gespeichert');
  const saved=records()[0].data;
  expect(saved.cards.filter(c=>c.type==='grid').map(c=>c.headline)).toEqual(manifest.cards.filter(c=>c.type==='grid').map(c=>c.headline));
  expect(saved.cards.flatMap(c=>c.slots.map(s=>s.asin))).toEqual(manifest.cards.flatMap(c=>(c.slots||[]).map(s=>s.asin)));
  expect(saved.cards[2].shopUrl).toBe(manifest.cards[2].shopUrl);
});
