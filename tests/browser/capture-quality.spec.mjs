import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
const {captureBrowser}=createRequire(import.meta.url)('../../api/_lib/browser-capture.cjs');
const url='https://www.amazon.de/stores/Test/page/11111111-2222-3333-4444-555555555555';
test('real capture loads below-the-fold images and includes the bottom of a long homepage',async({page})=>{
 const grey='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
 const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#2366dd"/></svg>');
 const html=`<html><body style="margin:0"><h1>Brand Store</h1>${Array.from({length:6},(_,i)=>`<section style="height:1000px"><h2>Section ${i+1}</h2><img width="400" height="400" src="${grey}" data-real="${image}"></section>`).join('')}<p>End of homepage</p><script>const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.src=entry.target.dataset.real;observer.unobserve(entry.target);}});document.querySelectorAll('img').forEach(img=>observer.observe(img));</script></body></html>`;
 await page.route(url,route=>route.fulfill({contentType:'text/html',body:html}));
 const result=await captureBrowser(url,{endpoint:'fixture',connect:async()=>({contexts:()=>[{newPage:async()=>page}],close:async()=>{}})});
 expect(result.quality.imagesComplete).toBe(true);expect(result.quality.imageCount).toBe(6);expect(result.quality.scrollPasses).toBeGreaterThanOrEqual(2);expect(result.height).toBeGreaterThan(6000);expect(result.height).toBe(result.quality.documentHeight);
 await expect(page.getByText('End of homepage')).toBeAttached();
});
