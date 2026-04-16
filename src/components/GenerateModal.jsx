import { useState, useRef } from 'react';
import { LAYOUTS, findLayout } from '../constants';
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
  var [inputMode, setInputMode] = useState('file'); // 'file', 'paste', 'brandUrl'
  var [brandUrl, setBrandUrl] = useState('');
  var [brandDiscovering, setBrandDiscovering] = useState(false);
  var [brandDiscoverError, setBrandDiscoverError] = useState('');
  var [brandDiscoverProgress, setBrandDiscoverProgress] = useState('');
  var [websiteUrl, setWebsiteUrl] = useState('');
  var [websiteData, setWebsiteData] = useState(null);
  var [websiteScraping, setWebsiteScraping] = useState(false);
  var [websiteError, setWebsiteError] = useState('');
  // Reference Store URLs removed — had no effect on generation
  var [existingStoreUrl, setExistingStoreUrl] = useState('');
  var [existingStoreUrlError, setExistingStoreUrlError] = useState('');
  var [existingStoreMode, setExistingStoreMode] = useState('optimize');
  var [ciSource, setCiSource] = useState('auto'); // 'auto', 'amazon', 'website', 'manual'
  var [driveUrl, setDriveUrl] = useState(googleDriveUrl || '');
  // Extra subpages — each is independently selectable
  var [extraPages, setExtraPages] = useState({
    product_selector: false,
    gift_sets: false,
    recommendations: false,
    new_arrivals: false,
    subscribe_save: false,
    sample_sets: false,
    about_us: false,
    how_it_works: false,
    bestsellers: false,
    deals: false,
    sustainability: false,
  });
  var toggleExtraPage = function(key) {
    setExtraPages(function(prev) {
      var next = Object.assign({}, prev);
      next[key] = !prev[key];
      return next;
    });
  };
  // Other feature options
  var [includeProductVideos, setIncludeProductVideos] = useState(false);
  var [generateWireframes, setGenerateWireframes] = useState(false);
  // New pipeline fields
  var [logoFile, setLogoFile] = useState(null);
  var [fontNames, setFontNames] = useState('');
  var [brandColors, setBrandColors] = useState('');
  var [brandToneExamples, setBrandToneExamples] = useState('');
  var [keepMenuStructure, setKeepMenuStructure] = useState(true);
  var fileRef = useRef(null);
  var logoRef = useRef(null);

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

  // Reference Store URL handlers removed

  var canGenerate = brand.trim() && asins.length > 0;

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
              placeholder="https://www.amazon.de/stores/BRAND/page/... oder /stores/page/UUID"
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
          <div style={{ marginTop: 4, padding: '8px 10px', background: '#f0fdf4', borderRadius: 6, fontSize: 11, color: '#166534', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              {websiteData.title && <strong>{websiteData.title}</strong>}
              {websiteData.pagesScraped && (
                <span style={{ fontSize: 10, background: '#dcfce7', padding: '1px 6px', borderRadius: 3 }}>
                  {websiteData.pagesScraped} {websiteData.pagesScraped === 1 ? 'Seite' : 'Seiten'} gecrawlt
                </span>
              )}
            </div>
            {websiteData.description && <div style={{ opacity: 0.8 }}>{websiteData.description.slice(0, 150)}{websiteData.description.length > 150 ? '...' : ''}</div>}

            {/* AI Analysis Summary */}
            {websiteData.aiAnalysis && (
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 3, color: '#15803d' }}>KI-Analyse</div>
                {websiteData.aiAnalysis.brandTone && (
                  <div style={{ marginBottom: 2 }}><span style={{ opacity: 0.6 }}>Tonalität:</span> {websiteData.aiAnalysis.brandTone}</div>
                )}
                {websiteData.aiAnalysis.usps && websiteData.aiAnalysis.usps.length > 0 && (
                  <div style={{ marginBottom: 2 }}><span style={{ opacity: 0.6 }}>USPs:</span> {websiteData.aiAnalysis.usps.slice(0, 4).join(' · ')}{websiteData.aiAnalysis.usps.length > 4 ? ' +' + (websiteData.aiAnalysis.usps.length - 4) : ''}</div>
                )}
                {websiteData.aiAnalysis.certifications && websiteData.aiAnalysis.certifications.length > 0 && (
                  <div style={{ marginBottom: 2 }}><span style={{ opacity: 0.6 }}>Zertifikate:</span> {websiteData.aiAnalysis.certifications.join(', ')}</div>
                )}
                {websiteData.aiAnalysis.targetAudience && (
                  <div style={{ marginBottom: 2 }}><span style={{ opacity: 0.6 }}>Zielgruppe:</span> {websiteData.aiAnalysis.targetAudience}</div>
                )}
                {websiteData.aiAnalysis.brandValues && websiteData.aiAnalysis.brandValues.length > 0 && (
                  <div style={{ marginBottom: 2 }}><span style={{ opacity: 0.6 }}>Markenwerte:</span> {websiteData.aiAnalysis.brandValues.join(', ')}</div>
                )}
                {websiteData.aiAnalysis.visualStyle && (
                  <div><span style={{ opacity: 0.6 }}>Visueller Stil:</span> {websiteData.aiAnalysis.visualStyle}</div>
                )}
              </div>
            )}

            {/* Fallback for non-AI results */}
            {!websiteData.aiAnalysis && (
              <div style={{ marginTop: 4 }}>
                {websiteData.certifications && websiteData.certifications.length > 0 && (
                  <div style={{ opacity: 0.8 }}>Zertifikate/USPs: {websiteData.certifications.length}</div>
                )}
                {websiteData.aboutText && <div style={{ opacity: 0.8 }}>Brand-Story-Inhalte gefunden</div>}
                {websiteData.colors && websiteData.colors.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <span style={{ opacity: 0.6 }}>Farben:</span>
                    {websiteData.colors.slice(0, 6).map(function(c, i) {
                      return <span key={i} style={{ width: 14, height: 14, borderRadius: 3, background: c, border: '1px solid rgba(0,0,0,.15)', display: 'inline-block' }} />;
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3b. Existing Brand Store URL (optional) */}
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
          placeholder="https://www.amazon.de/stores/BRAND/page/... oder /stores/page/UUID"
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

        {/* 3c. CI Source Selection — shown when both website AND Amazon data will be available */}
        {(websiteData || websiteUrl.trim()) && (
          <div style={{ marginTop: 10 }}>
            <label className="label">Corporate Identity (CI) Quelle</label>
            <select value={ciSource} onChange={function(e) { setCiSource(e.target.value); }} className="input">
              <option value="auto">Automatisch — beide Quellen zusammenführen</option>
              <option value="amazon">Amazon-Präsenz — CI aus Listing-Bildern & A+ Content</option>
              <option value="website">Website — CI aus dem Online-Shop / der Marken-Website</option>
              <option value="manual">Manuell — CI wird später im CI-Tab selbst eingetragen</option>
            </select>
            <div className="hint" style={{ marginTop: 2 }}>
              {ciSource === 'auto'
                ? 'Farben, Schriften und Stil werden aus Amazon-Listings UND Website kombiniert. Amazon-Daten haben Priorität für produktbezogene CI.'
                : ciSource === 'amazon'
                ? 'Nur die CI aus Amazon-Listing-Bildern (Infografiken, A+ Content, Produktbilder) wird verwendet. Website-CI wird ignoriert.'
                : ciSource === 'website'
                ? 'Nur die CI der Marken-Website wird verwendet. Amazon-Listing-Bilder werden nicht für CI-Erkennung analysiert.'
                : 'Keine automatische CI-Erkennung. Du gibst Farben, Schriften und Stil manuell im CI-Tab nach der Generierung ein.'}
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

        {/* 4a. Brand Assets (optional) */}
        <div style={{ marginTop: 12, padding: '10px 12px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8 }}>
          <label className="label" style={{ margin: 0, color: '#92400e' }}>Brand Assets (optional — improves quality)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: '#78716c', fontWeight: 600 }}>Logo</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="file" ref={logoRef} accept="image/*" style={{ display: 'none' }}
                  onChange={function(e) { var f = e.target.files && e.target.files[0]; if (f) { var r = new FileReader(); r.onload = function(ev) { setLogoFile(ev.target.result); }; r.readAsDataURL(f); } }} />
                <button className="btn" onClick={function() { logoRef.current && logoRef.current.click(); }} style={{ fontSize: 11, padding: '4px 10px' }}>
                  {logoFile ? 'Logo ändern' : 'Logo hochladen'}
                </button>
                {logoFile && <img src={logoFile} alt="" style={{ height: 24, borderRadius: 3 }} />}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#78716c', fontWeight: 600 }}>Schriftarten</label>
              <input value={fontNames} onChange={function(e) { setFontNames(e.target.value); }}
                placeholder="z.B. Montserrat, Open Sans" className="input" style={{ fontSize: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#78716c', fontWeight: 600 }}>Markenfarben (Hex)</label>
              <input value={brandColors} onChange={function(e) { setBrandColors(e.target.value); }}
                placeholder="z.B. #2D5016, #F5F0E8, #8B6914" className="input" style={{ fontSize: 12, fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#78716c', fontWeight: 600 }}>Brand-Ton Beispiele</label>
              <textarea value={brandToneExamples} onChange={function(e) { setBrandToneExamples(e.target.value); }}
                placeholder="2-3 Beispielsätze die den Ton der Marke zeigen (z.B. aus Listings oder Website)" className="input" rows={2} style={{ fontSize: 12 }} />
              <div className="hint">Werden als Stil-Referenz genutzt, nicht 1:1 kopiert.</div>
            </div>
          </div>
        </div>

        {/* Optimization: keep menu structure */}
        {existingStoreUrl && existingStoreMode === 'optimize' && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={keepMenuStructure} onChange={function() { setKeepMenuStructure(!keepMenuStructure); }} />
              <span>Menüstruktur beibehalten</span>
            </label>
            <div className="hint">Die bestehenden Seiten und deren Hierarchie werden übernommen.</div>
          </div>
        )}

        {/* 4b. Zusatzseiten (Checkboxen) */}
        <label className="label" style={{ marginTop: 10 }}>4c. Zusatzseiten</label>
        <div className="hint" style={{ marginBottom: 6 }}>Jede angehakte Seite wird als eigene Subpage im Store generiert. Homepage + Kategorie-Seiten entstehen immer automatisch.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
          {[
            { key: 'product_selector', label: 'Produktauswahl (Quiz)' },
            { key: 'gift_sets', label: 'Geschenk-Sets' },
            { key: 'recommendations', label: 'Unsere Empfehlungen' },
            { key: 'new_arrivals', label: 'Neuheiten' },
            { key: 'subscribe_save', label: 'Spar-Abo' },
            { key: 'sample_sets', label: 'Probiersets' },
            { key: 'about_us', label: 'Über uns' },
            { key: 'how_it_works', label: 'So funktioniert\'s' },
            { key: 'bestsellers', label: 'Bestseller' },
            { key: 'deals', label: 'Angebote' },
            { key: 'sustainability', label: 'Nachhaltigkeit' },
          ].map(function(opt) {
            return (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, padding: '3px 0' }}>
                <input type="checkbox" checked={extraPages[opt.key]} onChange={function() { toggleExtraPage(opt.key); }} style={{ width: 16, height: 16 }} />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>

        {/* 4d. Weitere Optionen */}
        <label className="label" style={{ marginTop: 10 }}>4d. Weitere Optionen</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeProductVideos} onChange={function(e) { setIncludeProductVideos(e.target.checked); }} style={{ width: 18, height: 18 }} />
            <span>Produktvideos auf Kategorie-Seiten einbinden</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={generateWireframes} onChange={function(e) { setGenerateWireframes(e.target.checked); }} style={{ width: 18, height: 18 }} />
            <span>Wireframe-Skizzen generieren (KI-Vorschaubilder pro Kachel)</span>
          </label>
          {generateWireframes && (
            <div style={{ marginLeft: 26, padding: '4px 8px', background: '#fffbeb', borderRadius: 4, fontSize: 11, color: '#92400e', border: '1px solid #fde68a' }}>
              Generiert minimalistische Skizzen per Gemini/Imagen. Dauert ca. 15-30 Sek. pro Bild-Kachel. Kosten: gering (Sketch-Modus).
            </div>
          )}
        </div>

        {/* Instructions */}
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
                websiteData: websiteData || null,
                referenceStoreUrls: [],
                existingStoreUrl: existingStoreUrl.trim() && !validateStoreUrl(existingStoreUrl) ? existingStoreUrl.trim() : null,
                existingStoreMode: existingStoreMode,
                ciSource: ciSource,
                extraPages: extraPages,
                includeProductVideos: includeProductVideos,
                generateWireframes: generateWireframes,
                // New pipeline fields
                logoFile: logoFile,
                fontNames: fontNames.trim() || null,
                brandColors: brandColors.trim() || null,
                brandToneExamples: brandToneExamples.trim() || null,
                keepMenuStructure: existingStoreMode === 'optimize' ? keepMenuStructure : false,
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
