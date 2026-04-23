#!/usr/bin/env python3
"""
Entfernt Amazon Nav Header und Share Footer komplett aus dem v3-Aggregat
und den Einzel-Blueprints. Die Module sind keine Brand-Design-Entscheidung
und gehoeren nicht in die Datenbank, die spaeter neue Brand Stores
generiert.

Positionen werden neu durchnummeriert, moduleIds neu gesetzt.
"""

import json
from pathlib import Path

AGGREGATE = Path('data/store-knowledge/rerun-v3/natural-elements_analysis.json')
BLUEPRINT_DIR = Path('data/store-knowledge/rerun-v3/blueprints')

LAYOUTS_TO_REMOVE = {'amazon_nav_header', 'amazon_share_footer'}


def clean_page(page):
    before = len(page.get('modules', []))
    modules = [m for m in page.get('modules', []) if m.get('layoutType') not in LAYOUTS_TO_REMOVE]
    for idx, m in enumerate(modules, start=1):
        m['position'] = idx
        slug = page.get('pageName', 'page').lower().replace(' ', '_').replace('-', '_')
        m['moduleId'] = f"{slug}_mod_{idx:02d}"
    page['modules'] = modules
    return before - len(modules)


def main():
    removed_total = 0

    # Aggregat
    data = json.loads(AGGREGATE.read_text(encoding='utf-8'))
    for page in data.get('pages', []):
        removed_total += clean_page(page)
    AGGREGATE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"Aggregat: {removed_total} Amazon-Chrome-Module entfernt")

    # Einzel-Blueprints
    if BLUEPRINT_DIR.exists():
        for bp_file in sorted(BLUEPRINT_DIR.glob('natural-elements_*.json')):
            bp = json.loads(bp_file.read_text(encoding='utf-8'))
            removed_bp = clean_page(bp)
            bp_file.write_text(json.dumps(bp, indent=2, ensure_ascii=False), encoding='utf-8')
            if removed_bp:
                print(f"  {bp_file.name}: {removed_bp} entfernt")


if __name__ == '__main__':
    main()
