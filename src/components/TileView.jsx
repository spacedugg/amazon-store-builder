import Wireframe from './Wireframe';

export default function TileView({ tile, selected, onClick }) {
  var cls = 'tile' + (selected ? ' tile-selected' : '');

  if (tile.type === 'product_grid') {
    var asins = tile.asins || [];
    return (
      <div className={cls} onClick={onClick}>
        <div className="tile-product-grid">
          <div className="tile-pg-icon">&#x1F6CD;&#xFE0F;</div>
          <div className="tile-pg-label">Product Grid</div>
          <div className="tile-pg-count">{asins.length} ASINs</div>
          <div className="tile-pg-asins">
            {asins.slice(0, 4).map(function(a, i) {
              return <div key={i} className="tile-pg-asin">{a}</div>;
            })}
            {asins.length > 4 && <div className="tile-pg-more">+{asins.length - 4} more</div>}
          </div>
        </div>
      </div>
    );
  }

  if (tile.type === 'video') {
    return (
      <div className={cls} onClick={onClick}>
        <div className="tile-video">
          <span className="tile-video-play">&#9654;</span>
          <div className="tile-video-label">Video</div>
        </div>
      </div>
    );
  }

  if (tile.type === 'text') {
    return (
      <div className={cls} onClick={onClick}>
        <div className="tile-text-native">
          <div className="tile-text-content">{tile.textOverlay || '[Text Module]'}</div>
        </div>
      </div>
    );
  }

  // image or shoppable_image
  return (
    <div className={cls} onClick={onClick}>
      {tile.uploadedImage
        ? <img src={tile.uploadedImage} className="tile-uploaded-img" alt="" />
        : <Wireframe tile={tile} />
      }
      {tile.type === 'shoppable_image' && (
        <div className="tile-shoppable-badge">Shoppable</div>
      )}
    </div>
  );
}
