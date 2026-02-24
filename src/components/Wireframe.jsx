export default function Wireframe({ tile, width, viewMode }) {
  var dims = (viewMode === 'mobile' ? tile.mobileDimensions : tile.dimensions) || tile.dimensions || { w: 3000, h: 1200 };
  var w = width || 280;
  var ht = Math.max(30, Math.round(w / (dims.w / dims.h)));
  var text = tile.textOverlay || '';
  var cta = tile.ctaText || '';
  var brief = tile.brief || '';

  return (
    <svg viewBox={'0 0 ' + w + ' ' + ht} style={{ width: '100%', display: 'block' }}>
      <rect width={w} height={ht} fill="#f0f0f0" rx="2" />
      <line x1="0" y1="0" x2={w} y2={ht} stroke="#e0e0e0" strokeWidth=".4" />
      <line x1={w} y1="0" x2="0" y2={ht} stroke="#e0e0e0" strokeWidth=".4" />

      {/* Brief hint area — subtle background to suggest content zone */}
      {brief && (
        <rect x={w * 0.08} y={ht * 0.12} width={w * 0.84} height={ht * 0.35}
          rx="2" fill="#e8e8e8" opacity=".4" />
      )}

      {/* Text overlay */}
      {text && (
        <text x={w * 0.06} y={ht * 0.42} fontSize={Math.min(11, w / 24)}
          fontWeight="700" fill="#444" fontFamily="system-ui, sans-serif" opacity=".8">
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

      {/* Brief text (shown when no overlay) */}
      {!text && brief && (
        <text x={w / 2} y={ht / 2 + 3} fontSize="6.5" fill="#999"
          textAnchor="middle" fontFamily="system-ui, sans-serif" fontStyle="italic">
          {brief.length > 60 ? brief.slice(0, 57) + '...' : brief}
        </text>
      )}

      {/* Dimensions label */}
      <text x={w - 4} y={10} fontSize="5" fill="#bbb" textAnchor="end" fontFamily="monospace">
        {dims.w}&times;{dims.h}
      </text>

      {/* Device indicator */}
      {viewMode === 'mobile' && (
        <text x={4} y={10} fontSize="5" fill="#007EB9" fontFamily="monospace">M</text>
      )}
    </svg>
  );
}
