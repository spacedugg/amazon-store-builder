import React, { useEffect, useState, useRef } from 'react';
import { upload } from '@vercel/blob/client';
import { fetchProductData } from '../productData';
import { newStory, newCard, validateStory, imageWarnings, resolveUploadTarget, publicationWarnings } from '../brandStoryModel.mjs';
import { normalizeStory } from '../brandStoryWorkflow.mjs';
import { StoryCarousel } from './brand-story/StoryCarousel';
import { StoryProperties } from './brand-story/StoryElements';
import StoryOverview from './brand-story/StoryOverview';
import StorySetupDialog from './brand-story/StorySetupDialog';
import StoryModal from './brand-story/StoryModal';
import StoryReferences from './brand-story/StoryReferences';
import { StoryPrinciples, StoryDelivery } from './brand-story/StoryDelivery';
import './BrandStoryBuilder.css';
export { StoryCarousel } from './brand-story/StoryCarousel';
async function api(query = "", body) {
  const r = await fetch(
    "/api/brand-stories" + query,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const j = await r.json();
  if (!r.ok) throw Error(j.error || "Anfrage fehlgeschlagen.");
  return j;
}
function download(s) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${s.brandName || "brand-story"}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function uploadImage(file) {
  if (!["image/png", "image/jpeg"].includes(file.type))
    throw Error("Bitte JPG oder PNG hochladen.");
  const local = URL.createObjectURL(file);
  let dimensions;
  try {
    dimensions = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () =>
        resolve({ width: im.naturalWidth, height: im.naturalHeight });
      im.onerror = () => reject(Error("Bild kann nicht gelesen werden."));
      im.src = local;
    });
  } finally {
    URL.revokeObjectURL(local);
  }
  const blob = await upload(
    `brand-stories/${crypto.randomUUID()}/${file.name}`,
    file,
    { access: "public", handleUploadUrl: "/api/blob-upload" },
  );
  return { url: blob.url, name: file.name, size: file.size, ...dimensions };
}
export default function BrandStoryBuilder() {
  const token = new URLSearchParams(location.search).get('token');
  const [story, setStory] = useState(null), [record, setRecord] = useState({}), [stories, setStories] = useState([]),
    [mode, setMode] = useState(token ? 'loading' : 'editor'), [overview, setOverview] = useState(!token),
    [selected, setSelected] = useState(null), [mobile, setMobile] = useState(() => window.innerWidth < 650),
    [raster, setRaster] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''),
    [dirty, setDirty] = useState(false), [loading, setLoading] = useState(!token), [recovery, setRecovery] = useState(null),
    [setupOpen, setSetupOpen] = useState(false), [referencesOpen, setReferencesOpen] = useState(false),
    [shareOpen, setShareOpen] = useState(false), [pickerPosition, setPickerPosition] = useState(null);
  useEffect(() => {
    if (token) api('?token=' + encodeURIComponent(token)).then(r => { setStory(r.mode === 'customer' ? r.data : normalizeStory(r.data)); setRecord({ revision: r.revision }); setMode(r.mode); }).catch(e => { setMode('error'); setMessage(e.message); });
    else {
      api().then(r => setStories(r.stories || [])).catch(e => setMessage(e.message)).finally(() => setLoading(false));
      try { const d = JSON.parse(sessionStorage.getItem('brand-story-draft')); if (d?.story) { validateStory(d.story); setRecovery(d); } } catch {}
    }
  }, []);
  useEffect(() => {
    if (mode !== 'editor' || !story?.brandName?.trim()) return;
    try { sessionStorage.setItem('brand-story-draft', JSON.stringify({ story, record, dirty })); setRecovery({ story, record, dirty }); } catch {}
  }, [story, record, mode, dirty]);
  useEffect(() => {
    const f = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', f); return () => window.removeEventListener('beforeunload', f);
  }, [dirty]);
  const currentStory = useRef(story);
  currentStory.current = story;
  const card = story?.cards.find((c) => c.id === selected);
  function change(fn) {
    setStory((s) => fn(structuredClone(s)));
    setDirty(true);
  }
  function updateCard(patch) {
    change((s) => {
      Object.assign(
        s.cards.find((c) => c.id === selected),
        patch,
      );
      return s;
    });
  }
  const running = useRef(false);
  async function run(fn) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e.message);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function save(publish = false) {
    validateStory(story);
    let current = record;
    if (!current.id) {
      current = await api("", { data: story });
      setRecord(current);
    }
    const r = await api("", {
      id: current.id,
      revision: current.revision,
      data: story,
      publish,
    });
    setRecord(r);
    if (currentStory.current === story) setDirty(false);
    setMessage(publish ? "Freigabelinks aktualisiert." : "Gespeichert.");
    setStories((await api()).stories);
    return r;
  }
  async function loadProduct(cardId, slotIndex, asin) {
    if (!/^[A-Z0-9]{10}$/i.test(asin)) return;
    await run(async () => {
      const result = await fetchProductData([asin], story.marketplace);
      const p = result.products[0];
      if (!p?.image)
        throw Error(
          result.failures?.[0]?.reason ||
            "Produktbild nicht verfügbar. Eigenes Bild hochladen.",
        );
      change((s) => {
        const target = s.cards.find((c) => c.id === cardId)?.slots[slotIndex];
        if (target && target.asin === asin)
          target.productImage = { url: p.image };
        return s;
      });
    });
  }
  async function copy(text) {
    await navigator.clipboard.writeText(text);
    setMessage("In die Zwischenablage kopiert.");
  }
  function link(kind) {
    return `${location.origin}/brand-stories?token=${encodeURIComponent(record[kind + "Token"])}`;
  }
  async function load(id) {
    if (dirty && !confirm("Ungespeicherte Änderungen verwerfen?")) return;
    await run(async () => {
      const r = await api("?id=" + encodeURIComponent(id));
      setStory(r.data);
      setRecord(r);
      setSelected(null);
      setDirty(false);
      setOverview(false);
    });
  }
  async function saveDesignerAssets(next) {
    const assets = [];
    for (const kind of ['desktop', 'mobile']) if (next.background[kind]) assets.push({ kind, image: next.background[kind] });
    for (const c of next.cards) {
      if (c.type === 'media' && c.image) assets.push({ kind: 'media', cardId: c.id, image: c.image });
      if (c.type === 'grid') c.slots.forEach((slot, i) => { if (slot.image) assets.push({ kind: 'product', cardId: c.id, slot: i, image: slot.image }); });
    }
    const r = await api('?token=' + encodeURIComponent(token), { assets, revision: record.revision });
    setStory(r.data); setRecord({ revision: r.revision });
  }
  async function asset(file, apply) {
    await run(async () => {
      const img = await uploadImage(file), next = structuredClone(story);
      apply(next, img);
      if (mode === 'designer') await saveDesignerAssets(next);
      else { setStory(next); setDirty(true); }
      setMessage(mode === 'designer' ? 'Bild im Designerstand gespeichert. Die Kundenfreigabe bleibt unverändert.' : 'Bild hochgeladen. Änderungen bitte speichern.');
    });
  }
  function add(type) {
    if (story.cards.length >= 19) return;
    change(s => { const c = newCard(type, s.cards); s.cards.splice(pickerPosition ?? s.cards.length, 0, c); setSelected(c.id); return s; });
    setPickerPosition(null);
  }
  function reorder(delta) {
    change((s) => {
      const i = s.cards.findIndex((c) => c.id === selected),
        j = i + delta;
      if (j >= 0 && j < s.cards.length)
        [s.cards[i], s.cards[j]] = [s.cards[j], s.cards[i]];
      return s;
    });
  }
  async function folder(files) {
    await run(async () => {
      const next = structuredClone(story),
        report = [];
      const assigned = new Set();
      for (const f of files) {
        let target;
        try {
          target = resolveUploadTarget(next, f.webkitRelativePath || f.name);
        } catch (e) {
          report.push(`${f.name}: ${e.message}`);
          continue;
        }
        const key = target ? JSON.stringify(target) : f.name;
        const apply = target
          ? (img) => {
              if (target.kind === "desktop" || target.kind === "mobile")
                next.background[target.kind] = img;
              else {
                const c = next.cards.find((c) => c.id === target.cardId);
                if (target.kind === "media") c.image = img;
                else c.slots[target.slot].image = img;
              }
            }
          : null;
        if (!apply) {
          report.push(`${f.name}: keine passende Position`);
          continue;
        }
        if (assigned.has(key)) {
          report.push(`${f.name}: doppelter Dateischlüssel, übersprungen`);
          continue;
        }
        try {
          const img = await uploadImage(f);
          apply(img);
          const kind = target.kind;
          report.push(
            ...imageWarnings(img, kind).map((w) => `${f.name}: WARNUNG: ${w}`),
          );
          assigned.add(key);
          report.push(`${f.name}: zugeordnet`);
        } catch (e) {
          report.push(`${f.name}: ${e.message}`);
        }
      }
      if (mode === "designer") {
        await saveDesignerAssets(next);
      } else {
        setStory(next);
        setDirty(true);
      }
      setMessage(report.join("\n"));
    });
  }
  function startNew() {
    setStory(normalizeStory(newStory(''))); setRecord({}); setSelected(null); setDirty(false); setSetupOpen(true); setMessage('');
  }
  function resume() {
    if (!recovery) return;
    setStory(normalizeStory(recovery.story)); setRecord(recovery.record || {}); setDirty(recovery.dirty ?? true); setSelected(null); setOverview(false); setMessage('');
  }
  function applyImport(review) {
    setStory(review.story); if (review.foreign) setRecord({}); setSelected(null); setDirty(true); setSetupOpen(false); setOverview(false); setMessage('Konzept übernommen. Inhalte prüfen und speichern.');
  }
  async function goBack() {
    await run(async () => { if (dirty) await save(); setOverview(true); setMessage(''); });
  }
  const designer = mode === 'designer', customer = mode === 'customer';
  if (mode === 'loading' || mode === 'error') return <main className="bs-app"><p role={mode === 'error' ? 'alert' : 'status'}>{message || 'Brand Story wird geladen …'}</p></main>;
  return <main className={`bs-app ${customer ? 'bs-customer' : ''}`}>
    {overview && !token ? <StoryOverview stories={stories} loading={loading} error={message} hasDraft={!!recovery} onResume={resume} onNew={startNew} onOpen={load} busy={busy} /> : story && <>
      <header className="topbar bs-toolbar">
        {!token && <button className="btn topbar-back" disabled={busy} onClick={goBack}>Alle Brand Stories</button>}
        <div className="topbar-brand"><span className="topbar-title"><span style={{ color: '#ff9900' }}>Brand Story</span> Builder</span></div>
        <h1>{story.brandName}</h1><span className="bs-mode-label">{designer ? 'Designer' : customer ? 'Kundenvorschau' : `${story.cards.length} / 19 Karten`}</span>
        <div className="bs-toolbar-spacer" />
        <div className="view-toggle"><button className="view-toggle-btn" aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop</button><button className="view-toggle-btn" aria-pressed={mobile} onClick={() => setMobile(true)}>Mobil</button></div>
        {!token && <><button className="btn" disabled={busy} onClick={() => setSetupOpen(true)}>Konzept mit Claude</button><button className="btn btn-green" disabled={busy} onClick={() => run(() => save())}>{dirty ? 'Änderungen speichern' : 'Speichern'}</button><button className="btn btn-primary" disabled={busy} onClick={() => setShareOpen(true)}>Designer & Kunde</button></>}
        {designer && <button className="btn" onClick={() => setReferencesOpen(true)}>Beispiele ansehen</button>}
      </header>
      {message && <div className="bs-message" role="status">{message}</div>}
      {customer ? <div className="bs-customer-content"><StoryCarousel story={story} mobile={mobile} /><StoryDelivery story={story} /></div> : <div className="bs-workspace">
        <aside className="bs-sidebar">
          <div className="bs-sidebar-heading">Brand Story <span>{story.cards.length} / 19</span></div>
          <button className={`bs-element-button ${!selected ? 'active' : ''}`} aria-pressed={!selected} onClick={() => setSelected(null)}><span className="bs-element-icon">▧</span><span>Hintergrund<small>Desktop und Mobil</small></span></button>
          <div className="bs-sidebar-label">KARTENREIHENFOLGE</div>
          {!designer && <button className="bs-insert-small" aria-label="Karte am Anfang einfügen" disabled={busy || story.cards.length >= 19} onClick={() => setPickerPosition(0)}>＋</button>}
          {story.cards.map((c, i) => <React.Fragment key={c.id}><button className={`bs-element-button ${selected === c.id ? 'active' : ''}`} aria-pressed={selected === c.id} onClick={() => setSelected(c.id)}><span className={`bs-element-icon ${c.type === 'grid' ? 'is-grid' : ''}`}>{c.type === 'grid' ? '▦' : '▧'}</span><span>{i + 1}. {c.title || c.headline || (c.type === 'grid' ? 'ASIN-Grid' : 'Brand Media Asset')}<small>{c.type === 'grid' ? 'ASIN-Grid · 4 Bildplätze' : 'Brand Media Asset'}</small></span></button>{!designer && <button className="bs-insert-small" aria-label={`Karte nach Position ${i + 1} einfügen`} disabled={busy || story.cards.length >= 19} onClick={() => setPickerPosition(i + 1)}>＋</button>}</React.Fragment>)}
          {!designer && <button className="bs-add-card" disabled={busy || story.cards.length >= 19} onClick={() => setPickerPosition(story.cards.length)}>Karte hinzufügen</button>}
          {story.cards.length >= 19 && <p className="bs-help">Alle 19 Kartenplätze sind belegt.</p>}
          <div className="bs-sidebar-bottom"><button onClick={() => setReferencesOpen(true)}>Beispiele ansehen</button><StoryPrinciples /></div>
        </aside>
        <section className="bs-stage">
          <div className="bs-stage-heading"><div><span className="bs-eyebrow">{mobile ? 'MOBIL' : 'DESKTOP'} · INTERAKTIVE VORSCHAU</span><h2>{story.brandName}</h2></div>{!mobile && <label className="bs-overlay-toggle"><input type="checkbox" checked={raster} onChange={e => setRaster(e.target.checked)} />Positionierung prüfen</label>}</div>
          <div className="bs-stage-canvas"><StoryCarousel story={story} mobile={mobile} raster={raster && !mobile} showDraft onSelect={setSelected} selected={selected} />{!story.cards.length && <div className="bs-stage-empty"><h3>Deine Story beginnt hier</h3><p>Übernimm dein Konzept aus Claude oder füge die erste Karte hinzu.</p><button className="bs-primary" onClick={() => setPickerPosition(0)}>Karte hinzufügen</button></div>}</div>
          <p className="bs-stage-hint">{mobile ? 'Dieselben Karten, einzeln dargestellt. Nur der Hintergrund wechselt.' : 'Der Hintergrund bleibt fest. Klicke durch die Story, um Überdeckungen und das Schlussbild zu prüfen.'}</p>
          <section className="bs-folder-panel"><div><h3>{designer ? 'Design-Dateien hochladen' : 'Fertige Design-Dateien'}</h3><p>Ordnerstruktur: Hintergrund · Brand Media Assets · ASIN Grids. Preview Neu enthält nur Vergleichsbilder.</p></div><label className="bs-upload">Ordner auswählen<input disabled={busy} type="file" webkitdirectory="" multiple onChange={e => { folder(Array.from(e.target.files)); e.target.value = ''; }} /></label><details><summary>Prüfung der Vorschau</summary>{publicationWarnings(story).map((w, i) => <p className="bs-warning" key={i}>{w}</p>)}</details></section>
        </section>
        <StoryProperties story={story} selected={selected} designer={designer} busy={busy} change={change} asset={asset} loadProduct={loadProduct} reorder={reorder} remove={() => { if (confirm('Karte entfernen?')) { change(s => { s.cards = s.cards.filter(c => c.id !== selected); return s; }); setSelected(null); } }} />
      </div>}
    </>}
    {setupOpen && story && <StorySetupDialog story={story} onChange={s => { setStory(s); setDirty(true); }} onClose={() => setSetupOpen(false)} onStart={() => { setSetupOpen(false); setOverview(false); setDirty(true); }} onImport={applyImport} onExport={() => download(story)} />}
    {pickerPosition !== null && <StoryModal title="Welche Karte möchtest du hinzufügen?" onClose={() => setPickerPosition(null)}><p className="bs-help">{story.cards.length} von 19 Karten · dieselbe Karte für Desktop und Mobil.</p><div className="bs-type-options"><button aria-label="Brand Media Asset" onClick={() => add('media')}><span className="bs-type-media" aria-hidden="true">▧</span><strong>Brand Media Asset</strong><small>Ein vollständiges Bild mit deinem Inhalt.<br />814 × 1019 px</small></button><button aria-label="ASIN-Grid" onClick={() => add('grid')}><span className="bs-type-grid" aria-hidden="true">▦</span><strong>ASIN-Grid</strong><small>Vier Bildplätze, Überschrift und Shop-Link.<br />Je 1328 × 1456 px</small></button></div></StoryModal>}
    {referencesOpen && <StoryReferences onClose={() => setReferencesOpen(false)} />}
    {shareOpen && <StoryModal title="Designer & Kunde" onClose={() => { if (!busy) setShareOpen(false); }}><p>Designer sehen die konkreten Briefings und können fertige Bilder hochladen. Kunden sehen nur den freigegebenen Stand und die Angaben für Seller Central.</p><button className="bs-primary" disabled={busy} onClick={() => run(() => save(true))}>Freigabelinks aktualisieren</button><p className="bs-help">Normales Speichern verändert die Kundenfreigabe nicht. Aktualisiere die Freigabe nach neuen Designer-Uploads bewusst.</p>{['designer', 'customer'].map(kind => record[kind + 'Token'] && <div className="bs-share" key={kind}><a href={link(kind)} target="_blank" rel="noreferrer">{kind === 'designer' ? 'Designer-Link öffnen' : 'Kunden-Preview öffnen'}</a><button disabled={busy} onClick={() => run(() => copy(link(kind)))}>Link kopieren</button></div>)}</StoryModal>}
    {busy && <div className="bs-busy" role="status">Wird verarbeitet …</div>}
  </main>;
}
