import { useState, useRef, useCallback } from 'react';
import { LAYOUTS, LANGS, TILE_TYPES, uid, emptyTile } from './constants';
import { scrapeAsins, buildStoreDeterministic, enrichWithAI } from './api';
import { SectionView } from './Tiles';
import PropertiesPanel from './PropertiesPanel';
import AsinPanel from './AsinPanel';

var DOMAINS = {
  de: 'https://www.amazon.de',
  com: 'https://www.amazon.com',
  'co.uk': 'https://www.amazon.co.uk',
  fr: 'https://www.amazon.fr',
};

function parseAsinFile(text) {
  var asins = [];
  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  text.split(/[\r\n]+/).filter(Boolean).forEach(function(line) {
    var upper = line.toUpperCase();
    var idx = upper.indexOf('B0');
    if (idx >= 0) {
      var end = idx + 2;
      while (end < upper.length && CHARS.indexOf(upper[end]) >= 0) end++;
      if (end - idx >= 10) {
        var asin = upper.slice(idx, end);
        if (asins.indexOf(asin) < 0) asins.push(asin);
      }
    }
  });
  return asins;
}

export default function App() {
  var [showGen, setShowGen] = useState(false);
  var [showAsins, setShowAsins] = useState(false);
  var [generating, setGenerating] = useState(false);
  var [genLog, setGenLog] = useState([]);
  var [store, setStore] = useState({ brandName: '', products: [], asins: [], pages: [] });
  var [curPage, setCurPage] = useState('');
  var [sel, setSel] = useState(null);
  var [formBrand, setFormBrand] = useState('');
  var [formMp, setFormMp] = useState('de');
  var [formInfo, setFormInfo] = useState('');
  var [uploadedAsins, setUploadedAsins] = useState([]);
  var fileRef = useRef(null);

  var log = useCallback(function(m) { setGenLog(function(p) { return p.concat([m]); }); }, []);
  var page = store.pages.find(function(p) { return p.id === curPage; }) || store.pages[0];

  var onFileChange = function(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function(ev) { setUploadedAsins(parseAsinFile(ev.target.result)); };
    reader.readAsText(f);
    if (fileRef.current) fileRef.current.value = '';
  };

  var generate = async function() {
    var brand = formBrand.trim();
    if (!brand || !uploadedAsins.length) return;

    setShowGen(false);
    setGenerating(true);
    setGenLog([]);

    var lang = LANGS[formMp] || 'German';
    var domain = DOMAINS[formMp] || DOMAINS.de;

    try {
      // STEP 1: Scrape ASINs
      log('🔍 Step 1: Scraping ' + uploadedAsins.length + ' ASINs from Amazon.' + formMp + '...');
      var scrapeResult = await scrapeAsins(uploadedAsins, domain);
      var products = scrapeResult.products || [];
      if (!products.length) throw new Error('No products returned from Bright Data');
      log('✅ Scraped ' + products.length + '/' + uploadedAsins.length + ' products');

      // STEP 2: Group products into categories
      log('📊 Step 2: Analyzing product categories...');
      var groups = {};
      products.forEach(function(p) {
        var cat = '';
        if (p.categories && p.categories.length > 0) {
          var cats = p.categories;
          cat = Array.isArray(cats) ? (cats[cats.length - 1] || cats[0] || '') : String(cats);
        }
        if (!cat) cat = 'Sonstige';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(p);
      });

      var catNames = Object.keys(groups);
      // Merge small categories
      if (catNames.length > 8) {
        var sonstige = groups['Sonstige'] || [];
        catNames.forEach(function(c) {
          if (c !== 'Sonstige' && groups[c].length < 2) {
            sonstige = sonstige.concat(groups[c]);
            delete groups[c];
          }
        });
        if (sonstige.length > 0) groups['Sonstige'] = sonstige;
      }

      catNames = Object.keys(groups);
      log('📦 Found ' + catNames.length + ' categories: ' + catNames.join(', '));
      catNames.forEach(function(c) { log('  · ' + c + ': ' + groups[c].length + ' products'); });

      // STEP 3: Build store structure (deterministic, no AI)
      log('🏗️ Step 3: Building store structure (best-practice patterns)...');
      var storeData = buildStoreDeterministic(brand, lang, products, groups);
      log('✅ Structure: ' + storeData.pages.length + ' pages — ' + storeData.pages.map(function(p) { return p.name; }).join(', '));

      // STEP 4: AI enrichment (text content)
      log('🤖 Step 4: AI generating text content (hero, briefs, CTAs)...');
      storeData = await enrichWithAI(storeData, brand, lang, products);
      log('✅ Text content generated');

      // Verify ASIN coverage
      var usedA = {};
      storeData.pages.forEach(function(pg) { pg.sections.forEach(function(sec) { sec.tiles.forEach(function(t) { (t.asins || []).forEach(function(a) { usedA[a] = true; }); }); }); });
      var allAsins = products.map(function(p) { return { asin: p.asin, name: p.name, category: (p.categories || [])[0] || '' }; });
      var assigned = allAsins.filter(function(a) { return usedA[a.asin]; }).length;
      log('✅ ' + assigned + '/' + allAsins.length + ' ASINs assigned to product grids');

      setStore({ brandName: brand, products: products, pages: storeData.pages, asins: allAsins });
      setCurPage(storeData.pages[0] ? storeData.pages[0].id : '');
      setSel(null);
      log('🎉 Done! Click through pages on the left to review.');
    } catch (e) {
      log('❌ ' + e.message);
    } finally {
      setTimeout(function() { setGenerating(false); }, 1500);
    }
  };

  var updateTile = function(updated) {
    if (!sel) return;
    setStore(function(s) {
      return { ...s, pages: s.pages.map(function(pg) {
        return { ...pg, sections: pg.sections.map(function(sec) {
          if (sec.id !== sel.sid) return sec;
          return { ...sec, tiles: sec.tiles.map(function(t, i) { return i === sel.ti ? updated : t; }) };
        }) };
      }) };
    });
  };

  var selTile = sel && page ? (function() {
    var sec = page.sections.find(function(s) { return s.id === sel.sid; });
    return sec ? sec.tiles[sel.ti] || null : null;
  })() : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 44, padding: '0 16px', gap: 8, background: '#232F3E', color: '#fff', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>🏪 <span style={{ color: '#FF9900' }}>Store</span> Builder</div>
        {store.brandName && <div style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>— {store.brandName} ({store.products.length} products)</div>}
        <div style={{ flex: 1 }} />
        {store.asins.length > 0 && <button className="btn" onClick={function() { setShowAsins(true); }}>📦 ASINs ({store.asins.length})</button>}
        <button className="btn btn-primary" onClick={function() { setShowGen(true); }}>✨ Generate</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 170, background: '#fff', borderRight: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '10px 12px', fontWeight: 800, fontSize: 13, borderBottom: '1px solid #eee' }}>Pages</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
            {store.pages.length === 0 && <div style={{ padding: 16, color: '#ccc', fontSize: 11, textAlign: 'center' }}>Generate a store first</div>}
            {store.pages.map(function(pg) {
              return <div key={pg.id} onClick={function() { setCurPage(pg.id); setSel(null); }}
                style={{ padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                  fontWeight: pg.id === curPage ? 700 : 400, background: pg.id === curPage ? '#e8f4f8' : 'transparent',
                  borderLeft: '3px solid ' + (pg.id === curPage ? '#007EB9' : 'transparent'), marginBottom: 1 }}>
                {pg.name}
              </div>;
            })}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', background: '#f0f1f3', padding: 16 }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {page && (
              <div style={{ background: '#fff', borderRadius: 4, marginBottom: 8, padding: '10px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{store.brandName || 'Brand Store'}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: '#888', flexWrap: 'wrap' }}>
                  {store.pages.map(function(pg) {
                    return <span key={pg.id} onClick={function() { setCurPage(pg.id); setSel(null); }}
                      style={{ cursor: 'pointer', fontWeight: pg.id === curPage ? 700 : 400,
                        color: pg.id === curPage ? '#007EB9' : '#888',
                        borderBottom: pg.id === curPage ? '2px solid #007EB9' : 'none', paddingBottom: 2 }}>
                      {pg.name}
                    </span>;
                  })}
                </div>
              </div>
            )}
            {page && page.sections.map(function(sec, si) {
              return <SectionView key={sec.id} section={sec} idx={si} sel={sel} onSelect={setSel} />;
            })}
            {!page && (
              <div style={{ textAlign: 'center', padding: 60, color: '#bbb' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🏪</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Amazon Brand Store Builder</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Click <b>✨ Generate</b> → upload ASIN list → generate store</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ width: 250, background: '#fff', borderLeft: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '10px 12px', fontWeight: 800, fontSize: 13, borderBottom: '1px solid #eee' }}>Properties</div>
          <div style={{ flex: 1, overflowY: 'auto' }}><PropertiesPanel tile={selTile} onChange={updateTile} /></div>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" style={{ display: 'none' }} onChange={onFileChange} />

      {showGen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={function() { setShowGen(false); }}>
          <div onClick={function(e) { e.stopPropagation(); }} style={{ background: '#fff', borderRadius: 8, padding: 20, maxWidth: 420, width: '92%' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>✨ Generate Brand Store</div>
            <label className="label">1. Upload ASIN List *</label>
            <button className={'btn' + (uploadedAsins.length ? ' btn-green' : '')} style={{ width: '100%', padding: 8 }}
              onClick={function() { fileRef.current && fileRef.current.click(); }}>
              {uploadedAsins.length ? '✓ ' + uploadedAsins.length + ' ASINs loaded' : '📁 Upload CSV / TXT file'}
            </button>
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>One ASIN per line (B0XXXXXXXXXX)</div>
            {uploadedAsins.length > 0 && (
              <div style={{ fontSize: 10, color: '#555', marginTop: 4, maxHeight: 50, overflowY: 'auto', background: '#f8f8f8', padding: 4, borderRadius: 3, fontFamily: 'monospace' }}>
                {uploadedAsins.slice(0, 6).join(', ')}{uploadedAsins.length > 6 ? ' +' + (uploadedAsins.length - 6) + ' more' : ''}
              </div>
            )}
            <label className="label" style={{ marginTop: 10 }}>2. Brand name *</label>
            <input value={formBrand} onChange={function(e) { setFormBrand(e.target.value); }} className="input" placeholder='e.g. Futum, Kärcher' />
            <label className="label">3. Marketplace</label>
            <select value={formMp} onChange={function(e) { setFormMp(e.target.value); }} className="input">
              <option value="de">🇩🇪 Amazon.de</option>
              <option value="com">🇺🇸 Amazon.com</option>
              <option value="co.uk">🇬🇧 Amazon.co.uk</option>
              <option value="fr">🇫🇷 Amazon.fr</option>
            </select>
            <label className="label" style={{ marginTop: 10 }}>4. Instructions (optional)</label>
            <textarea value={formInfo} onChange={function(e) { setFormInfo(e.target.value); }} className="input" rows={2} placeholder="Special requirements..." />
            <div style={{ display: 'flex', gap: 6, marginTop: 14, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={function() { setShowGen(false); }}>Cancel</button>
              <button className="btn btn-primary" style={{ padding: '6px 16px' }} onClick={generate}
                disabled={!formBrand.trim() || !uploadedAsins.length}>
                🚀 Scrape & Generate ({uploadedAsins.length} ASINs)
              </button>
            </div>
          </div>
        </div>
      )}

      {generating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: '#fff', borderRadius: 8, maxWidth: 500, width: '92%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: 14, fontWeight: 700, borderBottom: '1px solid #eee' }}>Generating Store...</div>
            <div style={{ background: '#111', padding: 10, flex: 1, overflowY: 'auto', fontFamily: 'monospace', minHeight: 180 }}>
              {genLog.map(function(m, i) {
                var color = '#9ca3af';
                if (m.indexOf('❌') === 0) color = '#f87171';
                else if (m.indexOf('⚠') === 0) color = '#fbbf24';
                else if (m.indexOf('✅') === 0 || m.indexOf('🎉') === 0) color = '#4ade80';
                else if (m.indexOf('  ·') === 0) color = '#6b7280';
                return <div key={i} style={{ fontSize: 11, lineHeight: 1.7, color: color }}>{m}</div>;
              })}
            </div>
          </div>
        </div>
      )}

      {showAsins && <AsinPanel asins={store.asins} pages={store.pages} onClose={function() { setShowAsins(false); }} />}
    </div>
  );
}
