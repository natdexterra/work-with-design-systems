# Token taxonomy reference

This reference defines the 3-tier variable architecture for the design system. Load this before Phase 2 (Foundations).

## Architecture overview

```
Tier 1: Primitives    →  Tier 2: Semantic       →  Tier 3: Component
(raw values)              (purpose layer)            (specific mapping)
color/blue-500            color/interactive/primary   button/primary/bg
spacing/4                 space/md                    card/padding
radius/8                  radius/component            input/radius
```

Tier 3 is optional. Only create it when the system has 15+ components and component-specific overrides are common.

## Naming rules

All variable names use `/` as separator (Figma convention). No dots, no dashes in group separators.

### Tier 1: Primitives

| Category | Pattern | Examples |
|----------|---------|----------|
| Color | `color/{hue}-{shade}` | `color/blue-50`, `color/blue-500`, `color/blue-900` |
| Gray | `color/gray-{shade}` | `color/gray-50`, `color/gray-100`, `color/gray-900` |
| Spacing | `spacing/{value}` | `spacing/0`, `spacing/1`, `spacing/2`, `spacing/4`, `spacing/8` |
| Radius | `radius/{name}` | `radius/none`, `radius/sm`, `radius/md`, `radius/lg`, `radius/full` |
| Font size | `font-size/{name}` | `font-size/xs`, `font-size/sm`, `font-size/base`, `font-size/lg` |
| Line height | `line-height/{name}` | `line-height/tight`, `line-height/normal`, `line-height/relaxed` |
| Font weight | `font-weight/{name}` | `font-weight/regular`, `font-weight/medium`, `font-weight/bold` |

No modes in Primitives — these are absolute values.

### Tier 2: Semantic

| Category | Pattern | Examples |
|----------|---------|----------|
| Background | `color/bg/{purpose}` | `color/bg/primary`, `color/bg/secondary`, `color/bg/surface`, `color/bg/elevated` |
| Text | `color/text/{purpose}` | `color/text/primary`, `color/text/secondary`, `color/text/disabled`, `color/text/inverse` |
| Border | `color/border/{purpose}` | `color/border/default`, `color/border/strong`, `color/border/focus` |
| Interactive | `color/interactive/{purpose}` | `color/interactive/primary`, `color/interactive/primary-hover`, `color/interactive/danger` |
| Status | `color/status/{type}` | `color/status/success`, `color/status/warning`, `color/status/error`, `color/status/info` |
| Data state | `color/data/{state}` | `color/data/not-observed`, `color/data/provisional` (a fill for absent or provisional data; never a status hue) |
| Spacing | `space/{size}` | `space/xs` (4), `space/sm` (8), `space/md` (16), `space/lg` (24), `space/xl` (32), `space/2xl` (48), `space/3xl` (64) |
| Radius | `radius/{purpose}` | `radius/component` (6), `radius/card` (12), `radius/input` (8), `radius/button` (8), `radius/pill` (9999) |
| Shadow | `shadow/{size}` | `shadow/sm`, `shadow/md`, `shadow/lg` |

Semantic tokens MUST have at least two modes: `Light` and `Dark`.

Each Semantic token aliases a Primitive. Example:
- `color/bg/primary` → Light: `color/white`, Dark: `color/gray-900`
- `color/text/primary` → Light: `color/gray-900`, Dark: `color/gray-50`
- `color/interactive/primary` → Light: `color/blue-600`, Dark: `color/blue-400`

### Alpha tokens (a tint of an existing colour)

A colour variable can alias another colour variable **and** carry its own opacity, without detaching from the alias. That is the token for anything semi-transparent — disabled text, a ghost or hover surface, an overlay, a scrim, a focus ring tint. Before it existed the only way to express a tint was a bound fill with a raw opacity typed on the paint, which is invisible to code export and to every audit.

Two value shapes, both written with `setValueForMode`:

```js
// percent literal
variable.setValueForMode(modeId, { color: { type: "VARIABLE_ALIAS", id: blue500.id }, opacity: 10 });
// percent from a FLOAT variable
variable.setValueForMode(modeId, { color: { type: "VARIABLE_ALIAS", id: blue500.id }, opacity: { type: "VARIABLE_ALIAS", id: opacity10.id } });
```

`opacity` is a **percent, 0–100** — not the 0–1 alpha that `{r,g,b,a}` uses. `resolveForConsumer(node)` returns it as `a = opacity / 100`.

Rules:

- **Alias, never a new literal.** `color/text/disabled` aliases `color/gray-900` at 40%; it does not hold a fourth copy of the grey.
- **Keep a small Opacity group of FLOATs** in Primitives — `opacity/5`, `opacity/10`, `opacity/40`, `opacity/60` — and alias the opacity slot to them once more than one token uses the same percent. Two tokens that must stay in step (a hover tint and its pressed twin) share the FLOAT; a one-off stays a literal percent.
- **Scope the FLOATs `["COLOR_OPACITY"]`** — the picker Figma labels "Color variable opacity". `["OPACITY"]` is the older layer-opacity scope and puts the token in a different picker; a FLOAT meant for colour tints wants the first.
- **Name by role, not by percent.** `color/bg/ghost`, `color/overlay/scrim`, `color/text/disabled` — the percent lives in the value, as with every other token. `color/blue-500-10` is a primitive wearing a semantic hat.
- **Consumers resolve colour first, opacity second.** A reader that tests only `raw.type === "VARIABLE_ALIAS"` or `'r' in raw` gets `null` on this shape and drops the token silently — see `references/edge-cases.md`. The alpha multiplies the aliased colour's own alpha.
- **Contrast.** An alpha token has no contrast ratio of its own: composite it over the background it sits on, then measure. A 10% text token passes nothing.
- **Export.** One CSS value per alpha token: `color-mix(in srgb, var(--color-blue-500) 10%, transparent)`. Relative colour syntax (`rgb(from var(--color-blue-500) r g b / 10%)`) says the same thing with narrower support today.

### Tier 3: Component (optional)

| Category | Pattern | Examples |
|----------|---------|----------|
| Button | `button/{variant}/{property}` | `button/primary/bg`, `button/primary/text`, `button/primary/border` |
| Input | `input/{property}` | `input/bg`, `input/border`, `input/text`, `input/placeholder` |
| Card | `card/{property}` | `card/bg`, `card/border`, `card/padding`, `card/radius` |

Component tokens alias Semantic tokens. They add a redirection layer useful for theming or white-labeling.

## Variable scopes

IMPORTANT: Always set explicit scopes. Never leave ALL_SCOPES — it pollutes every property picker.

| Token type | Scopes |
|-----------|--------|
| Background colors | `["FRAME_FILL", "SHAPE_FILL"]` |
| Text colors | `["TEXT_FILL"]` |
| Border/stroke colors | `["STROKE_COLOR"]` |
| All-purpose colors (rare) | `["FRAME_FILL", "SHAPE_FILL", "STROKE_COLOR", "TEXT_FILL"]` |
| Spacing | `["GAP", "WIDTH_HEIGHT"]` |
| Radius | `["CORNER_RADIUS"]` |
| Font size | `["FONT_SIZE"]` |
| Font weight | `["FONT_WEIGHT"]` |
| Line height | `["LINE_HEIGHT"]` |
| Layer opacity | `["OPACITY"]` |
| Colour-variable opacity (a FLOAT used as an alpha token's opacity) | `["COLOR_OPACITY"]` |

## Multi-brand setup

For multi-brand systems, add a separate collection:

**Collection: Brand**
- Modes: one per brand (e.g., `BrandA`, `BrandB`)
- Contains brand-specific overrides: primary color, accent color, brand font
- Semantic tokens can alias Brand tokens for brand-specific values

## Default spacing scale (4px base)

| Token | Value | Use case |
|-------|-------|----------|
| `space/xs` | 4px | Icon-to-text gap, tight padding |
| `space/sm` | 8px | Inline element gap, input padding |
| `space/md` | 16px | Section padding, card padding, default gap |
| `space/lg` | 24px | Section margins, form group gap |
| `space/xl` | 32px | Page section gap |
| `space/2xl` | 48px | Major section separation |
| `space/3xl` | 64px | Page-level margins |

## Default color scale

Generate 10 shades per hue: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900.

Minimum hues for a v1 system:
- Primary brand hue (e.g., blue, indigo, violet)
- Gray/Neutral scale
- Success: green
- Warning: amber/yellow
- Error/Danger: red
- Info: blue (can share with primary if primary is blue)

**Status colors are mandatory for app UIs, and functional — not brand.** If the brand palette has no suitable hue (especially no red for `error`), add a dedicated status ramp rather than reusing a brand color; tune it to harmonize with the palette but keep `error` unmistakably red. Provide three steps per status — `{type}/50` (bg tint), `{type}/500` (solid), `{type}/700` (text) — and verify each text-on-bg pair at WCAG AA ≥ 4.5:1. Never force a brand color into a status role (a brown "error" reads as wrong and breaks the convention).

**Absence is not a status.** A `not-observed` role is a graphic fill only: never text, never summed as zero, never one of the status hues. Provenance labels (measured, estimated, carried forward) carry no colour at all. Every status must also carry a word, so that removing colour removes nothing; a verdict carried by colour alone fails the colour-blind reader and the printed sheet.

## Responsive type via modes

Font-size and line-height are the exception to "no modes in Primitives." For responsive UIs, put the type scale in a collection with two modes — `Desktop` (default) and `Mobile` — and give every `font-size/*` and `line-height/*` token a value per mode. The two mode values are the `clamp()` endpoints on code export (Mobile = min, Desktop = max). Line-height values are pixels (variables are unitless → interpreted as px; never percent — Critical Rule #4). Preview mobile by setting the frame's mode via `setExplicitVariableModeForCollection(typographyCollection, mobileModeId)` while reusing the same text styles.
