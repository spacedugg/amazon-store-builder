import { validatePlanning } from './brandStoryPlanning.mjs';
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
    ...(type === "grid" ? { gridMode: "individual" } : {}),
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
            brief: "Use the original Amazon product main image unchanged.",
            imageMode: "product",
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
export function gridMode(card) {
  return card.gridMode ?? 'composite';
}
export function slotImageMode(slot, card) {
  if (card?.type === 'grid' && gridMode(card) === 'composite') return 'custom';
  return slot.imageMode ?? (slot.image ? 'custom' : 'product');
}
export function slotDisplayImage(slot, card) {
  return (slotImageMode(slot, card) === 'custom' ? slot.image : slot.productImage) || null;
}
export function productAsin(slot, marketplace = 'de') {
  const destination = safeUrl(slot.url);
  if (!destination) return /^[A-Z0-9]{10}$/i.test(slot.asin || '') ? slot.asin.toUpperCase() : '';
  try {
    const url = new URL(destination);
    const host = url.hostname.replace(/^(?:www\.|smile\.|m\.)/, '');
    if (host !== `amazon.${marketplace}`) return '';
    return url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1].toUpperCase() || '';
  } catch { return ''; }
}
export function sharingErrors(story) {
  const out = [], hasText = value => typeof value === 'string' && !!value.trim();
  for (const [kind, label] of [['desktop', 'Desktop'], ['mobile', 'Mobil']]) {
    if (!hasText(story.background?.[kind + 'Brief'] ?? story.background?.brief)) out.push(`Hintergrund ${label}: Beschreibung fehlt.`);
  }
  if (!story.cards?.length) out.push('Mindestens eine Karte ist erforderlich.');
  if (story.cards?.length > 19) out.push('Maximal 19 Karten sind zulässig.');
  (story.cards || []).forEach((card, i) => {
    const label = `Karte ${i + 1}`;
    if (card.type === 'media' || gridMode(card) === 'composite') {
      if (!hasText(card.brief)) out.push(`${label}: Beschreibung fehlt.`);
    }
    if (card.type !== 'grid') return;
    if (gridMode(card) === 'composite' && new Set((card.slots || []).map(slot=>productUrl(slot, story.marketplace))).size > 1) out.push(`${label}: Für das Gesamtbild ein gemeinsames Produktziel festlegen.`);
    if (!hasText(card.headline)) out.push(`${label}: Überschrift fehlt.`);
    if (!safeUrl(card.shopUrl)) out.push(`${label}: gültiger Shop-Link fehlt.`);
    for (let j = 0; j < 4; j++) {
      const slot = card.slots?.[j] || {};
      if (!productUrl(slot, story.marketplace)) out.push(`${label}, Platz ${j + 1}: gültiges Produktziel (ASIN oder URL) fehlt.`);
      if (gridMode(card) === 'individual' && !hasText(slot.brief)) out.push(`${label}, Platz ${j + 1}: Beschreibung fehlt.`);
    }
  });
  return out;
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
  if ('mobileCards' in s || 'desktopCards' in s)
    throw Error('Desktop und Mobil verwenden eine gemeinsame Kartenliste.');
  if (s.planning !== undefined) validatePlanning(s.planning);
  if (s.context && (typeof s.context !== 'object' || Array.isArray(s.context) || Object.values(s.context).some(v => typeof v !== 'string')))
    throw Error('Markeninformationen müssen Text enthalten.');
  if (!['desktopBrief', 'mobileBrief', 'desktopCopy', 'mobileCopy'].every(k => text(s.background[k])))
    throw Error('Hintergrundbeschreibungen müssen Text enthalten.');
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
      !["title", "headline", "brief", "copy", "shopUrl", "assetFile"].every((k) =>
        text(c[k]),
      ) ||
      !image(c.image)
    )
      throw Error("Ungültige Kartenfelder.");
    if (c.gridMode !== undefined && !["individual", "composite"].includes(c.gridMode))
      throw Error("Ungültiger Grid-Modus.");
    if (!["media", "grid"].includes(c.type))
      throw Error("Nur Bildkarten und ASIN-Grids sind zulässig.");
    if (c.type === "grid" && (!Array.isArray(c.slots) || c.slots.length !== 4))
      throw Error("Ein ASIN-Grid benötigt vier Plätze.");
    if (c.type === "grid" && (c.headline || "").length > 30)
      throw Error("Grid-Überschrift darf maximal 30 Zeichen enthalten.");
    for (const slot of c.slots || []) {
      if (
        !slot ||
        !text(slot.brief) ||
        (slot.imageMode !== undefined && !["product", "custom"].includes(slot.imageMode)) ||
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
        if (!slotDisplayImage(slot, c))
          out.push(`Karte ${i + 1}, Platz ${j + 1}: Bild fehlt.`);
        if (!productUrl(slot, s.marketplace))
          out.push(`Karte ${i + 1}, Platz ${j + 1}: Produktziel fehlt.`);
        if (slotImageMode(slot, c) === "custom") out.push(...imageWarnings(slot.image, "product"));
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
      fileKey: c.fileKey,
      ...(c.type === 'grid' ? {gridMode:gridMode(c)} : {}),
      assetFile: c.assetFile,
      copy: c.copy,
      image: c.image,
      headline: c.headline,
      shopUrl: safeUrl(c.shopUrl),
      slots: (c.slots || []).map((slot) => ({
        imageMode: slotImageMode(slot, c),
        asin: slot.asin,
        assetFile: slot.assetFile,
        url: productUrl(slot, s.marketplace),
        image: slot.image,
        productImage: slot.productImage,
      })),
    })),
  };
}
export { DESIGN_RULES, claudePrompt } from './brandStoryPrompt.mjs';

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
