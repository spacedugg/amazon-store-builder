import { useState, useRef } from 'react';
import { TILE_TYPES, TILE_TYPE_LABELS, PRODUCT_TILE_TYPES, IMAGE_CATEGORIES, MAX_HOTSPOTS, createDefaultProductSelector } from '../constants';
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
          {tile.wireframeDescription && (
            <div className="props-section">
              <label className="label" style={{ color: '#7c3aed' }}>Bildbeschreibung (intern, nicht für Designer)</label>
              <div style={{ fontSize: 10, lineHeight: 1.5, padding: '6px 8px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 4, color: '#6b21a8' }}>
                {tile.wireframeDescription}
              </div>
            </div>
          )}
          <div className="props-section">
            <label className="label">{t('props.textOverlay', uiLang)}</label>

            {/* ── STRUCTURED TEXT EDITOR: separate fields per hierarchy level ── */}
            {(function() {
              var lines = (tile.textOverlay || '').split(/\\n|\n/);
              // Detect if lines are equal-rank (all similar length, no bullets = same level)
              var nonBulletLines = lines.filter(function(l) { return l.trim() && !/^•\s/.test(l.trim()); });
              var isEqualRank = nonBulletLines.length >= 2 && (function() {
                // Check if all non-bullet lines are similar in length (±50%)
                var avgLen = nonBulletLines.reduce(function(s, l) { return s + l.trim().length; }, 0) / nonBulletLines.length;
                return nonBulletLines.every(function(l) {
                  var len = l.trim().length;
                  return len >= avgLen * 0.4 && len <= avgLen * 2.5;
                });
              })();

              // Classify lines into hierarchy levels
              var structured = lines.map(function(line, i) {
                var trimmed = line.trim();
                var isBullet = /^•\s/.test(trimmed);
                if (isBullet) return { type: 'bullet', text: trimmed.replace(/^•\s*/, ''), idx: i };
                if (isEqualRank) return { type: 'text', text: trimmed, idx: i }; // all same level
                if (i === 0) return { type: 'h1', text: trimmed, idx: i };
                var prevNonBullets = lines.slice(0, i).filter(function(l) { return l.trim() && !/^•\s/.test(l.trim()); }).length;
                if (prevNonBullets === 1) return { type: 'h2', text: trimmed, idx: i };
                return { type: 'h3', text: trimmed, idx: i };
              });

              function updateLine(lineIdx, newText) {
                var newLines = (tile.textOverlay || '').split(/\\n|\n/);
                var prefix = structured[lineIdx] && structured[lineIdx].type === 'bullet' ? '• ' : '';
                newLines[lineIdx] = prefix + newText;
                u('textOverlay', newLines.join('\\n'));
              }

              function addLine(type) {
                var current = tile.textOverlay || '';
                var prefix = type === 'bullet' ? '• ' : '';
                u('textOverlay', current + (current ? '\\n' : '') + prefix);
              }

              function removeLine(lineIdx) {
                var newLines = (tile.textOverlay || '').split(/\\n|\n/);
                newLines.splice(lineIdx, 1);
                u('textOverlay', newLines.join('\\n'));
              }

              var labels = { h1: 'Überschrift (H1)', h2: 'Unterzeile (H2)', h3: 'Ergänzungstext (H3)', bullet: 'Aufzählung', text: 'Text (gleiche Ebene)' };
              var colors = { h1: '#1d4ed8', h2: '#4338ca', h3: '#64748b', bullet: '#92400e', text: '#0f766e' };
              var bgColors = { h1: '#dbeafe', h2: '#e0e7ff', h3: '#f1f5f9', bullet: '#fef3c7', text: '#ccfbf1' };
              var fontSizes = { h1: 12, h2: 11, h3: 11, bullet: 11, text: 11 };
              var fontWeights = { h1: 700, h2: 600, h3: 400, bullet: 400, text: 600 };

              return (
                <div>
                  {structured.map(function(item, i) {
                    if (!item.text && structured.length > 1) return null; // skip empty lines in multi-line
                    return (
                      <div key={i} style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ background: bgColors[item.type], color: colors[item.type], borderRadius: 3, padding: '1px 6px', fontSize: 8, fontWeight: 700, minWidth: 20, textAlign: 'center', flexShrink: 0 }}>
                          {item.type === 'bullet' ? '•' : item.type.toUpperCase()}
                        </span>
                        <input
                          value={item.text}
                          onChange={function(e) { updateLine(i, e.target.value); }}
                          placeholder={labels[item.type]}
                          style={{ flex: 1, fontSize: fontSizes[item.type], fontWeight: fontWeights[item.type], padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 4, fontFamily: 'inherit' }}
                        />
                        {structured.length > 1 && (
                          <button onClick={function() { removeLine(i); }} style={{ fontSize: 10, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }} title="Zeile entfernen">&times;</button>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <button className="btn" onClick={function() { addLine('text'); }} style={{ fontSize: 9, padding: '2px 8px' }}>+ Textzeile</button>
                    <button className="btn" onClick={function() { addLine('bullet'); }} style={{ fontSize: 9, padding: '2px 8px' }}>+ Aufzählung</button>
                  </div>
                  {/* Raw edit fallback */}
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ fontSize: 9, color: '#94a3b8', cursor: 'pointer' }}>Raw bearbeiten</summary>
                    <TextFieldWithBold value={tile.textOverlay || ''} onChange={function(v) { u('textOverlay', v); }}
                      placeholder={t('props.textOverlayPlaceholder', uiLang)} className="input" />
                  </details>
                </div>
              );
            })()}

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

          {/* ─── AMAZON PRODUCT IMAGES (for internal orientation) ─── */}
          {products && products.length > 0 && (function() {
            var relevantAsins = [];
            if (tile.linkAsin) relevantAsins.push(tile.linkAsin);
            (tile.hotspots || []).forEach(function(hs) {
              if (hs.asin && relevantAsins.indexOf(hs.asin) < 0) relevantAsins.push(hs.asin);
            });
            (tile.asins || []).forEach(function(a) {
              if (a && relevantAsins.indexOf(a) < 0) relevantAsins.push(a);
            });
            if (relevantAsins.length === 0) return null;
            var matchedProducts = relevantAsins.map(function(a) { return productMap[a]; }).filter(function(p) { return p && p.image; });
            if (matchedProducts.length === 0) return null;
            return (
              <div className="props-section" style={{ padding: '6px 8px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', marginBottom: 4 }}>
                  Amazon Product ({matchedProducts.length}):
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {matchedProducts.slice(0, 6).map(function(p, pi) {
                    return (
                      <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', borderRadius: 4, padding: '3px 6px', border: '1px solid #e0f2fe', maxWidth: 200 }}>
                        <img src={p.image} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 2, flexShrink: 0 }} />
                        <div style={{ fontSize: 9, lineHeight: 1.3, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name ? p.name.slice(0, 35) : p.asin}</div>
                          <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 8 }}>{p.asin}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ─── PRODUCTS MENTIONED IN BRIEF (inline product images) ─── */}
          {products && products.length > 0 && tile.brief && (function() {
            var alreadyShown = {};
            if (tile.linkAsin) alreadyShown[tile.linkAsin] = true;
            (tile.hotspots || []).forEach(function(hs) { if (hs.asin) alreadyShown[hs.asin] = true; });
            (tile.asins || []).forEach(function(a) { if (a) alreadyShown[a] = true; });
            var briefLower = tile.brief.toLowerCase();
            var mentioned = products.filter(function(p) {
              if (alreadyShown[p.asin]) return false;
              if (!p.image) return false;
              if (briefLower.indexOf(p.asin.toLowerCase()) >= 0) return true;
              if (p.name && p.name.length > 5) {
                var nameWords = p.name.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 3; });
                var matchCount = nameWords.filter(function(w) { return briefLower.indexOf(w) >= 0; }).length;
                return nameWords.length > 0 && matchCount >= Math.ceil(nameWords.length * 0.5);
              }
              return false;
            }).slice(0, 4);
            if (mentioned.length === 0) return null;
            return (
              <div className="props-section" style={{ padding: '6px 8px', background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>
                  Mentioned in Brief ({mentioned.length}):
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {mentioned.map(function(p, pi) {
                    return (
                      <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', borderRadius: 4, padding: '3px 6px', border: '1px solid #e9d5ff', maxWidth: 200 }}>
                        <img src={p.image} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 2, flexShrink: 0 }} />
                        <div style={{ fontSize: 9, lineHeight: 1.3, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name ? p.name.slice(0, 35) : p.asin}</div>
                          <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 8 }}>{p.asin}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

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

      {/* PRODUCT SELECTOR (QUIZ) */}
      {tile.type === 'product_selector' && (function() {
        var ps = tile.productSelector || createDefaultProductSelector();
        var updatePS = function(path, val) {
          var copy = JSON.parse(JSON.stringify(ps));
          var parts = path.split('.');
          var target = copy;
          for (var pi = 0; pi < parts.length - 1; pi++) { target = target[parts[pi]]; }
          target[parts[parts.length - 1]] = val;
          onChange(Object.assign({}, tile, { productSelector: copy }));
        };
        var updateQuestion = function(qIdx, field, val) {
          var copy = JSON.parse(JSON.stringify(ps));
          copy.questions[qIdx][field] = val;
          onChange(Object.assign({}, tile, { productSelector: copy }));
        };
        var updateAnswer = function(qIdx, aIdx, field, val) {
          var copy = JSON.parse(JSON.stringify(ps));
          copy.questions[qIdx].answers[aIdx][field] = val;
          onChange(Object.assign({}, tile, { productSelector: copy }));
        };
        var addQuestion = function() {
          if ((ps.questions || []).length >= 4) return;
          var copy = JSON.parse(JSON.stringify(ps));
          var qId = 'q' + (copy.questions.length + 1) + '_' + Date.now().toString(36);
          copy.questions.push({ id: qId, questionText: '', descriptionText: '', answers: [
            { id: 'a1_' + qId, text: '', image: null, asins: [] },
            { id: 'a2_' + qId, text: '', image: null, asins: [] },
          ], allowImages: true });
          onChange(Object.assign({}, tile, { productSelector: copy }));
        };
        var removeQuestion = function(qIdx) {
          if ((ps.questions || []).length <= 1) return;
          var copy = JSON.parse(JSON.stringify(ps));
          copy.questions.splice(qIdx, 1);
          onChange(Object.assign({}, tile, { productSelector: copy }));
        };
        var addAnswer = function(qIdx) {
          if ((ps.questions[qIdx].answers || []).length >= 6) return;
          var copy = JSON.parse(JSON.stringify(ps));
          var aId = 'a' + (copy.questions[qIdx].answers.length + 1) + '_' + Date.now().toString(36);
          copy.questions[qIdx].answers.push({ id: aId, text: '', image: null, asins: [] });
          onChange(Object.assign({}, tile, { productSelector: copy }));
        };
        var removeAnswer = function(qIdx, aIdx) {
          if ((ps.questions[qIdx].answers || []).length <= 2) return;
          var copy = JSON.parse(JSON.stringify(ps));
          copy.questions[qIdx].answers.splice(aIdx, 1);
          onChange(Object.assign({}, tile, { productSelector: copy }));
        };

        return (
          <>
            {/* Intro */}
            <div className="props-section">
              <div style={{ fontWeight: 700, fontSize: 11, color: '#7c3aed', marginBottom: 6 }}>Intro (vor dem Quiz)</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', marginBottom: 6 }}>
                <input type="checkbox" checked={!!(ps.intro && ps.intro.enabled)}
                  onChange={function(e) { updatePS('intro.enabled', e.target.checked); }} />
                Intro aktivieren
              </label>
              {ps.intro && ps.intro.enabled && (
                <>
                  <input className="input" value={ps.intro.headline || ''} placeholder="Überschrift (max. 45 Zeichen)"
                    maxLength={45} onChange={function(e) { updatePS('intro.headline', e.target.value); }} style={{ marginBottom: 4 }} />
                  <input className="input" value={ps.intro.description || ''} placeholder="Beschreibung (max. 70 Zeichen)"
                    maxLength={70} onChange={function(e) { updatePS('intro.description', e.target.value); }} style={{ marginBottom: 4 }} />
                  <input className="input" value={ps.intro.buttonLabel || ''} placeholder="Button-Text (max. 20 Zeichen)"
                    maxLength={20} onChange={function(e) { updatePS('intro.buttonLabel', e.target.value); }} style={{ marginBottom: 6 }} />
                  {/* Intro image upload */}
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#6b21a8', marginBottom: 3 }}>Intro-Bild (optional)</div>
                  {ps.intro.image ? (
                    <div style={{ position: 'relative', marginBottom: 4 }}>
                      <img src={ps.intro.image} alt="Intro" style={{ width: '100%', maxHeight: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }} />
                      <button onClick={function() { updatePS('intro.image', null); }}
                        style={{ position: 'absolute', top: 2, right: 2, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 9, cursor: 'pointer', lineHeight: '14px' }}>✕</button>
                    </div>
                  ) : (
                    <label style={{ display: 'inline-block', fontSize: 9, color: '#7c3aed', border: '1px dashed #c4b5fd', borderRadius: 3, padding: '3px 10px', cursor: 'pointer', marginBottom: 4 }}>
                      + Bild hochladen
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={function(e) {
                          var file = e.target.files && e.target.files[0];
                          if (!file) return;
                          var reader = new FileReader();
                          reader.onload = function(ev) { updatePS('intro.image', ev.target.result); };
                          reader.readAsDataURL(file);
                        }} />
                    </label>
                  )}
                </>
              )}
            </div>

            {/* Recommended ASINs */}
            <div className="props-section">
              <div style={{ fontWeight: 700, fontSize: 11, color: '#7c3aed', marginBottom: 4 }}>Empfohlene Produkte (max. 50)</div>
              <textarea className="input" rows={2} value={(ps.recommendedAsins || []).join('\n')}
                placeholder="ASINs (eine pro Zeile)"
                onChange={function(e) {
                  var asins = e.target.value.split(/[\n,;]+/).map(function(s) { return s.trim(); }).filter(Boolean).slice(0, 50);
                  updatePS('recommendedAsins', asins);
                }} />
              <div className="hint">{(ps.recommendedAsins || []).length} / 50 ASINs</div>
            </div>

            {/* Questions */}
            <div className="props-section">
              <div style={{ fontWeight: 700, fontSize: 11, color: '#7c3aed', marginBottom: 6 }}>Fragen & Antworten ({(ps.questions || []).length}/4)</div>
              {(ps.questions || []).map(function(q, qIdx) {
                return (
                  <div key={q.id || qIdx} style={{ background: '#faf5ff', borderRadius: 6, padding: 8, marginBottom: 8, border: '1px solid #e9d5ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 10, color: '#6b21a8' }}>Frage {qIdx + 1}</div>
                      {(ps.questions || []).length > 1 && (
                        <button onClick={function() { removeQuestion(qIdx); }}
                          style={{ fontSize: 9, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Entfernen</button>
                      )}
                    </div>
                    <input className="input" value={q.questionText || ''} placeholder="Fragetext (max. 55 Zeichen)"
                      maxLength={55} onChange={function(e) { updateQuestion(qIdx, 'questionText', e.target.value); }}
                      style={{ marginBottom: 4, fontSize: 11 }} />
                    <input className="input" value={q.descriptionText || ''} placeholder="Beschreibung (optional, max. 80)"
                      maxLength={80} onChange={function(e) { updateQuestion(qIdx, 'descriptionText', e.target.value); }}
                      style={{ marginBottom: 6, fontSize: 10 }} />

                    {/* Answers */}
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', marginBottom: 3 }}>Antworten ({(q.answers || []).length}/6)</div>
                    {(q.answers || []).map(function(a, aIdx) {
                      return (
                        <div key={a.id || aIdx} style={{ background: '#fff', borderRadius: 4, border: '1px solid #ede9fe', padding: 4, marginBottom: 4 }}>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: a.image ? 4 : 0 }}>
                            <input className="input" value={a.text || ''} placeholder={'Antwort ' + (aIdx + 1) + ' (max. 40)'}
                              maxLength={40} style={{ flex: 1, fontSize: 10, padding: '3px 6px' }}
                              onChange={function(e) { updateAnswer(qIdx, aIdx, 'text', e.target.value); }} />
                            <input className="input" value={(a.asins || []).join(', ')} placeholder="ASINs"
                              style={{ width: 80, fontSize: 9, padding: '3px 4px' }}
                              onChange={function(e) {
                                var asins = e.target.value.split(/[,;\s]+/).map(function(s) { return s.trim(); }).filter(Boolean);
                                updateAnswer(qIdx, aIdx, 'asins', asins);
                              }} />
                            {(q.answers || []).length > 2 && (
                              <button onClick={function() { removeAnswer(qIdx, aIdx); }}
                                style={{ fontSize: 10, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>✕</button>
                            )}
                          </div>
                          {/* Answer image upload */}
                          {q.allowImages && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                              {a.image ? (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                  <img src={a.image} alt="" style={{ height: 36, width: 36, objectFit: 'cover', borderRadius: 3, border: '1px solid #e5e7eb' }} />
                                  <button onClick={function() { updateAnswer(qIdx, aIdx, 'image', null); }}
                                    style={{ position: 'absolute', top: -4, right: -4, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: 14, height: 14, fontSize: 8, cursor: 'pointer', lineHeight: '12px' }}>✕</button>
                                </div>
                              ) : (
                                <label style={{ fontSize: 8, color: '#7c3aed', border: '1px dashed #c4b5fd', borderRadius: 3, padding: '2px 6px', cursor: 'pointer' }}>
                                  + Bild
                                  <input type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={function(e) {
                                      var file = e.target.files && e.target.files[0];
                                      if (!file) return;
                                      var reader = new FileReader();
                                      reader.onload = function(ev) { updateAnswer(qIdx, aIdx, 'image', ev.target.result); };
                                      reader.readAsDataURL(file);
                                    }} />
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {(q.answers || []).length < 6 && (
                      <button onClick={function() { addAnswer(qIdx); }}
                        style={{ fontSize: 9, color: '#7c3aed', background: 'none', border: '1px dashed #c4b5fd', borderRadius: 3, cursor: 'pointer', padding: '2px 8px', marginTop: 2 }}>+ Antwort</button>
                    )}
                  </div>
                );
              })}
              {(ps.questions || []).length < 4 && (
                <button onClick={addQuestion} className="btn" style={{ fontSize: 10, padding: '4px 12px' }}>+ Frage hinzufügen</button>
              )}
            </div>

            {/* Results */}
            <div className="props-section">
              <div style={{ fontWeight: 700, fontSize: 11, color: '#7c3aed', marginBottom: 6 }}>Ergebnisse</div>
              <input className="input" value={(ps.results || {}).headline || ''} placeholder="Überschrift (max. 30)"
                maxLength={30} onChange={function(e) { updatePS('results.headline', e.target.value); }} style={{ marginBottom: 4 }} />
              <input className="input" value={(ps.results || {}).description || ''} placeholder="Beschreibung (max. 80)"
                maxLength={80} onChange={function(e) { updatePS('results.description', e.target.value); }} style={{ marginBottom: 4 }} />
              <input className="input" value={(ps.results || {}).restartLabel || ''} placeholder="Neustart-Button (max. 20)"
                maxLength={20} onChange={function(e) { updatePS('results.restartLabel', e.target.value); }} style={{ marginBottom: 4 }} />
              <textarea className="input" value={(ps.results || {}).disclaimer || ''} placeholder="Haftungsausschluss (optional, max. 200)"
                maxLength={200} rows={2} onChange={function(e) { updatePS('results.disclaimer', e.target.value); }} />
            </div>

            {/* Styling */}
            <div className="props-section">
              <div style={{ fontWeight: 700, fontSize: 11, color: '#7c3aed', marginBottom: 6 }}>Gestaltung</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                {['white', '#fce7f3', '#ffedd5', '#fef9c3', '#dcfce7', '#cffafe', '#e0e7ff', '#f3e8ff'].map(function(c) {
                  var sel = (ps.styling || {}).bgColor === c;
                  return <div key={c} onClick={function() { updatePS('styling.bgColor', c); }}
                    style={{ width: 20, height: 20, borderRadius: 4, background: c, border: sel ? '2px solid #7c3aed' : '1px solid #d1d5db', cursor: 'pointer' }} />;
                })}
              </div>
              <div style={{ display: 'flex', gap: 4, fontSize: 10 }}>
                <button className={'btn' + ((ps.styling || {}).typography === 'sans-serif' ? ' active' : '')}
                  onClick={function() { updatePS('styling.typography', 'sans-serif'); }}
                  style={{ flex: 1, fontSize: 9, padding: '3px 0' }}>Sans Serif</button>
                <button className={'btn' + ((ps.styling || {}).typography === 'serif' ? ' active' : '')}
                  onClick={function() { updatePS('styling.typography', 'serif'); }}
                  style={{ flex: 1, fontSize: 9, padding: '3px 0' }}>Serif</button>
              </div>
            </div>
          </>
        );
      })()}

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
