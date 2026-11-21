const {chromium}=require('playwright-core');
const binary=require('@sparticuz/chromium');
const {createHash}=require('node:crypto');
const {storeTarget}=require('./brand-story-discovery.cjs');
function permittedResource(value){
  try { const url=new URL(value); return url.protocol==='https:' && !url.username && !url.password && !url.port && /(^|\.)(?:amazon\.(?:de|com|co\.uk|fr|it|es|nl|se|pl|com\.be)|media-amazon\.com|ssl-images-amazon\.com|a2z\.com|cloudfront\.net)$/.test(url.hostname); } catch {return false;}
}
function anonymousCookies(headers,source){
 const values=new Map(),put=(name,value)=>{if(/^[A-Za-z0-9_-]{1,100}$/.test(name)&&! /^(?:at-|sess-at|session-token|x-acb)/i.test(name)&&value.length<=4096)values.set(name,value);};
 for(const item of String(headers['x-req-cookie']||'').split(';')){const at=item.indexOf('=');if(at>0)put(item.slice(0,at).trim(),item.slice(at+1).trim());}
 const set=headers['set-cookie'];
 for(const item of Array.isArray(set)?set:String(set||'').split(/,(?=\s*[^;,=\s]+=)/)){const pair=item.split(';')[0],at=pair.indexOf('=');if(at>0)put(pair.slice(0,at).trim(),pair.slice(at+1).trim());}
 return [...values].map(([name,value])=>({name,value,url:new URL(source).origin+'/',secure:true,sameSite:'Lax'}));
}
async function loadOriginalPage(url,signal,fetcher=fetch){
 const source=storeTarget(url).url;
 for(const key of new Set([process.env.BRIGHT_DATA_API_KEY,process.env.BRIGHTDATA_UNLOCKER_TOKEN].filter(Boolean))){
  const response=await fetcher('https://api.brightdata.com/request',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({zone:process.env.BRIGHTDATA_UNLOCKER_ZONE||'amz_brand_store_studio',url:source,format:'json'}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(45000)]):AbortSignal.timeout(45000)});
  if([401,403].includes(response.status)){await response.body?.cancel?.().catch(()=>{});continue;}
  if(!response.ok)throw Error('Originalseite konnte nicht abgerufen werden (HTTP '+response.status+').');
  const data=await response.json();
  if(data.status_code!==200 || typeof data.body!=='string' || data.body.length>5*1024*1024)throw Error('Amazon liefert keine verwendbare Store-Seite (HTTP '+data.status_code+').');
  return {html:data.body,cookies:anonymousCookies(data.headers||{},source)};
 }
 throw Error('Der vorhandene Amazon-Abrufdienst lehnt den Zugang ab.');
}
// Run in the remote page. Ignore tiny tracking pixels, but inspect every visible
// image-sized slot, including ones outside the viewport after scrolling.
function pageReadiness(selector) {
  const root=selector?document.querySelector(selector):document.body;
  if(!root)throw Error('Store-Bereich wurde nicht gefunden.');
  const visible = element => {
    const r=element.getBoundingClientRect(),s=getComputedStyle(element);
    if(r.width<60||r.height<60||s.display==='none'||s.visibility==='hidden'||s.opacity==='0')return false;
    for(let parent=element.parentElement;parent&&parent!==document.body;parent=parent.parentElement){
      const style=getComputedStyle(parent),box=parent.getBoundingClientRect();
      if(/hidden|clip|auto|scroll/.test(style.overflowX) && (r.right<=box.left||r.left>=box.right))return false;
      if(/hidden|clip|auto|scroll/.test(style.overflowY) && (r.bottom<=box.top||r.top>=box.bottom))return false;
    }
    return true;
  };
  const images=[...root.querySelectorAll('img')].filter(visible),missing=images.filter(i=>!i.complete||i.naturalWidth<3||/grey-pixel|transparent-pixel|placeholder/i.test(i.currentSrc||i.src));
  const rect=root.getBoundingClientRect();
  return {height:Math.ceil(Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)),width:Math.ceil(document.documentElement.clientWidth),images:images.length,missing:missing.length,skeletons:[...root.querySelectorAll('[class*="Skeleton"],[class*="skeleton"],[class*="Placeholder"],[class*="placeholder"],[aria-busy="true"]')].filter(e=>visible(e) && !/Header__placeholder__/.test(e.className) && ![...e.querySelectorAll('img')].some(i=>i.naturalWidth>2&&visible(i))).length,region:{x:Math.round(rect.left+scrollX),y:Math.round(rect.top+scrollY),width:Math.floor(rect.width),height:Math.floor(rect.height)}};
}
function storeSelector(){
 const images=[...document.images].filter(i=>i.getBoundingClientRect().width>=60 && [i.currentSrc,i.src,i.getAttribute('data-src'),i.getAttribute('data-a-dynamic-image')].some(value=>/\/images\/(?:S|I)\//.test(value||'')));
 if(images.length<2)throw Error('Kein vollständiger Store-Inhalt gefunden.');
 let root=images[0].parentElement;
 while(root&& !images.every(image=>root.contains(image)))root=root.parentElement;
 if(!root || root===document.body || root===document.documentElement)throw Error('Store-Inhalt konnte nicht sicher abgegrenzt werden.');
 const parts=[];while(root&&root!==document.body){const tag=root.tagName.toLowerCase(),siblings=[...root.parentElement.children].filter(e=>e.tagName===root.tagName);parts.unshift(tag+':nth-of-type('+(siblings.indexOf(root)+1)+')');root=root.parentElement;}
 return 'body > '+parts.join(' > ');
}
function assertReady(state) {
  if (!state.images || state.missing || state.skeletons) throw Error('Die Homepage enthält noch ungeladene oder fehlerhafte Bildplätze. Die alte Aufnahme wurde nicht ersetzt.');
  if (state.height<400 || state.height>60000 || state.width*state.height>100e6) throw Error('Die Homepage ist für eine vollständige Aufnahme zu groß oder ungültig.');
}
async function settlePage(page, options={}) {
  const pause = options.pause || (ms => page.waitForTimeout(ms));
  const deadline = Date.now() + (options.timeoutMs || 160000);
  let previous;
  for (let pass=1;pass<=4;pass++) {
    let position=0;
    while (true) {
      if (Date.now()>deadline) throw Error('Nicht alle Homepage-Bilder wurden rechtzeitig geladen. Die alte Aufnahme wurde nicht ersetzt.');
      const state=await page.evaluate(pageReadiness,options.selector);
      if (state.height>200000) throw Error('Die Homepage überschreitet die sichere Aufnahmehöhe.');
      await page.evaluate(y=>window.scrollTo(0,y),position);
      await pause(250);
      if (position>=state.height) break;
      position=Math.min(position+700,state.height);
    }
    await pause(1200);
    const state=await page.evaluate(pageReadiness,options.selector);
    if (pass>=2 && !state.missing && !state.skeletons) {
      assertReady(state);
      await page.evaluate(()=>window.scrollTo(0,0));
      await pause(500);
      const final=await page.evaluate(pageReadiness,options.selector);assertReady(final);
      await pause(500);
      const confirmed=await page.evaluate(pageReadiness,options.selector);assertReady(confirmed);
      if(confirmed.region.height!==final.region.height || confirmed.region.width!==final.region.width) { previous=confirmed; continue; }
      return {...confirmed,scrollPasses:pass};
    }
    previous=state;
  }
  assertReady(previous);
  throw Error('Der Seitenaufbau ist noch nicht stabil. Bitte die Aufnahme erneut starten.');
}

async function dismissConsent(page){
  let changed=false;
  const buttons=await page.getByRole('button',{name:/^(Ablehnen|Alle ablehnen|Reject|Reject all|Decline)$/i}).all();
  for(const button of buttons)if(await button.isVisible()){await button.click();changed=true;await page.waitForTimeout(500);}
  const legacy=page.locator('#sp-cc-rejectall-link');if(await legacy.isVisible()){await legacy.click();changed=true;await page.waitForTimeout(500);}
  return changed;
}
let executablePromise;
async function captureOriginalPage(url,options={}) {
  const source=storeTarget(url).url;
  if(typeof options.html!=='string' || options.html.length<500 || options.html.length>5*1024*1024)throw Error('Originalseite fehlt oder ist ungültig.');
  let browser,expired=false;
  const timeout=setTimeout(()=>{expired=true;browser?.close().catch(()=>{});},240000);
  try {
    const launch=options.launch || (()=>(executablePromise ||= binary.executablePath()).then(executablePath=>chromium.launch({executablePath,args:binary.args,headless:true})));
    browser=await launch();if(expired)throw Error('Die Aufnahme hat zu lange gedauert.');
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.setDefaultTimeout(15000);
    if(options.cookies?.length)await page.context().addCookies(options.cookies);
    await page.route('**/*',async route=>{
      const request=route.request();
      if(request.isNavigationRequest() && request.frame()===page.mainFrame() && request.url()===source)return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:options.html});
      if(request.method()!=='GET' || !permittedResource(request.url()))return route.abort();
      return route.continue();
    });
    await page.goto(source,{waitUntil:'domcontentloaded',timeout:75000});
    const body=await page.locator('body').innerText();
    if(/Wir unterstützen deine Sitzung|automated access|robot check/i.test(body))throw Error('Amazon hat keine verwendbare Originalseite geliefert.');
    await page.waitForTimeout(1500);
    await dismissConsent(page);
    let selector=await page.evaluate(storeSelector);
    let state=await settlePage(page,{...options,selector});
    const completeSelector=await page.evaluate(storeSelector);
    if(completeSelector!==selector){selector=completeSelector;state=await settlePage(page,{...options,selector});}
    const storeImages=await page.evaluate(()=>[...document.images].filter(i=>i.getBoundingClientRect().width>=60 && [i.currentSrc,i.src,i.getAttribute('data-src'),i.getAttribute('data-a-dynamic-image')].some(value=>/\/images\/(?:S|I)\//.test(value||''))).length);
    if(storeImages<2)throw Error('Die Originalseite enthält keinen vollständig geladenen Store-Inhalt.');
    if(await dismissConsent(page))state=await settlePage(page,{...options,selector});
    if(await page.getByText(/^(Cookies und Werbeoptionen|Cookies and advertising)$/i).isVisible())throw Error('Cookie-Hinweis konnte nicht geschlossen werden.');
    const session=await page.context().newCDPSession(page);
    // Keep each compositor capture below its texture limit. Very long single
    // captures can repeat the upper page even when every DOM image is ready.
    const {PNG}=require('pngjs');
    const output=new PNG({width:state.region.width,height:state.region.height});
    for(let offset=0;offset<state.region.height;offset+=2000){
      const height=Math.min(2000,state.region.height-offset);
      const shot=await session.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{...state.region,y:state.region.y+offset,height,scale:1}});
      const tile=PNG.sync.read(Buffer.from(shot.data,'base64'));
      if(tile.width!==output.width || tile.height!==height)throw Error('Ein Teil der Store-Aufnahme ist abgeschnitten.');
      PNG.bitblt(tile,output,0,0,tile.width,tile.height,0,offset);
    }
    const bytes=PNG.sync.write(output);
    const {pngSize}=require('./reference-capture.cjs'),size=pngSize(bytes);
    if(Math.abs(size.height-state.region.height)>2 || Math.abs(size.width-state.region.width)>2)throw Error('Die Store-Aufnahme wurde abgeschnitten.');
    return {bytes,...size,quality:{version:2,imagesComplete:true,tiled:true,imageCount:state.images,scrollPasses:state.scrollPasses,documentHeight:state.region.height,originalPageHeight:state.height,sourceHtmlHash:createHash('sha256').update(options.html).digest('hex')}};
  } finally {clearTimeout(timeout);await browser?.close().catch(()=>{});}
}
module.exports={loadOriginalPage,anonymousCookies,permittedResource,pageReadiness,assertReady,settlePage,storeSelector,captureOriginalPage};
