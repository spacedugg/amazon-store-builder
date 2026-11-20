import {test,expect} from '@playwright/test';
import {zipSync} from 'fflate';
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAIAAAAC64paAAAAHUlEQVR4nGP8//8/A7mAiWydo5pHNY9qHtVMFc0AnKADJXYG/XsAAAAASUVORK5CYII=','base64');
async function headquarters(page,path){
 await page.route('https://builder.test/**',async route=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/api/'))return route.fallback();const response=await route.fetch({url:'http://127.0.0.1:4174'+url.pathname+url.search});return route.fulfill({response});});
 await page.route('https://intern.temoa.de/reference-test',route=>route.fulfill({contentType:'text/html',body:`<iframe src="https://builder.test${path}" style="width:100%;height:100vh;border:0"></iframe><script>window.addEventListener('message',event=>{if(event.data?.type==='temoa-store-reference-admin')event.source.postMessage({type:'temoa-store-reference-admin-result',requestId:event.data.requestId,ticket:'test-ticket'},event.origin);});</script>`}));
 await page.goto('https://intern.temoa.de/reference-test');return page.frameLocator('iframe');
}
test('admin can add a Store example, see its full screenshot and refresh without losing the old image on failure',async({page})=>{
 await page.route('**/api/stores',route=>route.fulfill({json:{stores:[]}}));
 await page.route('**/api/reference-stores',route=>route.fulfill({json:{stores:[]}}));
 const store={storeUrl:'https://www.amazon.de/stores/page/11111111-2222-3333-4444-555555555555',brandName:'Test-Referenz',captureStatus:'ready',homepageScreenshot:{url:'https://example.com/home.png',width:1440,height:6000,capturedAt:'2026-11-20T12:00:00Z',sourceUrl:'https://www.amazon.de/stores/page/11111111-2222-3333-4444-555555555555',fullPage:true}};
 let attempts=0;
 await page.route('**/api/store-reference-captures',route=>route.request().method()==='GET'?route.fulfill({json:{stores:[]}}):route.fulfill({status:++attempts===1?200:502,json:attempts===1?{store}:{error:'Aufnahme fehlgeschlagen',store:{...store,captureStatus:'failed',captureError:'Aufnahme fehlgeschlagen'}}}));
 await page.route('https://example.com/home.png',route=>route.fulfill({contentType:'image/png',body:pixel}));
 const frame=await headquarters(page,'/');await frame.getByRole('button',{name:'Store-Beispiele',exact:true}).click();
 await frame.getByRole('button',{name:'+ Beispiel hinzufügen',exact:true}).click();
 await frame.getByLabel('Amazon-Store-Homepage-Link',{exact:true}).fill(store.storeUrl);
 await frame.getByLabel('Marke (optional)',{exact:true}).fill(store.brandName);
 await frame.getByRole('button',{name:'Hinzufügen und Screenshot erstellen',exact:true}).click();
 await expect(frame.getByRole('heading',{name:store.brandName,exact:true})).toBeVisible();
 await frame.getByRole('button',{name:'Beispiel ansehen: '+store.brandName,exact:true}).click();
 await expect(frame.locator('.srl-homepage-figure img')).toBeVisible();
 await frame.getByRole('button',{name:'Screenshot aktualisieren',exact:true}).click();
 await expect(frame.getByRole('alert').first()).toContainText('Aufnahme fehlgeschlagen');
 await expect(frame.locator('.srl-homepage-figure img')).toBeVisible();
});
test('ZIP import uploads original assets, applies recognized card order and editable grid headlines',async({page})=>{
 await page.route('**/api/brand-stories*',route=>route.fulfill({json:{stories:[]}}));
 await page.route('**/api/brand-story-examples',route=>route.fulfill({json:{examples:[]}}));
 await page.route('**/api/blob-upload',route=>route.fulfill({json:{clientToken:'vercel_blob_client_test_token'}}));
 await page.route('https://vercel.com/api/blob/**',route=>route.fulfill({json:{url:'https://example.com/upload.png',pathname:'upload.png',contentType:'image/png'}}));
 await page.route('https://example.com/upload.png',route=>route.fulfill({contentType:'image/png',body:pixel}));
 await page.route('**/api/brand-story-zip-analysis',route=>route.fulfill({json:{brandName:'ZIP-Marke',cards:[{id:'grid-0',headline:'Unsere Angebote',gridMode:'composite'},{id:'media-0'}]}}));
 const frame=await headquarters(page,'/brand-stories');await frame.getByRole('button',{name:'Beispiele',exact:true}).click();
 const files={'Neu/Background/Desktop.png':pixel,'Neu/Brand Media Assets/Brand Image 0.png':pixel,'Neu/Preview/Preview 1.png':pixel};
 for(let i=1;i<=4;i++)files[`Neu/ASIN Grids/Product Image ${i}.png`]=pixel;
 await frame.locator('input[accept=".zip,application/zip"]').setInputFiles({name:'story.zip',mimeType:'application/zip',buffer:Buffer.from(zipSync(files))});
 await expect(frame.getByLabel('Marke',{exact:true})).toHaveValue('ZIP-Marke',{timeout:20000});
 await expect(frame.locator('.bs-example-card')).toHaveCount(2);
 await expect(frame.getByRole('region',{name:'Beispielkarte 1',exact:true}).getByLabel('Grid-Überschrift')).toHaveValue('Unsere Angebote');
 await expect(frame.getByRole('region',{name:'Beispielkarte 1',exact:true}).locator('.bs-example-grid img')).toHaveCount(4);
});
