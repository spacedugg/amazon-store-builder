/**
 * Amazon Brand Store Builder — Multi-Step API v2
 * 3 AI steps (merged research+amazon), no price crawling, slim prompts
 */

const VALID_TILES = [
  "hero_image","image","image_with_text","shoppable_image","text",
  "video","background_video","gallery","product","product_grid",
  "best_sellers","recommended","featured_deals"
];

const PROMPTS = {
  research: `You research brands for Amazon Brand Store creation. Use web search to find:
1. Brand website, mission, values, visual identity (colors, style)
2. Product categories and range
3. Amazon presence: product names, ASINs (B0XXXXXXXXX format), categories

Do NOT collect prices — they are irrelevant for store building.

Return ONLY valid JSON:
{
  "brandName": "...",
  "description": "1-2 sentences",
  "type": "premium|d2c|mission|mass_market",
  "tone": "e.g. premium-warm, energetic-fun",
  "colors": { "primary": "#hex", "secondary": "#hex", "accent": "#hex" },
  "categories": ["Cat1", "Cat2"],
  "usps": ["USP1", "USP2", "USP3"],
  "targetAudience": "...",
  "products": [
    { "name": "Product Name", "asin": "B0XXXXXXXXX", "category": "Cat" }
  ],
  "amazonCategories": ["Category on Amazon"],
  "hasExistingStore": false
}`,

  architecture: `You plan Amazon Brand Store page structures.
Rules: Homepage first, then 1 page per major category. Premium: About page. D2C: Bestseller/Bundles. Mission: Impact page. Mass Market: Deals + many categories. 4-12 pages.
Tile types: hero_image, image, image_with_text, shoppable_image, text, video, background_video, gallery, product, product_grid, best_sellers, recommended, featured_deals

Return ONLY valid JSON:
{
  "pages": [
    { "id": "homepage", "name": "Homepage", "purpose": "...", "tileSequence": ["hero_image: keyvisual", "image x3 medium: categories", "product_grid: bestsellers"] }
  ]
}`,

  content: `You create content for ONE Amazon Brand Store page with designer image briefings.
Rules: ONLY real tile types (hero_image, image, image_with_text, shoppable_image, text, video, background_video, gallery, product, product_grid, best_sellers, recommended, featured_deals). Max 20 tiles, max 1 product_grid, max 1 gallery per page. Every image tile MUST have imageBriefing with: DIMENSIONS (exact px) | CONTENT (what's in image) | TEXT IN IMAGE (exact wording) | COLORS (hex) | MOOD | MOBILE notes. All text in marketplace language, no placeholders.

Return ONLY valid JSON:
{
  "pageName": "...",
  "heroImageBriefing": "...",
  "tiles": [
    { "type": "image_with_text", "size": "full_width", "content": { "headline": "...", "body": "..." }, "imageBriefing": "DIMENSIONS: 3000x1500px | CONTENT: ... | TEXT: ... | COLORS: ... | MOOD: ..." }
  ]
}`,

  refine: `Refine an Amazon Brand Store. Use ONLY real tile types: hero_image, image, image_with_text, shoppable_image, text, video, background_video, gallery, product, product_grid, best_sellers, recommended, featured_deals. Keep imageBriefings. Return COMPLETE store JSON.`
};

const LANG = { de:"German", com:"English", "co.uk":"English", fr:"French", it:"Italian", es:"Spanish" };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callClaude(system, user, useSearch = false) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const body = { model: "claude-sonnet-4-20250514", max_tokens: 6000, system, messages: [{ role: "user", content: user }] };
  if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];

  for (let attempt = 0; attempt < 4; attempt++) {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
    });
    if (resp.status === 429 && attempt < 3) {
      const wait = parseInt(resp.headers.get("retry-after") || "0") * 1000 || 20000 * (attempt + 1);
      console.log(`429 rate limit, waiting ${wait/1000}s...`);
      await sleep(wait);
      continue;
    }
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`API ${resp.status}: ${err.error?.message || resp.statusText}`);
    }
    const data = await resp.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");
    return JSON.parse(match[0]);
  }
  throw new Error("Rate limit after retries. Wait 1 minute.");
}

function validateStore(pages) {
  const warnings = [];
  pages.forEach(p => {
    p.tiles = (p.tiles || []).filter(t => VALID_TILES.includes(t.type));
    ["product_grid","gallery","featured_deals","recommended"].forEach(type => {
      let found = false;
      p.tiles = p.tiles.filter(t => { if (t.type === type) { if (found) return false; found = true; } return true; });
    });
    if (p.tiles.length > 20) { p.tiles = p.tiles.slice(0, 20); warnings.push(`${p.name}: >20 tiles`); }
  });
  return { pages, warnings };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action } = req.body;

  try {
    if (action === "step") {
      const { step } = req.body;

      if (step === "research") {
        const { brandName, marketplace, category, additionalInfo } = req.body;
        const lang = LANG[marketplace] || "German";
        const result = await callClaude(PROMPTS.research,
          `Research "${brandName}" for Amazon.${marketplace}. ${category ? `Category: ${category}.` : ""} ${additionalInfo || ""} JSON in English, brand content in ${lang}.`, true);
        return res.status(200).json({ step: "research", data: result });
      }

      if (step === "architecture") {
        const { marketplace, brandProfile } = req.body;
        const lang = LANG[marketplace] || "German";
        const result = await callClaude(PROMPTS.architecture,
          `Brand: ${JSON.stringify(brandProfile)}\nCategories: ${(brandProfile?.amazonCategories || brandProfile?.categories || []).join(", ")}\nProducts: ${brandProfile?.products?.length || 0}\nLanguage: ${lang}`, false);
        return res.status(200).json({ step: "architecture", data: result });
      }

      if (step === "content") {
        const { marketplace, brandProfile, pagePlan } = req.body;
        const lang = LANG[marketplace] || "German";
        const products = (brandProfile?.products || []).slice(0, 15).map(p => `${p.name} (${p.asin})`).join(", ");
        const result = await callClaude(PROMPTS.content,
          `PAGE: ${JSON.stringify(pagePlan)}\nBRAND: type=${brandProfile?.type}, tone=${brandProfile?.tone}, colors=${JSON.stringify(brandProfile?.colors)}, USPs=${(brandProfile?.usps||[]).join(", ")}\nPRODUCTS: ${products}\nLanguage: ${lang}`, false);
        return res.status(200).json({ step: "content", data: result });
      }

      return res.status(400).json({ error: `Unknown step: ${step}` });
    }

    if (action === "generate") {
      const { brandName, marketplace, category, additionalInfo } = req.body;
      if (!brandName) return res.status(400).json({ error: "brandName required" });
      const lang = LANG[marketplace] || "German";

      const brandProfile = await callClaude(PROMPTS.research,
        `Research "${brandName}" for Amazon.${marketplace}. ${category ? `Category: ${category}.` : ""} ${additionalInfo || ""} JSON in English, brand content in ${lang}.`, true);

      const architecture = await callClaude(PROMPTS.architecture,
        `Brand: ${JSON.stringify(brandProfile)}\nCategories: ${(brandProfile.amazonCategories || brandProfile.categories || []).join(", ")}\nProducts: ${brandProfile.products?.length || 0}\nLanguage: ${lang}`, false);

      const products = (brandProfile.products || []).slice(0, 15).map(p => `${p.name} (${p.asin})`).join(", ");
      const builtPages = [];
      for (const pagePlan of architecture.pages || []) {
        const pc = await callClaude(PROMPTS.content,
          `PAGE: ${JSON.stringify(pagePlan)}\nBRAND: type=${brandProfile.type}, tone=${brandProfile.tone}, colors=${JSON.stringify(brandProfile.colors)}, USPs=${(brandProfile.usps||[]).join(", ")}\nPRODUCTS: ${products}\nLanguage: ${lang}`, false);
        builtPages.push({
          id: pagePlan.id || `page_${builtPages.length}`,
          name: pc.pageName || pagePlan.name,
          heroImageBriefing: pc.heroImageBriefing || "",
          tiles: (pc.tiles || []).filter(t => VALID_TILES.includes(t.type)),
        });
      }

      const validated = validateStore(builtPages);
      return res.status(200).json({ brandName, brandProfile, pages: validated.pages, warnings: validated.warnings });
    }

    if (action === "refine") {
      const { store, instruction } = req.body;
      if (!store || !instruction) return res.status(400).json({ error: "store and instruction required" });
      const clean = JSON.parse(JSON.stringify(store));
      (clean.pages || []).forEach(p => (p.tiles || []).forEach(t => { delete t.image; }));
      const result = await callClaude(PROMPTS.refine,
        `STORE:\n${JSON.stringify(clean, null, 2)}\n\nCHANGE: ${instruction}\n\nReturn complete JSON.`, false);
      if (result.pages?.length) {
        const v = validateStore(result.pages);
        return res.status(200).json({ ...result, pages: v.pages, warnings: v.warnings });
      }
      return res.status(200).json(result);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
