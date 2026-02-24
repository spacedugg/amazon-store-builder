import { TILE_TYPES, TILE_TYPE_LABELS, PRODUCT_TILE_TYPES, DIMENSION_PRESETS } from '../constants';

function fileUpload(label, value, onSet, onRemove) {
  return (
    <div className="props-section">
      <label className="label">{label}</label>
      <input type="file" accept="image/*" style={{ fontSize: 11 }}
        onChange={function(e) {
          var f = e.target.files && e.target.files[0];
          if (!f) return;
          var reader = new FileReader();
          reader.onload = function(ev) { onSet(ev.target.result); };
          reader.readAsDataURL(f);
        }} />
      {value && <button className="btn" style={{ marginTop: 4 }} onClick={onRemove}>Remove</button>}
    </div>
  );
}

export default function PropertiesPanel({ tile, onChange, products, viewMode }) {
  if (!tile) {
    return (
      <div className="props-panel">
        <div className="props-header">Properties</div>
        <div className="props-empty">Click a tile to edit</div>
      </div>
    );
  }

  var u = function(k, v) { onChange(Object.assign({}, tile, { [k]: v })); };
  var ud = function(which, k, v) {
    var key = which === 'mobile' ? 'mobileDimensions' : 'dimensions';
    var cur = tile[key] || { w: which === 'mobile' ? 1242 : 3000, h: 1200 };
    onChange(Object.assign({}, tile, { [key]: Object.assign({}, cur, { [k]: v }) }));
  };

  var productMap = {};
  (products || []).forEach(function(p) { productMap[p.asin] = p; });
  var isImageType = tile.type === 'image' || tile.type === 'shoppable_image' || tile.type === 'image_text';
  var isProductType = PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0;

  return (
    <div className="props-panel">
      <div className="props-header">Properties</div>

      {/* Tile type */}
      <div className="props-section">
        <label className="label">Tile Type</label>
        <select className="input" value={tile.type}
          onChange={function(e) {
            var t = e.target.value;
            var up = Object.assign({}, tile, { type: t });
            if (isProductType && !up.asins) up.asins = [];
            if (t === 'video' && !up.dimensions) up.dimensions = { w: 3000, h: 1688 };
            if (t === 'video' && !up.mobileDimensions) up.mobileDimensions = { w: 1242, h: 699 };
            onChange(up);
          }}>
          {TILE_TYPES.map(function(t) {
            return <option key={t} value={t}>{TILE_TYPE_LABELS[t] || t}</option>;
          })}
        </select>
      </div>

      {/* IMAGE / SHOPPABLE / IMAGE_TEXT */}
      {isImageType && (
        <>
          <div className="props-section">
            <label className="label">Designer Brief (EN)</label>
            <textarea value={tile.brief || ''} onChange={function(e) { u('brief', e.target.value); }}
              rows={3} className="input" placeholder="Describe what the image should show..." />
          </div>
          <div className="props-section">
            <label className="label">Text Overlay</label>
            <input value={tile.textOverlay || ''} onChange={function(e) { u('textOverlay', e.target.value); }}
              className="input" placeholder="Text designed into the image" />
          </div>
          <div className="props-section">
            <label className="label">CTA Text</label>
            <input value={tile.ctaText || ''} onChange={function(e) { u('ctaText', e.target.value); }}
              className="input" placeholder='"Jetzt entdecken"' />
          </div>

          {/* Desktop Dimensions */}
          <div className="props-section">
            <label className="label">Desktop Dimensions (px)</label>
            <div className="props-dims">
              <input type="number" value={(tile.dimensions || {}).w || 3000}
                onChange={function(e) { ud('desktop', 'w', parseInt(e.target.value) || 3000); }} className="input" />
              <span className="props-dims-x">&times;</span>
              <input type="number" value={(tile.dimensions || {}).h || 1200}
                onChange={function(e) { ud('desktop', 'h', parseInt(e.target.value) || 1200); }} className="input" />
            </div>
          </div>

          {/* Mobile Dimensions */}
          <div className="props-section">
            <label className="label">Mobile Dimensions (px)</label>
            <div className="props-dims">
              <input type="number" value={(tile.mobileDimensions || {}).w || 1242}
                onChange={function(e) { ud('mobile', 'w', parseInt(e.target.value) || 1242); }} className="input" />
              <span className="props-dims-x">&times;</span>
              <input type="number" value={(tile.mobileDimensions || {}).h || 1200}
                onChange={function(e) { ud('mobile', 'h', parseInt(e.target.value) || 1200); }} className="input" />
            </div>
          </div>

          {/* Link / ASIN */}
          <div className="props-section">
            <label className="label">Link ASIN (clickable)</label>
            <input value={tile.linkAsin || ''} onChange={function(e) { u('linkAsin', e.target.value.trim()); }}
              className="input input-mono" placeholder="B0XXXXXXXXXX" />
            <div className="hint">Links this image to a product page or category</div>
          </div>

          {/* Image uploads */}
          {fileUpload('Desktop Image', tile.uploadedImage,
            function(v) { u('uploadedImage', v); }, function() { u('uploadedImage', null); })}
          {fileUpload('Mobile Image', tile.uploadedImageMobile,
            function(v) { u('uploadedImageMobile', v); }, function() { u('uploadedImageMobile', null); })}
        </>
      )}

      {/* PRODUCT TYPES */}
      {isProductType && (
        <div className="props-section">
          <label className="label">ASINs (one per line)</label>
          <textarea value={(tile.asins || []).join('\n')}
            onChange={function(e) { u('asins', e.target.value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean)); }}
            rows={8} className="input input-mono" placeholder="B0XXXXXXXXXX" />
          {(tile.asins || []).length > 0 && (
            <div className="props-asin-list">
              {(tile.asins || []).map(function(asin) {
                var p = productMap[asin];
                return (
                  <div key={asin} className="props-asin-item">
                    <code>{asin}</code>
                    {p && <span className="props-asin-name">{(p.name || '').slice(0, 35)}</span>}
                  </div>
                );
              })}
            </div>
          )}
          {tile.type !== 'product_grid' && (
            <div className="hint">
              {tile.type === 'best_sellers' && 'Amazon auto-selects best sellers. ASINs are optional filter.'}
              {tile.type === 'recommended' && 'Amazon algorithm picks products. ASINs are optional.'}
              {tile.type === 'deals' && 'Shows products with active deals from your catalog.'}
            </div>
          )}
        </div>
      )}

      {/* TEXT */}
      {tile.type === 'text' && (
        <div className="props-section">
          <label className="label">Text Content</label>
          <textarea value={tile.textOverlay || ''} onChange={function(e) { u('textOverlay', e.target.value); }}
            rows={4} className="input" placeholder="Native text content..." />
          <div className="hint">Only for section headings or legal text.</div>
        </div>
      )}

      {/* VIDEO */}
      {tile.type === 'video' && (
        <>
          <div className="props-section">
            <label className="label">Video Brief (EN)</label>
            <textarea value={tile.brief || ''} onChange={function(e) { u('brief', e.target.value); }}
              rows={3} className="input" placeholder="Describe the video content..." />
          </div>
          <div className="props-section">
            <label className="label">Desktop Dimensions</label>
            <div className="props-dims">
              <input type="number" value={(tile.dimensions || {}).w || 3000}
                onChange={function(e) { ud('desktop', 'w', parseInt(e.target.value) || 3000); }} className="input" />
              <span className="props-dims-x">&times;</span>
              <input type="number" value={(tile.dimensions || {}).h || 1688}
                onChange={function(e) { ud('desktop', 'h', parseInt(e.target.value) || 1688); }} className="input" />
            </div>
          </div>
          <div className="props-section">
            <label className="label">Mobile Dimensions</label>
            <div className="props-dims">
              <input type="number" value={(tile.mobileDimensions || {}).w || 1242}
                onChange={function(e) { ud('mobile', 'w', parseInt(e.target.value) || 1242); }} className="input" />
              <span className="props-dims-x">&times;</span>
              <input type="number" value={(tile.mobileDimensions || {}).h || 699}
                onChange={function(e) { ud('mobile', 'h', parseInt(e.target.value) || 699); }} className="input" />
            </div>
          </div>
          {fileUpload('Video Thumbnail', tile.videoThumbnail,
            function(v) { u('videoThumbnail', v); }, function() { u('videoThumbnail', null); })}
        </>
      )}
    </div>
  );
}
