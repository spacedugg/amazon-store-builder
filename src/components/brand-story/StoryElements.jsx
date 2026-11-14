import React from "react";
import { SPECS, imageWarnings, productUrl } from "../../brandStoryModel.mjs";
import { backgroundBrief } from "../../brandStoryWorkflow.mjs";
const imageSrc = x => typeof x === "string" ? x : x?.url;
function Picture({
  image,
  alt = "",
  placeholder = "Bild fehlt",
  fit = "cover",
}) {
  return imageSrc(image) ? (
    <img src={imageSrc(image)} alt={alt} style={{ objectFit: fit }} />
  ) : (
    <div className="bs-placeholder">{placeholder}</div>
  );
}
export function Field({ label, value, onChange, area = false, ...props }) {
  const Tag = area ? "textarea" : "input";
  return (
    <label className="bs-field">
      <span>{label}</span>
      <Tag
        aria-label={label}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  );
}
export function Asset({ label, image, kind, onUpload, onRemove, disabled }) {
  return (
    <div className="bs-asset">
      <div>
        <strong>{label}</strong>
        <small>{SPECS[kind].join(" × ")} px · JPG/PNG · 2 MB</small>
      </div>
      {image && <Picture image={image} />}
      <label className="bs-upload">
        Bild hochladen
        <input
          disabled={disabled}
          type="file"
          accept="image/jpeg,image/png"
          onChange={(e) => {
            if (e.target.files[0]) onUpload(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </label>
      {image && onRemove && (
        <button disabled={disabled} onClick={onRemove}>
          Bild entfernen
        </button>
      )}
      {imageWarnings(image, kind).map((w) => (
        <p role="alert" className="bs-warning" key={w}>
          {w}
        </p>
      ))}
    </div>
  );
}

export function StoryProperties({ story, selected, designer, busy, change, asset, loadProduct, reorder, remove }) {
  const card = story.cards.find(c => c.id === selected);
  const set = patch => change(s => { Object.assign(s.cards.find(c => c.id === selected), patch); return s; });
  const content = (label, value, onChange, area = true, extra = {}) => designer
    ? <div className="bs-brief-field"><h3>{label}</h3><p>{value || 'Noch nicht festgelegt.'}</p></div>
    : <Field label={label} value={value} onChange={onChange} area={area} {...extra} />;
  const slotEdit = (i, key, value) => { const slots = structuredClone(card.slots); slots[i][key] = value; if (key === 'asin') slots[i].productImage = null; set({ slots }); };
  if (!card) return <fieldset className="bs-properties" disabled={busy}>
    <div className="bs-property-heading"><span className="bs-eyebrow">FESTER HINTERGRUND</span><h2>Hintergrund</h2><p>Zwei Hintergründe, eine gemeinsame Kartenfolge.</p></div>
    {['desktop', 'mobile'].map(kind => <section className="bs-background-section" key={kind}>
      <h3>{kind === 'desktop' ? 'Desktop' : 'Mobil'}</h3>
      {content(kind === 'desktop' ? 'Desktop-Motiv und Inhalt (English)' : 'Mobiles Motiv und Inhalt (English)', backgroundBrief(story, kind), value => change(s => { s.background[kind + 'Brief'] = value; return s; }))}
      {content(kind === 'desktop' ? 'Wortlaut im Desktop-Hintergrund' : 'Wortlaut im Mobilhintergrund', story.background[kind + 'Copy'] ?? story.background.copy, value => change(s => { s.background[kind + 'Copy'] = value; return s; }))}
      <Asset label={kind === 'desktop' ? 'Desktop-Hintergrund' : 'Mobilhintergrund'} kind={kind} image={story.background[kind]} disabled={busy} onUpload={file => asset(file, (s, img) => { s.background[kind] = img; })} onRemove={designer ? undefined : () => change(s => { s.background[kind] = null; return s; })} />
      <small className="bs-file-path">Hintergrund/Hintergrund_{kind === 'desktop' ? 'Desktop' : 'Mobile'}.jpg</small>
    </section>)}
  </fieldset>;
  return <fieldset className="bs-properties" disabled={busy}>
    <div className="bs-property-heading"><span className="bs-eyebrow">KARTE {story.cards.indexOf(card) + 1} VON {story.cards.length}</span><h2>{card.type === 'grid' ? 'ASIN-Grid' : 'Brand Media Asset'}</h2>
      {!designer && <div className="bs-card-tools"><button aria-label="Karte nach vorne" disabled={story.cards.indexOf(card) === 0} onClick={() => reorder(-1)}>↑</button><button aria-label="Karte nach hinten" disabled={story.cards.indexOf(card) === story.cards.length - 1} onClick={() => reorder(1)}>↓</button><button onClick={remove}>Karte entfernen</button></div>}
    </div>
    {content('Kartenname', card.title || '', value => set({ title: value }), false)}
    {content('Inhalt und Motiv (English)', card.brief, value => set({ brief: value }))}
    {content('Wortlaut im Bild', card.copy, value => set({ copy: value }))}
    {card.type === 'media' ? <>
      {content('Datei im Designer-Ordner', card.assetFile || card.fileKey + '.jpg', value => set({ assetFile: value }), false)}
      <Asset label="Brand Media Asset" kind="media" image={card.image} disabled={busy} onUpload={f => asset(f, (s, img) => { s.cards.find(c => c.id === selected).image = img; })} onRemove={designer ? undefined : () => set({ image: null })} />
    </> : <>
      {content('Grid-Überschrift', card.headline, value => set({ headline: value }), false, { maxLength: 30 })}
      <small>Maximal 30 Zeichen</small>
      {content('Shop-Link / Brand-Store-Unterseite', card.shopUrl, value => set({ shopUrl: value }), false, { type: 'url' })}
      <p className="bs-help">Vier Bildplätze bilden eine Karte. Jeder Platz hat ein eigenes Ziel; dieselbe ASIN darf mehrfach verwendet werden.</p>
      {card.slots.map((slot, i) => <section className="bs-slot" key={i}>
        <h3>{['Oben links', 'Oben rechts', 'Unten links', 'Unten rechts'][i]}</h3>
        {content(`ASIN · Platz ${i + 1}`, slot.asin, value => slotEdit(i, 'asin', value.trim().toUpperCase()), false, { maxLength: 10, onBlur: () => { if (!slot.productImage) loadProduct(card.id, i, slot.asin); } })}
        {content(`Produktlink · Platz ${i + 1} (optional)`, slot.url, value => slotEdit(i, 'url', value), false, { type: 'url' })}
        {designer && productUrl(slot, story.marketplace) && <a href={productUrl(slot, story.marketplace)} target="_blank" rel="noreferrer">Produkt ansehen ↗</a>}
        {!designer && <button disabled={!/^[A-Z0-9]{10}$/i.test(slot.asin)} onClick={() => loadProduct(card.id, i, slot.asin)}>Produkthauptbild laden</button>}
        {slot.productImage && <div className="bs-product-default"><Picture image={slot.productImage} /><small>Produkthauptbild{slot.image ? ' · eigenes Bild hat Vorrang' : ''}</small></div>}
        {content(`Dateipfad · Platz ${i + 1}`, slot.assetFile || `${card.fileKey}-${i + 1}.jpg`, value => slotEdit(i, 'assetFile', value), false)}
        <Asset label={`Gridbild · Platz ${i + 1}`} kind="product" image={slot.image} disabled={busy} onUpload={f => asset(f, (s, img) => { s.cards.find(c => c.id === selected).slots[i].image = img; })} onRemove={designer ? undefined : () => slotEdit(i, 'image', null)} />
      </section>)}
    </>}
  </fieldset>;
}
