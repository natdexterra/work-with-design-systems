# Code export (Phase 6)

This reference covers Phase 6 of build mode — exporting design tokens, audit script, and AI rules to the user's codebase. Read before entering Phase 6.

Phase 6 is OFF by default. Triggers only when user explicitly asks or accepts the Phase 5 closing prompt.

## What gets exported

Three (optionally four) files:

1. `tokens.css` — design tokens as CSS custom properties with three-layer indirection
2. AI rules file (location varies by client) — instructions for the AI agent in this repo
3. `scripts/token-audit.js` — CI-ready audit that flags hardcoded values
4. (Optional) `specs/patterns/*.md` — composition patterns for the AI to read at session start

## tokens.css structure

Three layers. Components reference layer 2 only.

### Layer 1: Upstream tokens (if applicable)

If the project uses an upstream design system (Atlaskit, Material, Carbon, etc.), expose those tokens with a `--ds-` prefix:

```css
:root {
  /* Upstream design system tokens */
  --ds-color-text: #292A2E;
  --ds-color-background: #FFFFFF;
  --ds-space-100: 8px;
  --ds-space-200: 16px;
  --ds-radius-200: 8px;
}
```

If no upstream — skip layer 1, use layer 2 directly with raw values.

### Layer 2: Project aliases

Project-specific tokens that reference layer 1 with raw fallback:

```css
:root {
  /* Project semantic tokens */
  --color-text: var(--ds-color-text, #292A2E);
  --color-background: var(--ds-color-background, #FFFFFF);
  --space-sm: var(--ds-space-100, 8px);
  --space-md: var(--ds-space-200, 16px);
  --radius-md: var(--ds-radius-200, 8px);
}
```

The fallback is the raw value from Figma. If upstream renames or removes a token, the fallback keeps the project working.

When no upstream layer exists, layer 2 just holds raw values:

```css
:root {
  --color-text: #292A2E;
  --color-background: #FFFFFF;
  --space-sm: 8px;
}
```

### Layer 3: Components

Components reference layer 2 aliases only:

```css
.button {
  color: var(--color-text);
  padding: var(--space-md);
  border-radius: var(--radius-md);
}
```

Never `var(--ds-*)` directly. Never hardcoded values.

## Formatting tokens.css

`tokens.css` is produced by `scripts/export/formatTokensCSS.js`, a deterministic formatter over the JSON that `exportTokensToCSS.js` returns. It runs in Node, has no dependencies, and gives the same bytes for the same input. The model never writes or patches the declarations by hand: a value typed from prose drifts from the file without a trace, and the next export overwrites it. When the output is wrong, fix the variable, its codeSyntax or the targets map, and run the formatter again.

1. Run `exportTokensToCSS.js` via `use_figma` and save the JSON it returns as a file (`tokens.export.json`).
2. Write the mode strategy as a targets map (`tokens.targets.json`), keyed by collection name and then mode name, exactly as Figma spells them:

   ```json
   {
     "Semantic": { "Dark": "[data-theme=\"dark\"]" },
     "Typography": { "Presentation": "[data-mode=\"presentation\"]" }
   }
   ```

   A target is a selector, `{ "media": "...", "selector": "..." }` for a media query, an array of both, or `null` to leave the mode out of this file. A collection's default mode goes to `:root` unless listed. Every other mode must be listed: the formatter refuses a mode with no target rather than guess a selector.
3. From the project root, run `node <skill folder>/scripts/export/formatTokensCSS.js tokens.export.json tokens.targets.json > tokens.css`. Its first stderr line is the count it read, `formatTokensCSS: N variables, M collections`; compare it with the validator's `stats.variables` and `stats.variableCollections` for the same file, which match when the export covers every variable. On exit 1 it prints what to fix and no CSS, so the redirect leaves `tokens.css` empty, never half-written. Skipped variables (a BOOLEAN, a mode with no value) are listed on stderr.

**What it emits.** One layer: raw values and `var()` aliases (layer 2 above, with no upstream layer). A color is its hex, or `rgba()` when alpha < 1. An alias is `var()` of its target's codeSyntax.WEB. An alpha token is the exporter's `color-mix()` value. A FLOAT takes `px` when scoped to a dimension (gap, size, radius, stroke, effect, font size, line height, letter or paragraph spacing), `%` when scoped to an opacity (Figma stores both opacity kinds as a percent), and a bare number when scoped to a font weight. Any other FLOAT is refused, `ALL_SCOPES` and an empty scope list included: neither says which unit the value takes, so fix its scopes (Critical Rule #6) before Phase 6. A FONT_FAMILY string is quoted. Numbers are rounded to four decimals, because a FLOAT can read back with 32-bit noise (`22.4` as `22.399999618530273`).

**What it refuses.** A codeSyntax.WEB that is not a CSS custom property (`--name` or `var(--name)`); one CSS name on two variables; an alias whose target is missing, or shares its name with another variable (the export carries the target's name, not its id); an alpha token whose opacity did not resolve; a FLOAT whose scopes name no unit; a non-default mode with no target; a target that names a collection or mode the export does not have.

**Not covered.** The layer-1 upstream mapping with fallbacks, and `clamp()` for Desktop / Mobile type, which needs viewport bounds the file does not hold. A responsive pair can export through a media-query target for the Mobile mode; fluid `clamp()` means extending the formatter, with a fixture, not writing it by hand.

## Light/Dark modes — three strategies

Ask the user which strategy fits their project before generating tokens.css.

### Strategy 1: data-theme attribute

Most flexible. Requires JS to set on root.

```css
:root {
  --color-text: #292A2E;
  --color-background: #FFFFFF;
}

[data-theme="dark"] {
  --color-text: #E6E6E8;
  --color-background: #1D1F22;
}
```

Use when project has explicit theme switcher (toggle button, settings).

### Strategy 2: prefers-color-scheme media query

Automatic. Follows OS preference.

```css
:root {
  --color-text: #292A2E;
  --color-background: #FFFFFF;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #E6E6E8;
    --color-background: #1D1F22;
  }
}
```

Use when project has no theme switcher and follows system.

### Strategy 3: Both (attribute wins)

Best of both worlds. Attribute overrides media query.

```css
:root {
  --color-text: #292A2E;
  --color-background: #FFFFFF;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-text: #E6E6E8;
    --color-background: #1D1F22;
  }
}

[data-theme="dark"] {
  --color-text: #E6E6E8;
  --color-background: #1D1F22;
}
```

Use when project has theme switcher AND wants to respect system as default.

### Multi-brand

Same attribute pattern with brand-specific values:

```css
[data-brand="acme"] {
  --color-primary: #FF6B00;
}

[data-brand="globex"] {
  --color-primary: #0066CC;
}
```

If both modes and brands are needed, combine: `[data-theme="dark"][data-brand="acme"] { ... }`.

### In the targets map

| Strategy | Target for the Dark mode |
|----------|--------------------------|
| 1. data-theme attribute | `"[data-theme=\"dark\"]"` |
| 2. prefers-color-scheme | `{ "media": "(prefers-color-scheme: dark)", "selector": ":root" }` |
| 3. Both | `[{ "media": "(prefers-color-scheme: dark)", "selector": ":root:not([data-theme=\"light\"])" }, "[data-theme=\"dark\"]"]` |
| Single mode only | `null` |
| Multi-brand | one selector per brand mode, `"[data-brand=\"acme\"]"`; a mode that is theme and brand at once takes the compound selector |

## Collections with platform modes

A collection can have more than one mode that is not a theme: platform modes, such as a web mode and a presentation mode of one typography collection, with the same names and a value per platform. `[data-theme]` does not describe them. Choose one strategy per mode in Phase 1e and write it into the targets map. The input is the exporter's `valuesByMode`, keyed by mode name; the targets use the same names.

| Strategy | Targets for Typography with Web (default) and Presentation | Use when |
|----------|-------------------------------------------------------------|----------|
| An attribute | `{ "Typography": { "Presentation": "[data-mode=\"presentation\"]" } }` | One stylesheet serves both outputs and the root element carries the attribute (on a container, an alias declared in `:root` keeps the value it resolved at the root) |
| A file per mode | `{ "Typography": { "Web": ":root", "Presentation": null } }` for `tokens.web.css`, then `{ "Typography": { "Web": null, "Presentation": ":root" } }` for `tokens.presentation.css` | Each output loads its own stylesheet; each file is complete on its own |
| One mode exported, the other out of scope | `{ "Typography": { "Presentation": null } }` | The other platform does not read CSS. State in the AI rules file that this mode's values are not in `tokens.css` |

With an attribute, the default mode sits in `:root`, so a page without the attribute resolves the way a Figma node outside an explicit-mode frame does: to the collection's default.

## Audit script template

`scripts/token-audit.js` — Node.js, no dependencies, CI-ready.

Errors (exit code 1):
- Hex colors in CSS
- Pixel values for padding, margin, gap, font-size, border-radius
- rgb/rgba colors

Warnings (exit code 0):
- Raw transition durations
- z-index numbers
- Uncommon properties using raw values

```js
#!/usr/bin/env node
/**
 * token-audit.js
 * Scans CSS files for hardcoded values, suggests tokens, returns exit code 1 on errors.
 * Generated by work-with-design-systems skill, Phase 6.
 */

const fs = require('fs');
const path = require('path');

// Token registry — generated from Figma variables at build time
const TOKENS = {
  colors: {
    // {INSERT FROM BUILD: hex value → css var name}
    // e.g., '#292A2E': '--color-text',
  },
  spacing: {
    // {INSERT FROM BUILD: pixel value → css var name}
    // e.g., '8px': '--space-sm',
  },
  radius: {
    // {INSERT FROM BUILD}
  }
};

const ERROR_PATTERNS = [
  { name: 'hex color', regex: /#[0-9a-fA-F]{3,8}\b/g, lookup: 'colors' },
  { name: 'rgb color', regex: /rgba?\([^)]+\)/g, lookup: 'colors' },
  { name: 'spacing', regex: /(?:padding|margin|gap)\s*:\s*([\d.]+px)/g, lookup: 'spacing' },
  { name: 'radius', regex: /border-radius\s*:\s*([\d.]+px)/g, lookup: 'radius' }
];

const WARNING_PATTERNS = [
  { name: 'transition duration', regex: /transition[^;]+?(\d+(?:\.\d+)?(?:s|ms))/g },
  { name: 'z-index', regex: /z-index\s*:\s*(\d+)/g }
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = { errors: [], warnings: [] };

  lines.forEach((line, idx) => {
    // Skip lines that already use tokens
    if (line.includes('var(--')) return;

    for (const pattern of ERROR_PATTERNS) {
      const matches = [...line.matchAll(pattern.regex)];
      for (const match of matches) {
        const value = match[1] || match[0];
        const suggestion = TOKENS[pattern.lookup]?.[value];
        issues.errors.push({
          file: filePath,
          line: idx + 1,
          type: pattern.name,
          value,
          suggestion: suggestion ? `var(${suggestion})` : 'add a token for this value'
        });
      }
    }

    for (const pattern of WARNING_PATTERNS) {
      const matches = [...line.matchAll(pattern.regex)];
      for (const match of matches) {
        issues.warnings.push({
          file: filePath,
          line: idx + 1,
          type: pattern.name,
          value: match[1]
        });
      }
    }
  });

  return issues;
}

function findCSSFiles(dir) {
  const files = [];
  const skip = ['node_modules', '.git', 'dist', 'build', '.next'];

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (skip.includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(css|scss)$/.test(entry.name)) files.push(full);
    }
  }
  walk(dir);
  return files;
}

const root = process.argv[2] || process.cwd();
const cssFiles = findCSSFiles(root);

let totalErrors = 0;
let totalWarnings = 0;

console.log('Token Audit');
console.log(`Scanning ${cssFiles.length} CSS file(s)...\n`);

for (const file of cssFiles) {
  const { errors, warnings } = scanFile(file);
  if (errors.length === 0 && warnings.length === 0) continue;

  console.log(path.relative(root, file));
  for (const e of errors) {
    console.log(`  x L${e.line}: ${e.type} ${e.value}, use ${e.suggestion}`);
    totalErrors++;
  }
  for (const w of warnings) {
    console.log(`  ! L${w.line}: raw ${w.type} ${w.value}, consider using a token`);
    totalWarnings++;
  }
  console.log();
}

console.log('=== Summary ===');
console.log(`Files scanned:  ${cssFiles.length}`);
console.log(`Errors:         ${totalErrors}`);
console.log(`Warnings:       ${totalWarnings}`);

process.exit(totalErrors > 0 ? 1 : 0);
```

When generating, fill TOKENS object from current build's variables. The skill iterates over variables returned by `exportTokensToCSS.js` and fills entries by category (colors, spacing, radius).

## AI rules templates

Three templates, one per client. Same body, different headers/locations.

### Body (shared)

```markdown
# Design System Rules

This project uses a design system documented in this rules file. Read this before any UI work.

## Pre-flight check

Before writing or modifying any UI code:
1. Read this file to understand current tokens and components
2. Use only tokens from `tokens.css` — never hardcode values
3. Run `node scripts/token-audit.js` before committing
4. Zero errors required

## Available tokens

Defined in `tokens.css`. Reference them via `var(--token-name)`.

### Colors
{INSERT FROM BUILD: list of color tokens with names and use cases}

### Spacing
{INSERT FROM BUILD: list of spacing tokens with names and pixel values}

### Typography
{INSERT FROM BUILD: list of typography tokens or text style references}

### Radius
{INSERT FROM BUILD: list of radius tokens}

## Components

{ONE BLOCK PER COMPONENT FROM CURRENT BUILD:}

### {Component name}
**Purpose:** {from Figma description PURPOSE}
**Usage:** {from Figma description USAGE}
**Variants:** {variant property names and options}
**Slots (if any):** {slot names and what they accept}

## Audit

`scripts/token-audit.js` flags hardcoded values. Run before commit. CI integration:

```bash
node scripts/token-audit.js && echo "Tokens clean"
```

Exit code 1 means hardcoded values found — fix them by replacing with tokens above.

## When in doubt

- New component? Check if a similar one exists in this list before building
- Custom spacing? Check if a matching token exists in tokens.css
- New color? Add it to the design system first, then reference via token
```

### Claude Code — `.claude/rules/design-system.md`

Use the body above as-is. No frontmatter.

### Cursor — `.cursor/rules/design-system.mdc`

Add YAML frontmatter:

```markdown
---
description: Design system rules — read before any UI work
globs: ["**/*.css", "**/*.scss", "**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte"]
alwaysApply: true
---

[BODY ABOVE]
```

### Codex — append to `AGENTS.md`

Append section between markers (replace content between markers if they exist):

```markdown
<!-- design-system-rules-start -->
## Design system

[BODY ABOVE]
<!-- design-system-rules-end -->
```

If `AGENTS.md` doesn't exist, create it with just this section. If it exists with other content, append to end (or replace between markers if markers exist).

## Optional: specs/patterns/ files

For projects that want Hardik Pandya-style spec files in repo, generate one markdown file per documented pattern:

```
specs/
└── patterns/
    ├── form-layout.md
    ├── three-column-layout.md
    └── card-grid.md
```

Each file uses this template:

```markdown
# {Pattern name}

## When to use
{from Figma pattern documentation}

## Composition
{which components compose this pattern, in order}

## Spacing
{token references for gaps, padding}

## Responsive behavior
{breakpoint rules if applicable}

## Code example

```tsx
{reference implementation in project's framework}
```

## Anti-patterns
{what NOT to do}
```

Generated only if user explicitly requests in Phase 6 ("also generate spec files for patterns").

## Workflow summary

Phase 6 sequence:

1. **6a Format detection** — check `.claude/`, `.cursor/`, `AGENTS.md` in project root
2. **6b Output paths** — resolve scoped paths, ask if conflicts
3. **6c Mode strategy** — ask user about Light/Dark approach; platform modes take the strategy chosen in Phase 1e
4. **6d Generate files**:
   - Run `exportTokensToCSS.js` via `use_figma` and save the JSON
   - Write the targets map for the chosen strategies
   - Run `formatTokensCSS.js` to write tokens.css (never formatted by hand)
   - Fill AI rules template, write to scoped path
   - Fill TOKENS in audit script template, write
   - (Optional) Generate specs/patterns/ files
5. **6e Verify** — run audit if Node available, report paths

If running in environment without file write tools (Claude.ai web), output each file's contents in fenced code blocks with `Save as: {path}` headers instead of writing.
