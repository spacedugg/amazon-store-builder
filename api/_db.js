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
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_stores_share_token ON stores(share_token)`,
    },
  ]);
}

module.exports = { getClient: getClient, migrate: migrate };
