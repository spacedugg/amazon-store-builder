import { useRef, useEffect, useState } from 'react';

// Zeigt einen erzeugten Link (oder eine Fehlermeldung) direkt im Tool an.
// Bewusst KEIN alert()/prompt(): Eingebettet im Salesboard laeuft der Store
// Builder in einem fremden iframe, dort werden Browser Dialoge und die
// Zwischenablage gern blockiert, und der Link waere weg. Hier steht der Link
// immer sichtbar im Feld, kann markiert, kopiert oder geoeffnet werden.
//
// dialog: { kind: 'ok' | 'error' | 'info', title, url?, message?, notes?: string[], copied?: boolean }
export default function LinkDialog({ dialog, onClose }) {
  var inputRef = useRef(null);
  var [copyState, setCopyState] = useState(dialog && dialog.copied ? 'copied' : '');

  useEffect(function() {
    if (inputRef.current) {
      try { inputRef.current.focus(); inputRef.current.select(); } catch (e) { /* ignore */ }
    }
  }, []);

  useEffect(function() {
    var onKey = function(e) { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  if (!dialog) return null;
  var isError = dialog.kind === 'error';
  var isInfo = dialog.kind === 'info'; // nur eine Meldung, kein Link

  var copy = async function() {
    var url = dialog.url || '';
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
      return;
    } catch (e) { /* Zwischenablage gesperrt, Fallback unten */ }
    try {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
        var ok = document.execCommand && document.execCommand('copy');
        setCopyState(ok ? 'copied' : 'manual');
        return;
      }
    } catch (e) { /* ignore */ }
    setCopyState('manual');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={function(e) { e.stopPropagation(); }}>
        <div className="modal-header">
          <span style={isError ? { color: '#b91c1c' } : undefined}>{dialog.title}</span>
          <button className="modal-close" onClick={onClose} title="Schließen" aria-label="Schließen">×</button>
        </div>
        <div style={{ padding: '4px 20px 20px' }}>
          {isError || isInfo ? (
            <div style={{ fontSize: 13, lineHeight: 1.55, color: '#334155', whiteSpace: 'pre-wrap' }} role={isError ? 'alert' : 'status'}>{dialog.message}</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <input ref={inputRef} readOnly value={dialog.url || ''}
                  onFocus={function(e) { e.target.select(); }}
                  aria-label="Link"
                  style={{ flex: 1, minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#0f172a', background: '#f8fafc' }} />
                <button className="btn btn-primary" onClick={copy}>
                  {copyState === 'copied' ? 'Kopiert' : 'Kopieren'}
                </button>
              </div>
              {copyState === 'manual' && (
                <div style={{ fontSize: 12, color: '#b45309', marginTop: 8 }}>
                  Der Browser erlaubt hier kein automatisches Kopieren. Der Link ist markiert, mit Strg+C (Mac: Cmd+C) kopieren.
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <a href={dialog.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: '#423CE0', textDecoration: 'none', fontWeight: 600 }}>
                  Link in neuem Tab öffnen ↗
                </a>
              </div>
              {(dialog.notes || []).map(function(n, i) {
                return <div key={i} style={{ fontSize: 12, color: '#64748b', marginTop: 8, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n}</div>;
              })}
            </>
          )}
          <div className="modal-footer">
            <button className="btn" onClick={onClose}>Schließen</button>
          </div>
        </div>
      </div>
    </div>
  );
}
