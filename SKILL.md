---
name: generate-design-system
description: "Generates a complete design system in Figma — variables, tokens, text styles, components with variants and Auto Layout — following a 5-phase workflow. Use when the user says 'create design system', 'build DS in Figma', 'generate component library', 'set up tokens in Figma', 'create variables and components', or wants to push a design system from code to Figma. Works both from scratch (standalone) and from an existing codebase. Does NOT implement Figma designs as code — use figma-implement-design for that. Does NOT create individual screens — use figma-generate-design for that."
compatibility: Requires the figma-use skill to be installed. Requires Figma MCP server (remote) connected.
metadata:
  mcp-server: figma
  version: 1.0.0
---

# Generate design system in Figma

Creates or updates a complete design system in a Figma file using a structured 5-phase workflow: Discovery → Foundations → File Structure → Components → QA. Supports both standalone creation and syncing from an existing codebase.

**Always pass `skillNames: "generate-design-system"` when calling `use_figma` as part of this skill.** This is a logging parameter — it does not affect execution.

## Prerequisites

**You MUST invoke the `figma-use` skill (Skill tool: `skill: "figma-use"`) before every `use_figma` call.** It contains critical Plugin API rules, gotchas, and script templates. Never call `use_figma` without it.

IMPORTANT: Before working with design systems in Figma, load the `working-with-design-systems/wwds.md` reference from the figma-use skill to understand key concepts and guidelines.

## Skill boundaries

**This skill does:**
- Create Variable Collections (Primitives, Semantic, Component-level)
- Set up Light/Dark modes (and multi-brand modes)
- Build Text Styles and Effect Styles
- Generate components with variants, Auto Layout, and variable bindings
- Organize the Figma file with standard page structure
- Validate output with screenshots and metadata checks

**This skill does NOT:**
- Generate code from Figma designs → use `figma-implement-design`
- Build full-page screens from components → use `figma-generate-design`
- Create Code Connect mappings → use `figma-code-connect-components`
- Write agent rule files (CLAUDE.md) → use `figma-create-design-system-rules`

If the user asks for something outside these boundaries, say so and redirect to the appropriate skill.

## When to use

- Creating a new design system in Figma from scratch
- Syncing tokens and components from an existing codebase into Figma
- Rebuilding or migrating a legacy Figma library to use Variables
- Setting up a multi-brand or multi-theme token architecture
- Standardizing an existing Figma file's components to match code conventions

## Instructions

Work through the five phases below in order. **Pause for user review between each phase** — confirm the user is satisfied before moving to the next phase. Each phase should produce visible, verifiable output in the Figma file.

IMPORTANT: Work incrementally in small steps. Break large operations into multiple `use_figma` calls. Validate after each step. This is the single most important practice for avoiding bugs.

---

### Phase 1: Discovery

**Goal:** Understand what exists and what needs to be built. Confirm scope with the user before creating anything.

#### 1a. Determine the source

Ask the user:
- **From scratch:** What is the product? What brand colors, typography, and spacing values should be used? Is there a reference (Figma file, website, brand guidelines)?
- **From codebase:** Where are the tokens defined? (e.g., `tailwind.config.js`, `tokens.css`, `theme.ts`, design-tokens JSON). Where are the components? (e.g., `src/components/ui/`)

#### 1b. If syncing from code — analyze the codebase

Scan for:
- Token files: CSS variables, Tailwind config, JSON token files, styled-components theme
- Component inventory: list all UI components, their props/variants, file paths
- Naming conventions: PascalCase vs kebab-case, variant naming patterns
- Framework: React, Vue, Svelte, Angular, or other

Read `references/framework-mappings.md` for framework-specific extraction patterns.

#### 1c. If a Figma file already exists — inspect it

Run a read-only `use_figma` call to audit the current state:
- Existing Variable Collections and their structure
- Existing components and their naming patterns
- Page structure
- Any published styles

Return results and present to the user.

#### 1d. Confirm scope

Present the user with a summary:
- Token categories to create (colors, spacing, radius, typography, shadows, etc.)
- Number of modes (Light/Dark, brands)
- Component list (prioritized — core first, extended later)
- Target naming convention

**Do not proceed until the user confirms.**

---

### Phase 2: Foundations

**Goal:** Create Variable Collections, Text Styles, and Effect Styles. This is the token layer — no components yet.

Read `references/token-taxonomy.md` before starting this phase.

#### 2a. Create Variable Collections

Create three collections following the 3-tier architecture:

**Collection 1: Primitives**
- Raw color values (e.g., `blue-50` through `blue-900`, `gray-50` through `gray-900`)
- Raw spacing values (e.g., `0`, `1`, `2`, `4`, `8`, `12`, `16`, `20`, `24`, `32`, `48`, `64`)
- Raw radius values (e.g., `none`, `sm`, `md`, `lg`, `xl`, `full`)
- Raw font sizes, line heights, font weights
- Set explicit scopes on every variable — never leave ALL_SCOPES:
  - Color primitives: `["FRAME_FILL", "SHAPE_FILL", "STROKE_COLOR", "TEXT_FILL"]`
  - Spacing primitives: `["GAP", "WIDTH_HEIGHT"]`
  - Radius primitives: `["CORNER_RADIUS"]`

**Collection 2: Semantic**
- Purpose-based aliases that reference Primitives
- Two modes minimum: `Light` and `Dark`
- Categories: `color/background/*`, `color/text/*`, `color/border/*`, `color/interactive/*`, `color/status/*`
- Spacing: `space/xs` through `space/3xl` → reference Primitive values
- Radius: `radius/component`, `radius/card`, `radius/input`, `radius/button`
- IMPORTANT: Components will bind ONLY to Semantic tokens, never directly to Primitives

**Collection 3: Component (optional, for complex systems)**
- Component-specific tokens that reference Semantic tokens
- Example: `button/primary/bg` → `color/interactive/primary`, `card/padding` → `space/md`
- Only create this collection if the design system has 15+ components

Validate after creating each collection:
- Call `get_metadata` to verify collection names, variable counts, and modes
- Call `get_screenshot` to spot-check the Variables panel

#### 2b. Create Text Styles

- Map to the typography scale: Display, Heading 1–4, Body Large, Body, Body Small, Caption, Overline
- Each style uses Semantic font-size and line-height variables where possible
- Load fonts with `figma.loadFontAsync()` before any text operations

#### 2c. Create Effect Styles (if applicable)

- Shadow scale: `shadow/sm`, `shadow/md`, `shadow/lg`, `shadow/xl`
- Blur effects if needed

**Pause for user review. Show a summary of all tokens created.**

---

### Phase 3: File structure

**Goal:** Set up the standard page layout for the design system file.

Create these pages in order:

1. **Cover** — Title, version, last updated date, status badge
2. **Getting Started** — Brief usage guide for consumers of the library
3. **Foundations** — Documentation frames:
   - Color swatches (render all Semantic color tokens as labeled rectangles)
   - Typography specimens (render each Text Style with sample text)
   - Spacing scale visualization
   - Radius visualization
   - Shadow samples
4. **Components** — Empty page (populated in Phase 4)
5. **Patterns** (optional) — Common layouts, form patterns
6. **Utilities** (optional) — Dividers, spacers, status dots

IMPORTANT: Use `await figma.setCurrentPageAsync(page)` when switching pages. The sync setter does NOT work.

Build each documentation frame using Auto Layout and bind all values to the Semantic variables — no hardcoded colors or spacing.

**Pause for user review. Take a screenshot of each page.**

---

### Phase 4: Components

**Goal:** Build each component with variants, states, Auto Layout, and variable bindings.

Read `references/component-spec.md` before starting this phase.

#### 4a. Determine component order

Start with the core 10 (in this order):
1. Button
2. Input
3. Select
4. Checkbox
5. Radio
6. Badge
7. Avatar
8. Card
9. Modal / Dialog
10. Toast / Notification

Then add extended components based on user needs.

#### 4b. Build each component

For EACH component, follow this sequence:

**Step 1: Create the base component (private, prefixed with `.` or `_`)**
- Contains the core structure and Auto Layout
- All fills, strokes, spacing, radius, and text use Semantic (or Component) variables
- Never hardcode values

**Step 2: Define variant properties**
- Match code prop naming: `Type`, `Size`, `State` (or `variant`, `size`, `state` — align with the codebase)
- Read `references/naming-conventions.md` for the mapping table

**Step 3: Build all states**
Start with states, not just the default:
- Default, Hover, Active/Pressed, Focused, Disabled
- For inputs: Empty, Filled, Error, Success
- For toast: Info, Warning, Error, Success
- Loading state where applicable

**Step 4: Create the Component Set**
- Combine variants into a Component Set
- Verify naming: `Type=Primary, Size=Medium, State=Default` in Figma should correspond to `<Button variant="primary" size="md" />` in code

**Step 5: Validate this component**
- `get_screenshot` — check visual correctness, look for clipped text and overlapping elements
- `get_metadata` — verify variant count, hierarchy, Auto Layout structure
- If issues found: fix targeted parts only, don't recreate from scratch

**Step 6: Move to next component**

IMPORTANT: Do NOT build all components in a single `use_figma` call. Build one component (or one variant set) per call, validate, then proceed.

**Pause for user review after every 3–4 components.**

---

### Phase 5: Integration and QA

**Goal:** Final validation, cleanup, and optional Code Connect setup.

#### 5a. Full audit

Run a comprehensive check:
- All components use Auto Layout (no absolute positioning except icons)
- All fills/strokes reference variables (no raw hex values)
- All text uses Text Styles
- All spacing uses spacing variables
- Naming is consistent (check `references/naming-conventions.md`)
- Light/Dark mode toggle produces correct results for all components

#### 5b. Test a full page

Create one sample page (e.g., a Settings screen or Dashboard card) using ONLY components from the system. This validates that the components compose well together.

#### 5c. Code Connect (optional)

If the user has a codebase and wants Code Connect:
- Suggest switching to `figma-code-connect-components` skill
- Provide the component-to-file mapping table from Discovery phase

#### 5d. Generate design system rules (optional)

If the user wants to set up agent rules:
- Suggest switching to `figma-create-design-system-rules` skill
- Pass the token paths, component paths, and naming conventions discovered

#### 5e. Final summary

Present to the user:
- Total Variable Collections and variable count
- Total Text Styles and Effect Styles
- Total components and variant count
- Pages created
- Any known gaps or TODO items
- Checklist status (see below)

### v1 completeness checklist

- [ ] Token architecture: Primitive → Semantic minimum
- [ ] Core colors, spacing, radius, typography as Figma Variables
- [ ] Light and Dark modes configured and tested
- [ ] 10 core components built with Auto Layout
- [ ] All components bound to Semantic variables (no hardcoded values)
- [ ] Naming convention documented and consistent
- [ ] At least one full page assembled from system components only
- [ ] All variants include all required states

---

## Examples

**Example 1: From scratch**

User says: "Create a design system for my SaaS product. Brand color is #6366F1 (indigo), secondary #10B981 (emerald). Use Inter font."

**Actions:**
1. Discovery: Confirm color palette, spacing scale (default 4px base), component list
2. Foundations: Create Primitives (indigo scale, emerald scale, neutral scale), Semantic (light/dark), Text Styles (Inter)
3. File Structure: Cover, Getting Started, Foundations (with swatches), Components
4. Components: Build core 10 starting with Button
5. QA: Audit, test page, summary

**Example 2: From codebase**

User says: "Sync our React component library to Figma. Tokens are in `tailwind.config.js`, components in `src/components/ui/`."

**Actions:**
1. Discovery: Read `tailwind.config.js` for color/spacing/radius tokens. Scan `src/components/ui/` for component inventory and props.
2. Foundations: Map Tailwind tokens to Figma Variables (Primitives = Tailwind values, Semantic = Tailwind's semantic aliases)
3. File Structure: Standard pages
4. Components: Build each component matching React props → Figma variants
5. QA: Validate naming parity, test page, suggest Code Connect

---

## Common edge cases

**Missing font:** If `figma.loadFontAsync()` fails, call `figma.listAvailableFontsAsync()` to find available alternatives. Fall back to "Inter" as the default.

**Token conflicts:** If codebase tokens use different naming than Figma conventions (e.g., `$gray-100` vs `gray/100`), document the mapping in a comment and follow the Figma `/`-separated convention for variable names.

**Existing components in the file:** If the file already has components, inspect their structure first. Update in place where possible rather than recreating — this preserves instance overrides.

**Too many variants:** If a component would have 50+ variant combinations, break it into a base component and composed components (e.g., `_ButtonBase` + `IconButton`, `ButtonGroup`).

**Mode mismatch:** If the codebase uses 3+ themes (e.g., Light, Dark, High Contrast), create all modes in the Semantic collection upfront. Don't add modes retroactively — it creates empty values.

**Large file performance:** Keep each `use_figma` call focused on one task. If creating 100+ variables, batch them in groups of 20–30 per call.

---

## Error recovery

On any `use_figma` error:
1. **STOP.** Do not immediately retry.
2. Read the error message carefully.
3. Call `get_metadata` to understand current file state.
4. Fix the root cause in your script.
5. Retry the corrected script.
6. After success, call `get_screenshot` to verify visual correctness.

For the full error recovery workflow, load `figma-use` (Skill tool: `skill: "figma-use"`) and see its validation-and-recovery reference.
