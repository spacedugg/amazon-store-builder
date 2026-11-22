# Reference workflow and restored full-page audit

The active catalogue has 24 stores and 525 unique pages in its 21 November navigation snapshot. All 525 now have individual records: 523 evaluated, one partial source capture (Feandrea Sonderangebote, 35 failed source assets), and one unavailable page (SNOCKS Deals). This is coverage of that discovered navigation snapshot, not a promise to cover pages Amazon adds later or unrelated linked storefronts.

## Evidence and recovery

After the previous workspace disconnected, the original 447 additional capture records were recovered from their durable public source records. The existing 24 homepage reviews and 54 selected subpage reviews remain intact. There are 92 surviving original vision analyses. The remaining 354 page records were rebuilt from the saved rendered DOM: module sequence, image/source-crop proportions, product modules, text and link destinations. Their `analysisBasis` is explicitly `dom_structure`; they do not assert newly verified colours, type styling, layering or image treatment. The failed page has no invented analysis. The partial page identifies the missing source assets.

The earlier visual inspection of the additional captures did not leave recoverable detailed notes. This release therefore preserves the recoverable evidence and method rather than presenting reconstructed structural notes as original visual annotations. Exact source captures remain linked for visual verification. No mobile layout, video playback, hover state or hidden interaction is claimed from desktop captures.

The historical 19 analyses and 159 blueprints are unchanged. New per-page records live in twelve JSON chunks; the index links each store to its chunk and compares observed sequences and page roles. `scripts/read-reference-pages.py` supports catalogue, profile, page list and exact page selection, avoiding loading the entire corpus into an LLM context. The portable Claude ZIP contains 198 files, within the upload limit of 200.

## What changes in the working process

The existing project reference choice supplies the selected store URL and the operator's macro-style notes. Existing navigation, assortment and customer CI remain authoritative. Claude reads the selected reference profile, its cross-page comparison, then evidence for the matching page role. The 54 earlier examples no longer define the complete available page selection.

Home, categories and brand-story pages may use different supported sequences while sharing a macro style. Product counts and page lengths are source facts, never target quotas. Image-led versus native-product presentation, text hierarchy, grouping, spacing and mobile recomposition must be concrete instructions in the English designer fields. Final German image copy stays in `textOverlay`. The model must distinguish an observed reference pattern from a new composition it proposes for the customer's brand.

The tool now retains `manualCI` and `productCI` through briefing import, displays their designer notes even without selected references, and includes them in DOCX. Existing-store editing uses the current ID/revision-based patch context; a full backup remains available. It no longer recommends a replacement import containing image placeholders as a way to preserve existing assets.

## Real concept trials

Three independent fresh LLM runs used the actual `seed/true-nature-store.json` facts and nine ASINs in the Schlaf and Energie categories. Scope was exactly Home, Schlaf, Energie and Über uns. Each run had the same own-brand green/cream CI and delegated structural/copy choices. Each saw one selected reference: ESN, SNOCKS or HS HOP-SPORT; other generated concepts were not supplied.

- Bold: compact category-pair start, image-led Schlaf selection, grid-first Energie, editorial founder pairs.
- Minimal: quiet photographic welcome, paired category access and a short founder link; product photos and concise labels carry the categories.
- Lifestyle: compact category access followed by an immersive lifestyle composition and founder split; original layering is specified as a design task, not falsely attributed to an unseen source module.

All three real JSON outputs are retained as regression fixtures. Tests use the production importer and validator, check exact catalogue/category membership, internal links, explicit desktop/mobile dimensions, preservation of every brief and general CI instruction, and extract the real generated DOCX XML. Browser trials import the JSON through the real new-store flow, then check the share/designer view at desktop and mobile widths with isolated API fixtures. They do not write customer stores or call a paid external Claude API. Automated checks demonstrate implementation behaviour; visual design quality remains a design judgment.
