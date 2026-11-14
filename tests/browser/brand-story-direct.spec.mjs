import {test,expect} from '@playwright/test';
import {newStory,newCard} from '../../src/brandStoryModel.mjs';
function sample(count=12,grid=false){
 const s=newStory('Direkter Editor');s.background.desktopBrief='Founder in workshop, left side clear';s.background.mobileBrief='Same workshop above shared cards';
 for(let i=0;i<count;i++){const c=newCard(grid&&i===0?'grid':'media',s.cards);c.id='direct-'+i;c.brief='Description '+(i+1);c.copy='Bildtext '+(i+1);if(c.type==='grid'){c.headline='Produkte';c.shopUrl='https://www.amazon.de/stores/page/example';c.slots.forEach(slot=>slot.asin='B012345678');}s.cards.push(c);}return s;
}
async function open(page,s){
 const posts=[];
 await page.route('**/api/brand-stories*',route=>{
  if(route.request().method()==='POST'){const body=route.request().postDataJSON();posts.push(body);return route.fulfill({json:{id:'direct',revision:1+posts.length,designerToken:body.publish?'DESIGNER':undefined,customerToken:body.publish?'CUSTOMER':undefined}});}
  return route.fulfill({json:{stories:[]}});
 });
 await page.route('**/api/amazon-search',r=>r.fulfill({json:{products:[{asin:'B012345678',price:'10',image:'https://example.com/main.jpg'},{asin:'B087654321',price:'10',image:'https://example.com/main.jpg'}]}}));
 await page.route('https://example.com/main.jpg',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="green"/></svg>'}));
 await page.addInitScript(s=>sessionStorage.setItem('brand-story-draft',JSON.stringify({story:s,record:{id:'direct',revision:1,identity:{brandName:s.brandName,marketplace:s.marketplace}}})),s);
 await page.goto('/brand-stories');await page.getByRole('button',{name:'Letzten Entwurf fortsetzen',exact:true}).click();return posts;
}
test('direct preview has one add control, confirmed minus, icon toggles and toolbar uploads',async({page})=>{
 await open(page,sample());
 await expect(page.locator('.bs-sidebar')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Karte hinzufügen',exact:true})).toHaveCount(1);
 await expect(page.getByText('Positionierung prüfen',{exact:true})).toHaveCount(0);
 await expect(page.getByText('So funktioniert eine Brand Story',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Desktop',exact:true})).toHaveText('');
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Karte 2 entfernen',exact:true}).click();await expect(page.locator('.bs-card')).toHaveCount(12);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Karte 2 entfernen',exact:true}).click();await expect(page.locator('.bs-card')).toHaveCount(11);
 await page.getByRole('button',{name:'Design-Dateien',exact:true}).click();await expect(page.getByText('Ordner auswählen',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Dialog schließen',exact:true}).click();
 await page.getByRole('button',{name:'Karte hinzufügen',exact:true}).click();await expect(page.locator('.bs-card-type-illustration')).toHaveCount(2);await page.screenshot({path:'test-results/brand-story-card-types.png',fullPage:true});
});
test('dragging card two at the edge pages forward and moves it to position ten',async({page})=>{
 await open(page,sample());const carousel=page.locator('.bs-carousel'),source=page.locator('[data-card-id="direct-1"]');
 const transfer=await page.evaluateHandle(()=>new DataTransfer());await source.dispatchEvent('dragstart',{dataTransfer:transfer});
 const box=await carousel.boundingBox();await carousel.dispatchEvent('dragover',{dataTransfer:transfer,clientX:box.x+box.width-3,clientY:box.y+box.height/2});
 await expect(page.locator('.bs-counter')).toHaveText('4 / 5',{timeout:6000});
 await carousel.dispatchEvent('dragover',{dataTransfer:transfer,clientX:box.x+box.width/2,clientY:box.y+box.height/2});
 const target=page.locator('[data-card-id="direct-9"]'),r=await target.boundingBox();await target.dispatchEvent('drop',{dataTransfer:transfer,clientX:r.x+r.width-2,clientY:r.y+r.height/2});
 await expect(page.locator('.bs-card').nth(9)).toHaveAttribute('data-card-id','direct-1');
 await page.screenshot({path:'test-results/brand-story-drag-order.png',fullPage:true});
});
test('grid cells select the right slot, auto-load main images and switch between four briefs and a shared motif',async({page})=>{
 await open(page,sample(1,true));
 await expect(page.locator('.bs-grid img')).toHaveCount(4);
 await page.getByRole('button',{name:'Produkt 2 B012345678',exact:true}).click();
 await expect(page.getByLabel('ASIN oder Produktlink · Platz 2',{exact:true})).toBeFocused();
 await expect(page.getByLabel('Motivbeschreibung · Platz 1 (English)',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Inhalt und Motiv (English)',{exact:true})).toHaveCount(0);
 await expect(page.locator('.bs-grid-mode-preview img')).toHaveCount(8);
 await expect(page.getByRole('radio',{name:'Vier einzelne Bilder',exact:true})).toBeChecked();
 await page.getByRole('radio',{name:'Ein gesamtes Bild',exact:true}).check();
 await expect(page.getByLabel('Motivbeschreibung · Platz 1 (English)',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Inhalt und Motiv (English)',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Kartenname',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Dateipfad · Platz 1',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('ASIN oder Produktlink',{exact:true})).toBeVisible();
 await expect(page.locator('.bs-properties select')).toHaveCount(0);
 await expect(page.locator('.bs-grid img')).toHaveCount(0);
 await page.getByLabel('ASIN oder Produktlink',{exact:true}).fill('B087654321');
 await page.getByRole('button',{name:'Änderungen speichern',exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('brand-story-draft')).story);
 expect(saved.cards[0].slots.every(s=>s.asin==='B087654321' && s.imageMode==='custom')).toBe(true);
 await page.getByRole('radio',{name:'Vier einzelne Bilder',exact:true}).check();
 await page.getByLabel('Bildquelle · Platz 2',{exact:true}).selectOption('product');
 await expect(page.locator('.bs-grid-target').nth(1).locator('img')).toHaveCount(1);
 await page.screenshot({path:'test-results/brand-story-direct-grid.png',fullPage:true});
});
test('incomplete briefs and partial targets can be saved and left, but neither share link is offered',async({page})=>{
 const s=sample(1,true);s.cards[0].slots[1].brief='';const posts=await open(page,s);
 await page.getByRole('button',{name:'Produkt 2 B012345678',exact:true}).click();
 await page.getByLabel('ASIN oder Produktlink · Platz 2',{exact:true}).fill('B01');
 await page.getByRole('button',{name:'Designer & Kunde',exact:true}).click();
 await expect(page.getByRole('button',{name:'Freigabelinks aktualisieren',exact:true})).toBeDisabled();
 await expect(page.getByRole('link',{name:'Designer-Link öffnen',exact:true})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Kunden-Preview öffnen',exact:true})).toHaveCount(0);
 await expect(page.getByRole('alert')).toContainText('Platz 2');await page.getByRole('button',{name:'Dialog schließen',exact:true}).click();
 await page.getByRole('button',{name:'Änderungen speichern',exact:true}).click();await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeEnabled();
 expect(posts[0].data.cards[0].slots[1].url).toBe('B01');expect(posts[0].publish).toBe(false);
 await page.getByRole('button',{name:'Alle Brand Stories',exact:true}).click();await expect(page.getByRole('heading',{name:'Deine Brand Stories',exact:true})).toBeVisible();
});
test('Futum reference uses original separate assets and matches the eleven-card delivered sequence',async({page})=>{
 await open(page,sample(1));await page.getByRole('button',{name:'Brand-Story-Beispiele ansehen ↗',exact:true}).click();
 const futum=page.locator('.bs-reference-list article').filter({has:page.getByRole('heading',{name:'Futum',exact:true})});await futum.scrollIntoViewIfNeeded();
 await expect(futum.locator('.bs-card')).toHaveCount(11);await expect(futum.locator('.bs-grid-card')).toHaveCount(4);
 await expect.poll(()=>futum.locator('img').evaluateAll(imgs=>imgs.every(im=>im.complete&&im.naturalWidth>0))).toBe(true);
 await expect(futum.locator('.bs-counter')).toHaveText('1 / 4');await futum.getByRole('button',{name:'Nächste Karten',exact:true}).click();await expect(futum.locator('.bs-counter')).toHaveText('2 / 4');
 await futum.locator('.bs-carousel').screenshot({path:'test-results/futum-interactive-preview.png'});
});

test('manual path opens a blank editor and background is clearly editable with blue controls',async({page})=>{
 await open(page,sample(1));
 await page.getByLabel('Karte 1 bearbeiten',{exact:true}).click();
 await page.getByRole('button',{name:'Hintergrund bearbeiten',exact:true}).click();
 await expect(page.getByLabel('Desktop-Motiv und Inhalt (English)',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Karte hinzufügen',exact:true})).toHaveCSS('background-color','rgb(37, 99, 235)');
 await expect(page.getByRole('button',{name:'Änderungen speichern',exact:true})).toHaveCSS('background-color','rgb(37, 99, 235)');
 await expect(page.getByRole('button',{name:'Designer & Kunde',exact:true})).toHaveCSS('background-color','rgb(37, 99, 235)');
 await expect(page.locator('.bs-field-help')).toHaveCount(0);
 await page.getByRole('button',{name:'Alle Brand Stories',exact:true}).click();
 await expect(page.getByRole('button',{name:'Neue Brand Story',exact:true}).first()).toHaveCSS('background-color','rgb(37, 99, 235)');
 await page.getByRole('button',{name:'Neue Brand Story',exact:true}).first().click();
 await page.getByLabel('Markenname',{exact:true}).fill('Manuelle Marke');
 await page.getByRole('button',{name:'Manuell starten',exact:true}).click();
 await expect(page.getByLabel('Amazon Brand Store-Link',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Schwerpunkt der Story',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Produkte besonders hervorheben (optional)',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Story öffnen',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.locator('.bs-card')).toHaveCount(0);
});
