# Variable description template

A Figma variable has a description field, as a component does. Whenever you write one, use this template: it is the one place where a token's purpose and its bounds travel with the token, into the picker and into every script that reads variables.

## The template

```
PURPOSE
One sentence: what the token is for.

USAGE
- Where it applies: the properties and surfaces it is scoped to
- What it must not be used for, and the token to use there instead
- The variable it aliases, by name (per mode when the modes differ)

CONSTRAINT
- The rule that bounds its value: a contrast floor, aliases only and never a literal, a mode rule
```

## Format rules

The same as `component-description-template.md`, "MCP delivery format":

- UPPERCASE section headers. No `**`, no `##`, and no `*`, `_`, `[`, `]`, `#` for emphasis.
- Newlines collapse in MCP delivery, so the UPPERCASE headers are the only reliable section markers.
- Figma stores `'` as `&#39;` and `&` as `&amp;`. Never copy one variable's description into another (the round-trip encodes `&` again on every write): write the literal string to each variable.
- Verify inside the same script: read `variable.description` back and return it (Critical Rule #2).

## The spec, not a changelog

A variable description states what the token is and what bounds it now. It never carries dates, people's names, decision history ("approved", "decided", "previous version"), node ids, repo or file paths, scan notes or instance counts. That history belongs in the project's decision records and work logs. A rule that was decided is written as the rule: `Aliases only, never a literal`, not the story of the decision.

## Example: a semantic color

```
PURPOSE
Secondary body text: captions, helper text, metadata.

USAGE
- Text fills only (scoped TEXT_FILL)
- Not for disabled text (use color/text/disabled) or for text on a brand fill (use color/text/on-brand)
- Aliases color/gray-600 in Light and color/gray-300 in Dark

CONSTRAINT
- Aliases only, never a literal
- At least 4.5:1 against color/bg/page and color/bg/surface in both modes
```

## Example: a token in a collection with platform modes

```
PURPOSE
Size of captions under images, charts and tables.

USAGE
- Font size only (scoped FONT_SIZE), bound in the caption text styles
- Not for helper text in forms (use font-size/sm)

CONSTRAINT
- The value differs per mode of the Typography collection; a consumer outside an explicit-mode frame resolves to the default mode
- Never below 12px in any mode
```
