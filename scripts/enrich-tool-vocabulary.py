#!/usr/bin/env python3
"""
Tool-Vocabulary und Clickability-Enrichment fuer rerun-v3.

Zieht die Tool-Sprache aus src/constants.js und src/blueprintLayoutMap.js
in das v3-Aggregat ein:

Pro Modul werden hinzugefuegt:
- toolLayoutId       (aus LAYOUTS)
- toolLayoutName     (menschenlesbar)
- toolLayoutType     (fullwidth/standard/vh)
- toolLayoutRole     (aus blueprintLayoutMap.js)

Pro Tile werden hinzugefuegt:
- toolTileType       (aus TILE_TYPES)
- toolImageType      (aus LAYOUT_TILE_DIMS, je Position im Layout)
- link               Objekt {clickable, linkType, linkTarget, ctaLabel, confidence}
"""

import json
from pathlib import Path

V3_PATH = Path('data/store-knowledge/rerun-v3/natural-elements_analysis.json')


# ---------- Tool-Vocabulary aus src/constants.js ----------

LAYOUTS = {
    '1':           {'name': 'Full Width', 'type': 'fullwidth', 'cells': 1},
    'std-2equal':  {'name': '2 Equal', 'type': 'standard', 'cells': 2},
    'lg-2stack':   {'name': 'Large + 2 Stacked', 'type': 'standard', 'cells': 3},
    '2stack-lg':   {'name': '2 Stacked + Large', 'type': 'standard', 'cells': 3},
    'lg-w2s':      {'name': 'Large + Wide & 2 Small', 'type': 'standard', 'cells': 4},
    'w2s-lg':      {'name': 'Wide & 2 Small + Large', 'type': 'standard', 'cells': 4},
    '2x2wide':     {'name': '4 Equal (2x2 Wide)', 'type': 'standard', 'cells': 4},
    'lg-4grid':    {'name': 'Large + 2x2 Grid', 'type': 'standard', 'cells': 5},
    '4grid-lg':    {'name': '2x2 Grid + Large', 'type': 'standard', 'cells': 5},
    '2s-4grid':    {'name': '2 Stacked + 2x2 Grid', 'type': 'standard', 'cells': 6},
    '4grid-2s':    {'name': '2x2 Grid + 2 Stacked', 'type': 'standard', 'cells': 6},
    '4x2grid':     {'name': '4x2 Grid', 'type': 'standard', 'cells': 8},
    'vh-2equal':   {'name': '2 Equal (VH)', 'type': 'vh', 'cells': 2},
    'vh-w2s':      {'name': 'Wide + 2 Squares (VH)', 'type': 'vh', 'cells': 3},
    'vh-2sw':      {'name': '2 Squares + Wide (VH)', 'type': 'vh', 'cells': 3},
    'vh-4square':  {'name': '4 Squares (VH)', 'type': 'vh', 'cells': 4},
    'product_grid_asin': {'name': 'Product Grid (ASIN)', 'type': 'fullwidth_asin', 'cells': 0},
}

# Pro Tool-Layout die Image-Typen-Sequenz aus LAYOUT_TILE_DIMS
LAYOUT_TILE_IMG_TYPES = {
    '1':          ['FULL_WIDTH'],
    'std-2equal': ['LARGE_SQUARE', 'LARGE_SQUARE'],
    'lg-2stack':  ['LARGE_SQUARE', 'WIDE', 'WIDE'],
    '2stack-lg':  ['WIDE', 'WIDE', 'LARGE_SQUARE'],
    'lg-w2s':     ['LARGE_SQUARE', 'WIDE', 'SMALL_SQUARE', 'SMALL_SQUARE'],
    'w2s-lg':     ['WIDE', 'SMALL_SQUARE', 'SMALL_SQUARE', 'LARGE_SQUARE'],
    '2x2wide':    ['WIDE', 'WIDE', 'WIDE', 'WIDE'],
    'lg-4grid':   ['LARGE_SQUARE', 'SMALL_SQUARE', 'SMALL_SQUARE', 'SMALL_SQUARE', 'SMALL_SQUARE'],
    '4grid-lg':   ['SMALL_SQUARE', 'SMALL_SQUARE', 'SMALL_SQUARE', 'SMALL_SQUARE', 'LARGE_SQUARE'],
    '2s-4grid':   ['WIDE', 'WIDE', 'SMALL_SQUARE', 'SMALL_SQUARE', 'SMALL_SQUARE', 'SMALL_SQUARE'],
    '4grid-2s':   ['SMALL_SQUARE', 'SMALL_SQUARE', 'SMALL_SQUARE', 'SMALL_SQUARE', 'WIDE', 'WIDE'],
    '4x2grid':    ['SMALL_SQUARE'] * 8,
    'vh-2equal':  ['VH_WIDE', 'VH_WIDE'],
    'vh-w2s':     ['VH_WIDE', 'VH_SQUARE', 'VH_SQUARE'],
    'vh-2sw':     ['VH_SQUARE', 'VH_SQUARE', 'VH_WIDE'],
    'vh-4square': ['VH_SQUARE'] * 4,
    'product_grid_asin': ['PRODUCT_TILE_ASIN'],
}


# ---------- Mapping: v3 layoutType -> Tool Layout + Role ----------

V3_TO_TOOL = {
    # Amazon-Chrome, nicht als Brand-Modul rendern
    'amazon_nav_header':            {'toolLayoutId': None,  'role': 'amazon_native'},
    'amazon_share_footer':          {'toolLayoutId': None,  'role': 'amazon_native'},
    'separator_invisible':          {'toolLayoutId': None,  'role': 'spacer'},
    # Hero
    'hero_banner':                  {'toolLayoutId': '1',           'role': 'hero'},
    'hero_banner_compact':          {'toolLayoutId': '1',           'role': 'hero'},
    'hero_banner_tall':             {'toolLayoutId': '1',           'role': 'hero'},
    'hero_video':                   {'toolLayoutId': '1',           'role': 'hero_video'},
    'hero_video_tall':              {'toolLayoutId': '1',           'role': 'hero_video'},
    'hero_video_split':             {'toolLayoutId': 'std-2equal',  'role': 'hero_split'},
    # Editorial
    'editorial_banner':             {'toolLayoutId': '1',           'role': 'editorial'},
    'editorial_banner_large':       {'toolLayoutId': '1',           'role': 'editorial'},
    'editorial_banner_tall':        {'toolLayoutId': '1',           'role': 'editorial'},
    'editorial_banner_solid_color': {'toolLayoutId': '1',           'role': 'editorial'},
    'editorial_section_intro':      {'toolLayoutId': '1',           'role': 'section_intro'},
    'editorial_tile_pair':          {'toolLayoutId': 'std-2equal',  'role': 'editorial_pair'},
    'editorial_tile_quad':          {'toolLayoutId': '2x2wide',     'role': 'editorial_quad'},
    # Subcategory
    'subcategory_tile':             {'toolLayoutId': '1',           'role': 'navigation_bridge'},
    # Filter
    'filter_banner':                {'toolLayoutId': '1',           'role': 'filter_banner'},
    'filter_accordion_collapsed':   {'toolLayoutId': None,          'role': 'filter_ui'},
    # Shoppable
    'shoppable_interactive_image':     {'toolLayoutId': '1',        'role': 'shoppable'},
    'shoppable_interactive_image_set': {'toolLayoutId': '2x2wide',  'role': 'shoppable_set'},
    # Product
    'product_showcase_video':       {'toolLayoutId': '1',           'role': 'product_showcase'},
    'product_grid_featured':        {'toolLayoutId': 'product_grid_asin', 'role': 'product_grid'},
    'product_grid_category':        {'toolLayoutId': 'product_grid_asin', 'role': 'product_grid'},
    'product_grid_line':            {'toolLayoutId': 'product_grid_asin', 'role': 'product_grid'},
    'product_grid_full_catalog':    {'toolLayoutId': 'product_grid_asin', 'role': 'product_grid'},
    'product_grid_new_arrivals':    {'toolLayoutId': 'product_grid_asin', 'role': 'product_grid'},
    'product_grid_bestsellers':     {'toolLayoutId': 'product_grid_asin', 'role': 'product_grid'},
    'product_grid_filter_results':  {'toolLayoutId': 'product_grid_asin', 'role': 'product_grid'},
}


# ---------- Mapping: Tile -> Tool TILE_TYPE ----------
#
# Entscheidungstabelle, erste zutreffende Regel gewinnt.
# Return (toolTileType, clickable_default, linkType_default)

def classify_tile(layout_type, image_category, cta_text, links_to, has_video):
    # product_grid_* mit Amazon-ASIN
    if layout_type.startswith('product_grid_'):
        if 'bestsellers' in layout_type: return ('best_sellers', True, 'pdp_asin_multi')
        if 'new_arrivals' in layout_type: return ('recommended', True, 'pdp_asin_multi')
        return ('product_grid', True, 'pdp_asin_multi')
    if image_category == 'product_tile_asin':
        return ('product_grid', True, 'pdp_asin')
    # Shoppable
    if layout_type.startswith('shoppable_interactive_image'):
        return ('shoppable_image', True, 'pdp_asin_hotspots')
    # product_showcase_video: klickbar nur wenn CTA oder linksTo erkennbar.
    # Nicht blanket klicken. Es gibt Brand-/Kategorie-Stories, die auch
    # als Showcase getaggt sind und nichts verlinken.
    if layout_type == 'product_showcase_video':
        clickable = bool(cta_text or links_to)
        return ('video', clickable, ('pdp_asin' if clickable else 'none'))
    # Sonstige Videos (Hero-Videos): klickbar nur wenn CTA oder linksTo
    if has_video or layout_type.startswith('hero_video'):
        return ('video', bool(cta_text or links_to), ('internal_subpage' if (cta_text or links_to) else 'none'))
    # Filter UI
    if layout_type in ('filter_accordion_collapsed', 'filter_banner'):
        return ('product_selector', True, 'internal_filter')
    # Amazon chrome
    if layout_type in ('amazon_nav_header', 'amazon_share_footer'):
        return ('text', True, 'amazon_native')
    if layout_type == 'separator_invisible':
        return ('image', False, 'none')
    # Text-lastig
    if image_category == 'text_image':
        clickable = bool(cta_text or links_to)
        return ('image_text', clickable, ('internal_subpage' if clickable else 'none'))
    # Editorial section intro
    if layout_type == 'editorial_section_intro':
        return ('image_text', False, 'none')
    # Benefit
    if image_category == 'benefit':
        return ('image_text', bool(cta_text or links_to), ('internal_subpage' if (cta_text or links_to) else 'none'))
    # Default: Bild. Clickable wenn cta oder linksTo vorhanden.
    clickable = bool(cta_text or links_to)
    # Herodach-Heuristik: subcategory_tile und editorial_tile_pair/quad sind fast immer Navigation
    if layout_type in ('subcategory_tile', 'editorial_tile_pair', 'editorial_tile_quad'):
        return ('image', True, 'internal_subpage')
    if layout_type.startswith('hero_'):
        return ('image', clickable, ('internal_subpage' if clickable else 'none'))
    # Rest
    return ('image', clickable, ('internal_subpage' if clickable else 'none'))


def derive_link_target(layout_type, cta_text, links_to):
    """Best-effort Link-Target aus vorhandenen Feldern."""
    if links_to:
        return links_to
    if cta_text:
        # Heuristische Zuordnung ueber CTA-Wortlaut
        c = cta_text.lower()
        if 'neuheiten' in c:   return 'unsere-neuheiten'
        if 'bestseller' in c:  return 'bestseller'
        if 'beraten' in c:     return 'produktselektor'
        if 'produkte ansehen' in c: return 'multi_pdp_via_hotspots'
        if 'stoebern' in c or 'entdecken' in c: return 'category'
    return None


def derive_confidence(link_target, links_to, cta_text, layout_type):
    """Gibt an, wie sicher wir uns bei Klickbarkeit und Target sind."""
    if links_to and cta_text: return 'high'
    if layout_type.startswith('product_grid_'): return 'high'  # Amazon rendert
    if layout_type.startswith('shoppable_'):    return 'high'
    if layout_type == 'product_showcase_video':
        return 'high' if links_to else 'medium'
    if layout_type in ('subcategory_tile',):    return 'medium'
    if links_to or cta_text:                    return 'medium'
    if layout_type.startswith('editorial_tile'): return 'medium'
    return 'low'


# ---------- Main ----------

def main():
    data = json.loads(V3_PATH.read_text(encoding='utf-8'))

    total_tiles = 0
    clickable_count = 0
    low_confidence_count = 0

    for page in data['pages']:
        for m in page.get('modules', []):
            lt = m.get('layoutType', '')
            tool = V3_TO_TOOL.get(lt, {'toolLayoutId': '1', 'role': 'unknown'})
            tool_layout_id = tool['toolLayoutId']

            if tool_layout_id and tool_layout_id in LAYOUTS:
                m['toolLayoutId'] = tool_layout_id
                m['toolLayoutName'] = LAYOUTS[tool_layout_id]['name']
                m['toolLayoutType'] = LAYOUTS[tool_layout_id]['type']
            else:
                m['toolLayoutId'] = None
                m['toolLayoutName'] = None
                m['toolLayoutType'] = 'amazon_native' if tool['role'] == 'amazon_native' else 'skip'
            m['toolLayoutRole'] = tool['role']

            # Per tile
            img_seq = LAYOUT_TILE_IMG_TYPES.get(tool_layout_id or '', [])
            for idx, t in enumerate(m.get('tiles', [])):
                total_tiles += 1
                image_category = t.get('imageCategory', 'creative')
                cta_text = t.get('ctaText') or None
                links_to = t.get('linksTo') or None
                has_video = ('video' in lt) or (t.get('textOnImage', {}).get('textType') == 'video' if isinstance(t.get('textOnImage'), dict) else False)

                tile_type, clickable, link_type = classify_tile(lt, image_category, cta_text, links_to, has_video)
                t['toolTileType'] = tile_type

                # toolImageType aus Layout-Position
                if idx < len(img_seq):
                    t['toolImageType'] = img_seq[idx]
                else:
                    t['toolImageType'] = img_seq[0] if img_seq else 'UNKNOWN'

                # link-Objekt
                link_target = derive_link_target(lt, cta_text, links_to)
                confidence = derive_confidence(link_target, links_to, cta_text, lt)

                if clickable: clickable_count += 1
                if confidence == 'low': low_confidence_count += 1

                t['link'] = {
                    'clickable': bool(clickable),
                    'linkType': link_type,
                    'linkTarget': link_target,
                    'ctaLabel': cta_text,
                    'confidence': confidence
                }

            # Fuer product_grid_* ohne tiles[]: synthetischen Tile-Aggregate-Eintrag auf Modul-Ebene
            if lt.startswith('product_grid_') and not m.get('tiles'):
                tile_count = m.get('tileCount', 0)
                m['productGridAggregate'] = {
                    'toolTileType': 'best_sellers' if 'bestsellers' in lt else ('recommended' if 'new_arrivals' in lt else 'product_grid'),
                    'toolImageType': 'PRODUCT_TILE_ASIN',
                    'asinTileCount': tile_count,
                    'link': {
                        'clickable': True,
                        'linkType': 'pdp_asin_multi',
                        'linkTarget': 'amazon_rendered_tiles',
                        'ctaLabel': None,
                        'confidence': 'high'
                    },
                    'note': f'{tile_count} ASIN-Kacheln, Amazon rendert Produktbild plus Preis selbst, kein Brand-Design.'
                }

    # Metadata
    data['v3SchemaNote'] = (data.get('v3SchemaNote') or '') + ' Tool-Vocabulary und Clickability-Layer hinzugefuegt: toolLayoutId/Name/Type/Role pro Modul, toolTileType plus toolImageType plus link-Objekt pro Tile.'
    data['methodology'] = 'V4-v3-Blueprint-tool-aligned-20260422'

    V3_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')

    print(f'Tool-alignment done.')
    print(f'  Tiles total: {total_tiles}')
    print(f'  Clickable: {clickable_count} ({100*clickable_count//max(total_tiles,1)}%)')
    print(f'  Low confidence: {low_confidence_count}')
    # Zaehle tool-vocabulary coverage
    modules_with_tool = sum(1 for p in data['pages'] for m in p['modules'] if m.get('toolLayoutRole'))
    tiles_with_tool = sum(1 for p in data['pages'] for m in p['modules'] for t in m.get('tiles', []) if t.get('toolTileType'))
    total_modules = sum(len(p['modules']) for p in data['pages'])
    print(f'  Modules with toolLayoutRole: {modules_with_tool}/{total_modules}')
    print(f'  Tiles with toolTileType: {tiles_with_tool}/{total_tiles}')


if __name__ == '__main__':
    main()
