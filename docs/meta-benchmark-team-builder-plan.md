# Meta Benchmark and Team Workspace Future Plan

## Status

Future planning document.

Speed benchmarking is no longer part of this plan. It shipped as the dedicated `/speed` tool and is documented in `docs/speed-benchmark-prd.md`.

This document now covers only future work for:

1. `/meta` multi-calc / meta matchup benchmarking
2. `/teams` saved team management
3. `/teams/[teamId]` team editing and handoff workflows

## Current routes

- `/` — prompt-first single-matchup damage calculator
- `/speed` — Speed Benchmark
- `/about` — product/legal information

## Future routes

### `/meta`

Purpose:

- selected-set meta damage benchmark workspace
- offensive rows: one selected set into common meta threats
- defensive rows: common meta threats into one selected set
- no Speed Tiers ownership; link to `/speed` when speed-specific analysis is needed

### `/teams`

Purpose:

- saved team index
- create, duplicate, rename, delete, import, and open teams

### `/teams/[teamId]`

Purpose:

- six-slot team editing workspace
- team overview panels
- explicit handoff into `/meta`, `/speed`, and `/`

## Product decisions

1. `/` remains the fast prompt-first damage calculator.
2. `/speed` remains the speed-only benchmark tool.
3. `/meta` should focus on damage matchup benchmarks, not speed ladder UX.
4. Benchmarks start from one selected set, not a full team matrix.
5. Full team-wide threat sheets are not V1.
6. Team slots store full set snapshots, not species-keyed references.
7. Multiple saved teams are supported from the start.
8. Handoffs must be explicit and non-destructive.

## Primary workflows

### Workflow A: benchmark a draft set into the meta

1. User opens `/meta`.
2. User selects, imports, or drafts a set.
3. User chooses `One vs Meta` or `Meta vs One`.
4. App renders deterministic top-N damage rows.
5. User can save the draft into a team or open a row in the single calculator.

### Workflow B: benchmark a team slot

1. User opens `/teams/[teamId]`.
2. User clicks `Benchmark This Set` on a slot.
3. App opens `/meta` with a snapshot of that slot.
4. Edits in `/meta` do not mutate the team.
5. User can explicitly replace the original slot if desired.

### Workflow C: build and maintain teams

1. User opens `/teams`.
2. User creates or imports a team.
3. User edits six slots in `/teams/[teamId]`.
4. Overview panels show simple composition feedback.
5. User can send individual slots to `/meta`, `/speed`, or `/`.

## Data model direction

Add or evolve these types in `src/lib/types.ts` when implementation starts.

```ts
export type MetaBenchmarkMode = "one-vs-meta" | "meta-vs-one";

export type BenchmarkSubjectSource = "draft" | "team-slot" | "saved-set";

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

## Store boundaries

### Future `useTeamsStore`

Purpose:

- persistent saved teams
- team list order
- active team id
- slot mutations

Persistence:

- localStorage for V1
- separate key from the current calculator/imported-set storage

Do not build teams on top of the current species-keyed `useTeamStore` assumption.

### Future `useMetaBenchmarkStore`

Purpose:

- `/meta` workspace state
- selected benchmark subject
- top-N and sorting controls
- generated benchmark rows

Rules:

- store accepts team-slot context but never mutates teams directly
- rows are derived/recomputed state
- no speed ladder state here

### Future `useSavedSetsStore`

Purpose:

- reusable personal set snippets
- clean path away from species-keyed set storage for multi-team workflows

V1 can ship without a full saved-set-library UI, but the data model should not block it.

## Share-state direction

Current share state:

- `v: 1` — calculator imported sets
- `v: 2` — Speed Benchmark state

Future pages should use new versions instead of reusing `v: 2`.

Recommended future shapes:

```ts
type FutureShareState =
  | {
      v: 3;
      page: "meta";
      regulationId: string;
      mode: MetaBenchmarkMode;
      topN: number;
      subject: BenchmarkSubjectRef;
      sets: ImportedSet[];
    }
  | {
      v: 4;
      page: "team";
      team: SavedTeam;
      sets: ImportedSet[];
    };
```

Rules:

1. Keep existing `v: 1` and `v: 2` parsing intact.
2. Do not serialize generated benchmark rows.
3. Team shares serialize one team snapshot, not the full local team library.
4. Shared team/meta snapshots should restore from embedded set data, not from localStorage references.

## Meta benchmark pipeline

Potential modules:

- `src/lib/meta/benchmark-profiles.ts`
- `src/lib/meta/benchmark-attacks.ts`
- `src/lib/meta/benchmark-command.ts`
- `src/lib/meta/benchmark-scorers.ts`

Responsibilities:

- expand `src/data/vgc-meta.json` into deterministic threat profiles
- filter by active regulation legality
- choose deterministic item, ability, move, and spread assumptions
- build `ParsedCommand` objects directly, not prompt text
- score rows for stable sorting

Use runtime data from the current split modules under `src/lib/data/`.

## `/meta` V1 scope

Included:

- subject picker/draft set
- `One vs Meta`
- `Meta vs One`
- top-N control
- who-moves-first indicator using shared speed math
- visible assumption tags
- share and restore with a new share version
- save subject to team when team store exists

Excluded:

- speed tiers or arced speed ladder
- full team vs meta matrix
- synergy score engine
- cloud sync/accounts
- monetization enforcement

## `/teams` V1 scope

Included:

- team index
- create team
- duplicate team
- delete team
- import Showdown/PokePaste text
- open team editor

## `/teams/[teamId]` V1 scope

Included:

- six fixed slots
- edit slot set
- clear slot
- duplicate slot
- reorder slots
- simple overview panels
- handoff slot to `/meta`
- handoff slot to `/speed`
- handoff slot to `/`
- share one team snapshot with a new share version

## Handoff rules

### Team to Meta

- copy the slot snapshot into `/meta`
- preserve `teamId` and `slotId` as origin metadata
- never mutate the team until the user chooses an explicit replace/save action

### Meta to Team

- let user replace origin slot, choose another slot, or create a new team
- write only the selected destination slot

### Team to Speed

- copy the slot snapshot into `/speed` as the subject
- Speed edits remain local and non-destructive

### Team to Calculator

- use calculator share/import flow where possible
- avoid adding team editing state to `/`

## Implementation order

1. team and saved-set types
2. share-state v3/v4 scaffolding
3. `useTeamsStore` with tests
4. meta benchmark profile/row pipeline with tests
5. `/meta` damage benchmark UI
6. `/teams` index
7. `/teams/[teamId]` editor
8. cross-surface handoffs
9. docs and README updates

## Testing priorities

- current calculator share URLs still parse
- current Speed Benchmark share URLs still parse
- team store slot mutations are deterministic
- `/meta` rows are stable for a fixed snapshot
- handoffs copy snapshots and do not silently mutate source teams
- generated assumptions are visible in UI
