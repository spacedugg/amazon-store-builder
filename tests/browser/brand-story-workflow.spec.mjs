import { test, expect } from '@playwright/test';
import { newStory, newCard } from '../../src/brandStoryModel.mjs';
import { readFile } from 'node:fs/promises';

export function fixture() {
  const s = newStory('Markenstudio');
  s.brandFacts = 'PRIVATE_FACTS'; s.instructions = 'PRIVATE_INSTRUCTIONS';
  s.context = { audience: 'PRIVATE_AUDIENCE', products: 'Schlafmaske B012345678', destinations: 'https://www.amazon.de/stores/page/example' };
  s.background.brief = 'A calm scene with a real founder';
  for (let i = 0; i < 7; i++) {
    const c = newCard(i === 3 ? 'grid' : 'media', s.cards); c.brief = 'DESIGNER_BRIEF'; c.copy = 'Geplanter Kartentext ' + (i + 1);
    if (c.type === 'grid') { c.gridMode = 'composite'; c.headline = 'Schlafmasken'; c.shopUrl = 'https://www.amazon.de/stores/page/example'; c.slots.forEach(slot => { slot.asin = 'B012345678'; }); }
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
  await expect(page.locator('.bs-card').nth(3).locator('.bs-grid button')).toHaveCount(4);
  const cardBox = await page.locator('.bs-card').nth(3).boundingBox();
  const gridBox = await page.locator('.bs-card').nth(3).locator('.bs-grid').boundingBox();
  const footerBox = await page.locator('.bs-card').nth(3).locator('.bs-grid-footer').boundingBox();
  expect(gridBox.width / cardBox.width).toBeGreaterThan(.9);
  expect(footerBox.y).toBeGreaterThanOrEqual(gridBox.y + gridBox.height - 1);
  await page.screenshot({ path: 'test-results/brand-story-mobile.png', fullPage: true });
});
test('Claude import is reviewed before adoption and background descriptions remain editable', async ({ page }) => {
  const s = await setup(page);
  await page.getByRole('button', { name: 'Neue Brand Story', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Vorhandenes JSON importieren', exact: true }).click();
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
  await page.getByLabel('Karte 4 bearbeiten', {exact:true}).click();
  await expect(page.locator('.bs-properties')).toContainText('DESIGNER_BRIEF');
  await expect(page.locator('.bs-properties')).toContainText('1328 × 1456');
  await expect(page.locator('.bs-properties .bs-slot')).toHaveCount(4);
  await page.getByRole('button', { name: 'Brand-Story-Beispiele ansehen ↗', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Interaktive Brand-Story-Beispiele' })).toBeVisible();
  await expect(page.locator('.bs-reference-list .bs-carousel')).toHaveCount(7);
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
test('OmniRelexx reproduces the four delivered desktop states with the scrolling logo and final background reveal', async ({ page }) => {
  const data = JSON.parse(await readFile('public/brand-story-examples/stories.json', 'utf8'));
  const story = data.stories.find(s => s.brandName === 'OmniRelexx');
  await page.route('**/api/brand-stories*', r => r.fulfill({ json: { mode: 'customer', data: story } }));
  await page.goto('/brand-stories?token=omni-reference');
  const carousel = page.locator('.bs-carousel');
  await expect(carousel).toBeVisible();
  await expect.poll(() => carousel.locator('img').evaluateAll(images => images.every(im => im.complete && im.naturalWidth > 0)), { timeout: 30000 }).toBe(true);
  for (let step = 0; step < 4; step++) {
    await expect(page.locator('.bs-counter')).toHaveText(`${step + 1} / 4`);
    const firstIndex = [0, 2, 5, 8][step];
    await expect.poll(() => carousel.evaluate((el, index) => {
      const outer = el.getBoundingClientRect(), card = el.querySelectorAll('.bs-card')[index].getBoundingClientRect();
      return Math.round(100 * (card.left - outer.left) / outer.width);
    }, firstIndex)).toBe(step === 0 ? 32 : 5);
    await carousel.screenshot({ path: `test-results/omni-preview-0${step + 1}.png` });
    if (step < 3) await page.getByRole('button', { name: 'Nächste Karten', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Nächste Karten', exact: true })).toBeHidden();
});
test('renaming context before importing another brand creates a new record instead of replacing the saved project', async ({ page }) => {
  await setup(page);
  const posts = [];
  await page.route('**/api/brand-stories*', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const payload = route.request().postDataJSON(); posts.push(payload);
    return route.fulfill({ json: { id: 'new-project', revision: posts.length } });
  });
  await page.getByRole('button', { name: 'Markenstudio öffnen' }).click();
  await page.getByRole('button', { name: 'Konzept mit Claude', exact: true }).click();
  await page.getByRole('button', { name: '← Marke und Auswahl bearbeiten', exact: true }).click();
  await page.getByRole('button',{name:'Manuell starten',exact:true}).click();
  await page.getByLabel('Markenname', { exact: true }).fill('Andere Marke');
  await page.getByRole('button', { name: 'Vorhandenes JSON importieren', exact: true }).click();
  const incoming = fixture(); incoming.brandName = 'Andere Marke';
  await page.getByLabel('Brand Story JSON', { exact: true }).fill(JSON.stringify(incoming));
  await page.getByRole('button', { name: 'JSON prüfen', exact: true }).click();
  await expect(page.locator('.bs-import-review')).toContainText('als neue Brand Story');
  await page.getByRole('button', { name: 'Konzept übernehmen', exact: true }).click();
  await page.getByRole('button', { name: 'Änderungen speichern', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeEnabled();
  expect(posts[0].id).toBeUndefined();
  expect(posts.every(p => p.id !== 'saved')).toBe(true);
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

test('Store-first discovery reviews categories, recovers a failed page, and copies only the skill invocation and project', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await setup(page);
  const storeUrl='https://www.amazon.de/stores/Markenstudio';
  const one=storeUrl+'/page/11111111-1111-1111-1111-111111111111';
  const two=storeUrl+'/page/22222222-2222-2222-2222-222222222222';
  let retry=false;
  await page.route('**/api/brand-story-discover',route=>{
    const input=route.request().postDataJSON();
    if(!input.pageUrl) return route.fulfill({json:{storeUrl,brandName:'Markenstudio',marketplace:'de',warnings:[],pages:[
      {url:storeUrl,name:'Startseite',asins:[],status:'loaded'},
      {url:one,name:'Tapeten',asins:[],status:'pending'},
      {url:two,name:'Teppiche',asins:[],status:'pending'},
    ]}});
    const fail=input.pageUrl===two&&!retry; if(input.pageUrl===two)retry=true;
    return route.fulfill({json:{storeUrl,marketplace:'de',warnings:[],pages:[{url:input.pageUrl,name:input.pageUrl===one?'Tapeten':'Teppiche',asins:fail?[]:['B012345678','B000000001','B000000002','B000000003'],status:fail?'error':'loaded',error:fail?'Seite vorübergehend blockiert':''}]}});
  });
  await page.getByRole('button',{name:'Neue Brand Story',exact:true}).first().click();
  await expect(page.getByLabel('Zielgruppe',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:/Skill herunterladen/})).toHaveCount(0);
  await expect(page.getByLabel('Markenname',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Wichtige Produkte (optional)',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Weiter zu Claude',exact:true})).toBeDisabled();
  await page.getByLabel('Amazon Brand Store-Link',{exact:true}).fill(storeUrl);
  await page.getByRole('button',{name:'Store auslesen',exact:true}).click();
  await expect(page.getByLabel('Markenname',{exact:true})).toHaveValue('Markenstudio');
  await expect(page.getByText('Wichtige Produkte (optional)',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Unternehmenswebsite für Claude',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Tapeten aufnehmen',{exact:true})).toBeChecked();
  await expect(page.getByLabel('Startseite aufnehmen',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Produkt-ASINs Tapeten',{exact:true})).toHaveValue('B012345678, B000000001, B000000002, B000000003');
  await expect(page.getByRole('status')).toContainText('1 Unterseiten');
  await page.locator('.bs-category-row').filter({has:page.getByLabel('Teppiche aufnehmen',{exact:true})}).getByRole('button',{name:'Produkte lesen / erneut versuchen',exact:true}).click();
  await expect(page.getByLabel('Produkt-ASINs Teppiche',{exact:true})).toHaveValue('B012345678, B000000001, B000000002, B000000003');
  await expect(page.getByLabel('Schwerpunkt der Story',{exact:true})).toHaveCount(0);
  await page.screenshot({path:'test-results/brand-story-store-first.png',fullPage:true});
  await page.getByRole('button',{name:'Weiter zu Claude',exact:true}).click();
  await page.getByRole('button',{name:'Auftrag für Claude kopieren',exact:true}).click();
  const prompt=await page.evaluate(()=>navigator.clipboard.readText());
  expect(prompt).toContain('Amazon Brand Story'); expect(prompt).toContain(one); expect(prompt).toContain('B012345678');
  expect(prompt).not.toContain('$schema');
  const data=JSON.parse(prompt.slice(prompt.indexOf('{')));
  expect(data.planning.goal).toBe(''); expect(data.planning.focusProducts).toHaveLength(0);
  expect(data.planning.categories.find(c=>c.name==='Tapeten').asins).toHaveLength(4);
  await page.getByRole('button',{name:'← Marke und Auswahl bearbeiten',exact:true}).click();
  await expect(page.getByRole('button',{name:'Kategorie-Grids als Layout öffnen',exact:true})).toHaveCount(0);
  await expect(page.locator('.bs-card')).toHaveCount(0);
});

test('manual route opens an empty shared preview without installation controls', async ({ page }) => {
  await setup(page);
  await expect(page.getByRole('button',{name:'Claude einmalig einrichten',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Neue Brand Story',exact:true}).first().click();
  await page.getByRole('button',{name:'Manuell starten',exact:true}).click();
  await page.getByLabel('Markenname',{exact:true}).fill('Manuelle Marke');
  await page.getByRole('button',{name:'Story öffnen',exact:true}).click();
  await expect(page.locator('.bs-carousel')).toBeVisible();
  await expect(page.locator('.bs-card')).toHaveCount(0);
  await page.getByRole('button',{name:'Karte hinzufügen',exact:true}).first().click();
  await page.getByRole('button',{name:'Brand Media Asset',exact:true}).click();
  await page.getByRole('button',{name:'Mobil',exact:true}).click();
  await expect(page.locator('.bs-card')).toHaveCount(1);
  await page.screenshot({path:'test-results/brand-story-manual.png',fullPage:true});
});

test('overview examples show all stories as full-width interactive rows without loading a project', async ({page})=>{
  await setup(page);
  await page.getByRole('button',{name:'Beispiele',exact:true}).click();
  const articles=page.locator('.bs-reference-list article');
  await expect(articles).toHaveCount(7);
  const first=await articles.nth(0).boundingBox(), second=await articles.nth(1).boundingBox();
  expect(second.y).toBeGreaterThan(first.y+first.height);
  await articles.first().getByRole('button',{name:'Nächste Karten',exact:true}).click();
  await expect(articles.first().locator('.bs-counter')).toHaveText('2 / 3');
  await page.screenshot({path:'test-results/brand-story-examples.png',fullPage:true});
});

test('failed Store authentication keeps later steps hidden; retry detects brand and changing the URL locks the next step',async({page})=>{
 await setup(page);let fail=true;
 const storeUrl='https://www.amazon.de/stores/Markenstudio';
 await page.route('**/api/brand-story-discover',route=>fail?route.fulfill({status:503,json:{errorCode:'CRAWLER_AUTH',warnings:['Bright Data lehnt den Zugangsschlüssel ab.'],pages:[]}}):route.fulfill({json:{storeUrl,brandName:'Markenstudio',marketplace:'de',warnings:[],pages:[{url:storeUrl,name:'Startseite',status:'loaded',asins:[]}]}}));
 await page.getByRole('button',{name:'Neue Brand Story',exact:true}).first().click();
 await expect(page.getByLabel('Markenname',{exact:true})).toHaveCount(0);
 await page.getByLabel('Amazon Brand Store-Link',{exact:true}).fill(storeUrl);
 await page.getByRole('button',{name:'Store auslesen',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Zugangsschlüssel');
 await expect(page.getByLabel('Markenname',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Wichtige Produkte (optional)',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Weiter zu Claude',exact:true})).toBeDisabled();
 fail=false;await page.getByRole('button',{name:'Store auslesen',exact:true}).click();
 await expect(page.getByLabel('Markenname',{exact:true})).toHaveValue('Markenstudio');
 await expect(page.getByRole('button',{name:'Weiter zu Claude',exact:true})).toBeEnabled();
 await page.getByText('Wichtige Produkte (optional)',{exact:true}).click();
 await page.getByLabel('Fokus-ASIN',{exact:true}).fill('B012345678');await page.getByRole('button',{name:'Produkt aufnehmen',exact:true}).click();
 await expect(page.getByLabel('Auswahlgrund B012345678',{exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/brand-story-ordered-store.png',fullPage:true});
 await page.getByLabel('Amazon Brand Store-Link',{exact:true}).fill('https://www.amazon.de/stores/Other');
 await expect(page.getByLabel('Markenname',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Weiter zu Claude',exact:true})).toBeDisabled();
});

test('commerce-only category choices explain optional inputs with real examples and hand off to Claude',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await setup(page);
 const root='https://www.amazon.de/stores/Brand/page/11111111-1111-1111-1111-111111111111';
 const names=['Über uns','Produktberater','Quiz','Schlaf','Gelenke und Sport','Körper und Balance','Bestseller','Sale'];
 await page.route('**/api/brand-story-discover',r=>r.fulfill({json:{storeUrl:root,brandName:'Brand',marketplace:'de',warnings:[],pages:[{url:root,name:'Homepage',status:'loaded',asins:[]},...names.map((name,i)=>({name,url:`https://www.amazon.de/stores/Brand/page/abc-${i}`,status:'pending',asins:[]}))]}}));
 await page.getByRole('button',{name:'Neue Brand Story',exact:true}).first().click();await page.getByLabel('Amazon Brand Store-Link',{exact:true}).fill(root);await page.getByRole('button',{name:'Store auslesen',exact:true}).click();
 for(const name of ['Homepage','Über uns','Produktberater','Quiz'])await expect(page.getByLabel(name+' aufnehmen',{exact:true})).toHaveCount(0);
 for(const name of names.slice(3))await expect(page.getByLabel(name+' aufnehmen',{exact:true})).toBeChecked();
 await page.getByText('Wichtige Produkte (optional)',{exact:true}).click();
 const focus=page.getByLabel('Beispiele für Produktfokus',{exact:true});await expect(focus.locator('img')).toHaveCount(5);
 await expect.poll(()=>focus.locator('img').evaluateAll(imgs=>imgs.every(im=>im.complete&&im.naturalWidth>0))).toBe(true);
 await focus.screenshot({path:'test-results/brand-story-product-focus-examples.png'});
 await page.getByLabel('Fokus-ASIN',{exact:true}).fill('B012345678');await page.getByRole('button',{name:'Produkt aufnehmen',exact:true}).click();
 await page.getByLabel('Auswahlgrund B012345678',{exact:true}).selectOption('bestseller');
 await page.getByLabel('Produktauftrag B012345678',{exact:true}).fill('Als Geschenk zeigen und früh platzieren.');
 await page.getByLabel('Unternehmenswebsite für Claude',{exact:true}).fill('https://www.marke.de');
 await page.getByRole('button',{name:'Weiter zu Claude',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Auftrag in Claude öffnen',exact:true})).toBeVisible();
 await expect.poll(()=>page.locator('.bs-modal').evaluate(el=>el.scrollTop)).toBe(0);
 await expect(page.getByRole('link',{name:'Claude Cowork öffnen (Desktop) ↗',exact:true})).toHaveAttribute('href','claude://cowork/new');
 await expect(page.getByRole('link',{name:'Claude im Browser öffnen ↗',exact:true})).toHaveAttribute('href','https://claude.ai/new');
 await expect(page.getByRole('link',{name:'Claude im Browser öffnen ↗',exact:true})).toHaveAttribute('target','_blank');
 await page.getByRole('button',{name:'Auftrag für Claude kopieren',exact:true}).click();const prompt=await page.evaluate(()=>navigator.clipboard.readText());const data=JSON.parse(prompt.slice(prompt.indexOf('{')));
 expect(data.planning.categories.map(c=>c.name)).toEqual(names.slice(3));expect(data.planning.focusProducts[0].asin).toBe('B012345678');expect(data.planning.websiteUrl).toBe('https://www.marke.de/');expect(data.planning.focusProducts[0].note).toContain('Als Geschenk');
 expect(prompt).toContain('A) Einstiegskarten');expect(prompt).toContain('nie Homepage');
 await page.screenshot({path:'test-results/brand-story-claude-handoff.png',fullPage:true});
});

test('new automatic handoff gives inline copy feedback and only browser-first launch actions',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await setup(page);
 await page.getByRole('button',{name:'Neue Brand Story',exact:true}).first().click();
 await page.getByRole('button',{name:'Vorhandenes JSON importieren',exact:true}).click();
 await expect(page.getByRole('button',{name:'Projektstand als JSON sichern',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Vorschau ohne JSON öffnen',exact:true})).toHaveCount(0);
 const links=page.locator('.bs-claude-actions a');await expect(links.nth(0)).toHaveAttribute('href','https://claude.ai/new');await expect(links.nth(1)).toHaveAttribute('href','claude://cowork/new');
 await page.getByRole('button',{name:'← Marke und Auswahl bearbeiten',exact:true}).click();await page.getByRole('button',{name:'Manuell starten',exact:true}).click();await page.getByLabel('Markenname',{exact:true}).fill('Marke');await page.getByRole('button',{name:'Vorhandenes JSON importieren',exact:true}).click();
 const copy=page.getByRole('button',{name:'Auftrag für Claude kopieren',exact:true});await copy.click();await expect(copy).toHaveText('✓ Auftrag kopiert');await expect(copy).toBeDisabled();await expect(page.locator('.bs-copy-status')).toBeVisible();await expect(copy).toBeEnabled({timeout:4000});
});
test('blocked clipboard exposes the selected prompt without claiming success',async({page})=>{
 await setup(page);await resume(page);await page.getByRole('button',{name:'Konzept mit Claude',exact:true}).click();
 await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}});document.execCommand=()=>false;});
 await page.getByRole('button',{name:'Auftrag für Claude kopieren',exact:true}).click();const manual=page.getByLabel('Auftrag manuell kopieren',{exact:true});await expect(manual).toBeVisible();await expect(manual).toBeFocused();await expect(page.locator('.bs-copy-status')).toContainText('gesperrt');
 expect(await manual.evaluate(el=>el.selectionStart===0&&el.selectionEnd===el.value.length)).toBe(true);await expect(page.getByRole('button',{name:'Auftrag für Claude kopieren',exact:true})).not.toHaveText('✓ Auftrag kopiert');
});
test('automatic product suggestions populate without a second click and preserve edited ASINs on refresh',async({page})=>{
 await setup(page);const root='https://www.amazon.de/stores/Marke',category=root+'/page/tools';let reads=0;
 await page.route('**/api/brand-story-discover',r=>{const input=r.request().postDataJSON();if(input.pageUrl)reads++;return r.fulfill({json:{storeUrl:root,brandName:'Marke',marketplace:'de',warnings:[],pages:input.pageUrl?[{url:category,name:'Tools',status:'loaded',asins:['B012345678','B000000001','B000000002','B000000003']}]:[{url:root,name:'Startseite',status:'loaded',asins:[]},{url:category,name:'Tools',status:'pending',asins:[]}]}});});
 await page.getByRole('button',{name:'Neue Brand Story',exact:true}).first().click();await page.getByLabel('Amazon Brand Store-Link',{exact:true}).fill(root);await page.getByRole('button',{name:'Store auslesen',exact:true}).click();
 const field=page.getByLabel('Produkt-ASINs Tools',{exact:true});await expect(field).toHaveValue('B012345678, B000000001, B000000002, B000000003');expect(reads).toBe(1);
 await field.fill('B087654321, B000000001, B000000002, B000000003');await page.getByRole('button',{name:'Store erneut einlesen',exact:true}).click();await expect(page.getByRole('button',{name:'Weiter zu Claude',exact:true})).toBeEnabled();await expect(field).toHaveValue('B087654321, B000000001, B000000002, B000000003');expect(reads).toBe(1);
});
