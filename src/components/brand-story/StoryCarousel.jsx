import React, { useEffect, useState, useRef } from 'react';
import { offsets, productUrl, safeUrl, slotDisplayImage, slotImageMode } from '../../brandStoryModel.mjs';
const imageSrc=x=>typeof x==='string'?x:x?.url;
function Picture({image,placeholder='Bild fehlt',fit='cover'}) {
  return imageSrc(image)?<img src={imageSrc(image)} alt="" draggable={false} style={{objectFit:fit}}/>:<div className="bs-placeholder">{placeholder}</div>;
}
function DraftImage({copy='',headline=''}) {
  return headline || copy ? <div className="bs-draft-copy">
    {headline && <strong className="bs-draft-headline">{headline}</strong>}
    {copy && <span className="bs-draft-body">{copy}</span>}
  </div> : <svg className="bs-draft-image-icon" viewBox="0 0 120 80" aria-hidden="true"><circle cx="88" cy="20" r="9"/><path d="M8 70 43 22 69 56 85 39 112 70Z"/></svg>;
}
export function StoryCarousel({story,mobile=false,onSelect,selected,selectedSlot=null,showDraft=false,onAdd,onRemove,onReorder,busy=false}) {
  const [page,setPage]=useState(0), [dragging,setDragging]=useState(null), [edge,setEdge]=useState(0), [dropTarget,setDropTarget]=useState(null);
  const touch=useRef(null), steps=offsets(story.cards.length,mobile), index=Math.min(page,Math.max(steps.length-1,0));
  const selectedIndex=story.cards.findIndex(c=>c.id===selected), editable=!!onAdd;
  useEffect(()=>setPage(0),[mobile,story.cards.length]);
  useEffect(()=>{if(selectedIndex>=0)setPage(mobile?selectedIndex:selectedIndex<2?0:Math.floor((selectedIndex-2)/3)+1);},[selected,mobile,story.cards.length,selectedIndex]);
  useEffect(()=>{if(!dragging||!edge)return;const timer=setInterval(()=>setPage(p=>Math.max(0,Math.min(steps.length-1,p+edge))),550);return()=>clearInterval(timer);},[dragging,edge,steps.length]);
  const move=d=>setPage(p=>Math.max(0,Math.min(steps.length-1,p+d)));
  function endDrag(){setDragging(null);setEdge(0);setDropTarget(null);}
  function dragOver(e){
    if(!onReorder||!dragging)return;e.preventDefault();e.dataTransfer.dropEffect='move';
    const r=e.currentTarget.getBoundingClientRect(), margin=Math.min(80,r.width*.12);
    setEdge(e.clientX<r.left+margin?-1:e.clientX>r.right-margin?1:0);
  }
  function drop(e,target,after){
    if(!onReorder)return;e.preventDefault();e.stopPropagation();
    const source=dragging||e.dataTransfer.getData('text/plain');
    if(source&&target&&source!==target)onReorder(source,target,after);
    endDrag();
  }
  return <div className={`bs-carousel ${mobile?'bs-mobile':''} ${editable?'bs-editable':''}`} tabIndex={0} aria-label="Brand Story Karussell"
    onKeyDown={e=>{if(e.target.closest('button,a')&&e.target!==e.currentTarget)return;if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}}}
    onTouchStart={e=>{if(!e.target.closest('button'))touch.current=e.touches[0].clientX;}}
    onTouchEnd={e=>{if(touch.current!==null){const d=touch.current-e.changedTouches[0].clientX;if(Math.abs(d)>40)move(d>0?1:-1);touch.current=null;}}}
    onDragOver={dragOver} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setEdge(0);}}
    onDrop={e=>{const i=Math.min(story.cards.length-1,(steps[index]||0)+(edge>0?(mobile?0:2):0));drop(e,story.cards[i]?.id,edge>0);}}
    onClick={e=>{if(onSelect&&!e.target.closest('.bs-card,button,a'))onSelect(null);}}>
    <div className="bs-backdrop"><Picture image={story.background[mobile?'mobile':'desktop']} placeholder={<DraftImage copy={story.background[(mobile?'mobile':'desktop')+'Copy']??story.background.copy??''}/>}/></div>
    <div className="bs-card-viewport"><div className="bs-rail" style={{transform:`translateX(-${(steps[index]||0)*(mobile?100:26.78)}%)`}}>
      {story.cards.map((c,i)=><div key={c.id} data-card-id={c.id} className={`bs-card bs-${c.type==='grid'?'grid-card':'media'}${selected===c.id?' is-selected':''}${dragging===c.id?' is-dragging':''}${dropTarget===c.id?' is-drop-target':''}`}
        onClick={onSelect?e=>{e.preventDefault();onSelect(c.id);}:undefined} onKeyDown={onSelect?e=>{if(e.target===e.currentTarget&&e.key==='Enter'){e.preventDefault();onSelect(c.id);}}:undefined}
        tabIndex={onSelect?0:undefined} role={onSelect?'group':undefined} aria-label={onSelect?`Karte ${i+1} bearbeiten`:undefined}
        style={{left:`${(mobile?0:31.66)+i*(mobile?100:26.78)}%`}} draggable={editable&&!busy}
        onDragStart={editable?e=>{if(e.target.closest('.bs-preview-remove')){e.preventDefault();return;}e.dataTransfer.setData('text/plain',c.id);e.dataTransfer.effectAllowed='move';setDragging(c.id);}:undefined}
        onDragEnd={endDrag} onDragOver={e=>{if(dragging){e.preventDefault();setDropTarget(c.id);}}}
        onDrop={e=>{const r=e.currentTarget.getBoundingClientRect();drop(e,c.id,e.clientX>r.left+r.width/2);}}>
        {editable&&<div className="bs-preview-card-tools"><span aria-hidden="true">⠿ {i+1}</span><button className="bs-preview-remove" draggable={false} aria-label={`Karte ${i+1} entfernen`} title="Karte entfernen" disabled={busy} onClick={e=>{e.stopPropagation();onRemove(c.id);}}>−</button></div>}
        {c.type==='media'?<Picture image={c.image} placeholder={<DraftImage headline={c.headline || ''} copy={c.copy || ''}/>}/>:<>
          <div className="bs-grid">{c.slots.map((slot,j)=>{
            const target=productUrl(slot,story.marketplace), Tag=onSelect?'button':'a';
            return <Tag key={j} className={`bs-grid-target${selected===c.id&&selectedSlot===j?' is-slot-selected':''}`} {...(onSelect?{type:'button',onClick:e=>{e.preventDefault();e.stopPropagation();onSelect(c.id,j);}}:{href:target||undefined,target:'_blank',rel:'noopener noreferrer'})} draggable={false} aria-label={`Produkt ${j+1}${slot.asin?' '+slot.asin:''}`}>
              <Picture image={slotDisplayImage(slot,c)} placeholder={<DraftImage/>} fit={slotImageMode(slot,c)==='custom'?'cover':'contain'}/>
            </Tag>;
          })}{c.copy&&c.slots.every(slot=>!slotDisplayImage(slot,c))&&<div className="bs-grid-draft-copy">{c.copy}</div>}</div>
          <div className="bs-grid-footer"><strong>{c.headline}</strong>{onSelect?<span className="bs-shop-label">Shop besuchen</span>:safeUrl(c.shopUrl)&&<a href={safeUrl(c.shopUrl)} target="_blank" rel="noopener noreferrer">Shop besuchen</a>}</div>
        </>}
      </div>)}
    </div></div>

    {editable&&<button className="bs-preview-add" aria-label="Karte hinzufügen" title="Karte hinzufügen" disabled={busy||story.cards.length>=19} onClick={onAdd}>＋</button>}
    <button className="bs-prev" aria-label="Vorherige Karten" disabled={index===0} onClick={()=>move(-1)}>‹</button>
    <button className="bs-next" aria-label="Nächste Karten" disabled={index>=steps.length-1} onClick={()=>move(1)}>›</button>
    {dragging&&edge!==0&&<div className={`bs-drag-edge ${edge<0?'left':'right'}`} aria-hidden="true">{edge<0?'‹':'›'}</div>}
    <span className="bs-counter" aria-live="polite">{index+1} / {Math.max(steps.length,1)}</span>
  </div>;
}
