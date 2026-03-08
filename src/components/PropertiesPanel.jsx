import { TILE_TYPES, TILE_TYPE_LABELS, PRODUCT_TILE_TYPES, IMAGE_CATEGORIES } from '../constants';
import { t } from '../i18n';

var PRESET_COLORS = [
  '#f5f5f5', '#e0e0e0', '#bdbdbd', '#9e9e9e',
  '#1a1a2e', '#232F3E', '#37474f', '#455a64',
  '#fff3e0', '#ffe0b2', '#ffcc80', '#FF9900',
  '#e8f5e9', '#c8e6c9', '#a5d6a7', '#66bb6a',
  '#e3f2fd', '#bbdefb', '#90caf9', '#42a5f5',
  '#fce4ec', '#f8bbd0', '#f48fb1', '#ec407a',
  '#f3e5f5', '#e1bee7', '#ce93d8', '#ab47bc',
  '#fffde7', '#fff9c4', '#fff176', '#ffee58',
];

function fileUpload(label, value, onSet, onRemove, uiLang) {
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
      {value && <button className="btn" style={{ marginTop: 4 }} onClick={onRemove}>{t('props.remove', uiLang)}</button>}
    </div>
  );
}

export default function PropertiesPanel({ tile, onChange, products, viewMode, uiLang }) {
  if (!tile) {
    return (
      <div className="props-panel">
        <div className="props-header">{t('props.title', uiLang)}</div>
        <div className="props-empty">{t('props.clickTile', uiLang)}</div>
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
      <div className="props-header">{t('props.title', uiLang)}</div>

      {/* Tile type */}
      <div className="props-section">
        <label className="label">{t('props.tileType', uiLang)}</label>
        <select className="input" value={tile.type}
          onChange={function(e) {
            var tt = e.target.value;
            var up = Object.assign({}, tile, { type: tt });
            if (isProductType && !up.asins) up.asins = [];
            if (tt === 'video' && !up.dimensions) up.dimensions = { w: 3000, h: 1688 };
            if (tt === 'video' && !up.mobileDimensions) up.mobileDimensions = { w: 1242, h: 699 };
            onChange(up);
          }}>
          {TILE_TYPES.map(function(tt) {
            return <option key={tt} value={tt}>{TILE_TYPE_LABELS[tt] || tt}</option>;
          })}
        </select>
      </div>

      {/* IMAGE CATEGORY (for image-based tiles) */}
      {isImageType && (
        <div className="props-section">
          <label className="label">{t('props.imageCategory', uiLang)}</label>
          <select className="input" value={tile.imageCategory || ''}
            onChange={function(e) { u('imageCategory', e.target.value); }}>
            <option value="">{t('props.imageCategoryNone', uiLang)}</option>
            {Object.keys(IMAGE_CATEGORIES).map(function(catId) {
              var cat = IMAGE_CATEGORIES[catId];
              return <option key={catId} value={catId}>{cat.name}</option>;
            })}
          </select>
          {tile.imageCategory && IMAGE_CATEGORIES[tile.imageCategory] && (
            <div className="hint">{IMAGE_CATEGORIES[tile.imageCategory].description}</div>
          )}
        </div>
      )}

      {/* TILE BACKGROUND COLOR */}
      <div className="props-section">
        <label className="label">{t('props.tileColor', uiLang)}</label>
        <div className="color-picker-grid">
          {PRESET_COLORS.map(function(c) {
            var isActive = tile.bgColor === c;
            return (
              <button
                key={c}
                className={'color-swatch' + (isActive ? ' active' : '')}
                style={{ background: c }}
                onClick={function() { u('bgColor', c); }}
                title={c}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={tile.bgColor || '#ffffff'}
            onChange={function(e) { u('bgColor', e.target.value); }}
            style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', borderRadius: 4 }}
          />
          <input
            value={tile.bgColor || ''}
            onChange={function(e) { u('bgColor', e.target.value); }}
            className="input"
            placeholder="#RRGGBB"
            style={{ flex: 1, fontFamily: 'monospace', fontSize: 11 }}
          />
          {tile.bgColor && (
            <button className="btn" style={{ fontSize: 10, padding: '4px 8px' }} onClick={function() { u('bgColor', ''); }}>
              {t('props.clearColor', uiLang)}
            </button>
          )}
        </div>
        <div className="hint">{t('props.tileColorHint', uiLang)}</div>
      </div>

      {/* IMAGE / SHOPPABLE / IMAGE_TEXT */}
      {isImageType && (
        <>
          <div className="props-section">
            <label className="label">{t('props.designerBrief', uiLang)}</label>
            <textarea value={tile.brief || ''} onChange={function(e) { u('brief', e.target.value); }}
              rows={3} className="input" placeholder={t('props.designerBriefPlaceholder', uiLang)} />
          </div>
          <div className="props-section">
            <label className="label">{t('props.textOverlay', uiLang)}</label>
            <input value={tile.textOverlay || ''} onChange={function(e) { u('textOverlay', e.target.value); }}
              className="input" placeholder={t('props.textOverlayPlaceholder', uiLang)} />
            {tile.textOverlay && (
              <div className="text-align-picker" style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                <button className={'btn text-align-btn' + ((!tile.textAlign || tile.textAlign === 'left') ? ' active' : '')} onClick={function() { u('textAlign', 'left'); }} title="Linksbündig" style={{ fontSize: 10, padding: '3px 8px' }}>&#8676; Links</button>
                <button className={'btn text-align-btn' + (tile.textAlign === 'center' ? ' active' : '')} onClick={function() { u('textAlign', 'center'); }} title="Zentriert" style={{ fontSize: 10, padding: '3px 8px' }}>Mitte</button>
                <button className={'btn text-align-btn' + (tile.textAlign === 'right' ? ' active' : '')} onClick={function() { u('textAlign', 'right'); }} title="Rechtsbündig" style={{ fontSize: 10, padding: '3px 8px' }}>Rechts &#8677;</button>
              </div>
            )}
          </div>
          <div className="props-section">
            <label className="label">{t('props.ctaText', uiLang)}</label>
            <input value={tile.ctaText || ''} onChange={function(e) { u('ctaText', e.target.value); }}
              className="input" placeholder='"Jetzt entdecken"' />
          </div>

          {/* Desktop Dimensions */}
          <div className="props-section">
            <label className="label">{t('props.desktopDimensions', uiLang)}</label>
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
            <label className="label">{t('props.mobileDimensions', uiLang)}</label>
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
            <label className="label">{t('props.linkAsin', uiLang)}</label>
            <input value={tile.linkAsin || ''} onChange={function(e) { u('linkAsin', e.target.value.trim()); }}
              className="input input-mono" placeholder="B0XXXXXXXXXX" />
          </div>

          {/* Image uploads */}
          {fileUpload(t('props.desktopImage', uiLang), tile.uploadedImage,
            function(v) { u('uploadedImage', v); }, function() { u('uploadedImage', null); }, uiLang)}
          {fileUpload(t('props.mobileImage', uiLang), tile.uploadedImageMobile,
            function(v) { u('uploadedImageMobile', v); }, function() { u('uploadedImageMobile', null); }, uiLang)}
        </>
      )}

      {/* PRODUCT TYPES */}
      {isProductType && (
        <div className="props-section">
          <label className="label">{t('props.asins', uiLang)}</label>
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
              {tile.type === 'best_sellers' && t('props.bestSellersHint', uiLang)}
              {tile.type === 'recommended' && t('props.recommendedHint', uiLang)}
              {tile.type === 'deals' && t('props.dealsHint', uiLang)}
            </div>
          )}
        </div>
      )}

      {/* TEXT */}
      {tile.type === 'text' && (
        <div className="props-section">
          <label className="label">{t('props.textContent', uiLang)}</label>
          <textarea value={tile.textOverlay || ''} onChange={function(e) { u('textOverlay', e.target.value); }}
            rows={4} className="input" placeholder={t('props.nativeTextPlaceholder', uiLang)} />
          <div className="text-align-picker" style={{ display: 'flex', gap: 2, marginTop: 4 }}>
            <button className={'btn text-align-btn' + ((!tile.textAlign || tile.textAlign === 'left') ? ' active' : '')} onClick={function() { u('textAlign', 'left'); }} title="Linksbündig" style={{ fontSize: 10, padding: '3px 8px' }}>&#8676; Links</button>
            <button className={'btn text-align-btn' + (tile.textAlign === 'center' ? ' active' : '')} onClick={function() { u('textAlign', 'center'); }} title="Zentriert" style={{ fontSize: 10, padding: '3px 8px' }}>Mitte</button>
            <button className={'btn text-align-btn' + (tile.textAlign === 'right' ? ' active' : '')} onClick={function() { u('textAlign', 'right'); }} title="Rechtsbündig" style={{ fontSize: 10, padding: '3px 8px' }}>Rechts &#8677;</button>
          </div>
          <div className="hint">{t('props.nativeTextHint', uiLang)}</div>
        </div>
      )}

      {/* VIDEO */}
      {tile.type === 'video' && (
        <>
          <div className="props-section">
            <label className="label">{t('props.videoBrief', uiLang)}</label>
            <textarea value={tile.brief || ''} onChange={function(e) { u('brief', e.target.value); }}
              rows={3} className="input" placeholder={t('props.videoBriefPlaceholder', uiLang)} />
          </div>
          <div className="props-section">
            <label className="label">{t('props.desktopDimensions', uiLang)}</label>
            <div className="props-dims">
              <input type="number" value={(tile.dimensions || {}).w || 3000}
                onChange={function(e) { ud('desktop', 'w', parseInt(e.target.value) || 3000); }} className="input" />
              <span className="props-dims-x">&times;</span>
              <input type="number" value={(tile.dimensions || {}).h || 1688}
                onChange={function(e) { ud('desktop', 'h', parseInt(e.target.value) || 1688); }} className="input" />
            </div>
          </div>
          <div className="props-section">
            <label className="label">{t('props.mobileDimensions', uiLang)}</label>
            <div className="props-dims">
              <input type="number" value={(tile.mobileDimensions || {}).w || 1242}
                onChange={function(e) { ud('mobile', 'w', parseInt(e.target.value) || 1242); }} className="input" />
              <span className="props-dims-x">&times;</span>
              <input type="number" value={(tile.mobileDimensions || {}).h || 699}
                onChange={function(e) { ud('mobile', 'h', parseInt(e.target.value) || 699); }} className="input" />
            </div>
          </div>
          {fileUpload(t('props.videoThumbnail', uiLang), tile.videoThumbnail,
            function(v) { u('videoThumbnail', v); }, function() { u('videoThumbnail', null); }, uiLang)}
        </>
      )}
    </div>
  );
}
