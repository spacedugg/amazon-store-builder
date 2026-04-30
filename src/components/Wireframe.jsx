var CATEGORY_BADGE_COLORS = {
  store_hero: '#8B5CF6',
  benefit: '#10B981',
  product: '#3B82F6',
  creative: '#F59E0B',
  lifestyle: '#EC4899',
  text_image: '#6B7280',
};
var CATEGORY_BADGE_LABELS = {
  store_hero: 'HERO',
  benefit: 'BENEFIT',
  product: 'PRODUCT',
  creative: 'CREATIVE',
  lifestyle: 'LIFESTYLE',
  text_image: 'TEXT IMG',
};

export default function Wireframe({ tile, width, viewMode, bgColor }) {
  var dims = (viewMode === 'mobile' ? tile.mobileDimensions : tile.dimensions) || tile.dimensions || { w: 3000, h: 1200 };
  var w = width || 280;
  var ht = Math.max(30, Math.round(w / (dims.w / dims.h)));
  var ov = (tile.textOverlay && typeof tile.textOverlay === 'object') ? tile.textOverlay : {};
  var heading = (ov.heading || '').replace(/\*\*([^*]+)\*\*/g, '$1');
  var subheading = ov.subheading || '';
  var body = ov.body || '';
  var bullets = Array.isArray(ov.bullets) ? ov.bullets.filter(Boolean) : [];
  var cta = ov.cta || '';
  var hasAnyText = heading || subheading || body || bullets.length > 0 || cta;
  var isShoppable = tile.type === 'shoppable_image';
  var isImageText = tile.type === 'image_text';

  // Use custom bgColor if provided, otherwise use a neutral placeholder
  var bgFill = bgColor || '#f5f5f5';

  // Determine text color contrast based on bg brightness
  var textFill = '#888';
  var dimsFill = '#bbb';
  var darkBg = false;
  if (bgColor) {
    var hex = bgColor.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    var r = parseInt(hex.slice(0,2), 16) || 0;
    var g = parseInt(hex.slice(2,4), 16) || 0;
    var b = parseInt(hex.slice(4,6), 16) || 0;
    var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (luminance < 0.5) {
      textFill = '#e0e0e0';
      dimsFill = 'rgba(255,255,255,.4)';
      darkBg = true;
    }
  }

  // Text Wireframe innerhalb des Bildbereichs. Heading, Subheading, Body, Bullets,
  // CTA werden alle als gedämpfte Skizze gezeigt damit der Designer sieht welche
  // Texte ins Bild müssen. Bewusst grau und ohne grünen Button damit das nicht
  // wie ein fertiges UI Mockup aussieht.
  var textAlign = tile.textAlign || 'left';
  var hSize = Math.min(13, w / 18);
  var subSize = Math.min(9.5, w / 26);
  var bodySize = Math.min(7.5, w / 32);
  var ctaSize = Math.min(7, w / 36);
  var pad = Math.max(6, w * 0.04);
  var ctaOpacity = 0.55;
  var ctaBg = darkBg ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.35)';
  var ctaText = darkBg ? '#1f2937' : '#fff';

  return (
    <svg viewBox={'0 0 ' + w + ' ' + ht} style={{ width: '100%', display: 'block' }}>
      <rect width={w} height={ht} fill={bgFill} rx="2" />

      {/* Text Wireframe Skizze (Heading, Subheading, Body, Bullets, CTA) */}
      {hasAnyText && (
        <foreignObject x={pad} y={pad} width={Math.max(10, w - pad * 2)} height={Math.max(10, ht - pad * 2 - 10)}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            color: textFill, opacity: 0.9,
            fontFamily: 'system-ui, sans-serif',
            textAlign: textAlign,
            overflow: 'hidden',
          }}>
            <div style={{ overflow: 'hidden' }}>
              {heading && (
                <div style={{ fontSize: hSize, fontWeight: 700, lineHeight: 1.15, marginBottom: 2, opacity: 0.9 }}>
                  {heading}
                </div>
              )}
              {subheading && (
                <div style={{ fontSize: subSize, fontWeight: 500, lineHeight: 1.2, marginBottom: 3, opacity: 0.7 }}>
                  {subheading}
                </div>
              )}
              {body && (
                <div style={{ fontSize: bodySize, fontWeight: 400, lineHeight: 1.3, opacity: 0.6, marginBottom: 3 }}>
                  {body}
                </div>
              )}
              {bullets.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: bodySize * 1.6, fontSize: bodySize, opacity: 0.65, lineHeight: 1.3 }}>
                  {bullets.map(function(bl, i) { return <li key={i}>{bl}</li>; })}
                </ul>
              )}
            </div>
            {cta && (
              <div style={{ display: 'flex', justifyContent: textAlign === 'right' ? 'flex-end' : textAlign === 'center' ? 'center' : 'flex-start' }}>
                <span style={{
                  display: 'inline-block',
                  padding: (ctaSize * 0.4) + 'px ' + (ctaSize * 1.2) + 'px',
                  background: ctaBg, color: ctaText, fontSize: ctaSize, fontWeight: 600,
                  borderRadius: ctaSize * 0.5, opacity: ctaOpacity, lineHeight: 1.2,
                }}>{cta}</span>
              </div>
            )}
          </div>
        </foreignObject>
      )}

      {/* Type badge — only for image_text (shoppable is shown via imageCategory badge + hotspot dots) */}
      {isImageText && (
        <g>
          <rect x="3" y={ht - 13} width={34} height="10" rx="2"
            fill="#667EEA" opacity=".7" />
          <text x="5" y={ht - 5} fontSize="5.5" fill="#fff" fontWeight="700"
            fontFamily="system-ui, sans-serif">
            IMG+TXT
          </text>
        </g>
      )}
      {/* Shoppable indicator: small tag top-right so the tile type is still clear */}
      {isShoppable && (
        <g>
          <rect x={w - 38} y="2" width="36" height="9" rx="2" fill="#FF9900" opacity=".85" />
          <text x={w - 36} y="9" fontSize="5" fill="#fff" fontWeight="700" fontFamily="system-ui, sans-serif">Shoppable</text>
        </g>
      )}

      {/* Hotspot dots for shoppable_image */}
      {isShoppable && (tile.hotspots || []).length > 0 && (tile.hotspots || []).map(function(hs, i) {
        var cx = (hs.x || 0) / 100 * w;
        var cy = (hs.y || 0) / 100 * ht;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={5} fill="#111827" opacity=".7" />
            <circle cx={cx} cy={cy} r={3.5} fill="#111827" opacity=".9" />
            <circle cx={cx} cy={cy} r={1.8} fill="#fff" />
          </g>
        );
      })}

      {/* Linked ASIN badge bottom-left (non-overlapping with imageCategory badge at bottom-right) */}
      {tile.linkAsin && (
        <g>
          <rect x="3" y={ht - 13} width={Math.min(tile.linkAsin.length * 3.5 + 20, w * 0.45)} height="10" rx="2" fill="#F59E0B" opacity=".7" />
          <text x="5" y={ht - 5} fontSize="4.5" fill="#fff" fontWeight="600" fontFamily="monospace">
            {'ASIN: ' + tile.linkAsin}
          </text>
        </g>
      )}

      {/* Image category badge */}
      {tile.imageCategory && CATEGORY_BADGE_COLORS[tile.imageCategory] && (
        <g>
          <rect x={w - (CATEGORY_BADGE_LABELS[tile.imageCategory].length * 4.2 + 10)} y={ht - 13}
            width={CATEGORY_BADGE_LABELS[tile.imageCategory].length * 4.2 + 8} height="10" rx="2"
            fill={CATEGORY_BADGE_COLORS[tile.imageCategory]} opacity=".75" />
          <text x={w - (CATEGORY_BADGE_LABELS[tile.imageCategory].length * 4.2 + 6)} y={ht - 5}
            fontSize="5.5" fill="#fff" fontWeight="700" fontFamily="system-ui, sans-serif">
            {CATEGORY_BADGE_LABELS[tile.imageCategory]}
          </text>
        </g>
      )}

      {/* Dimensions label */}
      <text x={w - 4} y={10} fontSize="5" fill={dimsFill} textAnchor="end" fontFamily="monospace">
        {dims.w}&times;{dims.h}
      </text>

      {/* Device indicator */}
      {viewMode === 'mobile' && (
        <text x={4} y={10} fontSize="5" fill="#007EB9" fontFamily="monospace">M</text>
      )}

      {/* Color indicator */}
      {bgColor && (
        <g>
          <rect x="3" y="3" width="6" height="6" rx="1" fill={bgColor} stroke="rgba(0,0,0,.2)" strokeWidth=".3" />
        </g>
      )}
    </svg>
  );
}
