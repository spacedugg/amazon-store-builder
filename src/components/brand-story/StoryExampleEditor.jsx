import React, { useState } from 'react';
import { newCard } from '../../brandStoryModel.mjs';
import { saveStoryExample } from '../../brandStoryExampleSave';
import { uploadImage } from '../../brandStoryImageUpload';
import { Asset, Field } from './StoryElements';
import { StoryCarousel } from './StoryCarousel';
import { DeviceIcon } from './StoryIcons';

export function ExamplePreview({ story }) {
  const [mobile, setMobile] = useState(false);
  const useMobile = mobile && !!story.background.mobile;
  return <div className="bs-example-preview">
    <div className="bs-example-actions" role="group" aria-label="Beispielansicht">
      <button aria-label="Desktop-Beispiel" aria-pressed={!useMobile} onClick={() => setMobile(false)}><DeviceIcon /></button>
      <button aria-label="Mobil-Beispiel" aria-pressed={useMobile} disabled={!story.background.mobile} onClick={() => setMobile(true)}><DeviceIcon mobile /></button>
      {!story.background.mobile && <span>Kein Mobilhintergrund hinterlegt</span>}
    </div>
    <StoryCarousel story={story} mobile={useMobile} />
  </div>;
}

export default function StoryExampleEditor({ draft, onChange, onSaved, busy, setBusy }) {
  const [error, setError] = useState('');
  const story = draft.data;
  const changeStory = update => onChange({ ...draft, data: update });
  const cardChange = (index, patch) => changeStory({ ...story, cards: story.cards.map((card, i) => i === index ? { ...card, ...patch } : card) });
  async function image(file, apply) {
    setBusy(true); setError('');
    try {
      if (file.size > 2 * 1024 * 1024) throw Error('Bitte das Bild auf maximal 2 MB komprimieren.');
      apply(await uploadImage(file));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  function uploadField(label, asset, kind, apply) {
    return <div className="bs-example-upload"><Asset label={label} image={asset} kind={kind} disabled={busy}
      onUpload={file => image(file, apply)} onRemove={() => apply(null)} />
    </div>;
  }
  function move(index, direction) {
    const cards = [...story.cards];
    [cards[index], cards[index + direction]] = [cards[index + direction], cards[index]];
    changeStory({ ...story, cards });
  }
  async function save() {
    setError(''); setBusy(true);
    try {
      const result=await saveStoryExample(draft);
      onSaved(result);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className="bs-example-editor">
    <p className="bs-help">Gespeicherte Beispiele sind für Team und Designer sichtbar. Lade nur freigegebene Bilddateien hoch. Karten werden auf Desktop und Mobil identisch verwendet.</p>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={busy} className="bs-example-fields">
      <Field label="Marke" value={story.brandName} onChange={brandName => changeStory({ ...story, brandName })} />
      <Field label="Beschreibung (optional)" value={draft.purpose} onChange={purpose => onChange({ ...draft, purpose })} />
      <div className="bs-example-backgrounds">
        {uploadField('Desktop-Hintergrund', story.background.desktop, 'desktop', desktop => changeStory({ ...story, background: { ...story.background, desktop } }))}
        {uploadField('Mobil-Hintergrund (optional)', story.background.mobile, 'mobile', mobile => changeStory({ ...story, background: { ...story.background, mobile } }))}
      </div>
      <h3>Karten · {story.cards.length}/19</h3>
      {story.cards.map((card, index) => <section className="bs-example-card" key={card.id} aria-label={`Beispielkarte ${index + 1}`}>
        <header><h4>Karte {index + 1} · {card.type === 'media' ? 'Brand Media Asset' : 'ASIN-Grid'}</h4>
          <div className="bs-example-actions">
            <button aria-label={`Karte ${index + 1} nach vorne`} disabled={index === 0} onClick={() => move(index, -1)}>←</button>
            <button aria-label={`Karte ${index + 1} nach hinten`} disabled={index === story.cards.length - 1} onClick={() => move(index, 1)}>→</button>
            <button aria-label={`Karte ${index + 1} entfernen`} onClick={() => { if (confirm('Diese Karte aus dem Beispiel entfernen?')) changeStory({ ...story, cards: story.cards.filter((_, i) => i !== index) }); }}>Entfernen</button>
          </div>
        </header>
        {card.type === 'media' ? uploadField('Full-Image-Datei', card.image, 'media', image => cardChange(index, { image })) : <>
          <Field label="Grid-Überschrift" maxLength={30} value={card.headline} onChange={headline => cardChange(index, { headline })} />
          <Field label="Shop-Link (optional)" value={card.shopUrl} onChange={shopUrl => cardChange(index, { shopUrl })} />
          <label className="bs-field"><span>Grid-Motiv</span><select aria-label="Grid-Motiv" value={card.gridMode} onChange={e => cardChange(index, { gridMode: e.target.value })}><option value="individual">Vier einzelne Motive</option><option value="composite">Ein zusammenhängendes Motiv</option></select></label>
          <p className="bs-help">Vier Bilddateien hochladen: oben links, oben rechts, unten links, unten rechts. Auch ein Gesamtmotiv wird in diese vier Dateien aufgeteilt.</p>
          <div className="bs-example-grid">{card.slots.map((slot, n) => <div key={n}>
            {uploadField(['Oben links', 'Oben rechts', 'Unten links', 'Unten rechts'][n], slot.image, 'product', image => cardChange(index, { slots: card.slots.map((s, j) => j === n ? { ...s, image, imageMode: 'custom' } : s) }))}
          </div>)}</div>
        </>}
      </section>)}
      <div className="bs-example-actions">
        <button disabled={story.cards.length >= 19} onClick={() => changeStory({ ...story, cards: [...story.cards, newCard('media', story.cards)] })}>+ Brand Media Asset</button>
        <button disabled={story.cards.length >= 19} onClick={() => { const card = newCard('grid', story.cards); card.slots.forEach(slot => { slot.imageMode = 'custom'; slot.brief = ''; }); changeStory({ ...story, cards: [...story.cards, card] }); }}>+ ASIN-Grid</button>
      </div>
    </fieldset>
    <h3>Vorschau</h3><ExamplePreview story={story} />
    <div className="bs-example-save"><button className="bs-primary" disabled={busy} onClick={save}>{busy ? 'Wird verarbeitet …' : 'Beispiel speichern'}</button></div>
  </div>;
}
