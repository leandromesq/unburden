# Unburden

Web damage calc workspace for Pokemon Champions / VGC-style doubles. Prompt-first. Client-side calc. UI act more like editor, less like old-school form.

## License and Usage

Unburden is proprietary software and is not open source.

This repository contains proprietary software and no open-source license is granted. Outside GitHub's standard platform functionality and applicable GitHub Terms, you may not copy, modify, distribute, sublicense, sell, host, deploy for third parties, or create derivative works from this codebase without prior written permission from the copyright holder.

See [LICENSE.md](./LICENSE.md) for the full proprietary notice.

Third-party trademarks, gameplay data sources, and artwork referenced by this project remain the property of their respective owners and are not licensed to you by this repository.

## What It Does

- Parse compact matchup prompts like:
  - `politoed !muddy-water @mystic-water x incineroar @assault-vest ~rain`
- Resolve Pokemon, forms, megas, moves, items, abilities, status, HP, field states, multi-hit counts
- Calculate damage client-side with 3 default bulk outputs:
  - `Min Bulk`
  - `Mid Bulk`
  - `Max Bulk`
- Support Pokemon Champions SP-based set editing
- Provide searchable editing for species, item, ability, moves, nature, SP spread
- Use current Champions meta snapshots for autocomplete and defaults

## Stack

- Next.js 16
- React 19
- TypeScript
- Zustand
- Tailwind CSS v4
- `@smogon/calc`
- `@pkmn/dex` / `@pkmn/data`
- Jest + Testing Library

## Prompt Syntax

Canonical shape:

```txt
{attacker} !{move} [attacker tokens...] x {defender} [defender tokens...] [global tokens...]
```

Example:

```txt
politoed !muddy-water @mystic-water x incineroar ~rain
```

Common tokens:

- `!move`
- `#set-name` for saved/shared set by nickname or species id
- `@item`
- `%75` for current HP in segment
- `sp:32/0/1/13/1/19` for explicit Champions SP spread
- `[Ability Name]`
- `~rain`, `~sun`, `~grassy-terrain`, `~trick-room`
- `*` for crit
- `+1` to `+6` / `-1` to `-6` for relevant attacking or defending stages
- `spe+1` to `spe+6` / `spe-1` to `spe-6`
- `burn`, `paralysis`, `poison`, `sleep`, `freeze`
- `!bullet-seed(3)` for multi-hit count

Full grammar:

- [Prompt syntax documentation](./docs/sintaxe-do-prompt.pt-BR.md)

## Features

- Segment-scoped prompt grammar
- Fuzzy Pokemon and move matching
- Searchable suggestions with keyboard navigation
- Client-side damage calc
- Mega form support
- Regulation-aware legal species filtering
- Pokemon summary cards with sprite, stats, item, ability, move, set editing
- SP-aware set editor for Pokemon Champions
- Shareable calc URLs that restore prompt + relevant custom sets
- Meta-driven autocomplete data

## Current Data Model

Runtime no fetch live competitive data. Runtime read committed snapshots under `src/data/`. Local scripts generate those files.

Main runtime data files:

- `src/data/pokemon.gen9.json`
- `src/data/moves.gen9.json`
- `src/data/learnsets.gen9.json`
- `src/data/vgc-meta.json`
- `src/data/form-aliases.json`
- `src/data/regulations/active.json`
- `src/data/regulations/regulation-m-a.json`

Full source inventory:

- [Data sources and source-of-truth diagram](./docs/data-sources.md)

## Local Development

Install deps:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Optional bug-report issue pipeline:

```bash
cp .env.example .env.local
```

Set `GITHUB_BUG_REPORT_TOKEN` in `.env.local` to enable the in-app `Report bug` form. The token needs issue creation access for the target repo.

Set `GITHUB_BUG_REPORT_REPO` if you want reports to land somewhere other than `leandromesq/unburden-issues`.

Set the repository secret `DISCORD_BUG_REPORT_WEBHOOK_URL` in GitHub Actions so new app-created issues are forwarded to Discord.

Optional public tester links:

- `NEXT_PUBLIC_DISCORD_INVITE_URL`
- `NEXT_PUBLIC_FEEDBACK_URL`
- `NEXT_PUBLIC_DONATE_URL`

These are public by design and safe to expose to the browser.

## Quality Checks

Lint:

```bash
npm run lint
```

Tests:

```bash
npm test -- --runInBand
```

Coverage:

```bash
npm test -- --coverage --runInBand
```

Dead code:

```bash
npm run knip
```

Qlty:

```bash
qlty check --all
qlty smells --all
```

Build:

```bash
npm run build
```

GitHub Actions:

- `.github/workflows/validation.yml` runs lint, coverage tests, dead-code check, production build on push to `main`
- `.github/workflows/data-freshness.yml` runs snapshot freshness check on demand and monthly
- `leandromesq/unburden-issues/.github/workflows/issues-to-discord.yml` forwards app-created GitHub bug reports to Discord when new issues open

## Data Generation

Regenerate structural static data:

```bash
npm run generate:data
```

Regenerate Champions meta profiles:

```bash
npm run generate:vgc-meta
```

Regenerate all:

```bash
npm run generate:all
```

## Scripts

- `npm run dev` - local dev server
- `npm run build` - production build
- `npm run start` - production server
- `npm run lint` - ESLint
- `npm test` - Jest
- `npm run test:watch` - Jest watch mode
- `npm run knip` - dead code / unused exports
- `npm run generate:data` - regenerate Pokemon / move / learnset snapshots
- `npm run generate:vgc-meta` - regenerate Champions meta snapshot
- `npm run generate:all` - regenerate all data snapshots

## Data Pipeline

Build-time sources:

- `@pkmn/dex` and `@pkmn/data` for canonical species, moves, learnsets
- Pikalytics Champions AI pages for competitive usage/meta
- Serebii Champions mega abilities for mega ability fixes
- local regulation files for legal roster enforcement

Runtime external assets:

- Pokemon Showdown sprite CDN
- PokemonDB image fallback URLs

Runtime data modules:

- `src/lib/data/pokemon.ts`
- `src/lib/data/moves.ts`
- `src/lib/data/learnsets.ts`
- `src/lib/data/items.ts`
- `src/lib/data/regulations.ts`
- `src/lib/data/form-aliases.ts`
- `src/lib/data/vgc-meta.ts`

## Project Structure

Key directories:

- `src/app` - Next.js app entrypoints and global styles
- `src/components` - UI components
- `src/lib` - parser, calc, data loading, grammar, utilities
- `src/store` - Zustand stores
- `src/data` - committed runtime snapshots and regulation files
- `scripts` - snapshot generation scripts
- `docs` - prompt grammar and data-source docs

## Notes

- Active regulation lives in `src/data/regulations/active.json`
- `active.json` stores regulation id, roster hash, optional last verification date
- Regulation M-A legality lives in `src/data/regulations/regulation-m-a.json`
- Meta defaults and suggestions come from generated `src/data/vgc-meta.json`
- Images load from external sprite/artwork sources at runtime. Gameplay/meta data no.

## Deploy

Standard Next.js deploy.

Typical flow:

```bash
npm install
npm run build
npm run start
```

Want hosted previews fast. Use Vercel. Repo already shaped like standard Next.js app.

