var BRIGHT_DATA_TOKEN = process.env.BRIGHT_DATA_API_KEY;
var ANTHROPIC_KEY = process.env.VITE_ANTHROPIC_API_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var checks = {
    brightData: BRIGHT_DATA_TOKEN ? 'configured' : 'MISSING',
    anthropic: ANTHROPIC_KEY ? 'configured' : 'MISSING',
    runtime: 'ok',
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  };

  var allOk = checks.brightData === 'configured' && checks.anthropic === 'configured';

  return res.status(allOk ? 200 : 500).json({
    status: allOk ? 'healthy' : 'degraded',
    checks: checks,
  });
};
