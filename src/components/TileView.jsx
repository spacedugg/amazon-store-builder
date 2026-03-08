import { PRODUCT_TILE_TYPES, TILE_TYPE_LABELS } from '../constants';
import { t } from '../i18n';
import Wireframe from './Wireframe';

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
          <div className="tile-text-content" style={{ textAlign: tile.textAlign || 'left' }}>{tile.textOverlay || t('tile.textModule', uiLang)}</div>
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
          : <Wireframe tile={tile} viewMode={viewMode} bgColor={bgColor} />
        }
        {tile.textOverlay && <div className="tile-it-text" style={{ textAlign: tile.textAlign || 'left' }}>{tile.textOverlay}</div>}
      </div>
    );
  }

  // image or shoppable_image
  var imgSrc = (viewMode === 'mobile' ? tile.uploadedImageMobile : tile.uploadedImage) || tile.uploadedImage;
  return (
    <div className={cls} onClick={onClick} style={bgColor ? { background: bgColor } : undefined}>
      {imgSrc
        ? <img src={imgSrc} className="tile-uploaded-img" alt="" />
        : <Wireframe tile={tile} viewMode={viewMode} bgColor={bgColor} />
      }
      {tile.type === 'shoppable_image' && <div className="tile-shoppable-badge">{t('tile.shoppable', uiLang)}</div>}
      {tile.linkAsin && <div className="tile-link-badge">ASIN: {tile.linkAsin}</div>}
    </div>
  );
}
