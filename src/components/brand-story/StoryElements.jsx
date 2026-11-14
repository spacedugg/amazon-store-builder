import React, { useEffect, useRef } from "react";
import GridModeExamples from './GridModeExamples';
import { SPECS, imageWarnings, productUrl, gridMode, slotImageMode, slotDisplayImage, productAsin } from "../../brandStoryModel.mjs";
import { backgroundBrief } from "../../brandStoryWorkflow.mjs";
import "./StoryProperties.css";
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

const SLOT_NAMES = ['Oben links', 'Oben rechts', 'Unten links', 'Unten rechts'];
const PRODUCT_BRIEF = 'Use the unchanged product main image on a clean white background. Do not alter the product or add text.';
const BRIEF_HELP = 'Briefing für den Designer: Beschreibe Motiv, Aufbau und Inhalt auf Englisch. Dieser Text erscheint nicht im Bild.';
const COPY_HELP = 'Sichtbarer Bildtext: Nur diesen genauen Wortlaut übernimmt der Designer ins Bild. Leer lassen, wenn kein Text erscheinen soll.';
export function StoryProperties({ story, selected, selectedSlot = null, onSlotSelect, designer, busy, change, asset, loadProduct, reorder }) {
  const card = story.cards.find(c => c.id === selected);
  const slotsRef = useRef([]);
  const mode = card?.type === 'grid' ? gridMode(card) : null;
  useEffect(() => {
    if (!Number.isInteger(selectedSlot) || !card || card.type !== 'grid') return;
    const section = slotsRef.current[selectedSlot];
    section?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    const field = section?.querySelector('input:not([type=file]), select') || section?.querySelector('[data-slot-brief]');
    (field || section)?.focus?.({ preventScroll: true });
  }, [selected, selectedSlot]);
  const set = patch => change(s => { Object.assign(s.cards.find(c => c.id === selected), patch); return s; });
  const content = (label, value, onChange, area = true, extra = {}) => {
    const { help, ...inputProps } = extra;
    return <div className="bs-property-field">
      {designer ? <div className="bs-brief-field"><h3>{label}</h3><p>{value || 'Noch nicht festgelegt.'}</p></div>
        : <Field label={label} value={value} onChange={onChange} area={area} {...inputProps} />}
      {help && <p className="bs-field-help">{help}</p>}
    </div>;
  };
  const brief = (label, value, onChange, extra = {}) => content(label, value, onChange, true, { placeholder: 'Describe the image, composition and content for the designer in English.', help: BRIEF_HELP, ...extra });
  const copy = (label, value, onChange) => content(label, value, onChange, true, { placeholder: 'Exact text to appear in the image (leave empty if none).', help: COPY_HELP });
  const slotPatch = (i, patch) => change(s => { Object.assign(s.cards.find(c => c.id === selected).slots[i], patch); return s; });
  const source = (i, value) => {
    const current=card.slots[i].brief || '';
    const automatic=[PRODUCT_BRIEF,'Use the original Amazon product main image unchanged.'].includes(current);
    slotPatch(i,{imageMode:value,...(value==='product'&&!current.trim()?{brief:PRODUCT_BRIEF}:value==='custom'&&automatic?{brief:''}:{})});
  };
  const target = (i, value) => {
    const input = value.trim();
    const asin = /^[A-Z0-9]{10}$/i.test(input) ? input.toUpperCase() : '';
    slotPatch(i, { asin, url: asin ? '' : input, productImage: null });
  };
  const fileName = value => designer && <small className="bs-file-path">Datei im Designer-Ordner: {value}</small>;
  if (!card) return <fieldset className="bs-properties" disabled={busy}>
    <div className="bs-property-heading"><span className="bs-eyebrow">FESTER HINTERGRUND</span><h2>Hintergrund</h2><p>Zwei Hintergründe, eine gemeinsame Kartenfolge.</p></div>
    {['desktop', 'mobile'].map(kind => <section className="bs-background-section" key={kind}>
      <h3>{kind === 'desktop' ? 'Desktop' : 'Mobil'}</h3>
      {brief(kind === 'desktop' ? 'Desktop-Motiv und Inhalt (English)' : 'Mobiles Motiv und Inhalt (English)', backgroundBrief(story, kind), value => change(s => { s.background[kind + 'Brief'] = value; return s; }))}
      {copy(kind === 'desktop' ? 'Wortlaut im Desktop-Hintergrund' : 'Wortlaut im Mobilhintergrund', story.background[kind + 'Copy'] ?? story.background.copy, value => change(s => { s.background[kind + 'Copy'] = value; return s; }))}
      <Asset label={kind === 'desktop' ? 'Desktop-Hintergrund' : 'Mobilhintergrund'} kind={kind} image={story.background[kind]} disabled={busy} onUpload={file => asset(file, (s, img) => { s.background[kind] = img; })} onRemove={designer ? undefined : () => change(s => { s.background[kind] = null; return s; })} />
      {fileName(`Hintergrund/Hintergrund_${kind === 'desktop' ? 'Desktop' : 'Mobile'}.jpg`)}
    </section>)}
  </fieldset>;
  return <fieldset className="bs-properties" disabled={busy}>
    <div className="bs-property-heading"><span className="bs-eyebrow">KARTE {story.cards.indexOf(card) + 1} VON {story.cards.length}</span><h2>{card.type === 'grid' ? 'ASIN-Grid' : 'Brand Media Asset'}</h2>
      {!designer && <div className="bs-card-tools"><button type="button" aria-label="Karte nach vorne" disabled={story.cards.indexOf(card) === 0} onClick={() => reorder(-1)}>↑</button><button type="button" aria-label="Karte nach hinten" disabled={story.cards.indexOf(card) === story.cards.length - 1} onClick={() => reorder(1)}>↓</button></div>}
    </div>
    {card.type === 'grid' && <>
      {designer ? <p className="bs-help"><strong>Grid-Aufbau:</strong> {mode === 'individual' ? 'Vier eigenständige Bilder' : 'Ein zusammenhängendes Motiv'}</p> : <GridModeExamples value={mode} onChange={gridMode => set({gridMode})}/>}
      <p className="bs-help">{mode === 'individual' ? 'Jeder Bildplatz erhält eine eigene Motivbeschreibung. Alle vier Beschreibungen stehen unten.' : 'Eine gemeinsame Motivbeschreibung erklärt das gesamte Motiv über alle vier Bildplätze. Der Designer teilt es in vier passende Bilder auf.'}</p>
    </>}
    {(card.type === 'media' || mode === 'composite') && brief('Inhalt und Motiv (English)', card.brief, value => set({ brief: value }))}
    {copy('Wortlaut im Bild', card.copy, value => set({ copy: value }))}
    {card.type === 'media' ? <>
      <Asset label="Brand Media Asset" kind="media" image={card.image} disabled={busy} onUpload={f => asset(f, (s, img) => { s.cards.find(c => c.id === selected).image = img; })} onRemove={designer ? undefined : () => set({ image: null })} />
      {fileName(card.assetFile || card.fileKey + '.jpg')}
    </> : <>
      {content('Grid-Überschrift', card.headline, value => set({ headline: value }), false, { maxLength: 30, placeholder: 'Sichtbare Überschrift des Grids', help: 'Sichtbare Überschrift in Amazon, maximal 30 Zeichen.' })}
      {content('Shop-Link / Brand-Store-Unterseite', card.shopUrl, value => set({ shopUrl: value }), false, { type: 'url', placeholder: 'https://www.amazon.de/stores/…' })}
      <p className="bs-help">Vier Bildplätze bilden eine Karte. Jeder Platz hat ein eigenes Produktziel; dieselbe ASIN darf mehrfach verwendet werden.</p>
      <nav className="bs-slot-picker" aria-label="Bildplatz auswählen">{SLOT_NAMES.map((name, i) => <button type="button" key={name} aria-pressed={selectedSlot === i} onClick={() => onSlotSelect?.(i)}>{i + 1}. {name}</button>)}</nav>
      {card.slots.map((slot, i) => <section className={`bs-slot${selectedSlot === i ? ' bs-slot-selected' : ''}`} key={i} ref={el => { slotsRef.current[i] = el; }} tabIndex={-1} aria-label={`Bildplatz ${i + 1}: ${SLOT_NAMES[i]}`}>
        <h3>{i + 1}. {SLOT_NAMES[i]}</h3>
        {content(`ASIN oder Produktlink · Platz ${i + 1}`, slot.url || slot.asin, value => target(i, value), false, { placeholder: 'B012345678 oder https://www.amazon.de/dp/…' })}
        {designer && productUrl(slot, story.marketplace) && <a href={productUrl(slot, story.marketplace)} target="_blank" rel="noreferrer">Produkt ansehen ↗</a>}
        {designer ? <p className="bs-help"><strong>Bildquelle:</strong> {slotImageMode(slot) === 'product' ? 'Unverändertes Produkthauptbild' : 'Eigenes Motiv / Designerbild'}</p> : <label className="bs-field"><span>Bildquelle · Platz {i + 1}</span><select aria-label={`Bildquelle · Platz ${i + 1}`} value={slotImageMode(slot)} onChange={e => source(i, e.target.value)}><option value="product">Unverändertes Produkthauptbild</option><option value="custom">Eigenes Motiv / Designerbild</option></select></label>}
        {mode === 'individual' && brief(`Motivbeschreibung · Platz ${i + 1} (English)`, slot.brief, value => slotPatch(i, { brief: value }), { 'data-slot-brief': i })}
        {slotImageMode(slot) === 'product' ? <div className="bs-slot-image bs-product-default"><Picture image={slotDisplayImage(slot)} placeholder="Produkthauptbild noch nicht geladen" /><p className="bs-help">Das Produkthauptbild wird unverändert verwendet. Ein zuvor hochgeladenes eigenes Bild bleibt gespeichert.</p><small>{SPECS.product.join(' × ')} px · Produkthauptbild</small>{!designer && <button type="button" disabled={!productAsin(slot, story.marketplace)} onClick={() => loadProduct(card.id, i, productAsin(slot, story.marketplace))}>{slot.productImage ? 'Produkthauptbild erneut laden' : 'Produkthauptbild laden'}</button>}</div> : <><p className="bs-help">Eigenes Motiv benötigt ein Designer-Briefing. Das fertige Bild kann später hochgeladen werden.</p><div className="bs-slot-image"><Asset label={`Gridbild · Platz ${i + 1}`} kind="product" image={slot.image} disabled={busy} onUpload={f => asset(f, (s, img) => { Object.assign(s.cards.find(c => c.id === selected).slots[i], { image: img, imageMode: 'custom' }); })} onRemove={designer ? undefined : () => slotPatch(i, { image: null })} /></div></>}
        {fileName(slot.assetFile || `${card.fileKey}-${i + 1}.jpg`)}
      </section>)}
    </>}
  </fieldset>;
}
