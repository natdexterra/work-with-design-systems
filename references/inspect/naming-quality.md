# Module 5 — Naming quality

Flags layers inside a component set that still carry Figma's auto-generated names. Source script: `scripts/inspect/audit-naming.js`.

## Goal

Layer names show up in `get_design_context`, MCP outputs, and code generation hints. `Frame 12 / Rectangle 4 / Group 17` carries no signal and forces downstream agents to guess. Semantic names (`Container / Avatar / Label`) carry intent.

## What counts as a generic name

Match against this regex (case-sensitive):

```
^(Frame|Group|Rectangle|Ellipse|Vector|Line|Text|Instance|Component|Polygon|Star|Boolean|Union|Subtract|Intersect|Exclude|Slice|Image)\s+\d+$
```

Examples that match: `Frame 12`, `Rectangle 4`, `Vector 1`, `Group 22`, `Ellipse 7`.

Examples that do *not* match: `Container Frame`, `Background Rectangle`, `Avatar`, `Frame 12 (decorative)`, `Frame12` (no space). The pattern requires the literal "{Type} {number}" form Figma generates by default — not partial matches or modified names.

## Method

1. Walk every variant in the component set
2. For each node, take its `name` field
3. Deduplicate across variants — a `Background` layer shared by 30 variants counts once
4. Match each unique name against the regex; collect matches as `genericNames`
5. Score: `(total - generic) / total × 100`

## Output shape

```js
{
  componentName: "Button",
  componentId: "1:23",
  semantic: 8,
  total: 10,
  percentage: 80.0,
  genericNames: [
    { name: "Frame 12", type: "FRAME",  nodeId: "5:67" },
    { name: "Vector 3", type: "VECTOR", nodeId: "5:68" }
  ]
}
```

## Score interpretation

- **100%** — every layer has a meaningful name
- **80–99%** — a handful of overlooked layers; quick cleanup
- **50–79%** — meaningful structure but lots of leftovers; one focused pass needed
- **<50%** — most layers are unnamed; agent output will struggle. Auto-rename in Figma (`AI Rename` if available) is a faster start than manual passes.

## When to auto-rename

The Figma AI rename feature is well-suited to fixing this. If genericNames count > 20% of total, recommend AI rename to the user and re-run the audit. If the user prefers manual, propose names per layer based on:

- Position (Header, Body, Footer, Leading, Trailing)
- Content (Label, Description, Avatar, Icon)
- Function (TriggerButton, Backdrop, Container)

For the most common cases:

| Generic | Likely semantic |
|---------|-----------------|
| `Frame N` (top-level container) | `Container`, `Wrapper`, or component name |
| `Frame N` (icon parent) | `IconWrapper` or icon-name-based |
| `Rectangle N` (background) | `Background`, `BG`, or `Surface` |
| `Vector N` (single icon path) | The icon's name (`ArrowRight`, `Close`) |
| `Text N` | The role of the text (`Label`, `HelperText`, `ErrorMessage`) |
| `Group N` | The grouping intent (`HeaderGroup`, `Actions`) |

## Limitations

- The script doesn't check for *bad* semantic names — `MyContainer123` passes, `xxx`, `test`, single-character names pass. Only the auto-generated default pattern is flagged.
- Names like `Frame 1 1` (Figma sometimes appends extra digits when duplicating frames) are flagged correctly because they still match the regex.
- Doesn't dedupe trivial variant prefixes — if a designer manually named layers `Variant=Primary > Frame 1`, this counts as semantic. Trust the designer; adjust manually if it's clearly junk.

## Why this matters more than it seems

`get_design_context` returns layer names verbatim to consuming agents. A button with `Vector 3 / Vector 4` in its tree generates code with anonymous SVGs. A button with `LeadingIcon / TrailingIcon` generates props with the right names. The fix is cheap; the cost of skipping it accrues every time the design is read.
