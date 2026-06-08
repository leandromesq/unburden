# ADR 0008: Pokemon Showdown packages generate Champions static data

Accepted.

Unburden generates Pokemon Champions structural snapshots from `pkmn/ps` packages instead of Serebii scraping or hand-maintained source lists.

## Context

The previous static generation flow used multiple sources for Champions-specific data: `@pkmn/dex` / `@pkmn/data` for base data, Serebii for legal held items and mega ability gaps, local regulation files for the roster, and source-specific patches for Champions move differences.

Pokemon Showdown now ships a Champions mod through `@pkmn/mods/champions`, including Champions formats, items, moves, abilities, learnsets, rulesets, scripts, and format data. `@pkmn/img` also provides Pokemon Showdown sprite URL generation.

## Decision

Use Pokemon Showdown package data for static Champions snapshots:

- `@pkmn/dex`
- `@pkmn/mods/champions`
- `@pkmn/img`

`npm run generate:data` now transforms package data into committed runtime snapshots:

- `src/data/pokemon.gen9.json`
- `src/data/moves.gen9.json`
- `src/data/learnsets.gen9.json`
- `src/data/champions-items.json`
- `src/data/regulations/regulation-m-a.json`
- `src/data/regulations/active.json`

Do not use Serebii in default generation. Keep a small local compatibility fix only where app behavior requires a support species not represented as legal by the Showdown Champions format data.

Use `@pkmn/img` for Pokemon Showdown sprite URL generation and remove PokemonDB fallbacks.

## Consequences

- Default static generation no longer needs network access.
- The open-source source story is simpler: Pokemon Showdown package data for structure/legality, Smogon stats for usage/meta, committed JSON for runtime.
- Serebii scraping and stale Serebii artifacts are removed.
- Package release cadence now determines when Champions structural data updates are available.
- Runtime still loads gameplay/meta data from committed JSON snapshots; only image URLs are external at runtime.
