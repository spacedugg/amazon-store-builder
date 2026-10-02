import { useState, useEffect, useRef } from 'react';
import { STATUS_LABEL_CUSTOMER, timeAgo } from '../feedbackApi';

// Feedback Oberflaeche fuer den Kunden in der Customer Preview.
// Ziel: so einfach, dass niemand eine Anleitung braucht. Oben eine schmale
// Leiste, die erklaert was zu tun ist; ein Klick auf eine Kachel oeffnet ein
// kleines Fenster mit einem Textfeld. Kein Login, kein Screenshot, keine Mail.

var ACCENT = '#423CE0';
var NAME_KEY = 'bs-feedback-name';

function BubbleIcon({ size, color }) {
  return (
    <svg width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.5-.7L3 21l1.9-5.1A8.4 8.4 0 1 1 21 11.5z" />
    </svg>
  );
}

// Schmale Leiste oben. Zu Beginn zeigt sie nur einen unauffaelligen Knopf, damit der Kunde
// nicht zum Feedback gedraengt wird. Erst nach dem Klick erklaert sie den Modus.
export function FeedbackBar({ on, onToggle, onGeneral, count, isMobile }) {
  var font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  var btn = { borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
  if (!on) {
    return (
      <div style={{ position: 'sticky', top: 0, zIndex: 99, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, background: '#F7F7F8', borderBottom: '1px solid #E3E5E8', paddingTop: 6, paddingBottom: 6, paddingLeft: isMobile ? 12 : 20, paddingRight: 170, fontFamily: font }}>
        <button onClick={onToggle} style={{ ...btn, background: '#fff', color: ACCENT, border: '1px solid ' + ACCENT, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <BubbleIcon size={15} /> Feedback geben
        </button>
      </div>
    );
  }
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 99, flexShrink: 0,
      background: '#EDECFC', borderBottom: '1px solid #C9C6F7',
      paddingTop: 8, paddingBottom: 8, paddingLeft: isMobile ? 12 : 20, paddingRight: 170,
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      fontFamily: font, fontSize: 13, color: '#1E1B15',
    }}>
      <span style={{ display: 'inline-flex', color: ACCENT }}><BubbleIcon size={18} /></span>
      <span style={{ flex: '1 1 220px', minWidth: 0, lineHeight: 1.35 }}>
        <b>Feedback-Modus:</b> Klicke auf eine markierte Kachel, um dazu etwas zu schreiben.
      </span>
      <button onClick={onGeneral} style={{ ...btn, background: '#fff', color: ACCENT, border: '1px solid ' + ACCENT }}>
        Allgemeines Feedback{count > 0 ? ' (' + count + ')' : ''}
      </button>
      <button onClick={onToggle} style={{ ...btn, background: 'transparent', color: '#4B4A58', border: '1px solid #C9C6F7' }}>
        Fertig
      </button>
    </div>
  );
}

// Legt sich ueber eine Kachel, solange der Feedback Modus an ist.
export function FeedbackTileLayer({ count, onOpen, label }) {
  var [hover, setHover] = useState(false);
  return (
    <div role="button" tabIndex={0} aria-label={label || 'Feedback zu dieser Kachel geben'}
      onClick={function(e) { e.preventDefault(); e.stopPropagation(); onOpen(); }}
      onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onOpen(); } }}
      onMouseEnter={function() { setHover(true); }}
      onMouseLeave={function() { setHover(false); }}
      style={{
        position: 'absolute', inset: 0, zIndex: 6, cursor: 'pointer',
        outline: hover ? '3px solid ' + ACCENT : '1px dashed rgba(66,60,224,.45)', outlineOffset: -3,
        background: hover ? 'rgba(66,60,224,.10)' : 'transparent', transition: 'background .12s',
      }}>
      {/* kleine Sprechblase: immer sichtbar (auch auf dem Handy), Zahl = bisheriges Feedback */}
      <span style={{
        position: 'absolute', top: 8, right: 8, minWidth: 30, height: 30, padding: '0 8px', boxSizing: 'border-box',
        borderRadius: 15, background: count > 0 ? ACCENT : '#fff', color: count > 0 ? '#fff' : ACCENT,
        border: '1px solid ' + ACCENT, boxShadow: '0 1px 6px rgba(0,0,0,.25)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        fontSize: 12, fontWeight: 700, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <BubbleIcon size={14} />{count > 0 ? count : '+'}
      </span>
      {hover && (
        <span style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap',
          background: ACCENT, color: '#fff', borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 700,
          boxShadow: '0 4px 14px rgba(0,0,0,.3)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          Hier Feedback geben
        </span>
      )}
    </div>
  );
}

function statusChip(status) {
  var colors = { neu: ['#EDECFC', ACCENT], offen: ['#FEF3C7', '#92400E'], erledigt: ['#DCFCE7', '#166534'] };
  var c = colors[status] || colors.neu;
  return (
    <span style={{ background: c[0], color: c[1], borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {STATUS_LABEL_CUSTOMER[status] || status}
    </span>
  );
}

// Fenster mit bisherigen Kommentaren zu dieser Kachel und einem Textfeld.
// target: { scope: 'tile' | 'store', title, subtitle }
export function FeedbackDialog({ target, items, onClose, onSubmit }) {
  var [text, setText] = useState('');
  var [name, setName] = useState(function() {
    try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; }
  });
  var [sending, setSending] = useState(false);
  var [error, setError] = useState('');
  var [sentNote, setSentNote] = useState(false);
  var areaRef = useRef(null);

  useEffect(function() { if (areaRef.current) areaRef.current.focus(); }, []);
  useEffect(function() {
    var onKey = function(e) { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true); setError('');
    try {
      await onSubmit({ text: text.trim(), author: name.trim() });
      try { localStorage.setItem(NAME_KEY, name.trim()); } catch (e) { /* ignorieren */ }
      setText(''); setSentNote(true);
    } catch (e) {
      setError(e && e.message ? e.message : 'Das hat leider nicht geklappt. Bitte noch einmal versuchen.');
    } finally {
      setSending(false);
    }
  }

  var font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2147483000, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, fontFamily: font }}>
      <div onClick={function(e) { e.stopPropagation(); }} role="dialog" aria-label="Feedback"
        style={{ background: '#fff', borderRadius: 14, width: 'min(94vw, 460px)', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.3)', color: '#1E1B15' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '16px 18px 8px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{target.title}</div>
            {target.subtitle && <div style={{ fontSize: 12, color: '#6A6253', marginTop: 2 }}>{target.subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Schließen"
            style={{ background: 'transparent', border: 'none', fontSize: 24, lineHeight: 1, color: '#64748b', cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>

        {items.length > 0 && (
          <div style={{ padding: '4px 18px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#857C6A', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Bisheriges Feedback</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
              {items.map(function(it, i) {
                return (
                  <div key={i} style={{ background: '#F7F7F8', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 11.5, color: '#6A6253' }}>{(it.author || 'Gast') + ' · ' + timeAgo(it.createdAt)}</span>
                      {statusChip(it.status)}
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{it.text}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ padding: '12px 18px 18px' }}>
          {sentNote && (
            <div role="status" style={{ background: '#DCFCE7', color: '#166534', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              Danke, dein Feedback ist bei uns angekommen.
            </div>
          )}
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            {items.length > 0 ? 'Noch etwas dazu?' : 'Was sollen wir hier ändern?'}
          </label>
          <textarea ref={areaRef} value={text} rows={4} maxLength={2000}
            onChange={function(e) { setText(e.target.value); setSentNote(false); }}
            onKeyDown={function(e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send(); }}
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', color: '#1E1B15' }} />
          <input value={name} onChange={function(e) { setName(e.target.value); }} maxLength={80}
            placeholder="Dein Name (optional)"
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', marginTop: 8, color: '#1E1B15' }} />
          {error && <div role="alert" style={{ color: '#b91c1c', fontSize: 12.5, marginTop: 8 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button onClick={onClose}
              style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#1E1B15' }}>
              Schließen
            </button>
            <button onClick={send} disabled={!text.trim() || sending}
              style={{ background: ACCENT, color: '#fff', border: '1px solid ' + ACCENT, borderRadius: 8, padding: '9px 18px', fontSize: 13.5, fontWeight: 700, cursor: text.trim() && !sending ? 'pointer' : 'default', opacity: text.trim() && !sending ? 1 : 0.5, fontFamily: 'inherit' }}>
              {sending ? 'Wird gesendet …' : 'Feedback senden'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
