import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';

test('a render crash shows recovery instead of an empty page and keeps the last local draft',async()=>{
 const dir=await mkdtemp(join(resolve('.'),'.render-recovery-'));
 const dom=new JSDOM('<div id="root"></div>',{url:'https://builder.test/'});
 const previous={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage};
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const draft={brandName:'Testmarke',pages:[{id:'home',sections:[]}],products:[]};
 localStorage.setItem('amazon-store-builder-autosave',JSON.stringify(draft));
 const app=createRoot(document.getElementById('root')),log=console.error;console.error=()=>{};
 try{
  await build({entryPoints:[resolve('src/components/RenderErrorBoundary.jsx')],outfile:join(dir,'recovery.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic'});
  const {default:Boundary}=await import(pathToFileURL(join(dir,'recovery.mjs')));
  function Broken(){throw Error('Simulierter Darstellungsfehler');}
  await act(async()=>app.render(React.createElement(Boundary,{editor:true},React.createElement(Broken))));
  assert.match(document.querySelector('[role="alert"]').textContent,/Ansicht/);
  assert.match(document.body.textContent,/Simulierter Darstellungsfehler/);
  assert([...document.querySelectorAll('button')].some(b=>b.textContent.includes('Sicherung')));
  assert.deepEqual(JSON.parse(localStorage.getItem('amazon-store-builder-autosave')),draft);
 }finally{
  await act(async()=>app.unmount());console.error=log;dom.window.close();
  Object.assign(globalThis,previous);delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  await rm(dir,{recursive:true,force:true});
 }
});
