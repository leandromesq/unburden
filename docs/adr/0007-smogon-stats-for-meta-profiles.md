# ADR 0007: Smogon stats generate Meta Profiles

Accepted.

Unburden generates **Meta Profiles** from public Smogon usage statistics instead of Pikalytics Champions AI pages.

## Context

The Pikalytics workflow depended on scraping markdown-like AI pages and resolving one page per Pokemon. That made data updates brittle, harder to automate, and less suitable for an open-source project.

Smogon publishes structured usage statistics for Pokemon Showdown formats. The target Pokemon Champions format exists in raw Smogon stats as `gen9championsvgc2026regma`.

## Decision

Use raw Smogon chaos usage stats as the generated **Meta** source:

- format: `gen9championsvgc2026regma`
- display/config alias: `championsvgc2026regma`
- mode: BO1
- cutoff: `1500`
- month: auto-latest by default, with optional month pinning

Keep the runtime `src/data/vgc-meta.json` **Meta Profile** interface stable. The source adapter normalizes Smogon records into usage rank, usage percent, common moves, common abilities, and common items before existing app modules consume them.

Do not keep Pikalytics as a fallback source after the migration.

## Consequences

- Data generation fetches one structured stats file instead of many scraped pages.
- Generated **Meta Profiles** remain local committed snapshots; runtime gameplay/meta data still has no network dependency.
- BO1 is preferred because it has more players and better reflects in-game data usage.
- The generator must canonicalize Smogon move/item/ability ids into local display names before validation.
- If the exact format is missing from `data.pkmn.cc/stats`, the project uses raw `www.smogon.com/stats` rather than `@pkmn/smogon` for this source.
