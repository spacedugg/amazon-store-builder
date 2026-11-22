import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const dir=new URL('../data/store-knowledge/rerun-v4/',import.meta.url);
const analyses=await Promise.all((await readdir(dir)).filter(n=>n.endsWith('_analysis.json')).map(async name=>({name,data:JSON.parse(await readFile(new URL(name,dir),'utf8'))})));
test('documented knowledge paths exist in every packaged store analysis',()=>{
  assert(analyses.length>0);
  for(const {name,data} of analyses){
    for(const key of ['brandVoice','contentStrategy','moduleFunctionalTaxonomy','pageArchetypes']) assert(data.storeAnalysis?.[key],name+': storeAnalysis.'+key);
    assert(data.pages?.length,name+': pages');
    for(const page of data.pages){
      for(const key of ['voiceMarkers','pageArchitecture','brandModules']) assert(page[key]!=null,name+': pages[].'+key);
    }
  }
});
test('current navigation inventory covers the active catalogue while distinguishing discovery from visual review',async()=>{
 const catalog=JSON.parse(await readFile(new URL('../src/data/storeReferenceCatalog.json',import.meta.url),'utf8'));
 const inventory=JSON.parse(await readFile(new URL('../data/store-knowledge/review-2026-11-21/navigation-inventory.json',import.meta.url),'utf8'));
 assert.deepEqual(inventory.stores.map(r=>r.id).sort(),catalog.map(r=>r.id).sort());
 for(const row of inventory.stores){
  assert.equal(row.visualAnalysisCompleted,false);
  assert(row.retrievedAt && row.sourceUrl);
  if(row.status==='navigation_retrieved') assert(row.pages.length>0);
 }
});
test('bundled macro profiles cover every active reference and keep homepage and representative subpage evidence separate',async()=>{
 const catalog=JSON.parse(await readFile(new URL('../src/data/storeReferenceCatalog.json',import.meta.url),'utf8'));
 const profiles=JSON.parse(await readFile(new URL('../data/store-knowledge/_reference_style_profiles.json',import.meta.url),'utf8'));
 assert.equal(profiles.schemaVersion,3);
 assert.equal(profiles.fullPageAudit.coverageCompleted,true);
 assert.equal(profiles.fullPageAudit.discoveredPages,525);
 assert.equal(profiles.fullPageAudit.unreviewedCapturedPages,0);
 assert.equal(profiles.subpageReview.visuallyReviewedPages,54);
 assert.equal(profiles.stores.reduce((sum,row)=>sum+row.subpagePatterns.length,0),54);
 assert.equal(profiles.stores.reduce((sum,row)=>sum+row.unavailableSubpages.length,0),1);
 const urls=profiles.stores.flatMap(row=>row.subpagePatterns.map(page=>page.sourceUrl));
 assert.equal(new Set(urls).size,urls.length);
 assert.deepEqual(profiles.stores.map(r=>r.id).sort(),catalog.map(r=>r.id).sort());
 for(const row of profiles.stores){
  assert.equal(row.coverage.homepage,'visually_reviewed');
  assert.equal(row.coverage.subpages,'all_discovered_pages_audited');
  assert.equal(row.coverage.allNavigationEntriesVisuallyReviewed,false);
  assert.equal(row.coverage.visuallyReviewedSubpageCount,row.subpagePatterns.length);
  assert.equal(row.coverage.selectedUnavailableSubpageCount,row.unavailableSubpages.length);
  assert(row.subpagePatterns.length>0,row.id);
  for(const page of row.subpagePatterns){
   assert.equal(page.evidence.kind,'full_desktop_subpage_screenshot');
   assert(page.sourceUrl.startsWith('https://www.amazon.de/stores/'));
   assert(page.evidence.url.startsWith('https://') && page.evidence.imagesComplete);
   assert(page.evidence.width>0 && page.evidence.height>0);
   assert.match(page.evidence.sourceHtmlHash,/^[a-f0-9]{64}$/);
   assert(page.capturedAt && page.reviewedAt && page.pageRole && page.differenceFromHome);
   assert(page.observations.length && page.transferablePrinciples.length);
  }
  for(const page of row.unavailableSubpages){
   assert.equal(page.status,'not_visually_reviewed');
   assert(page.reason && page.sourceUrl);
   assert(!row.subpagePatterns.some(review=>review.sourceUrl===page.sourceUrl));
  }
  assert.equal(row.coverage.mobile,'not_visually_reviewed');
  assert.equal(row.coverage.interactionBehaviour,'not_verified_from_screenshot');
  assert(row.evidence.url.startsWith('https://')&&row.evidence.imagesComplete);
  assert(row.capturedAt&&row.sourceUrl&&row.observations.length&&row.transferablePrinciples.length);
  for(const text of row.observations) assert.equal(typeof text,'string');
 }
});
