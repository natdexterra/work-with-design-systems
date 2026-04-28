# Component specification reference

Load this before Phase 4 (Components). Defines how to build each component with proper structure, variants, states, and variable bindings.

## Core principles

1. **States first.** Design all states before the "happy path" default. A component without Disabled and Error states is incomplete.
2. **Auto Layout everywhere.** No absolute positioning except for overlays (badges, tooltips) and decorative icons inside frames.
3. **Variables only.** Every fill, stroke, spacing value, and radius must reference a Semantic (or Component) variable. Zero hardcoded values.
4. **Name like code.** Figma variant properties must map to code props. `Type=Primary, Size=Medium, State=Default` → `<Button variant="primary" size="md" />`
5. **Base + Composed.** Private base components (prefixed `.` or `_`) hold shared structure. Public components compose them.

## Component anatomy template

Every component follows this Auto Layout structure:

```
ComponentSet "Button"
├── Type=Primary, Size=Medium, State=Default
│   └── .ButtonBase (instance of private base)
│       ├── [Auto Layout: horizontal, gap=space/sm, padding=space/sm space/md]
│       ├── IconSlot (optional, instance swap property)
│       ├── Label (text, bound to Text Style)
│       └── TrailingIcon (optional)
├── Type=Primary, Size=Medium, State=Hover
│   └── ...
├── Type=Secondary, Size=Medium, State=Default
│   └── ...
└── ...
```

## Standard variant properties

| Property name | Values | Maps to code |
|--------------|--------|-------------|
| Type (or Variant) | Primary, Secondary, Outline, Ghost, Danger, Link | `variant` prop |
| Size | Small, Medium, Large | `size` prop |
| State | Default, Hover, Active, Focused, Disabled, Loading | interactive state |
| Has Icon | True, False | `icon` prop presence |
| Icon Position | Leading, Trailing | `iconPosition` prop |

Use Boolean properties for toggles: `Has Icon`, `Has Description`, `Dismissible`.
Use Instance Swap properties for icon slots.
Use Text properties for editable labels.

## Required states per component type

### Interactive components (Button, Input, Select, Checkbox, Radio)
- Default
- Hover
- Active / Pressed
- Focused (with focus ring: 2px outline, `color/border/focus`, 2px offset)
- Disabled (opacity 0.5 or muted colors via `color/text/disabled`, `color/bg/disabled`)
- Loading (for Button: spinner replaces or accompanies label)

### Data entry (Input, Textarea, Select)
- Empty + Placeholder
- Filled
- Error (border: `color/status/error`, helper text in error color)
- Success (border: `color/status/success`)
- Read-only

### Feedback (Toast, Badge, Alert)
- Info (`color/status/info`)
- Success (`color/status/success`)
- Warning (`color/status/warning`)
- Error (`color/status/error`)

## Core 10 component specs

### 1. Button
- Variants: Primary, Secondary, Outline, Ghost, Danger
- Sizes: Small (h=32), Medium (h=40), Large (h=48)
- States: Default, Hover, Active, Focused, Disabled, Loading
- Auto Layout: horizontal, center-aligned
- Padding: `space/sm` vertical, `space/md` horizontal (adjust per size)
- Border radius: `radius/button`
- Icon support: leading, trailing, icon-only

### 2. Input
- Variants: Default, With Prefix, With Suffix, With Both
- Sizes: Small (h=32), Medium (h=40), Large (h=48)
- States: Empty, Filled, Focused, Error, Success, Disabled, Read-only
- Structure: Container → [Prefix?] + InputArea + [Suffix?]
- Label above (separate component or Boolean property)
- Helper text below (shows error message in Error state)
- Border: 1px `color/border/default`, changes per state

### 3. Select / Dropdown
- Same size and state variants as Input
- Includes chevron icon (trailing)
- Dropdown panel: separate component or shown via Boolean
- Multi-select variant if needed

### 4. Checkbox
- Sizes: Small (16px), Medium (20px), Large (24px)
- States: Unchecked, Checked, Indeterminate, Disabled
- Plus: Hover overlay for each checkable state
- Includes label text (right-aligned)
- Check mark: vector path or icon, colored `color/text/inverse`
- Box: `radius/sm`, border `color/border/default`, fill `color/interactive/primary` when checked

### 5. Radio
- Same size and state variants as Checkbox
- Circle instead of checkmark
- Group component: vertical Auto Layout with `space/sm` gap

### 6. Badge
- Variants: Default, Success, Warning, Error, Info
- Sizes: Small, Medium
- Structure: pill-shaped, text centered
- Radius: `radius/pill`
- Optional: dot variant (no text, just colored circle)

### 7. Avatar
- Sizes: XS (24), SM (32), MD (40), LG (56), XL (80)
- Variants: Image, Initials, Fallback (icon)
- Shape: circle (clip content)
- Status indicator: optional small badge at bottom-right
- Border: optional, 2px `color/border/default`

### 8. Card
- Auto Layout: vertical, padding `space/md`
- Radius: `radius/card`
- Background: `color/bg/elevated`
- Border: 1px `color/border/default`
- Shadow: `shadow/sm`
- Slots: Header, Body, Footer (each optional via Boolean)
- Variants: Default, Outlined (no shadow), Elevated (stronger shadow)

### 9. Modal / Dialog
- Overlay: semi-transparent black
- Container: centered, max-width 480–640px
- Structure: Header (title + close button) → Body (scrollable) → Footer (actions)
- Radius: `radius/card`
- Shadow: `shadow/lg`
- Sizes: Small (400), Medium (520), Large (640)

### 10. Toast / Notification
- Variants: Info, Success, Warning, Error
- Structure: [StatusIcon] + Content (title + description) + [CloseButton]
- Auto Layout: horizontal, gap `space/sm`, padding `space/md`
- Radius: `radius/component`
- Shadow: `shadow/md`
- Dismissible: Boolean property for close button
- Position: document at bottom-right or top-right

## Auto Layout rules

- **Direction:** Match the content flow. Buttons = horizontal. Cards = vertical. Form fields = vertical (label → input → helper).
- **Gap:** Always use a spacing variable. Never type a raw number.
- **Padding:** Use spacing variables. Asymmetric padding is fine: `space/sm` vertical, `space/md` horizontal.
- **Sizing:** Use `Fill` for flexible children, `Hug` for content-sized containers. Fixed width only for icons and specific containers.
- **Alignment:** Center for buttons and badges. Top-left for cards and forms.

## Focus ring standard

All interactive components in Focused state must show:
- 2px solid outline in `color/border/focus` (typically a blue)
- 2px offset from the component edge
- Implemented as an outer stroke or a wrapping frame with padding

## Accessibility notes

- Ensure touch targets are minimum 44×44px (or document when smaller is acceptable)
- Text contrast must meet WCAG AA: 4.5:1 for normal text, 3:1 for large text
- Non-text contrast (borders, icons): 3:1 minimum
- Disabled states: don't rely on color alone; use reduced opacity or pattern

## Private base components

Prefix private components with `.` (Figma hides them from the Assets panel):
- `.ButtonBase` — shared Auto Layout, text style bindings, icon slots
- `.InputBase` — shared container, label, helper text structure
- `.FormFieldWrapper` — label + input + helper text

Public components instance the private base and add variant-specific overrides.

## Slot decision (mandatory for compound components)

Before building any compound component (Card, Modal, Dialog, Drawer, ListItem, Toast), make an explicit slot decision and record it in the component description.

For each customizable region, walk the variation decision tree from `slots-guide.md`:

1. **Variant** — for fixed appearance changes
2. **Boolean** — for show/hide of a known element
3. **Instance swap** — for one predictable position
4. **Named slot** — for arbitrary user-provided content

If the answer for any region is "named slot," the component must use real slots (Plugin API). Detach-as-workaround is forbidden under Critical Rule #11.

Document the decision per region in COMPOSITION:
- Slot `Leading`: accepts any component, hidden when empty (chose slot because consumer determines content)
- Title: TEXT property (chose property because content is always text)
- Trailing icon: instance swap property (chose swap because position is fixed and type is known)

If the Plugin API in the current environment does not yet expose slot creation, fall back to a documented boolean + instance swap pattern and note in the description that the component will migrate to true slots when API support lands. See `slots-guide.md` for the full decision tree, naming convention (Leading / Trailing / Header / Body / Footer / Actions), and fallback rules.
