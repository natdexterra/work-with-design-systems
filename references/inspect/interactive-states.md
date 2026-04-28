# Module 2 — Interactive states

Checks whether a component set covers the states expected for its archetype. Source script: `scripts/inspect/audit-states.js`.

## Goal

Interactive components without proper states (Hover, Focused, Disabled) push state styling into application code, which violates "states first" from `../build/component-spec.md`. A library that ships only Default + Disabled produces incomplete code.

## How detection works

1. Lowercase the component-set name and strip non-letters
2. Match against the archetype map below; first matching keyword wins
3. Parse each variant name (`Type=Primary, Size=Medium, State=Hover`) into a `{key: Set<value>}` map
4. Find a property whose key matches `state`, `status`, or `condition` (case-insensitive)
5. Compare its values against the expected list for the archetype

## Archetype → expected states

| Archetype keyword in name | Expected states |
|---------------------------|------------------|
| `button` | Default, Hover, Pressed, Focused, Disabled |
| `link` | Default, Hover, Pressed, Focused, Disabled |
| `input` | Default, Hover, Focused, Filled, Disabled, Error, Success |
| `select` | Default, Hover, Focused, Filled, Disabled, Error |
| `textarea` | Default, Hover, Focused, Filled, Disabled, Error |
| `checkbox` | Default, Hover, Focused, Disabled |
| `radio` | Default, Hover, Focused, Disabled |
| `toggle`, `switch` | Default, Hover, Focused, Disabled |
| `tab` | Default, Hover, Active, Focused, Disabled |
| `toast`, `alert` | Info, Warning, Error, Success |
| `badge`, `avatar`, `card`, `modal`, `dialog`, `tooltip` | Default |

If no keyword matches, archetype falls back to `unknown` and the only expected state is `Default`. Score is 100 trivially — if your component is genuinely unknown to the script, the score isn't meaningful for it; do a manual review.

## Output shape

```js
{
  componentName: "Button",
  componentId: "1:23",
  componentType: "button",
  stateProperty: "State",
  allVariantProperties: {
    Type: ["Primary", "Secondary", "Tertiary"],
    Size: ["Small", "Medium", "Large"],
    State: ["Default", "Hover", "Disabled"]
  },
  expectedStates: ["Default", "Hover", "Pressed", "Focused", "Disabled"],
  foundStates: ["Default", "Hover", "Disabled"],
  missingStates: ["Pressed", "Focused"],
  percentage: 60.0
}
```

## Comparison is case-insensitive

`state=hover` and `State=Hover` both match. `Pressed` and `Active` are distinct — if the project canonically uses `Active` for buttons, the audit will report Pressed missing. Override expectations by changing the component-set name to make the archetype clearer, or accept the report and document the convention.

## Common gotchas

- **State property named differently.** Some systems use `Status`, `Mode`, or `Variant=primary-hover`. The script accepts `state`, `status`, `condition`. If your file uses `Mode`, results will say "no state property" and report only Default — rename the property, or split state into a dedicated property to get accurate scoring.
- **State baked into Type.** Patterns like `Type=Primary-Hover, Type=Primary-Pressed` collapse Type and State into one property. The audit will see only Type values and miss the state coverage entirely. Always split state into its own variant property.
- **Loading states.** Not in the default expected list. Add Loading manually in your reading of the report — the script doesn't penalize its absence.
- **Read-only states for inputs.** Some forms have a "Read-only" state distinct from Disabled. Not covered by the default expectations; flag in manual review.

## How this feeds the readiness score

States carry the highest weight (×3) in the readiness formula — see `readiness-scoring.md`. Missing Hover or Disabled drags the score down hard, by design.

## What this module does not check

- Whether the visual treatment is correct in each state (that's an accessibility / contrast question — see Module 3)
- Whether the state transitions animate
- Whether the Focused state has a focus ring (check Module 3 — Focus indicator)

A component can pass Module 2 (all states present) and still fail Module 3 (states aren't accessible).
