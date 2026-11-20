import { unzipSync } from 'fflate';
import { newStory, newCard } from './brandStoryModel.mjs';
export function unpackStoryZip(bytes) {
  if(bytes.length>80*1024*1024)throw Error('ZIP darf maximal 80 MB groß sein.');
  let total=0,count=0;
  const files=unzipSync(bytes,{filter(entry){
    if(++count>200 || entry.originalSize>10*1024*1024 || (total+=entry.originalSize)>100*1024*1024)throw Error('ZIP enthält zu viele oder zu große Dateien.');
    if(/(^|\/)\.\.(\/|$)|^[/\\]|\\/.test(entry.name))throw Error('Ungültiger Pfad in der ZIP.');
    return /\.(?:jpe?g|png)$/i.test(entry.name)&&!/(^|\/)(?:__MACOSX|\.[^/]*)(\/|$)/.test(entry.name);
  }});
  const entries=Object.entries(files).map(([path,bytes])=>({path,bytes}));
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
  const story=newStory(analysis.brandName?.trim()||'');
  story.background.desktop=images[plan.desktop];story.background.mobile=images[plan.mobile]||null;
  const order=analysis.cards||plan.candidates;
  const ids=new Set(order.map(card=>card.id));
  if(order.length!==plan.candidates.length||ids.size!==order.length||plan.candidates.some(card=>!ids.has(card.id)))throw Error('Die erkannte Kartenfolge ist unvollständig. Bitte die ZIP erneut prüfen.');
  story.cards=order.map(item=>{
    const source=plan.candidates.find(card=>card.id===item.id),card=newCard(source.type,story.cards);
    // newCard keys must include preceding cards while constructing the list.
    card.fileKey='card-'+String(order.indexOf(item)+1).padStart(2,'0');
    if(card.type==='media'){card.image=images[source.files[0]];card.assetFile=source.files[0];}
    else {card.headline=typeof item.headline==='string'?item.headline.slice(0,30):'';card.gridMode=item.gridMode==='composite'?'composite':'individual';card.slots.forEach((slot,index)=>{slot.image=images[source.files[index]];slot.assetFile=source.files[index];slot.imageMode='custom';slot.brief='';});}
    return card;
  });
  return story;
}
