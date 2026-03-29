var { getClient, migrate } = require('./_db');

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var db = getClient();
  try { await migrate(); } catch (e) {
    return res.status(500).json({ error: 'Database not available: ' + e.message });
  }

  // GET /api/reference-stores — list all (optionally filter by category)
  if (req.method === 'GET' && !req.query.id) {
    try {
      var category = req.query.category;
      var sql = 'SELECT id, brand_name, store_url, marketplace, category, tags, page_count, image_count, quality_score, created_at, updated_at FROM reference_stores';
      var args = [];
      if (category && category !== 'all') {
        sql += ' WHERE category = ?';
        args.push(category);
      }
      sql += ' ORDER BY quality_score DESC, updated_at DESC';

      var result = await db.execute({ sql: sql, args: args });
      var stores = result.rows.map(function(row) {
        return {
          id: row.id,
          brandName: row.brand_name,
          storeUrl: row.store_url,
          marketplace: row.marketplace,
          category: row.category,
          tags: row.tags ? row.tags.split(',') : [],
          pageCount: row.page_count,
          imageCount: row.image_count,
          qualityScore: row.quality_score,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });
      return res.status(200).json({ stores: stores, count: stores.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/reference-stores?id=xxx — get single store with full data
  if (req.method === 'GET' && req.query.id) {
    try {
      var result = await db.execute({ sql: 'SELECT * FROM reference_stores WHERE id = ?', args: [req.query.id] });
      if (result.rows.length === 0) return res.status(404).json({ error: 'Reference store not found' });
      var row = result.rows[0];
      return res.status(200).json({
        id: row.id,
        brandName: row.brand_name,
        storeUrl: row.store_url,
        marketplace: row.marketplace,
        category: row.category,
        tags: row.tags ? row.tags.split(',') : [],
        pageCount: row.page_count,
        imageCount: row.image_count,
        qualityScore: row.quality_score,
        parsedData: row.parsed_data ? JSON.parse(row.parsed_data) : null,
        imageAnalyses: row.image_analyses ? JSON.parse(row.image_analyses) : null,
        claudeAnalysis: row.claude_analysis ? JSON.parse(row.claude_analysis) : null,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/reference-stores?forCategory=xxx — get analysis data for a category (used during generation)
  if (req.method === 'GET' && req.query.forCategory) {
    try {
      var cat = req.query.forCategory;
      // Get stores matching the category, plus generic ones as fallback
      var result = await db.execute({
        sql: 'SELECT claude_analysis, brand_name, category FROM reference_stores WHERE (category = ? OR category = ?) AND claude_analysis IS NOT NULL ORDER BY quality_score DESC LIMIT 5',
        args: [cat, 'generic'],
      });
      var analyses = result.rows.map(function(row) {
        return {
          brandName: row.brand_name,
          category: row.category,
          analysis: row.claude_analysis ? JSON.parse(row.claude_analysis) : null,
        };
      });
      return res.status(200).json({ analyses: analyses, count: analyses.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/reference-stores — save a new reference store
  if (req.method === 'POST') {
    try {
      var body = req.body || {};
      if (!body.brandName || !body.storeUrl) {
        return res.status(400).json({ error: 'Missing brandName or storeUrl' });
      }

      var id = body.id || generateId();
      var tags = Array.isArray(body.tags) ? body.tags.join(',') : (body.tags || '');

      await db.execute({
        sql: `INSERT INTO reference_stores (id, brand_name, store_url, marketplace, category, tags, page_count, image_count, parsed_data, image_analyses, claude_analysis, quality_score, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(id) DO UPDATE SET
                brand_name = excluded.brand_name,
                store_url = excluded.store_url,
                marketplace = excluded.marketplace,
                category = excluded.category,
                tags = excluded.tags,
                page_count = excluded.page_count,
                image_count = excluded.image_count,
                parsed_data = excluded.parsed_data,
                image_analyses = excluded.image_analyses,
                claude_analysis = excluded.claude_analysis,
                quality_score = excluded.quality_score,
                updated_at = datetime('now')`,
        args: [
          id,
          body.brandName,
          body.storeUrl,
          body.marketplace || 'de',
          body.category || 'generic',
          tags,
          body.pageCount || 0,
          body.imageCount || 0,
          body.parsedData ? JSON.stringify(body.parsedData) : null,
          body.imageAnalyses ? JSON.stringify(body.imageAnalyses) : null,
          body.claudeAnalysis ? JSON.stringify(body.claudeAnalysis) : null,
          body.qualityScore || 0,
        ],
      });

      return res.status(200).json({ id: id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/reference-stores?id=xxx
  if (req.method === 'DELETE') {
    var id = req.query.id || (req.body && req.body.id);
    if (!id) return res.status(400).json({ error: 'Missing id' });
    try {
      await db.execute({ sql: 'DELETE FROM reference_stores WHERE id = ?', args: [id] });
      return res.status(200).json({ deleted: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
