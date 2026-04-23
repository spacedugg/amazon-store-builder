#!/usr/bin/env python3
"""
Phase 3 Brand Identity Pass fuer rerun-v3.

Nimmt den bestehenden storeAnalysis-Block aus data/store-knowledge/natural-elements_analysis.json
(aus Commit 5847f09) als Basis, aktualisiert schemaVersion und derivedFrom
auf v3, ergaenzt neue Felder moduleFunctionalTaxonomy und pageArchetypes
die aus der Einordnungs-Ebene (moduleFunction, pageArchitecture) synthetisiert
sind, und schreibt das Ganze in die v3-Aggregate-Datei.
"""

import json
import collections
from pathlib import Path

GOLD_PATH = Path('data/store-knowledge/natural-elements_analysis.json')
V3_PATH = Path('data/store-knowledge/rerun-v3/natural-elements_analysis.json')


def build_module_functional_taxonomy(pages):
    """Zaehlt Modul-Muster ueber alle Seiten. Primaer in Tool-Sprache
    (toolLayoutId + toolTileType), weil das Generator-Tool so spricht.
    v3-layoutType bleibt als granulare Zusatzebene.
    """
    by_tool = collections.Counter()
    by_v3 = collections.Counter()
    tool_combinations = collections.Counter()
    brand_designed_modules = 0
    amazon_native_modules = 0

    for p in pages:
        for m in p.get('modules', []):
            role = m.get('toolLayoutRole', '')
            if role in ('amazon_native', 'spacer', 'filter_ui'):
                amazon_native_modules += 1
            else:
                brand_designed_modules += 1
            tool_layout = m.get('toolLayoutId') or 'amazon_native'
            tool_layout_name = m.get('toolLayoutName') or 'Amazon Native'
            v3_layout = m.get('layoutType', 'unknown')
            by_v3[v3_layout] += 1

            # Erstes Tile als Repraesentant fuer toolTileType
            tiles = m.get('tiles', [])
            if tiles:
                tool_tile = tiles[0].get('toolTileType', 'unknown')
            else:
                tool_tile = 'none_amazon_rendered' if m.get('productGridAggregate') else 'none'
            by_tool[(tool_layout_name, tool_tile)] += 1
            tool_combinations[(tool_layout, tool_tile, role)] += 1

    return {
        'description': "Wiederkehrende Muster ueber alle Seiten des Stores, in Tool-Sprache (toolLayoutId plus toolTileType). Grundlage fuer den Retrieval-basierten Skeleton-Builder.",
        'brandDesignedModules': brand_designed_modules,
        'amazonNativeModules': amazon_native_modules,
        'byToolLayoutAndTileType': [
            {'toolLayoutName': tln, 'toolTileType': tt, 'count': c}
            for (tln, tt), c in by_tool.most_common()
        ],
        'byV3LayoutType': dict(by_v3.most_common()),
        'topCombinationsInToolVocab': [
            {'toolLayoutId': tl, 'toolTileType': tt, 'role': r, 'count': c}
            for (tl, tt, r), c in tool_combinations.most_common(10)
        ]
    }


def build_page_archetypes(pages):
    """Fuer jede Seite das Funktions-Archetyp-Label."""
    archetypes = []
    for p in pages:
        archetypes.append({
            'pageName': p.get('pageName'),
            'pageId': p.get('pageId'),
            'pageType': p.get('pageType', 'unknown'),
            'modules': len(p.get('modules', [])),
            'pageArchitecture': p.get('pageArchitecture', ''),
            'primaryFunction': derive_primary_function(p),
            'conversionMode': derive_conversion_mode(p),
            'transferableTo': derive_transferability(p)
        })
    return archetypes


def derive_primary_function(page):
    """1-Satz Label, was die Seite tut."""
    pt = page.get('pageType', '')
    name = (page.get('pageName') or '').lower()
    mapping = {
        'startseite': 'Marken-Einstieg mit kuratiertem Navigations- und Conversion-Mix',
        'hub_category': 'Kategorie-Deepdive mit Produkt-Fokus, typisch mit Hero plus Grid',
        'sub_category': 'Unterkategorie-Deepdive, schlankere Variante des Hub',
        'about': 'Marken-Story, Vertrauen aufbauen, keine direkte Conversion',
        'all_products': 'Katalog-Linear, fuer gereifte Kaufinteressenten',
        'bestsellers': 'Social-Proof-Listing der Top-Seller, klar Conversion-fokussiert',
        'new_arrivals': 'Rueckkehrer-Treiber, Neuheiten mit Feature-Produkt',
        'product_selector': 'Beratungs-UI, Filter-basierte Produktfindung',
        'gift_sets': 'Kuratiertes Bundle-Showcase mit starker Video-Praesenz',
        'product_lines': 'Produkt-Linien-Praesentation, typisch mit Kampagnen-Hero'
    }
    return mapping.get(pt, f"Seite vom Typ {pt}")


def derive_conversion_mode(page):
    """Wie adressiert die Seite Kauf-Intent."""
    pt = page.get('pageType', '')
    high = ['all_products', 'bestsellers', 'hub_category', 'product_lines', 'new_arrivals']
    medium = ['startseite', 'gift_sets', 'product_selector']
    low = ['about']
    if pt in high:
        return 'direct_conversion'
    if pt in medium:
        return 'guided_conversion'
    if pt in low:
        return 'trust_building'
    return 'mixed'


def derive_transferability(page):
    """Ist die Seiten-Architektur auf andere Stores uebertragbar?"""
    pt = page.get('pageType', '')
    if pt in ['startseite', 'hub_category', 'about', 'all_products', 'bestsellers', 'new_arrivals']:
        return 'high'
    if pt in ['gift_sets', 'product_lines', 'product_selector']:
        return 'medium'
    return 'low'


def main():
    gold = json.loads(GOLD_PATH.read_text(encoding='utf-8'))
    v3 = json.loads(V3_PATH.read_text(encoding='utf-8'))

    # Basis: Gold-storeAnalysis
    base_sa = gold.get('storeAnalysis', {})

    # v3-Anpassungen
    sa = {
        'schemaVersion': 'v3-brand-identity-2',
        'derivedFrom': 'v3-blueprints (10 Seiten, 114 Module) im rerun-v3, plus Einordnungs-Ebene (moduleFunction pro Modul, pageArchitecture pro Seite). Basis-Markeninhalte uebernommen aus dem ersten Brand-Identity-Pass (Commit 5847f09) und auf v3-Schema gehoben.',
        'marketSegment': base_sa.get('marketSegment'),
        'primaryAudience': base_sa.get('primaryAudience'),
        'priceTier': base_sa.get('priceTier'),
        'productComplexity': base_sa.get('productComplexity'),
        'brandVoice': base_sa.get('brandVoice'),
        'designAesthetic': base_sa.get('designAesthetic'),
        'positioningClaim': base_sa.get('positioningClaim'),
        'contentStrategy': base_sa.get('contentStrategy'),
        'conversionPath': base_sa.get('conversionPath'),
        'keyStrengths': base_sa.get('keyStrengths'),
        'brandUSPs': base_sa.get('brandUSPs'),
        'brandUSPsNote': base_sa.get('brandUSPsNote'),
        # Neu in v3: Einordnungs-Taxonomie
        'moduleFunctionalTaxonomy': build_module_functional_taxonomy(v3['pages']),
        'pageArchetypes': build_page_archetypes(v3['pages'])
    }

    # Einschieben ins v3-Aggregat, direkt vor 'pages'
    # Wir bauen das Dict neu auf, um die Reihenfolge zu kontrollieren.
    new_v3 = {}
    for key in ['storeMetadata', 'brandName', 'storeUrl', 'analyzedAt', 'methodology', 'v3SchemaNote']:
        if key in v3:
            new_v3[key] = v3[key]
    new_v3['storeAnalysis'] = sa
    for key in ['pages', 'openQuestions']:
        if key in v3:
            new_v3[key] = v3[key]

    V3_PATH.write_text(json.dumps(new_v3, indent=2, ensure_ascii=False), encoding='utf-8')

    print(f"Phase 3 done.")
    print(f"  storeAnalysis schemaVersion: {sa['schemaVersion']}")
    print(f"  moduleFunctionalTaxonomy toolLayout entries: {len(sa['moduleFunctionalTaxonomy']['byToolLayoutAndTileType'])}")
    print(f"  pageArchetypes: {len(sa['pageArchetypes'])}")


if __name__ == '__main__':
    main()
