import React, { useEffect, useState } from 'react';
import StoryModal from './StoryModal';
import { StoryCarousel } from './StoryCarousel';
export default function StoryReferences({ onClose }) {
  const [stories, setStories] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  useEffect(() => {
    const abort = new AbortController();
    fetch('/brand-story-examples/stories.json', { signal: abort.signal }).then(r => { if (!r.ok) throw Error('Beispiele konnten nicht geladen werden.'); return r.json(); }).then(r => { setStories(r.stories || []); setLoading(false); }).catch(e => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } });
    return () => abort.abort();
  }, []);
  return <StoryModal title="Interaktive Brand-Story-Beispiele" wide onClose={onClose}><p className="bs-help">Klicke durch die Karten und prüfe, wie Motive verdeckt oder wieder sichtbar werden. Die Beispiele stammen aus euren Designreferenzen.</p>{error && <p role="alert">{error}</p>}{loading && <p>Beispiele werden geladen …</p>}<div className="bs-reference-list">{stories.map(s => <article key={s.brandName}><header><h3>{s.brandName}</h3><span>{s.cards.length} Karten</span></header><StoryCarousel story={s} /><p className="bs-help">Desktop-Referenz · Für dieses Beispiel liegt kein eigener Mobilhintergrund vor.</p></article>)}</div></StoryModal>;
}
