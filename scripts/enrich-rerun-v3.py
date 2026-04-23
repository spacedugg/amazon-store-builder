#!/usr/bin/env python3
"""
Enrichment pass auf rerun-v3 natural-elements analysis:

1. Startseite Modul 2 und 3 korrigieren (Video-Hero vs OH-YEAH-Banner)
2. Produkt-Grid-Tiles als product_tile_asin klassifizieren, Vision-Felder
   auf not_required setzen und aus openQuestions entfernen
3. moduleFunction (2-3 Saetze) pro Modul aus Heuristik plus layoutType
4. pageArchitecture (2-4 Saetze) pro Seite aus Modul-Sequenz
5. storeAnalysis-Block (Phase 3) mit moduleFunctionalTaxonomy und pageArchetypes

Laeuft ueber data/store-knowledge/rerun-v3/natural-elements_analysis.json
und schreibt in place. Schreibt kein separates Backup, der Gold-Stand ist
in data/store-knowledge/rerun/natural-elements_gold.json geschuetzt.
"""

import json
import sys
from pathlib import Path

AGGREGATE_PATH = Path('data/store-knowledge/rerun-v3/natural-elements_analysis.json')


# ---------- Startseite Korrekturen ----------

STARTSEITE_MOD_2_FIX = {
    "position": 2,
    "moduleId": "startseite_mod_02",
    "moduleName": "Hero Video Split",
    "layoutType": "hero_video_split",
    "layoutShape": "full_width_banner",
    "tileCount": 1,
    "designIntent": "emotional_hook",
    "designIntentDetail": "Opener der Startseite, setzt Marken-Tonalitaet ueber Bewegung und rotierende Claims.",
    "structuralPattern": "Full-width Hero-Video mit Split-Komposition aus salbei-gruener Flaeche links und Lifestyle-Videosequenz rechts. Mehrere Claims rotieren ueber die Video-Dauer, darunter 'Nahrungsergaenzung neu gedacht' und 'Und dein Koerper so'.",
    "moduleFunction": "Emotionaler Opener der Startseite und einzige durchgaengige Bewegungsflaeche. Die rotierenden Claims etablieren Marken-Haltung und -Ton, bevor der Nutzer in Produktwelten wechselt. Keine direkte Conversion-Funktion, rein Awareness und Markenanker.",
    "backgroundStyle": "split_color_photo",
    "backgroundDetail": "Salbei-gruene Farbflaeche links, rechts Lifestyle-Video mit wechselnden Szenen",
    "textOnImage": {
        "visibleText": "Nahrungsergaenzung neu gedacht, Und dein Koerper so",
        "textType": "headline",
        "origin": "layered_text",
        "headline": "Nahrungsergaenzung neu gedacht",
        "subline": "Und dein Koerper so",
        "cta": None,
        "directionCues": "Rotierende Claim-Sequenz"
    },
    "tiles": [
        {
            "position": 1,
            "imageCategory": "creative_lifestyle_hybrid",
            "visualContent": "Video-Hero mit Split-Komposition. Linke Haelfte salbei-gruene Flaeche, rechts Lifestyle-Video mit rotierenden Szenen (Personen in Alltag und Sport). Mehrere Claims wechseln durch, prominent 'Nahrungsergaenzung neu gedacht' und 'Und dein Koerper so'. Kein einzelnes Frame repraesentativ, Video als Ganzes ist das Modul.",
            "elementProportions": {
                "solid_background": 45,
                "lifestyle_photo": 45,
                "text": 10
            },
            "textOnImage": {
                "visibleText": "Nahrungsergaenzung neu gedacht, Und dein Koerper so",
                "textType": "headline",
                "origin": "layered_text",
                "headline": "Nahrungsergaenzung neu gedacht",
                "subline": "Und dein Koerper so",
                "cta": None,
                "directionCues": "Multi-Frame-Video, Texte rotieren"
            },
            "ctaText": None,
            "linksTo": None,
            "backgroundStyle": "split_color_photo",
            "backgroundDetail": "Salbei-gruene Farbflaeche plus rotierendes Lifestyle-Video",
            "dominantColors": ["Salbei-Gruen", "Weiss", "Beigen-Fotoanteil"],
            "dominantColorsHex": ["#9CA98C", "#FFFFFF"],
            "notes": "Video mit rotierenden Texten, Single-Frame-Snapshot ist irrefuehrend. Bei Vision-Pass mehrere Frames sampeln oder als Video flaggen."
        }
    ]
}

STARTSEITE_MOD_3_FIX = {
    "position": 3,
    "moduleId": "startseite_mod_03",
    "moduleName": "Hero Banner Neuheiten OH YEAH",
    "layoutType": "editorial_banner",
    "layoutShape": "full_width_banner",
    "tileCount": 1,
    "designIntent": "navigation_bridge",
    "designIntentDetail": "Direkter Lead zur Neuheiten-Unterseite, bewusst als Banner gestaltet, nicht als Produktfocus.",
    "structuralPattern": "Full-width Banner auf off-weissem Grund. Links grosse Typografie mit Frage-Antwort-Muster 'Neue Produkte? OH YEAH!' plus Pfeil-CTA 'NEUHEITEN ENTDECKEN'. Rechts drei schwarze natural-elements-Gebinde als Produkt-Silhouetten-Hint, oben rechts NEU-Badge als Kreis-Markierung.",
    "moduleFunction": "Eigenstaendiger Werbe-Banner fuer die Neuheiten-Subpage. Funktioniert als dedizierter Navigation-Bridge, nicht als Produkt-Showcase, da keine konkreten Produkte adressierbar sind. Seine Rolle ist Traffic-Lenker auf die Produktfinder-Subpage und Signalgeber fuer 'es gibt Neues'.",
    "backgroundStyle": "solid_color",
    "backgroundDetail": "Off-Weiss mit Zartrosa-Akzent, drei Produkt-Silhouetten als Dekor rechts",
    "textOnImage": {
        "visibleText": "Neue Produkte? OH YEAH! NEUHEITEN ENTDECKEN NEU",
        "textType": "headline_cta",
        "origin": "baked_in",
        "headline": "Neue Produkte?",
        "subline": "OH YEAH!",
        "cta": "NEUHEITEN ENTDECKEN",
        "directionCues": "Pfeil vor CTA, NEU-Badge oben rechts"
    },
    "tiles": [
        {
            "position": 1,
            "imageCategory": "product",
            "visualContent": "Off-weisser Full-width Banner. Links grosse schwarze Frage-Typografie 'Neue Produkte?', darunter in groesserer Zartrosa-Italic 'OH YEAH!' als Ausruf-Antwort. Darunter schwarzer CTA-Button 'NEUHEITEN ENTDECKEN' mit Pfeil. Rechts drei schwarze natural-elements Gebinde nebeneinander als Produkt-Stillleben, oben rechts ein Kreis-Badge 'NEU'.",
            "elementProportions": {
                "product_photo": 40,
                "text": 35,
                "cta_button": 10,
                "solid_background": 10,
                "badge": 5
            },
            "textOnImage": {
                "visibleText": "Neue Produkte? OH YEAH! NEUHEITEN ENTDECKEN NEU",
                "textType": "headline_cta",
                "origin": "baked_in",
                "headline": "Neue Produkte?",
                "subline": "OH YEAH!",
                "cta": "NEUHEITEN ENTDECKEN",
                "directionCues": "Pfeil vor CTA, NEU-Badge oben rechts"
            },
            "ctaText": "NEUHEITEN ENTDECKEN",
            "linksTo": "unsere-neuheiten",
            "backgroundStyle": "solid_color",
            "backgroundDetail": "Off-Weiss mit Zartrosa-Akzent",
            "dominantColors": ["Off-Weiss", "Schwarz", "Zartrosa"],
            "dominantColorsHex": ["#F5F1E8", "#1A1A1A", "#F7D4D0"]
        }
    ]
}


# ---------- moduleFunction Heuristik ----------

MODULE_FUNCTION_BY_LAYOUT = {
    "amazon_nav_header": "Amazon-System-Navigation, keine Designentscheidung des Stores. Der Nutzer wechselt hier zwischen Store-Seiten via Amazon-Standard-Tab-Chrome.",
    "amazon_share_footer": "Amazon-interner Share-Footer am Seitenende, keine Designentscheidung des Stores. Reine Plattform-UI ohne Conversion-Rolle.",
    "separator_invisible": "Unsichtbarer Pixel-Abstand zwischen Modulen, rein visueller Rhythmus-Trenner ohne inhaltliche Funktion.",
    "hero_banner": "Statischer Hero am Seitenanfang, setzt visuellen Einstieg und Claim oder Kategoriename, der die Seite thematisch verankert.",
    "hero_banner_compact": "Kompakter Hero fuer Produktlinien- oder Kampagnen-Seiten, reduzierte Hoehe signalisiert schnellen Uebergang zum Produktbereich.",
    "hero_banner_tall": "Grosser Hero mit starker visueller Dominanz, typisch fuer Geschenk- oder Kampagnen-Seiten mit erhoehtem Emotionsanteil.",
    "hero_video": "Bewegtes Hero-Element, emotionaler Einstieg, Marken-Tonalitaet und Lifestyle-Kontext ueber Zeit entfaltet.",
    "hero_video_split": "Hero-Video mit Split-Layout aus Farbflaeche und Video, Marken-Claim und Lifestyle-Kontext gleichzeitig.",
    "hero_video_tall": "Hohes Hero-Video, tief emotional, auf About- und Story-Seiten typisch, fuer Marken-Erzaehlung.",
    "editorial_banner": "Redaktioneller Full-width-Banner zwischen Produktblocks, meist mit Kategorie-Thema oder Werte-Statement, verlinkt oft auf eine Sub-Page.",
    "editorial_banner_large": "Grosser Editorial-Banner mit hohem visuellen Gewicht, oft als Seiten-Intro oder Kampagnen-Anker.",
    "editorial_banner_tall": "Hoher Editorial-Banner, fuer Story- und About-Content mit erweiterter Copy-Flaeche.",
    "editorial_banner_solid_color": "Editorial-Banner mit Volltonflaeche, bewusst reduzierte Komposition fuer Aufmerksamkeit oder Marken-Farb-Signalisierung.",
    "editorial_section_intro": "Schmaler Section-Header zwischen groesseren Modul-Bloecken, gliedert die Seite und leitet das naechste Thema ein.",
    "editorial_tile_pair": "Zwei gleichgewichtige Editorial-Kacheln, oft als Cross-Link zu zwei verwandten Sub-Pages oder als Kontrast-Setup.",
    "editorial_tile_quad": "Vier Editorial-Kacheln als Wert- oder Kategorie-Grid, praesentiert Marken-Facetten oder Navigations-Bruecken im Block.",
    "product_showcase_video": "Einzelnes Produkt im Fokus mit Video-Praesentation und Marken-Layout, fokussiert Aufmerksamkeit auf ein Hero-Produkt oder ein Set.",
    "product_grid_featured": "Kurationierte Produkt-Auswahl als Grid, zeigt die meistbeworbenen Produkte der Marke, direkter Konversions-Block.",
    "product_grid_category": "Produkt-Grid einer Kategorie, zentrale Konversions-Flaeche einer Hub-Seite, Amazon rendert Produkt-Cards selbst.",
    "product_grid_line": "Produkt-Linien-Grid, praesentiert eine Sub-Brand oder Produktfamilie gebuendelt.",
    "product_grid_full_catalog": "Voller Katalog-Grid, typisch auf der 'Alle Produkte'-Seite, lineare Auflistung aller SKUs.",
    "product_grid_new_arrivals": "Neuheiten-Grid, zeigt die juengsten Produktstarts, Treiber fuer Wiederbesuche.",
    "product_grid_bestsellers": "Bestseller-Grid, rein konversionsgetrieben, platziert die Top-Seller prominent.",
    "product_grid_filter_results": "Filterergebnis-Grid auf Produktselektor-Seite, dynamisch aus den Filter-Accordions.",
    "subcategory_tile": "Einzelne Sub-Kategorie als eigenstaendige Row, fungiert als Navigation-Bridge zu einer tieferen Hub-Seite innerhalb derselben Kategorie.",
    "shoppable_interactive_image": "Shoppable Bild mit Hotspots auf Produkt-Positionen, erlaubt Sprung direkt in PDPs ohne Grid-Scrolling.",
    "shoppable_interactive_image_set": "Vier-Kachel-Version des Shoppable-Patterns, praesentiert mehrere Produkt-Szenen mit Hotspots pro Kachel.",
    "filter_banner": "Banner im Produktselektor mit Filter-Hinweis oder Kategorie-Setup, rein funktionale UI-Komponente der Beratungs-Seite.",
    "filter_accordion_collapsed": "Einklappbares Filter-Accordion auf der Produktselektor-Seite, funktionaler UI-Baustein fuer die Beratungs-Flow, nicht Design-Showcase."
}


def get_module_function(module):
    """Heuristische moduleFunction aus layoutType plus designIntent plus moduleName."""
    layout_type = module.get('layoutType', '')
    design_intent = module.get('designIntent', '')
    module_name = module.get('moduleName', '')

    # Fallback
    base = MODULE_FUNCTION_BY_LAYOUT.get(layout_type, "")
    if not base:
        base = f"Modul vom Typ {layout_type}, Funktion ergibt sich aus Kontext."

    # Kontextualisieren nach designIntent
    if design_intent == 'navigation_bridge' and 'subcategory' in layout_type:
        base += " Verlinkt auf eine Sub-Kategorie innerhalb der uebergeordneten Hub-Seite."
    elif design_intent == 'section_intro':
        base = f"Schmaler Section-Header vor dem naechsten Block, gliedert die Seite und kuendigt das kommende Thema an. {base}"

    return base


# ---------- pageArchitecture Heuristik ----------

PAGE_ARCHITECTURE = {
    "startseite": "Klassische Einstiegs-Startseite mit Hero-Video-Opener, gefolgt von Navigation-Bridge-Bannern (Neuheiten, Kategorien), Bestseller-Shoppable als Konversions-Flaeche, Produktfinder-Teaser als Beratungs-Einstieg, und Featured-Grid als Warenlager. Der Flow fuehrt von Awareness ueber Orientierung zu Konversion und optional zu Beratung.",
    "immunsystem": "Hub-Kategorie fuer Immunsystem-Produkte. Hero-Banner mit Kategorie-Claim, Shoppable als Direkt-Einstieg in die meistgekauften Immun-Produkte, dann Produkt-Grid und Sub-Kategorie-Tiles. Schluss mit Editorial-Bannern als Marken-Anker.",
    "vitamine": "Hub-Kategorie fuer Vitamine, eng strukturiert. Hero plus drei dedizierte Produkt-Showcase-Videos (Premium Multi, Vitamin C, Vitamin D3) vor dem Kategoriegrid. Die Video-Kette baut Expertise und Differenzierung pro Wirkstoff auf.",
    "soprotein_vegan": "Produktlinien-Seite, minimal aufgebaut. Kompakter Hero mit Kampagnen-Claim 'Make it full size', direkt danach Produkt-Grid der gesamten Linie. Reine Produkt-Listing-Seite ohne Story-Elemente.",
    "ueber_uns": "About-Seite mit sehr hoher Editorial-Dichte. Brand-Hero, dann 10 Story-Banner, eingestreut ein grosses Brand-Video, zum Schluss Werte-Quad und Tile-Pairs. Maximale Investition in Brand-Story und Vertrauen, kein Konversions-Fokus.",
    "alle_produkte": "Katalog-Seite mit Shoppable-Einstieg, Editorial-Intro, vollem Produkt-Grid, Section-Intro als Abschluss. Linearer Scroll fuer Nutzer, die schon im Kauf-Mindset sind.",
    "neuheiten": "Neuheiten-Hub mit Hero, Section-Intros als Gliederung, ein Produkt-Showcase-Video fuer das Top-Neuheit (Magtein), dann Neuheiten-Grid mit 50 Produkten. Klar auf Repeat-Besucher und Pushing-Top-Neuheit optimiert.",
    "produktselektor": "Reine Filter-UI-Seite. Sechs Filter-Accordions, ein Filter-Banner, am Ende Filterergebnis-Grid mit 20 Produkten. Produkte finden statt browsen. Funktionale Beratungs-Seite.",
    "geschenk_sets": "Geschenk-Set-Seite mit hohem Kampagnen-Anteil. Hero-Tall, Editorial-Banner, dann sechs Produkt-Showcase-Videos fuer Basic- und Premium-Sets, Shoppable-Abschluss, zweimal Editorial-Quad als Werte- und Kategorie-Recap.",
    "unsere_empfehlungen": "Bestseller- und Empfehlungs-Seite. Section-Intro, dann Bestseller-Grid mit 24 Top-Produkten, gefolgt von zwei Editorial-Quads. Reduzierter Editorial-Anteil, Konversions-fokussiert."
}


def derive_page_slug(page):
    """Slug aus pageName oder pageId ableiten."""
    name = (page.get('pageName') or '').lower()
    mapping = {
        "startseite": "startseite",
        "immunsystem": "immunsystem",
        "vitamine": "vitamine",
        "soprotein vegan": "soprotein_vegan",
        "ueber uns": "ueber_uns",
        "über uns": "ueber_uns",
        "alle produkte": "alle_produkte",
        "unsere neuheiten": "neuheiten",
        "produktselektor": "produktselektor",
        "geschenk-sets": "geschenk_sets",
        "unsere bestseller empfehlungen": "unsere_empfehlungen"
    }
    for k, v in mapping.items():
        if k in name:
            return v
    return name.replace(' ', '_')


# ---------- Main ----------

def main():
    data = json.loads(AGGREGATE_PATH.read_text(encoding='utf-8'))

    # 1. Startseite Fix: pos 2 ersetzen mit Hero Video Split, pos 3 ersetzen mit OH YEAH Banner
    for page in data.get('pages', []):
        if page.get('pageName', '').lower().startswith('startseite'):
            modules = page.get('modules', [])
            for i, m in enumerate(modules):
                if m.get('position') == 2:
                    modules[i] = STARTSEITE_MOD_2_FIX
                elif m.get('position') == 3:
                    modules[i] = STARTSEITE_MOD_3_FIX
            # moduleId konsistent setzen, Position bleibt unveraendert
            for m in modules:
                pos = m.get('position', 0)
                m['moduleId'] = f"startseite_mod_{pos:02d}"
            break

    # 2. Produkt-Tiles in product_grid_* Modulen reclassifizieren
    product_grid_prefixes = ('product_grid_',)
    reclassified = 0
    for page in data.get('pages', []):
        for m in page.get('modules', []):
            if m.get('layoutType', '').startswith(product_grid_prefixes):
                for t in m.get('tiles', []):
                    t['imageCategory'] = 'product_tile_asin'
                    # Vision-Felder auf not_required setzen, wenn sie aktuell screenshot_required sind
                    for field in ['visualContent', 'backgroundDetail']:
                        if t.get(field) == 'screenshot_required':
                            t[field] = 'not_required'
                    t['visionRequired'] = False
                    reclassified += 1

    # 3. moduleFunction pro Modul
    for page in data.get('pages', []):
        for m in page.get('modules', []):
            if not m.get('moduleFunction'):
                m['moduleFunction'] = get_module_function(m)

    # 4. pageArchitecture pro Seite
    for page in data.get('pages', []):
        slug = derive_page_slug(page)
        page['pageArchitecture'] = PAGE_ARCHITECTURE.get(
            slug,
            f"Seite {page.get('pageName')}, Funktions-Architektur noch nicht dokumentiert."
        )

    # 5. openQuestions von gelosten ASIN-Tile-Placeholders saeubern
    cleaned_oq = 0
    for page in data.get('pages', []):
        oq = page.get('openQuestions', [])
        new_oq = []
        for q in oq:
            if 'screenshot_required' in q and ('product_grid_' in q or 'product_tile' in q):
                cleaned_oq += 1
                continue
            new_oq.append(q)
        page['openQuestions'] = new_oq

    # 6. Metadata update
    data['methodology'] = 'V4-v3-Blueprint-enrichment-20260422'
    data['v3SchemaNote'] = 'v3 plus Einordnungs-Ebene: moduleFunction pro Modul, pageArchitecture pro Seite, product_tile_asin als imageCategory-Wert fuer Amazon-ASIN-Tiles ohne Brand-Design.'

    AGGREGATE_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')

    total_modules = sum(len(p['modules']) for p in data['pages'])
    total_tiles = sum(len(m.get('tiles', [])) for p in data['pages'] for m in p['modules'])
    print(f"Enrichment done.")
    print(f"  Modules: {total_modules}")
    print(f"  Tiles: {total_tiles}")
    print(f"  Reclassified to product_tile_asin: {reclassified}")
    print(f"  Cleaned openQuestions: {cleaned_oq}")
    print(f"  Startseite now has {len([p for p in data['pages'] if p['pageName'].lower().startswith('startseite')][0]['modules'])} modules")


if __name__ == '__main__':
    main()
