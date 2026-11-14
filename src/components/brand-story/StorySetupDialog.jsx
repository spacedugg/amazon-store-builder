import React, { useState } from 'react';
import StoryModal from './StoryModal';
import StoryPlanning from './StoryPlanning';
import { prepareStoryImport } from '../../brandStoryWorkflow.mjs';
import { claudePrompt, validateStory } from '../../brandStoryModel.mjs';
import { defaultPlanning } from '../../brandStoryPlanning.mjs';

export default function StorySetupDialog({ story, projectIdentity, draft, setDraft, onChange, onClose, onStart, onImport, onExport }) {
  const { json, review } = draft;
  const [stage, setStage] = useState(story.cards.length || json ? 'claude' : 'plan');
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const change = next => { onChange(next); setDraft(d=>({...d,review:null})); };
  function ready() { validateStory({...story,planning:story.planning || defaultPlanning()}); }
  function proceed() { try { ready(); setStage('claude'); setError(''); } catch(e) { setError(e.message); } }
  function manual() {
    try { ready(); onChange({...story, planning:{...(story.planning || defaultPlanning()),mode:'manual'}}); onStart(); }
    catch(e) { setError(e.message); }
  }
  function check() {
    try { setDraft(d=>({...d,review:prepareStoryImport(json,story.brandName.trim()?story:null,projectIdentity || (story.brandName.trim()?story:null))})); setError(''); }
    catch(e) { setDraft(d=>({...d,review:null})); setError('JSON konnte nicht übernommen werden: '+e.message); }
  }
  return <StoryModal title={stage==='plan'?'Brand Story anlegen':'Konzept mit Claude'} onClose={onClose} wide>
    {stage==='plan'?<><StoryPlanning story={story} onChange={change} onContinue={proceed} onManual={manual} onJson={()=>setStage('claude')}/></>:<>
      <button onClick={()=>setStage('plan')}>← Marke und Auswahl bearbeiten</button>
      <div className="bs-setup-intro"><span className="bs-step">1</span><div><h3>Auftrag in Claude öffnen</h3><p>Der Organisations-Skill <strong>Amazon Brand Story</strong> muss einmalig in Claude eingerichtet sein. Kopiere den Projektauftrag in einen Claude-Chat, stimme dort das Konzept ab und lasse anschließend das JSON ausgeben.</p></div></div>
      <p className="bs-help">{story.brandName || 'Neue Marke'} · {story.cards.length} vorhandene Karten · {story.planning?.categories?.filter(c=>c.selected).length || 0} ausgewählte Kategorien</p>
      <div className="bs-dialog-actions"><button className="bs-primary" onClick={async()=>{try{ready();await navigator.clipboard.writeText(claudePrompt(story));setNotice('Auftrag für den hinterlegten Claude-Skill kopiert.');setError('');}catch(e){setError(e.message);}}}>Auftrag für Claude kopieren</button><button onClick={onExport}>Projektstand als JSON sichern</button></div>
      <div className="bs-setup-intro"><span className="bs-step">2</span><div><h3>Konzept importieren und Vorschau öffnen</h3><p>Füge das abgestimmte JSON ein oder lade die Datei hoch. Karten, Texte, Hintergrundmotive und Links bleiben im Builder bearbeitbar.</p></div></div>
      <label className="bs-field"><span>Brand Story JSON</span><textarea aria-label="Brand Story JSON" className="bs-json" value={json} onChange={e=>setDraft(d=>({...d,json:e.target.value,review:null}))} placeholder={'{ "schemaVersion": 1, "brandName": "…", … }'}/></label>
      <label className="bs-upload">JSON-Datei laden<input type="file" accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{const text=await file.text();setDraft(d=>({...d,json:text,review:null}));setError('');}catch(err){setError(err.message);}e.target.value='';}}/></label>
      {review && <div className="bs-import-review"><h3>{review.story.brandName} · {review.story.marketplace.toUpperCase()}</h3><p>{review.summary}</p><p>Desktop und Mobil verwenden dieselbe Kartenfolge. Hintergrundmotive und Inhalte bleiben bearbeitbar.</p><ol>{review.story.cards.map(c=><li key={c.id}>{c.type==='grid'?'ASIN-Grid':'Brand Media Asset'}{c.headline || c.title || c.copy?` · ${c.headline || c.title || c.copy}`:''}</li>)}</ol><p>{review.foreign?'Dieser Import wird als eigenes Projekt geöffnet.':'Dieser Import ersetzt die Kartenstruktur des aktuellen Entwurfs. Passende vorhandene Bilder bleiben erhalten. Sichere den aktuellen Stand bei Bedarf vorher als JSON.'}</p></div>}
      <footer className="bs-dialog-actions"><button className="bs-primary" disabled={!json.trim()} onClick={()=>review?onImport(review):check()}>{review?'Konzept übernehmen':'JSON prüfen'}</button><button onClick={()=>manual(false)}>Vorschau ohne JSON öffnen</button></footer>
    </>}
    {notice && <p role="status">{notice}</p>}{error && <p className="bs-warning" role="alert">{error}</p>}
  </StoryModal>;
}
