import React, { useEffect, useState } from 'react';
import StoryModal from './StoryModal';
import { newStory } from '../../brandStoryModel.mjs';
import StoryExampleEditor, { ExamplePreview } from './StoryExampleEditor';
import './StoryExamples.css';
const purposes = {
  MyPuzzle: 'Hero-Produkt: das individuelle Fotopuzzle erklären und fertige Beispiele zeigen.',
  PROCREA: 'Sortiment: Kategorien mit Produkt-Hero und anschließendem Grid erschließen.',
  Eglianos: 'Herkunft und Handwerk: die Geschichte hinter dem griechischen Olivenöl erzählen.',
  OmniRelexx: 'Persönlicher Einstieg: zwei Menschen hinter der Marke und zusammenhängende Motive für ein kleines Sortiment.',
  Bachgold: 'Kleines Sortiment: einzelne Produkte, ihre Entstehung und Anwendung in den Fokus stellen.',
  Futum: 'Breites Sortiment: Kategorie-Motive führen zu vier passenden Produktgrids für Haus, Garten und Tiere.',
  Sanquell: 'Kategorien in der Anwendung zeigen und passende Produkte sowie Ersatzbedarf zugänglich machen.',
};
export default function StoryReferences({ onClose, canManage = false }) {
  const [stories, setStories] = useState([]), [custom, setCustom] = useState([]);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [importProgress,setImportProgress]=useState(''), [importNotice,setImportNotice]=useState('');
  async function importZip(file){setBusy(true);setError('');try{const {importStoryZip}=await import('../../brandStoryZipUpload');const result=await importStoryZip(file,setImportProgress);setDraft({data:result.data,purpose:result.purpose});setImportNotice(result.notice);setDirty(true);}catch(error){setError(error.message);}finally{setBusy(false);setImportProgress('');}}
  const [draft, setDraft] = useState(null), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    const json = async url => { const response = await fetch(url, { signal: abort.signal }); if (!response.ok) throw Error('Beispiele konnten nicht geladen werden.'); return response.json(); };
    Promise.allSettled([json('/brand-story-examples/stories.json'), json('/api/brand-story-examples')]).then(([builtins, added]) => {
      if (abort.signal.aborted) return;
      if (builtins.status === 'fulfilled') setStories((builtins.value.stories || []).map(story => {
        const copy = structuredClone(story);
        const local = image => { if (image?.url?.startsWith('https://brand-store-preview.temoa.de/brand-story-examples/')) image.url = image.url.replace('https://brand-store-preview.temoa.de', ''); };
        local(copy.background.desktop); local(copy.background.mobile);
        copy.cards.forEach(card => { local(card.image); card.slots?.forEach(slot => { local(slot.image); local(slot.productImage); }); });
        return copy;
      }));
      if (added.status === 'fulfilled') setCustom(added.value.examples || []);
      if (builtins.status === 'rejected' || added.status === 'rejected') setError('Ein Teil der Beispiele konnte nicht geladen werden. Bitte erneut öffnen.');
      setLoading(false);
    });
    return () => abort.abort();
  }, []);
  function leave(action) {
    if (busy) return;
    if (!dirty || confirm('Ungespeicherte Änderungen am Beispiel verwerfen?')) { setDirty(false); action(); }
  }
  return <StoryModal title={draft ? (draft.id ? 'Beispiel bearbeiten' : 'Beispiel hinzufügen') : 'Interaktive Brand-Story-Beispiele'} wide onClose={() => leave(onClose)}>
    {draft ? <>
      <button disabled={busy} onClick={() => leave(() => setDraft(null))}>← Alle Beispiele</button>
      {importNotice && <p role="status">{importNotice}</p>}<StoryExampleEditor draft={draft} busy={busy} setBusy={setBusy} onChange={value => { setDraft(value); setDirty(true); }} onSaved={value => { setCustom(items => [value, ...items.filter(item => item.id !== value.id)]); setDraft(null); setDirty(false); setMessage('Beispiel gespeichert – für Team und Designer verfügbar.'); }} />
    </> : <>
      {importProgress && <p role="status">{importProgress}</p>}<div className="bs-example-actions">{canManage && <label className="bs-upload">ZIP importieren<input type="file" accept=".zip,application/zip" disabled={busy} onChange={event=>{if(event.target.files[0])importZip(event.target.files[0]);event.target.value='';}} /></label>}{canManage && <button className="bs-primary" onClick={() => { setDraft({ data: newStory(), purpose: '' }); setDirty(false); setMessage(''); setImportNotice(''); }} disabled={busy}>+ Beispiel hinzufügen</button>}</div>
      {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}{loading && <p>Beispiele werden geladen …</p>}
      <div className="bs-reference-list">{[...custom.map(item => ({ ...item.data, example: item })), ...stories].map((story, index) => <article key={story.example?.id || 'builtin-' + index}>
        <header><h3>{story.brandName}</h3><span>{story.cards.length} Karten · {story.cards.filter(card => card.type === 'media').length} Full Image · {story.cards.filter(card => card.type === 'grid').length} Grids</span>
          {canManage && story.example && <button onClick={() => { setDraft(structuredClone(story.example)); setDirty(false); }}>Beispiel bearbeiten</button>}
        </header>
        <p className="bs-help">{story.example?.purpose || purposes[story.brandName]}</p>
        <ExamplePreview story={story} />
      </article>)}</div>
    </>}
  </StoryModal>;
}
