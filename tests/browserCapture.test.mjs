import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {verifiedHomepageScreenshot,homepageScreenshot} from '../src/storeReferences.mjs';
const {browserEndpoint,assertReady,settlePage}=createRequire(import.meta.url)('../api/_lib/browser-capture.cjs');
test('unloaded image slots, skeletons, empty pages and excessive height never pass quality validation',()=>{
 const good={images:20,missing:0,skeletons:0,height:18000,width:1440};assertReady(good);
 for(const patch of [{images:0},{missing:1},{skeletons:1},{height:100000}])assert.throws(()=>assertReady({...good,...patch}));
});
test('capture scrolls the complete page at least twice and checks stability before returning to the top',async()=>{
 const positions=[];const page={evaluate:async(fn,arg)=>{if(fn.name==='pageReadiness')return {height:2100,width:1440,images:4,missing:0,skeletons:0};positions.push(arg??0);}};
 const state=await settlePage(page,{pause:async()=>{}});
 assert.equal(state.scrollPasses,2);assert.equal(positions.filter(y=>y===2100).length,2);assert.equal(positions.at(-1),0);
 const broken={evaluate:async(fn)=>fn.name==='pageReadiness'?{height:2100,width:1440,images:4,missing:2,skeletons:0}:undefined};
 await assert.rejects(()=>settlePage(broken,{pause:async()=>{}}),/ungeladene/);
});
test('no capture request creates a provider zone when Browser API is not configured',async()=>{
 const saved=[process.env.BRIGHTDATA_BROWSER_ENDPOINT,process.env.BRIGHT_DATA_API_KEY];delete process.env.BRIGHTDATA_BROWSER_ENDPOINT;process.env.BRIGHT_DATA_API_KEY='test';
 const calls=[];
 try{await assert.rejects(()=>browserEndpoint(async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify([{name:'amz_brand_store_studio',type:'unblocker'}]));}),/einmalig aktiviert/);assert.equal(calls.length,1);assert.equal(calls[0].options.method,undefined);assert.match(calls[0].url,/get_active_zones$/);}
 finally{for(const [i,key]of ['BRIGHTDATA_BROWSER_ENDPOINT','BRIGHT_DATA_API_KEY'].entries()){if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i];}}
});
test('only a checked scrolling capture removes the gallery warning; long verified images are not mislabeled as truncated',()=>{
 const url='https://www.amazon.de/stores/page/11111111-2222-3333-4444-555555555555';
 const image={url:'https://example.com/capture.png',sourceUrl:url,width:1440,height:20000,capturedAt:new Date().toISOString(),fullPage:true,captureEngine:'browser-scroll-v1',quality:{imagesComplete:true,imageCount:14,scrollPasses:2,documentHeight:20000}};
 assert(verifiedHomepageScreenshot(image));assert(!homepageScreenshot({storeUrl:url,homepageScreenshot:image}).truncated);
 assert(!verifiedHomepageScreenshot({...image,quality:{...image.quality,documentHeight:30000}}));assert(!verifiedHomepageScreenshot({...image,captureEngine:undefined}));
});
