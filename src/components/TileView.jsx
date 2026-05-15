import { useRef, useState, useEffect } from 'react';
import { PRODUCT_TILE_TYPES, TILE_TYPE_LABELS } from '../constants';
import { t } from '../i18n';
import Wireframe from './Wireframe';

// Entfernt eventuell noch in alten Stores vorhandene **WORT** Marker, ohne
// sie zu rendern. Headlines werden ohne jede Inline Formatierung angezeigt.
function stripBoldMarkers(text) {
  return String(text == null ? '' : text).replace(/\*\*([^*]+)\*\*/g, '$1');
}

function renderMultilineText(text) {
  if (!text) return null;
  var lines = stripBoldMarkers(text).split(/\r?\n/);
  return lines.map(function(line, li) {
    return (
      <span key={li}>
        {line}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
}

function hasOverlayContent(ov) {
  if (!ov || typeof ov !== 'object') return false;
  return !!(ov.heading || ov.subheading || ov.body || (ov.bullets && ov.bullets.length > 0) || ov.cta);
}

function TextOverlayDisplay({ overlay, compact, textAlign }) {
  var ov = overlay;
  if (!hasOverlayContent(ov)) return null;
  return (
    <div className="tile-overlay" style={{ textAlign: textAlign || 'left' }}>
      {ov.heading && <div className="tile-overlay-heading">{renderMultilineText(ov.heading)}</div>}
      {ov.subheading && <div className="tile-overlay-subheading">{renderMultilineText(ov.subheading)}</div>}
      {!compact && ov.body && <div className="tile-overlay-body">{renderMultilineText(ov.body)}</div>}
      {!compact && ov.bullets && ov.bullets.length > 0 && (
        <ul className="tile-overlay-bullets">
          {ov.bullets.map(function(b, i) { return <li key={i}>{b}</li>; })}
        </ul>
      )}
      {ov.cta && <div className="tile-overlay-cta">{ov.cta}</div>}
    </div>
  );
}

function ProductCardWireframe({ asins, products, tileType, bgColor, uiLang }) {
  var productMap = {};
  (products || []).forEach(function(p) { productMap[p.asin] = p; });
  var items = (asins || []).slice(0, 5).map(function(a) { return productMap[a] || { asin: a }; });
  var label = TILE_TYPE_LABELS[tileType] || 'Products';

  return (
    <div className="product-card-grid" style={bgColor ? { background: bgColor } : undefined}>
      <div className="pcg-header">{label} ({(asins || []).length})</div>
      <div className="pcg-cards">
        {items.map(function(p, i) {
          return (
            <div key={i} className="pcg-card">
              <div className="pcg-card-img">
                {p.image ? <img src={p.image} alt="" /> : <div className="pcg-card-placeholder" />}
              </div>
              <div className="pcg-card-info">
                <div className="pcg-card-title">{p.name ? p.name.slice(0, 35) : p.asin}</div>
                {p.rating > 0 && <div className="pcg-card-rating">{'★'.repeat(Math.round(p.rating))}{'☆'.repeat(5 - Math.round(p.rating))} <span>({p.reviews || 0})</span></div>}
                {p.price > 0 && <div className="pcg-card-price">{p.currency || 'EUR'} {p.price}</div>}
              </div>
            </div>
          );
        })}
        {(asins || []).length > 5 && (
          <div className="pcg-card pcg-card-more">+{(asins || []).length - 5} {t('tile.more', uiLang)}</div>
        )}
      </div>
    </div>
  );
}

// Compute hotspots to display on a shoppable image. If the tile already has
// hand placed hotspots, use them. Otherwise generate one default per linked
// product so the designer immediately sees draggable markers.
function effectiveShoppableHotspots(tile) {
  if (Array.isArray(tile.hotspots) && tile.hotspots.length > 0) return tile.hotspots;
  var asins = [];
  if (tile.linkAsin) asins.push(tile.linkAsin);
  (tile.asins || []).forEach(function(a) {
    if (a && asins.indexOf(a) < 0) asins.push(a);
  });
  if (asins.length === 0) return [];
  return asins.map(function(asin, i) {
    var n = asins.length;
    var x = ((i + 1) / (n + 1)) * 100;
    return { asin: asin, x: x, y: 50 };
  });
}

function clampPercent(v) {
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

export default function TileView({ tile, selected, onClick, viewMode, products, uiLang, previewImageSrc, onClearPreview, onChangeHotspots }) {
  var cls = 'tile' + (selected ? ' tile-selected' : '');
  var dims = (viewMode === 'mobile' ? tile.mobileDimensions : tile.dimensions) || tile.dimensions || { w: 3000, h: 1200 };
  var bgColor = tile.bgColor || '';

  // Local drag override so we can render the dragged hotspot at the cursor
  // without flooding the store with mousemove writes. Final position is
  // committed via onChangeHotspots when the user releases the mouse.
  var dragRef = useRef(null);
  var [, setDragTick] = useState(0);
  var tileRootRef = useRef(null);

  // × button to dismiss a folder-loaded preview image at this specific tile.
  function previewClearButton() {
    if (!previewImageSrc || !onClearPreview) return null;
    return (
      <button
        onClick={function(e) { e.stopPropagation(); onClearPreview(); }}
        title="Remove this preview image"
        style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: 'rgba(15,23,42,.85)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, lineHeight: '16px', padding: 0, zIndex: 4 }}>&times;</button>
    );
  }

  function startHotspotDrag(e, hotspotIdx, currentList) {
    if (!onChangeHotspots) return;
    e.preventDefault();
    e.stopPropagation();
    var tileEl = tileRootRef.current;
    if (!tileEl) return;
    function onMove(ev) {
      var rect = tileEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      var x = clampPercent(((ev.clientX - rect.left) / rect.width) * 100);
      var y = clampPercent(((ev.clientY - rect.top) / rect.height) * 100);
      dragRef.current = { idx: hotspotIdx, x: x, y: y };
      setDragTick(function(n) { return n + 1; });
    }
    function onUp() {
      var override = dragRef.current;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      dragRef.current = null;
      setDragTick(function(n) { return n + 1; });
      if (override) {
        var next = currentList.map(function(h, i) {
          if (i !== override.idx) return h;
          return Object.assign({}, h, { x: override.x, y: override.y });
        });
        onChangeHotspots(next);
      }
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Product tile types
  if (PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0) {
    return (
      <div className={cls} onClick={onClick} style={bgColor ? { background: bgColor } : undefined}>
        <ProductCardWireframe asins={tile.asins} products={products} tileType={tile.type} bgColor={bgColor} uiLang={uiLang} />
      </div>
    );
  }

  // Product Selector (Quiz) tile — displayed as Amazon customer-facing preview
  if (tile.type === 'product_selector') {
    var ps = tile.productSelector || {};
    var firstQ = (ps.questions || [])[0];
    var psBg = (ps.styling || {}).bgColor || bgColor || '#fff';
    var psFont = (ps.styling || {}).typography === 'serif' ? 'Georgia, serif' : 'system-ui, -apple-system, sans-serif';
    return (
      <div className={cls} onClick={onClick} style={{ background: psBg, minHeight: 120 }}>
        <div style={{ padding: '14px 16px', fontFamily: psFont }}>
          {/* Intro section (like Amazon shows it) */}
          {ps.intro && ps.intro.enabled && (
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              {ps.intro.image && (
                <img src={ps.intro.image} alt="" style={{ width: '100%', maxHeight: 60, objectFit: 'cover', borderRadius: 4, marginBottom: 6 }} />
              )}
              {ps.intro.headline && (
                <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 2 }}>{ps.intro.headline}</div>
              )}
              {ps.intro.description && (
                <div style={{ fontSize: 10, color: '#565959', marginBottom: 6 }}>{ps.intro.description}</div>
              )}
              {ps.intro.buttonLabel && (
                <div style={{ display: 'inline-block', background: '#FF9900', color: '#111', fontSize: 10, fontWeight: 700, padding: '4px 16px', borderRadius: 20, cursor: 'default' }}>{ps.intro.buttonLabel}</div>
              )}
            </div>
          )}
          {/* Question display (Amazon-style) */}
          {firstQ && (
            <div style={{ textAlign: 'center' }}>
              {firstQ.questionText && (
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 2 }}>{firstQ.questionText}</div>
              )}
              {firstQ.descriptionText && (
                <div style={{ fontSize: 9, color: '#565959', marginBottom: 8 }}>{firstQ.descriptionText}</div>
              )}
              {/* Answer choices as clickable cards (Amazon style) */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                {(firstQ.answers || []).map(function(a, ai) {
                  return (
                    <div key={ai} style={{
                      border: '1px solid #d5d9d9', borderRadius: 8, padding: a.image ? 0 : '8px 10px',
                      minWidth: 60, maxWidth: 90, textAlign: 'center', background: '#fff',
                      overflow: 'hidden', cursor: 'default',
                    }}>
                      {a.image && (
                        <img src={a.image} alt="" style={{ width: '100%', height: 50, objectFit: 'cover' }} />
                      )}
                      <div style={{ fontSize: 9, fontWeight: 600, color: '#0F1111', padding: a.image ? '3px 4px' : 0 }}>
                        {a.text || 'Antwort ' + (ai + 1)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Quiz indicator */}
          {(ps.questions || []).length > 1 && (
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 8, color: '#888' }}>
              1 / {(ps.questions || []).length}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (tile.type === 'video') {
    var aspect = dims.w / dims.h;
    var displayH = Math.round(200 / aspect);
    return (
      <div className={cls} onClick={onClick}>
        <div className="tile-video" style={Object.assign({ minHeight: Math.max(80, displayH) }, bgColor ? { background: bgColor } : {})}>
          {tile.videoThumbnail ? (
            <img src={tile.videoThumbnail} className="tile-video-thumb" alt="" />
          ) : (
            <>
              <span className="tile-video-play">&#9654;</span>
              <div className="tile-video-label">{t('tile.video', uiLang)}</div>
            </>
          )}
          <div className="tile-video-dims">{dims.w}&times;{dims.h}</div>
        </div>
      </div>
    );
  }

  if (tile.type === 'text') {
    return (
      <div className={cls} onClick={onClick} style={bgColor ? { background: bgColor } : undefined}>
        <div className="tile-text-native">
          {hasOverlayContent(tile.textOverlay)
            ? <TextOverlayDisplay overlay={tile.textOverlay} textAlign={tile.textAlign} />
            : <div className="tile-text-content" style={{ textAlign: tile.textAlign || 'left' }}>{t('tile.textModule', uiLang)}</div>}
        </div>
      </div>
    );
  }

  if (tile.type === 'image_text') {
    var img = previewImageSrc || ((viewMode === 'mobile' ? tile.uploadedImageMobile : tile.uploadedImage) || tile.uploadedImage);
    return (
      <div className={cls} onClick={onClick} style={Object.assign({ position: 'relative' }, bgColor ? { background: bgColor } : {})}>
        {img
          ? <img src={img} className="tile-uploaded-img" alt="" />
          : tile.wireframeImage
            ? <img src={tile.wireframeImage} className="tile-uploaded-img tile-wireframe-img" alt="Wireframe" />
            : <Wireframe tile={tile} viewMode={viewMode} bgColor={bgColor} />
        }
        {previewClearButton()}
      </div>
    );
  }

  // image or shoppable_image
  var imgSrc = previewImageSrc || ((viewMode === 'mobile' ? tile.uploadedImageMobile : tile.uploadedImage) || tile.uploadedImage);
  // Effective list shown on shoppable images: stored hotspots, or one
  // default per linked product when none have been positioned yet.
  var shoppableHotspots = tile.type === 'shoppable_image' ? effectiveShoppableHotspots(tile) : [];
  var dragOverride = dragRef.current;
  return (
    <div ref={tileRootRef} className={cls} onClick={onClick} style={Object.assign({ position: 'relative' }, bgColor ? { background: bgColor } : {})}>
      {imgSrc
        ? <img src={imgSrc} className="tile-uploaded-img" alt="" draggable={false} />
        : tile.wireframeImage
          ? <img src={tile.wireframeImage} className="tile-uploaded-img tile-wireframe-img" alt="Wireframe" />
          : <Wireframe tile={tile} viewMode={viewMode} bgColor={bgColor} />
      }
      {/* Sobald ein Bild geladen ist, wird angenommen dass das fertige Bild
          alle Elemente und Texte bereits enthält. Daher kein zusätzliches
          Text Overlay und kein Shoppable oder ASIN Badge auf der Kachel.
          Auf shoppable Bildern sind die Hotspots aber sichtbar und auf
          dem Bild positionierbar. */}
      {tile.type === 'shoppable_image' && shoppableHotspots.map(function(hs, i) {
        var isDragging = dragOverride && dragOverride.idx === i;
        var x = isDragging ? dragOverride.x : (hs.x || 0);
        var y = isDragging ? dragOverride.y : (hs.y || 0);
        // Drag erlaubt sobald onChangeHotspots vorhanden ist, also auch ohne
        // hochgeladenes Bild auf der Wireframe Darstellung. Damit kann der
        // Operator die Punkte schon waehrend des Konzepts platzieren.
        var draggable = !!onChangeHotspots;
        var size = imgSrc ? 22 : 18;
        return (
          <div key={i} className="tile-hotspot-dot"
            onMouseDown={draggable ? function(ev) { startHotspotDrag(ev, i, shoppableHotspots); } : undefined}
            onClick={function(ev) { if (draggable) ev.stopPropagation(); }}
            title={hs.asin ? 'ASIN ' + hs.asin + (draggable ? ' (Mauszeiger gedrückt halten zum Verschieben)' : '') : ''}
            style={{
              position: 'absolute',
              left: x + '%',
              top: y + '%',
              transform: 'translate(-50%, -50%)',
              width: size, height: size,
              borderRadius: '50%',
              background: isDragging ? '#FF9900' : 'rgba(17,24,39,0.85)',
              border: '2px solid rgba(255,255,255,0.95)',
              boxShadow: imgSrc ? '0 1px 4px rgba(0,0,0,.35)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
              userSelect: 'none',
              zIndex: 3,
            }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
          </div>
        );
      })}
      {!imgSrc && shoppableHotspots.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          background: '#FF9900', color: '#fff', fontSize: 9, fontWeight: 700,
          padding: '1px 5px', borderRadius: 3, pointerEvents: 'none', zIndex: 2,
        }}>{shoppableHotspots.length} Hotspot{shoppableHotspots.length > 1 ? 's' : ''}</div>
      )}
      {previewClearButton()}
    </div>
  );
}
