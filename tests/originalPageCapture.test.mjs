import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {verifiedHomepageScreenshot,homepageScreenshot} from '../src/storeReferences.mjs';
const {permittedResource,assertReady,anonymousCookies}=createRequire(import.meta.url)('../api/_lib/original-page-capture.cjs');
test('original page replay permits only public Amazon resource hosts and never local services or credential URLs',()=>{
 for(const url of ['https://m.media-amazon.com/images/S/asset.jpg','https://images-eu.ssl-images-amazon.com/scripts/app.js','https://www.amazon.de/stores/page/test'])assert(permittedResource(url));
 for(const url of ['http://localhost/test','https://127.0.0.1/','https://user:secret@www.amazon.de/a','https://amazon.de.evil.test/a','https://www.amazon.de:8443/a','file:///etc/passwd'])assert(!permittedResource(url));
});
test('missing images and empty or oversized captures fail before uploading',()=>{
 const state={images:12,missing:0,skeletons:0,height:5000,width:1440};assertReady(state);
 for(const patch of [{images:0},{missing:1},{skeletons:1},{height:100000}])assert.throws(()=>assertReady({...state,...patch}));
});
test('only the checked unobstructed original-page pipeline removes warnings from long screenshots',()=>{
 const source='https://www.amazon.de/stores/page/11111111-2222-3333-4444-555555555555';
 const image={url:'https://example.com/store.png',sourceUrl:source,capturedAt:new Date().toISOString(),width:1440,height:18000,fullPage:true,captureEngine:'original-html-scroll-v1',quality:{version:2,imagesComplete:true,tiled:true,imageCount:12,scrollPasses:2,documentHeight:18000}};
 assert(verifiedHomepageScreenshot(image));assert(!homepageScreenshot({storeUrl:source,homepageScreenshot:image}).truncated);
 assert(!verifiedHomepageScreenshot({...image,quality:{...image.quality,version:1}}));assert(!verifiedHomepageScreenshot({...image,quality:{...image.quality,documentHeight:20000}}));
});

test('original response cookies preserve anonymous page context without auth tokens',()=>{
 const cookies=anonymousCookies({'x-req-cookie':'session-id=anonymous; at-acbde=private; i18n-prefs=EUR; session-token=private','set-cookie':['ubid-acbde=public; Path=/; Secure','x-acbde=private; Path=/']},'https://www.amazon.de/stores/page/11111111-2222-3333-4444-555555555555');
 assert.deepEqual(cookies.map(cookie=>cookie.name),['session-id','i18n-prefs','ubid-acbde']);
 assert(cookies.every(cookie=>cookie.secure&&cookie.url==='https://www.amazon.de/'));
});
