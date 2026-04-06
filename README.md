# generate-design-system

An MCP skill for building and extending design systems in Figma: tokens, variables, text styles, and components with proper variable bindings, all through a structured phased workflow. Works with Claude Code, Cursor, and Codex.

Use it to create a design system from scratch, sync one from a codebase, or add components to a file where variables and text styles already exist. The skill ensures proper binding, per-component validation, and spec documentation regardless of the starting point.

Built on top of the [Figma MCP server](https://developers.figma.com/docs/figma-mcp-server/) and the `figma-use` skill. Tested on a real production design system (175 variables, 50+ components).

## What it does

The skill walks an AI agent through building or extending a design system in Figma:

**Phase 1 — Discovery.** Analyzes your codebase (if you have one) or collects brand specs from scratch. Accepts `.md` brand guidelines, `.json` design tokens (W3C DTCG, Tokens Studio), screenshots, or URLs as input. If a Figma file already exists, runs a full audit: ALL_SCOPES violations, missing `codeSyntax.WEB`, duplicate variables, unbound fills, text nodes without TEXT component properties. Recommends whether to build in place, start fresh, or take a hybrid approach. Confirms scope before touching anything.

**Phase 2 — Foundations.** Creates variable collections following either a 3-tier architecture (Primitives → Semantic → Component) or flat domain-based collections — whichever matches your existing structure. Sets `codeSyntax.WEB` on every variable for proper design-to-code handoff. Sets up Text Styles and Effect Styles. **Skipped when foundations already exist and pass audit.**

**Phase 3 — File structure.** Organizes the Figma file into standard pages: Cover, Getting Started, Foundations (with rendered swatches, type specimens, spacing scale), and one page per component group. Creates a reusable Page Title component for consistency. Component pages use a fixed-width (996px) wrapper structure with spec containers. **Skipped when documentation pages aren't required.**

**Phase 4 — Components.** Suggests a default core 10 but asks you to confirm based on your actual inventory. Builds each component with full variant matrices, all interactive states, Auto Layout, variable bindings, and TEXT component properties for customizable labels. Validates after every component with `get_metadata` + `get_screenshot`. Wraps each component set in a spec frame with state/size labels for documentation.

**Phase 5 — QA.** Runs a validation script that checks for missing collections, ALL_SCOPES violations, hardcoded fills, missing Auto Layout, and Light/Dark mode coverage. Builds a test page from system components to verify composability.

The agent pauses between phases for your review. When foundations already exist, the agent skips directly to components — no need to go through every phase.

## File structure

```
generate-design-system/
├── SKILL.md                              # Core instructions (~430 lines)
├── references/
│   ├── token-taxonomy.md                 # Variable architecture, scopes, defaults
│   ├── component-spec.md                 # Default component specs, states, Auto Layout rules
│   ├── naming-conventions.md             # Figma ↔ code name mapping tables
│   └── framework-mappings.md             # Token extraction for React, Vue, Svelte, Angular, DTCG
├── scripts/
│   ├── validate-design-system.js         # QA audit script (runs via use_figma)
│   ├── createComponentWithVariants.js    # Component creation template
│   ├── bindVariablesToComponent.js       # Systematic variable binding
│   ├── auditComponentBindings.js         # Binding coverage check
│   └── validateCreation.js              # Per-component validation
└── assets/
    └── file-structure-template.md        # Page layout template for the Figma file
```

Reference files load on demand. The agent reads `token-taxonomy.md` only when entering Phase 2, `component-spec.md` only in Phase 4, and so on. Helper scripts are referenced directly in the workflow steps where they're needed.

## Installation

### Claude Code

```
# Copy into your project
cp -r generate-design-system/ .claude/skills/generate-design-system/

# Or install globally (available across all projects)
cp -r generate-design-system/ ~/.claude/skills/generate-design-system/

# Or clone directly
git clone https://github.com/natdexterra/generate-design-system.git .claude/skills/generate-design-system
```

Then invoke with `/generate-design-system` in Claude Code chat.

### Cursor

```
cp -r generate-design-system/ .cursor/skills/generate-design-system/
```

Invoke with `/generate-design-system` or let Cursor auto-detect from the skill description.

### Codex

```
cp -r generate-design-system/ skills/generate-design-system/
```

Or use `$skill-creator` to register it.

### Compatibility

The skill is a set of Markdown and JavaScript files — it's not tied to any specific IDE. Confirmed working with:
- Claude Code (terminal and VS Code extension)
- Cursor
- Codex

Expected to work with any MCP client that supports skill loading (VS Code Insiders, Windsurf, etc.).

### Prerequisites

- [Figma MCP server](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/) connected (remote server recommended)
- The `figma-use` skill installed (comes with the Figma plugin for Claude Code and Cursor)

## Usage

### From scratch (no codebase)

```
/generate-design-system

Create a design system for a fintech product.
Brand color: #6366F1 (indigo). Font: Inter.
Need Light and Dark modes.
```

You can also feed it a `.md` file with brand guidelines or a `.json` with design tokens (W3C DTCG format, Tokens Studio format) as a starting point.

The agent will ask you to confirm colors, spacing scale, and component list before building anything.

### From an existing codebase

```
/generate-design-system

Sync our component library to Figma.
Tokens: tailwind.config.ts
Components: src/components/ui/
```

The agent reads your token files and component props, then maps them to Figma Variables and component variants.

### Extending an existing file (variables exist, need components)

```
/generate-design-system

Variables and text styles are set up in [Figma file URL].
Need to build 7 components with proper bindings.
```

The agent runs an audit to verify variable quality, then skips directly to building components — no need to recreate foundations. Every component gets validated after creation.

### Auditing an existing Figma file

```
/generate-design-system

Audit the design system in [Figma file URL].
Foundations are done. Need to fix any variable issues, then build the remaining components.
```

The agent runs a full audit first (scoping, codeSyntax, bindings), presents findings, recommends a path (fix in place vs start fresh), fixes issues, then continues to the component phase.

## Supported frameworks

The `references/framework-mappings.md` file contains token extraction patterns for:

- React + Tailwind CSS (including shadcn/ui with `cva`)
- React + CSS Modules / styled-components
- Vue 2/3 with any CSS approach
- Svelte
- Angular
- W3C Design Tokens (DTCG JSON format)
- Tokens Studio format

For unsupported setups, the agent falls back to collecting specs manually and building from scratch.

## Supported inputs

When starting from scratch, you can provide:

| Input | Format |
|-------|--------|
| Brand guidelines | `.md` file |
| Design tokens | `.json` (W3C DTCG or Tokens Studio format) |
| Visual references | Screenshots, URLs |
| Verbal spec | Colors, fonts, spacing values in chat |
| Codebase | Tailwind config, CSS variables, theme files, component directories |

## Design decisions

**Why 3-tier tokens (when used)?** Primitives hold raw values. Semantic tokens alias primitives and carry meaning (`color/bg/primary` instead of `color/blue-500`). Components bind to Semantic tokens only. Switching from Light to Dark mode requires zero component changes — you swap the Semantic layer. For single-brand systems or rebuilds, flat domain-based collections (Colors, Spacing, Radius) are equally valid. The skill supports both.

**Why explicit variable scopes?** Figma's default `ALL_SCOPES` pollutes every property picker. A spacing variable showing up in the color picker is confusing. The skill sets scopes explicitly: background colors get `FRAME_FILL` + `SHAPE_FILL`, text colors get `TEXT_FILL`, spacing gets `GAP` + `WIDTH_HEIGHT`.

**Why states before default?** Most incomplete design systems ship a "happy path" Button and forget Disabled, Error, and Loading states. The component spec requires all states upfront. A component without its full state matrix is not done.

**Why private base components?** Prefixing with `.` hides internal structure from the Assets panel. Public components instance the private base, so updating padding or layout in one place propagates everywhere.

**Why codeSyntax on every variable?** Without `codeSyntax.WEB`, agents using `get_design_context` get raw Figma variable names instead of CSS token names. Setting it on creation means the design-to-code bridge works from day one.

**Why TEXT component properties?** Without them, changing a button label from "Label" to "Submit" reverts on component update. TEXT properties with `componentPropertyReferences` preserve overrides across updates.

**Why spec wrapper frames?** A component set without labels is a grid of unlabeled boxes. Spec frames add state names as column headers and size names as row labels, making the variant matrix readable for anyone opening the file.

**Why fixed-width page wrappers?** Without a fixed width (996px), small components like Toggle produce narrow pages (350px) while large ones produce wide pages. Fixed width keeps all component pages visually consistent.

**Why flexible component lists?** Real design systems rarely match a generic "core 10" list. A fintech DS might need Date Picker and Stepper but not Avatar. The skill suggests defaults but defers to the user's actual inventory.

**Why flexible token architecture?** The textbook 3-tier approach (Primitives → Semantic → Component) works for large multi-brand systems. Single-brand systems or existing files often use flat domain-based collections. Forcing a restructure wastes time and breaks existing bindings.

## Customization

Fork and adapt to your needs. Common changes:

- **Different core components:** Edit the component list in `SKILL.md` Phase 4a and add specs to `references/component-spec.md`
- **Different spacing scale:** Edit the defaults in `references/token-taxonomy.md`
- **Company-specific naming:** Edit `references/naming-conventions.md` to match your conventions
- **Single framework:** Remove irrelevant sections from `references/framework-mappings.md`

## Related skills

| Skill | When to use instead |
|-------|---------------------|
| `figma-generate-library` | Official Figma skill with a similar workflow, tightly integrated with Figma's own tooling |
| `figma-generate-design` | Building screens FROM a design system (not building the system itself) |
| `figma-implement-design` | Generating code FROM Figma designs |
| `figma-create-design-system-rules` | Creating CLAUDE.md rules for an existing system |
| `figma-code-connect-components` | Linking Figma components to code via Code Connect |

## Resources

- [Figma: Create skills for the MCP server](https://developers.figma.com/docs/figma-mcp-server/create-skills/)
- [Figma: Skills for MCP](https://help.figma.com/hc/en-us/articles/39166810751895-Figma-skills-for-MCP)
- [Figma MCP server guide (GitHub)](https://github.com/figma/mcp-server-guide)
- [How to build a design system in Figma (2026)](https://muz.li/blog/how-to-build-a-design-system-in-figma-a-practical-guide-2026/)

## License

MIT — see [LICENSE](LICENSE).
