// API Route: /api/generate.js
// Next.js Serverless Function for AI Brand Store Generation
// Deploy to Vercel with ANTHROPIC_API_KEY environment variable

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brandName, marketplace, category, additionalInfo, existingStore, refinement } = req.body;
  if (!brandName && !existingStore) return res.status(400).json({ error: 'Brand name required' });

  const isRefinement = existingStore && refinement;
  const langMap = { de: 'German', com: 'English', 'co.uk': 'English', fr: 'French', it: 'Italian', es: 'Spanish' };
  const currMap = { de: 'EUR (€)', com: 'USD ($)', 'co.uk': 'GBP (£)', fr: 'EUR (€)', it: 'EUR (€)', es: 'EUR (€)' };

  const systemPrompt = `You are an expert Amazon Brand Store architect with deep knowledge of what converts.

CRITICAL:
- Use web search to research the brand
- Create 5-20 pages depending on brand complexity
- 6-12 modules per page, all with real content
- NEVER use placeholder text
- Return ONLY valid JSON

MODULE TYPES: hero_banner, hero_product, hero_seasonal, hero_mission, product_grid, product_slider, bestseller_auto, recommended_auto, category_grid, category_split, testimonials, certifications, stats_metrics, founder_story, text_block, image_text, image_gallery, video, usp_icons, howto_steps, bundle_promo, cta_button

JSON SCHEMA:
{
  "brandType": "premium|d2c|mission",
  "brandColors": {"primary":"#HEX","secondary":"#HEX","accent":"#HEX"},
  "brandDescription": "string",
  "menu": [{"name":"string","pageId":"string"}],
  "pages": [{
    "id": "string",
    "name": "string",
    "modules": [{
      "type": "module_type",
      "content": { /* type-specific fields */ }
    }]
  }]
}`;

  let userPrompt;
  if (isRefinement) {
    userPrompt = `Refine this existing store:\n${JSON.stringify(existingStore, null, 2)}\n\nCHANGE: ${refinement}\n\nApply ONLY the change. Return complete JSON.`;
  } else {
    userPrompt = `Create Amazon Brand Store for "${brandName}" on Amazon.${marketplace}.
${category ? `Category: ${category}` : ''}
${additionalInfo ? `Context: ${additionalInfo}` : ''}
Language: ${langMap[marketplace] || 'German'}, Currency: ${currMap[marketplace] || 'EUR'}
Return ONLY JSON.`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        tools: isRefinement ? undefined : [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API ${response.status}`);
    }

    const data = await response.json();
    let fullText = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    if (!fullText) throw new Error('Empty AI response');

    // Extract and parse JSON
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    let cleaned = jsonMatch[0].replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const result = JSON.parse(cleaned);

    if (!result.pages?.length) throw new Error('No pages generated');

    // Validate
    result.pages.forEach((p, i) => {
      if (!p.id) p.id = `page_${i}`;
      if (!p.modules) p.modules = [];
      p.modules = p.modules.filter(m => m?.type);
      p.modules.forEach(m => { if (!m.content) m.content = {}; });
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Generate Error:', error);
    res.status(500).json({ error: error.message });
  }
}
