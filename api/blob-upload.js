var { handleUpload } = require('@vercel/blob/client');
var { getClient, migrate } = require('./_db');

// Vercel Blob Upload Token Endpoint. Der Client ruft @vercel/blob client
// upload() mit dieser URL als handleUploadUrl auf. Wir geben einen kurz
// gueltigen signierten Token zurueck, mit dem der Browser dann DIREKT
// gegen die Vercel Blob Infrastruktur uploaded, ohne durch unsere
// Serverless Function zu gehen. Damit umgehen wir das 4,5 MB Request
// Body Limit von Vercel komplett, beliebig grosse Originalbilder sind
// moeglich.
//
// onUploadCompleted wird von der Vercel Blob Infrastruktur asynchron auf
// uns zurueck gerufen, sobald der Browser Upload fertig ist. Dort
// schreiben wir die Hash zu Blob URL Zuordnung in unsere store_images
// Tabelle, damit beim Laden eines Stores der Hash auf die Blob URL
// aufgeloest werden kann.
//
// Voraussetzung: BLOB_READ_WRITE_TOKEN Env Variable muss im Vercel
// Projekt gesetzt sein (passiert automatisch wenn ein Blob Store ueber
// das Vercel Dashboard angelegt wird).

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN nicht gesetzt. Bitte Blob Store im Vercel Dashboard anlegen.' });
  }

  try {
    var body = req.body;
    var jsonResponse = await handleUpload({
      body: body,
      request: req,
      // Token Generation Pre Check
      onBeforeGenerateToken: async function(pathname, clientPayload) {
        // clientPayload enthaelt JSON.stringify({ hash, contentType })
        var payload = {};
        try { payload = clientPayload ? JSON.parse(clientPayload) : {}; } catch (e) { /* ignore */ }
        return {
          allowedContentTypes: [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
            'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml',
          ],
          // Pro Bild eine separate Random Suffix Pathname, damit es keine
          // Kollisionen beim parallelen Upload gleicher Hashes gibt. Wir
          // brauchen den Pfad nicht selber, der Hash kommt ueber den
          // tokenPayload zurueck.
          addRandomSuffix: true,
          tokenPayload: JSON.stringify(payload),
        };
      },
      // Asynchroner Callback nach erfolgreichem Browser Upload. Wir
      // schreiben die Hash zu URL Zuordnung in die DB.
      onUploadCompleted: async function(args) {
        var blob = args.blob || {};
        var tokenPayload = args.tokenPayload || '{}';
        var payload = {};
        try { payload = JSON.parse(tokenPayload); } catch (e) { /* ignore */ }
        if (!payload.hash || !blob.url) return;
        try {
          await migrate();
          var db = getClient();
          // UPSERT: wenn Hash bereits existiert, blob_url updaten
          await db.execute({
            sql: 'INSERT INTO store_images (hash, data, blob_url, byte_size) VALUES (?, ?, ?, ?) ' +
                 'ON CONFLICT(hash) DO UPDATE SET blob_url = excluded.blob_url, byte_size = excluded.byte_size',
            args: [payload.hash, '', blob.url, blob.size || 0],
          });
        } catch (err) {
          // Wenn DB Schreibvorgang scheitert, ist das Bild trotzdem in
          // Blob abgelegt. Der Client wird die Registrierung nochmal
          // ueber den fallback /api/store-images?action=register POST
          // versuchen.
          console.warn('Blob upload completed but DB write failed:', err.message);
        }
      },
    });
    return res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('Blob upload handler error:', err);
    return res.status(400).json({ error: err.message });
  }
};
