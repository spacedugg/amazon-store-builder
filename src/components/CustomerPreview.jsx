import { useState, useEffect, useRef } from 'react';
import { PRODUCT_TILE_TYPES, findLayout } from '../constants';
import { loadStoreByShareToken, loadStoreBySlug } from '../storage';
import { getGridConfig } from './SectionView';

// Customer facing preview. Erreichbar unter /customer/<shareToken>.
// Zeigt den Brand Store so, wie er fertig auf Amazon aussehen wuerde:
// Hero Banner, Brand Bar, Tab Navigation, Sections mit echten Bildern aus
// dem Store, klickbare Tiles und Hotspots, Amazon Style Produkt Karten.
// Keine Designer Tools, keine Folder Uploads, keine internen Hinweise.

function marketplaceTld(marketplace) {
  var m = marketplace || 'de';
  if (m === 'uk') return 'co.uk';
  return m;
}

function currencySymbol(currency) {
  if (!currency) return '€';
  var c = String(currency).toUpperCase();
  if (c === 'EUR') return '€';
  if (c === 'USD') return '$';
  if (c === 'GBP') return '£';
  return c;
}

function formatPrice(p, currency) {
  if (p == null || p === '' || isNaN(Number(p))) return '';
  var n = Number(p);
  var sym = currencySymbol(currency);
  if (sym === '€') return n.toFixed(2).replace('.', ',') + ' ' + sym;
  return sym + n.toFixed(2);
}

// Amazon style stars: half stars supported via overlay.
function StarsDisplay({ rating, reviews }) {
  if (!rating || rating <= 0) return null;
  var full = Math.floor(rating);
  var half = rating - full >= 0.25 && rating - full < 0.75;
  var stars = '';
  for (var i = 0; i < 5; i++) {
    if (i < full) stars += '★';
    else if (i === full && half) stars += '⯪';
    else stars += '☆';
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#0F1111' }}>
      <span style={{ color: '#F5A623', letterSpacing: 0.5 }}>{stars}</span>
      {reviews > 0 && <span style={{ color: '#007185', fontSize: 11 }}>({reviews})</span>}
    </div>
  );
}

// Eine echte Amazon Produktkarte. Bild, Titel, Sterne, Reviews Count, Preis.
// Klick oeffnet die Amazon Produktseite in einem neuen Tab.
function AmazonProductCard({ product, marketplace, isMobile }) {
  if (!product) return null;
  var tld = marketplaceTld(marketplace);
  var href = product.asin ? 'https://www.amazon.' + tld + '/dp/' + product.asin : null;
  var title = product.name || product.asin || '';
  var priceText = formatPrice(product.price, product.currency);
  var imgH = isMobile ? 110 : 150;
  var content = (
    <div style={{
      background: '#fff', display: 'flex', flexDirection: 'column',
      padding: isMobile ? 8 : 12, height: '100%', boxSizing: 'border-box',
      transition: 'box-shadow .15s',
    }}>
      <div style={{ height: imgH, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, background: '#fff' }}>
        {product.image ? (
          <img src={product.image} alt={title}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', borderRadius: 4 }} />
        )}
      </div>
      <div style={{
        fontSize: isMobile ? 11 : 12, color: '#0F1111', lineHeight: 1.35,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', minHeight: isMobile ? 30 : 34, marginBottom: 4,
      }}>
        {title}
      </div>
      <StarsDisplay rating={product.rating} reviews={product.reviews} />
      {priceText && (
        <div style={{ marginTop: 6, fontSize: isMobile ? 14 : 16, color: '#0F1111', fontWeight: 500 }}>
          {priceText}
        </div>
      )}
    </div>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%', border: '1px solid transparent', borderRadius: 4 }}
        onMouseEnter={function(e) { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.12)'; e.currentTarget.style.borderColor = '#e7e7e7'; }}
        onMouseLeave={function(e) { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}>
        {content}
      </a>
    );
  }
  return content;
}

// Amazon Produkt Grid: zeigt ein Banner mit Titel (zum Beispiel Best Sellers,
// Empfohlen) plus ein horizontales Scrollband mit den ASIN Produkten der Kachel.
export function AmazonProductGrid({ tile, products, marketplace, isMobile }) {
  var asins = tile.asins || [];
  if (!asins.length) return null;
  var map = {};
  (products || []).forEach(function(p) { if (p && p.asin) map[p.asin] = p; });
  var items = asins.map(function(a) { return map[a] || { asin: a }; });

  var titleMap = {
    product_grid: 'Produkte',
    best_sellers: 'Bestseller',
    recommended: 'Empfohlen',
    deals: 'Angebote',
  };
  var title = titleMap[tile.type] || 'Produkte';

  // Amazon zeigt Bestseller als horizontalen Slider, normale Produkt Grids
  // dagegen als tabellarisches Raster mit 5 Karten pro Reihe auf Desktop und
  // 2 pro Reihe auf Mobile. Wir bilden das hier nach.
  var isSlider = tile.type === 'best_sellers';
  var cols = isMobile ? 2 : 5;

  var listStyle;
  if (isSlider) {
    listStyle = {
      display: 'grid', gridAutoFlow: 'column',
      gridAutoColumns: (isMobile ? 150 : 200) + 'px',
      gap: isMobile ? 8 : 12, overflowX: 'auto', overflowY: 'hidden',
      paddingBottom: 6, scrollSnapType: 'x mandatory',
    };
  } else {
    listStyle = {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + cols + ', 1fr)',
      gap: isMobile ? 8 : 14,
    };
  }

  // Produkt Grid waechst nach Anzahl der ASINs. Kein height 100%, kein
  // overflow, damit die Sektion vertikal so lang wird wie noetig. Nur der
  // Slider Modus (best_sellers) bleibt horizontal scrollbar.
  return (
    <div style={{ width: '100%', background: tile.bgColor || '#fff', padding: isMobile ? '12px 8px' : '16px 12px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: '#0F1111', marginBottom: isMobile ? 8 : 12 }}>{title}</div>
      <div style={listStyle}>
        {items.map(function(p, i) {
          return (
            <div key={i} style={isSlider ? { scrollSnapAlign: 'start' } : undefined}>
              <AmazonProductCard product={p} marketplace={marketplace} isMobile={isMobile} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Hotspot mit ASIN Vorschau on hover. Klick oeffnet das Produkt auf Amazon.
function ShoppableHotspot({ hotspot, product, marketplace }) {
  var [hover, setHover] = useState(false);
  if (!hotspot || !hotspot.asin) return null;
  var tld = marketplaceTld(marketplace);
  var href = 'https://www.amazon.' + tld + '/dp/' + hotspot.asin;
  var title = (product && product.name) || hotspot.asin;
  var priceText = product ? formatPrice(product.price, product.currency) : '';
  return (
    <div
      onMouseEnter={function() { setHover(true); }}
      onMouseLeave={function() { setHover(false); }}
      style={{
        position: 'absolute',
        left: (hotspot.x || 0) + '%',
        top: (hotspot.y || 0) + '%',
        transform: 'translate(-50%, -50%)',
        zIndex: hover ? 5 : 3,
      }}
    >
      <a href={href} target="_blank" rel="noopener noreferrer"
        onClick={function(e) { e.stopPropagation(); }}
        title={'ASIN ' + hotspot.asin}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 26, height: 26, borderRadius: '50%',
          background: hover ? '#FF9900' : 'rgba(17,24,39,.85)',
          border: '2px solid rgba(255,255,255,.95)',
          boxShadow: '0 1px 6px rgba(0,0,0,.35)',
          textDecoration: 'none',
        }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
      </a>
      {hover && (
        <a href={href} target="_blank" rel="noopener noreferrer"
          onClick={function(e) { e.stopPropagation(); }}
          style={{
            position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)',
            background: '#fff', border: '1px solid #d5d9d9', borderRadius: 6,
            padding: 8, minWidth: 180, maxWidth: 220,
            boxShadow: '0 6px 18px rgba(0,0,0,.18)',
            display: 'flex', gap: 8, alignItems: 'center',
            textDecoration: 'none', color: '#0F1111',
            zIndex: 10,
          }}>
          {product && product.image && (
            <img src={product.image} alt=""
              style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0F1111', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{title}</div>
            <div style={{ fontSize: 10, color: '#007185' }}>ASIN {hotspot.asin}</div>
            {priceText && <div style={{ fontSize: 12, fontWeight: 700, color: '#B12704' }}>{priceText}</div>}
          </div>
        </a>
      )}
    </div>
  );
}

// Liefert das fertige Bild fuer eine Kachel basierend auf View Mode.
function getTileImage(tile, isMobile) {
  if (!tile) return null;
  if (isMobile) return tile.uploadedImageMobile || tile.uploadedImage || null;
  return tile.uploadedImage || tile.uploadedImageMobile || null;
}

// Liefert das Hero Banner Bild. Reihenfolge: Page Override, Store Default,
// Fallback auf eine Tile mit imageCategory store_hero. Mobile Variante hat
// Vorrang auf Mobile, faellt aber auf Desktop zurueck wenn nicht gesetzt.
function resolveHeroBannerUrl(store, page, isMobile) {
  if (page) {
    if (isMobile && page.headerBannerMobile) return page.headerBannerMobile;
    if (page.headerBanner) return page.headerBanner;
  }
  if (store) {
    if (isMobile && store.headerBannerMobile) return store.headerBannerMobile;
    if (store.headerBanner) return store.headerBanner;
    // Wenn auf Mobile kein Mobile Slot gesetzt ist, nutze Desktop als
    // Fallback statt einer leeren Banner Flaeche.
    if (isMobile && page && page.headerBanner) return page.headerBanner;
    if (isMobile && store.headerBanner) return store.headerBanner;
  }
  // Letzter Fallback: Tile mit imageCategory store_hero (Legacy Konzepte
  // aus dem AI Generator, die noch keinen store level Banner nutzen).
  var pages = (store && store.pages) || [];
  for (var pi = 0; pi < pages.length; pi++) {
    var pg = pages[pi];
    for (var si = 0; si < (pg.sections || []).length; si++) {
      var sec = pg.sections[si];
      for (var ti = 0; ti < (sec.tiles || []).length; ti++) {
        var tile = sec.tiles[ti];
        if (tile && tile.imageCategory === 'store_hero') {
          return getTileImage(tile, isMobile);
        }
      }
    }
  }
  return null;
}

// Single tile renderer fuer den Customer Preview. Aspect Ratio kommt aus dem
// Layout (Grid Cell), das eigentliche Bild fuellt die Zelle mit object-fit
// cover. Keine Wireframes, kein Designer Overlay.
// Produktauswahl Quiz: interaktives Modul. Phase wechselt zwischen Intro,
// Frage und Ergebnis. Auf Amazon zeigt das Modul nach dem letzten Klick
// eine Empfehlungsliste basierend auf den Antworten des Kunden.
function CustomerProductSelector({ tile, products, marketplace, isMobile }) {
  var ps = tile.productSelector || {};
  var psBg = (ps.styling || {}).bgColor || '#fff';
  var psFont = (ps.styling || {}).typography === 'serif' ? 'Georgia, serif' : 'system-ui, -apple-system, sans-serif';
  var introEnabled = !!(ps.intro && ps.intro.enabled);
  var introImage = ps.intro && ps.intro.image;
  var imagePos = (ps.intro && ps.intro.imagePosition) === 'right' ? 'right' : 'left';
  var questions = Array.isArray(ps.questions) ? ps.questions : [];
  var results = ps.results || {};

  var initialPhase = introEnabled ? 'intro' : (questions.length > 0 ? 'question' : 'results');
  var [phase, setPhase] = useState(initialPhase);
  var [currentQ, setCurrentQ] = useState(0);
  var [chosen, setChosen] = useState({}); // questionId -> answer.asins[]

  function reset() {
    setPhase(initialPhase);
    setCurrentQ(0);
    setChosen({});
  }

  function startQuiz() {
    if (questions.length === 0) { setPhase('results'); return; }
    setPhase('question');
    setCurrentQ(0);
  }

  function pickAnswer(qIdx, answer) {
    var q = questions[qIdx];
    var nextChosen = Object.assign({}, chosen);
    nextChosen[q.id || 'q' + qIdx] = Array.isArray(answer.asins) ? answer.asins : [];
    setChosen(nextChosen);
    if (qIdx + 1 < questions.length) {
      setCurrentQ(qIdx + 1);
    } else {
      setPhase('results');
    }
  }

  // ── Renderer für Inhalte ──
  function renderIntroContent() {
    return (
      <div style={{ textAlign: 'center', maxWidth: isMobile ? '100%' : 360 }}>
        {ps.intro && ps.intro.headline && (
          <div style={{ fontWeight: 700, fontSize: isMobile ? 20 : 28, color: '#0F1111', marginBottom: 8, lineHeight: 1.2 }}>{ps.intro.headline}</div>
        )}
        {ps.intro && ps.intro.description && (
          <div style={{ fontSize: isMobile ? 13 : 15, color: '#565959', marginBottom: 18, lineHeight: 1.4 }}>{ps.intro.description}</div>
        )}
        {ps.intro && ps.intro.buttonLabel && (
          <button onClick={startQuiz}
            style={{ background: '#FFD814', color: '#0F1111', fontSize: isMobile ? 13 : 14, fontWeight: 700, padding: isMobile ? '10px 22px' : '12px 28px', borderRadius: 100, border: '1px solid #FCD200', cursor: 'pointer' }}>
            {ps.intro.buttonLabel}
          </button>
        )}
      </div>
    );
  }

  function renderQuestion() {
    var q = questions[currentQ];
    if (!q) return null;
    var answers = Array.isArray(q.answers) ? q.answers : [];
    var anyAnswerImage = answers.some(function(a) { return !!a.image; });
    return (
      <div style={{ width: '100%', maxWidth: 720, textAlign: 'center' }}>
        {q.questionText && (
          <div style={{ fontWeight: 700, fontSize: isMobile ? 18 : 24, color: '#0F1111', marginBottom: 6, lineHeight: 1.2 }}>{q.questionText}</div>
        )}
        {q.descriptionText && (
          <div style={{ fontSize: isMobile ? 12 : 14, color: '#565959', marginBottom: 16, lineHeight: 1.4 }}>{q.descriptionText}</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(' + (isMobile ? '120px' : '140px') + ', 1fr))', gap: isMobile ? 8 : 12, marginTop: 8 }}>
          {answers.map(function(a, ai) {
            return (
              <button key={a.id || ai}
                onClick={function() { pickAnswer(currentQ, a); }}
                style={{
                  border: '1px solid #d5d9d9', borderRadius: 10, background: '#fff',
                  padding: a.image ? 0 : (isMobile ? '14px 10px' : '18px 12px'),
                  cursor: 'pointer', textAlign: 'center', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', alignItems: 'stretch',
                  transition: 'box-shadow .15s, border-color .15s',
                  font: 'inherit', color: '#0F1111',
                }}
                onMouseEnter={function(e) { e.currentTarget.style.borderColor = '#FF9900'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.08)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.borderColor = '#d5d9d9'; e.currentTarget.style.boxShadow = 'none'; }}>
                {a.image && (
                  <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#fff' }}>
                    <img src={a.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600, padding: a.image ? (isMobile ? '8px 10px' : '10px 12px') : 0 }}>
                  {a.text || 'Antwort ' + (ai + 1)}
                </div>
              </button>
            );
          })}
          {!anyAnswerImage && answers.length === 0 && (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Keine Antworten konfiguriert</div>
          )}
        </div>
        {questions.length > 1 && (
          <div style={{ marginTop: 18, fontSize: isMobile ? 11 : 12, color: '#888' }}>
            Frage {currentQ + 1} / {questions.length}
          </div>
        )}
      </div>
    );
  }

  function renderResults() {
    // ASINs aus Antworten sammeln, dedupliziert, sonst Fallback auf
    // recommendedAsins aus dem Quiz Setup.
    var asinSet = [];
    Object.keys(chosen).forEach(function(qid) {
      (chosen[qid] || []).forEach(function(a) {
        if (a && asinSet.indexOf(a) < 0) asinSet.push(a);
      });
    });
    if (asinSet.length === 0 && Array.isArray(ps.recommendedAsins)) {
      ps.recommendedAsins.forEach(function(a) {
        if (a && asinSet.indexOf(a) < 0) asinSet.push(a);
      });
    }
    var productMap = {};
    (products || []).forEach(function(p) { if (p && p.asin) productMap[p.asin] = p; });
    var items = asinSet.map(function(a) { return productMap[a] || { asin: a }; });
    return (
      <div style={{ width: '100%', maxWidth: 980 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          {results.headline && (
            <div style={{ fontWeight: 700, fontSize: isMobile ? 20 : 26, color: '#0F1111', marginBottom: 6, lineHeight: 1.2 }}>{results.headline}</div>
          )}
          {results.description && (
            <div style={{ fontSize: isMobile ? 13 : 15, color: '#565959', lineHeight: 1.4 }}>{results.description}</div>
          )}
        </div>
        {items.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(' + (isMobile ? '140px' : '180px') + ', 1fr))', gap: isMobile ? 10 : 16 }}>
            {items.map(function(p, i) {
              return (
                <div key={p.asin || i}>
                  <AmazonProductCard product={p} marketplace={marketplace} isMobile={isMobile} />
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: 13 }}>Keine Empfehlungen verfügbar</div>
        )}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={reset}
            style={{ background: 'transparent', color: '#0F1111', fontSize: isMobile ? 12 : 13, fontWeight: 600, padding: '8px 20px', borderRadius: 100, border: '1px solid #d5d9d9', cursor: 'pointer' }}>
            {results.restartLabel || 'Quiz wiederholen'}
          </button>
        </div>
        {results.disclaimer && (
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 18, textAlign: 'center', lineHeight: 1.4 }}>{results.disclaimer}</div>
        )}
      </div>
    );
  }

  var contentNode = phase === 'intro' ? renderIntroContent()
    : phase === 'question' ? renderQuestion()
    : renderResults();

  // Im Intro mit Bild: 50/50 Split Layout analog zum std-2equal Standard.
  // In allen anderen Phasen volles Modul, zentriert.
  var splitActive = phase === 'intro' && introEnabled && !!introImage;
  if (splitActive) {
    var imageCell = { flex: '0 0 50%', aspectRatio: '1 / 1', backgroundImage: 'url(' + introImage + ')', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
    var contentCell = { flex: '0 0 50%', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '16px 14px' : '24px 32px' };
    return (
      <div style={{ width: '100%', height: '100%', background: psBg, fontFamily: psFont, display: 'flex', alignItems: 'stretch' }}>
        {imagePos === 'left' && <div style={imageCell} />}
        <div style={contentCell}>{contentNode}</div>
        {imagePos === 'right' && <div style={imageCell} />}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', background: psBg, fontFamily: psFont, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px 16px' : '40px 32px', boxSizing: 'border-box' }}>
      {contentNode}
    </div>
  );
}

function CustomerTile({ tile, products, marketplace, isMobile, pages, setActivePage }) {
  var bgColor = tile.bgColor || '#f5f5f5';
  var imgSrc = getTileImage(tile, isMobile);

  // Klick Ziel: interne Subpage hat Vorrang vor ASIN Link.
  var pageTarget = null;
  if (tile.linkUrl) {
    var linkPid = String(tile.linkUrl).replace(/^\//, '');
    if (pages.find(function(p) { return p.id === linkPid; })) pageTarget = linkPid;
  }
  var asinTarget = (!pageTarget && tile.linkAsin) ? tile.linkAsin : null;
  var hasClick = !!(pageTarget || asinTarget);

  function handleClick() {
    if (pageTarget) { setActivePage(pageTarget); return; }
    if (asinTarget) {
      var tld = marketplaceTld(marketplace);
      window.open('https://www.amazon.' + tld + '/dp/' + asinTarget, '_blank', 'noopener');
    }
  }

  // Produkt Kacheln: Amazon Produkt Grid.
  if (PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0) {
    return <AmazonProductGrid tile={tile} products={products} marketplace={marketplace} isMobile={isMobile} />;
  }

  // Produktauswahl Quiz: interaktives Modul wie auf Amazon.
  if (tile.type === 'product_selector') {
    return <CustomerProductSelector tile={tile} products={products} marketplace={marketplace} isMobile={isMobile} />;
  }

  // Text Kachel: native Amazon Text Modul.
  if (tile.type === 'text') {
    var ov = tile.textOverlay || {};
    var hasContent = ov.heading || ov.subheading || ov.body || (ov.bullets && ov.bullets.length) || ov.cta;
    if (!hasContent) return <div style={{ background: bgColor, width: '100%', height: '100%' }} />;
    return (
      <div style={{ background: bgColor, width: '100%', height: '100%', padding: isMobile ? '14px 12px' : '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box', textAlign: tile.textAlign || 'left' }}>
        {ov.heading && <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, color: '#0F1111', lineHeight: 1.2, marginBottom: 6 }}>{ov.heading}</div>}
        {ov.subheading && <div style={{ fontSize: isMobile ? 13 : 15, color: '#565959', marginBottom: 10, lineHeight: 1.4 }}>{ov.subheading}</div>}
        {ov.body && <div style={{ fontSize: isMobile ? 12 : 13, color: '#0F1111', lineHeight: 1.5, marginBottom: 10 }}>{ov.body}</div>}
        {ov.bullets && ov.bullets.length > 0 && (
          <ul style={{ paddingLeft: 18, margin: '0 0 10px', fontSize: isMobile ? 12 : 13, color: '#0F1111', lineHeight: 1.6 }}>
            {ov.bullets.map(function(b, i) { return <li key={i}>{b}</li>; })}
          </ul>
        )}
        {ov.cta && (
          <div style={{ display: 'inline-block', background: '#FFD814', color: '#0F1111', fontSize: 12, fontWeight: 700, padding: '8px 18px', borderRadius: 100, border: '1px solid #FCD200', alignSelf: 'flex-start', cursor: 'default' }}>
            {ov.cta}
          </div>
        )}
      </div>
    );
  }

  // Bildbasierte Kacheln: image, shoppable_image, image_text, video.
  var productMap = {};
  (products || []).forEach(function(p) { if (p && p.asin) productMap[p.asin] = p; });

  return (
    <div onClick={hasClick ? handleClick : undefined}
      style={{ position: 'relative', width: '100%', height: '100%', background: bgColor, overflow: 'hidden', cursor: hasClick ? 'pointer' : 'default' }}>
      {imgSrc ? (
        <img src={imgSrc} alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: isMobile ? 10 : 12 }}>
          {tile.type === 'video' ? 'Video' : ''}
        </div>
      )}

      {tile.type === 'video' && imgSrc && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: isMobile ? 48 : 64, height: isMobile ? 48 : 64, borderRadius: '50%', background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: isMobile ? 22 : 28 }}>
            &#9654;
          </div>
        </div>
      )}

      {tile.type === 'shoppable_image' && (tile.hotspots || []).map(function(hs, hi) {
        return <ShoppableHotspot key={hi} hotspot={hs} product={productMap[hs.asin]} marketplace={marketplace} />;
      })}
    </div>
  );
}

function CustomerSection({ section, products, marketplace, isMobile, pages, setActivePage }) {
  var layout = findLayout(section.layoutId);
  if (!layout) return null;
  var config = getGridConfig(layout, isMobile);

  // Wenn die Sektion Produkt Tiles enthaelt, soll sie keinen festen
  // Wenn die Sektion Produkt Tiles enthaelt, soll sie keinen festen
  // aspectRatio haben und auch keine festen Row Heights. Auf Amazon waechst
  // ein Produkt Grid mit der Anzahl an Reihen nach unten. Wir geben der
  // Sektion deshalb Auto Hoehe, damit das Grid so lang wird wie noetig.
  // Aber nur wenn ALLE Tiles Produkt Tiles sind. Bei gemischten Sektionen
  // muss der aspectRatio erhalten bleiben, sonst kollabieren die Bildkacheln
  // auf 0 Hoehe.
  var tiles = section.tiles || [];
  // Tiles, die ihre Hoehe dem Inhalt folgen lassen sollen statt einem
  // festen aspectRatio: Produktgrids und das Quiz Modul. Wenn alle Tiles
  // dieser Kategorie angehoeren, darf die Sektion frei wachsen.
  function isGrowingTile(t) {
    return PRODUCT_TILE_TYPES.indexOf(t.type) >= 0 || t.type === 'product_selector';
  }
  var allGrowing = tiles.length > 0 && tiles.every(isGrowingTile);
  var gridStyle = Object.assign({}, config.gridStyle);
  if (allGrowing) {
    delete gridStyle.aspectRatio;
    delete gridStyle.gridTemplateRows;
  }
  var sectionHasNoVerticalConstraint = !gridStyle.aspectRatio && !gridStyle.gridTemplateRows;

  return (
    <div style={Object.assign({}, gridStyle, { display: 'grid', gap: isMobile ? 6 : 8, width: '100%', marginBottom: isMobile ? 8 : 16 })}>
      {tiles.map(function(tile, ti) {
        var isProduct = PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0;
        var isQuiz = tile.type === 'product_selector';
        var tileStyle = Object.assign({}, config.getTileStyle(ti), { position: 'relative', minHeight: 0, background: tile.bgColor || '#fff' });
        if (!isProduct && !isQuiz) tileStyle.overflow = 'hidden';
        // Wenn die Sektion keinen vertikalen Constraint hat (Fullwidth Sektion
        // oder gemischte Sektion mit Produkt Grid), bekommt jede Bildkachel
        // eine aspect-ratio basierend auf ihren Tile Dimensions, damit das
        // Bild sich richtig dehnt statt auf 0 Hoehe zu kollabieren.
        if (!isProduct && !isQuiz && sectionHasNoVerticalConstraint) {
          var dims = (isMobile ? tile.mobileDimensions : tile.dimensions) || tile.dimensions;
          if (dims && dims.w > 0 && dims.h > 0) {
            tileStyle.aspectRatio = dims.w + '/' + dims.h;
          }
        }
        // Produkt Kachel wraps in einen flow Container ohne absolute Hoehe,
        // damit die Anzahl der Produktreihen das Modul vertikal wachsen laesst.
        var content = isProduct ? (
          <AmazonProductGrid tile={tile} products={products} marketplace={marketplace} isMobile={isMobile} />
        ) : (
          <CustomerTile
            tile={tile}
            products={products}
            marketplace={marketplace}
            isMobile={isMobile}
            pages={pages}
            setActivePage={setActivePage}
          />
        );
        return (
          <div key={ti} style={tileStyle}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export default function CustomerPreview() {
  // Zwei URL Formate werden unterstützt:
  //   /customer/<shareToken>  Legacy Link mit kryptischem Token
  //   /<brand-slug>           Neue, lesbare URL mit Markennamen
  var pathname = window.location.pathname;
  var legacyMatch = pathname.match(/^\/customer\/([^/?]+)/);
  var slugMatch = pathname.match(/^\/([a-z0-9][a-z0-9-]*)\/?$/);
  var mode = legacyMatch ? 'token' : (slugMatch ? 'slug' : null);
  var identifier = legacyMatch ? legacyMatch[1] : (slugMatch ? slugMatch[1] : '');

  var [store, setStore] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [activePageId, setActivePageId] = useState('');
  var [viewMode, setViewMode] = useState('desktop');
  var [hoveredTab, setHoveredTab] = useState(null);
  var [moreOpen, setMoreOpen] = useState(false);
  var morePopupRef = useRef(null);
  // Scroll Container Ref: damit beim Wechsel auf eine andere (Sub)Page der
  // Customer wieder am Anfang der neuen Seite startet, statt mit der alten
  // Scrollposition irgendwo in der Mitte zu landen.
  var scrollContainerRef = useRef(null);
  useEffect(function() {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activePageId]);

  // Erstladung plus stiller Reload, wenn der Tab wieder Fokus bekommt.
  // Damit muss der Operator nach einem Save im Editor nicht F5 druecken,
  // er kann einfach den Customer Tab anklicken und der neue Stand erscheint.
  function fetchStoreData(silent) {
    if (!identifier || !mode) {
      if (!silent) { setError('Kein Customer Identifier in der URL.'); setLoading(false); }
      return;
    }
    var loader = mode === 'slug' ? loadStoreBySlug(identifier) : loadStoreByShareToken(identifier);
    loader.then(function(result) {
      if (!result || !result.data) {
        if (!silent) { setError('Store nicht gefunden oder Link abgelaufen.'); setLoading(false); }
        return;
      }
      setStore(result.data);
      if (!silent) {
        var firstPage = result.data.pages && result.data.pages[0];
        setActivePageId(firstPage ? firstPage.id : '');
        setLoading(false);
      }
    }).catch(function(e) {
      if (!silent) { setError(e.message || 'Fehler beim Laden des Stores.'); setLoading(false); }
    });
  }
  useEffect(function() {
    fetchStoreData(false);
    function onVisible() {
      if (document.visibilityState === 'visible') fetchStoreData(true);
    }
    document.addEventListener('visibilitychange', onVisible);
    return function() { document.removeEventListener('visibilitychange', onVisible); };
  }, [identifier, mode]);

  useEffect(function() {
    if (!moreOpen) return;
    function handleClick(e) {
      if (morePopupRef.current && !morePopupRef.current.contains(e.target)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, [moreOpen]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#565959', fontSize: 14 }}>
        Brand Store wird geladen...
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#dc2626', fontSize: 14, padding: 40, textAlign: 'center' }}>
        {error}
      </div>
    );
  }
  if (!store) return null;

  var isMobile = viewMode === 'mobile';
  var pages = store.pages || [];
  var topPages = pages.filter(function(p) { return !p.parentId; });
  var childrenMap = {};
  topPages.forEach(function(pg) { childrenMap[pg.id] = pages.filter(function(cp) { return cp.parentId === pg.id; }); });
  var activePage = pages.find(function(p) { return p.id === activePageId; }) || pages[0];
  var marketplace = store.marketplace || 'de';

  var heroImg = resolveHeroBannerUrl(store, activePage, isMobile);

  var MAX_NAV_TABS = isMobile ? 4 : 7;
  var visibleTabs = topPages.slice(0, MAX_NAV_TABS);
  var overflowTabs = topPages.slice(MAX_NAV_TABS);
  var storeWidth = isMobile ? 420 : 1500;

  function setActivePage(pid) {
    setActivePageId(pid);
    setHoveredTab(null);
    setMoreOpen(false);
  }

  return (
    // Globale CSS in index.css setzt html, body, #root auf overflow hidden,
    // damit der Editor selbst nicht scrollt. Fuer die Customer Preview muss
    // die ganze Page aber scrollbar sein. Unser Root Container bekommt eine
    // feste Hoehe und eigenes overflow auto, damit Hero, Nav und Sections
    // erreichbar bleiben.
    <div ref={scrollContainerRef} style={{ height: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
      {/* ─── DEVICE TOGGLE (subtil, oben rechts, schliesst sich beim Klick auf den Store) ─── */}
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 100, display: 'flex', gap: 4, background: 'rgba(15,23,42,.85)', padding: 4, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,.18)' }}>
        <button onClick={function() { setViewMode('desktop'); }}
          style={{ background: viewMode === 'desktop' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
          Desktop
        </button>
        <button onClick={function() { setViewMode('mobile'); }}
          style={{ background: viewMode === 'mobile' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
          Mobile
        </button>
      </div>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', background: '#fff' }}>
        <div style={{ width: storeWidth, maxWidth: '100%', background: '#fff' }}>

          {/* ─── HERO BANNER ─── Aspect Ratio kommt aus den Page Hero Dims
              wenn der Operator sie ueberschrieben hat, sonst Amazon Defaults. */}
          <div style={{ width: '100%', aspectRatio: (isMobile
              ? (((activePage && activePage.heroBannerMobileDimensions && activePage.heroBannerMobileDimensions.w) || 1680) + '/' + ((activePage && activePage.heroBannerMobileDimensions && activePage.heroBannerMobileDimensions.h) || 900))
              : (((activePage && activePage.heroBannerDimensions && activePage.heroBannerDimensions.w) || 3000) + '/' + ((activePage && activePage.heroBannerDimensions && activePage.heroBannerDimensions.h) || 600))
            ), background: '#232f3e', position: 'relative', overflow: 'hidden' }}>
            {heroImg ? (
              <img src={heroImg} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'rgba(255,255,255,.5)', fontSize: isMobile ? 14 : 20, fontWeight: 700 }}>
                {store.brandName || 'Brand Store'}
              </div>
            )}
          </div>

          {/* ─── BRAND BAR ─── */}
          <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: isMobile ? '12px 16px' : '14px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: isMobile ? 40 : 52, height: isMobile ? 40 : 52, borderRadius: '50%', background: '#232f3e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: isMobile ? 16 : 22, flexShrink: 0 }}>
              {(store.brandName || 'B').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: isMobile ? 15 : 20, color: '#0F1111', lineHeight: 1.2 }}>{store.brandName || 'Brand Store'}</div>
              {store.heroMessage && <div style={{ fontSize: isMobile ? 11 : 13, color: '#565959', marginTop: 2 }}>{store.heroMessage}</div>}
            </div>
          </div>

          {/* ─── NAVIGATION ─── */}
          <div style={{ background: '#fff', borderBottom: '2px solid #e7e7e7', padding: '0 ' + (isMobile ? '8px' : '24px'), display: 'flex', alignItems: 'stretch', position: 'relative', overflow: 'visible' }}>
            {visibleTabs.map(function(pg) {
              var isActive = pg.id === activePageId || (childrenMap[pg.id] || []).some(function(c) { return c.id === activePageId; });
              var isHovered = hoveredTab === pg.id;
              var children = childrenMap[pg.id] || [];
              return (
                <div key={pg.id} style={{ position: 'relative' }}
                  onMouseEnter={function() { setHoveredTab(pg.id); }}
                  onMouseLeave={function() { setHoveredTab(null); }}>
                  <button onClick={function() { setActivePage(pg.id); }}
                    style={{ background: 'transparent', border: 'none',
                      borderBottom: isActive ? '3px solid #e77600' : '3px solid transparent',
                      padding: isMobile ? '10px 8px' : '14px 18px',
                      fontSize: isMobile ? 12 : 14, fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#c45500' : '#0F1111', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color .15s' }}>
                    {pg.name}
                  </button>
                  {children.length > 0 && isHovered && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #d5d9d9', borderRadius: '0 0 4px 4px', boxShadow: '0 4px 14px rgba(0,0,0,.15)', zIndex: 50, minWidth: 200, padding: '4px 0' }}>
                      {children.map(function(child) {
                        var childActive = child.id === activePageId;
                        return (
                          <button key={child.id} onClick={function() { setActivePage(child.id); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', background: childActive ? '#f7f7f7' : 'transparent', border: 'none', padding: '10px 18px', fontSize: 13, color: childActive ? '#c45500' : '#0F1111', cursor: 'pointer', fontWeight: childActive ? 600 : 400 }}>
                            {child.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {overflowTabs.length > 0 && (
              <div style={{ position: 'relative' }} ref={morePopupRef}>
                <button onClick={function() { setMoreOpen(!moreOpen); }}
                  style={{ background: 'transparent', border: 'none', borderBottom: '3px solid transparent', padding: isMobile ? '10px 8px' : '14px 18px', fontSize: isMobile ? 12 : 14, color: '#0F1111', cursor: 'pointer' }}>
                  Mehr &#9662;
                </button>
                {moreOpen && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, background: '#fff', border: '1px solid #d5d9d9', borderRadius: '0 0 4px 4px', boxShadow: '0 4px 14px rgba(0,0,0,.15)', zIndex: 50, minWidth: 220, padding: '4px 0' }}>
                    {overflowTabs.map(function(pg) {
                      return (
                        <button key={pg.id} onClick={function() { setActivePage(pg.id); }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', background: pg.id === activePageId ? '#f7f7f7' : 'transparent', border: 'none', padding: '10px 18px', fontSize: 13, color: pg.id === activePageId ? '#c45500' : '#0F1111', cursor: 'pointer' }}>
                          {pg.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── PAGE CONTENT ─── */}
          <div style={{ background: '#fff', padding: isMobile ? '12px 8px' : '20px 24px' }}>
            {activePage && (activePage.sections || []).map(function(sec) {
              return (
                <CustomerSection key={sec.id}
                  section={sec}
                  products={store.products || []}
                  marketplace={marketplace}
                  isMobile={isMobile}
                  pages={pages}
                  setActivePage={setActivePage}
                />
              );
            })}
            {(!activePage || (activePage.sections || []).length === 0) && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: 80, fontSize: 14 }}>Diese Seite ist leer.</div>
            )}
          </div>

          {/* ─── FOOTER ─── */}
          <div style={{ height: 40, background: '#fff' }} />
          <div style={{ background: '#232f3e', padding: isMobile ? '24px 16px' : '32px 40px', color: 'rgba(255,255,255,.4)', fontSize: 11, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 16 }}>
              {(store.brandName || 'Brand') + ' Store, gehostet auf Amazon'}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
