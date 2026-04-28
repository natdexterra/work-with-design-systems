# Module 1 — Token compliance

Audits a single component set for variable binding coverage. Source script: `scripts/inspect/audit-tokens.js`.

## Goal

Every visual property in a component should reference a design token, not a raw value. Components that hardcode colors, spacing, or radii break theming, dark mode, multi-brand, and code generation.

## Severity tiers

This module returns issues split into two tiers:

- **errors** — definitely wrong: missing variable bindings on properties that have a token elsewhere in the file
- **warnings** — likely wrong but ambiguous: raw opacity, raw blur radii — could be intentional, deserve human review

The readiness score weights errors much more heavily than warnings. See `readiness-scoring.md` for the formula.

## What counts as an error

Per visited node inside the component set:

| Property | Error condition |
|----------|-----------------|
| `fill` (SOLID, visible) | No `boundVariables.fills[i]` |
| `stroke` (SOLID, visible) | No `boundVariables.strokes[i]` |
| `paddingTop/Bottom/Left/Right`, `itemSpacing` | Value > 0, no binding, AND value is on the common scale `[2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96]` |
| `cornerRadius` | Value > 0, no `cornerRadius` or `topLeftRadius` binding |
| TEXT node | Missing `textStyleId` |

Spacing values *outside* the common scale are not flagged. Per Critical Rule #3, component-specific dimensions (e.g., a 3px nudge, an 18px icon size) are allowed without a token.

## What counts as a warning

| Condition | Why warning, not error |
|-----------|------------------------|
| `fill.opacity < 1` on a fill that *is* bound | Raw opacity layered on a bound color is a deliberate choice in some systems, but usually means the system needs an alpha-aware token |
| `stroke.opacity < 1` on a bound stroke | Same reasoning |
| Visible `LAYER_BLUR` or `BACKGROUND_BLUR` effect with no `effects[i]` binding | Effect tokens are uncommon in many systems; flag for review rather than fail |

## Output shape

```js
{
  componentName: "Button",
  componentId: "1:23",
  errors: [
    {
      component: "Button",
      variant: "Type=Primary, State=Default",
      node: "BG",
      nodeId: "1:24",
      property: "fill",
      value: "#2563EB",
      path: "Button / .ButtonBase / BG",
      issue: "unbound fill"
    }
  ],
  warnings: [
    {
      component: "Button",
      variant: "Type=Primary, State=Hover",
      node: "BG",
      nodeId: "1:42",
      property: "fill.opacity",
      value: "80%",
      path: "Button / .ButtonBase / BG",
      issue: "raw opacity on bound fill"
    }
  ],
  summary: { errorCount: 1, warningCount: 1, totalChecked: 25 }
}
```

## Deduplication

When the same logical layer surfaces the same issue across many variants (a shared `.ButtonBase > BG` referenced by 30 variants), it's collapsed to a single entry. The dedupe key is `node.name + property + value`, so two distinct hex values on the same node remain separate entries.

## How to consume the output

For the report:

- Errors block in the markdown report (rendered as a sortable table by `component, property, value`)
- Warnings block — separate table, same columns
- Roll the per-component error count into the readiness score

For build-mode auto-fix:

- The `errors[]` array is the input to `scripts/build/fixHardcodedToTokens.js`. Auto-fix never consumes warnings — they require human judgment.

## Common false positives

- **Decorative SVG fills inside icons** — typically icons use a single color bound to `--color-icon-default` or rely on `currentColor`. If the icon uses multi-color visuals (logos, illustrations), the script will flag every fill. Document those as exceptions in the component description.
- **Component-specific dimensions on the common scale.** Rare but possible — a 12px height that genuinely shouldn't be a token. Document in the component description as Critical Rule #3 exception; auto-fix will skip nodes whose ancestor description mentions the exception.

## Scope filter expectations

For auto-fix to work cleanly downstream, variables in the file must have explicit scopes (no `ALL_SCOPES`). Run the foundations health check (`validate-design-system.js`) before relying on this module's errors as auto-fix input.
