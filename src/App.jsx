import { useState, useRef, useCallback } from 'react';
import { LAYOUTS, LANGS, TILE_TYPES, uid, emptyTile } from './constants';
import { searchAndWait, buildPrompt, generateStore } from './api';
import { SectionView } from './Tiles';
import PropertiesPanel from './PropertiesPanel';
import AsinPanel from './AsinPanel';

const DOMAINS = {
  de: 'https://www.amazon.de',
  com: 'https://www.amazon.com',
  'co.uk': 'https://www.amazon.co.uk',
  fr: 'https://www.amazon.fr',
};

function parseAsinFile(text) {
  const asins = [];
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  text.split(/[\r\n]+/).filter(Boolean).forEach(line => {
    const upper = line.toUpperCase();
    const idx = upper.indexOf('B0');
    if (idx >= 0) {
      let end = idx + 2;
      while (end < upper.length && CHARS.includes(upper[end])) end++;
      if (end - idx >= 10) {
        const asin = upper.slice(idx, end);
        const rest = line.replace(line.slice(idx, end), '').split(/[,;\t]/).map(s => s.trim()).filter(Boolean);
        if (!asins.find(a => a.asin === asin)) asins.push({ asin, name: rest[0] || '', category: rest[1] || '' });
      }
    }
  });
  return asins;
}

export default function App() {
  const [showGen, setShowGen] = useState(false);
  const [showAsins, setShowAsins] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genLog, setGenLog] = useState([]);
  const [store, setStore] = useState({ brandName: '', products: [], asins: [], pages: [] });
  const [curPage, setCurPage] = useState('');
  const [sel, setSel] = useState(null);
  const [formBrand, setFormBrand] = useState('');
  const [formMp, setFormMp] = useState('de');
  const [formInfo, setFormInfo] = useState('');
  const fileRef = useRef(null);

  const log = useCallback(m => setGenLog(p => [...p, m]), []);
  const page = store.pages.find(p => p.id === curPage) || store.pages[0];

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const asins = parseAsinFile(ev.target.result);
      setStore(s => ({ ...s, asins }));
    };
    reader.readAsText(f);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── MAIN GENERATE FLOW ──
  const generate = async () => {
    const brand = formBrand.trim();
    if (!brand) return;

    setShowGen(false);
    setGenerating(true);
    setGenLog([]);

    const lang = LANGS[formMp] || 'German';
    const domain = DOMAINS[formMp] || DOMAINS.de;

    try {
      // STEP 1: Search Amazon via Bright Data
      log('🔍 Step 1: Searching Amazon for "' + brand + '"...');
      const searchResult = await searchAndWait(brand, domain, 50, log);
      const products = searchResult.products || [];

      if (products.length === 0) throw new Error('No products found for "' + brand + '" on Amazon');

      log('✅ Found ' + products.length + ' products');
      log('📦 Examples: ' + products.slice(0, 3).map(p => p.name.slice(0, 50)).join(', '));

      // Merge with manually uploaded ASINs if any
      const manualAsins = store.asins || [];
      if (manualAsins.length) {
        log('📎 Merging ' + manualAsins.length + ' manually uploaded ASINs...');
        manualAsins.forEach(a => {
          if (!products.find(p => p.asin === a.asin)) {
            products.push({ asin: a.asin, name: a.name, brand: brand, description: '', price: 0, currency: 'EUR', categories: [a.category].filter(Boolean) });
          }
        });
      }

      setStore(s => ({ ...s, products }));

      // STEP 2: AI generates store from real product data
      log('🤖 Step 2: AI analyzing products and building store concept...');
      const prompt = buildPrompt(brand, formMp, lang, products, formInfo);
      const result = await generateStore(prompt);

      if (!result.pages?.length) throw new Error('AI returned no pages');

      // Normalize pages
      const pages = result.pages.map(pg => ({
        id: pg.id || uid(),
        name: pg.name || 'Page',
        sections: (pg.sections || []).map(sec => {
          const ly = LAYOUTS.find(l => l.id === sec.layoutId) || LAYOUTS[0];
          const tiles = (sec.tiles || []).slice(0, ly.cells).map(t => {
            if (!t) return emptyTile();
            return {
              type: TILE_TYPES.includes(t.type) ? t.type : 'image',
              brief: t.brief || '', textOverlay: t.textOverlay || '', ctaText: t.ctaText || '',
              dimensions: t.dimensions || { w: 3000, h: 1200 }, asins: t.asins || [],
            };
          });
          while (tiles.length < ly.cells) tiles.push(emptyTile());
          return { id: uid(), layoutId: ly.id, tiles };
        }),
      }));

      log('✅ Store complete! ' + pages.length + ' pages: ' + pages.map(p => p.name).join(', '));

      // Check ASIN coverage
      const usedA = new Set();
      pages.forEach(pg => pg.sections.forEach(sec => sec.tiles.forEach(t => (t.asins || []).forEach(a => usedA.add(a)))));
      const allAsins = products.map(p => ({ asin: p.asin, name: p.name, category: (p.categories || [])[0] || '' }));
      const missing = allAsins.filter(a => !usedA.has(a.asin));
      if (missing.length) log('⚠️ ' + missing.length + '/' + allAsins.length + ' ASINs not assigned');
      else log('✅ All ' + allAsins.length + ' ASINs assigned!');

      setStore(s => ({ ...s, brandName: brand, pages, asins: allAsins }));
      setCurPage(pages[0]?.id || '');
      setSel(null);
    } catch (e) {
      log('❌ ' + e.message);
    } finally {
      setTimeout(() => setGenerating(false), 1500);
    }
  };

  const updateTile = (updated) => {
    if (!sel) return;
    setStore(s => ({
      ...s,
      pages: s.pages.map(pg => ({
        ...pg,
        sections: pg.sections.map(sec =>
          sec.id !== sel.sid ? sec : { ...sec, tiles: sec.tiles.map((t, i) => i === sel.ti ? updated : t) }
        ),
      })),
    }));
  };

  const selTile = sel && page ? page.sections.find(s => s.id === sel.sid)?.tiles[sel.ti] || null : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* TOPBAR */}
      <div style={{ display: 'flex', alignItems: 'center', height: 44, padding: '0 16px', gap: 8, background: '#232F3E', color: '#fff', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>🏪 <span style={{ color: '#FF9900' }}>Store</span> Builder</div>
        {store.brandName && <div style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>— {store.brandName} ({store.products.length} products)</div>}
        <div style={{ flex: 1 }} />
        {store.asins.length > 0 && <button className="btn" onClick={() => setShowAsins(true)}>📦 ASINs ({store.asins.length})</button>}
        <button className="btn btn-primary" onClick={() => setShowGen(true)}>✨ Generate</button>
      </div>

      {/* MAIN */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT */}
        <div style={{ width: 170, background: '#fff', borderRight: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '10px 12px', fontWeight: 800, fontSize: 13, borderBottom: '1px solid #eee' }}>Pages</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
            {store.pages.length === 0 && <div style={{ padding: 16, color: '#ccc', fontSize: 11, textAlign: 'center' }}>Generate a store first</div>}
            {store.pages.map(pg => (
              <div key={pg.id} onClick={() => { setCurPage(pg.id); setSel(null); }}
                style={{ padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                  fontWeight: pg.id === curPage ? 700 : 400, background: pg.id === curPage ? '#e8f4f8' : 'transparent',
                  borderLeft: `3px solid ${pg.id === curPage ? '#007EB9' : 'transparent'}`, marginBottom: 1 }}>
                {pg.name}
              </div>
            ))}
          </div>
        </div>

        {/* CANVAS */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#f0f1f3', padding: 16 }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {page && (
              <div style={{ background: '#fff', borderRadius: 4, marginBottom: 8, padding: '10px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{store.brandName || 'Brand Store'}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: '#888', flexWrap: 'wrap' }}>
                  {store.pages.map(pg => (
                    <span key={pg.id} onClick={() => { setCurPage(pg.id); setSel(null); }}
                      style={{ cursor: 'pointer', fontWeight: pg.id === curPage ? 700 : 400,
                        color: pg.id === curPage ? '#007EB9' : '#888',
                        borderBottom: pg.id === curPage ? '2px solid #007EB9' : 'none', paddingBottom: 2 }}>
                      {pg.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {page?.sections.map((sec, si) => <SectionView key={sec.id} section={sec} idx={si} sel={sel} onSelect={setSel} />)}
            {!page && (
              <div style={{ textAlign: 'center', padding: 60, color: '#bbb' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🏪</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Amazon Brand Store Builder</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Click <b>✨ Generate</b> — enter brand name — the tool scrapes Amazon and builds your store</div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ width: 250, background: '#fff', borderLeft: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '10px 12px', fontWeight: 800, fontSize: 13, borderBottom: '1px solid #eee' }}>Properties</div>
          <div style={{ flex: 1, overflowY: 'auto' }}><PropertiesPanel tile={selTile} onChange={updateTile} /></div>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" style={{ display: 'none' }} onChange={onFileChange} />

      {/* GENERATE MODAL */}
      {showGen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowGen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 8, padding: 20, maxWidth: 420, width: '92%' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>✨ Generate Brand Store</div>

            <label className="label">1. Brand name *</label>
            <input value={formBrand} onChange={e => setFormBrand(e.target.value)} className="input" placeholder='e.g. "Futura" or "Kärcher Schädlingsbekämpfung"' />
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>This is used as Amazon search keyword — be specific</div>

            <label className="label" style={{ marginTop: 10 }}>2. Marketplace</label>
            <select value={formMp} onChange={e => setFormMp(e.target.value)} className="input">
              <option value="de">🇩🇪 Amazon.de</option>
              <option value="com">🇺🇸 Amazon.com</option>
              <option value="co.uk">🇬🇧 Amazon.co.uk</option>
              <option value="fr">🇫🇷 Amazon.fr</option>
            </select>

            <label className="label" style={{ marginTop: 10 }}>3. Instructions (optional)</label>
            <textarea value={formInfo} onChange={e => setFormInfo(e.target.value)} className="input" rows={2} placeholder="e.g. Focus on outdoor products, emphasize eco-friendly..." />

            <label className="label" style={{ marginTop: 10 }}>4. Additional ASINs (optional)</label>
            <button className={'btn' + (store.asins?.length ? ' btn-green' : '')} style={{ width: '100%', padding: 6 }}
              onClick={() => fileRef.current?.click()}>
              {store.asins?.length ? '✓ ' + store.asins.length + ' extra ASINs' : '📁 Upload CSV (optional)'}
            </button>
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Products are scraped from Amazon automatically. CSV is only for ASINs not found via search.</div>

            <div style={{ background: '#f8f9fa', borderRadius: 4, padding: 8, marginTop: 12, fontSize: 11, color: '#666' }}>
              <b>How it works:</b> The tool searches Amazon for "{formBrand || '...'}" via Bright Data, gets real product data (names, descriptions, prices, categories), then AI builds a complete store concept.
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 14, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowGen(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ padding: '6px 16px' }} onClick={generate} disabled={!formBrand.trim()}>
                🔍 Search Amazon & Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROGRESS */}
      {generating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: '#fff', borderRadius: 8, maxWidth: 500, width: '92%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: 14, fontWeight: 700, borderBottom: '1px solid #eee' }}>Generating Store...</div>
            <div style={{ background: '#111', padding: 10, flex: 1, overflowY: 'auto', fontFamily: 'monospace', minHeight: 160 }}>
              {genLog.map((m, i) => (
                <div key={i} style={{ fontSize: 11, lineHeight: 1.7,
                  color: m.startsWith('❌') ? '#f87171' : m.startsWith('⚠') ? '#fbbf24' : m.startsWith('✅') ? '#4ade80' : '#9ca3af' }}>{m}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAsins && <AsinPanel asins={store.asins} pages={store.pages} onClose={() => setShowAsins(false)} />}
    </div>
  );
}
