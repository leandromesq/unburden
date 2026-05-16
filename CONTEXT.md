# Unburden VGC Workspace

Unburden VGC Workspace is a prompt-first Pokémon Champions/VGC planning workspace for calculating damage and comparing Speed benchmarks using local set data and generated Meta Profiles. The workspace has two peer tools that share Pokémon, set, regulation, meta, and modifier language.

## Language

### Workspace and prompts

**Unburden VGC Workspace**:
A prompt-first Pokémon Champions/VGC planning workspace for calculating damage and comparing Speed benchmarks using local set data and generated **Meta Profiles**.
_Avoid_: separate apps, unrelated calculators

**Prompt-First**:
The product principle that primary calculation and benchmark workflows start from editable prompt text, with UI controls supporting and reflecting that text.
_Avoid_: prompt-only, form-first

**Workspace Tool**:
A peer workflow inside the **Unburden VGC Workspace**.
_Avoid_: app, page, tab

**Damage Calculator**:
The **Workspace Tool** for calculating damage from one attacking Pokémon, one move, and one defending Pokémon under explicit modifiers.
_Avoid_: damage app, main app, old calculator

**Speed Benchmark**:
The **Workspace Tool** for comparing effective Speed order between a selected Pokémon and either the **Speed Ladder** or a **Comparator**.
_Avoid_: speed app, speed tiers page, speed calculator

**Command Bar**:
The shared text-entry UI pattern where users type a **Calc Prompt** or **Speed Prompt**.
_Avoid_: prompt bar, search box, command

**Calc Prompt**:
The Damage Calculator text input that describes attacker, move, defender, and modifiers.
_Avoid_: command, damage command, generic prompt

**Speed Prompt**:
The Speed Benchmark text input that describes a subject, optional comparator, and Speed modifiers.
_Avoid_: command, speed command, generic prompt

**Canonical Prompt**:
The normalized text form the workspace prefers for a **Calc Prompt** or **Speed Prompt**.
_Avoid_: raw input, parser state

**Alias**:
An accepted alternative spelling or token that resolves to a canonical value.
_Avoid_: canonical token

**Canonicalization**:
Converting accepted aliases or structured state into **Canonical Prompt** text while preserving user intent.
_Avoid_: arbitrary rewrite

**Prompt Token**:
A meaningful unit inside a **Calc Prompt** or **Speed Prompt**, such as a **Species** name, **Set Reference**, item, move, **Modifier**, or **Stat Points** expression.
_Avoid_: token when the unit is not prompt-facing

### Tool roles

**Attacker**:
The Pokémon in a **Calc Prompt** that uses the **Selected Move**.
_Avoid_: left side, subject, source

**Defender**:
The Pokémon in a **Calc Prompt** that receives the **Selected Move**.
_Avoid_: right side, target, comparator

**Subject**:
The user's selected Pokémon in a **Speed Prompt** whose **Effective Speed** is being benchmarked.
_Avoid_: attacker, left side, user side

**Comparator**:
An explicit Pokémon in a **Speed Prompt** compared directly against the **Subject**.
_Avoid_: defender, right side, target

### Pokémon and sets

**Species**:
A Pokémon identity with innate data such as name, types, abilities, and **Base Stats**.
_Avoid_: set, profile, mon when precision matters

**Species-Only Input**:
A prompt entry that names a **Legal Species** without providing a full **Set**.
_Avoid_: imported set, set reference

**Form**:
A distinct Pokémon identity variant with its own relevant data.
_Avoid_: cosmetic variant when stats or abilities differ

**Mega Form**:
A **Form** reached by a **Set**'s **Species** plus the required mega item, or by explicitly naming the mega identity when supported.
_Avoid_: just an item, just a species

**Resolved Form**:
The **Form** actually used for calculation or benchmarking after applying explicit form identity and **Required Item**.
_Avoid_: set species when form transformation applies

**Form Switch**:
A user action that changes a **Set** or calculation view between compatible **Forms**, especially between a base form and available **Mega Forms**.
_Avoid_: species replacement when the relationship matters

**Required Item**:
A **Set** item that is necessary for a **Form**, especially a **Mega Form**, to apply.
_Avoid_: regular item when form resolution matters

**Set**:
A concrete Pokémon configuration with species, optional nickname, item, ability, nature, **Stat Points**, and moves.
_Avoid_: species, profile, build when precision matters

**Set Snapshot**:
A copied **Set** used for non-destructive editing, sharing, or handoff between tools.
_Avoid_: live set, reference, team slot when mutation matters

**Share URL**:
A URL that restores tool-specific workspace state from embedded snapshot data.
_Avoid_: cloud save, account sync, saved state

**Imported Set**:
A **Set** created from Showdown/PokePaste text.
_Avoid_: shared set, saved set, team member

**Shared Set**:
A **Set** restored from a **Share URL**.
_Avoid_: imported set, saved set

**Draft Set**:
A **Set** being edited locally in a **Workspace Tool** that has not been saved back to an external source or future team slot.
_Avoid_: draft prompt, entire benchmark state

**Set Import**:
Turning Showdown/PokePaste text into one or more **Imported Sets**.
_Avoid_: share URL restoration, team import, cloud sync

**Set Export**:
Turning one or more workspace **Sets** into portable Showdown-style text.
_Avoid_: share URL, saved set

**Set Reference**:
A **Calc Prompt** token that resolves to an available **Set** by nickname or **Species**.
_Avoid_: set snapshot, saved set when the source pool is unclear

**Referenced Set**:
The **Set** resolved by a **Set Reference**.
_Avoid_: explicit prompt value

**Learnset**:
The moves available to a **Species** from structural Pokémon data.
_Avoid_: set moves, common moves

**Common Moves**:
The moves associated with a **Meta Profile** from current meta data.
_Avoid_: learnset, selected move

**Move Pool**:
The moves available for a tool to choose from, coming from a **Set**, **Learnset**, or **Common Moves** depending on context.
_Avoid_: selected move

**Selected Move**:
The one move used by the **Damage Calculator** to produce a **Damage Result**.
_Avoid_: move pool, common move

**Move Parameter**:
A **Prompt Token** attached to the **Selected Move** that changes how that move is calculated.
_Avoid_: set attribute, general side modifier

**Move Assumption**:
An **Assumed Value** for a move when the workspace chooses one from a **Set**, **Learnset**, or **Meta Profile**.
_Avoid_: selected move when user explicitly chose it

**Target Mode**:
A **Move Parameter** indicating whether the **Selected Move** is treated as hitting one target or multiple targets for damage calculation.
_Avoid_: target Pokémon, move target in Speed Benchmark

**Single-Target Mode**:
The **Target Mode** where the **Selected Move** is calculated as hitting one target.
_Avoid_: single battle

**Multi-Target Mode**:
The **Target Mode** where the **Selected Move** is calculated as hitting multiple targets.
_Avoid_: spread as canonical term

### Stats and speed

**Base Stats**:
A Pokémon species' innate stat values before level, IVs, nature, and **Stat Points** are applied.
_Avoid_: SP, investment, spread

**Nature**:
A **Set** attribute that changes stat calculation.
_Avoid_: modifier

**Nature Shortcut**:
A legacy or compact prompt token such as `+nature` or `-nature` whose exact stat meaning depends on tool and role.
_Avoid_: preferred input, explicit nature

**Speed Nature Bucket**:
The **Speed Benchmark** nature model normalized to `+speed`, `neutral`, or `-speed`.
_Avoid_: exact nature when only Speed order matters

**Stat Points**:
The Pokémon Champions allocation values assigned across HP, Atk, Def, SpA, SpD, and Spe for an individual set.
_Avoid_: base stats, EVs, IVs

**SP**:
The accepted short label for **Stat Points** in UI copy and prompt tokens.
_Avoid_: using SP to mean species stats

**Base Speed**:
A Pokémon species' innate Speed value before set-level allocations or battle modifiers are applied.
_Avoid_: Speed SP, effective Speed, Speed when ambiguous

**Speed SP**:
The Speed component of a set's **Stat Points**, especially when searching Speed Benchmark thresholds.
_Avoid_: base Speed, effective Speed

**Effective Speed**:
The final Speed value used to determine move order after Base Speed, level, IV, Speed SP, nature, item, ability, status, stages, Tailwind, and field conditions are applied.
_Avoid_: base Speed, Speed SP, raw Speed

### Legality and meta

**Recognized Value**:
A name or id the workspace can resolve from its local data, regardless of whether it is allowed in the active workflow.
_Avoid_: legal value

**Regulation**:
The active Pokémon Champions ruleset that defines which Pokémon are legal in the workspace.
_Avoid_: meta, format, item legality

**Legal Species**:
A **Species** allowed by the active **Regulation**.
_Avoid_: recognized species, meta profile

**Legal Move**:
A recognized move that is valid for a specific **Species** through that Species' **Learnset** or accepted import context.
_Avoid_: recognized move, common move

**Legal Item Pool**:
The Pokémon Champions held-item list accepted by the workspace, separate from **Regulation** unless future source data makes item legality regulation-specific.
_Avoid_: regulation, meta items

**Meta**:
The current competitive usage context represented by generated **Meta Profiles**.
_Avoid_: regulation, all legal Pokémon

**Meta Profile**:
A current-meta data record for one Pokémon identity, including usage rank and default or common item, ability, and move assumptions.
_Avoid_: threat, benchmark, set

**Usage Rank**:
The ordering of a **Meta Profile** within the current **Meta**, where lower rank means more common or more important for default ordering.
_Avoid_: danger score, matchup score

**Usage Percent**:
Optional metadata describing raw or normalized usage share for a **Meta Profile** when available.
_Avoid_: primary ordering concept

**Meta Benchmark**:
A generated comparison target derived from a **Meta Profile** for a specific tool.
_Avoid_: meta profile, threat when danger is context-dependent

### Assumptions, suggestions, and issues

**Explicit Value**:
A value the user directly provided through a prompt, editor, import, or accepted action.
_Avoid_: default, assumption

**Assumed Value**:
A value the workspace uses in a calculation or benchmark because the user did not provide an explicit value.
_Avoid_: suggestion, default when source matters

**Assumption Source**:
The source used to choose an **Assumed Value**, such as a **Referenced Set**, **Meta Profile**, **Benchmark Baseline**, **Species** data, or **Bulk Profile**.
_Avoid_: explicit value

**Assumption Tag**:
Visible UI copy that identifies an **Assumed Value** used by the workspace.
_Avoid_: suggestion, hidden default

**Suggestion**:
An optional action or value offered by the workspace that is not applied until the user accepts it.
_Avoid_: assumed value, assumption

**Prompt Issue**:
User-facing feedback that the current **Calc Prompt** or **Speed Prompt** cannot be fully applied as written.
_Avoid_: assumption tag

**Blocking Issue**:
A **Prompt Issue** that prevents a calculation or benchmark from updating.
_Avoid_: warning

**Non-Blocking Issue**:
A **Prompt Issue** that warns about ignored, unsupported, or partially applied input while preserving valid parts.
_Avoid_: fatal error

### Modifiers and conditions

**Modifier**:
A battle or planning condition that changes a damage result, **Effective Speed**, or move-order outcome without changing the Pokémon species itself.
_Avoid_: set attribute, species data

**Side Modifier**:
A **Modifier** that applies to one role: **Attacker**, **Defender**, **Subject**, or **Comparator**.
_Avoid_: global effect

**Global Modifier**:
A **Modifier** that applies to the shared battle or planning context, such as weather, terrain, Trick Room, or Gravity where supported.
_Avoid_: side effect

**Field Condition**:
A battle-wide condition such as weather, terrain, Trick Room, or Gravity represented as a **Global Modifier**.
_Avoid_: side modifier, Tailwind

**Activation Modifier**:
A **Modifier** that explicitly turns on a conditional effect, such as Unburden being active.
_Avoid_: ability, assumed activation

**Status Condition**:
A battle condition on a Pokémon that can affect damage calculation or move order.
_Avoid_: set attribute

**Speed-Relevant Status**:
A **Status Condition** that affects **Effective Speed**, currently paralysis in the **Speed Benchmark**.
_Avoid_: non-speed status in Speed Benchmark

**Current HP**:
A Pokémon's remaining HP percentage used when evaluating damage and **KO Chance**.
_Avoid_: bulk profile, max HP stat

**Critical Hit**:
A **Damage Calculator** **Modifier** that calculates the **Selected Move** as a critical hit.
_Avoid_: set attribute

**Ability Selection**:
Choosing an ability as a **Set** attribute or **Explicit Value**.
_Avoid_: ability activation

**Ability Activation**:
The condition that makes a selected ability's effect apply to a calculation or benchmark.
_Avoid_: ability selection, assumed activation

### Damage results

**Damage Result**:
One calculated damage outcome for a specific **Attacker**, **Selected Move**, **Defender**, and **Bulk Profile**.
_Avoid_: showdown text, calc row

**Damage Rolls**:
The individual possible damage values that make up a **Damage Result**.
_Avoid_: damage result when referring to individual roll values

**Damage Range**:
The minimum-to-maximum damage output summarized from **Damage Rolls** for a **Damage Result**.
_Avoid_: single roll, KO chance

**KO Chance**:
The probability or qualitative outcome describing whether the **Selected Move** knocks out the **Defender** for a **Damage Result**.
_Avoid_: damage range

**Bulk Profile**:
A defensive assumption used to produce a **Damage Result**.
_Avoid_: archetype, spread when referring to the named output

**Min Bulk**:
The least durable standard **Bulk Profile** shown by the **Damage Calculator**.
_Avoid_: glass archetype in user-facing language

**Mid Bulk**:
The middle standard **Bulk Profile** shown by the **Damage Calculator**.
_Avoid_: average spread when not precise

**Max Bulk**:
The most durable standard **Bulk Profile** shown by the **Damage Calculator**.
_Avoid_: tank archetype in user-facing language

**Exact Bulk**:
A **Bulk Profile** derived from an explicit **Defender** **Set** rather than a standard Min/Mid/Max assumption.
_Avoid_: assumed bulk, standard bulk profile

### Speed ladder

**Effective Speed Order**:
The numerical ordering of **Effective Speed** values on the **Speed Ladder**.
_Avoid_: move order under Trick Room

**Move Order**:
The battle outcome describing whether the **Subject** moves before, ties with, or moves after a comparison target.
_Avoid_: speed order when Trick Room may apply

**Moves First**:
The **Move Order** outcome where the **Subject** acts before the comparison target.
_Avoid_: outspeeds under Trick Room ambiguity

**Speed Tie**:
The **Move Order** outcome where the **Subject** and comparison target have equal **Effective Speed**.
_Avoid_: tie when not speed-related

**Moves After**:
The **Move Order** outcome where the **Subject** acts after the comparison target.
_Avoid_: underspeeds under Trick Room ambiguity

**Speed Threshold**:
The minimum or maximum **Speed SP** needed for the **Subject** to reach a desired **Move Order** against the **Focused Tier** or **Comparator** under current modifiers.
_Avoid_: suggestion, modifier

**Move-First Threshold**:
The **Speed Threshold** for the **Subject** to **Move First**.
_Avoid_: outspeed number

**Tie Threshold**:
The **Speed Threshold** for the **Subject** to reach a **Speed Tie**.
_Avoid_: tie suggestion

**Speed Ladder**:
The ordered set of Speed Benchmark comparison tiers arranged by **Effective Speed**.
_Avoid_: meta ladder, wheel

**Tier**:
One position on the **Speed Ladder**, containing one or more **Meta Benchmarks** with the same **Effective Speed**.
_Avoid_: row, card, threat group

**Tier Members**:
All **Meta Benchmarks** contained in a **Tier**.
_Avoid_: +N count, expanded rows

**Tier Representative**:
The **Meta Benchmark** shown as the primary identity for a **Tier**, chosen by lowest **Usage Rank** unless another rule is explicitly stated.
_Avoid_: only tier member, selected comparator

**Focused Tier**:
The **Tier** currently emphasized by the **Speed Benchmark** as the most relevant comparison.
_Avoid_: selected row, active wheel item

**Auto-Focus**:
The **Speed Benchmark** behavior that chooses the **Focused Tier** when no **Comparator** is present.
_Avoid_: comparator creation, selected Pokémon

**Pinned Comparator**:
A **Comparator** shown on the **Speed Ladder** when it is not represented by an existing generated **Tier** position.
_Avoid_: custom tier, manual benchmark

**Benchmark Baseline**:
The standard **Assumed Values** used to generate comparable **Meta Benchmarks** for a **Workspace Tool**.
_Avoid_: user set, hidden default

**Last Valid Benchmark State**:
The most recent **Speed Benchmark** state that could be applied without **Blocking Issues**.
_Avoid_: current draft prompt, parser cache

## Relationships

- The **Unburden VGC Workspace** contains exactly two current **Workspace Tools**: the **Damage Calculator** and the **Speed Benchmark**.
- The **Damage Calculator** and **Speed Benchmark** share Pokémon, set, regulation, meta, and modifier language.
- Future `/meta` and `/teams` ideas are outside this context until actively designed or implemented.
- The **Command Bar** accepts either a **Calc Prompt** or a **Speed Prompt**, depending on the active tool.
- The **Command Bar** is the primary entry point for **Prompt-First** workflows in each **Workspace Tool**.
- **Prompt-First** does not mean prompt-only; editors, controls, and **Suggestions** may support prompt workflows.
- **Canonicalization** turns accepted **Aliases** and structured state into a **Canonical Prompt**.
- A **Prompt Token** is prompt-facing grammar, not arbitrary parser internals.
- A valid **Calc Prompt** has exactly one **Attacker**, one **Defender**, and one **Selected Move**.
- A **Calc Prompt** with **Attacker** and **Defender** but no **Selected Move** has a **Blocking Issue** and cannot produce **Damage Results**.
- **Attacker** and **Defender** only need to be **Legal Species**; they do not need **Meta Profiles**.
- A non-empty valid **Speed Prompt** has one **Subject** and may have zero or one explicit **Comparator**.
- A blank **Speed Prompt** is an empty state, not a **Blocking Issue**.
- A Subject-only **Speed Prompt** is valid and uses **Auto-Focus** to choose a **Focused Tier**.
- A **Subject** only needs to be a **Legal Species**; it does not need a **Meta Profile**.
- A **Comparator** only needs to be a **Legal Species**; it does not need a **Meta Profile**.
- A **Species** can exist without a **Set**; a **Set** always belongs to exactly one **Species**.
- **Species-Only Input** may be completed with **Assumed Values**, but it is not an **Imported Set** or **Shared Set**.
- A **Set Snapshot** copies a **Set** so editing in one tool, **Share URL**, or handoff does not silently mutate another tool's source.
- A **Share URL** restores tool-specific prompt/state and embedded **Set Snapshots**, not the sender's whole local library.
- **Set Import** creates **Imported Sets**; a **Share URL** can restore **Shared Sets**.
- **Set Export** creates portable text and is distinct from a **Share URL**.
- A **Draft Set** may be created from a **Set Snapshot**, but prompt text itself is not a **Draft Set**.
- A **Set Reference** resolves to a **Referenced Set**; explicit prompt values override values from the **Referenced Set** for that calculation.
- **Set Reference** resolution by nickname is preferred; resolution by **Species** should only succeed when exactly one currently accessible **Set** matches that **Species**.
- Ambiguous **Set References** should produce a **Prompt Issue** instead of silently choosing between multiple matching **Sets**.
- A **Learnset** belongs to a **Species**; **Common Moves** belong to a **Meta Profile**.
- A **Move Pool** may be built from a **Set**, **Learnset**, or **Common Moves**, but a **Selected Move** is exactly one move.
- **Target Mode** is a **Move Parameter** for the **Damage Calculator** and changes how the **Selected Move** is calculated.
- **Move Parameters** belong to the **Selected Move** and are used for move-specific behavior such as multi-hit counts or Last Respects stacks.
- **Base Stats** belong to a **Species**; **Stat Points** belong to a **Set**.
- **Speed SP** is one component of **Stat Points**, not the same thing as **Base Speed** or **Effective Speed**.
- **Effective Speed** may be shortened to "Speed" in compact UI when shown inside the **Speed Benchmark** or next to **Base Speed**.
- Explicit **Nature** is preferred over **Nature Shortcut** tokens in user-facing controls.
- **Speed Benchmark** canonicalizes Speed-relevant natures into a **Speed Nature Bucket**.
- Workspace user flows must use **Legal Species** as a hard invariant; off-regulation species are outside current scope.
- **Recognized Value** exists to describe data resolution and validation boundaries, not to permit illegal Pokémon in current workflows.
- A **Regulation** defines **Legal Species**; the **Legal Item Pool** defines legal held items.
- **Meta** is usage context, not legality or the full **Regulation** roster.
- A Pokémon can be a **Legal Species** without having a **Meta Profile**.
- A **Meta Profile** is source data; a **Meta Benchmark** is generated from that source data for a tool-specific comparison.
- A **Meta Benchmark** can only be generated from a **Meta Profile** whose Pokémon is a **Legal Species**.
- **Usage Rank** is the canonical ordering concept for **Meta Profiles**; **Usage Percent** is optional metadata and should not be the primary product ordering concept.
- **Meta Profiles** may provide **Assumed Values** for item and ability and may provide **Common Moves** for **Move Pool** ordering.
- The **Damage Calculator** still requires a **Selected Move**; it should not silently choose one from a **Move Pool** or **Meta Profile** unless a future workflow explicitly designs **Move Assumption** behavior.
- **Calc Prompt** **Explicit Values** override **Referenced Set** or **Imported Set** values, which override **Assumed Values** from **Meta Profiles**, **Species** data, **Benchmark Baseline**, or **Bulk Profiles**.
- An **Assumed Value** affects calculations or benchmarks immediately; a **Suggestion** does not affect them until accepted.
- Every calculation-relevant **Assumed Value** should be explainable through an **Assumption Tag** or equivalent visible context.
- **Assumption Tags** should imply or show the **Assumption Source** when that source affects user trust.
- **Assumption Tags** are not **Prompt Issues**; they explain used values rather than invalid input.
- A **Blocking Issue** prevents updating results, while a **Non-Blocking Issue** preserves valid parts and warns the user.
- Item, ability, **Nature**, and **Stat Points** are **Set** attributes, not **Modifiers**, unless the user is explicitly applying an activation or battle condition.
- A selected ability such as Chlorophyll is an **Explicit Value** and an **Ability Selection**; weather such as `~sun` is a **Field Condition** that may provide **Ability Activation**.
- **Ability Selection** should not silently create **Global Modifiers**.
- Preferred **Ability Activation** flow is suggested activation: the workspace offers activation **Suggestions**, and the user must accept them before they affect results.
- Tailwind is a **Side Modifier**, not a **Field Condition**, and does not use `~` in prompts.
- A **Status Condition** is a **Side Modifier**.
- **Speed Benchmark** supports only **Speed-Relevant Status**; non-speed statuses are outside its current scope.
- **Current HP** is a **Side Modifier**.
- **Current HP** is separate from **Bulk Profile**: **Bulk Profile** determines max HP and defensive stats, while **Current HP** changes remaining-health outcomes such as **KO Chance**.
- **Critical Hit** applies to the **Selected Move** calculation and may be colloquially called "crit".
- A valid **Calc Prompt** with unknown defender bulk usually produces one **Damage Result** per standard **Bulk Profile**: **Min Bulk**, **Mid Bulk**, and **Max Bulk**.
- When the **Defender** comes from an explicit **Set** with **Stat Points** and **Nature**, **Exact Bulk** replaces standard **Bulk Profiles** by default.
- Explicit **Attacker** **Set** values should beat **Meta Profile** assumptions and generic offensive defaults.
- A **Damage Result** contains **Damage Rolls**, a summarized **Damage Range**, and **KO Chance** language.
- **Damage Range** is percentage-first in summary UI; exact HP **Damage Rolls** may be available in expandable result details.
- Trick Room changes **Move Order**, not **Effective Speed Order**; the **Speed Ladder** remains numerically ordered by **Effective Speed**.
- Under Trick Room, a **Move-First Threshold** may be a maximum allowed **Speed SP** rather than a minimum required **Speed SP**.
- A **Speed Threshold** is an answer produced by the **Speed Benchmark**; a **Suggestion** is an optional action offered to the user.
- The **Speed Ladder** contains **Tiers**, and each **Tier** contains one or more **Meta Benchmarks** with the same **Effective Speed**.
- **Tier Members** are all **Meta Benchmarks** in a **Tier**; the **Tier Representative** is one of them.
- A **Tier Representative** is deterministic and does not erase other **Meta Benchmarks** in the **Tier**.
- The **Focused Tier** is a presentation focus on the **Speed Ladder**, not a separate benchmark.
- **Auto-Focus** chooses a **Focused Tier** using **Move Order** semantics and does not create a **Comparator**.
- A **Pinned Comparator** may appear alongside generated **Tiers**, but it does not change generated **Tier** grouping.
- A **Benchmark Baseline** must be visible or explainable because changing it changes generated **Meta Benchmarks**.
- The **Speed Benchmark** generated-meta **Benchmark Baseline** assumes max **Speed SP** and a plus **Speed Nature Bucket** for **Effective Speed** comparisons.
- Shared **Benchmark Baseline** assumptions should be shown once as ladder-level context; per-benchmark **Assumption Tags** should be reserved for values that differ from the baseline.
- While a **Speed Prompt** is partial or invalid, the **Speed Ladder** and result summary should continue showing the **Last Valid Benchmark State**.
- A **Mega Form** is resolved from compatible **Species** plus **Required Item**, or from an explicit mega identity when supported.
- A **Set** may name a base **Species** while its **Resolved Form** is a **Mega Form** because of a **Required Item**.
- If a prompt explicitly names a **Mega Form**, any **Workspace Tool** may use that **Resolved Form** even when the **Required Item** is absent, but the missing **Required Item** should be visible as an **Assumed Value** through an **Assumption Tag**.
- An incompatible **Required Item** for an explicit **Mega Form** should produce a **Prompt Issue**.
- A **Form Switch** should preserve the user's intent while moving between compatible base and mega **Forms**.
- A **Form Switch** must keep **Set** attributes and **Resolved Form** consistent, especially when a **Required Item** is involved.

## Example dialogue

> **Dev:** "If a user types `politoed !muddy-water x incineroar`, do we show a Speed-style benchmark?"
> **Domain expert:** "No. That is a **Calc Prompt** for the **Damage Calculator**. It has an **Attacker**, **Selected Move**, and **Defender**, so it produces **Damage Results**. If Incineroar bulk is unknown, show **Min Bulk**, **Mid Bulk**, and **Max Bulk**; if Incineroar comes from an explicit **Set**, show **Exact Bulk** instead."
>
> **Dev:** "If the user types `basculegion` in Speed Benchmark, is that incomplete because there is no comparator?"
> **Domain expert:** "No. A Subject-only **Speed Prompt** is valid. The **Speed Benchmark** uses **Auto-Focus** to choose a **Focused Tier** from the **Speed Ladder**. Any generated **Meta Benchmarks** use the max-Speed **Benchmark Baseline**, while accepted activation changes remain **Suggestions** until the user applies them."
>
> **Dev:** "Can an off-regulation Pokémon appear if the data recognizes it?"
> **Domain expert:** "No. Current workflows use **Legal Species** as a hard invariant. A **Recognized Value** is not automatically legal."

## Related decisions

- [ADR 0001: One VGC workspace with peer tools](./docs/adr/0001-one-vgc-workspace-with-peer-tools.md)
- [ADR 0002: Legal Species only in current workflows](./docs/adr/0002-legal-species-only-current-workflows.md)
- [ADR 0003: Suggest ability activation instead of silent auto-activation](./docs/adr/0003-suggest-ability-activation-instead-of-silent-auto-activation.md)
- [ADR 0004: Speed Benchmark uses max-Speed meta baseline](./docs/adr/0004-speed-benchmark-uses-max-speed-meta-baseline.md)
- [ADR 0005: Explicit set values beat assumptions](./docs/adr/0005-explicit-set-values-beat-assumptions.md)
- [ADR 0006: Explicit Mega Form can imply Required Item](./docs/adr/0006-explicit-mega-form-can-imply-required-item.md)

## Flagged ambiguities

- "app" can blur whether the **Damage Calculator** and **Speed Benchmark** are separate products or peer tools. Resolved: they are peer tools inside one **Unburden VGC Workspace**.
- "command" can blur domain text with implementation command objects. Resolved: user-entered text is a **Calc Prompt** or **Speed Prompt**; the shared UI is the **Command Bar**.
- "side", "left side", and "right side" can blur tool-specific roles. Resolved: use **Attacker**/**Defender** in the **Damage Calculator** and **Subject**/**Comparator** in the **Speed Benchmark**.
- "stats" can mean species **Base Stats**, allocated **Stat Points**, or final battle stats. Resolved: keep **Base Stats** and **Stat Points** separate; use **SP** only as shorthand for **Stat Points**.
- "Speed" can mean **Base Speed**, **Speed SP**, or **Effective Speed**. Resolved: use **Effective Speed** for the final move-order value, but allow compact UI label "Speed" when context is clear.
- "recognized" can be confused with "legal". Resolved: **Recognized Value** means resolvable from local data; legal concepts depend on **Regulation**, **Legal Item Pool**, or **Learnset**.
- Off-regulation Pokémon and switching between multiple regulations are future concerns, not current workspace behavior.
- "meta" can be confused with legality. Resolved: **Regulation** defines **Legal Species**, while **Meta Profiles** describe usage/default assumptions for common Pokémon.
- "threat" can imply danger even when a meta entry is harmless in context. Resolved: use **Meta Profile** for source data and **Meta Benchmark** for generated comparison targets; reserve "threat" for contextual UI copy.
- Bare "profile" can mean either **Meta Profile** or **Bulk Profile**. Resolved: always qualify the term.
- "suggestion" can be confused with an already-used assumption. Resolved: an **Assumed Value** is applied to a calculation/benchmark; a **Suggestion** is optional until accepted.
- "modifier" can be overused for all configurable values. Resolved: **Modifiers** are battle/planning conditions; item, ability, **Nature**, and **Stat Points** are **Set** attributes unless they represent explicit activation or battle state.
- `+nature` / `-nature` can hide which stat is affected. Resolved: treat these as **Nature Shortcut** tokens and prefer explicit **Nature** in user-facing controls.
- **Ability Activation** implementation has trade-offs. Resolved for now: prefer suggested activation over silent auto-activation.
- "reference" can imply live mutation when share and handoff data is copied. Resolved: use **Set Snapshot** when a **Set** is embedded or copied for non-destructive use.
- "wheel" describes one visual treatment of the **Speed Ladder**, not the domain concept. Resolved: use **Speed Ladder** and reserve "wheel" for UI implementation notes.
- Generated Speed meta nature was ambiguous between neutral and plus nature. Resolved: generated **Meta Benchmarks** use max **Speed SP** and plus **Speed Nature Bucket** for **Effective Speed**.
