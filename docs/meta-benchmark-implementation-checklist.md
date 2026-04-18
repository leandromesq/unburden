# Meta Benchmark / Teams Implementation Checklist

## Purpose

This is the execution checklist for the feature spec in [meta-benchmark-team-builder-plan.md](C:/Users/leand/Documents/GitHub/omniboost/docs/meta-benchmark-team-builder-plan.md).

It is ordered by dependency, then by file, so work can be implemented without backtracking or avoidable rewrites.

## Ground rules

1. Keep the current calculator on `/` working at every checkpoint.
2. Do not fold benchmark state into `useOmniStore`.
3. Do not build team slots on top of the current species-keyed `useTeamStore`.
4. Prefer extracting shared UI from existing omnibar components instead of rewriting editor logic.
5. Land each phase in a runnable state with tests before moving to the next phase.

## Critical path

1. Extend types and share-state parsing.
2. Add new stores for teams and benchmarks.
3. Add meta benchmark data pipeline.
4. Ship `/meta` with speed tiers first.
5. Add damage benchmark modes.
6. Ship `/teams` and `/teams/[teamId]`.
7. Add team-to-meta and meta-to-team handoff.

## Phase 0: foundations

## 0.1 Types and shared contracts

### Edit `src/lib/types.ts`

- Add:
  - `MetaBenchmarkMode`
  - `BenchmarkSubjectSource`
  - `SavedSetRecord`
  - `TeamSlot`
  - `SavedTeam`
  - `BenchmarkSubjectRef`
  - `MetaThreatProfile`
  - `SpeedTierRow`
  - `MetaBenchmarkRow`
- Expand `ShareState` into the `v1 | v2 | v3` discriminated union from the spec.
- Keep existing exported types stable where possible to avoid unnecessary downstream churn.

### Edit `src/lib/team/imported-set-utils.ts`

- Add small helpers needed by new stores and share parsing:
  - clone / normalize helpers for `ImportedSet`
  - optional helper to create empty slot-ready sets if useful
- Do not add team logic here.

### Optional new file `src/lib/team/team-slot-utils.ts`

- Add helpers for:
  - creating empty slots
  - creating empty teams
  - cloning slot snapshots
  - generating timestamps / stable ids if you want the store file smaller

## 0.2 Share-state migration

### Edit `src/lib/share/serialize-share-state.ts`

- Keep existing `v1` behavior intact for current calculator usage.
- Add overload or options-based support for:
  - serializing a `/meta` workspace
  - serializing a single saved team snapshot
- Do not force existing calculator callers to know about the new union shape immediately.

### Edit `src/lib/share/parse-share-state.ts`

- Change return shape from `ImportedSet[]` to a richer parsed result object.
- Support:
  - `v1` imported sets
  - `v2` meta workspace
  - `v3` team snapshot
- Add guards for malformed `subject`, `speedContext`, and `team` payloads.

### New file `src/lib/share/share-state.test.ts`

- Add tests for:
  - round-trip `v1`
  - round-trip `v2`
  - round-trip `v3`
  - invalid payload fallback
  - backward compatibility with current calculator expectations

## 0.3 New stores

### New file `src/store/use-teams-store.ts`

- Implement:
  - local storage persistence
  - `teamsById`
  - `teamOrder`
  - `activeTeamId`
  - create / duplicate / rename / delete team
  - set / clear / move / duplicate slot
  - replace full team snapshot
- Keep the storage key separate from `useTeamStore`.

### New file `src/store/use-meta-benchmark-store.ts`

- Implement:
  - `mode`
  - `subject`
  - `topN`
  - `sortBy`
  - `speedContext`
  - `rows`
  - `speedRows`
  - `issues`
- Implement actions:
  - `initializeDraft`
  - `initializeFromTeamSlot`
  - `setMode`
  - `setSubject`
  - `setTopN`
  - `setSortBy`
  - `setSpeedContext`
  - `recompute`
  - `hydrateFromShareState`
  - `reset`

### New file `src/store/use-saved-sets-store.ts`

- Implement the reusable set library store from the spec.
- Keep it independent of team slots.
- For V1 UI this store may stay lightly used, but the data model should exist now.

### New file `src/store/use-teams-store.test.ts`

- Test:
  - create team
  - duplicate team
  - rename team
  - set slot set
  - clear slot
  - move slot
  - duplicate slot
  - persistence hydration

### New file `src/store/use-meta-benchmark-store.test.ts`

- Test:
  - draft initialization
  - team-slot initialization
  - mode switching
  - share hydration
  - recompute trigger behavior

## 0.4 Data loader extensions

### Edit `src/lib/data/loaders.ts`

- Add loader-level helpers needed by the benchmark pipeline:
  - stable ordered meta threat list
  - regulation-aware threat filtering
  - lookup helpers for legal threats with meta profiles
- Keep raw data exports intact for existing code.

### Optional new file `src/lib/data/meta-loaders.ts`

- If `loaders.ts` starts getting too broad, move benchmark-specific helpers here and keep `loaders.ts` as the raw snapshot access layer.

## 0.5 Benchmark pipeline

### New file `src/lib/meta/benchmark-profiles.ts`

- Expand raw `vgc-meta.json` entries into `MetaThreatProfile`.
- Rules:
  - regulation legal only
  - deterministic item/ability/move assumptions
  - speed assumption derivation
  - usage rank ordering

### New file `src/lib/meta/benchmark-attacks.ts`

- Implement move selection:
  - for `One vs Meta`, evaluate all non-immune damaging subject moves and choose the best
  - for `Meta vs One`, choose one threatening move from meta assumptions

### New file `src/lib/meta/benchmark-command.ts`

- Implement:
  - `buildOneVsMetaCommand`
  - `buildMetaVsOneCommand`
- Build `ParsedCommand` directly.
- Do not generate prompt text.

### New file `src/lib/meta/benchmark-scorers.ts`

- Implement deterministic sort scoring for:
  - offensive pressure
  - defensive threat pressure

### New file `src/lib/meta/speed-tiers.ts`

- Implement speed row generation using:
  - subject set snapshot
  - threat profiles
  - speed context toggles

### New test files

- `src/lib/meta/benchmark-profiles.test.ts`
- `src/lib/meta/benchmark-attacks.test.ts`
- `src/lib/meta/benchmark-command.test.ts`
- `src/lib/meta/benchmark-scorers.test.ts`
- `src/lib/meta/speed-tiers.test.ts`

### Edit `src/lib/calc/damage-engine.ts`

- Do not change calculator behavior casually.
- Only extract or export small helpers if benchmark code truly needs them.
- If `buildCalculationContext` or speed helpers are reused, prefer exporting a focused helper instead of duplicating logic.

## Phase 1: shared UI primitives

## 1.1 Shared page shell

### New file `src/components/layout/app-page-shell.tsx`

- Extract the common shell used by `/`, `/meta`, and `/teams`:
  - background
  - max width
  - header slot
  - content slot

### New file `src/components/layout/app-page-header.tsx`

- Reuse:
  - `ThemeToggle`
  - `RegulationBadge`
- Support title, subtitle, actions, and optional breadcrumbs.

### Edit `src/app/page.tsx`

- Migrate home page to the new shell components without changing existing behavior.
- Add lightweight links to:
  - `/meta`
  - `/teams`

## 1.2 Shared set editor extraction

### New file `src/components/shared/set-editor-modal.tsx`

- Extract the reusable editor contract from the current omnibar modal.
- Keep props narrow:
  - `initialSet`
  - `onClose`
  - `onSave`
  - optional title / subtitle overrides

### Edit `src/components/omnibar/pokemon-set-editor-modal.tsx`

- Convert into:
  - thin wrapper over the shared modal
  - or remove entirely if the shared component is a drop-in replacement

### Edit tests

- `src/components/omnibar/pokemon-set-editor-modal.test.tsx`
- any tests that depend on the old component name

## Phase 2: `/meta` speed tiers

## 2.1 Route and top-level page

### Read before implementation

- `node_modules/next/dist/docs/` docs relevant to app routes and client/server composition for the installed Next.js version

### New file `src/app/meta/page.tsx`

- Create the new page route.
- Keep the page thin. Compose feature components instead of putting logic here.

### New file `src/components/meta/meta-benchmark-page.tsx`

- Top-level page component for `/meta`.
- Wire store hydration and share restoration.

### New file `src/components/meta/meta-benchmark-toolbar.tsx`

- Add:
  - mode switch
  - threat-count selector
  - share button
  - regulation badge

### New file `src/components/meta/meta-benchmark-subject-card.tsx`

- Show:
  - sprite
  - species
  - item
  - ability
  - nature
  - SP spread
  - source badge
  - edit action
  - save action

### New file `src/components/meta/meta-subject-picker.tsx`

- Subject sources:
  - current draft
  - saved sets
  - optional imported set text flow later

## 2.2 Speed tiers panel

### New file `src/components/meta/speed-tier-panel.tsx`

- Render grouped rows:
  - `Outspeeds`
  - `Speed Ties`
  - `Underspeeds`

### New file `src/components/meta/speed-tier-row.tsx`

- Render:
  - threat identity
  - subject speed
  - threat speed
  - delta
  - assumptions

### New file `src/components/meta/speed-context-controls.tsx`

- Controls for:
  - Tailwind
  - Choice Scarf
  - stage
  - Trick Room

## 2.3 Integration

### Edit `src/lib/share/parse-share-state.ts`

- Ensure `/meta` can initialize from shared URL state on first render.

### New test files

- `src/components/meta/meta-benchmark-page.test.tsx`
- `src/components/meta/speed-tier-panel.test.tsx`

### Verification checkpoint

- `/meta` loads
- draft subject can be edited
- speed tiers render and regroup as controls change
- share URL restores the same benchmark subject and speed context

## Phase 3: `/meta` damage benchmark modes

## 3.1 Result row components

### New file `src/components/meta/meta-benchmark-table.tsx`

- Shared table/card list wrapper for damage modes.

### New file `src/components/meta/meta-benchmark-row.tsx`

- Shared row/card component.
- Render:
  - threat
  - selected move
  - move-first indicator
  - min/mid/max summary
  - KO text
  - score
  - assumptions

### New file `src/components/meta/meta-result-summary.tsx`

- Extract compact rendering of `DamageResult[]` for reuse across rows.

## 3.2 Store recompute integration

### Edit `src/store/use-meta-benchmark-store.ts`

- Add recompute paths for:
  - `One vs Meta`
  - `Meta vs One`
- Connect sorting and `topN`.

### Edit `src/lib/meta/benchmark-attacks.ts`

- Finalize best-move selection rules based on real rendered behavior.

### Edit `src/lib/meta/benchmark-scorers.ts`

- Tune scoring only after rows are visible in UI.

## 3.3 Tests

### New test files

- `src/components/meta/meta-benchmark-table.test.tsx`
- `src/components/meta/meta-benchmark-row.test.tsx`

### Edit or add integration tests

- verify mode switch:
  - `Speed Tiers` -> `One vs Meta`
  - `One vs Meta` -> `Meta vs One`
- verify `topN`
- verify who-moves-first badges

### Verification checkpoint

- one selected set can benchmark into top threats offensively
- one selected set can benchmark incoming pressure defensively
- rows are stable across refresh/share restore

## Phase 4: `/teams` index

## 4.1 Route and page

### Read before implementation

- `node_modules/next/dist/docs/` docs relevant to dynamic routes and app-router patterns for the installed Next.js version

### New file `src/app/teams/page.tsx`

- Create the teams index route.

### New file `src/components/team-builder/teams-index-page.tsx`

- Top-level page component for `/teams`.

### New file `src/components/team-builder/team-list.tsx`

- Grid/list of saved team cards.

### New file `src/components/team-builder/team-list-card.tsx`

- Card UI:
  - name
  - regulation
  - timestamp
  - slot previews
  - actions

### New file `src/components/team-builder/teams-empty-state.tsx`

- Empty state actions:
  - create empty team
  - import showdown team
  - start from meta draft

## 4.2 Team creation and import

### New file `src/components/team-builder/create-team-button.tsx`

- Create a blank six-slot team and route to `/teams/[teamId]`.

### New file `src/components/team-builder/import-team-modal.tsx`

- Parse Showdown/PokePaste input using existing showdown parser.
- Map first six parsed sets into a new saved team.

### Edit `src/lib/parser/showdown-import.ts`

- Only if needed for better multi-set import ergonomics or metadata retention.

## 4.3 Tests

### New test files

- `src/components/team-builder/teams-index-page.test.tsx`
- `src/components/team-builder/import-team-modal.test.tsx`

### Verification checkpoint

- user can create a team
- user can import a team
- user can duplicate and delete teams from the index

## Phase 5: `/teams/[teamId]` editor

## 5.1 Route and workspace

### New file `src/app/teams/[teamId]/page.tsx`

- Create dynamic team editor route.

### New file `src/components/team-builder/team-builder-page.tsx`

- Load active team
- handle missing team
- render grid + side panels

### New file `src/components/team-builder/team-builder-header.tsx`

- Actions:
  - rename
  - share
  - duplicate
  - delete

## 5.2 Team grid

### New file `src/components/team-builder/team-grid.tsx`

- Grid wrapper for the six slots.

### New file `src/components/team-builder/team-slot-card.tsx`

- Render:
  - slot number
  - identity
  - item
  - ability
  - speed
  - moves
  - actions

### New file `src/components/team-builder/team-slot-actions.tsx`

- Actions:
  - edit
  - clear
  - duplicate slot
  - benchmark this set
  - open in calculator

### New file `src/components/team-builder/team-slot-empty-card.tsx`

- Empty slot CTA:
  - add set
  - import set

## 5.3 Overview panels

### New file `src/components/team-builder/team-overview-panel.tsx`

- Show:
  - filled slots
  - duplicate items
  - broad composition summary

### New file `src/components/team-builder/team-speed-panel.tsx`

- Team-level speed overview for the current six slots only
- keep simple in V1

### New file `src/components/team-builder/team-type-panel.tsx`

- Type concentration / weakness summary

### Optional new file `src/lib/team/team-overview.ts`

- Pure functions for overview panel derivations

### Optional test file `src/lib/team/team-overview.test.ts`

- Validate duplicate item and simple type summary logic

## 5.4 Slot editing

### New file `src/components/team-builder/team-slot-editor-modal.tsx`

- Thin wrapper around shared set editor modal if needed.

### Edit `src/components/shared/set-editor-modal.tsx`

- Ensure it supports both benchmark and team-builder save flows cleanly.

## 5.5 Tests

### New test files

- `src/components/team-builder/team-builder-page.test.tsx`
- `src/components/team-builder/team-slot-card.test.tsx`

### Verification checkpoint

- user can edit all six slots
- reorder persists
- overview panels update after slot edits

## Phase 6: cross-surface handoff

## 6.1 Team -> Meta

### Edit `src/components/team-builder/team-slot-actions.tsx`

- `Benchmark This Set` should:
  - copy the slot snapshot into benchmark subject state
  - preserve `teamId` and `slotId`
  - navigate to `/meta`

### Edit `src/store/use-meta-benchmark-store.ts`

- Ensure `initializeFromTeamSlot` preserves origin context and does not mutate the team.

## 6.2 Meta -> Team

### New file `src/components/meta/save-to-team-modal.tsx`

- Let user:
  - replace originating slot
  - choose another team/slot
  - create new team from subject

### Edit `src/components/meta/meta-benchmark-subject-card.tsx`

- Add:
  - `Save to Team`
  - `Replace Team Slot` when applicable

### Edit `src/store/use-teams-store.ts`

- Add any small helper needed to replace a slot directly from modal actions.

## 6.3 Calculator handoff

### Edit `src/components/team-builder/team-slot-actions.tsx`

- `Open in Calculator` should route to `/` with the set available in the existing share/import flow.

### Edit `src/lib/share/serialize-share-state.ts`

- Reuse existing `v1` set serialization for calculator handoff where possible.

## 6.4 Tests

### New or expanded integration tests

- team slot -> `/meta`
- `/meta` subject edit -> replace original slot
- team slot -> calculator

### Verification checkpoint

- handoff is explicit and non-destructive
- no silent team mutation from `/meta`

## Phase 7: cleanup and migration

## 7.1 Decide the future of `useTeamStore`

### Edit `src/store/use-team-store.ts`

- Either:
  - keep it as calculator-only imported/shared set state
  - or migrate its responsibilities into `useSavedSetsStore`

Do not do a risky mid-project rewrite until `/meta` and `/teams` are stable.

### Edit current consumers if migrating

- `src/store/use-omni-store.ts`
- `src/components/omnibar/import-set-modal.tsx`
- `src/components/omnibar/omni-composer.tsx`
- `src/components/omnibar/results-panel.tsx`
- `src/components/omnibar/use-pokemon-side-summary-controller.ts`
- tests under `src/components/omnibar/*.test.tsx`

## 7.2 Documentation

### Edit `README.md`

- Add new routes and feature overview.

### Edit `docs/data-sources.md`

- Add the benchmark profile pipeline and team persistence notes if they materially change data flow.

### Edit `docs/meta-benchmark-team-builder-plan.md`

- Update status notes or link out to finished implementation docs if needed.

## Recommended commit slices

Use these as the preferred PR/commit boundaries.

1. `types + share-state scaffolding`
2. `new stores + tests`
3. `meta benchmark pipeline + tests`
4. `shared page shell + shared set editor extraction`
5. `meta speed tiers UI`
6. `meta damage benchmark UI`
7. `teams index`
8. `team editor`
9. `cross-surface handoff`
10. `cleanup + docs`

## Full file-by-file order of work

This is the recommended exact order to touch files.

1. `src/lib/types.ts`
2. `src/lib/team/imported-set-utils.ts`
3. `src/lib/team/team-slot-utils.ts`
4. `src/lib/share/serialize-share-state.ts`
5. `src/lib/share/parse-share-state.ts`
6. `src/lib/share/share-state.test.ts`
7. `src/store/use-teams-store.ts`
8. `src/store/use-teams-store.test.ts`
9. `src/store/use-meta-benchmark-store.ts`
10. `src/store/use-meta-benchmark-store.test.ts`
11. `src/store/use-saved-sets-store.ts`
12. `src/lib/data/loaders.ts`
13. `src/lib/meta/benchmark-profiles.ts`
14. `src/lib/meta/benchmark-attacks.ts`
15. `src/lib/meta/benchmark-command.ts`
16. `src/lib/meta/benchmark-scorers.ts`
17. `src/lib/meta/speed-tiers.ts`
18. `src/lib/meta/benchmark-profiles.test.ts`
19. `src/lib/meta/benchmark-attacks.test.ts`
20. `src/lib/meta/benchmark-command.test.ts`
21. `src/lib/meta/benchmark-scorers.test.ts`
22. `src/lib/meta/speed-tiers.test.ts`
23. `src/components/layout/app-page-shell.tsx`
24. `src/components/layout/app-page-header.tsx`
25. `src/app/page.tsx`
26. `src/components/shared/set-editor-modal.tsx`
27. `src/components/omnibar/pokemon-set-editor-modal.tsx`
28. `src/components/omnibar/pokemon-set-editor-modal.test.tsx`
29. `src/app/meta/page.tsx`
30. `src/components/meta/meta-benchmark-page.tsx`
31. `src/components/meta/meta-benchmark-toolbar.tsx`
32. `src/components/meta/meta-benchmark-subject-card.tsx`
33. `src/components/meta/meta-subject-picker.tsx`
34. `src/components/meta/speed-context-controls.tsx`
35. `src/components/meta/speed-tier-row.tsx`
36. `src/components/meta/speed-tier-panel.tsx`
37. `src/components/meta/meta-benchmark-page.test.tsx`
38. `src/components/meta/speed-tier-panel.test.tsx`
39. `src/components/meta/meta-result-summary.tsx`
40. `src/components/meta/meta-benchmark-row.tsx`
41. `src/components/meta/meta-benchmark-table.tsx`
42. `src/components/meta/meta-benchmark-row.test.tsx`
43. `src/components/meta/meta-benchmark-table.test.tsx`
44. `src/app/teams/page.tsx`
45. `src/components/team-builder/teams-index-page.tsx`
46. `src/components/team-builder/team-list.tsx`
47. `src/components/team-builder/team-list-card.tsx`
48. `src/components/team-builder/teams-empty-state.tsx`
49. `src/components/team-builder/create-team-button.tsx`
50. `src/components/team-builder/import-team-modal.tsx`
51. `src/components/team-builder/teams-index-page.test.tsx`
52. `src/components/team-builder/import-team-modal.test.tsx`
53. `src/app/teams/[teamId]/page.tsx`
54. `src/components/team-builder/team-builder-page.tsx`
55. `src/components/team-builder/team-builder-header.tsx`
56. `src/components/team-builder/team-grid.tsx`
57. `src/components/team-builder/team-slot-card.tsx`
58. `src/components/team-builder/team-slot-actions.tsx`
59. `src/components/team-builder/team-slot-empty-card.tsx`
60. `src/components/team-builder/team-overview-panel.tsx`
61. `src/components/team-builder/team-speed-panel.tsx`
62. `src/components/team-builder/team-type-panel.tsx`
63. `src/lib/team/team-overview.ts`
64. `src/lib/team/team-overview.test.ts`
65. `src/components/team-builder/team-slot-editor-modal.tsx`
66. `src/components/team-builder/team-builder-page.test.tsx`
67. `src/components/team-builder/team-slot-card.test.tsx`
68. `src/components/meta/save-to-team-modal.tsx`
69. `src/components/team-builder/team-slot-actions.tsx`
70. `src/store/use-meta-benchmark-store.ts`
71. `src/store/use-teams-store.ts`
72. `src/lib/share/serialize-share-state.ts`
73. integration tests covering handoff flows
74. `src/store/use-team-store.ts`
75. `src/store/use-omni-store.ts`
76. `src/components/omnibar/import-set-modal.tsx`
77. `src/components/omnibar/omni-composer.tsx`
78. `src/components/omnibar/results-panel.tsx`
79. `src/components/omnibar/use-pokemon-side-summary-controller.ts`
80. omnibar regression tests
81. `README.md`
82. `docs/data-sources.md`
83. `docs/meta-benchmark-team-builder-plan.md`

## Done criteria

The implementation is complete when all of the following are true:

- `/meta` supports speed tiers, offensive benchmark, and defensive benchmark
- `/teams` supports multiple saved teams
- `/teams/[teamId]` supports six-slot editing and overview panels
- team slot <-> meta handoff works without silent mutation
- current calculator routes and existing share URLs still work
- tests cover the new stores, benchmark pipeline, and cross-page flows
