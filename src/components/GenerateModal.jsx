import { useState, useRef } from 'react';
import { COMPLEXITY_LEVELS, STORE_TEMPLATES, LAYOUTS, findLayout, CATEGORY_STYLE_HINTS } from '../constants';
import { discoverBrandProducts, scrapeWebsite } from '../api';

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

export default function GenerateModal({ onClose, onGenerate, googleDriveUrl, onGoogleDriveChange }) {
  var [brand, setBrand] = useState('');
  var [marketplace, setMarketplace] = useState('de');
  var [instructions, setInstructions] = useState('');
  var [asins, setAsins] = useState([]);
  var [pasteText, setPasteText] = useState('');
  var [complexity, setComplexity] = useState(2);
  var [selectedTemplate, setSelectedTemplate] = useState(null);
  var [showTemplateDetail, setShowTemplateDetail] = useState(null);
  var [inputMode, setInputMode] = useState('file'); // 'file', 'paste', 'brandUrl'
  var [brandUrl, setBrandUrl] = useState('');
  var [brandDiscovering, setBrandDiscovering] = useState(false);
  var [brandDiscoverError, setBrandDiscoverError] = useState('');
  var [brandDiscoverProgress, setBrandDiscoverProgress] = useState('');
  var [websiteUrl, setWebsiteUrl] = useState('');
  var [websiteData, setWebsiteData] = useState(null);
  var [websiteScraping, setWebsiteScraping] = useState(false);
  var [websiteError, setWebsiteError] = useState('');
  var [referenceStoreUrls, setReferenceStoreUrls] = useState(['']);
  var [referenceUrlErrors, setReferenceUrlErrors] = useState({});
  var [existingStoreUrl, setExistingStoreUrl] = useState('');
  var [existingStoreUrlError, setExistingStoreUrlError] = useState('');
  var [existingStoreMode, setExistingStoreMode] = useState('optimize');
  var [driveUrl, setDriveUrl] = useState(googleDriveUrl || '');
  var [referenceCategory, setReferenceCategory] = useState('generic');
  var [enableCIDetection, setEnableCIDetection] = useState(false);
  var [storytellingType, setStorytellingType] = useState('automatic');
  var fileRef = useRef(null);

  var onFileChange = function(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function(ev) { setAsins(parseAsinFile(ev.target.result)); setInputMode('file'); };
    reader.readAsText(f);
    if (fileRef.current) fileRef.current.value = '';
  };

  var onPasteConfirm = function() {
    if (pasteText.trim()) {
      setAsins(parseAsinFile(pasteText));
      setInputMode('file');
    }
  };

  var cleanBrandUrl = function(url) {
    // Clean Amazon store URLs: remove tracking params, decode entities
    var cleaned = url.trim();
    // Fix HTML entity artifacts from copy-paste (e.g., &amp; → &)
    cleaned = cleaned.replace(/&amp;/g, '&');
    // Remove common tracking parameters
    try {
      var urlObj = new URL(cleaned);
      var paramsToRemove = ['ingress', 'lp_context_asin', 'lp_context_query', 'visitId', 'ref',
        'lp_asin', 'store_ref', 'byline_logo_guardrail_passed'];
      paramsToRemove.forEach(function(p) { urlObj.searchParams.delete(p); });
      cleaned = urlObj.toString();
      // Remove trailing underscore (common copy-paste artifact)
      if (cleaned.endsWith('_')) cleaned = cleaned.slice(0, -1);
    } catch (e) { /* keep original if URL parsing fails */ }
    return cleaned;
  };

  var onBrandDiscover = async function() {
    if (!brandUrl.trim()) return;
    setBrandDiscovering(true);
    setBrandDiscoverError('');
    setBrandDiscoverProgress('Starting discovery...');
    try {
      var cleanedUrl = cleanBrandUrl(brandUrl);
      var result = await discoverBrandProducts(cleanedUrl, function(msg) {
        setBrandDiscoverProgress(msg);
      });
      if (result.asins && result.asins.length > 0) {
        setAsins(result.asins);
        if (!brand.trim() && result.products && result.products[0] && result.products[0].brand) {
          setBrand(result.products[0].brand);
        }
        setInputMode('file');
        setBrandDiscoverProgress('');
      } else {
        setBrandDiscoverError('No products found at this URL. Make sure this is a valid Amazon seller/brand store page.');
      }
    } catch (err) {
      setBrandDiscoverError(err.message);
    } finally {
      setBrandDiscovering(false);
      setBrandDiscoverProgress('');
    }
  };

  var onWebsiteScrape = async function() {
    if (!websiteUrl.trim()) return;
    setWebsiteScraping(true);
    setWebsiteError('');
    try {
      var data = await scrapeWebsite(websiteUrl.trim());
      setWebsiteData(data);
      // Auto-fill brand name from website if empty
      if (!brand.trim() && data.brandName) {
        setBrand(data.brandName);
      }
    } catch (err) {
      setWebsiteError(err.message);
    } finally {
      setWebsiteScraping(false);
    }
  };

  var validateStoreUrl = function(url) {
    if (!url.trim()) return '';
    if (url.indexOf('amazon') < 0 || url.indexOf('/stores/') < 0) {
      return 'URL must be an Amazon Brand Store URL (must contain "amazon" and "/stores/")';
    }
    return '';
  };

  var handleReferenceUrlChange = function(index, value) {
    var updated = referenceStoreUrls.slice();
    updated[index] = value;
    setReferenceStoreUrls(updated);
    var errors = Object.assign({}, referenceUrlErrors);
    if (value.trim()) {
      var err = validateStoreUrl(value);
      if (err) { errors[index] = err; } else { delete errors[index]; }
    } else {
      delete errors[index];
    }
    setReferenceUrlErrors(errors);
  };

  var addReferenceUrl = function() {
    if (referenceStoreUrls.length < 5) {
      setReferenceStoreUrls(referenceStoreUrls.concat(['']));
    }
  };

  var removeReferenceUrl = function(index) {
    var updated = referenceStoreUrls.slice();
    updated.splice(index, 1);
    if (updated.length === 0) updated = [''];
    setReferenceStoreUrls(updated);
    var errors = {};
    updated.forEach(function(url, i) {
      if (url.trim()) {
        var err = validateStoreUrl(url);
        if (err) errors[i] = err;
      }
    });
    setReferenceUrlErrors(errors);
  };

  var canGenerate = brand.trim() && asins.length > 0;
  var levelInfo = COMPLEXITY_LEVELS[complexity];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 700, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-title">Generate Brand Store</div>

        {/* 1. Product Input */}
        <label className="label">1. Upload ASINs *</label>

        {/* Input mode tabs */}
        <div className="input-mode-tabs">
          <button
            className={'input-mode-tab' + (inputMode === 'file' || inputMode === 'paste' ? ' active' : '')}
            onClick={function() { setInputMode('file'); }}
          >
            ASIN List
          </button>
          <button
            className={'input-mode-tab' + (inputMode === 'brandUrl' ? ' active' : '')}
            onClick={function() { setInputMode('brandUrl'); }}
          >
            Brand / Seller URL
          </button>
        </div>

        {inputMode === 'brandUrl' ? (
          <div style={{ marginTop: 6 }}>
            <input
              className="input"
              value={brandUrl}
              onChange={function(e) { setBrandUrl(e.target.value); }}
              placeholder="https://www.amazon.de/stores/BRAND/page/..."
            />
            <div className="hint">Paste an Amazon Brand Store or seller page URL to auto-discover all products</div>
            <button
              className="btn btn-primary"
              style={{ marginTop: 6, padding: '8px 16px' }}
              disabled={!brandUrl.trim() || brandDiscovering}
              onClick={onBrandDiscover}
            >
              {brandDiscovering ? 'Discovering...' : 'Discover Products'}
            </button>
            {brandDiscovering && brandDiscoverProgress && (
              <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>{brandDiscoverProgress}</div>
            )}
            {brandDiscoverError && <div className="price-error" style={{ marginTop: 4 }}>{brandDiscoverError}</div>}
          </div>
        ) : inputMode === 'paste' ? (
          <>
            <textarea
              className="input"
              rows={4}
              placeholder="B0XXXXXXXXXX&#10;B0YYYYYYYYYY"
              value={pasteText}
              onChange={function(e) { setPasteText(e.target.value); }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button className="btn" onClick={function() { setInputMode('file'); }}>Cancel</button>
              <button className="btn btn-primary" onClick={onPasteConfirm}>Parse ASINs</button>
            </div>
          </>
        ) : (
          <>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" style={{ display: 'none' }} onChange={onFileChange} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={'btn' + (asins.length ? ' btn-green' : '')}
                style={{ flex: 1, padding: 8 }}
                onClick={function() { fileRef.current && fileRef.current.click(); }}
              >
                {asins.length ? asins.length + ' ASINs loaded' : 'Upload CSV / TXT'}
              </button>
              <button className="btn" style={{ padding: 8 }} onClick={function() { setInputMode('paste'); }}>
                Paste
              </button>
            </div>
          </>
        )}

        <div className="hint">One ASIN per line (B0XXXXXXXXXX). Supports CSV, TXT, TSV.</div>
        {asins.length > 0 && (
          <div className="asin-preview">
            {asins.slice(0, 6).join(', ')}{asins.length > 6 ? ' +' + (asins.length - 6) + ' more' : ''}
          </div>
        )}

        {/* 2. Brand Name */}
        <label className="label" style={{ marginTop: 10 }}>2. Brand Name *</label>
        <input value={brand} onChange={function(e) { setBrand(e.target.value); }} className="input" placeholder="e.g. Futum, Kaercher, Nespresso" />

        {/* 3. Brand Website (optional) */}
        <label className="label" style={{ marginTop: 10 }}>3. Brand Website (optional)</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            value={websiteUrl}
            onChange={function(e) { setWebsiteUrl(e.target.value); setWebsiteError(''); setWebsiteData(null); }}
            placeholder="https://www.brand-shop.de"
          />
          <button
            className={'btn' + (websiteData ? ' btn-green' : ' btn-primary')}
            style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}
            disabled={!websiteUrl.trim() || websiteScraping}
            onClick={onWebsiteScrape}
          >
            {websiteScraping ? 'Scanning...' : websiteData ? 'Scanned' : 'Scan'}
          </button>
        </div>
        <div className="hint">Enter the brand's own online store / website. AI will extract brand info, USPs, and style to enrich the store design.</div>
        {websiteError && <div className="price-error" style={{ marginTop: 4 }}>{websiteError}</div>}
        {websiteData && (
          <div style={{ marginTop: 4, padding: '6px 8px', background: '#f0fdf4', borderRadius: 4, fontSize: 11, color: '#166534', border: '1px solid #bbf7d0' }}>
            {websiteData.title && <div><strong>{websiteData.title}</strong></div>}
            {websiteData.description && <div style={{ marginTop: 2, opacity: 0.8 }}>{websiteData.description.slice(0, 150)}{websiteData.description.length > 150 ? '...' : ''}</div>}
            {websiteData.certifications && websiteData.certifications.length > 0 && (
              <div style={{ marginTop: 2, opacity: 0.8 }}>Certifications/USPs found: {websiteData.certifications.length}</div>
            )}
            {websiteData.aboutText && <div style={{ marginTop: 2, opacity: 0.8 }}>Brand story content found</div>}
          </div>
        )}

        {/* 3b. Reference Brand Stores (optional) */}
        <label className="label" style={{ marginTop: 10 }}>Reference Brand Stores (optional)</label>
        <div className="hint" style={{ marginBottom: 6 }}>Enter 2-5 Amazon Brand Store URLs for design inspiration. The AI will analyze their structure, visuals, and layout patterns.</div>
        {referenceStoreUrls.map(function(url, idx) {
          return (
            <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                value={url}
                onChange={function(e) { handleReferenceUrlChange(idx, e.target.value); }}
                placeholder="https://www.amazon.de/stores/BRAND/page/..."
              />
              <button
                className="btn"
                style={{ padding: '6px 10px', minWidth: 28 }}
                onClick={function() { removeReferenceUrl(idx); }}
                title="Remove URL"
              >
                x
              </button>
            </div>
          );
        })}
        {Object.keys(referenceUrlErrors).length > 0 && (
          <div className="price-error" style={{ marginTop: 2 }}>
            {referenceUrlErrors[Object.keys(referenceUrlErrors)[0]]}
          </div>
        )}
        {referenceStoreUrls.length < 5 && (
          <button
            className="btn"
            style={{ marginTop: 4, padding: '6px 12px', fontSize: 12 }}
            onClick={addReferenceUrl}
          >
            + Add URL
          </button>
        )}

        {/* 3c. Existing Brand Store URL (optional) */}
        <label className="label" style={{ marginTop: 10 }}>Existing Brand Store URL (optional)</label>
        <input
          className="input"
          value={existingStoreUrl}
          onChange={function(e) {
            setExistingStoreUrl(e.target.value);
            if (e.target.value.trim()) {
              setExistingStoreUrlError(validateStoreUrl(e.target.value));
            } else {
              setExistingStoreUrlError('');
            }
          }}
          placeholder="https://www.amazon.de/stores/BRAND/page/..."
        />
        <div className="hint">Die aktuelle Amazon Brand Store URL des Kunden.</div>
        {existingStoreUrlError && <div className="price-error" style={{ marginTop: 2 }}>{existingStoreUrlError}</div>}

        {existingStoreUrl.trim() && !existingStoreUrlError && (
          <div style={{ marginTop: 8 }}>
            <label className="label">Bestehender Store — Modus</label>
            <select value={existingStoreMode} onChange={function(e) { setExistingStoreMode(e.target.value); }} className="input">
              <option value="optimize">Optimieren — Struktur beibehalten, Inhalte verbessern/erweitern</option>
              <option value="reconceptualize">Neu konzipieren — Komplett neues Konzept, nur CI übernehmen</option>
            </select>
            <div className="hint" style={{ marginTop: 2 }}>
              {existingStoreMode === 'optimize'
                ? 'Der Store ist bereits gut aufgebaut. Struktur und Seitenaufteilung bleiben erhalten. Nur Inhalte, Texte und neue Produkte werden ergänzt.'
                : 'Der Store ist grundlegend unteroptimiert. Komplett neues Konzept mit neuer Struktur, neuem Storytelling. Nur die Markenidentität (Farben, Logo, Tonalität) wird übernommen.'}
            </div>
          </div>
        )}

        {/* 4. Marketplace */}
        <label className="label" style={{ marginTop: 10 }}>4. Marketplace</label>
        <select value={marketplace} onChange={function(e) { setMarketplace(e.target.value); }} className="input">
          <option value="de">Amazon.de (Germany)</option>
          <option value="com">Amazon.com (USA)</option>
          <option value="co.uk">Amazon.co.uk (UK)</option>
          <option value="fr">Amazon.fr (France)</option>
        </select>

        {/* 4b. Reference Category */}
        <label className="label" style={{ marginTop: 10 }}>4b. Referenz-Kategorie (optional)</label>
        <select value={referenceCategory} onChange={function(e) { setReferenceCategory(e.target.value); }} className="input">
          <option value="generic">Allgemein (Standard)</option>
          <option value="supplements">Nahrungsergänzung</option>
          <option value="food">Lebensmittel & Getränke</option>
          <option value="home_kitchen">Haus & Küche</option>
          <option value="fashion">Mode & Kleidung</option>
          <option value="beauty">Beauty & Körperpflege</option>
          <option value="health">Gesundheit & Wellness</option>
          <option value="sports">Sport & Outdoor</option>
          <option value="office">Büro & Arbeit</option>
          <option value="pets">Haustiere</option>
          <option value="electronics">Elektronik</option>
          <option value="tools">Werkzeuge</option>
        </select>
        <div className="hint">Wählen Sie eine Produktkategorie aus, um kategoriespezifische Stil-Hinweise und Referenzstores zu laden.</div>

        {/* 4c. CI Detection Toggle */}
        <label className="label" style={{ marginTop: 10 }}>4c. CI-Erkennung</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <input
            type="checkbox"
            checked={enableCIDetection}
            onChange={function(e) { setEnableCIDetection(e.target.checked); }}
            style={{ cursor: 'pointer', width: 18, height: 18 }}
            id="ci-detection-toggle"
          />
          <label htmlFor="ci-detection-toggle" style={{ cursor: 'pointer', margin: 0 }}>
            Automatische Corporate Identity Erkennung aktivieren
          </label>
        </div>
        <div className="hint">Wenn aktiviert, wird die Website aggressiver gescannt, um Farben, Schriften und Stilmerkmale zu extrahieren.</div>

        {/* 4d. Storytelling Type */}
        <label className="label" style={{ marginTop: 10 }}>4d. Storytelling-Typ (optional)</label>
        <select value={storytellingType} onChange={function(e) { setStorytellingType(e.target.value); }} className="input">
          <option value="automatic">Automatisch (Standard)</option>
          <option value="educational_funnel">Educational Funnel (Problem → Lösung → Beweis → Produkt)</option>
          <option value="category_navigator">Category Navigator (Hero → Kategorien → Produkte)</option>
          <option value="purpose_story">Purpose Story (Mission → Werte → Impact → Produkte)</option>
          <option value="product_showcase">Product Showcase (Hero → Bestseller → Features → Zubehör)</option>
          <option value="seasonal_hook">Seasonal Hook (Saisonaler Aufhänger → Favoriten → Kategorien)</option>
        </select>
        <div className="hint">Bestimmt die narrative Struktur und den Ablauf der Store-Seiten.</div>

        {/* 5. Complexity Slider */}
        <label className="label" style={{ marginTop: 10 }}>5. Store Complexity</label>
        <div className="complexity-slider">
          <div className="complexity-track">
            {[1, 2, 3].map(function(level) {
              var info = COMPLEXITY_LEVELS[level];
              var isActive = complexity === level;
              return (
                <button
                  key={level}
                  className={'complexity-option' + (isActive ? ' active' : '')}
                  onClick={function() { setComplexity(level); }}
                >
                  <span className="complexity-level">{level}</span>
                  <span className="complexity-name">{info.name}</span>
                </button>
              );
            })}
          </div>
          <div className="complexity-desc">
            {levelInfo.description}
          </div>
        </div>

        {/* 6. Store Template */}
        <label className="label" style={{ marginTop: 10 }}>6. Layout Template (optional)</label>
        <div className="template-selector">
          <div className="template-grid">
            <button
              className={'template-card' + (selectedTemplate === null ? ' active' : '')}
              onClick={function() { setSelectedTemplate(null); setShowTemplateDetail(null); }}
            >
              <div className="template-card-name">No Template</div>
              <div className="template-card-desc">AI generates layout freely</div>
            </button>
            {STORE_TEMPLATES.map(function(tmpl) {
              var isSelected = selectedTemplate === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  className={'template-card' + (isSelected ? ' active' : '')}
                  onClick={function() { setSelectedTemplate(tmpl.id); }}
                >
                  <div className="template-card-name">{tmpl.name}</div>
                  <div className="template-card-desc">{tmpl.description}</div>
                  <div className="template-card-inspo">e.g. {tmpl.inspiration}</div>
                  <button
                    className="template-detail-btn"
                    onClick={function(e) {
                      e.stopPropagation();
                      setShowTemplateDetail(showTemplateDetail === tmpl.id ? null : tmpl.id);
                    }}
                  >
                    {showTemplateDetail === tmpl.id ? 'Hide Preview' : 'Preview Layout'}
                  </button>
                </button>
              );
            })}
          </div>
          {showTemplateDetail && (function() {
            var tmpl = STORE_TEMPLATES.find(function(t) { return t.id === showTemplateDetail; });
            if (!tmpl) return null;
            var tileColors = {
              image: '#94a3b8', shoppable_image: '#f59e0b', product_grid: '#3b82f6',
              video: '#ef4444', text: '#8b5cf6', image_text: '#10b981',
            };
            var tileLabels = {
              image: 'IMG', shoppable_image: 'SHOP', product_grid: 'GRID',
              video: 'VID', text: 'TXT', image_text: 'I+T',
            };
            function renderSectionPreview(sec, i) {
              var layout = findLayout(sec.layout);
              var tileTypes = sec.tileTypes || [];
              var cols = layout ? layout.cols : '1fr';
              var isComplexGrid = layout && layout.grid;
              return (
                <div key={i} className="template-preview-section" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="template-preview-layout">{sec.layout}</span>
                    <span className="template-preview-purpose">{sec.purpose}</span>
                    <span className="template-preview-tiles">{tileTypes.length} tile{tileTypes.length > 1 ? 's' : ''}</span>
                  </div>
                  <div style={{
                    display: isComplexGrid ? 'grid' : 'flex',
                    gridTemplateColumns: !isComplexGrid ? undefined : cols,
                    gridTemplateRows: !isComplexGrid ? undefined : '1fr 1fr',
                    gap: 2, height: isComplexGrid ? 32 : 16, marginLeft: 4
                  }}>
                    {tileTypes.map(function(type, ti) {
                      var color = tileColors[type] || '#94a3b8';
                      var label = tileLabels[type] || '';
                      var tileStyle = { background: color, borderRadius: 2, opacity: 0.7, minWidth: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' };
                      if (!isComplexGrid) {
                        var flexVal = 1;
                        if ((sec.layout === '2-1' || sec.layout === '2-1-1') && ti === 0) flexVal = 2;
                        if ((sec.layout === '1-2' || sec.layout === '1-1-2') && ti === tileTypes.length - 1) flexVal = 2;
                        tileStyle.flex = flexVal;
                      } else {
                        // Complex grid positioning
                        if (layout.grid === 'lg-2stack') {
                          if (ti === 0) { tileStyle.gridRow = '1 / 3'; tileStyle.gridColumn = '1'; }
                        } else if (layout.grid === '2stack-lg') {
                          if (ti === 2) { tileStyle.gridRow = '1 / 3'; tileStyle.gridColumn = '2'; }
                        } else if (layout.grid === 'lg-4grid') {
                          if (ti === 0) { tileStyle.gridRow = '1 / 3'; tileStyle.gridColumn = '1'; }
                        } else if (layout.grid === '4grid-lg') {
                          if (ti === 4) { tileStyle.gridRow = '1 / 3'; tileStyle.gridColumn = '3'; }
                        }
                      }
                      return (
                        <div key={ti} style={tileStyle} title={type}>
                          <span style={{ fontSize: 6, color: '#fff', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return (
              <div className="template-preview">
                <div className="template-preview-title">{tmpl.name} — Homepage Layout</div>
                {tmpl.homepage.map(renderSectionPreview)}
                <div className="template-preview-title" style={{ marginTop: 8 }}>Category Page Layout</div>
                {tmpl.categoryPage.map(renderSectionPreview)}
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {Object.keys(tileColors).map(function(type) {
                    return (
                      <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, color: '#64748b' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: tileColors[type], opacity: 0.7, display: 'inline-block' }} />
                        {type.replace('_', ' ')}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 7. Instructions */}
        <label className="label" style={{ marginTop: 10 }}>7. Instructions (optional)</label>
        <div className="instructions-area">
          <textarea
            value={instructions}
            onChange={function(e) { setInstructions(e.target.value); }}
            className="input"
            rows={8}
            placeholder={"Physikalische Insektenabwehr\n- Ameisen / Termiten\n- Bettwanzen / Floh\n- Milben / Spinnen\nHolzwurm\nMarder\nHaustierpflege\n- Spot On Katzen\n- Spot On Hunde"}
          />
          <div className="instructions-legend">
            <div className="legend-title">Input Guide</div>
            <div className="legend-section">
              <div className="legend-heading">Menu Structure</div>
              <div className="legend-item"><span className="legend-code">Category Name</span> Top-level page</div>
              <div className="legend-item"><span className="legend-code">- Subcategory</span> Child page (with dash)</div>
              <div className="legend-example">
                Shoes<br/>
                - Sandals<br/>
                - Boots<br/>
                Bags
              </div>
              <div className="legend-note">Menu structures are followed exactly as written.</div>
            </div>
            <div className="legend-section">
              <div className="legend-heading">Additional Notes</div>
              <div className="legend-item">Brand info, tone, style hints</div>
              <div className="legend-item">Product highlights or USPs</div>
              <div className="legend-item">Target audience details</div>
              <div className="legend-note">Notes are analyzed by AI and integrated where relevant.</div>
            </div>
            <div className="legend-section">
              <div className="legend-heading">You can combine both</div>
              <div className="legend-example">
                Cleaning Devices<br/>
                - Pressure Washers<br/>
                - Steam Cleaners<br/>
                Accessories<br/><br/>
                Premium brand, focus on<br/>
                quality and durability
              </div>
            </div>
          </div>
        </div>

        {/* 8. Google Drive Folder */}
        <label className="label" style={{ marginTop: 10 }}>8. Google Drive Folder (optional)</label>
        <input
          className="input"
          type="url"
          placeholder="https://drive.google.com/drive/folders/..."
          value={driveUrl}
          onChange={function(e) { setDriveUrl(e.target.value); }}
          onBlur={function() { if (onGoogleDriveChange) onGoogleDriveChange(driveUrl); }}
        />
        <div className="hint">Designer will upload finished assets to this Google Drive folder.</div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!canGenerate}
            onClick={function() {
              if (onGoogleDriveChange && driveUrl !== (googleDriveUrl || '')) onGoogleDriveChange(driveUrl);
              onGenerate({
                brand: brand.trim(),
                marketplace: marketplace,
                instructions: instructions,
                asins: asins,
                complexity: complexity,
                template: selectedTemplate,
                websiteData: websiteData || null,
                referenceStoreUrls: referenceStoreUrls.filter(function(u) { return u.trim() && !validateStoreUrl(u); }),
                existingStoreUrl: existingStoreUrl.trim() && !validateStoreUrl(existingStoreUrl) ? existingStoreUrl.trim() : null,
                existingStoreMode: existingStoreMode,
                referenceCategory: referenceCategory,
                enableCIDetection: enableCIDetection,
                storytellingType: storytellingType,
              });
            }}
          >
            Scrape &amp; Generate ({asins.length} ASINs)
          </button>
        </div>
      </div>
    </div>
  );
}
