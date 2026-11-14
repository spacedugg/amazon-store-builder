import { newCard } from './brandStoryModel.mjs';

export const STORY_GOALS = [
  ['assortment', 'Kategorien und Sortiment zeigen'],
  ['hero', 'Ein Produkt erklären und aufbauen'],
  ['origin', 'Herkunft und Handwerk erzählen'],
  ['people', 'Menschen hinter der Marke vorstellen'],
];
export const FOCUS_REASONS = [['push', 'Gezielt hervorheben'], ['bestseller', 'Bestseller'], ['new', 'Neueinführung'], ['explain', 'Besonders erklären']];
export const defaultPlanning = () => ({ mode: 'store', storeUrl: '', goal: 'assortment', categories: [], focusProducts: [], includeFocusGrid: false });
export const parseAsins = text => text.split(/[\s,;]+/).filter(Boolean).map(a=>a.toUpperCase());
export function canonicalStoreUrl(value) {
  try { const url=new URL(value);url.search='';url.hash='';url.hostname=url.hostname.replace(/^www\./,'');url.pathname=url.pathname.replace(/\/+$/,'');return url.href; } catch { return value; }
}

export function mergeStoreNavigation(planning, result) {
  const loaded=result.pages?.some(p=>p.status==='loaded');
  const changed=planning.discoveredStoreUrl && canonicalStoreUrl(planning.discoveredStoreUrl)!==canonicalStoreUrl(result.storeUrl);
  const merged=mergeDiscoveredPages({...planning,categories:changed&&loaded?[]:planning.categories},result);
  return {...merged,storeUrl:result.storeUrl,...(loaded?{discoveredStoreUrl:result.storeUrl}:{})};
}
export function applyStoreDiscovery(story, result) {
  const loaded=result.pages?.some(p=>p.status==='loaded');
  return {...story,brandName:story.brandName || (loaded?result.brandName:'') || '',marketplace:loaded?(result.marketplace || story.marketplace):story.marketplace,planning:mergeStoreNavigation(story.planning || defaultPlanning(),result)};
}

export function mergeDiscoveredPages(planning, result) {
  const next = structuredClone(planning);
  for (const page of result.pages || []) {
    const old = next.categories.find(c=>canonicalStoreUrl(c.url)===canonicalStoreUrl(page.url));
    const observed = [...new Set(page.asins || [])];
    if (old) {
      old.status = page.status; old.error = page.error || '';
      if (page.status === 'loaded') {
        old.observedAsins = observed;
        if (!old.asins.length && !old.productsEdited) old.asins = observed.slice(0,4);
      }
    } else next.categories.push({
      id: page.pageId || page.url, name: page.name || 'Unterseite', url: page.url,
      selected: canonicalStoreUrl(page.url) !== canonicalStoreUrl(result.storeUrl), asins: observed.slice(0,4), observedAsins: observed,
      status: page.status, error: page.error || '',
    });
  }
  return next;
}

export function appendPlannedGrids(story) {
  const next=structuredClone(story), p=next.planning || defaultPlanning();
  const wanted = (p.categories || []).filter(c=>c.selected && !next.cards.some(card=>card.type==='grid' && (c.url ? canonicalStoreUrl(card.shopUrl)===canonicalStoreUrl(c.url) : card.title===c.name)));
  if (p.includeFocusGrid && p.focusProducts?.length && !next.cards.some(c=>c.title==='Produktfokus')) {
    if (p.focusProducts.length>4) throw Error('Für das gemeinsame Fokus-Grid bitte höchstens vier Produkte auswählen. Weitere Produkte können eigene Karten bekommen.');
    wanted.push({name:'Produktfokus', url:p.storeUrl, asins:p.focusProducts.map(f=>f.asin)});
  }
  if(next.cards.length+wanted.length>19) throw Error('Die Auswahl überschreitet 19 Karten. Bitte Kategorien reduzieren oder Karten entfernen.');
  for(const category of wanted){
    const c=newCard('grid',next.cards); c.title=category.name; c.headline=category.name.slice(0,30); c.shopUrl=category.url;
    c.slots.forEach((slot,i)=>slot.asin=category.asins[i] || '');
    c.brief=`Show the selected products for ${category.name}. Design the four images as agreed; do not invent products or claims.`;
    next.cards.push(c);
  }
  return next;
}

export function validatePlanning(p) {
  const text=v=>typeof v==='string';
  if (!p || typeof p!=='object' || Array.isArray(p) || !['store','manual'].includes(p.mode) || !text(p.storeUrl) || !text(p.goal) || !Array.isArray(p.categories) || !Array.isArray(p.focusProducts) || typeof p.includeFocusGrid!=='boolean') throw Error('Ungültige Brand-Story-Planung.');
  if(p.mode==='store' && p.discoveredStoreUrl && canonicalStoreUrl(p.discoveredStoreUrl)!==canonicalStoreUrl(p.storeUrl)) throw Error('Der Store-Link wurde geändert. Bitte den neuen Store auslesen oder den vorherigen Link wiederherstellen, bevor du mit der Kategorie-Auswahl fortfährst.');
  if(p.categories.length>100 || p.focusProducts.length>19) throw Error('Zu viele Kategorien oder Fokus-Produkte.');
  for(const c of p.categories){
    if(!c || !text(c.id) || !text(c.name) || !text(c.url) || typeof c.selected!=='boolean' || !Array.isArray(c.asins) || c.asins.length>4) throw Error('Pro Kategorie sind maximal vier ASIN-Plätze möglich.');
    if(c.asins.some(a=>!text(a)||!/^([A-Z0-9]{10})$/i.test(a))) throw Error('Bitte gültige ASINs mit zehn Zeichen verwenden.');
  }
  for(const f of p.focusProducts) if(!f || !text(f.asin)||!/^[A-Z0-9]{10}$/i.test(f.asin)||!text(f.reason)||(f.note!==undefined&&!text(f.note))) throw Error('Fokus-Produkte benötigen eine gültige ASIN und einen Auswahlgrund.');
}
