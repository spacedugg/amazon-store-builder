// API Endpoint der das aktuelle True Nature Store Briefing JSON liefert.
// Aufruf: GET https://amazon-store-builder.vercel.app/api/true-nature-store

var { readFileSync } = require('fs');
var { join } = require('path');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    var path = join(process.cwd(), 'seed', 'true-nature-store.json');
    var data = readFileSync(path, 'utf8');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).send(data);
  } catch (e) {
    return res.status(500).json({ error: 'JSON nicht ladbar', detail: e.message });
  }
};
