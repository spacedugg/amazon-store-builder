import React, { useEffect, useState, useRef } from "react";
import { offsets, productUrl, safeUrl } from "../../brandStoryModel.mjs";
const imageSrc = (x) => (typeof x === "string" ? x : x?.url);
function Picture({
  image,
  alt = "",
  placeholder = "Bild fehlt",
  fit = "cover",
}) {
  return imageSrc(image) ? (
    <img src={imageSrc(image)} alt={alt} style={{ objectFit: fit }} />
  ) : (
    <div className="bs-placeholder">{placeholder}</div>
  );
}
export function StoryCarousel({ story, mobile = false, raster = false, onSelect, selected, showDraft = false }) {
  const [page, setPage] = useState(0),
    touch = useRef(null);
  const steps = offsets(story.cards.length, mobile),
    index = Math.min(page, Math.max(steps.length - 1, 0));
  useEffect(() => setPage(0), [mobile, story.cards.length]);
  useEffect(() => {
    const i = story.cards.findIndex(c => c.id === selected);
    if (i >= 0) setPage(mobile ? i : i < 2 ? 0 : Math.floor((i - 2) / 3) + 1);
  }, [selected, mobile, story.cards.length]);
  function move(d) {
    setPage((p) => Math.max(0, Math.min(steps.length - 1, p + d)));
  }
  return (
    <div
      className={`bs-carousel ${mobile ? "bs-mobile" : ""}`}
      tabIndex={0}
      aria-label="Brand Story Karussell"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        }
      }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current !== null) {
          const d = touch.current - e.changedTouches[0].clientX;
          if (Math.abs(d) > 40) move(d > 0 ? 1 : -1);
          touch.current = null;
        }
      }}
    >
      <div className="bs-backdrop">
        <Picture
          image={story.background[mobile ? "mobile" : "desktop"]}
          placeholder={showDraft ? (story.background[(mobile ? 'mobile' : 'desktop') + 'Brief'] || story.background.brief || (mobile ? 'Mobiler Hintergrund' : 'Desktop-Hintergrund')) : (mobile ? 'Mobiler Hintergrund' : 'Desktop-Hintergrund')}
        />
      </div>
      <div className="bs-card-viewport"><div
        className="bs-rail"
        style={{
          transform: `translateX(-${(steps[index] || 0) * (mobile ? 100 : 26.78)}%)`,
        }}
      >
        {story.cards.map((c, i) => (
          <div
            key={c.id}
            className={`bs-card bs-${c.type === 'grid' ? 'grid-card' : 'media'}${selected === c.id ? ' is-selected' : ''}`}
            onClick={onSelect ? (e) => { e.preventDefault(); onSelect(c.id); } : undefined}
            onKeyDown={onSelect ? (e) => { if (e.key === 'Enter') { e.preventDefault(); onSelect(c.id); } } : undefined}
            tabIndex={onSelect ? 0 : undefined}
            role={onSelect ? 'button' : undefined}
            aria-label={onSelect ? `Karte ${i + 1} bearbeiten` : undefined}
            style={{
              left: `${(mobile ? 0 : 31.66) + i * (mobile ? 100 : 26.78)}%`,
            }}
          >
            {c.type === "media" ? (
              <Picture image={c.image} placeholder={showDraft ? <><small>ENTWURF · KARTE {i + 1}</small><strong>{c.copy || c.title || `Brand Media Asset ${i + 1}`}</strong><span>{c.brief || 'Motiv und Bildtext hinterlegen'}</span></> : `Bildkarte ${i + 1}`} />
            ) : (
              <>
                <div className="bs-grid">
                  {c.slots.map((slot, j) => {
                    const target = productUrl(slot, story.marketplace);
                    return (
                      <a
                        key={j}
                        href={target || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Produkt ${j + 1}${slot.asin ? " " + slot.asin : ""}`}
                      >
                        <Picture
                          image={slot.image || slot.productImage}
                          placeholder={`Produkt ${j + 1}`}
                          fit={slot.image ? "cover" : "contain"}
                        />
                      </a>
                    );
                  })}
                </div>
                <div className="bs-grid-footer">
                  <strong>{c.headline}</strong>
                  <a
                    href={safeUrl(c.shopUrl) || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Shop besuchen
                  </a>
                </div>
              </>
            )}
          </div>
        ))}
      </div></div>
      {raster && (
        <div className="bs-raster">
          <span>Desktop-Intro: nur ergänzendes Branding</span>
          <div />
        </div>
      )}
      <button
        className="bs-prev"
        aria-label="Vorherige Karten"
        disabled={index === 0}
        onClick={() => move(-1)}
      >
        ‹
      </button>
      <button
        className="bs-next"
        aria-label="Nächste Karten"
        disabled={index >= steps.length - 1}
        onClick={() => move(1)}
      >
        ›
      </button>
      <span className="bs-counter" aria-live="polite">
        {index + 1} / {Math.max(steps.length, 1)}
      </span>
    </div>
  );
}
