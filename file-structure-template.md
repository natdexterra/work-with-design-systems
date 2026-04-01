# File structure template

Standard page organization for design system Figma files. Used in Phase 3.

## Page order and content

### 1. Cover
```
Frame: "Cover" (1440 × 900)
├── Auto Layout: vertical, center-aligned, gap=space/lg
├── Background: color/bg/primary
├── Logo or product icon (optional)
├── Title: "[Product] Design System" — Display text style
├── Version: "v1.0" — Body text style, color/text/secondary
├── Last Updated: "April 2026" — Caption text style
└── Status Badge: "In Progress" | "Stable" | "Deprecated"
```

### 2. Getting Started
```
Frame: "Getting Started" (1440 × auto, hug height)
├── Auto Layout: vertical, gap=space/xl, padding=space/2xl
├── Section: "How to use this library"
│   ├── Step 1: Enable the library in your Figma file
│   ├── Step 2: Use components from the Assets panel
│   └── Step 3: Override properties as needed
├── Section: "Token usage"
│   └── Brief explanation of Primitive → Semantic → Component tiers
├── Section: "Contributing"
│   └── How to propose changes (link to process doc if available)
└── Section: "Contact"
    └── Team name, Slack channel, or email
```

### 3. Foundations
```
Frame: "Foundations" (1440 × auto)
├── Auto Layout: vertical, gap=space/2xl, padding=space/2xl

├── Section: "Colors"
│   ├── Subsection: "Primary" — swatches for primary scale
│   ├── Subsection: "Neutral" — swatches for gray scale
│   ├── Subsection: "Semantic" — bg, text, border, interactive samples
│   └── Subsection: "Status" — success, warning, error, info
│   Each swatch: 80×80 rounded rect + hex label + variable name

├── Section: "Typography"
│   ├── Each Text Style rendered with sample text:
│   │   "Display — The quick brown fox (font/size/weight)"
│   │   "Heading 1 — The quick brown fox"
│   │   ...
│   └── Table: Style name | Font | Size | Weight | Line height

├── Section: "Spacing"
│   └── Visual scale: horizontal rectangles of increasing width
│       Each labeled: "xs (4px)", "sm (8px)", "md (16px)", ...

├── Section: "Border Radius"
│   └── Row of squares with increasing radius
│       Each labeled: "sm (4px)", "md (8px)", "lg (12px)", "full"

└── Section: "Shadows" (if applicable)
    └── Row of cards with increasing shadow depth
        Each labeled: "sm", "md", "lg", "xl"
```

### 4. Components
```
Frame: "Components" (1440 × auto)
├── Auto Layout: vertical, gap=space/3xl, padding=space/2xl

├── Section per component:
│   ├── Component name — Heading 1
│   ├── Description — Body text
│   ├── Variants showcase — all variant combinations laid out
│   ├── States showcase — Default, Hover, Active, Focused, Disabled side by side
│   ├── Size comparison — Small, Medium, Large side by side
│   └── Usage notes — when to use, when not to use
```

### 5. Patterns (optional)
```
Frame: "Patterns" (1440 × auto)
├── Form layout pattern (label + input + helper text)
├── Card grid pattern (3-column responsive)
├── Navigation pattern (sidebar, topbar)
├── Empty state pattern
└── Loading state pattern
```

### 6. Utilities (optional)
```
Frame: "Utilities" (1440 × auto)
├── Divider (horizontal line component)
├── Spacer (transparent frame for manual spacing)
├── Status dot (small colored circles)
└── Skeleton (loading placeholder shapes)
```

## Swatch rendering script pattern

Use this pattern to render color swatches in the Foundations page:

```js
// For each color in the palette:
const swatch = figma.createFrame();
swatch.name = variableName;
swatch.resize(80, 80);
swatch.cornerRadius = 8; // bind to radius/sm variable
// Bind fill to the variable
// Add text label below with variable name and hex value
```

Bind all swatch fills to the actual Figma Variable, not hardcoded hex. This way, switching modes (Light/Dark) updates the documentation automatically.
