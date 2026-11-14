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
