import {Component} from 'react';
import {loadAutoSave} from '../storage';

// Ein Darstellungsfehler darf nicht die gesamte eingebettete Ansicht leeren.
// Keine automatische Navigation: erst sichern, dann bewusst neu laden.
export default class RenderErrorBoundary extends Component {
  state = {error: null};
  static getDerivedStateFromError(error) { return {error}; }
  componentDidCatch(error, info) { console.error('Store-Ansicht konnte nicht gerendert werden:', error, info.componentStack); }

  downloadBackup = () => {
    const draft = loadAutoSave();
    if (!draft) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], {type:'application/json'}));
    const a = document.createElement('a');
    a.href = url; a.download = 'store-sicherung.json'; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  render() {
    if (!this.state.error) return this.props.children;
    const draft = this.props.editor ? loadAutoSave() : null;
    return <main style={{padding:32,maxWidth:760,margin:'40px auto',fontFamily:'system-ui',color:'#334155'}}>
      <h1 role="alert" style={{fontSize:24}}>Die Ansicht konnte nicht angezeigt werden.</h1>
      <p>Es ist ein Darstellungsfehler aufgetreten. Bereits gespeicherte Änderungen bleiben erhalten.</p>
      {draft && <p>Eine lokale Sicherung{draft.brandName ? ' für ' + draft.brandName : ''} ist verfügbar.</p>}
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        {draft && <button className="btn" onClick={this.downloadBackup}>Lokale Sicherung herunterladen</button>}
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Ansicht neu laden</button>
      </div>
      <details style={{marginTop:24}}><summary>Technische Fehlermeldung</summary><pre style={{whiteSpace:'pre-wrap'}}>{String(this.state.error.message || this.state.error)}</pre></details>
    </main>;
  }
}
