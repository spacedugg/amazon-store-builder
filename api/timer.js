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

  // GET /api/timer?shareToken=xxx — get timer state for a store
  if (req.method === 'GET') {
    var shareToken = req.query.shareToken;
    if (!shareToken) return res.status(400).json({ error: 'Missing shareToken' });

    try {
      var result = await db.execute({
        sql: 'SELECT timer_seconds, timer_running, timer_started_at FROM stores WHERE share_token = ?',
        args: [shareToken],
      });
      if (result.rows.length === 0) return res.status(404).json({ error: 'Store not found' });
      var row = result.rows[0];
      var seconds = row.timer_seconds || 0;
      var running = row.timer_running === 1;
      var startedAt = row.timer_started_at || null;

      // If timer is running, add elapsed time since timer_started_at
      if (running && startedAt) {
        var elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
        if (elapsed > 0) seconds += elapsed;
      }

      return res.status(200).json({ seconds: seconds, running: running });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/timer — update timer state
  if (req.method === 'POST') {
    var body = req.body || {};
    var shareToken = body.shareToken;
    var action = body.action; // 'start' or 'stop'

    if (!shareToken || !action) return res.status(400).json({ error: 'Missing shareToken or action' });

    try {
      // First get current state
      var result = await db.execute({
        sql: 'SELECT timer_seconds, timer_running, timer_started_at FROM stores WHERE share_token = ?',
        args: [shareToken],
      });
      if (result.rows.length === 0) return res.status(404).json({ error: 'Store not found' });
      var row = result.rows[0];
      var currentSeconds = row.timer_seconds || 0;
      var wasRunning = row.timer_running === 1;
      var startedAt = row.timer_started_at || null;

      if (action === 'start') {
        if (wasRunning) {
          // Already running — return current state
          var elapsed = 0;
          if (startedAt) {
            elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
            if (elapsed < 0) elapsed = 0;
          }
          return res.status(200).json({ seconds: currentSeconds + elapsed, running: true });
        }
        // Start: set timer_running=1, timer_started_at=now
        var now = new Date().toISOString();
        await db.execute({
          sql: 'UPDATE stores SET timer_running = 1, timer_started_at = ? WHERE share_token = ?',
          args: [now, shareToken],
        });
        return res.status(200).json({ seconds: currentSeconds, running: true });
      }

      if (action === 'stop') {
        if (!wasRunning) {
          // Already stopped
          return res.status(200).json({ seconds: currentSeconds, running: false });
        }
        // Stop: accumulate elapsed time into timer_seconds, clear timer_started_at
        var elapsed = 0;
        if (startedAt) {
          elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
          if (elapsed < 0) elapsed = 0;
        }
        var newSeconds = currentSeconds + elapsed;
        await db.execute({
          sql: 'UPDATE stores SET timer_seconds = ?, timer_running = 0, timer_started_at = NULL WHERE share_token = ?',
          args: [newSeconds, shareToken],
        });
        return res.status(200).json({ seconds: newSeconds, running: false });
      }

      return res.status(400).json({ error: 'Invalid action. Use "start" or "stop".' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
