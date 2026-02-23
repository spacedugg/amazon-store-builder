// ─── BRIGHT DATA: Scrape ASINs ───
export async function scrapeAsins(asins, domain) {
  var resp = await fetch('/api/amazon-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asins: asins, domain: domain || 'https://www.amazon.de' }),
  });
  if (!resp.ok) {
    var e = await resp.json().catch(function() { return {}; });
    throw new Error(e.error || e.detail || 'Scrape failed');
  }
  return resp.json();
}
