import { useState, useEffect, useRef } from 'react';
import { loadFeedback, updateFeedback, removeFeedback, tileKey, timeAgo, sharedImageInfo, STATUS_LABEL_TEAM } from '../feedbackApi';
import { tileImageForView } from '../tileSync';

// Team Ansicht "Kunden-Feedback": alles, was Kunden in der Customer Preview
// an Kacheln hinterlassen haben, an einem Ort. Statt Mails mit Screenshots
// sieht man hier die Kachel, den Text und von wem er kommt, setzt den Status
// und leitet bei Bedarf direkt an den Designer weiter. Den Text kann das Team
// fuer den Designer umformulieren, das Original des Kunden bleibt erhalten.

var ACCENT = '#423CE0';

function chipColors(status) {
  return { neu: ['#EDECFC', ACCENT], offen: ['#FEF3C7', '#92400E'], erledigt: ['#DCFCE7', '#166534'] }[status] || ['#EDECFC', ACCENT];
}

function findTile(store, item) {
  var page = (store.pages || []).find(function(p) { return p.id === item.pageId; });
  if (!page) return { page: null, tile: null };
  var section = (page.sections || []).find(function(s) { return s.id === item.sectionId; });
  var tile = section && section.tiles ? section.tiles[item.tileIndex] : null;
  return { page: page, tile: tile || null };
}

function Thumb({ tile, mobile }) {
  var img = tile ? (tileImageForView(tile, mobile) || tile.wireframeImage || null) : null;
  var dims = tile ? ((mobile ? tile.mobileDimensions : tile.dimensions) || tile.dimensions) : null;
  var ratio = dims && dims.w > 0 && dims.h > 0 ? dims.w / dims.h : 2.5;
  return (
    <div style={{ width: 150, flexShrink: 0 }}>
      <div style={{ width: '100%', aspectRatio: String(Math.max(0.6, Math.min(4, ratio))), background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {img
          ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <span style={{ fontSize: 10.5, color: '#94a3b8', textAlign: 'center', padding: 4 }}>{tile ? 'noch kein Bild' : 'Kachel nicht mehr vorhanden'}</span>}
      </div>
    </div>
  );
}

export default function FeedbackPanel({ store, shareToken, customerUrl, onClose, onJump, onChanged }) {
  var [items, setItems] = useState(null);
  var [error, setError] = useState('');
  var [filter, setFilter] = useState('neu');
  var [busy, setBusy] = useState('');
  var [copied, setCopied] = useState(false);
  var [note, setNote] = useState('');
  var [editing, setEditing] = useState(null); // { id, text }
  var [confirmDel, setConfirmDel] = useState('');
  var noteTimer = useRef(null);
  var inputRef = useRef(null);

  function reload() {
    if (!shareToken) return Promise.resolve();
    return loadFeedback({ shareToken: shareToken }).then(function(r) {
      setItems((r && r.items) || []); setError('');
      if (onChanged) onChanged(r && r.items);
    }).catch(function(e) { setError(e.message || 'Feedback konnte nicht geladen werden.'); });
  }
  useEffect(function() {
    reload();
    var t = setInterval(reload, 30000);
    return function() { clearInterval(t); };
  }, [shareToken]);
  useEffect(function() {
    var onKey = function(e) { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  function flash(msg) {
    setNote(msg);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(function() { setNote(''); }, 2500);
  }
  async function patch(item, change, okMsg) {
    setBusy(item.id); setError('');
    try { await updateFeedback(shareToken, item.id, change); await reload(); if (okMsg) flash(okMsg); return true; }
    catch (e) { setError(e.message || 'Das hat nicht geklappt.'); return false; }
    finally { setBusy(''); }
  }
  // Kein window.confirm: im eingebetteten Fenster (iframe) wird es vom Browser oft blockiert,
  // dann passierte beim Klick auf "Loeschen" gar nichts. Stattdessen ein zweiter Klick.
  async function remove(item) {
    setBusy(item.id); setError('');
    try { await removeFeedback(shareToken, item.id); setConfirmDel(''); await reload(); flash('Feedback gelöscht'); }
    catch (e) { setError(e.message || 'Das hat nicht geklappt.'); }
    finally { setBusy(''); }
  }
  async function saveEdit() {
    if (!editing) return;
    var item = (items || []).find(function(i) { return i.id === editing.id; });
    if (!item) { setEditing(null); return; }
    var text = editing.text.trim();
    // Entspricht die Fassung dem Original, brauchen wir keine eigene
    var teamText = text === item.text.trim() ? '' : text;
    var ok = await patch(item, { teamText: teamText }, 'Gespeichert');
    if (ok) setEditing(null);
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(customerUrl); setCopied(true); return; } catch (e) { /* Fallback */ }
    try { if (inputRef.current) { inputRef.current.focus(); inputRef.current.select(); setCopied(!!document.execCommand('copy')); } } catch (e) { /* ignorieren */ }
  }

  var counts = { neu: 0, offen: 0, erledigt: 0, alle: (items || []).length };
  (items || []).forEach(function(it) { if (counts[it.status] != null) counts[it.status] += 1; });
  var shown = (items || []).filter(function(it) { return filter === 'alle' || it.status === filter; });

  // nach Kachel gruppieren: Allgemeines zuerst, dann Seite, Abschnitt, Kachel
  var groups = {};
  var order = [];
  shown.forEach(function(it) {
    var key = it.scope === 'store' ? '__store__' : tileKey(it.pageId, it.sectionId, it.tileIndex);
    if (!groups[key]) { groups[key] = { key: key, first: it, list: [] }; order.push(key); }
    groups[key].list.push(it);
  });
  var pageIdx = {};
  (store.pages || []).forEach(function(p, i) { pageIdx[p.id] = i; });
  order.sort(function(a, b) {
    if (a === '__store__') return -1;
    if (b === '__store__') return 1;
    var x = groups[a].first, y = groups[b].first;
    return ((pageIdx[x.pageId] || 0) - (pageIdx[y.pageId] || 0)) || (x.sectionIndex - y.sectionIndex) || (x.tileIndex - y.tileIndex);
  });

  var tabs = [['neu', 'Neu'], ['offen', 'In Arbeit'], ['erledigt', 'Erledigt'], ['alle', 'Alle']];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 820, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={function(e) { e.stopPropagation(); }}>
        <div className="modal-header">
          <span>Kunden-Feedback</span>
          <button className="modal-close" onClick={onClose} title="Schließen" aria-label="Schließen">×</button>
        </div>

        <div style={{ padding: '4px 20px 12px', borderBottom: '1px solid #f1f5f9' }}>
          {customerUrl ? (
            <>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                Diesen Link bekommt der Kunde. Sein Feedback landet automatisch hier, ohne Mail und ohne Screenshots.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input ref={inputRef} readOnly value={customerUrl} onFocus={function(e) { e.target.select(); }} aria-label="Kunden Link"
                  style={{ flex: 1, minWidth: 0, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#f8fafc', color: '#0f172a' }} />
                <button className="btn btn-primary" onClick={copyLink}>{copied ? 'Kopiert' : 'Link kopieren'}</button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px' }}>
              Es gibt noch keinen Kunden-Link. Klick oben auf „Kunden-Link", dann wird der Store gespeichert und der Link erzeugt.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, padding: '10px 20px', flexWrap: 'wrap' }}>
          {tabs.map(function(t) {
            var active = filter === t[0];
            return (
              <button key={t[0]} onClick={function() { setFilter(t[0]); }}
                style={{ border: '1px solid ' + (active ? ACCENT : '#e2e8f0'), background: active ? '#EDECFC' : '#fff', color: active ? ACCENT : '#475569', borderRadius: 16, padding: '5px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t[1]} ({counts[t[0]]})
              </button>
            );
          })}
        </div>

        {note && <div role="status" style={{ margin: '0 20px 8px', color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 10px', fontSize: 12.5 }}>{note}</div>}
        {error && <div role="alert" style={{ margin: '0 20px 8px', color: '#b91c1c', fontSize: 12.5 }}>{error}</div>}

        <div style={{ overflowY: 'auto', padding: '0 20px 20px', flex: 1 }}>
          {items === null && !error && <div style={{ color: '#64748b', fontSize: 13, padding: '20px 0' }}>Lädt …</div>}
          {items !== null && order.length === 0 && (
            <div style={{ color: '#64748b', fontSize: 13.5, padding: '28px 0', textAlign: 'center' }}>
              {counts.alle === 0 ? 'Noch kein Feedback vom Kunden.' : 'Hier ist nichts in dieser Ansicht.'}
            </div>
          )}
          {order.map(function(key) {
            var g = groups[key];
            var isStore = key === '__store__';
            var f = isStore ? { page: null, tile: null } : findTile(store, g.first);
            var heading = isStore ? 'Allgemeines Feedback' : ((g.first.pageName || (f.page && f.page.name) || 'Seite') + ' · Abschnitt ' + (g.first.sectionIndex + 1) + ' · Kachel ' + (g.first.tileIndex + 1));
            return (
              <div key={key} style={{ display: 'flex', gap: 14, border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginTop: 12, alignItems: 'flex-start' }}>
                {!isStore && <Thumb tile={f.tile} mobile={false} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <b style={{ fontSize: 13.5 }}>{heading}</b>
                    {!isStore && f.tile && onJump && (
                      <button className="btn" style={{ fontSize: 11, padding: '3px 9px' }} onClick={function() { onJump(g.first); }}>Zur Kachel</button>
                    )}
                  </div>
                  {!isStore && (function() {
                    var sh = sharedImageInfo(store, g.first);
                    return sh ? (
                      <div style={{ fontSize: 12, color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, padding: '4px 8px', marginBottom: 4 }}>
                        Dasselbe Bild wird auch hier verwendet: {sh.others.join('; ')}. Wer das Bild ersetzt, ersetzt es überall.
                      </div>
                    ) : null;
                  })()}
                  {g.list.map(function(it) {
                    var c = chipColors(it.status);
                    var disabled = busy === it.id;
                    return (
                      <div key={it.id} style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: '#64748b', marginBottom: 3 }}>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{it.author || 'Gast'}</span>
                          <span>{timeAgo(it.createdAt)}</span>
                          <span style={{ background: c[0], color: c[1], borderRadius: 10, padding: '1px 8px', fontWeight: 600 }}>{STATUS_LABEL_TEAM[it.status] || it.status}</span>
                          {it.forwarded && <span style={{ background: '#E0F2FE', color: '#075985', borderRadius: 10, padding: '1px 8px', fontWeight: 600 }}>Beim Designer</span>}
                        </div>
                        <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#0f172a' }}>{it.text}</div>
                        {editing && editing.id === it.id ? (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 4 }}>Text für den Designer (das Original des Kunden bleibt oben stehen)</div>
                            <textarea value={editing.text} autoFocus rows={4} maxLength={2000}
                              onChange={function(e) { setEditing({ id: it.id, text: e.target.value }); }}
                              style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', fontSize: 13.5, resize: 'vertical' }} />
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                              <button className="btn btn-primary" disabled={disabled || !editing.text.trim()} style={{ fontSize: 11 }} onClick={saveEdit}>{disabled ? 'Speichert …' : 'Speichern'}</button>
                              <button className="btn" disabled={disabled} style={{ fontSize: 11 }} onClick={function() { setEditing(null); }}>Abbrechen</button>
                            </div>
                          </div>
                        ) : (
                          it.teamText && (
                            <div style={{ marginTop: 8, borderLeft: '3px solid #38bdf8', background: '#f0f9ff', borderRadius: 4, padding: '6px 10px' }}>
                              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#075985', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>Fassung für den Designer</div>
                              <div style={{ fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#0c4a6e' }}>{it.teamText}</div>
                            </div>
                          )
                        )}
                        {it.forwarded && (
                          <div style={{ marginTop: 6, fontSize: 12, color: it.designerDone ? '#166534' : '#075985' }}>
                            {it.designerDone ? '✓ Der Designer hat das als umgesetzt abgehakt' : 'Der Designer hat das noch nicht abgehakt'}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          {!(editing && editing.id === it.id) && (
                            <button className="btn" disabled={disabled} style={{ fontSize: 11 }} onClick={function() { setEditing({ id: it.id, text: it.teamText || it.text }); }}>Bearbeiten</button>
                          )}
                          <button className="btn" disabled={disabled} style={{ fontSize: 11 }} onClick={function() { patch(it, { forwarded: !it.forwarded }, it.forwarded ? 'Beim Designer zurückgezogen' : 'An den Designer weitergeleitet'); }}>
                            {disabled ? '…' : (it.forwarded ? 'Beim Designer zurückziehen' : 'An Designer weiterleiten')}
                          </button>
                          {it.status !== 'erledigt'
                            ? <button className="btn" disabled={disabled} style={{ fontSize: 11 }} onClick={function() { patch(it, { status: 'erledigt' }, 'Als erledigt markiert'); }}>Erledigt</button>
                            : <button className="btn" disabled={disabled} style={{ fontSize: 11 }} onClick={function() { patch(it, { status: 'offen' }, 'Wieder in Arbeit'); }}>Wieder öffnen</button>}
                          {confirmDel === it.id ? (
                            <>
                              <button className="btn" disabled={disabled} style={{ fontSize: 11, background: '#dc2626', color: '#fff', borderColor: '#dc2626' }} onClick={function() { remove(it); }}>{disabled ? 'Löscht …' : 'Wirklich löschen'}</button>
                              <button className="btn" disabled={disabled} style={{ fontSize: 11 }} onClick={function() { setConfirmDel(''); }}>Abbrechen</button>
                            </>
                          ) : (
                            <button className="btn" disabled={disabled} style={{ fontSize: 11, color: '#b91c1c' }} onClick={function() { setConfirmDel(it.id); }}>Löschen</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
