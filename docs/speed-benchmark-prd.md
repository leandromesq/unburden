# Speed Benchmark PRD

## Problem Statement

Competitive Pokemon Champions players need to answer Speed-order questions while
building and testing VGC teams. The damage calculator already gives them a
prompt-first workflow, Imported/Shared Set context, side summaries, and modifier controls,
but Speed tier work currently requires mental math, external sheets, or a
separate tool that does not share the same command grammar or product feel.

The first Speed Benchmark slice proved the core math and route direction, but
the product experience needs to be brought into alignment with the grilling
decisions:

- Speed must feel like a peer tool inside Unburden VGC, not a separate app.
- The command bar, side summaries, modifiers, and status feedback must use the
  same design system and interaction language as the damage calculator.
- The benchmark wheel must be a real arced vertical Speed ladder, not a flat
  list.
- Suggestions must be speed-specific, useful, keyboard-friendly, and restricted
  to legal Pokemon.
- Speed-only semantics must remain clear: no damage, move selection, KO text, or
  matchup scoring in this feature.

## Solution

Build Speed Benchmark as a first-class Speed tab in the shared Unburden VGC app
shell. Users enter a Speed Prompt in a Command Bar that visually and
interaction-wise matches the damage calculator composer. The left side shows the
user's Pokemon using a lighter shared Pokemon identity/summary component, while
the right side shows an explicit comparator when selected. The center workspace
shows global modifiers, parser feedback, threshold copy, and a scrollable arced
meta Speed ladder.

The tool computes Level 50 effective Speed with fixed 31 IVs, Champions Speed
SPs, Speed nature buckets, Speed stages, Tailwind, paralysis, speed-relevant
items, speed-relevant abilities, global weather/terrain, and Trick Room move
order. Generated benchmark tiers come from current VGC meta profiles only.
Explicit legal comparators may be selected from Speed Prompt input, search, or the
ladder, and can be locally edited without mutating Imported Sets, Shared Sets, or
Set Snapshots.

The Speed Prompt grammar is speed-specific but familiar to Damage Calculator users:
left-side tokens affect the subject, tokens after `x` affect the comparator,
global tokens use `~` and canonicalize to the end, and canonical Speed nature
display uses `+speed`, `neutral`, or `-speed`. Blank prompts show fast
suggestions. Partial or invalid prompts preserve the last valid structured state
and show inline feedback.

## User Stories

1. As a VGC player, I want to open Speed Benchmark from the same calculator shell, so that Speed work feels like part of the same tool.
2. As a VGC player, I want Damage and Speed to appear as peer tabs, so that switching tools does not feel like leaving the app.
3. As a VGC player, I want the Speed Benchmark Command Bar to look and behave like the Damage Calculator Command Bar, so that I do not need to relearn the interface.
4. As a VGC player, I want blank Speed Prompts to show fast legal Pokemon suggestions, so that I can start a benchmark quickly.
5. As a VGC player, I want autocomplete for legal Pokemon names, so that I can avoid typing exact names.
6. As a VGC player, I want autocomplete to exclude illegal Pokemon, so that suggestions match the active regulation.
7. As a VGC player, I want autocomplete for `x`, so that I can quickly add an explicit comparator.
8. As a VGC player, I want autocomplete for Speed-specific side modifiers, so that I can apply common Speed states without memorizing syntax.
9. As a VGC player, I want autocomplete for global Speed modifiers, so that weather, terrain, and Trick Room are easy to apply.
10. As a VGC player, I want autocomplete to prioritize speed-relevant abilities, so that important abilities are easier to find than irrelevant abilities.
11. As a keyboard-heavy user, I want arrows, Tab, Enter, and Escape to work in Speed autocomplete, so that the flow matches the battle calculator.
12. As a VGC player, I want `+nature` and exact positive Speed natures to canonicalize to `+speed`, so that the command stays compact and Speed-only.
13. As a VGC player, I want negative Speed natures to canonicalize to `-speed`, so that Trick Room planning is clear.
14. As a VGC player, I want neutral nature and default 32 Speed SP omitted from visible commands, so that commands do not become noisy.
15. As a VGC player, I want `spe-sp:N` to apply only to the side where it appears, so that subject and comparator edits remain predictable.
16. As a VGC player, I want bare `+1` through `+6` and `-1` through `-6` to mean Speed stage in Speed Benchmark, so that command entry is compact.
17. As a VGC player, I want Tailwind to be side-specific, so that it does not accidentally affect the whole benchmark wheel.
18. As a VGC player, I want paralysis to be side-specific and Speed-only, so that only Speed-relevant status is supported.
19. As a VGC player, I want global weather and terrain to affect generated meta tiers, so that conditional speed abilities are represented accurately.
20. As a VGC player, I want explicit ability selection to be separate from activation conditions, so that `[Chlorophyll]` alone does not silently assume Sun.
21. As a VGC player, I want Unburden to require an explicit active state, so that the tool does not assume an item has been consumed.
22. As a VGC player, I want each meta profile to be its own benchmark identity, so that base and mega profiles can appear separately.
23. As a VGC player, I want generated meta benchmarks to assume Level 50, 31 IVs, +Speed nature, and 32 Speed SP, so that the baseline represents max Speed benchmarks consistently.
24. As a VGC player, I want generated benchmark tiers grouped by effective Speed, so that tied tiers are easy to scan.
25. As a VGC player, I want the tied-tier representative to be the most common meta Pokemon, so that the ladder surfaces familiar threats first.
26. As a VGC player, I want a tied-tier popover or drawer, so that I can inspect all Pokemon sharing a Speed tier without expanding the ladder inline.
27. As a VGC player, I want selecting a tied Pokemon to pin it as the explicit comparator, so that I can inspect and edit that comparator.
28. As a VGC player, I want the Speed ladder to use an arced vertical wheel layout, so that the focused benchmark is visually distinct and nearby tiers remain readable.
29. As a VGC player, I want the ladder to preserve physical Speed order under Trick Room, so that colors and labels carry outcome meaning without reordering the mental model.
30. As a VGC player, I want the ladder to auto-focus the nearest benchmark that moves before me, so that the most important threat is immediately visible.
31. As a VGC player, I want the ladder to remain scrollable, so that I can inspect tiers outside the focused neighborhood.
32. As a VGC player, I want green, amber, and red outcomes to reflect move order, so that I can understand results at a glance.
33. As a VGC player, I want the subject Speed SP slider to update the ladder in real time, so that I can feel thresholds while adjusting investment.
34. As a VGC player, I want Speed result copy to use action phrasing, so that the tool tells me what to do next.
35. As a VGC player, I want threshold copy for minimum Speed SP under normal move order, so that I can spend only what is needed.
36. As a VGC player, I want threshold copy for maximum Speed SP under Trick Room, so that I can stay slow enough while still moving first.
37. As a VGC player, I want secondary suggestions for subject-side changes, so that I can see which local modifiers would let me reach a tier.
38. As a VGC player, I do not want suggestions that add or remove Trick Room, so that the tool does not change the battle mode I am planning around.
39. As a VGC player, I do not want suggestions that weaken the comparator, so that recommendations focus on my Pokemon and global state.
40. As a VGC player, I want Imported Sets, Shared Sets, and Set Snapshots to be accepted as Speed Benchmark subjects in a future version, so that team-builder integration has a clean path.
41. As a VGC player, I want Set values to initialize Speed Benchmark state, so that the tool respects Imported Sets and Shared Sets.
42. As a VGC player, I want local Speed edits to avoid mutating Imported Sets, Shared Sets, or Set Snapshots, so that exploration is non-destructive.
43. As a VGC player, I want Share URLs to restore only the Speed Prompt state and referenced Set Snapshots, so that shared links are stable and private by default.
44. As a VGC player, I want source labels preserved as metadata in shared states, so that restored snapshots still explain where they came from.
45. As a VGC player, I want the Speed state stored in a dedicated non-persisted store, so that exploratory Speed state does not leak into the damage calculator.
46. As a maintainer, I want Speed math shared between the damage engine and Speed Benchmark, so that formula drift cannot create conflicting results.
47. As a maintainer, I want parser, autocomplete, benchmark grouping, and Speed math tested as deep modules, so that UI iterations do not break core behavior.
48. As a maintainer, I want visible Speed UI strings in the i18n dictionaries, so that the product remains localization-ready.
49. As a maintainer, I want command tokens to remain English/canonical in V1, so that grammar complexity stays constrained.
50. As a mobile user, I want the Speed experience to stack in a useful order, so that the command, result, subject, ladder, and comparator remain usable on small screens.

## Implementation Decisions

- Speed Benchmark is a peer tool under the shared app shell, exposed as a tab alongside Damage.
- The route can remain dedicated for deep-linking and share URLs, but the user-facing navigation should feel like switching calculator modes, not loading a separate product.
- The Command Bar/composer must reuse the Damage Calculator's visual structure: shared shell, centered composer, workbench strip, status row, chip styles, focus behavior, and toolbar conventions.
- Pokemon identity/summary UI should be extracted into a lighter shared component that both Speed and the battle calculator can use where appropriate.
- Speed side panels should visually align with existing Pokemon side summaries, while keeping the surface speed-only.
- Modifier controls should follow the existing modifier control language: compact chips, sliders for numeric values, selects or menus for option sets, and consistent active/disabled states.
- The arced vertical ladder is the primary benchmark visualization. A plain list is not sufficient for the final UX.
- Ladder physical order always remains effective Speed order. Trick Room changes outcome semantics and labels, not ordering.
- Desktop ladder focus should show roughly four tiers above and four tiers below. Mobile should show roughly two above and two below, while the full ladder remains scrollable.
- Generated ladder entries come from current VGC meta profiles only.
- Explicit legal comparators can come from Speed Prompt input, autocomplete/search, or ladder selection.
- Explicit legal comparators that are not generated Speed Ladder tiers are pinned locally and do not affect generated tier grouping.
- Side-specific modifiers apply only to explicit subject/comparator sides. They do not apply to generated ladder entries.
- Global modifiers apply to generated ladder entries and explicit sides.
- Generated meta profiles use each profile's default ability. Conditional speed boosts apply only when the required global condition is active.
- Generated meta benchmarks use a max-Speed benchmark baseline: Level 50, 31 Speed IV, 32 Speed SP, and +Speed nature.
- Generated meta profiles use speed-relevant default items such as Choice Scarf.
- Each meta profile is its own benchmark identity, including base and mega forms.
- Representative Pokemon for tied tiers uses lowest usage rank, with a stable display fallback.
- Runtime tier sorting should handle missing usage rank defensively during migrations.
- Speed math is a deep shared module used by both the battle damage engine and Speed Benchmark.
- Speed math is fixed at Level 50, Speed IV 31, and Champions SPs.
- Speed nature is modeled as a bucket: plus, neutral, minus.
- Exact recognized natures can be accepted, but Speed Benchmark display canonicalizes to the bucket.
- Canonical Speed Prompts use `+speed`, `neutral`, and `-speed` rather than generic phrases such as `plus nature`.
- `x` is required to create an explicit comparator.
- Without `x`, the command resolves only the subject and auto-focuses the nearest benchmark that moves before it.
- Global Prompt Tokens use `~` and canonicalize to the end of the prompt.
- Tailwind is side-specific and never uses `~`.
- Bare `-6` through `+6` mean Speed stages in this feature.
- Canonical stage display should use `spe-6` through `spe+6`.
- `spe-sp:0..32` is the compact Speed SP token.
- Invalid partial commands preserve last valid structured state and show inline parse feedback.
- Suggestions are speed-specific and separate from battle-damage autocomplete.
- Name search is included for V1. Type filtering is out of scope.
- Suggestions must never include illegal Pokemon under the active regulation.
- Suggestions may include Imported Sets, Shared Sets, or Set Snapshots, but V1 should not optimize the UI around team-builder workflows.
- Share state extends the existing share union with Speed state version 2.
- Speed share state includes only the subject/comparator state and referenced Set Snapshots, not a whole local set library.
- The Speed store is dedicated and not persisted to local storage in V1.
- UI edits are local overrides and do not mutate saved/imported sets.

## Testing Decisions

- Tests should validate external behavior, not component implementation details. A good test should describe user-visible or module-contract behavior that should remain true across refactors.
- Speed math must be unit-tested as a deep module. Tests should cover Level 50 Speed, 31 IVs, Speed SPs, Speed nature buckets, stages, Tailwind, Choice Scarf, paralysis, Quick Feet, conditional abilities, Unburden active state, Trick Room move-order inversion, and Speed SP threshold searches.
- Damage-engine tests should remain in place to prove the shared Speed math still preserves existing speed-based damage behavior.
- Speed Prompt parser tests should cover left-only prompts, comparator prompts, side-specific token isolation, global token parsing, compact `spe-sp:N`, accepted paralysis tokens, and canonical prompt formatting.
- Speed autocomplete tests should cover legal-only Pokemon suggestions, blank suggestions, side modifiers, global modifiers, ability prioritization, and applying suggestions to command text.
- Benchmark grouping tests should cover generated meta tier grouping by effective Speed, representative selection by usage rank, Trick Room relation semantics, and legal comparator pinning.
- Share-state tests should cover v1 backwards compatibility for the battle calculator and v2 Speed state hydration/serialization.
- Store tests should focus on state transitions: parse success, parse failure preserving last valid state, direct UI edits updating canonical command, clear comparator, clear subject, swap sides, and hydration.
- UI/integration tests should cover route load, shell tabs, command suggestions, subject selection, Speed SP slider updates, arced ladder focus, tied-tier selection, explicit comparator editing, and share URL restoration.
- Prior art exists in the battle calculator parser/autocomplete tests, omnibar interaction tests, Pokemon side summary tests, share-state tests, and damage-engine tests.

## Out of Scope

- Damage calculations inside Speed Benchmark.
- KO ranges, KO text, matchup scoring, or move selection.
- `/speed` to Damage handoff.
- Type filtering.
- Meta usage spreads or spread-aware benchmark assumptions.
- Applying local Speed edits back to Imported Sets, Shared Sets, or future saved sets.
- Team builder UI integration beyond accepting saved/imported set references.
- Persisting Speed Benchmark state to local storage.
- Applying side-specific modifiers to generated Speed Ladder entries.
- Recommending Trick Room additions/removals.
- Recommending comparator weakening.
- Non-paralysis status modifiers.
- Full localization of command tokens in V1.

## Further Notes

- Earlier Speed Benchmark planning has been consolidated into this PRD. Treat
  this file as the source of truth for `/speed` behavior and UX.
- The current implementation already has the shared Speed engine, a dedicated
  Speed store, basic v2 share state, legal-only autocomplete, Speed tab shell,
  and an arced ladder foundation. The remaining product work should focus on
  extracting shared identity/modifier components, improving the ladder tied-tier
  popover/drawer, adding pinned off-tier comparator markers, and closing
  integration tests around the full Speed workflow.
- The phrase "Speed Benchmark" should remain product-facing. Internally,
  "subject", "comparator", "generated meta tier", "pinned comparator", and
  "effective Speed" should remain consistent vocabulary.
