# Brand Story Workflow Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate form-and-tabs story UI with the approved Store Builder style project, Claude import, visual editing and designer/customer workflow.

**Architecture:** Keep the existing story API, records, tokens and upload handler. Extend the schema version 1 model with optional structured context and per-background briefs, and use one shared carousel for editor, examples and share views. Split overview, setup dialog, carousel and delivery views into focused components.

**Tech Stack:** React 18, Vite, Turso/libsql, Vercel Blob, node:test, jsdom, Playwright.

**Spec:** `docs/brand-story-workflow-design.md`

## Global Constraints

- Exactly one ordered card list for desktop and mobile; maximum 19 media/grid cards combined.
- Desktop background 3660 × 1563; mobile 1389 × 1875; media 814 × 1019; grid subimage 1328 × 1456 px.
- Mobile displays exactly one complete card, including all four grid images.
- Preserve existing schema version 1 stories, IDs, stable file paths, revisions, snapshots and tokens.
- No direct Claude API, Amazon publishing, or automatic skill installation.
- Briefs are editable English content directions; exact image text follows the marketplace language.

## Review Focus

1. Existing records missing new fields must open without data loss; test legacy normalization and projection.
2. Imported reordered cards must keep images by stable ID and ASIN; test import reconciliation.
3. An import for another brand must create a separate record; test import identity and UI save payload.
4. Shared/customer data must never render or serialize internal context; test the real API projection.
5. An interrupted session must remain recoverable without hiding the project overview; test explicit draft resume.

## Task 1: Shared model and safe import

Files: `src/brandStoryModel.mjs`, `src/brandStoryWorkflow.mjs`, `tests/brandStoryWorkflow.test.mjs`, `tests/brandStoryApi.test.mjs`, `api/brand-stories.js`.
Interfaces: `normalizeStory(story)`, `prepareStoryImport(text,current) -> {story,foreign,summary}`, `storySummary(story)`, `designerStory(story)`, `backgroundBrief(story,kind)`. Preserve optional `context` and `background.desktopBrief/mobileBrief/desktopCopy/mobileCopy`; project summaries contain only display metadata.

- [ ] Add regression tests for legacy fallback, private projections, 19/20 card limits, reordered imports and foreign identity.
- [ ] Run targeted tests and confirm expected failures.
- [ ] Implement model extensions, privacy projection and compact API list summaries.
- [ ] Run model/API tests and commit.

## Task 2: Shared carousel and real examples

Files: `src/components/brand-story/StoryCarousel.jsx`, `src/components/BrandStoryBuilder.css`, `public/brand-story-examples/stories.json`, `tests/browser/brand-story.spec.mjs`.
Interface: `StoryCarousel({story,mobile,raster,onSelect,selected,showDraft})`; examples use the same normalized model and component. Use the public website snapshot's individual image/grid metadata. Imported reference links remain empty when source targets are absent.

- [ ] Add a browser regression proving only the active mobile card intersects the card viewport and the fixed background remains stationary.
- [ ] Run to confirm the current mobile neighboring-card failure.
- [ ] Extract carousel, clip card rail, render editable selection and meaningful draft placeholders, load normalized real reference data.
- [ ] Verify carousel tests and commit.

## Task 3: Overview and Claude setup

Files: `src/components/brand-story/StoryOverview.jsx`, `StorySetupDialog.jsx`, `src/brandStoryPrompt.mjs`, `src/components/BrandStoryBuilder.jsx`, `tests/brandStoryUI.test.mjs`.
Interfaces: Overview consumes API summaries and open/new/resume actions. Setup consumes working story, `onChange`, `onApplyImport` and `onClose`; clipboard prompt and downloadable Claude instructions use the same exported workflow/schema source.

- [ ] Replace obsolete tab assertions with overview, explicit draft resume, dialog context, JSON validation and import-review assertions.
- [ ] Run and confirm expected UI failures.
- [ ] Implement project tiles and accessible modal with facts/products/destinations, copy instructions, JSON paste/file import and reviewed adoption.
- [ ] Verify UI tests and commit.

## Task 4: Visual workbench and delivery views

Files: `src/components/BrandStoryBuilder.jsx`, `src/components/brand-story/StoryDelivery.jsx`, `StoryReferences.jsx`, `StoryElements.jsx`, `src/components/BrandStoryBuilder.css`, UI/browser tests.
Interfaces: one selected background/card drives the detail panel. Plus picker accepts insertion position; card reordering preserves objects. Designer uploads use the existing restricted token endpoint. Delivery view derives only public fields and stable paths from customer projection.

- [ ] Add tests for mixed-card insert/limit, editable backgrounds, complete grid fields, designer briefing/reference access and customer Seller Central details without internals.
- [ ] Run and confirm expected failures.
- [ ] Replace main tabs and dropdown, implement Store Builder style toolbar/three-column workbench, shared editor/brief controls, link dialog, references and customer reconstruction details.
- [ ] Verify targeted tests and commit.

## Task 5: Claude package and OmniRelexx regression

Files: `src/brandStoryPrompt.mjs`, `public/brand-story-claude/`, `scripts/build-brand-story-skill.mjs`, reference fixtures, model/browser tests.
Interface: `claudePrompt(story)` and generated portable `SKILL.md`/schema share one versioned source. Expose user-requested download in setup, without installing into accounts.

- [ ] Test generated skill/schema and a realistic 9-card OmniRelexx fixture (media 1–4, grids 1–2, media 5–7), including duplicate ASINs.
- [ ] Run to confirm new behavior is absent.
- [ ] Generate portable content, include functional-principle guidance and JSON examples, exercise original folder assignment and all four preview states.
- [ ] Verify tests and commit.

## Task 6: End-to-end validation and integration

- [ ] Run full `npm test`, `npm run build` and Playwright browser suite; inspect actual page layout and fix regressions.
- [ ] Request one fresh whole-branch review against the approved spec; address material issues and rerun relevant tests.
- [ ] Push feature branch and create reviewable PR with validation evidence; verify deployment status and report exact integration state.
