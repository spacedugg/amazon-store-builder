import { unpackStoryZip, storyFromZip } from './brandStoryZip.mjs';
import { uploadImage } from './brandStoryImageUpload';
import { referenceAdminTicket } from './referenceAdmin';
async function bitmap(entry){return createImageBitmap(new Blob([entry.bytes],{type:/\.png$/i.test(entry.path)?'image/png':'image/jpeg'}));}
async function thumbnail(entry,maxWidth=1600){
  const source=await bitmap(entry),canvas=document.createElement('canvas');
  const scale=Math.min(1,maxWidth/source.width);canvas.width=Math.round(source.width*scale);canvas.height=Math.round(source.height*scale);
  canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);source.close();
  return new File([await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88))],'analysis.jpg',{type:'image/jpeg'});
}
async function sheet(plan){
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=Math.ceil(plan.candidates.length/4)*420;
  const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
  for(let index=0;index<plan.candidates.length;index++){
    const card=plan.candidates[index],x=index%4*300,y=Math.floor(index/4)*420;
    context.fillStyle='#111';context.font='bold 20px Arial';context.fillText(card.id,x+10,y+25);
    for(let n=0;n<card.files.length;n++){
      const source=await bitmap(plan.entries.find(entry=>entry.path===card.files[n]));
      const w=card.type==='media'?280:134,h=card.type==='media'?350:160;
      const scale=Math.min(w/source.width,h/source.height),ox=card.type==='media'?0:n%2*140,oy=card.type==='media'?0:Math.floor(n/2)*166;
      context.drawImage(source,x+10+ox,y+40+oy,source.width*scale,source.height*scale);source.close();
    }
  }
  return new File([await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88))],'contact-sheet.jpg',{type:'image/jpeg'});
}
export async function importStoryZip(file,progress){
  progress('ZIP wird gelesen …');const plan=unpackStoryZip(new Uint8Array(await file.arrayBuffer())),images={};
  const paths=[...new Set([plan.desktop,plan.mobile,...plan.candidates.flatMap(card=>card.files)].filter(Boolean))];
  for(let index=0;index<paths.length;index++){
    progress(`Originalbilder werden hochgeladen · ${index+1}/${paths.length}`);
    const entry=plan.entries.find(entry=>entry.path===paths[index]);
    images[entry.path]=await uploadImage(new File([entry.bytes],entry.path.split('/').at(-1),{type:/\.png$/i.test(entry.path)?'image/png':'image/jpeg'}));
  }
  let analysis={},warning='';
  if(plan.manifestAnalysis){ analysis=plan.manifestAnalysis; }else if(plan.previews.length){
    try{
      progress('Kartenfolge und Grid-Überschriften werden aus den Vorschauen erkannt …');
      const ticket=await referenceAdminTicket('story-zip');
      const contacts=await uploadImage(await sheet(plan));
      const previews=[];for(const path of plan.previews)previews.push(await uploadImage(await thumbnail(plan.entries.find(entry=>entry.path===path))));
      const response=await fetch('/api/brand-story-zip-analysis',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+ticket},body:JSON.stringify({candidates:plan.candidates.map(({id,type})=>({id,type})),contactSheet:contacts.url,previews:previews.map(image=>image.url)})});
      const result=await response.json();if(!response.ok)throw Error(result.error||'Analyse fehlgeschlagen.');analysis=result;
    }catch(error){warning='Die automatische Reihenfolge konnte nicht erkannt werden: '+error.message+' Bitte Reihenfolge und Grid-Überschriften ergänzen.';}
  }else warning='Keine Gesamtvorschauen gefunden. Bitte Reihenfolge und Grid-Überschriften ergänzen.';
  const story=storyFromZip(plan,images,analysis);
  return {data:story,purpose:plan.purpose||'',notice:plan.manifestAnalysis?'Kartenfolge, Überschriften, ASINs und Links wurden aus der ZIP übernommen. Bitte die Vorschau vor dem Speichern prüfen.':[warning,'Die Originalbilder wurden übernommen. ASINs und Shop-Links werden aus Bildern nicht erraten. Bitte die Vorschau vor dem Speichern prüfen.'].filter(Boolean).join(' ')};
}
