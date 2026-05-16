# Unburden Data Sources

This document lists the data sources Unburden uses, what each source owns, and where the app consumes the generated snapshots.

## Source-of-truth policy

- Runtime gameplay and meta data is local. The app reads committed JSON snapshots under `src/data/`.
- Runtime network access is only for Pokemon images/sprites.
- Structural Pokemon, move, and learnset data comes from `@pkmn/dex` and `@pkmn/data`.
- Pokemon Champions meta defaults come from Pikalytics Champions AI pages, normalized into `src/data/vgc-meta.json`.
- Champions legal held items and mega ability gaps come from Serebii during data generation.
- Regulation legality is local in `src/data/regulations/regulation-m-a.json`, with live Serebii verification during generation.

## Source-of-truth diagram

```mermaid
flowchart TD
  subgraph External[External sources]
    PKMN[@pkmn/dex + @pkmn/data]
    PIKA[Pikalytics Champions AI pages]
    SEREBII_MEGA[Serebii Champions mega abilities]
    SEREBII_ITEMS[Serebii Champions legal items]
    SEREBII_REG[Serebii Regulation M-A roster]
    SPRITES[Pokemon Showdown / PokemonDB image CDNs]
  end

  subgraph Local[Local config / overrides]
    REG[src/data/regulations/regulation-m-a.json]
    ACTIVE[src/data/regulations/active.json]
    ALIASES[src/data/form-aliases.json]
    META_OVR[src/data/vgc-meta.overrides.json]
  end

  subgraph Generators[Build-time generators]
    GEN_STATIC[scripts/generate-static-data.ts]
    GEN_META[scripts/generate-vgc-meta.ts]
    FETCH[scripts/fetch/*]
    TRANSFORM[scripts/transform/*]
  end

  subgraph Snapshots[Committed runtime snapshots]
    POKEMON[src/data/pokemon.gen9.json]
    MOVES[src/data/moves.gen9.json]
    LEARNSETS[src/data/learnsets.gen9.json]
    ITEMS[src/data/champions-items.json]
    META[src/data/vgc-meta.json]
  end

  subgraph Runtime[Runtime data modules]
    DATA[src/lib/data/*]
  end

  subgraph App[Runtime app usage]
    DAMAGE[damage calculator]
    SPEED[speed benchmark]
    PARSER[parser / autocomplete]
    UI[summary cards / editors / badges]
  end

  PKMN --> GEN_STATIC
  PIKA --> GEN_STATIC
  PIKA --> GEN_META
  SEREBII_MEGA --> GEN_STATIC
  SEREBII_ITEMS --> GEN_STATIC
  SEREBII_REG -. verification input .-> GEN_STATIC
  REG --> GEN_STATIC
  REG --> DATA
  ACTIVE --> DATA
  ALIASES --> GEN_META
  ALIASES --> DATA
  META_OVR --> GEN_META
  FETCH --> GEN_STATIC
  FETCH --> GEN_META
  TRANSFORM --> GEN_STATIC
  TRANSFORM --> GEN_META
  GEN_STATIC --> POKEMON
  GEN_STATIC --> MOVES
  GEN_STATIC --> LEARNSETS
  GEN_STATIC --> ITEMS
  GEN_META --> META
  POKEMON --> DATA
  MOVES --> DATA
  LEARNSETS --> DATA
  ITEMS --> DATA
  META --> DATA
  DATA --> DAMAGE
  DATA --> SPEED
  DATA --> PARSER
  DATA --> UI
  SPRITES --> UI
```

## External sources

### `@pkmn/dex` and `@pkmn/data`

Used by:

- `scripts/generate-static-data.ts`
- `scripts/transform/build-static-data.ts`

Owns:

- canonical species data
- canonical move data
- canonical learnsets

Outputs:

- `src/data/pokemon.gen9.json`
- `src/data/moves.gen9.json`
- `src/data/learnsets.gen9.json`

### Pikalytics Champions AI pages

Sources:

- `https://www.pikalytics.com/ai/pokedex/championspreview`
- per-Pokemon AI pages under the same route

Used by:

- `scripts/generate-static-data.ts`
- `scripts/generate-vgc-meta.ts`
- `scripts/fetch/fetch-pikalytics.ts`
- `scripts/transform/build-vgc-meta.ts`

Owns:

- Champions metagame usage order / `usageRank`
- usage percent when available
- common moves, abilities, and items
- default move, ability, and item derivation inputs
- additional Champions species coverage during static data generation

Outputs:

- `src/data/vgc-meta.json`
- extra species coverage in `src/data/pokemon.gen9.json`

### Serebii Champions mega abilities

Source:

- `https://www.serebii.net/pokemonchampions/megaabilities.shtml`

Used by:

- `scripts/generate-static-data.ts`
- `scripts/fetch/fetch-serebii.ts`

Owns:

- Champions mega ability fixes when other sources are incomplete

Output affected:

- `src/data/pokemon.gen9.json`

### Serebii Champions legal items

Source:

- `https://www.serebii.net/pokemonchampions/items.shtml`

Used by:

- `scripts/generate-static-data.ts`
- `scripts/fetch/fetch-serebii.ts`

Owns:

- legal Pokemon Champions held-item pool
- `Miscellaneous Items` are intentionally excluded

Outputs:

- `src/data/champions-items.json`

Also constrains:

- legal item validation in `scripts/generate-vgc-meta.ts`
- item suggestions and set editing at runtime

### Serebii Champions Regulation M-A roster

Source:

- `https://www.serebii.net/pokemonchampions/recruit/regularrosterm-a.shtml`

Used by:

- `scripts/generate-static-data.ts`

Owns:

- live verification input for the local Regulation M-A roster

Local source of truth:

- `src/data/regulations/regulation-m-a.json`

Why local:

- legal low-usage species can disappear from pure meta-driven pipelines
- local regulation data lets runtime filtering stay deterministic
- generation can compare local roster with Serebii and update verification metadata in `src/data/regulations/active.json` when it matches

### Runtime image CDNs

Sources:

- `https://play.pokemonshowdown.com/sprites/home/...`
- `https://play.pokemonshowdown.com/sprites/dex/...`
- `https://play.pokemonshowdown.com/sprites/gen5/...`
- `https://img.pokemondb.net/sprites/home/normal/...`
- `https://img.pokemondb.net/artwork/large/...`

Used by:

- Pokemon summary / identity UI components under `src/components/omnibar/` and `src/components/pokemon/`

Owns:

- sprite and artwork rendering only

Gameplay data is not fetched at runtime.

## Local config and snapshots

### `src/data/regulations/active.json`

Purpose:

- chooses the active regulation id
- stores optional roster verification metadata

Loaded by:

- `src/lib/data/regulations.ts`

### `src/data/regulations/regulation-m-a.json`

Purpose:

- local legality list for Regulation M-A

Loaded by:

- `src/lib/data/regulations.ts`
- `src/lib/data/pokemon.ts`

Used by generation:

- `scripts/generate-static-data.ts`

Runtime effect:

- builds `legalPokemonData`
- constrains legal Pokemon suggestions and filtering

### `src/data/form-aliases.json`

Purpose:

- explicit alias and form resolution

Loaded by:

- `src/lib/data/form-aliases.ts`

Used by:

- parser / autocomplete
- Showdown import normalization
- meta generation form mapping

### `src/data/vgc-meta.overrides.json`

Purpose:

- local overrides for generated competitive meta profiles

Used by:

- `scripts/generate-vgc-meta.ts`

Effects:

- can override generated defaults, limits, species mappings, and profile fields

### Generated runtime snapshots

These committed files are runtime gameplay/meta sources of truth:

- `src/data/pokemon.gen9.json`
- `src/data/moves.gen9.json`
- `src/data/learnsets.gen9.json`
- `src/data/champions-items.json`
- `src/data/vgc-meta.json`

## Runtime data modules

Runtime snapshot access is split by domain:

- `src/lib/data/pokemon.ts`
  - `pokemonById`
  - `legalPokemonData`
  - mega evolution helpers
  - canonical prompt Pokemon names
- `src/lib/data/moves.ts`
  - `moveData`
  - `moveById`
- `src/lib/data/learnsets.ts`
  - `learnsetByPokemonId`
- `src/lib/data/items.ts`
  - `allowedItemIds`
  - `itemDisplayById`
- `src/lib/data/regulations.ts`
  - `activeRegulation`
- `src/lib/data/form-aliases.ts`
  - `formAliasMap`
- `src/lib/data/vgc-meta.ts`
  - `vgcMetaProfiles`
  - `vgcMetaByPokemonId`

## Runtime consumers

### Damage calculator

Main consumers:

- `src/lib/calc/damage-engine.ts`
- parser modules under `src/lib/parser/`
- omnibar components under `src/components/omnibar/`
- `src/store/use-omni-store.ts`

Uses:

- Pokemon, moves, learnsets, items, regulation data, form aliases, meta defaults

### Speed Benchmark

Main consumers:

- `src/lib/calc/speed-engine.ts`
- `src/lib/speed/speed-command.ts`
- `src/lib/speed/speed-autocomplete.ts`
- `src/lib/speed/speed-benchmark.ts`
- `src/store/use-speed-benchmark-store.ts`
- components under `src/components/speed/`

Uses:

- legal Pokemon data
- Pokemon base Speed and abilities
- legal items
- meta profiles and `usageRank`
- active regulation

## Practical data flow

### Build time

1. `scripts/generate-static-data.ts` fetches and transforms structural Pokemon, move, learnset, item, mega ability, and regulation verification inputs.
2. `scripts/generate-vgc-meta.ts` fetches and transforms Champions usage/meta data.
3. Generated snapshots are validated for minimum counts, unique ids, legal item references, and large profile deltas before writing.
4. Generated JSON files are committed under `src/data/`.

### Runtime

1. Domain modules under `src/lib/data/` import committed JSON snapshots.
2. Parser, autocomplete, damage calculator, Speed Benchmark, stores, and UI consume in-memory maps/arrays.
3. No live gameplay or meta fetch runs during normal app usage.
4. Images are the only runtime network dependency.

## Troubleshooting stale or missing data

If the app looks stale or a legal Pokemon/item is missing, inspect these first:

- `scripts/generate-static-data.ts`
- `scripts/generate-vgc-meta.ts`
- `scripts/fetch/*`
- `scripts/transform/*`
- `src/data/regulations/regulation-m-a.json`
- `src/data/vgc-meta.overrides.json`
- the generated snapshots under `src/data/`

Runtime UI code should usually not be the first place to change source accuracy.
