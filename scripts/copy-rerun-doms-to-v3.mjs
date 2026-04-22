import fs from 'fs';

const src = 'data/store-knowledge/rerun/dom/';
const dst = 'data/store-knowledge/rerun-v3/raw-dom/';

const slugMap = {
  '01_startseite':         { slug: 'startseite',        pageName: 'Startseite' },
  '02_immunsystem':        { slug: 'immunsystem',       pageName: 'Immunsystem' },
  '03_vitamine':           { slug: 'vitamine',          pageName: 'Vitamine' },
  '04_soprotein_vegan':    { slug: 'soprotein_vegan',   pageName: 'SoProtein Vegan' },
  '05_ueber_uns':          { slug: 'ueber_uns',         pageName: 'Ueber uns' },
  '06_alle_produkte':      { slug: 'alle_produkte',     pageName: 'Alle Produkte' },
  '07_neuheiten':          { slug: 'neuheiten',         pageName: 'unsere Neuheiten' },
  '08_produktselektor':    { slug: 'produktselektor',   pageName: 'Produktselektor' },
  '09_geschenk_sets':      { slug: 'geschenk_sets',     pageName: 'Geschenk-Sets' },
  '10_unsere_empfehlungen':{ slug: 'unsere_empfehlungen', pageName: 'Unsere Empfehlungen' }
};

function normalizeCompactModule(m) {
  // Compact schema: i, t, h, w, hd, tp, ct, ic, is, tc, pc, vc, sp, ly, bc, bi
  return {
    idx: m.i,
    top: m.t,
    height: m.h,
    widgetClass: m.w || null,
    headlines: m.hd || [],
    allTextPreview: m.tp || '',
    ctas: m.ct || [],
    imgCount: m.ic || 0,
    imgSample: m.is || [],
    tileCount: m.tc || 0,
    productCount: m.pc || 0,
    videoCount: m.vc || 0,
    shoppableMarkers: m.sp || 0,
    layout: m.ly || null,
    bgColor: m.bc || null,
    bgImage: m.bi || null
  };
}

function normalize(j) {
  if (j.modules) return j; // full schema
  // compact schema: sh, vp, n, m
  return {
    url: j.url,
    scrollHeight: j.sh,
    viewport: typeof j.vp === 'string' ? { w: parseInt(j.vp.split('x')[0]), h: parseInt(j.vp.split('x')[1]) } : j.vp,
    count: j.n,
    modules: (j.m || []).map(normalizeCompactModule)
  };
}

const files = fs.readdirSync(src).filter(f => f.endsWith('.json'));
for (const f of files) {
  const key = f.replace('.json','');
  const info = slugMap[key];
  if (info === undefined) { console.log('SKIP', f); continue; }
  if (info.slug === 'startseite') { console.log('SKIP startseite (schon frisch gescraped)'); continue; }
  const raw = JSON.parse(fs.readFileSync(src + f,'utf8'));
  const norm = normalize(raw);
  const pageUrl = 'https://www.amazon.de/stores/page/' + raw.pageId;
  const out = {
    slug: info.slug,
    pageId: raw.pageId,
    pageName: info.pageName,
    pageUrl,
    scrapeIso: raw.scrapeIso,
    viewport: norm.viewport,
    scrollHeight: norm.scrollHeight,
    count: norm.count,
    modules: norm.modules,
    sourceNote: 'Uebernommen aus Probe ' + raw.scrapeIso + ', heute (2026-04-21) fuer Startseite verifiziert: Modulstruktur unveraendert, scrollHeight Delta 20px durch Lazy-Load-Timing. Kompakt-Schema normalisiert auf extract-page-dom.js Ziel-Format.'
  };
  const outPath = dst + 'natural-elements_' + info.slug + '_dom.json';
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('OK', outPath, 'count=' + norm.count, 'sh=' + norm.scrollHeight);
}
