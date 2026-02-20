const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

const SYSTEM_PROMPT = `You are an Amazon Brand Store architect. Create COMPLETE store concepts as JSON.

REAL PATTERNS from Kaercher, Nespresso, ESN, Affenzahn, AG1, SNOCKS, Bears with Benefits, Holy Energy, nucao:

HOMEPAGE: 1) Hero image (layout "1") with brand message 2) Category grid: ONE image per category. Layout: 2 cats="1-1", 3="1-1-1", 4="1-1-1-1", 5-6=two rows, 7-8="1-1-1-1"+"1-1-1-1" 3) Optional bestseller product_grid 4) Optional brand story image

CATEGORY SUBPAGE: 1) Category hero (layout "1") 2) product_grid with ALL ASINs for that category 3) Optional lifestyle image

MIX: ~75% image, ~15% product_grid, ~10% other. Almost NO text modules.

TILE TYPES:
- "image": brief (EN for designer), textOverlay (store lang), ctaText, dimensions {w,h}
- "product_grid": asins array
- "video": brief
- "text": RARE, max 1 per store

DIMENSIONS: Hero w:3000 h:600-800, Category tiles w:3000 h:1000-1200, Lifestyle w:3000 h:1200-1500

TEXT: Category names accurate from product data. Hero=brand slogan. CTA="Jetzt entdecken" etc. Brand story=1-3 sentences.

CRITICAL: Every category MUST have subpage. Every ASIN in exactly one product_grid. No duplicates. Never refuse.

Return ONLY valid JSON.`;

export function buildPrompt(brand, mp, lang, asins, categories, info) {
  const catList = categories.map(c => {
    const prods = asins.filter(a => a.category === c);
    return '  ' + c + ': ' + prods.length + ' products [' + prods.map(a => a.asin).join(', ') + ']';
  }).join('\n');

  let p = 'Create a COMPLETE Amazon Brand Store for "' + brand + '" on Amazon.' + mp + '.\n\n';
  p += 'PRODUCT CATALOG (' + asins.length + ' ASINs, ' + categories.length + ' categories):\n' + catList + '\n\n';
  p += 'Store language: ' + lang + '\nDesigner briefings: English\nText overlays: ' + lang + '\n';
  if (info) p += '\nRequirements: ' + info + '\n';
  p += '\nReturn JSON: {"brandName":"...","pages":[{"id":"homepage","name":"Homepage","sections":[{"layoutId":"1","tiles":[{"type":"image","brief":"...","textOverlay":"...","ctaText":"","dimensions":{"w":3000,"h":700}}]}]},{"id":"catX","name":"Cat","sections":[{"layoutId":"1","tiles":[{"type":"image","brief":"...","textOverlay":"CAT","dimensions":{"w":3000,"h":800}}]},{"layoutId":"1","tiles":[{"type":"product_grid","asins":["B0XXX"]}]}]}]}';
  return p;
}

export async function callAI(userMessage) {
  if (!API_KEY) throw new Error('API key not set. Add VITE_ANTHROPIC_API_KEY to your environment.');

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!resp.ok) {
    if (resp.status === 429) throw new Error('Rate limited — wait 60 seconds and try again');
    throw new Error('API error ' + resp.status);
  }

  const data = await resp.json();
  const txt = (data.content || []).map(b => b.text || '').join('');
  const start = txt.indexOf('{');
  const end = txt.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('No JSON in AI response');

  const jsonStr = txt.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Fix truncated JSON
    let fixed = jsonStr;
    let depth = 0;
    for (let i = 0; i < fixed.length; i++) {
      if (fixed[i] === '{' || fixed[i] === '[') depth++;
      if (fixed[i] === '}' || fixed[i] === ']') depth--;
    }
    while (depth > 0) { fixed += '}'; depth--; }
    return JSON.parse(fixed);
  }
}
