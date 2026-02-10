export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brandName, marketplace, category, additionalInfo, existingStore, refinement } = req.body;

  try {
    // Build the prompt based on whether it's initial generation or refinement
    const isRefinement = existingStore && refinement;
    
    let systemPrompt = `You are an expert Amazon Brand Store designer. You create professional, high-converting brand stores.

CRITICAL RULES:
- NEVER use placeholder text like "Überschrift hier" or "Text hier"
- ALWAYS create specific, brand-appropriate content
- Use web search to research the brand FIRST
- Return valid JSON only

Available module types: hero_banner, hero_product, hero_seasonal, product_grid, category_grid, usp_icons, testimonials, certifications, stats_metrics, ingredients_grid, howto_steps, bundle_promo, seasonal_offer, image_text, text_block, video, cta_button

Brand types: premium (sophisticated, education-focused), d2c (fun, colorful, community), mission (impact-driven, transparent)`;

    let userPrompt;
    
    if (isRefinement) {
      userPrompt = `Refine this existing brand store for "${brandName}":

CURRENT STORE:
${JSON.stringify(existingStore, null, 2)}

REQUESTED CHANGE:
${refinement}

Apply ONLY the requested change. Keep everything else the same. Return the complete updated store as JSON.`;
    } else {
      userPrompt = `Create an Amazon Brand Store for "${brandName}" on Amazon.${marketplace}.

${category ? `Category: ${category}` : ''}
${additionalInfo ? `Additional info: ${additionalInfo}` : ''}

STEPS:
1. Research the brand using web search
2. Identify brand type (premium/d2c/mission)
3. Create appropriate store structure
4. Generate compelling, brand-specific content
5. Include realistic product ASINs if found

Return JSON with this structure:
{
  "brandType": "premium|d2c|mission",
  "brandColors": {"primary": "#HEX", "secondary": "#HEX", "accent": "#HEX"},
  "menu": [{"name": "STARTSEITE", "pageId": "homepage"}, ...],
  "pages": [{
    "id": "homepage",
    "name": "Homepage",
    "modules": [{
      "type": "hero_banner",
      "content": {"headline": "Real headline here", "subheadline": "...", ...}
    }, {
      "type": "product_grid",
      "content": {"headline": "...", "products": [{"asin": "B0XXXXXXXX", "name": "Product name"}]}
    }]
  }]
}

IMPORTANT:
- Create 6-12 modules for homepage
- Use concrete, emotional copy (not generic!)
- Include at least one product_grid
- Make it look professional and ready to use`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userPrompt
        }],
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search"
          }
        ]
      })
    });

    const data = await response.json();
    
    // Extract text from response (handling tool use)
    let fullText = '';
    for (const block of data.content || []) {
      if (block.type === 'text') {
        fullText += block.text;
      }
    }
    
    if (!fullText) {
      throw new Error('Keine AI Antwort erhalten');
    }

    // Extract JSON from response
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI Response:', fullText);
      throw new Error('Kein gültiges JSON in AI Antwort');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    // Validate result
    if (!result.pages || !Array.isArray(result.pages)) {
      throw new Error('Ungültige Store-Struktur');
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: error.message });
  }
}
