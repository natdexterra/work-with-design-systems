---
name: work-with-design-systems
description: >
  Inspect, build, or extend Figma design systems — and optionally sync them to
  code. Two modes in one skill: inspect mode (read-only audits with WCAG checks,
  component scoring, detached instance detection, handoff docs) and build mode
  (creating components with variable bindings, slot-based composition, structured
  descriptions, validation, and optional export of tokens.css + AI rules to
  the user's codebase).
  Use when the user says 'audit my design system', 'check component quality',
  'create design system', 'build DS in Figma', 'generate component library',
  'add slots to my components', 'sync design tokens from code', 'find detached
  instances', 'check WCAG compliance', 'export tokens to code', 'generate
  CLAUDE.md for design system', or wants to push a design system from code to
  Figma or back. The skill auto-detects the mode from request, or asks if unclear.
  After inspect, ALWAYS pauses and waits for explicit user decision before any
  build action. Phase 6 (sync to code) is OFF by default — only triggers on
  explicit user request.
  Does NOT implement Figma designs as code — use figma-implement-design for that.
  Does NOT create individual screens — use figma-generate-design for that.
compatibility: >
  Requires the figma-use skill to be installed. Requires Figma MCP server (remote)
  connected. Phase 6 (sync to code) requires file write access to the user's
  project — available in Claude Code, Cursor, Codex, and similar MCP clients.
  Not available when running in Claude.ai web/mobile chat (in that case Phase 6
  outputs file contents inline for the user to copy).
metadata:
  mcp-server: figma
  version: 2.0.1
---

# Work with design systems in Figma

Two modes in one skill: **inspect** (read-only quality audits with reports) and **build** (creating, fixing, extending components and tokens). Inspect produces structured reports. Build produces working Figma files. Build mode optionally extends to **Phase 6 (sync to code)** — generates `tokens.css`, an audit script, and AI rules file for the user's codebase. Phase 6 is off by default and only triggers on explicit user request.

Between inspect and build, the skill always pauses for the user to decide what to do with the report.

**Always pass `skillNames: "work-with-design-systems"` when calling `use_figma` as part of this skill.** This is a logging parameter — it does not affect execution.

## Prerequisites

**You MUST invoke the `figma-use` skill (Skill tool: `skill: "figma-use"`) before every `use_figma` call.** It contains critical Plugin API rules, gotchas, and script templates. Never call `use_figma` without it.

IMPORTANT: Before working with design systems in Figma, load the `working-with-design-systems/wwds.md` reference from the figma-use skill to understand key concepts and guidelines.

## Critical rules

These apply to BOTH modes — inspect and build.

1. **Work incrementally.** One component (or one variant set) per `use_figma` call. Validate after each step. This is the single most important practice for avoiding bugs.
2. **Never build on unvalidated work.** After every `use_figma` call that creates or modifies something, run `get_metadata` + `get_screenshot` before the next creation step.
3. **Bind visual properties to variables when a scale value exists.** Fills, strokes, padding, itemSpacing, corner radius. For component-specific dimensions that don't match any scale value (e.g., 3px internal padding on a toggle track, 1px divider offset), hardcoded values are acceptable — document these exceptions in the component description.
4. **lineHeight variables must store pixel values, not percentages.** Figma variables are unitless. When bound to lineHeight, the value is interpreted as pixels. If your DS defines line heights as percentages (e.g., 150%), convert before storing: fontSize × (percentage / 100). Text styles can store {unit: "PERCENT", value: 150} — variables cannot.
5. **Set codeSyntax.WEB on every variable.** Without it, agents using `get_design_context` get raw Figma variable names instead of CSS token names. Set during creation, not as a separate pass.
6. **Set explicit variable scopes.** Never leave ALL_SCOPES. Background colors get FRAME_FILL + SHAPE_FILL. Text colors get TEXT_FILL. Spacing gets GAP + WIDTH_HEIGHT. Radius gets CORNER_RADIUS. Font size gets FONT_SIZE.
7. **TEXT properties with the same name merge across variants.** If two variants both define `addComponentProperty("Label", "TEXT", ...)`, they become ONE shared property on the component set with one default value. For different defaults per variant: use different property names, leave text as direct content with instance text overrides, or accept the shared default.
8. **TEXT component properties on every customizable text node.** Without them, label overrides ("Label" → "Submit") revert on component update. Every customizable text node needs `componentPropertyReferences = { characters: key }`.
9. **Use slots for compound components.** Compound components (Card, Modal, Dialog, ListItem, ReviewCard) that contain variable inner content MUST use named slots instead of detach patterns or text-only props. Without slots, agents and users detach the component to edit inner content, which breaks maintenance and the agent's ability to reason about composition. Slots are available in Figma as of March 2026. See `references/build/slots-guide.md`.
10. **Every public component MUST have a structured description.** Figma MCP reads component descriptions and passes them to agents as context. Missing descriptions force the agent to guess purpose, behavior, and composition. Use the template in `references/build/component-description-template.md`. Private base components (prefixed with `.` or `_`) may use a one-line note.
11. **Never detach a component.** If you need to vary inner content, use: variant, boolean property, instance swap, or named slot. Detaching breaks the design-to-code bridge — the detached frame becomes structurally invisible to agents and to inspect mode.

---

## Mode selection

The skill operates in one of two modes. The first thing to do in any session is determine the mode.

**Inspect mode** triggers when the user says:
- "audit my design system" / "check component quality" / "review my DS"
- "find detached instances" / "check WCAG" / "score my components"
- "generate handoff docs" / "export component specs"
- "is this design system ready" / "what's broken in my file"
- Any request that asks for a report or evaluation without explicit "build" or "fix"

**Build mode** triggers when the user says:
- "create design system" / "build DS in Figma" / "generate component library"
- "set up tokens" / "add components" / "sync from code"
- "fix ALL_SCOPES" / "add codeSyntax" / "rebuild Variables"
- "add slots to my components" / "write descriptions"
- "export tokens.css" / "generate CLAUDE.md" / "sync to code" (these enter build mode and proceed directly to Phase 6 if rest of system is in good shape)
- Any request that asks for changes to the file or codebase

**Ambiguous requests** like "I have a Figma file with some issues — help me with my design system" — ASK the user explicitly:

> Should I run a quality audit first (read-only report with scores and issues), or go straight to building/fixing? If you want both, I'll do inspect first, show you the report, then wait for your decision before changing anything.

**Default behavior when explicitly mixed** ("audit and fix"): start with inspect mode, produce report, pause, wait for user direction.

---

## Inspect mode

Read-only. Never modifies the file. Produces structured reports.

Read `references/inspect/overview.md` before starting. It documents which modules to run for which user requests, the execution order, and the readiness scoring formula.

### Inspect workflow

1. **Scope.** Ask the user: full file or specific components? Which audit modules? Default is all six. Export format — markdown (default), JSON, both, or AI prompt.
2. **Inventory.** Run `scripts/inspect/inventory.js` to list all component sets with variant counts and page locations. Present as a table for user confirmation.
3. **Run modules** for each component set in this order:
   - Module 1 — Token compliance (`scripts/inspect/audit-tokens.js`) — outputs errors and warnings separately
   - Module 2 — Interactive states (`scripts/inspect/audit-states.js`)
   - Module 3 — Accessibility (`scripts/inspect/audit-accessibility.js`)
   - Module 4 — Detached instances (`scripts/inspect/audit-detached.js`) — runs once, file-wide
   - Module 5 — Naming quality (`scripts/inspect/audit-naming.js`)
   - Module 6 — Component descriptions (no script — uses Claude reasoning, read `references/inspect/component-descriptions.md`)
4. **Compile report** using templates from `references/inspect/report-templates.md`. Calculate weighted readiness score per component using the formula in `references/inspect/readiness-scoring.md` (errors weighted 1.0, warnings weighted 0.3).
5. **Export** report to `/mnt/user-data/outputs/audit-report.md` (and `.json` if requested).
6. **STOP.** Present report summary. Wait for user decision.

### Inspect → build handoff

After inspect, the skill MUST pause and present:

> Audit complete. Report saved to `audit-report.md`. Overall score: {score}/100.
>
> Top issues:
> 1. {highest_impact_issue}
> 2. {second_highest_impact_issue}
> 3. {third_highest_impact_issue}
>
> What would you like to do next?
> - **Fix issues** — switch to build mode and address findings (I'll work through the priority list)
> - **Fix specific issues** — tell me which to address (e.g., "fix only the ALL_SCOPES violations")
> - **Build new components** — switch to build mode for new work, leaving issues for later
> - **Stop** — keep the report for later, do nothing

DO NOT proceed to any build action without explicit user confirmation. This pause is the core guarantee of inspect mode.

---

## Build mode

Read/write. Creates, modifies, validates.

Read `references/build/component-spec.md` and `references/build/token-taxonomy.md` before starting Phase 2 (foundations) or Phase 4 (components). Read `references/build/slots-guide.md` before building any compound component. Read `references/build/auto-fix-guide.md` before running fuzzy auto-fix on existing components. Read `references/build/code-export.md` before entering Phase 6.

### Build workflow paths

**Full build** (no existing file): Phase 1 → 2 → 3 → 4 → 5 → (optional 6)

**Extend** (variables/styles exist, need components): Phase 1c (health check) → fix foundation issues → Phase 3 (file structure, if needed) → Phase 4 → Phase 5 → (optional 6)

**Fix foundations only**: Phase 1c → fix ALL_SCOPES/codeSyntax/unbound → stop

**Add slots to existing compound components**: Phase 1c → identify detach-prone components → Phase 4c (slot decision) → Phase 4 (build or update) → Phase 5

**Apply audit fixes — manual** (entry from inspect mode): user reviews report → confirms scope → enter build mode → execute fixes per priority list → Phase 5 verification → (optional 6)

**Apply audit fixes — fuzzy auto-fix** (entry from inspect mode, user opts in): user reviews report → requests "auto-fix the token issues" → Phase 1c health check (foundations must be valid) → run `scripts/build/fixHardcodedToTokens.js` with issues from inspect → review applied/skipped report with user → handle skipped items manually → Phase 5 verification → (optional 6)

**Code export only** (Figma file is solid, just need files in repo): Phase 1c (verify foundations OK) → skip 2/3/4/5 → Phase 6

### Phase 1: Discovery

#### 1a. Determine the source

Ask the user:
- **From scratch:** What's the product? Brand colors, typography, spacing? Reference (Figma file, website, brand guidelines)?
- **From codebase:** Where are tokens defined? (`tailwind.config.js`, `tokens.css`, `theme.ts`, design-tokens JSON). Where are components? (`src/components/ui/`)

Supported inputs for from-scratch builds:
- `.md` file with brand guidelines
- `.json` design tokens (W3C DTCG format, Tokens Studio format)
- Screenshots or URLs as visual references
- Verbal description of brand, colors, typography

#### 1b. If syncing from code — analyze the codebase

Scan for:
- Token files: CSS variables, Tailwind config, JSON token files, styled-components theme
- Component inventory: list all UI components, their props/variants, file paths
- Naming conventions: PascalCase vs kebab-case, variant naming patterns
- Framework: React, Vue, Svelte, Angular, or other
- **Storybook stories (if present):** Read `*.stories.{ts,tsx,js,jsx,mdx}` files. Each story = one Figma variant. Use story inventory to validate variant coverage in Phase 4. Missing variants on Figma side are as much a gap as missing stories on code side.

Read `references/build/framework-mappings.md` for framework-specific extraction patterns.

#### 1c. If a Figma file already exists — quick health check

Fast sanity check to build a state ledger and decide how to proceed. NOT a full audit — for that, switch to inspect mode.

Run `scripts/build/validate-design-system.js` via `use_figma`. Then targeted checks:
- Variable scopes (flag ALL_SCOPES violations)
- codeSyntax coverage (list variables missing codeSyntax.WEB)
- Duplicate variables
- Bindings sample via `get_metadata` on a few components, check `boundVariables` coverage
- Generic layer names (if >20% of layers in components are auto-named like `Frame 47`, suggest Figma's AI rename in Actions panel as a first pass)
- Detach patterns in compound components (flag for Phase 4c slot decision)

Recommend a path:
- **Build in place** — file has solid variables, components need fixes
- **New file, old as reference** — no variables, naming chaos, start fresh
- **Hybrid** — foundations solid, components need rebuild
- **Switch to inspect mode** — if user wants comprehensive audit before deciding
- **Code export only** — if Figma is solid and user just wants Phase 6 outputs

If foundations are complete, skip Phase 2.

#### 1d. Confirm scope

Present summary:
- Token categories (colors, spacing, radius, typography, shadows)
- Number of modes (Light/Dark, brands)
- Component list (prioritized — core first)
- Naming convention
- Component numbering convention (`C{section}.{number} {Name}`)
- CSS token naming for codeSyntax.WEB

**Do not proceed until user confirms.**

### Phase 2: Foundations

**Skip if Phase 1c confirmed all needed tokens exist and pass quality checks.**

Read `references/build/token-taxonomy.md` before starting.

#### 2a. Variable Collections

**Recommended:** 3-tier (Primitives → Semantic → Component). Best for multi-brand or new builds.

**Alternative:** flat domain-based (Colors, Spacing, Radius, Typography). Valid for single-brand or rebuilds where this structure exists.

Match what's in the file or codebase. The requirement is not depth — it's that every variable has explicit scopes and codeSyntax.WEB.

#### 2b. Text Styles and Effect Styles

Create text styles with proper variable bindings (font-size, line-height, font-weight, letter-spacing all bound to variables). Apply lineHeight gotcha (Critical Rule #4).

Create effect styles for shadows, blurs.

### Phase 3: File structure

**Skip if documentation pages aren't required.**

Standard pages: Cover, Getting Started, Foundations, one page per component group, Patterns (if applicable), Utilities.

Foundations page contains: rendered swatches for each color variable, type specimens for each text style, spacing scale visualization, effect previews.

Component pages use fixed-width (996px) wrapper structure:
- Wrapper: 996px wide, AUTO height
- Specs container: FILL width, AUTO height, padL/R=96, itemSpacing=64

Patterns page (if patterns documented) follows the same wrapper structure. Read `references/build/patterns-guide.md` for pattern frame conventions.

Create a reusable Page Title component on Utilities page. Each component page uses an instance, not a manual frame.

### Phase 4: Components

#### 4a. Confirm component list

Suggest defaults (Button, Input, Select, Checkbox, Radio, Toggle, Card, Modal, Badge, Avatar, Toast). User confirms based on actual inventory. Add or remove freely.

Read `references/build/component-spec.md` for default specs.

#### 4b. Build each component

One component per `use_figma` call. Validate after each.

Sequence per component:
1. Create base structure (component frame, variants, Auto Layout) via `use_figma` — patterns in `figma-use` skill's `working-with-design-systems/wwds.md` reference
2. Bind variables to fills, strokes, padding, item spacing, corner radius via `use_figma` — same reference
3. Add component properties (variants, booleans, instance swaps, TEXT properties)
4. Set spec wrapper frame (state labels as column headers, size labels as row labels)
5. **Write structured description** using `references/build/component-description-template.md` (Critical Rule #10)
6. Validate with `get_metadata` + `get_screenshot`

#### 4c. Slot decision (for compound components)

Before building Card, Modal, Dialog, ListItem, ReviewCard, or any component that hosts variable inner content — read `references/build/slots-guide.md` and decide:

1. **Variant** — for fixed appearance changes (size, type, state)
2. **Boolean property** — for visibility toggles (has icon, show divider)
3. **Instance swap** — for single predictable element changes (icon, avatar)
4. **Named slot** — for arbitrary user-provided content (card body, modal content)

When in doubt for compound components, prefer slots. Document the decision in the component description.

#### 4d. Patterns (optional)

If user wants composition patterns documented, read `references/build/patterns-guide.md`. Build pattern frames on the Patterns page using actual component instances arranged according to layout rules. Number patterns as `P{section}.{number} {Name}`.

### Phase 5: QA

Run `scripts/build/validate-design-system.js` for full file audit:
- All collections present
- No ALL_SCOPES violations
- All variables have codeSyntax.WEB
- No hardcoded fills in components
- All components have Auto Layout
- Light/Dark modes tested
- All public components have descriptions
- All compound components have slot decision documented

Build a test page assembling several components together to verify composability.

After QA passes, present this prompt to the user:

> Build complete. {N} components, {M} tokens, all validated.
>
> Want to sync to code? I can generate up to four files in your project:
> - `tokens.css` — design tokens with three-layer indirection (handles Light/Dark modes)
> - AI rules file — design system rules for the AI agent in this repo (Claude Code / Cursor / Codex)
> - `scripts/token-audit.js` — CI-ready audit script that catches hardcoded values
> - `specs/patterns/*.md` — optional composition spec files (Hardik Pandya-style)
>
> Reply with "yes, sync to code" to enter Phase 6, or "done" to stop here.

Do NOT enter Phase 6 unless user explicitly requests it.

### Phase 6: Sync to code (optional, OFF by default)

**Pre-condition:** This phase requires file write access to the user's project root. Available in Claude Code, Cursor, and other MCP clients with file write tools. NOT available when skill runs in Claude.ai web/mobile chat — in that case, output the file contents inline for the user to copy manually.

**When to enter Phase 6:**
- User explicitly asks: "and generate tokens.css", "create CLAUDE.md for this DS", "set up the audit script", "sync to code"
- User accepts the Phase 5 closing prompt with "yes, sync to code"
- User starts session with explicit Phase 6 intent (e.g., "my Figma DS is solid, just generate tokens.css and CLAUDE.md") — skill runs Phase 1c health check then jumps directly to Phase 6
- DO NOT enter Phase 6 automatically. Retrofit scenarios (slot retrofit, partial fixes, foundation-only fixes) should never trigger Phase 6.

Read `references/build/code-export.md` before starting Phase 6.

#### 6a. Format detection

Determine which AI agent client the project uses by checking the project root:
- `.claude/` directory or `CLAUDE.md` file exists → Claude Code
- `.cursor/` directory exists → Cursor
- `AGENTS.md` file exists → Codex
- None of the above → ask the user, or skip AI rules generation

If multiple are present, ask which the user wants. Skill can generate for multiple at once.

#### 6b. Output path resolution

**Important:** never overwrite an existing top-level `CLAUDE.md`, `AGENTS.md`, or full `.cursor/rules`. The skill writes to scoped locations:
- Claude Code → `.claude/rules/design-system.md`
- Cursor → `.cursor/rules/design-system.mdc`
- Codex → append a `## Design system` section to `AGENTS.md` between explicit start/end markers (`<!-- design-system-rules-start -->` / `<!-- design-system-rules-end -->`) for safe future updates

If the scoped path already has a file from a previous Phase 6 run, ask user: overwrite, append, or skip.

#### 6c. tokens.css strategy

Ask the user how Light/Dark modes should resolve in CSS:
- `[data-theme="dark"]` attribute on root — most flexible, requires JS to set
- `@media (prefers-color-scheme: dark)` — automatic, follows OS preference
- Both — explicit attribute wins, falls back to media query
- Single mode only — skip dark export

Multi-brand modes: use the same attribute pattern with brand-specific values (`[data-brand="acme"]`).

Read `references/build/code-export.md` for full structure with examples for each strategy.

#### 6d. Generate files

For each file, use Claude's file write tools (NOT `use_figma`). Generate:

1. **`tokens.css`** — call `scripts/build/exportTokensToCSS.js` via `use_figma` to read all variables and return structured token data. Then format into the chosen CSS strategy (from 6c) and write to disk via file write tools.

2. **AI rules file** — read template from `references/build/code-export.md` "AI rules templates" section. Fill in component list (from current build), token reference list, audit script reference. Write to scoped path determined in 6b.

3. **`scripts/token-audit.js`** — read template from `references/build/code-export.md` "Audit script template" section. Fill in TOKENS object with token names and raw values from current build. Write to project's scripts directory (create if missing).

4. **(Optional) `specs/patterns/*.md`** — only if user explicitly asks ("also generate spec files for patterns"). One markdown file per pattern documented in Phase 4d. Use template from `references/build/code-export.md`.

If running in Claude.ai web (no file write tools), output each file's contents in fenced code blocks with clear "save as: {path}" headers.

#### 6e. Verify

After writing files:
- If Node is available in the environment, run `node scripts/token-audit.js` and report results
- Note: if the project's existing CSS has hardcoded values, audit will flag them — that's expected on first run and tells the user where to apply tokens
- Confirm AI rules file is at correct scoped path (not overwriting top-level files)

Report file paths to user. Phase 6 complete.

---

## Examples

**Example 1: Pure inspect — quality report on someone else's file**

User: "Audit this Figma file — I'm reviewing it for a client engagement."

Mode: Inspect.

1. Scope: full file, all six modules, markdown export
2. Inventory: 23 component sets across 5 pages
3. Run all modules per component
4. Compile report with scores
5. Export to audit-report.md
6. STOP. Present summary, wait for user decision.

**Example 2: Pure build — new design system from scratch**

User: "Create a design system for a fintech app. Brand color #6366F1 (indigo). Inter font. Light + Dark modes."

Mode: Build, full build path. Phase 6 not requested.

1. Discovery: Confirm specs with user
2. Foundations: 3-tier variables, Light/Dark modes, text styles
3. File structure: standard pages
4. Components: build core 10 with slots for Card and Modal
5. QA: validation script, test page
6. Phase 5 closing prompt: user replies "done"

**Example 3: Inspect → build (most common paired flow)**

User: "I have a 6-month-old Figma file. Need to figure out what's broken and fix what's worth fixing."

Mode: Inspect first.

1. Inspect mode: full audit, all modules
2. Report shows: 3 ALL_SCOPES violations, 12 variables missing codeSyntax, Toggle missing Focused state, Card has 7 detached instances in example frames
3. STOP. Present report.
4. User decides: "Fix the variable issues and add slots to Card. Skip the Toggle for now."
5. Mode switches to Build, scoped to user's selection
6. Build mode Phase 1c (skip — already audited): proceed directly to fixes
7. Fix ALL_SCOPES, add codeSyntax.WEB
8. Phase 4c slot decision for Card: Leading, Body, Footer slots
9. Update Card component in place with slots, write description
10. Phase 5 verification: run scripts/build/validate-design-system.js

**Example 4: Build mode — extending existing file**

User: "Variables and text styles are set up. Need to build 7 components with proper bindings."

Mode: Build, extend path.

1. Phase 1c health check on variables (verify quality)
2. Skip Phase 2 (foundations exist)
3. Skip Phase 3 (file structure exists)
4. Phase 4: build each of 7 components, including slot decision for compound ones
5. Phase 5: verify

**Example 5: Build mode — slot retrofit**

User: "Our Card component keeps getting detached because users need different inner content. Add slots to it."

Mode: Build, slot retrofit path. Phase 6 NOT triggered (retrofit is excluded from Phase 6 default offer).

1. Read current Card via `get_metadata`
2. Phase 4c: slot decision (Leading, Body, Footer typical)
3. Update Card in place, preserve variants and booleans
4. Update component description to document slots
5. Verify existing instances don't break

**Example 6: Inspect mode — narrow scope**

User: "Just check WCAG compliance on Button and Input."

Mode: Inspect, narrow scope.

1. Skip inventory (user specified components)
2. Run only Module 3 (Accessibility) on Button and Input
3. Report: contrast ratios, touch targets, font sizes, focus indicators
4. List specific WCAG criteria pass/fail
5. STOP.

**Example 7: Build → Phase 6 (end-to-end)**

User: "Create a design system for fintech app, indigo primary, Inter, Light+Dark — and generate tokens.css and CLAUDE.md when done."

Mode: Build, full build path with explicit Phase 6 request.

1. Phases 1-5 same as Example 2
2. After QA passes, skip Phase 5 closing prompt (user already opted in)
3. Phase 6a: detect `.claude/` dir → Claude Code client
4. Phase 6b: target `.claude/rules/design-system.md`
5. Phase 6c: ask user — "Light/Dark strategy?" → user picks "both (attribute + media query)"
6. Phase 6d: run exportTokensToCSS.js, format three-layer tokens.css with both strategies, write
7. Phase 6d: write `.claude/rules/design-system.md` with component list and token list
8. Phase 6d: write `scripts/token-audit.js` with TOKENS filled from build
9. Phase 6e: run audit on existing project CSS → reports hardcoded values for user to address

**Example 8: Code export only**

User: "My Figma DS is solid. Just generate tokens.css and CLAUDE.md for my repo."

Mode: Build, code export only path.

1. Phase 1c health check: verify variables have scopes and codeSyntax (Phase 6 needs this)
2. If health check fails: pause, recommend fixing foundations first
3. If health check passes: skip Phases 2-5 entirely
4. Phase 6: run as in Example 7

---

## Common edge cases

**Mode unclear:** ASK the user. Don't guess. If their request mentions "fix" or "build" — build mode. If "check" or "audit" — inspect. If both — inspect first, then pause.

**User wants to skip inspect → build pause:** They can say "audit and immediately fix everything in priority order." Allowed, but always create the report file first so they have a record. Never silently chain.

**Phase 6 in Claude.ai web (no file tools):** Detect environment by attempting file write capability check. If unavailable, switch to inline output mode — print each generated file's contents in a fenced code block with a clear "Save as: `path/to/file`" header. Do NOT silently fail.

**Phase 6 with existing scoped file:** If `.claude/rules/design-system.md` already exists from previous run, ask user: overwrite, merge (skill diffs), or skip. Default to ask.

**Phase 6 with corrupt or partial Figma DS:** Phase 1c MUST pass before Phase 6. If foundations have ALL_SCOPES violations or missing codeSyntax, refuse Phase 6 and recommend fixing foundations first. Generated tokens.css would be useless without proper codeSyntax.

**Missing font:** If `figma.loadFontAsync()` fails, call `figma.listAvailableFontsAsync()` for alternatives. Fall back to "Inter".

**Token conflicts:** If codebase uses different naming than Figma conventions ($gray-100 vs gray/100), document the mapping and follow Figma /-separated convention.

**Existing components in build mode:** Inspect first to avoid duplicate work. Update in place where possible to preserve instance overrides.

**Too many variants:** Break component into base + composed (e.g., `_ButtonBase` + `IconButton`).

**Mode mismatch (3+ themes):** Create all modes upfront in Semantic collection. Don't add retroactively.

**Large file performance:** One task per `use_figma` call. Batch variables in groups of 20–30.

**Slot API not available:** If Plugin API doesn't expose slot creation in current version, fall back to documented boolean + instance swap pattern. Document in component description that this will migrate to slots when API support lands. Never detach as workaround.

**Legacy components without descriptions:** When extending a file where existing components lack descriptions, do NOT overwrite silently. Present user with list, ask before adding. Offer batch mode for large files.

**Storybook stories not matching variants:** When codebase has Storybook stories that don't map 1:1 to Figma variants (either direction), list mismatches in Phase 1b. Resolve with user before Phase 4.

**Component-specific dimensions:** Critical Rule #3 allows hardcoded values for dimensions outside the spacing scale. Document in description.

**Numbering divergence:** When rebuilding, plan numbers may differ from existing Figma names. Document mapping (e.g., plan "C2.2 Toggle" → Figma "C4.0 Toggle").

---

## Error recovery

On any `use_figma` error:
1. Stop. Do not retry immediately.
2. Read the error message.
3. Call `get_metadata` to understand current file state.
4. Fix the root cause in the script.
5. Retry.

For full error recovery workflow, load `figma-use` skill.

On Phase 6 file write errors:
1. Stop. Report which file failed and why (permission, missing directory, conflict).
2. Do not partially write — leave already-written files in place but stop generation.
3. Present error to user with options (fix permissions, skip file, retry, abort Phase 6).
