import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {homepageComplete} = require('../api/_homepage-complete.js');
const image='https://assets.example.test/real-upload.jpg';
const base=()=>({headerBanner:image,pages:[{sections:[{tiles:[{type:'image',uploadedImage:image},{type:'image_text',uploadedImage:image},{type:'product_grid'}]}]}]});
test('requires homepage banner, real visual assets and at least one designed tile',()=>{
  const good=base();assert.equal(homepageComplete(good),true);
  good.pages[0].sections[0].tiles[1].uploadedImage=null;assert.equal(homepageComplete(good),false);
  const native=base();native.pages[0].sections[0].tiles=[{type:'text'},{type:'product_grid'}];assert.equal(homepageComplete(native),false);
  const withoutBanner=base();withoutBanner.headerBanner=null;assert.equal(homepageComplete(withoutBanner),false);
});
test('requires mobile artwork when aspect ratios differ',()=>{
 const s=base(),t=s.pages[0].sections[0].tiles[0];
 t.dimensions={w:1500,h:700};t.mobileDimensions={w:750,h:1500};
 assert.equal(homepageComplete(s),false);
 t.uploadedImageMobile=image;assert.equal(homepageComplete(s),true);
 t.uploadedImageMobile=null;t.syncDimensions=true;assert.equal(homepageComplete(s),true);
});
