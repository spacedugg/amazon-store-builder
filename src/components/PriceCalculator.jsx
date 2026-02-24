import { useState } from 'react';
import { PRICING, countStoreAssets } from '../constants';
import { t } from '../i18n';

export default function PriceCalculator({ store, onClose, uiLang }) {
  var [password, setPassword] = useState('');
  var [unlocked, setUnlocked] = useState(false);
  var [error, setError] = useState('');

  var handleUnlock = function() {
    if (password === PRICING.password) {
      setUnlocked(true);
      setError('');
    } else {
      setError(t('price.wrongPassword', uiLang));
      setTimeout(function() {
        setError('');
        onClose();
      }, 1500);
    }
  };

  var assets = countStoreAssets(store);
  var imageTotal = assets.images * PRICING.imagePrice;
  var videoTotal = assets.videos * PRICING.videoPrice;
  var grandTotal = PRICING.baseSetupFee + imageTotal + videoTotal;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 400 }}>
        <div className="modal-title">{t('price.title', uiLang)}</div>

        {!unlocked ? (
          <div>
            <label className="label">{t('price.enterPassword', uiLang)}</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input
                type="password"
                className="input"
                value={password}
                onChange={function(e) { setPassword(e.target.value); }}
                onKeyDown={function(e) { if (e.key === 'Enter') handleUnlock(); }}
                placeholder="********"
                autoFocus
              />
              <button className="btn btn-primary" onClick={handleUnlock}>{t('price.unlock', uiLang)}</button>
            </div>
            {error && <div className="price-error">{error}</div>}
          </div>
        ) : (
          <div className="price-breakdown">
            <div className="price-row">
              <span className="price-label">{t('price.totalImages', uiLang)}</span>
              <span className="price-value">{assets.images}</span>
            </div>
            <div className="price-row">
              <span className="price-label">{t('price.totalVideos', uiLang)}</span>
              <span className="price-value">{assets.videos}</span>
            </div>
            <div className="price-divider" />
            <div className="price-row price-row-detail">
              <span className="price-label">Setup</span>
              <span className="price-value">{PRICING.baseSetupFee} {PRICING.currency}</span>
            </div>
            <div className="price-row price-row-detail">
              <span className="price-label">{assets.images} x {PRICING.imagePrice} {PRICING.currency}</span>
              <span className="price-value">{imageTotal} {PRICING.currency}</span>
            </div>
            {assets.videos > 0 && (
              <div className="price-row price-row-detail">
                <span className="price-label">{assets.videos} x {PRICING.videoPrice} {PRICING.currency} (Video)</span>
                <span className="price-value">{videoTotal} {PRICING.currency}</span>
              </div>
            )}
            <div className="price-divider" />
            <div className="price-row price-total">
              <span className="price-label">{t('price.estimatedTotal', uiLang)}</span>
              <span className="price-value">{grandTotal} {PRICING.currency}</span>
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>{t('price.close', uiLang)}</button>
        </div>
      </div>
    </div>
  );
}
