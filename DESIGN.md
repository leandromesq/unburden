---
name: Unburden VGC
description: Prompt-first Pokemon Champions and VGC workspace for damage and Speed decisions.
colors:
  charcoal-felt: "#141414"
  raised-charcoal: "#181818"
  workbench-graphite: "#1c1c1c"
  panel-graphite: "#232323"
  active-graphite: "#2b2b2b"
  brass-signal: "#d6a85f"
  brass-signal-strong: "#e3bf81"
  warm-chalk: "#f3f3f1"
  chalk-muted: "#cbc7bf"
  chalk-dim: "#a8a39a"
  danger-clay: "#c96b5c"
  success-sage: "#6e9b7f"
  info-steel: "#6d8f9c"
  outcome-favorable: "#6e9b7f"
  outcome-unfavorable: "#c96b5c"
  outcome-tie: "#b6a05a"
  parchment-field: "#f3f0ea"
  parchment-surface: "#fdfbf7"
typography:
  display:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  title:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.01em"
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.02em"
  prompt:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.75
rounded:
  sm: "8px"
  md: "8px"
  lg: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-icon:
    backgroundColor: "{colors.panel-graphite}"
    textColor: "{colors.chalk-dim}"
    rounded: "{rounded.md}"
    height: "2rem"
    padding: "0 0.625rem"
  chip:
    backgroundColor: "{colors.panel-graphite}"
    textColor: "{colors.chalk-dim}"
    rounded: "{rounded.md}"
    padding: "0.375rem 0.75rem"
  chip-active:
    backgroundColor: "{colors.brass-signal}"
    textColor: "{colors.warm-chalk}"
    rounded: "{rounded.md}"
    padding: "0.375rem 0.75rem"
  panel:
    backgroundColor: "{colors.workbench-graphite}"
    textColor: "{colors.warm-chalk}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  input:
    backgroundColor: "{colors.workbench-graphite}"
    textColor: "{colors.warm-chalk}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
---

# Design System: Unburden VGC

## 1. Overview

**Creative North Star: "The Tournament Workbench"**

Unburden looks like a serious competitive work surface: compact, warm, and built for rapid iteration under pressure. The interface should feel like a tactical editor where every control either clarifies the prompt, exposes an assumption, or moves the user toward a decision.

The system rejects old-school form-heavy Pokemon calculators, generic SaaS dashboards, flashy gamer neon, cute Pokedex toy styling, prompt-only opacity, and silent assumptions. It is dense, but not cramped; restrained, but not bland; technical, but not cold.

**Key Characteristics:**

- Warm charcoal surfaces with a rare brass accent.
- IBM Plex Sans for interface clarity and IBM Plex Mono for prompt/data trust.
- Compact controls with explicit hover, focus, active, disabled, and selected states.
- Tonal layering first, shadows only when depth or overlay behavior matters.
- Motion for state feedback only, never decoration.

## 2. Colors

The palette is restrained: warm neutral layers carry the workspace, while Brass Signal marks action, selection, focus, and important prompt tokens.

### Primary

- **Brass Signal** (`--accent`): The single product accent. Use it for current selection, focus affordances, important prompt tokens, KO emphasis, and active state. Its rarity is part of the design.
- **Strong Brass Signal** (`--accent-strong`): Use for accent text and active icons where Brass Signal needs more contrast.

### Secondary

- **Success Sage** (`--success`): Positive result and favorable Speed relation.
- **Danger Clay** (`--danger`): Invalid prompt tokens, dangerous outcomes, and unfavorable Speed relation.
- **Info Steel** (`--info`): Informational prompt tokens such as abilities and freeze-like state language.

### Neutral

- **Charcoal Felt** (`--bg`): Dark mode page background.
- **Raised Charcoal** (`--bg-elevated`): Main composer background, slightly lifted from the page.
- **Workbench Graphite** (`--surface`): Primary panels and cards.
- **Panel Graphite** (`--surface-2`): Secondary panel fields, chips, status rows.
- **Active Graphite** (`--surface-3`): Hovered and active neutral surfaces.
- **Warm Chalk** (`--text`): Primary foreground.
- **Muted Chalk** (`--text-muted`): Secondary readable text.
- **Dim Chalk** (`--text-dim`): Labels, captions, and non-primary controls.
- **Parchment Field** (`--bg` in light theme): Light mode page background.
- **Parchment Surface** (`--surface` in light theme): Light mode primary panel surface, deliberately warm instead of pure white.

### Named Rules

**The Brass Rarity Rule.** Brass Signal is not decoration. If more than one thing in a local region is brass, only the selected or decisive thing keeps it.

**The Outcome Token Rule.** Speed and damage relation colors use domain tokens: `--outcome-favorable`, `--outcome-unfavorable`, `--outcome-tie`, and `--outcome-neutral`. Do not style battle relations directly with generic `--success` or `--danger` unless the relation token does not exist.

**The Type Token Rule.** Pokemon type badges use `--type-*` CSS variables through `getPokemonTypeColor()`. Do not reintroduce component-local hex maps for types.

**The Warm Neutral Rule.** Neutrals must stay warm and tinted. Never introduce pure black, pure white, or cold blue-gray defaults.

## 3. Typography

**Display Font:** IBM Plex Sans with system sans fallback  
**Body Font:** IBM Plex Sans with system sans fallback  
**Label/Mono Font:** IBM Plex Mono

**Character:** IBM Plex Sans gives the workspace a measured technical voice without becoming sterile. IBM Plex Mono makes prompts, stats, Speed values, and labels feel inspectable and exact.

### Hierarchy

- **Display** (600, `1.5rem`, tight tracking): Product title and rare screen-level headings only.
- **Headline** (600, `1rem` to `1.125rem`): Panel names, result group headings, and important local summaries.
- **Title** (600, `0.8125rem`, slight tracking): Section headers inside dense panels.
- **Body** (400 or 500, `0.875rem` to `0.9375rem`): Explanatory copy, labels with sentence rhythm, and readable UI text. Cap prose at 65 to 75ch.
- **Label** (IBM Plex Mono, `0.6875rem`, uppercase when data-like): Data labels, stat labels, prompt-facing metadata.
- **Prompt** (IBM Plex Mono, `0.875rem`, `0.9375rem` from 48rem up, `1.75rem` line height): Command bars and highlighted prompt mirrors.

### Named Rules

**The Editor Type Rule.** Prompt text, data values, and stat labels use mono. Buttons, tabs, prose, and navigation use sans. Do not mix them for flavor.

## 4. Elevation

Unburden uses a hybrid depth model. Most depth comes from tonal layering and thin borders; shadows are reserved for the main composer, panels that need separation, and floating overlays such as menus and modals.

### Shadow Vocabulary

- **Workbench Shadow** (`--shadow: 0 10px 24px rgba(0, 0, 0, 0.22)`): Main composer or large work surfaces that need to anchor the page.
- **Soft Shadow** (`--shadow-soft: 0 2px 8px rgba(0, 0, 0, 0.14)`): Quiet panels and logo surfaces.
- **Overlay Shadow** (`--shadow-overlay: 0 14px 32px rgba(0, 0, 0, 0.3)`): Menus, popovers, skip link, and modals.

### Named Rules

**The Layer Before Shadow Rule.** Try surface color, border, and spacing before adding a shadow. Shadows mean elevation, not decoration.

## 5. Components

### Buttons

- **Shape:** Compact rounded rectangles (8px radius) with 2rem minimum height for dense controls.
- **Primary:** Active/action states use Brass Signal through soft backgrounds, borders, or icon color rather than large saturated blocks.
- **Hover / Focus:** Hover shifts neutral surfaces one layer up. Focus uses a brass-tinted 3px ring and never relies on color alone.
- **Icon Buttons:** `theme-icon-button` is the standard compact control vocabulary. Keep icons thin, functional, and 13px to 16px in dense toolbars.

### Chips

- **Style:** Thin border, Panel Graphite background, Dim Chalk text, compact padding.
- **State:** Active chips use brass border and soft brass fill. Disabled chips remain visible but subdued with reduced opacity.
- **Use:** Modifiers, quick suggestions, status toggles, and small reversible choices.

### Cards / Containers

- **Corner Style:** 10px for larger composer and modal shells, 8px for internal panels.
- **Background:** Charcoal Felt page, Raised Charcoal composer, Workbench Graphite panels, Panel Graphite subpanels.
- **Shadow Strategy:** Main composer can use Workbench Shadow; ordinary cards use thin borders and tonal layering.
- **Border:** Use `--line` and `--line-strong`. Borders are structural, never decorative stripes.
- **Internal Padding:** 12px for dense subpanels, 16px for result cards and primary panels, 24px only for outer shell rhythm.

### Inputs / Fields

- **Style:** Warm surface background, thin border, 8px radius, inherited IBM Plex Sans unless prompt-facing.
- **Prompt Inputs:** Use IBM Plex Mono, transparent actual textarea text with a highlighted mirror layer, Brass Signal caret.
- **Focus:** Brass-tinted border and 3px soft ring.
- **Error / Disabled:** Danger Clay for invalid prompt tokens; disabled controls use Dim Chalk/Faint Chalk and reduced opacity.

### Navigation

Tool navigation is a compact tab row inside the app shell. Active tabs use a soft brass tint and brass border; inactive tabs stay quiet until hover. Damage and Speed must read as peer workspace tools, not separate apps.

### Signature Component: Command Composer

The command composer is the product's main instrument. It combines a workbench strip, prompt editor, quick suggestions, status feedback, and optional modifier panel. It should always be the strongest container on the page and the clearest focus target.

### Signature Component: Speed Ladder

The Speed Ladder uses arced, scroll-snapping rows with relation-colored borders. The visual bend is allowed because it supports scanning nearby tiers; do not turn it into decorative motion or a plain generic list.

### Component Contract

- Use `theme-icon-button` for toolbar and compact action buttons.
- Use `theme-chip`, `theme-chip-active`, and `theme-chip-disabled` for reversible modifiers, quick suggestions, and small state toggles.
- Use `theme-control theme-input` for fields and searchable controls.
- Use `theme-panel` for major work surfaces only.
- Use `theme-subpanel` for grouped controls inside a major surface; do not create nested cards.
- Use `theme-menu` for popovers, dropdowns, and combobox lists.
- Use `theme-modal-shell` for modal surfaces and `--overlay-scrim` for modal backdrops.
- Use z-index tokens (`--z-dropdown`, `--z-popover`, `--z-modal`, `--z-toast`) rather than arbitrary z-index values for new overlay work.
- Use `--focus-ring`, `--control-*`, and `--outcome-*` tokens before writing one-off focus, control, or relation styles.
- Use `theme-hit-target` when the visual control must remain compact but needs a larger touch area.

## 6. Do's and Don'ts

### Do:

- **Do** keep the interface prompt-first, not prompt-only. Every prompt state should have visible support through suggestions, summaries, status, or controls.
- **Do** use Brass Signal only for action, selection, focus, and decisive result emphasis.
- **Do** keep Damage Calculator and Speed Benchmark visually peer-level inside one workspace.
- **Do** show assumptions explicitly: set values, modifiers, forms, legality, activation conditions, and share state should be inspectable.
- **Do** respect reduced motion and keep transitions in the 120ms to 250ms range for product flow.
- **Do** use labels or copy alongside color for damage outcome, legality, and Speed relation.
- **Do** route new overlay, control, type, and outcome styling through existing semantic tokens before adding new values.

### Don't:

- **Don't** recreate old-school form-heavy Pokemon calculators where users hunt through long fields.
- **Don't** use generic SaaS dashboards with decorative cards, hero metrics, vague productivity styling, or repeated icon-card grids.
- **Don't** use flashy gamer or neon esports UI that competes with tactical work.
- **Don't** use cute Pokedex toy UI that treats the data as decoration instead of decision support.
- **Don't** make the interface prompt-only in a way that hides too much state or forces grammar memorization.
- **Don't** make silent assumptions around abilities, activation conditions, forms, legality, or set values.
- **Don't** use gradient text, glassmorphism, decorative blur, or colored side-stripe borders.
- **Don't** invent a new button, chip, or field vocabulary for a single screen. Consistency is an affordance here.
- **Don't** add component-local color maps, arbitrary z-index values, or custom focus rings when design-system tokens already exist.
