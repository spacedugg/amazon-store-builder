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

export var RAW_ASINS = [
  // ─── GARTEN ─────────────────────────────────────────────
  { asin: 'B01D1NTA4E', title: 'Juskys Rasenwalze Fritz 60 cm', visible: true, paths: ['Garten > Gartenbedarf'] },
  { asin: 'B071HGY7FT', title: 'Juskys PVC Sichtschutzstreifen 35m anthrazit', visible: true, paths: ['Garten > Sonnen & Sichtschutz'] },
  { asin: 'B07C42GGDW', title: 'Juskys Ampelschirm Brazil 350 cm grau/creme', visible: true, paths: ['Garten > Sonnen & Sichtschutz'] },
  { asin: 'B07FGXFBQ4', title: 'Juskys 2-Sitzer Gartenbank Modena', visible: true, paths: ['Garten > Gartenbänke'] },
  { asin: 'B07FGXKCGK', title: 'Juskys Gartenbank Sanremo 122 cm', visible: true, paths: ['Garten > Gartenbänke'] },
  { asin: 'B07MV853GG', title: 'Juskys Polyrattan Sitzgruppe Fort Myers schwarz/grau', visible: true, paths: ['Garten > Gartenmöbel Sets'] },
  { asin: 'B07NDV9XNS', title: 'Juskys Polyrattan Gartenbank Monaco grau-meliert', visible: true, paths: ['Garten > Gartenmöbel Sets'] },
  { asin: 'B07P7PRG78', title: 'Juskys PVC Sichtschutzstreifen 4er Set anthrazit', visible: true, paths: ['Garten > Sonnen & Sichtschutz'], onHomepage: true },
  { asin: 'B07YZ99NDM', title: 'Juskys Schubkarre 100L 250 kg', visible: true, paths: ['Garten > Gartenbedarf'], onHomepage: true },
  { asin: 'B083Y4PYY1', title: 'JUSKYS Aluminium Gewächshaus 4,75 qm', visible: true, paths: ['Garten > Gewächshäuser'] },
  { asin: 'B084JQYGYM', title: 'Juskys Polyrattan Lounge Manacor Schwarz/Grau', visible: true, paths: ['Garten > Gartenmöbel Sets'], onHomepage: true },
  { asin: 'B08591S6T4', title: 'Juskys Aluminium Gartengarnitur Milano 8+1 Grau', visible: true, paths: ['Garten > Gartenmöbel Sets'] },
  { asin: 'B087FQZV2Y', title: 'Juskys Bierzeltgarnitur Bichl 3-teilig', visible: true, paths: ['Garten > Bierzeltgarnituren'] },
  { asin: 'B087QDPGYJ', title: 'Juskys Solardusche Victoria', visible: true, paths: ['Garten > Poolbedarf'], onHomepage: true },
  { asin: 'B089XXX8XZ', title: 'Juskys Bierzeltgarnitur Amberg Rattan-Optik', visible: true, paths: ['Garten > Bierzeltgarnituren'], onHomepage: true },
  { asin: 'B08L3V12L2', title: 'Juskys Polyrattan Balkonset Bayamo Schwarz/Creme', visible: true, paths: ['Garten > Gartenmöbel Sets'] },
  { asin: 'B08THWGMN4', title: 'Juskys Seitenmarkise Dubai 500 x 190 cm beige', visible: true, paths: ['Garten > Sonnen & Sichtschutz'] },
  { asin: 'B0BG3617K6', title: 'Juskys Terrassenüberdachung Borneo 5,5 x 3 m Dunkelgrau', visible: true, paths: ['Garten > Überdachungen'] },
  { asin: 'B0BGHGSSHX', title: 'Juskys Carport Flachdach 5x3 m Dunkelgrau', visible: true, paths: ['Garten > Überdachungen'] },
  { asin: 'B0BTJ5ZTDV', title: 'Juskys Terrassenüberdachung 4x3 m Grau', visible: true, paths: ['Garten > Überdachungen'] },
  { asin: 'B0BTYY5FYG', title: 'Juskys Doppel Loungebett Kreta Grau', visible: true, paths: ['Garten > Gartenmöbel Sets'] },
  { asin: 'B0BW93BWPQ', title: 'Juskys Wintergarten 12 m² Grau', visible: true, paths: ['Garten > Überdachungen'] },
  { asin: 'B0BX3XGM2F', title: 'Juskys Hängesessel Aria Grau', visible: true, paths: ['Garten > Hängematten & Hängesessel'] },
  { asin: 'B0BZ1397VS', title: 'Juskys Bierzeltgarnitur 220 cm Natur', visible: true, paths: ['Garten > Bierzeltgarnituren'] },
  { asin: 'B0C45Q45QQ', title: 'Juskys Schlauchtrommel 30 m Rot Grau', visible: true, paths: ['Garten > Gartenbedarf'] },
  { asin: 'B0C45RKBYV', title: 'Juskys Schlauchtrommel 30 m Blau Dunkelgrau', visible: true, paths: ['Garten > Gartenbedarf'], onHomepage: true },
  { asin: 'B0C6N1D6S1', title: 'Juskys Balkonmöbel Set Ostana 3-teilig Hellgrau', visible: true, paths: ['Garten > Gartenmöbel Sets'] },
  { asin: 'B0CD7VVBPB', title: 'Juskys Holzunterstand Anbau Links', visible: true, paths: ['Garten > Gartenaufbewahrung'] },
  { asin: 'B0CD7XR3LH', title: 'Juskys Metall Gerätehaus M Holzunterstand rechts', visible: true, paths: ['Garten > Gartenaufbewahrung'] },
  { asin: 'B0CD7ZZ4LG', title: 'Juskys Holzunterstand Enno Anthrazit', visible: true, paths: ['Garten > Gartenaufbewahrung'] },
  { asin: 'B0CHS9ML2L', title: 'Juskys Wintergarten 15 m² Grau', visible: true, paths: ['Garten > Überdachungen'] },
  { asin: 'B0CR1H8BTF', title: 'Juskys Balkonmöbel Set Bala', visible: true, paths: ['Garten > Gartenmöbel Sets'], onHomepage: true },
  { asin: 'B0CR48JPMH', title: 'Juskys Rattan Korbsessel Cody 2er Set Natur', visible: true, paths: ['Garten > Gartenmöbel Sets'] },
  { asin: 'B0CRVS21Q6', title: 'Juskys Sonnenliege Lamia klappbar Grau', visible: true, paths: ['Garten > Gartenliegen'] },
  { asin: 'B0CSYWSLZ6', title: 'Juskys Gartenmöbel Lounge St. Tropez Holz Grau', visible: true, paths: ['Garten > Gartenmöbel Sets'] },
  { asin: 'B0CSZ14149', title: 'Juskys Polyrattan Gartentisch Yoro 60x60 Schwarz', visible: true, paths: ['Garten > Gartentische'] },
  { asin: 'B0CSZ3SGL1', title: 'Juskys Polyrattan Lounge Santorini Schwarz', visible: true, paths: ['Garten > Gartenmöbel Sets'] },
  { asin: 'B0CSZ4VTS9', title: 'Juskys Polyrattan Gartentisch Yoro Ø 80 Schwarz', visible: true, paths: ['Garten > Gartentische'] },
  { asin: 'B0CXJBMHMD', title: 'Juskys Polyrattan Doppelliege Syros Schwarz', visible: true, paths: ['Garten > Gartenliegen'] },
  { asin: 'B0CXJCHQMG', title: 'Juskys Gartenmöbel Bari 5-teilig Lounge Grau', visible: true, paths: ['Garten > Gartenmöbel Sets'] },
  { asin: 'B0D4DVLW4B', title: 'Juskys Hängematte Cata mit Gestell Anthrazit', visible: true, paths: ['Garten > Hängematten & Hängesessel'] },
  { asin: 'B0D4DX12NF', title: 'Juskys Hängematte Paya mit Gestell', visible: true, paths: ['Garten > Hängematten & Hängesessel'] },
  { asin: 'B0D5QLN7GF', title: 'Juskys Gartentisch ausziehbar Laki Anthrazit', visible: true, paths: ['Garten > Gartentische'] },
  { asin: 'B0D734W3QV', title: 'Juskys Rasentraktorheber 400 kg Schwarz', visible: true, paths: ['Garten > Gartenbedarf'] },
  { asin: 'B0DHGMBC6X', title: 'Juskys Poolabdeckung rund 4 m', visible: true, paths: ['Garten > Poolbedarf'] },
  { asin: 'B0DQTZBMSW', title: 'Juskys Aufblasbare Badewanne M', visible: true, paths: ['Garten > Gartenbedarf'] },
  { asin: 'B0DV5K5J2S', title: 'Juskys Lamellendach Tahiti 3x5,9 m Anthrazit', visible: true, paths: ['Garten > Überdachungen'] },
  { asin: 'B0DXFM883Y', title: 'Juskys Senkrechtmarkise Barbados 200x310 cm Grau', visible: true, paths: ['Garten > Sonnen & Sichtschutz'], onHomepage: true },
  { asin: 'B0F1FYNCBL', title: 'Juskys Mähroboter Garage mit Pflanzkasten Anthrazit', visible: true, paths: ['Garten > Gartenbedarf'] },
  { asin: 'B0F54DJW2F', title: 'Juskys Rope Gartenstühle 2er Set Dunkelgrau', visible: true, paths: ['Garten > Gartenmöbel Sets'], onHomepage: true },
  { asin: 'B0F672LPGR', title: 'Juskys Gartenstühle Calena 4er Set Anthrazit', visible: true, paths: ['Garten > Gartenmöbel Sets'] },
  { asin: 'B0F6NSNLR9', title: 'Juskys Gartenmöbel Abdeckplane CoverSafe Pro', visible: true, paths: ['Garten > Gartenbedarf'] },
  { asin: 'B0FHHNTZYQ', title: 'Juskys Metall Komposter 800 L Schwarz', visible: true, paths: ['Garten > Gartenbedarf'], onHomepage: true },
  { asin: 'B0FHHQ2ZLS', title: 'Juskys Metall Komposter 800 L Dunkelgrün', visible: true, paths: ['Garten > Gartenbedarf'] },
  { asin: 'B0FNX4DJ8F', title: 'Juskys Geräteschuppen Metall M Dunkelgrau', visible: true, paths: ['Garten > Gartenaufbewahrung'], onHomepage: true },
  { asin: 'B0FX4RZMFJ', title: 'Juskys Kaminholzregal L 260 cm Schwarz', visible: true, paths: ['Garten > Gartenbedarf'] },

  // ─── MÖBEL (aus Wohnen, ohne Kinderbedarf, Elektrokamine, Haushalt) ──
  { asin: 'B077P4PS6Z', title: 'Juskys Racing Schreibtischstuhl Montreal grau', visible: true, paths: ['Wohnen > Büromöbel'] },
  { asin: 'B07GFPC58W', title: 'Juskys Bambus Wäschekorb Curly Natur 100L', visible: true, paths: ['Wohnen > Badausstattung'] },
  { asin: 'B07QWXMYV9', title: 'Juskys Boxspringbett Norfolk 140x200 weiß', visible: true, paths: ['Wohnen > Boxspringbetten'] },
  { asin: 'B082XGXKJ8', title: 'Juskys Bambus Wäschekorb Curly-Round Natur 55L', visible: true, paths: ['Wohnen > Badausstattung'] },
  { asin: 'B08Q8GZ554', title: 'Juskys Bambus Wäschekorb Curly Grau 72L', visible: true, paths: ['Wohnen > Badausstattung'] },
  { asin: 'B0947617BM', title: 'Juskys Schminktisch Hocker Tonia Weiß', visible: true, paths: ['Wohnen > Schminktische'] },
  { asin: 'B09476KMMH', title: 'Juskys Schminktisch Hocker Melly Weiß', visible: true, paths: ['Wohnen > Schminktische'] },
  { asin: 'B09PLDVF2L', title: 'Juskys Topper 90x200 cm Memoryschaum', visible: true, paths: ['Wohnen > Matratzen & Topper'] },
  { asin: 'B0BKQ6XDKV', title: 'Juskys Polsterbett Paris 120x200 weiß', visible: true, paths: ['Wohnen > Polsterbetten'] },
  { asin: 'B0BSQKWT89', title: 'Juskys Polsterbett Nizza 140x200 Beige', visible: true, paths: ['Wohnen > Polsterbetten'] },
  { asin: 'B0CCRQGD6P', title: 'Juskys Polsterbett Savona 120x200 Beige', visible: true, paths: ['Wohnen > Polsterbetten'] },
  { asin: 'B0CX1SJ9R1', title: 'Juskys Sofa Iseo Links Schlaffunktion Dunkelgrau', visible: true, paths: ['Wohnen > Sofas'] },
  { asin: 'B0D31GY3G4', title: 'Juskys Kopfkissen 2er Set 40x80 Memory Foam', visible: true, paths: ['Wohnen > Schlafkomfort'] },
  { asin: 'B0DGXG1P6J', title: 'Juskys Boxspringbett Leona 180x200 Beige', visible: true, paths: ['Wohnen > Boxspringbetten'] },
  { asin: 'B0DM9FFLYF', title: 'Juskys Kaltschaummatratze 80x160 H2', visible: true, paths: ['Wohnen > Matratzen & Topper'] },
  { asin: 'B0DPX47HDJ', title: 'Juskys Aufstehhilfe Bett Weiß', visible: true, paths: ['Wohnen > Schlafkomfort'] },
  { asin: 'B0DXFLWC1L', title: 'Juskys Relaxsessel Korsika Cord Grau', visible: true, paths: ['Wohnen > Wohn- & Esszimmermöbel'] },
  { asin: 'B0F32S7FDB', title: 'Juskys Metallbett Palamos 140x200 mit Matratze Schwarz', visible: true, paths: ['Wohnen > Metallbetten'] },
  { asin: 'B0F32SN1W4', title: 'Juskys Metallbett Palamos 140x200 Schwarz', visible: true, paths: ['Wohnen > Metallbetten'] },
  { asin: 'B0F32WYZ3G', title: 'Juskys Bürostuhl Baltimore Grau', visible: true, paths: ['Wohnen > Büromöbel'] },
  { asin: 'B0F8BR8ZW5', title: 'Juskys Akustikpaneele 4er Set Eiche Natur Dunkel', visible: true, paths: ['Wohnen > Wohn- & Esszimmermöbel'] },
  { asin: 'B0FDBBPRZ1', title: 'Juskys Nackenkissen 1er Set', visible: true, paths: ['Wohnen > Schlafkomfort'] },
  { asin: 'B0FDWRR38Q', title: 'Juskys Gewichtsdecke 135x200', visible: true, paths: ['Wohnen > Schlafkomfort'] },
  { asin: 'B0FGDGNZNT', title: 'Juskys Schminktisch Lilia mit LED-Spiegel Weiß', visible: true, paths: ['Wohnen > Schminktische'] },
  { asin: 'B0FGDH2KMJ', title: 'Juskys Schminktisch Talea LED-Spiegel Weiß', visible: true, paths: ['Wohnen > Schminktische'] },
  { asin: 'B0FH2P23B3', title: 'Juskys Schminktisch Malia mit LED-Spiegel', visible: true, paths: ['Wohnen > Schminktische'] },
  { asin: 'B0FHHG2CKS', title: 'Juskys Gamingstuhl HyperSeat Schwarz/blau', visible: true, paths: ['Wohnen > Büromöbel'] },
  { asin: 'B0FNWSKJP2', title: 'Juskys Massagesessel Naxos Schwarz', visible: true, paths: ['Wohnen > Massagesessel'] },
  { asin: 'B0FX54GMQS', title: 'Juskys Aktenschrank Metall Hellgrau', visible: true, paths: ['Wohnen > Büromöbel'] },

  // ─── HEIMWERKEN ─────────────────────────────────────────
  { asin: 'B072KDRTHG', title: 'Juskys Leiter Aluminium 3x4 Stufen 3,6 m', visible: true, paths: ['Heimwerken > Multifunktionsleitern'] },
  { asin: 'B07Z7QCTXW', title: 'Juskys Sackkarre Basic klappbar', visible: true, paths: ['Heimwerken > Sackkarren'] },
  { asin: 'B07Z7R4CMY', title: 'Juskys Treppensackkarre klappbar Hartgummi', visible: true, paths: ['Heimwerken > Sackkarren'] },
  { asin: 'B0D9QSYSB7', title: 'Juskys Treppensackkarre klappbar', visible: true, paths: ['Heimwerken > Sackkarren'] },
  { asin: 'B0DQ5K13RK', title: 'Juskys Hebeanlage 600 W', visible: true, paths: ['Heimwerken > Werkzeug'] },
  { asin: 'B0DZ2XH5BS', title: 'Juskys Fahrrad Reparaturständer 50 kg', visible: true, paths: ['Heimwerken > Werkzeug'] },
  { asin: 'B0FT3RZSCP', title: 'Juskys Wagenheber 2,5 t', visible: true, paths: ['Heimwerken > Werkzeug'] },
  { asin: 'B0BBZX31R4', title: 'Juskys Elektrokamin 1000/2000 W Standkamin weiß', visible: true, paths: ['Wohnen > Elektrokamine & Heizungen'] },
  { asin: 'B0BBZYJLF2', title: 'Juskys Elektrokamin 1000/2000 W Eckkamin schwarz', visible: true, paths: ['Wohnen > Elektrokamine & Heizungen'] },
  { asin: 'B0FHHG49H8', title: 'Juskys Elektrokamin 2000 W Schwarz', visible: true, paths: ['Wohnen > Elektrokamine & Heizungen'] },
  { asin: 'B0FQJWR99K', title: 'Juskys Elektrokamin 1800W Schwarz', visible: true, paths: ['Wohnen > Elektrokamine & Heizungen'] },
  { asin: 'B0CJRMN1JH', title: 'Juskys Outdoor Heizstrahler Cuna 11 kW', visible: true, paths: ['Heimwerken > Heizgeräte', 'Wohnen > Elektrokamine & Heizungen'] },
  { asin: 'B0FQCMFLLY', title: 'Juskys Glasheizung 2000W', visible: true, paths: ['Heimwerken > Heizgeräte', 'Wohnen > Elektrokamine & Heizungen'] },
];

// Liefert die strukturierte ASIN Liste (alle visible mit Mapping)
export function getStructuredAsins() {
  return RAW_ASINS.map(mapAsin).filter(Boolean);
}
