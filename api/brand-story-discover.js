'use strict';
const { discoverStore, validateTargets } = require('./_lib/brand-story-discovery.cjs');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const body = req.body || {};
  try { validateTargets(body.storeUrl, body.pageUrl); }
  catch (error) { return res.status(400).json({ error: error.message }); }
  const result = await discoverStore(body);
  const configured = process.env.BRIGHTDATA_UNLOCKER_TOKEN || process.env.BRIGHT_DATA_API_KEY;
  return res.status(configured ? 200 : 503).json(result);
};
