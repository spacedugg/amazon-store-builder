import { useState, useRef, useCallback, useEffect } from 'react';
import { LANGS, DOMAINS } from '../constants';
import { scrapeAsins, analyzeBrandCI, scrapeWebsite, discoverBrandProducts } from '../api';
import { analyzeOneProduct, groupIntoCategories, analyzeWebsitePage, synthesizeBrandProfile, planPages, generateOnePage, analyzeBrandVoice } from '../contentPipeline';
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

// ─── KNOWLEDGE-BASE TEXT & STYLE PATTERNS ───
// Extracts style-level insights from the 23-store knowledge base that are
// NOT brand-specific (claim style, USP count, headline length, text-on-image
// frequency). Used to guide Step 2, Step 4 and Step 5 of the wizard.
// These are INSPIRATION, not rules — the user overrides everything.
function deriveKbTextPatterns(kb) {
  if (!kb) return null;
  var cta = kb.ctaAndTextPatterns || {};
  var hp = kb.heroPatterns || {};
  var lp = kb.layoutPatterns || {};
  var mf = kb.moduleFlowPatterns || {};

  // Parse layout usage into a quick lookup: layoutId → typical tile count (from name)
  var layoutCellHints = {};
  (lp.mostUsedLayouts || []).forEach(function(l) {
    var name = (l && (l.layout || l.name)) || '';
    var id = name.toLowerCase().replace(/\s+/g, '-');
    layoutCellHints[id] = { usage: l.usage || '', purpose: l.purpose || '' };
  });

  return {
    claimStyles: cta.claimStyles || [],
    ctaInsight: (cta.ctaButtons && cta.ctaButtons.insight) || '',
    textOnImageInsight: (cta.textOnImageFrequency && cta.textOnImageFrequency.insight) || '',
    textOnImageFrequency: cta.textOnImageFrequency || null,
    heroStrategies: hp.contentStrategies || [],
    layoutHints: layoutCellHints,
    pageFlows: (mf.patterns || []).slice(0, 5),
  };
}

// How many cells a given layout has (for bidirectional content↔layout sync)
var LAYOUT_CELL_COUNT = {
  '1': 1,
  'std-2equal': 2, 'vh-2equal': 2,
  'lg-2stack': 3, '2stack-lg': 3, 'vh-w2s': 3, 'vh-2sw': 3,
  'lg-w2s': 4, 'w2s-lg': 4, '2x2wide': 4, 'vh-4square': 4,
  'lg-4grid': 5, '4grid-lg': 5,
  '2s-4grid': 6, '4grid-2s': 6,
  '4x2grid': 8,
};
function layoutCellsFor(layoutId) {
  return LAYOUT_CELL_COUNT[layoutId] || 2;
}

// Suggest an alternative layout when USP count changes. Returns the best
// matching layout id for the given cell count.
function suggestLayoutForCells(cells) {
  if (cells <= 1) return '1';
  if (cells === 2) return 'std-2equal';
  if (cells === 3) return 'vh-w2s';
  if (cells === 4) return '2x2wide';
  if (cells === 5) return 'lg-4grid';
  if (cells === 6) return '2s-4grid';
  return '4x2grid';
}

// Empty initial state for a fresh wizard run
function emptyData() {
  return {
    // Step 0: Input
    brand: '',
    marketplace: 'de',
    asins: [],
    websiteUrl: '',
    // Existing Amazon Brand Store (optional)
    existingStoreUrl: '',
    existingStoreMode: 'optimize',     // 'optimize' | 'reconceptualize'
    keepMenuStructure: true,
    adoptExistingContent: true,  // Always on in optimize mode: KI decides per-element (Variante A)
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
    // Knowledge base (loaded once, reused across Steps 2, 4, 5, 6)
    knowledgeBase: null,
    kbTextPatterns: null,
  };
}

export default function GenerationWizard({ resumeId, onComplete, onCancel, onGenerate }) {
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
  else if (step === 6) stepContent = <StepGenerate data={data} onGenerate={onGenerate} onCancel={onCancel} onBack={function() { setStep(5); }} />;
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
      <div className="hint">Die KI extrahiert USPs, Markengeschichte, Zertifikate sowie Modul-Strukturen, Überschriften, Navigation, CTA-Formulierungen und visuelle Ton-Signale der Website. Ohne Website wird nur auf Amazon-Daten zurückgegriffen.</div>

      {/* Existing Amazon Brand Store (optional) */}
      <label className="label" style={{ marginTop: 10 }}>Bestehender Amazon Brand Store (optional)</label>
      <input className="input" value={data.existingStoreUrl || ''} onChange={function(e) { updateData({ existingStoreUrl: e.target.value }); }} placeholder="https://www.amazon.de/stores/BRAND/page/..." />
      <div className="hint">Wenn die Marke schon einen Brand Store hat: Link hier einfügen. Die KI analysiert Struktur, Module, Texte und visuelle CI und verwendet diese im Prozess je nach gewähltem Modus.</div>

      {data.existingStoreUrl && data.existingStoreUrl.trim() && (
        <div style={{ marginTop: 8, padding: '10px 12px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 6 }}>
          <label className="label" style={{ marginTop: 0 }}>Wie soll der bestehende Store behandelt werden?</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button
              className={'btn' + (data.existingStoreMode !== 'reconceptualize' ? ' btn-primary' : '')}
              style={{ fontSize: 11, flex: 1 }}
              onClick={function() { updateData({ existingStoreMode: 'optimize' }); }}
            >
              Optimieren & erweitern
            </button>
            <button
              className={'btn' + (data.existingStoreMode === 'reconceptualize' ? ' btn-primary' : '')}
              style={{ fontSize: 11, flex: 1 }}
              onClick={function() { updateData({ existingStoreMode: 'reconceptualize' }); }}
            >
              Komplett neu konzipieren
            </button>
          </div>
          <div className="hint" style={{ marginBottom: 8 }}>
            {data.existingStoreMode === 'reconceptualize'
              ? 'NEU KONZIPIEREN: nur CI (Farben, Logo, Typo, Ton) wird behalten. Struktur, Navigation und Modul-Flow werden komplett neu designed.'
              : 'OPTIMIEREN: die bestehende Struktur wird als Fundament behalten, Inhalte werden aufgewertet und erweitert.'}
          </div>

          {data.existingStoreMode !== 'reconceptualize' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!data.keepMenuStructure}
                  onChange={function() { updateData({ keepMenuStructure: !data.keepMenuStructure }); }}
                />
                Menüstruktur exakt behalten (gleiche Seiten, gleiche Hierarchie, gleiche Namen)
              </label>
              <div className="hint" style={{ fontSize: 11, marginTop: 4 }}>
                Texte und Headlines des bestehenden Stores werden von der KI pro Element bewertet: starke Texte werden beibehalten, schwache werden umgeschrieben, fehlende werden ergänzt.
              </div>
            </div>
          )}
        </div>
      )}

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
      var lang = LANGS[data.marketplace] || 'German';

      // 1. Scrape ASINs via Bright Data
      addLog('═══ Scraping ' + data.asins.length + ' ASINs von Amazon.' + data.marketplace + ' ═══');
      var scrapeResult = await scrapeAsins(data.asins, domain);
      var products = scrapeResult.products || [];
      if (!products.length) throw new Error('Keine Produkte zurückgegeben. Prüfe die ASINs.');
      addLog('✓ ' + products.length + '/' + data.asins.length + ' Produkte gescrapt');

      if (cancelRef.current) throw new Error('CANCELLED');

      // 2. Website scraping (optional)
      // Increased timeout: 5 minutes. If full crawl fails, retry with homepage only.
      var websiteData = null;
      if (data.websiteUrl && data.websiteUrl.trim()) {
        addLog('');
        addLog('═══ Website-Scraping: ' + data.websiteUrl + ' ═══');
        addLog('   Seiten werden einzeln gecrawlt (Homepage + Unterseiten)...');
        try {
          var wsResp = await fetch('/api/scrape-website', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: data.websiteUrl.trim() }),
            signal: AbortSignal.timeout ? AbortSignal.timeout(300000) : undefined, // 5 min
          });
          if (!wsResp.ok) {
            var wsErr = await wsResp.json().catch(function() { return {}; });
            throw new Error(wsErr.error || 'Website-Scraping fehlgeschlagen');
          }
          websiteData = await wsResp.json();
          addLog('✓ Website gescrapt: ' + (websiteData.pagesScraped || 0) + ' Seiten, ' + (websiteData.rawTextSections || []).length + ' Text-Sektionen');
        } catch (wsErr1) {
          addLog('   ⚠ Erster Versuch fehlgeschlagen: ' + wsErr1.message);
          addLog('   Zweiter Versuch: Nur Homepage...');
          // Retry with just the homepage — parse the base URL
          try {
            var baseUrl = new URL(data.websiteUrl.trim());
            var homepageOnly = baseUrl.origin;
            var wsResp2 = await fetch('/api/scrape-website', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: homepageOnly }),
              signal: AbortSignal.timeout ? AbortSignal.timeout(60000) : undefined, // 1 min for homepage only
            });
            if (wsResp2.ok) {
              websiteData = await wsResp2.json();
              addLog('✓ Homepage gescrapt: ' + (websiteData.pagesScraped || 0) + ' Seiten (Unterseiten übersprungen)');
            } else {
              addLog('   ⚠ Auch Homepage-only fehlgeschlagen. Weiter ohne Website-Daten.');
            }
          } catch (wsErr2) {
            addLog('   ⚠ Homepage-Retry fehlgeschlagen: ' + wsErr2.message + '. Weiter ohne Website-Daten.');
          }
        }
      }

      if (cancelRef.current) throw new Error('CANCELLED');

      // 3. Per-product CI analysis via Gemini Vision
      // Cap at 20 products — enough to establish the brand's visual identity.
      // For 300+ product brands, analyzing all is overkill (colors repeat).
      var CI_MAX_PRODUCTS = 20;
      var ciProducts = products.slice(0, CI_MAX_PRODUCTS);
      addLog('');
      addLog('═══ CI-Analyse (' + ciProducts.length + (products.length > CI_MAX_PRODUCTS ? '/' + products.length + ' — Rest übersprungen' : '') + ' Produkte, Gemini Vision) ═══');
      var allCiResults = [];
      for (var pi = 0; pi < ciProducts.length; pi++) {
        if (cancelRef.current) throw new Error('CANCELLED');
        var pImgs = (ciProducts[pi].images || []).map(function(img) {
          var u = typeof img === 'string' ? img : (img.url || '');
          return u ? { url: u, context: ciProducts[pi].name } : null;
        }).filter(Boolean);
        if (pImgs.length === 0) { continue; }
        var productLabel = 'Produkt ' + (pi + 1) + '/' + ciProducts.length + ' (' + (ciProducts[pi].asin || '?') + ')';
        addLog('   ' + productLabel + ': ' + pImgs.length + ' Bilder — ' + (ciProducts[pi].name || '').slice(0, 50));
        // Retry CI analysis up to 3 times per product.
        var ciSuccess = false;
        for (var ciAttempt = 0; ciAttempt < 3 && !ciSuccess; ciAttempt++) {
          try {
            if (ciAttempt > 0) {
              addLog('     ↻ Versuch ' + (ciAttempt + 1) + '/3...');
              await new Promise(function(r) { setTimeout(r, 2000); });
            }
            var batchCI = await analyzeBrandCI(pImgs, data.brand);
            if (batchCI && (batchCI.primaryColors || batchCI.visualMood)) {
              allCiResults.push(batchCI);
              ciSuccess = true;
              var colors = (batchCI.primaryColors || []).slice(0, 3).join(', ');
              addLog('     ✓ OK' + (colors ? ' — Farben: ' + colors : ''));
            } else {
              addLog('     ⚠ Leeres Ergebnis (kein JSON mit Farben) — retry...');
            }
          } catch (batchErr) {
            if (ciAttempt < 2) {
              addLog('     ⚠ ' + batchErr.message + ' — retry in 2s...');
            } else {
              addLog('     ✗ FEHLGESCHLAGEN nach 3 Versuchen: ' + batchErr.message);
            }
          }
        }
        if (pi < ciProducts.length - 1) await new Promise(function(r) { setTimeout(r, 400); });
      }

      // Merge CI results — aggregate ALL dimensions, not just colors.
      // For string fields (visualMood, typographyStyle, etc.) pick the most
      // common value across products. For arrays, merge and count.
      var ciFailed = ciProducts.length - allCiResults.length;
      addLog('   Ergebnis: ' + allCiResults.length + '/' + ciProducts.length + ' Produkte erfolgreich' + (ciFailed > 0 ? ', ' + ciFailed + ' fehlgeschlagen' : ''));
      var productCI = null;
      if (allCiResults.length > 0) {
        // Color aggregation — filter out generic white/black/gray that come from
        // product photo backgrounds, not from brand identity.
        function isGenericColor(hex) {
          var c = (hex || '').toLowerCase().replace('#', '');
          if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
          if (c.length !== 6) return true;
          var r = parseInt(c.slice(0, 2), 16);
          var g = parseInt(c.slice(2, 4), 16);
          var b = parseInt(c.slice(4, 6), 16);
          // Pure white, near-white, pure black, near-black, and neutral grays
          var brightness = (r + g + b) / 3;
          var saturation = Math.max(r, g, b) - Math.min(r, g, b);
          if (brightness > 240 && saturation < 15) return true; // near-white
          if (brightness < 15 && saturation < 15) return true;  // near-black
          if (saturation < 10 && brightness > 50 && brightness < 200) return true; // neutral gray
          return false;
        }
        var colorCount = {};
        allCiResults.forEach(function(r) {
          (r.primaryColors || []).forEach(function(c) { if (!isGenericColor(c)) colorCount[c] = (colorCount[c] || 0) + 1; });
          (r.secondaryColors || []).forEach(function(c) { if (!isGenericColor(c)) colorCount[c] = (colorCount[c] || 0) + 1; });
        });
        var sortedColors = Object.entries(colorCount).sort(function(a, b) { return b[1] - a[1]; });
        var mergedPrimary = sortedColors.slice(0, 6).map(function(e) { return e[0]; });
        var mergedSecondary = sortedColors.slice(6, 10).map(function(e) { return e[0]; });

        // String field aggregation: pick most frequent value, but also collect
        // ALL unique values so the user can see what was found per product.
        var ciFieldVariants = {}; // field → [all unique values]
        function mostCommonValue(field) {
          var counts = {};
          var allValues = [];
          allCiResults.forEach(function(r) {
            var val = r[field];
            if (val && typeof val === 'string') {
              counts[val] = (counts[val] || 0) + 1;
              if (allValues.indexOf(val) < 0) allValues.push(val);
            }
          });
          ciFieldVariants[field] = allValues;
          var best = ''; var bestN = 0;
          Object.keys(counts).forEach(function(k) { if (counts[k] > bestN) { best = k; bestN = counts[k]; } });
          return best;
        }

        // Array field aggregation: collect all unique values
        function mergeArrayField(field) {
          var seen = {};
          var result = [];
          allCiResults.forEach(function(r) {
            (r[field] || []).forEach(function(val) {
              if (val && !seen[val]) { seen[val] = true; result.push(val); }
            });
          });
          return result;
        }

        // Combine designer notes from all products into one summary.
        // Take unique sentences — many products will have similar notes.
        var allDesignerNotes = [];
        var seenNotes = {};
        allCiResults.forEach(function(r) {
          var note = (r.designerNotes || '').trim();
          if (note.length > 10) {
            var key = note.toLowerCase().slice(0, 60);
            if (!seenNotes[key]) { seenNotes[key] = true; allDesignerNotes.push(note); }
          }
        });

        productCI = {
          // Colors
          primaryColors: mergedPrimary,
          secondaryColors: mergedSecondary,
          backgroundColor: mostCommonValue('backgroundColor'),
          colorVariation: mostCommonValue('colorVariation'),
          // Typography
          typographyStyle: mostCommonValue('typographyStyle'),
          // Visual identity
          visualMood: mostCommonValue('visualMood'),
          backgroundPattern: mostCommonValue('backgroundPattern'),
          recurringElements: mergeArrayField('recurringElements'),
          photographyStyle: mostCommonValue('photographyStyle'),
          textDensity: mostCommonValue('textDensity'),
          // Summary — combine ALL unique designer perspectives (no arbitrary cap)
          designerNotes: allDesignerNotes.join(' | '),
          // Meta
          productsAnalyzed: allCiResults.length,
          productsFailed: ciFailed,
          // All unique per-field values (so user can see what Gemini found per product
          // and correct if the "most common" pick is wrong)
          fieldVariants: ciFieldVariants,
        };

        addLog('✓ CI aggregiert aus ' + allCiResults.length + ' Produkten:');
        addLog('   Farben: ' + mergedPrimary.join(', '));
        addLog('   Typografie: ' + (productCI.typographyStyle || '–'));
        addLog('   Visual Mood: ' + (productCI.visualMood || '–'));
        addLog('   Fotografie: ' + (productCI.photographyStyle || '–'));
        addLog('   Textdichte: ' + (productCI.textDensity || '–'));
        if (productCI.recurringElements.length > 0) addLog('   Wiederkehrend: ' + productCI.recurringElements.slice(0, 5).join(', '));
      } else {
        addLog('⚠ Keine CI-Ergebnisse — Gemini konnte keine Bilder analysieren');
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
          var pa = await analyzeOneProduct(p, lang);
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
            var wa = await analyzeWebsitePage(section.text, section.source, data.brand, lang);
            websiteAnalyses.push(wa);
          } catch (waErr) {
            addLog('     ⚠ ' + waErr.message);
          }
          if (wi < websiteData.rawTextSections.length - 1) await new Promise(function(r) { setTimeout(r, 300); });
        }
        addLog('✓ ' + websiteAnalyses.length + ' Website-Seiten analysiert');
      }

      // 6. Load knowledge base (23 reference stores) so that Steps 2, 4, 5, 6
      // can use text/style/layout patterns as INSPIRATION throughout.
      addLog('');
      addLog('═══ Wissensdatenbank laden (23 Top-Stores) ═══');
      var kb = null;
      var kbTextPatterns = null;
      try {
        kb = await loadStoreKnowledge();
        if (kb) {
          kbTextPatterns = deriveKbTextPatterns(kb);
          addLog('✓ Wissensdatenbank geladen: ' + ((kbTextPatterns && kbTextPatterns.claimStyles) || []).length + ' Claim-Styles, ' + ((kbTextPatterns && kbTextPatterns.pageFlows) || []).length + ' Page-Flow-Patterns');
        } else {
          addLog('⚠ Wissensdatenbank nicht verfügbar (Steps 2-6 arbeiten ohne KB-Patterns)');
        }
      } catch (kbErr) {
        addLog('⚠ Wissensdatenbank-Fehler: ' + kbErr.message);
      }

      addLog('');
      addLog('═══ SCRAPING KOMPLETT ═══');
      setFinished(true);
      setRunning(false);

      // Auto-advance to brand analysis step with gathered data + KB
      onNext({
        products: products,
        websiteData: websiteData,
        productCI: productCI,
        productAnalyses: productAnalyses,
        websiteAnalyses: websiteAnalyses,
        knowledgeBase: kb,
        kbTextPatterns: kbTextPatterns,
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
        brandVoice = await analyzeBrandVoice(data.products || [], data.brand, websiteTexts, data.brandToneExamples || '', lang);
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
  var moveUsp = function(idx, delta) {
    var next = usps.slice();
    var newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= next.length) return;
    var tmp = next[idx]; next[idx] = next[newIdx]; next[newIdx] = tmp;
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
                <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingTop: 6 }}>
                    <button className="btn" style={{ fontSize: 9, padding: '1px 4px', lineHeight: 1 }} onClick={function() { moveUsp(idx, -1); }} disabled={idx === 0}>↑</button>
                    <button className="btn" style={{ fontSize: 9, padding: '1px 4px', lineHeight: 1 }} onClick={function() { moveUsp(idx, 1); }} disabled={idx === usps.length - 1}>↓</button>
                  </div>
                  <textarea className="input" style={{ flex: 1, minHeight: 36, resize: 'vertical' }} rows={1} value={usp.text || ''} onChange={function(e) { updateUsp(idx, e.target.value); }} placeholder="USP-Text (Enter für mehrzeilig)" />
                  <span style={{ fontSize: 10, color: '#94a3b8', alignSelf: 'center', whiteSpace: 'nowrap' }}>{usp.source || 'manual'}</span>
                  <button className="btn" style={{ fontSize: 10, alignSelf: 'center' }} onClick={function() { removeUsp(idx); }}>×</button>
                </div>
              );
            })}
            {usps.length === 0 && <div style={{ fontSize: 11, color: '#94a3b8' }}>Keine USPs gefunden. Füge welche hinzu oder setze die Website-URL in Schritt 0.</div>}
          </div>

          {/* Brand Story */}
          <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Brand Story / Markengeschichte</div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
              Alles was die Marke ausmacht: Gründung, Herkunft, Mission, Werte. Wird verwendet für "Über uns"-Seite, Homepage-Module und überall wo die KI Markenhintergrund braucht. Leer lassen wenn keine Story verfügbar ist.
            </div>
            <textarea className="input" rows={4} placeholder="Markengeschichte, Gründerstory, Mission, Werte — alles was für Brand-Story-Module relevant ist" value={(data.brandProfile.brandStory && data.brandProfile.brandStory.text) || ''} onChange={function(e) { updateStory('text', e.target.value); updateStory('available', e.target.value.trim().length > 0); }} />
          </div>

          {/* Full CI Profile (from product images via Gemini) */}
          {data.productCI && (
            <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Corporate Identity (aus {data.productCI.productsAnalyzed || '?'} Produktbildern)
              </div>

              {/* Colors */}
              {(data.productCI.primaryColors || []).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Farben</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {data.productCI.primaryColors.map(function(c, i) {
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4 }}>
                          <div style={{ width: 16, height: 16, borderRadius: 2, background: c, border: '1px solid rgba(0,0,0,.1)' }} />
                          <span style={{ fontSize: 10, fontFamily: 'monospace' }}>{c}</span>
                        </div>
                      );
                    })}
                    {data.productCI.backgroundColor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: '#fff', border: '1px dashed #94a3b8', borderRadius: 4 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 2, background: data.productCI.backgroundColor, border: '1px solid rgba(0,0,0,.1)' }} />
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8' }}>BG: {data.productCI.backgroundColor}</span>
                      </div>
                    )}
                  </div>
                  {data.productCI.colorVariation && (
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Farbvariation: {data.productCI.colorVariation}</div>
                  )}
                </div>
              )}

              {/* Typography + Visual Mood + Photography in grid — all EDITABLE */}
              {(function() {
                var variants = data.productCI.fieldVariants || {};
                var updateCI = function(key, val) {
                  var next = Object.assign({}, data.productCI, { [key]: val });
                  updateData({ productCI: next });
                };
                var ciFields = [
                  { key: 'typographyStyle', label: 'Typografie' },
                  { key: 'visualMood', label: 'Visual Mood' },
                  { key: 'photographyStyle', label: 'Fotografie-Stil' },
                  { key: 'textDensity', label: 'Textdichte' },
                  { key: 'backgroundPattern', label: 'Hintergrund' },
                ];
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    {ciFields.map(function(f) {
                      var value = data.productCI[f.key];
                      if (!value && !(variants[f.key] && variants[f.key].length > 0)) return null;
                      var fieldVariants = variants[f.key] || [];
                      return (
                        <div key={f.key}>
                          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>
                            {f.label}
                            {fieldVariants.length > 1 && (
                              <span style={{ fontWeight: 400, color: '#94a3b8' }}> ({fieldVariants.length} Varianten gefunden)</span>
                            )}
                          </div>
                          <input className="input" style={{ fontSize: 11 }} value={value || ''} onChange={function(e) { updateCI(f.key, e.target.value); }} />
                          {fieldVariants.length > 1 && (
                            <select className="input" style={{ fontSize: 10, marginTop: 2, color: '#64748b' }} value="" onChange={function(e) { if (e.target.value) updateCI(f.key, e.target.value); }}>
                              <option value="">Andere Variante wählen...</option>
                              {fieldVariants.map(function(v, vi) { return <option key={vi} value={v}>{v}</option>; })}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Recurring Elements */}
              {(data.productCI.recurringElements || []).length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>Wiederkehrende Designelemente</div>
                  <div style={{ fontSize: 11, color: '#0f172a' }}>{data.productCI.recurringElements.join(' · ')}</div>
                </div>
              )}

              {/* Designer Notes */}
              {data.productCI.designerNotes && (
                <div style={{ padding: '8px 10px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 4, fontSize: 11, color: '#92400e' }}>
                  <strong>Designer-Zusammenfassung:</strong> {data.productCI.designerNotes}
                </div>
              )}
            </div>
          )}

          {/* Knowledge Base Style Patterns (INSPIRATION from 23 top stores) */}
          {data.kbTextPatterns && (
            <div style={{ padding: 14, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#1e40af' }}>Style-Patterns aus 23 Top-Stores (Inspiration)</div>
              <div style={{ fontSize: 11, color: '#1e40af', marginBottom: 8 }}>
                Diese Patterns sind INSPIRATION, keine Regel. Sie helfen dir, Text-Stil, USP-Anzahl und Hero-Strategien an erfolgreichen Stores zu orientieren.
              </div>
              {(data.kbTextPatterns.claimStyles || []).length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 2 }}>Hero-Claim-Stile (aus KB):</div>
                  {data.kbTextPatterns.claimStyles.map(function(cs, i) {
                    return (
                      <div key={i} style={{ fontSize: 10, color: '#475569', marginLeft: 8, marginBottom: 2 }}>
                        • <strong>{cs.type}</strong> ({cs.frequency || '?'}) — z.B. {(cs.examples || []).slice(0, 2).join(' · ')}
                      </div>
                    );
                  })}
                </div>
              )}
              {data.kbTextPatterns.textOnImageInsight && (
                <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>
                  <strong>Text-auf-Bild:</strong> {data.kbTextPatterns.textOnImageInsight}
                </div>
              )}
              {data.kbTextPatterns.ctaInsight && (
                <div style={{ fontSize: 10, color: '#475569' }}>
                  <strong>CTA-Nutzung:</strong> {data.kbTextPatterns.ctaInsight}
                </div>
              )}
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

  // Inline ASIN search component for adding ASINs to a category
  var [searchCatIdx, setSearchCatIdx] = useState(null);
  var [searchQuery, setSearchQuery] = useState('');
  var [newAsinText, setNewAsinText] = useState('');

  // Delete an ASIN globally (remove from allAsins, products, and all categories)
  var deleteAsinGlobally = function(asin) {
    var nextAsins = allAsins.filter(function(a) { return a !== asin; });
    var nextProducts = (data.products || []).filter(function(p) { return p.asin !== asin; });
    var nextCats = categories.map(function(c) {
      return Object.assign({}, c, { asins: (c.asins || []).filter(function(a) { return a !== asin; }) });
    });
    updateData({ asins: nextAsins, products: nextProducts, categories: { categories: nextCats } });
  };

  // Add new ASINs (max 5, parsed from text input)
  var addNewAsins = function() {
    var parsed = parseAsinFile(newAsinText);
    if (parsed.length === 0) return;
    if (parsed.length > 5) { alert('Maximal 5 neue ASINs. Für mehr bitte den Store neu generieren.'); return; }
    var existing = allAsins.slice();
    var added = [];
    parsed.forEach(function(a) { if (existing.indexOf(a) < 0) { existing.push(a); added.push(a); } });
    if (added.length === 0) { alert('Alle ASINs sind bereits vorhanden.'); return; }
    updateData({ asins: existing });
    setNewAsinText('');
    alert(added.length + ' neue ASIN(s) hinzugefügt: ' + added.join(', ') + '\nDiese müssen noch einer Kategorie zugeordnet werden.');
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

  // Add ASIN to category (does NOT remove from other categories — allows multi-assignment)
  var addAsinToCategory = function(asin, targetCatIdx) {
    var next = categories.slice();
    if (targetCatIdx >= 0 && next[targetCatIdx]) {
      var tgt = Object.assign({}, next[targetCatIdx]);
      var asins = (tgt.asins || []).slice();
      if (asins.indexOf(asin) < 0) asins.push(asin);
      tgt.asins = asins;
      next[targetCatIdx] = tgt;
      updateData({ categories: { categories: next } });
    }
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
        <strong>Checkpoint:</strong> Prüfe die Kategorien. ASINs können in <strong>mehreren Kategorien</strong> gleichzeitig sein. Jede ASIN muss in mindestens einer Kategorie vorkommen.
      </div>

      {/* ASIN management: delete globally + add new (max 5) */}
      <div style={{ padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>ASIN komplett entfernen</div>
            <select className="input" style={{ fontSize: 11 }} value="" onChange={function(e) { if (e.target.value && confirm('ASIN ' + e.target.value + ' wirklich komplett entfernen? Sie wird aus allen Kategorien gelöscht.')) deleteAsinGlobally(e.target.value); }}>
              <option value="">ASIN zum Entfernen wählen...</option>
              {allAsins.map(function(a) {
                var p = productsByAsin[a];
                return <option key={a} value={a}>{a} — {p ? (p.name || '').slice(0, 50) : '(kein Produkt)'}</option>;
              })}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Neue ASINs hinzufügen (max. 5)</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <input className="input" style={{ fontSize: 11, flex: 1 }} placeholder="B0XXXXXXXXXX, B0YYYYYY..." value={newAsinText} onChange={function(e) { setNewAsinText(e.target.value); }} />
              <button className="btn" style={{ fontSize: 10, whiteSpace: 'nowrap' }} disabled={!newAsinText.trim()} onClick={addNewAsins}>Hinzufügen</button>
            </div>
            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>Neue ASINs werden NICHT gescrapt — nur als ASIN-Nummer zugeordnet. Produktdaten fehlen.</div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>{allAsins.length} ASINs insgesamt</div>
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
                  <select style={{ fontSize: 10, marginLeft: 4, border: '1px solid #e2e8f0', borderRadius: 3 }} value="" onChange={function(e) { if (e.target.value !== '') addAsinToCategory(a, parseInt(e.target.value, 10)); }}>
                    <option value="">+ Kategorie...</option>
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
            {/* ASIN search + add */}
            {searchCatIdx === idx ? (
              <div style={{ marginTop: 6, position: 'relative' }}>
                <input className="input" style={{ fontSize: 11 }} autoFocus placeholder="ASIN oder Produktname suchen..." value={searchQuery} onChange={function(e) { setSearchQuery(e.target.value); }} onBlur={function() { setTimeout(function() { setSearchCatIdx(null); setSearchQuery(''); }, 200); }} />
                {searchQuery.trim().length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0 0 6px 6px', boxShadow: '0 4px 12px rgba(0,0,0,.1)', maxHeight: 180, overflow: 'auto' }}>
                    {(function() {
                      var q = searchQuery.trim().toLowerCase();
                      var matches = allAsins.filter(function(a) {
                        if ((cat.asins || []).indexOf(a) >= 0) return false; // already in this category
                        var p = productsByAsin[a];
                        var name = p ? (p.name || '').toLowerCase() : '';
                        return a.toLowerCase().indexOf(q) >= 0 || name.indexOf(q) >= 0;
                      });
                      if (matches.length === 0) return <div style={{ padding: '8px 10px', fontSize: 10, color: '#94a3b8' }}>Keine Treffer</div>;
                      return matches.slice(0, 15).map(function(a) {
                        var p = productsByAsin[a];
                        return (
                          <div key={a} onMouseDown={function(e) { e.preventDefault(); addAsinToCategory(a, idx); setSearchQuery(''); }} style={{ padding: '6px 10px', fontSize: 10, cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 6, alignItems: 'center' }} onMouseOver={function(e) { e.currentTarget.style.background = '#f0f9ff'; }} onMouseOut={function(e) { e.currentTarget.style.background = ''; }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, flexShrink: 0 }}>{a}</span>
                            <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p ? p.name : ''}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <button className="btn" style={{ fontSize: 10, marginTop: 6 }} onClick={function() { setSearchCatIdx(idx); setSearchQuery(''); }}>+ ASIN suchen &amp; hinzufügen</button>
            )}
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
  // Build initial page-content list. USPs are CONTEXT-DEPENDENT per page:
  // - Homepage: brand-level USPs only (what applies to the WHOLE brand)
  // - Category page: category-specific USPs (what applies to THIS product group)
  // - Extra pages: depends on page type — no forced USP assignment
  // The user edits everything. This is just a starting suggestion.
  var brandProfile = data.brandProfile || {};
  var categories = (data.categories && data.categories.categories) || [];
  var brandUsps = (brandProfile.usps || []).map(function(u) { return u.text || ''; }).filter(Boolean);
  var productAnalyses = data.productAnalyses || [];
  var pages = [];

  // Homepage — brand-level USPs, overview of the whole brand
  pages.push({
    id: 'homepage',
    name: 'Homepage',
    kind: 'homepage',
    heroHeadline: (brandProfile.heroBannerConcept && brandProfile.heroBannerConcept.headline) || data.brand,
    heroSubline: (brandProfile.heroBannerConcept && brandProfile.heroBannerConcept.subline) || '',
    usps: brandUsps.slice(), // ALL brand USPs — user removes what doesn't fit
    imageIdeas: ['Hero lifestyle: ' + data.brand + ' key product in real-life context'].concat(
      (brandProfile.imageConcepts || []).map(function(ic) { return ic.description || ''; }).filter(Boolean)
    ),
    cta: 'Jetzt entdecken',
    asins: [],
    notes: '',
  });

  // One per category — category-specific USPs from product analyses
  categories.forEach(function(cat, i) {
    // Find benefits specific to products in THIS category
    var catAsins = cat.asins || [];
    var catBenefits = [];
    var benefitSeen = {};
    productAnalyses.forEach(function(pa) {
      if (catAsins.indexOf(pa.asin) < 0) return;
      (pa.keyBenefits || []).forEach(function(b) {
        var key = b.toLowerCase().slice(0, 40);
        if (!benefitSeen[key]) { benefitSeen[key] = true; catBenefits.push(b); }
      });
    });
    // Also include category-level USPs from the categorization step
    (cat.categoryUSPs || cat.commonFeatures || []).forEach(function(f) {
      var key = f.toLowerCase().slice(0, 40);
      if (!benefitSeen[key]) { benefitSeen[key] = true; catBenefits.push(f); }
    });

    pages.push({
      id: 'cat-' + i,
      name: cat.name || ('Kategorie ' + (i + 1)),
      kind: 'category',
      heroHeadline: cat.name,
      heroSubline: cat.description || '',
      usps: catBenefits, // category-specific, not brand-global
      imageIdeas: ['Category hero: ' + cat.name + ' product group in real-life use'],
      cta: 'Produkte ansehen',
      asins: catAsins.slice(),
      notes: '',
    });
  });

  // Extra pages — content is derived from REAL data, not hardcoded templates.
  // Each page type pulls from different data sources based on what's available.
  // If no relevant data exists for a page type, USPs/imageIdeas stay empty
  // and the user either fills them or the AI generates from context in Step 6.
  var extras = data.extraPages || {};
  var trustElements = (brandProfile.trustElements || []).map(function(t) { return t.text || t; }).filter(Boolean);
  var certifications = [];
  if (data.websiteData && data.websiteData.certifications) certifications = data.websiteData.certifications;
  var websiteFeatures = [];
  if (data.websiteData && data.websiteData.features) websiteFeatures = data.websiteData.features;
  var bestProducts = (data.products || []).slice().sort(function(a, b) { return (b.reviews || 0) - (a.reviews || 0); });

  // Collect sustainability-related certs from real website data
  var sustainCerts = certifications.filter(function(c) {
    return /nachhaltig|sustainab|bio|organic|recycl|klima|co2|öko|eco|fsc|pefc|fair|cruelty|vegan/i.test(c);
  });

  var EXTRA_PAGES = {
    about_us: {
      name: 'Über uns',
      headline: brandProfile.brandStory && brandProfile.brandStory.headline ? brandProfile.brandStory.headline : data.brand,
      cta: '',
      // About page: brand USPs are relevant here (what the whole brand stands for)
      usps: brandUsps.slice(),
      imageIdeas: [],
    },
    bestsellers: {
      name: 'Bestseller',
      headline: '',
      cta: '',
      usps: trustElements, // real trust signals from brand profile
      imageIdeas: [],
      asins: bestProducts.slice(0, 12).map(function(p) { return p.asin; }),
    },
    sustainability: {
      name: 'Nachhaltigkeit',
      headline: '',
      cta: '',
      // Only REAL certifications that relate to sustainability
      usps: sustainCerts,
      imageIdeas: [],
    },
    how_it_works: {
      name: 'So funktioniert\'s',
      headline: '',
      cta: '',
      usps: websiteFeatures, // real features from website scraping
      imageIdeas: [],
    },
    new_arrivals: {
      name: 'Neuheiten',
      headline: '',
      cta: '',
      usps: [],
      imageIdeas: [],
    },
    gift_sets: {
      name: 'Geschenk-Sets',
      headline: '',
      cta: '',
      usps: [],
      imageIdeas: [],
    },
    subscribe_save: {
      name: 'Spar-Abo',
      headline: '',
      cta: '',
      usps: [], // no defaults — must come from real brand data
      imageIdeas: [],
    },
    deals: {
      name: 'Angebote',
      headline: '',
      cta: '',
      usps: [],
      imageIdeas: [],
      asins: bestProducts.slice(0, 12).map(function(p) { return p.asin; }),
    },
  };
  Object.keys(extras).forEach(function(k) {
    if (!extras[k]) return;
    var meta = EXTRA_PAGES[k] || { name: k, headline: '', cta: '', usps: [], imageIdeas: [] };
    pages.push({
      id: k,
      name: meta.name,
      kind: k,
      heroHeadline: meta.headline || '',
      heroSubline: '',
      usps: meta.usps || [],
      imageIdeas: meta.imageIdeas || [],
      cta: meta.cta || '',
      asins: meta.asins || [],
      notes: '',
    });
  });
  return pages;
}

function StepContent({ data, updateData, onNext, onBack }) {
  var [generating, setGenerating] = useState(false);
  var [genError, setGenError] = useState('');
  var generatedRef = useRef(false);

  // Generate page content via AI instead of templates.
  // Uses planPages() from contentPipeline.js which considers the knowledge base,
  // brand profile, categories, product analyses, and extra page selections.
  var generateContent = async function() {
    if (generating) return;
    setGenerating(true);
    setGenError('');
    try {
      var lang = LANGS[data.marketplace] || 'German';
      var storeKnowledgeStr = null;
      if (data.knowledgeBase) {
        storeKnowledgeStr = formatStoreKnowledge(data.knowledgeBase);
      }
      // planPages returns per-page content fields (heroHeadline, heroSubline, cta, usps,
      // imageIdeas, notes, asins) PLUS the structural sections array. We use the content
      // fields directly as initial Phase 4 page content. No more mapping from sec.purpose.
      var pagePlan = await planPages(
        data.brandProfile || {},
        data.categories || { categories: [] },
        data.productAnalyses || [],
        storeKnowledgeStr,
        data.brand,
        lang,
        data.extraPages || {},
        data.brandIntelligence || null,
        null
      );

      var categories = (data.categories && data.categories.categories) || [];
      var productAnalyses = data.productAnalyses || [];
      var brandUsps = ((data.brandProfile || {}).usps || []).map(function(u) { return u.text || ''; }).filter(Boolean);
      var pages = [];
      (pagePlan.pages || []).forEach(function(pp) {
        // Determine kind: prefer pp.kind from AI, fall back to heuristic
        var kind = pp.kind || 'custom';
        if (!pp.kind) {
          if (pp.id === 'homepage' || (pp.name || '').toLowerCase() === 'homepage') kind = 'homepage';
          else if ((pp.id || '').indexOf('cat') === 0) kind = 'category';
          else if (['about_us', 'bestsellers', 'sustainability', 'how_it_works', 'new_arrivals', 'gift_sets', 'subscribe_save', 'deals'].indexOf(pp.id) >= 0) kind = pp.id;
        }

        // USPs: use planPages output directly. Enrich only if empty.
        var pageUsps = Array.isArray(pp.usps) ? pp.usps.filter(Boolean) : [];
        if (pageUsps.length === 0) {
          if (kind === 'homepage') {
            pageUsps = brandUsps.slice(0, 5);
          } else if (kind === 'category') {
            var cat = categories.find(function(c) { return c.name === pp.name; });
            if (cat) {
              // Prefer categoryUSPs (produced by groupIntoCategories)
              if (Array.isArray(cat.categoryUSPs) && cat.categoryUSPs.length) {
                pageUsps = cat.categoryUSPs.slice(0, 5);
              } else {
                var catAsins = cat.asins || [];
                var benefitSeen = {};
                productAnalyses.forEach(function(pa) {
                  if (catAsins.indexOf(pa.asin) < 0) return;
                  (pa.keyBenefits || []).forEach(function(b) {
                    var key = (b || '').toLowerCase().slice(0, 40);
                    if (key && !benefitSeen[key]) { benefitSeen[key] = true; pageUsps.push(b); }
                  });
                });
                pageUsps = pageUsps.slice(0, 5);
              }
            }
          }
        }

        // Image ideas: use planPages output directly, fall back to generic brief
        var pageImageIdeas = Array.isArray(pp.imageIdeas) ? pp.imageIdeas.filter(Boolean) : [];
        if (pageImageIdeas.length === 0) {
          pageImageIdeas = [kind === 'homepage'
            ? 'Hero-Motiv zur Markengeschichte, Stimmung passt zur visuellen CI'
            : 'Hero-Motiv für Seite ' + (pp.name || '')];
        }

        // Hero headline: real marketing headline from AI, never just the page name
        var heroHeadline = (pp.heroHeadline && pp.heroHeadline.trim()) ? pp.heroHeadline.trim() : '';
        if (!heroHeadline) {
          // Safe fallback: prefer brandProfile hero hint, then page name
          var heroHint = data.brandProfile && data.brandProfile.heroBannerConcept && data.brandProfile.heroBannerConcept.headline;
          heroHeadline = heroHint || (pp.name || 'Willkommen');
        }

        var heroSubline = (pp.heroSubline && pp.heroSubline.trim()) ? pp.heroSubline.trim() : '';
        var cta = (typeof pp.cta === 'string') ? pp.cta.trim() : '';
        var notes = (typeof pp.notes === 'string') ? pp.notes.trim() : '';

        pages.push({
          id: pp.id || ('page-' + pages.length),
          name: pp.name,
          kind: kind,
          heroHeadline: heroHeadline,
          heroSubline: heroSubline,
          cta: cta,
          usps: pageUsps,
          imageIdeas: pageImageIdeas,
          notes: notes,
          asins: Array.isArray(pp.asins) ? pp.asins : [],
          // Keep the structural sections so Phase 6 (generateOnePage) has the layout plan
          sections: Array.isArray(pp.sections) ? pp.sections : [],
        });
      });
      if (pages.length > 0) {
        updateData({ pageContent: pages });
      } else {
        // Fallback to template derivation
        updateData({ pageContent: derivePageContent(data) });
      }
    } catch (err) {
      setGenError('KI-Generierung fehlgeschlagen: ' + err.message + '. Template-Fallback wird verwendet.');
      updateData({ pageContent: derivePageContent(data) });
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate on first mount
  useEffect(function() {
    if (!generatedRef.current && (!data.pageContent || data.pageContent.length === 0)) {
      generatedRef.current = true;
      generateContent();
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

  // Detect expected tile counts from pageStructure (if step 5 was already visited)
  // This creates the "Layout informs Content" direction: if the user set up a
  // 4-tile USP section in Step 5, we nudge them to have exactly 4 USPs here.
  var structureHints = {};
  (data.pageStructure || []).forEach(function(ps) {
    var expectedUspCount = 0;
    (ps.sections || []).forEach(function(sec) {
      var purpose = (sec.purpose || '').toLowerCase();
      if (purpose.indexOf('usp') >= 0 || purpose.indexOf('benefit') >= 0) {
        expectedUspCount = Math.max(expectedUspCount, layoutCellsFor(sec.layoutId));
      }
    });
    if (expectedUspCount > 0) structureHints[ps.id] = { expectedUspCount: expectedUspCount };
  });

  return (
    <div>
      <div style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
        <strong>Checkpoint:</strong> Pro Seite: Headline, USPs, Bild-Ideen, CTA.{' '}
        <strong>Content ↔ Layout beeinflussen sich gegenseitig</strong> — du kannst jederzeit zu Schritt 5 springen und ein Layout wählen, das dich zurück nach hier führt, um Content anzupassen.
      </div>

      {generating && (
        <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#92400e', marginBottom: 12 }}>
          KI generiert Content für jede Seite (Brand Voice + Produkte + KB-Patterns)... Bitte warten.
        </div>
      )}
      {genError && (
        <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#991b1b', marginBottom: 12 }}>
          {genError} <button className="btn" style={{ fontSize: 10, marginLeft: 6 }} onClick={generateContent}>Erneut versuchen</button>
        </div>
      )}

      {/* KB inspiration bar (shown once at the top for the whole step) */}
      {data.kbTextPatterns && (
        <div style={{ padding: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, marginBottom: 12, fontSize: 11, color: '#1e40af' }}>
          <strong>Inspiration aus 23 Top-Stores:</strong>
          <span style={{ marginLeft: 8 }}>
            Hero-Claim-Stile: {(data.kbTextPatterns.claimStyles || []).map(function(c) { return c.type + ' (' + c.frequency + ')'; }).join(' · ')}.{' '}
          </span>
          {data.kbTextPatterns.textOnImageInsight && <span>{data.kbTextPatterns.textOnImageInsight} </span>}
          {data.kbTextPatterns.ctaInsight && <span>{data.kbTextPatterns.ctaInsight}</span>}
        </div>
      )}

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
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                  USPs auf dieser Seite
                  {structureHints[active.id] && (
                    <span style={{ marginLeft: 8, color: (active.usps || []).length === structureHints[active.id].expectedUspCount ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                      Layout verlangt {structureHints[active.id].expectedUspCount}
                      {' '}— aktuell {(active.usps || []).length}
                    </span>
                  )}
                </div>
                <button className="btn" style={{ fontSize: 10 }} onClick={function() { addUspToPage(activeIdx); }}>+ USP</button>
              </div>
              {/* Layout-Content mismatch warning with auto-fix buttons */}
              {structureHints[active.id] && (active.usps || []).length !== structureHints[active.id].expectedUspCount && (
                <div style={{ padding: '6px 8px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, fontSize: 10, color: '#92400e', marginBottom: 6 }}>
                  Das Layout in Schritt 5 hat {structureHints[active.id].expectedUspCount} Kacheln,
                  der Content hier hat {(active.usps || []).length} USP{(active.usps || []).length === 1 ? '' : 's'}.
                  {(active.usps || []).length < structureHints[active.id].expectedUspCount && (
                    <button className="btn" style={{ fontSize: 10, marginLeft: 6 }} onClick={function() {
                      var need = structureHints[active.id].expectedUspCount - (active.usps || []).length;
                      var next = (active.usps || []).slice();
                      for (var k = 0; k < need; k++) next.push('');
                      updatePage(activeIdx, { usps: next });
                    }}>+ {structureHints[active.id].expectedUspCount - (active.usps || []).length} leere Slots hinzufügen</button>
                  )}
                  {(active.usps || []).length > structureHints[active.id].expectedUspCount && (
                    <button className="btn" style={{ fontSize: 10, marginLeft: 6 }} onClick={function() {
                      updatePage(activeIdx, { usps: (active.usps || []).slice(0, structureHints[active.id].expectedUspCount) });
                    }}>Auf {structureHints[active.id].expectedUspCount} kürzen</button>
                  )}
                </div>
              )}
              {(active.usps || []).map(function(usp, ui) {
                return (
                  <div key={ui} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    <textarea className="input" style={{ flex: 1, fontSize: 11, minHeight: 32, resize: 'vertical' }} rows={1} value={usp} onChange={function(e) { updateUspOnPage(activeIdx, ui, e.target.value); }} placeholder={'USP ' + (ui + 1) + ' (Enter für neue Zeile)'} />
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
  { id: 'vh-4square', name: '4 Squares (VH)', cells: 4 },
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

// Derive initial structure from content.
// KEY RULES:
// - Layout is NOT coupled to USP count. USPs are content; they can be shown
//   in many layout forms (1 big tile with 4 USPs as text, 4 small tiles,
//   a full-width banner, etc.). The user decides in this step.
// - brief = image idea for the designer (English, 10-20 words).
//   textOverlay = text displayed ON the image (store language, UI element).
//   These are SEPARATE fields — never set them to the same value.
// - USP consistency: if the same USP appears on multiple pages, the wording
//   must be identical. This is checked at generation time, not enforced here.
function deriveStructure(data) {
  var pageContent = data.pageContent || [];
  var storeType = data.storeType || 'product-showcase';
  var result = [];

  pageContent.forEach(function(pc) {
    var sections = [];
    var usps = pc.usps || [];
    var lang = LANGS[data.marketplace] || 'German';

    // Hero section — always full-width
    sections.push({
      id: 'hero-' + pc.id,
      purpose: 'Hero',
      layoutId: '1',
      tiles: [{
        type: 'image',
        imageCategory: 'lifestyle',
        brief: (pc.imageIdeas && pc.imageIdeas[0]) || 'hero lifestyle image for ' + pc.name,
        textOverlay: pc.heroHeadline || '',
        ctaText: pc.cta || '',
      }],
    });

    // USPs section — if the page has USPs. Layout is a SUGGESTION, user changes it.
    // No coupling of USP count to layout. Default: full-width with USPs as text overlay.
    if (usps.length > 0) {
      sections.push({
        id: 'usps-' + pc.id,
        purpose: pc.kind === 'homepage' ? 'Brand USPs' : (pc.kind === 'category' ? 'Category benefits' : 'Key benefits'),
        layoutId: '1',
        tiles: [{
          type: 'image',
          imageCategory: 'benefit',
          brief: 'benefit banner showing ' + usps.length + ' key points as icons or text layout for ' + pc.name,
          textOverlay: usps.join(' | '),
          ctaText: '',
        }],
      });
    }

    if (pc.kind === 'homepage') {
      // Category navigation
      var cats = (data.categories && data.categories.categories) || [];
      if (cats.length >= 1) {
        sections.push({
          id: 'categories-' + pc.id,
          purpose: 'Category navigation',
          layoutId: cats.length <= 2 ? 'std-2equal' : cats.length <= 4 ? '2x2wide' : '4x2grid',
          tiles: cats.map(function(c) {
            return {
              type: 'image',
              imageCategory: 'creative',
              brief: 'category teaser image for ' + c.name,
              textOverlay: c.name,
              ctaText: lang === 'German' ? 'Entdecken' : 'Explore',
            };
          }),
        });
      }
      // Featured products
      sections.push({
        id: 'bestsellers-' + pc.id,
        purpose: 'Featured products',
        layoutId: '1',
        tiles: [{ type: 'product_grid', asins: data.asins ? data.asins.slice(0, 8) : [], brief: '', textOverlay: '' }],
      });

    } else if (pc.kind === 'category') {
      // Lifestyle teaser
      sections.push({
        id: 'teaser-' + pc.id,
        purpose: 'Category teaser',
        layoutId: 'std-2equal',
        tiles: [
          { type: 'image', imageCategory: 'lifestyle', brief: 'lifestyle shot showing ' + pc.name + ' products in use', textOverlay: '', ctaText: '' },
          { type: 'image', imageCategory: 'creative', brief: 'hero product from ' + pc.name + ' category', textOverlay: pc.heroSubline || '', ctaText: pc.cta || '' },
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
      // Extra pages — simple structure, user customizes
      sections.push({
        id: 'body-' + pc.id,
        purpose: 'Main content',
        layoutId: 'std-2equal',
        tiles: [
          { type: 'image', imageCategory: 'lifestyle', brief: (pc.imageIdeas && pc.imageIdeas[1]) || 'supporting image for ' + pc.name, textOverlay: '', ctaText: '' },
          { type: 'text', imageCategory: 'text_image', brief: '', textOverlay: pc.heroSubline || '', ctaText: pc.cta || '' },
        ],
      });
    }

    // Additional image ideas from content (if any beyond the hero)
    // Split into sections that match their layout cell count
    var extraIdeas = (pc.imageIdeas || []).slice(1);
    while (extraIdeas.length > 0) {
      var batch;
      var layoutForBatch;
      if (extraIdeas.length === 1) {
        batch = extraIdeas.splice(0, 1);
        layoutForBatch = '1';
      } else {
        batch = extraIdeas.splice(0, 2);
        layoutForBatch = 'std-2equal';
      }
      sections.push({
        id: 'images-' + pc.id + '-' + sections.length,
        purpose: 'Additional visuals',
        layoutId: layoutForBatch,
        tiles: batch.map(function(idea) {
          return { type: 'image', imageCategory: 'lifestyle', brief: idea, textOverlay: '', ctaText: '' };
        }),
      });
    }

    result.push({ id: pc.id, name: pc.name, kind: pc.kind, storeTypeHint: storeType, sections: sections });
  });
  return result;
}

function StepStructure({ data, updateData, onNext, onBack }) {
  var [generating, setGenerating] = useState(false);
  var [genError, setGenError] = useState('');
  var [genProgress, setGenProgress] = useState('');
  var generatedRef = useRef(false);

  // Generate structure via AI — one call per page
  var generateStructure = async function() {
    if (generating) return;
    setGenerating(true);
    setGenError('');
    try {
      var lang = LANGS[data.marketplace] || 'German';
      var storeKnowledgeStr = null;
      if (data.knowledgeBase) storeKnowledgeStr = formatStoreKnowledge(data.knowledgeBase);
      var pageContent = data.pageContent || [];
      var brandProfile = data.brandProfile || {};
      var categories = data.categories || { categories: [] };
      var storeType = data.storeType || 'product-showcase';
      var result = [];

      for (var gi = 0; gi < pageContent.length; gi++) {
        var pc = pageContent[gi];
        setGenProgress('Seite ' + (gi + 1) + '/' + pageContent.length + ': ' + pc.name);
        var pagePlan = {
          id: pc.id,
          name: pc.name,
          sections: [{ purpose: 'Full page', contentSource: 'all available', layout: 'auto' }],
          userContent: {
            heroHeadline: pc.heroHeadline,
            heroSubline: pc.heroSubline,
            usps: pc.usps,
            imageIdeas: pc.imageIdeas,
            cta: pc.cta,
            notes: pc.notes,
            asins: pc.asins,
          },
        };
        try {
          var pageResult = await generateOnePage(pagePlan, brandProfile, categories, data.productAnalyses || [], data.brand, lang, result, storeKnowledgeStr);
          result.push({
            id: pc.id,
            name: pc.name,
            kind: pc.kind,
            storeTypeHint: storeType,
            sections: (pageResult.sections || []).map(function(sec, si) {
              return {
                id: 'sec-' + pc.id + '-' + si,
                purpose: sec.purpose || '',
                layoutId: sec.layoutId || '1',
                tiles: (sec.tiles || []).map(function(t) {
                  return {
                    type: t.type || 'image',
                    imageCategory: t.imageCategory || 'lifestyle',
                    brief: t.brief || '',
                    textOverlay: t.textOverlay || '',
                    ctaText: t.ctaText || '',
                    asins: t.asins || [],
                    linkAsin: t.linkAsin || '',
                  };
                }),
              };
            }),
          });
        } catch (pgErr) {
          // Fallback: use template structure for this page
          var fallback = deriveStructure(Object.assign({}, data, { pageContent: [pc] }));
          if (fallback[0]) result.push(fallback[0]);
        }
        if (gi < pageContent.length - 1) await new Promise(function(r) { setTimeout(r, 500); });
      }
      if (result.length > 0) {
        updateData({ pageStructure: result });
      } else {
        updateData({ pageStructure: deriveStructure(data) });
      }
    } catch (err) {
      setGenError('KI-Generierung fehlgeschlagen: ' + err.message + '. Template-Fallback.');
      updateData({ pageStructure: deriveStructure(data) });
    } finally {
      setGenerating(false);
      setGenProgress('');
    }
  };

  useEffect(function() {
    if (!generatedRef.current && (!data.pageStructure || data.pageStructure.length === 0)) {
      generatedRef.current = true;
      generateStructure();
    }
  }, []);

  var pages = data.pageStructure || [];
  var [activeIdx, setActiveIdx] = useState(0);
  var active = pages[activeIdx] || null;

  // Sync USP count on the corresponding content page when layout changes
  // This is the "Layout informs Content" direction of the bidirectional loop.
  var syncContentUspsToLayout = function(pageId, expectedCount) {
    var nextContent = (data.pageContent || []).slice();
    var idx = nextContent.findIndex(function(pc) { return pc.id === pageId; });
    if (idx < 0) return;
    var pc = Object.assign({}, nextContent[idx]);
    var usps = (pc.usps || []).slice();
    while (usps.length < expectedCount) usps.push('');
    if (usps.length > expectedCount) usps = usps.slice(0, expectedCount);
    pc.usps = usps;
    nextContent[idx] = pc;
    updateData({ pageContent: nextContent });
  };

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

      {generating && (
        <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#92400e', marginBottom: 12 }}>
          KI generiert Seitenstruktur (Layout + Kacheln pro Seite)... {genProgress}
        </div>
      )}
      {genError && (
        <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#991b1b', marginBottom: 12 }}>
          {genError} <button className="btn" style={{ fontSize: 10, marginLeft: 6 }} onClick={generateStructure}>Erneut versuchen</button>
        </div>
      )}

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
              var cells = layoutMeta.cells;
              var purposeLower = (sec.purpose || '').toLowerCase();
              var isUspSection = purposeLower.indexOf('usp') >= 0 || purposeLower.indexOf('benefit') >= 0;
              // Determine current content state for this page (for mismatch warnings)
              var pc = (data.pageContent || []).find(function(x) { return x.id === active.id; });
              var contentUspCount = pc ? (pc.usps || []).length : 0;
              var uspMismatch = isUspSection && pc && contentUspCount !== cells;

              return (
                <div key={sec.id || si} style={{ padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                    <input className="input" style={{ flex: 1, fontSize: 11, fontWeight: 600 }} value={sec.purpose || ''} onChange={function(e) { updateSectionPurpose(activeIdx, si, e.target.value); }} />
                    <select className="input" style={{ width: 180, fontSize: 11 }} value={sec.layoutId} onChange={function(e) { changeLayout(activeIdx, si, e.target.value); }}>
                      {WIZARD_LAYOUTS.map(function(l) {
                        var hint = data.kbTextPatterns && data.kbTextPatterns.layoutHints && data.kbTextPatterns.layoutHints[l.id];
                        return <option key={l.id} value={l.id}>{l.name} ({l.cells}){hint ? ' · ' + hint.usage : ''}</option>;
                      })}
                    </select>
                    <button className="btn" style={{ fontSize: 10 }} onClick={function() { moveSection(activeIdx, si, -1); }} disabled={si === 0}>↑</button>
                    <button className="btn" style={{ fontSize: 10 }} onClick={function() { moveSection(activeIdx, si, 1); }} disabled={si === active.sections.length - 1}>↓</button>
                    <button className="btn" style={{ fontSize: 10 }} onClick={function() { removeSection(activeIdx, si); }}>×</button>
                  </div>

                  {/* Mismatch warning: layout has N cells, content has M USPs */}
                  {uspMismatch && (
                    <div style={{ padding: '6px 8px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, fontSize: 10, color: '#92400e', marginBottom: 6 }}>
                      Layout hat {cells} Kacheln, Content hat aber {contentUspCount} USP{contentUspCount === 1 ? '' : 's'}.{' '}
                      <button className="btn" style={{ fontSize: 10, marginLeft: 4 }} onClick={function() { syncContentUspsToLayout(active.id, cells); }}>
                        Content auf {cells} anpassen
                      </button>
                      <button className="btn" style={{ fontSize: 10, marginLeft: 4 }} onClick={function() { changeLayout(activeIdx, si, suggestLayoutForCells(contentUspCount)); }}>
                        Layout auf {contentUspCount} Kacheln setzen
                      </button>
                      <button className="btn" style={{ fontSize: 10, marginLeft: 4 }} onClick={onBack}>← Content editieren</button>
                    </div>
                  )}

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
// STEP 6: GENERATION — delegates to the main App.jsx pipeline (handleGenerate).
// The wizard bundles all user-prepared data as `params.prepared`, so the main
// pipeline can skip re-scraping, re-analysing, re-drafting brand voice, etc.
// This guarantees ONE single pipeline (no parallel wizard-pipeline drift).
// ═══════════════════════════════════════════════════════════════════════════
function StepGenerate({ data, onGenerate, onCancel, onBack }) {
  var pageCount = (data.pageStructure || []).length;
  var productCount = (data.products || []).length;
  var existing = !!data.existingStoreUrl;

  var handleStart = function() {
    if (!onGenerate) return;
    var params = {
      asins: data.asins,
      marketplace: data.marketplace,
      brand: data.brand,
      logoFile: data.logoFile,
      fontNames: data.fontNames,
      brandColors: data.brandColors,
      brandToneExamples: data.brandToneExamples,
      extraPages: data.extraPages,
      existingStoreUrl: data.existingStoreUrl,
      existingStoreMode: data.existingStoreMode,
      keepMenuStructure: data.keepMenuStructure,
      adoptExistingContent: data.adoptExistingContent,
      websiteData: data.websiteData,
      // Prepared bundle: lets App.jsx's handleGenerate skip redundant phases
      // AND respect wizard edits from Steps 4 (pageContent) and 5 (pageStructure).
      prepared: {
        products: data.products,
        productCI: data.productCI,
        productAnalyses: data.productAnalyses,
        categories: data.categories,
        websiteAnalyses: data.websiteAnalyses,
        brandVoice: data.brandVoice,
        brandProfile: data.brandProfile,
        pageContent: data.pageContent,
        pageStructure: data.pageStructure,
      },
    };
    onGenerate(params);
    // App.jsx sets showWizard=false at the start of handleGenerate, so the
    // wizard will unmount automatically and the main generation log overlay
    // takes over. We don't need to call onCancel() here.
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
        <strong>Übergabe an Haupt-Pipeline:</strong> Deine Vorbereitung wird gebündelt und an die zentrale Store-Generierung übergeben. Die Pipeline überspringt bereits erledigte Schritte (Scraping, Brand Voice, Kategorien), generiert alle Seiten nach deiner Struktur und glättet die Texte auf die Brand Voice.
      </div>

      <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Zusammenfassung</div>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
          <div><strong>Marke:</strong> {data.brand || '—'}</div>
          <div><strong>Marketplace:</strong> {data.marketplace || '—'}</div>
          <div><strong>Produkte:</strong> {productCount}</div>
          <div><strong>Seiten:</strong> {pageCount}</div>
          {existing && (
            <div>
              <strong>Bestehender Store:</strong>{' '}
              {data.existingStoreMode === 'optimize' ? 'Optimieren (Struktur behalten)' : 'Komplett neu konzipieren'}
            </div>
          )}
          {data.brandVoice && data.brandVoice.tone && (
            <div><strong>Brand Voice:</strong> {data.brandVoice.tone}</div>
          )}
        </div>
      </div>

      <div style={{ padding: '10px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, color: '#1e40af', marginBottom: 16 }}>
        Hinweis: Nach Klick auf „Store generieren" schließt sich der Wizard und die Generierung läuft im Hauptfenster weiter. Du siehst dort einen detaillierten Fortschrittslog.
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn" onClick={onBack}>Zurück zur Struktur</button>
        <button className="btn btn-primary" onClick={handleStart}>Store generieren →</button>
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
