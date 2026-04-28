# Module 3 — Accessibility

Runs WCAG 2.1 AA checks on a component set's internals. Source script: `scripts/inspect/audit-accessibility.js`.

## Goal

Catch accessibility regressions at the design-system level so they don't replicate across every product surface. The four most impactful, automatable checks ship in this module; full WCAG conformance still needs manual review.

## Checks performed

### 1. Color contrast (WCAG 1.4.3)

For every `TEXT` node in every variant, the script:

1. Reads the first solid fill on the text node
2. Walks ancestors up to the variant root, taking the first solid fill it finds as the background
3. Computes relative luminance for both colors using the WCAG formula
4. Computes `(L_lighter + 0.05) / (L_darker + 0.05)` as the ratio
5. Compares against the threshold for the text size:
   - `4.5:1` for normal text
   - `3:1` for "large text" — fontSize ≥ 24px, OR fontSize ≥ 18.66px AND bold

"Bold" is detected via `fontName.style` substring match against `bold`, `black`, or `heavy`. (Figma TEXT nodes don't expose `fontWeight`; only `fontName.style`.)

Limitations:
- Only checks the *first* fill (overlays, gradients, transparency stacks aren't fully resolved)
- Background detection stops at the first solid-fill ancestor — if backgrounds are layered (gradient + overlay + content), the result reflects the closest solid only
- Doesn't fold in opacity multiplication

### 2. Touch target (WCAG 2.5.5)

Runs only when the component-set name contains an interactive keyword (`button`, `input`, `select`, `checkbox`, `radio`, `toggle`, `switch`, `link`, `tab`).

Measures the *Default* variant's outer `width × height`:

- The script finds the Default variant by parsing variant names and looking for `State=Default` (or `Status=Default`)
- If no variant matches, falls back to `cs.children[0]` (so the check still runs on incomplete files)
- Pass: width ≥ 44 AND height ≥ 44

Why Default specifically: Hover/Pressed variants sometimes inflate (shadow expansion, halo), inflating dimensions and hiding undersized touch targets.

### 3. Font size minimum

For every `TEXT` node across all variants:

- ≥ 12px → pass
- ≥ 10px and < 12px → warning
- < 10px → error

Deduplicated by node name across variants — a shared `Label` layer counts once even if 30 variants use it.

### 4. Focus indicator (WCAG 2.4.7)

Runs only for interactive components (same keyword check as Touch target).

Pass condition: at least one variant name contains the substring `focus` (case-insensitive). This is a structural check, not a visual one — it confirms the variant exists, not that the indicator is visible enough.

Manually verify the focus ring in the rendered Focused variant:
- 2px outline (or thicker) is recommended
- Color contrast vs the surrounding background ≥ 3:1
- Offset from the component edge so the ring isn't clipped

## Output shape

```js
{
  componentName: "Button",
  componentId: "1:23",
  checks: [
    { name: "Color contrast (WCAG 1.4.3)", passed: true,  details: "All text nodes pass", issues: [] },
    { name: "Touch target (WCAG 2.5.5)", passed: true,  details: "44×44px (passes 44×44 minimum)", width: 44, height: 44, measuredVariant: "Type=Primary, Size=Medium, State=Default" },
    { name: "Font size minimum",           passed: true,  details: "All text nodes are 12px or larger", issues: [] },
    { name: "Focus indicator (WCAG 2.4.7)", passed: false, details: "No Focused state variant found" }
  ],
  passed: 3, total: 4, percentage: 75.0
}
```

For non-interactive components (Card, Badge, Avatar), Touch target and Focus indicator checks don't run — `total` reflects only the checks that applied.

## What this module doesn't catch

- ARIA roles, names, labels — Figma doesn't carry semantic markup; that's a code-side concern
- Keyboard interaction — ditto
- Reading order — not auditable from a flat layer tree
- Reduced motion preferences — not encoded in design
- Color-blindness simulation — separate manual pass
- Sufficient empty space around touch targets (related to WCAG 2.5.8)

These need manual review or code-level testing. The audit reports what it can automate.

## Tuning thresholds

The thresholds are WCAG defaults. A few projects need tighter ones:

- WCAG AAA contrast: 7:1 normal text, 4.5:1 large text — change `requiredRatio` literals in the script if your brand commits to AAA
- Larger touch targets (48×48 for global accessibility guidelines like ISO 9241-411) — change `>= 44` literals

If you change thresholds, document the override in the file's audit report so consumers know the bar.
