var { getClient, migrate } = require('./_db');

// Bild Speicher Endpoint, hash basiert. Jede Row ist eine vollständige
// Base64 Data URL inklusive mime Prefix. Der Client hashed clientseitig
// und schickt eine Row pro Bild, damit jeder einzelne POST weit unter
// dem 4,5 MB Vercel Body Limit bleibt.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var db = getClient();
  try {
    await migrate();
  } catch (e) {
    return res.status(500).json({ error: 'Database not available: ' + e.message });
  }

  // GET /api/store-images?hash=xxx — Bild zurückliefern
  if (req.method === 'GET') {
    var hash = (req.query && req.query.hash) || '';
    if (!hash) return res.status(400).json({ error: 'Missing hash' });
    try {
      var result = await db.execute({ sql: 'SELECT data FROM store_images WHERE hash = ?', args: [hash] });
      if (result.rows.length === 0) return res.status(404).json({ error: 'Image not found' });
      return res.status(200).json({ hash: hash, data: result.rows[0].data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/store-images?action=exists — Batch Check welche Hashes schon
  // in der DB liegen. Body: { hashes: ['sha256-xxx', ...] }. Antwort:
  // { exists: { hash1: true, hash2: false, ... } }. Damit kann der Client
  // bei einem Save mit 380 Bildern in einem einzigen Roundtrip pruefen,
  // welche tatsaechlich neu hochgeladen werden muessen, statt 380 mal den
  // einzelnen POST Endpoint zu fragen.
  if (req.method === 'POST' && req.query && req.query.action === 'exists') {
    try {
      var body = req.body || {};
      var hashes = Array.isArray(body.hashes) ? body.hashes : [];
      if (hashes.length === 0) return res.status(200).json({ exists: {} });
      // SQLite IN Clause mit dynamischen Platzhaltern
      var placeholders = hashes.map(function() { return '?'; }).join(',');
      var rows = await db.execute({
        sql: 'SELECT hash FROM store_images WHERE hash IN (' + placeholders + ')',
        args: hashes,
      });
      var existsMap = {};
      hashes.forEach(function(h) { existsMap[h] = false; });
      rows.rows.forEach(function(r) { existsMap[r.hash] = true; });
      return res.status(200).json({ exists: existsMap });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/store-images — Bild hochladen
  // Body: { hash: 'sha256-xxx', data: 'data:image/...;base64,...' }
  // Bei doppeltem Hash wird nicht doppelt geschrieben (content addressed).
  if (req.method === 'POST') {
    try {
      var body = req.body || {};
      var hash = String(body.hash || '').trim();
      var data = String(body.data || '');
      if (!hash) return res.status(400).json({ error: 'Missing hash' });
      if (!data) return res.status(400).json({ error: 'Missing data' });
      if (data.indexOf('data:') !== 0) return res.status(400).json({ error: 'Data must be a data URL' });
      // Sanity Check Body Größe, einzelne Bilder dürfen bis ~4 MB sein.
      if (data.length > 4 * 1024 * 1024) {
        return res.status(413).json({ error: 'Single image exceeds 4 MB. Bitte vor dem Upload skalieren.' });
      }
      // Check ob schon vorhanden
      var existing = await db.execute({ sql: 'SELECT hash FROM store_images WHERE hash = ?', args: [hash] });
      if (existing.rows.length > 0) {
        return res.status(200).json({ hash: hash, deduplicated: true });
      }
      await db.execute({
        sql: 'INSERT INTO store_images (hash, data, byte_size) VALUES (?, ?, ?)',
        args: [hash, data, data.length],
      });
      return res.status(200).json({ hash: hash, deduplicated: false });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
