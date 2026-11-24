import { useState } from 'react';
import StoreReferenceLibraryButton from './StoreReferenceLibrary';
import { appendReferenceChoices } from '../storeReferences.mjs';
import { designDirectionData, designReferenceError, normaliseDesignReferences } from '../designDirection.mjs';

function ReferenceInputs({ references, setReferences }) {
  const update = (index, field, value) => setReferences(rows => rows.map((row, i) => i === index ? { ...row, [field]: value } : row));
  return <>
    {references.map((row, index) => <div key={index} style={{ display: 'grid', gap: 6, margin: '12px 0' }}>
      <label>Referenz-Link {index + 1}<input className="input" type="url" value={row.url} placeholder="https://…" onChange={e => update(index, 'url', e.target.value)} style={{ width: '100%' }} /></label>
      <label>Stilhinweis {index + 1}<textarea className="input" rows={2} value={row.notes} placeholder="Zum Beispiel bildstark und ruhig, große Headlines, Lifestyle mit Tiefenwirkung" onChange={e => update(index, 'notes', e.target.value)} style={{ width: '100%', minHeight: 64 }} /></label>
      <button className="btn" type="button" style={{ justifySelf: 'start' }} onClick={() => setReferences(rows => rows.length === 1 ? [{ url: '', notes: '' }] : rows.filter((_, i) => i !== index))}>Referenz {index + 1} entfernen</button>
    </div>)}
    <button className="btn" type="button" onClick={() => setReferences(rows => [...rows, { url: '', notes: '' }])}>Eigenen Link hinzufügen</button>
    {designReferenceError(references) && <p role="alert">{designReferenceError(references)}</p>}
  </>;
}

export function DesignDirectionFields({ references, setReferences, choice, setChoice }) {
  return <section style={{ background: '#eff6ff', border: '2px solid #93c5fd', borderRadius: 10, padding: 16, marginBottom: 16, color: '#0f172a' }}>
    <h3 style={{ marginTop: 0 }}>Designrichtung</h3>
    <p>Stilreferenzen prägen Aufbau, Bildsprache und Kommunikation. Die eigene Markenidentität bleibt maßgeblich. Die Auswahl gilt nur für dieses Projekt und ist später änderbar.</p>
    <label><input type="radio" name="design-direction" checked={choice === true} onChange={() => setChoice(true)} /> Stilreferenzen auswählen</label>{' '}
    <label><input type="radio" name="design-direction" checked={choice === false} onChange={() => setChoice(false)} /> Ohne Stilreferenz fortfahren</label>
    {choice === true && <div style={{ marginTop: 12 }}>
      <StoreReferenceLibraryButton label="Aus Beispielen auswählen" selectedUrls={references.map(row => row.url)} onSelect={choices => setReferences(rows => appendReferenceChoices(rows, choices))} />
      <ReferenceInputs {...{ references, setReferences }} />
    </div>}
  </section>;
}
export function DesignDirectionDialog({ store, onSave, onClose }) {
  const [references, setReferences] = useState(normaliseDesignReferences(store.designReferences).length ? normaliseDesignReferences(store.designReferences) : [{ url: '', notes: '' }]);
  const error = designReferenceError(references);
  return <div className="modal-overlay" onClick={onClose}><div className="modal-box" role="dialog" aria-modal="true" aria-label="Stilreferenzen bearbeiten" style={{ maxWidth: 720, padding: 24 }} onClick={e => e.stopPropagation()}>
    <h2>Stilreferenzen bearbeiten</h2>
    <ReferenceInputs {...{ references, setReferences }} />
    <button className="btn btn-primary" disabled={!!error} onClick={() => {
      const hasReferences = references.some(row => row.url.trim());
      onSave(designDirectionData(references, hasReferences));
      onClose();
    }}>Übernehmen</button>{' '}<button className="btn" onClick={onClose}>Abbrechen</button>
  </div></div>;
}
export function DesignerDesignDirection({ store }) {
  const rows = normaliseDesignReferences(store.designReferences).filter(row => row.url && !designReferenceError([row]));
  const brandNotes = typeof store.manualCI?.notes === 'string' ? store.manualCI.notes.trim() : '';
  const productNotes = typeof store.productCI?.designerNotes === 'string' ? store.productCI.designerNotes.trim() : '';
  if (!rows.length && !brandNotes && !productNotes) return null;
  return <section aria-label="Design direction" style={{ margin: '16px 24px', padding: 18, border: '2px solid #60a5fa', borderRadius: 10, background: '#eff6ff', color: '#0f172a' }}>
    <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Design direction</h2>
    <p>Use these references for macro style: visual density, imagery, text hierarchy, composition and page rhythm. Preserve this brand’s corporate identity; do not automatically copy reference colours, typography or icons. Product counts and page scope follow this brand’s assortment. Apply the concrete image type, grouping, depth and mobile composition specified in each module brief; create original assets for this brand.</p>
    {rows.map((row, i) => <div key={i} style={{ marginTop: 12, overflowWrap: 'anywhere' }}><a href={row.url} target="_blank" rel="noopener noreferrer">{row.url}</a>{row.notes && <p style={{ whiteSpace: 'pre-wrap', margin: '4px 0' }}>{row.notes}</p>}</div>)}
    {brandNotes && <div style={{ marginTop: 16 }}><h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Brand-specific designer notes</h3><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{brandNotes}</p></div>}
    {productNotes && <div style={{ marginTop: 16 }}><h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Product imagery notes</h3><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{productNotes}</p></div>}
  </section>;
}

export default DesignDirectionDialog;
