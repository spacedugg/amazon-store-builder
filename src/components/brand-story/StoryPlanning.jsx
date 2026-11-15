import PlanningExamples from './PlanningExamples';
import React, { useEffect, useRef, useState } from 'react';
import { defaultPlanning, mergeDiscoveredPages, applyStoreDiscovery, parseAsins, storePlanningReady, FOCUS_REASONS, FOCUS_DETAILS, normalizeBrandWebsite, gridDestinationError } from '../../brandStoryPlanning.mjs';

export default function StoryPlanning({ story, onChange, onContinue, onManual, onJson }) {
  const p = story.planning || defaultPlanning();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [progress, setProgress] = useState('');
  const [websiteError,setWebsiteError]=useState('');
  const [asinText, setAsinText] = useState({}), [focusAsin,setFocusAsin]=useState('');
  const storeReady=storePlanningReady(p);
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
      let pages;
      if(!page){
        setProgress('Store-Navigation wird gelesen …');
        const result=await request(storeUrl,null,abort.signal);
        if(abort.signal.aborted) return;
        if(!result.pages?.some(page=>page.status==='loaded')) throw Error(result.warnings?.[0] || 'Der Store konnte nicht gelesen werden. Bitte erneut versuchen.');
        const next=applyStoreDiscovery(latest.current,result);apply(next);
        pages=next.planning.categories.filter(c=>c.selected&&c.url&&!gridDestinationError(c,storeUrl)&&c.status!=='loaded'&&!c.productsEdited);
        if(!pages.length){setProgress('Store eingelesen. Vorhandene Produktvorschläge bleiben erhalten.');return;}
      }else pages=page==='selected'?p.categories.filter(c=>c.selected&&c.url&&!gridDestinationError(c,p.storeUrl)):[page];
      let failed=0;
      for(let i=0;i<pages.length;i++){
        if(abort.signal.aborted) break;
        setProgress(`Produktvorschläge werden geladen: ${i+1} / ${pages.length} · ${pages[i].name}`);
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
      if(!abort.signal.aborted) setProgress(failed?`${failed} Unterseiten konnten nicht vollständig gelesen werden. Vorhandene Vorschläge bleiben erhalten; erneut versuchen oder ASINs ergänzen.`:'Produktvorschläge geladen. Du kannst die ASINs ändern. Die Auswahl ist keine verifizierte Bestseller-Rangfolge.');
    }catch(e){if(!abort.signal.aborted){setError(e.message);setProgress('');}}
    finally{if(!abort.signal.aborted)setBusy(false);}
  }
  function addFocus(){
    const asin=focusAsin.trim().toUpperCase();
    if(!/^[A-Z0-9]{10}$/.test(asin)){setError('Bitte eine gültige ASIN mit zehn Zeichen eingeben.');return;}
    if(p.focusProducts.some(f=>f.asin===asin)){setError('Dieses Produkt ist bereits ausgewählt.');return;}
    if(p.focusProducts.length>=19){setError('Maximal 19 Fokus-Produkte möglich.');return;}
    update({focusProducts:[...p.focusProducts,{asin,reason:'push',note:''}]});setFocusAsin('');setError('');
  }
  const brandField=<label className="bs-field"><span>Markenname</span><input aria-label="Markenname" value={story.brandName} onChange={e=>apply({...latest.current,brandName:e.target.value})}/></label>;
  return <section className="bs-planning">
    <div className="bs-entry-options" role="group" aria-label="Brand Story starten">
      <button aria-label="Automatisch" className={p.mode==='store'?'active':''} aria-pressed={p.mode==='store'} disabled={busy} onClick={()=>update({mode:'store'})}><strong>Automatisch</strong></button>
      <button aria-label="Manuell starten" className={p.mode==='manual'?'active':''} aria-pressed={p.mode==='manual'} disabled={busy} onClick={()=>{let websiteUrl=p.websiteUrl || '';try{normalizeBrandWebsite(websiteUrl);}catch{websiteUrl='';}update({mode:'manual',websiteUrl});setWebsiteError('');}}><strong>Manuell starten</strong></button>
    </div>
    {p.mode==='store' ? <>
      <ol className="bs-planning-steps" aria-label="Ablauf der automatischen Erstellung"><li aria-current={!storeReady?'step':undefined}>1 · Store einlesen</li><li aria-current={storeReady?'step':undefined}>2 · Auswahl und Angaben</li><li>3 · Konzept in Claude</li></ol>
      <fieldset disabled={busy} className="bs-planning-fields">
        <h3>1. Store einlesen</h3>
        <label className="bs-field"><span>Amazon Brand Store-Link</span><input aria-label="Amazon Brand Store-Link" type="url" value={p.storeUrl} placeholder="https://www.amazon.de/stores/…" onChange={e=>{update({storeUrl:e.target.value});setError('');setProgress('');}}/></label>
        <label className="bs-field"><span>Unternehmenswebsite für Claude (optional)</span><input aria-label="Unternehmenswebsite für Claude" type="url" value={p.websiteUrl || ''} placeholder="https://www.marke.de" onChange={e=>{update({websiteUrl:e.target.value});setWebsiteError('');}} onBlur={()=>{try{update({websiteUrl:normalizeBrandWebsite(latest.current.planning?.websiteUrl || '')});setWebsiteError('');}catch(e){setWebsiteError(e.message);}}}/></label>
        <p className="bs-optional-purpose">Claude recherchiert daraus die Homepage, relevante Kategorien im Hauptmenü und Seiten wie „Über uns“ oder „Unser Unternehmen“. Weitere Infos kannst du später im Chat ergänzen.</p>
        {websiteError && <p className="bs-warning" role="alert">{websiteError}</p>}
        <button className="bs-primary" disabled={!p.storeUrl.trim()} onClick={()=>discover()}>{storeReady?'Store erneut einlesen':'Store auslesen'}</button>
      </fieldset>
    </> : <fieldset disabled={busy} className="bs-planning-fields">{brandField}</fieldset>}
    {busy && <div role="status"><p>{progress}</p><button onClick={()=>{controller.current?.abort();setBusy(false);setProgress('Abgebrochen.');}}>Auslesen abbrechen</button></div>}
    {p.mode==='store' && !busy && progress && <p className="bs-help" role="status">{progress}</p>}
    {error && <p className="bs-warning" role="alert">{error}</p>}
    {p.mode==='store' && storeReady && <fieldset disabled={busy} className="bs-planning-fields bs-store-details">
      <h3>2. Auswahl und Angaben</h3>
      {brandField}
      {!story.brandName && <p className="bs-warning" role="alert">Der Store wurde gelesen, aber der Markenname konnte nicht erkannt werden. Bitte ergänzen.</p>}
      <section className="bs-category-plan"><h3>Kategorien und Produkte</h3>
        {p.categories.filter(c=>!gridDestinationError(c,p.storeUrl)).map(c=><article className="bs-category-row" key={c.id}>
          <div className="bs-category-heading"><label><input type="checkbox" aria-label={`${c.name || 'Kategorie'} aufnehmen`} checked={c.selected} onChange={e=>category(c.id,{selected:e.target.checked})}/> Aufnehmen</label><span>{c.status==='loaded'?'Gelesen':c.status==='error'?'Bitte ergänzen':c.status==='manual'?'Manuell':'Noch nicht gelesen'}</span><button onClick={()=>update({categories:p.categories.filter(a=>a.id!==c.id)})} aria-label={`${c.name || 'Kategorie'} entfernen`}>Entfernen</button></div>
          <div className="bs-category-inputs"><label className="bs-field"><span>Kategorie</span><input aria-label={`Kategorie ${c.id}`} value={c.name} onChange={e=>category(c.id,{name:e.target.value})}/></label><label className="bs-field"><span>Unterseiten-Link</span><input aria-label={`Unterseiten-Link ${c.name}`} value={c.url} onChange={e=>category(c.id,{url:e.target.value})}/></label></div>
          <label className="bs-field"><span>Produktvorschläge · bis zu vier ASINs, editierbar</span><input aria-label={`Produkt-ASINs ${c.name}`} value={asinText[c.id] ?? c.asins.join(', ')} onChange={e=>{setAsinText(t=>({...t,[c.id]:e.target.value}));category(c.id,{asins:parseAsins(e.target.value),productsEdited:true});}} onBlur={()=>setAsinText(t=>{const next={...t};delete next[c.id];return next;})}/></label>
          {c.status==='loaded' && c.asins.length<4 && <p className="bs-help">{c.asins.length} Produktziele hinterlegt. Weitere ASINs kannst du ergänzen oder erneut einlesen.</p>}
          {!!c.observedAsins?.length && <details><summary>{c.observedAsins.length} gefundene ASINs ansehen</summary><div className="bs-asin-options">{c.observedAsins.map(asin=><button key={asin} disabled={c.asins.length>=4} onClick={()=>category(c.id,{asins:[...c.asins,asin],productsEdited:true})}>{asin} hinzufügen</button>)}</div></details>}
          {c.error && <p className="bs-warning">{c.error}</p>}
          {c.url && <button onClick={()=>discover(c)}>{c.status==='loaded'?'Produkte erneut lesen':'Produkte lesen / erneut versuchen'}</button>}
        </article>)}
        <div className="bs-dialog-actions"><button onClick={()=>update({categories:[...p.categories,{id:crypto.randomUUID(),name:'Neue Kategorie',url:'',selected:true,asins:[],status:'manual'}]})}>Kategorie manuell ergänzen</button>{p.categories.some(c=>c.selected&&c.url&&!gridDestinationError(c,p.storeUrl)) && <button onClick={()=>discover('selected')}>Produkte der Auswahl laden</button>}</div>
      </section>
      <details className="bs-optional"><summary>Wichtige Produkte (optional)</summary><p className="bs-optional-purpose">Welche Produkte soll Claude besonders erklären oder zeigen? Die ASIN setzt einen Schwerpunkt: Claude kann passende Erklärungen, Beispielmotive und ein Produkt-Grid vorschlagen. Zusätzliche Karten werden erst im Gespräch abgestimmt.</p><PlanningExamples kind="focus"/>
        <div className="bs-dialog-actions"><input aria-label="Fokus-ASIN" value={focusAsin} placeholder="ASIN" onChange={e=>setFocusAsin(e.target.value)}/><button onClick={addFocus}>Produkt aufnehmen</button></div>
        {p.focusProducts.map((f,i)=>{const detail=FOCUS_DETAILS[f.reason];return <section className="bs-focus-product" key={f.asin}>
          <div className="bs-focus-row"><strong>{f.asin}</strong><label className="bs-field"><span>Grund für den Produktfokus</span><select aria-label={`Auswahlgrund ${f.asin}`} value={f.reason} onChange={e=>update({focusProducts:p.focusProducts.map((x,j)=>j===i?{...x,reason:e.target.value}:x)})}>{!FOCUS_REASONS.some(([v])=>v===f.reason)&&<option value={f.reason}>{f.reason}</option>}{FOCUS_REASONS.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label><label className="bs-field"><span>Konkreter Auftrag zum Produkt (optional)</span><input aria-label={`Produktauftrag ${f.asin}`} value={f.note || ''} placeholder={detail?.example || 'Was soll bei diesem Produkt gezeigt werden?'} onChange={e=>update({focusProducts:p.focusProducts.map((x,j)=>j===i?{...x,note:e.target.value}:x)})}/></label><button onClick={()=>update({focusProducts:p.focusProducts.filter((_,j)=>j!==i)})}>Entfernen</button></div>
          {detail && <p className="bs-focus-effect"><strong>{detail.label}</strong> {detail.effect}</p>}
        </section>;})}
      </details>

    </fieldset>}
    <footer className="bs-dialog-actions"><button className="bs-primary" disabled={busy || !!websiteError || !story.brandName.trim() || (p.mode==='store' && !storeReady)} onClick={p.mode==='manual'?onManual:onContinue}>{p.mode==='manual'?'Story öffnen':'Weiter zu Claude'}</button><button disabled={busy} onClick={onJson}>Vorhandenes JSON importieren</button></footer>
  </section>;
}
