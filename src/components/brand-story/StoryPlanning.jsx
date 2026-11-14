import React, { useEffect, useRef, useState } from 'react';
import { defaultPlanning, mergeDiscoveredPages, applyStoreDiscovery, parseAsins, STORY_GOALS, FOCUS_REASONS } from '../../brandStoryPlanning.mjs';

export default function StoryPlanning({ story, onChange, onContinue, onManual, onJson }) {
  const p = story.planning || defaultPlanning();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [progress, setProgress] = useState('');
  const [focusAsin, setFocusAsin] = useState(''), [asinText, setAsinText] = useState({});
  const latest = useRef(story), controller = useRef(null); latest.current = story;
  useEffect(()=>()=>controller.current?.abort(),[]);
  const apply = next => { latest.current=next; onChange(next); };
  const update = patch => apply({ ...latest.current, planning: { ...(latest.current.planning || defaultPlanning()), ...patch } });
  const category = (id, patch) => update({ categories: (latest.current.planning?.categories || []).map(c=>c.id===id?{...c,...patch}:c) });
  async function request(storeUrl, pageUrl, signal) {
    const response=await fetch('/api/brand-story-discover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({storeUrl,...(pageUrl?{pageUrl}:{})}),signal});
    const result=await response.json();
    if(!response.ok) throw Error(result.error || result.warnings?.[0] || 'Der Store konnte nicht gelesen werden. Du kannst Kategorien und ASINs manuell ergänzen.');
    return result;
  }
  async function discover(page) {
    if(busy) return;
    const storeUrl=p.storeUrl.trim();
    const abort=new AbortController(); controller.current=abort; setBusy(true); setError('');
    try{
      if(!page){
        setProgress('Store-Navigation wird gelesen …');
        const result=await request(storeUrl,null,abort.signal);
        if(abort.signal.aborted) return;
        apply(applyStoreDiscovery(latest.current,result));
        setProgress((result.warnings || []).join(' ') || 'Unterseiten gefunden. Auswahl und Namen bitte prüfen.');
      }else{
        const pages=page==='selected'?p.categories.filter(c=>c.selected&&c.url):[page];
        let failed=0;
        for(let i=0;i<pages.length;i++){
          if(abort.signal.aborted) break;
          setProgress(`Produkte werden gelesen: ${i+1} / ${pages.length} · ${pages[i].name}`);
          try{
            const result=await request(storeUrl,pages[i].url,abort.signal);
            if(abort.signal.aborted) break;
            const plan=latest.current.planning || defaultPlanning();
            apply({...latest.current,planning:mergeDiscoveredPages(plan,result)});
            if(result.pages?.some(c=>c.status==='error')) failed++;
          }catch(e){
            if(abort.signal.aborted) break;
            failed++;category(pages[i].id,{status:'error',error:e.message});
          }
        }
        if(!abort.signal.aborted) setProgress(failed?`${failed} Unterseiten konnten nicht vollständig gelesen werden. Erfolgreiche Ergebnisse bleiben erhalten; erneut versuchen oder manuell ergänzen.`:'Produkte gelesen. Die ersten vier gefundenen ASINs sind Vorschläge, keine Bestseller-Rangfolge. Bitte prüfen.');
      }
    }catch(e){if(!abort.signal.aborted){setError(e.message);setProgress('');}}
    finally{if(!abort.signal.aborted)setBusy(false);}
  }
  function addFocus(){
    const asin=focusAsin.trim().toUpperCase();
    if(!/^[A-Z0-9]{10}$/.test(asin)){setError('Bitte eine gültige ASIN mit zehn Zeichen eingeben.');return;}
    if(p.focusProducts.some(f=>f.asin===asin)){setError('Dieses Produkt ist bereits im Fokus.');return;}
    if(p.focusProducts.length>=19){setError('Maximal 19 Fokus-Produkte möglich.');return;}
    update({focusProducts:[...p.focusProducts,{asin,reason:'push',note:''}]});setFocusAsin('');setError('');
  }
  return <section className="bs-planning">
    <div className="bs-entry-options" role="group" aria-label="Brand Story starten">
      <button aria-label="Store übernehmen" className={p.mode==='store'?'active':''} aria-pressed={p.mode==='store'} disabled={busy} onClick={()=>update({mode:'store'})}><strong>Store übernehmen</strong><span>Kategorien und Produkte aus dem Amazon Store prüfen.</span></button>
      <button aria-label="Manuell starten" className={p.mode==='manual'?'active':''} aria-pressed={p.mode==='manual'} disabled={busy} onClick={()=>update({mode:'manual'})}><strong>Manuell starten</strong><span>Karten, Themen und Briefings selbst anlegen.</span></button>
    </div>
    <fieldset disabled={busy} className="bs-planning-fields">
      <label className="bs-field"><span>Markenname</span><input aria-label="Markenname" value={story.brandName} placeholder="Wird nach Möglichkeit aus dem Store übernommen" onChange={e=>onChange({...latest.current,brandName:e.target.value})}/></label>
      {p.mode==='store' && <><label className="bs-field"><span>Amazon Brand Store-Link</span><input aria-label="Amazon Brand Store-Link" type="url" value={p.storeUrl} placeholder="https://www.amazon.de/stores/…" onChange={e=>update({storeUrl:e.target.value})}/></label><button className="bs-primary" disabled={!p.storeUrl.trim()} onClick={()=>discover()}>Store auslesen</button></>}
    </fieldset>
    {busy && <div role="status"><p>{progress}</p><button onClick={()=>{controller.current?.abort();setBusy(false);setProgress('Abgebrochen. Bereits geladene Ergebnisse bleiben erhalten.');}}>Auslesen abbrechen</button></div>}
    {!busy && progress && <p className="bs-help" role="status">{progress}</p>}
    {error && <p className="bs-warning" role="alert">{error}</p>}
    <fieldset disabled={busy} className="bs-planning-fields">
      {p.mode==='store' && <section className="bs-category-plan"><h3>Kategorien und Produkte</h3>
        <p className="bs-help">Wähle die gewünschten Unterseiten. Pro Grid: unten der Kategorie-Link, darüber vier Produktziele. Weniger Produkte sind möglich; eine ASIN darf mehrfach vorkommen.</p>
        {p.categories.map(c=><article className="bs-category-row" key={c.id}>
          <div className="bs-category-heading"><label><input type="checkbox" aria-label={`${c.name || 'Kategorie'} aufnehmen`} checked={c.selected} onChange={e=>category(c.id,{selected:e.target.checked})}/> Aufnehmen</label><span>{c.status==='loaded'?'Gelesen':c.status==='error'?'Bitte ergänzen':c.status==='manual'?'Manuell':'Noch nicht gelesen'}</span><button onClick={()=>update({categories:p.categories.filter(a=>a.id!==c.id)})} aria-label={`${c.name || 'Kategorie'} entfernen`}>Entfernen</button></div>
          <div className="bs-category-inputs"><label className="bs-field"><span>Kategorie</span><input aria-label={`Kategorie ${c.id}`} value={c.name} onChange={e=>category(c.id,{name:e.target.value})}/></label><label className="bs-field"><span>Unterseiten-Link</span><input aria-label={`Unterseiten-Link ${c.name}`} value={c.url} onChange={e=>category(c.id,{url:e.target.value})}/></label></div>
          <label className="bs-field"><span>Vier Produkt-ASINs · durch Komma getrennt</span><input aria-label={`Produkt-ASINs ${c.name}`} value={asinText[c.id] ?? c.asins.join(', ')} onChange={e=>{setAsinText(t=>({...t,[c.id]:e.target.value}));category(c.id,{asins:parseAsins(e.target.value),productsEdited:true});}} onBlur={()=>setAsinText(t=>{const next={...t};delete next[c.id];return next;})}/></label>
          {!!c.observedAsins?.length && <details><summary>{c.observedAsins.length} gefundene ASINs ansehen</summary><div className="bs-asin-options">{c.observedAsins.map(asin=><button key={asin} disabled={c.asins.length>=4} onClick={()=>category(c.id,{asins:[...c.asins,asin],productsEdited:true})}>{asin} hinzufügen</button>)}</div><p className="bs-help">Aus der gelesenen Seite, ohne Vollständigkeits- oder Ranggarantie.</p></details>}
          {c.error && <p className="bs-warning">{c.error}</p>}
          {c.url && <button onClick={()=>discover(c)}>{c.status==='loaded'?'Produkte erneut lesen':'Produkte lesen / erneut versuchen'}</button>}
        </article>)}
        <div className="bs-dialog-actions"><button onClick={()=>update({categories:[...p.categories,{id:crypto.randomUUID(),name:'Neue Kategorie',url:'',selected:true,asins:[],status:'manual'}]})}>Kategorie manuell ergänzen</button>{p.categories.some(c=>c.selected&&c.url) && <button onClick={()=>discover('selected')}>Produkte der Auswahl laden</button>}</div>
      </section>}
      <label className="bs-field"><span>Was soll die Story vor allem erreichen?</span><select aria-label="Schwerpunkt der Story" value={p.goal} onChange={e=>update({goal:e.target.value})}>{!STORY_GOALS.some(([v])=>v===p.goal)&&<option value={p.goal}>{p.goal || 'Noch offen'}</option>}{STORY_GOALS.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
      <details className="bs-optional"><summary>Produkte besonders hervorheben (optional){p.focusProducts.length?` · ${p.focusProducts.length} ausgewählt`:''}</summary>
        <p className="bs-help">Ein Hero-Produkt kann erklärt und mit Beispielen gezeigt werden. „Bestseller“ ist ein möglicher Auswahlgrund; es entsteht dadurch keine zusätzliche doppelte Karte.</p>
        <div className="bs-dialog-actions"><input aria-label="Fokus-ASIN" value={focusAsin} placeholder="ASIN" onChange={e=>setFocusAsin(e.target.value)}/><button onClick={addFocus}>Produkt aufnehmen</button></div>
        {p.focusProducts.map((f,i)=><div className="bs-focus-row" key={f.asin}><strong>{f.asin}</strong><select aria-label={`Auswahlgrund ${f.asin}`} value={f.reason} onChange={e=>update({focusProducts:p.focusProducts.map((x,j)=>j===i?{...x,reason:e.target.value}:x)})}>{!FOCUS_REASONS.some(([v])=>v===f.reason)&&<option value={f.reason}>{f.reason}</option>}{FOCUS_REASONS.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select><input aria-label={`Hinweis ${f.asin}`} value={f.note || ''} placeholder={f.reason==='bestseller'?'Quelle, Zeitraum und Marktplatz oder redaktionelle Auswahl':'Was soll erklärt oder gezeigt werden?'} onChange={e=>update({focusProducts:p.focusProducts.map((x,j)=>j===i?{...x,note:e.target.value}:x)})}/><button onClick={()=>update({focusProducts:p.focusProducts.filter((_,j)=>j!==i)})}>Entfernen</button></div>)}
        <label><input type="checkbox" checked={p.includeFocusGrid} onChange={e=>update({includeFocusGrid:e.target.checked})}/> Zusätzlich ein gemeinsames Produktfokus-Grid vorsehen</label>
      </details>
      <details className="bs-optional"><summary>Markenwissen und weitere Angaben (optional)</summary><label className="bs-field"><span>Was sollte Claude über die Marke wissen?</span><textarea aria-label="Markenwissen und Quellen" value={story.brandFacts || ''} placeholder="Auftrag, belegbare Besonderheiten, Gründer, Materialien oder Quellen …" onChange={e=>onChange({...latest.current,brandFacts:e.target.value})}/></label><div className="bs-category-inputs"><label className="bs-field"><span>Marktplatz</span><select aria-label="Marktplatz" value={story.marketplace} onChange={e=>onChange({...latest.current,marketplace:e.target.value})}>{['de','com','co.uk','fr','it','es','nl','se','pl','com.be'].map(v=><option key={v}>{v}</option>)}</select></label><label className="bs-field"><span>Sprache</span><input aria-label="Sprache" value={story.language || ''} onChange={e=>onChange({...latest.current,language:e.target.value})}/></label></div></details>
    </fieldset>
    <footer className="bs-dialog-actions"><button className="bs-primary" disabled={busy} onClick={p.mode==='manual'?()=>onManual(false):onContinue}>{p.mode==='manual'?'Layout manuell öffnen':'Weiter zu Claude'}</button>{p.mode==='store' && p.categories.some(c=>c.selected) && <button disabled={busy} onClick={()=>onManual(true)}>Kategorie-Grids als Layout öffnen</button>}<button disabled={busy} onClick={onJson}>Vorhandenes JSON importieren</button></footer>
  </section>;
}
