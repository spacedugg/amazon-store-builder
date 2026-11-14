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
