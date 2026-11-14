import React, { useEffect, useState } from 'react';
import StoryModal from './StoryModal';
import { StoryCarousel } from './StoryCarousel';
const purposes = {
  MyPuzzle: 'Hero-Produkt: das individuelle Fotopuzzle erklären und fertige Beispiele zeigen.',
  PROCREA: 'Sortiment: Kategorien mit Produkt-Hero und anschließendem Grid erschließen.',
  Eglianos: 'Herkunft und Handwerk: die Geschichte hinter dem griechischen Olivenöl erzählen.',
  OmniRelexx: 'Persönlicher Einstieg: zwei Menschen hinter der Marke und zusammenhängende Motive für ein kleines Sortiment.',
  Bachgold: 'Kleines Sortiment: einzelne Produkte, ihre Entstehung und Anwendung in den Fokus stellen.',
  Sanquell: 'Kategorien in der Anwendung zeigen und passende Produkte sowie Ersatzbedarf zugänglich machen.',
};
export default function StoryReferences({ onClose }) {
  const [stories, setStories] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  useEffect(() => {
    const abort = new AbortController();
    fetch('/brand-story-examples/stories.json', { signal: abort.signal }).then(r => { if (!r.ok) throw Error('Beispiele konnten nicht geladen werden.'); return r.json(); }).then(r => { setStories(r.stories || []); setLoading(false); }).catch(e => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } });
    return () => abort.abort();
  }, []);
  return <StoryModal title="Interaktive Brand-Story-Beispiele" wide onClose={onClose}><p className="bs-help">Klicke durch die Karten und prüfe, wie Motive verdeckt oder wieder sichtbar werden. Die Beispiele zeigen unterschiedliche Aufträge und Gestaltungsmöglichkeiten.</p>{error && <p role="alert">{error}</p>}{loading && <p>Beispiele werden geladen …</p>}<div className="bs-reference-list">{stories.map(s => <article key={s.brandName}><header><h3>{s.brandName}</h3><span>{s.cards.length} Karten · {s.cards.filter(c=>c.type==='media').length} Full Image · {s.cards.filter(c=>c.type==='grid').length} Grids</span></header><p className="bs-help">{purposes[s.brandName]}</p><StoryCarousel story={s} /><p className="bs-help">Desktop-Referenz · Für dieses Beispiel liegt kein eigener Mobilhintergrund vor. Beispielaussagen und Verkaufswirkung sind nicht unabhängig geprüft.</p></article>)}</div></StoryModal>;
}
