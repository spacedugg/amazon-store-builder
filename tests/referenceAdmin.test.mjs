import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {zipSync} from 'fflate';
import {unpackStoryZip,storyFromZip} from '../src/brandStoryZip.mjs';
import {mergeReferenceCatalog,homepageScreenshot} from '../src/storeReferences.mjs';
const require=createRequire(import.meta.url),{verifyAdmin}=require('../api/_lib/reference-admin.cjs'),{target,pngSize,captureReference}=require('../api/_lib/reference-capture.cjs');
const url='https://www.amazon.de/stores/Test/page/11111111-2222-3333-4444-555555555555';
const secret='test-secret-'.repeat(4);
function ticket(payload){const body=Buffer.from(JSON.stringify(payload)).toString('base64url');return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');}
test('reference writes require a short-lived signed HQ admin ticket',()=>{
 const payload={sub:'admin@example.test',role:'admin',iat:1000,exp:1120};
 const request=data=>({headers:{authorization:'Bearer '+ticket(data)}});
 assert(verifyAdmin(request(payload),secret,1010));
 assert(!verifyAdmin(request({...payload,role:'member'}),secret,1010));
 assert(!verifyAdmin(request(payload),secret,1121));
 assert(!verifyAdmin(request({...payload,exp:1500}),secret,1010));
 assert(!verifyAdmin(request(payload),'wrong-key'.repeat(5),1010));
 assert(!verifyAdmin({headers:{}},secret,1010));
});
test('capture targets exclude SSRF, product pages and tracking; binary output must be a real PNG',()=>{
 assert.equal(target(url+'?tracking=x').url,url);
 for(const input of ['https://amazon.de.evil.test/stores/page/a','https://www.amazon.de@localhost/stores/page/a','http://www.amazon.de/stores/page/a','https://www.amazon.de/dp/B012345678'])assert.throws(()=>target(input));
 assert.throws(()=>pngSize(Buffer.from('<html>Error</html>')));
});
test('ZIP grouping uses original files and never treats previews as assets or invents product destinations',()=>{
 const files={'Neu/Background/desktop.jpg':new Uint8Array([1]),'Neu/Background/mobile.jpg':new Uint8Array([1]),'Neu/Brand Media Assets/Brand Image 0.jpg':new Uint8Array([1]),'Neu/Preview/Preview 1.jpg':new Uint8Array([1])};
 for(let i=1;i<=8;i++)files[`Neu/ASIN Grids/Product Image ${i}.jpg`]=new Uint8Array([1]);
 const plan=unpackStoryZip(zipSync(files));assert.equal(plan.candidates.length,3);assert.equal(plan.previews.length,1);
 assert(plan.candidates[1].files[3].endsWith('4.jpg'));assert(plan.candidates[2].files[0].endsWith('5.jpg'));
 const images=Object.fromEntries(plan.entries.map(entry=>[entry.path,{url:'https://example.com/'+encodeURIComponent(entry.path),width:1328,height:1456,size:1}]));
 const story=storyFromZip(plan,images,{brandName:'VITAWORLD',cards:[{id:'grid-1',headline:'Produkte'},{id:'media-0'},{id:'grid-0',headline:'Angebote',gridMode:'composite'}]});
 assert.equal(story.cards[0].type,'grid');assert.equal(story.cards[2].gridMode,'composite');assert.equal(new Set(story.cards.map(card=>card.fileKey)).size,3);
 assert(story.cards[0].slots.every(slot=>slot.asin===''&&slot.url===''&&slot.imageMode==='custom'));
 assert.throws(()=>storyFromZip(plan,images,{cards:[{id:'media-0'}]}),/unvollständig/);
 files['../evil.jpg']=new Uint8Array([1]);assert.throws(()=>unpackStoryZip(zipSync(files)),/Pfad/);
});
test('captures supplement built-in references while preserving archived motifs and reference identity',()=>{
 const old={brandName:'Example',storeUrl:url,images:[{url:'/archive.jpg'}]};
 const screenshot={url:'https://example.com/home.png',width:1440,height:9000,capturedAt:new Date().toISOString(),sourceUrl:url,fullPage:true};
 const rows=mergeReferenceCatalog([old],[{storeUrl:url+'?x=y',captureStatus:'ready',homepageScreenshot:screenshot}]);
 assert.equal(rows.length,1);assert.equal(rows[0].images[0].url,'/archive.jpg');assert.deepEqual(homepageScreenshot(rows[0]),screenshot);
 assert.equal(homepageScreenshot({...rows[0],homepageScreenshot:{...screenshot,height:16384}}).truncated,true);
 const home=url.replace('11111111','99999999');const redirected=mergeReferenceCatalog([old],[{storeUrl:url,captureStatus:'ready',alternativeUrls:[home],homepageScreenshot:{...screenshot,sourceUrl:home}}]);assert(homepageScreenshot(redirected[0]));
});
test('capture API rejects unauthorized changes and retains the previous screenshot when a refresh fails',async()=>{
 const {createClient}=await import('@libsql/client');const db=createClient({url:':memory:'});
 const dbPath=require.resolve('../api/_db.js'),capturePath=require.resolve('../api/_lib/reference-capture.cjs'),handlerPath=require.resolve('../api/store-reference-captures.js');
 const oldDb=require.cache[dbPath],oldCapture=require.cache[capturePath],oldSecret=process.env.STORE_REFERENCE_ADMIN_SECRET;
 process.env.STORE_REFERENCE_ADMIN_SECRET=secret;
 const screenshot={url:'https://example.com/store.png',width:1440,height:9000,capturedAt:new Date().toISOString(),sourceUrl:url,fullPage:true};let fail=false;
 require.cache[dbPath]={exports:{getClient:()=>db}};require.cache[capturePath]={exports:{target,captureReference:async()=>{if(fail)throw Error('Provider unavailable');return {brandName:'Verified brand',screenshot};}}};delete require.cache[handlerPath];const handler=require(handlerPath);
 async function call(method,body,authorized=true){const now=Math.floor(Date.now()/1000),res={code:200,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};await handler({method,body,headers:authorized?{authorization:'Bearer '+ticket({sub:'admin@example.test',role:'admin',iat:now,exp:now+120})}:{}},res);return res;}
 try{
 assert.equal((await call('POST',{url},false)).code,403);
 assert.equal((await call('POST',{url})).code,200);
 assert.equal((await call('GET')).body.stores[0].brandName,'Verified brand');
 fail=true;const result=await call('POST',{url});assert.equal(result.code,502);assert.equal(result.body.store.captureStatus,'failed');assert.deepEqual(result.body.store.homepageScreenshot,screenshot);
 assert.equal((await call('GET')).body.stores.length,1);
 }finally{db.close();require.cache[dbPath]=oldDb;require.cache[capturePath]=oldCapture;delete require.cache[handlerPath];if(oldSecret===undefined)delete process.env.STORE_REFERENCE_ADMIN_SECRET;else process.env.STORE_REFERENCE_ADMIN_SECRET=oldSecret;}
});
test('only complete original-page captures replace the previous picture',async()=>{
 const bytes=Buffer.alloc(33);Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);bytes.write('IHDR',12);bytes.writeUInt32BE(1440,16);bytes.writeUInt32BE(18000,20);
 let uploads=0;
 const quality={imagesComplete:true,imageCount:20,scrollPasses:2,documentHeight:18000};
 const result=await captureReference(url,{load:async()=>'<meta name="brand" content="Example">',captureOriginalPage:async()=>({bytes,quality}),put:async()=>{uploads++;return {url:'https://example.com/captured.png'};}});
 assert.equal(result.screenshot.fullPage,true);assert.equal(result.screenshot.captureEngine,'original-html-scroll-v1');assert.deepEqual(result.screenshot.quality,quality);
 await assert.rejects(()=>captureReference(url,{load:async()=>'<meta name="brand" content="Example">',captureOriginalPage:async()=>{throw Error('Unloaded');},put:async()=>uploads++}),/Unloaded/);assert.equal(uploads,1);
});

test('ZIP image recognition switches to the configured OpenAI vision key when Gemini rejects billing',async()=>{
 const {analyzeZipImages}=require('../api/_lib/story-zip-vision.cjs');
 const previous=[process.env.GEMINI_API_KEY,process.env.CHATGPT_API_KEY];process.env.GEMINI_API_KEY='gemini-test';process.env.CHATGPT_API_KEY='openai-test';const calls=[];
 try{
 const result=await analyzeZipImages([{text:'Return JSON'},{inlineData:{mimeType:'image/jpeg',data:'dGVzdA=='}}],new AbortController().signal,async(url,options)=>{
 calls.push({url,body:JSON.parse(options.body)});
 return calls.length===1?new Response('{}',{status:402}):Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({brandName:'Brand',cards:[]})}]}]});
 });
 assert.equal(result.brandName,'Brand');assert.equal(calls.length,2);assert.equal(calls[1].body.store,false);assert.equal(calls[1].body.input[0].content[1].type,'input_image');
 }finally{for(const[i,key]of['GEMINI_API_KEY','CHATGPT_API_KEY'].entries()){if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];}}
});

test('overlapping previews determine the order; thematic model order cannot move grids behind the next intro',()=>{
 const {observedCardOrder}=require('../api/_lib/story-zip-order.cjs');const candidates=['m0','g0','m1','m2','g1','m3'].map(id=>({id}));
 const result={cards:[...candidates].reverse(),pages:[{previewIndex:1,visibleCards:['m0','g0','m1']},{previewIndex:2,visibleCards:['m1','m2','g1','m3']}]};
 assert.deepEqual(observedCardOrder(result,candidates,2).map(card=>card.id),['m0','g0','m1','m2','g1','m3']);
 assert.throws(()=>observedCardOrder({...result,pages:[{previewIndex:1,visibleCards:['m0','g0']},{previewIndex:2,visibleCards:['m1','m2','g1','m3']}]},candidates,2),/nicht eindeutig/);
 assert.throws(()=>observedCardOrder({...result,pages:[{previewIndex:1,visibleCards:['m0','g0','m1']},{previewIndex:2,visibleCards:['m1','m0','m2','g1','m3']}]},candidates,2),/nicht eindeutig/);
});
