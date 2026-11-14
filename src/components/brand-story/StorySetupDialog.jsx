import React, { useState } from 'react';
import StoryModal from './StoryModal';
import { CONTEXT_FIELDS, prepareStoryImport } from '../../brandStoryWorkflow.mjs';
import { claudePrompt } from '../../brandStoryModel.mjs';

export default function StorySetupDialog({ story, projectIdentity, draft, setDraft, onChange, onClose, onStart, onImport, onExport }) {
  const { json, review } = draft;
  const setJson = json => setDraft(d => ({ ...d, json, review: null }));
  const setReview = review => setDraft(d => ({ ...d, review }));
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const field = (label, key, area = true, context = false) => <label className="bs-field" key={key}><span>{label}</span>{React.createElement(area ? 'textarea' : 'input', {
    'aria-label': label,
    value: context ? story.context?.[key] || '' : story[key] || '',
    onChange: e => { onChange(context ? { ...story, context: { ...story.context, [key]: e.target.value } } : { ...story, [key]: e.target.value }); setReview(null); },
  })}</label>;
  function check() {
    try { setReview(prepareStoryImport(json, story.brandName.trim() ? story : null, projectIdentity || (story.brandName.trim() ? story : null))); setError(''); }
    catch (e) { setReview(null); setError('JSON konnte nicht übernommen werden: ' + e.message); }
  }
  return <StoryModal title="Brand Story mit Claude entwickeln" onClose={onClose} wide>
    <div className="bs-setup-intro"><span className="bs-step">1</span><div><h3>Marke und Inhalte festlegen</h3><p>Was ist für diese Marke wichtig? Welche Produkte und Unterseiten sollen vorkommen? Ergänze belegbare Informationen und vorhandenes Material.</p></div></div>
    <div className="bs-setup-fields">{field('Markenname', 'brandName', false)}{field('Marktplatz', 'marketplace', false)}{field('Sprache', 'language', false)}{field('Markeninformationen und Quellen', 'brandFacts')}{CONTEXT_FIELDS.map(([key, label]) => field(label, key, key !== 'cardCount', true))}{field('Eigene Hinweise zum Konzept', 'instructions')}</div>
    <div className="bs-setup-intro"><span className="bs-step">2</span><div><h3>Konzept in Claude abstimmen</h3><p>Kopiere die Anleitung mit deinen Angaben nach Claude. Kläre dort die Inhalte, Hintergrundmotive und Kartenreihenfolge. Bitte erst danach um das fertige JSON. Dieselben maximal 19 Karten werden auf Desktop und Mobil verwendet.</p></div></div>
    <div className="bs-dialog-actions"><button className="bs-primary" onClick={async () => { try { if (!story.brandName.trim()) throw Error('Bitte zuerst den Markennamen eingeben.'); await navigator.clipboard.writeText(claudePrompt(story)); setNotice('Anleitung mit Markenangaben kopiert.'); } catch (e) { setError(e.message); } }}>Anleitung kopieren</button><a className="bs-button-link" href="/brand-story-claude/temoa-brand-story.zip" download>Claude-Skill herunterladen</a><a className="bs-button-link" href="/brand-story-claude/SKILL.md" download>Anleitung als Text</a><button onClick={onExport}>Aktuellen Stand als JSON sichern</button></div>
    <div className="bs-setup-intro"><span className="bs-step">3</span><div><h3>JSON einsetzen und Vorschau öffnen</h3><p>Füge das abgestimmte JSON ein oder lade die Datei hoch. Texte, Motive und Links kannst du anschließend direkt im Builder bearbeiten.</p></div></div>
    <label className="bs-field"><span>Brand Story JSON</span><textarea aria-label="Brand Story JSON" className="bs-json" value={json} onChange={e => { setJson(e.target.value); setReview(null); }} placeholder={'{ "schemaVersion": 1, "brandName": "…", … }'} /></label>
    <label className="bs-upload">JSON-Datei laden<input type="file" accept="application/json,.json" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { setJson(await file.text()); setReview(null); setError(''); } catch (err) { setError(err.message); } e.target.value = ''; }} /></label>
    {notice && <p role="status">{notice}</p>}{error && <p className="bs-warning" role="alert">{error}</p>}
    {review && <div className="bs-import-review"><h3>{review.story.brandName} · {review.story.marketplace.toUpperCase()}</h3><p>{review.summary}</p><p>Desktop und Mobil verwenden dieselbe Kartenfolge. Hintergrundmotive und Inhalte bleiben bearbeitbar.</p><ol>{review.story.cards.map(c => <li key={c.id}>{c.type === 'grid' ? 'ASIN-Grid' : 'Brand Media Asset'}{c.headline || c.title || c.copy ? ` · ${c.headline || c.title || c.copy}` : ''}</li>)}</ol><p>{review.foreign ? 'Dieser Import wird als eigenes Projekt geöffnet.' : 'Dieser Import ersetzt die Kartenstruktur des aktuellen Entwurfs. Passende vorhandene Bilder bleiben erhalten. Sichere den aktuellen Stand bei Bedarf vorher als JSON.'}</p></div>}
    <footer className="bs-dialog-actions"><button className="bs-primary" disabled={!json.trim()} onClick={() => { if (review) onImport(review); else check(); }}>{review ? 'Konzept übernehmen' : 'JSON prüfen'}</button><button onClick={() => { if (!story.brandName.trim()) { setError('Bitte einen Markennamen eingeben.'); return; } if (!['de', 'com', 'co.uk', 'fr', 'it', 'es', 'nl', 'se', 'pl', 'com.be'].includes(story.marketplace)) { setError('Bitte einen unterstützten Marktplatz eingeben.'); return; } onStart(); }}>Vorschau ohne JSON öffnen</button></footer>
  </StoryModal>;
}
