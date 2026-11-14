import React from 'react';
import { productUrl, safeUrl, SPECS, slotDisplayImage } from '../../brandStoryModel.mjs';

export function StoryPrinciples() {
  return <details className="bs-principles"><summary>So funktioniert eine Brand Story</summary><p>Der Hintergrund steht fest. Dieselben Karten bewegen sich darüber: Desktop zeigt mehrere, Mobil genau eine vollständige Karte.</p><p>Ein Motiv links kann beim Weiterklicken verdeckt werden. Logos und Slogans rechts müssen bewusst unter den Karten liegen, wenn sie erst im Schlussbild erscheinen sollen. Prüfe die Position in jeder Ansicht.</p><p>Ein Logo mit Hashtag auf einer Bildkarte in Hintergrundfarbe scrollt mit. Ein Logo im Hintergrund bleibt stehen.</p><p>Vier Gridbilder können zusammen ein Motiv bilden und alle auf dieselbe ASIN verlinken. Berücksichtige die sichtbaren Zwischenräume.</p><p>Bildkarten: 814 × 1019 px · Gridbilder: je 1328 × 1456 px · Desktop: 3660 × 1563 px · Mobil: 1389 × 1875 px. JPG/PNG, maximal 2 MB pro Datei.</p></details>;
}
function FileLink({ image, label }) {
  return <div className="bs-delivery-file">{safeUrl(image?.url) ? <a href={safeUrl(image.url)} target="_blank" rel="noreferrer" download>{label} ↗</a> : <span>{label} · Bild noch offen</span>}</div>;
}
export function StoryDelivery({ story }) {
  return <details className="bs-delivery"><summary>Angaben für Seller Central</summary><p>Lege die Karten in dieser Reihenfolge an. Die Karten und ihre Bilddateien sind auf Desktop und Mobil identisch. Nur die beiden Hintergrunddateien unterscheiden sich.</p>
    {['desktop', 'mobile'].map(k => <div key={k}><h3>{k === 'desktop' ? 'Desktop-Hintergrund' : 'Mobilhintergrund'} · {SPECS[k].join(' × ')} px</h3><FileLink image={story.background[k]} label={`Hintergrund/Hintergrund_${k === 'desktop' ? 'Desktop' : 'Mobile'}.jpg`} /></div>)}
    {story.cards.map((c, i) => <article className="bs-delivery-card" key={c.id}>
      <h3>{i + 1}. {c.type === 'grid' ? 'ASIN-Grid' : 'Brand Media Asset'}</h3>
      {c.type === 'media' ? <><FileLink image={c.image} label={c.assetFile || c.fileKey && c.fileKey + '.jpg' || 'Dateiname noch nicht hinterlegt'} />{c.copy && <p>Bildtext: {c.copy}</p>}</> : <>
        <p><strong>Überschrift:</strong> {c.headline || 'Noch offen'}</p><p><strong>Shop-Link:</strong> {safeUrl(c.shopUrl) ? <a href={safeUrl(c.shopUrl)} target="_blank" rel="noreferrer">{c.shopUrl}</a> : 'Noch offen'}</p>
        <table><thead><tr><th>Position</th><th>ASIN und Produktziel</th><th>Bilddatei · 1328 × 1456 px</th></tr></thead><tbody>{c.slots.map((slot, j) => <tr key={j}><td>{['Oben links', 'Oben rechts', 'Unten links', 'Unten rechts'][j]}</td><td>{slot.asin || 'ASIN noch offen'}{productUrl(slot, story.marketplace) && <div><a href={productUrl(slot, story.marketplace)} target="_blank" rel="noreferrer">{productUrl(slot, story.marketplace)}</a></div>}</td><td><FileLink image={slotDisplayImage(slot,c)} label={slot.assetFile || c.fileKey && `${c.fileKey}-${j + 1}.jpg` || 'Dateiname noch nicht hinterlegt'} /></td></tr>)}</tbody></table>
      </>}
    </article>)}
  </details>;
}
