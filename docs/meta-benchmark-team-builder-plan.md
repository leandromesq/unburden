# Meta Benchmark and Team Workspace Feature Spec

## Status

Approved direction for implementation planning.

This document replaces the earlier high-level plan with a concrete product and architecture spec for:

1. `Meta Benchmark`
2. `Speed Tiers`
3. `Teams`

## Product decisions

These decisions are fixed for V1 unless implementation uncovers a hard blocker.

1. The home page `/` remains the prompt-first single-matchup calculator.
2. Benchmarks run from a selected Pokemon set, not from a full-team matrix by default.
3. A "team" exists even when it only contains one Pokemon. That allows benchmark workflows to start with minimal friction.
4. Full team-wide threat comparison is not V1. V1 focuses on one selected slot versus the meta.
5. Dynamic speed benchmarking for one selected slot ships before team-wide speed sheets.
6. Multiple saved teams are supported in the data model from the start.
7. Team slot data stores full set snapshots, not species-keyed references.

## Core user problem

Users do not only want isolated calcs. They want to answer planning questions:

- "How does this set perform into the current field?"
- "What threatens this set most?"
- "What speed benchmarks does this set hit?"
- "Which team am I building around?"

The existing Omnibar already solves one-off calculations well. These new surfaces should complement it, not absorb it.

## Primary workflows

### Workflow A: Benchmark a draft set quickly

1. User opens `/meta`.
2. User selects or imports a set.
3. System creates a draft benchmark subject.
4. User switches between:
   - `Speed Tiers`
   - `One vs Meta`
   - `Meta vs One`
5. User optionally saves that draft into a team.

### Workflow B: Benchmark a set from a team

1. User opens `/teams/[teamId]`.
2. User edits or selects a slot.
3. User clicks `Benchmark This Set`.
4. App opens `/meta` with the subject bound to that team slot snapshot.
5. User edits the benchmark draft locally or returns to the team.

### Workflow C: Build and maintain teams

1. User opens `/teams`.
2. User creates, duplicates, renames, deletes, and opens saved teams.
3. User edits six slots in `/teams/[teamId]`.
4. User uses overview panels to inspect speed spread, item overlap, and typing concentration.
5. User jumps any slot into `/meta`.

## Route structure

## Final routes

### `/`

Purpose:

- prompt-first calculator
- single matchup exploration
- existing Omnibar surface

No benchmark or multi-team state should be added here beyond lightweight links into the new surfaces.

### `/meta`

Purpose:

- selected-set benchmark workspace
- dynamic speed tiers
- offensive and defensive meta comparisons

This page owns only benchmark workspace state.

### `/teams`

Purpose:

- team index
- create team
- import team
- duplicate team
- manage saved teams

This page should be lightweight and navigation-oriented.

### `/teams/[teamId]`

Purpose:

- team editing workspace
- slot editing
- team overview
- team-to-meta handoff

This page owns only one active team's editing state at a time.

## Page structure

## `/meta`

### Desktop layout

1. Header row
2. Left rail
3. Main results panel

### Header row

Contents:

- page title: `Meta Benchmark`
- mode segmented control:
  - `Speed Tiers`
  - `One vs Meta`
  - `Meta vs One`
- regulation badge
- threat-count selector
- share action

### Left rail

Contents:

- subject card
- subject source badge:
  - `Draft`
  - `Team Slot`
  - `Saved Set`
- quick edit button
- save actions:
  - `Save to Team`
  - `Replace Team Slot` when launched from a team slot
- speed context controls

### Main panel by mode

#### Speed Tiers

Three grouped lists:

- `Outspeeds`
- `Speed Ties`
- `Underspeeds`

Every row shows:

- threat sprite/name
- effective speed
- user effective speed
- speed delta
- assumption tags

#### One vs Meta

Sortable results table or stacked cards on mobile.

Every row shows:

- threat sprite/name
- chosen attacking move
- who moves first
- min/mid/max damage summary
- KO text
- matchup score
- assumption tags

#### Meta vs One

Same structure as `One vs Meta`, but the move belongs to the threat.

Every row shows:

- threat sprite/name
- chosen threatening move
- who moves first
- min/mid/max damage summary
- KO text
- threat score
- assumption tags

### Mobile layout

Stack in this order:

1. header controls
2. subject card
3. speed controls
4. result cards

Do not ship a desktop-only dense table.

## `/teams`

### Header

- page title: `Teams`
- `New Team`
- `Import Team`

### Body

Card grid of saved teams.

Each card shows:

- team name
- regulation
- updated time
- up to 3 visible slot previews
- actions:
  - `Open`
  - `Duplicate`
  - `Delete`
  - `Share`

If no teams exist, show an empty state with:

- `Create Empty Team`
- `Import Showdown Team`
- `Start From Meta Draft`

## `/teams/[teamId]`

### Desktop layout

1. header row
2. team grid
3. right rail

### Header row

- editable team name
- regulation badge or selector if supported
- share action
- duplicate action
- delete action

### Team grid

Six fixed slots in a 2x3 or 3x2 grid depending on final design.

Each slot card shows:

- slot index
- sprite
- species / nickname
- item
- ability
- nature
- speed value
- four moves
- actions:
  - `Edit`
  - `Clear`
  - `Duplicate Slot`
  - `Benchmark This Set`
  - `Open in Calculator`

### Right rail

Panels:

1. `Team Overview`
2. `Speed Overview`
3. `Type Overview`

V1 keeps these descriptive, not prescriptive.

## Information architecture

## Team model

A saved team is the main persistent planning object.

Each team has:

- stable id
- name
- regulation id
- six ordered slots
- metadata timestamps

Each slot stores:

- stable slot id
- full set snapshot or null
- optional notes
- optional pinned/locked state

This is intentionally snapshot-based. A slot should remain stable even if the user later creates another version of the same species elsewhere.

## Benchmark subject model

A benchmark subject is a selected set plus its origin context.

Origins:

- `draft`
- `team-slot`
- `saved-set`

The benchmark page always works on one explicit subject.

## Saved set library

This is optional in UI for V1, but the data model should allow it.

Purpose:

- reusable personal set snippets
- import/export convenience
- seed subjects quickly

Important:

The set library is not the same thing as saved teams.

## Data model

Add or evolve types in `src/lib/types.ts`.

```ts
export type MetaBenchmarkMode =
  | "speed-tiers"
  | "one-vs-meta"
  | "meta-vs-one";

export type BenchmarkSubjectSource =
  | "draft"
  | "team-slot"
  | "saved-set";

export interface SavedSetRecord {
  id: string;
  label: string;
  set: ImportedSet;
  createdAt: string;
  updatedAt: string;
}

export interface TeamSlot {
  id: string;
  set: ImportedSet | null;
  notes?: string;
  locked?: boolean;
}

export interface SavedTeam {
  id: string;
  name: string;
  regulationId: string;
  slots: TeamSlot[];
  createdAt: string;
  updatedAt: string;
}

export interface BenchmarkSubjectRef {
  source: BenchmarkSubjectSource;
  set: ImportedSet;
  teamId?: string;
  slotId?: string;
  savedSetId?: string;
}

export interface MetaThreatProfile {
  pokemonId: string;
  displayName: string;
  usageRank: number;
  usageWeight: number;
  itemId?: string;
  abilityId?: string;
  moveIds: string[];
  nature?: string;
  statPoints?: StatSpread;
  effectiveSpeed?: number;
}

export interface SpeedTierRow {
  threat: MetaThreatProfile;
  subjectSpeed: number;
  threatSpeed: number;
  delta: number;
  relation: "faster" | "tie" | "slower";
  assumptions: string[];
}

export interface MetaBenchmarkRow {
  id: string;
  threat: MetaThreatProfile;
  primaryMoveId: string;
  movingFirst: "subject" | "threat" | "tie";
  score: number;
  results: DamageResult[];
  assumptions: string[];
}
```

## Store design

Three stores are needed. Keep them separate.

## 1. `useTeamsStore`

File:

- `src/store/use-teams-store.ts`

Purpose:

- persistent saved teams
- team list state
- active team editing

State shape:

```ts
interface TeamsStore {
  hydrated: boolean;
  teamsById: Record<string, SavedTeam>;
  teamOrder: string[];
  activeTeamId: string | null;
  maxTeams: number | null;
}
```

Actions:

- `hydrate()`
- `createTeam(seed?: Partial<SavedTeam>): string`
- `duplicateTeam(teamId: string): string`
- `renameTeam(teamId: string, name: string): void`
- `deleteTeam(teamId: string): void`
- `setActiveTeam(teamId: string | null): void`
- `setTeamRegulation(teamId: string, regulationId: string): void`
- `setSlotSet(teamId: string, slotId: string, set: ImportedSet | null): void`
- `clearSlot(teamId: string, slotId: string): void`
- `moveSlot(teamId: string, fromIndex: number, toIndex: number): void`
- `duplicateSlot(teamId: string, slotId: string): void`
- `setSlotNotes(teamId: string, slotId: string, notes: string): void`
- `replaceTeam(team: SavedTeam): void`

Persistence:

- local storage for V1
- no server dependency

## 2. `useMetaBenchmarkStore`

File:

- `src/store/use-meta-benchmark-store.ts`

Purpose:

- `/meta` workspace state
- selected subject
- rows and filters

State shape:

```ts
interface MetaBenchmarkStore {
  initialized: boolean;
  mode: MetaBenchmarkMode;
  regulationId: string;
  subject: BenchmarkSubjectRef | null;
  topN: number;
  sortBy: "score" | "speed" | "usage";
  speedContext: {
    tailwind: boolean;
    choiceScarf: boolean;
    stage: number;
    trickRoom: boolean;
  };
  rows: MetaBenchmarkRow[];
  speedRows: SpeedTierRow[];
  loading: boolean;
  issues: string[];
}
```

Actions:

- `initializeDraft(set?: ImportedSet): void`
- `initializeFromTeamSlot(input: { teamId: string; slotId: string; set: ImportedSet }): void`
- `setMode(mode: MetaBenchmarkMode): void`
- `setSubject(set: ImportedSet, source?: BenchmarkSubjectSource): void`
- `setTopN(topN: number): void`
- `setSortBy(sortBy: "score" | "speed" | "usage"): void`
- `setSpeedContext(patch: Partial<MetaBenchmarkStore["speedContext"]>): void`
- `recompute(): void`
- `hydrateFromShareState(encoded: string | null): void`
- `reset(): void`

Rules:

- generated rows are derived state
- the store never owns the full team list
- the store accepts team-slot context, but does not mutate teams directly

## 3. `useSavedSetsStore`

File:

- `src/store/use-saved-sets-store.ts`

Purpose:

- optional reusable set library
- clean replacement path for the current species-keyed `useTeamStore`

State shape:

```ts
interface SavedSetsStore {
  hydrated: boolean;
  localSetsById: Record<string, SavedSetRecord>;
  sharedSetsById: Record<string, SavedSetRecord>;
}
```

Actions:

- `hydrate()`
- `saveSet(record: Omit<SavedSetRecord, "id" | "createdAt" | "updatedAt">): string`
- `updateSet(id: string, patch: Partial<SavedSetRecord>): void`
- `removeSet(id: string): void`
- `setSharedSets(records: SavedSetRecord[]): void`
- `clearSharedSets(): void`

Implementation note:

The current `useTeamStore` keys by `speciesId`, which is not safe for multiple variants of the same species across multiple teams. Do not build the new team feature on top of that assumption.

## Share state

The current share format only supports imported sets.

It should evolve to a discriminated union without breaking existing URLs.

```ts
type ShareState =
  | {
      v: 1;
      sets: ImportedSet[];
    }
  | {
      v: 2;
      page: "meta";
      regulationId: string;
      mode: MetaBenchmarkMode;
      topN: number;
      subject: BenchmarkSubjectRef;
      speedContext: {
        tailwind: boolean;
        choiceScarf: boolean;
        stage: number;
        trickRoom: boolean;
      };
      sets: ImportedSet[];
    }
  | {
      v: 3;
      page: "team";
      team: SavedTeam;
      sets: ImportedSet[];
    };
```

Rules:

1. Keep v1 parse support intact.
2. Do not serialize generated benchmark rows.
3. Team shares serialize one team snapshot, not the full local library of teams.
4. `sets` remains available for compatibility with existing imported set workflows.

## Benchmark data pipeline

Add these modules:

- `src/lib/meta/benchmark-profiles.ts`
- `src/lib/meta/benchmark-attacks.ts`
- `src/lib/meta/benchmark-command.ts`
- `src/lib/meta/benchmark-scorers.ts`
- `src/lib/meta/speed-tiers.ts`

## `benchmark-profiles.ts`

Responsibility:

- expand `vgc-meta.json` plus runtime data into app-facing threat profiles

Rules:

1. filter by active regulation legality
2. attach sprite/display metadata
3. set deterministic item, ability, move, and spread assumptions
4. compute effective speed for speed-tier usage

## `benchmark-attacks.ts`

Responsibility:

- select the relevant move for each row

V1 rules:

### For `One vs Meta`

1. evaluate all non-immune damaging subject moves against the threat
2. choose the highest-scoring move
3. preserve the chosen move id for display

### For `Meta vs One`

1. prefer `defaultMove` if damaging
2. else choose the strongest useful damaging move from `commonMoves`
3. else fall back to strongest legal damaging move in learnset

This matches the product decision that the user should see the best move per matchup, not an unreadable full move matrix.

## `benchmark-command.ts`

Responsibility:

- build `ParsedCommand` directly from structured subject/threat state

Required helpers:

```ts
buildOneVsMetaCommand(subject, threat, moveId): ParsedCommand
buildMetaVsOneCommand(subject, threat, moveId): ParsedCommand
```

Do not generate prompt text as an intermediary step.

## `benchmark-scorers.ts`

Responsibility:

- compute a simple ranking score for sorting

V1 score heuristics:

- favor higher KO pressure
- favor cleaner 2HKO or OHKO breakpoints
- penalize poor move-first outcomes where relevant
- use deterministic formulas only

The score is a sorting helper, not a hidden truth metric.

## `speed-tiers.ts`

Responsibility:

- produce speed-tier rows for the active subject

V1 supported contexts:

- base speed
- Tailwind
- Choice Scarf
- speed stage
- Trick Room ordering

V1 UI can expose only a subset of these if time is tight, but the internal model should support all of them.

## UX rules

## Subject editing

Use the existing set editor patterns where possible.

Do not build a second completely separate editor contract.

If necessary, extract a shared editor shell from the current omnibar set editor modal and reuse it in:

- `/meta`
- `/teams/[teamId]`
- existing calculator summary actions

## Handoff rules

### Team to Meta

When user clicks `Benchmark This Set`:

1. copy the slot snapshot into benchmark subject state
2. preserve `teamId` and `slotId` as context
3. allow local edits in `/meta` without mutating the team immediately
4. expose `Replace Team Slot` when user wants to push edits back

### Meta to Team

When user clicks `Save to Team`:

1. choose an existing team and slot, or create a new team
2. write the current subject snapshot into the chosen slot

This avoids accidental destructive edits while still making the surfaces feel connected.

## V1 scope

V1 should ship a complete loop, not partial scaffolding.

## Included in V1

### Shared foundations

- new route structure
- share-state versioning support
- structured benchmark profile pipeline
- direct `ParsedCommand` adapters for generated rows

### `/meta`

- subject picker
- draft subject creation
- `Speed Tiers`
- `One vs Meta`
- `Meta vs One`
- top-N control
- who-moves-first indicator
- assumption tags
- share and restore

### `/teams`

- saved teams index
- create team
- duplicate team
- delete team
- open team

### `/teams/[teamId]`

- six-slot editing
- quick set edit per slot
- reorder slots
- clear slot
- duplicate slot
- `Benchmark This Set`
- `Open in Calculator`
- lightweight overview panels
- share one team snapshot

## Explicitly excluded from V1

- full team vs single threat matrix
- full team vs full meta matrix
- synergy score engine
- matchup tree planner
- cloud sync
- accounts/auth
- paywall enforcement
- collaborative editing

## V2 scope

V2 adds higher-density planning views and monetization hooks without changing the core architecture.

## Included in V2

### Team benchmarking

- team vs selected threat sheet
- identify best answer per slot
- optional expand for all relevant moves

### Team speed planning

- whole-team speed sheet against the meta
- identify speed compression and tier overlap

### Saved set library

- dedicated reusable personal set library UI
- save slot to library
- seed new teams from library

### Team management improvements

- optional team cap in UI for monetization experiments
- better import/export flows
- richer notes/tags per slot

## Delivery phases

### Phase 0: foundations

Estimate:

- `M`

Deliverables:

- types
- stores
- share-state expansion
- benchmark pipeline
- row command adapters

Success criteria:

- one benchmark row can be produced without prompt parsing
- one team can be created and persisted locally

### Phase 1: `/meta` speed tiers

Estimate:

- `S`

Deliverables:

- `/meta`
- subject picker
- dynamic speed tiers

Success criteria:

- user can benchmark a selected set's speed immediately

### Phase 2: `/meta` damage benchmark

Estimate:

- `M`

Deliverables:

- `One vs Meta`
- `Meta vs One`
- ranking and sorting
- share restore

Success criteria:

- user can answer offensive and defensive benchmark questions from one page

### Phase 3: teams

Estimate:

- `L`

Deliverables:

- `/teams`
- `/teams/[teamId]`
- slot editing
- benchmark handoff
- team snapshot sharing

Success criteria:

- user can build multiple teams and move between team editing and benchmarking cleanly

### Phase 4: V2 planning surfaces

Estimate:

- `M/L`

Deliverables:

- team-wide threat sheets
- team-wide speed sheet
- richer management flows

## Testing plan

## Unit tests

- benchmark profile expansion
- move selection rules
- speed-tier relation logic
- structured command adapters
- share-state parse/serialize for v1/v2/v3
- team store slot mutations

## Integration tests

- `/meta` opens with draft subject
- benchmark mode switch recomputes rows
- `/meta` share URL restores workspace
- `/teams` create/open/delete flow works
- `/teams/[teamId]` slot benchmark handoff opens `/meta` with correct subject
- replacing a team slot from `/meta` updates the intended slot only

## Regression focus

- current Omnibar parser behavior unchanged
- current prompt share URLs still parse
- existing imported set normalization unchanged
- current calculator remains fast and isolated

## Risks and mitigations

### Risk: assumptions feel arbitrary

Mitigation:

- assumption tags visible on every row
- deterministic profile rules
- no opaque scoring language

### Risk: team state overlaps old store behavior

Mitigation:

- keep team persistence in a new store
- do not reuse species-keyed storage for team slots

### Risk: benchmark edits accidentally mutate team state

Mitigation:

- `/meta` works on a subject snapshot
- pushing changes back to team is an explicit action

### Risk: route sprawl

Mitigation:

- keep only four top-level pages
- reserve dense team matrices for V2

## Final implementation recommendation

Build in this order:

1. benchmark foundations
2. `/meta` speed tiers
3. `/meta` offensive and defensive rows
4. teams index and team editor
5. V2 team-wide planning sheets

This delivers the fastest useful loop while keeping the architecture aligned with the product you want long term.
