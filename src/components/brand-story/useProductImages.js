import { useEffect, useRef, useState } from 'react';
import { fetchProductData } from '../../productData';
import { productAsin, slotImageMode } from '../../brandStoryModel.mjs';

const FAILURE_MESSAGE = 'Einige Produkthauptbilder konnten nicht geladen werden. Im jeweiligen Bildplatz kannst du den Abruf erneut versuchen oder ein eigenes Motiv wählen.';

export default function useProductImages(story, enabled, setStory, setDirty, setMessage) {
  const attempted = useRef(new Set());
  const pending = useRef(new Set());
  const cache = useRef(new Map());
  const failed = useRef(new Set());
  const reported = useRef(new Set());
  const mounted = useRef(false);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled || !story) {
      setLoading(false);
      return;
    }
    const market = story.marketplace;
    const keyFor = asin => `${market}:${asin}`;
    const wanted = new Set();
    let next;
    let reportFailure = false;
    for (let i = 0; i < story.cards.length; i++) {
      const card = story.cards[i];
      if (card.type !== 'grid') continue;
      for (let j = 0; j < card.slots.length; j++) {
        const slot = card.slots[j];
        if (slotImageMode(slot) !== 'product' || slot.productImage) continue;
        const asin = productAsin(slot, market);
        if (!asin) continue;
        const key = keyFor(asin);
        const image = cache.current.get(key);
        if (image) {
          next ||= structuredClone(story);
          const target = next.cards[i].slots[j];
          target.productImage = { ...image };
          target.brief ||= 'Use the original Amazon product main image unchanged.';
        } else {
          wanted.add(asin);
          if (failed.current.has(key) && !reported.current.has(key)) {
            reported.current.add(key);
            reportFailure = true;
          }
        }
      }
    }
    // Only this effect applies images to the current draft. Promise callbacks
    // merely update the cache, so an old request cannot dirty a replaced draft.
    if (next) {
      setStory(next);
      setDirty(true);
    }
    if (reportFailure) setMessage(FAILURE_MESSAGE);
    const asins = [...wanted].filter(asin => !attempted.current.has(keyFor(asin)));
    for (const asin of asins) {
      attempted.current.add(keyFor(asin));
      pending.current.add(keyFor(asin));
    }
    setLoading([...wanted].some(asin => pending.current.has(keyFor(asin))));
    if (!asins.length) return;

    fetchProductData(asins, market).then(result => {
      for (const product of result.products) {
        if (product.image) cache.current.set(keyFor(product.asin.toUpperCase()), { url: product.image });
      }
      for (const asin of asins) {
        if (!cache.current.has(keyFor(asin))) failed.current.add(keyFor(asin));
      }
    }).catch(() => {
      for (const asin of asins) failed.current.add(keyFor(asin));
    }).finally(() => {
      for (const asin of asins) pending.current.delete(keyFor(asin));
      if (mounted.current) setVersion(value => value + 1);
    });
  }, [story, enabled, version, setStory, setDirty, setMessage]);

  return loading;
}
