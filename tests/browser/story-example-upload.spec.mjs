import { test, expect } from '@playwright/test';
import { newStory, newCard } from '../../src/brandStoryModel.mjs';
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=', 'base64');
async function setup(page, designer = false, failFirstSave = true) {
  let examples = [];
  let failSaveOnce = failFirstSave;
  await page.route('**/api/brand-story-examples', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { examples } });
    if (failSaveOnce) { failSaveOnce = false; return route.fulfill({ status: 503, json: { error: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' } }); }
    const input = route.request().postDataJSON();
    const record = { ...input, id: input.createId || 'custom-example', revision: (input.revision || 0) + 1 };
    examples = [record,...examples.filter(item=>item.id!==record.id)];
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
  await expect(page.getByRole('alert').filter({hasText:'Speichern fehlgeschlagen'})).toContainText('Speichern fehlgeschlagen');
  await expect(page.getByRole('status').filter({hasText:'noch nicht gespeichert'})).toBeVisible();
  await page.getByRole('button',{name:'Beispiel speichern',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Beispiel gespeichert');
  const saved=records()[0].data;
  expect(saved.cards.filter(c=>c.type==='grid').map(c=>c.headline)).toEqual(manifest.cards.filter(c=>c.type==='grid').map(c=>c.headline));
  expect(saved.cards.flatMap(c=>c.slots.map(s=>s.asin))).toEqual(manifest.cards.flatMap(c=>(c.slots||[]).map(s=>s.asin)));
  expect(saved.cards[2].shopUrl).toBe(manifest.cards[2].shopUrl);
});

test('valid ZIP shows saving feedback, saves automatically and is present after reloading',async({page})=>{
 const {zipSync,strToU8}=await import('fflate');
 const manifest={format:'temoa-brand-story-example',version:1,brandName:'Automatisch gespeichert',background:{desktop:'Background/desktop.png'},cards:[{type:'media',file:'Brand Media Assets/media asset image 1.png'}]};
 const bytes=Buffer.from(zipSync({'brand-story.json':strToU8(JSON.stringify(manifest)),'Background/desktop.png':pixel,'Brand Media Assets/media asset image 1.png':pixel}));
 const records=await setup(page,false,false);
 let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/api/brand-story-examples',async route=>{if(route.request().method()==='POST')await gate;return route.fallback();});
 await page.getByLabel('Brand-Story-ZIP',{exact:true}).setInputFiles({name:'example.zip',mimeType:'application/zip',buffer:bytes});
 await expect(page.getByRole('status').filter({hasText:'Beispiel wird gespeichert'})).toBeVisible();
 expect(records()).toHaveLength(0);
 release();
 await expect(page.getByRole('status').filter({hasText:'hochgeladen und gespeichert'})).toBeVisible();
 expect(records()).toHaveLength(1);
 await expect(page.locator('.bs-example-editor')).toHaveCount(0);
 await page.reload();await page.getByRole('button',{name:'Beispiele',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Automatisch gespeichert',exact:true})).toBeVisible();
});

test('the original nested HOLY extraction ZIP imports, saves and survives reload',async({page})=>{
 test.setTimeout(90000);
 const {readFileSync}=await import('node:fs');
 const {zipSync,strToU8}=await import('fflate');
 const original=JSON.parse(readFileSync(new URL('../fixtures/holy-brand-story-extracted.json',import.meta.url)));
 const files={'HOLY-Brand-Story/Brand-Story.json':strToU8(JSON.stringify(original))};
 for(const file of [original.backgroundDesktop.file,...original.cards.flatMap(c=>c.type==='brand_media_asset'?[c.image.file]:c.slots.map(s=>s.image.file))])files['HOLY-Brand-Story/'+file]=pixel;
 const buffer=process.env.HOLY_TEST_ZIP?readFileSync(process.env.HOLY_TEST_ZIP):Buffer.from(zipSync(files));
 const records=await setup(page,false,false);let analysisRequests=0;
 await page.route('**/api/brand-story-zip-analysis',route=>{analysisRequests++;return route.fulfill({status:500,json:{error:'Metadata must not need AI'}});});
 await page.getByLabel('Brand-Story-ZIP',{exact:true}).setInputFiles({name:'HOLY-Brand-Story(1).zip',mimeType:'application/zip',buffer});
 await expect(page.getByRole('status').filter({hasText:'hochgeladen und gespeichert'})).toBeVisible({timeout:60000});
 expect(analysisRequests).toBe(0);expect(records()).toHaveLength(1);
 const saved=records()[0].data;
 expect(saved.cards).toHaveLength(8);
 expect(saved.cards[0].assetFile).toBe('HOLY-Brand-Story/Brand Media Assets/Brand Image 0.png');
 expect(saved.cards.filter(c=>c.type==='grid').map(c=>c.headline)).toEqual(original.cards.filter(c=>c.type==='asin_grid').map(c=>c.headline));
 expect(saved.cards.flatMap(c=>c.slots.map(s=>s.asin))).toEqual(original.cards.flatMap(c=>(c.slots||[]).map(s=>s.asin)));
 expect(saved.cards[2].slots[0].url).toBe(original.cards[2].slots[0].productUrl);
 if(process.env.HOLY_TEST_ZIP){expect(saved.background.desktop.width).toBe(1464);expect(saved.cards[0].image.width).toBe(1448);}
 await page.reload();await page.getByRole('button',{name:'Beispiele',exact:true}).click();
 await expect(page.locator('.bs-reference-list').getByRole('heading',{name:'HOLY',exact:true})).toBeVisible();
});

test('a three-story collection imports with one upload and resumes a partial save without duplicating examples',async({page})=>{
 test.setTimeout(120000);
 const {zipSync,strToU8}=await import('fflate');const {readFileSync}=await import('node:fs');
 const brands=process.env.STORY_COLLECTION_ZIP?['hellotaste','SNOCKS','rainfactory']:['First','Second','Third'];
 const nested={};
 for(const brand of brands){const manifest={format:'temoa-brand-story-example',version:1,brandName:brand,background:{desktop:'Background/desktop.png'},cards:[{type:'media',file:'Brand Media Assets/card.png'}]};nested[brand+'.zip']=zipSync({'brand-story.json':strToU8(JSON.stringify(manifest)),'Background/desktop.png':pixel,'Brand Media Assets/card.png':pixel});}
 const buffer=process.env.STORY_COLLECTION_ZIP?readFileSync(process.env.STORY_COLLECTION_ZIP):Buffer.from(zipSync(nested));
 const records=await setup(page,false,false);let calls=0;
 await page.route('**/api/brand-story-examples',async route=>{if(route.request().method()==='POST'&&++calls===2)return route.fulfill({status:503,json:{error:'Temporärer Speicherfehler'}});return route.fallback();});
 await page.getByLabel('Brand-Story-ZIP',{exact:true}).setInputFiles({name:'Brand-Story-Beispiele.zip',mimeType:'application/zip',buffer});
 await expect(page.getByRole('button',{name:'Import fortsetzen',exact:true})).toBeVisible({timeout:90000});
 expect(records()).toHaveLength(1);
 await page.getByRole('button',{name:'Import fortsetzen',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'hochgeladen und gespeichert'})).toBeVisible();
 expect(records()).toHaveLength(3);expect(new Set(records().map(row=>row.id)).size).toBe(3);
 expect(records().map(row=>row.data.brandName).sort()).toEqual([...brands].sort());
 if(process.env.STORY_COLLECTION_ZIP){expect(records().map(row=>row.data.cards.length).sort((a,b)=>a-b)).toEqual([7,9,10]);expect(records().flatMap(row=>row.data.cards.flatMap(card=>card.slots.map(slot=>slot.asin)))).toHaveLength(28);}
 await page.reload();await page.getByRole('button',{name:'Beispiele',exact:true}).click();
 for(const brand of brands)await expect(page.locator('.bs-reference-list').getByRole('heading',{name:brand,exact:true})).toBeVisible();
});
