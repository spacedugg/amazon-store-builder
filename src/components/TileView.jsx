import { PRODUCT_TILE_TYPES, TILE_TYPE_LABELS } from '../constants';
import { t } from '../i18n';
import Wireframe from './Wireframe';

function renderHeadingParts(heading) {
  if (!heading) return null;
  var parts = heading.split(/(\*\*[^*]+\*\*)/g);
  return parts.map(function(p, i) {
    if (p.length > 4 && p.slice(0, 2) === '**' && p.slice(-2) === '**') {
      return <span key={i} style={{ color: '#93bd26' }}>{p.slice(2, -2)}</span>;
    }
    return <span key={i}>{p}</span>;
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
      {ov.heading && <div className="tile-overlay-heading">{renderHeadingParts(ov.heading)}</div>}
      {ov.subheading && <div className="tile-overlay-subheading">{ov.subheading}</div>}
      {!compact && ov.body && <div className="tile-overlay-body">{ov.body}</div>}
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

export default function TileView({ tile, selected, onClick, viewMode, products, uiLang }) {
  var cls = 'tile' + (selected ? ' tile-selected' : '');
  var dims = (viewMode === 'mobile' ? tile.mobileDimensions : tile.dimensions) || tile.dimensions || { w: 3000, h: 1200 };
  var bgColor = tile.bgColor || '';

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
    var img = (viewMode === 'mobile' ? tile.uploadedImageMobile : tile.uploadedImage) || tile.uploadedImage;
    return (
      <div className={cls} onClick={onClick} style={bgColor ? { background: bgColor } : undefined}>
        {img
          ? <img src={img} className="tile-uploaded-img" alt="" />
          : tile.wireframeImage
            ? <img src={tile.wireframeImage} className="tile-uploaded-img tile-wireframe-img" alt="Wireframe" />
            : <Wireframe tile={tile} viewMode={viewMode} bgColor={bgColor} />
        }
        {/* Kein separater Text Block. Text ist immer Teil des Bildes,
            Designer rendert Heading, Subheading, Body, CTA ins Bild rein.
            Im Wireframe Modus zeigt das SVG alle hinterlegten Texte als
            Skizze. Volle Texte sieht der Operator im Properties Panel. */}
      </div>
    );
  }

  // image or shoppable_image
  var imgSrc = (viewMode === 'mobile' ? tile.uploadedImageMobile : tile.uploadedImage) || tile.uploadedImage;
  var hasHotspots = tile.type === 'shoppable_image' && (tile.hotspots || []).length > 0;
  return (
    <div className={cls} onClick={onClick} style={Object.assign({ position: 'relative' }, bgColor ? { background: bgColor } : {})}>
      {imgSrc
        ? <img src={imgSrc} className="tile-uploaded-img" alt="" />
        : tile.wireframeImage
          ? <img src={tile.wireframeImage} className="tile-uploaded-img tile-wireframe-img" alt="Wireframe" />
          : <Wireframe tile={tile} viewMode={viewMode} bgColor={bgColor} />
      }
      {/* Kein Text Overlay über hochgeladenem Bild. Text ist Teil des
          Bildes, Designer hat Heading, Subheading, Body, CTA bereits ins
          Bild gerendert. Im Wireframe Modus zeigt das SVG alle Texte als
          Skizze. */}
      {/* Shoppable badge only shown when wireframe/image is NOT visible (wireframe SVG already has its own badges) */}
      {tile.type === 'shoppable_image' && imgSrc && <div className="tile-shoppable-badge">{t('tile.shoppable', uiLang)}</div>}
      {/* ASIN link shown subtly only when an uploaded image is present (otherwise wireframe shows it) */}
      {tile.linkAsin && imgSrc && <div className="tile-link-badge">ASIN: {tile.linkAsin}</div>}
      {hasHotspots && (tile.hotspots || []).map(function(hs, i) {
        return (
          <div key={i} className="tile-hotspot-dot" style={{
            position: 'absolute',
            left: (hs.x || 0) + '%',
            top: (hs.y || 0) + '%',
            transform: 'translate(-50%, -50%)',
            width: 18, height: 18,
            borderRadius: '50%',
            background: 'rgba(17,24,39,0.75)',
            border: '2px solid rgba(255,255,255,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 2,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
          </div>
        );
      })}
      {hasHotspots && (
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          background: '#FF9900', color: '#fff', fontSize: 9, fontWeight: 700,
          padding: '1px 5px', borderRadius: 3, pointerEvents: 'none', zIndex: 2,
        }}>{(tile.hotspots || []).length} Hotspot{(tile.hotspots || []).length > 1 ? 's' : ''}</div>
      )}
    </div>
  );
}
