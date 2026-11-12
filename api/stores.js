var { getClient, migrate } = require('./_db');
var { createHash } = require('node:crypto');

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Slug Logik muss byteidentisch mit src/storage.js#brandToSlug sein,
// damit dieselbe Brand serverseitig und clientseitig denselben Slug ergibt.
function brandToSlug(name) {
  if (!name) return '';
  var s = String(name).toLowerCase();
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  s = s.normalize ? s.normalize('NFKD').replace(/[̀-ͯ]/g, '') : s;
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s;
}

// A confirmation describes the exact stored contents, not just a timestamp.
// A second save in the same second must invalidate a previous confirmation.
async function replacementDetails(db, matches, slug) {
  if (!matches.length) return null;
  var result = await db.execute({
    sql: 'SELECT id, brand_name, data, share_token, updated_at FROM stores WHERE id IN (' + matches.map(function() { return '?'; }).join(',') + ') ORDER BY id',
    args: matches.map(function(row) { return row.id; }),
  });
  var target = result.rows.find(function(row) { return row.id === slug; }) || result.rows[0];
  return {
    id: target.id, brandName: target.brand_name, brandSlug: slug,
    revision: createHash('sha256').update(JSON.stringify(result.rows.map(function(row) {
      return [row.id, row.brand_name, row.data, row.share_token, row.updated_at];
    }))).digest('hex'),
  };
}

function generateShareToken() {
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var token = '';
  for (var i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Browser und Vercel Edge sollen Store Responses nicht cachen. Sonst
  // sieht der Operator nach einem Save oder Slug Wechsel u.U. eine alte
  // 404 Response per If-None-Match Revalidation (HTTP 304) und denkt der
  // Store fehlt, obwohl er längst in der DB liegt.
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var db = getClient();

  // Ensure tables exist
  try {
    await migrate();
  } catch (e) {
    return res.status(500).json({ error: 'Database not available: ' + e.message });
  }

  // Check a new import before the editor or autosave can change the current store.
  if (req.method === 'GET' && req.query.checkBrand !== undefined) {
    try {
      var checkSlug = brandToSlug(req.query.checkBrand);
      var candidates = await db.execute('SELECT id, brand_name FROM stores');
      var matches = candidates.rows.filter(function(row) { return checkSlug && brandToSlug(row.brand_name) === checkSlug; });
      return res.status(200).json({ existingStore: await replacementDetails(db, matches, checkSlug) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/stores — lightweight card metadata. Extract only a handful of
  // homepage image references, never the full store JSON or embedded image data.
  if (req.method === 'GET' && !req.query.id && !req.query.shareToken && !req.query.slug) {
    try {
      var previewColumns = [
        "json_extract(data, '$.pages[0].name') AS homepage_name",
        "json_extract(data, '$.pages[0].headerBanner') AS page_banner",
        "json_extract(data, '$.headerBanner') AS store_banner",
      ];
      for (var section = 0; section < 2; section++) {
        for (var tile = 0; tile < 3; tile++) {
          previewColumns.push("json_extract(data, '$.pages[0].sections[" + section + "].tiles[" + tile + "].uploadedImage') AS preview_" + section + "_" + tile);
        }
      }
      var result = await db.execute(
        'SELECT id, brand_name, marketplace, page_count, product_count, share_token, created_at, updated_at, ' +
        previewColumns.join(', ') + ' FROM stores ORDER BY updated_at DESC'
      );
      var fields = ['page_banner', 'store_banner', 'preview_0_0', 'preview_0_1', 'preview_0_2', 'preview_1_0', 'preview_1_1', 'preview_1_2'];
      var hashes = new Set();
      result.rows.forEach(function(row) {
        fields.forEach(function(key) {
          var value = row[key];
          if (typeof value === 'string' && /^#imgref:sha256:[a-f0-9]{64}$/.test(value)) hashes.add(value.slice(15));
        });
      });
      var imageUrls = new Map();
      var allHashes = Array.from(hashes);
      for (var i = 0; i < allHashes.length; i += 200) {
        var chunk = allHashes.slice(i, i + 200);
        var images = await db.execute({
          sql: 'SELECT hash, blob_url FROM store_images WHERE hash IN (' + chunk.map(function() { return '?'; }).join(',') + ')',
          args: chunk,
        });
        images.rows.forEach(function(row) { if (row.blob_url) imageUrls.set(row.hash, row.blob_url); });
      }
      function previewUrl(value) {
        if (typeof value !== 'string') return null;
        if (/^https:\/\//i.test(value)) return value;
        if (/^#imgref:sha256:[a-f0-9]{64}$/.test(value)) return imageUrls.get(value.slice(15)) || null;
        return null;
      }
      var stores = result.rows.map(function(row) {
        var tileImages = fields.slice(2).map(function(key) { return previewUrl(row[key]); }).filter(Boolean);
        return {
          id: row.id,
          brandName: row.brand_name,
          marketplace: row.marketplace,
          pageCount: row.page_count,
          productCount: row.product_count,
          shareToken: row.share_token,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          preview: {
            pageName: row.homepage_name || 'Home',
            banner: previewUrl(row.page_banner) || previewUrl(row.store_banner),
            tiles: tileImages.slice(0, 3),
          },
        };
      });
      return res.status(200).json({ stores: stores });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/stores?id=xxx — get single store with full data
  if (req.method === 'GET' && req.query.id) {
    try {
      var result = await db.execute({ sql: 'SELECT * FROM stores WHERE id = ?', args: [req.query.id] });
      if (result.rows.length === 0) return res.status(404).json({ error: 'Store not found' });
      var row = result.rows[0];
      return res.status(200).json({
        id: row.id,
        brandName: row.brand_name,
        shareToken: row.share_token,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        data: JSON.parse(row.data),
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/stores?slug=xxx — get store by brand name slug (read-only,
  // für Customer Preview URLs nach dem Schema /<brand-slug>).
  if (req.method === 'GET' && req.query.slug) {
    try {
      var slug = String(req.query.slug || '').trim().toLowerCase();
      if (!slug) return res.status(400).json({ error: 'Empty slug' });
      var listResult = await db.execute('SELECT id, brand_name, updated_at FROM stores ORDER BY updated_at DESC');
      // Exakter Slug Match. Pro Brand existiert idealerweise nur ein Eintrag,
      // ältere Duplikate aus früheren Bugs werden beim nächsten Save derselben
      // Brand automatisch konsolidiert. Falls trotzdem mehrere Rows mit
      // identischem Brand Slug existieren, gewinnt die zuletzt aktualisierte.
      var available = [];
      var match = null;
      for (var i = 0; i < listResult.rows.length; i++) {
        var row = listResult.rows[i];
        var rowSlug = brandToSlug(row.brand_name);
        if (!rowSlug) continue;
        if (available.findIndex(function(a) { return a.slug === rowSlug; }) < 0) {
          available.push({ slug: rowSlug, brandName: row.brand_name });
        }
        if (!match && rowSlug === slug) match = row;
      }
      if (!match) {
        return res.status(404).json({
          error: 'No store found for slug: ' + slug,
          availableSlugs: available.slice(0, 50),
        });
      }
      var fullResult = await db.execute({ sql: 'SELECT * FROM stores WHERE id = ?', args: [match.id] });
      if (fullResult.rows.length === 0) return res.status(404).json({ error: 'Store not found' });
      var row = fullResult.rows[0];
      var parsedData;
      try {
        parsedData = JSON.parse(row.data);
      } catch (parseErr) {
        return res.status(500).json({ error: 'Store data is corrupted and could not be parsed.' });
      }
      if (!parsedData || !parsedData.pages) {
        return res.status(500).json({ error: 'Store data is empty or incomplete.' });
      }
      return res.status(200).json({
        id: row.id,
        brandName: row.brand_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        data: parsedData,
        readOnly: true,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
  }

  // GET /api/stores?shareToken=xxx — get store by share token (read-only, for designers)
  if (req.method === 'GET' && req.query.shareToken) {
    try {
      var token = req.query.shareToken.trim();
      if (!token) return res.status(400).json({ error: 'Empty share token' });
      var result = await db.execute({ sql: 'SELECT * FROM stores WHERE share_token = ?', args: [token] });
      if (result.rows.length === 0) return res.status(404).json({ error: 'Store not found for token: ' + token.slice(0, 4) + '...' });
      var row = result.rows[0];
      var parsedData;
      try {
        parsedData = JSON.parse(row.data);
      } catch (parseErr) {
        return res.status(500).json({ error: 'Store data is corrupted and could not be parsed.' });
      }
      if (!parsedData || !parsedData.pages) {
        return res.status(500).json({ error: 'Store data is empty or incomplete.' });
      }
      return res.status(200).json({
        id: row.id,
        brandName: row.brand_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        data: parsedData,
        readOnly: true,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
  }

  // POST /api/stores — create or update a store
  if (req.method === 'POST') {
    var transaction = null;
    try {
      var body = req.body || {};
      var storeData = body.data;
      if (!storeData) return res.status(400).json({ error: 'Missing data field' });

      var requestedId = body.id || null;
      var brandName = storeData.brandName || '';
      var marketplace = storeData.marketplace || 'de';
      var pageCount = (storeData.pages || []).length;
      var productCount = (storeData.products || []).length;
      var shareToken = body.shareToken || generateShareToken();

      // Wenn ein Brand Name vorliegt ist der Brand Slug die kanonische ID.
      // Damit ist pro Brand garantiert nur ein Eintrag in der Datenbank und
      // ältere Duplikate werden beim Save automatisch konsolidiert.
      var brandSlug = brandToSlug(brandName);
      // Keep the collision check, consolidation and write in one transaction.
      transaction = await db.transaction('write');
      var existing = await transaction.execute('SELECT id, brand_name, share_token FROM stores');
      var sameBrand = existing.rows.filter(function(row) { return brandSlug && brandToSlug(row.brand_name) === brandSlug; });
      if (sameBrand.length && (body.replaceExisting || sameBrand.some(function(row) { return row.id !== requestedId; }))) {
        var details = await replacementDetails(transaction, sameBrand, brandSlug);
        var confirmation = body.replaceExisting;
        if (!confirmation || confirmation.id !== details.id || confirmation.revision !== details.revision) {
          await transaction.rollback();
          return res.status(409).json({
            code: 'STORE_EXISTS', existingStore: details,
            error: 'Ein Store mit dem Namen „' + details.brandName + '“ existiert bereits. Der bestehende Store wurde nicht verändert. Bitte den JSON-Import erneut starten und das Ersetzen ausdrücklich bestätigen.',
          });
        }
      }
      var id;
      if (brandSlug) {
        id = brandSlug;
        // Alle anderen Rows der selben Brand und die alte zufällige ID
        // einsammeln und entfernen.
        var canonical = existing.rows.find(function(row) { return row.id === id; });
        if (canonical && canonical.share_token) shareToken = canonical.share_token;
        var idsToDelete = [];
        var carriedShareToken = null;
        existing.rows.forEach(function(r) {
          if (r.id === id) return;
          var rowSlug = brandToSlug(r.brand_name);
          var isDupe = rowSlug === brandSlug;
          var isCurrentRequest = requestedId && r.id === requestedId;
          if (isDupe || isCurrentRequest) {
            idsToDelete.push(r.id);
            // Wenn die Quelle einen shareToken hatte und der Body keinen
            // expliziten mitgeschickt hat, halten wir den bestehenden Token
            // fest, damit Designer Share Links nicht ungewollt brechen.
            if (!body.shareToken && !carriedShareToken && r.share_token) {
              carriedShareToken = r.share_token;
            }
          }
        });
        if (carriedShareToken) shareToken = carriedShareToken;
        for (var di = 0; di < idsToDelete.length; di++) {
          await transaction.execute({ sql: 'DELETE FROM stores WHERE id = ?', args: [idsToDelete[di]] });
        }
      } else {
        id = requestedId || generateId();
      }

      await transaction.execute({
        sql: `INSERT INTO stores (id, brand_name, marketplace, data, share_token, page_count, product_count, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(id) DO UPDATE SET
                brand_name = excluded.brand_name,
                marketplace = excluded.marketplace,
                data = excluded.data,
                page_count = excluded.page_count,
                product_count = excluded.product_count,
                updated_at = datetime('now')`,
        args: [id, brandName, marketplace, JSON.stringify(storeData), shareToken, pageCount, productCount],
      });

      await transaction.commit();
      return res.status(200).json({ id: id, shareToken: shareToken });
    } catch (err) {
      if (transaction && !transaction.closed) await transaction.rollback();
      return res.status(500).json({ error: err.message });
    } finally {
      if (transaction) transaction.close();
    }
  }

  // DELETE /api/stores?id=xxx — delete a store
  if (req.method === 'DELETE') {
    var id = req.query.id || (req.body && req.body.id);
    if (!id) return res.status(400).json({ error: 'Missing id' });
    try {
      await db.execute({ sql: 'DELETE FROM stores WHERE id = ?', args: [id] });
      return res.status(200).json({ deleted: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

