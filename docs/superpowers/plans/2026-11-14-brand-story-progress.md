# SDD ledger — plan: docs/superpowers/plans/2026-11-14-brand-story-workflow.md

Approved spec: docs/brand-story-workflow-design.md.
Execution: native inline implementation; user approved the complete design and proceeding, so no repeated plan-approval question.
Workspace: fresh clone on feat/brand-story-workflow; original user workspace has no checkout to disturb.
Pre-flight: Tasks 1–5 share the normalized schema version 1 model and use one card list. Task 2 component is consumed by overview/editor/reference/share views. API projections explicitly control internal field visibility.
Ruling: Work in the fresh feature-branch clone rather than another nested worktree — already isolated from all user code — no cost to existing workspace state.
Ruling: Provide the portable Claude skill within the product repository and its download flow, without installing a personal ChatGPT skill — approved scope is use in Claude — user installation remains manual.

Task 1: complete — backward-compatible context/background model, import and privacy projections; model/API regressions pass.
Task 2: complete — shared carousel and six structured examples; mobile clip isolates a full card; actual Chromium checks run in GitHub because local process sockets are blocked.
Task 3: complete — overview tiles, explicit draft recovery and Claude setup/review dialog; UI regressions pass.
Task 4: complete — three-column workbench, both card types, individual backgrounds, designer uploads and Seller Central details; UI/API regressions pass.
Task 5: complete — portable Claude skill and schema generated from shared source; package contents verified; OmniRelexx uses media 1–4, grids 1–2, media 5–7 with four-state browser assertions.
Task 6: in progress — PR #200 draft, Vercel preview ready. Initial CI: 15 browser checks passed, one background-label lookup failed. Explicit field labels fix this; screenshots also exposed an inherited class-name collision on grid cards, now removed and covered by geometry assertions.

Independent review: five important findings accepted and fixed — persisted project identity for foreign imports, omit internal customer card names, submit only changed designer assets, reconcile moved grid artwork by stable path, and block new/resume while opening a project. Minor dialog-state persistence also fixed. Existing private editor authorization is unchanged, as outside this work's scope.
Ruling: Use GitHub connector Git objects to publish source because the local Git client cannot authenticate writes; verified remote tree equals local tested tree before updating the feature branch.
Ruling: Do not create a publicly shareable Vercel preview link after automatic approval rejection. Use GitHub's browser artifacts for layout inspection without changing deployment access.
