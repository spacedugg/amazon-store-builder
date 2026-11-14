import React from 'react';
export default function StoryOverview({ stories, loading, error, hasDraft, onResume, onOpen, onNew, busy }) {
  return <div className="store-home bs-overview">
    <header className="store-home-header"><div><div className="store-home-eyebrow">Brand Story Builder</div><h1>Deine Brand Stories</h1><p>Markengeschichten planen, gestalten und freigeben.</p></div><button className="store-home-create" onClick={onNew}>Neue Brand Story</button></header>
    <main className="store-home-main">
      <div className="store-home-section"><div><h2>Gespeicherte Brand Stories</h2><p>{loading ? 'Wird geladen …' : `${stories.length} ${stories.length === 1 ? 'Brand Story' : 'Brand Stories'}`}</p></div>
        {hasDraft && <button className="btn" onClick={onResume}>Letzten Entwurf fortsetzen</button>}</div>
      {error && <p className="store-home-error" role="alert">{error}</p>}
      {loading ? <p>Brand Stories werden geladen …</p> : <div className="store-home-grid">
        {stories.map(s => <button className="store-home-card" key={s.id} aria-label={`${s.brandName} öffnen`} disabled={busy} onClick={() => onOpen(s.id)}>
          <div className="bs-project-preview" style={s.preview?.background ? { backgroundImage: `url("${s.preview.background.replaceAll('"', '%22')}")` } : undefined} aria-hidden="true">
            <span className="bs-project-brand">{s.brandName}</span><div className="bs-project-rail">{(s.preview?.cards?.length ? s.preview.cards : [{}, {}, {}]).map((c, i) => <div className={`bs-project-card ${c.type === 'grid' ? 'is-grid' : ''}`} key={i}>
              {c.type === 'grid' ? Array.from({ length: 4 }, (_, j) => <div key={j}>{c.images?.[j] && <img src={c.images[j]} alt="" loading="lazy" />}</div>) : c.image ? <img src={c.image} alt="" loading="lazy" /> : <span>Brand Story</span>}
            </div>)}</div>
          </div>
          <div className="store-home-card-details"><div className="store-home-card-title">{s.brandName}<span aria-hidden="true">↗</span></div><div className="store-home-card-meta"><span>{s.cardCount ?? 0} Karten</span><span>{s.mediaCount ?? 0} Bildkarten · {s.gridCount ?? 0} ASIN-Grids</span><span>{s.marketplace?.toUpperCase()}</span></div>
            <p className="bs-project-status">Desktop {s.hasDesktop ? '✓' : 'offen'} · Mobil {s.hasMobile ? '✓' : 'offen'}{s.updated_at ? ` · ${new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(s.updated_at.replace(' ', 'T') + (/Z$|[+-]\d\d:\d\d$/.test(s.updated_at) ? '' : 'Z')))}` : ''}</p>
          </div>
        </button>)}
      </div>}
      {!loading && !stories.length && !error && <div className="store-home-empty"><h3>Deine erste Markengeschichte</h3><p>Starte mit der Marke und dem Konzept. Die Vorschau entsteht direkt aus deinem JSON.</p><button className="store-home-create" onClick={onNew}>Neue Brand Story</button></div>}
    </main>
  </div>;
}
