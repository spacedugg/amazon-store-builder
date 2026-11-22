#!/usr/bin/env python3
"""Read a small, explicit selection from the packaged reference-page corpus."""

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "data/store-knowledge/_reference_style_profiles.json"
UUID = re.compile(r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}", re.I)


def normalized(value):
    value = unicodedata.normalize("NFKD", str(value)).casefold()
    return re.sub(r"[^a-z0-9]", "", value)


def page_id(value):
    match = UUID.search(str(value))
    return match.group(0).lower() if match else None


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def pages_for(store):
    relative = store.get("fullPageReviews", {}).get("file")
    if not relative:
        raise ValueError("This store has no packaged full-page review file")
    path = (ROOT / relative).resolve()
    expected = (ROOT / "data/store-knowledge/reference-pages").resolve()
    if not path.is_relative_to(expected) or path.suffix != ".json":
        raise ValueError("Invalid reference-page file path")
    chunk = load_json(path)
    for row in chunk.get("stores", []):
        if row.get("storeId") == store["id"]:
            return row.get("pages", [])
    raise ValueError("The store is missing from its declared reference-page file")


def resolve_store(stores, query):
    alias = normalized(query)
    for store in stores:
        if alias in {normalized(store["id"]), normalized(store.get("brandName", ""))}:
            return store
    identity = page_id(query)
    if identity:
        for store in stores:
            if identity == page_id(store.get("sourceUrl", "")):
                return store
        for store in stores:
            if any(identity == page_id(page.get("sourceUrl", "")) for page in pages_for(store)):
                return store
    raise ValueError("Unknown reference store: " + query)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", action="store_true", help="List available reference stores")
    parser.add_argument("--store", help="Store ID, brand name, or a reference-page URL")
    parser.add_argument("--profile", action="store_true", help="Read the selected store's style profile")
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument("--page", help="Read one page by exact name, URL, or page UUID")
    selection.add_argument("--all", action="store_true", help="Read all pages of the selected store")
    args = parser.parse_args()
    if not args.catalog and not args.store:
        parser.error("Choose --catalog or --store")
    if args.catalog and (args.store or args.profile or args.page or args.all):
        parser.error("Use --catalog on its own")
    if args.profile and (args.page or args.all):
        parser.error("Use --profile separately from --page or --all")
    try:
        stores = load_json(INDEX)["stores"]
        if args.catalog:
            result = [{"id": s["id"], "brandName": s["brandName"], "sourceUrl": s["sourceUrl"],
                       "coverage": s.get("fullPageReviews", {})} for s in stores]
        else:
            store = resolve_store(stores, args.store)
            if args.profile:
                result = store
            else:
                pages = pages_for(store)
                if args.page:
                    identity = page_id(args.page)
                    matches = [p for p in pages if
                               (identity and identity == page_id(p.get("sourceUrl", ""))) or
                               p.get("pageName", "").casefold() == args.page.casefold() or
                               p.get("sourceUrl") == args.page]
                    if len(matches) != 1:
                        raise ValueError("Page name is unknown or ambiguous; select an exact URL from the page list")
                    result = matches[0]
                elif args.all:
                    result = pages
                else:
                    result = [{k: p.get(k) for k in ("pageName", "sourceUrl", "status", "pageRole")} for p in pages]
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (OSError, ValueError, KeyError) as error:
        print("Reference reader: " + str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
