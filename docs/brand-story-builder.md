# Brand Story Builder

Entry: `/brand-stories` (also supports `?embed=1`). This is a separate workflow; existing Brand Store data and routes are unchanged.

## Operator workflow

1. Create a story for a brand. Set marketplace and language; fill verified brand facts and internal instructions.
2. Copy the starting instruction under **Anweisungen & Claude**, develop the concept in Claude, and import the resulting JSON. Image cards and four-product grids are supported. Existing matching card images are retained if the imported JSON omits them.
3. Edit English composition briefs and exact on-image copy. Review desktop intro, subsequent positions, end state and mobile. The optional overlay marks the area covered after advancing.
4. Save. **Freigabelinks aktualisieren** creates stable designer and customer links using independent random tokens. Ordinary saves retain the previous shared snapshot.
5. The designer link provides English design rules, brief, reference examples and folder upload. Designer uploads update the draft and designer snapshot. An operator must publish again to update the customer snapshot.

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

Local session recovery stores the current draft in sessionStorage. JSON export provides a portable backup. Stories have separate IDs, so multiple projects or marketplaces for one brand do not overwrite one another.

## Validation

`npm test`: model, React component and API integration checks plus existing regression suite. API integration uses an isolated SQLite database and verifies snapshot isolation, independent tokens, revision conflicts and designer-only image assignments.

`npm run build`: production bundle.

`TEST_CHROMIUM_PATH=/usr/bin/chromium npx playwright test tests/browser/brand-story.spec.mjs`: real-browser navigation and shared-view checks. This environment prevented Chromium from opening its process socket, so these browser tests could not run here. Live Turso, Blob uploads and Amazon-provider calls also require deployment credentials and remain to be checked on staging.
