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

// Wraps a single line to roughly fit into maxChars by breaking at the last
// whitespace before the limit. Long unbroken tokens are hard wrapped.
function wrapLine(line, maxChars) {
  if (!line) return [''];
  if (line.length <= maxChars) return [line];
  var words = line.split(' ');
  var out = [];
  var cur = '';
  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    if (word.length > maxChars) {
      if (cur) { out.push(cur); cur = ''; }
      while (word.length > maxChars) {
        out.push(word.slice(0, maxChars));
        word = word.slice(maxChars);
      }
      cur = word;
      continue;
    }
    var candidate = cur ? cur + ' ' + word : word;
    if (candidate.length > maxChars) {
      out.push(cur);
      cur = word;
    } else {
      cur = candidate;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// Splits text on hard line breaks first, then soft wraps each line. Truncates
// the result to maxLines and appends an ellipsis on the last line if more
// content was clipped.
function layoutLines(text, maxChars, maxLines) {
  if (!text) return [];
  var hard = String(text).split(/\r?\n/);
  var lines = [];
  for (var i = 0; i < hard.length && lines.length < maxLines; i++) {
    var wrapped = wrapLine(hard[i], maxChars);
    for (var j = 0; j < wrapped.length && lines.length < maxLines; j++) {
      lines.push(wrapped[j]);
    }
  }
  // Indicate truncation only if there is still content we did not render
  var totalWrapped = 0;
  for (var k = 0; k < hard.length; k++) {
    totalWrapped += wrapLine(hard[k], maxChars).length;
  }
  if (totalWrapped > maxLines && lines.length > 0) {
    var last = lines[lines.length - 1];
    if (last.length > maxChars - 1) last = last.slice(0, maxChars - 1);
    lines[lines.length - 1] = last + '…';
  }
  return lines;
}

// Renders a parsed heading line as tspans, mapping **WORD** to a green span.
function renderHeadingLine(line, key) {
  var parts = String(line || '').split(/(\*\*[^*]+\*\*)/g);
  return parts.map(function(p, i) {
    if (p.length > 4 && p.slice(0, 2) === '**' && p.slice(-2) === '**') {
      return <tspan key={key + '_' + i} fill="#93bd26">{p.slice(2, -2)}</tspan>;
    }
    return <tspan key={key + '_' + i}>{p}</tspan>;
  });
}

export default function Wireframe({ tile, width, viewMode, bgColor }) {
  var dims = (viewMode === 'mobile' ? tile.mobileDimensions : tile.dimensions) || tile.dimensions || { w: 3000, h: 1200 };
  var w = width || 280;
  var ht = Math.max(30, Math.round(w / (dims.w / dims.h)));
  var ov = (tile.textOverlay && typeof tile.textOverlay === 'object') ? tile.textOverlay : {};
  var rawHeading = ov.heading || '';
  var cta = ov.cta || '';
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

  // Text Layout: alle Texte stapeln (Heading mehrzeilig, Subheading,
  // Body, Bullets, CTA). Höhen pro Block werden dynamisch reserviert.
  var headingFontSize = Math.min(11, w / 24);
  var subFontSize = Math.max(6.5, headingFontSize * 0.72);
  var bodyFontSize = Math.max(5.5, headingFontSize * 0.6);
  var bulletFontSize = bodyFontSize;
  var maxCharsHeading = Math.max(14, Math.floor(w / (headingFontSize * 0.55)));
  var maxCharsSub = Math.max(18, Math.floor(w / (subFontSize * 0.5)));
  var maxCharsBody = Math.max(22, Math.floor(w / (bodyFontSize * 0.48)));

  // Vertikales Budget: oberhalb des CTA Bereichs (ht * 0.55) bzw bis zur
  // Badge Zone (ht - 14). Wenn kein CTA vorhanden, das ganze Tile bis
  // Badge Zone nutzen.
  var bottomReserve = (cta ? ht * 0.42 : 14);
  var available = Math.max(20, ht - 4 - bottomReserve);
  var headingLineH = headingFontSize * 1.15;
  var subLineH = subFontSize * 1.2;
  var bodyLineH = bodyFontSize * 1.25;
  var bulletLineH = bulletFontSize * 1.25;

  // Reserviere maximal so viele Zeilen wie reinpassen, Heading hat Vorrang
  var maxHeadingLines = Math.max(1, Math.min(4, Math.floor(available / headingLineH)));
  var headingLines = layoutLines(rawHeading, maxCharsHeading, maxHeadingLines);
  var usedH = headingLines.length * headingLineH;

  var subLines = [];
  if (ov.subheading) {
    var roomSub = Math.max(0, available - usedH);
    var maxSubLines = Math.max(0, Math.min(3, Math.floor(roomSub / subLineH)));
    if (maxSubLines > 0) subLines = layoutLines(ov.subheading, maxCharsSub, maxSubLines);
    usedH += subLines.length * subLineH;
  }

  var bodyLines = [];
  if (ov.body) {
    var roomBody = Math.max(0, available - usedH);
    var maxBodyLines = Math.max(0, Math.min(3, Math.floor(roomBody / bodyLineH)));
    if (maxBodyLines > 0) bodyLines = layoutLines(ov.body, maxCharsBody, maxBodyLines);
    usedH += bodyLines.length * bodyLineH;
  }

  var bulletLines = [];
  var bullets = (ov.bullets || []).filter(function(b) { return b && String(b).trim(); });
  if (bullets.length > 0) {
    var roomBullets = Math.max(0, available - usedH);
    var maxBulletLines = Math.max(0, Math.min(bullets.length, Math.floor(roomBullets / bulletLineH)));
    for (var bi = 0; bi < maxBulletLines; bi++) {
      var bLine = layoutLines(bullets[bi], maxCharsBody - 2, 1)[0] || '';
      bulletLines.push(bLine);
    }
    usedH += bulletLines.length * bulletLineH;
  }

  var totalTextH = usedH;
  var startY = Math.max(headingFontSize + 2, (ht - bottomReserve - totalTextH) / 2 + headingFontSize);
  var leftX = w * 0.06;
  var centerX = w * 0.5;
  var rightX = w * 0.94;
  var anchor = tile.textAlign === 'right' ? 'end' : tile.textAlign === 'center' ? 'middle' : 'start';
  var anchorX = tile.textAlign === 'right' ? rightX : tile.textAlign === 'center' ? centerX : leftX;

  return (
    <svg viewBox={'0 0 ' + w + ' ' + ht} style={{ width: '100%', display: 'block' }}>
      <rect width={w} height={ht} fill={bgFill} rx="2" />

      {/* Heading, mehrzeilig mit **WORT** Highlight */}
      {headingLines.length > 0 && (
        <text x={anchorX} y={startY} fontSize={headingFontSize}
          fontWeight="700" fill={textFill} fontFamily="system-ui, sans-serif" opacity=".85"
          textAnchor={anchor}>
          {headingLines.map(function(line, li) {
            return (
              <tspan key={'h' + li} x={anchorX} dy={li === 0 ? 0 : headingLineH}>
                {renderHeadingLine(line, 'h' + li)}
              </tspan>
            );
          })}
        </text>
      )}

      {/* Subheading */}
      {subLines.length > 0 && (
        <text x={anchorX} y={startY + headingLines.length * headingLineH + (subFontSize * 0.2)}
          fontSize={subFontSize} fontWeight="500" fill={textFill}
          fontFamily="system-ui, sans-serif" opacity=".75" textAnchor={anchor}>
          {subLines.map(function(line, li) {
            return <tspan key={'s' + li} x={anchorX} dy={li === 0 ? 0 : subLineH}>{line}</tspan>;
          })}
        </text>
      )}

      {/* Body */}
      {bodyLines.length > 0 && (
        <text x={anchorX} y={startY + headingLines.length * headingLineH + subLines.length * subLineH + (subLines.length > 0 ? subFontSize * 0.3 : bodyFontSize * 0.4)}
          fontSize={bodyFontSize} fill={textFill}
          fontFamily="system-ui, sans-serif" opacity=".7" textAnchor={anchor}>
          {bodyLines.map(function(line, li) {
            return <tspan key={'b' + li} x={anchorX} dy={li === 0 ? 0 : bodyLineH}>{line}</tspan>;
          })}
        </text>
      )}

      {/* Bullets */}
      {bulletLines.length > 0 && (
        <text x={anchorX} y={startY + headingLines.length * headingLineH + subLines.length * subLineH + bodyLines.length * bodyLineH + bulletFontSize * 0.6}
          fontSize={bulletFontSize} fill={textFill}
          fontFamily="system-ui, sans-serif" opacity=".75" textAnchor={anchor}>
          {bulletLines.map(function(line, li) {
            return <tspan key={'bu' + li} x={anchorX} dy={li === 0 ? 0 : bulletLineH}>{'• ' + line}</tspan>;
          })}
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
