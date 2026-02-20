export default function PropertiesPanel({ tile, onChange }) {
  if (!tile) return <div style={{ padding: 24, textAlign: 'center', color: '#bbb', fontSize: 12 }}>Click a tile to edit</div>;

  const u = (k, v) => onChange({ ...tile, [k]: v });
  const ud = (k, v) => onChange({ ...tile, dimensions: { ...(tile.dimensions || {}), [k]: v } });

  const label = tile.type === 'product_grid' ? '🛍️ Product Grid'
    : tile.type === 'video' ? '🎥 Video'
    : tile.type === 'text' ? '📝 Text' : '🖼️ Image';

  return (
    <div style={{ padding: 10, fontSize: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{label}</div>

      {(tile.type === 'image' || tile.type === 'shoppable_image') && (
        <>
          <label className="label">Designer Brief (EN)</label>
          <textarea value={tile.brief || ''} onChange={e => u('brief', e.target.value)} rows={3} className="input" />

          <label className="label">Text Overlay (store language)</label>
          <input value={tile.textOverlay || ''} onChange={e => u('textOverlay', e.target.value)} className="input" />

          <label className="label">CTA Text</label>
          <input value={tile.ctaText || ''} onChange={e => u('ctaText', e.target.value)} className="input" />

          <label className="label">Dimensions</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input type="number" value={tile.dimensions?.w || 3000} onChange={e => ud('w', parseInt(e.target.value) || 3000)} className="input" style={{ width: '50%' }} />
            <input type="number" value={tile.dimensions?.h || 1200} onChange={e => ud('h', parseInt(e.target.value) || 1200)} className="input" style={{ width: '50%' }} />
          </div>

          <label className="label" style={{ marginTop: 8 }}>Upload Image</label>
          <input type="file" accept="image/*" style={{ fontSize: 11 }} onChange={e => {
            const f = e.target.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = ev => u('uploadedImage', ev.target.result);
            reader.readAsDataURL(f);
          }} />
        </>
      )}

      {tile.type === 'product_grid' && (
        <>
          <label className="label">ASINs (one per line)</label>
          <textarea value={(tile.asins || []).join('\n')} onChange={e => u('asins', e.target.value.split('\n').filter(Boolean))}
            rows={8} className="input" style={{ fontFamily: 'monospace', fontSize: 11 }} />
        </>
      )}

      {tile.type === 'text' && (
        <>
          <label className="label">Text</label>
          <textarea value={tile.textOverlay || ''} onChange={e => u('textOverlay', e.target.value)} rows={3} className="input" />
        </>
      )}

      {tile.type === 'video' && (
        <>
          <label className="label">Brief</label>
          <textarea value={tile.brief || ''} onChange={e => u('brief', e.target.value)} rows={3} className="input" />
        </>
      )}
    </div>
  );
}
