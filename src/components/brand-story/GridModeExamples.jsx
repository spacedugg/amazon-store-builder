import React, {useEffect, useId, useState} from 'react';

const localImage = url => url?.startsWith('https://brand-store-preview.temoa.de/brand-story-examples/') ? url.replace('https://brand-store-preview.temoa.de','') : url;
export default function GridModeExamples({value,onChange}) {
  const name=useId(), [examples,setExamples]=useState({}), [failed,setFailed]=useState(false);
  useEffect(()=>{
    const abort=new AbortController();
    fetch('/brand-story-examples/stories.json',{signal:abort.signal})
      .then(r=>{if(!r.ok)throw Error('Beispiele nicht verfügbar');return r.json();})
      .then(data=>{
        const omni=data.stories?.find(s=>s.brandName==='OmniRelexx');
        const futum=data.stories?.find(s=>s.brandName==='Futum');
        setExamples({composite:omni?.cards.find(c=>c.type==='grid'),individual:futum?.cards[7]});
      }).catch(e=>{if(e.name!=='AbortError')setFailed(true);});
    return()=>abort.abort();
  },[]);
  return <fieldset className="bs-grid-mode-options"><legend>Aufbau des ASIN-Grids</legend><div>
    {[['composite','Ein gesamtes Bild','OMNI RELAX'],['individual','Vier einzelne Bilder','Futum']].map(([mode,label,brand])=><label className={`bs-grid-mode-option${value===mode?' active':''}`} key={mode}>
      <span className="bs-grid-mode-title"><input type="radio" name={name} value={mode} aria-label={label} checked={value===mode} onChange={()=>onChange(mode)}/><strong>{label}</strong></span>
      <span className="bs-grid-mode-preview" aria-label={`Beispiel ${brand}`}>
        {Array.from({length:4},(_,i)=>{const url=examples[mode]?.slots?.[i]?.image?.url;return <span key={i}>{url?<img src={localImage(url)} alt="" loading="lazy"/>:<span className="bs-mode-preview-placeholder"/>}</span>;})}
      </span>
      <small>Beispiel: {brand}</small>
    </label>)}
  </div>{failed&&<p className="bs-help">Beispielbilder gerade nicht verfügbar. Die Auswahl funktioniert weiterhin.</p>}</fieldset>;
}
