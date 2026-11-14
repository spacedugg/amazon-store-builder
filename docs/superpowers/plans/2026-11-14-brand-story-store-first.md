# Brand Story Store-first Implementation Plan

> **For agentic workers:** Implement the tasks below with regression tests and one whole-branch review.

**Goal:** Replace the large setup form with Store-first and manual entry, a single organization-skill invocation, and independent interactive examples.

**Architecture:** Persist optional planning metadata alongside schemaVersion 1; one shared card sequence remains authoritative. A deterministic, bounded Amazon-only discovery API supplies editable category/product observations. Claude remains external, using a downloadable one-time organization package; the per-project prompt contains project facts and invokes that skill.

**Tech Stack:** React 18, Vite, Vercel CommonJS API, Node tests and Playwright.

**Spec:** User-approved flow and `docs/research/2026-11-14-brand-story-strategic-context.md`.

## Global Constraints

- Maximum 19 shared cards; separate desktop/mobile background images only.
- Existing projects, stable IDs/file paths, image preservation and snapshot privacy remain compatible.
- Grid footer links point to category pages, four slot targets point to products; repeated ASINs allowed.
- No fabricated category URLs, products, claims or bestseller rankings. Discovery failures are visible and manually repairable.
- User installs the skill in Claude, not in ChatGPT. Package is persisted in this repository.

## Review Focus

- Partial or blocked Store discovery must preserve successful observations and allow manual continuation.
- Editing existing projects must preserve cards, assets and legacy context on JSON import.
- Store category URLs must not be relabeled as a verified homepage; unselected pages must not become grids.
- Bestseller and hero roles can overlap without duplicate automatic cards.
- Internal planning/source data must stay out of designer/customer snapshots.

## Task 1: Store discovery

Files: new `api/brand-story-discover.js`, parser utility under `api/_lib`, tests `tests/brandStoryDiscovery.test.mjs`.

- [ ] Add failing fixture tests for navigation, category-scoped ASIN extraction, Amazon URL validation, partial failures and timeout behavior.
- [ ] Implement POST `{storeUrl, pageUrl?}` -> `{storeUrl, brandName, marketplace, pages:[{url,name,pageId,asins,status}], warnings}`. Fetch one selected page per request to permit progressive UI and retries, using existing BrightData configuration without Gemini.
- [ ] Run focused tests; report interface and limitations.

## Task 2: Organization skill and prompt

Files: `src/brandStoryPrompt.mjs`, package build script, generated `public/brand-story-claude/*`, tests.

- [ ] Test short explicit skill invocation, compatible optional planning schema, deterministic package members.
- [ ] Implement goal-first methodology, six reference patterns with client context, editable layout preservation and specific image/card briefings. Include schema and references in one installable ZIP.
- [ ] Keep project prompt short: invoke skill, project facts/selection/current cards, clear expected JSON contract; do not repeat full skill/schema.
- [ ] Generate package and verify archive and tests. Do not claim Claude installation.

## Task 3: Simplified planning interface

Files: `StorySetupDialog.jsx`, new planning UI/helper as needed, `brandStoryModel.mjs`, `brandStoryWorkflow.mjs`, `BrandStoryBuilder.jsx`, overview/references/CSS, tests.

- [ ] Add failing tests for two entry routes, editable category/product selection, single focus selection, short Claude copy, independent examples and legacy import preservation.
- [ ] Persist `planning` with mode/storeUrl/goal/categories/focusProducts; optional brand notes reuse `brandFacts`. Marketplace/language under optional settings. Store-first supports progressive page discovery, per-page retry and manual correction. Product focus includes reason and optional mixed selection.
- [ ] Allow explicit category-grid layout creation respecting remaining card budget and preserving existing cards. Manual route opens empty/current preview directly.
- [ ] Move organization setup download to separate overview help; show all examples stacked via overview button.
- [ ] Run Node suite/build and browser regression tests.

## Task 4: Integration and delivery

- [ ] Independent source review; address material findings and verify again.
- [ ] Commit/push via GitHub integration, create reviewable PR and run CI browser tests.
- [ ] Provide concrete implementation status, tested limits and the installable Claude ZIP. Merge only within existing authorization.

## Progress

Baseline: 80 Node tests passed on 2026-11-14. Working branch `feat/brand-story-store-first`.
Ruling: Continue in existing feature checkout; user authorized continuing the concrete proposed flow, so no additional worktree/plan permission round.
