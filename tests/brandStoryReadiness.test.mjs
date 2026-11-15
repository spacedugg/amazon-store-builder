import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/brandStoryModel.mjs';
import { normalizeStory, prepareStoryImport } from '../src/brandStoryWorkflow.mjs';
const {newStory,newCard,validateStory,customerStory}=model;
const image={url:'https://example.com/art.jpg',width:1328,height:1456,size:123};
const ready=()=>{const s=newStory('Marke');s.background.desktopBrief='Desktop subject';s.background.mobileBrief='Mobile subject';const c=newCard('grid');c.headline='Produkte';c.shopUrl='https://www.amazon.de/stores/brand';c.slots.forEach((slot,i)=>{slot.asin='B01234567'+i;slot.brief='Use original product image unchanged.';});s.cards=[c];return s;};
test('new grids are individual, legacy grids composite and selected image source is authoritative',()=>{
 assert.equal(model.gridMode(newCard('grid')),'individual'); assert.match(newCard('grid').slots[0].brief,/original Amazon product main image unchanged/); assert.equal(model.gridMode({type:'grid'}),'composite');
 assert.equal(model.slotImageMode({image}),'custom'); assert.equal(model.slotImageMode({}),'product');
 assert.equal(model.slotDisplayImage({image,imageMode:'product'}),null);
 assert.equal(model.slotDisplayImage({productImage:image,imageMode:'custom'}),null);
 assert.deepEqual(model.slotDisplayImage({image}),image);
});
test('ASIN extraction accepts actual Amazon product paths and rejects spoof hosts and arbitrary URLs',()=>{
 assert.equal(model.productAsin({url:'https://www.amazon.de/dp/b012345678?ref=x'},'de'),'B012345678');
 assert.equal(model.productAsin({url:'https://amazon.co.uk/gp/product/B012345678'},'co.uk'),'B012345678');
 for(const url of ['https://amazon.de.evil.test/dp/B012345678','https://evil.test/dp/B012345678','https://amazon.de/search/B012345678','https://amazon.de/dp/B0123456789']) assert.equal(model.productAsin({url},'de'),'');
});
test('sharing requires explicit descriptions and targets but no finished images',()=>{
 const s=ready(); assert.deepEqual(model.sharingErrors(s),[]);
 s.cards[0].slots[1].brief=' '; assert.match(model.sharingErrors(s).join(' '),/Karte 1, Platz 2.*Beschreibung/);
 s.cards[0].gridMode='composite';s.cards[0].brief='Four connected parts';s.cards[0].slots.forEach(slot=>slot.asin='B012345678'); assert.deepEqual(model.sharingErrors(s),[]);
 s.cards[0].brief='';assert.match(model.sharingErrors(s).join(' '),/Karte 1.*Beschreibung/);
 s.cards[0].slots[0].asin='';s.background.mobileBrief='';assert.match(model.sharingErrors(s).join(' '),/Mobil/);assert.match(model.sharingErrors(s).join(' '),/Platz 1.*Produktziel/);
 const draft=newStory('Entwurf');assert.doesNotThrow(()=>validateStory(draft));assert(model.sharingErrors(draft).length>=3);
});
test('new optional modes and slot briefs are structurally checked and customer briefs remain private',()=>{
 const s=ready();s.cards[0].slots[0].imageMode='custom';s.cards[0].slots[0].brief='PRIVATE';
 assert.equal(customerStory(s).cards[0].slots[0].imageMode,'custom');assert(!JSON.stringify(customerStory(s)).includes('PRIVATE'));
 for (const [obj,key,value] of [[s.cards[0],'gridMode','bad'],[s.cards[0].slots[0],'imageMode','bad'],[s.cards[0].slots[0],'brief',12]]) {const before=obj[key];obj[key]=value;assert.throws(()=>validateStory(s));obj[key]=before;}
});
test('imports normalize legacy fields, retain source metadata and invalidate product images when URL target changes',()=>{
 const s=ready();delete s.cards[0].gridMode;const slot=s.cards[0].slots[0];slot.asin='';slot.url='https://amazon.de/dp/B012345678';slot.productImage=image;slot.image=image;delete slot.imageMode;
 const n=normalizeStory(s);assert.equal(n.cards[0].gridMode,'composite');assert.equal(n.cards[0].slots[0].imageMode,'custom');
 const incoming=structuredClone(s);incoming.cards[0].slots[0].url='https://amazon.de/dp/B087654321';delete incoming.cards[0].slots[0].productImage;
 assert.equal(prepareStoryImport(JSON.stringify(incoming),s).story.cards[0].slots[0].productImage,null);
 const same=structuredClone(s);same.cards[0].slots[0].asin='B012345678';same.cards[0].slots[0].url='';delete same.cards[0].slots[0].productImage;
 assert.deepEqual(prepareStoryImport(JSON.stringify(same),s).story.cards[0].slots[0].productImage,image);
});

test('an edited destination URL invalidates an inherited product image even with unchanged ASIN text',()=>{
 const s=ready(), slot=s.cards[0].slots[0];slot.url='https://amazon.de/dp/B012345678';slot.productImage=image;
 const incoming=structuredClone(s);incoming.cards[0].slots[0].url='https://amazon.de/dp/B087654321';delete incoming.cards[0].slots[0].productImage;
 assert.equal(prepareStoryImport(JSON.stringify(incoming),s).story.cards[0].slots[0].productImage,null);
});

test('hydration uses effective URL target and only the chosen Amazon marketplace',()=>{
 assert.equal(model.productAsin({asin:'B012345678',url:'https://amazon.de/dp/B087654321'},'de'),'B087654321');
 assert.equal(model.productAsin({asin:'B012345678',url:'https://example.com/product'},'de'),'');
 assert.equal(model.productAsin({url:'https://amazon.com/dp/B012345678'},'de'),'');
 assert.equal(model.productAsin({asin:'b012345678',url:''},'de'),'B012345678');
});
test('imports retain existing source choices and metadata when inheriting omitted assets',()=>{
 const s=ready(),slot=s.cards[0].slots[0];slot.image=image;slot.imageMode='custom';slot.source={url:'https://example.com/source'};
 const incoming=structuredClone(s);delete incoming.cards[0].slots[0].image;delete incoming.cards[0].slots[0].imageMode;
 const result=prepareStoryImport(JSON.stringify(incoming),s).story.cards[0].slots[0];
 assert.equal(result.imageMode,'custom');assert.deepEqual(result.source,slot.source);
});

test('composite never displays a main image and cannot publish mismatched product targets',()=>{
 const s=ready(),card=s.cards[0];card.gridMode='composite';card.brief='Shared artwork';card.slots[0].productImage=image;
 assert.equal(model.slotDisplayImage(card.slots[0],card),null);
 assert.match(model.sharingErrors(s).join(' '),/gemeinsames Produktziel/);
 assert(normalizeStory(s).cards[0].slots.every(slot=>slot.imageMode==='custom'));
 assert(model.customerStory(s).cards[0].slots.every(slot=>slot.imageMode==='custom'));
});

test('automatic story share rejects home aliases and informational grid links',()=>{
 const s=ready();s.planning={mode:'store',storeUrl:'https://www.amazon.de/stores/Brand/page/11111111-1111-1111-1111-111111111111',categories:[],focusProducts:[],goal:'',includeFocusGrid:false};
 s.cards[0].shopUrl='https://www.amazon.de/stores/page/11111111-1111-1111-1111-111111111111';assert.match(model.sharingErrors(s).join(' '),/Startseite/);
 s.cards[0].shopUrl='https://www.amazon.de/stores/Brand/page/about';s.cards[0].headline='Über uns';assert.match(model.sharingErrors(s).join(' '),/Informations/);
 s.cards[0].headline='Sale';s.cards[0].shopUrl='https://www.amazon.de/stores/Brand/page/sale';assert.deepEqual(model.sharingErrors(s),[]);
});
