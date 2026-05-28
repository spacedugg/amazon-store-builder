var { getClient, migrate } = require('./_db');

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

  // GET /api/stores — list all stores (without full data)
  if (req.method === 'GET' && !req.query.id && !req.query.shareToken) {
    try {
      var result = await db.execute(
        'SELECT id, brand_name, marketplace, page_count, product_count, share_token, created_at, updated_at FROM stores ORDER BY updated_at DESC'
      );
      var stores = result.rows.map(function(row) {
        return {
          id: row.id,
          brandName: row.brand_name,
          marketplace: row.marketplace,
          pageCount: row.page_count,
          productCount: row.product_count,
          shareToken: row.share_token,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
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
      var id;
      if (brandSlug) {
        id = brandSlug;
        // Alle anderen Rows der selben Brand und die alte zufällige ID
        // einsammeln und entfernen.
        var existing = await db.execute('SELECT id, brand_name, share_token FROM stores');
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
          await db.execute({ sql: 'DELETE FROM stores WHERE id = ?', args: [idsToDelete[di]] });
        }
      } else {
        id = requestedId || generateId();
      }

      await db.execute({
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

      return res.status(200).json({ id: id, shareToken: shareToken });
    } catch (err) {
      return res.status(500).json({ error: err.message });
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
