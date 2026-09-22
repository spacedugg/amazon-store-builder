var postgres = require('postgres');

/**
 * Datenbank-Anbindung: Supabase (Postgres).
 *
 * Vorher lag dieses Tool auf Turso (libSQL/SQLite). Die Turso-Datenbank ist
 * abgelaufen bzw. nicht mehr erreichbar, darum funktionierten zuletzt weder
 * die Designer-Freigabe-Links noch die Kunden-Vorschau-Links: beide werden
 * aus der `stores`-Tabelle gelesen, die niemand mehr beantwortet hat.
 *
 * Der Store Builder bekommt jetzt ein EIGENES Supabase-Projekt
 * ("Brandstore-Bilder", verknüpft über Vercel), getrennt von den
 * Supabase-Projekten des Sales Boards und des Sales Rooms.
 *
 * Namensliste mehrerer möglicher Variablen aus demselben Grund wie beim
 * Sales Room: Vercel/Supabase-Integrationen setzen je nach Variante mal
 * POSTGRES_URL, mal einen anderen Namen. Wer hier rät, sucht den Fehler
 * später an der falschen Stelle.
 */
var VERBINDUNGS_VARIABLEN = ['DATABASE_URL', 'POSTGRES_URL', 'SUPABASE_DB_URL', 'STORAGE_URL'];

function connectionUrl() {
  for (var i = 0; i < VERBINDUNGS_VARIABLEN.length; i++) {
    var v = process.env[VERBINDUNGS_VARIABLEN[i]];
    if (v && v.trim()) return v.trim();
  }
  return '';
}

var _sql = null;

/**
 * Baut den Verbindungs-Client einmal auf (Vercel hält Serverless-Function-
 * Instanzen zwischen Aufrufen warm, ein neuer Client pro Request wäre teuer).
 */
function rawClient() {
  if (_sql) return _sql;
  var url = connectionUrl();
  if (!url) {
    throw new Error(
      'Keine Datenbank-Verbindung konfiguriert. Bitte DATABASE_URL (oder POSTGRES_URL) ' +
      'im Vercel-Projekt setzen — die Connection-String des verknuepften Supabase-Projekts.'
    );
  }
  var options = {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 8,
    // migrate() laeuft bei jedem Request und nutzt "CREATE TABLE IF NOT
    // EXISTS" / "ADD COLUMN IF NOT EXISTS" — Postgres meldet dafuer bei
    // jedem Treffer eine harmlose NOTICE ("already exists, skipping"), die
    // sonst bei jedem einzelnen Request in den Vercel-Logs auftauchen wuerde.
    onnotice: function() {},
  };
  // Supabases Transaction-Pooler (Supavisor, Port 6543) kennt den
  // Startup-Parameter "options" nicht und legt sonst kommentarlos auf.
  try {
    var parsed = new URL(url);
    if (!(parsed.hostname.indexOf('pooler.') !== -1 && parsed.port === '6543')) {
      options.connection = { options: '-c search_path=public' };
    }
  } catch (e) { /* ungueltige URL: postgres() wirft weiter unten einen klaren Fehler */ }
  _sql = postgres(url, options);
  return _sql;
}

/**
 * `?`-Platzhalter (libsql-Stil, wie sie in den API-Dateien stehen) in
 * Postgres' `$1, $2, ...`-Stil uebersetzen. In diesem Repo taucht `?`
 * ausschliesslich als Bind-Platzhalter auf, nie als Literal in einem
 * String, darum reicht ein einfacher sequentieller Ersatz.
 */
function toPositional(sql) {
  var i = 0;
  return sql.replace(/\?/g, function() {
    i += 1;
    return '$' + i;
  });
}

/**
 * Kompatibilitäts-Wrapper im libsql-Stil (`execute`/`batch`), damit die
 * aufrufenden api/*.js-Dateien unveraendert bleiben koennen.
 */
function wrapClient(sql) {
  return {
    execute: async function(query) {
      var text = typeof query === 'string' ? query : query.sql;
      var args = typeof query === 'string' ? [] : (query.args || []);
      var rows = await sql.unsafe(toPositional(text), args);
      return { rows: rows };
    },
    batch: async function(statements) {
      return sql.begin(async function(tx) {
        var results = [];
        for (var i = 0; i < statements.length; i++) {
          var st = statements[i];
          var text = typeof st === 'string' ? st : st.sql;
          var args = typeof st === 'string' ? [] : (st.args || []);
          results.push(await tx.unsafe(toPositional(text), args));
        }
        return results;
      });
    },
  };
}

function getClient() {
  return wrapClient(rawClient());
}

async function migrate() {
  var sql = rawClient();

  await sql.unsafe(
    'CREATE TABLE IF NOT EXISTS stores (' +
    "  id TEXT PRIMARY KEY," +
    "  brand_name TEXT NOT NULL DEFAULT ''," +
    "  marketplace TEXT NOT NULL DEFAULT 'de'," +
    '  data TEXT NOT NULL,' +
    '  share_token TEXT UNIQUE,' +
    '  page_count INTEGER DEFAULT 0,' +
    '  product_count INTEGER DEFAULT 0,' +
    '  timer_seconds INTEGER DEFAULT 0,' +
    '  timer_running INTEGER DEFAULT 0,' +
    '  timer_started_at TEXT DEFAULT NULL,' +
    '  checks_json TEXT DEFAULT NULL,' +
    '  generation_state TEXT DEFAULT NULL,' +
    '  generation_step INTEGER DEFAULT NULL,' +
    '  created_at TIMESTAMPTZ DEFAULT now(),' +
    '  updated_at TIMESTAMPTZ DEFAULT now()' +
    ')'
  );
  await sql.unsafe('CREATE INDEX IF NOT EXISTS idx_stores_share_token ON stores(share_token)');

  await sql.unsafe(
    'CREATE TABLE IF NOT EXISTS reference_stores (' +
    '  id TEXT PRIMARY KEY,' +
    "  brand_name TEXT NOT NULL DEFAULT ''," +
    '  store_url TEXT NOT NULL,' +
    "  marketplace TEXT NOT NULL DEFAULT 'de'," +
    "  category TEXT NOT NULL DEFAULT 'generic'," +
    "  tags TEXT DEFAULT ''," +
    '  page_count INTEGER DEFAULT 0,' +
    '  image_count INTEGER DEFAULT 0,' +
    '  parsed_data TEXT,' +
    '  image_analyses TEXT,' +
    '  claude_analysis TEXT,' +
    '  quality_score INTEGER DEFAULT 0,' +
    '  created_at TIMESTAMPTZ DEFAULT now(),' +
    '  updated_at TIMESTAMPTZ DEFAULT now()' +
    ')'
  );
  await sql.unsafe('CREATE INDEX IF NOT EXISTS idx_ref_stores_category ON reference_stores(category)');

  // Fuer Datenbanken, die frueher (vor dieser Postgres-Migration) schon
  // einmal angelegt wurden: fehlende Spalten nachziehen. Postgres kennt
  // "ADD COLUMN IF NOT EXISTS" nativ, anders als SQLite braucht es dafuer
  // kein try/catch pro Spalte.
  await sql.unsafe('ALTER TABLE stores ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0');
  await sql.unsafe('ALTER TABLE stores ADD COLUMN IF NOT EXISTS timer_running INTEGER DEFAULT 0');
  await sql.unsafe('ALTER TABLE stores ADD COLUMN IF NOT EXISTS timer_started_at TEXT DEFAULT NULL');
  await sql.unsafe('ALTER TABLE stores ADD COLUMN IF NOT EXISTS checks_json TEXT DEFAULT NULL');
  await sql.unsafe('ALTER TABLE stores ADD COLUMN IF NOT EXISTS generation_state TEXT DEFAULT NULL');
  await sql.unsafe('ALTER TABLE stores ADD COLUMN IF NOT EXISTS generation_step INTEGER DEFAULT NULL');

  // Bild-Auslagerung: hash-basierte Bildablage, damit der Store-JSON-Body
  // unter dem 4,5-MB-Vercel-Limit bleibt. `data` enthaelt die Base64-Data-URL
  // inklusive Mime-Prefix (Legacy). Neue Eintraege benutzen `blob_url`, dann
  // liegt das Bild physisch im Vercel-Blob-Store und wird beim Laden direkt
  // von dort gefetched. Eine Row pro Hash, content-addressed, wird zwischen
  // Stores geteilt wenn das Bild bitidentisch ist.
  await sql.unsafe(
    'CREATE TABLE IF NOT EXISTS store_images (' +
    '  hash TEXT PRIMARY KEY,' +
    "  data TEXT NOT NULL DEFAULT ''," +
    '  blob_url TEXT DEFAULT NULL,' +
    '  byte_size INTEGER DEFAULT 0,' +
    '  created_at TIMESTAMPTZ DEFAULT now()' +
    ')'
  );
  await sql.unsafe('ALTER TABLE store_images ADD COLUMN IF NOT EXISTS blob_url TEXT DEFAULT NULL');

  // Translation-Cache: Designer-Briefing-Felder werden beim Anzeigen im
  // Share-View on the fly ins Englische uebersetzt. Cache ist content-
  // addressed ueber (sourceHash, targetLang), damit derselbe Source-Text in
  // einer Sprache nur einmal uebersetzt wird, egal ob er in mehreren Stores
  // oder Tiles vorkommt.
  await sql.unsafe(
    'CREATE TABLE IF NOT EXISTS translations (' +
    '  source_hash TEXT NOT NULL,' +
    '  target_lang TEXT NOT NULL,' +
    '  source_text TEXT NOT NULL,' +
    '  translated_text TEXT NOT NULL,' +
    '  created_at TIMESTAMPTZ DEFAULT now(),' +
    '  PRIMARY KEY (source_hash, target_lang)' +
    ')'
  );
}

module.exports = { getClient: getClient, migrate: migrate };
