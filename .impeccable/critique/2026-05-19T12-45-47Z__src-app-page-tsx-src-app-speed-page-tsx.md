---
target: main damage calculator and speed benchmark pages
total_score: 29
p0_count: 0
p1_count: 3
timestamp: 2026-05-19T12-45-47Z
slug: src-app-page-tsx-src-app-speed-page-tsx
---
# Unburden Damage Calculator and Speed Benchmark Critique

Design health score: 29/40 (Good). Main risks: mobile order and density, result hierarchy, Speed ladder discoverability, design-token drift from documented OKLCH/tinted-neutral rules, and uneven component contracts.

Priority issues:
- P1 Mobile task flow is structurally inverted. Side panels fall below composer, results only appear after calculation, and Speed ladder sits after composer, so phone users lose assumptions and benchmark context.
- P1 Speed Benchmark has too many simultaneous mental models: prompt, subject side panel, comparator, modifiers, global effects, arced ladder, pinned comparator, threshold status.
- P1 Results hierarchy underplays decisions. Damage results present three similar cards with similar weight, while KO chance, damage band, calc text, rolls, assumptions, and share actions compete.
- P2 Design system documentation and implementation are out of sync. DESIGN.md requires OKLCH/tinted neutrals, but globals use many hex tokens; transition variables include generic prototype names.
- P2 Component vocabulary is mostly cohesive but exceptions remain: local absolute overlays in Speed ladder, one-off borders, raw inputs/range/select styling, and icon-only controls with weak visible text.

Strengths:
- Product register is correctly restrained and tactical.
- Command composer is a credible signature component.
- Damage and Speed pages share shell, typography, chips, panels, and toolbar language.

Detector status: bundled detector not found, CLI scan unavailable after real attempt. Browser overlay unavailable in this harness.
