# Component description template (mandatory)

Every public component MUST have a description filled out using this template. Figma MCP reads the description and passes it to consuming agents as context. A component without a description forces the agent to guess everything from visual structure alone — which is why bad code gets generated.

## The template

```
PURPOSE
One sentence — what this component does and when to use it.

BEHAVIOR
- Default interaction pattern (click, hover, focus)
- State transitions (what triggers hover, focus, pressed)
- Keyboard behavior (Enter, Space, Tab, Arrow keys)
- Animation/motion notes

COMPOSITION
- Internal structure: what child layers/components it contains
- Nested component instances (e.g., uses Avatar, uses Icon)
- Slot descriptions: which slots exist, what each accepts (see below)
- Which parts are configurable (variants, booleans, slots, text properties)

USAGE
- When to use vs similar components (Button vs Link, Dialog vs Modal)
- Dos and don'ts
- Common combinations with other components
- Anti-patterns to avoid

CODE GENERATION NOTES
- Props mapping (Figma property → code prop name)
- Accessibility attributes needed (role, aria-label, aria-describedby)
- Event handlers to implement (onClick, onFocus, onKeyDown)
- Any constraints (max children, required slots)
```

## MCP delivery format — important constraints

Figma's description field stores text with HTML encoding for some characters (`&` → `&amp;`, `"` → `&quot;`, `'` → `&#39;`). MCP's `get_design_context` decodes these back on output — so plain quotes and ampersands work fine.

However, `get_design_context` ALSO escapes markdown special characters and collapses newlines:

- `**bold**` → delivered as `\*\*bold\*\*` (asterisks escaped, bold does not render)
- `[brackets]` → delivered as `\[brackets\]`
- `## heading` → delivered as `\#\# heading`
- Newlines → collapsed to single spaces (sections run together)
- Backticks → escaped but still readable as `` \`code\` ``

**Use plain-text formatting:**
- UPPERCASE for section headers (no asterisks, no `##`)
- Bullet items with `-` work fine
- Backticks for code/token references work fine
- Avoid `*`, `_`, `[`, `]`, `#` for visual emphasis — they will render as escape sequences in the consuming agent's view

Because newlines collapse, UPPERCASE headers act as the only reliable section markers in the MCP-delivered text. Keep them short and single-word so they parse cleanly even when run together with prose.

## Slot documentation in COMPOSITION

For each named slot, document:
- Slot name (matching the convention — Leading, Trailing, Body, Footer, etc.)
- What it accepts (any content, specific component type, text only)
- Default behavior when empty (hidden, placeholder, fixed space)
- Layout implications (grows, fixed size, hides)

## Nested components inventory

Inside COMPOSITION, list every component instance the component embeds (Avatar, Icon, Badge, Button, etc.). This list lets downstream AI tools reason about composition without walking the structure.

Format:
- For fixed nested instances: `Nested: ComponentName (variant: configuration)` — e.g., `Nested: Avatar (size: medium)`, `Nested: Badge (variant: info)`
- For dynamic nested content (slots accepting any component): say "any component" rather than enumerating possibilities
- For optional nested instances (controlled by booleans): note the boolean — e.g., `Nested: Icon (when Icon Left = true)`

Place the list after the slot descriptions, as the last sub-bullet in COMPOSITION. If the component has no nested instances, omit the line.

## Private base components

Components prefixed with `.` or `_` may use a single-line note instead of the full template:

```
Internal: base layout for Button variants. Not for direct use.
```

## Example: Button

```
PURPOSE
Primary interactive element for triggering actions. Use for any user-initiated action (submit, cancel, navigate, open modal).

BEHAVIOR
- Click triggers the bound action
- Hover increases background saturation by 10%
- Pressed reduces opacity to 80%
- Focused shows 2px outline (color/focus/default)
- Disabled prevents clicks and reduces opacity to 40%
- Loading state replaces label with spinner, disables clicks

COMPOSITION
- Auto Layout horizontal, gap 8px
- Optional leading icon (boolean Icon Left)
- Required label (TEXT property "Label")
- Optional trailing icon (boolean Icon Right)
- Padding scales with size: sm = 8/12, md = 12/16, lg = 16/24

USAGE
- Use Primary variant for the main action on a page or section (one per context)
- Use Secondary for alternative actions
- Use Tertiary/Ghost for low-emphasis actions
- Don't use Button for navigation that doesn't trigger an action — use Link instead
- Don't stack multiple Primary buttons in the same context

CODE GENERATION NOTES
- Variant `Type` → React prop `variant: "primary" | "secondary" | "tertiary" | "destructive"`
- Variant `Size` → React prop `size: "sm" | "md" | "lg"`
- Variant `State` → handled by component, not exposed as prop
- Boolean `Icon Left` → React prop `leadingIcon?: ReactNode`
- Boolean `Icon Right` → React prop `trailingIcon?: ReactNode`
- TEXT `Label` → React children
- Add aria-busy when in loading state
- Add aria-disabled (not just disabled) for screen reader support
```

## Example: Card (with slots)

```
PURPOSE
Container for grouped content with consistent spacing and elevation. Use to group related information that the user should perceive as a unit.

BEHAVIOR
- Default Card is non-interactive
- Interactive variant (hover and pressed states) for clickable cards
- Click on interactive card triggers the bound action
- Hover raises elevation by 1 level

COMPOSITION
- Auto Layout vertical, gap 16px
- Padding 24px on all sides
- Background color/surface/default, corner radius/lg
- Slot `Leading`: optional. Accepts any component (typically Avatar, Icon, Image). Hidden when empty. Sits above Body.
- Slot `Body`: required. Accepts text content, stacks of Typography, or arbitrary children. Fills width.
- Slot `Footer`: optional. Accepts Button group or text. Hidden when empty. Sits below Body with extra 8px gap.

USAGE
- Use Card for grouped content with clear boundaries
- Use Interactive variant only when the entire card is clickable (don't put a Card inside a button)
- Don't nest Cards — flat hierarchy reads better
- For data tables, use Table not Card grid

CODE GENERATION NOTES
- Variant `Type` → React prop `interactive?: boolean`
- Slots map to React subcomponents:
  - `Card.Leading` → renders Leading slot content
  - `Card.Body` → renders Body slot content
  - `Card.Footer` → renders Footer slot content
- Default semantic role: `article` for non-interactive, `button` or `a` for interactive
- For interactive Card, ensure keyboard accessibility (Enter/Space activation)
```
