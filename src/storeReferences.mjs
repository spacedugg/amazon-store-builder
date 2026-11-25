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
    if (!row || !referenceKey(row.storeUrl) || ['amazon.de:91172724-C342-482B-A300-564D9EA5E09F','amazon.de:1758941C-AE87-4628-AB45-62C0A2BDB75C','product:B0CLDWHKCB','amazon.de:A096FF51-79D5-440D-8789-6255E9DFE87D','amazon.de:30552E59-AC22-47B1-BBBB-AEA9225BD614','amazon.de:3EB222DB-B679-4317-BFB8-B3F87C7A3E9A'].includes(referenceKey(row.storeUrl))) continue;
    const key = referenceKey(row.storeUrl);
    if (rows.has(key) && row.captureStatus) { const current=rows.get(key); rows.set(key, { ...current, brandName: row.brandName || current.brandName, alternativeUrls: [...new Set([...(current.alternativeUrls || []),...(row.alternativeUrls || [])])], homepageScreenshot: row.homepageScreenshot || current.homepageScreenshot, captureStatus: row.captureStatus, captureError: row.captureError }); }
    if (!rows.has(key)) rows.set(key, { ...row, id: key, kind: key.startsWith('product:') ? 'product' : 'store', images: row.images || [], modules: row.modules || [] });
  }
  const pinned = new Map([
    ['amazon.de:A4E07EE9-6895-493E-8F07-97526B71304D', 0],
    ['amazon.de:8B640FD7-98E9-4C48-9BF0-422ED3F14A3A', 1],
  ]);
  return [...rows.values()].sort((a, b) => (pinned.get(a.id) ?? 2) - (pinned.get(b.id) ?? 2));
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
  return image.height>=16384 && !verifiedHomepageScreenshot(image) ? {...image,fullPage:false,truncated:true} : image;
}

export function verifiedHomepageScreenshot(image) {
  return image?.captureEngine==='original-html-scroll-v1' && image.fullPage===true && (image.height<=7000 || image.quality?.tiled===true) && image.quality?.version>=2 && image.quality?.imagesComplete===true && image.quality?.imageCount>0 && image.quality?.scrollPasses>=2 && Math.abs(image.height-image.quality.documentHeight)<=2;
}

