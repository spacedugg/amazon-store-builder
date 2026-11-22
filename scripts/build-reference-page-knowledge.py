#!/usr/bin/env python3
"""Rebuild compact reference evidence from recoverable captures and curated notes.

Usage: python scripts/build-reference-page-knowledge.py [--records PATH]
The existing 24 visual profiles and 54 curated subpages remain unchanged. New
source-only records deliberately do not assert colours, depth or visual style.
"""
import argparse
from collections import Counter
from copy import deepcopy
from datetime import date
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE = ROOT / 'data/store-knowledge'
PROFILE_PATH = KNOWLEDGE / '_reference_style_profiles.json'
SCOPE = ('Desktop source evidence only. Curated visual reviews and recovered original '
         'vision analyses are distinguished from DOM-structure analysis. No mobile '
         'layout, playback, hover behaviour or unseen assets are inferred.')


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def page_id(url):
    match = re.search(r'/page/([a-fA-F0-9-]{36})', url or '')
    if not match:
        raise ValueError('Expected Store page UUID: ' + str(url))
    return match.group(1).upper()


def unique(values):
    return list(dict.fromkeys(value for value in values if value))


def module_type(row):
    widget = row.get('widgetClass') or ''
    if 'ProductGridFilters' in widget:
        return 'native_product_filters'
    if 'ProductGrid' in widget:
        return 'native_product_grid'
    if row.get('idx') == 0 and not widget:
        return 'store_header_navigation'
    if row.get('shoppableMarkers', 0):
        return 'shoppable_editorial_row'
    if row.get('productCount', 0):
        return 'mixed_native_product_editorial'
    if row.get('imgCount', 0):
        return 'editorial_image_row'
    if row.get('videoCount', 0):
        return 'video_module'
    if row.get('height', 0) <= 1:
        return 'source_hidden_row'
    if not widget and re.search(r'teilen|share', row.get('allTextPreview', ''), re.I):
        return 'utility_footer'
    return 'text_row'


def source_image(sample):
    result = {'alt': sample['alt'][:100]} if sample.get('alt') else {}
    crop = re.search(r'_CR\d+,\d+,(\d+),(\d+)', unquote(sample.get('src', '')))
    if crop and int(crop.group(1)) > 0 and int(crop.group(2)) > 0:
        w, h = map(int, crop.groups())
        result['sourceCropDimensions'] = {'w': w, 'h': h}
        result['sourceCropAspectRatio'] = round(w / h, 3)
    return result


def compact_modules(raw):
    modules = []
    for row in raw.get('dom', {}).get('modules', []):
        kind = module_type(row)
        if kind in ('source_hidden_row', 'store_header_navigation', 'utility_footer'):
            continue
        targets = []
        seen = set()
        for link in row.get('anchors', []) + row.get('tileLinks', []) + row.get('ctas', []):
            url = link.get('href')
            if not url or not url.startswith('https://'):
                continue
            parsed = urlsplit(url)
            key = parsed.netloc + parsed.path
            if key in seen:
                continue
            seen.add(key)
            targets.append({k: v for k, v in {
                'url': 'https://' + key, 'label': (link.get('label') or link.get('text') or link.get('anchorLabel') or link.get('ariaLabel') or '')[:80],
                'type': link.get('linkType'), 'asin': link.get('asin'),
            }.items() if v})
        module = {
            'order': len(modules) + 1, 'type': kind,
            'sourceIndex': row.get('idx'), 'height': row.get('height'),
            'headlines': unique(row.get('headlines', []))[:3],
            'sourceImageCount': row.get('imgCount', 0),
            'nativeProductCount': row.get('productCount', 0),
            'imageSamples': [source_image(image) for image in row.get('imgSample', [])[:2]],
            'sourceCropRatios': unique(source_image(image).get('sourceCropAspectRatio') for image in row.get('imgSample', [])),
            'linkTargets': [],
            'linkTypeCounts': dict(Counter(t.get('type', 'unknown') for t in targets)),
            'linkTargetCount': len(targets),
        }
        for link_type in unique(t.get('type', 'unknown') for t in targets):
            module['linkTargets'].extend([t for t in targets if t.get('type', 'unknown') == link_type][:1])
        layout = row.get('layout', {})
        if layout.get('display') in ('grid', 'flex'):
            module['layout'] = {k: v for k, v in layout.items() if v not in (None, 'none', 'normal')}
        if not module['headlines'] and row.get('allTextPreview') and not kind.startswith('native_product'):
            module['textPreview'] = row['allTextPreview'][:180]
        if row.get('videoCount'):
            module['videoElementCount'] = row['videoCount']
        if row.get('shoppableMarkers'):
            module['shoppableMarkerCount'] = row['shoppableMarkers']
        modules.append(module)
    return modules


def classify_role(name, modules):
    if re.search(r'über uns|about|nachhaltig|verantwortung|geschichte|mission', name, re.I):
        return 'brand_story_or_information'
    if re.search(r'angebot|deal|black week|bestseller|sale', name, re.I):
        return 'promotional_assortment'
    if any(m['type'] == 'native_product_grid' for m in modules):
        return 'category_product_selection'
    if any(m['type'] == 'mixed_native_product_editorial' for m in modules):
        return 'editorial_and_product_selection'
    return 'category_or_product_family_presentation'


def content_modules(modules):
    return [m for m in modules if m['type'] not in ('store_header_navigation', 'utility_footer')]


def dom_notes(modules):
    content = content_modules(modules)
    kinds = Counter(m['type'] for m in content)
    sequence = ' → '.join(m['type'] for m in content)
    observations = [f'Rendered desktop source contains {len(content)} content rows. Source sequence: {sequence or "no additional content rows"}.']
    native = sum(m['nativeProductCount'] for m in content)
    observations.append(f'Source distinguishes {kinds["native_product_grid"]} native product-grid rows, {kinds["mixed_native_product_editorial"]} mixed editorial/native-product rows and {kinds["editorial_image_row"] + kinds["shoppable_editorial_row"]} creative-image rows; reported product-element count is {native}. These are source measurements, not target assortment counts.')
    heads = unique(h for m in content for h in m['headlines'])
    if heads:
        observations.append('Native DOM headline sample: ' + ' | '.join(heads[:6]))
    crop_ratios = unique(str(ratio) for m in content for ratio in m['sourceCropRatios'])
    if crop_ratios:
        observations.append('Available creative source-crop width/height ratios: ' + ', '.join(crop_ratios[:8]) + '. These describe source image crops, not measured rendered tile dimensions or mobile layouts.')
    internal = sum(m['linkTypeCounts'].get('internal_subpage', 0) for m in content)
    pdp = sum(m['linkTypeCounts'].get('pdp_asin', 0) for m in content)
    observations.append(f'Content-row link samples include {internal} internal Store-page targets and {pdp} product-detail targets; duplicate descendant anchors were removed.')
    principles, instructions = [], []
    if kinds['native_product_grid']:
        principles.append('Separate authored category communication from Amazon-native product selection; choose the destination brand’s own ASINs and required scope.')
        instructions.append('In the target JSON, distinguish designed images from native product modules. Keep prices, reviews and buy controls in native modules; do not recreate sampled commercial metadata as artwork.')
    if kinds['mixed_native_product_editorial']:
        principles.append('An editorial/native-product pairing can connect a category explanation or use context with a buyable item when that serves the target page.')
        instructions.append('Specify which part of each mixed row is a designed image and which part is a native product tile; use the target brand’s own imagery and CI.')
    if kinds['editorial_image_row'] or kinds['shoppable_editorial_row']:
        principles.append('Use the observed source row sequence and crop proportions to compare image grouping options; source alt text alone does not establish visual treatment.')
        instructions.append('State the intended image type, grouping, text hierarchy and dedicated mobile composition in each English brief. Use the saved macro-style profile and original image evidence for visual decisions; do not treat source crop sizes as mandatory specifications.')
    if kinds['shoppable_editorial_row']:
        instructions.append('For hotspot images, write an original benefit- or situation-led headline and separately map native hotspots to the target ASINs. Source marker count is not a design requirement.')
    if internal:
        principles.append('Use category-routing modules only where the target page needs a next destination; sampled navigation destinations do not dictate the new sitemap.')
    if not principles:
        principles.append('Choose the target page purpose before selecting a source module sequence; this source record does not establish a universal template.')
    if not instructions:
        instructions.append('Use this page only for the documented source structure. Preserve the target CI and check original screenshot evidence before describing visual styling.')
    return observations, principles, instructions


def curated_page(profile, page=None):
    source = deepcopy(page if page is not None else profile)
    is_home = page is None
    observations = deepcopy(source.get('observations', []))
    principles = deepcopy(source.get('transferablePrinciples', []))
    instructions = deepcopy(source.get('designerInstructions', [])) or ([profile.get('application', {}).get('instructions')] if profile.get('application', {}).get('instructions') else ['Apply only relevant documented visual principles to the target page while preserving its own CI and assortment.'])
    result = {
        'pageName': 'Startseite' if is_home else source['pageName'],
        'sourceUrl': source['sourceUrl'], 'status': 'reviewed',
        'pageRole': 'homepage' if is_home else source['pageRole'],
        'analysisBasis': 'curated_visual_review',
        'capturedAt': source.get('capturedAt'), 'reviewedAt': source.get('reviewedAt'),
        'evidence': deepcopy(source['evidence']),
        'reviewMethod': 'Preserved original curated visual review of full desktop capture',
        'observations': observations, 'transferablePrinciples': principles,
        'designerInstructions': instructions,
        'modules': deepcopy(source.get('modules', [])) or [{'order': 1, 'type': 'curated_visual_sequence', 'layout': source.get('observedHomeSequence') or source.get('differenceFromHome') or 'See preserved visual observations'}],
        'limitations': ['Desktop evidence only; mobile layout and interaction behaviour were not verified.'],
    }
    if source.get('differenceFromHome'):
        result['differenceFromHome'] = source['differenceFromHome']
    return result


def captured_page(raw):
    result = {
        'pageName': raw['pageName'], 'sourceUrl': raw['sourceUrl'],
        'sourceRecordUrl': raw.get('recordUrl') or (raw.get('screenshotUrl', '').rsplit('.', 1)[0] + '.json' if raw.get('screenshotUrl') else ''),
        'reviewMethod': 'desktop capture and source structure; visual notes restored only where available',
    }
    if not raw.get('screenshotUrl'):
        result.update(status='unavailable', analysisBasis='unavailable', pageRole='unverified', reason=raw.get('error') or 'No verifiable Store content returned', observations=[], transferablePrinciples=[], designerInstructions=[], modules=[], limitations=['No layout or content inferred from unavailable source.'])
        return result
    quality = raw.get('quality', {})
    modules = compact_modules(raw)
    notes, principles, instructions = dom_notes(modules)
    analysis = raw.get('analysis')
    result.update({
        'status': 'reviewed' if quality.get('imagesComplete') else 'partially_reviewed',
        'analysisBasis': 'vision_and_dom' if analysis else 'dom_structure',
        'pageRole': analysis.get('pageRole') if analysis else classify_role(raw['pageName'], modules),
        'capturedAt': raw.get('capturedAt'), 'reviewedAt': raw.get('reviewedAt') or str(date.today()),
        'evidence': {'kind': 'full_desktop_subpage_screenshot', 'url': raw['screenshotUrl'], 'width': raw['width'], 'height': raw['height'], 'imagesComplete': quality.get('imagesComplete') is True, 'sourceHtmlHash': quality.get('sourceHtmlHash')},
        'quality': {key: quality[key] for key in ('version', 'imagesComplete', 'partialCapture', 'failedAssets', 'missingImageSlots', 'skeletons', 'sourceHtmlHash') if key in quality},
        'observations': deepcopy(analysis.get('observations')) if analysis and analysis.get('observations') else notes,
        'transferablePrinciples': deepcopy(analysis.get('transferablePrinciples')) if analysis and analysis.get('transferablePrinciples') else principles,
        'designerInstructions': deepcopy(analysis.get('designerInstructions')) if analysis and analysis.get('designerInstructions') else instructions,
        'modules': modules,
        'limitations': deepcopy(analysis.get('limitations', [])) if analysis else ['Restored analysis describes source DOM structure, source crops and link samples. No new visual claim about colours, typography, depth or image treatment is made.', 'Source image alt text is descriptive metadata, not verified copy or a substitute for image review.'],
    })
    if analysis:
        # Preserve every original analysis field exactly once. The immutable raw
        # record remains linked, so the original object can be reconstructed by
        # selecting these keys without duplicating its full text in the ZIP.
        result.update(deepcopy(analysis))
        result['originalVisionAnalysisKeys'] = list(analysis)
        result['visionProvenance'] = {k: v for k, v in raw.get('vision', {}).items() if k in ('provider', 'model', 'evidence', 'humanReview')}
    result['sourceStructure'] = {
        'sequence': [m['type'] for m in modules],
        'contentRows': len(modules),
        'nativeProductCount': sum(m['nativeProductCount'] for m in modules),
        'sourceImageCount': sum(m['sourceImageCount'] for m in modules),
    }
    if raw.get('previousCaptureAnalysis'):
        result['previousCaptureAnalysis'] = deepcopy(raw['previousCaptureAnalysis'])
    result['captureLimitations'] = ['No mobile layout, video playback, hover or hidden interaction inferred. Product counts belong to the source assortment, not the target brief. Full source image and link samples are available in sourceRecordUrl; compact samples are not exhaustive.']
    if not quality.get('imagesComplete'):
        result['captureLimitations'].append(f'Partial capture: {quality.get("failedAssets", "unknown")} source assets failed; missing imagery must not be treated as intentional empty design.')
    return result


def cross_page_analysis(profile, pages):
    patterns = Counter()
    representatives = {}
    for page in pages:
        if page['status'] == 'unavailable':
            continue
        sequence = tuple(page['sourceStructure']['sequence']) if page.get('sourceStructure') else tuple(m['type'] for m in content_modules(page['modules']))
        patterns[sequence] += 1
        representatives.setdefault(sequence, []).append({'pageName': page['pageName'], 'sourceUrl': page['sourceUrl'], 'analysisBasis': page['analysisBasis']})
    return {
        'scope': SCOPE,
        'macroStyleFromCuratedVisualProfile': profile.get('macroStyle'),
        'visualPrinciplesFromCuratedProfile': deepcopy(profile.get('transferablePrinciples', [])),
        'observedStructureFamilies': [{'sequence': list(seq), 'pageCount': count, 'examples': representatives[seq][:3]} for seq, count in patterns.most_common()],
        'pageRoleCounts': dict(Counter(p['pageRole'] for p in pages)),
        'transferPolicy': 'Select a source page with a relevant purpose and inspect its own evidence. Macro style may guide communication; the Home layout is not a template for every subpage. Assortment, product counts and sitemap follow the target brand.',
        'designerApplication': 'Write concrete English module briefs for image type, relative hierarchy, product grouping, depth only when visually supported, transitions and dedicated mobile composition. Keep final customer copy in the target language and preserve the target CI.',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--records', type=Path, default=ROOT / 'audit-work/recovery/all-records.json')
    args = parser.parse_args()
    profiles = read(PROFILE_PATH)
    inventory = read(KNOWLEDGE / 'review-2026-11-21/navigation-inventory.json')
    records = read(args.records)
    indexed = {(r['storeId'], page_id(r['sourceUrl'])): r for r in records}
    if len(indexed) != len(records):
        raise ValueError('Duplicate recovered page records')
    by_store = {}
    profile_map = {p['id']: p for p in profiles['stores']}
    for nav in inventory['stores']:
        profile = profile_map[nav['id']]
        existing = {page_id(profile['sourceUrl']): curated_page(profile)}
        for page in profile['subpagePatterns']:
            existing[page_id(page['sourceUrl'])] = curated_page(profile, page)
        pages = []
        seen = set()
        for link in nav['pages']:
            uuid = page_id(link['url'])
            if uuid in seen:
                continue
            seen.add(uuid)
            page = existing.get(uuid)
            if page is None:
                raw = indexed.get((nav['id'], uuid))
                if not raw:
                    raise ValueError('Missing recovered source: ' + nav['id'] + ' ' + uuid)
                page = captured_page(raw)
            pages.append(page)
        by_store[nav['id']] = pages
    chunks = [{'schemaVersion': 1, 'scope': SCOPE, 'stores': []} for _ in range(12)]
    sizes = [0] * 12
    files = {}
    for store_id, pages in sorted(by_store.items(), key=lambda item: len(json.dumps(item[1])), reverse=True):
        index = min(range(12), key=lambda i: sizes[i])
        chunks[index]['stores'].append({'storeId': store_id, 'pages': pages})
        sizes[index] += len(json.dumps(pages))
        files[store_id] = f'data/store-knowledge/reference-pages/part-{index + 1:02d}.json'
    totals = Counter(p['status'] for pages in by_store.values() for p in pages)
    basis = Counter(p['analysisBasis'] for pages in by_store.values() for p in pages)
    count = sum(totals.values())
    if (count, totals['reviewed'], totals['partially_reviewed'], totals['unavailable']) != (525, 523, 1, 1):
        raise ValueError('Unexpected full audit coverage: ' + str(totals))
    for index, chunk in enumerate(chunks):
        write(KNOWLEDGE / f'reference-pages/part-{index + 1:02d}.json', chunk)
    for profile in profiles['stores']:
        pages = by_store[profile['id']]
        counts = Counter(p['status'] for p in pages)
        profile['fullPageReviews'] = {'file': files[profile['id']], 'pageCount': len(pages), **{status: counts[status] for status in ('reviewed', 'partially_reviewed', 'unavailable')}}
        profile['fullPageAudit'] = deepcopy(profile['fullPageReviews'])
        profile['crossPageAnalysis'] = cross_page_analysis(profile, pages)
        profile['crossPageAnalysis']['evidenceFile'] = files[profile['id']]
        profile['subpagePatternsAreSelectedExamples'] = True
        profile['coverage'].update(subpages='all_discovered_pages_audited', allNavigationEntriesVisuallyReviewed=False, sourceAuditCompleted=True, visuallyReviewedSubpageCount=len(profile['subpagePatterns']), sourceReviewedPageCount=counts['reviewed'] + counts['partially_reviewed'], selectedUnavailableSubpageCount=counts['unavailable'])
        profile['coverage']['analysisBasisCounts'] = dict(Counter(p['analysisBasis'] for p in pages))
        profile['unavailableSubpages'] = [{'pageName': p['pageName'], 'sourceUrl': p['sourceUrl'], 'status': 'not_visually_reviewed', 'reason': p['reason']} for p in pages if p['status'] == 'unavailable']
    profiles['schemaVersion'] = 3
    profiles['fullPageAudit'] = {'discoveredPages': count, 'reviewedPages': totals['reviewed'], 'partiallyReviewedPages': totals['partially_reviewed'], 'unavailablePages': totals['unavailable'], 'unreviewedCapturedPages': 0, 'coverageCompleted': True, 'reader': 'scripts/read-reference-pages.py', 'analysisBasisCounts': dict(basis), 'scope': SCOPE, 'restorationNote': 'Original source captures and DOM records were recovered after workspace loss. Existing curated visual notes and all surviving original vision analyses are preserved. Additional per-page notes were rebuilt from DOM structure and explicitly marked dom_structure; they do not claim a new visual review.'}
    write(PROFILE_PATH, profiles)
    print(json.dumps(profiles['fullPageAudit'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
