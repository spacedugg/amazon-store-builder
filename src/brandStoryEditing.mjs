export function moveStoryCard(cards, sourceId, targetId, after=false) {
  if(sourceId===targetId || !cards.some(c=>c.id===sourceId) || !cards.some(c=>c.id===targetId)) return cards;
  const moving=cards.find(c=>c.id===sourceId), next=cards.filter(c=>c.id!==sourceId);
  const target=next.findIndex(c=>c.id===targetId);
  next.splice(target+(after?1:0),0,moving);
  return next;
}
