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
  var isShoppable = tile.type === 'shoppable_image';
  var isImageText = tile.type === 'image_text';

  // Use custom bgColor if provided, otherwise use a neutral placeholder
  var bgFill = bgColor || '#f5f5f5';

  // Determine text color contrast based on bg brightness
  var textFill = '#888';
  var dimsFill = '#bbb';
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
    }
  }

  return (
    <svg viewBox={'0 0 ' + w + ' ' + ht} style={{ width: '100%', display: 'block' }}>
      <rect width={w} height={ht} fill={bgFill} rx="2" />

      {/* Text overlay */}
      {text && (
        <text x={tile.textAlign === 'right' ? w * 0.94 : tile.textAlign === 'center' ? w * 0.5 : w * 0.06}
          y={ht * 0.42} fontSize={Math.min(11, w / 24)}
          fontWeight="700" fill={textFill} fontFamily="system-ui, sans-serif" opacity=".8"
          textAnchor={tile.textAlign === 'right' ? 'end' : tile.textAlign === 'center' ? 'middle' : 'start'}>
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
