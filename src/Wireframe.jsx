export default function Wireframe({ tile, width = 280 }) {
  const dims = tile.dimensions || { w: 3000, h: 1200 };
  const w = width;
  const ht = Math.max(30, Math.round(w / (dims.w / dims.h)));
  const text = tile.textOverlay || '';
  const cta = tile.ctaText || '';
  const brief = tile.brief || '';

  return (
    <svg viewBox={`0 0 ${w} ${ht}`} style={{ width: '100%', display: 'block' }}>
      <rect width={w} height={ht} fill="#f0f0f0" rx="2" />
      <line x1="0" y1="0" x2={w} y2={ht} stroke="#e5e5e5" strokeWidth=".4" />
      <line x1={w} y1="0" x2="0" y2={ht} stroke="#e5e5e5" strokeWidth=".4" />
      {text && (
        <text x={w * 0.06} y={ht * 0.45} fontSize={Math.min(10, w / 26)}
          fontWeight="700" fill="#555" fontFamily="system-ui" opacity=".7">
          {text.length > 40 ? text.slice(0, 37) + '…' : text}
        </text>
      )}
      {cta && (
        <>
          <rect x={w * 0.06} y={ht * 0.6} width={Math.min(cta.length * 5 + 14, w * 0.45)}
            height={13} rx={6.5} fill="#888" opacity=".4" />
          <text x={w * 0.06 + 7} y={ht * 0.6 + 9.5} fontSize="6" fill="#fff"
            fontFamily="system-ui" fontWeight="600">{cta}</text>
        </>
      )}
      {!text && brief && (
        <text x={w / 2} y={ht / 2 + 2} fontSize="6.5" fill="#bbb"
          textAnchor="middle" fontFamily="system-ui" fontStyle="italic">
          {brief.length > 55 ? brief.slice(0, 52) + '…' : brief}
        </text>
      )}
      <text x={w - 3} y={9} fontSize="5" fill="#ccc" textAnchor="end" fontFamily="monospace">
        {dims.w}×{dims.h}
      </text>
    </svg>
  );
}
