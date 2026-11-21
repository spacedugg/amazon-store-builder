const { storeTarget, parseStorePage, crawlPage } = require('./brand-story-discovery.cjs');
const { put } = require('@vercel/blob');
const { createHash } = require('node:crypto');
function target(value) {
  const result = storeTarget(value);
  if (!/^[a-f0-9-]{36}$/i.test(result.pageId)) throw Error('Bitte einen direkten Amazon-Store-Homepage-Link mit Seiten-ID eingeben.');
  return result;
}
function pngSize(bytes) {
  if (bytes.length < 33 || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.toString('ascii',12,16)!=='IHDR') throw Error('Der Aufnahmedienst hat kein PNG-Bild geliefert.');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(width<700 || height<400 || width*height>100e6)throw Error('Die Aufnahme hat ein ungültiges Format.');
  return {width,height};
}
async function captureReference(url, dependencies={}) {
  const load=dependencies.load || crawlPage, fetcher=dependencies.fetch || fetch, upload=dependencies.put || put;
  const timer=new AbortController(), timeout=setTimeout(()=>timer.abort(),270000);
  try {
    let source=target(url).url;
    let html=await load(source,timer.signal);
    if(/validateCaptcha|automated access to Amazon|Wir unterstützen deine Sitzung|<title[^>]*>\s*(?:robot check|amazon captcha)/i.test(html))throw Error('Amazon hat den Store-Abruf abgelehnt. Bitte erneut versuchen.');
    let parsed=parseStorePage(html,source);
    if(!parsed.brandName && !parsed.pages.length)throw Error('In der Antwort wurde kein Brand Store erkannt.');
    const home=parsed.pages.find(page=>/^(?:home(?:page)?|startseite|start|accueil|inicio|pagina iniziale)$/i.test(page.name.trim()));
    if(home && home.url !== source){source=target(home.url).url; html=await load(source,timer.signal);parsed=parseStorePage(html,source);}
    const capture=dependencies.captureBrowser || require('./browser-capture.cjs').captureBrowser;
    const result=await capture(source,{fetch:fetcher});
    const bytes=result.bytes, dimensions=pngSize(bytes);
    if(bytes.length>20*1024*1024)throw Error('Aufnahme ist zu groß.');
    const digest=createHash('sha256').update(source).digest('hex').slice(0,20);
    const blob=await upload(`store-homepage-screenshots/${digest}-${Date.now()}.png`,bytes,{access:'public',contentType:'image/png'});
    return {brandName:parsed.brandName, screenshot:{url:blob.url,...dimensions,capturedAt:new Date().toISOString(),sourceUrl:source,fullPage:true,captureEngine:'browser-scroll-v1',quality:result.quality}};
  } catch(error) { if(error.name==='AbortError')throw Error('Die Aufnahme hat zu lange gedauert. Bitte erneut versuchen.');throw error; }
  finally {clearTimeout(timeout);}
}
module.exports={target,pngSize,captureReference};
