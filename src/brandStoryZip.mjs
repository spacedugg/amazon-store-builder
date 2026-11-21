import { unzipSync } from 'fflate';
import { newStory, newCard, validateStory } from './brandStoryModel.mjs';
export function unpackStoryZip(bytes) {
  if(bytes.length>80*1024*1024)throw Error('ZIP darf maximal 80 MB groß sein.');
  let total=0,count=0;
  const files=unzipSync(bytes,{filter(entry){
    if(++count>200 || entry.originalSize>10*1024*1024 || (total+=entry.originalSize)>100*1024*1024)throw Error('ZIP enthält zu viele oder zu große Dateien.');
    if(/(^|\/)\.\.(\/|$)|^[/\\]|\\/.test(entry.name))throw Error('Ungültiger Pfad in der ZIP.');
    if (/(?:^|\/)brand-story\.json$/i.test(entry.name) && entry.originalSize > 128*1024) throw Error('Die Brand-Story-Beschreibung ist zu groß.');
    return (/\.(?:jpe?g|png)$/i.test(entry.name) || /(?:^|\/)brand-story\.json$/i.test(entry.name))&&!/(^|\/)(?:__MACOSX|\.[^/]*)(\/|$)/.test(entry.name);
  }});
  const manifests=Object.keys(files).filter(path=>/(?:^|\/)brand-story\.json$/i.test(path));
  if(manifests.length>1)throw Error('Die ZIP darf nur eine brand-story.json enthalten.');
  const entries=Object.entries(files).filter(([path])=>/\.(?:jpe?g|png)$/i.test(path)).map(([path,bytes])=>({path,bytes}));
  if(manifests.length)return manifestPlan(manifests[0],files[manifests[0]],entries);

  const sort=(a,b)=>a.path.localeCompare(b.path,'de',{numeric:true});
  const backgrounds=entries.filter(entry=>/(?:^|\/)(?:background|hintergrund)(?:s)?\//i.test(entry.path));
  const mobile=backgrounds.filter(entry=>/mobil|mobile|phone/i.test(entry.path));
  const desktop=backgrounds.filter(entry=>!mobile.includes(entry));
  if(desktop.length!==1||mobile.length>1)throw Error('Bitte genau einen Desktop-Hintergrund und höchstens einen Mobil-Hintergrund im Ordner Background ablegen.');
  const media=entries.filter(entry=>/\/brand media assets\//i.test('/'+entry.path)).sort(sort);
  const products=entries.filter(entry=>/\/asin grids\//i.test('/'+entry.path)).sort(sort);
  if(products.length%4)throw Error('Die ASIN-Grid-Bilder müssen sich vollständig in Vierergruppen aufteilen lassen.');
  const candidates=media.map((entry,index)=>({id:'media-'+index,type:'media',files:[entry.path]}));
  for(let i=0;i<products.length;i+=4)candidates.push({id:'grid-'+i/4,type:'grid',files:products.slice(i,i+4).map(entry=>entry.path)});
  if(!candidates.length||candidates.length>19)throw Error('Die ZIP muss zwischen einer und 19 Karten enthalten.');
  const previews=entries.filter(entry=>/(?:^|\/)(?:preview[^/]*|vorschau[^/]*)\//i.test(entry.path)).sort(sort);
  return {entries,desktop:desktop[0].path,mobile:mobile[0]?.path||null,candidates,previews:previews.slice(0,8).map(entry=>entry.path)};
}
export function storyFromZip(plan, images, analysis={}) {
  analysis=plan.manifestAnalysis || analysis;
  const story=newStory(analysis.brandName?.trim()||'');
  story.marketplace=analysis.marketplace || 'de';
  story.background.desktop=images[plan.desktop];story.background.mobile=images[plan.mobile]||null;
  const order=analysis.cards||plan.candidates;
  const ids=new Set(order.map(card=>card.id));
  if(order.length!==plan.candidates.length||ids.size!==order.length||plan.candidates.some(card=>!ids.has(card.id)))throw Error('Die erkannte Kartenfolge ist unvollständig. Bitte die ZIP erneut prüfen.');
  story.cards=order.map(item=>{
    const source=plan.candidates.find(card=>card.id===item.id),card=newCard(source.type,story.cards);
    // newCard keys must include preceding cards while constructing the list.
    card.fileKey='card-'+String(order.indexOf(item)+1).padStart(2,'0');
    if(card.type==='media'){card.image=images[source.files[0]];card.assetFile=source.files[0];}
    else {card.headline=typeof item.headline==='string'?(plan.manifestAnalysis?item.headline:item.headline.slice(0,30)):'';card.gridMode=item.gridMode==='composite'?'composite':'individual';card.slots.forEach((slot,index)=>{slot.image=images[source.files[index]];slot.assetFile=source.files[index];slot.imageMode='custom';slot.brief='';if(plan.manifestAnalysis){slot.asin=item.slots[index].asin;slot.url=item.slots[index].url;}});}
    if(plan.manifestAnalysis){card.copy=item.copy || '';card.shopUrl=item.shopUrl || '';}
    return card;
  });
  if(plan.manifestAnalysis)validateStory(story);
  return story;
}

function manifestPlan(path,bytes,entries) {
  let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Error('brand-story.json enthält kein gültiges JSON.');}
  data=normalizeExtractedManifest(data);
  if(data?.format!=='temoa-brand-story-example' || data.version!==1)throw Error('Das Format der brand-story.json wird nicht unterstützt.');
  if(typeof data.brandName!=='string' || !data.brandName.trim() || data.brandName.length>200)throw Error('Der Markenname fehlt in brand-story.json.');
  const marketplace=data.marketplace || 'de';
  if(!['de','com','co.uk','fr','it','es','nl','se','pl','com.be'].includes(marketplace))throw Error('Marktplatz in brand-story.json ist ungültig.');
  if(!Array.isArray(data.cards) || !data.cards.length || data.cards.length>19)throw Error('Die ZIP muss zwischen einer und 19 Karten enthalten.');
  const prefix=path.slice(0,path.lastIndexOf('/')+1),paths=new Set(entries.map(entry=>entry.path));
  const asset=value=>{
    if(typeof value!=='string' || value.length>500 || /(^|\/)\.\.(\/|$)|^[/\\]|\\/.test(value))throw Error('Ungültiger Bildpfad in brand-story.json.');
    const full=prefix+value;if(!paths.has(full))throw Error('Bilddatei fehlt in der ZIP: '+value);return full;
  };
  const text=(value,label,max=2000)=>{if(value===undefined)return '';if(typeof value!=='string'||value.length>max)throw Error(label+' ist ungültig.');return value;};
  const link=(value,type)=>{
    if(!value)return '';
    if(typeof value!=='string' || value.length>2048)throw Error('Ungültiger Amazon-Link in brand-story.json.');
    let url;try{url=new URL(value);}catch{throw Error('Ungültiger Amazon-Link in brand-story.json.');}
    if(url.protocol!=='https:' || url.username || url.password || url.port || !['www.amazon.'+marketplace,'amazon.'+marketplace].includes(url.hostname) || !(type==='product'?/\/(?:dp|gp\/product)\/[A-Z0-9]{10}(?:[/?]|$)/i:/^\/stores\//i).test(url.pathname))throw Error('Ungültiger Amazon-Link in brand-story.json.');
    return url.href;
  };
  const candidates=[],cards=[];
  data.cards.forEach((item,index)=>{
    if(!item || !['media','grid'].includes(item.type))throw Error('Unbekannter Kartentyp in brand-story.json.');
    const id='manifest-'+index,card={id,type:item.type,copy:text(item.copy,'Bildtext'),headline:text(item.headline,'Überschrift',200),shopUrl:link(item.shopUrl,'store')};
    let files;
    if(item.type==='media')files=[asset(item.file)];
    else {
      if(!Array.isArray(item.slots)||item.slots.length!==4)throw Error('Jedes ASIN-Grid muss genau vier Bildplätze enthalten.');
      if(!card.headline.trim())throw Error('Grid-Überschrift fehlt in brand-story.json.');
      if(item.gridMode && !['individual','composite'].includes(item.gridMode))throw Error('Ungültiger Grid-Modus.');
      card.gridMode=item.gridMode || 'individual';
      card.slots=item.slots.map(slot=>{
        if(!slot || typeof slot!=='object')throw Error('Ungültiger Grid-Bildplatz.');
        const asin=text(slot.asin,'ASIN',10).toUpperCase(),url=link(slot.url,'product');
        if(asin && !/^[A-Z0-9]{10}$/.test(asin))throw Error('Ungültige ASIN in brand-story.json.');
        if(asin && url && !url.includes('/'+asin))throw Error('ASIN und Produktlink passen nicht zusammen.');
        return {asin,url};
      });
      files=item.slots.map(slot=>asset(slot.file));
    }
    candidates.push({id,type:item.type,files});cards.push(card);
  });
  const desktop=asset(data.background?.desktop),mobile=data.background?.mobile?asset(data.background.mobile):null;
  return {entries,desktop,mobile,candidates,previews:[],manifestAnalysis:{brandName:data.brandName.trim(),marketplace,cards},purpose:text(data.purpose,'Beschreibung')};
}

// Earlier Amazon extracts used nested image records instead of the versioned
// example schema. Normalize only that known shape; all paths, links, slots and
// card limits still pass through manifestPlan's existing validation.
function normalizeExtractedManifest(data) {
  if(!data || data.format!==undefined || data.version!==undefined || typeof data.brand!=='string' || !data.backgroundDesktop || !Array.isArray(data.cards))return data;
  if(!data.cards.every(card=>card && ['brand_media_asset','asin_grid'].includes(card.type)))return data;
  let cards=[...data.cards];
  if(cards.some(card=>card.position!==undefined)){
    const positions=new Set(cards.map(card=>card.position));
    if(positions.size!==cards.length || !cards.every(card=>Number.isInteger(card.position)&&card.position>=1&&card.position<=cards.length))throw Error('Die Kartenpositionen in brand-story.json sind unvollständig oder doppelt.');
    cards.sort((a,b)=>a.position-b.position);
  }
  return {
    format:'temoa-brand-story-example',version:1,brandName:data.brand,
    marketplace:data.marketplace || 'de',purpose:data.purpose,
    background:{desktop:data.backgroundDesktop.file,mobile:data.backgroundMobile?.file},
    cards:cards.map(card=>({
      type:card.type==='brand_media_asset'?'media':'grid',file:card.image?.file,
      headline:card.headline,copy:card.copy,shopUrl:card.shopLink,gridMode:card.gridMode,
      slots:Array.isArray(card.slots)?card.slots.map(slot=>({file:slot?.image?.file,asin:slot?.asin,url:slot?.productUrl})):card.slots
    }))
  };
}
