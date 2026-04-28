# Patterns guide (Figma-side)

How to document composition patterns inside the Figma file. For exporting patterns to spec files in code, see `code-export.md`.

A pattern is a reusable composition of components — not a single component itself. Examples: form layout, card grid, three-column page, modal with footer actions.

## Where patterns live in Figma

Two valid placements:

1. **Cover page** — for the most important patterns (entry-level usage examples)
2. **Dedicated Patterns page** — for systems with 5+ documented patterns. Page comes after the last component group, before Utilities.

Patterns page uses the same fixed-width (996px) wrapper structure as component pages.

## Pattern frame structure

Each pattern gets its own frame with:

- **Title** — pattern name in bold (use the same Page Title component as on component pages)
- **Description** — one sentence on when to use, immediately under title
- **Live example** — actual component instances arranged as the pattern dictates (NOT a screenshot, NOT a detached frame)
- **Annotations** — small text labels pointing to spacing tokens, responsive behavior, etc.

## Naming convention

Pattern frames: `P{section}.{number} {Name}` (parallel to component numbering).

Examples:
- `P1.0 Form layout`
- `P1.1 Form layout (compact)`
- `P2.0 Three-column page`
- `P3.0 Card grid`
- `P4.0 Modal with actions`

## What to document per pattern

For each pattern, capture:

1. **Composition** — which components are used and in what order (e.g., "Stack of Input components, separated by `var(--space-md)`, terminated with Button group")
2. **Spacing** — explicit token references (e.g., "gap between sections: `var(--space-xl)`")
3. **Responsive behavior** — what changes at smaller breakpoints (if applicable)
4. **Variations** — when to use compact form vs spacious form

## Anti-patterns

- Do NOT use detached frames as pattern examples — defeats the point and breaks `get_design_context`
- Do NOT include patterns that are just "two buttons next to each other" — too granular, not a pattern
- Do NOT duplicate component documentation in pattern frames (link to component description instead)

## Connection to code

If you also export patterns to `specs/patterns/*.md` in the codebase via Phase 6, the Figma frame and the code spec stay paired:
- Figma frame = visual reference
- spec file = textual rules for the AI agent

Both should describe the same pattern. If they drift, the spec file is the source of truth (because it's what the AI reads at session start).

The skill exports patterns to code only when user explicitly requests during Phase 6. By default, patterns stay in Figma only.

## Common patterns to document

For most product DSes, document at least:

- **Form layout** — vertical stack of inputs with consistent spacing, label placement, helper text, validation messages
- **Page layout** — main content + sidebar, three-column, single-column
- **Empty state** — illustration + heading + description + CTA, used when content is missing
- **Loading state** — skeleton placement, spinner placement
- **Error state** — banner placement, retry CTA
- **Card grid** — responsive columns, gap rules
- **Modal flow** — header, body, footer arrangement and spacing

Don't document patterns that aren't actually used in the product.
