export function referenceKey(url) {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol) || !/(^|\.)amazon\.(?:[a-z]{2}|com|co\.(?:uk|jp|za)|com\.(?:au|br|mx|tr|sg|be))$/i.test(u.hostname)) return '';
    const page = u.pathname.match(/\/stores\/(?:.*\/)?page\/([a-f0-9-]{36})(?:\/|$)/i);
    if (page) return u.hostname.replace(/^www\./, '').toLowerCase() + ':' + page[1].toUpperCase();
    const asin = u.pathname.match(/\/dp\/([a-z0-9]{10})(?:\/|$)/i);
    return asin ? 'product:' + asin[1].toUpperCase() : '';
  } catch (_) { return ''; }
}

export function mergeReferenceCatalog(catalog, additions = []) {
  const rows = new Map();
  for (const row of [...catalog, ...additions]) {
    if (!row || !referenceKey(row.storeUrl)) continue;
    const key = referenceKey(row.storeUrl);
    if (rows.has(key) && row.captureStatus) { const current=rows.get(key); rows.set(key, { ...current, brandName: row.brandName || current.brandName, alternativeUrls: [...new Set([...(current.alternativeUrls || []),...(row.alternativeUrls || [])])], homepageScreenshot: row.homepageScreenshot || current.homepageScreenshot, captureStatus: row.captureStatus, captureError: row.captureError }); }
    if (!rows.has(key)) rows.set(key, { ...row, id: key, kind: key.startsWith('product:') ? 'product' : 'store', images: row.images || [], modules: row.modules || [] });
  }
  return [...rows.values()];
}

export function appendReferenceChoices(current, choices) {
  const result = current.map(row => ({ ...row }));
  const keys = new Set(result.map(r => referenceKey(r.url)).filter(Boolean));
  for (const choice of choices) {
    const key = referenceKey(choice.storeUrl);
    if (!key || key.startsWith('product:') || keys.has(key)) continue;
    const row = { url: choice.storeUrl, notes: '' };
    const empty = result.findIndex(r => !r.url.trim() && !r.notes.trim());
    if (empty === -1) result.push(row); else result[empty] = row;
    keys.add(key);
  }
  return result;
}

// Only explicit page captures represent a homepage; truncated captures stay labeled.
// Logos and archived motif arrays are never treated as page screenshots.
export function homepageScreenshot(entry) {
  const image = entry?.homepageScreenshot;
  if (!image || (image.fullPage !== true && !(image.fullPage===false && image.truncated===true)) || !(image.width > 0) || !(image.height > 0)
      || !image.capturedAt || !Number.isFinite(Date.parse(image.capturedAt))) return null;
  if (typeof image.url !== 'string' || !(/^(https:\/\/|\/store-homepage-screenshots\/)/.test(image.url))) return null;
  const keys = [entry.storeUrl, ...(entry.alternativeUrls || [])].map(referenceKey);
  if (!referenceKey(image.sourceUrl) || !keys.includes(referenceKey(image.sourceUrl))
      || referenceKey(image.sourceUrl).startsWith('product:')) return null;
  return image.height>=16384 ? {...image,fullPage:false,truncated:true} : image;
}
