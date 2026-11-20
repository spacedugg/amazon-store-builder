const { storeTarget, parseStorePage, crawlPage } = require('./brand-story-discovery.cjs');
const { put } = require('@vercel/blob');
const { createHash } = require('node:crypto');
function target(value) {
  const result = storeTarget(value);
  if (!/^[a-f0-9-]{36}$/i.test(result.pageId)) throw Error('Bitte einen direkten Amazon-Store-Homepage-Link mit Seiten-ID eingeben.');
  return result;
}
async function bounded(response, max) {
  if (Number(response.headers.get('content-length')) > max) throw Error('Aufnahme ist zu groß.');
  const reader=response.body.getReader(), chunks=[]; let size=0;
  try { for (;;) { const next=await reader.read(); if(next.done)break; size+=next.value.length; if(size>max)throw Error('Aufnahme ist zu groß.'); chunks.push(Buffer.from(next.value)); } return Buffer.concat(chunks); }
  finally { await reader.cancel().catch(()=>{}); }
}
function pngSize(bytes) {
  if (bytes.length < 33 || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.toString('ascii',12,16)!=='IHDR') throw Error('Der Aufnahmedienst hat kein PNG-Bild geliefert.');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(width<700 || height<400 || width*height>100e6)throw Error('Die Aufnahme hat ein ungültiges Format.');
  return {width,height};
}
async function captureReference(url, dependencies={}) {
  const load=dependencies.load || crawlPage, fetcher=dependencies.fetch || fetch, upload=dependencies.put || put;
  const timer=new AbortController(), timeout=setTimeout(()=>timer.abort(),140000);
  try {
    let source=target(url).url;
    let html=await load(source,timer.signal);
    if(/validateCaptcha|automated access to Amazon|Wir unterstützen deine Sitzung|<title[^>]*>\s*(?:robot check|amazon captcha)/i.test(html))throw Error('Amazon hat den Store-Abruf abgelehnt. Bitte erneut versuchen.');
    let parsed=parseStorePage(html,source);
    if(!parsed.brandName && !parsed.pages.length)throw Error('In der Antwort wurde kein Brand Store erkannt.');
    const home=parsed.pages.find(page=>/^(?:home(?:page)?|startseite|start|accueil|inicio|pagina iniziale)$/i.test(page.name.trim()));
    if(home && home.url !== source){source=target(home.url).url; html=await load(source,timer.signal);parsed=parseStorePage(html,source);}
    const key=process.env.BRIGHTDATA_UNLOCKER_TOKEN || process.env.BRIGHT_DATA_API_KEY;
    if(!key)throw Error('Der Amazon-Aufnahmedienst ist nicht eingerichtet.');
    let response;
    for(const credential of new Set([process.env.BRIGHTDATA_UNLOCKER_TOKEN,process.env.BRIGHT_DATA_API_KEY].filter(Boolean))){
    response=await fetcher('https://api.brightdata.com/request',{method:'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body:JSON.stringify({zone:process.env.BRIGHTDATA_UNLOCKER_ZONE || 'amz_brand_store_studio',url:source,format:'raw',data_format:'screenshot',render:'true'}),signal:timer.signal});
    if(![401,403].includes(response.status))break;
    }
    if(!response.ok)throw Error(`Der Aufnahmedienst meldet HTTP ${response.status}. Bitte erneut versuchen.`);
    const bytes=await bounded(response,20*1024*1024), dimensions=pngSize(bytes);
    const digest=createHash('sha256').update(source).digest('hex').slice(0,20);
    const blob=await upload(`store-homepage-screenshots/${digest}-${Date.now()}.png`,bytes,{access:'public',contentType:'image/png'});
    return {brandName:parsed.brandName, screenshot:{url:blob.url,...dimensions,capturedAt:new Date().toISOString(),sourceUrl:source,fullPage:dimensions.height<16384,...(dimensions.height>=16384?{truncated:true}:{})}};
  } catch(error) { if(error.name==='AbortError')throw Error('Die Aufnahme hat zu lange gedauert. Bitte erneut versuchen.');throw error; }
  finally {clearTimeout(timeout);}
}
module.exports={target,pngSize,captureReference};
