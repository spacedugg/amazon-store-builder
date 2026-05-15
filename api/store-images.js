var { getClient, migrate } = require('./_db');

// Bild Speicher Endpoint, hash basiert. Bevorzugter Pfad fuer neue Bilder
// ist der Vercel Blob Upload via /api/blob-upload (kein 4,5 MB Limit, kein
// Hop ueber unsere Serverless Function fuer die eigentlichen Bytes).
// Diese Datei haelt drei Use Cases am Leben:
// 1. GET ?hash=xxx liefert entweder die Blob URL oder die Legacy Base64
//    Data URL zurueck, je nachdem welcher Modus fuer das Bild verwendet
//    wurde.
// 2. POST ?action=exists batched einen Hash Vorhandenheits Check, damit
//    der Client beim Save direkt weiss, welche Bilder schon in der DB
//    liegen und nicht erneut hochgeladen werden muessen.
// 3. POST ?action=register schreibt eine Hash zu Blob URL Zuordnung,
//    fuer den Fall dass der asynchrone onUploadCompleted Callback im
//    Blob Endpoint nicht durchgeht (Local Dev, Netzwerkprobleme). Der
//    Client meldet die Blob URL direkt nach erfolgreichem Upload an.
// 4. Legacy POST { hash, data } speichert ein Base64 Bild direkt in der
//    DB, max 4 MB. Wird nur noch als Fallback genutzt, neue Bilder gehen
//    immer ueber Blob.

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

  // GET /api/store-images?hash=xxx — Bild URL oder Bilddaten zurueckliefern.
  // Bevorzugt die Blob URL, faellt auf Base64 Data URL zurueck wenn nur
  // Legacy data vorhanden ist.
  if (req.method === 'GET') {
    var hash = (req.query && req.query.hash) || '';
    if (!hash) return res.status(400).json({ error: 'Missing hash' });
    try {
      var result = await db.execute({ sql: 'SELECT data, blob_url FROM store_images WHERE hash = ?', args: [hash] });
      if (result.rows.length === 0) return res.status(404).json({ error: 'Image not found' });
      var row = result.rows[0];
      if (row.blob_url) {
        return res.status(200).json({ hash: hash, url: row.blob_url });
      }
      if (row.data) {
        return res.status(200).json({ hash: hash, data: row.data });
      }
      return res.status(404).json({ error: 'Image entry has neither blob_url nor data' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/store-images?action=exists — Batch Check welche Hashes schon
  // in der DB liegen. Body: { hashes: ['sha256-xxx', ...] }. Antwort:
  // { exists: { hash1: true, hash2: false, ... } }. Damit kann der Client
  // bei einem Save mit 380 Bildern in einem einzigen Roundtrip pruefen,
  // welche tatsaechlich neu hochgeladen werden muessen.
  if (req.method === 'POST' && req.query && req.query.action === 'exists') {
    try {
      var body = req.body || {};
      var hashes = Array.isArray(body.hashes) ? body.hashes : [];
      if (hashes.length === 0) return res.status(200).json({ exists: {} });
      // Ein Hash gilt als existent, wenn er entweder eine blob_url oder
      // einen non leeren data Wert hat. Wir filtern leere Rows raus, damit
      // der Client unfertige Eintraege erneut hochladen kann.
      var placeholders = hashes.map(function() { return '?'; }).join(',');
      var rows = await db.execute({
        sql: 'SELECT hash FROM store_images WHERE hash IN (' + placeholders + ') AND (blob_url IS NOT NULL OR (data IS NOT NULL AND data != ""))',
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

  // POST /api/store-images?action=register — Hash zu Blob URL Zuordnung
  // explizit speichern. Aufgerufen vom Client nach erfolgreichem Vercel
  // Blob Upload, als robuste Variante zum onUploadCompleted Callback.
  // Body: { hash, blob_url, byte_size? }
  if (req.method === 'POST' && req.query && req.query.action === 'register') {
    try {
      var body = req.body || {};
      var hash = String(body.hash || '').trim();
      var blobUrl = String(body.blob_url || '').trim();
      var byteSize = Number(body.byte_size || 0);
      if (!hash) return res.status(400).json({ error: 'Missing hash' });
      if (!blobUrl) return res.status(400).json({ error: 'Missing blob_url' });
      await db.execute({
        sql: 'INSERT INTO store_images (hash, data, blob_url, byte_size) VALUES (?, ?, ?, ?) ' +
             'ON CONFLICT(hash) DO UPDATE SET blob_url = excluded.blob_url, byte_size = excluded.byte_size',
        args: [hash, '', blobUrl, byteSize],
      });
      return res.status(200).json({ hash: hash, registered: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/store-images — Legacy Bild Upload als Base64 in die DB.
  // Body: { hash: 'sha256-xxx', data: 'data:image/...;base64,...' }
  // Bei doppeltem Hash wird nicht doppelt geschrieben (content addressed).
  // Wird nur noch als Fallback verwendet, wenn der Blob Upload nicht
  // funktioniert. Limit weiterhin 4 MB pro Bild durch Vercel Body Limit.
  if (req.method === 'POST') {
    try {
      var body = req.body || {};
      var hash = String(body.hash || '').trim();
      var data = String(body.data || '');
      if (!hash) return res.status(400).json({ error: 'Missing hash' });
      if (!data) return res.status(400).json({ error: 'Missing data' });
      if (data.indexOf('data:') !== 0) return res.status(400).json({ error: 'Data must be a data URL' });
      if (data.length > 4 * 1024 * 1024) {
        return res.status(413).json({ error: 'Single image exceeds 4 MB. Bitte Vercel Blob Upload nutzen.' });
      }
      var existing = await db.execute({ sql: 'SELECT hash, blob_url, data FROM store_images WHERE hash = ?', args: [hash] });
      if (existing.rows.length > 0 && (existing.rows[0].blob_url || existing.rows[0].data)) {
        return res.status(200).json({ hash: hash, deduplicated: true });
      }
      await db.execute({
        sql: 'INSERT INTO store_images (hash, data, byte_size) VALUES (?, ?, ?) ' +
             'ON CONFLICT(hash) DO UPDATE SET data = excluded.data, byte_size = excluded.byte_size',
        args: [hash, data, data.length],
      });
      return res.status(200).json({ hash: hash, deduplicated: false });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
