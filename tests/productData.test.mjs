import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';

const require=createRequire(import.meta.url), root=resolve('.');
let temp,data,handler,AsinPanel;
const PARENT='B000000001', CHILD='B000000002', OTHER='B000000003';
before(async()=>{
 temp=await mkdtemp(join(root,'.product-data-'));
 await build({entryPoints:[join(root,'src/productData.js')],outfile:join(temp,'data.mjs'),bundle:true,format:'esm',platform:'node'});
 data=await import(pathToFileURL(join(temp,'data.mjs')));
 await build({entryPoints:[join(root,'src/components/AsinPanel.jsx')],outfile:join(temp,'panel.mjs'),bundle:true,format:'esm',platform:'node',jsx:'automatic',packages:'external'});
 ({default:AsinPanel}=await import(pathToFileURL(join(temp,'panel.mjs'))));
 const original=process.env.BRIGHT_DATA_API_KEY;
 process.env.BRIGHT_DATA_API_KEY='synthetic-test-key';
 handler=require('../api/amazon-search.js');
 if(original===undefined)delete process.env.BRIGHT_DATA_API_KEY;else process.env.BRIGHT_DATA_API_KEY=original;
});
after(async()=>rm(temp,{recursive:true,force:true}));
async function server(raw,asins=[PARENT]){
 const saved=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify(raw),{status:200});
 let result,status;
 const res={setHeader(){},status(n){status=n;return this;},json(v){result=v;return this;}};
 try{await handler({method:'POST',body:{asins,domain:'https://www.amazon.de'}},res);return {status,...result};}
 finally{globalThis.fetch=saved;}
}
const record=(asin=CHILD,input=PARENT)=>({asin,parent_asin:PARENT,input:{url:'https://www.amazon.de/dp/'+input},title:'Testprodukt',image:'https://images.test/product.jpg',final_price:12.99,rating:4.5});

test('ASIN overview counts requested complete identities, excluding duplicate and unused child cache records',()=>{
 const products=[PARENT,PARENT,CHILD].map(asin=>({asin,image:'https://images.test/a.jpg',price:12}));
 const dom=new JSDOM(renderToStaticMarkup(React.createElement(AsinPanel,{asins:[{asin:PARENT},{asin:OTHER}],pages:[{name:'Home',sections:[{tiles:[{asins:[PARENT,OTHER]}]}]}],products,uiLang:'de'})));
 try{assert.deepEqual([...dom.window.document.querySelectorAll('.asin-stat b')].slice(0,2).map(n=>Number(n.textContent)),[2,1]);}
 finally{dom.window.close();}
});
test('switching stores cannot add ASINs from a previous store request to the next scrape',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://builder.test/'});
 const previous={window:globalThis.window,document:globalThis.document};
 Object.assign(globalThis,{window:dom.window,document:dom.window.document});
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const app=createRoot(document.getElementById('root')),calls=[];
 try{
  await act(async()=>app.render(React.createElement(AsinPanel,{asins:[{asin:PARENT}],pages:[],products:[],requestedAsins:[CHILD],uiLang:'de',onScrape:async list=>{calls.push(list);return {success:0,failed:1,failures:[{asin:PARENT,reason:'404'}]};}})));
  const button=[...document.querySelectorAll('button')].find(b=>b.textContent==='Produktdaten laden');
  await act(async()=>button.click());
  assert.deepEqual(calls,[[PARENT]]);
 }finally{
  await act(async()=>app.unmount());dom.window.close();Object.assign(globalThis,previous);delete globalThis.IS_REACT_ACT_ENVIRONMENT;
 }
});

test('parent requests retain their identity and the returned child is recorded separately',async()=>{
 const r=await server([record()]);assert.equal(r.status,200);
 assert.equal(r.products[0].asin,PARENT);assert.equal(r.products[0].resolvedAsin,CHILD);
 assert.deepEqual(r.failed,[]);
});
test('out-of-order provider results map by original request, never array position',async()=>{
 const r=await server([record(OTHER,OTHER),record()], [PARENT,OTHER]);
 assert.deepEqual(r.products.map(p=>p.asin),[OTHER,PARENT]);
});
test('a redirect to an unrelated child is not silently substituted',async()=>{
 const raw=record(CHILD,OTHER);
 const r=await server([raw],[OTHER]);
 assert.equal(r.products.length,0);assert.equal(r.failed[0].asin,OTHER);
 assert.match(r.failed[0].reason,/ASIN|Variante/);
});
test('provider 404 reasons stay associated with the requested ASIN',async()=>{
 const r=await server([{input:{url:'https://www.amazon.de/dp/'+PARENT},error:'The navigation resulted in a dead page (404 status code)'}]);
 assert.equal(r.failed[0].asin,PARENT);assert.match(r.failed[0].reason,/404/);
});
test('missing product images are failed records, not loaded products',async()=>{
 const r=await server([{...record(PARENT),image:'',image_url:''}]);
 assert.equal(r.products.length,0);assert.equal(r.failed[0].asin,PARENT);
});
test('large failed batches preserve the actual API error for every requested ASIN',async()=>{
 const asins=Array.from({length:25},(_,i)=>'B'+String(i).padStart(9,'0')),saved=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'Bright Data error (HTTP 403)',hint:'Zugang abgelehnt'}),{status:403});
 try{
  const r=await data.fetchProductData(asins,'de');
  assert.equal(r.products.length,0);assert.equal(r.failed.length,25);
  assert.equal(r.failures.length,25);assert.match(r.failures[0].reason,/403.*Zugang abgelehnt/);
 }finally{globalThis.fetch=saved;}
});
test('only unique, complete, requested products count as loaded and individual reasons survive',async()=>{
 const saved=globalThis.fetch;
 const valid={asin:PARENT,image:'https://images.test/a.jpg',price:12};
 globalThis.fetch=async()=>new Response(JSON.stringify({products:[valid,valid,{asin:CHILD,image:'',price:null},{asin:OTHER,image:'https://images.test/c.jpg',price:1}],failed:[{asin:CHILD,reason:'Produktseite 404'}]}));
 try{
  const r=await data.fetchProductData([PARENT,CHILD],'de');
  assert.deepEqual(r.products,[valid]);assert.deepEqual(r.failed,[CHILD]);
  assert.match(r.failures[0].reason,/404/);
 }finally{globalThis.fetch=saved;}
});
