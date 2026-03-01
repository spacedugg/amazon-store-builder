var BRIGHT_DATA_TOKEN = process.env.BRIGHT_DATA_API_KEY;
var ANTHROPIC_KEY = process.env.VITE_ANTHROPIC_API_KEY;
var TURSO_URL = process.env.TURSO_DATABASE_URL;
var TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var checks = {
    brightData: BRIGHT_DATA_TOKEN ? 'configured' : 'MISSING',
    anthropic: ANTHROPIC_KEY ? 'configured' : 'MISSING',
    tursoUrl: TURSO_URL ? 'configured' : 'MISSING',
    tursoToken: TURSO_TOKEN ? 'configured' : 'MISSING',
    runtime: 'ok',
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  };

  // Optionally test Turso connection
  if (TURSO_URL && TURSO_TOKEN) {
    try {
      var { getClient } = require('./_db');
      var db = getClient();
      await db.execute('SELECT 1');
      checks.tursoConnection = 'ok';
    } catch (err) {
      checks.tursoConnection = 'error: ' + err.message;
    }
  }

  var allOk = checks.brightData === 'configured'
    && checks.anthropic === 'configured'
    && checks.tursoUrl === 'configured'
    && checks.tursoToken === 'configured';

  return res.status(allOk ? 200 : 500).json({
    status: allOk ? 'healthy' : 'degraded',
    checks: checks,
  });
};
