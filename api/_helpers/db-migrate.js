var { migrate } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await migrate();
    return res.status(200).json({ status: 'ok', message: 'Database migrated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
