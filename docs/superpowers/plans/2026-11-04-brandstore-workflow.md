# Brandstore workflow implementation plan

> **For agentic workers:** Use superpowers:executing-plans task by task.

**Goal:** Show the complete ASIN-to-store workflow, expose new feedback on overview cards, offer one safe Claude editing flow, and restore reversible upsell status.

**Architecture:** Keep the existing React/Vite application and grouped feedback endpoint. Reuse targeted JSON operations against the current editor state, with complete image-free context and full backup available in the same dialog. Preserve store identity, images, untouched fields and undo. Salesboard status reset uses its existing API.

**Tech Stack:** React 18, Vite 5, Node tests and jsdom; separate Salesboard JavaScript/Python application.

**Spec:** User request ff9f2d0e-5704-46c3-9ec3-2165bc5f6cb1 and its screenshots.

## Global Constraints

- No production database change needed for this feedback. Existing Content SQL 0058/0059 is handed over unchanged for manual execution.
- New feedback means status `neu`, consistent with the current editor and cockpit badge; zero hides the bubble.
- One Claude entry supports targeted edits and structural extensions; complete replacement via New Store remains creation, not editing.
- Export full current structure, text and IDs, omit image bytes and catalog product payloads from chat context; do not replace live images with placeholders.
- ASIN prompt is copyable guidance, no Amazon scrape is executed by this feature. Retain the supplied recipe; label its padding workaround as environment-dependent.
- Keep source language conventions in CLAUDE.md.

## Review Focus

- Feedback refresh failures retain last good counts; navigation cancels stale requests and listeners.
- A malformed or stale operation must reject the entire change without partial edits or a false success.
- Existing images, store/share identity, unaffected fields and undo survive the Claude round trip.
- Modal inputs stay usable on short and narrow viewports; file and paste use identical validation.
- Resetting proposed status keeps the individual due date, owner and attempt count; failed saves re-enable the button.

### Task 1: Instructions and feedback overview

- [ ] Add ASIN collection as step 1, concept step 2, JSON import step 3. Copy prompt including CSV specification, counts and retry guidance; expose environment-dependent padding text honestly.
- [ ] Add grouped feedback polling in StoreOverview using loadFeedbackCounts, initially, every minute and on visibility; accessible exact count in bottom-right red bubble.
- [ ] Test actual React rendering, copy behavior, grouped request, zero counts, refresh and failure retention using Node/esbuild/jsdom. Run failing regression first, implement, rerun npm test. Commit.

### Task 2: One Claude edit dialog

- [ ] Replace two menu entries with `Mit Claude bearbeiten`. Combine prompt + complete slim context, JSON file/paste import and full backup in existing PatchImportModal.
- [ ] Extract applyStorePatch(store, data) pure operation function from App, preserve existing operations, add page metadata editing and page/section moves. Prevalidate target indices and object shapes, prevent identity/asset placeholder overwrite, reject invalid operation atomically, validate introduced limits before commit.
- [ ] Keep IDs and reference links when adding pages in the same change; support forward references. App commits one undoable update after validation and receives synchronous summary.
- [ ] Test round-trip existing edits, nested text updates, forward references, invalid/stale ops, limit failure, file input, full JSON rejection, one menu entry and textarea sizing. Watch failing regressions, implement, run npm test and build; verify actual browser geometry when Chromium available. Commit.

### Task 3: Salesboard upsell correction

- [ ] Use isolated snapshot from Salesboard main. Change proposed button to save status `offen` using existing endpoint; blue label `Vorschlagen`; normal busy handling applies to both actions.
- [ ] Extend real UI regression for proposed reset, preserved dates/owner/attempts, failure and double-click behavior. Add DB lifecycle assertion for reset without date/owner changes. Run Node and appropriate Python tests. Commit.

### Task 4: Review and publication

- [ ] Independent whole-change review and one verified fix pass if necessary. Curate only changed files onto pinned remote base trees; never upload local materialized snapshot history.
- [ ] Create reviewable PRs with evidence. CI on actual locked dependencies before completion/publication. Respect manual migration handoff for separate OS release.
