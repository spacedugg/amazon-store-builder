import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let temp, App, productData, storage, storePatch;
const ASIN = 'B0DGGYBSLR';
const stubStorage = `
export async function saveStore(...args){globalThis.__saveTest.saves.push(args);if(globalThis.__saveTest.saveGate)await globalThis.__saveTest.saveGate;if(globalThis.__saveTest.error)throw Error(globalThis.__saveTest.error);return {id:'jowo',shareToken:'existing-link'};}
export async function loadSavedStores(){return [];}
export async function loadStore(){return {data:globalThis.__saveTest.fixture,shareToken:'existing-link'};}
export function getSessionStore(){return {storeId:'jowo',shareToken:'existing-link'};}
export function autoSave(store){globalThis.__saveTest.backups.push(store);}
export function loadAutoSave(){return null;}
export function setSessionStore(){}
export function brandToSlug(){return 'jowo';}
export function shareBaseUrl(){return 'https://preview.test';}
export async function importStoreByShareLink(){}
`;
before(async () => {
  temp = await mkdtemp(join(rootDir, '.save-regression-'));
  await build({
    entryPoints:[join(rootDir,'src/App.jsx')], outfile:join(temp,'app.mjs'), bundle:true, platform:'node', format:'esm', jsx:'automatic', packages:'external', external:['react','react/jsx-runtime'],
    plugins:[{name:'isolate-editor-services',setup(build){
      build.onResolve({filter:/^\.\/components\//}, args=>({path:args.path,namespace:'component-stub'}));
      build.onLoad({filter:/.*/,namespace:'component-stub'}, args=>{
        const name=args.path.split('/').at(-1);
        return {contents:`import React from 'react'; export default function Component(props){globalThis.__saveTest.components['${name}']=props;return React.createElement('div',{'data-component':'${name}'});}`,loader:'js'};
      });
      build.onResolve({filter:/^\.\/(storage|imageStorage|exportBriefing|briefingImport|feedbackApi)$/}, args=>({path:args.path,namespace:'service-stub'}));
      build.onLoad({filter:/.*/,namespace:'service-stub'}, args=>({contents:args.path==='./storage'?stubStorage:args.path==='./feedbackApi'?'export async function loadFeedback(){return {neu:0}}':args.path==='./imageStorage'?'export async function uploadFileToBlob(){}':args.path==='./exportBriefing'?'export function generateBriefingDocx(){} export function downloadBlob(){}':'export function importBriefingToStore(data){return data;} export function importPageFromBriefing(){} export function importSectionFromBriefing(){} export function importTileFromBriefing(){}',loader:'js'}));
    }}],
  });
  ({default:App}=await import(pathToFileURL(join(temp,'app.mjs'))));
  for(const name of ['productData','storage','storePatch']){
    await build({entryPoints:[join(rootDir,'src/'+name+'.js')],outfile:join(temp,name+'.mjs'),bundle:true,platform:'node',format:'esm',packages:'external'});
  }
  productData=await import(pathToFileURL(join(temp,'productData.mjs')));
  storage=await import(pathToFileURL(join(temp,'storage.mjs')));
  storePatch=await import(pathToFileURL(join(temp,'storePatch.mjs')));
});
after(async()=>{await rm(temp,{recursive:true,force:true});});

function fixture(used=false){return {
  brandName:'JOWO',marketplace:'de',asins:[ASIN],products:[],
  pages:[{id:'home',name:'Startseite',sections:[{id:'section',layoutId:'full',tiles:[{
    id:'tile',type:used?'product_grid':'image',asins:used?[ASIN]:[],
    uploadedImage:'https://images.test/edited-desktop.webp',uploadedImageMobile:'https://images.test/edited-mobile.webp',
  }]}]}],
};}

test('batch load reports only usable products and preserves real reasons through saving',async()=>{
  const store=fixture(true);
  const asins=Array.from({length:25},(_,i)=>'B'+String(i).padStart(9,'0'));
  store.asins=asins;store.pages[0].sections[0].tiles[0].asins=asins;
  await withEditor(store,null,async state=>{
    globalThis.fetch=async(url,opts)=>{
      const requested=JSON.parse(opts.body).asins;
      return {ok:true,json:async()=>({products:requested.includes(asins[0])?[{asin:asins[0],image:'https://images.test/a.jpg',price:12,name:'Produkt'}]:[],failed:requested.filter(a=>a!==asins[0]).map(asin=>({asin,reason:'Produktseite nicht gefunden (404)'}))})};
    };
    await act(async()=>state.components.Topbar.onLoadProducts());
    const result=state.components.LinkDialog.dialog;
    assert.match(result.message,/1 von 25 ASINs geladen/);
    assert.match(result.message,/404/);
    await act(async()=>state.components.LinkDialog.onClose());
    await act(async()=>state.components.Topbar.onSave());
    assert.equal(state.saves[0][0].products.length,1);
    assert.deepEqual(state.alerts,[]);
    assert(state.components.Canvas,'Editor stays mounted after save');
  });
});

test('removed grid ASIN remains in catalog but is not reported as missing preview data',()=>{
  const store=fixture();
  assert.deepEqual(productData.missingProductAsins(store),[ASIN]);
  assert.deepEqual(productData.missingUsedProductAsins(store),[]);
  assert.equal(productData.productDataWarning(store),'');
  assert.deepEqual(store.asins,[ASIN]);
});

test('actual grids, links, hotspots and selectors still report missing product data',()=>{
  const store=fixture(true),tile=store.pages[0].sections[0].tiles[0];
  tile.linkAsin='B012345678';tile.hotspots=[{asin:'b098765432'}];tile.productSelector={asins:['B123456789'],products:[{asin:'B123456780'}]};
  assert.deepEqual(productData.missingUsedProductAsins(store),[ASIN,'B012345678','B098765432','B123456789','B123456780']);
  assert.match(productData.productDataWarning(store),/Änderungen können trotzdem gespeichert werden/);
});

async function withEditor(store,error,run){
  const dom=new JSDOM('<div id="root"></div>',{url:'https://builder.test/'});
  const saved={window:globalThis.window,document:globalThis.document,alert:globalThis.alert,fetch:globalThis.fetch};
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const state={fixture:store,error,saves:[],components:{},alerts:[],backups:[],fetches:[]};globalThis.__saveTest=state;
  globalThis.alert=m=>state.alerts.push(m);
  globalThis.fetch=async url=>{state.fetches.push(url);throw Error('Product service unavailable');};
  const root=createRoot(dom.window.document.getElementById('root'));
  try{await act(async()=>{root.render(React.createElement(App));});assert(state.components.Topbar);await run(state,dom);}
  finally{await act(async()=>root.unmount());dom.window.close();Object.assign(globalThis,saved);delete globalThis.__saveTest;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
}

for(const used of [false,true]){
  test('manual save and return to overview preserve edits with '+(used?'missing used product':'removed catalog ASIN'),async()=>{
    await withEditor(fixture(used),null,async(state,dom)=>{
      await act(async()=>state.components.Canvas.onSelect({sid:'section',ti:0}));
      await act(async()=>state.components.PropertiesPanel.onChange({...state.components.PropertiesPanel.tile,
        uploadedImage:'https://images.test/new-desktop-edit.webp',uploadedImageMobile:'https://images.test/new-mobile-edit.webp'}));
      await act(async()=>state.components.Topbar.onSave());
      assert.equal(state.saves.length,1);
      assert.equal(state.saves[0][0].pages[0].sections[0].tiles[0].uploadedImage,'https://images.test/new-desktop-edit.webp');
      assert.equal(state.saves[0][0].pages[0].sections[0].tiles[0].uploadedImageMobile,'https://images.test/new-mobile-edit.webp');
      assert.deepEqual(state.saves[0][0].asins,[ASIN]);assert.equal(state.saves[0][1],'jowo');assert.equal(state.saves[0][2],'existing-link');
      assert.equal(state.saves[0][4],true,'Image upload protection must stay enabled');
      assert(state.components.LinkDialog.dialog.message.startsWith('Store gespeichert.'));
      assert.equal(state.components.LinkDialog.dialog.message.includes('Hinweis: Produktdaten fehlen'),used);
      assert.deepEqual(state.alerts,[],'Save must not open a native dialog in the embedded editor');
      await act(async()=>state.components.Topbar.onShowStores());
      assert.equal(state.saves.length,2);assert(dom.window.document.querySelector('[data-component="StoreOverview"]'));
      assert.deepEqual(state.fetches,[],'Save and navigation must not call Amazon product lookup');
    });
  });
}

test('real save failures remain errors and do not navigate away',async()=>{
  const originalError=console.error;console.error=()=>{};
  try{await withEditor(fixture(true),'Image upload failed',async(state,dom)=>{
    await act(async()=>state.components.Topbar.onSave());
    assert(state.components.LinkDialog.dialog.message.includes('Speichern fehlgeschlagen'));
    await act(async()=>state.components.Topbar.onShowStores());
    assert(!dom.window.document.querySelector('[data-component="StoreOverview"]'));
    assert(state.components.LinkDialog.dialog.message.includes('Image upload failed'));
  });}finally{console.error=originalError;}
});

for (const invalid of ['duplicate-modules', 'incomplete-collection']) {
  test('invalid '+invalid+' store can return to overview but cannot create a customer preview link',async()=>{
    const store = fixture();
    const tiles = store.pages[0].sections[0].tiles;
    if (invalid === 'duplicate-modules') {
      tiles.push({id:'best1',type:'best_sellers'}, {id:'best2',type:'best_sellers'},
        {id:'grid1',type:'product_grid'}, {id:'grid2',type:'product_grid'});
    } else {
      tiles.push({id:'collection',type:'product_collection',asins:[]});
    }
    await withEditor(store,null,async(state,dom)=>{
      await act(async()=>state.components.Topbar.onShowStores());
      assert(dom.window.document.querySelector('[data-component="StoreOverview"]'), 'Validation must not trap users in the editor');
      assert.equal(state.alerts.some(a=>a.includes('vor dem Verlassen')),false);
    });
    await withEditor(store,null,async(state)=>{
      await act(async()=>state.components.Topbar.onCopyCustomerLink());
      assert.equal(state.components.LinkDialog.dialog.kind,'error');
      assert.equal(state.components.LinkDialog.dialog.url,undefined);
      assert.equal(state.saves.length,0,'Invalid content cannot be published through customer-link creation');
    });
  });
}

test('storage POST preserves edited images and missing ASINs without a product request',async()=>{
  const calls=[],originalFetch=globalThis.fetch;
  globalThis.fetch=async(url,opt)=>{calls.push({url,body:JSON.parse(opt.body)});return {ok:true,json:async()=>({id:'jowo',shareToken:'existing-link'})};};
  try{
    await storage.saveStore(fixture(true),'jowo','existing-link',null,true);
    assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/stores');
    assert.deepEqual(calls[0].body.data.asins,[ASIN]);
    assert.equal(calls[0].body.data.pages[0].sections[0].tiles[0].uploadedImage,'https://images.test/edited-desktop.webp');
  }finally{globalThis.fetch=originalFetch;}
});

test('Claude edits save in the existing shared store and undo restores the full previous edit',async()=>{
  await withEditor(fixture(),null,async(state)=>{
    await act(async()=>state.components.Topbar.onPatchImport());
    const current=state.components.PatchImportModal.store;
    const change={baseRevision:storePatch.makeClaudeContext(current).baseRevision,ops:[{op:'modifyTile',pageId:'home',sectionIdx:0,tileIdx:0,patch:{textOverlay:{heading:'New concise headline'}}}]};
    let summary;await act(async()=>{summary=state.components.PatchImportModal.onApply(change);});
    assert.equal(summary.length,1);
    await act(async()=>state.components.Topbar.onSave());
    assert.equal(state.saves[0][0].pages[0].sections[0].tiles[0].textOverlay.heading,'New concise headline');
    assert.equal(state.saves[0][0].pages[0].sections[0].tiles[0].uploadedImage,'https://images.test/edited-desktop.webp');
    assert.equal(state.saves[0][1],'jowo');assert.equal(state.saves[0][2],'existing-link');
    await act(async()=>state.components.Topbar.onUndo());
    await act(async()=>state.components.Topbar.onSave());
    assert.deepEqual(state.saves[1][0].pages,current.pages);
    assert.equal(state.saves[1][1],'jowo');assert.equal(state.saves[1][2],'existing-link');
  });
});





for (const confirmReplacement of [false, true]) {
  test('same-brand import '+(confirmReplacement?'waits for explicit consent':'cancellation preserves the original store'), async()=>{
    await withEditor(fixture(),null,async state=>{
      const previousConfirm=globalThis.confirm;globalThis.confirm=()=>true;
      try {
        globalThis.fetch=async url=>({ok:true,json:async()=>({existingStore:{id:'jowo',brandName:'JOWO',brandSlug:'jowo',revision:'revision-1'}})});
        await act(async()=>state.components.Topbar.onNewStore());
        const imported={...fixture(),pages:[{id:'new-home',name:'New concept',sections:[]}]};
        let pending;
        await act(async()=>{pending=state.components.NewStoreModal.onImport(imported);await Promise.resolve();});
        assert.equal(state.components.LinkDialog.dialog.kind,'confirm');
        assert.match(state.components.LinkDialog.dialog.message,/JOWO/);
        assert.equal(state.components.Canvas.store.pages[0].id,'home');
        assert.equal(state.saves.length,0);
        await act(async()=>{if(confirmReplacement)state.components.LinkDialog.dialog.onConfirm();else state.components.LinkDialog.onClose();await pending;});
        if(confirmReplacement){
          assert.equal(state.components.Canvas.store.pages[0].id,'new-home');
          await act(async()=>state.components.Topbar.onSave());
          assert.equal(state.saves.length,1);
          assert.equal(state.saves[0][5].revision,'revision-1');
        }else{
          assert.equal(state.components.Canvas.store.pages[0].sections[0].tiles[0].uploadedImage,'https://images.test/edited-desktop.webp');
          assert.equal(state.saves.length,0);
        }
      } finally {globalThis.confirm=previousConfirm;}
    });
  });
}

test('an older in-flight save cannot attach a new import to its old store ID or consume replacement consent',async()=>{
  await withEditor(fixture(),null,async state=>{
    const previousConfirm=globalThis.confirm;globalThis.confirm=()=>true;
    let release;state.saveGate=new Promise(resolve=>{release=resolve;});
    try{
      let previousSave;
      await act(async()=>{previousSave=state.components.Topbar.onSave();await Promise.resolve();});
      globalThis.fetch=async()=>({ok:true,json:async()=>({existingStore:{id:'jowo',brandName:'JOWO',brandSlug:'jowo',revision:'revision-2'}})});
      await act(async()=>state.components.Topbar.onNewStore());
      let imported;
      await act(async()=>{imported=state.components.NewStoreModal.onImport({...fixture(),pages:[{id:'replacement',sections:[]}]});await Promise.resolve();});
      await act(async()=>{state.components.LinkDialog.dialog.onConfirm();await imported;});
      await act(async()=>{state.saveGate=null;release();await previousSave;});
      await act(async()=>state.components.Topbar.onSave());
      assert.equal(state.saves[1][1],null,'the new import must not inherit the old in-flight save ID');
      assert.equal(state.saves[1][5].revision,'revision-2','old work cannot consume new import permission');
    }finally{release();globalThis.confirm=previousConfirm;}
  });
});
