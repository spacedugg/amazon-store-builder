import { useState, useRef } from 'react';

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
  var [pasteMode, setPasteMode] = useState(false);
  var [pasteText, setPasteText] = useState('');
  var fileRef = useRef(null);

  var onFileChange = function(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function(ev) { setAsins(parseAsinFile(ev.target.result)); };
    reader.readAsText(f);
    if (fileRef.current) fileRef.current.value = '';
  };

  var onPasteConfirm = function() {
    if (pasteText.trim()) {
      setAsins(parseAsinFile(pasteText));
      setPasteMode(false);
    }
  };

  var canGenerate = brand.trim() && asins.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 440 }}>
        <div className="modal-title">Generate Brand Store</div>

        <label className="label">1. Upload ASIN List *</label>
        {!pasteMode ? (
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
              <button className="btn" style={{ padding: 8 }} onClick={function() { setPasteMode(true); }}>
                Paste
              </button>
            </div>
          </>
        ) : (
          <>
            <textarea
              className="input"
              rows={4}
              placeholder="Paste ASINs here (one per line, or comma-separated)&#10;B0XXXXXXXXXX&#10;B0YYYYYYYYYY"
              value={pasteText}
              onChange={function(e) { setPasteText(e.target.value); }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button className="btn" onClick={function() { setPasteMode(false); }}>Cancel</button>
              <button className="btn btn-primary" onClick={onPasteConfirm}>Parse ASINs</button>
            </div>
          </>
        )}
        <div className="hint">One ASIN per line (B0XXXXXXXXXX). Supports CSV, TXT, TSV.</div>
        {asins.length > 0 && (
          <div className="asin-preview">
            {asins.slice(0, 6).join(', ')}{asins.length > 6 ? ' +' + (asins.length - 6) + ' more' : ''}
          </div>
        )}

        <label className="label" style={{ marginTop: 10 }}>2. Brand Name *</label>
        <input value={brand} onChange={function(e) { setBrand(e.target.value); }} className="input" placeholder="e.g. Futum, Kaercher, Nespresso" />

        <label className="label">3. Marketplace</label>
        <select value={marketplace} onChange={function(e) { setMarketplace(e.target.value); }} className="input">
          <option value="de">Amazon.de (Germany)</option>
          <option value="com">Amazon.com (USA)</option>
          <option value="co.uk">Amazon.co.uk (UK)</option>
          <option value="fr">Amazon.fr (France)</option>
        </select>

        <label className="label" style={{ marginTop: 10 }}>4. Instructions (optional)</label>
        <textarea
          value={instructions}
          onChange={function(e) { setInstructions(e.target.value); }}
          className="input"
          rows={2}
          placeholder="Special requirements, brand style, focus areas..."
        />

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!canGenerate}
            onClick={function() { onGenerate({ brand: brand.trim(), marketplace: marketplace, instructions: instructions, asins: asins }); }}
          >
            Scrape &amp; Generate ({asins.length} ASINs)
          </button>
        </div>
      </div>
    </div>
  );
}
