// Patch Startseite Rerun-v3-Blueprint mit Vision-Beobachtungen von 2026-04-21.
// Live-Store hat sich seit Gold gedriftet, daher werden zwei Module konkret
// ueberschrieben statt aus Gold uebernommen.

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BP = path.join(ROOT, 'data/store-knowledge/rerun-v3/blueprints/natural-elements_startseite.json');
const AGG = path.join(ROOT, 'data/store-knowledge/rerun-v3/natural-elements_analysis.json');

const data = JSON.parse(fs.readFileSync(BP, 'utf8'));
const agg = JSON.parse(fs.readFileSync(AGG, 'utf8'));

// Modul position=2: Hero Split Video → Static Product Hero "Neue Produkte? OH YEAH!"
function patchHero(mod) {
  mod.moduleName = 'Hero Neuheiten OH YEAH';
  mod.layoutType = 'hero_banner';
  mod.layoutShape = 'full_width_banner';
  mod.designIntent = 'emotional_hook';
  mod.designIntentDetail = 'Typografischer, produktzentrierter Hero mit schwungvollem Handschrift-Treatment auf "OH YEAH!" und schwarzem NEU-Badge als Neuheiten-Anker. Statische Produktbuehne statt Lifestyle-Video, klare Verkaufsabsicht.';
  mod.structuralPattern = 'Full-width Hero, links Typografie und Textpfeil-CTA, rechts Produktstillleben mit drei Flaschen, rechts oben Kreis-Badge NEU.';
  mod.backgroundStyle = 'solid_color';
  mod.backgroundDetail = 'Off-White mit dezenter zartrosa Atmosphaere, weicher Schatten unter den Produkten.';
  mod.textOnImage = {
    visibleText: 'Neue Produkte? OH YEAH!',
    textType: 'headline_cta',
    origin: 'baked_in',
    headline: 'Neue Produkte?',
    subline: 'OH YEAH!',
    cta: 'NEUHEITEN ENTDECKEN',
    directionCues: 'Pfeil nach rechts vor der CTA',
  };
  mod.tiles = [{
    position: 1,
    imageCategory: 'product',
    visualContent: 'Drei schwarze natural elements Gebinde stehen nebeneinander auf off-weissem Untergrund: links eine kompaktere Supplement-Dose, in der Mitte eine Tropfer-Braunglasflasche, rechts eine groessere Supplement-Dose. Alle mit weissem natural elements Wortbildmarken-Label. Oben rechts dunkles Kreis-Badge mit weisser Schrift "NEU". Links oben in grosser schwarzer Sans-Serif "Neue Produkte?", direkt darunter in einer pinken Handschrift-Type "OH YEAH!". Unter der Headline schwarzer Textpfeil mit Versalien-CTA "NEUHEITEN ENTDECKEN".',
    elementProportions: {
      product_photo: 55,
      solid_background: 25,
      text: 12,
      badge: 5,
      cta_button: 3,
    },
    textOnImage: {
      visibleText: 'Neue Produkte? OH YEAH! NEUHEITEN ENTDECKEN NEU',
      textType: 'headline_cta',
      origin: 'baked_in',
      headline: 'Neue Produkte?',
      subline: 'OH YEAH!',
      cta: 'NEUHEITEN ENTDECKEN',
      directionCues: 'Pfeil nach rechts vor CTA, Kreis-Badge NEU oben rechts',
    },
    ctaText: 'NEUHEITEN ENTDECKEN',
    linksTo: 'Seite unsere Neuheiten',
    backgroundStyle: 'solid_color',
    backgroundDetail: 'Off-White mit Zartrosa-Stich',
    dominantColors: ['Off-White', 'Schwarz', 'Zartrosa'],
    dominantColorsHex: null,
  }];
  mod.tileCount = 1;
}

// Modul position=5: Bestseller Shoppable, Vision-Bestaetigung 2026-04-21
function patchBestseller(mod) {
  mod.moduleName = 'Bestseller Shoppable';
  mod.layoutType = 'shoppable_interactive_image';
  mod.layoutShape = 'interactive_hotspot';
  mod.designIntent = 'product_showcase';
  mod.designIntentDetail = 'Salbeigruenes Produktstillleben als kuratierte Bestseller-Buehne mit Hotspot-Shoppability. Links Typografie-Halbspalte in Hellgrau.';
  mod.structuralPattern = 'Split aus linkem hellgrauen Textpanel (Headline plus CTA Produkte ansehen) und rechter salbei-gruener Produktflaeche mit Botanik-Layern.';
  mod.backgroundStyle = 'split_color_photo';
  mod.backgroundDetail = 'Links Hellgrau-Panel mit "Bestseller direkt hier shoppen." und schwarzem CTA, rechts salbeigruene Flaeche mit botanischem Blattwerk hinter den Flaschen.';
  mod.textOnImage = {
    visibleText: 'Bestseller direkt hier shoppen. Produkte ansehen',
    textType: 'headline_cta',
    origin: 'layered_text',
    headline: 'Bestseller direkt hier shoppen.',
    subline: null,
    cta: 'Produkte ansehen',
    directionCues: null,
  };
  mod.tiles = [{
    position: 1,
    imageCategory: 'product',
    visualContent: 'Shoppable-Stillleben auf zweigeteiltem Hintergrund. Linke Drittelseite hellgrau, rechts salbeigruene Flaeche mit Botanik-Blaettern im Hintergrund. Vier natural elements Produkte reihen sich auf: Vitamin D3 K2 Tabletten (Dose), Vitamin D3 K2 Tropfen (kleine Tropferflasche), Omega 3 aus Fischoel (grosse Dose in der Mitte), Curcuma Extrakt (Dose rechts). Links die Headline in grosser schwarzer Sans-Serif "Bestseller direkt hier shoppen.", darunter schwarzer Pill-Button mit "Produkte ansehen". Hotspots erscheinen bei Hover auf den Produkten.',
    elementProportions: {
      product_photo: 45,
      solid_background: 25,
      photographic_background: 15,
      text: 10,
      cta_button: 5,
    },
    textOnImage: {
      visibleText: 'Bestseller direkt hier shoppen. Produkte ansehen',
      textType: 'headline_cta',
      origin: 'layered_text',
      headline: 'Bestseller direkt hier shoppen.',
      subline: null,
      cta: 'Produkte ansehen',
      directionCues: null,
    },
    ctaText: 'Produkte ansehen',
    linksTo: 'Bestseller Produktdetailseiten ueber Hotspots je Produkt',
    backgroundStyle: 'split_color_photo',
    backgroundDetail: 'Links Hellgrau, rechts Salbeigruen mit Botanik',
    dominantColors: ['Salbeigruen', 'Schwarz', 'Hellgrau', 'Weiss'],
    dominantColorsHex: null,
  }];
  mod.tileCount = 1;
}

// Im Einzel-Blueprint patchen
const hero = data.modules.find(m => m.position === 2);
if (hero) patchHero(hero);
const bestseller = data.modules.find(m => m.position === 5);
if (bestseller) patchBestseller(bestseller);

// openQuestions bereinigen: Drift-Hinweis ersetzen durch Patch-Notiz
data.openQuestions = (data.openQuestions || []).filter(q => !q.includes("Vision-Beobachtung 2026-04-21: Live-Store zeigt im Hero-Bereich"));
data.openQuestions.push(
  "Vision-Nachlauf 2026-04-21 eingearbeitet: Modul position=2 von hero_video_split (Gold) auf hero_banner 'Neue Produkte? OH YEAH!' geaendert. Modul position=5 bleibt shoppable_interactive_image, Vision bestaetigt salbeigruenen Split mit Vitamin D3 K2 Duo, Omega 3 und Curcuma Extrakt."
);

fs.writeFileSync(BP, JSON.stringify(data, null, 2));

// Selbes Patchen im Aggregat
const aggPage = agg.pages.find(p => p.pageName === 'Startseite');
if (aggPage) {
  const aggHero = aggPage.modules.find(m => m.position === 2);
  if (aggHero) patchHero(aggHero);
  const aggBestseller = aggPage.modules.find(m => m.position === 5);
  if (aggBestseller) patchBestseller(aggBestseller);
  aggPage.openQuestions = (aggPage.openQuestions || []).filter(q => !q.includes("Vision-Beobachtung 2026-04-21: Live-Store zeigt im Hero-Bereich"));
  aggPage.openQuestions.push(
    "Vision-Nachlauf 2026-04-21 eingearbeitet: Modul position=2 von hero_video_split (Gold) auf hero_banner 'Neue Produkte? OH YEAH!' geaendert. Modul position=5 bleibt shoppable_interactive_image, Vision bestaetigt salbeigruenen Split mit Vitamin D3 K2 Duo, Omega 3 und Curcuma Extrakt."
  );
}
fs.writeFileSync(AGG, JSON.stringify(agg, null, 2));
console.log('[ok] Startseite Hero und Bestseller gepatcht mit Vision 2026-04-21');
