// ASIN Liste plus Mapping für Juskys Brand Store.
// Quelle: User Daten aus Helium 10 oder Juskys interner Liste.
//
// Mapping wendet unsere Split Entscheidungen an:
//   Wohnen > Badausstattung    → Möbel
//   Wohnen > Kinderbedarf      → Haushalt
//   Wohnen > Elektrokamine & Heizungen → Heimwerken
//   Wohnen > Haushalt          → Haushalt
//   Heimwerken > Lagerregale   → Haushalt > Schwerlastregale
//   Heimwerken > Heizgeräte    → Haushalt
//   Unterwegs & Freizeit > Alltagshilfen → Haushalt
//   Unterwegs & Freizeit ohne Sub → Freizeit > Sport

// ─── SUB MAPPING TABLE ────────────────────────────────────

export var SUB_MAPPING = {
  // Möbel (alle aus Wohnen außer Sub Splits)
  'Wohnen > Sofas': { cat: 'Möbel', sub: 'Sofas' },
  'Wohnen > Polsterbetten': { cat: 'Möbel', sub: 'Polsterbetten' },
  'Wohnen > Boxspringbetten': { cat: 'Möbel', sub: 'Boxspringbetten' },
  'Wohnen > Metallbetten': { cat: 'Möbel', sub: 'Metallbetten' },
  'Wohnen > Kinderbetten': { cat: 'Möbel', sub: 'Kinderbetten' },
  'Wohnen > Wohn- & Esszimmermöbel': { cat: 'Möbel', sub: 'Wohnmöbel' },
  'Wohnen > Massagesessel': { cat: 'Möbel', sub: 'Massagesessel' },
  'Wohnen > Büromöbel': { cat: 'Möbel', sub: 'Büromöbel' },
  'Wohnen > Matratzen & Topper': { cat: 'Möbel', sub: 'Matratzen' },
  'Wohnen > Schlafkomfort': { cat: 'Möbel', sub: 'Schlafkomfort' },
  'Wohnen > Schminktische': { cat: 'Möbel', sub: 'Schminktische' },
  'Wohnen > Badausstattung': { cat: 'Möbel', sub: 'Badausstattung' },

  // Haushalt
  'Wohnen > Kinderbedarf': { cat: 'Haushalt', sub: 'Kinderbedarf' },
  'Wohnen > Haushalt': { cat: 'Haushalt', sub: 'Küchengeräte' },
  'Heimwerken > Lagerregale': { cat: 'Haushalt', sub: 'Schwerlastregale' },
  'Heimwerken > Heizgeräte': { cat: 'Haushalt', sub: 'Heizgeräte' },
  'Unterwegs & Freizeit > Alltagshilfen': { cat: 'Haushalt', sub: 'Alltagshilfen' },

  // Heimwerken
  'Heimwerken > Werkzeug': { cat: 'Heimwerken', sub: 'Werkzeug' },
  'Heimwerken > Multifunktionsleitern': { cat: 'Heimwerken', sub: 'Multifunktionsleitern' },
  'Heimwerken > Sackkarren': { cat: 'Heimwerken', sub: 'Sackkarren' },
  'Wohnen > Elektrokamine & Heizungen': { cat: 'Heimwerken', sub: 'Elektrokamine' },

  // Garten 1 zu 1
  'Garten > Gartenmöbel Sets': { cat: 'Garten', sub: 'Gartenmöbel Sets' },
  'Garten > Gartenaufbewahrung': { cat: 'Garten', sub: 'Gartenaufbewahrung' },
  'Garten > Gartenbedarf': { cat: 'Garten', sub: 'Gartenbedarf' },
  'Garten > Sonnen & Sichtschutz': { cat: 'Garten', sub: 'Sonnenschutz' },
  'Garten > Gartenliegen': { cat: 'Garten', sub: 'Gartenliegen' },
  'Garten > Gartenbänke': { cat: 'Garten', sub: 'Gartenbänke' },
  'Garten > Gartentische': { cat: 'Garten', sub: 'Gartentische' },
  'Garten > Bierzeltgarnituren': { cat: 'Garten', sub: 'Bierzeltgarnituren' },
  'Garten > Kissenboxen': { cat: 'Garten', sub: 'Kissenboxen' },
  'Garten > Gas- und Holzkohlegrills': { cat: 'Garten', sub: 'Grills' },
  'Garten > Hängematten & Hängesessel': { cat: 'Garten', sub: 'Hängematten' },
  'Garten > Überdachungen': { cat: 'Garten', sub: 'Überdachungen' },
  'Garten > Poolbedarf': { cat: 'Garten', sub: 'Poolbedarf' },
  'Garten > Gewächshäuser': { cat: 'Garten', sub: 'Gewächshäuser' },

  // Tierbedarf 1 zu 1
  'Tierbedarf > Hundebedarf': { cat: 'Tierbedarf', sub: 'Hundebedarf' },
  'Tierbedarf > Katzenbedarf': { cat: 'Tierbedarf', sub: 'Katzenbedarf' },
  'Tierbedarf > Freilaufgehege': { cat: 'Tierbedarf', sub: 'Freilaufgehege' },

  // Freizeit (aus Unterwegs & Freizeit)
  'Unterwegs & Freizeit > Camping': { cat: 'Freizeit', sub: 'Camping' },
  'Unterwegs & Freizeit > Dachzelte': { cat: 'Freizeit', sub: 'Dachzelte' },
  'Unterwegs & Freizeit > Koffersets': { cat: 'Freizeit', sub: 'Koffersets' },
  'Unterwegs & Freizeit': { cat: 'Freizeit', sub: 'Sport' }, // bare top → Sport Default
};

// ─── SPEZIAL ASIN OVERRIDES ───────────────────────────────
// Für ASINs die Doppel Mapping brauchen oder vom Standard abweichen.
// Format: { cat, sub, also: [{cat, sub}, ...] }

export var SPECIAL_ASINS = {
  // Doppel: Outdoor Heizstrahler + Glasheizung sind sowohl Heimwerken Heizgeräte als auch Wohnen Elektrokamine
  'B0CJRMN1JH': { cat: 'Haushalt', sub: 'Heizgeräte', also: [{ cat: 'Heimwerken', sub: 'Elektrokamine' }] },
  'B0FQCMFLLY': { cat: 'Haushalt', sub: 'Heizgeräte', also: [{ cat: 'Heimwerken', sub: 'Elektrokamine' }] },

  // Wohnen > Haushalt Untergliederung nach Produkttyp
  'B0CK4QSWF9': { cat: 'Haushalt', sub: 'Mülleimer' }, // Mülleimer Küche 50L
  'B0D5QK6TLM': { cat: 'Haushalt', sub: 'Eiswürfelmaschinen' },
  'B0CD7VC4D8': { cat: 'Haushalt', sub: 'Aufbewahrung' }, // Aufbewahrungsbox 6er Set

  // Polsterbett mit Doppel Tagging Polster + Kinder
  'B0BKQ6XDKV': { cat: 'Möbel', sub: 'Polsterbetten', also: [{ cat: 'Möbel', sub: 'Kinderbetten' }] },
  'B0BSQKWT89': { cat: 'Möbel', sub: 'Polsterbetten', also: [{ cat: 'Möbel', sub: 'Kinderbetten' }] },
  'B0CCRQGD6P': { cat: 'Möbel', sub: 'Polsterbetten', also: [{ cat: 'Möbel', sub: 'Kinderbetten' }] },
};

// ─── PARSE ROW ────────────────────────────────────────────
// Nimmt ein einzelnes Daten Objekt (asin, title, visible, paths)
// und liefert das Store ASIN Objekt mit cat, sub, plus (optional) also Liste

export function mapAsin(row) {
  if (!row.visible) return null;

  // Spezial ASIN Override hat Vorrang
  if (SPECIAL_ASINS[row.asin]) {
    var sp = SPECIAL_ASINS[row.asin];
    return {
      asin: row.asin,
      title: row.title || '',
      category: sp.cat,
      subcategory: sp.sub,
      also: sp.also || [],
      onHomepage: row.onHomepage || false,
      isBestseller: row.isBestseller || false,
    };
  }

  // Default Mapping über Sub Path
  var paths = (row.paths || []).filter(function(p) { return p && p !== 'Startseite'; });
  // bevorzuge den präzisesten Pfad (mit ' > ')
  var precise = paths.find(function(p) { return p.indexOf(' > ') >= 0; });
  var pathKey = precise || paths[0];
  var mapped = pathKey ? SUB_MAPPING[pathKey] : null;
  if (!mapped) return null;

  return {
    asin: row.asin,
    title: row.title || '',
    category: mapped.cat,
    subcategory: mapped.sub,
    also: [],
    onHomepage: row.onHomepage || false,
    isBestseller: row.isBestseller || false,
  };
}

// ─── ROH DATEN ────────────────────────────────────────────
// Wird in Schritt 2b befüllt. Format pro Eintrag:
// { asin, title, visible: true, paths: ['Garten > Gartenmöbel Sets'], onHomepage: false }

export var RAW_ASINS = [];

// Liefert die strukturierte ASIN Liste (alle visible mit Mapping)
export function getStructuredAsins() {
  return RAW_ASINS.map(mapAsin).filter(Boolean);
}
