import { useState, useRef } from 'react';
import { TILE_TYPES, TILE_TYPE_LABELS, PRODUCT_TILE_TYPES, IMAGE_CATEGORIES, MAX_HOTSPOTS } from '../constants';
import { t } from '../i18n';

// Toggle **bold** around selected text or at cursor
function toggleBold(ref, value, onChange) {
  var el = ref.current;
  if (!el) return;
  var start = el.selectionStart;
  var end = el.selectionEnd;
  if (start === end) return; // no selection
  var selected = value.substring(start, end);
  var newValue;
  // Check if already bold
  if (value.substring(start - 2, start) === '**' && value.substring(end, end + 2) === '**') {
    newValue = value.substring(0, start - 2) + selected + value.substring(end + 2);
    onChange(newValue);
    setTimeout(function() { el.setSelectionRange(start - 2, end - 2); }, 0);
  } else if (selected.startsWith('**') && selected.endsWith('**')) {
    newValue = value.substring(0, start) + selected.slice(2, -2) + value.substring(end);
    onChange(newValue);
    setTimeout(function() { el.setSelectionRange(start, end - 4); }, 0);
  } else {
    newValue = value.substring(0, start) + '**' + selected + '**' + value.substring(end);
    onChange(newValue);
    setTimeout(function() { el.setSelectionRange(start + 2, end + 2); }, 0);
  }
}

function TextFieldWithBold({ value, onChange, rows, placeholder, className }) {
  var ref = useRef(null);
  var isTextarea = rows && rows > 1;
  return (
    <div>
      <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
        <button
          type="button"
          className="btn"
          style={{ fontSize: 10, padding: '2px 8px', fontWeight: 800, minWidth: 24 }}
          title="Fett (Text markieren, dann klicken)"
          onClick={function() { toggleBold(ref, value || '', onChange); }}
        >B</button>
      </div>
      {isTextarea ? (
        <textarea ref={ref} value={value || ''} onChange={function(e) { onChange(e.target.value); }}
          rows={rows} className={className || 'input'} placeholder={placeholder} />
      ) : (
        <input ref={ref} value={value || ''} onChange={function(e) { onChange(e.target.value); }}
          className={className || 'input'} placeholder={placeholder} />
      )}
    </div>
  );
}

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

export default function PropertiesPanel({ tile, onChange, products, viewMode, uiLang, layoutType }) {
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
    var cur = tile[key] || { w: which === 'mobile' ? 1680 : 3000, h: 1200 };
    var updated = { [key]: Object.assign({}, cur, { [k]: v }) };
    // When syncing is on and desktop changes, mirror to mobile
    if (tile.syncDimensions && which === 'desktop') {
      updated.mobileDimensions = Object.assign({}, tile.dimensions || { w: 3000, h: 1200 }, { [k]: v });
    }
    onChange(Object.assign({}, tile, updated));
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
            if (tt === 'video' && !up.mobileDimensions) up.mobileDimensions = { w: 1680, h: 945 };
            onChange(up);
          }}>
          {TILE_TYPES.filter(function(tt) {
            // Shoppable images only allowed in Standard layouts, not VH
            if (tt === 'shoppable_image' && layoutType === 'vh') return false;
            return true;
          }).map(function(tt) {
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
            <TextFieldWithBold value={tile.brief || ''} onChange={function(v) { u('brief', v); }}
              rows={3} placeholder={t('props.designerBriefPlaceholder', uiLang)} className="input" />
          </div>
          <div className="props-section">
            <label className="label">{t('props.textOverlay', uiLang)}</label>
            <TextFieldWithBold value={tile.textOverlay || ''} onChange={function(v) { u('textOverlay', v); }}
              placeholder={t('props.textOverlayPlaceholder', uiLang)} className="input" />
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
            <TextFieldWithBold value={tile.ctaText || ''} onChange={function(v) { u('ctaText', v); }}
              placeholder='"Jetzt entdecken"' className="input" />
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

          {/* Sync Dimensions Checkbox */}
          <div className="props-section">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!tile.syncDimensions}
                onChange={function(e) {
                  var synced = e.target.checked;
                  var up = { syncDimensions: synced };
                  if (synced) {
                    up.mobileDimensions = Object.assign({}, tile.dimensions || { w: 3000, h: 1200 });
                  }
                  onChange(Object.assign({}, tile, up));
                }} />
              {t('props.syncDimensions', uiLang)}
            </label>
          </div>

          {/* Mobile Dimensions */}
          <div className="props-section">
            <label className="label">{t('props.mobileDimensions', uiLang)}</label>
            <div className="props-dims">
              <input type="number" value={tile.syncDimensions ? ((tile.dimensions || {}).w || 3000) : ((tile.mobileDimensions || {}).w || 1680)}
                onChange={function(e) { ud('mobile', 'w', parseInt(e.target.value) || 1680); }} className="input" disabled={!!tile.syncDimensions} />
              <span className="props-dims-x">&times;</span>
              <input type="number" value={tile.syncDimensions ? ((tile.dimensions || {}).h || 1200) : ((tile.mobileDimensions || {}).h || 1200)}
                onChange={function(e) { ud('mobile', 'h', parseInt(e.target.value) || 1200); }} className="input" disabled={!!tile.syncDimensions} />
            </div>
          </div>

          {/* Link / ASIN (single click-target for the whole image) */}
          <div className="props-section">
            <label className="label">{t('props.linkAsin', uiLang)}</label>
            <input value={tile.linkAsin || ''} onChange={function(e) { u('linkAsin', e.target.value.trim()); }}
              className="input input-mono" placeholder="B0XXXXXXXXXX" />
          </div>

          {/* HOTSPOTS — only for shoppable_image */}
          {tile.type === 'shoppable_image' && (
            <div className="props-section">
              <label className="label">Hotspots (max {MAX_HOTSPOTS})</label>
              <div className="hint" style={{ marginBottom: 8, color: '#b45309', fontWeight: 600 }}>
                ⚠ Hotspots and CTA buttons are Amazon UI overlays — NOT part of the image design!
                The designer must NOT include hotspot dots or CTA buttons in the image itself.
              </div>
              {(tile.hotspots || []).map(function(hs, idx) {
                return (
                  <div key={idx} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 6, padding: 6, background: '#fef3c7', borderRadius: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', minWidth: 16 }}>{idx + 1}</span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <label style={{ fontSize: 10, color: '#78716c', minWidth: 14 }}>X%</label>
                        <input type="number" min="0" max="100" value={hs.x || 0}
                          onChange={function(e) {
                            var updated = (tile.hotspots || []).slice();
                            updated[idx] = Object.assign({}, hs, { x: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) });
                            u('hotspots', updated);
                          }}
                          className="input input-mono" style={{ width: 50, fontSize: 11 }} />
                        <label style={{ fontSize: 10, color: '#78716c', minWidth: 14 }}>Y%</label>
                        <input type="number" min="0" max="100" value={hs.y || 0}
                          onChange={function(e) {
                            var updated = (tile.hotspots || []).slice();
                            updated[idx] = Object.assign({}, hs, { y: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) });
                            u('hotspots', updated);
                          }}
                          className="input input-mono" style={{ width: 50, fontSize: 11 }} />
                      </div>
                      <input value={hs.asin || ''} placeholder="ASIN (B0XXXXXXXXXX)"
                        onChange={function(e) {
                          var updated = (tile.hotspots || []).slice();
                          updated[idx] = Object.assign({}, hs, { asin: e.target.value.trim() });
                          u('hotspots', updated);
                        }}
                        className="input input-mono" style={{ fontSize: 11 }} />
                    </div>
                    <button className="btn" style={{ fontSize: 10, padding: '2px 6px', color: '#dc2626' }}
                      onClick={function() {
                        var updated = (tile.hotspots || []).slice();
                        updated.splice(idx, 1);
                        u('hotspots', updated);
                      }}>✕</button>
                  </div>
                );
              })}
              {(tile.hotspots || []).length < MAX_HOTSPOTS && (
                <button className="btn" style={{ fontSize: 11, padding: '4px 10px', marginTop: 4 }}
                  onClick={function() {
                    var updated = (tile.hotspots || []).slice();
                    updated.push({ x: 50, y: 50, asin: '' });
                    u('hotspots', updated);
                  }}>
                  + Add Hotspot
                </button>
              )}
              <div className="hint" style={{ marginTop: 6 }}>
                X/Y = position in % (0=left/top, 100=right/bottom). Each hotspot links to a product variant.
              </div>
            </div>
          )}

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
          <TextFieldWithBold value={tile.textOverlay || ''} onChange={function(v) { u('textOverlay', v); }}
            rows={4} placeholder={t('props.nativeTextPlaceholder', uiLang)} className="input" />
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
            <TextFieldWithBold value={tile.brief || ''} onChange={function(v) { u('brief', v); }}
              rows={3} placeholder={t('props.videoBriefPlaceholder', uiLang)} className="input" />
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
          {/* Sync Dimensions Checkbox */}
          <div className="props-section">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!tile.syncDimensions}
                onChange={function(e) {
                  var synced = e.target.checked;
                  var up = { syncDimensions: synced };
                  if (synced) {
                    up.mobileDimensions = Object.assign({}, tile.dimensions || { w: 3000, h: 1688 });
                  }
                  onChange(Object.assign({}, tile, up));
                }} />
              {t('props.syncDimensions', uiLang)}
            </label>
          </div>
          <div className="props-section">
            <label className="label">{t('props.mobileDimensions', uiLang)}</label>
            <div className="props-dims">
              <input type="number" value={tile.syncDimensions ? ((tile.dimensions || {}).w || 3000) : ((tile.mobileDimensions || {}).w || 1680)}
                onChange={function(e) { ud('mobile', 'w', parseInt(e.target.value) || 1680); }} className="input" disabled={!!tile.syncDimensions} />
              <span className="props-dims-x">&times;</span>
              <input type="number" value={tile.syncDimensions ? ((tile.dimensions || {}).h || 1688) : ((tile.mobileDimensions || {}).h || 699)}
                onChange={function(e) { ud('mobile', 'h', parseInt(e.target.value) || 699); }} className="input" disabled={!!tile.syncDimensions} />
            </div>
          </div>
          {fileUpload(t('props.videoThumbnail', uiLang), tile.videoThumbnail,
            function(v) { u('videoThumbnail', v); }, function() { u('videoThumbnail', null); }, uiLang)}
        </>
      )}
    </div>
  );
}
