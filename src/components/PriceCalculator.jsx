import { useState, useEffect } from 'react';
import { PRICING, countStoreAssets } from '../constants';
import { fetchDesignerTimer } from '../storage';
import { t } from '../i18n';

export default function PriceCalculator({ store, shareToken, onClose, uiLang }) {
  var [password, setPassword] = useState('');
  var [unlocked, setUnlocked] = useState(false);
  var [error, setError] = useState('');
  var [timerSeconds, setTimerSeconds] = useState(0);
  var [timerLoading, setTimerLoading] = useState(false);

  // Editierbare Preise. Initial aus den Defaults in PRICING, lokal
  // anpassbar und in localStorage gemerkt, damit die Einstellung über
  // Sitzungen hinweg erhalten bleibt.
  var loadOverrides = function() {
    try {
      var raw = window.localStorage.getItem('tps_pricing_overrides');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  };
  var overrides = loadOverrides();
  var [setupFee, setSetupFee] = useState(overrides.baseSetupFee != null ? overrides.baseSetupFee : PRICING.baseSetupFee);
  var [imagePrice, setImagePrice] = useState(overrides.imagePrice != null ? overrides.imagePrice : PRICING.imagePrice);
  var [videoPrice, setVideoPrice] = useState(overrides.videoPrice != null ? overrides.videoPrice : PRICING.videoPrice);

  // Persist price overrides whenever they change.
  useEffect(function() {
    try {
      window.localStorage.setItem('tps_pricing_overrides', JSON.stringify({
        baseSetupFee: setupFee, imagePrice: imagePrice, videoPrice: videoPrice,
      }));
    } catch (e) {}
  }, [setupFee, imagePrice, videoPrice]);

  function numOr(v, fallback) {
    var n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  var handleUnlock = function() {
    if (password === PRICING.password) {
      setUnlocked(true);
      setError('');
      // Fetch timer when unlocked
      if (shareToken) {
        setTimerLoading(true);
        fetchDesignerTimer(shareToken).then(function(data) {
          setTimerSeconds(data.seconds || 0);
          setTimerLoading(false);
        });
      }
    } else {
      setError(t('price.wrongPassword', uiLang));
      setTimeout(function() {
        setError('');
        onClose();
      }, 1500);
    }
  };

  // Refresh timer every 30s while unlocked
  useEffect(function() {
    if (!unlocked || !shareToken) return;
    var interval = setInterval(function() {
      fetchDesignerTimer(shareToken).then(function(data) {
        setTimerSeconds(data.seconds || 0);
      });
    }, 30000);
    return function() { clearInterval(interval); };
  }, [unlocked, shareToken]);

  var assets = countStoreAssets(store);

  // Selling price calculation — auf Basis unika Bilder, nicht jeder Bildplatz
  var imageTotal = assets.images * imagePrice;
  var videoTotal = assets.videos * videoPrice;
  var sellingPrice = setupFee + imageTotal + videoTotal;

  // Designer time cost (USD $14/hr → EUR)
  var designerHours = timerSeconds / 3600;
  var designerCostUsd = designerHours * PRICING.designerHourlyUsd;
  var designerCostEur = designerCostUsd * PRICING.usdToEur;
  var hourlyEur = PRICING.designerHourlyUsd * PRICING.usdToEur;

  // Internal cost = designer time only
  var totalInternalCost = designerCostEur;

  // Margin
  var margin = sellingPrice - totalInternalCost;
  var marginPct = sellingPrice > 0 ? Math.round((margin / sellingPrice) * 100) : 0;

  function formatTime(s) {
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function formatEur(n) {
    return n.toFixed(2).replace('.', ',') + ' EUR';
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 480 }}>
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
            {/* Asset overview — unika Bilder sind die Abrechnungsgrundlage */}
            <div className="price-row">
              <span className="price-label">Unika Bilder (abgerechnet)</span>
              <span className="price-value">{assets.images}</span>
            </div>
            <div className="price-row price-row-detail">
              <span className="price-label" style={{ color: '#64748b' }}>Bildplätze gesamt</span>
              <span className="price-value" style={{ color: '#64748b' }}>{assets.imagePlacements}</span>
            </div>
            {assets.reusedSaved > 0 && (
              <div className="price-row price-row-detail">
                <span className="price-label" style={{ color: '#16a34a' }}>Durch Wiederverwendung gespart</span>
                <span className="price-value" style={{ color: '#16a34a' }}>{assets.reusedSaved} Plätze</span>
              </div>
            )}
            <div className="price-row">
              <span className="price-label">{t('price.totalVideos', uiLang)}</span>
              <span className="price-value">{assets.videos}</span>
            </div>

            {/* Editierbare Preise */}
            <div className="price-divider" />
            <div className="price-section-header">Preise anpassen</div>
            <div className="price-row price-row-detail">
              <span className="price-label">Setup Fee ({PRICING.currency})</span>
              <input type="number" className="input" value={setupFee} min={0} step={10}
                onChange={function(e) { setSetupFee(numOr(e.target.value, 0)); }}
                style={{ width: 90, textAlign: 'right', padding: '2px 6px' }} />
            </div>
            <div className="price-row price-row-detail">
              <span className="price-label">Pro Bild ({PRICING.currency})</span>
              <input type="number" className="input" value={imagePrice} min={0} step={1}
                onChange={function(e) { setImagePrice(numOr(e.target.value, 0)); }}
                style={{ width: 90, textAlign: 'right', padding: '2px 6px' }} />
            </div>
            <div className="price-row price-row-detail">
              <span className="price-label">Pro Video ({PRICING.currency})</span>
              <input type="number" className="input" value={videoPrice} min={0} step={10}
                onChange={function(e) { setVideoPrice(numOr(e.target.value, 0)); }}
                style={{ width: 90, textAlign: 'right', padding: '2px 6px' }} />
            </div>

            {/* Designer Time */}
            <div className="price-divider" />
            <div className="price-section-header">Designer Time</div>
            <div className="price-row price-row-detail">
              <span className="price-label">Tracked Time</span>
              <span className="price-value" style={{ fontFamily: 'monospace' }}>
                {timerLoading ? '...' : formatTime(timerSeconds)}
              </span>
            </div>
            <div className="price-row price-row-detail">
              <span className="price-label">Rate: ${PRICING.designerHourlyUsd}/hr ({formatEur(hourlyEur)}/hr)</span>
              <span className="price-value">{formatEur(designerCostEur)}</span>
            </div>

            {/* Selling Price (Outcome) */}
            <div className="price-divider" />
            <div className="price-section-header" style={{ color: '#1d4ed8' }}>Selling Price (Customer)</div>
            <div className="price-row price-row-detail">
              <span className="price-label">{t('price.setup', uiLang)}</span>
              <span className="price-value">{setupFee} {PRICING.currency}</span>
            </div>
            <div className="price-row price-row-detail">
              <span className="price-label">{assets.images} x {imagePrice} {PRICING.currency} ({t('price.images', uiLang)})</span>
              <span className="price-value">{imageTotal} {PRICING.currency}</span>
            </div>
            {assets.videos > 0 && (
              <div className="price-row price-row-detail">
                <span className="price-label">{assets.videos} x {videoPrice} {PRICING.currency} ({t('price.videos', uiLang)})</span>
                <span className="price-value">{videoTotal} {PRICING.currency}</span>
              </div>
            )}
            <div className="price-divider" />
            <div className="price-row price-total" style={{ color: '#1d4ed8' }}>
              <span className="price-label">Selling Price Total</span>
              <span className="price-value">{formatEur(sellingPrice)}</span>
            </div>

            {/* Internal Cost */}
            <div className="price-divider" />
            <div className="price-section-header" style={{ color: '#dc2626' }}>Internal Cost (Designer Time)</div>
            <div className="price-row price-total" style={{ color: '#dc2626' }}>
              <span className="price-label">Total Internal Cost</span>
              <span className="price-value">{formatEur(totalInternalCost)}</span>
            </div>

            {/* Margin */}
            <div className="price-divider" />
            <div className="price-row price-total" style={{ color: margin >= 0 ? '#16a34a' : '#dc2626' }}>
              <span className="price-label">{t('price.margin', uiLang)}</span>
              <span className="price-value">{formatEur(margin)} ({marginPct}%)</span>
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
