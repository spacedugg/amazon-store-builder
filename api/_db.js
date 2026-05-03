var { createClient } = require('@libsql/client');

var _client = null;

function getClient() {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

async function migrate() {
  var db = getClient();
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS stores (
        id TEXT PRIMARY KEY,
        brand_name TEXT NOT NULL DEFAULT '',
        marketplace TEXT NOT NULL DEFAULT 'de',
        data TEXT NOT NULL,
        share_token TEXT UNIQUE,
        page_count INTEGER DEFAULT 0,
        product_count INTEGER DEFAULT 0,
        timer_seconds INTEGER DEFAULT 0,
        timer_running INTEGER DEFAULT 0,
        timer_started_at TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_stores_share_token ON stores(share_token)`,
    },
  ]);
  // Reference stores knowledge base table
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS reference_stores (
        id TEXT PRIMARY KEY,
        brand_name TEXT NOT NULL DEFAULT '',
        store_url TEXT NOT NULL,
        marketplace TEXT NOT NULL DEFAULT 'de',
        category TEXT NOT NULL DEFAULT 'generic',
        tags TEXT DEFAULT '',
        page_count INTEGER DEFAULT 0,
        image_count INTEGER DEFAULT 0,
        parsed_data TEXT,
        image_analyses TEXT,
        claude_analysis TEXT,
        quality_score INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_ref_stores_category ON reference_stores(category)`,
    },
  ]);

  // Add timer columns if they don't exist (for existing databases)
  try {
    await db.execute({ sql: `ALTER TABLE stores ADD COLUMN timer_seconds INTEGER DEFAULT 0` });
  } catch (e) { /* column already exists */ }
  try {
    await db.execute({ sql: `ALTER TABLE stores ADD COLUMN timer_running INTEGER DEFAULT 0` });
  } catch (e) { /* column already exists */ }
  try {
    await db.execute({ sql: `ALTER TABLE stores ADD COLUMN timer_started_at TEXT DEFAULT NULL` });
  } catch (e) { /* column already exists */ }
  try {
    await db.execute({ sql: `ALTER TABLE stores ADD COLUMN checks_json TEXT DEFAULT NULL` });
  } catch (e) { /* column already exists */ }
  // Generation wizard checkpoint state — stores the full wizard data at each step
  try {
    await db.execute({ sql: `ALTER TABLE stores ADD COLUMN generation_state TEXT DEFAULT NULL` });
  } catch (e) { /* column already exists */ }
  try {
    await db.execute({ sql: `ALTER TABLE stores ADD COLUMN generation_step INTEGER DEFAULT NULL` });
  } catch (e) { /* column already exists */ }

  // Image Auslagerung: hash basierte Bildablage, damit der Store JSON Body
  // unter dem 4,5 MB Vercel Limit bleibt. data Spalte enthält die Base64
  // Data URL inklusive mime Prefix. Eine Row pro Hash, content addressed,
  // wird zwischen Stores geteilt wenn das Bild bitidentisch ist.
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS store_images (
        hash TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        byte_size INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
    },
  ]);
}

module.exports = { getClient: getClient, migrate: migrate };
