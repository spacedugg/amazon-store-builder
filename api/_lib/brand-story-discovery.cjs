'use strict';

const LIMITS = Object.freeze({ htmlBytes: 4 * 1024 * 1024, pages: 60, products: 300, configs: 500, nodes: 30000, depth: 20, timeoutMs: 40000 });
const MARKETPLACES = new Set(['amazon.de','amazon.com','amazon.co.uk','amazon.fr','amazon.it','amazon.es','amazon.nl','amazon.se','amazon.pl','amazon.com.be']);
function storeTarget(value) {
  if (typeof value !== 'string' || value.length > 2048 || !/^https:\/\//i.test(value) || /[\s\\]/.test(value)) throw new Error('Use an HTTPS Amazon Store URL');
  // URL normalizes an explicit default port away, so inspect the supplied authority too.
  const authority = value.match(/^https:\/\/([^/?#]+)/i)?.[1] || '';
  if (/[:@]/.test(authority) || value.includes('#')) throw new Error('Credentials, ports and fragments are not allowed');
  const url = new URL(value);
  const marketplace = url.hostname.replace(/^www\./, '');
  if (!MARKETPLACES.has(marketplace) || ![marketplace,'www.' + marketplace].includes(url.hostname) || !/^\/stores\/[^/]+/i.test(url.pathname)) throw new Error('Use a supported Amazon marketplace Store URL');
  if (/%(?:2f|5c|2e)/i.test(url.pathname)) throw new Error('Encoded path separators are not allowed');
  if (/\/page\//i.test(url.pathname) && !/\/page\/[a-z0-9-]+\/?$/i.test(url.pathname)) throw new Error('Use an Amazon Store page URL');
  url.search = '';
  url.pathname = url.pathname.replace(/\/+$/, '');
  const parts = url.pathname.split('/').filter(Boolean);
  const storeKey = parts[1]?.toLowerCase() === 'page' ? '' : parts[1]?.toLowerCase();
  return { url: url.toString(), marketplace, storeKey, pageId: url.pathname.match(/\/page\/([a-z0-9-]+)/i)?.[1] || '' };
}
function validateTargets(storeUrl, pageUrl) {
  const store = storeTarget(storeUrl);
  const page = pageUrl == null ? store : storeTarget(pageUrl);
  if (store.marketplace !== page.marketplace || (store.storeKey && page.storeKey && store.storeKey !== page.storeKey)) throw new Error('Page must belong to the same Amazon marketplace and Store');
  return { storeUrl: store.url, pageUrl: page.url, marketplace: store.marketplace };
}
function decode(value) {
  return String(value || '').replace(/&(?:amp|quot|apos|lt|gt|#39|#x27);/gi, x => ({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&#39;':"'",'&#x27;':"'"}[x.toLowerCase()] || x)).trim();
}
function text(value) { return decode(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').slice(0, 200); }
function attributes(tag) {
  const result = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) result[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4]);
  return result;
}
function balanced(source, start) {
  let depth=0, quoted=false, escaped=false;
  for (let i=start; i<source.length && i<start+1000000; i++) {
    const c=source[i];
    if (escaped) { escaped=false; continue; }
    if (quoted && c==='\\') { escaped=true; continue; }
    if (c==='"') { quoted=!quoted; continue; }
    if (quoted) continue;
    if (c==='{') depth++;
    if (c==='}' && --depth===0) return source.slice(start,i+1);
  }
  return '';
}
function configsFrom(html) {
  const result=[];
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs=attributes(script[1]), source=script[2];
    if (/json/i.test(attrs.type || '')) {
      try { result.push(JSON.parse(source)); } catch {}
    }
    for (const m of source.matchAll(/\b(?:var|let|const)\s+config\w*\s*=\s*(?=\{)/g)) {
      try { result.push(JSON.parse(balanced(source,m.index+m[0].length))); } catch {}
      if (result.length>=LIMITS.configs) break;
    }
    if (result.length>=LIMITS.configs) break;
  }
  return result.slice(0,LIMITS.configs);
}
function parseStorePage(html, pageUrl) {
  if (typeof html!=='string' || Buffer.byteLength(html)>LIMITS.htmlBytes) throw new Error('Crawler HTML is too large or invalid');
  const target=storeTarget(pageUrl), warnings=[], pages=[], asins=[], seenPages=new Set(), seenAsins=new Set();
  html=html.replace(/<!--[\s\S]*?-->/g, '');
  const configs=configsFrom(html);
  let brandName='', pageName='', nodes=0, truncated=false;
  const addPage=(href,name,id) => {
    if (typeof href!=='string') return;
    try {
      const resolved=new URL(decode(href), target.url).toString();
      const validated=validateTargets(target.url,resolved);
      const url=validated.pageUrl;
      if (seenPages.has(url)) { const page=pages.find(p=>p.url===url); if(!page.name && name) page.name=text(name); return; }
      if (pages.length>=LIMITS.pages) {truncated=true; return;}
      seenPages.add(url); pages.push({url,name:text(name),pageId:storeTarget(url).pageId || text(id)});
    } catch {}
  };
  const addAsin=value => { if(typeof value!=='string') return; const asin=value.toUpperCase(); if(!/^[A-Z0-9]{10}$/.test(asin)||seenAsins.has(asin))return; if(asins.length>=LIMITS.products){truncated=true;return;} seenAsins.add(asin);asins.push(asin); };
  const productLink=value => {
    if(typeof value!=='string')return;
    try {const url=new URL(decode(value),target.url);if(url.protocol==='https:' && url.hostname.replace(/^www\./,'')===target.marketplace) {const m=url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i);if(m)addAsin(m[1]);}}catch{}
  };
  function visit(obj,depth=0,nav=false) {
    if(!obj||typeof obj!=='object'||depth>LIMITS.depth)return;
    if(++nodes>LIMITS.nodes){truncated=true;return;}
    if(Array.isArray(obj)){for(const value of obj)visit(value,depth+1,nav);return;}
    const type=String(obj.widgetType||obj.sectionType||obj.type||'');
    nav=nav || /nav|breadcrumb|footer|header|searchbar/i.test(type);
    if(obj.brandName && typeof obj.brandName==='string' && !brandName)brandName=text(obj.brandName);
    if(nav && obj.href)addPage(obj.href,obj.title||obj.name,obj.pageId);
    for(const [key,value] of Object.entries(obj)) {
      if(/^(nav|navigation|navigationItems)$/i.test(key)) {
        const entries=Array.isArray(value)?value:Object.entries(value||{}).map(([id,entry])=>typeof entry==='object'&&entry?{pageId:id,...entry}:{});
        for(const entry of entries)if(entry && entry.href)addPage(entry.href,entry.title||entry.name,entry.pageId);
        visit(value,depth+1,true); continue;
      }
      // Other page payloads are not evidence of membership on this page.
      if(/^(pages|recommendations|relatedProducts|searchResults)$/i.test(key))continue;
      if(!nav) {
        if(/^asin$/i.test(key))addAsin(value);
        if(/^asins$/i.test(key) && Array.isArray(value))value.forEach(addAsin);
        if(/^(productURLs?|productLinks?)$/i.test(key)) {if(Array.isArray(value))value.forEach(productLink);else productLink(value);}
        if(/^(href|url)$/i.test(key))productLink(value);
      }
      if(typeof value==='object')visit(value,depth+1,nav);
    }
  }
  configs.forEach(cfg=>visit(cfg));
  for(const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs=attributes(m[0]);
    if(/^(brand|og:brand)$/i.test(attrs.name||attrs.property||'') && attrs.content)brandName=brandName||text(attrs.content);
  }
  // Only actual anchors count in fallback mode. Suppress navigation, chrome and scripts.
  const clean=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
  const stack=[];
  for(const token of clean.matchAll(/<\/?[a-z][^>]*>|[^<]+/gi)) {
    const raw=token[0];
    if(!raw.startsWith('<'))continue;
    const closing=/^<\//.test(raw), tag=raw.match(/^<\/?([\w-]+)/)?.[1].toLowerCase();
    if(closing){ const index=stack.map(x=>x.tag).lastIndexOf(tag);if(index>=0)stack.length=index;continue; }
    const attrs=attributes(raw);
    const navigation=stack.some(x=>x.navigation)||tag==='nav'||/navigation/i.test(attrs.role||'')||/navigation|(?:^|[\s_-])(?:nav|navbar)(?:[\s_-]|$)/i.test((attrs.id||'')+' '+(attrs.class||''));
    const blocked=stack.some(x=>x.blocked)||/^(nav|header|footer)$/i.test(tag)||/navigation|banner|contentinfo/i.test(attrs.role||'')||/navigation|(?:^|[\s_-])(?:nav|navbar|footer|header)(?:[\s_-]|$)/i.test((attrs.id||'')+' '+(attrs.class||''));
    if(tag==='a') {
      const label=clean.slice(token.index+raw.length).split('</a')[0].replace(/<[^>]*>/g,'');
      let currentPage=false;
      try {currentPage=storeTarget(new URL(attrs.href,target.url).toString()).url===target.url;}catch{}
      if(navigation || currentPage)addPage(attrs.href,label);
      if(!blocked)productLink(attrs.href);
    }
    if(!/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag)&&!raw.endsWith('/>'))stack.push({tag,blocked,navigation});
  }
  if(!configs.length)warnings.push('No structured Store configuration found; verify observed links and add missing products manually.');
  if(!asins.length)warnings.push('No products observed on this page; add products manually or retry.');
  if(truncated)warnings.push('Discovery limit reached; additional pages or products may need manual entry.');
  pageName=pages.find(p=>p.url===target.url)?.name || '';
  return {brandName,pageName,pages,asins,warnings};
}
async function readBounded(response) {
  if(Number(response.headers?.get('content-length'))>LIMITS.htmlBytes)throw new Error('Crawler HTML is too large');
  if(!response.body?.getReader){const body=await response.text();if(Buffer.byteLength(body)>LIMITS.htmlBytes)throw new Error('Crawler HTML is too large');return body;}
  const reader=response.body.getReader(), chunks=[];let bytes=0;
  try {for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>LIMITS.htmlBytes)throw new Error('Crawler HTML is too large');chunks.push(Buffer.from(value));}return Buffer.concat(chunks).toString('utf8');}
  finally {await reader.cancel().catch(()=>{});}
}
function crawlerError(message, code, status) { return Object.assign(new Error(message),{code,status}); }
async function crawlPage(url,signal) {
  const tokens=[...new Set([process.env.BRIGHTDATA_UNLOCKER_TOKEN,process.env.BRIGHT_DATA_API_KEY].map(t=>t?.trim()).filter(Boolean))];
  if(!tokens.length)throw crawlerError('Der Store-Abruf ist nicht eingerichtet. Bitte den Administrator informieren.','CRAWLER_CONFIG',503);
  for(let i=0;i<tokens.length;i++){
    const response=await fetch('https://api.brightdata.com/request',{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tokens[i]},body:JSON.stringify({zone:process.env.BRIGHTDATA_UNLOCKER_ZONE||'amz_brand_store_studio',url,format:'raw'}),signal});
    if(response.status===401){
      await response.body?.cancel?.().catch(()=>{});
      if(i+1<tokens.length)continue;
      throw crawlerError('Der Store-Abruf ist derzeit nicht verfügbar: Bright Data lehnt den Zugangsschlüssel ab. Bitte den Administrator informieren.','CRAWLER_AUTH',503);
    }
    if(!response.ok)throw crawlerError(response.status===403?'Der Store-Abruf hat keine Berechtigung für die konfigurierte Bright-Data-Zone. Bitte den Administrator informieren.':`Der Store konnte nicht gelesen werden (Abrufdienst HTTP ${response.status}). Bitte erneut versuchen.`,'CRAWLER_UPSTREAM',502);
    return readBounded(response);
  }
}
async function discoverStore(input, options={}) {
  const targets=validateTargets(input?.storeUrl,input?.pageUrl);
  const result={storeUrl:targets.storeUrl,brandName:'',marketplace:targets.marketplace.replace(/^amazon\./,''),pages:[],warnings:[]};
  const page={url:targets.pageUrl,name:'',pageId:storeTarget(targets.pageUrl).pageId,asins:[],status:'error'};
  const controller=new AbortController();let timer;
  try {
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Store discovery timed out; retry or continue manually.'));},options.timeoutMs??LIMITS.timeoutMs);});
    const html=await Promise.race([(options.crawl||crawlPage)(targets.pageUrl,controller.signal),timeout]);
    if(!html || /<title[^>]*>\s*(?:robot check|amazon captcha)/i.test(html) || /validateCaptcha|automated access to Amazon/i.test(html))throw new Error('Amazon blocked this page; retry or continue manually.');
    const observed=parseStorePage(html,targets.pageUrl);
    if(!input.pageUrl && !observed.brandName && !observed.pages.length) throw new Error('In der Antwort wurde kein Amazon Brand Store erkannt. Bitte den Store-Link prüfen und erneut einlesen.');
    result.brandName=observed.brandName;result.warnings=observed.warnings;
    Object.assign(page,{name:observed.pageName,asins:observed.asins,status:'loaded'});
    result.pages=[page];
    if(!input.pageUrl)for(const nav of observed.pages)if(nav.url!==page.url && result.pages.length<LIMITS.pages)result.pages.push({...nav,asins:[],status:'pending'});
  }catch(error){page.error=error.message || 'Der Store konnte nicht gelesen werden. Bitte erneut versuchen.';result.pages=[page];result.warnings=[page.error];if(error.code){result.errorCode=error.code;result.httpStatus=error.status || 502;}}
  finally{clearTimeout(timer);}
  return result;
}
module.exports={LIMITS,storeTarget,validateTargets,parseStorePage,discoverStore,crawlPage};
