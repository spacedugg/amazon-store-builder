import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {copyStoryText} from '../src/brandStoryClipboard.mjs';
test('clipboard success is reported only after the write completes',async()=>{
 let written;assert.equal(await copyStoryText('brief',{clipboard:{async writeText(s){written=s;}},document:null}),true);assert.equal(written,'brief');
});
test('blocked iframe clipboard uses a cleaned-up selected-field fallback',async()=>{
 const dom=new JSDOM('<button>copy</button>');const d=dom.window.document;d.querySelector('button').focus();let selected;
 d.execCommand=command=>{selected=d.activeElement.value;return command==='copy';};
 assert.equal(await copyStoryText('project',{clipboard:{async writeText(){throw Error('blocked');}},document:d}),true);
 assert.equal(selected,'project');assert.equal(d.querySelectorAll('textarea').length,0);assert.equal(d.activeElement.tagName,'BUTTON');dom.window.close();
});
test('clipboard denial does not claim a successful copy',async()=>{
 assert.equal(await copyStoryText('project',{clipboard:{async writeText(){throw Error('blocked');}},document:null}),false);
});
