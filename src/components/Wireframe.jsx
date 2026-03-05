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
  var text = tile.textOverlay || '';
  var cta = tile.ctaText || '';
  var brief = tile.brief || '';
  var isShoppable = tile.type === 'shoppable_image';
  var isImageText = tile.type === 'image_text';

  // Detect if brief suggests a product image
  var briefLower = (brief || '').toLowerCase();
  var isProductHint = briefLower.indexOf('product') >= 0 || briefLower.indexOf('produkt') >= 0 ||
    briefLower.indexOf('packshot') >= 0 || briefLower.indexOf('bottle') >= 0 ||
    briefLower.indexOf('flasche') >= 0 || briefLower.indexOf('bundle') >= 0;
  var isLifestyleHint = briefLower.indexOf('lifestyle') >= 0 || briefLower.indexOf('person') >= 0 ||
    briefLower.indexOf('use') >= 0 || briefLower.indexOf('action') >= 0;

  // Use custom bgColor if provided, otherwise detect from content
  var bgFill = bgColor || '#f0f0f0';
  var crossColor = '#e0e0e0';
  if (!bgColor) {
    if (isShoppable) { bgFill = '#f5f0e8'; crossColor = '#e8dcc8'; }
    else if (isLifestyleHint) { bgFill = '#eef2f0'; crossColor = '#d8e0dc'; }
    else if (isProductHint) { bgFill = '#f0f0f5'; crossColor = '#dcdce8'; }
  } else {
    // Lighten cross color relative to bgColor
    crossColor = 'rgba(0,0,0,0.06)';
  }

  // Determine text color contrast based on bg brightness
  var textFill = '#444';
  var dimsFill = '#bbb';
  var briefFill = '#999';
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
      briefFill = 'rgba(255,255,255,.5)';
      crossColor = 'rgba(255,255,255,0.08)';
    }
  }

  return (
    <svg viewBox={'0 0 ' + w + ' ' + ht} style={{ width: '100%', display: 'block' }}>
      <rect width={w} height={ht} fill={bgFill} rx="2" />

      {/* Cross lines for empty/image wireframe feel */}
      <line x1="0" y1="0" x2={w} y2={ht} stroke={crossColor} strokeWidth=".4" />
      <line x1={w} y1="0" x2="0" y2={ht} stroke={crossColor} strokeWidth=".4" />

      {/* Product silhouette hint */}
      {isProductHint && !text && (
        <g opacity=".12">
          <rect x={w * 0.35} y={ht * 0.15} width={w * 0.3} height={ht * 0.5} rx="4" fill="#667085" />
          <rect x={w * 0.4} y={ht * 0.7} width={w * 0.2} height={ht * 0.08} rx="2" fill="#667085" />
        </g>
      )}

      {/* Lifestyle silhouette hint */}
      {isLifestyleHint && !text && (
        <g opacity=".1">
          <circle cx={w * 0.5} cy={ht * 0.32} r={ht * 0.12} fill="#667085" />
          <ellipse cx={w * 0.5} cy={ht * 0.6} rx={ht * 0.15} ry={ht * 0.2} fill="#667085" />
        </g>
      )}

      {/* Shoppable indicator dots */}
      {isShoppable && (
        <g>
          <circle cx={w * 0.3} cy={ht * 0.4} r="4" fill="#FF9900" opacity=".5" />
          <circle cx={w * 0.3} cy={ht * 0.4} r="2" fill="#fff" opacity=".8" />
          <circle cx={w * 0.65} cy={ht * 0.55} r="4" fill="#FF9900" opacity=".5" />
          <circle cx={w * 0.65} cy={ht * 0.55} r="2" fill="#fff" opacity=".8" />
          {ht > 60 && (
            <>
              <circle cx={w * 0.5} cy={ht * 0.3} r="4" fill="#FF9900" opacity=".5" />
              <circle cx={w * 0.5} cy={ht * 0.3} r="2" fill="#fff" opacity=".8" />
            </>
          )}
        </g>
      )}

      {/* Brief hint area */}
      {brief && !isProductHint && !isLifestyleHint && (
        <rect x={w * 0.08} y={ht * 0.12} width={w * 0.84} height={ht * 0.35}
          rx="2" fill="#e8e8e8" opacity=".3" />
      )}

      {/* Text overlay */}
      {text && (
        <text x={w * 0.06} y={ht * 0.42} fontSize={Math.min(11, w / 24)}
          fontWeight="700" fill={textFill} fontFamily="system-ui, sans-serif" opacity=".8">
          {text.length > 45 ? text.slice(0, 42) + '...' : text}
        </text>
      )}

      {/* CTA button */}
      {cta && (
        <>
          <rect x={w * 0.06} y={ht * 0.58}
            width={Math.min(cta.length * 5.5 + 16, w * 0.5)} height={14}
            rx={7} fill="#666" opacity=".5" />
          <text x={w * 0.06 + 8} y={ht * 0.58 + 10} fontSize="6.5"
            fill="#fff" fontFamily="system-ui, sans-serif" fontWeight="600">{cta}</text>
        </>
      )}

      {/* Brief text (shown when no overlay text and no silhouette) */}
      {!text && !isProductHint && !isLifestyleHint && brief && (
        <text x={w / 2} y={ht / 2 + 3} fontSize="6.5" fill={briefFill}
          textAnchor="middle" fontFamily="system-ui, sans-serif" fontStyle="italic">
          {brief.length > 60 ? brief.slice(0, 57) + '...' : brief}
        </text>
      )}

      {/* Brief text below silhouette for product/lifestyle hints */}
      {!text && (isProductHint || isLifestyleHint) && brief && (
        <text x={w / 2} y={ht * 0.88} fontSize="5.5" fill={briefFill}
          textAnchor="middle" fontFamily="system-ui, sans-serif" fontStyle="italic">
          {brief.length > 50 ? brief.slice(0, 47) + '...' : brief}
        </text>
      )}

      {/* Type badge */}
      {(isShoppable || isImageText) && (
        <g>
          <rect x="3" y={ht - 13} width={isShoppable ? 42 : 34} height="10" rx="2"
            fill={isShoppable ? '#FF9900' : '#667EEA'} opacity=".7" />
          <text x="5" y={ht - 5} fontSize="5.5" fill="#fff" fontWeight="700"
            fontFamily="system-ui, sans-serif">
            {isShoppable ? 'SHOPPABLE' : 'IMG+TXT'}
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
