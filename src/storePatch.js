import { uid, TILE_TYPES, LAYOUTS, LEGACY_LAYOUT_MAP } from './constants';
import { importPageFromBriefing, importSectionFromBriefing, importTileFromBriefing } from './briefingImport';
import { introducedLimitErrors } from './storeRules.mjs';

const ASSET_FIELDS = new Set(['uploadedImage', 'uploadedImageMobile', 'videoThumbnail', 'wireframeImage', 'referenceImages', 'headerBanner', 'headerBannerMobile', 'heroBanner', 'heroBannerMobile', 'image']);

export function makeClaudeContext(store) {
  // Keep the complete current hierarchy and wording, never the potentially huge
  // image payloads/catalog. The live store is never changed by this export.
  const context = JSON.parse(JSON.stringify(store, (key, value) => {
    if (ASSET_FIELDS.has(key) || key === 'products') return undefined;
    return value;
  }));
  // Change detection only, not an authorization/security token. Two independent
  // 32-bit accumulators keep a compact deterministic revision of this context.
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (const char of JSON.stringify(context)) {
    const code = char.codePointAt(0);
    a = Math.imul(a ^ code, 16777619); b = Math.imul(b ^ code, 2246822519);
  }
  context.baseRevision = [a, b].map(n => (n >>> 0).toString(16).padStart(8, '0')).join('');
  return context;
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(label + ' muss ein Objekt sein.');
  return value;
}
function safeKeys(value) {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw Error('Ungültiger JSON-Schlüssel.');
    safeKeys(value[key]);
  }
}
function index(value, length, inserting, label) {
  if (!Number.isInteger(value) || value < 0 || value >= length + (inserting ? 1 : 0)) throw Error(label + ': Index nicht vorhanden.');
  return value;
}
function mergePatch(target, patch, forbidden) {
  object(patch, 'patch');
  for (const key of Object.keys(patch)) {
    if (forbidden.includes(key) || ASSET_FIELDS.has(key)) throw Error('Feld „' + key + '“ darf hier nicht ersetzt werden.');
  }
  const next = { ...target, ...patch };
  if (patch.textOverlay) next.textOverlay = { ...target.textOverlay, ...object(patch.textOverlay, 'textOverlay') };
  if (patch.productSelector != null) next.productSelector = mergeSelector(target.productSelector, object(patch.productSelector, 'productSelector'));
  return next;
}
function mergeSelector(current, patch) {
  if (Array.isArray(patch)) return patch.map(item => {
    const previous = item && typeof item === 'object' && item.id && Array.isArray(current) ? current.find(old => old?.id === item.id) : undefined;
    return item && typeof item === 'object' ? mergeSelector(previous, item) : item;
  });
  const next = { ...(current || {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (ASSET_FIELDS.has(key) && current?.[key] != null && value !== current[key]) throw Error('Vorhandene Quiz-Bilder dürfen im Änderungs-JSON nicht ersetzt werden.');
    next[key] = value && typeof value === 'object' ? mergeSelector(current?.[key], value) : value;
  }
  return next;
}
function checkTile(tile) {
  object(tile, 'Kachel');
  if (tile.type && !TILE_TYPES.includes(tile.type)) throw Error('Unbekannter Kacheltyp: ' + tile.type);
  if (tile.textOverlay != null) object(tile.textOverlay, 'textOverlay');
  for (const key of ['heading', 'subheading', 'body', 'cta']) {
    if (tile.textOverlay?.[key] != null && typeof tile.textOverlay[key] !== 'string') throw Error(key + ': Text muss eine Zeichenfolge sein.');
  }
  if (tile.textOverlay?.bullets != null && !Array.isArray(tile.textOverlay.bullets)) throw Error('bullets muss eine Liste sein.');
  if (tile.textOverlay?.bullets?.some(value => typeof value !== 'string')) throw Error('bullets muss Text enthalten.');
  for (const key of ['asins', 'hotspots', 'referenceImages']) if (tile[key] != null && !Array.isArray(tile[key])) throw Error(key + ' muss eine Liste sein.');
  strings(tile, ['brief', 'linkUrl', 'linkAsin', 'imageRef', 'imageCategory', 'collectionTitle', 'bgColor', 'textAlign']);
  stringList(tile.asins, 'asins');
  for (const hotspot of tile.hotspots || []) {
    object(hotspot, 'hotspot'); strings(hotspot, ['asin']);
    for (const key of ['x', 'y']) if (hotspot[key] != null && (typeof hotspot[key] !== 'number' || !Number.isFinite(hotspot[key]) || hotspot[key] < 0 || hotspot[key] > 100)) throw Error('Ungültige Hotspot-Koordinate.');
  }
  for (const key of ['dimensions', 'mobileDimensions']) dimensions(tile[key]);
  if (tile.syncDimensions != null && typeof tile.syncDimensions !== 'boolean') throw Error('syncDimensions muss ein Wahrheitswert sein.');
  if (tile.productSelector != null) {
    const quiz = object(tile.productSelector, 'productSelector');
    for (const key of ['intro', 'results', 'styling']) if (quiz[key] != null) {
      const fields = object(quiz[key], key);
      strings(fields, ['headline', 'description', 'buttonLabel', 'image', 'imagePosition', 'storePageLink', 'restartLabel', 'disclaimer', 'typography', 'size', 'weight', 'align', 'bgColor', 'btnColor']);
      for (const flag of ['enabled', 'bgRounded', 'btnRounded']) if (fields[flag] != null && typeof fields[flag] !== 'boolean') throw Error(flag + ' muss ein Wahrheitswert sein.');
    }
    stringList(quiz.recommendedAsins, 'recommendedAsins');
    if (quiz.questions != null && !Array.isArray(quiz.questions)) throw Error('questions muss eine Liste sein.');
    for (const question of quiz.questions || []) {
      object(question, 'Frage'); strings(question, ['id', 'questionText', 'descriptionText']);
      if (question.answers != null && !Array.isArray(question.answers)) throw Error('answers muss eine Liste sein.');
      if (question.allowImages != null && typeof question.allowImages !== 'boolean') throw Error('allowImages muss ein Wahrheitswert sein.');
      for (const answer of question.answers || []) {
        object(answer, 'Antwort'); strings(answer, ['id', 'text', 'image']); stringList(answer.asins, 'Antwort-ASINs');
      }
    }
  }
}
function strings(value, fields) {
  for (const key of fields) if (value[key] != null && typeof value[key] !== 'string') throw Error(key + ' muss Text sein.');
}
function stringList(value, label) {
  if (value != null && (!Array.isArray(value) || value.some(item => typeof item !== 'string'))) throw Error(label + ' muss eine Liste aus Textwerten sein.');
}
function dimensions(value) {
  if (value == null) return;
  object(value, 'Bildmaße');
  if (['w', 'h'].some(key => typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] <= 0)) throw Error('Bildmaße müssen positive Zahlen sein.');
}
function checkPage(page) {
  strings(page, ['name', 'heroBannerBrief', 'heroBannerTextOverlay', 'heroBannerMobileBrief']);
  for (const key of ['heroBannerDimensions', 'heroBannerMobileDimensions']) dimensions(page[key]);
}
function checkSection(section) {
  object(section, 'Abschnitt');
  strings(section, ['module', 'layoutId']);
  if (section.layoutId && !LAYOUTS.some(l => l.id === section.layoutId) && !LEGACY_LAYOUT_MAP[section.layoutId]) throw Error('Unbekanntes Layout: ' + section.layoutId);
  if (section.tiles != null && !Array.isArray(section.tiles)) throw Error('tiles muss eine Liste sein.');
  (section.tiles || []).forEach(checkTile);
}

export function applyStorePatch(current, data) {
  object(data, 'Änderungs-JSON'); safeKeys(data);
  if (!Array.isArray(data.ops) || !data.ops.length) throw Error('Änderungs-JSON benötigt ein nicht leeres "ops" Array. Ein kompletter Store ersetzt hier nicht den aktuellen Stand.');
  if (!data.baseRevision || data.baseRevision !== makeClaudeContext(current).baseRevision) throw Error('Der Store-Stand ist veraltet oder baseRevision fehlt. Bitte Prompt und aktuellen Store erneut kopieren und die Änderungen von Claude auf diesen Stand beziehen lassen.');
  const next = JSON.parse(JSON.stringify(current));
  const pages = next.pages;
  const summary = [];
  const changedTiles = new Set();
  const names = Object.create(null);
  pages.forEach(p => { if (names[p.name]) names[p.name] = null; else if (!(p.name in names)) names[p.name] = p.id; });
  // Reserve real IDs before any import so links to pages later in the same
  // operation list resolve correctly (including parent-child references).
  const reserved = new Map();
  for (const op of data.ops) {
    object(op, 'Operation');
    if (op.op === 'addPage') {
      object(op.page, 'Neue Seite');
      if (typeof op.page.name !== 'string' || !op.page.name.trim() || op.page.name in names) throw Error('Neue Seite braucht einen eindeutigen Namen.');
      const id = uid(); names[op.page.name] = id; reserved.set(op, id);
    }
  }
  function pageFor(op, destination = false) {
    const id = destination ? op.toPageId : op.pageId;
    const name = destination ? op.toPageName : op.pageName;
    const found = pages.filter(p => id ? p.id === id : p.name === name);
    if (found.length !== 1) throw Error('Seite nicht eindeutig gefunden: ' + (id || name || '(fehlt)'));
    return found[0];
  }
  function sectionFor(page, op) { return page.sections[index(op.sectionIdx, page.sections.length, false, 'Abschnitt')]; }
  function position(op, length) {
    if (op.atStart) return 0;
    if (op.after != null) return index(op.after, length, false, 'after') + 1;
    if (op.before != null) return index(op.before, length, true, 'before');
    return length;
  }
  for (const op of data.ops) {
    if (op.op === 'addPage') {
      if (op.page.sections != null && !Array.isArray(op.page.sections)) throw Error('sections muss eine Liste sein.');
      (op.page.sections || []).forEach(checkSection);
      checkPage(op.page);
      // Defer all symbolic links to the final page graph, including renames.
      const page = importPageFromBriefing(op.page, Object.create(null)); page.id = reserved.get(op);
      if (op.page.parentName) page.parentId = 'page:' + op.page.parentName;
      page.sections.forEach(section => section.tiles.forEach(tile => changedTiles.add(tile)));
      const at = op.afterPageName ? pages.indexOf(pageFor({ pageName: op.afterPageName })) + 1 : pages.length;
      pages.splice(at, 0, page); summary.push('Seite hinzugefügt: ' + page.name); continue;
    }
    const page = pageFor(op);
    if (op.op === 'modifyPage') {
      const changed = mergePatch(page, op.patch, ['id', 'sections', 'parentId']);
      checkPage(changed);
      if (typeof changed.name !== 'string' || !changed.name.trim() || pages.some(p => p !== page && p.name === changed.name)) throw Error('Seitenname muss eindeutig sein.');
      pages[pages.indexOf(page)] = changed;
    } else if (op.op === 'movePage') {
      const to = index(op.toIndex, pages.length, false, 'Seite'); pages.splice(pages.indexOf(page), 1); pages.splice(to, 0, page);
    } else if (op.op === 'addSection') {
      checkSection(op.section);
      const added = importSectionFromBriefing(op.section, Object.create(null));
      added.tiles.forEach(tile => changedTiles.add(tile));
      page.sections.splice(position(op, page.sections.length), 0, added);
    } else if (op.op === 'moveSection') {
      const section = sectionFor(page, op), destination = pageFor(op, true);
      const length = destination.sections.length - (destination === page ? 1 : 0);
      const to = index(op.toIndex, length, true, 'Zielabschnitt');
      page.sections.splice(op.sectionIdx, 1); destination.sections.splice(to, 0, section);
    } else if (op.op === 'modifySection') {
      const changed = mergePatch(sectionFor(page, op), op.patch, ['id', 'tiles']); checkSection(changed); page.sections[op.sectionIdx] = changed;
    } else if (op.op === 'deleteSection') {
      sectionFor(page, op); page.sections.splice(op.sectionIdx, 1);
    } else if (op.op === 'addTile') {
      const section = sectionFor(page, op); checkTile(op.tile);
      const at = position(op, section.tiles.length), added = importTileFromBriefing(op.tile, section.layoutId, at, Object.create(null));
      changedTiles.add(added); section.tiles.splice(at, 0, added);
    } else if (op.op === 'modifyTile' || op.op === 'deleteTile') {
      const section = sectionFor(page, op), at = index(op.tileIdx, section.tiles.length, false, 'Kachel');
      if (op.op === 'deleteTile') section.tiles.splice(at, 1);
      else { const changed = mergePatch(section.tiles[at], op.patch, ['id']); checkTile(changed); section.tiles[at] = changed; changedTiles.add(changed); }
    } else throw Error('Unbekannte Operation: ' + op.op);
    summary.push(op.op + ': ' + page.name);
  }
  for (const tile of changedTiles) {
    if (typeof tile.linkUrl === 'string' && tile.linkUrl.startsWith('page:')) {
      const targets = pages.filter(p => p.name === tile.linkUrl.slice(5));
      if (targets.length !== 1) throw Error('Verlinkte Seite nicht eindeutig gefunden: ' + tile.linkUrl);
      tile.linkUrl = '/' + targets[0].id;
    }
  }
  for (const op of data.ops) if (op.op === 'addPage') {
    const page = pages.find(p => p.id === reserved.get(op));
    if (page.parentId?.startsWith('page:')) {
      const parents = pages.filter(p => p.name === page.parentId.slice(5));
      if (parents.length !== 1) throw Error('Übergeordnete Seite nicht eindeutig gefunden.');
      page.parentId = parents[0].id;
    }
    const seen = new Set([page.id]); let id = page.parentId;
    while (id) {
      if (seen.has(id)) throw Error('Zirkuläre Seitenhierarchie.');
      const parent = pages.find(p => p.id === id);
      if (!parent) throw Error('Übergeordnete Seite nicht gefunden.');
      seen.add(id); id = parent.parentId;
    }
  }
  const violations = introducedLimitErrors(current, next);
  if (violations.length) throw Error(violations.join('\n'));
  return { store: next, summary };
}
