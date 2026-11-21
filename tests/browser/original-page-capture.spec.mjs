import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('pngjs');
const {captureOriginalPage}=createRequire(import.meta.url)('../../api/_lib/original-page-capture.cjs');
const source='https://www.amazon.de/stores/Test/page/11111111-2222-3333-4444-555555555555';
test('capture uses original markup, loads lower images and crops only the complete Store',async({browser})=>{
 const context=await browser.newContext();
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#2366dd"/></svg>';
 const grey='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
 const html=`<!doctype html><html><head><style>h2{margin:0}</style></head><body style="margin:0"><header style="height:200px">Amazon header</header><main style="width:1440px;min-height:68000px">${Array.from({length:12},(_,i)=>`<section style="height:800px"><h2>Original section ${i+1}</h2><img src="${grey}" data-src="https://m.media-amazon.com/images/S/fixture-${i}.svg" width="400" height="400"></section>`).join('')}</main><footer style="height:600px">Amazon footer</footer><script>setTimeout(()=>document.querySelector("main").style.minHeight="0",2000);const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.src=entry.target.dataset.src;observer.unobserve(entry.target);}});document.querySelectorAll('img').forEach(image=>observer.observe(image));</script></body></html>`;
 const result=await captureOriginalPage(source,{html,launch:async()=>({newPage:async options=>{
  const page=await context.newPage();await page.setViewportSize(options.viewport);
  const register=page.route.bind(page);
  page.route=(pattern,handler)=>register(pattern,route=>handler({request:()=>route.request(),fulfill:value=>route.fulfill(value),abort:()=>route.abort(),continue:()=>route.fulfill({contentType:'image/svg+xml',body:svg.replace('#2366dd',Number(route.request().url().match(/fixture-(\d+)/)?.[1])===11?'#dd6623':'#2366dd')})}));
  return page;
 },close:()=>context.close()})});
 expect(result.quality.imageCount).toBe(12);expect(result.quality.scrollPasses).toBeGreaterThanOrEqual(2);
 expect(result.height).toBe(9600);expect(result.quality.documentHeight).toBe(9600);expect(result.quality.originalPageHeight).toBe(10400);
 expect(result.quality.sourceHtmlHash).toHaveLength(64);expect(result.width).toBe(1440);
 const pixels=PNG.sync.read(result.bytes),top=(100*pixels.width+100)*4,bottom=(8900*pixels.width+100)*4;
 expect([...pixels.data.subarray(top,top+3)]).toEqual([35,102,221]);
 expect([...pixels.data.subarray(bottom,bottom+3)]).toEqual([221,102,35]);
});
