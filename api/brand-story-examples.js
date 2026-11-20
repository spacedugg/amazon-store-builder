const { getClient } = require('./_db');
const { randomUUID } = require('node:crypto');
let ready;
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const db = getClient();
    if (!ready) ready = db.execute(`CREATE TABLE IF NOT EXISTS brand_story_examples (
      id TEXT PRIMARY KEY, data TEXT NOT NULL, purpose TEXT NOT NULL DEFAULT '',
      revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).catch(error => { ready = null; throw error; });
    await ready;
    if (req.method === 'GET') {
      const result = await db.execute('SELECT * FROM brand_story_examples ORDER BY updated_at DESC, id');
      return res.json({ examples: result.rows.map(row => ({ id: row.id, data: JSON.parse(row.data), purpose: row.purpose, revision: Number(row.revision) })) });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Methode nicht erlaubt.' });
    const body = req.body || {};
    if (JSON.stringify(body).length > 2e6) throw Error('Beispiel zu groß.');
    if (typeof body.purpose !== 'string' || body.purpose.length > 2000) throw Error('Beschreibung ungültig.');
    const { exampleData } = await import('../src/brandStoryExamples.mjs');
    const data = JSON.stringify(exampleData(body.data));
    if (body.id) {
      if (typeof body.id !== 'string' || !Number.isInteger(body.revision)) throw Error('Beispiel und Versionsnummer erforderlich.');
      const result = await db.execute({ sql: 'UPDATE brand_story_examples SET data=?,purpose=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=?', args: [data, body.purpose.trim(), body.id, body.revision] });
      if (!result.rowsAffected) return res.status(409).json({ error: 'Das Beispiel wurde inzwischen geändert. Bitte neu laden.' });
      return res.json({ id: body.id, revision: body.revision + 1 });
    }
    const id = randomUUID();
    await db.execute({ sql: 'INSERT INTO brand_story_examples(id,data,purpose) VALUES(?,?,?)', args: [id, data, body.purpose.trim()] });
    return res.json({ id, revision: 1 });
  } catch (error) { return res.status(400).json({ error: error.message }); }
};
