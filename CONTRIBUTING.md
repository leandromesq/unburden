# Contributing to Unburden

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data Pipeline

Structural data (Pokémon, moves, learnsets, items, regulation) is generated from Pokemon Showdown package data:

```bash
npm run generate:data
```

Usage/meta data is generated from Smogon stats:

```bash
npm run generate:vgc-meta
```

Run both:

```bash
npm run generate:all
```

Generated snapshots are committed under `src/data/`.

## Quality Checks

```bash
npm run lint
npm test -- --runInBand
npm run build
```

## Sources

- **Structural data**: `@pkmn/dex` + `@pkmn/mods/champions`
- **Usage/meta**: raw Smogon stats (`gen9championsvgc2026regma`, cutoff 1500)
- **Sprites**: `@pkmn/img` (Pokémon Showdown sprite URLs)
- **Damage calc**: `@smogon/calc`

See [`docs/data-sources.md`](docs/data-sources.md) for the full source-of-truth diagram.

## License

[MIT](LICENSE.md)
