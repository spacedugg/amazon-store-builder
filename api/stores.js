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
      // Stufe 1: exakter Slug Match. Stufe 2: requestSlug ist Prefix eines
      // existierenden Slugs (z.B. /true-nature matched True Naturals).
      // Stufe 3: requestSlug enthält oder wird enthalten vom Brand Slug
      // (lockere Übereinstimmung). Damit findet der Operator auch dann den
      // Store, wenn der genaue Name nicht im Kopf ist.
      var available = [];
      var exact = null;
      var prefix = null;
      var loose = null;
      for (var i = 0; i < listResult.rows.length; i++) {
        var row = listResult.rows[i];
        var rowSlug = brandToSlug(row.brand_name);
        if (!rowSlug) continue;
        available.push({ slug: rowSlug, brandName: row.brand_name });
        if (!exact && rowSlug === slug) exact = row;
        if (!prefix && rowSlug.indexOf(slug) === 0) prefix = row;
        if (!loose && (rowSlug.indexOf(slug) >= 0 || slug.indexOf(rowSlug) >= 0)) loose = row;
      }
      var match = exact || prefix || loose;
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

      var id = body.id || generateId();
      var brandName = storeData.brandName || '';
      var marketplace = storeData.marketplace || 'de';
      var pageCount = (storeData.pages || []).length;
      var productCount = (storeData.products || []).length;
      var shareToken = body.shareToken || generateShareToken();

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
