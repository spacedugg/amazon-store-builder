import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import catalog from '../data/storeReferenceCatalog.json';
import { mergeReferenceCatalog, referenceKey, homepageScreenshot } from '../storeReferences.mjs';
import './StoreReferenceLibrary.css';

function captureDate(value, en) {
  return new Intl.DateTimeFormat(en ? 'en-GB' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' }).format(new Date(value));
}

function HomepagePreview({ entry, en }) {
  const [failed, setFailed] = useState(false);
  const image = homepageScreenshot(entry);
  if (image && !failed) return <div className="srl-homepage-preview"><img src={image.url} alt={(en ? 'Full homepage: ' : 'Vollständige Homepage: ') + entry.brandName} width={image.width} height={image.height} loading="lazy" onError={() => setFailed(true)} /></div>;
  return <div className="srl-motif srl-missing-homepage"><span className="srl-no-image"><b>{entry.brandName}</b><small>{entry.kind === 'product' ? (en ? 'Product reference' : 'Produktreferenz') : (image && failed ? (en ? 'Screenshot could not be loaded' : 'Screenshot konnte nicht geladen werden') : (en ? 'Homepage screenshot missing' : 'Homepage-Screenshot fehlt'))}</small></span></div>;
}

function HomepageCapture({ entry, en }) {
  const [failed, setFailed] = useState(false);
  const image = homepageScreenshot(entry);
  if (!image) return null;
  return <figure className="srl-homepage-figure">{failed ? <p role="alert">{en ? 'The saved homepage screenshot could not be loaded.' : 'Der gespeicherte Homepage-Screenshot konnte nicht geladen werden.'}</p> : <img src={image.url} alt={(en ? 'Full homepage: ' : 'Vollständige Homepage: ') + entry.brandName} width={image.width} height={image.height} onError={() => setFailed(true)} />}<figcaption>{en ? 'Captured on ' : 'Aufgenommen am '}<time dateTime={image.capturedAt}>{captureDate(image.capturedAt, en)}</time> · <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer">{en ? 'Source page' : 'Quellseite'}</a></figcaption></figure>;
}

export function StoreReferenceLibrary({ onClose, onSelect, selectedUrls = [], lang = 'de' }) {
  const en = lang === 'en';
  const [rows, setRows] = useState(() => mergeReferenceCatalog(catalog));
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [extraError, setExtraError] = useState(false);
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState('');
  const dialog = useRef(null);
  const content = useRef(null);
  useEffect(() => { if (content.current) content.current.scrollTop = 0; }, [active]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const controller = new AbortController();
    fetch('/api/reference-stores', { signal: controller.signal }).then(r => { if (!r.ok) throw Error('load'); return r.json(); })
      .then(data => { if (!controller.signal.aborted) setRows(mergeReferenceCatalog(catalog, Array.isArray(data.stores) ? data.stores : [])); })
      .catch(() => { if (!controller.signal.aborted) setExtraError(true); });
    return () => { controller.abort(); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, []);
  const existing = new Set(selectedUrls.map(referenceKey));
  const visible = rows.filter(r => [r.brandName, r.category, r.storeUrl, ...(r.tags || [])].join(' ').toLowerCase().includes(query.toLowerCase()));
  const title = en ? 'Brand Store examples' : 'Brand-Store-Beispiele';
  function keydown(e) {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    if (e.key !== 'Tab') return;
    const items = [...dialog.current.querySelectorAll('button:not(:disabled),a[href],input')].filter(el => el.getClientRects().length);
    if (!items.length) { e.preventDefault(); return; }
    if (e.shiftKey && (document.activeElement === items[0] || document.activeElement === dialog.current)) { e.preventDefault(); items.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0].focus(); }
  }
  async function copy(row) {
    try { await navigator.clipboard.writeText(row.storeUrl); setCopied(row.id); setCopyError(''); }
    catch (_) { setCopyError(en ? 'Copy failed. Select and copy the link below.' : 'Kopieren fehlgeschlagen. Bitte den Link unten markieren und kopieren.'); }
  }
  return createPortal(<div className="srl-overlay" onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}>
    <section ref={dialog} className="srl-dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onKeyDown={keydown} onClick={e => e.stopPropagation()}>
      <header className="srl-header"><div><h2>{title}</h2><p>{en ? 'Full Brand Store homepages at a glance.' : 'Die vollständigen Store-Homepages auf einen Blick.'}</p></div><button type="button" onClick={onClose} aria-label={en ? 'Close examples' : 'Beispiele schließen'}>×</button></header>
      <div className="srl-content" ref={content}>
        {extraError && <p className="srl-notice">{en ? 'Additional saved examples could not be loaded. The shared catalogue remains available.' : 'Zusätzlich gespeicherte Beispiele konnten nicht geladen werden. Der gemeinsame Katalog ist weiterhin verfügbar.'}</p>}
        {active ? <div className="srl-detail">
          <button type="button" className="srl-secondary" onClick={() => { setActive(null); setCopyError(''); }}>{en ? '← All examples' : '← Alle Beispiele'}</button>
          <h3>{active.brandName}</h3>
          <HomepageCapture key={active.id} entry={active} en={en} />
          {!homepageScreenshot(active) && <p className="srl-notice">{active.kind === 'product' ? (en ? 'Product reference. Its Brand Store has not yet been verified.' : 'Produktreferenz. Der zugehörige Brand Store ist noch nicht verifiziert.') : active.nameVerified === false ? (en ? 'Store link saved; brand name and homepage preview not yet verified.' : 'Store-Link gespeichert; Markenname und Homepage-Vorschau sind noch nicht verifiziert.') : active.images.length ? (en ? 'Original motifs from the archived store analysis; this is not a current homepage screenshot.' : 'Originalmotive aus der archivierten Store-Analyse; kein aktueller Screenshot der Homepage.') : (en ? 'No homepage screenshot is available yet.' : 'Für diesen Store liegt noch kein Homepage-Screenshot vor.')}</p>}
          {!!(active.images.length || active.modules.length) && <details className="srl-archive"><summary>{en ? 'Supplementary archive: motifs and recorded structure' : 'Ergänzendes Archiv: Motive und aufgezeichneter Aufbau'}</summary><p className="srl-notice">{en ? 'This archive material is not a homepage screenshot.' : 'Dieses Archivmaterial ist kein Homepage-Screenshot.'}</p>
          {active.images.map((image, i) => <figure key={image.url}><img src={image.url} alt={active.brandName + ' · ' + (i + 1)} loading="lazy" onError={e => { e.currentTarget.hidden = true; }} /><figcaption>{en ? 'Archived original motif' : 'Archiviertes Originalmotiv'} {i + 1}{active.analyzedAt ? ' · ' + active.analyzedAt : ''}</figcaption></figure>)}
          {!!active.modules.length && <div className="srl-structure"><h4>{en ? 'Recorded page structure' : 'Aufgezeichneter Seitenaufbau'}</h4>{active.analyzedAt && <p>{en ? 'Analysis dated' : 'Analyse vom'} {active.analyzedAt}</p>}<ol>{active.modules.map((m, i) => <li key={i}><b>{m.name}</b> <span>{m.layout}{m.tiles ? ' · ' + m.tiles + (en ? ' tiles' : ' Kacheln') : ''}</span></li>)}</ol></div>}
          </details>}
          {!active.images.length && !active.modules.length && <p>{en ? 'Open the original link to inspect this example. A screenshot can be added to the catalogue later.' : 'Öffne den Original-Link, um dieses Beispiel anzusehen. Ein Screenshot kann später im Katalog ergänzt werden.'}</p>}
          <p className="srl-url">{active.storeUrl}</p>
          <div className="srl-actions"><a href={active.storeUrl} target="_blank" rel="noopener noreferrer">{active.kind === 'product' ? (en ? 'Open product ↗' : 'Produkt öffnen ↗') : (en ? 'Open Amazon Store ↗' : 'Amazon Store öffnen ↗')}</a><button type="button" onClick={() => copy(active)}>{copied === active.id ? (en ? 'Copied ✓' : 'Kopiert ✓') : (en ? 'Copy link' : 'Link kopieren')}</button></div>
          {copyError && <p role="alert">{copyError}</p>}
          {!!active.alternativeUrls?.length && <details><summary>{en ? 'Other saved store links' : 'Weitere gespeicherte Store-Links'}</summary>{active.alternativeUrls.map(url => <p key={url}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a></p>)}</details>}
        </div> : <>
          <label className="srl-search">{en ? 'Search examples' : 'Beispiele suchen'}<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={en ? 'Brand or category' : 'Marke oder Kategorie'} /></label>
          <p className="srl-count">{visible.length} {en ? 'examples' : 'Beispiele'}</p>
          <div className="srl-grid">{visible.map(row => <article className="srl-card" key={row.id}>
            <button type="button" className="srl-preview-button" onClick={() => setActive(row)} aria-label={(en ? 'View example: ' : 'Beispiel ansehen: ') + row.brandName}><HomepagePreview entry={row} en={en} /></button>
            <div className="srl-card-body"><h3>{row.brandName}</h3><p>{row.kind === 'product' ? (en ? 'Product · store unverified' : 'Produkt · Store-Zuordnung offen') : homepageScreenshot(row) ? <>{en ? 'Captured on ' : 'Aufgenommen am '}<time dateTime={homepageScreenshot(row).capturedAt}>{captureDate(homepageScreenshot(row).capturedAt, en)}</time></> : (en ? 'Homepage screenshot pending' : 'Homepage-Aufnahme ausstehend')}</p>
              <div className="srl-actions"><button type="button" onClick={() => setActive(row)}>{en ? 'View example' : 'Beispiel ansehen'}</button><a href={row.storeUrl} target="_blank" rel="noopener noreferrer">{en ? 'Original ↗' : 'Original ↗'}</a></div>
              {onSelect && row.kind !== 'product' && <label className="srl-select"><input type="checkbox" checked={existing.has(referenceKey(row.storeUrl)) || selected.has(row.id)} disabled={existing.has(referenceKey(row.storeUrl))} onChange={e => setSelected(prev => { const next = new Set(prev); if (e.target.checked) next.add(row.id); else next.delete(row.id); return next; })} />{existing.has(referenceKey(row.storeUrl)) ? (en ? 'Already selected' : 'Bereits ausgewählt') : (en ? 'Use as reference: ' : 'Als Referenz wählen: ') + row.brandName}</label>}
            </div>
          </article>)}</div>
          {!visible.length && <p>{en ? 'No matching examples.' : 'Keine passenden Beispiele.'}</p>}
        </>}
      </div>
      {onSelect && <footer className="srl-footer"><span>{selected.size} {en ? 'selected' : 'ausgewählt'}</span><button type="button" disabled={!selected.size} onClick={() => { onSelect(rows.filter(r => selected.has(r.id))); onClose(); }}>{en ? 'Use selection' : 'Auswahl übernehmen'}</button></footer>}
    </section>
  </div>, document.body);
}

export default function StoreReferenceLibraryButton({ onSelect, selectedUrls, lang = 'de', label }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="srl-launch" onClick={() => setOpen(true)}>{label || (lang === 'en' ? 'Store examples' : 'Store-Beispiele')}</button>{open && <StoreReferenceLibrary onClose={() => setOpen(false)} onSelect={onSelect} selectedUrls={selectedUrls} lang={lang} />}</>;
}
