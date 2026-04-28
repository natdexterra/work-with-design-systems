# Naming conventions reference

Defines naming rules for variables, components, and variant properties. The goal: a developer reading Figma names should recognize them from the codebase, and vice versa.

## Variable naming

| Rule | Example | Why |
|------|---------|-----|
| Use `/` as group separator | `color/bg/primary` | Figma standard, creates folder structure in Variables panel |
| Lowercase with hyphens for values | `color/blue-500` | Matches CSS and token conventions |
| No dots in variable names | `color/bg/primary` NOT `color.bg.primary` | Dots conflict with Figma's internal notation |
| Prefix collections clearly | Collection: `Primitives`, `Semantic`, `Components` | Immediate identification of tier |

## Component naming

| Context | Convention | Example |
|---------|-----------|---------|
| Public component | PascalCase, no prefix | `Button`, `InputField`, `Card` |
| Private/base component | Prefix with `.` or `_` | `.ButtonBase`, `_InputWrapper` |
| Component Set | Same as public component | `Button` (the set), contains all variants |
| Utility component | PascalCase with context | `FormFieldWrapper`, `StackLayout` |

## Variant property naming

Figma variant properties must map predictably to code props. Follow this mapping:

### Figma → React

| Figma property | Figma values | React prop | React values |
|---------------|-------------|------------|-------------|
| Type | Primary, Secondary, Outline, Ghost | `variant` | `"primary"`, `"secondary"`, `"outline"`, `"ghost"` |
| Size | Small, Medium, Large | `size` | `"sm"`, `"md"`, `"lg"` |
| State | Default, Hover, Active, Focused, Disabled | (interactive state) | CSS/class-based |
| Has Icon | True, False | `icon` prop | presence/absence |
| Icon Position | Leading, Trailing | `iconPosition` | `"left"`, `"right"` |
| Dismissible | True, False | `dismissible` | boolean |

### Figma → Vue

| Figma property | Vue prop | Vue values |
|---------------|---------|------------|
| Type | `variant` | `"primary"`, `"secondary"` |
| Size | `size` | `"sm"`, `"md"`, `"lg"` |
| State | (computed state) | class-based |

### Figma → Tailwind

| Figma property | Tailwind pattern |
|---------------|-----------------|
| Type=Primary | `bg-primary text-primary-foreground` |
| Size=Small | `h-8 px-3 text-sm` |
| Size=Medium | `h-10 px-4 text-base` |
| Size=Large | `h-12 px-6 text-lg` |

### Figma → CSS Variables

| Figma variable | CSS variable |
|---------------|-------------|
| `color/bg/primary` | `--color-bg-primary` |
| `color/text/primary` | `--color-text-primary` |
| `space/md` | `--space-md` |
| `radius/button` | `--radius-button` |

Conversion rule: replace `/` with `-`, prepend `--`.

## Layer naming inside components

| Layer type | Convention | Example |
|-----------|-----------|---------|
| Container/wrapper | PascalCase descriptive | `ButtonContainer`, `InputWrapper` |
| Text layer | Content description | `Label`, `HelperText`, `Placeholder`, `Title` |
| Icon slot | Role-based | `LeadingIcon`, `TrailingIcon`, `StatusIcon`, `CloseIcon` |
| Decorative | Purpose | `FocusRing`, `Divider`, `Overlay` |
| State indicator | State name | `HoverOverlay`, `ActiveHighlight` |

Avoid: `Frame 1`, `Group 47`, `Rectangle 3`. Every layer must have a meaningful name.

## Page naming

| Page | Name |
|------|------|
| Cover page | `Cover` |
| Usage guide | `Getting Started` |
| Token documentation | `Foundations` |
| Component library | `Components` |
| Layout patterns | `Patterns` |
| Utility elements | `Utilities` |
| Deprecated items | `_Deprecated` (underscore prefix) |

## File naming (when creating new files)

Pattern: `[Product] Design System v[version]`
Examples: `Acme Design System v1.0`, `SaaS Kit DS v2.1`

## Mode naming

| Mode | Figma name | CSS equivalent |
|------|-----------|---------------|
| Light theme | `Light` | `[data-theme="light"]` or `:root` |
| Dark theme | `Dark` | `[data-theme="dark"]` |
| High contrast | `High Contrast` | `@media (prefers-contrast: more)` |
| Brand A | `Brand A` | `[data-brand="a"]` |
| Brand B | `Brand B` | `[data-brand="b"]` |

## Slot naming

Named slots use PascalCase. Match these names to the code component's slot/children prop names where possible.

| Slot name | Position |
|-----------|----------|
| `Leading` | Left-side element (icon, avatar, image) |
| `Trailing` | Right-side element (icon, action button) |
| `Header` | Top section (titles, close buttons) |
| `Body` | Main content area |
| `Footer` | Bottom section (actions, metadata) |
| `Actions` | Button group, typically in modals/cards |

For unusual or domain-specific slot positions, follow the same PascalCase rule and pick a single noun (e.g., `Sidebar`, `Toolbar`). See `slots-guide.md` for usage rules.

## Pattern frame naming

Pattern frames on the Cover page or a dedicated Patterns page use:

```
P{section}.{number} {Name}
```

Parallel to the component numbering (`C1.0 Button`). Examples:

- `P1.0 Form layout`
- `P1.1 Form layout (compact)`
- `P2.0 Three-column page`
- `P3.0 Card grid`
- `P4.0 Modal with actions`

See `patterns-guide.md` for the full structure of a pattern frame.

## Anti-patterns to avoid

- `btn` instead of `Button` — don't abbreviate component names
- `color1`, `color2` — meaningless names
- `new-button`, `button-v2` — versioning in component names (use the component description field instead)
- Mixing casing: `primaryButton` alongside `SecondaryButton`
- Nesting groups deeper than 3 levels in variable names: `color/bg/surface/card/inner` (too deep — flatten)
- Slot names like `slot-1`, `Container` — slot names must communicate position or role
