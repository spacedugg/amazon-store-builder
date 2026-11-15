import { newCard } from './brandStoryModel.mjs';

export const STORY_GOALS = [
  ['assortment', 'Kategorien und Sortiment zeigen'],
  ['hero', 'Ein Produkt erklären und aufbauen'],
  ['origin', 'Herkunft und Handwerk erzählen'],
  ['people', 'Menschen hinter der Marke vorstellen'],
];
export const FOCUS_REASONS = [['push', 'Gezielt hervorheben'], ['bestseller', 'Bestseller'], ['new', 'Neueinführung'], ['explain', 'Besonders erklären']];
export const defaultPlanning = () => ({ mode: 'store', storeUrl: '', goal: '', categories: [], focusProducts: [], includeFocusGrid: false });
export const parseAsins = text => text.split(/[\s,;]+/).filter(Boolean).map(a=>a.toUpperCase());
export function canonicalStoreUrl(value) {
  try { const url=new URL(value);url.search='';url.hash='';url.hostname=url.hostname.replace(/^www\./,'');url.pathname=url.pathname.replace(/\/+$/,'');return url.href; } catch { return value; }
}

export function sameStorePage(a,b) {
  if(!a || !b)return false;
  try {
    const one=new URL(a),two=new URL(b);
    if(one.hostname.replace(/^www\./,'')!==two.hostname.replace(/^www\./,''))return false;
    const id=url=>url.pathname.match(/\/page\/([a-z0-9-]+)/i)?.[1]?.toLowerCase();
    return canonicalStoreUrl(a)===canonicalStoreUrl(b) || !!(id(one) && id(one)===id(two));
  }catch{return false;}
}
export function gridDestinationError(category, storeUrl='') {
  const names=[category.name,category.observedName].filter(Boolean).map(name=>String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim());
  const value=String(category.url || '');
  if(sameStorePage(value,storeUrl)) return 'Die Store-Startseite ist kein Grid-Ziel.';
  if(names.some(name=>/^(?:home(?:page)?|start(?:seite)?|willkommen|welcome)(?:\s*[-–|:]|$)/i.test(name))) return 'Die Store-Startseite ist kein Grid-Ziel.';
  let path='';try{path=decodeURIComponent(new URL(value).pathname.split('/').filter(Boolean).slice(2).join(' ')).replace(/[-_]+/g,' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'');}catch{}
  if(/(?:\b(?:uber|ueber)\s*(?:uns|die marke)\b|\babout(?:\s*us| the brand)?\b|\b(?:unsere|our) (?:geschichte|werte|marke|story|brand)\b|\bmarkengeschichte\b|\bunternehmen\b|\bcompany\b|\binformation(?:en)?\b|\b(?:produkt|kauf|product)[ -]?(?:berater|beratung|finder|advisor)\b|\bquiz\b|\bratgeber\b|\bberatung\b|\bkontakt\b|\bcontact\b|\bfaq\b)/i.test([...names,path].join(' | '))) return 'Informations- und Beratungsseiten sind keine Grid-Ziele.';
  try {if(/^\/stores\/[^/]+\/?$/i.test(new URL(value).pathname))return 'Die Store-Startseite ist kein Grid-Ziel.';}catch{}
  return '';
}

export function storePlanningReady(p) {
  return !!p?.discoveredStoreUrl && canonicalStoreUrl(p.storeUrl)===canonicalStoreUrl(p.discoveredStoreUrl);
}

export function mergeStoreNavigation(planning, result) {
  const loaded=result.pages?.some(p=>p.status==='loaded');
  const changed=planning.discoveredStoreUrl && canonicalStoreUrl(planning.discoveredStoreUrl)!==canonicalStoreUrl(result.storeUrl);
  const merged=mergeDiscoveredPages({...planning,categories:changed&&loaded?[]:planning.categories},result);
  return {...merged,storeUrl:result.storeUrl,...(loaded?{discoveredStoreUrl:result.storeUrl}:{})};
}
export function applyStoreDiscovery(story, result) {
  const loaded=result.pages?.some(p=>p.status==='loaded');
  const changed=story.planning?.discoveredStoreUrl && canonicalStoreUrl(story.planning.discoveredStoreUrl)!==canonicalStoreUrl(result.storeUrl);
  return {...story,brandName:loaded && (changed || !story.brandName)?(result.brandName || ''):story.brandName,marketplace:loaded?(result.marketplace || story.marketplace):story.marketplace,planning:mergeStoreNavigation(story.planning || defaultPlanning(),result)};
}

export function mergeDiscoveredPages(planning, result) {
  const next = structuredClone(planning);
  for (const page of result.pages || []) {
    const old = next.categories.find(c=>canonicalStoreUrl(c.url)===canonicalStoreUrl(page.url));
    const observed = [...new Set(page.asins || [])];
    if (old) {
      if(page.name?.trim())old.observedName=page.name;
      old.status = page.status; old.error = page.error || '';
      if (page.status === 'loaded') {
        old.observedAsins = observed;
        if (!old.asins.length && !old.productsEdited) old.asins = observed.slice(0,4);
      }
    } else next.categories.push({
      id: page.pageId || page.url, name: page.name || 'Unterseite', observedName:page.name || '', url: page.url,
      selected: !gridDestinationError(page,result.storeUrl || planning.storeUrl), asins: observed.slice(0,4), observedAsins: observed,
      status: page.status, error: page.error || '',
    });
  }
  for(const category of next.categories) if(gridDestinationError(category,result.storeUrl || planning.storeUrl)) category.selected=false;
  return next;
}

export function appendPlannedGrids(story) {
  const next=structuredClone(story), p=next.planning || defaultPlanning();
  const wanted = (p.categories || []).filter(c=>c.selected && !gridDestinationError(c,p.storeUrl) && !next.cards.some(card=>card.type==='grid' && (c.url ? canonicalStoreUrl(card.shopUrl)===canonicalStoreUrl(c.url) : card.title===c.name)));
  if (p.includeFocusGrid && p.focusProducts?.length && !next.cards.some(c=>c.title==='Produktfokus')) {
    if (p.focusProducts.length>4) throw Error('Für das gemeinsame Fokus-Grid bitte höchstens vier Produkte auswählen. Weitere Produkte können eigene Karten bekommen.');
    const destination=p.categories.find(c=>c.selected && !gridDestinationError(c,p.storeUrl) && p.focusProducts.every(f=>c.asins.includes(f.asin)));
    if(!destination) throw Error('Für das Fokus-Grid bitte eine passende produktführende Store-Unterseite in Claude abstimmen.');
    wanted.push({name:'Produktfokus', url:destination.url, asins:p.focusProducts.map(f=>f.asin)});
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
