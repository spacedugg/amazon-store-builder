import { useState, useRef, useMemo } from 'react';
import { makeClaudeContext } from '../storePatch';

const EDIT_PROMPT = `Aktiviere den Skill amazon-storefront-design (Source: .claude/skills/amazon-storefront-design/SKILL.md im Repo amazon-store-builder) im Patch Mode. Hilf mir, meinen bestehenden Brand Store gezielt zu ändern oder seine Struktur zu erweitern. Der folgende aktuelle Store enthält bereits manuelle Änderungen und ist die verbindliche Ausgangsbasis.

Lies die v4-Wissensbasis unter data/store-knowledge/ aktiv. Halte CLAUDE.md Paragraf 0 ein: nur abstrakte Strukturmuster aus anderen Marken übernehmen, keine fremden Produktfakten, Headlines oder Bildmotive. Keine Versand- oder Lieferzeit-USPs. Kundensichtbare Texte auf Deutsch (bzw. in der Marktplatzsprache), Designer-Briefings immer auf Englisch. Keine Em Dashes oder En Dashes in kundensichtbaren Texten; Bindestriche nur innerhalb zusammengesetzter Wörter.

Meine gewünschte Änderung: [hier beschreiben]

Nutze die vorhandenen IDs und Namen. Behalte alle nicht ausdrücklich geänderten Texte, ASIN-Zuordnungen, Hotspots, Links, imageRef und Einstellungen bei. Bildfelder werden im Chat-Kontext ausgelassen; sie bleiben im Tool erhalten und dürfen im Patch nicht ersetzt werden. Gib keinen kompletten Ersatz-Store aus.

Gib nach unserer Abstimmung genau ein JSON-Objekt mit baseRevision und einem ops Array zurück: {"baseRevision":"exakt der Wert aus dem aktuellen Store-Kontext","ops":[...]}. Kopiere baseRevision unverändert. Sie schützt vor dem Anwenden auf einen inzwischen geänderten Store. Die Operationen werden der Reihe nach angewendet. sectionIdx, tileIdx und toIndex sind nullbasiert. Ziele bevorzugt über pageId adressieren, alternativ über den eindeutigen pageName.

Erlaubte Operationen:
- addPage: {op:"addPage", page:{name, parentName?, sections:[{layoutId, tiles:[]}]}, afterPageName?}
- modifyPage: {op:"modifyPage", pageId, patch:{name?, heroBannerBrief?, heroBannerTextOverlay?}}
- movePage: {op:"movePage", pageId, toIndex}
- addSection: {op:"addSection", pageId, after?:0, before?:0, atStart?:true, section:{layoutId, tiles:[]}}
- moveSection: {op:"moveSection", pageId, sectionIdx, toPageId, toIndex}
- modifySection: {op:"modifySection", pageId, sectionIdx, patch:{layoutId?, module?}}
- deleteSection: {op:"deleteSection", pageId, sectionIdx}
- addTile: {op:"addTile", pageId, sectionIdx, after?:0, atStart?:true, tile:{type, brief, textOverlay, imageRef?, linkUrl?}}
- modifyTile: {op:"modifyTile", pageId, sectionIdx, tileIdx, patch:{textOverlay?:{heading?, subheading?, body?, bullets?, cta?}, brief?, linkUrl?}}
- deleteTile: {op:"deleteTile", pageId, sectionIdx, tileIdx}

Kein id, sections oder tiles in patch ersetzen. TextOverlay wird feldweise ergänzt. Neue Kacheln nur mit erlaubten Typen image, shoppable_image, product_grid, product_collection, best_sellers, recommended, deals, video, product_selector. Für neue Links zu Unterseiten linkUrl:"page:Exakter Seitenname" verwenden. Maximal 19 Inhaltsabschnitte plus Header, ein Produktraster und ein Bestseller-Modul pro Seite. Prüfe ASIN-Stacks, Headline-Bezug, Repetition und markenfremde Aussagen vor der Ausgabe.`;

export default function PatchImportModal({ onClose, onApply, store }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef(null);
  const pending = useRef(false);
  const context = useMemo(() => JSON.stringify(makeClaudeContext(store), null, 2), [store]);
  const prompt = EDIT_PROMPT + '\n\nAktueller Store:\n' + context;

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true); setError('');
    } catch (e) { setError('Kopieren fehlgeschlagen. Lade den aktuellen Store als Datei herunter.'); }
  }
  function download(full) {
    const content = full ? JSON.stringify(store, null, 2) : context;
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url;
    a.download = 'store-' + (full ? 'backup' : 'claude-kontext') + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function fileChanged(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setText(String(reader.result || '')); setError(''); };
    reader.onerror = () => setError('JSON-Datei konnte nicht gelesen werden.');
    reader.readAsText(file); e.target.value = '';
  }
  async function apply() {
    if (pending.current) return;
    setError('');
    let data;
    try { data = JSON.parse(text.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/, '$1')); }
    catch (e) { setError('JSON nicht lesbar: ' + e.message); return; }
    if (!data || !Array.isArray(data.ops) || !data.ops.length) {
      setError('Bitte das Änderungs-JSON mit einem nicht leeren ops Array einfügen. Ein kompletter Store ersetzt hier nicht deinen bearbeiteten Stand.'); return;
    }
    pending.current = true; setBusy(true);
    try {
      const summary = await onApply(data);
      alert('Änderungen angewendet:\n\n' + (summary || []).join('\n'));
      onClose();
    } catch (e) { setError(e.message || 'Änderungen konnten nicht angewendet werden.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="modal-box workflow-modal" role="dialog" aria-modal="true" aria-labelledby="claude-edit-title" onClick={e => e.stopPropagation()} style={{ maxWidth: 760, padding: 24 }}>
        <div className="modal-header">
          <h2 id="claude-edit-title" style={{ margin: 0, fontSize: 18 }}>Mit Claude bearbeiten</h2>
          <button className="modal-close" onClick={onClose} disabled={busy} aria-label="Schließen">×</button>
        </div>
        <section className="asin-workflow-step">
          <h3>Schritt 1: Aktuellen Stand an Claude übergeben</h3>
          <p>Öffne Claude Code oder Cowork im Projekt amazon-store-builder. Kopiere Prompt und aktuellen Store gemeinsam und beschreibe deine Änderung. Claude erhält alle Seiten, Texte und IDs einschließlich deiner bisherigen Bearbeitungen. Bilddateien und Produktkatalog werden ausgelassen.</p>
          <button className="btn btn-primary" onClick={copy}>Prompt und aktuellen Store kopieren</button>
          {copied && <p role="status">Prompt und aktueller Store kopiert.</p>}
          <details><summary>Prompt und Store ansehen</summary><pre>{prompt}</pre></details>
          <button className="btn" onClick={() => download(false)}>Store für Claude herunterladen</button>
        </section>
        <section className="asin-workflow-step">
          <h3>Schritt 2: Änderungen zurück ins Tool übernehmen</h3>
          <p>Füge Claudes Änderungs-JSON hier ein oder wähle seine JSON-Datei. Nur die angegebenen Änderungen werden übernommen. Bilder und nicht betroffene Bearbeitungen bleiben erhalten. Mit Rückgängig kannst du den Import zurücknehmen.</p>
          <label htmlFor="claude-patch-json">Änderungs-JSON</label>
          <textarea id="claude-patch-json" rows={12} value={text} onChange={e => { setText(e.target.value); setError(''); }} disabled={busy} placeholder='{"ops":[{"op":"modifyTile","pageId":"…","sectionIdx":0,"tileIdx":0,"patch":{"textOverlay":{"heading":"Neue Überschrift"}}}]}' style={{ display: 'block', width: '100%', minHeight: 220, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'monospace', padding: 10, margin: '8px 0' }} />
          <input ref={fileInput} type="file" accept=".json,application/json" onChange={fileChanged} disabled={busy} style={{ display: 'none' }} />
          <button className="btn" onClick={() => fileInput.current.click()} disabled={busy}>JSON-Datei wählen</button>
          {error && <p role="alert" style={{ color: '#b91c1c', whiteSpace: 'pre-wrap' }}>{error}</p>}
        </section>
        <div className="modal-footer">
          <button className="btn" onClick={() => download(true)}>Backup herunterladen</button>
          <button className="btn" onClick={onClose} disabled={busy}>Abbrechen</button>
          <button className="btn btn-primary" onClick={apply} disabled={!text.trim() || busy}>{busy ? 'Wird angewendet…' : 'Änderungen anwenden'}</button>
        </div>
      </div>
    </div>
  );
}
