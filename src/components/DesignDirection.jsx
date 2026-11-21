import { useState } from 'react';
import StoreReferenceLibraryButton from './StoreReferenceLibrary';
import { appendReferenceChoices } from '../storeReferences.mjs';
import { designDirectionData, designReferenceError, normaliseDesignReferences } from '../designDirection.mjs';

export function DesignDirectionFields({ references, setReferences, choice, setChoice }) {
  const update = (index, field, value) => setReferences(rows => rows.map((row, i) => i === index ? { ...row, [field]: value } : row));
  return <section style={{ background: '#eff6ff', border: '2px solid #93c5fd', borderRadius: 10, padding: 16, marginBottom: 16, color: '#0f172a' }}>
    <h3 style={{ marginTop: 0 }}>Designrichtung</h3>
    <p>Stilreferenzen prägen Aufbau, Bildsprache und Kommunikation. Die eigene Markenidentität bleibt maßgeblich. Die Auswahl gilt nur für dieses Projekt und ist später änderbar.</p>
    <label><input type="radio" name="design-direction" checked={choice === true} onChange={() => setChoice(true)} /> Stilreferenzen auswählen</label>{' '}
    <label><input type="radio" name="design-direction" checked={choice === false} onChange={() => setChoice(false)} /> Ohne Stilreferenz fortfahren</label>
    {choice === true && <div style={{ marginTop: 12 }}>
      <StoreReferenceLibraryButton label="Aus Beispielen auswählen" selectedUrls={references.map(row => row.url)} onSelect={choices => setReferences(rows => appendReferenceChoices(rows, choices))} />
      {references.map((row, index) => <div key={index} style={{ display: 'grid', gap: 6, margin: '12px 0' }}>
        <label>Referenz-Link {index + 1}<input className="input" type="url" value={row.url} placeholder="https://…" onChange={e => update(index, 'url', e.target.value)} style={{ width: '100%' }} /></label>
        <label>Stilhinweis {index + 1}<textarea className="input" rows={2} value={row.notes} placeholder="Zum Beispiel bildstark und ruhig, große Headlines, Lifestyle mit Tiefenwirkung" onChange={e => update(index, 'notes', e.target.value)} style={{ width: '100%', minHeight: 64 }} /></label>
        <button className="btn" type="button" style={{ justifySelf: 'start' }} onClick={() => setReferences(rows => rows.length === 1 ? [{ url: '', notes: '' }] : rows.filter((_, i) => i !== index))}>Referenz {index + 1} entfernen</button>
      </div>)}
      <button className="btn" type="button" onClick={() => setReferences(rows => [...rows, { url: '', notes: '' }])}>Eigenen Link hinzufügen</button>
      {designReferenceError(references) && <p role="alert">{designReferenceError(references)}</p>}
    </div>}
  </section>;
}
export function DesignDirectionDialog({ store, onSave, onClose }) {
  const [references, setReferences] = useState(normaliseDesignReferences(store.designReferences).length ? normaliseDesignReferences(store.designReferences) : [{ url: '', notes: '' }]);
  const [choice, setChoice] = useState(store.designDirectionReviewed ? !!store.designReferences?.length : null);
  const [error, setError] = useState('');
  return <div className="modal-overlay" onClick={onClose}><div className="modal-box" style={{ maxWidth: 720, padding: 24 }} onClick={e => e.stopPropagation()}>
    <DesignDirectionFields {...{ references, setReferences, choice, setChoice }} />
    {error && <p role="alert">{error}</p>}
    <button className="btn btn-primary" disabled={choice === null} onClick={() => { try { onSave(designDirectionData(references, choice)); onClose(); } catch (e) { setError(e.message); } }}>Übernehmen</button>{' '}<button className="btn" onClick={onClose}>Abbrechen</button>
  </div></div>;
}
export function DesignerDesignDirection({ store }) {
  const rows = normaliseDesignReferences(store.designReferences).filter(row => row.url && !designReferenceError([row]));
  if (!rows.length) return null;
  return <section aria-label="Design direction" style={{ margin: '16px 24px', padding: 18, border: '2px solid #60a5fa', borderRadius: 10, background: '#eff6ff', color: '#0f172a' }}>
    <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Design direction</h2>
    <p>Use these references for macro style: visual density, imagery, text hierarchy, composition and page rhythm. Preserve this brand’s corporate identity; do not automatically copy reference colours, typography or icons. Product counts and page scope follow this brand’s assortment. Apply the concrete image type, grouping, depth and mobile composition specified in each module brief; create original assets for this brand.</p>
    {rows.map((row, i) => <div key={i} style={{ marginTop: 12, overflowWrap: 'anywhere' }}><a href={row.url} target="_blank" rel="noopener noreferrer">{row.url}</a>{row.notes && <p style={{ whiteSpace: 'pre-wrap', margin: '4px 0' }}>{row.notes}</p>}</div>)}
  </section>;
}

export default DesignDirectionDialog;
