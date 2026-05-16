# Product

## Register

product

## Users

Competitive Pokemon Champions and VGC-style doubles players who are building teams, testing matchups, checking damage ranges, and planning Speed interactions. They are often in a fast iteration loop: typing a matchup, adjusting a set or modifier, reading the result, then immediately trying the next scenario.

Primary users are keyboard-heavy competitive players and team builders who already understand Pokemon mechanics and need the interface to stay out of the way. Secondary users include testers and community members sharing URLs, bug reports, and reproducible calculations.

## Product Purpose

Unburden is a prompt-first VGC workspace for calculating damage and comparing Speed benchmarks with shared Pokemon, set, regulation, meta, and modifier language.

It exists to replace slow, form-heavy calc workflows with an editor-like command flow: users describe a matchup or benchmark in compact prompt text, then refine the result through autocomplete, side summaries, modifiers, and shareable state.

Success means a player can answer practical battle-planning questions quickly and confidently: what damage range matters, what bulk profile survives, what Speed threshold must be reached, and what explicit assumptions produced the result.

## Brand Personality

Fast, precise, tactical.

The product should feel like a serious competitive tool rather than a toy Pokédex or generic dashboard. It should be compact, readable, and confident, with enough warmth to feel approachable but no unnecessary spectacle. The interface behaves more like an intelligent text editor than an old calculator form.

## Anti-references

- Old-school form-heavy Pokemon calculators where every scenario requires hunting through long fields.
- Generic SaaS dashboards with decorative cards, hero metrics, and vague productivity styling.
- Flashy gamer or neon esports UI that competes with the user's tactical work.
- Cute Pokédex toy UI that treats the data as decoration instead of decision support.
- Prompt-only interfaces that hide too much state and force users to memorize everything.
- Silent assumptions, especially around abilities, activation conditions, forms, legality, or set values.

## Design Principles

1. **Prompt-first, not prompt-only.** Text entry is the fastest path, but visible controls, summaries, suggestions, and feedback must support the prompt instead of making users memorize grammar.
2. **Explicit assumptions build trust.** Set values, modifiers, forms, legality, and activation conditions should be visible or inspectable. The tool should not silently invent battle context.
3. **Peer tools, one workspace.** Damage Calculator and Speed Benchmark should feel like modes inside the same VGC workspace, sharing language, rhythm, and component behavior.
4. **Optimize for competitive flow.** Keep core actions keyboard-friendly, low-latency, dense enough for experts, and structured so users can run many small scenarios quickly.
5. **Clarity beats decoration.** Color, motion, icons, and layout should communicate state, priority, or outcome. Avoid visual effects that do not help matchup decisions.

## Accessibility & Inclusion

Target WCAG AA for contrast, semantics, keyboard operation, and focus visibility. The workspace should remain usable for keyboard-first users, touch users, and users relying on assistive technology.

Reduced motion should be respected. Motion should communicate state changes only and should never delay task completion. Color should never be the only indicator of status, legality, damage outcome, or Speed relation; labels, icons, or copy should carry the same meaning.
