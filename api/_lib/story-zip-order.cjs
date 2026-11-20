function observedCardOrder(result,candidates,previewCount) {
  const ids=new Set(candidates.map(card=>card.id));
  if(!Array.isArray(result.pages)||result.pages.length!==previewCount)throw Error('Die Gesamtvorschauen wurden nicht vollständig zugeordnet.');
  const pages=new Set(),seen=new Set(),edges=new Map([...ids].map(id=>[id,new Set()])),incoming=new Map([...ids].map(id=>[id,0]));
  for(const page of result.pages){
    if(!Number.isInteger(page.previewIndex)||page.previewIndex<1||page.previewIndex>previewCount||pages.has(page.previewIndex)||!Array.isArray(page.visibleCards)||!page.visibleCards.length||page.visibleCards.length>6||new Set(page.visibleCards).size!==page.visibleCards.length||page.visibleCards.some(id=>!ids.has(id)))throw Error('Eine Vorschau enthält eine ungültige Kartenzuordnung.');
    pages.add(page.previewIndex);page.visibleCards.forEach(id=>seen.add(id));
    for(let i=1;i<page.visibleCards.length;i++){const from=page.visibleCards[i-1],to=page.visibleCards[i];if(!edges.get(from).has(to)){edges.get(from).add(to);incoming.set(to,incoming.get(to)+1);}}
  }
  if(seen.size!==ids.size)throw Error('Nicht alle Karten wurden in den Gesamtvorschauen wiedergefunden.');
  const order=[];
  while(order.length<ids.size){
    const choices=[...ids].filter(id=>!order.includes(id)&&incoming.get(id)===0);
    if(choices.length!==1)throw Error('Die Kartenfolge ist nicht eindeutig. Bitte die Reihenfolge im Entwurf prüfen.');
    const id=choices[0];order.push(id);for(const next of edges.get(id))incoming.set(next,incoming.get(next)-1);
  }
  return order.map(id=>result.cards.find(card=>card.id===id));
}
module.exports={observedCardOrder};
