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
| Spacing | `space/{size}` | `space/xs` (4), `space/sm` (8), `space/md` (16), `space/lg` (24), `space/xl` (32), `space/2xl` (48), `space/3xl` (64) |
| Radius | `radius/{purpose}` | `radius/component` (6), `radius/card` (12), `radius/input` (8), `radius/button` (8), `radius/pill` (9999) |
| Shadow | `shadow/{size}` | `shadow/sm`, `shadow/md`, `shadow/lg` |

Semantic tokens MUST have at least two modes: `Light` and `Dark`.

Each Semantic token aliases a Primitive. Example:
- `color/bg/primary` → Light: `color/white`, Dark: `color/gray-900`
- `color/text/primary` → Light: `color/gray-900`, Dark: `color/gray-50`
- `color/interactive/primary` → Light: `color/blue-600`, Dark: `color/blue-400`

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
| Opacity | `["OPACITY"]` |

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
