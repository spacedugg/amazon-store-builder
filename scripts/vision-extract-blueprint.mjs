// Vision-Extraktion v3: ruft die Anthropic-API mit claude-sonnet-4-6 auf,
// liefert Phase-2-Blueprints gemaess docs/BLUEPRINT_EXTRACTION_PROMPT.md.
//
// Input pro Seite:
//   data/store-knowledge/rerun-v3/<store>/raw-dom/<slug>_dom.json
//   data/store-knowledge/rerun-v3/<store>/screenshots/<slug>.png
//      oder segmentiert:
//      data/store-knowledge/rerun-v3/<store>/screenshots-segmented/<slug>_part-N.png
//   Seiten-Meta (pageUrl, pageName, pageId, pageType, pageLevel) wird mitgegeben.
//
// Output:
//   data/store-knowledge/rerun-v3/<store>/blueprints/<slug>.json
//
// Env (Prioritaet, erste vorhandene wird genutzt):
//   A) VISION_PROXY_URL  -> Vercel-Proxy api/vision-extract (empfohlen, keine Keys in Sandbox)
//      Optional: VISION_PROXY_TOKEN wird als Header x-vision-proxy-token gesendet
//   B) VITE_ANTHROPIC_API_KEY oder ANTHROPIC_API_KEY -> direkter Anthropic-Call
//   VITE_ANTHROPIC_MODEL (optional, default claude-sonnet-4-6)
//
// Usage:
//   node scripts/vision-extract-blueprint.mjs \
//     --store kloster-kitchen --slug startseite \
//     --pageUrl "https://..." --pageName "Startseite" \
//     --pageId "34D4A812-..." --pageType startseite --pageLevel 0
//
// Oder: Batch ueber alle DOM-Files eines Stores:
//   node scripts/vision-extract-blueprint.mjs --store kloster-kitchen --all
//   (Seiten-Meta wird aus data/store-knowledge/<store>_analysis.json gelesen)

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const KNOWLEDGE = path.join(ROOT, 'data/store-knowledge');
const V3 = path.join(KNOWLEDGE, 'rerun-v3');

const PROXY_URL = process.env.VISION_PROXY_URL || '';
const PROXY_TOKEN = process.env.VISION_PROXY_TOKEN || '';
const API_KEY = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const USE_PROXY = !!PROXY_URL;

if (!USE_PROXY && !API_KEY) {
  console.error('[FATAL] Weder VISION_PROXY_URL noch VITE_ANTHROPIC_API_KEY/ANTHROPIC_API_KEY gesetzt.');
  console.error('        Empfohlen: VISION_PROXY_URL auf /api/vision-extract der Vercel-Deployment setzen.');
  console.error('        Fallback:  API-Key lokal exportieren (vercel env pull .env.local).');
  process.exit(1);
}
console.log(`[vision-extract] Mode: ${USE_PROXY ? 'PROXY ' + PROXY_URL : 'DIRECT_API'} Model: ${MODEL}`);

// ─── CLI ─────────────────────────────────────────────────────────────

function parseArgs(argv){
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i+1];
    if (!next || next.startsWith('--')) { out[key] = true; }
    else { out[key] = next; i++; }
  }
  return out;
}

const args = parseArgs(process.argv);

// ─── PROMPT LOADING ─────────────────────────────────────────────────

const SYSTEM_PROMPT = fs.readFileSync(path.join(ROOT, 'docs/BLUEPRINT_EXTRACTION_PROMPT.md'), 'utf-8');

const ALLOWED_LAYOUT_TYPES = [
  'amazon_nav_header','amazon_share_footer','separator_invisible',
  'hero_banner','hero_banner_compact','hero_banner_tall','hero_video','hero_video_split','hero_video_tall',
  'editorial_banner','editorial_banner_large','editorial_banner_tall','editorial_banner_solid_color',
  'editorial_section_intro','editorial_tile_pair','editorial_tile_quad',
  'product_showcase_video','product_grid_featured','product_grid_category','product_grid_line',
  'product_grid_full_catalog','product_grid_new_arrivals','product_grid_bestsellers','product_grid_filter_results',
  'subcategory_tile','shoppable_interactive_image','shoppable_interactive_image_set',
  'filter_accordion_collapsed','filter_banner'
];
const ALLOWED_DESIGN_INTENT = ['emotional_hook','product_showcase','editorial','navigation_bridge','section_intro','mimics_native_chrome','visual_separator'];
const ALLOWED_BACKGROUND = ['photo_bg','solid_color','split_color_photo','video_bg','shoppable_interactive_image','amazon_default'];
const ALLOWED_IMAGE_CATEGORY = ['creative','text_image','product','product_tile_asin','lifestyle','creative_lifestyle_hybrid','benefit'];
const ALLOWED_ORIGIN = ['none','baked_in','layered_text','amazon_overlay','amazon_chrome'];

// ─── IO HELPERS ─────────────────────────────────────────────────────

function readJson(p){ return JSON.parse(fs.readFileSync(p, 'utf-8')); }
function writeJson(p, obj){
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}
function loadPng(p){
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p).toString('base64');
}

function collectScreenshots(store, slug){
  const one = path.join(V3, store, 'screenshots', `${slug}.png`);
  if (fs.existsSync(one)) return [one];
  const segDir = path.join(V3, store, 'screenshots-segmented');
  if (!fs.existsSync(segDir)) return [];
  return fs.readdirSync(segDir)
    .filter(f => f.startsWith(`${slug}_part-`) && f.endsWith('.png'))
    .sort()
    .map(f => path.join(segDir, f));
}

// ─── API CALL ───────────────────────────────────────────────────────

async function callClaudeVisionDirect({ systemPrompt, userText, imagesB64, maxTokens, temperature }){
  const content = [];
  for (const b64 of imagesB64) {
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } });
  }
  content.push({ type: 'text', text: userText });

  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content }]
  };

  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${errText.slice(0, 500)}`);
  }
  const data = await resp.json();
  const text = (data.content && data.content[0]) ? data.content[0].text : '';
  return { text, usage: data.usage };
}

async function callClaudeVisionProxy({ systemPrompt, userText, imagesB64, maxTokens, temperature }){
  const headers = { 'Content-Type': 'application/json' };
  if (PROXY_TOKEN) headers['x-vision-proxy-token'] = PROXY_TOKEN;
  const resp = await fetch(PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODEL,
      system: systemPrompt,
      userText,
      imagesB64,
      maxTokens,
      temperature
    })
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Proxy ${resp.status}: ${errText.slice(0, 500)}`);
  }
  const data = await resp.json();
  return { text: data.text || '', usage: data.usage };
}

async function callClaudeVision({ systemPrompt, userText, imagesB64, maxTokens = 8192, temperature = 0 }){
  if (USE_PROXY) return callClaudeVisionProxy({ systemPrompt, userText, imagesB64, maxTokens, temperature });
  return callClaudeVisionDirect({ systemPrompt, userText, imagesB64, maxTokens, temperature });
}

// Versucht, nur das JSON-Objekt aus der Antwort zu extrahieren, falls
// das Modell versehentlich Text vor/nach dem JSON setzt.
function extractJson(text){
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed);
  }
  const fence = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fence) return JSON.parse(fence[1]);
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    return JSON.parse(text.slice(first, last + 1));
  }
  throw new Error('Keine JSON-Struktur in der Antwort gefunden.');
}

// ─── VALIDATION (Paragraf 18) ──────────────────────────────────────

function validateBlueprint(bp){
  const violations = [];
  if (!bp || typeof bp !== 'object') { violations.push('blueprint ist kein Objekt'); return violations; }
  const modules = bp.modules || [];
  if (!Array.isArray(modules) || modules.length < 1) {
    violations.push('logicalModules < 1');
  }
  modules.forEach((m, i) => {
    if (!ALLOWED_LAYOUT_TYPES.includes(m.layoutType)) violations.push(`mod[${i}] layoutType ungueltig: ${m.layoutType}`);
    if (!ALLOWED_DESIGN_INTENT.includes(m.designIntent)) violations.push(`mod[${i}] designIntent ungueltig: ${m.designIntent}`);
    if (!ALLOWED_BACKGROUND.includes(m.backgroundStyle)) violations.push(`mod[${i}] backgroundStyle ungueltig: ${m.backgroundStyle}`);
    const tiles = m.tiles || [];
    tiles.forEach((t, j) => {
      if (!ALLOWED_IMAGE_CATEGORY.includes(t.imageCategory)) violations.push(`mod[${i}].tile[${j}] imageCategory ungueltig: ${t.imageCategory}`);
      const o = t.textOnImage && t.textOnImage.origin;
      if (o && !ALLOWED_ORIGIN.includes(o)) violations.push(`mod[${i}].tile[${j}] textOnImage.origin ungueltig: ${o}`);
    });
  });
  // Em-Dash / En-Dash scan
  const serialized = JSON.stringify(bp);
  if (/[\u2013\u2014]/.test(serialized)) violations.push('em_dash_or_en_dash_in_text');
  // openQuestions muss ein Array sein
  if (!Array.isArray(bp.openQuestions)) violations.push('openQuestions nicht als Array');
  return violations;
}

// ─── MAIN ───────────────────────────────────────────────────────────

async function runOne({ store, slug, pageMeta }){
  const domPath = path.join(V3, store, 'raw-dom', `${slug}_dom.json`);
  if (!fs.existsSync(domPath)) throw new Error(`DOM-Datei fehlt: ${domPath}`);
  const dom = readJson(domPath);

  const screenshots = collectScreenshots(store, slug);
  if (screenshots.length === 0) throw new Error(`Kein Screenshot fuer ${store}/${slug}`);
  const imagesB64 = screenshots.map(loadPng);

  const userText = [
    `Stores: ${store}`,
    `Seite: ${pageMeta.pageName} (slug=${slug})`,
    `pageUrl: ${pageMeta.pageUrl}`,
    `pageId: ${pageMeta.pageId || 'unknown'}`,
    `pageType: ${pageMeta.pageType || 'unknown'}`,
    `pageLevel: ${pageMeta.pageLevel != null ? pageMeta.pageLevel : 'unknown'}`,
    '',
    'DOM-Extrakt aus Phase 1 (authoritativ fuer Module, Tile-Counts, CTAs, hrefs):',
    '```json',
    JSON.stringify(dom, null, 2),
    '```',
    '',
    `Du erhaeltst ${imagesB64.length === 1 ? 'einen Full-Page-Screenshot' : `${imagesB64.length} Screenshot-Segmente (Top nach Bottom)`} der Seite als Referenz.`,
    '',
    'Aufgabe: erzeuge das Seiten-Blueprint gemaess docs/BLUEPRINT_EXTRACTION_PROMPT.md Paragraf 13.',
    'Gib AUSSCHLIESSLICH valides JSON zurueck, keine Markdown-Codefences, kein Text davor oder danach.',
    'Halte dich strikt an die Enums aus Paragraf 3, 5, 6, 9, 10. Em-Dash (U+2014) und En-Dash (U+2013) sind in allen Textfeldern verboten.'
  ].join('\n');

  async function attempt(nudge){
    const sys = nudge ? (SYSTEM_PROMPT + '\n\n## 19. Zusaetzliche Haerting\n' + nudge) : SYSTEM_PROMPT;
    const { text, usage } = await callClaudeVision({ systemPrompt: sys, userText, imagesB64 });
    const bp = extractJson(text);
    const violations = validateBlueprint(bp);
    return { bp, violations, usage, raw: text };
  }

  let result = await attempt(null);
  if (result.violations.length > 0) {
    const nudge = [
      'Die letzte Antwort verstiess gegen folgende Regeln:',
      ...result.violations.map(v => '- ' + v),
      'Korrigiere JEDE einzelne Violation. Gib wieder ausschliesslich valides JSON zurueck.'
    ].join('\n');
    console.warn(`[${slug}] Retry wegen ${result.violations.length} Violations`);
    result = await attempt(nudge);
  }

  // Seiten-Meta konsistent einmontieren
  result.bp.pageUrl = pageMeta.pageUrl;
  result.bp.pageName = pageMeta.pageName;
  if (pageMeta.pageId) result.bp.pageId = pageMeta.pageId;
  if (pageMeta.pageType) result.bp.pageType = pageMeta.pageType;
  if (pageMeta.pageLevel != null) result.bp.pageLevel = pageMeta.pageLevel;

  const outPath = path.join(V3, store, 'blueprints', `${slug}.json`);
  writeJson(outPath, result.bp);
  console.log(`[${slug}] -> ${outPath}  (modules=${(result.bp.modules||[]).length}, violations=${result.violations.length}, usage=${JSON.stringify(result.usage||{})})`);
  return { slug, outPath, violations: result.violations, usage: result.usage };
}

async function main(){
  const store = args.store;
  if (!store) { console.error('Fehlt: --store <name>'); process.exit(1); }

  const jobs = [];
  if (args.all) {
    // Seiten-Meta aus der existierenden V4 Analyse lesen
    const v4Path = path.join(KNOWLEDGE, `${store}_analysis.json`);
    if (!fs.existsSync(v4Path)) { console.error(`V4-Analyse fehlt: ${v4Path}`); process.exit(1); }
    const v4 = readJson(v4Path);
    const pages = (v4.navigation && v4.navigation.pages) || [];
    const domDir = path.join(V3, store, 'raw-dom');
    for (const p of pages) {
      const slug = (p.slug || p.name || '').toString()
        .toLowerCase()
        .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
        .replace(/[^a-z0-9]+/g,'_')
        .replace(/^_|_$/g,'');
      const domFile = path.join(domDir, `${slug}_dom.json`);
      if (!fs.existsSync(domFile)) { console.warn(`[skip] DOM-Datei fehlt fuer ${p.name}: ${domFile}`); continue; }
      jobs.push({
        slug,
        pageMeta: {
          pageName: p.name,
          pageUrl: `https://www.amazon.de/stores/page/${p.pageId}`,
          pageId: p.pageId,
          pageType: p.pageType || 'unknown',
          pageLevel: typeof p.level === 'number' ? p.level : 0
        }
      });
    }
  } else if (args.slug) {
    jobs.push({
      slug: args.slug,
      pageMeta: {
        pageName: args.pageName || args.slug,
        pageUrl: args.pageUrl || '',
        pageId: args.pageId || '',
        pageType: args.pageType || 'unknown',
        pageLevel: args.pageLevel != null ? Number(args.pageLevel) : 0
      }
    });
  } else {
    console.error('Fehlt: entweder --slug <name> plus --pageUrl, oder --all'); process.exit(1);
  }

  const summary = [];
  for (const job of jobs) {
    try {
      const r = await runOne({ store, slug: job.slug, pageMeta: job.pageMeta });
      summary.push(r);
    } catch (err) {
      console.error(`[${job.slug}] FEHLER: ${err.message}`);
      summary.push({ slug: job.slug, error: err.message });
    }
  }
  // Report speichern
  const reportPath = path.join(V3, store, 'vision-run-report.json');
  writeJson(reportPath, { store, model: MODEL, at: new Date().toISOString(), summary });
  console.log(`\nReport: ${reportPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
