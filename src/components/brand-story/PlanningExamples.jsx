import React, {useEffect,useState} from 'react';
export default function PlanningExamples({kind}) {
  const [story,setStory]=useState(null);
  useEffect(()=>{
    const abort=new AbortController();
    fetch('/brand-story-examples/stories.json',{signal:abort.signal}).then(r=>r.ok?r.json():null).then(data=>setStory(data?.stories?.find(s=>s.brandName===(kind==='focus'?'MyPuzzle':'OmniRelexx')) || null)).catch(()=>{});
    return()=>abort.abort();
  },[kind]);
  if(!story)return null;
  const examples=kind==='focus'?[[4,'MyPuzzle · Produkt erklären'],[5,'MyPuzzle · Fotopuzzle zeigen']]:[[1,'OMNI RELAX · Gründer vorstellen'],[3,'OMNI RELAX · Produktidee erzählen']];
  return <div className="bs-planning-examples" aria-label={kind==='focus'?'Beispiele für Produktfokus':'Beispiele für Markeninfos'}>{examples.map(([index,label])=>{
    const card=story.cards[index];if(!card)return null;
    return <figure key={index}>{card.type==='grid'?<div className="bs-planning-example-grid">{card.slots.map((slot,i)=><img key={i} src={slot.image?.url} alt="" loading="lazy"/>)}</div>:<img src={card.image?.url} alt={label} loading="lazy"/>}<figcaption>{label}</figcaption></figure>;
  })}</div>;
}
