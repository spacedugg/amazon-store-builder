import { useState } from 'react';
import { makeClaudeContext } from '../storePatch';

export const REFACTOR_PROMPT = `Nutze den aktuellen Skill amazon-storefront-design im Patch Mode für meinen bestehenden Brand Store. Im Anhang steht der aktuelle Store-Kontext mit stabilen IDs und baseRevision.

Lies die relevanten aktuellen Referenz-Stilprofile und Seitenanalysen der mitgegebenen Wissensbasis. Berücksichtige die projektspezifischen designReferences und ihre Stilhinweise. Übertrage passende Makro-Prinzipien für Komposition, Bildsprache, Textgewichtung und Seitenrhythmus auf das eigene Sortiment. Bewahre die eigene Corporate Identity; fremde Farben, Typografie, Icons, Motive, Texte oder Produktmengen sind keine Vorgabe.

Prüfe die gewünschten Änderungen gegen die aktuellen Skill-Regeln. Designer-Briefings bleiben Englisch, kundensichtbare Copy bleibt Deutsch, sofern keine andere Sprache vereinbart ist. Beschreibe Desktop und Mobile passend zum Modul. Bewahre bestehende ASIN-Zuordnungen, Hotspots, Links, Reuse-Tags, IDs, Einstellungen und nicht betroffene Inhalte. Bildfelder und Produktkatalog sind im Kontext ausgelassen und bleiben im Tool erhalten; erfinde keine Ersatzbilder oder Bildplatzhalter.

Gib genau ein Änderungs-JSON mit unveränderter baseRevision und einem ops-Array zurück. Adressiere vorhandene Seiten bevorzugt über pageId. Verwende nur die unterstützten Operationen aus dem Skill. Verschiebe vorhandene Abschnitte mit moveSection, statt sie zu löschen und neu anzulegen. Prüfe Limits am resultierenden Store. Bei veraltetem Kontext den aktuellen Stand anfordern. Gib keinen vollständigen Ersatz-Store für einen Neuimport zurück.

Ich spiele das Änderungs-JSON im bestehenden Store über „Mit Claude bearbeiten“ ein. Nenne außerhalb des JSON kurz die tatsächlich geänderten Bereiche.`;

export function buildStoreExports(store) {
  return store ? {
    fullJson: JSON.stringify(store, null, 2),
    contextJson: JSON.stringify(makeClaudeContext(store), null, 2),
  } : { fullJson: '', contextJson: '' };
}

export default function JsonExportModal({ onClose, store }) {
  const [copied, setCopied] = useState('');
  const brandSlug = (store?.brandName || 'store').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'store';
  const { fullJson, contextJson } = buildStoreExports(store);
  const enabled = !!store?.pages?.length;
  const doDownload = mode => {
    if (!store) return;
    const content = mode === 'full' ? fullJson : contextJson;
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${brandSlug}-store-${mode}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const doCopyPrompt = async () => {
    if (!navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(REFACTOR_PROMPT);
    setCopied('prompt');
    setTimeout(() => setCopied(''), 3000);
  };

  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-box" onClick={event => event.stopPropagation()} style={{ maxWidth: 660, padding: 24, maxHeight: '90vh', overflow: 'auto', color: '#0f172a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Store-JSON sichern oder bearbeiten</h2>
        <button onClick={onClose} aria-label="Schließen" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
      </div>
      <section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, marginTop: 0 }}>Vollständiges Backup</h3>
        <p style={{ fontSize: 12 }}>Sichere den kompletten aktuellen Store einschließlich hochgeladener Bilder. Bewahre diese Datei vor einer größeren Überarbeitung auf.</p>
        <button className="btn" disabled={!enabled} onClick={() => doDownload('full')}>Backup mit Bildern herunterladen ({Math.round(fullJson.length / 1024)} KB)</button>
      </section>
      <section style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: 12 }}>
        <h3 style={{ fontSize: 14, marginTop: 0 }}>Bestehenden Store mit Claude überarbeiten</h3>
        <p style={{ fontSize: 12 }}>Der Kontext enthält die aktuellen Texte, Briefings, Referenzen und Struktur mit IDs. Hochgeladene Bilder und Produktdaten bleiben im Store erhalten.</p>
        <ol style={{ fontSize: 12, lineHeight: 1.6, paddingLeft: 20 }}>
          <li>Lade den aktuellen Änderungskontext herunter und füge ihn zusammen mit dem aktuellen Skill in Claude ein.</li>
          <li>Kopiere den Auftrag unten und ergänze deine gewünschten Änderungen.</li>
          <li>Claude liefert ein Änderungs-JSON mit <code>baseRevision</code> und <code>ops</code>.</li>
          <li>Öffne im bestehenden Store <b>Mit Claude bearbeiten</b>, füge das Änderungs-JSON ein und prüfe die Änderungen.</li>
        </ol>
        <button className="btn" disabled={!enabled} onClick={() => doDownload('context')}>Änderungskontext herunterladen ({Math.round(contextJson.length / 1024)} KB)</button>
        <p style={{ fontSize: 12 }}>Der Änderungskontext ist für die Bearbeitung gedacht. Nutze für die Sicherung das vollständige Backup oben.</p>
        <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: 10, fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto', marginBottom: 8 }}>{REFACTOR_PROMPT}</div>
        <button className="btn btn-primary" onClick={doCopyPrompt}>Änderungsauftrag kopieren</button>
        {copied === 'prompt' && <span role="status" style={{ marginLeft: 8, color: '#15803d' }}>Auftrag kopiert</span>}
      </section>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}><button className="btn" onClick={onClose}>Schließen</button></div>
    </div>
  </div>;
}
