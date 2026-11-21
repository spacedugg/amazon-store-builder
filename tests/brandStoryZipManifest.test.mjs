import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {zipSync,strToU8} from 'fflate';
import {unpackStoryZip,storyFromZip} from '../src/brandStoryZip.mjs';
import {exampleData} from '../src/brandStoryExamples.mjs';
const original=JSON.parse(readFileSync(new URL('./fixtures/holy-brand-story-manifest.json',import.meta.url)));
function archive(manifest=original,patch={}){
 const files={'HOLY/brand-story.json':strToU8(JSON.stringify(manifest))};
 for(const file of [original.background.desktop,...original.cards.flatMap(c=>c.type==='media'?[c.file]:c.slots.map(s=>s.file))])files['HOLY/'+file]=new Uint8Array([1]);
 return zipSync({...files,...patch});
}
test('HOLY imports all eight original cards, 24 targets and headings in exact order without vision',()=>{
 const plan=unpackStoryZip(archive());
 assert.equal(plan.candidates.length,8);assert.equal(plan.previews.length,0);assert.equal(plan.entries.length,27);
 const images=Object.fromEntries(plan.entries.map(e=>[e.path,{url:'https://example.com/'+encodeURIComponent(e.path),width:664,height:728,size:1}]));
 const story=storyFromZip(plan,images,{brandName:'Wrong AI guess',cards:[]});
 assert.equal(story.brandName,'HOLY');assert.equal(story.background.mobile,null);
 assert.equal(story.cards.filter(c=>c.type==='media').length,2);
 assert.deepEqual(story.cards.filter(c=>c.type==='grid').map(c=>c.headline),original.cards.filter(c=>c.type==='grid').map(c=>c.headline));
 assert.deepEqual(story.cards.flatMap(c=>c.slots.map(s=>s.asin)),original.cards.flatMap(c=>(c.slots||[]).map(s=>s.asin)));
 assert.deepEqual(story.cards.filter(c=>c.type==='grid').map(c=>c.shopUrl),original.cards.filter(c=>c.type==='grid').map(c=>c.shopUrl));
 assert.equal(exampleData(story).cards.length,8);
});
test('bad metadata is rejected before uploading any originals',()=>{
 const missing=structuredClone(original);missing.cards[0].file='Brand Media Assets/missing.png';assert.throws(()=>unpackStoryZip(archive(missing)),/Bilddatei fehlt/);
 const evil=structuredClone(original);evil.cards[2].shopUrl='javascript:alert(1)';assert.throws(()=>unpackStoryZip(archive(evil)),/Amazon-Link/);
 const mismatch=structuredClone(original);mismatch.cards[2].slots[0].asin='B012345678';assert.throws(()=>unpackStoryZip(archive(mismatch)),/passen nicht/);
 const traversal=structuredClone(original);traversal.background.desktop='../private.jpg';assert.throws(()=>unpackStoryZip(archive(traversal)),/Bildpfad/);
 const short=structuredClone(original);short.cards[2].slots.pop();assert.throws(()=>unpackStoryZip(archive(short)),/vier/);
 assert.throws(()=>unpackStoryZip(archive(original,{'other/brand-story.json':strToU8(JSON.stringify(original))})),/nur eine/);
});

const extracted=JSON.parse(readFileSync(new URL('./fixtures/holy-brand-story-extracted.json',import.meta.url)));
function extractedArchive(data=extracted){
 const files={'HOLY-Brand-Story/Brand-Story.json':strToU8(JSON.stringify(data))};
 for(const file of [extracted.backgroundDesktop.file,...extracted.cards.flatMap(c=>c.type==='brand_media_asset'?[c.image.file]:c.slots.map(s=>s.image.file))])files['HOLY-Brand-Story/'+file]=new Uint8Array([1]);
 return zipSync(files);
}
test('the earlier HOLY extraction ZIP imports nested files, positions and all product targets',()=>{
 const shuffled=structuredClone(extracted);shuffled.cards.reverse();
 const plan=unpackStoryZip(extractedArchive(shuffled));
 const images=Object.fromEntries(plan.entries.map(e=>[e.path,{url:'https://example.com/'+encodeURIComponent(e.path),width:664,height:728,size:1}]));
 const story=storyFromZip(plan,images);
 assert.equal(story.brandName,'HOLY');assert.equal(story.cards.length,8);assert.equal(plan.entries.length,27);
 assert.equal(story.background.mobile,null);
 assert.equal(story.cards[0].assetFile,'HOLY-Brand-Story/Brand Media Assets/Brand Image 0.png');
 assert.deepEqual(story.cards.filter(c=>c.type==='grid').map(c=>c.headline),extracted.cards.filter(c=>c.type==='asin_grid').map(c=>c.headline));
 assert.deepEqual(story.cards.flatMap(c=>c.slots.map(s=>s.asin)),extracted.cards.flatMap(c=>(c.slots||[]).map(s=>s.asin)));
 assert.deepEqual(story.cards.filter(c=>c.type==='grid').map(c=>c.shopUrl),extracted.cards.filter(c=>c.type==='asin_grid').map(c=>c.shopLink));
 assert.equal(exampleData(story).cards.length,8);
});
test('earlier extraction metadata retains the same strict path, URL and position validation',()=>{
 const missing=structuredClone(extracted);missing.backgroundDesktop.file='Background/missing.jpg';assert.throws(()=>unpackStoryZip(extractedArchive(missing)),/Bilddatei fehlt/);
 const evil=structuredClone(extracted);evil.cards[2].slots[0].productUrl='https://evil.test/dp/B0CPJM5Y59';assert.throws(()=>unpackStoryZip(extractedArchive(evil)),/Amazon-Link/);
 const traversal=structuredClone(extracted);traversal.cards[0].image.file='../private.png';assert.throws(()=>unpackStoryZip(extractedArchive(traversal)),/Bildpfad/);
 const duplicate=structuredClone(extracted);duplicate.cards[1].position=1;assert.throws(()=>unpackStoryZip(extractedArchive(duplicate)),/Kartenpositionen/);
 const future=structuredClone(extracted);future.format='unknown';assert.throws(()=>unpackStoryZip(extractedArchive(future)),/Format/);
});
