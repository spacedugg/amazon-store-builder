import { useState, useRef, useCallback, useEffect } from 'react';
import { LANGS, DOMAINS } from '../constants';
import { scrapeAsins, analyzeBrandCI, scrapeWebsite, discoverBrandProducts } from '../api';
import { analyzeOneProduct, groupIntoCategories, analyzeWebsitePage, synthesizeBrandProfile, planPages, generateOnePage } from '../contentPipeline';
import { analyzeBrandVoice } from '../generationPipeline';
import { loadStoreKnowledge, formatStoreKnowledge } from '../referenceStoreService';

// ─── GENERATION WIZARD ───
// Multi-step process with checkpoints where the user can review and adjust.
// Each step runs, shows results, and waits for user approval before continuing.
// State is persisted to Turso DB at each checkpoint so the user can close the
// tab and resume later.
//
// Steps:
//   0. Input (brand, ASINs, website, logo, fonts, colors, tone)
//   1. Scraping (automatic, no checkpoint) — ASINs, website, CI analysis
//   2. Brand Analysis checkpoint (voice, USPs, CI colors, store-type tendency)
//   3. Categories checkpoint (category naming + ASIN assignment)
//   4. Content checkpoint (USPs, texts, image ideas, CTAs per page)
//   5. Page Structure checkpoint (sections, layouts, tile types per page)
//   6. Generation (automatic) — pages generated one by one
//   7. Done

var STEP_LABELS = [
  'Input',
  'Scraping',
  'Brand Analysis',
  'Categories',
  'Content',
  'Structure',
  'Generation',
  'Done',
];

// Parse ASINs from uploaded file text (reused logic from GenerateModal)
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

// ─── CHECKPOINT PERSISTENCE ───
// Save wizard state to Turso DB so user can close tab and resume later.
async function saveCheckpoint(id, step, brandName, state) {
  try {
    var resp = await fetch('/api/wizard-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, step: step, brandName: brandName, state: state }),
    });
    if (!resp.ok) return null;
    var json = await resp.json();
    return json.id;
  } catch (e) {
    console.warn('Checkpoint save failed:', e.message);
    return null;
  }
}

async function loadCheckpoint(id) {
  try {
    var resp = await fetch('/api/wizard-state?id=' + encodeURIComponent(id));
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) { return null; }
}

// Empty initial state for a fresh wizard run
function emptyData() {
  return {
    // Step 0: Input
    brand: '',
    marketplace: 'de',
    asins: [],
    websiteUrl: '',
    logoFile: null,
    fontNames: '',
    brandColors: '',
    brandToneExamples: '',
    extraPages: {},
    // Step 1: Scraped data
    products: null,
    websiteData: null,
    productCI: null,
    websiteAnalyses: null,
    productAnalyses: null,
    // Step 2: Brand analysis
    brandVoice: null,
    brandProfile: null,
    storeType: null,
    // Step 3: Categories
    categories: null,
    // Step 4: Content (per-page, edited by user)
    pageContent: null,
    // Step 5: Structure (per-page sections + layouts)
    pageStructure: null,
    // Step 6: Generated pages
    generatedPages: null,
  };
}

export default function GenerationWizard({ resumeId, onComplete, onCancel }) {
  var [step, setStep] = useState(0);
  var [log, setLog] = useState([]);
  var [running, setRunning] = useState(false);
  var [error, setError] = useState('');
  var [checkpointId, setCheckpointId] = useState(resumeId || null);
  var [data, setData] = useState(emptyData());
  var cancelRef = useRef(false);
  var logRef = useRef(null);

  // Resume from checkpoint if ID provided
  useEffect(function() {
    if (!resumeId) return;
    loadCheckpoint(resumeId).then(function(cp) {
      if (cp && cp.state) {
        setData(Object.assign(emptyData(), cp.state));
        setStep(cp.step || 0);
        setCheckpointId(cp.id);
      }
    });
  }, [resumeId]);

  // Auto-scroll log panel
  useEffect(function() {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  var addLog = useCallback(function(msg) {
    setLog(function(prev) { return prev.concat([msg]); });
  }, []);

  var updateData = useCallback(function(patch) {
    setData(function(prev) { return Object.assign({}, prev, patch); });
  }, []);

  // Save checkpoint and advance to next step
  var advance = useCallback(async function(nextStep, stateOverrides) {
    var nextData = stateOverrides ? Object.assign({}, data, stateOverrides) : data;
    if (stateOverrides) setData(nextData);
    var id = await saveCheckpoint(checkpointId, nextStep, nextData.brand || '', nextData);
    if (id && !checkpointId) setCheckpointId(id);
    setStep(nextStep);
    setError('');
    setLog([]);
  }, [checkpointId, data]);

  // Render each step — each implemented in a dedicated sub-renderer below
  var stepContent;
  if (step === 0) stepContent = <StepInput data={data} updateData={updateData} onNext={function() { advance(1); }} />;
  else if (step === 1) stepContent = <StepScraping data={data} updateData={updateData} log={log} addLog={addLog} running={running} setRunning={setRunning} error={error} setError={setError} cancelRef={cancelRef} onNext={function(s) { advance(2, s); }} onBack={function() { setStep(0); }} />;
  else if (step === 2) stepContent = <StepBrandAnalysis data={data} updateData={updateData} onNext={function(s) { advance(3, s); }} onBack={function() { setStep(1); }} />;
  else if (step === 3) stepContent = <StepCategories data={data} updateData={updateData} onNext={function(s) { advance(4, s); }} onBack={function() { setStep(2); }} />;
  else if (step === 4) stepContent = <StepContent data={data} updateData={updateData} onNext={function(s) { advance(5, s); }} onBack={function() { setStep(3); }} />;
  else if (step === 5) stepContent = <StepStructure data={data} updateData={updateData} onNext={function(s) { advance(6, s); }} onBack={function() { setStep(4); }} />;
  else if (step === 6) stepContent = <StepGenerate data={data} updateData={updateData} log={log} addLog={addLog} running={running} setRunning={setRunning} error={error} setError={setError} cancelRef={cancelRef} onDone={function(storeObj) { setStep(7); if (onComplete) onComplete(storeObj); }} onBack={function() { setStep(5); }} />;
  else stepContent = <StepDone data={data} onClose={onCancel} />;

  return (
    <div className="modal-overlay" onClick={function(e) { if (running) return; if (e.target === e.currentTarget && onCancel) onCancel(); }}>
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 1000, width: '94%', maxHeight: '94vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 28px 12px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Store-Generator</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Schritt {step + 1} von {STEP_LABELS.length}: {STEP_LABELS[step]}
                {checkpointId ? ' · Gespeichert (ID ' + checkpointId.slice(0, 6) + '...)' : ''}
              </div>
            </div>
            <button onClick={onCancel} disabled={running} className="btn" style={{ padding: '4px 10px', fontSize: 11 }}>
              {running ? 'Läuft...' : 'Schließen'}
            </button>
          </div>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {STEP_LABELS.map(function(label, i) {
              var isDone = i < step;
              var isActive = i === step;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: isActive ? '#FF9900' : isDone ? '#10b981' : '#e2e8f0',
                    color: (isActive || isDone) ? '#fff' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>{isDone ? '✓' : i}</div>
                  <div style={{ fontSize: 10, color: isActive ? '#0f172a' : '#94a3b8', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label}
                  </div>
                  {i < STEP_LABELS.length - 1 && <div style={{ flex: 1, height: 1, background: isDone ? '#10b981' : '#e2e8f0', minWidth: 8 }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
          {error && (
            <div style={{ marginBottom: 12, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#991b1b' }}>
              {error}
            </div>
          )}
          {stepContent}
        </div>

        {/* Log panel (for automatic steps) */}
        {(step === 1 || step === 6) && log.length > 0 && (
          <div ref={logRef} style={{ maxHeight: 160, overflow: 'auto', padding: '10px 28px', borderTop: '1px solid #e2e8f0', background: '#0f172a', color: '#94a3b8', fontFamily: 'ui-monospace, monospace', fontSize: 11, lineHeight: 1.5 }}>
            {log.map(function(line, i) {
              var color = '#cbd5e1';
              if (line.indexOf('ERROR') === 0 || line.indexOf('FAIL') >= 0) color = '#f87171';
              else if (line.indexOf('✓') >= 0 || line.indexOf('complete') >= 0) color = '#4ade80';
              else if (line.indexOf('═══') >= 0) color = '#fbbf24';
              return <div key={i} style={{ color: color }}>{line}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 0: INPUT — brand, ASINs, website, logo, fonts, colors, tone examples
// ═══════════════════════════════════════════════════════════════════════════
function StepInput({ data, updateData, onNext }) {
  var [asinMode, setAsinMode] = useState('list'); // 'list' | 'brandUrl'
  var [pasteText, setPasteText] = useState('');
  var [brandUrl, setBrandUrl] = useState('');
  var [discovering, setDiscovering] = useState(false);
  var [discoverMsg, setDiscoverMsg] = useState('');
  var fileRef = useRef(null);
  var logoRef = useRef(null);

  var onFileChange = function(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function(ev) { updateData({ asins: parseAsinFile(ev.target.result) }); };
    reader.readAsText(f);
    if (fileRef.current) fileRef.current.value = '';
  };

  var onPasteConfirm = function() {
    if (pasteText.trim()) { updateData({ asins: parseAsinFile(pasteText) }); setPasteText(''); }
  };

  var onBrandDiscover = async function() {
    if (!brandUrl.trim()) return;
    setDiscovering(true);
    setDiscoverMsg('Starte Discovery...');
    try {
      var result = await discoverBrandProducts(brandUrl.trim(), function(msg) { setDiscoverMsg(msg); });
      if (result.asins && result.asins.length > 0) {
        var patch = { asins: result.asins };
        if (!data.brand && result.products && result.products[0] && result.products[0].brand) {
          patch.brand = result.products[0].brand;
        }
        updateData(patch);
        setAsinMode('list');
        setDiscoverMsg(result.asins.length + ' ASINs gefunden.');
      } else {
        setDiscoverMsg('Keine Produkte gefunden. Prüfe die URL.');
      }
    } catch (err) {
      setDiscoverMsg('Fehler: ' + err.message);
    } finally {
      setDiscovering(false);
    }
  };

  var onLogoChange = function(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function(ev) { updateData({ logoFile: ev.target.result }); };
    reader.readAsDataURL(f);
    if (logoRef.current) logoRef.current.value = '';
  };

  var canProceed = data.brand && data.brand.trim() && (data.asins || []).length > 0;

  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16, padding: '10px 12px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
        Gib alle Basisdaten der Marke ein. Der Wizard führt dich danach durch 6 weitere Schritte — bei jedem Checkpoint kannst du die Ergebnisse prüfen, anpassen und gegebenenfalls das Fenster schließen und später weitermachen.
      </div>

      {/* Brand Name */}
      <label className="label">Markenname *</label>
      <input className="input" value={data.brand || ''} onChange={function(e) { updateData({ brand: e.target.value }); }} placeholder="z.B. Futum, Kärcher, Nespresso" />

      {/* Marketplace */}
      <label className="label" style={{ marginTop: 10 }}>Marketplace</label>
      <select className="input" value={data.marketplace || 'de'} onChange={function(e) { updateData({ marketplace: e.target.value }); }}>
        <option value="de">Amazon.de (Deutschland)</option>
        <option value="com">Amazon.com (USA)</option>
        <option value="co.uk">Amazon.co.uk (UK)</option>
        <option value="fr">Amazon.fr (Frankreich)</option>
      </select>

      {/* ASINs */}
      <label className="label" style={{ marginTop: 10 }}>Produkt-ASINs *</label>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <button className={'btn' + (asinMode === 'list' ? ' btn-primary' : '')} style={{ fontSize: 11 }} onClick={function() { setAsinMode('list'); }}>ASIN-Liste</button>
        <button className={'btn' + (asinMode === 'brandUrl' ? ' btn-primary' : '')} style={{ fontSize: 11 }} onClick={function() { setAsinMode('brandUrl'); }}>Brand-URL auto-discover</button>
      </div>
      {asinMode === 'list' ? (
        <div>
          <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" style={{ display: 'none' }} onChange={onFileChange} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={'btn' + ((data.asins || []).length ? ' btn-green' : '')} style={{ flex: 1, padding: 8 }} onClick={function() { fileRef.current && fileRef.current.click(); }}>
              {(data.asins || []).length ? (data.asins.length + ' ASINs geladen') : 'CSV / TXT hochladen'}
            </button>
          </div>
          <textarea className="input" style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 11 }} rows={3} placeholder="Oder ASINs hier einfügen (B0XXXXXXXXXX pro Zeile)" value={pasteText} onChange={function(e) { setPasteText(e.target.value); }} />
          {pasteText.trim() && <button className="btn" style={{ fontSize: 11, marginTop: 4 }} onClick={onPasteConfirm}>ASINs parsen</button>}
          {(data.asins || []).length > 0 && (
            <div style={{ marginTop: 6, padding: '6px 8px', background: '#f1f5f9', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: '#475569' }}>
              {data.asins.slice(0, 8).join(', ')}{data.asins.length > 8 ? ' + ' + (data.asins.length - 8) + ' weitere' : ''}
            </div>
          )}
        </div>
      ) : (
        <div>
          <input className="input" value={brandUrl} onChange={function(e) { setBrandUrl(e.target.value); }} placeholder="https://www.amazon.de/stores/BRAND/page/..." />
          <button className="btn btn-primary" style={{ marginTop: 4, fontSize: 11 }} disabled={!brandUrl.trim() || discovering} onClick={onBrandDiscover}>
            {discovering ? 'Suche läuft...' : 'Produkte finden'}
          </button>
          {discoverMsg && <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>{discoverMsg}</div>}
        </div>
      )}

      {/* Website URL */}
      <label className="label" style={{ marginTop: 10 }}>Marken-Website (optional, stark empfohlen)</label>
      <input className="input" value={data.websiteUrl || ''} onChange={function(e) { updateData({ websiteUrl: e.target.value }); }} placeholder="https://www.brand-shop.de" />
      <div className="hint">Die KI extrahiert USPs, Markengeschichte und Zertifikate. Ohne Website muss nur auf Amazon-Daten zugegriffen werden.</div>

      {/* Logo */}
      <label className="label" style={{ marginTop: 10 }}>Logo (optional)</label>
      <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onLogoChange} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button className="btn" style={{ fontSize: 11 }} onClick={function() { logoRef.current && logoRef.current.click(); }}>
          {data.logoFile ? 'Logo ändern' : 'Logo hochladen'}
        </button>
        {data.logoFile && <img src={data.logoFile} alt="" style={{ height: 28, borderRadius: 4, border: '1px solid #e2e8f0' }} />}
        {data.logoFile && <button className="btn" style={{ fontSize: 11 }} onClick={function() { updateData({ logoFile: null }); }}>Entfernen</button>}
      </div>

      {/* Fonts */}
      <label className="label" style={{ marginTop: 10 }}>Schriftarten (optional)</label>
      <input className="input" value={data.fontNames || ''} onChange={function(e) { updateData({ fontNames: e.target.value }); }} placeholder="z.B. Montserrat, Open Sans" />

      {/* Brand Colors */}
      <label className="label" style={{ marginTop: 10 }}>Markenfarben Hex (optional)</label>
      <input className="input" style={{ fontFamily: 'monospace' }} value={data.brandColors || ''} onChange={function(e) { updateData({ brandColors: e.target.value }); }} placeholder="z.B. #2D5016, #F5F0E8, #8B6914" />

      {/* Tone Examples */}
      <label className="label" style={{ marginTop: 10 }}>Beispiele für den Marken-Ton (optional)</label>
      <textarea className="input" rows={2} value={data.brandToneExamples || ''} onChange={function(e) { updateData({ brandToneExamples: e.target.value }); }} placeholder="2-3 Beispielsätze, die den Ton der Marke zeigen (aus Listings oder Website)" />
      <div className="hint">Werden als Stil-Referenz genutzt, nicht 1:1 kopiert.</div>

      {/* Extra Pages */}
      <label className="label" style={{ marginTop: 10 }}>Zusatzseiten (optional)</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        {[
          { key: 'about_us', label: 'Über uns' },
          { key: 'bestsellers', label: 'Bestseller' },
          { key: 'sustainability', label: 'Nachhaltigkeit' },
          { key: 'how_it_works', label: 'So funktioniert\'s' },
          { key: 'new_arrivals', label: 'Neuheiten' },
          { key: 'gift_sets', label: 'Geschenk-Sets' },
          { key: 'subscribe_save', label: 'Spar-Abo' },
          { key: 'deals', label: 'Angebote' },
        ].map(function(opt) {
          var checked = !!(data.extraPages && data.extraPages[opt.key]);
          return (
            <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={checked} onChange={function() {
                var next = Object.assign({}, data.extraPages || {});
                next[opt.key] = !checked;
                updateData({ extraPages: next });
              }} />
              {opt.label}
            </label>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button className="btn btn-primary" disabled={!canProceed} onClick={onNext}>
          Weiter — Scraping starten ({(data.asins || []).length} ASINs)
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: SCRAPING — automatic. Scrapes ASINs, website, runs per-product CI
// analysis and per-product AI analysis. No checkpoint — advances to Step 2
// as soon as all scraping finishes.
// ═══════════════════════════════════════════════════════════════════════════
function StepScraping({ data, updateData, log, addLog, running, setRunning, error, setError, cancelRef, onNext, onBack }) {
  var [finished, setFinished] = useState(!!data.products);
  var startedRef = useRef(false);

  var runScraping = async function() {
    if (running) return;
    cancelRef.current = false;
    setRunning(true);
    setError('');
    setFinished(false);

    try {
      var domain = DOMAINS[data.marketplace] || DOMAINS.de;

      // 1. Scrape ASINs via Bright Data
      addLog('═══ Scraping ' + data.asins.length + ' ASINs von Amazon.' + data.marketplace + ' ═══');
      var scrapeResult = await scrapeAsins(data.asins, domain);
      var products = scrapeResult.products || [];
      if (!products.length) throw new Error('Keine Produkte zurückgegeben. Prüfe die ASINs.');
      addLog('✓ ' + products.length + '/' + data.asins.length + ' Produkte gescrapt');

      if (cancelRef.current) throw new Error('CANCELLED');

      // 2. Website scraping (optional)
      var websiteData = null;
      if (data.websiteUrl && data.websiteUrl.trim()) {
        addLog('');
        addLog('═══ Website-Scraping: ' + data.websiteUrl + ' ═══');
        try {
          websiteData = await scrapeWebsite(data.websiteUrl.trim());
          addLog('✓ Website gescrapt: ' + (websiteData.pagesScraped || 0) + ' Seiten');
        } catch (wsErr) {
          addLog('⚠ Website-Scraping fehlgeschlagen: ' + wsErr.message);
        }
      }

      if (cancelRef.current) throw new Error('CANCELLED');

      // 3. Per-product CI analysis via Gemini Vision
      addLog('');
      addLog('═══ CI-Analyse pro Produkt (Gemini Vision) ═══');
      var allCiResults = [];
      for (var pi = 0; pi < products.length; pi++) {
        if (cancelRef.current) throw new Error('CANCELLED');
        var pImgs = (products[pi].images || []).map(function(img) {
          var u = typeof img === 'string' ? img : (img.url || '');
          return u ? { url: u, context: products[pi].name } : null;
        }).filter(Boolean);
        if (pImgs.length === 0) { continue; }
        addLog('   Produkt ' + (pi + 1) + '/' + products.length + ': ' + pImgs.length + ' Bilder — ' + (products[pi].name || '').slice(0, 50));
        try {
          var batchCI = await analyzeBrandCI(pImgs, data.brand);
          if (batchCI && (batchCI.primaryColors || batchCI.visualMood)) {
            allCiResults.push(batchCI);
          }
        } catch (batchErr) {
          addLog('     ⚠ Fehler: ' + batchErr.message);
        }
        if (pi < products.length - 1) await new Promise(function(r) { setTimeout(r, 400); });
      }

      // Merge CI results
      var productCI = null;
      if (allCiResults.length > 0) {
        productCI = allCiResults[0];
        var colorCount = {};
        allCiResults.forEach(function(r) {
          (r.primaryColors || []).forEach(function(c) { colorCount[c] = (colorCount[c] || 0) + 1; });
          (r.secondaryColors || []).forEach(function(c) { colorCount[c] = (colorCount[c] || 0) + 1; });
        });
        productCI.primaryColors = Object.entries(colorCount).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 8).map(function(e) { return e[0]; });
        addLog('✓ CI aggregiert — Hauptfarben: ' + productCI.primaryColors.join(', '));
      }

      if (cancelRef.current) throw new Error('CANCELLED');

      // 4. Per-product AI analysis (category, benefits, features)
      addLog('');
      addLog('═══ Produkt-Analyse (Claude, pro Produkt) ═══');
      var productAnalyses = [];
      for (var qi = 0; qi < products.length; qi++) {
        if (cancelRef.current) throw new Error('CANCELLED');
        var p = products[qi];
        addLog('   Analyse ' + (qi + 1) + '/' + products.length + ': ' + (p.name || '').slice(0, 50));
        try {
          var pa = await analyzeOneProduct(p);
          pa.asin = p.asin;
          pa.name = p.name;
          productAnalyses.push(pa);
        } catch (paErr) {
          addLog('     ⚠ Analyse fehlgeschlagen, fallback');
          productAnalyses.push({ asin: p.asin, name: p.name, productCategory: 'Uncategorized', keyBenefits: [], shortHeadline: p.name, shortDescription: '' });
        }
        if (qi < products.length - 1) await new Promise(function(r) { setTimeout(r, 300); });
      }
      addLog('✓ ' + productAnalyses.length + ' Produkte analysiert');

      if (cancelRef.current) throw new Error('CANCELLED');

      // 5. Per-website-page analysis (optional)
      var websiteAnalyses = [];
      if (websiteData && websiteData.rawTextSections && websiteData.rawTextSections.length > 0) {
        addLog('');
        addLog('═══ Website-Seiten analysieren ═══');
        for (var wi = 0; wi < websiteData.rawTextSections.length; wi++) {
          if (cancelRef.current) throw new Error('CANCELLED');
          var section = websiteData.rawTextSections[wi];
          if (!section.text || section.text.length < 50) continue;
          addLog('   Seite ' + (wi + 1) + '/' + websiteData.rawTextSections.length + ': ' + section.source);
          try {
            var wa = await analyzeWebsitePage(section.text, section.source, data.brand);
            websiteAnalyses.push(wa);
          } catch (waErr) {
            addLog('     ⚠ ' + waErr.message);
          }
          if (wi < websiteData.rawTextSections.length - 1) await new Promise(function(r) { setTimeout(r, 300); });
        }
        addLog('✓ ' + websiteAnalyses.length + ' Website-Seiten analysiert');
      }

      addLog('');
      addLog('═══ SCRAPING KOMPLETT ═══');
      setFinished(true);
      setRunning(false);

      // Auto-advance to brand analysis step with gathered data
      onNext({
        products: products,
        websiteData: websiteData,
        productCI: productCI,
        productAnalyses: productAnalyses,
        websiteAnalyses: websiteAnalyses,
      });
    } catch (e) {
      setRunning(false);
      if (e.message === 'CANCELLED') {
        addLog('⚠ Abgebrochen.');
        setError('Scraping abgebrochen.');
      } else {
        addLog('ERROR: ' + e.message);
        setError(e.message);
      }
    }
  };

  // Auto-start scraping when step is mounted (only once)
  useEffect(function() {
    if (!startedRef.current && !data.products && !running) {
      startedRef.current = true;
      runScraping();
    }
  }, []);

  return (
    <div>
      <div style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
        <strong>Automatisch:</strong> ASINs werden gescrapt, Website wird gecrawlt, CI wird pro Produkt analysiert.
        Dieser Schritt hat keinen Checkpoint — er läuft bis zum Ende durch.
      </div>
      {running && (
        <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#92400e', marginBottom: 12 }}>
          Scraping läuft... Bitte Tab geöffnet lassen. Kann einige Minuten dauern.
        </div>
      )}
      {finished && !running && (
        <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, color: '#166534', marginBottom: 12 }}>
          ✓ Scraping abgeschlossen. Weiter zu Schritt 2 (Brand Analysis).
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn" onClick={onBack} disabled={running}>Zurück</button>
        {!running && !finished && (
          <button className="btn btn-primary" onClick={runScraping}>Erneut versuchen</button>
        )}
        {running && (
          <button className="btn" onClick={function() { cancelRef.current = true; }}>Abbrechen</button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: BRAND ANALYSIS CHECKPOINT
// Derives brand voice, synthesizes the brand profile (USPs, brand story,
// trust elements, hero concept), and detects a store-type TENDENCY (HINT).
// User reviews and can edit all fields. Store type is only a hint — no rules
// are enforced from it.
// ═══════════════════════════════════════════════════════════════════════════

// Heuristic: detect a store-type tendency from products + categories.
// HINT ONLY — does not force any layout or structure.
function detectStoreTypeTendency(products, categories) {
  var nProducts = (products || []).length;
  var nCategories = ((categories && categories.categories) || []).length;
  var hints = [];
  if (nProducts >= 40) hints.push('category-navigation');
  if (nCategories >= 4 && nProducts / Math.max(1, nCategories) < 5) hints.push('category-navigation');
  // Variants: products with similar names but different sizes/flavors
  var nameTokens = {};
  (products || []).forEach(function(p) {
    var base = (p.name || '').replace(/\s+(size|gr|g|kg|ml|l|pack|pcs|stk)\b.*/i, '').trim().toLowerCase().slice(0, 30);
    if (base) nameTokens[base] = (nameTokens[base] || 0) + 1;
  });
  var variantClusters = Object.values(nameTokens).filter(function(n) { return n >= 3; }).length;
  if (variantClusters >= 2) hints.push('variant-store');
  // Feature explanation: few products with rich bullet points
  var avgBullets = (products || []).reduce(function(sum, p) { return sum + ((p.bulletPoints || []).length); }, 0) / Math.max(1, nProducts);
  if (nProducts <= 8 && avgBullets >= 5) hints.push('feature-explanation');
  // Product showcase as default when none of the above dominate
  if (hints.length === 0) hints.push('product-showcase');
  // Most-likely primary tendency
  return hints[0];
}

function StepBrandAnalysis({ data, updateData, onNext, onBack }) {
  var [analyzing, setAnalyzing] = useState(false);
  var [analysisError, setAnalysisError] = useState('');
  var analyzedRef = useRef(false);

  // Run analysis once when entering this step (only if not already done)
  var runAnalysis = async function() {
    if (analyzing) return;
    setAnalyzing(true);
    setAnalysisError('');
    try {
      var lang = LANGS[data.marketplace] || 'German';
      var websiteTexts = data.websiteData ? (data.websiteData.aboutText || data.websiteData.rawTextContent || '') : '';

      // 1. Brand voice
      var brandVoice = data.brandVoice;
      if (!brandVoice) {
        brandVoice = await analyzeBrandVoice(data.products || [], data.brand, websiteTexts, data.brandToneExamples || '');
      }

      // 2. Initial categorization (needed for brand profile synthesis)
      var categories = data.categories;
      if (!categories) {
        categories = await groupIntoCategories(data.productAnalyses || [], data.brand, lang);
      }

      // 3. Brand profile synthesis
      var brandProfile = data.brandProfile;
      if (!brandProfile) {
        brandProfile = await synthesizeBrandProfile(data.productAnalyses || [], data.websiteAnalyses || [], categories, brandVoice, data.brand, lang);
      }

      // 4. Store type tendency (heuristic, HINT only)
      var storeType = data.storeType || detectStoreTypeTendency(data.products, categories);

      updateData({
        brandVoice: brandVoice,
        brandProfile: brandProfile,
        categories: categories,
        storeType: storeType,
      });
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(function() {
    if (!analyzedRef.current && !data.brandProfile) {
      analyzedRef.current = true;
      runAnalysis();
    }
  }, []);

  var hasAnalysis = !!(data.brandVoice && data.brandProfile);

  // Editable USP list
  var usps = (data.brandProfile && data.brandProfile.usps) || [];
  var updateUsp = function(idx, newText) {
    var next = usps.slice();
    next[idx] = Object.assign({}, next[idx], { text: newText });
    updateData({ brandProfile: Object.assign({}, data.brandProfile, { usps: next }) });
  };
  var addUsp = function() {
    var next = usps.concat([{ text: '', source: 'manual' }]);
    updateData({ brandProfile: Object.assign({}, data.brandProfile, { usps: next }) });
  };
  var removeUsp = function(idx) {
    var next = usps.slice(); next.splice(idx, 1);
    updateData({ brandProfile: Object.assign({}, data.brandProfile, { usps: next }) });
  };

  var updateVoice = function(key, val) {
    updateData({ brandVoice: Object.assign({}, data.brandVoice || {}, { [key]: val }) });
  };
  var updateStory = function(key, val) {
    var story = Object.assign({}, (data.brandProfile && data.brandProfile.brandStory) || {}, { [key]: val });
    updateData({ brandProfile: Object.assign({}, data.brandProfile, { brandStory: story }) });
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
        <strong>Checkpoint:</strong> Prüfe die Markenanalyse und passe alles an. Dies ist die Grundlage für alle folgenden Schritte.
      </div>

      {analyzing && (
        <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#92400e', marginBottom: 12 }}>
          KI analysiert Brand Voice, USPs und Markenidentität... (Claude, ca. 30-60 Sek.)
        </div>
      )}
      {analysisError && (
        <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#991b1b', marginBottom: 12 }}>
          {analysisError} <button className="btn" style={{ marginLeft: 8, fontSize: 11 }} onClick={runAnalysis}>Erneut versuchen</button>
        </div>
      )}

      {hasAnalysis && (
        <>
          {/* Brand Voice */}
          <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Brand Voice</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Kommunikationsstil</div>
                <select className="input" value={data.brandVoice.communicationStyle || ''} onChange={function(e) { updateVoice('communicationStyle', e.target.value); }}>
                  <option value="formal">formal</option>
                  <option value="informal">informell</option>
                  <option value="mixed">gemischt</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Ansprache</div>
                <select className="input" value={data.brandVoice.addressing || ''} onChange={function(e) { updateVoice('addressing', e.target.value); }}>
                  <option value="du">du</option>
                  <option value="Sie">Sie</option>
                  <option value="neutral">neutral</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Tonalität</div>
                <input className="input" value={data.brandVoice.tone || ''} onChange={function(e) { updateVoice('tone', e.target.value); }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Typische Phrasen (komma-separiert)</div>
                <input className="input" value={(data.brandVoice.typicalPhrases || []).join(', ')} onChange={function(e) { updateVoice('typicalPhrases', e.target.value.split(',').map(function(s) { return s.trim(); }).filter(Boolean)); }} />
              </div>
            </div>
          </div>

          {/* USPs */}
          <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>USPs ({usps.length})</div>
              <button className="btn" style={{ fontSize: 10 }} onClick={addUsp}>+ USP hinzufügen</button>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>USPs kommen aus den echten Website-/Produktdaten — nicht erfunden.</div>
            {usps.map(function(usp, idx) {
              return (
                <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <input className="input" style={{ flex: 1 }} value={usp.text || ''} onChange={function(e) { updateUsp(idx, e.target.value); }} placeholder="USP-Text" />
                  <span style={{ fontSize: 10, color: '#94a3b8', alignSelf: 'center' }}>{usp.source || 'manual'}</span>
                  <button className="btn" style={{ fontSize: 10 }} onClick={function() { removeUsp(idx); }}>×</button>
                </div>
              );
            })}
            {usps.length === 0 && <div style={{ fontSize: 11, color: '#94a3b8' }}>Keine USPs gefunden. Füge welche hinzu oder setze die Website-URL in Schritt 0.</div>}
          </div>

          {/* Brand Story */}
          <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Brand Story</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 6 }}>
              <input type="checkbox" checked={!!(data.brandProfile.brandStory && data.brandProfile.brandStory.available)} onChange={function(e) { updateStory('available', e.target.checked); }} />
              Brand Story verfügbar
            </label>
            {data.brandProfile.brandStory && data.brandProfile.brandStory.available && (
              <>
                <input className="input" placeholder="Headline" value={data.brandProfile.brandStory.headline || ''} onChange={function(e) { updateStory('headline', e.target.value); }} />
                <textarea className="input" rows={3} style={{ marginTop: 4 }} placeholder="2-4 Sätze Markengeschichte" value={data.brandProfile.brandStory.text || ''} onChange={function(e) { updateStory('text', e.target.value); }} />
              </>
            )}
          </div>

          {/* CI Colors */}
          {data.productCI && (data.productCI.primaryColors || []).length > 0 && (
            <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>CI-Farben (aus Produktbildern)</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {data.productCI.primaryColors.map(function(c, i) {
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 2, background: c, border: '1px solid rgba(0,0,0,.1)' }} />
                      <span style={{ fontSize: 10, fontFamily: 'monospace' }}>{c}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Store Type (HINT) */}
          <div style={{ padding: 14, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Store-Typ Tendenz (nur Hinweis)</div>
            <div style={{ fontSize: 11, color: '#92400e', marginBottom: 8 }}>
              Das ist ein Hinweis — keine Vorschrift. Beeinflusst die KI-Tendenz, aber keine starren Regeln.
            </div>
            <select className="input" value={data.storeType || 'product-showcase'} onChange={function(e) { updateData({ storeType: e.target.value }); }}>
              <option value="product-showcase">Product Showcase (viele Produkte vorstellen)</option>
              <option value="feature-explanation">Feature Explanation (wenige Produkte, Features erklären)</option>
              <option value="variant-store">Variant Store (Farben/Geschmäcker zeigen)</option>
              <option value="category-navigation">Category Navigation (Großsortiment navigieren)</option>
              <option value="mixed">Mixed (Kombination aus mehreren)</option>
            </select>
          </div>
        </>
      )}

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        <button className="btn" onClick={onBack}>Zurück</button>
        <button className="btn btn-primary" disabled={!hasAnalysis || analyzing} onClick={function() { onNext({}); }}>
          Weiter zu Kategorien →
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: CATEGORIES CHECKPOINT
// User can rename categories, move ASINs, add/remove categories.
// Validation: every ASIN must be in at least one category.
// ═══════════════════════════════════════════════════════════════════════════
function StepCategories({ data, updateData, onNext, onBack }) {
  var categories = (data.categories && data.categories.categories) || [];
  var allAsins = data.asins || [];

  var renameCategory = function(idx, newName) {
    var next = categories.slice();
    next[idx] = Object.assign({}, next[idx], { name: newName });
    updateData({ categories: { categories: next } });
  };

  var updateCategoryDesc = function(idx, desc) {
    var next = categories.slice();
    next[idx] = Object.assign({}, next[idx], { description: desc });
    updateData({ categories: { categories: next } });
  };

  var addCategory = function() {
    var next = categories.concat([{ name: 'Neue Kategorie', asins: [], description: '' }]);
    updateData({ categories: { categories: next } });
  };

  var removeCategory = function(idx) {
    if (!confirm('Kategorie "' + categories[idx].name + '" wirklich löschen? Die enthaltenen ASINs werden nicht zugeordnet.')) return;
    var next = categories.slice(); next.splice(idx, 1);
    updateData({ categories: { categories: next } });
  };

  var toggleAsinInCategory = function(catIdx, asin) {
    var next = categories.slice();
    var cat = Object.assign({}, next[catIdx]);
    var asins = (cat.asins || []).slice();
    var pos = asins.indexOf(asin);
    if (pos >= 0) asins.splice(pos, 1);
    else asins.push(asin);
    cat.asins = asins;
    next[catIdx] = cat;
    updateData({ categories: { categories: next } });
  };

  var moveAsinToCategory = function(asin, targetCatIdx) {
    var next = categories.slice();
    // Remove from all categories first
    for (var i = 0; i < next.length; i++) {
      var cat = Object.assign({}, next[i]);
      cat.asins = (cat.asins || []).filter(function(a) { return a !== asin; });
      next[i] = cat;
    }
    // Add to target
    if (targetCatIdx >= 0 && next[targetCatIdx]) {
      var tgt = Object.assign({}, next[targetCatIdx]);
      tgt.asins = (tgt.asins || []).concat([asin]);
      next[targetCatIdx] = tgt;
    }
    updateData({ categories: { categories: next } });
  };

  // Validation: find ASINs not in any category
  var assignedAsins = {};
  categories.forEach(function(c) { (c.asins || []).forEach(function(a) { assignedAsins[a] = true; }); });
  var missingAsins = allAsins.filter(function(a) { return !assignedAsins[a]; });

  var productsByAsin = {};
  (data.products || []).forEach(function(p) { productsByAsin[p.asin] = p; });

  var canProceed = missingAsins.length === 0 && categories.length > 0;

  return (
    <div>
      <div style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
        <strong>Checkpoint:</strong> Prüfe die Kategorien. Du kannst Namen ändern, ASINs verschieben, Kategorien hinzufügen/entfernen. <strong>Jede ASIN muss in mindestens einer Kategorie sein.</strong>
      </div>

      {missingAsins.length > 0 && (
        <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#991b1b', marginBottom: 12 }}>
          ⚠ {missingAsins.length} ASIN{missingAsins.length === 1 ? '' : 's'} noch keiner Kategorie zugeordnet:
          <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {missingAsins.map(function(a) {
              var p = productsByAsin[a];
              return (
                <div key={a} style={{ padding: '3px 6px', background: '#fff', border: '1px solid #fecaca', borderRadius: 3, fontSize: 10 }}>
                  <strong>{a}</strong> {p ? ('— ' + (p.name || '').slice(0, 40)) : ''}
                  <select style={{ fontSize: 10, marginLeft: 4, border: '1px solid #e2e8f0', borderRadius: 3 }} value="" onChange={function(e) { if (e.target.value !== '') moveAsinToCategory(a, parseInt(e.target.value, 10)); }}>
                    <option value="">→ Kategorie...</option>
                    {categories.map(function(c, ci) { return <option key={ci} value={ci}>{c.name}</option>; })}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {categories.map(function(cat, idx) {
        return (
          <div key={idx} style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
              <input className="input" style={{ flex: 1, fontWeight: 600 }} value={cat.name || ''} onChange={function(e) { renameCategory(idx, e.target.value); }} />
              <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>{(cat.asins || []).length} Produkte</span>
              <button className="btn" style={{ fontSize: 10 }} onClick={function() { removeCategory(idx); }}>Löschen</button>
            </div>
            <input className="input" style={{ fontSize: 11, marginBottom: 6 }} placeholder="Kurze Beschreibung" value={cat.description || ''} onChange={function(e) { updateCategoryDesc(idx, e.target.value); }} />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(cat.asins || []).map(function(a) {
                var p = productsByAsin[a];
                return (
                  <div key={a} style={{ padding: '3px 6px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 3, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontFamily: 'monospace' }}>{a}</span>
                    <span style={{ color: '#64748b' }}>{p ? ((p.name || '').slice(0, 30) + ((p.name || '').length > 30 ? '...' : '')) : ''}</span>
                    <button onClick={function() { toggleAsinInCategory(idx, a); }} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: 0 }}>×</button>
                  </div>
                );
              })}
              {(cat.asins || []).length === 0 && <span style={{ fontSize: 10, color: '#94a3b8' }}>Keine Produkte zugeordnet</span>}
            </div>
          </div>
        );
      })}

      <button className="btn" style={{ fontSize: 11 }} onClick={addCategory}>+ Kategorie hinzufügen</button>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" onClick={onBack}>Zurück</button>
        <button className="btn btn-primary" disabled={!canProceed} onClick={function() { onNext({}); }}>
          {canProceed ? 'Weiter zu Content →' : ((missingAsins.length) + ' ASIN(s) fehlen noch')}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: CONTENT CHECKPOINT
// For each page (Homepage + one per category + extras), the user defines
// the CONTENT (headline, USPs for this page, image ideas, CTAs).
// No layouts here — only content. Layouts come in Step 5.
// ═══════════════════════════════════════════════════════════════════════════

function derivePageContent(data) {
  // Build an initial page-content list from brand profile + categories + extras
  var brandProfile = data.brandProfile || {};
  var categories = (data.categories && data.categories.categories) || [];
  var brandUsps = (brandProfile.usps || []).map(function(u) { return u.text || ''; }).filter(Boolean);
  var pages = [];
  // Homepage
  pages.push({
    id: 'homepage',
    name: 'Homepage',
    kind: 'homepage',
    heroHeadline: (brandProfile.heroBannerConcept && brandProfile.heroBannerConcept.headline) || data.brand,
    heroSubline: (brandProfile.heroBannerConcept && brandProfile.heroBannerConcept.subline) || '',
    usps: brandUsps.slice(0, 4),
    imageIdeas: ['Hero Lifestyle: ' + data.brand + ' key product in real-life context'].concat((brandProfile.imageConcepts || []).slice(0, 3).map(function(ic) { return ic.description || ''; }).filter(Boolean)),
    cta: 'Jetzt entdecken',
    asins: [],
    notes: '',
  });
  // One per category
  categories.forEach(function(cat, i) {
    pages.push({
      id: 'cat-' + i,
      name: cat.name || ('Kategorie ' + (i + 1)),
      kind: 'category',
      heroHeadline: cat.name,
      heroSubline: cat.description || '',
      usps: brandUsps.slice(0, 3),
      imageIdeas: ['Category hero: ' + cat.name + ' — product group in real-life use'],
      cta: 'Produkte ansehen',
      asins: (cat.asins || []).slice(),
      notes: '',
    });
  });
  // Extra pages
  var extras = data.extraPages || {};
  var EXTRA_META = {
    about_us: { name: 'Über uns', headline: 'Unsere Geschichte', cta: 'Mehr erfahren' },
    bestsellers: { name: 'Bestseller', headline: 'Die beliebtesten Produkte', cta: 'Alle Bestseller' },
    sustainability: { name: 'Nachhaltigkeit', headline: 'Verantwortung für Mensch und Umwelt', cta: 'Mehr über unsere Werte' },
    how_it_works: { name: 'So funktioniert\'s', headline: 'Dein Produktfinder', cta: 'Los geht\'s' },
    new_arrivals: { name: 'Neuheiten', headline: 'Was ist neu', cta: 'Jetzt entdecken' },
    gift_sets: { name: 'Geschenk-Sets', headline: 'Die perfekte Geschenkidee', cta: 'Zur Auswahl' },
    subscribe_save: { name: 'Spar-Abo', headline: 'Regelmäßig liefern, Geld sparen', cta: 'Abo starten' },
    deals: { name: 'Angebote', headline: 'Aktuelle Deals', cta: 'Alle Angebote' },
  };
  Object.keys(extras).forEach(function(k) {
    if (!extras[k]) return;
    var meta = EXTRA_META[k] || { name: k, headline: '', cta: 'Mehr erfahren' };
    pages.push({
      id: k,
      name: meta.name,
      kind: k,
      heroHeadline: meta.headline,
      heroSubline: '',
      usps: [],
      imageIdeas: [],
      cta: meta.cta,
      asins: [],
      notes: '',
    });
  });
  return pages;
}

function StepContent({ data, updateData, onNext, onBack }) {
  // Initialize page content if not set yet
  useEffect(function() {
    if (!data.pageContent || data.pageContent.length === 0) {
      updateData({ pageContent: derivePageContent(data) });
    }
  }, []);

  var pages = data.pageContent || [];
  var [activeIdx, setActiveIdx] = useState(0);
  var active = pages[activeIdx] || null;

  var updatePage = function(idx, patch) {
    var next = pages.slice();
    next[idx] = Object.assign({}, next[idx], patch);
    updateData({ pageContent: next });
  };

  var addUspToPage = function(idx) {
    var p = pages[idx];
    updatePage(idx, { usps: (p.usps || []).concat(['']) });
  };
  var updateUspOnPage = function(idx, uspIdx, val) {
    var p = pages[idx];
    var usps = (p.usps || []).slice();
    usps[uspIdx] = val;
    updatePage(idx, { usps: usps });
  };
  var removeUspFromPage = function(idx, uspIdx) {
    var p = pages[idx];
    var usps = (p.usps || []).slice(); usps.splice(uspIdx, 1);
    updatePage(idx, { usps: usps });
  };

  var addImageIdeaToPage = function(idx) {
    var p = pages[idx];
    updatePage(idx, { imageIdeas: (p.imageIdeas || []).concat(['']) });
  };
  var updateImageIdeaOnPage = function(idx, imgIdx, val) {
    var p = pages[idx];
    var imgs = (p.imageIdeas || []).slice();
    imgs[imgIdx] = val;
    updatePage(idx, { imageIdeas: imgs });
  };
  var removeImageIdeaFromPage = function(idx, imgIdx) {
    var p = pages[idx];
    var imgs = (p.imageIdeas || []).slice(); imgs.splice(imgIdx, 1);
    updatePage(idx, { imageIdeas: imgs });
  };

  var addPage = function() {
    var next = pages.concat([{ id: 'custom-' + Date.now().toString(36), name: 'Neue Seite', kind: 'custom', heroHeadline: '', heroSubline: '', usps: [], imageIdeas: [], cta: 'Mehr erfahren', asins: [], notes: '' }]);
    updateData({ pageContent: next });
    setActiveIdx(next.length - 1);
  };

  var removePage = function(idx) {
    if (!confirm('Seite "' + pages[idx].name + '" wirklich löschen?')) return;
    var next = pages.slice(); next.splice(idx, 1);
    updateData({ pageContent: next });
    if (activeIdx >= next.length) setActiveIdx(Math.max(0, next.length - 1));
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
        <strong>Checkpoint:</strong> Pro Seite: Headline, USPs, Bild-Ideen, CTA. <strong>Hier noch KEINE Layouts</strong> — nur der Inhalt. Die Struktur kommt in Schritt 5.
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {/* Page list (sidebar) */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Seiten</div>
          {pages.map(function(p, i) {
            return (
              <div key={p.id} onClick={function() { setActiveIdx(i); }} style={{
                padding: '8px 10px', marginBottom: 4, borderRadius: 6, cursor: 'pointer',
                background: i === activeIdx ? '#FF9900' : '#f8fafc',
                color: i === activeIdx ? '#fff' : '#0f172a',
                fontSize: 11, fontWeight: i === activeIdx ? 600 : 400,
                border: '1px solid ' + (i === activeIdx ? '#FF9900' : '#e2e8f0'),
              }}>
                {p.name}
                <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{p.kind} · {(p.asins || []).length} ASINs</div>
              </div>
            );
          })}
          <button className="btn" style={{ fontSize: 10, marginTop: 6, width: '100%' }} onClick={addPage}>+ Seite</button>
        </div>

        {/* Page editor */}
        {active && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
              <input className="input" style={{ fontWeight: 700, fontSize: 14 }} value={active.name} onChange={function(e) { updatePage(activeIdx, { name: e.target.value }); }} />
              {active.kind === 'custom' && (
                <button className="btn" style={{ fontSize: 10 }} onClick={function() { removePage(activeIdx); }}>Seite löschen</button>
              )}
            </div>

            <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Hero Headline</div>
              <input className="input" value={active.heroHeadline || ''} onChange={function(e) { updatePage(activeIdx, { heroHeadline: e.target.value }); }} />
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 8, marginBottom: 4 }}>Hero Subline</div>
              <input className="input" value={active.heroSubline || ''} onChange={function(e) { updatePage(activeIdx, { heroSubline: e.target.value }); }} />
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 8, marginBottom: 4 }}>CTA</div>
              <input className="input" value={active.cta || ''} onChange={function(e) { updatePage(activeIdx, { cta: e.target.value }); }} />
            </div>

            <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>USPs auf dieser Seite</div>
                <button className="btn" style={{ fontSize: 10 }} onClick={function() { addUspToPage(activeIdx); }}>+ USP</button>
              </div>
              {(active.usps || []).map(function(usp, ui) {
                return (
                  <div key={ui} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    <input className="input" style={{ flex: 1, fontSize: 11 }} value={usp} onChange={function(e) { updateUspOnPage(activeIdx, ui, e.target.value); }} />
                    <button className="btn" style={{ fontSize: 10 }} onClick={function() { removeUspFromPage(activeIdx, ui); }}>×</button>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Bild-Ideen (10-20 Wörter, nur die Idee)</div>
                <button className="btn" style={{ fontSize: 10 }} onClick={function() { addImageIdeaToPage(activeIdx); }}>+ Bild-Idee</button>
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>Keine Stimmung/Licht/Kamera. Nur: was zeigt das Bild.</div>
              {(active.imageIdeas || []).map(function(img, ii) {
                return (
                  <div key={ii} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    <input className="input" style={{ flex: 1, fontSize: 11 }} value={img} onChange={function(e) { updateImageIdeaOnPage(activeIdx, ii, e.target.value); }} placeholder="z.B. hands holding the product outdoors at a picnic" />
                    <button className="btn" style={{ fontSize: 10 }} onClick={function() { removeImageIdeaFromPage(activeIdx, ii); }}>×</button>
                  </div>
                );
              })}
            </div>

            {active.asins && active.asins.length > 0 && (
              <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Produkte auf dieser Seite ({active.asins.length})</div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#64748b' }}>{active.asins.join(', ')}</div>
              </div>
            )}

            <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Notizen (optional)</div>
              <textarea className="input" rows={2} value={active.notes || ''} onChange={function(e) { updatePage(activeIdx, { notes: e.target.value }); }} placeholder="Zusätzliche Hinweise für die Generierung dieser Seite" />
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" onClick={onBack}>Zurück</button>
        <button className="btn btn-primary" onClick={function() { onNext({}); }}>Weiter zu Struktur →</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: PAGE STRUCTURE CHECKPOINT
// Page structure is DERIVED from content (not the other way around).
// For each page, the user sees proposed sections (hero, USPs, products, etc.)
// with layouts and tile types. Can reorder, change layouts, add/remove sections.
// ═══════════════════════════════════════════════════════════════════════════

// Layouts available (from constants.js but duplicated here for the wizard UI)
var WIZARD_LAYOUTS = [
  { id: '1', name: 'Full Width', cells: 1 },
  { id: 'std-2equal', name: '2 Equal', cells: 2 },
  { id: 'lg-2stack', name: 'Large + 2 Stacked', cells: 3 },
  { id: '2stack-lg', name: '2 Stacked + Large', cells: 3 },
  { id: 'lg-w2s', name: 'Large + Wide & 2 Small', cells: 4 },
  { id: 'w2s-lg', name: 'Wide & 2 Small + Large', cells: 4 },
  { id: '2x2wide', name: '4 Equal (2x2 Wide)', cells: 4 },
  { id: 'lg-4grid', name: 'Large + 2x2 Grid', cells: 5 },
  { id: '4grid-lg', name: '2x2 Grid + Large', cells: 5 },
  { id: '2s-4grid', name: '2 Stacked + 2x2 Grid', cells: 6 },
  { id: '4grid-2s', name: '2x2 Grid + 2 Stacked', cells: 6 },
  { id: '4x2grid', name: '4x2 Grid', cells: 8 },
  { id: 'vh-2equal', name: '2 Equal (VH)', cells: 2 },
  { id: 'vh-w2s', name: 'Wide + 2 Squares (VH)', cells: 3 },
  { id: 'vh-2sw', name: '2 Squares + Wide (VH)', cells: 3 },
];

var WIZARD_TILE_TYPES = [
  { id: 'image', label: 'Image' },
  { id: 'shoppable_image', label: 'Shoppable Image' },
  { id: 'product_grid', label: 'Product Grid' },
  { id: 'video', label: 'Video' },
  { id: 'text', label: 'Text' },
  { id: 'image_text', label: 'Image + Text' },
  { id: 'best_sellers', label: 'Best Sellers' },
];

// Derive initial structure from content. Uses knowledge-base-inspired tendency:
// - Homepage: hero → USPs (2x2wide) → categories (std-2equal) → products (4x2grid)
// - Category page: hero → USPs (vh-w2s) → products (4x2grid)
// - About_us: hero full-width → text + image (std-2equal) → trust elements
function deriveStructure(data) {
  var pageContent = data.pageContent || [];
  var storeType = data.storeType || 'product-showcase';
  var result = [];

  pageContent.forEach(function(pc) {
    var sections = [];
    // Hero section — always full-width, 1 image
    sections.push({
      id: 'hero-' + pc.id,
      purpose: 'Hero / intro',
      layoutId: '1',
      tiles: [{ type: 'image', imageCategory: 'lifestyle', brief: (pc.imageIdeas && pc.imageIdeas[0]) || '', textOverlay: pc.heroHeadline || '', ctaText: pc.cta || '' }],
    });

    if (pc.kind === 'homepage') {
      // USPs: depends on how many (2 → std-2equal, 4 → 2x2wide, 3 → vh-w2s)
      var nUsps = (pc.usps || []).length;
      if (nUsps >= 4) {
        sections.push({
          id: 'usps-' + pc.id,
          purpose: 'USPs / brand benefits',
          layoutId: '2x2wide',
          tiles: pc.usps.slice(0, 4).map(function(u) { return { type: 'image_text', imageCategory: 'benefit', brief: u, textOverlay: u, ctaText: '' }; }),
        });
      } else if (nUsps === 3) {
        sections.push({
          id: 'usps-' + pc.id,
          purpose: 'USPs',
          layoutId: 'vh-w2s',
          tiles: pc.usps.map(function(u) { return { type: 'image_text', imageCategory: 'benefit', brief: u, textOverlay: u, ctaText: '' }; }),
        });
      } else if (nUsps >= 1) {
        sections.push({
          id: 'usps-' + pc.id,
          purpose: 'USPs',
          layoutId: 'std-2equal',
          tiles: pc.usps.map(function(u) { return { type: 'image_text', imageCategory: 'benefit', brief: u, textOverlay: u, ctaText: '' }; }),
        });
      }
      // Categories tile
      var cats = (data.categories && data.categories.categories) || [];
      if (cats.length >= 1) {
        var layoutId = cats.length === 2 ? 'std-2equal' : cats.length === 3 ? 'vh-w2s' : cats.length === 4 ? '2x2wide' : '4x2grid';
        sections.push({
          id: 'categories-' + pc.id,
          purpose: 'Category navigation',
          layoutId: layoutId,
          tiles: cats.slice(0, 8).map(function(c) { return { type: 'image', imageCategory: 'creative', brief: 'category teaser: ' + c.name, textOverlay: c.name, ctaText: 'Entdecken' }; }),
        });
      }
      // Bestsellers / featured products
      sections.push({
        id: 'bestsellers-' + pc.id,
        purpose: 'Featured products',
        layoutId: '1',
        tiles: [{ type: 'product_grid', asins: data.asins ? data.asins.slice(0, 8) : [], brief: '', textOverlay: '' }],
      });
    } else if (pc.kind === 'category') {
      // USPs smaller for category page
      if ((pc.usps || []).length >= 1) {
        sections.push({
          id: 'usps-' + pc.id,
          purpose: 'Category USPs',
          layoutId: (pc.usps.length >= 3 ? 'vh-w2s' : 'std-2equal'),
          tiles: pc.usps.slice(0, 3).map(function(u) { return { type: 'image_text', imageCategory: 'benefit', brief: u, textOverlay: u, ctaText: '' }; }),
        });
      }
      // Image teaser between USPs and products
      sections.push({
        id: 'teaser-' + pc.id,
        purpose: 'Category teaser',
        layoutId: 'std-2equal',
        tiles: [
          { type: 'image', imageCategory: 'lifestyle', brief: 'lifestyle shot of ' + pc.name, textOverlay: pc.heroSubline || '', ctaText: '' },
          { type: 'image', imageCategory: 'creative', brief: 'creative shot of ' + pc.name + ' hero product', textOverlay: '', ctaText: pc.cta || '' },
        ],
      });
      // All products in category
      sections.push({
        id: 'products-' + pc.id,
        purpose: 'All products',
        layoutId: '1',
        tiles: [{ type: 'product_grid', asins: (pc.asins || []).slice(), brief: '', textOverlay: '' }],
      });
    } else {
      // Extra pages — simple: hero + text/image section + optional products
      sections.push({
        id: 'body-' + pc.id,
        purpose: 'Main content',
        layoutId: 'std-2equal',
        tiles: [
          { type: 'image', imageCategory: 'lifestyle', brief: (pc.imageIdeas && pc.imageIdeas[1]) || '', textOverlay: '', ctaText: '' },
          { type: 'text', imageCategory: 'text_image', brief: '', textOverlay: pc.heroSubline || '', ctaText: pc.cta || '' },
        ],
      });
    }

    result.push({ id: pc.id, name: pc.name, kind: pc.kind, storeTypeHint: storeType, sections: sections });
  });
  return result;
}

function StepStructure({ data, updateData, onNext, onBack }) {
  useEffect(function() {
    if (!data.pageStructure || data.pageStructure.length === 0) {
      updateData({ pageStructure: deriveStructure(data) });
    }
  }, []);

  var pages = data.pageStructure || [];
  var [activeIdx, setActiveIdx] = useState(0);
  var active = pages[activeIdx] || null;

  var updatePageSections = function(pageIdx, sections) {
    var next = pages.slice();
    next[pageIdx] = Object.assign({}, next[pageIdx], { sections: sections });
    updateData({ pageStructure: next });
  };

  var addSection = function(pageIdx) {
    var p = pages[pageIdx];
    var secs = (p.sections || []).slice();
    secs.push({ id: 'sec-' + Date.now().toString(36), purpose: 'New section', layoutId: 'std-2equal', tiles: [{ type: 'image', imageCategory: 'lifestyle', brief: '', textOverlay: '', ctaText: '' }, { type: 'image', imageCategory: 'lifestyle', brief: '', textOverlay: '', ctaText: '' }] });
    updatePageSections(pageIdx, secs);
  };

  var removeSection = function(pageIdx, secIdx) {
    var secs = pages[pageIdx].sections.slice(); secs.splice(secIdx, 1);
    updatePageSections(pageIdx, secs);
  };

  var moveSection = function(pageIdx, secIdx, delta) {
    var secs = pages[pageIdx].sections.slice();
    var newIdx = secIdx + delta;
    if (newIdx < 0 || newIdx >= secs.length) return;
    var tmp = secs[secIdx]; secs[secIdx] = secs[newIdx]; secs[newIdx] = tmp;
    updatePageSections(pageIdx, secs);
  };

  var changeLayout = function(pageIdx, secIdx, layoutId) {
    var layoutMeta = WIZARD_LAYOUTS.find(function(l) { return l.id === layoutId; });
    var cells = layoutMeta ? layoutMeta.cells : 2;
    var secs = pages[pageIdx].sections.slice();
    var sec = Object.assign({}, secs[secIdx]);
    sec.layoutId = layoutId;
    // Resize tile array to match cell count
    var tiles = (sec.tiles || []).slice();
    while (tiles.length < cells) tiles.push({ type: 'image', imageCategory: 'lifestyle', brief: '', textOverlay: '', ctaText: '' });
    while (tiles.length > cells) tiles.pop();
    sec.tiles = tiles;
    secs[secIdx] = sec;
    updatePageSections(pageIdx, secs);
  };

  var updateTile = function(pageIdx, secIdx, tileIdx, patch) {
    var secs = pages[pageIdx].sections.slice();
    var sec = Object.assign({}, secs[secIdx]);
    var tiles = (sec.tiles || []).slice();
    tiles[tileIdx] = Object.assign({}, tiles[tileIdx], patch);
    sec.tiles = tiles;
    secs[secIdx] = sec;
    updatePageSections(pageIdx, secs);
  };

  var updateSectionPurpose = function(pageIdx, secIdx, purpose) {
    var secs = pages[pageIdx].sections.slice();
    secs[secIdx] = Object.assign({}, secs[secIdx], { purpose: purpose });
    updatePageSections(pageIdx, secs);
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
        <strong>Checkpoint:</strong> Struktur pro Seite mit Layouts und Kacheln. Referenz-Stores liefern Inspiration, nicht Vorschrift.
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {/* Page list */}
        <div style={{ width: 160, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Seiten</div>
          {pages.map(function(p, i) {
            return (
              <div key={p.id} onClick={function() { setActiveIdx(i); }} style={{
                padding: '8px 10px', marginBottom: 4, borderRadius: 6, cursor: 'pointer',
                background: i === activeIdx ? '#FF9900' : '#f8fafc',
                color: i === activeIdx ? '#fff' : '#0f172a',
                fontSize: 11, fontWeight: i === activeIdx ? 600 : 400,
                border: '1px solid ' + (i === activeIdx ? '#FF9900' : '#e2e8f0'),
              }}>
                {p.name}
                <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{(p.sections || []).length} Sections</div>
              </div>
            );
          })}
        </div>

        {/* Section editor */}
        {active && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{active.name}</div>
            {(active.sections || []).map(function(sec, si) {
              var layoutMeta = WIZARD_LAYOUTS.find(function(l) { return l.id === sec.layoutId; }) || WIZARD_LAYOUTS[0];
              return (
                <div key={sec.id || si} style={{ padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                    <input className="input" style={{ flex: 1, fontSize: 11, fontWeight: 600 }} value={sec.purpose || ''} onChange={function(e) { updateSectionPurpose(activeIdx, si, e.target.value); }} />
                    <select className="input" style={{ width: 180, fontSize: 11 }} value={sec.layoutId} onChange={function(e) { changeLayout(activeIdx, si, e.target.value); }}>
                      {WIZARD_LAYOUTS.map(function(l) { return <option key={l.id} value={l.id}>{l.name} ({l.cells})</option>; })}
                    </select>
                    <button className="btn" style={{ fontSize: 10 }} onClick={function() { moveSection(activeIdx, si, -1); }} disabled={si === 0}>↑</button>
                    <button className="btn" style={{ fontSize: 10 }} onClick={function() { moveSection(activeIdx, si, 1); }} disabled={si === active.sections.length - 1}>↓</button>
                    <button className="btn" style={{ fontSize: 10 }} onClick={function() { removeSection(activeIdx, si); }}>×</button>
                  </div>

                  {/* Tiles */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 }}>
                    {(sec.tiles || []).map(function(tile, ti) {
                      return (
                        <div key={ti} style={{ padding: 6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4 }}>
                          <select className="input" style={{ fontSize: 10, padding: 3 }} value={tile.type || 'image'} onChange={function(e) { updateTile(activeIdx, si, ti, { type: e.target.value }); }}>
                            {WIZARD_TILE_TYPES.map(function(t) { return <option key={t.id} value={t.id}>{t.label}</option>; })}
                          </select>
                          {tile.type !== 'product_grid' && tile.type !== 'best_sellers' && (
                            <input className="input" style={{ fontSize: 10, padding: 3, marginTop: 3 }} placeholder="Brief (10-20 Wörter, EN)" value={tile.brief || ''} onChange={function(e) { updateTile(activeIdx, si, ti, { brief: e.target.value }); }} />
                          )}
                          {tile.type === 'product_grid' && (
                            <div style={{ fontSize: 9, color: '#64748b', padding: '3px 0' }}>{(tile.asins || []).length} ASINs</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <button className="btn" style={{ fontSize: 11 }} onClick={function() { addSection(activeIdx); }}>+ Section hinzufügen</button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" onClick={onBack}>Zurück</button>
        <button className="btn btn-primary" onClick={function() { onNext({}); }}>Weiter zur Generierung →</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 6: GENERATION — automatic. Generates each page in its own API call
// using the user-approved structure from Step 5. Produces the final store.
// ═══════════════════════════════════════════════════════════════════════════
function StepGenerate({ data, updateData, log, addLog, running, setRunning, error, setError, cancelRef, onDone, onBack }) {
  var [finished, setFinished] = useState(!!(data.generatedPages && data.generatedPages.length > 0));
  var startedRef = useRef(false);

  var runGeneration = async function() {
    if (running) return;
    cancelRef.current = false;
    setRunning(true);
    setError('');
    setFinished(false);

    try {
      var lang = LANGS[data.marketplace] || 'German';
      var structure = data.pageStructure || [];
      var pageContent = data.pageContent || [];
      var brandProfile = data.brandProfile || {};
      var categories = data.categories || { categories: [] };

      // Load store knowledge base once (for inspiration context)
      var storeKnowledgeStr = null;
      try {
        addLog('Lade Wissensdatenbank (23 Top-Stores)...');
        var kb = await loadStoreKnowledge();
        if (kb) storeKnowledgeStr = formatStoreKnowledge(kb);
        addLog('✓ Wissensdatenbank geladen');
      } catch (kbErr) {
        addLog('⚠ Wissensdatenbank nicht verfügbar: ' + kbErr.message);
      }

      if (cancelRef.current) throw new Error('CANCELLED');

      var generatedPages = [];
      for (var gi = 0; gi < structure.length; gi++) {
        if (cancelRef.current) throw new Error('CANCELLED');
        var pStruct = structure[gi];
        var pContent = pageContent.find(function(pc) { return pc.id === pStruct.id; }) || {};
        addLog('');
        addLog('═══ Seite ' + (gi + 1) + '/' + structure.length + ': ' + pStruct.name + ' ═══');
        addLog('   Inhaltsbasiert: ' + (pStruct.sections || []).length + ' Sections');

        // Build pagePlan expected by generateOnePage()
        var pagePlan = {
          id: pStruct.id,
          name: pStruct.name,
          sections: (pStruct.sections || []).map(function(sec) {
            return {
              purpose: sec.purpose,
              contentSource: sec.purpose,
              layout: sec.layoutId,
              tiles: sec.tiles,
            };
          }),
          // User-approved content passed as hints
          userContent: {
            heroHeadline: pContent.heroHeadline,
            heroSubline: pContent.heroSubline,
            usps: pContent.usps,
            imageIdeas: pContent.imageIdeas,
            cta: pContent.cta,
            notes: pContent.notes,
            asins: pContent.asins,
          },
        };

        try {
          var pageResult = await generateOnePage(
            pagePlan,
            brandProfile,
            categories,
            data.productAnalyses || [],
            data.brand,
            lang,
            generatedPages,
            storeKnowledgeStr
          );
          var pageObj = {
            id: pStruct.id,
            name: pStruct.name,
            sections: pageResult.sections || pagePlan.sections || [],
            heroBannerBrief: pageResult.heroBannerBrief || (pContent.imageIdeas && pContent.imageIdeas[0]) || '',
            heroBannerTextOverlay: pageResult.heroBannerTextOverlay || pContent.heroHeadline || '',
          };
          generatedPages.push(pageObj);
          addLog('   ✓ ' + (pageObj.sections || []).length + ' Sections generiert');
        } catch (pgErr) {
          addLog('   ⚠ FEHLER: ' + pgErr.message + ' — nutze Struktur als Fallback');
          // Fallback: use the user-approved structure directly
          generatedPages.push({
            id: pStruct.id,
            name: pStruct.name,
            sections: pStruct.sections || [],
            heroBannerBrief: (pContent.imageIdeas && pContent.imageIdeas[0]) || '',
            heroBannerTextOverlay: pContent.heroHeadline || '',
          });
        }
        // Brief pause between pages
        if (gi < structure.length - 1) await new Promise(function(r) { setTimeout(r, 800); });
      }

      addLog('');
      addLog('═══ STORE FERTIG ═══');
      addLog('✓ ' + generatedPages.length + ' Seiten generiert');

      updateData({ generatedPages: generatedPages });
      setFinished(true);
      setRunning(false);

      // Build the final store object and hand off to parent
      var storeObj = {
        brandName: data.brand,
        marketplace: data.marketplace,
        brandTone: (data.brandVoice && data.brandVoice.tone) || 'professional',
        heroMessage: (brandProfile.heroBannerConcept && brandProfile.heroBannerConcept.headline) || data.brand,
        brandStory: (brandProfile.brandStory && brandProfile.brandStory.text) || '',
        keyFeatures: (brandProfile.usps || []).map(function(u) { return u.text; }).filter(Boolean),
        products: data.products || [],
        asins: data.asins || [],
        pages: generatedPages,
        productCI: data.productCI || null,
        websiteData: data.websiteData || null,
        categories: data.categories || null,
        productAnalyses: data.productAnalyses || null,
        websiteAnalyses: data.websiteAnalyses || null,
        pipelineBrandVoice: data.brandVoice || null,
        contentPool: brandProfile,
        storeType: data.storeType || null,
        // Re-use logo / brand assets
        logoDataUrl: data.logoFile || null,
        brandColors: data.brandColors || '',
        fontNames: data.fontNames || '',
      };
      onDone(storeObj);
    } catch (e) {
      setRunning(false);
      if (e.message === 'CANCELLED') {
        addLog('⚠ Abgebrochen.');
        setError('Generierung abgebrochen.');
      } else {
        addLog('ERROR: ' + e.message);
        setError(e.message);
      }
    }
  };

  useEffect(function() {
    if (!startedRef.current && !finished && !running) {
      startedRef.current = true;
      runGeneration();
    }
  }, []);

  return (
    <div>
      <div style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
        <strong>Automatisch:</strong> Jede Seite wird einzeln generiert. Eine API-Anfrage pro Seite mit deinem bestätigten Content und Layout.
      </div>
      {running && (
        <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#92400e', marginBottom: 12 }}>
          Generierung läuft... Tab geöffnet lassen.
        </div>
      )}
      {finished && !running && (
        <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, color: '#166534', marginBottom: 12 }}>
          ✓ Store fertig generiert! {(data.generatedPages || []).length} Seiten.
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn" onClick={onBack} disabled={running}>Zurück zur Struktur</button>
        {!running && !finished && (
          <button className="btn btn-primary" onClick={runGeneration}>Erneut versuchen</button>
        )}
        {running && (
          <button className="btn" onClick={function() { cancelRef.current = true; }}>Abbrechen</button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 7: DONE
// ═══════════════════════════════════════════════════════════════════════════
function StepDone({ data, onClose }) {
  var pages = data.generatedPages || [];
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Store fertig!</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
        {pages.length} Seiten, {(data.products || []).length} Produkte. Du kannst das Fenster schließen und im Editor weiterarbeiten.
      </div>
      <button className="btn btn-primary" onClick={onClose}>Editor öffnen</button>
    </div>
  );
}
