export function moveStoryCard(cards, sourceId, targetId, after=false) {
  if(sourceId===targetId || !cards.some(c=>c.id===sourceId) || !cards.some(c=>c.id===targetId)) return cards;
  const moving=cards.find(c=>c.id===sourceId), next=cards.filter(c=>c.id!==sourceId);
  const target=next.findIndex(c=>c.id===targetId);
  next.splice(target+(after?1:0),0,moving);
  return next;
}

// A composite is four exported image parts with one shared destination.
export function setGridMode(card, mode) {
  const first=card.slots[0] || {};
  return {...card, gridMode:mode, slots:card.slots.map(slot=>({...slot,
    ...(mode==='composite'?{asin:first.asin || '',url:first.url || '',imageMode:'custom'}:{})
  }))};
}
export function setGridTarget(card, index, value) {
  const input=value.trim(), asin=/^[A-Z0-9]{10}$/i.test(input)?input.toUpperCase():'';
  return {...card,slots:card.slots.map((slot,i)=>i===index || (card.gridMode ?? 'composite')==='composite'
    ? {...slot,asin,url:asin?'':input,productImage:null,...((card.gridMode ?? 'composite')==='composite'?{imageMode:'custom'}:{})}
    : slot)};
}
