import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const load = () => require('../api/_lib/brand-story-discovery.cjs');
const root = 'https://www.amazon.de/stores/Example/page/11111111-1111-1111-1111-111111111111';
const category = 'https://www.amazon.de/stores/Example/page/22222222-2222-2222-2222-222222222222';
const fixture = `<meta name="brand" content="Example"><script>var config = ${JSON.stringify({content:{nav:{one:{href:root,title:'Home',asin:'B000000099'},two:{href:category,title:'Tools'},bad:{title:'Missing URL'}}}})};</script><script>var config = ${JSON.stringify({widgetType:'ProductGrid',content:{asins:['B000000001','B000000001'],items:[{asin:'B000000002'},{productURL:'https://www.amazon.de/dp/B000000003'}],nav:{asins:['B000000099']}}})};</script>`;

test('validates Amazon Store targets and rejects SSRF and cross-store requests', () => {
  const { validateTargets } = load();
  assert.equal(validateTargets(root + '?ref=x').storeUrl, root);
  for (const url of ['http://www.amazon.de/stores/a','https://amazon.de.evil.test/stores/a','https://127.0.0.1/stores/a','https://user@www.amazon.de/stores/a','https://www.amazon.de:443/stores/a',root+'#fragment','https://www.amazon.de/dp/B000000001','https://www.amazon.de/stores/../dp/x']) assert.throws(() => validateTargets(url));
  assert.throws(() => validateTargets(root, 'https://www.amazon.com/stores/Example/page/x'));
  assert.throws(() => validateTargets(root, 'https://www.amazon.de/stores/Other/page/x'));
});

test('extracts actual category membership and partial navigation deterministically', () => {
  const { parseStorePage } = load();
  const result = parseStorePage(fixture, root);
  assert.deepEqual(result.asins, ['B000000001','B000000002','B000000003']);
  assert.equal(result.brandName, 'Example');
  assert.equal(result.pages.find(p => p.url === category).name, 'Tools');
  assert.equal(result.pages.length, 2);
});

test('fallback links exclude navigation and scripts; no config stays manually repairable', () => {
  const { parseStorePage } = load();
  const result = parseStorePage(`<nav><a href="/dp/B000000099">Nav</a></nav><script>"/dp/B000000088"</script><main><a href="/dp/B000000004">Product</a><a href="${category}">Tools</a></main>`, root);
  assert.deepEqual(result.asins,['B000000004']);
  assert.equal(result.brandName,'');
  assert.ok(result.warnings.length);
});

test('initial discovery fetches one page; progressive request returns only its observation', async () => {
  const { discoverStore } = load();
  const calls=[];
  const crawl = async url => { calls.push(url); return fixture; };
  const initial = await discoverStore({storeUrl:root},{crawl});
  assert.equal(initial.pages.find(p => p.url===root).status,'loaded');
  assert.equal(initial.pages.find(p => p.url===category).status,'pending');
  const progressive = await discoverStore({storeUrl:root,pageUrl:category},{crawl});
  assert.equal(progressive.pages.length,1);
  assert.equal(progressive.pages[0].url,category);
  assert.deepEqual(calls,[root,category]);
});

test('blocked and timed out crawls remain visible retryable errors', async () => {
  const { discoverStore } = load();
  for (const crawl of [async () => {throw new Error('Crawler HTTP 403');}, async () => new Promise(()=>{})]) {
    const result=await discoverStore({storeUrl:root},{crawl,timeoutMs:10});
    assert.equal(result.pages[0].status,'error');
    assert.ok(result.warnings.length);
  }
});

test('bounds page, product and HTML input sizes', () => {
  const { parseStorePage, LIMITS }=load();
  assert.throws(()=>parseStorePage('x'.repeat(LIMITS.htmlBytes+1),root),/large/i);
  const asins=Array.from({length:LIMITS.products+10},(_,i)=>`B${String(i).padStart(9,'0')}`);
  const result=parseStorePage(`<script type="application/json">${JSON.stringify({content:{asins}})}</script>`,root);
  assert.equal(result.asins.length,LIMITS.products);
  assert.ok(result.warnings.length);
});

test('fallback excludes navigation containers and limits total returned pages', async () => {
  const { parseStorePage, discoverStore, LIMITS }=load();
  const links=Array.from({length:LIMITS.pages+10},(_,i)=>`<a href="https://www.amazon.de/stores/Example/page/${i}">Page ${i}</a>`).join('');
  assert.deepEqual(parseStorePage('<div class="store-navigation"><a href="/dp/B000000099">Nav product</a></div><a href="/dp/B000000005">Product</a>',root).asins,['B000000005']);
  const result=await discoverStore({storeUrl:root},{crawl:async()=>`<nav>${links}</nav>`});
  assert.ok(result.pages.length<=LIMITS.pages);
  assert.ok(result.warnings.some(w=>/limit/i.test(w)));
});

test('handler rejects methods and invalid targets before any crawler access', async () => {
  const handler=require('../api/brand-story-discover.js');
  const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;},end(){return this;}});
  let res=response();await handler({method:'GET'},res);assert.equal(res.code,405);
  res=response();await handler({method:'POST',body:{storeUrl:'https://evil.test/stores/a'}},res);assert.equal(res.code,400);
});

test('crawler rejects oversized streamed responses and sends only canonical selected URL', async () => {
  const { discoverStore, LIMITS }=load();
  const originalFetch=globalThis.fetch;
  const originalToken=process.env.BRIGHTDATA_UNLOCKER_TOKEN;
  process.env.BRIGHTDATA_UNLOCKER_TOKEN='fixture-token';
  try {
    let called;
    globalThis.fetch=async (url,options)=>{
      called={url,options};
      return new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(LIMITS.htmlBytes+1));controller.close();}}));
    };
    const result=await discoverStore({storeUrl:root+'?ref=tracking',pageUrl:category+'?ref=tracking'});
    assert.equal(result.pages[0].status,'error');
    assert.match(result.warnings[0],/large/i);
    assert.equal(called.url,'https://api.brightdata.com/request');
    assert.equal(JSON.parse(called.options.body).url,category);
    assert.equal(called.options.redirect,'error');
  } finally {
    globalThis.fetch=originalFetch;
    if(originalToken===undefined)delete process.env.BRIGHTDATA_UNLOCKER_TOKEN;else process.env.BRIGHTDATA_UNLOCKER_TOKEN=originalToken;
  }
});

test('missing crawler configuration returns actionable page observation without network access', async () => {
  const handler=require('../api/brand-story-discover.js');
  const originalToken=process.env.BRIGHTDATA_UNLOCKER_TOKEN, originalKey=process.env.BRIGHT_DATA_API_KEY;
  delete process.env.BRIGHTDATA_UNLOCKER_TOKEN;delete process.env.BRIGHT_DATA_API_KEY;
  try {
    const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
    await handler({method:'POST',body:{storeUrl:category}},res);
    assert.equal(res.code,503);
    assert.equal(res.body.pages[0].status,'error');
    assert.equal(res.body.pages[0].url,category);
    assert.equal(res.body.pages[0].name,'');
    assert.match(res.body.warnings[0],/configured/i);
  } finally {
    if(originalToken!==undefined)process.env.BRIGHTDATA_UNLOCKER_TOKEN=originalToken;
    if(originalKey!==undefined)process.env.BRIGHT_DATA_API_KEY=originalKey;
  }
});

test('commented markup and navigation metadata cannot invent product membership', () => {
  const { parseStorePage }=load();
  const html='<!-- <a href="/dp/B000000098">Old product</a> --><div class="storeNavigation"><a href="/dp/B000000099">Navigation</a></div><a href="/dp/B000000006">Shown product</a>';
  assert.deepEqual(parseStorePage(html,root).asins,['B000000006']);
});

test('discovery uses builder marketplace codes and exposes per-page errors', async () => {
  const { discoverStore, validateTargets }=load();
  const loaded=await discoverStore({storeUrl:root},{crawl:async()=>fixture});
  assert.equal(loaded.marketplace,'de');
  for(const suffix of ['ca','com.mx','in','com.au'])assert.throws(()=>validateTargets(`https://www.amazon.${suffix}/stores/Example/page/a`));
  const failed=await discoverStore({storeUrl:root},{crawl:async()=>{throw new Error('Blocked fixture');}});
  assert.equal(failed.pages[0].error,'Blocked fixture');
});

test('fallback discovers only navigation Store links and current-page self links', () => {
  const { parseStorePage }=load();
  const third='https://www.amazon.de/stores/Example/page/33333333-3333-3333-3333-333333333333';
  const result=parseStorePage(`<nav><a href="${category}">Tools</a></nav><main><a href="${third}">Promotional category crosslink</a><a href="${root}">Current category</a></main>`,root);
  assert.deepEqual(result.pages.map(page=>page.url),[category,root]);
});
