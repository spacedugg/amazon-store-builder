#!/usr/bin/env python3
"""
Hebt natural-elements auf Paragraf 11e: fuellt tileContentTopic pro Tile
aus visualContent, moduleName, textOnImage, layoutType plus dem
Kategorie-/Produkt-Wissen zum Store.
"""

import json
import re
from pathlib import Path

AGGREGATE = Path('data/store-knowledge/rerun-v3/natural-elements_analysis.json')
BLUEPRINT_DIR = Path('data/store-knowledge/rerun-v3/blueprints')

# Kategorien- und Sub-Kategorien-Universe des Stores
CATEGORIES = [
    'Immunsystem', 'Sport & Energie', 'Beauty & Anti Aging',
    'Knochen & Beweglichkeit', 'Wohlbefinden & Anti Stress',
    'Verdauung & Gewicht', 'Gaming', 'Vitamine', 'Mineralien',
    'Superfoods', 'Kraftsport'
]
PRODUCT_NAMES = [
    'Premium Multivitamin', 'Premium Multi', 'Vitamin C', 'Vitamin D3',
    'Vitamin D3 + K2', 'Vitamin D3/K2', 'Omega 3', 'Magnesium',
    'Magnesium Komplex', 'Magnesium L-Threonate', 'Magtein',
    'Schwarzkuemmeloel', 'Schwarzkümmelöl', 'Zink', 'Kollagen',
    'Collagen', 'Ashwagandha', 'Hyaluron', 'Biotin', 'OPC',
    'Mariendistel', 'Curcuma', 'Apfelessig', 'Hydration Recharge',
    'SoProtein', 'Whey Protein', 'Whey Complex', 'Clear Whey',
    'Kreatin Monohydrat', 'Kulturen Komplex'
]
PRODUCT_LINES = ['SoProtein', 'Sports Series', 'Premium Multi']
GIFT_SETS = [
    'Immunsystem Basic Set', 'Beauty Premium Set', 'Beauty Basic Set',
    'Essentials Set', 'Kraftsport Basic Set', 'Augencreme Set',
    'Beauty und Anti Aging Premium Set', 'Beauty und Anti Aging Basic Set'
]
BRAND_PROMISE_KEYWORDS = [
    'laborgeprueft', 'laborgeprüft', 'hochwertige rohstoffe',
    'keine falschen versprechen', 'made in germany',
    'nachhaltig', 'zertifikat', 'qualitaet', 'qualität'
]
CAMPAIGN_KEYWORDS = [
    'oh yeah', 'neue produkte', 'neuheiten entdecken',
    'make it full size', 'sports series', 'bestseller',
    'winter yeah', 'vitamin-power'
]


def find_category(text):
    for c in CATEGORIES:
        if c.lower() in text.lower():
            return c
    return None


def find_product(text):
    for p in PRODUCT_NAMES:
        if p.lower() in text.lower():
            return p
    return None


def find_line(text):
    for l in PRODUCT_LINES:
        if l.lower() in text.lower():
            return l
    return None


def find_gift_set(text):
    for g in GIFT_SETS:
        if g.lower() in text.lower():
            return g
    return None


def classify_topic(module, tile, page_name):
    """Returns {topicType, topicValue, topicDetail}."""
    lt = module.get('layoutType', '')
    mn = module.get('moduleName', '')
    vc = tile.get('visualContent', '') or ''
    toi = tile.get('textOnImage', {}) or {}
    visible_text = ''
    if isinstance(toi, dict):
        visible_text = toi.get('visibleText', '') or ''
    combined = f"{mn} {vc} {visible_text}"

    # Amazon-System bleibt unclear, wurde eh gestrippt, defensive:
    if lt in ('amazon_nav_header', 'amazon_share_footer'):
        return {'topicType': 'navigation_entry', 'topicValue': None,
                'topicDetail': 'Amazon-System-UI'}
    if lt == 'separator_invisible':
        return {'topicType': 'editorial_filler', 'topicValue': None,
                'topicDetail': 'Unsichtbarer Spacer'}

    # Filter UI
    if lt in ('filter_accordion_collapsed', 'filter_banner'):
        return {'topicType': 'advisory', 'topicValue': 'Produktselektor',
                'topicDetail': 'Filter-UI fuer Beratungs-Flow'}

    # Shoppable als Collection
    if lt.startswith('shoppable_interactive_image'):
        val = 'Bestseller' if 'bestseller' in combined.lower() else None
        return {'topicType': 'shoppable_collection',
                'topicValue': val,
                'topicDetail': 'Mehrere Hotspots, je Hotspot eine PDP'}

    # Subcategory tiles: Layout-Semantik sagt immer subcategory
    if lt == 'subcategory_tile':
        cat = find_category(combined)
        return {'topicType': 'subcategory',
                'topicValue': cat,
                'topicDetail': 'Eigenstaendige Sub-Kategorie-Row, Vision fuellt topicValue'}

    # Product Showcase Video
    if lt == 'product_showcase_video':
        prod = find_product(combined)
        gift = find_gift_set(combined)
        if gift:
            return {'topicType': 'gift_set', 'topicValue': gift,
                    'topicDetail': 'Set-Showcase mit Video'}
        if prod:
            return {'topicType': 'product_specific', 'topicValue': prod,
                    'topicDetail': 'Showcase-Row mit Video'}
        return {'topicType': 'product_specific', 'topicValue': None,
                'topicDetail': 'Video-Showcase, Produktname unklar'}

    # Hero-Varianten
    if lt.startswith('hero_'):
        # Campaign check first
        cl = combined.lower()
        if any(k in cl for k in ['oh yeah', 'neue produkte', 'make it full size', 'sports series', 'winter yeah', 'vitamin-power']):
            return {'topicType': 'campaign',
                    'topicValue': visible_text[:80] or mn,
                    'topicDetail': 'Kampagnen-Hero'}
        cat = find_category(combined)
        if cat:
            return {'topicType': 'category', 'topicValue': cat,
                    'topicDetail': 'Kategorie-Hero'}
        # Ueber uns Hero
        if page_name.lower().startswith('ueber') or 'ueber uns' in cl or 'über uns' in cl or mn.lower().startswith('brand'):
            return {'topicType': 'brand_story', 'topicValue': 'Marken-Story',
                    'topicDetail': 'Brand-Hero auf About-Seite'}
        # Generic brand hero with rotating claims (Startseite)
        if 'nahrungsergaenzung neu gedacht' in cl or 'und dein koerper so' in cl:
            return {'topicType': 'brand_story',
                    'topicValue': 'Marken-Tonalitaet',
                    'topicDetail': 'Video-Hero mit rotierenden Marken-Claims'}
        return {'topicType': 'brand_story', 'topicValue': None,
                'topicDetail': 'Hero ohne klaren Kategorie-Anker'}

    # Editorial tile pair / quad
    if lt in ('editorial_tile_pair', 'editorial_tile_quad'):
        cat = find_category(combined)
        if cat:
            return {'topicType': 'category', 'topicValue': cat,
                    'topicDetail': 'Tile in Cross-Navigation-Block'}
        if 'alle produkte' in combined.lower():
            return {'topicType': 'navigation_entry',
                    'topicValue': 'Alle Produkte',
                    'topicDetail': 'Verlinkung auf Gesamt-Katalog'}
        if find_gift_set(combined):
            return {'topicType': 'gift_set',
                    'topicValue': find_gift_set(combined),
                    'topicDetail': 'Geschenk-Set-Teaser in Kachel'}
        if any(k in combined.lower() for k in BRAND_PROMISE_KEYWORDS):
            return {'topicType': 'brand_promise', 'topicValue': None,
                    'topicDetail': 'USP- oder Werte-Tile'}
        return {'topicType': 'navigation_entry', 'topicValue': None,
                'topicDetail': 'Cross-Link-Tile ohne klares Sub-Thema'}

    # Editorial banner
    if lt.startswith('editorial_banner'):
        cl = combined.lower()
        if lt == 'editorial_banner_solid_color':
            # Typisch Kampagnen-Banner mit Farbflaeche
            cat = find_category(combined)
            return {'topicType': 'category' if cat else 'campaign',
                    'topicValue': cat, 'topicDetail': 'Volltonfarbe-Kampagne'}
        if page_name.lower().startswith('ueber') or 'ueber uns' in cl:
            return {'topicType': 'brand_story', 'topicValue': None,
                    'topicDetail': 'Story-Banner auf About-Seite'}
        if 'oh yeah' in cl or 'neue produkte' in cl:
            return {'topicType': 'campaign',
                    'topicValue': 'Neuheiten-Kampagne',
                    'topicDetail': 'OH YEAH Banner'}
        if 'sports series' in cl:
            return {'topicType': 'product_line',
                    'topicValue': 'Sports Series',
                    'topicDetail': 'Produktlinien-Kampagne'}
        cat = find_category(combined)
        if cat:
            return {'topicType': 'category', 'topicValue': cat,
                    'topicDetail': 'Kategorie-Teaser-Banner'}
        line = find_line(combined)
        if line:
            return {'topicType': 'product_line', 'topicValue': line,
                    'topicDetail': 'Produktlinien-Banner'}
        if any(k in cl for k in BRAND_PROMISE_KEYWORDS):
            return {'topicType': 'brand_promise', 'topicValue': None,
                    'topicDetail': 'USP-Banner'}
        return {'topicType': 'editorial_filler', 'topicValue': None,
                'topicDetail': 'Editorial-Banner ohne klares Inhalts-Thema'}

    # Editorial section intro
    if lt == 'editorial_section_intro':
        return {'topicType': 'editorial_filler', 'topicValue': None,
                'topicDetail': 'Section-Header, nur Gliederung'}

    # Default
    return {'topicType': 'unclear', 'topicValue': None,
            'topicDetail': 'Nicht klassifiziert, manuelle Pruefung noetig'}


def enrich_page(page):
    page_name = page.get('pageName', '')
    added = 0
    unclear = 0
    for m in page.get('modules', []):
        for t in m.get('tiles', []):
            topic = classify_topic(m, t, page_name)
            t['tileContentTopic'] = topic
            added += 1
            if topic['topicType'] == 'unclear':
                unclear += 1
        # Produktgrid-Aggregate
        pga = m.get('productGridAggregate')
        if pga and not pga.get('tileContentTopic'):
            lt = m.get('layoutType', '')
            if 'bestsellers' in lt:
                pga['tileContentTopic'] = {'topicType': 'shoppable_collection', 'topicValue': 'Bestseller-Grid', 'topicDetail': 'Amazon-rendered Bestseller-ASINs'}
            elif 'new_arrivals' in lt:
                pga['tileContentTopic'] = {'topicType': 'shoppable_collection', 'topicValue': 'Neuheiten-Grid', 'topicDetail': 'Amazon-rendered Neuheiten-ASINs'}
            elif 'filter_results' in lt:
                pga['tileContentTopic'] = {'topicType': 'advisory', 'topicValue': 'Filterergebnis', 'topicDetail': 'Dynamisches Grid aus Filter-Auswahl'}
            elif 'full_catalog' in lt:
                pga['tileContentTopic'] = {'topicType': 'navigation_entry', 'topicValue': 'Alle Produkte', 'topicDetail': 'Voller Katalog-Grid'}
            elif 'line' in lt:
                line = find_line(page_name) or find_line(m.get('moduleName', ''))
                pga['tileContentTopic'] = {'topicType': 'product_line', 'topicValue': line, 'topicDetail': 'Produktlinien-Grid'}
            elif 'category' in lt:
                cat = find_category(page_name) or find_category(m.get('moduleName', ''))
                pga['tileContentTopic'] = {'topicType': 'category', 'topicValue': cat, 'topicDetail': 'Kategorie-Grid'}
            else:
                pga['tileContentTopic'] = {'topicType': 'navigation_entry', 'topicValue': None, 'topicDetail': 'Generisches Produkt-Grid'}
    return added, unclear


def main():
    total_added = 0
    total_unclear = 0

    data = json.loads(AGGREGATE.read_text(encoding='utf-8'))
    for page in data.get('pages', []):
        a, u = enrich_page(page)
        total_added += a
        total_unclear += u
    AGGREGATE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')

    if BLUEPRINT_DIR.exists():
        for bp_file in sorted(BLUEPRINT_DIR.glob('natural-elements_*.json')):
            bp = json.loads(bp_file.read_text(encoding='utf-8'))
            enrich_page(bp)
            bp_file.write_text(json.dumps(bp, indent=2, ensure_ascii=False), encoding='utf-8')

    print(f"tileContentTopic gefuellt: {total_added} Tiles")
    print(f"davon topicType unclear: {total_unclear}")


if __name__ == '__main__':
    main()
