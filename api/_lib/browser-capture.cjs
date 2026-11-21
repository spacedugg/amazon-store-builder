'use strict';
const { chromium } = require('playwright-core');

// Only read an existing Browser API configuration. Creating zones is an explicit
// account setup step and must never happen as a side effect of taking a picture.
async function browserEndpoint(fetcher = fetch) {
  if (process.env.BRIGHTDATA_BROWSER_ENDPOINT) {
    const url = new URL(process.env.BRIGHTDATA_BROWSER_ENDPOINT);
    if (url.protocol !== 'wss:' || url.hostname !== 'brd.superproxy.io' || url.port !== '9222') throw Error('Browser-Aufnahmedienst ist falsch konfiguriert.');
    return url.href;
  }
  const zone = process.env.BRIGHTDATA_BROWSER_ZONE || 'amz_store_capture_browser';
  if (!/^[a-z0-9_]{1,80}$/i.test(zone)) throw Error('Browser-Zone ist ungültig.');
  async function api(path) {
    for (const key of new Set([process.env.BRIGHT_DATA_API_KEY, process.env.BRIGHTDATA_UNLOCKER_TOKEN].filter(Boolean))) {
      const response = await fetcher('https://api.brightdata.com' + path, { headers: { Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(20000) });
      if ([401,403].includes(response.status)) { await response.body?.cancel?.().catch(() => {}); continue; }
      if (!response.ok) throw Error('Browser-Konfiguration konnte nicht gelesen werden (HTTP ' + response.status + ').');
      return response.json();
    }
    throw Error('Zugang zum Browser-Aufnahmedienst fehlt.');
  }
  const zones = await api('/zone/get_active_zones');
  if (!Array.isArray(zones) || !zones.some(item => item.name === zone && item.type === 'browser_api')) throw Error('Für vollständige Screenshots muss der Browser-Aufnahmedienst einmalig aktiviert werden. Die bisherige Einzelaufnahme lädt nicht alle Bilder.');
  const status = await api('/status'), passwords = await api('/zone/passwords?zone=' + encodeURIComponent(zone));
  if (!status.customer || !passwords.passwords?.[0]) throw Error('Browser-Zugang konnte nicht geladen werden.');
  return 'wss://brd-customer-' + encodeURIComponent(status.customer) + '-zone-' + zone + ':' + encodeURIComponent(passwords.passwords[0]) + '@brd.superproxy.io:9222';
}

// Run in the remote page. Ignore tiny tracking pixels, but inspect every visible
// image-sized slot, including ones outside the viewport after scrolling.
function pageReadiness() {
  const visible = element => { const r=element.getBoundingClientRect(),s=getComputedStyle(element); return r.width>=60 && r.height>=60 && s.display!=='none' && s.visibility!=='hidden'; };
  const images = [...document.images].filter(visible);
  const missing = images.filter(image => !image.complete || image.naturalWidth<3 || /grey-pixel|transparent-pixel|placeholder/i.test(image.currentSrc || image.src));
  const skeletons = [...document.querySelectorAll('[class*="Skeleton"],[class*="skeleton"],[data-testid*="loading"]')].filter(visible);
  return { height: Math.ceil(Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)), width: Math.ceil(document.documentElement.clientWidth), images: images.length, missing: missing.length, skeletons: skeletons.length };
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
      const state=await page.evaluate(pageReadiness);
      if (state.height>60000) throw Error('Die Homepage überschreitet die sichere Aufnahmehöhe.');
      await page.evaluate(y=>window.scrollTo(0,y),position);
      await pause(250);
      if (position>=state.height) break;
      position=Math.min(position+700,state.height);
    }
    await pause(1200);
    const state=await page.evaluate(pageReadiness);
    if (pass>=2 && previous && state.height===previous.height && state.images===previous.images && !state.missing && !state.skeletons) {
      assertReady(state);
      await page.evaluate(()=>window.scrollTo(0,0));
      await pause(300);
      const final=await page.evaluate(pageReadiness);assertReady(final);
      if(final.height!==state.height || final.images!==state.images) { previous=final; continue; }
      return {...final,scrollPasses:pass};
    }
    previous=state;
  }
  assertReady(previous);
  throw Error('Der Seitenaufbau ist noch nicht stabil. Bitte die Aufnahme erneut starten.');
}
async function captureBrowser(url, options={}) {
  const connect = options.connect || (endpoint => chromium.connectOverCDP(endpoint,{timeout:45000}));
  let browser, expired=false;
  const timeout=setTimeout(()=>{ expired=true; browser?.close().catch(()=>{}); },250000);
  try {
    const endpoint = options.endpoint || await browserEndpoint(options.fetch);
    if(expired) throw Error('Die Browser-Aufnahme hat zu lange gedauert.');
    browser=await connect(endpoint);
    if(expired) throw Error('Die Browser-Aufnahme hat zu lange gedauert.');
    const context=browser.contexts()[0];
    if (!context) throw Error('Der Browser-Aufnahmedienst konnte keine Sitzung öffnen.');
    const page=await context.newPage();
    page.setDefaultTimeout(15000);
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
    const {target}=require('./reference-capture.cjs');
    target(page.url()); // Never capture a redirected sign-in or non-Store page.
    const body=await page.locator('body').innerText();
    if (/Wir unterstützen deine Sitzung|automated access|captcha|robot check/i.test(body)) throw Error('Amazon hat diese Browser-Sitzung abgelehnt. Es wurde keine neue Aufnahme gespeichert.');
    const reject=page.locator('#sp-cc-rejectall-link');
    if (await reject.isVisible()) await reject.click();
    const state=await settlePage(page,options);
    const bytes=await page.screenshot({type:'png',fullPage:true,timeout:30000});
    const {pngSize}=require('./reference-capture.cjs'),size=pngSize(bytes);
    if(Math.abs(size.height-state.height)>2 || Math.abs(size.width-state.width)>2) throw Error('Die Screenshot-Höhe entspricht nicht der vollständigen Homepage. Die alte Aufnahme wurde nicht ersetzt.');
    return {bytes,quality:{imagesComplete:true,imageCount:state.images,scrollPasses:state.scrollPasses,documentHeight:state.height},...size};
  } catch(error) {
    // Provider exceptions may contain a credential-bearing websocket URL.
    if (/wss:|brd-customer-|password|Authorization/i.test(error.message)) throw Error('Verbindung zum Browser-Aufnahmedienst fehlgeschlagen.');
    throw error;
  } finally { clearTimeout(timeout); await browser?.close().catch(()=>{}); }
}
module.exports={browserEndpoint,pageReadiness,assertReady,settlePage,captureBrowser};
