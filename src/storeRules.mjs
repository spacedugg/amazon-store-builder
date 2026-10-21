// Amazon counts its built-in header in the 20 sections per page. The editor
// stores only content sections, so at most 19 can be added here.
export const MAX_SECTIONS = 19;

export function pageCounts(page) {
  const sections = page?.sections || [];
  const counts = { sections: sections.length, product_grid: 0, best_sellers: 0 };
  sections.forEach(section => (section.tiles || []).forEach(tile => {
    if (tile && Object.hasOwn(counts, tile.type)) counts[tile.type]++;
  }));
  return counts;
}

export function pageLimitErrors(page) {
  const c = pageCounts(page);
  const prefix = `Seite „${page?.name || 'Unbenannt'}“`;
  return [
    c.sections > MAX_SECTIONS && `${prefix}: maximal ${MAX_SECTIONS} Inhaltsabschnitte plus Header erlaubt (20 insgesamt; ${c.sections} Inhaltsabschnitte vorhanden).`,
    c.product_grid > 1 && `${prefix}: maximal ein Produktraster erlaubt.`,
    c.best_sellers > 1 && `${prefix}: maximal ein Bestseller-Modul erlaubt.`,
  ].filter(Boolean);
}

export function storeLimitErrors(store) {
  return (store?.pages || []).flatMap(pageLimitErrors);
}

// Legacy stores may be over the limit. Allow edits that reduce or preserve
// existing counts so users can repair them without losing content.
export function introducedLimitErrors(previous, next) {
  const oldPages = new Map((previous?.pages || []).map(p => [p.id, pageCounts(p)]));
  return (next?.pages || []).flatMap(page => {
    const before = oldPages.get(page.id) || { sections: 0, product_grid: 0, best_sellers: 0 };
    const now = pageCounts(page);
    return pageLimitErrors(page).filter(message => {
      if (message.includes('Header')) return now.sections > before.sections;
      if (message.includes('Produktraster')) return now.product_grid > before.product_grid;
      if (message.includes('Bestseller')) return now.best_sellers > before.best_sellers;
      return false;
    });
  });
}

export function collectionContentErrors(store) {
  return (store?.pages || []).flatMap(page => (page.sections || []).flatMap((section, si) =>
    (section.tiles || []).flatMap((tile, ti) => {
      if (tile?.type !== 'product_collection') return [];
      const where = `Seite „${page.name}“, Abschnitt ${si + 1}, Kachel ${ti + 1}`;
      return [
        !String(tile.collectionTitle || '').trim() && `${where}: Titel der Produktsammlung fehlt.`,
        !(tile.asins || []).length && `${where}: Produktsammlung benötigt mindestens eine ASIN.`,
        (tile.asins || []).length > 60 && `${where}: Produktsammlung erlaubt höchstens 60 ASINs.`,
        !tile.uploadedImage && `${where}: Desktop-Titelbild fehlt (mindestens 1920 × 640 px).`,
        !tile.uploadedImageMobile && `${where}: mobiles Titelbild fehlt (mindestens 1920 × 1920 px).`,
      ].filter(Boolean);
    })));
}
