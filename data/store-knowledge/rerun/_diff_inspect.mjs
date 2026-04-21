import g from './natural-elements_gold.json' with { type: 'json' };
import r from './natural-elements_analysis.json' with { type: 'json' };

console.log('=== GOLD pages summary ===');
g.pages.forEach((p,i)=>{
  const tilesTotal = p.modules?.reduce((s,m)=>s+(m.tiles?.length||0),0) ?? 0;
  console.log(String(i+1).padStart(2), p.pageName, '| modules:', p.modules?.length, '| heroBanner:', Boolean(p.heroBanner), '| tilesTotal:', tilesTotal);
});

console.log('\n=== RERUN pages summary ===');
r.pages.forEach((p,i)=>{
  const tilesTotal = p.modules?.reduce((s,m)=>s+(m.tiles?.length||0),0) ?? 0;
  console.log(String(i+1).padStart(2), p.pageName, '| logical:', p.contentStats.logicalModules, '| dom:', p.contentStats.domModules, '| tiles:', tilesTotal);
});

console.log('\n=== GOLD brandUSPs ===');
console.log(JSON.stringify(g.storeAnalysis?.brandUSPs, null, 2));

console.log('\n=== GOLD keyStrengths ===');
console.log(JSON.stringify(g.storeAnalysis?.keyStrengths, null, 2));

console.log('\n=== GOLD positioningClaim ===');
console.log(JSON.stringify(g.storeAnalysis?.positioningClaim, null, 2));

console.log('\n=== GOLD brandVoice ===');
console.log(JSON.stringify(g.storeAnalysis?.brandVoice, null, 2));

console.log('\n=== GOLD designAesthetic ===');
console.log(JSON.stringify(g.storeAnalysis?.designAesthetic, null, 2));

console.log('\n=== GOLD methodology ===');
console.log(JSON.stringify(g.methodology, null, 2));

console.log('\n=== GOLD v2ValidationNotes ===');
console.log(JSON.stringify(g.v2ValidationNotes, null, 2));

console.log('\n=== GOLD page[0] heroBanner sample ===');
console.log(JSON.stringify(g.pages[0].heroBanner, null, 2));

console.log('\n=== GOLD page[0] modules[0] sample ===');
console.log(JSON.stringify(g.pages[0].modules[0], null, 2));

console.log('\n=== GOLD page[0] modules[0] tiles ===');
console.log(JSON.stringify(g.pages[0].modules[0].tiles?.slice(0,2), null, 2));
