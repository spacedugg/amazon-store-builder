import { TILE_TYPES } from '../constants';

export default function PropertiesPanel({ tile, onChange, products }) {
  if (!tile) {
    return (
      <div className="props-panel">
        <div className="props-empty">Click a tile to edit its properties</div>
      </div>
    );
  }

  var u = function(k, v) { onChange(Object.assign({}, tile, { [k]: v })); };
  var ud = function(k, v) { onChange(Object.assign({}, tile, { dimensions: Object.assign({}, tile.dimensions || {}, { [k]: v }) })); };

  var typeLabels = {
    image: 'Image',
    product_grid: 'Product Grid',
    video: 'Video',
    text: 'Text (native)',
    shoppable_image: 'Shoppable Image',
  };

  var productMap = {};
  (products || []).forEach(function(p) { productMap[p.asin] = p; });

  return (
    <div className="props-panel">
      <div className="props-section">
        <label className="label">Tile Type</label>
        <select
          className="input"
          value={tile.type}
          onChange={function(e) {
            var newType = e.target.value;
            var updated = Object.assign({}, tile, { type: newType });
            if (newType === 'product_grid' && !updated.asins) updated.asins = [];
            onChange(updated);
          }}
        >
          {TILE_TYPES.map(function(t) {
            return <option key={t} value={t}>{typeLabels[t] || t}</option>;
          })}
        </select>
      </div>

      {(tile.type === 'image' || tile.type === 'shoppable_image') && (
        <>
          <div className="props-section">
            <label className="label">Designer Brief (EN)</label>
            <textarea
              value={tile.brief || ''}
              onChange={function(e) { u('brief', e.target.value); }}
              rows={3}
              className="input"
              placeholder="Describe the image for the designer..."
            />
          </div>

          <div className="props-section">
            <label className="label">Text Overlay</label>
            <input
              value={tile.textOverlay || ''}
              onChange={function(e) { u('textOverlay', e.target.value); }}
              className="input"
              placeholder="Text designed into the image"
            />
          </div>

          <div className="props-section">
            <label className="label">CTA Text</label>
            <input
              value={tile.ctaText || ''}
              onChange={function(e) { u('ctaText', e.target.value); }}
              className="input"
              placeholder='e.g. "Jetzt entdecken"'
            />
          </div>

          <div className="props-section">
            <label className="label">Dimensions (px)</label>
            <div className="props-dims">
              <input
                type="number"
                value={tile.dimensions?.w || 3000}
                onChange={function(e) { ud('w', parseInt(e.target.value) || 3000); }}
                className="input"
              />
              <span className="props-dims-x">&times;</span>
              <input
                type="number"
                value={tile.dimensions?.h || 1200}
                onChange={function(e) { ud('h', parseInt(e.target.value) || 1200); }}
                className="input"
              />
            </div>
          </div>

          <div className="props-section">
            <label className="label">Upload Image</label>
            <input
              type="file"
              accept="image/*"
              style={{ fontSize: 11 }}
              onChange={function(e) {
                var f = e.target.files && e.target.files[0];
                if (!f) return;
                var reader = new FileReader();
                reader.onload = function(ev) { u('uploadedImage', ev.target.result); };
                reader.readAsDataURL(f);
              }}
            />
            {tile.uploadedImage && (
              <button className="btn" style={{ marginTop: 4 }} onClick={function() { u('uploadedImage', null); }}>
                Remove image
              </button>
            )}
          </div>
        </>
      )}

      {tile.type === 'product_grid' && (
        <div className="props-section">
          <label className="label">ASINs (one per line)</label>
          <textarea
            value={(tile.asins || []).join('\n')}
            onChange={function(e) { u('asins', e.target.value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean)); }}
            rows={8}
            className="input input-mono"
            placeholder="B0XXXXXXXXXX"
          />
          {(tile.asins || []).length > 0 && (
            <div className="props-asin-list">
              {(tile.asins || []).map(function(asin) {
                var p = productMap[asin];
                return (
                  <div key={asin} className="props-asin-item">
                    <code>{asin}</code>
                    {p && <span className="props-asin-name">{p.name ? p.name.slice(0, 40) : ''}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tile.type === 'text' && (
        <div className="props-section">
          <label className="label">Text Content</label>
          <textarea
            value={tile.textOverlay || ''}
            onChange={function(e) { u('textOverlay', e.target.value); }}
            rows={4}
            className="input"
            placeholder="Native text content..."
          />
          <div className="hint">Native text modules should only be used for section headings or legal text, NOT for marketing content.</div>
        </div>
      )}

      {tile.type === 'video' && (
        <>
          <div className="props-section">
            <label className="label">Video Brief (EN)</label>
            <textarea
              value={tile.brief || ''}
              onChange={function(e) { u('brief', e.target.value); }}
              rows={3}
              className="input"
              placeholder="Describe the video content..."
            />
          </div>
          <div className="props-section">
            <label className="label">Dimensions</label>
            <div className="props-dims">
              <input type="number" value={tile.dimensions?.w || 3000} onChange={function(e) { ud('w', parseInt(e.target.value) || 3000); }} className="input" />
              <span className="props-dims-x">&times;</span>
              <input type="number" value={tile.dimensions?.h || 1200} onChange={function(e) { ud('h', parseInt(e.target.value) || 1200); }} className="input" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
