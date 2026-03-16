var { getClient, migrate } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var db = getClient();
  try { await migrate(); } catch (e) {
    return res.status(500).json({ error: 'Database not available: ' + e.message });
  }

  // GET /api/checks?shareToken=xxx — get checkmarks for a store
  if (req.method === 'GET') {
    var shareToken = req.query.shareToken;
    if (!shareToken) return res.status(400).json({ error: 'Missing shareToken' });

    try {
      var result = await db.execute({
        sql: 'SELECT checks_json FROM stores WHERE share_token = ?',
        args: [shareToken],
      });
      if (result.rows.length === 0) return res.status(404).json({ error: 'Store not found' });
      var raw = result.rows[0].checks_json;
      var checks = {};
      if (raw) {
        try { checks = JSON.parse(raw); } catch (e) { checks = {}; }
      }
      return res.status(200).json({ checks: checks });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/checks — save checkmarks
  if (req.method === 'POST') {
    var body = req.body || {};
    var shareToken = body.shareToken;
    var checks = body.checks;

    if (!shareToken || typeof checks !== 'object') {
      return res.status(400).json({ error: 'Missing shareToken or checks object' });
    }

    try {
      var json = JSON.stringify(checks);
      var result = await db.execute({
        sql: 'UPDATE stores SET checks_json = ? WHERE share_token = ?',
        args: [json, shareToken],
      });
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'Store not found' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
