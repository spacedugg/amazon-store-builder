// Kunden Feedback: Aufrufe an /api/feedback und kleine Helfer.
// Server siehe api/feedback.js.

export var STATUS_LABEL_CUSTOMER = { neu: 'Gesendet', offen: 'In Bearbeitung', erledigt: 'Erledigt' };
export var STATUS_LABEL_TEAM = { neu: 'Neu', offen: 'Übernommen', erledigt: 'Erledigt' };

function qs(params) {
  return Object.keys(params).filter(function(k) { return params[k] != null && params[k] !== ''; })
    .map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
}

async function readJson(resp) {
  var json = null;
  try { json = await resp.json(); } catch (e) { /* keine JSON Antwort */ }
  if (!resp.ok) {
    var err = new Error((json && json.error) || ('Fehler ' + resp.status));
    err.status = resp.status;
    throw err;
  }
  return json;
}

// ref: { slug } fuer den Kunden oder { shareToken } fuers Team / den Designer.
export async function loadFeedback(ref, opts) {
  var resp = await fetch('/api/feedback?' + qs(Object.assign({}, ref, opts || {})));
  return readJson(resp);
}

export async function sendFeedback(ref, payload) {
  var resp = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({}, ref, payload)),
  });
  return readJson(resp);
}

export async function updateFeedback(shareToken, id, patch) {
  var resp = await fetch('/api/feedback', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ shareToken: shareToken, id: id }, patch)),
  });
  return readJson(resp);
}

export async function removeFeedback(shareToken, id) {
  var resp = await fetch('/api/feedback', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shareToken: shareToken, id: id }),
  });
  return readJson(resp);
}

// Schluessel einer Kachel: gleiche Kachel = gleicher Schluessel.
export function tileKey(pageId, sectionId, tileIndex) {
  return pageId + '|' + sectionId + '|' + tileIndex;
}

// SQLite liefert "YYYY-MM-DD HH:MM:SS" in UTC.
export function parseDbDate(s) {
  if (!s) return null;
  var d = new Date(String(s).replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

export function timeAgo(s) {
  var d = parseDbDate(s);
  if (!d) return '';
  var sec = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return 'gerade eben';
  var min = Math.round(sec / 60);
  if (min < 60) return 'vor ' + min + ' Min.';
  var h = Math.round(min / 60);
  if (h < 24) return 'vor ' + h + ' Std.';
  var days = Math.round(h / 24);
  if (days < 14) return 'vor ' + days + (days === 1 ? ' Tag' : ' Tagen');
  return d.toLocaleDateString('de-DE');
}
