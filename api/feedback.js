var { getClient, migrate } = require('./_db');

// Kunden Feedback zur Customer Preview.
//
// Zugriff:
//  - Kunde (Link /<brand-slug>): darf Feedback lesen und abschicken, bekommt
//    aber KEINE ids und kann nichts aendern.
//  - Team / Designer (shareToken, derselbe Token wie beim Designer Link):
//    sieht alles, kann Status setzen, an den Designer weiterleiten, loeschen.
//
// GET    /api/feedback?slug=xxx                  Liste fuer den Kunden (ohne ids)
// GET    /api/feedback?shareToken=xxx            Liste fuers Team (mit ids)
//        optional &summary=1 (nur Zaehler) oder &forwarded=1 (nur Weitergeleitete)
// POST   /api/feedback  { slug|shareToken, ... } neues Feedback
// GET    /api/feedback?counts=1                  Zaehler neuer Eintraege je Store (fuer die Store Liste)
// PATCH  /api/feedback  { shareToken, id, status?, forwarded?, teamText?, designerDone? }
// DELETE /api/feedback  { shareToken, id }

var STATUS = ['neu', 'offen', 'erledigt'];
var SCOPES = ['tile', 'page', 'store'];
var MAX_TEXT = 2000;
var MAX_PER_MINUTE = 40;

function generateId() {
  return 'fb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Muss mit api/stores.js und src/storage.js#brandToSlug uebereinstimmen.
function brandToSlug(name) {
  if (!name) return '';
  var s = String(name).toLowerCase();
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  s = s.normalize ? s.normalize('NFKD').replace(/[̀-ͯ]/g, '') : s;
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s;
}

function str(v, max) {
  return String(v == null ? '' : v).slice(0, max);
}

async function resolveStore(db, ref) {
  if (ref.shareToken) {
    var r = await db.execute({ sql: 'SELECT id, share_token, brand_name FROM stores WHERE share_token = ?', args: [String(ref.shareToken)] });
    return r.rows[0] || null;
  }
  if (ref.slug) {
    var slug = String(ref.slug).trim().toLowerCase();
    if (!slug) return null;
    var list = await db.execute('SELECT id, share_token, brand_name FROM stores ORDER BY updated_at DESC');
    for (var i = 0; i < list.rows.length; i++) {
      if (brandToSlug(list.rows[i].brand_name) === slug) return list.rows[i];
    }
  }
  return null;
}

function publicItem(row) {
  return {
    scope: row.scope, pageId: row.page_id, pageName: row.page_name,
    sectionId: row.section_id, sectionIndex: row.section_index, tileIndex: row.tile_index,
    viewMode: row.view_mode, author: row.author, text: row.text, status: row.status,
    createdAt: row.created_at,
  };
}

function teamItem(row) {
  var o = publicItem(row);
  o.id = row.id;
  o.forwarded = !!row.forwarded;
  o.updatedAt = row.updated_at;
  o.teamText = row.team_text || '';
  // Fassung, die der Designer sieht: die vom Team bearbeitete, sonst das Original
  o.designerText = row.team_text || row.text;
  o.designerDone = !!row.designer_done;
  return o;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var db = getClient();
  try {
    await migrate();
  } catch (e) {
    return res.status(500).json({ error: 'Database not available: ' + e.message });
  }

  try {
    var query = req.query || {};
    var body = req.body || {};

    // ─── Liste ───
    if (req.method === 'GET') {
      if (query.counts) {
        var cr = await db.execute("SELECT store_id, COUNT(*) AS n FROM feedback WHERE status = 'neu' GROUP BY store_id");
        var counts = {};
        cr.rows.forEach(function(r) { counts[r.store_id] = Number(r.n); });
        return res.status(200).json({ counts: counts });
      }
      var store = await resolveStore(db, { shareToken: query.shareToken, slug: query.slug });
      if (!store) return res.status(404).json({ error: 'Store nicht gefunden.' });
      var isTeam = !!query.shareToken;
      var rows = (await db.execute({
        sql: 'SELECT * FROM feedback WHERE store_id = ? ORDER BY created_at ASC, rowid ASC',
        args: [store.id],
      })).rows;
      if (isTeam && query.summary) {
        var c = { neu: 0, offen: 0, erledigt: 0, total: rows.length };
        rows.forEach(function(r) { if (c[r.status] != null) c[r.status] += 1; });
        return res.status(200).json(c);
      }
      if (isTeam && query.forwarded) rows = rows.filter(function(r) { return r.forwarded; });
      return res.status(200).json({ items: rows.map(isTeam ? teamItem : publicItem) });
    }

    // ─── Neues Feedback ───
    if (req.method === 'POST') {
      var st = await resolveStore(db, { shareToken: body.shareToken, slug: body.slug });
      if (!st) return res.status(404).json({ error: 'Store nicht gefunden.' });
      var text = String(body.text == null ? '' : body.text).trim();
      if (!text) return res.status(400).json({ error: 'Bitte einen Text eingeben.' });
      if (text.length > MAX_TEXT) return res.status(400).json({ error: 'Der Text ist zu lang (höchstens ' + MAX_TEXT + ' Zeichen).' });
      var scope = SCOPES.indexOf(body.scope) >= 0 ? body.scope : 'tile';
      var viewMode = body.viewMode === 'mobile' ? 'mobile' : 'desktop';
      var recent = await db.execute({
        sql: "SELECT COUNT(*) AS n FROM feedback WHERE store_id = ? AND created_at > datetime('now', '-1 minute')",
        args: [st.id],
      });
      if (Number(recent.rows[0].n) >= MAX_PER_MINUTE) {
        return res.status(429).json({ error: 'Zu viele Nachrichten in kurzer Zeit. Bitte kurz warten.' });
      }
      var id = generateId();
      await db.execute({
        sql: `INSERT INTO feedback (id, store_id, scope, page_id, page_name, section_id, section_index, tile_index, view_mode, author, text)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, st.id, scope, str(body.pageId, 100), str(body.pageName, 200), str(body.sectionId, 100),
          Number(body.sectionIndex) || 0, Number(body.tileIndex) || 0, viewMode, str(body.author, 80).trim(), text],
      });
      var created = (await db.execute({ sql: 'SELECT * FROM feedback WHERE id = ?', args: [id] })).rows[0];
      return res.status(200).json({ ok: true, item: publicItem(created) });
    }

    // ─── Aendern / Loeschen (nur Team mit shareToken) ───
    if (req.method === 'PATCH' || req.method === 'DELETE') {
      if (!body.shareToken || !body.id) return res.status(400).json({ error: 'shareToken und id fehlen.' });
      var ts = await resolveStore(db, { shareToken: body.shareToken });
      if (!ts) return res.status(403).json({ error: 'Kein Zugriff.' });
      var own = await db.execute({ sql: 'SELECT id FROM feedback WHERE id = ? AND store_id = ?', args: [String(body.id), ts.id] });
      if (!own.rows.length) return res.status(404).json({ error: 'Feedback nicht gefunden.' });
      if (req.method === 'DELETE') {
        await db.execute({ sql: 'DELETE FROM feedback WHERE id = ?', args: [String(body.id)] });
        return res.status(200).json({ ok: true });
      }
      var sets = [];
      var args = [];
      if (body.status != null) {
        if (STATUS.indexOf(body.status) < 0) return res.status(400).json({ error: 'Ungültiger Status.' });
        sets.push('status = ?'); args.push(body.status);
      }
      if (body.forwarded != null) {
        sets.push('forwarded = ?'); args.push(body.forwarded ? 1 : 0);
        // Wird neu weitergeleitet, soll der Designer wieder ein offenes Feedback sehen
        if (body.forwarded) sets.push('designer_done = 0');
      }
      if (body.teamText != null) {
        var tt = String(body.teamText).trim();
        if (tt.length > MAX_TEXT) return res.status(400).json({ error: 'Der Text ist zu lang (höchstens ' + MAX_TEXT + ' Zeichen).' });
        sets.push('team_text = ?'); args.push(tt);
      }
      if (body.designerDone != null) {
        sets.push('designer_done = ?'); args.push(body.designerDone ? 1 : 0);
      }
      if (!sets.length) return res.status(400).json({ error: 'Nichts zu ändern.' });
      sets.push("updated_at = datetime('now')");
      args.push(String(body.id));
      await db.execute({ sql: 'UPDATE feedback SET ' + sets.join(', ') + ' WHERE id = ?', args: args });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt.' });
  } catch (err) {
    return res.status(500).json({ error: 'Database error: ' + err.message });
  }
};
