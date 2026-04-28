# Module 6 — Component descriptions

The only audit module without a script. Generates structured descriptions for components that lack them, and surfaces missing component-property opportunities while reading.

## Goal

Public components in a published design system must carry descriptions that downstream Figma MCP returns alongside the design context. Components without descriptions force consumers to guess. Module 6 produces drafts for missing descriptions and proposes property changes the structure suggests.

## Inputs

For each component set:

- Variant property table from Module 2
- Naming quality report from Module 5 (informs slot/region naming)
- Token compliance status from Module 1 (informs CODE GENERATION NOTES)
- Visual structure read directly from `get_design_context` and the variant tree

## Output

Two artifacts per component:

1. **A description draft** following `../build/component-description-template.md`
2. **A PROPERTY SUGGESTIONS list** flagging variant/boolean/instance-swap/slot opportunities

## Description template

The same template used in build mode. See `../build/component-description-template.md` for the full structure. In short:

```
## [Component Name]

**PURPOSE:** One sentence — what and when.

**BEHAVIOR:** Interaction, state transitions, keyboard, motion.

**COMPOSITION:** Internal structure, slot list, nested instances.

**USAGE:** When to use vs alternatives, dos/don'ts.

**CODE GENERATION NOTES:** Prop mapping, accessibility attributes, event handlers.
```

For private base components (prefixed `.` or `_`), a single-line note is enough:

```
Internal: shared layout for Button variants. Not for direct use.
```

## How to draft

1. Read the component set's variants, slot structure, and any nested component instances
2. Read its current description (might be partial)
3. Synthesize PURPOSE from the component name and the variant property names
4. Pull BEHAVIOR from the State variant values (Default/Hover/Pressed/Focused/Disabled tell you the interaction model)
5. List COMPOSITION from the layer tree — slots, named regions, nested instances
6. Infer USAGE from common archetype patterns (Button vs Link, Modal vs Dialog) — the user confirms or rewrites
7. CODE GENERATION NOTES — map each variant/boolean/text-property/instance-swap to a code prop name; flag accessibility attrs needed

Drafts are *proposals*. Always show to the user for review before writing back to the component description in build mode.

## PROPERTY SUGGESTIONS

While reading a component, look for structural smells that signal a missing component property. Surface these alongside the description as a separate "PROPERTY SUGGESTIONS" section. The user decides what to act on.

### Smell 1: near-duplicate variants → State property

Two variants whose visuals differ in a small, specific way (saturation +10%, opacity reduced, border thicker) but whose names don't capture the difference signal a missing State property.

Example: a Button set has `Type=Primary` and `Type=PrimaryHover` as separate Type values. Suggest splitting State out.

```
Suggestion: split "PrimaryHover" out of Type. Add State property with Default, Hover, Pressed, Focused, Disabled values.
```

### Smell 2: hidden element across variants → Boolean property

The same element appears in some variants and is hidden (visible: false) in others, but no boolean property controls the visibility.

Example: a Button with a leading icon, present in `Type=Primary, Has Icon=True` style names, but the icon visibility is currently driven by hand in each variant. Promote it to a Boolean.

```
Suggestion: add Boolean property "Icon Left". Bind the leading icon's visibility to this boolean across variants.
```

### Smell 3: one position, multiple swap targets → Instance swap

A specific layer is replaced with a different instance per variant (different icons in `Type=Edit`, `Type=Delete`, `Type=Save`).

```
Suggestion: replace per-variant icon swap with an Instance Swap property "Icon" defaulting to {default icon}. Removes 3 redundant Type values.
```

### Smell 4: arbitrary content varies → Slot

A component contains a region whose contents differ entirely between examples (Card with text body in one, image+text in another, list+button in a third). This is a slot, not a property.

```
Suggestion: convert "Body" region into a named Slot ("Body"). Accepts any component. See ../build/slots-guide.md for slot creation pattern.
```

### Smell 5: TEXT label stamped per variant → TEXT property

Text content varies between variants but the visual treatment is identical.

```
Suggestion: replace per-variant text with a TEXT property "Label". Removes redundancy and lets consumers override at instance level.
```

### Smell 6: explicit color in variant for a single state → Variable binding

A specific state uses a hardcoded color instead of a variable.

This is already an audit-tokens.js error — surface here as a description note: "Hover state uses #2563EB; bind to color/primary/600."

## What PROPERTY SUGGESTIONS does *not* do

- Decide for the user — every suggestion is shown, none are auto-applied
- Estimate effort — suggestions are facts about the structure, not project-management estimates
- Replace property changes that break instance overrides — those need migration, not just a property change

If a suggestion would break existing instances (renaming a variant value, removing a Type variant), warn explicitly. The agent must include "this changes the public API" notes in the suggestion text.

## Output format in the report

Inside each component scorecard:

```markdown
**Description:** {generated draft, or "missing — proposed below"}

**Property suggestions:**
1. Split "PrimaryHover" out of Type. Add State property — see Smell 1
2. Convert Body region to a Slot — see Smell 4
```

## Scoring

Module 6 has no automated score (it's reasoning, not measurement). The readiness score does not consume Module 6 output — it's an additional report appendix. If you want to weight description completeness, use a binary signal: "has description matching the template (yes/no)" reported per component.
