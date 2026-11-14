# Brand Story Builder

Entry: `/brand-stories` (also supports `?embed=1`). This is a separate workflow; existing Brand Store data and routes are unchanged.

## Operator workflow

1. Start from the project tile overview. Open an existing story, explicitly resume a local draft, or choose **Neue Brand Story**.
2. The setup dialog gathers brand facts, audience, materials, desired products/ASINs and Store/subpage destinations. Copy its Claude instruction, discuss the concept in Claude, then paste or upload JSON. **JSON prüfen** shows the proposed card structure before **Konzept übernehmen** applies it. A foreign brand/marketplace opens a separate project. A draft can also start without JSON.
3. Edit the fixed background or a card through the preview/sidebar and properties panel. There is one ordered list of up to 19 cards for both devices; only the background image differs. Mobile displays exactly one complete card, including all four slots of an ASIN-grid. The plus picker inserts either card type at a chosen position. Content, English briefs, per-background copy, grid headline, four ASIN/product targets and Store link are editable. Meaningful draft placeholders appear before image upload.
4. Save. **Freigabelinks aktualisieren** creates stable designer and customer links using independent random tokens. Ordinary saves retain the previous shared snapshot.
5. **Designer & Kunde** manages the separate stable links. The designer view shows concrete briefs and image uploads for the selected card/background, concise functional guidance and six interactive reference stories using the same carousel. Designer uploads update the draft and designer snapshot. An operator must publish again to update the customer snapshot.
6. The customer preview includes **Angaben für Seller Central**: card order/types, file links, grid headlines, four ASIN targets per grid and the Store/subpage link. Internal context and designer briefs are omitted.

**Konzept mit Claude** reopens the context/import dialog; the former main instruction/import/reference tabs and project dropdown have been removed. The portable Claude skill can be downloaded from that dialog. Its source, the copied prompt and JSON schema share `src/brandStoryPrompt.mjs`; regenerate the files with `node scripts/build-brand-story-skill.mjs`. No skill is automatically installed into an account.

Production dimensions: desktop background 3660 × 1563, mobile background 1389 × 1875, image card 814 × 1019, each custom grid image 1328 × 1456 px. JPG/PNG, 2 MB per file. Resolution, file-size and aspect-ratio warnings are shown when uploaded files differ; technical minimum dimensions are not displayed in the interface. Warnings allow work-in-progress previews.

Desktop uses the gallery's 1464/625 coordinate system: initial card offset 31.66%, width 24.73%, height 72.48%, top 23.84%, stride 26.78%. First advancement brings card 3 to the left margin; subsequent steps advance three cards. Navigation stops at the final page. Mobile uses its own background, no desktop intro, one-card steps, swipe and keyboard navigation. The background never moves.

The left desktop motif is complementary branding. Essential claims belong on cards. Compact motifs should fit underneath later cards; larger photographic motifs may remain partially visible. Review every state; the final state can reveal more background.

## Folder manifest

- `background-desktop.jpg` / `background-mobile.jpg`
- `card-01.jpg` for an image card
- `card-02-1.jpg` through `card-02-4.jpg` for a grid

PNG also works. `fileKey` is stable when reordering. Unmatched files, duplicate basenames and individual upload failures are reported. Matching positions replace their existing image. Grid image and product target are independent. A valid ASIN triggers product-main-image loading when leaving its field; a dedicated retry button remains available. Custom images take precedence, and removing one restores the loaded product image. Product loading uses the existing Amazon provider and reports failures.

## Deployment

Uses existing `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` and `BLOB_READ_WRITE_TOKEN`; no new third-party account. `api/brand-stories.js` creates its own `brand_stories` table on first use. It never writes `stores`. Deploy the builder before enabling the cockpit entry.

Apply `docs/brand-story-cockpit.patch` to `spacedugg/temoa-salesboard`. This adds its own menu item, permissions entry and `/embed/brand-stories`. `EMBED_BRAND_STORY_URL` may explicitly configure the destination; otherwise the existing `EMBED_STORE_BUILDER_URL` origin is reused with `/brand-stories?embed=1`.

The editor API follows the existing builder deployment access model. The cockpit enforces its own menu permissions; deployment-level access protection of the standalone builder must be checked before production. Shared token routes expose only their intended view; customer data omits internal instructions, source facts, designer briefs and reference material. Tokens are independent and randomly generated. Concurrent updates use revision checks. Designer tokens only accept image assignments; they cannot edit copy or links through that route.

Local session recovery stores the current draft in sessionStorage and offers explicit recovery from the overview. JSON export provides a portable backup. Stories have separate IDs, so multiple projects or marketplaces for one brand do not overwrite one another. Schema version 1 remains supported; missing new context/per-background fields fall back to legacy data. Matching imports preserve existing image assignments by stable card ID and grid slot; changed ASINs invalidate the loaded product image.

## Validation

`npm test`: model, React component and API integration checks plus existing regression suite. API integration uses an isolated SQLite database and verifies snapshot isolation, independent tokens, revision conflicts and designer-only image assignments.

`npm run build`: production bundle.

`TEST_CHROMIUM_PATH=/usr/bin/chromium npx playwright test tests/browser/brand-story.spec.mjs`: real-browser navigation and shared-view checks. This environment prevented Chromium from opening its process socket, so these browser tests could not run here. Live Turso, Blob uploads and Amazon-provider calls also require deployment credentials and remain to be checked on staging.

## Existing delivery folders and composition patterns

The OmniRelexx delivery example uses Hintergrund, Brand Media Assets, ASIN Grids and Preview Neu. The original files match all four production specifications exactly. New cards receive stable assetFile paths using media asset image N.jpg or ASIN image Na.jpg through Nd.jpg. Folder imports match these paths including an optional outer project folder; canonical card-NN names still work. File paths are editable per image card and grid slot. Preview files are not mistaken for card assets.

A background-colored logo/hashtag image is a real image card and scrolls with the rail. A logo embedded in the fixed background can be hidden under early cards and revealed in the final view. A four-image grid may compose one overall picture; all four links may use the same ASIN. The grid gutters remain part of the layout and must be considered in the designer composition. These are supported composition techniques, not additional native module types.
