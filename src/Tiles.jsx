import { LAYOUTS } from './constants';
import Wireframe from './Wireframe';

export function TileView({ tile, selected, onClick }) {
  const border = selected ? '2px solid #007EB9' : '1px solid #e5e5e5';

  if (tile.type === 'product_grid') {
    const asins = tile.asins || [];
    return (
      <div onClick={onClick} style={{ border, borderRadius: 4, background: '#fff', cursor: 'pointer', padding: 10, textAlign: 'center', minHeight: 60 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#888' }}>🛍️ Product Grid</div>
        <div style={{ fontSize: 11, color: '#555', margin: '2px 0' }}>{asins.length} ASINs</div>
        {asins.slice(0, 4).map((a, i) => <div key={i} style={{ fontSize: 9, color: '#aaa', fontFamily: 'monospace' }}>{a}</div>)}
        {asins.length > 4 && <div style={{ fontSize: 9, color: '#ccc' }}>+{asins.length - 4} more</div>}
      </div>
    );
  }

  if (tile.type === 'video') {
    return <div onClick={onClick} style={{ border, borderRadius: 4, background: '#1a1a2e', cursor: 'pointer', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.3)', fontSize: 28 }}>▶</div>;
  }

  if (tile.type === 'text') {
    return <div onClick={onClick} style={{ border, borderRadius: 4, background: '#fff', cursor: 'pointer', padding: 12, minHeight: 40 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#444' }}>{tile.textOverlay || '[Text]'}</div>
    </div>;
  }

  return (
    <div onClick={onClick} style={{ border, borderRadius: 4, overflow: 'hidden', cursor: 'pointer', background: '#fafafa', position: 'relative' }}>
      {tile.uploadedImage
        ? <img src={tile.uploadedImage} style={{ width: '100%', display: 'block' }} alt="" />
        : <Wireframe tile={tile} />}
    </div>
  );
}

export function SectionView({ section, idx, sel, onSelect }) {
  const layout = LAYOUTS.find(l => l.id === section.layoutId) || LAYOUTS[0];
  return (
    <div style={{ marginBottom: 6, background: '#fff', borderRadius: 4, padding: 2 }}>
      <div style={{ fontSize: 9, color: '#aaa', padding: '2px 8px', fontWeight: 600 }}>
        Section {idx + 1} · {layout.name}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: layout.cols, gap: 2 }}>
        {section.tiles.map((t, i) => (
          <TileView key={i} tile={t}
            selected={sel?.sid === section.id && sel?.ti === i}
            onClick={() => onSelect({ sid: section.id, ti: i })} />
        ))}
      </div>
    </div>
  );
}
