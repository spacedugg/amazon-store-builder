/**
 * Amazon Brand Store Builder — Multi-Step API
 * Next.js API Route: /api/generate.js
 * 
 * Supports three modes:
 *   1. FULL GENERATION: POST { action:"generate", brandName, marketplace, ... }
 *      → Runs all 5 steps server-side, returns complete store
 *   2. SINGLE STEP: POST { action:"step", step:"research"|"amazon"|"architecture"|"content", ... }
 *      → Runs one step at a time (for client-controlled flow with progress UI)
 *   3. REFINE: POST { action:"refine", store, instruction }
 *      → Refines existing store
 *
 * Environment: ANTHROPIC_API_KEY must be set
 * 
 * For Vercel: place in /pages/api/generate.js or /app/api/generate/route.js
 * For the React artifact (JSX): calls go directly to Anthropic API (no CORS in artifacts)
 * For production web app: calls go through this endpoint (avoids CORS)
 */

// ── Amazon Store Tile Types (validation) ──
const VALID_TILES = [
  "hero_image","image","image_with_text","shoppable_image","text",
  "video","background_video","gallery","product","product_grid",
  "best_sellers","recommended","featured_deals"
];

// ── System Prompts for each step ──
const PROMPTS = {

  // STEP 1: Brand Research (uses web search)
  research: `You are a brand research analyst. Given a brand name and marketplace, research the brand thoroughly using web search.

Search for:
1. The brand's website, mission, values, founding story
2. Their product categories and range
3. Their visual identity (colors, style, tone)
4. Their Amazon presence (if any)
5. Key competitors

Return ONLY valid JSON:
{
  "brandName": "...",
  "description": "2-3 sentence summary",
  "type": "premium|d2c|mission|mass_market",
  "tone": "e.g. premium-warm, energetic-fun, clinical-trust, functional-clean",
  "colors": { "primary": "#hex", "secondary": "#hex", "accent": "#hex" },
  "categories": ["Category 1", "Category 2"],
  "usps": ["USP 1", "USP 2", "USP 3"],
  "founderStory": "Brief founder/origin story or empty string",
  "targetAudience": "Who buys this",
  "priceRange": "e.g. €15-€45 mid-range",
  "competitorBrands": ["Competitor 1", "Competitor 2"]
}`,

  // STEP 2: Amazon Data Scraping (uses web search)
  amazon: `You are an Amazon marketplace analyst. Given a brand name and marketplace domain, find their actual Amazon products.

Search Amazon for this brand. Find:
1. Real product names and ASINs (format: B0XXXXXXXXX)
2. Product categories as they appear on Amazon
3. Price points
4. Whether they have an existing Brand Store
5. Their bestselling products

Return ONLY valid JSON:
{
  "hasExistingStore": true/false,
  "existingStorePages": ["page names if found"],
  "products": [
    { "name": "Product Name", "asin": "B0XXXXXXXXX", "price": "€XX.XX", "category": "Category", "isBestseller": true/false }
  ],
  "amazonCategories": ["Category as on Amazon"],
  "totalProducts": 42,
  "averageRating": 4.5
}`,

  // STEP 3: Store Architecture (no web search, uses research data)
  architecture: `You are an Amazon Brand Store architect. Based on the brand profile and Amazon product data provided, create the optimal page structure.

RULES:
- Homepage is always first
- One page per major product category
- Additional pages based on brand type:
  * Premium: "About/Mission" page, fewer but more editorial pages
  * D2C: "Bestseller", "Starter Sets/Bundles", "Für Neukunden" pages
  * Mission: "Our Mission/Impact" page with stats
  * Mass Market: "Deals/Angebote", many category pages
- Min 4 pages, max 15 pages
- Each page gets a clear purpose description
- Tile sequences use ONLY real Amazon tile types

Return ONLY valid JSON:
{
  "pages": [
    {
      "id": "homepage",
      "name": "Homepage",
      "purpose": "Brand introduction, category navigation, bestseller highlights",
      "tileSequence": [
        "hero_image: brand keyvisual with claim",
        "image (medium, x3): category navigation tiles",
        "product_grid: bestsellers",
        "image_with_text: brand story section",
        "shoppable_image: lifestyle shot with products",
        "best_sellers: auto-populated top 5"
      ]
    }
  ],
  "navigationOrder": ["Homepage", "Page2"]
}`,

  // STEP 4: Content per Page (no web search, uses all collected data)
  content: `You are an Amazon Brand Store content creator and designer briefing specialist. You create content for ONE specific store page.

You will receive:
- Brand profile (type, colors, tone, USPs)
- Amazon product data (real ASINs, names, prices)
- Page specification (name, purpose, tile sequence)

CRITICAL RULES:
- Use ONLY these real Amazon tile types: hero_image, image, image_with_text, shoppable_image, text, video, background_video, gallery, product, product_grid, best_sellers, recommended, featured_deals
- Every image tile MUST have a detailed imageBriefing for the designer
- imageBriefing MUST include: exact pixel dimensions, what's in the image, text overlays with exact wording, colors with hex codes, mood/style, safe zone notes, mobile considerations
- All text content in the marketplace language
- Use real ASINs from the product data where applicable
- No placeholder text whatsoever — every text must be brand-specific and final
- Max 20 tiles per page
- Max 1 product_grid, 1 gallery, 1 featured_deals, 1 recommended per page

Image briefing format (MANDATORY for every image tile):
"DIMENSIONS: 3000×1000px, JPG, max 5MB | SAFE ZONE: mittlere 70% | CONTENT: [detailed description of what's in the image] | TEXT IN IMAGE: '[exact headline]' (white, centered), '[subline]' (smaller, below) | COLORS: primary #hex, gradient from X to Y | MOOD: [style description] | MOBILE: text must stay in center 60%"

Return ONLY valid JSON:
{
  "pageName": "...",
  "heroImageBriefing": "detailed briefing for hero image of this page",
  "tiles": [
    {
      "type": "image_with_text",
      "size": "full_width",
      "content": { "layout": "text_over", "headline": "...", "body": "...", "linkText": "..." },
      "imageBriefing": "DIMENSIONS: ... | CONTENT: ... | TEXT IN IMAGE: ... | COLORS: ... | MOOD: ..."
    }
  ]
}`,

  // REFINE: modify existing store
  refine: `You refine an Amazon Brand Store based on a user instruction. 

RULES:
- Use ONLY real Amazon tile types: hero_image, image, image_with_text, shoppable_image, text, video, background_video, gallery, product, product_grid, best_sellers, recommended, featured_deals
- Include detailed imageBriefing for every image tile
- Preserve existing imageBriefings and content unless the change specifically requires modifying them
- Return the COMPLETE store as JSON (all pages, all tiles)
- Keep all brand profile data intact`
};

// ── Language/Currency mapping ──
const LANG_MAP = { de:"German", com:"English", "co.uk":"English", fr:"French", it:"Italian", es:"Spanish" };
const CURR_MAP = { de:"€ (EUR)", com:"$ (USD)", "co.uk":"£ (GBP)", fr:"€ (EUR)", it:"€ (EUR)", es:"€ (EUR)" };

// ── Claude API call helper ──
async function callClaude(system, userMessage, useSearch = false) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY environment variable is not set");

  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: userMessage }],
  };
  if (useSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Anthropic API ${response.status}: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No valid JSON in AI response. Raw: " + text.slice(0, 200));

  return JSON.parse(match[0]);
}

// ── Validation & Auto-Fix ──
function validateStore(pages) {
  const warnings = [];

  pages.forEach((page) => {
    // Filter invalid tile types
    const before = page.tiles?.length || 0;
    page.tiles = (page.tiles || []).filter(t => VALID_TILES.includes(t.type));
    if ((page.tiles?.length || 0) < before) {
      warnings.push(`${page.name}: ${before - page.tiles.length} ungültige Tile-Typen entfernt`);
    }

    // Enforce max 1 of certain tile types
    ["product_grid", "gallery", "featured_deals", "recommended"].forEach(tileType => {
      const count = page.tiles.filter(t => t.type === tileType).length;
      if (count > 1) {
        let found = false;
        page.tiles = page.tiles.filter(t => {
          if (t.type === tileType) { if (found) return false; found = true; }
          return true;
        });
        warnings.push(`${page.name}: Doppelte ${tileType} entfernt (max 1/Seite)`);
      }
    });

    // Max 20 tiles per page
    if (page.tiles.length > 20) {
      page.tiles = page.tiles.slice(0, 20);
      warnings.push(`${page.name}: Auf 20 Tiles gekürzt`);
    }

    // Max 4 background videos per page
    const bgvCount = page.tiles.filter(t => t.type === "background_video").length;
    if (bgvCount > 4) {
      let count = 0;
      page.tiles = page.tiles.filter(t => {
        if (t.type === "background_video") { count++; if (count > 4) return false; }
        return true;
      });
      warnings.push(`${page.name}: Background Videos auf 4 begrenzt`);
    }

    // Check image briefings exist
    const IMAGE_TILES = ["hero_image", "image", "image_with_text", "shoppable_image", "video", "gallery"];
    page.tiles.forEach(t => {
      if (IMAGE_TILES.includes(t.type) && (!t.imageBriefing || t.imageBriefing.length < 30)) {
        warnings.push(`${page.name}: ${t.type} hat kein/zu kurzes Bild-Briefing`);
      }
    });
  });

  return { pages, warnings };
}

// ═══════════════════════════════════════════════════════
// MAIN API HANDLER
// ═══════════════════════════════════════════════════════
export default async function handler(req, res) {
  // CORS headers for production
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action } = req.body;

  try {
    // ──────────────────────────────────────
    // MODE 1: SINGLE STEP (client controls flow)
    // ──────────────────────────────────────
    if (action === "step") {
      const { step } = req.body;

      if (step === "research") {
        const { brandName, marketplace, category, additionalInfo } = req.body;
        const lang = LANG_MAP[marketplace] || "German";
        const result = await callClaude(
          PROMPTS.research,
          `Research the brand "${brandName}" for marketplace Amazon.${marketplace}.\n${category ? `Category hint: ${category}` : ""}${additionalInfo ? `\nAdditional info: ${additionalInfo}` : ""}\nRespond in English for JSON structure, brand content in ${lang}.`,
          true
        );
        return res.status(200).json({ step: "research", data: result });
      }

      if (step === "amazon") {
        const { brandName, marketplace, brandProfile } = req.body;
        const result = await callClaude(
          PROMPTS.amazon,
          `Find Amazon products for brand "${brandName}" on Amazon.${marketplace}.\nKnown categories: ${(brandProfile?.categories || []).join(", ")}`,
          true
        );
        return res.status(200).json({ step: "amazon", data: result });
      }

      if (step === "architecture") {
        const { brandName, marketplace, brandProfile, amazonData } = req.body;
        const lang = LANG_MAP[marketplace] || "German";
        const result = await callClaude(
          PROMPTS.architecture,
          `Create store architecture for:\n\nBRAND PROFILE:\n${JSON.stringify(brandProfile, null, 2)}\n\nAMAZON DATA:\n- ${amazonData?.products?.length || 0} products\n- Categories: ${(amazonData?.amazonCategories || []).join(", ")}\n- Has existing store: ${amazonData?.hasExistingStore}\n${amazonData?.hasExistingStore ? `- Existing pages: ${(amazonData?.existingStorePages || []).join(", ")}` : ""}\n\nMarketplace: Amazon.${marketplace}, Language: ${lang}`,
          false
        );
        return res.status(200).json({ step: "architecture", data: result });
      }

      if (step === "content") {
        const { marketplace, brandProfile, amazonData, pagePlan } = req.body;
        const lang = LANG_MAP[marketplace] || "German";
        const curr = CURR_MAP[marketplace] || "€ (EUR)";
        const result = await callClaude(
          PROMPTS.content,
          `Create content for this store page:\n\nPAGE: ${JSON.stringify(pagePlan)}\n\nBRAND PROFILE:\n${JSON.stringify(brandProfile)}\n\nAMAZON PRODUCTS (use real ASINs!):\n${JSON.stringify((amazonData?.products || []).slice(0, 20))}\n\nMarketplace: Amazon.${marketplace}\nLanguage: ${lang}\nCurrency: ${curr}\nBrand colors: ${JSON.stringify(brandProfile?.colors)}`,
          false
        );
        return res.status(200).json({ step: "content", data: result });
      }

      return res.status(400).json({ error: `Unknown step: ${step}` });
    }

    // ──────────────────────────────────────
    // MODE 2: FULL GENERATION (server runs all 5 steps)
    // ──────────────────────────────────────
    if (action === "generate") {
      const { brandName, marketplace, category, additionalInfo } = req.body;
      if (!brandName) return res.status(400).json({ error: "brandName is required" });

      const lang = LANG_MAP[marketplace] || "German";
      const curr = CURR_MAP[marketplace] || "€ (EUR)";
      const log = [];

      // Step 1: Research
      log.push("Step 1/5: Researching brand...");
      const brandProfile = await callClaude(
        PROMPTS.research,
        `Research the brand "${brandName}" for marketplace Amazon.${marketplace}.\n${category ? `Category hint: ${category}` : ""}${additionalInfo ? `\nAdditional info: ${additionalInfo}` : ""}\nRespond in English for JSON structure, brand content in ${lang}.`,
        true
      );
      log.push(`Brand type: ${brandProfile.type}, ${brandProfile.categories?.length || 0} categories, tone: ${brandProfile.tone}`);

      // Step 2: Amazon Data
      log.push("Step 2/5: Searching Amazon products...");
      const amazonData = await callClaude(
        PROMPTS.amazon,
        `Find Amazon products for brand "${brandName}" on Amazon.${marketplace}.\nKnown categories: ${(brandProfile.categories || []).join(", ")}`,
        true
      );
      log.push(`Found ${amazonData.products?.length || 0} products, existing store: ${amazonData.hasExistingStore}`);

      // Step 3: Architecture
      log.push("Step 3/5: Creating page architecture...");
      const architecture = await callClaude(
        PROMPTS.architecture,
        `Create store architecture for:\n\nBRAND PROFILE:\n${JSON.stringify(brandProfile, null, 2)}\n\nAMAZON DATA:\n- ${amazonData.products?.length || 0} products\n- Categories: ${(amazonData.amazonCategories || []).join(", ")}\n- Has existing store: ${amazonData.hasExistingStore}\n\nMarketplace: Amazon.${marketplace}, Language: ${lang}`,
        false
      );
      log.push(`Architecture: ${architecture.pages?.length || 0} pages planned`);

      // Step 4: Content per page
      log.push("Step 4/5: Generating content per page...");
      const builtPages = [];
      for (const pagePlan of architecture.pages || []) {
        log.push(`  Generating: ${pagePlan.name}`);
        const pageContent = await callClaude(
          PROMPTS.content,
          `Create content for this store page:\n\nPAGE: ${JSON.stringify(pagePlan)}\n\nBRAND PROFILE:\n${JSON.stringify(brandProfile)}\n\nAMAZON PRODUCTS:\n${JSON.stringify((amazonData.products || []).slice(0, 20))}\n\nMarketplace: Amazon.${marketplace}\nLanguage: ${lang}\nCurrency: ${curr}\nBrand colors: ${JSON.stringify(brandProfile.colors)}`,
          false
        );
        builtPages.push({
          id: pagePlan.id || `page_${builtPages.length}`,
          name: pageContent.pageName || pagePlan.name,
          heroImageBriefing: pageContent.heroImageBriefing || "",
          tiles: (pageContent.tiles || []).filter(t => VALID_TILES.includes(t.type)),
        });
        log.push(`  Done: ${builtPages[builtPages.length - 1].tiles.length} tiles`);
      }

      // Step 5: Validation
      log.push("Step 5/5: Validating store...");
      const validated = validateStore(builtPages);
      validated.warnings.forEach(w => log.push(`  Warning: ${w}`));
      log.push(`Complete: ${builtPages.length} pages, ${builtPages.reduce((a, p) => a + p.tiles.length, 0)} tiles`);

      return res.status(200).json({
        brandName,
        brandProfile,
        amazonData,
        pages: validated.pages,
        warnings: validated.warnings,
        log,
      });
    }

    // ──────────────────────────────────────
    // MODE 3: REFINE existing store
    // ──────────────────────────────────────
    if (action === "refine") {
      const { store, instruction } = req.body;
      if (!store || !instruction) return res.status(400).json({ error: "store and instruction required" });

      // Strip base64 images before sending
      const storeClean = JSON.parse(JSON.stringify(store));
      (storeClean.pages || []).forEach(p => (p.tiles || []).forEach(t => { delete t.image; }));

      const result = await callClaude(
        PROMPTS.refine,
        `CURRENT STORE:\n${JSON.stringify(storeClean, null, 2)}\n\nCHANGE: ${instruction}\n\nReturn complete updated JSON with all pages and tiles.`,
        false
      );

      if (result.pages?.length) {
        const validated = validateStore(result.pages);
        return res.status(200).json({
          ...result,
          pages: validated.pages,
          warnings: validated.warnings,
        });
      }
      return res.status(200).json(result);
    }

    return res.status(400).json({ error: `Unknown action: ${action}. Use "generate", "step", or "refine".` });

  } catch (error) {
    console.error("Amazon Store Builder API Error:", error);
    return res.status(500).json({ error: error.message, stack: process.env.NODE_ENV === "development" ? error.stack : undefined });
  }
}
