const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

export async function searchAmazon(keyword, domain, limit) {
  const resp = await fetch('/api/amazon-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, domain: domain || 'https://www.amazon.de', limit: limit || 50 }),
  });
  if (resp.status === 202) {
    const d = await resp.json();
    return { status: 'processing', snapshotId: d.snapshotId };
  }
  if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || 'Search failed'); }
  return resp.json();
}

export async function pollSnapshot(snapshotId) {
  const resp = await fetch('/api/amazon-snapshot?id=' + snapshotId);
  if (resp.status === 202) return { status: 'processing' };
  if (!resp.ok) throw new Error('Snapshot poll failed');
  return resp.json();
}

export async function searchAndWait(keyword, domain, limit, onProgress) {
  onProgress?.('Searching Amazon for "' + keyword + '"...');
  let result = await searchAmazon(keyword, domain, limit);
  if (result.status === 'processing') {
    onProgress?.('Bright Data scraping Amazon (30-90s)...');
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 3000));
      onProgress?.('Waiting for results... (' + ((i+1)*3) + 's)');
      result = await pollSnapshot(result.snapshotId);
      if (result.status !== 'processing') break;
    }
    if (result.status === 'processing') throw new Error('Scraping timed out');
  }
  return result;
}

const SYSTEM_PROMPT = "You are an Amazon Brand Store architect. Create COMPLETE store concepts as JSON.\n\nREAL PATTERNS from Kaercher, Nespresso, ESN, Affenzahn, AG1, SNOCKS, Bears with Benefits, Holy Energy, nucao:\n\nHOMEPAGE: 1) Hero image (layout \"1\") with brand message 2) Category grid: ONE image per category. Layout: 2=\"1-1\", 3=\"1-1-1\", 4=\"1-1-1-1\", 5-6=two rows, 7-8=\"1-1-1-1\"+\"1-1-1-1\" 3) Optional bestseller product_grid 4) Optional brand story image\n\nCATEGORY SUBPAGE: 1) Category hero (layout \"1\") 2) Optional lifestyle image 3) product_grid with ALL ASINs from that category 4) Optional brand element\n\nMIX: ~75% image, ~15% product_grid, ~5% video, ~5% other. Almost NO text modules.\n\nTILE TYPES:\n- \"image\": brief (EN), textOverlay (store lang), ctaText, dimensions {w,h}\n- \"product_grid\": asins array\n- \"video\": brief\n- \"text\": RARE, max 1 per store\n\nDIMENSIONS: Hero w:3000 h:600-800, Category tiles w:3000 h:1000-1200, Lifestyle w:3000 h:1200-1500\n\nCRITICAL: Group products into logical categories from their ACTUAL names/descriptions. Every category MUST have subpage. Every ASIN in exactly one product_grid. No duplicates. No invented categories.\n\nReturn ONLY valid JSON.";

export function buildPrompt(brand, mp, lang, products, info) {
  const list = products.map(function(p) {
    var cats = Array.isArray(p.categories) ? p.categories.join(' > ') : '';
    return '- ' + p.asin + ': "' + p.name + '" | ' + (p.description || '').slice(0,100) + ' | ' + p.price + ' ' + p.currency + (cats ? ' | ' + cats : '');
  }).join('\n');
  var prompt = 'Create a COMPLETE Amazon Brand Store for "' + brand + '" on Amazon.' + mp + '.\n\n';
  prompt += 'ALL ' + products.length + ' real products:\n' + list + '\n\n';
  prompt += 'IMPORTANT: Derive categories from product names/descriptions. Do NOT invent.\n\n';
  prompt += 'Store language: ' + lang + '\nBriefings: English\nText overlays: ' + lang + '\n';
  if (info) prompt += '\nRequirements: ' + info + '\n';
  prompt += '\nReturn complete store JSON.';
  return prompt;
}

export async function generateStore(userPrompt) {
  if (!ANTHROPIC_KEY) throw new Error('Anthropic API key not set');
  var resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-sonnet-4-5-20250929', max_tokens: 8000, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: userPrompt }] }),
  });
  if (!resp.ok) throw new Error(resp.status === 429 ? 'Rate limited, wait 60s' : 'API error ' + resp.status);
  var data = await resp.json();
  var txt = (data.content || []).map(function(b) { return b.text || ''; }).join('');
  var s = txt.indexOf('{'), e = txt.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('No JSON in AI response');
  var str = txt.slice(s, e + 1);
  try { return JSON.parse(str); }
  catch(err) {
    var fixed = str, depth = 0;
    for (var i = 0; i < fixed.length; i++) { if (fixed[i]==='{' || fixed[i]==='[') depth++; if (fixed[i]==='}' || fixed[i]===']') depth--; }
    while (depth > 0) { fixed += '}'; depth--; }
    return JSON.parse(fixed);
  }
}
