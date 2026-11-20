import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homepageScreenshot } from '../src/storeReferences.mjs';
import { importHomepageScreenshots } from '../scripts/import-store-homepage-screenshots.mjs';
const sourceUrl = 'https://www.amazon.de/stores/page/11111111-2222-3333-4444-555555555555';
const entry = { id: 'test', storeUrl: sourceUrl, images: [{url:'/old-logo.jpg'}] };
const capture = { url: '/store-homepage-screenshots/test.png', width: 1440, height: 18000, capturedAt: '2026-11-20T12:00:00Z', sourceUrl, fullPage: true };

test('homepage previews require explicit full-page evidence and preserve the actual image dimensions/date', () => {
  assert.equal(homepageScreenshot(entry), null, 'Archived logos are not page captures');
  assert.deepEqual(homepageScreenshot({...entry,homepageScreenshot:capture}), capture);
  for(const invalid of [{fullPage:false},{capturedAt:''},{height:0},{sourceUrl:'https://www.amazon.de/stores/page/AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE'},{url:'javascript:alert(1)'}]) {
    assert.equal(homepageScreenshot({...entry,homepageScreenshot:{...capture,...invalid}}),null);
  }
});

test('capture import records the original date and PNG size, versions the image URL, and rejects incomplete batches without catalogue writes', async () => {
  const dir=await mkdtemp(resolve('.capture-import-'));
  try {
    const catalogPath=join(dir,'catalog.json'),manifestPath=join(dir,'manifest.json'),outputDir=join(dir,'images');
    const original=JSON.stringify([entry]);await writeFile(catalogPath,original);
    // Valid 1px PNG is a unit-test fixture, never a production store capture.
    await writeFile(join(dir,'test.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=','base64'));
    const valid={sourceUrl,file:'test.png',capturedAt:'2026-11-01T09:00:00Z',fullPage:true};
    await writeFile(manifestPath,JSON.stringify([valid,{...valid,sourceUrl:'https://www.amazon.de/dp/B0CLDWHKCB'}]));
    await assert.rejects(importHomepageScreenshots({manifestPath,catalogPath,outputDir}),/known Brand Store/);
    assert.equal(await readFile(catalogPath,'utf8'),original);
    await writeFile(manifestPath,JSON.stringify([valid]));
    assert.equal(await importHomepageScreenshots({manifestPath,catalogPath,outputDir}),1);
    const [saved]=JSON.parse(await readFile(catalogPath,'utf8'));
    assert.equal(saved.homepageScreenshot.capturedAt,'2026-11-01T09:00:00.000Z');
    assert.equal(saved.homepageScreenshot.width,1);assert.equal(saved.homepageScreenshot.height,1);
    assert.match(saved.homepageScreenshot.url,/test-[a-f0-9]{16}\.png$/);
    assert.equal((await readdir(outputDir)).length,1);
    assert.ok(homepageScreenshot(saved));
  } finally { await rm(dir,{recursive:true,force:true}); }
});
