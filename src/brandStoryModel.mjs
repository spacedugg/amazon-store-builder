export const SPECS = {
  desktop: [3660, 1563],
  mobile: [1389, 1875],
  media: [814, 1019],
  product: [1328, 1456],
};
const MIN = {
  desktop: [1464, 625],
  mobile: [463, 625],
  media: [362, 453],
  product: [166, 182],
};
export const uid = () => crypto.randomUUID();
export function newStory(brandName = "") {
  return {
    schemaVersion: 1,
    brandName,
    marketplace: "de",
    language: "de",
    instructions: "",
    brandFacts: "",
    background: { desktop: null, mobile: null, brief: "", copy: "" },
    cards: [],
    references: [],
  };
}
export function newCard(type, cards = []) {
  let assetIndex = 1;
  while (
    cards.some(
      (c) =>
        c.type === type &&
        (c.assetFile ===
          `Brand Media Assets/media asset image ${assetIndex}.jpg` ||
          c.slots?.some(
            (slot) =>
              slot.assetFile === `ASIN Grids/ASIN image ${assetIndex}a.jpg`,
          )),
    )
  )
    assetIndex++;

  let n = 1;
  while (cards.some((c) => c.fileKey === `card-${String(n).padStart(2, "0")}`))
    n++;
  return {
    id: uid(),
    fileKey: `card-${String(n).padStart(2, "0")}`,
    type,
    assetFile:
      type === "media"
        ? `Brand Media Assets/media asset image ${assetIndex}.jpg`
        : "",
    headline: "",
    brief: "",
    copy: "",
    image: null,
    shopUrl: "",
    slots:
      type === "grid"
        ? Array.from({ length: 4 }, (_, i) => ({
            assetFile: `ASIN Grids/ASIN image ${assetIndex}${"abcd"[i]}.jpg`,
            asin: "",
            url: "",
            image: null,
            productImage: null,
          }))
        : [],
  };
}
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}
export function productUrl(slot, marketplace = "de") {
  return (
    safeUrl(slot.url) ||
    (/^[A-Z0-9]{10}$/i.test(slot.asin)
      ? `https://www.amazon.${marketplace}/dp/${slot.asin}`
      : "")
  );
}
export function imageWarnings(image, kind) {
  if (!image) return [];
  const out = [],
    [w, h] = MIN[kind];
  if (image.width < w || image.height < h)
    out.push("Bildauflösung zu gering. Bitte eine größere Datei hochladen.");
  if (image.size > 2 * 1024 * 1024)
    out.push("Datei überschreitet 2 MB. Bitte komprimieren.");
  if (
    Math.abs(image.width / image.height - SPECS[kind][0] / SPECS[kind][1]) >
    0.03
  )
    out.push(
      "Seitenverhältnis weicht vom vorgesehenen Format ab. Zuschnitt prüfen.",
    );
  return out;
}
export function offsets(count, mobile = false) {
  if (mobile) return Array.from({ length: count }, (_, i) => i);
  const out = [0];
  for (let i = 2; i < count; i += 3) out.push(i + 1);
  return out;
}
export function validateStory(s) {
  const text = (v) => v === undefined || typeof v === "string";
  const image = (v, metadata = true) =>
    !v ||
    (typeof v === "object" &&
      !!safeUrl(v.url) &&
      (!metadata ||
        ["width", "height", "size"].every(
          (k) => Number.isFinite(v[k]) && v[k] >= 0,
        )));

  if (
    !s ||
    s.schemaVersion !== 1 ||
    typeof s.brandName !== "string" ||
    !s.brandName.trim()
  )
    throw Error("Markenname und schemaVersion: 1 erforderlich.");
  if (
    ![
      "de",
      "com",
      "co.uk",
      "fr",
      "it",
      "es",
      "nl",
      "se",
      "pl",
      "com.be",
    ].includes(s.marketplace)
  )
    throw Error("Marktplatz ungültig.");
  if (!s.background || !Array.isArray(s.cards) || s.cards.length > 19)
    throw Error("Hintergrund und maximal 19 Karten erforderlich.");
  if (
    !["language", "instructions", "brandFacts"].every((k) => text(s[k])) ||
    !["brief", "copy"].every((k) => text(s.background[k]))
  )
    throw Error("Textfelder müssen Text enthalten.");
  if (!image(s.background.desktop) || !image(s.background.mobile))
    throw Error("Ungültiges Hintergrundbild.");
  if (
    s.references &&
    (!Array.isArray(s.references) ||
      s.references.length > 30 ||
      s.references.some((r) => !image(r) || !text(r.name)))
  )
    throw Error("Ungültige Designreferenzen.");
  const ids = new Set(),
    keys = new Set();
  for (const c of s.cards) {
    if (
      typeof c.id !== "string" ||
      !c.id ||
      !/^card-\d{2,}$/.test(c.fileKey) ||
      ids.has(c.id) ||
      keys.has(c.fileKey)
    )
      throw Error("Karten benötigen eindeutige IDs und Dateischlüssel.");
    ids.add(c.id);
    keys.add(c.fileKey);
    if (
      !["headline", "brief", "copy", "shopUrl", "assetFile"].every((k) =>
        text(c[k]),
      ) ||
      !image(c.image)
    )
      throw Error("Ungültige Kartenfelder.");
    if (!["media", "grid"].includes(c.type))
      throw Error("Nur Bildkarten und ASIN-Grids sind zulässig.");
    if (c.type === "grid" && (!Array.isArray(c.slots) || c.slots.length !== 4))
      throw Error("Ein ASIN-Grid benötigt vier Plätze.");
    if (c.type === "grid" && (c.headline || "").length > 30)
      throw Error("Grid-Überschrift darf maximal 30 Zeichen enthalten.");
    for (const slot of c.slots || []) {
      if (
        !slot ||
        !text(slot.asin) ||
        !text(slot.assetFile) ||
        !text(slot.url) ||
        !image(slot.image) ||
        !image(slot.productImage, false)
      )
        throw Error("Ungültiger Grid-Platz.");
      if (slot.asin && !/^[A-Z0-9]{10}$/i.test(slot.asin))
        throw Error("ASIN muss zehn Buchstaben oder Ziffern enthalten.");
    }
  }
  return s;
}
export function publicationWarnings(s) {
  const out = [];
  for (const k of ["desktop", "mobile"]) {
    if (!s.background[k]) out.push(`Hintergrund ${k} fehlt.`);
    out.push(...imageWarnings(s.background[k], k));
  }
  if (!s.cards.length) out.push("Es fehlen Karten.");
  s.cards.forEach((c, i) => {
    if (c.type === "media") {
      if (!c.image) out.push(`Karte ${i + 1}: Bild fehlt.`);
      out.push(...imageWarnings(c.image, "media"));
    } else {
      if (!c.headline) out.push(`Karte ${i + 1}: Überschrift fehlt.`);
      if (!safeUrl(c.shopUrl)) out.push(`Karte ${i + 1}: Shop-Ziel fehlt.`);
      c.slots.forEach((slot, j) => {
        if (!slot.image && !slot.productImage)
          out.push(`Karte ${i + 1}, Platz ${j + 1}: Bild fehlt.`);
        if (!productUrl(slot, s.marketplace))
          out.push(`Karte ${i + 1}, Platz ${j + 1}: Produktziel fehlt.`);
        out.push(...imageWarnings(slot.image, "product"));
      });
    }
  });
  return [...new Set(out)];
}
export function customerStory(s) {
  return {
    brandName: s.brandName,
    marketplace: s.marketplace,
    language: s.language,
    background: { desktop: s.background.desktop, mobile: s.background.mobile },
    cards: s.cards.map((c) => ({
      id: c.id,
      type: c.type,
      image: c.image,
      headline: c.headline,
      shopUrl: safeUrl(c.shopUrl),
      slots: (c.slots || []).map((slot) => ({
        asin: slot.asin,
        url: productUrl(slot, s.marketplace),
        image: slot.image,
        productImage: slot.productImage,
      })),
    })),
  };
}
export const DESIGN_RULES = `Create an Amazon Brand Story using image cards and four-product grids only. Desktop background: 3660 × 1563 px. Mobile background: 1389 × 1875 px. Image cards: 814 × 1019 px. Each grid image: 1328 × 1456 px. JPG/PNG, maximum 2 MB per file.
A media card may match the background color and contain only a logo and hashtag. It remains a real card that scrolls. Background logos may be intentionally covered in earlier states and revealed in the final state when fewer cards remain. Four grid images may form one composite picture, with the same ASIN or destination repeated in all four slots; distinct products are not required. Design the four quadrants top-left, top-right, bottom-left, bottom-right while accounting for the visible grid gutters.
Delivery folders: Hintergrund (Hintergrund_Desktop.jpg, Hintergrund_Mobile.jpg), Brand Media Assets (media asset image N.jpg), ASIN Grids (ASIN image Na.jpg through Nd.jpg), Preview Neu (Preview_01.jpg and subsequent carousel states). Set assetFile on cards and slots to the intended delivery path and preserve these paths when reordering. Previews are review files, not card images.
The background is stationary. Desktop starts with a free area on the left, two full cards and a partial third. Subsequent views advance three card positions. Plan the left motif inside the area covered by a card after advancing, or intentionally let a larger photographic motif remain partly visible. Review all carousel states. Mobile has no introductory free area. Essential claims and trust factors belong on cards; avoid duplicate background and card copy.
Embed all card copy in designed images except the grid headline (maximum 30 characters) and the fixed Shop besuchen link. Every grid has four independently linked slots, each with a product image or custom designed image. Product target and displayed image are independent. Do not use About Brand or Questions modules.
Customer-facing copy uses the selected marketplace language. Designer briefs must be English. Do not invent claims, ASINs, certifications or brand history. Brand-wide USPs must apply across the portfolio. Never promote shipping or delivery as brand benefits. Do not use en/em dashes in customer copy. Use other brands only as structural references, never copy their claims, branding or specific designs.`;
export function claudePrompt(s) {
  return `${DESIGN_RULES}\n\nBrand: ${s.brandName}\nLanguage: ${s.language}\nVerified brand facts:\n${s.brandFacts}\nInternal instructions:\n${s.instructions}\n\nReturn a complete JSON object following the supplied schema. Card schemas: {"id":"unique-id","fileKey":"card-01","type":"media","brief":"English composition instructions","copy":"Exact customer-facing copy","image":null,"slots":[]} or {"id":"unique-id","fileKey":"card-02","type":"grid","headline":"Grid headline","brief":"English brief","copy":"","shopUrl":"https://www.amazon.de/stores/...","slots":[{"asin":"","url":"","image":null,"productImage":null},{"asin":"","url":"","image":null,"productImage":null},{"asin":"","url":"","image":null,"productImage":null},{"asin":"","url":"","image":null,"productImage":null}]}. Preserve existing IDs, fileKey values and image objects. Add new cards with unique IDs and unused card-NN fileKey values. Use brief for English designer directions and copy for exact on-image text. Keep the story understandable using cards alone. Ask for missing factual sources before producing final copy.\n\n${JSON.stringify(s, null, 2)}`;
}

export function resolveUploadTarget(story, path) {
  const normalized = path
    .replaceAll("\\", "/")
    .toLowerCase()
    .replace(/\.(png|jpe?g)$/, "");
  const basename = normalized.split("/").pop();
  const matches = (canonical, alias) =>
    basename === canonical ||
    (alias &&
      (normalized === alias.toLowerCase().replace(/\.(png|jpe?g)$/, "") ||
        normalized.endsWith(
          "/" + alias.toLowerCase().replace(/\.(png|jpe?g)$/, ""),
        )));
  const found = [];
  for (const kind of ["desktop", "mobile"])
    if (
      matches("background-" + kind, "Hintergrund/Hintergrund_" + kind + ".jpg")
    )
      found.push({ kind });
  for (const c of story.cards) {
    if (c.type === "media" && matches(c.fileKey, c.assetFile))
      found.push({ kind: "media", cardId: c.id });
    if (c.type === "grid")
      c.slots.forEach((slot, i) => {
        if (matches(c.fileKey + "-" + (i + 1), slot.assetFile))
          found.push({ kind: "product", cardId: c.id, slot: i });
      });
  }
  if (found.length > 1)
    throw Error(
      "Dateiname passt zu mehreren Bildplätzen. Zuordnung im Editor korrigieren.",
    );
  return found[0] || null;
}
