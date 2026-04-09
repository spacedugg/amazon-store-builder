import { useState, useRef } from 'react';

var STORES = [
  { file: 'snocks', brand: 'SNOCKS', url: 'https://www.amazon.de/stores/SNOCKS/page/C0392661-40E4-498F-992D-2FFEB9086ABB', category: 'fashion', quality: 5 },
  { file: 'the-north-face', brand: 'The North Face', url: 'https://www.amazon.de/stores/THENORTHFACE/page/91172724-C342-482B-A300-564D9EA5E09F', category: 'outdoor', quality: 5 },
  { file: 'esn', brand: 'ESN', url: 'https://www.amazon.de/stores/ESN/page/F5F8CAD5-7990-44CF-9F5B-61DFFF5E8581', category: 'supplements', quality: 5 },
  { file: 'ag1', brand: 'AG1', url: 'https://www.amazon.de/stores/AG1/page/E676C84A-8A86-4F92-B978-3343F367DD0C', category: 'supplements', quality: 5 },
  { file: 'nespresso', brand: 'Nespresso', url: 'https://www.amazon.de/stores/page/2429E3F3-8BFA-466A-9185-35FB47867B06', category: 'food', quality: 5 },
  { file: 'kaercher', brand: 'Kärcher', url: 'https://www.amazon.de/stores/Kärcher/page/EFE3653A-1163-432C-A85B-0486A31C0E3D', category: 'household', quality: 5 },
  { file: 'blackroll', brand: 'BLACKROLL', url: 'https://www.amazon.de/stores/page/870649DE-4F7E-421F-B141-C4C47864D539', category: 'fitness', quality: 5 },
  { file: 'more-nutrition', brand: 'MORE Nutrition', url: 'https://www.amazon.de/stores/page/7AD425C6-C3C5-402D-A69D-D6201F98F888', category: 'supplements', quality: 4 },
  { file: 'hansegruen', brand: 'Hansegrün', url: 'https://www.amazon.de/stores/page/BC9A9642-4612-460E-81B4-985E9AF6A7D2', category: 'home_kitchen', quality: 4 },
  { file: 'holy-energy', brand: 'HOLY Energy', url: 'https://www.amazon.de/stores/HOLYEnergy/page/7913E121-CB43-4349-A8D2-9F0843B226E4', category: 'food', quality: 4 },
  { file: 'manscaped', brand: 'Manscaped', url: 'https://www.amazon.de/stores/page/44908195-3880-47D6-9EC0-D2A1543EB718', category: 'beauty', quality: 4 },
  { file: 'desktronic', brand: 'Desktronic', url: 'https://www.amazon.de/stores/Desktronic/page/1A862649-6CEA-4E30-855F-0C27A1F99A6C', category: 'office', quality: 4 },
  { file: 'cloudpillo', brand: 'Cloudpillo', url: 'https://www.amazon.de/stores/Cloudpillo/page/741141B6-87D5-44F9-BE63-71B55CD51198', category: 'home_kitchen', quality: 4 },
  { file: 'bedsure', brand: 'Bedsure', url: 'https://www.amazon.de/stores/page/7DC5A9F8-2A3D-426B-B2F2-F819AE825B1F', category: 'home_kitchen', quality: 4 },
  { file: 'feandrea', brand: 'Feandrea', url: 'https://www.amazon.de/stores/page/FB4FA857-CD07-4E92-A32C-CF0CD556ACF6', category: 'pets', quality: 4 },
  { file: 'nucompany', brand: 'the nu company', url: 'https://www.amazon.de/stores/thenucompany/page/A096FF51-79D5-440D-8789-6255E9DFE87D', category: 'food', quality: 4 },
  { file: 'klosterkitchen', brand: 'Kloster Kitchen', url: 'https://www.amazon.de/stores/page/34D4A812-9A68-4602-A6A0-30565D399620', category: 'food', quality: 4 },
  { file: 'bears-with-benefits', brand: 'Bears with Benefits', url: 'https://www.amazon.de/stores/BearswithBenefits/page/AFC77FAF-F173-4A4E-A7DF-8779F7E16E97', category: 'supplements', quality: 2 },
  { file: 'twentythree', brand: 'twentythree', url: 'https://www.amazon.de/stores/twentythree/page/0E8D9A31-200C-4EC5-BC94-CBBC023B28A4', category: 'home_kitchen', quality: 3 },
  { file: 'gritin', brand: 'Gritin', url: 'https://www.amazon.de/stores/page/1758941C-AE87-4628-AB45-62C0A2BDB75C', category: 'home_kitchen', quality: 3 },
  { file: 'trixie', brand: 'TRIXIE', url: 'https://www.amazon.de/stores/page/30552E59-AC22-47B1-BBBB-AEA9225BD614', category: 'pets', quality: 3 },
  { file: 'nightcat', brand: 'Night Cat', url: 'https://www.amazon.de/stores/page/CC609240-DCC5-47C5-A171-3B973268CD34', category: 'sports', quality: 2 },
  { file: 'masterchef', brand: 'MasterChef', url: 'https://www.amazon.de/stores/page/4E8E4B73-1DA5-45E1-8EFA-5EB4A3A758F6', category: 'kitchen', quality: 2 },
];

export default function AdminAnalyze() {
  var [results, setResults] = useState({});
  var [running, setRunning] = useState(null);
  var [runAllActive, setRunAllActive] = useState(false);
  var cancelRef = useRef(false);

  async function analyzeStore(store) {
    setRunning(store.file);
    setResults(function(prev) {
      var next = Object.assign({}, prev);
      next[store.file] = { status: 'running', message: 'Crawling + analyzing...' };
      return next;
    });

    try {
      var resp = await fetch('/api/enrich-reference-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl: store.url,
          brandName: store.brand,
          maxImagesPerPage: 25,
        }),
      });

      if (!resp.ok) {
        var errText = await resp.text();
        throw new Error('HTTP ' + resp.status + ': ' + errText.slice(0, 200));
      }

      var data = await resp.json();
      var pages = data.pagesAnalyzed || 0;
      var images = (data.storeTotals || {}).totalImages || 0;
      var sections = (data.storeTotals || {}).totalSections || 0;

      // Save to reference-stores API
      try {
        await fetch('/api/reference-stores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: store.file,
            brandName: store.brand,
            storeUrl: store.url,
            marketplace: 'de',
            category: store.category,
            pageCount: pages,
            imageCount: images,
            qualityScore: store.quality,
            parsedData: JSON.stringify(data),
            imageAnalyses: JSON.stringify((data.pages || []).map(function(p) { return p.pageAnalysis; }).filter(Boolean)),
          }),
        });
      } catch (saveErr) {
        // DB save is optional, continue
      }

      setResults(function(prev) {
        var next = Object.assign({}, prev);
        next[store.file] = {
          status: 'done',
          pages: pages,
          images: images,
          sections: sections,
          subpages: data.subpagesFound || 0,
          message: pages + ' pages, ' + images + ' images, ' + sections + ' sections',
        };
        return next;
      });
    } catch (err) {
      setResults(function(prev) {
        var next = Object.assign({}, prev);
        next[store.file] = { status: 'error', message: err.message };
        return next;
      });
    }

    setRunning(null);
  }

  async function runAll() {
    cancelRef.current = false;
    setRunAllActive(true);
    for (var i = 0; i < STORES.length; i++) {
      if (cancelRef.current) break;
      if (results[STORES[i].file] && results[STORES[i].file].status === 'done') continue;
      await analyzeStore(STORES[i]);
      // Wait between stores
      if (i < STORES.length - 1 && !cancelRef.current) {
        await new Promise(function(r) { setTimeout(r, 3000); });
      }
    }
    setRunAllActive(false);
  }

  function stopAll() {
    cancelRef.current = true;
    setRunAllActive(false);
  }

  var doneCount = STORES.filter(function(s) { return results[s.file] && results[s.file].status === 'done'; }).length;
  var errorCount = STORES.filter(function(s) { return results[s.file] && results[s.file].status === 'error'; }).length;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Reference Store Analyzer</h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0 0' }}>
          Phase 0: Crawl all 23 reference Brand Stores, analyze every page with Gemini Vision.
          Each store takes 1-5 minutes depending on page count.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {runAllActive ? (
          <button onClick={stopAll} style={{ padding: '8px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Stop
          </button>
        ) : (
          <button onClick={runAll} disabled={!!running} style={{ padding: '8px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: running ? 'wait' : 'pointer', opacity: running ? 0.5 : 1 }}>
            Alle analysieren
          </button>
        )}
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {doneCount}/{STORES.length} fertig{errorCount > 0 ? ', ' + errorCount + ' Fehler' : ''}
        </span>
        {doneCount > 0 && (
          <div style={{ marginLeft: 'auto', width: 200, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: Math.round(100 * doneCount / STORES.length) + '%', height: '100%', background: '#22c55e', borderRadius: 3, transition: 'width .3s' }} />
          </div>
        )}
      </div>

      {/* Store list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {STORES.map(function(store) {
          var r = results[store.file];
          var isRunning = running === store.file;
          var isDone = r && r.status === 'done';
          var isError = r && r.status === 'error';

          return (
            <div key={store.file} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: isDone ? '#f0fdf4' : isError ? '#fef2f2' : isRunning ? '#eff6ff' : '#fff',
              border: '1px solid ' + (isDone ? '#bbf7d0' : isError ? '#fecaca' : isRunning ? '#bfdbfe' : '#e2e8f0'),
              borderRadius: 8,
            }}>
              {/* Status indicator */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: isDone ? '#22c55e' : isError ? '#ef4444' : isRunning ? '#3b82f6' : '#d1d5db',
                animation: isRunning ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }} />

              {/* Store info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{store.brand}</span>
                  <span style={{ fontSize: 10, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 3 }}>{store.category}</span>
                  <span style={{ fontSize: 10, color: '#f59e0b' }}>{'★'.repeat(store.quality)}</span>
                </div>
                {r && r.message && (
                  <div style={{ fontSize: 11, color: isDone ? '#166534' : isError ? '#991b1b' : '#1e40af', marginTop: 2 }}>
                    {r.message.slice(0, 150)}
                  </div>
                )}
              </div>

              {/* Action button */}
              <button
                onClick={function() { analyzeStore(store); }}
                disabled={!!running || runAllActive}
                style={{
                  padding: '5px 14px', fontSize: 11, fontWeight: 600, borderRadius: 5, border: 'none', cursor: (running || runAllActive) ? 'not-allowed' : 'pointer',
                  background: isDone ? '#dcfce7' : isError ? '#fee2e2' : '#f1f5f9',
                  color: isDone ? '#166534' : isError ? '#991b1b' : '#475569',
                  opacity: (running || runAllActive) ? 0.5 : 1,
                }}>
                {isDone ? 'Nochmal' : isError ? 'Retry' : isRunning ? '...' : 'Analysieren'}
              </button>
            </div>
          );
        })}
      </div>

      <style>{'\
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }\
      '}</style>
    </div>
  );
}
