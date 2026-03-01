import { useState, useRef } from 'react';
import { COMPLEXITY_LEVELS } from '../constants';
import { discoverBrandProducts } from '../api';

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

export default function GenerateModal({ onClose, onGenerate }) {
  var [brand, setBrand] = useState('');
  var [marketplace, setMarketplace] = useState('de');
  var [instructions, setInstructions] = useState('');
  var [asins, setAsins] = useState([]);
  var [pasteText, setPasteText] = useState('');
  var [complexity, setComplexity] = useState(2);
  var [inputMode, setInputMode] = useState('file'); // 'file', 'paste', 'brandUrl'
  var [brandUrl, setBrandUrl] = useState('');
  var [brandDiscovering, setBrandDiscovering] = useState(false);
  var [brandDiscoverError, setBrandDiscoverError] = useState('');
  var [brandDiscoverProgress, setBrandDiscoverProgress] = useState('');
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

  var onBrandDiscover = async function() {
    if (!brandUrl.trim()) return;
    setBrandDiscovering(true);
    setBrandDiscoverError('');
    setBrandDiscoverProgress('Starting discovery...');
    try {
      var result = await discoverBrandProducts(brandUrl.trim(), function(msg) {
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
              placeholder="https://www.amazon.de/s?me=SELLER_ID..."
            />
            <div className="hint">Paste the Amazon seller/brand page URL to auto-discover all products</div>
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

        {/* 3. Marketplace */}
        <label className="label">3. Marketplace</label>
        <select value={marketplace} onChange={function(e) { setMarketplace(e.target.value); }} className="input">
          <option value="de">Amazon.de (Germany)</option>
          <option value="com">Amazon.com (USA)</option>
          <option value="co.uk">Amazon.co.uk (UK)</option>
          <option value="fr">Amazon.fr (France)</option>
        </select>

        {/* 4. Complexity Slider */}
        <label className="label" style={{ marginTop: 10 }}>4. Store Complexity</label>
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

        {/* 5. Instructions */}
        <label className="label" style={{ marginTop: 10 }}>5. Instructions (optional)</label>
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

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!canGenerate}
            onClick={function() {
              onGenerate({
                brand: brand.trim(),
                marketplace: marketplace,
                instructions: instructions,
                asins: asins,
                complexity: complexity,
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
