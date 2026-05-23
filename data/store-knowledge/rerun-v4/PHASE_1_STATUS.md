# Phase 1 DOM Extraction Status (Stand 2026-05-23, Marathon-Abschluss)

## UPDATE 2026-05-23 (Marathon-Session, ALLE 19 v4-Stores komplett)

**Phase 3 Brand Identity Synthese abgeschlossen fuer (19 Stores):**

| Store | Pages | Methodik | File |
|---|---|---|---|
| kloster-kitchen | 10/10 | Goldstandard plus Express | `kloster-kitchen_analysis.json` |
| twentythree | 5/5 | Goldstandard | `twentythree_analysis.json` |
| nucompany | 3/3 | Goldstandard | `nucompany_analysis.json` |
| manscaped | 6/6 | Express plus Pilot | `manscaped_analysis.json` |
| cloudpillo | 7/7 | Express | `cloudpillo_analysis.json` |
| desktronic | 7/7 | Express aus Phase-1-DOMs | `desktronic_analysis.json` |
| blackroll | 8/8 | Express aus Phase-1-DOMs | `blackroll_analysis.json` |
| gritin | 9/9 | Express aus Phase-1-DOMs | `gritin_analysis.json` |
| night-cat | 10/10 | Express aus Phase-1-DOMs | `night-cat_analysis.json` |
| kaercher | 10/52 (Top 10) | Express aus Phase-1-DOMs | `kaercher_analysis.json` |
| bedsure | 4/11 (Probe-Run) | Probe-Run | `bedsure_analysis.json` |
| **nespresso** | **10/19 (Top 10)** | **Sub-Agent Chrome MCP** | `nespresso_analysis.json` |
| **esn** | **10/21 (Top 10)** | **Sub-Agent Chrome MCP** | `esn_analysis.json` |
| **feandrea** | **10/18 (Top 10)** | **Sub-Agent Chrome MCP** | `feandrea_analysis.json` |
| **hansegruen** | **10/19 (Top 10)** | **Sub-Agent Chrome MCP** | `hansegruen_analysis.json` |
| **holy-energy** | **10/12 (Top 10)** | **Sub-Agent Chrome MCP** | `holy-energy_analysis.json` |
| **masterchef** | **10/20 (Top 10)** | **Sub-Agent Chrome MCP** | `masterchef_analysis.json` |
| **more-nutrition** | **10/15 (Top 10)** | **Sub-Agent Chrome MCP** | `more-nutrition_analysis.json` |
| **trixie** | **10/49 (Top 10)** | **Sub-Agent Chrome MCP** | `trixie_analysis.json` |

**Plus natural-elements vollstaendig (Goldstandard-Referenz aus Vor-Iteration im store-knowledge Hauptordner).**

**Per-Page Blueprints im v4-Format (159 Blueprints):**

| Store | Blueprints | Iteration |
|---|---|---|
| kloster-kitchen | 10 | 2026-05-13 |
| twentythree | 5 | 2026-05-13 |
| nucompany | 3 | 2026-05-13 |
| manscaped | 6 | 2026-05-13 |
| cloudpillo | 7 | 2026-05-13 |
| desktronic | 7 | 2026-05-13 |
| blackroll | 8 | 2026-05-22 |
| gritin | 9 | 2026-05-22 |
| night-cat | 10 | 2026-05-22 |
| kaercher | 10 | 2026-05-22 |
| bedsure | 4 | vor 2026-05-13 |
| **nespresso** | **10** | **2026-05-23** |
| **esn** | **10** | **2026-05-23** |
| **feandrea** | **10** | **2026-05-23** |
| **hansegruen** | **10** | **2026-05-23** |
| **holy-energy** | **10** | **2026-05-23** |
| **masterchef** | **10** | **2026-05-23** |
| **more-nutrition** | **10** | **2026-05-23** |
| **trixie** | **10** | **2026-05-23** |

**Summe: 159 Per-Page-Blueprints abgelegt unter `blueprints/`**

**Methodik (Stand 2026-05-23):**

- Phase 1 v2: erweitertes Skript mit `imageUrls`, `links` (asin/page), `asins` pro Modul
- Phase 2: Vision-Pass per Chrome MCP Screenshots, v4-Blueprint nach `docs/BLUEPRINT_EXTRACTION_PROMPT_V4.md`
- Express-Modus: Bei strukturell aehnlichen Pages reduziert auf Modul-Klassen plus voiceMarkers plus pageArchitecture
- Phase 3: Aggregation aller Page-Blueprints zu storeAnalysis-Block
- **Sub-Agent Chrome MCP Marathon (2026-05-23)**: Pro Store ein dedizierter Sub-Agent mit eigenem Chrome-Tab fuer parallele Crawls. Discovery via Live-Brand-Store-Navigation statt veralteter v3-pageIds. Erfolgsquote 8/8 nach Retry.

**Wichtige Erkenntnis aus dem Marathon (2026-05-23):**

Die alten v3-Analyses (vom April 2026) im Hauptordner enthalten zwar Page-Listen mit pageIds, aber die alten 8-Zeichen-Prefix-IDs sind nicht mehr direkt aufrufbar. Amazon verwendet heute volle 36-Zeichen-GUIDs. Bei Nespresso wurde sogar die Startseite komplett neu aufgesetzt (komplett neue GUID, alte 8-Zeichen-Prefix wird nicht mehr akzeptiert). Sub-Agents wurden mit Discovery-Schritt ausgestattet, der die aktuellen GUIDs aus der Live-Brand-Store-Navigation extrahiert.

**Vokabular-Updates (2026-05-23):**

- `_voice_marker_vocabulary.md`:
  - voiceRegister: `jung_lebendig` (holy-energy), `expert_endorsement` (hansegruen)
  - vocabularyField: `premium_lifestyle` (nespresso), `nachhaltig` (trixie, feandrea), `gastronomie` (masterchef)
  - claimType: `naming_signature` (holy-energy, more-nutrition), `certified_sustainability` (feandrea)
  - rhetoricalDevice: `wortspiel_markenname` (more-nutrition), `verb_imperative_section` (masterchef)
- `_hero_archetype_vocabulary.md`:
  - `video_only_premium_showcase` (nespresso Atelier)
  - `category_distributor_with_hero_tile` (trixie Startseite)
  - `brand_series_distributor` (trixie TRIXIE Serien)
  - `editorial_story_hero` (trixie Katzentoiletten)
  - `interactive_hotspot_hero` (trixie Neuheiten, esn Startseite)
- `_page_architecture_pattern_vocabulary.md`:
  - 14 neue Pattern aus dem 8-Stores-Marathon: `hero_banner_lead_asin_plus_product_grid_varianten`, `hero_video_plus_product_grid_voll_sortiment_24_asins`, `hub_zu_sub_linien_tile_quad_verteiler`, `spezies_hub_tile_row_avalanche_plus_full_collection`, `alternierendes_image_plus_tile_pair_sequenz`, `sub_category_single_hero_product_with_multi_video_demo`, `multi_featured_asin_showcase_sequence`, `pair_sequence_only_no_hero`, `inverse_grid_first`, `bestseller_carousel_first_plus_triade`, `featured_deal_sequence`, `category_distributor_5tile_asymmetric_hero`, `brand_series_sub_minimal_headerless`, `dual_product_grid_promo`

**Offene Punkte:**

- Vision-Pass pro Blueprint: viele `textOnImage` Felder noch als `screenshot_required` markiert. Folge-Iteration koennte echte Hero-Headline-/Subline-/CTA-Texte verifizieren.
- Cross-Store Konsolidierung: Pattern-Frequenz-Analyse ueber alle 19 Stores wuerde die haeufigsten 5-10 Page-Architecture-Pattern als Pipeline-Default-Templates kuratieren.
- v4-Checklisten-Validation §18 fuer alle Stores systematisch durchziehen.
- Tonalitaets-Mischungen (z.B. naturwissenschaftlich plus kulinarisch bei kloster-kitchen, lifestyle plus nachhaltig bei feandrea): v4-Schema mit `vocabularyFieldSecondary` erweitern.

## Methodik-Referenz (gilt fuer alle 19 Stores)

**Scope-Regel:**
- Bei grossen Stores maximal 10 Pages, davon 1 Startseite (Pflicht), 1 Spezialseite (Ueber uns, Bestseller, Sale oder vergleichbar) wenn vorhanden, Rest Produktkategorie-Pages.
- Kleine Stores (unter 12 Pages) wurden komplett gecrawlt (z.B. nucompany 3/3, twentythree 5/5, manscaped 6/6, cloudpillo 7/7, desktronic 7/7, blackroll 8/8, gritin 9/9).
- Die vollstaendige Page-Liste bleibt in `page-lists/{store}_pages.json` dokumentiert, aber nur 10 Pages werden in v4 DOM-extracted.

**Datei-Konventionen:**
- Phase 1 DOM: `rerun-v4/raw-dom/{store}/{NN}_{slug}_dom.json`
- Phase 2 Blueprint: `rerun-v4/blueprints/{store}_{slug}.json`
- Phase 3 Analysis: `rerun-v4/{store}_analysis.json`
- Page-Liste mit allen Top-Level-Pages: `rerun-v4/page-lists/{store}_pages.json`

## Naechste Iteration (nach diesem Marathon)

Phase 1 ist fuer alle 19 v4-Stores abgeschlossen. Naechste Schritte:

1. **Generierungs-Pipeline auf v4-Datenbasis umstellen**: Tool nutzt die 159 Per-Page-Blueprints plus 19 Phase-3-Analyses plus 3 Vokabular-Dateien als Wissensbasis fuer Brand-Store-Konzepte neuer Marken.
2. **Pattern-Frequenz-Analyse**: Welche Page-Architecture-Pattern sind die haeufigsten 5-10 ueber alle Stores? Diese werden Pipeline-Default-Templates.
3. **Tonalitaets-Cluster**: Welche voiceMarker-Kombinationen treten zusammen auf? Diese werden Tonalitaets-Profile fuer Brand-Briefings.
4. **Vision-Pass-Folge-Iteration**: Per-Page-Blueprints mit echten Hero-Texten (Headlines, Sublines, CTAs) anreichern wo aktuell nur `screenshot_required` steht.
