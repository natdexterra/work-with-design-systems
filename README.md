# work-with-design-systems

A Claude skill for working with Figma design systems — two modes in one place: **inspect** (read-only audits with WCAG checks, component scoring, handoff docs) and **build** (creating components, fixing foundations, adding slots, writing descriptions). Build mode optionally extends to **Phase 6 (sync to code)** — generates `tokens.css`, an audit script, and AI rules file for your codebase.

Works with Claude Code, Cursor, and Codex.

## What's new in v2.0

This is a major release. The skill was previously called `generate-design-system` and only handled building. Now it covers the full lifecycle: inspect existing files, decide what to build or fix, optionally export to code. Between inspect and build, the skill always pauses for your decision. Phase 6 is OFF by default and only triggers on explicit request.

**Migration from v1.x:** see CHANGELOG for the migration note. Repo URL has changed but old links redirect automatically.

Highlights:
- **Two modes** — inspect (read-only) and build (write), with mandatory pause between
- **Phase 6 — sync to code (optional, off by default)** — generates `tokens.css` with three-layer indirection, AI rules file (Claude Code / Cursor / Codex), and CI-ready audit script. Closes the design-to-code loop.
- **Slots support** for compound components (Card, Modal, Dialog) — replaces detach patterns
- **Mandatory structured component descriptions** — Figma MCP passes them to agents as context
- **Six audit modules** — token compliance (with severity tiers), interactive states, WCAG accessibility, detached instances, naming quality, component descriptions
- **Weighted readiness scoring** — score each component 0–100 (errors weighted 1.0, warnings 0.3)
- **Three export formats** — markdown, JSON, AI prompt for code generation
- **Patterns guide** — how to document composition patterns in Figma (and optionally export them as spec files to repo)
- **Story-to-variant parity check** when codebase has Storybook
- **Auto-rename suggestion** when generic layer names exceed 20%

## What it does

The skill auto-detects mode from your request (or asks if unclear).

**Inspect mode** — read-only. Runs audit modules:

- **Module 1 — Token compliance.** Variable binding coverage. Errors: unbound fills, strokes, padding, gaps, corner radii. Warnings: raw opacity, blur radius, animation durations. Text nodes without text styles flagged separately.
- **Module 2 — Interactive states.** Compares variants against expected state matrices per component type. Missing states (Pressed on Button, Error on Input) listed with full expected set.
- **Module 3 — Accessibility.** Computed WCAG 2.1 AA checks. Color contrast (4.5:1 normal, 3:1 large). Touch target (44×44px minimum for interactive). Font size warnings <12px, errors <10px. Focus indicator presence.
- **Module 4 — Detached instances.** Scans all pages for frames matching component names but not instances. Reports with page, parent path, node ID.
- **Module 5 — Naming quality.** Flags generic Figma auto-names (Frame 47, Rectangle 3) inside components.
- **Module 6 — Component descriptions.** Generates structured documentation per component (PURPOSE, BEHAVIOR, COMPOSITION, USAGE, CODE NOTES). Uses reasoning rather than computation.

Score formula:

```
Score = (tokens_errors × 2 + tokens_warnings × 0.6 + states × 3 + accessibility × 1 + naming × 0.5) / 7.1 × 100
```

State coverage weighted heaviest because missing states cause the most downstream breakage in generated code.

After inspect, the skill ALWAYS pauses with the report and waits for your decision before any changes.

**Build mode** — write. Six-phase workflow (Phase 6 optional):

- **Phase 1 — Discovery.** Analyzes codebase or collects specs from scratch. Accepts .md brand guidelines, .json tokens (W3C DTCG, Tokens Studio), screenshots, URLs. If file exists, runs quick health check (not full audit — for that, use inspect mode). Recommends path: build in place, new file, hybrid, code export only.
- **Phase 2 — Foundations.** Variable collections (3-tier or flat domain-based — both supported). Light/Dark modes (and multi-brand). Text styles, effect styles. Sets codeSyntax.WEB on every variable. Skipped when foundations exist and pass health check.
- **Phase 3 — File structure.** Standard pages: Cover, Getting Started, Foundations, one per component group, Patterns (optional), Utilities. Reusable Page Title component. Component pages use fixed-width (996px) wrapper. Skipped when documentation pages not required.
- **Phase 4 — Components.** Suggests core 10, you confirm. For atoms (Button, Input, Checkbox), full variant matrices with all states, Auto Layout, variable bindings, TEXT properties. For compound (Card, Modal, Dialog), runs slot decision — named slots replace detach patterns. Writes structured description for every public component. Validates after each component. Optional Phase 4d documents composition patterns.
- **Phase 5 — QA.** Validation script checks for missing collections, ALL_SCOPES violations, hardcoded fills, missing Auto Layout, Light/Dark coverage, missing descriptions, missing slot decisions. Builds test page to verify composability. Closes with optional Phase 6 prompt.
- **Phase 6 — Sync to code (optional, OFF by default).** Generates `tokens.css` with three-layer indirection (upstream → project aliases with fallback → components reference aliases), CI-ready Node.js audit script, and AI rules file (`.claude/rules/design-system.md`, `.cursor/rules/design-system.mdc`, or `AGENTS.md` section). Light/Dark via `[data-theme]`, `@media (prefers-color-scheme)`, or both. Triggers only on explicit user request.

The skill pauses between phases for your review.

## File structure

```
work-with-design-systems/
├── SKILL.md                              # Core instructions
├── README.md
├── CHANGELOG.md
├── LICENSE
│
├── references/
│   ├── inspect/                          # Inspect mode reference docs
│   │   ├── overview.md
│   │   ├── token-compliance.md
│   │   ├── interactive-states.md
│   │   ├── accessibility.md
│   │   ├── detached-instances.md
│   │   ├── naming-quality.md
│   │   ├── component-descriptions.md
│   │   ├── readiness-scoring.md
│   │   └── report-templates.md
│   │
│   └── build/                            # Build mode reference docs
│       ├── token-taxonomy.md
│       ├── component-spec.md
│       ├── naming-conventions.md
│       ├── framework-mappings.md
│       ├── slots-guide.md
│       ├── component-description-template.md
│       ├── patterns-guide.md             # Composition patterns in Figma
│       └── code-export.md                # Phase 6 — tokens.css, audit, AI rules
│
├── scripts/
│   ├── inspect/                          # Inspect mode scripts (read-only)
│   │   ├── inventory.js
│   │   ├── audit-tokens.js               # With severity tiers
│   │   ├── audit-states.js
│   │   ├── audit-accessibility.js
│   │   ├── audit-detached.js
│   │   └── audit-naming.js
│   │
│   └── build/                            # Build mode scripts (write)
│       ├── validate-design-system.js     # Final QA validation
│       ├── exportTokensToCSS.js          # Phase 6a — read variables for export
│       └── fixHardcodedToTokens.js       # Fuzzy auto-fix for inspect → build flow
│
└── assets/
    └── file-structure-template.md
```

Reference and script files load on demand. Inspect mode loads `references/inspect/` and `scripts/inspect/`. Build mode loads `references/build/` and `scripts/build/`. Phase 6 specifically loads `code-export.md` and `exportTokensToCSS.js`. Critical rules in SKILL.md apply to all modes.

## Installation

### Claude Code

```bash
# Copy into your project
cp -r work-with-design-systems/ .claude/skills/work-with-design-systems/

# Or install globally (available across all projects)
cp -r work-with-design-systems/ ~/.claude/skills/work-with-design-systems/

# Or clone directly
git clone https://github.com/natdexterra/work-with-design-systems.git .claude/skills/work-with-design-systems
```

Then invoke with `/work-with-design-systems` in Claude Code chat.

### Cursor

```bash
cp -r work-with-design-systems/ .cursor/skills/work-with-design-systems/
```

### Codex

```bash
cp -r work-with-design-systems/ skills/work-with-design-systems/
```

### Compatibility

The skill is a set of Markdown and JavaScript files — not tied to any specific IDE. Confirmed working with:
- Claude Code (terminal and VS Code extension)
- Cursor
- Codex

Phase 6 (sync to code) requires file write access. Available in Claude Code, Cursor, Codex, and similar MCP clients with file tools. When run from Claude.ai web/mobile, Phase 6 outputs file contents inline for manual saving.

### Prerequisites

- [Figma MCP server](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/) connected (remote server recommended)
- The `figma-use` skill installed (comes with the Figma plugin for Claude Code and Cursor)

## Usage

### Inspect — full audit

```
/work-with-design-systems

Audit my design system file for quality issues.
```

The skill inventories the file, runs all six modules, produces a full report, then stops and waits for your decision.

### Inspect — narrow scope

```
/work-with-design-systems

Check WCAG compliance on Button and Input only.
```

Only Module 3 runs on the specified components.

### Inspect — pre-handoff documentation

```
/work-with-design-systems

Generate component documentation for developer handoff.
```

Modules 1 and 6 run. Output: markdown + JSON bundle with structured component specs.

### Build — from scratch

```
/work-with-design-systems

Create a design system for a fintech product.
Brand color: #6366F1 (indigo). Font: Inter.
Need Light and Dark modes.
```

Build mode, full build path. Asks to confirm colors, spacing, component list before building.

You can feed it `.md` brand guidelines or `.json` tokens (W3C DTCG, Tokens Studio) instead of typing specs.

### Build — from existing codebase

```
/work-with-design-systems

Sync our component library to Figma.
Tokens: tailwind.config.ts
Components: src/components/ui/
```

Reads token files and component props, maps to Figma Variables and component variants. Reads Storybook stories if present.

### Build — extending an existing file

```
/work-with-design-systems

Variables and text styles are set up in [Figma file URL].
Need to build 7 components with proper bindings.
```

Health check on variables, then builds components — no need to recreate foundations.

### Build — adding slots to existing components

```
/work-with-design-systems

Our Card component keeps getting detached because users need different inner content.
Add slots to it.
```

Reads current Card structure, proposes slot positions based on detach patterns, updates in place. Existing instances continue to work. Phase 6 not offered (retrofit scope).

### Build — end-to-end with code export

```
/work-with-design-systems

Create a design system for fintech app, indigo primary, Inter, Light+Dark —
and generate tokens.css and CLAUDE.md when done.
```

Full build path through Phase 5, then proceeds directly to Phase 6 (because user opted in upfront). Outputs `tokens.css` with three-layer indirection, `.claude/rules/design-system.md` with component list and token reference, `scripts/token-audit.js` for CI.

### Code export only

```
/work-with-design-systems

My Figma DS is solid. Just generate tokens.css and CLAUDE.md for my repo.
```

Phase 1c health check on variables. If foundations are valid (scopes set, codeSyntax present), skips Phases 2-5 and runs Phase 6 directly. If foundations are broken, refuses and recommends fixing them first.

### Inspect → build (most common)

```
/work-with-design-systems

I have a 6-month-old Figma file. Need to figure out what's broken and fix what's worth fixing.
```

Runs inspect first, presents report, pauses for your decision on what to fix. Then enters build mode with your scoped instructions.

## Supported frameworks

`references/build/framework-mappings.md` contains token extraction patterns for:
- React + Tailwind CSS (including shadcn/ui with `cva`)
- React + CSS Modules / styled-components
- Vue 2/3 with any CSS approach
- Svelte
- Angular
- W3C Design Tokens (DTCG JSON format)
- Tokens Studio format

For unsupported setups, the skill falls back to collecting specs manually.

## Supported inputs

When starting from scratch:

| Input | Format |
|-------|--------|
| Brand guidelines | `.md` file |
| Design tokens | `.json` (W3C DTCG or Tokens Studio format) |
| Visual references | Screenshots, URLs |
| Verbal spec | Colors, fonts, spacing values in chat |
| Codebase | Tailwind config, CSS variables, theme files, component directories |
| Storybook | `.stories.{ts,tsx,js,jsx,mdx}` files for variant parity check |

## Phase 6 outputs

When Phase 6 runs, you get:

| File | Path | Purpose |
|------|------|---------|
| `tokens.css` | Project root or `src/styles/` | All design tokens with three-layer indirection |
| AI rules | `.claude/rules/design-system.md` (Claude Code) | Read by AI agent at session start |
| AI rules | `.cursor/rules/design-system.mdc` (Cursor) | Same, Cursor format |
| AI rules | `## Design system` section in `AGENTS.md` (Codex) | Same, with start/end markers |
| Audit script | `scripts/token-audit.js` | CI-ready, exit code 1 on hardcoded values |
| Patterns (opt) | `specs/patterns/*.md` | Hardik Pandya-style composition specs |

The audit script flags errors (hardcoded colors, raw spacing, raw radii) separately from warnings (raw transition durations, z-index values). CI pipelines exit on errors but allow warnings.

## Design decisions

**Why two modes in one skill?** A common workflow is inspect → decide → build. Splitting into two skills means manual switching and broken context between sessions. One skill with explicit modes preserves the flow while still enforcing read-only safety in inspect.

**Why mandatory pause between inspect and build?** Inspect mode's value is producing a report you can act on. Auto-chaining to build defeats the purpose — you'd never see the report. The pause is the core guarantee.

**Why is Phase 6 off by default?** Phase 6 writes files outside Figma. That's a different scope than the rest of the skill. Auto-running it on every build would be intrusive and break retrofit scenarios (slot retrofit shouldn't regenerate `tokens.css` and overwrite the user's audit script). The default offer at end of QA gives users opt-in opportunity without forcing it.

**Why three-layer indirection in tokens.css?** Layer 1 holds upstream design system tokens (Atlaskit, Material, Carbon — if used). Layer 2 holds project aliases that reference Layer 1 with raw values as fallback (`var(--ds-text, #292A2E)`). Components only reference Layer 2. If upstream renames a token, you fix one alias. If upstream is unreachable, the fallback keeps the project running.

**Why scoped AI rules paths?** Top-level `CLAUDE.md`, `AGENTS.md`, and full `.cursor/rules` are user-managed files often containing custom instructions for the project. Overwriting them is destructive. Scoped paths (`.claude/rules/design-system.md`, etc.) live alongside other rules and don't conflict.

**Why weighted scoring?** A Button missing its Pressed state breaks user interaction more severely than a generic layer name. State gaps score ×3, token errors ×2, accessibility ×1, naming ×0.5. Token warnings score ×0.6 (less than errors but not zero).

**Why slots over detach?** Detached frames are structurally invisible to agents and to inspect mode. Slots give explicit dropzones for variable content while keeping the component intact. Figma added slots in March 2026 specifically for this.

**Why mandatory descriptions?** Figma MCP reads component descriptions and passes them to consuming agents as context. A component without description forces the agent to guess everything from visual structure. Descriptions are the single highest-leverage thing you can add to a design system for AI quality.

**Why 3-tier tokens (when used)?** Primitives hold raw values. Semantic tokens alias primitives and carry meaning (`color/bg/primary` instead of `color/blue-500`). Components bind to Semantic only. Switching Light/Dark requires zero component changes — you swap the Semantic layer. For single-brand or rebuilds, flat domain-based collections (Colors, Spacing, Radius) are equally valid. The skill supports both.

**Why explicit variable scopes?** Default ALL_SCOPES pollutes every property picker. A spacing variable showing up in the color picker is confusing.

**Why states before default?** Most incomplete design systems ship a "happy path" Button and forget Disabled, Error, Loading. Component spec requires all states upfront.

**Why codeSyntax on every variable?** Without `codeSyntax.WEB`, agents using `get_design_context` get raw Figma variable names instead of CSS token names. Setting it on creation means the design-to-code bridge works from day one. Phase 6 also depends on codeSyntax — the audit refuses to run without it.

**Why TEXT component properties?** Without them, changing a button label from "Label" to "Submit" reverts on component update. TEXT properties with `componentPropertyReferences` preserve overrides.

**Why fixed-width page wrappers?** Without fixed width (996px), small components like Toggle produce narrow pages (350px) while large ones produce wide pages. Fixed width keeps all component pages visually consistent.

**Why flexible component lists?** Real design systems rarely match a generic "core 10". A fintech DS might need Date Picker and Stepper but not Avatar. The skill suggests defaults but defers to actual inventory.

**Why split inspect/build into subfolders?** Large reference files don't all need to load at once. Inspect mode reads `references/inspect/` only. Build mode reads `references/build/` only. Phase 6 specifically loads `code-export.md`. Critical rules in SKILL.md apply to all modes.

## Why this matters: closed loop Figma ↔ code

The skill closes the design-to-code loop end-to-end. Figma side: components, tokens, slots, descriptions all properly structured for `get_design_context` to return clean CSS token names. Code side (Phase 6): `tokens.css` mirrors Figma exactly with three-layer indirection, AI rules tell the agent in the IDE which tokens exist and where to look up component specs, audit script catches drift. An AI agent reading a design via MCP and writing code in the IDE picks the same tokens both ways. No fabrication, no drift between sessions.

## Customization

Fork and adapt. Common changes:
- **Different core components:** Edit list in SKILL.md Phase 4a and add specs to `references/build/component-spec.md`
- **Different spacing scale:** Edit defaults in `references/build/token-taxonomy.md`
- **Company-specific naming:** Edit `references/build/naming-conventions.md`
- **Additional audit checks:** Add new module to `references/inspect/` and matching script to `scripts/inspect/`. Update SKILL.md inspect workflow.
- **Single framework:** Remove irrelevant sections from `references/build/framework-mappings.md`
- **Different Phase 6 output paths:** Edit defaults in `references/build/code-export.md`

## Related skills

| Skill | When to use |
|-------|-------------|
| `figma-generate-library` | Official Figma skill with similar build workflow, integrated with Figma's tooling |
| `figma-generate-design` | Building screens FROM a design system (not building the system itself) |
| `figma-implement-design` | Generating code FROM Figma designs (page-level, not token-level) |
| `figma-create-design-system-rules` | Creating top-level CLAUDE.md rules for an existing system |
| `figma-code-connect-components` | Linking Figma components to code via Code Connect |

## Resources

- [Figma: Create skills for the MCP server](https://developers.figma.com/docs/figma-mcp-server/create-skills/)
- [Figma: Skills for MCP](https://help.figma.com/hc/en-us/articles/39166810751895-Figma-skills-for-MCP)
- [Figma slots in design systems (Nathan Curtis)](https://medium.com/@nathanacurtis/slots-in-design-systems)
- [How to build a design system in Figma (2026)](https://muz.li/blog/how-to-build-a-design-system-in-figma-a-practical-guide-2026/)
- [Expose your design system to LLMs (Hardik Pandya)](https://hvpandya.com/llm-design-systems) — inspiration for Phase 6 architecture

## License

MIT — see [LICENSE](LICENSE).
