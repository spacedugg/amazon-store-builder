var { getClient, migrate } = require('./_db');

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var db = getClient();
  try { await migrate(); } catch (e) {
    return res.status(500).json({ error: 'Database not available: ' + e.message });
  }

  // GET /api/wizard-state?id=xxx — load wizard checkpoint state
  if (req.method === 'GET' && req.query.id) {
    try {
      var result = await db.execute({
        sql: 'SELECT id, brand_name, generation_state, generation_step FROM stores WHERE id = ?',
        args: [req.query.id],
      });
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      var row = result.rows[0];
      var state = null;
      try { state = row.generation_state ? JSON.parse(row.generation_state) : null; } catch (e) {}
      return res.status(200).json({
        id: row.id,
        brandName: row.brand_name,
        step: row.generation_step,
        state: state,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/wizard-state — list all stores with active wizard state
  if (req.method === 'GET') {
    try {
      var result = await db.execute(
        'SELECT id, brand_name, generation_step, updated_at FROM stores WHERE generation_step IS NOT NULL ORDER BY updated_at DESC'
      );
      var items = result.rows.map(function(row) {
        return {
          id: row.id,
          brandName: row.brand_name,
          step: row.generation_step,
          updatedAt: row.updated_at,
        };
      });
      return res.status(200).json({ items: items });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/wizard-state — save wizard checkpoint state
  if (req.method === 'POST') {
    try {
      var body = req.body || {};
      var id = body.id || generateId();
      var brandName = body.brandName || '';
      var step = typeof body.step === 'number' ? body.step : 0;
      var state = body.state || {};

      // Upsert: create store row if needed, always update generation state
      await db.execute({
        sql: `INSERT INTO stores (id, brand_name, marketplace, data, generation_state, generation_step, updated_at)
              VALUES (?, ?, 'de', '{}', ?, ?, datetime('now'))
              ON CONFLICT(id) DO UPDATE SET
                brand_name = excluded.brand_name,
                generation_state = excluded.generation_state,
                generation_step = excluded.generation_step,
                updated_at = datetime('now')`,
        args: [id, brandName, JSON.stringify(state), step],
      });

      return res.status(200).json({ id: id, step: step });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
