# Slots guide

Slots let you define drop zones inside a component that accept arbitrary content without detaching. Available in Figma since March 2026 (open beta).

## When to use slots

Slots are for compound components where the inner content is variable and user-controlled.

**Use slots for:**
- Components hosting content the DS author doesn't fully control (Card, Modal, Dialog, Drawer)
- Multiple drop zones in one component (leading visual + body + trailing action)
- Composition is the component's primary purpose
- When without a slot, users would detach to edit inner content

**Don't use slots for:**
- Atom components (Button, Input, Checkbox) — variants and booleans cover all cases
- Compound components with fully known internal content (a ProductCard always with image/title/price in that order — variants + instance swap are enough)
- Text-only variations — use TEXT component property

## Decision tree for variation

For each customizable aspect of a component, in this order:

1. **Variant** — fixed appearance changes (size, type, state). Use when the option set is small and closed.
2. **Boolean property** — element on/off (has icon, show divider). Booleans only control visibility in Figma. If toggling changes layout, it's actually a variant.
3. **Instance swap** — single predictable element changes identity (icon, avatar). Use when there's exactly one slot per position and the type is known.
4. **Named slot** — arbitrary content the consumer provides. Use for compound components where inner content is the whole point.

When in doubt for compound components, prefer slots.

## Slot naming convention

Named slots use PascalCase:

| Common slot name | Purpose |
|------------------|---------|
| `Leading` | Left-side element (icon, avatar, image) |
| `Trailing` | Right-side element (icon, action button) |
| `Header` | Top section (titles, close buttons) |
| `Footer` | Bottom section (actions, metadata) |
| `Body` | Main content area |
| `Actions` | Button group, typically in modals/cards |

Match slot names to the code component's slot/children prop names where possible:
- React `<Card.Leading>` → Figma slot `Leading`
- React `<Modal.Footer>` → Figma slot `Footer`
- Generic children → Figma slot `Body` (default name)

## Implementation

Slots are created via the Figma Plugin API. Check the figma-use skill for the current API surface — slot creation is evolving.

For each slot:
- Set the slot marker on the frame
- Provide a meaningful default size and Auto Layout settings so it renders reasonably when empty
- Document each slot in the component description (which slot accepts what)

## Fallback when slot API isn't available

If the Plugin API version doesn't expose slot creation in the current environment, fall back to documented boolean + instance swap pattern. Document in the component description that this component will migrate to true slots when API support lands.

**Never detach a component as a workaround.**

## Documenting slots in component descriptions

Every component with slots documents them in COMPOSITION:

```
**COMPOSITION:**
- Slot `Leading`: accepts any component (typically Avatar, Icon, Image). Fixed 40px width. Hidden when empty.
- Slot `Body`: accepts text content, stacks of Typography components, or arbitrary children. Fills remaining width.
- Slot `Trailing`: accepts Icon or Button components. Fixed 40px width. Hidden when empty.
```

Include for each slot:
- Slot name (matching convention)
- What it accepts (any content, specific component type, text only)
- Default behavior when empty (hidden, placeholder, fixed space)
- Layout implications (grows, fixed size, stacks)

## Common slot patterns by component type

**Card:** Leading (visual), Body (content), Footer (actions)

**Modal:** Header (title + close), Body (content), Footer (action buttons)

**ListItem:** Leading (icon/avatar), Body (text), Trailing (action/value)

**Dialog:** Same as Modal

**Drawer:** Header, Body, Footer (similar to Modal)

**Toast:** Leading (icon), Body (message), Trailing (action/dismiss)

**Tab:** Leading (icon, optional), Body (label) — usually solved with variants + boolean instead, slots only for complex tab content
