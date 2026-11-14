# Direct Brand Story Editor Implementation Plan

**Goal:** Edit the shared card sequence directly on a larger preview, with precise grid briefs and required sharing checks; add the delivered Futum reference as an interactive example.

**Architecture:** Keep schemaVersion 1 and existing persisted IDs/assets. Add optional gridMode ('individual'|'composite'), per-slot brief and imageMode ('product'|'custom'); absent legacy gridMode uses composite to retain the previous shared brief. Main editor owns selection {cardId,slotIndex}, card insertion/removal and stable-ID reorder. Carousel exposes callback props only; no navigation to product targets while editing. Public customer/reference carousels retain links.

**Constraints:** Max19 shared cards,2 backgrounds. Final user direction supersedes earlier duplicate add-button instruction: one plus control within preview; no sidebar or other Add button. Red minus per card requires confirmation. Save/leave always possible for structurally valid incomplete drafts; publish creates/reveals neither link until descriptions/targets/headlines/shop links/background briefs are complete. Designer handoff must work before final image uploads. Internal guide only for designers. No guessed ASINs or links for supplied examples.

## Tasks

1. Domain and sharing: add tests first; validate optional fields without rejecting incomplete text drafts; shareReadinessErrors checks nonempty media briefs, grid mode appropriate briefs,4 valid product targets,headline/shop URL,2background briefs. Enforce publish server-side before database mutation. Reflect fields in Claude schema/method; regenerate ZIP.
2. Properties: card ordinal instead of title; clarify Briefing/visible text; individual vs composite grid descriptions; slot selection navigates directly to proper slot; product-main-image vs custom choice; hide internal file paths for employees, retain useful file info for designer. Use callbacks with no API ownership.
3. Preview editor: remove sidebar/raster/instructional sentence; icon toggles; move uploads to toolbar modal; vivid examples button below preview. Plus/minus and slot interaction inside carousel. Stable-ID drag/drop with repeated edge paging; preserve keyboard move buttons as accessible fallback. Automatic product image hydration after imports/ASIN/link edits with stable target checks and actionable retries.
4. Reference: inspect all supplied ZIP images against existing Futum preview, establish order and4quadrant mapping; use source images in repo and append seventh normalized story without inventing mobile background/targetlinks.
5. Verification: Node suite/build, CI browser flows including drag from card2 to card10 via edge paging, individual/composite brief modes, image-source selection, share blocking and incomplete save; fresh independent review. Update existing PR201; no merge authorization assumed.

## Interfaces

- StoryCarousel: existing props + onAdd(), onRemove(cardId), onReorder(sourceId,targetId,after), onSelect(cardId,slotIndex=null), busy; presence of onAdd enables edit controls.
- StoryProperties: existing props + selectedSlot, onSlotSelect(index); image selection reads slot.imageMode; grid default via gridMode(card).
- model exports: gridMode(card), slotImageMode(slot), slotDisplayImage(slot), productAsin(slot,marketplace), sharingErrors(story).
- Workflow normalizes legacy grids to composite, retains all new briefs/modes on import and stable file mapping; snapshots preserve public display mode but strip all designer-only briefs from customer.

## Progress

User supplied explicit complete change request; proceeding in existing feature checkout. Claude installation remains awaiting user's CAPTCHA handoff; do not take over that browser without return of control.

Checkpoint: Domain, API, direct editor, property modes, source selection, automatic hydration and all24 Futum assets implemented locally. Independent review finding (stale selectedSlot) fixed with regression. 127 Node tests pass; Vite build passes. Five new browser flows written but local Chromium cannot launch due socket sandbox restriction. Remote CI awaits publishing all source/assets. Automatic approval review rejected2 image blob uploads and requires explicit user confirmation of the original24 ZIP images to the public spacedugg/amazon-store-builder repository;7 immutable blobs are uploaded, no branch/tree updated for this change. Do not retry those uploads without that confirmation.

Approval update: The user explicitly answered “ja” to publication of all24 original Neu.zip images in the public spacedugg/amazon-store-builder repository. Resume only the remaining17 verified-original image uploads, then publish source tree and run full browser CI.

UX follow-up: mode selection is now two illustrated radio options using an actual OmniRelax composite grid and the four distinct Futum garden products, without a duplicate dropdown. Slot focus does not jump on mode changes.
