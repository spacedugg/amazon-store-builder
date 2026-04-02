var { getClient, migrate } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var db = getClient();
  try {
    await migrate();
  } catch (e) {
    return res.status(500).json({ error: 'Database not available: ' + e.message });
  }

  var body = req.body || {};
  var shareToken = body.shareToken;
  if (!shareToken) return res.status(400).json({ error: 'Missing shareToken' });

  try {
    await db.execute({
      sql: "UPDATE stores SET changes_acknowledged_at = datetime('now') WHERE share_token = ?",
      args: [shareToken],
    });
    return res.status(200).json({ acknowledged: true, at: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
