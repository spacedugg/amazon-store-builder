import test from 'node:test';
import assert from 'node:assert/strict';
import * as edit from '../src/brandStoryEditing.mjs';
test('drag reorder moves card two after card ten without changing stable identity or assets',()=>{
 const cards=Array.from({length:12},(_,i)=>({id:'c'+i,fileKey:'card-'+i,image:{url:'image-'+i}}));
 const next=edit.moveStoryCard(cards,'c1','c9',true);
 assert.deepEqual(next.map(c=>c.id),['c0','c2','c3','c4','c5','c6','c7','c8','c9','c1','c10','c11']);
 assert.strictEqual(next[9],cards[1]);assert.equal(cards[1].id,'c1');
 assert.deepEqual(edit.moveStoryCard(cards,'missing','c9'),cards);
});

test('composite uses a shared target and custom sources while preserving the four exported artworks',()=>{
 const card={type:'grid',gridMode:'individual',slots:Array.from({length:4},(_,i)=>({asin:'B01234567'+i,url:'',imageMode:'product',image:{url:'art'+i},productImage:{url:'main'+i}}))};
 const mosaic=edit.setGridMode(card,'composite');
 assert(mosaic.slots.every(s=>s.asin==='B012345670' && s.imageMode==='custom'));
 const changed=edit.setGridTarget(mosaic,2,'https://www.amazon.de/dp/B087654321');
 assert(changed.slots.every(s=>s.url==='https://www.amazon.de/dp/B087654321' && s.asin==='' && !s.productImage));
 assert.deepEqual(changed.slots.map(s=>s.image.url),['art0','art1','art2','art3']);
 assert.equal(card.slots[1].asin,'B012345671');
 const individual=edit.setGridTarget(edit.setGridMode(changed,'individual'),1,'B012345678');
 assert.equal(individual.slots[1].asin,'B012345678');assert.equal(individual.slots[0].url,changed.slots[0].url);
});
