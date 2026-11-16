import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {homepageComplete, homepageStatus} = require('../api/_homepage-complete.js');
const image='https://assets.example.test/real-upload.jpg';
const base=()=>({headerBanner:image,pages:[{sections:[{tiles:[{type:'image',uploadedImage:image},{type:'image_text',uploadedImage:image},{type:'product_grid'}]}]}]});
test('requires homepage banner, real visual assets and at least one designed tile',()=>{
  const good=base();assert.equal(homepageComplete(good),true);
  good.pages[0].sections[0].tiles[1].uploadedImage=null;assert.equal(homepageComplete(good),false);
  const native=base();native.pages[0].sections[0].tiles=[{type:'text'},{type:'product_grid'}];assert.equal(homepageComplete(native),false);
  const withoutBanner=base();withoutBanner.headerBanner=null;assert.equal(homepageComplete(withoutBanner),false);
});
test('desktop-only outreach eligibility does not depend on mobile art',()=>{
 const s=base(),t=s.pages[0].sections[0].tiles[0];
 t.dimensions={w:1500,h:700};t.mobileDimensions={w:750,h:1500};
 assert.equal(homepageComplete(s),true);
 t.uploadedImageMobile=image;assert.equal(homepageComplete(s),true);
 t.uploadedImageMobile=null;t.syncDimensions=true;assert.equal(homepageComplete(s),true);
});

test('native product collection needs no designer image; hero tile can replace separate banner',()=>{
 const store=base();
 store.pages[0].sections[0].tiles.push({type:'product_collection'});
 store.headerBanner=null;
 assert.equal(homepageComplete(store),false);
 store.pages[0].sections[0].tiles[0].imageCategory='store_hero';
 assert.equal(homepageComplete(store),true);
});
test('reports the precise missing visual asset without calling an existing store unfinished for native tiles',()=>{
 const store=base();
 store.pages[0].sections[0].tiles[1].uploadedImage=null;
 assert.equal(homepageStatus(store).reason,'missing_desktop_image');
 store.pages[0].sections[0].tiles[1].uploadedImage=image;
 store.pages[0].sections[0].tiles.push({type:'video'});
 assert.equal(homepageComplete(store),true);
});
