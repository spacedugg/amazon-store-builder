import test from 'node:test';
import assert from 'node:assert/strict';
import * as planning from '../src/brandStoryPlanning.mjs';
import { newStory, newCard, validateStory } from '../src/brandStoryModel.mjs';
import { prepareStoryImport, designerStory } from '../src/brandStoryWorkflow.mjs';

test('category layout separates footer destinations and product ASINs, preserving existing cards', () => {
  const story = newStory('Marke'); story.cards.push(newCard('media'));
  story.planning = { mode: 'store', storeUrl: 'https://www.amazon.de/stores/brand', goal: 'hero', categories: [
    { id: 'a', name: 'Tapeten', url: 'https://www.amazon.de/stores/brand/page/tapeten', selected: true, asins: ['B012345678','B012345678'] },
    { id: 'b', name: 'Teppiche', url: '', selected: false, asins: [] },
  ], focusProducts: [], includeFocusGrid: false };
  const next = planning.appendPlannedGrids(story);
  assert.equal(next.cards.length, 2); assert.deepEqual(next.cards[0], story.cards[0]);
  assert.equal(next.cards[1].headline, 'Tapeten'); assert.equal(next.cards[1].shopUrl, story.planning.categories[0].url);
  assert.deepEqual(next.cards[1].slots.map(s=>s.asin), ['B012345678','B012345678','','']);
  assert.equal(planning.appendPlannedGrids(next).cards.length, 2);
  assert.equal(story.cards.length, 1);
});
test('category layout never silently truncates the nineteen-card budget', () => {
  const s = newStory('Marke'); s.cards = Array.from({length:19},()=>newCard('media'));
  s.planning = { categories: [{id:'a',name:'Zubehör',url:'',selected:true,asins:[]}] };
  assert.throws(()=>planning.appendPlannedGrids(s), /19/);
});
test('discovery merges observations without overwriting curated ASINs or category selection', () => {
  const p = { ...planning.defaultPlanning(), categories:[{id:'a',url:'https://www.amazon.de/stores/a',name:'Eigener Name',selected:false,asins:['B012345678']}] };
  const next = planning.mergeDiscoveredPages(p,{pages:[{url:p.categories[0].url,name:'Fetched',asins:['B000000001'],status:'loaded'}]});
  assert.equal(next.categories[0].selected,false); assert.deepEqual(next.categories[0].asins,['B012345678']);
  assert.equal(next.categories[0].name,'Eigener Name'); assert.deepEqual(next.categories[0].observedAsins,['B000000001']);
});
test('legacy Claude imports retain internal planning, which designer snapshots exclude', () => {
  const old = newStory('Marke'); old.planning = planning.defaultPlanning(); old.planning.goal='PRIVATE_GOAL';
  const imported=prepareStoryImport(JSON.stringify(newStory('Marke')),old).story;
  assert.deepEqual(imported.planning,old.planning); assert(!('planning' in designerStory(imported)));
});
test('planning rejects malformed ASINs and excess slots before save or copying', () => {
  const s = newStory('Marke'); s.planning={...planning.defaultPlanning(),categories:[{id:'a',name:'Kategorie',url:'',selected:true,asins:['invalid']}]};
  assert.throws(()=>validateStory(s),/ASIN/);
});
test('canonical discovery matching preserves excluded categories and curated product targets', () => {
  const p={...planning.defaultPlanning(),storeUrl:'https://www.amazon.de/stores/marke',categories:[{id:'a',name:'Eigener Name',url:'https://www.amazon.de/stores/marke/page/abc/?ref_=menu',selected:false,asins:['B012345678']}]};
  const next=planning.mergeDiscoveredPages(p,{storeUrl:p.storeUrl,pages:[{url:'https://www.amazon.de/stores/marke/page/abc',name:'Fetched',asins:['B000000001'],status:'loaded'}]});
  assert.equal(next.categories.length,1);assert.equal(next.categories[0].selected,false);
  assert.deepEqual(next.categories[0].asins,['B012345678']);
});
test('changing a discovered store requires reconciling its category selection', () => {
  const s=newStory('Marke');s.planning={...planning.defaultPlanning(),storeUrl:'https://www.amazon.de/stores/new',discoveredStoreUrl:'https://www.amazon.de/stores/old'};
  assert.throws(()=>validateStory(s),/Store-Link.*geändert/);
});
test('first navigation crawl and failed replacement preserve manually curated categories', () => {
  const p={...planning.defaultPlanning(),storeUrl:'https://www.amazon.de/stores/old',categories:[{id:'a',name:'Eigener Name',url:'https://www.amazon.de/stores/old/page/a',selected:false,asins:['B012345678']}]};
  const loaded=planning.mergeStoreNavigation(p,{storeUrl:p.storeUrl,pages:[{url:p.storeUrl,status:'loaded',asins:[]}]});
  assert.deepEqual(loaded.categories[0],p.categories[0]);
  const failed=planning.mergeStoreNavigation(loaded,{storeUrl:'https://www.amazon.de/stores/new',pages:[{url:'https://www.amazon.de/stores/new',status:'error',asins:[]}]});
  assert.deepEqual(failed.categories[0],p.categories[0]);assert.equal(failed.discoveredStoreUrl,p.storeUrl);
});
test('failed navigation does not change the marketplace of existing product targets', () => {
  const s=newStory('DE Marke');s.planning={...planning.defaultPlanning(),storeUrl:'https://www.amazon.com/stores/new',discoveredStoreUrl:'https://www.amazon.de/stores/old'};
  const result={storeUrl:s.planning.storeUrl,marketplace:'com',pages:[{url:s.planning.storeUrl,status:'error',asins:[]}]};
  const next=planning.applyStoreDiscovery(s,result);
  assert.equal(next.marketplace,'de');assert.equal(next.brandName,'DE Marke');
});

test('new plans leave the story goal for the Claude conversation',()=>{
 assert.equal(planning.defaultPlanning().goal,'');
});

test('store planning unlocks only after a successful read of the current Store link',()=>{
 const root='https://www.amazon.de/stores/example';let p=planning.defaultPlanning();p.storeUrl=root;
 assert.equal(planning.storePlanningReady(p),false);
 p=planning.mergeStoreNavigation(p,{storeUrl:root,pages:[{url:root,status:'loaded',asins:[]}]});assert.equal(planning.storePlanningReady(p),true);
 p.storeUrl='https://www.amazon.de/stores/other';assert.equal(planning.storePlanningReady(p),false);
});
test('switching to a newly read Store replaces the old detected brand',()=>{
 const old=newStory('Old Brand');old.planning={...planning.defaultPlanning(),storeUrl:'https://www.amazon.de/stores/new',discoveredStoreUrl:'https://www.amazon.de/stores/old'};
 const next=planning.applyStoreDiscovery(old,{storeUrl:old.planning.storeUrl,brandName:'New Brand',pages:[{url:old.planning.storeUrl,status:'loaded',asins:[]}]});assert.equal(next.brandName,'New Brand');
});

test('automatic category selection excludes home aliases and information pages while keeping category, sale and bestseller pages',()=>{
 const root='https://www.amazon.de/stores/Brand/page/11111111-1111-1111-1111-111111111111';
 const pages=[{url:root,name:'Startseite'},{url:'https://www.amazon.de/stores/page/11111111-1111-1111-1111-111111111111',name:'Willkommen'},...['Über uns','Produktberater','Quiz','Schlaf','Gelenke und Sport','Körper und Balance','Bestseller','Sale'].map((name,i)=>({name,url:`https://www.amazon.de/stores/Brand/page/abc-${i}`}))].map(p=>({...p,status:'pending',asins:[]}));
 const p=planning.mergeDiscoveredPages(planning.defaultPlanning(),{storeUrl:root,pages});
 assert.deepEqual(p.categories.filter(c=>c.selected).map(c=>c.name),['Schlaf','Gelenke und Sport','Körper und Balance','Bestseller','Sale']);
 assert.equal(planning.gridDestinationError({name:'Home & Living',url:'https://www.amazon.de/stores/Brand/page/home-living'},root),'');
});
test('a renamed excluded destination cannot silently become selected after re-reading and a focus grid never falls back to home',()=>{
 const root='https://www.amazon.de/stores/brand',url=root+'/page/about';
 const p={...planning.defaultPlanning(),storeUrl:root,categories:[{id:'x',name:'Über uns',url,selected:true,asins:[]}]};
 assert.equal(planning.mergeDiscoveredPages(p,{storeUrl:root,pages:[{name:'About us',url,status:'loaded',asins:['B012345678']}]}).categories[0].selected,false);
 const s=newStory('Brand');s.planning={...planning.defaultPlanning(),storeUrl:root,includeFocusGrid:true,focusProducts:[{asin:'B012345678',reason:'push'}]};
 assert.throws(()=>planning.appendPlannedGrids(s),/Unterseite/);
});

test('discovered informational names override neutral editable labels for eligibility without overwriting the label',()=>{
 const root='https://www.amazon.de/stores/Brand/page/root',url='https://www.amazon.de/stores/Brand/page/info';
 const p={...planning.defaultPlanning(),storeUrl:root,categories:[{id:'x',name:'Unterseite',url,selected:true,asins:[]}]};
 const next=planning.mergeDiscoveredPages(p,{storeUrl:root,pages:[{name:'Über uns',url,status:'pending',asins:[]}]});
 assert.equal(next.categories[0].name,'Unterseite');assert.equal(next.categories[0].selected,false);assert.match(planning.gridDestinationError(next.categories[0],root),/Informations/);
 for(const name of ['Company','Information','Informationen','AboutUs','Überuns']) assert.match(planning.gridDestinationError({name,url},root),/Informations/);
});

test('informational words in a brand slug do not exclude valid shopping pages',()=>{
 const root='https://www.amazon.de/stores/The-Organic-Company/page/root';
 for(const name of ['Bestseller','Sale','Handtücher']) assert.equal(planning.gridDestinationError({name,url:'https://www.amazon.de/stores/The-Organic-Company/page/products'},root),'');
 assert.match(planning.gridDestinationError({name:'Details',url:'https://www.amazon.de/stores/The-Organic-Company/about-us/page/info'},root),/Informations/);
});

test('company website accepts optional public URLs and rejects credentials and local targets',()=>{
 assert.equal(planning.normalizeBrandWebsite(''), '');assert.equal(planning.normalizeBrandWebsite('marke.de'), 'https://marke.de/');
 assert.equal(planning.normalizeBrandWebsite('https://www.marke.de/about#team'),'https://www.marke.de/about');
 for(const value of ['javascript:alert(1)','https://user:pass@marke.de','http://localhost','http://127.0.0.1','https://intranet.local'])assert.throws(()=>planning.normalizeBrandWebsite(value));
 const p={...planning.defaultPlanning(),websiteUrl:'https://marke.de'};assert.doesNotThrow(()=>planning.validatePlanning(p));
 assert.throws(()=>planning.validatePlanning({...p,websiteUrl:42}));
});
