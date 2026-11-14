# SDD ledger — plan: docs/superpowers/plans/2026-11-14-brand-story-workflow.md

Approved spec: docs/brand-story-workflow-design.md.
Execution: native inline implementation; user approved the complete design and proceeding, so no repeated plan-approval question.
Workspace: fresh clone on feat/brand-story-workflow; original user workspace has no checkout to disturb.
Pre-flight: Tasks 1–5 share the normalized schema version 1 model and use one card list. Task 2 component is consumed by overview/editor/reference/share views. API projections explicitly control internal field visibility.
Ruling: Work in the fresh feature-branch clone rather than another nested worktree — already isolated from all user code — no cost to existing workspace state.
Ruling: Provide the portable Claude skill within the product repository and its download flow, without installing a personal ChatGPT skill — approved scope is use in Claude — user installation remains manual.
