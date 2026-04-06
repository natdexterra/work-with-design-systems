---
name: generate-design-system
description: >
  Build or extend design systems in Figma — create components with proper variable bindings,
  validate token coverage, and enforce quality patterns following a structured phased workflow.
  Use when the user says 'create design system', 'build DS in Figma', 'generate component library',
  'set up tokens in Figma', 'create variables and components', 'audit my design system',
  or wants to push a design system from code to Figma.
  Also use when creating components in a file that already has variables and text styles —
  the skill ensures proper binding, per-component validation, and spec documentation.
  Works from scratch, from an existing codebase, or by auditing and extending an existing Figma file.
  Does NOT implement Figma designs as code — use figma-implement-design for that.
  Does NOT create individual screens — use figma-generate-design for that.
compatibility: >
  Requires the figma-use skill to be installed. Requires Figma MCP server (remote) connected.
metadata:
  mcp-server: figma
  version: 1.2.0
---

# Generate design system in Figma

Creates, extends, or updates a design system in a Figma file using a structured phased workflow. Supports three paths: full build from scratch, syncing from a codebase, and extending an existing file that already has variables/styles. The skill ensures proper variable bindings, per-component validation, and consistent spec documentation regardless of the starting point.

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
- Audit existing files for quality issues and fix them
- Add components to a file where foundations (variables, text styles) already exist

**This skill does NOT:**

- Generate code from Figma designs → use `figma-implement-design`
- Build full-page screens from components → use `figma-generate-design`
- Create Code Connect mappings → use `figma-code-connect-components`
- Write agent rule files (CLAUDE.md) → use `figma-create-design-system-rules`

If the user asks for something outside these boundaries, say so and redirect to the appropriate skill.

## When to use

- Creating a new design system in Figma from scratch
- Syncing tokens and components from an existing codebase into Figma
- **Creating components in a file where variables and text styles already exist** — the skill ensures proper binding, validation, and documentation even when foundations are done
- Auditing an existing Figma file for quality issues (ALL_SCOPES, missing codeSyntax, hardcoded values)
- Rebuilding or migrating a legacy Figma library to use Variables
- Setting up a multi-brand or multi-theme token architecture
- Standardizing an existing Figma file's components to match code conventions

## Critical rules

These apply across all phases and all workflow paths.

1. **Work incrementally.** One component (or one variant set) per `use_figma` call. Validate after each step. This is the single most important practice for avoiding bugs.
2. **Never build on unvalidated work.** After every `use_figma` call that creates or modifies something, run `get_metadata` + `get_screenshot` before the next creation step.
3. **Bind visual properties to variables:** fills, strokes, padding, itemSpacing, corner radius. Bind spacing to variables when a value exists in the spacing scale. For component-specific dimensions that don't match any scale value (e.g., 3px internal padding on a toggle track, 1px divider offset), hardcoded values are acceptable — document these exceptions in the component's description.
4. **lineHeight variables must store pixel values, not percentages.** Figma variables are unitless numbers. When bound to `lineHeight`, the value is always interpreted as pixels. If your design system defines line heights as percentages (e.g., 150%), convert before storing: `fontSize × (percentage / 100)`. Text styles (created via `figma.createTextStyle()`) can store `{unit: "PERCENT", value: 150}` — but variables cannot.
5. **Set `codeSyntax.WEB` on every variable at creation time.** Without it, `get_design_context` returns raw Figma variable names instead of CSS tokens, breaking the design-to-code bridge.
6. **Set explicit scopes on every variable.** Never leave ALL_SCOPES.
7. **TEXT properties with the same name merge across variants.** If two variants both define `addComponentProperty("Label", "TEXT", ...)`, they become ONE shared property on the component set with one default value. For different defaults per variant: (a) use different property names, (b) leave text as direct content with instance text overrides, or (c) accept the shared default.
8. **Every customizable text node needs a TEXT component property** linked via `componentPropertyReferences = { characters: key }`. Without it, label overrides revert on component update.

## Instructions

### Workflow paths

Choose the path that matches the starting point:

**Full build** (no existing file): Phase 1 → 2 → 3 → 4 → 5

**Extend** (variables/styles exist, need components): Phase 1c (audit) → fix issues → Phase 3 (if needed) → Phase 4 → Phase 5

**Audit only**: Phase 1c → report → stop

When foundations already exist, run Phase 1c to build the state ledger. Skip Phase 2 if all needed tokens exist and pass audit. Skip Phase 3 if documentation pages aren't required or already exist. Proceed to Phase 4 with mandatory per-component validation.

---

### Phase 1: Discovery

**Goal:** Understand what exists and what needs to be built. Confirm scope with the user before creating anything.

#### 1a. Determine the source

Ask the user:

- **From scratch:** What is the product? What brand colors, typography, and spacing values should be used? Is there a reference (Figma file, website, brand guidelines)?
- **From codebase:** Where are the tokens defined? (e.g., `tailwind.config.js`, `tokens.css`, `theme.ts`, design-tokens JSON). Where are the components? (e.g., `src/components/ui/`)

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

Read `references/framework-mappings.md` for framework-specific extraction patterns.

#### 1c. If a Figma file already exists — audit it

Run `scripts/validate-design-system.js` via `use_figma` to get a structured report, then supplement with targeted checks:

- **Variables:** List all collections, variable counts, and modes. Flag `ALL_SCOPES` violations and suggest specific scopes per variable type.
- **codeSyntax:** Check WEB coverage — list variables that lack `codeSyntax.WEB` (these break the design-to-code bridge).
- **Duplicate variables:** Flag variables with identical values but different names.
- **Bindings:** Sample component sets — count bound vs unbound fills/strokes/spacing. Use the audit pattern from `scripts/auditComponentBindings.js` (or embed inline):

```js
// Audit a component set for variable binding coverage
const cs = figma.getNodeById(COMPONENT_SET_ID);
let bound = 0, hardcoded = 0;

for (const variant of cs.children) {
  for (const node of [variant, ...variant.findAll(() => true)]) {
    const bindings = node.boundVariables || {};

    // Check fills
    if (node.fills?.length > 0 && node.fills[0].type === 'SOLID' && node.fills[0].visible !== false) {
      if (bindings.fills?.length > 0) bound++;
      else hardcoded++;
    }

    // Check strokes
    if (node.strokes?.length > 0 && node.strokes[0].type === 'SOLID' && node.strokes[0].visible !== false) {
      if (bindings.strokes?.length > 0) bound++;
      else hardcoded++;
    }

    // Check spacing
    for (const prop of ['itemSpacing', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']) {
      if (node[prop] > 0) {
        if (bindings[prop]) bound++;
        // Not all spacing needs binding — see Critical Rule #3
      }
    }

    // Check text styles
    if (node.type === 'TEXT' && (!node.textStyleId || node.textStyleId === '')) {
      // Flag: text node without text style
    }
  }
}

return { bound, hardcoded, ratio: `${bound}/${bound + hardcoded}` };
```

- **Text styles:** Check for missing variable bindings in text styles.
- **Text nodes:** Flag text nodes inside components that lack TEXT component properties (overrides will be lost on update).
- **Components:** List existing components and their naming patterns.
- **Page structure:** List pages and their organization.

Present the audit report to the user with a severity summary (errors vs warnings).

**Based on audit results, recommend a path:**
- **Build in place** — file has solid variable structure, components need fixes but not recreation
- **New file, old as reference** — no variables, everything hardcoded, naming chaos. Start fresh, use old file for visual reference only
- **Hybrid** — foundations are solid, but components need rebuilding. Keep variables, recreate component pages

If Foundations are already complete, the user may skip Phase 2 and go directly to Phase 3 or 4 (see Workflow paths above).

#### 1d. Confirm scope

Present the user with a summary:

- Token categories to create (colors, spacing, radius, typography, shadows, etc.)
- Number of modes (Light/Dark, brands)
- Component list (prioritized — core first, extended later)
- Target naming convention
- Component numbering convention — common pattern: `C{section}.{number} {Name}` where section groups related components (1=Buttons, 2=Inputs, 3=Selection controls, etc.)
- CSS token naming convention for `codeSyntax.WEB` (e.g., `--color-bg-primary`, `$t-color-core-red-55`, `var(--btn-hero-h)`)
- If rebuilding an existing file: decide whether to renumber components to match new grouping or preserve original numbering for continuity. Document any mapping between plan numbers and Figma names (e.g., plan says "C2.2 Toggle Switch" but Figma name is "C4.0 Toggle Switch").

**Do not proceed until the user confirms.**

---

### Phase 2: Foundations

**Goal:** Create Variable Collections, Text Styles, and Effect Styles. This is the token layer — no components yet.

**Skip this phase if the audit in Phase 1c confirmed that all needed tokens exist and pass quality checks.**

Read `references/token-taxonomy.md` before starting this phase.

#### 2a. Create Variable Collections

**Recommended: 3-tier architecture** (Primitives → Semantic → Component). Best for multi-brand systems or new builds from scratch.

**Alternative: flat domain-based collections** (Colors, Spacing, Radius, Typography). Valid for single-brand systems or rebuilds of existing files where this structure already exists.

Match whatever structure exists in the file or codebase. The key requirement is not hierarchy depth — it's that every variable has explicit scopes and `codeSyntax.WEB`.

If using the 3-tier architecture, create three collections:

**Collection 1: Primitives**

- Raw color values (e.g., `blue-50` through `blue-900`, `gray-50` through `gray-900`)
- Raw spacing values (e.g., `0`, `1`, `2`, `4`, `8`, `12`, `16`, `20`, `24`, `32`, `48`, `64`)
- Raw radius values (e.g., `none`, `sm`, `md`, `lg`, `xl`, `full`)
- Raw font sizes, line heights (in pixels — see Critical Rule #4), font weights
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

IMPORTANT: After creating each variable, set `codeSyntax = { WEB: "token-name" }` using the project's CSS token naming convention (agreed in Discovery 1d). If syncing from code, extract token names from the source (CSS custom properties, Tailwind config keys, design-tokens JSON `$value` paths). If from scratch, derive from variable name: `color/bg/primary` → `--color-bg-primary`. Without codeSyntax, agents using `get_design_context` get raw variable names instead of CSS tokens, breaking the design-to-code bridge.

#### 2b. Create Text Styles

- Map to the typography scale: Display, Heading 1–4, Body Large, Body, Body Small, Caption, Overline
- Each style uses Semantic font-size and line-height variables where possible
- IMPORTANT: If storing line-height as variables, values must be in pixels (see Critical Rule #4). If your scale uses percentages, either convert to pixels or use text style's native `{unit: "PERCENT", value: N}` format without variable binding for line-height.
- Load fonts with `figma.loadFontAsync()` before any text operations

#### 2c. Create Effect Styles (if applicable)

- Shadow scale: `shadow/sm`, `shadow/md`, `shadow/lg`, `shadow/xl`
- Blur effects if needed

**Pause for user review. Show a summary of all tokens created.**

---

### Phase 3: File structure

**Goal:** Set up the standard page layout for the design system file.

**Skip this phase if documentation pages aren't required (e.g., portfolio projects, quick prototypes).**

#### 3a. Create a reusable Page Title component

Before creating pages, set up a Page Title component on a Utilities or Master Components page. Each component page will use an instance of this — not a manual frame. This ensures visual consistency and allows global updates to the header design.

Structure:
```
Master Component Assets (COMPONENT_SET)
└── Type=Page Title (COMPONENT)
    └── Component Label (FRAME, HORIZONTAL)
        ├── Eyebrow Label (TEXT) — "Component"
        └── Component Name (TEXT) — e.g. "C04 Toggle"
```

#### 3b. Create pages

Create these pages in order:

1. **Cover** — Title, version, last updated date, status badge
2. **Getting Started** — Brief usage guide for consumers of the library
3. **Foundations** — Documentation frames:
   - Color swatches (render all Semantic color tokens as labeled rectangles)
   - Typography specimens (render each Text Style with sample text)
   - Spacing scale visualization
   - Radius visualization
   - Shadow samples
4. **Components** — One page per component group (e.g., `→ Buttons`, `→ Inputs`, `→ Selection Controls`). Each page follows this internal structure:

   ```
   Page: → Buttons
   └── Buttons (wrapper frame, VERTICAL auto-layout, FIXED width=996px, AUTO height)
       ├── Page Title Instance (instance of the Page Title component)
       └── Specs Container (VERTICAL, FILL width, AUTO height, itemSpacing=64, paddingL/R=96)
           ├── Spec: C1.0 Button (Primary)
           │   ├── Title row (component name, ALL CAPS)
           │   ├── Column headers (state labels: Default, Hover, Pressed, Disabled)
           │   ├── Row labels (size labels: Hero, Default, Small)
           │   └── Component Set (nested inside)
           ├── Spec: C1.1 Button (Secondary)
           └── Spec: C1.2 Button (Tertiary)
   ```

   IMPORTANT: Set the page wrapper frame to **fixed width (996px)** so all component pages have consistent dimensions regardless of content size. This gives an 804px content area with 96px padding on each side. The wrapper height stays AUTO (grows with content).

   Define the spec wrapper template in this phase so all component pages use consistent spacing, padding, and labeling.
5. **Patterns** (optional) — Common layouts, form patterns
6. **Utilities** (optional) — Dividers, spacers, status dots, Master Component Assets

IMPORTANT: Use `await figma.setCurrentPageAsync(page)` when switching pages. The sync setter does NOT work.

Build each documentation frame using Auto Layout and bind all values to the Semantic variables — no hardcoded colors or spacing.

**Pause for user review. Take a screenshot of each page.**

---

### Phase 4: Components

**Goal:** Build each component with variants, states, Auto Layout, and variable bindings.

Read `references/component-spec.md` before starting this phase.

#### 4a. Determine component order

If the file already has components (discovered in Phase 1c), derive the build list from what exists. Otherwise, present the default core 10 as a starting suggestion:

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

Ask the user to confirm, reorder, add, or remove from this list based on their actual design system. Real systems often include components not in this list (Links, Breadcrumbs, Tabs, Tag/Chips, Date Picker, Progress Stepper, Pagination) and may not need some that are (Badge, Avatar).

Apply the component numbering convention from Discovery (e.g., C1.0, C1.1, C2.0).

#### 4b. Build each component

For EACH component, follow this sequence:

**Step 1: Create the base component (private, prefixed with `.` or `_`)**

- Contains the core structure and Auto Layout
- All fills, strokes, spacing, radius, and text use Semantic (or Component) variables — see Critical Rule #3 for exceptions on component-specific dimensions
- Embed `scripts/createComponentWithVariants.js` as a starting template

**Step 2: Define variant properties**

- Match code prop naming: `Type`, `Size`, `State` (or `variant`, `size`, `state` — align with the codebase)
- Read `references/naming-conventions.md` for the mapping table
- For every text node that users will customize (labels, placeholders, headings), add a TEXT component property and link it via `componentPropertyReferences = { characters: key }` (Critical Rule #8). See Critical Rule #7 for how same-named TEXT properties merge across variants.
- Use Boolean properties for toggles: `Has Icon`, `Has Description`, `Dismissible`
- Use Instance Swap properties for icon slots

**Step 3: Build all states**
Start with states, not just the default:

- Default, Hover, Active/Pressed, Focused, Disabled
- For inputs: Empty, Filled, Error, Success
- For toast: Info, Warning, Error, Success
- Loading state where applicable

**Step 4: Create the Component Set**

- Combine variants into a Component Set
- Verify naming: `Type=Primary, Size=Medium, State=Default` in Figma should correspond to `<Button variant="primary" size="md" />` in code

**Step 5: Bind variables to the component**

- Embed `scripts/bindVariablesToComponent.js` to systematically bind all fills, strokes, spacing, and radius
- Run `scripts/auditComponentBindings.js` (or the inline audit pattern from Phase 1c) to verify binding coverage

**Step 6: Validate and document this component**

- `get_screenshot` — check visual correctness, look for clipped text and overlapping elements
- `get_metadata` — verify variant count, hierarchy, Auto Layout structure
- Embed `scripts/validateCreation.js` for automated checks
- If issues found: fix targeted parts only, don't recreate from scratch
- Create a spec wrapper frame around the component set (using the template from Phase 3):
  - Title: component number and name (e.g., "C1.0 BUTTON (PRIMARY)")
  - Column headers: state names aligned to variant columns
  - Row labels: size/variant group names aligned to variant rows
  - This makes the variant matrix readable for designers reviewing the file

**Step 7: Move to next component**

IMPORTANT: Do NOT build all components in a single `use_figma` call. Build one component (or one variant set) per call, validate, then proceed. Never build on unvalidated work (Critical Rule #2).

**Pause for user review after every 3–4 components.**

---

### Phase 5: Integration and QA

**Goal:** Final validation, cleanup, and optional Code Connect setup.

#### 5a. Full audit

Run a comprehensive check:

- All components use Auto Layout (no absolute positioning except icons)
- All fills/strokes reference variables (no raw hex values except documented exceptions per Critical Rule #3)
- All text uses Text Styles
- Spacing uses spacing variables where scale values exist
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

- Token architecture: Primitive → Semantic minimum (or flat domain-based — see Phase 2a)
- Core colors, spacing, radius, typography as Figma Variables
- All variables have explicit scopes (no ALL_SCOPES)
- All variables have `codeSyntax.WEB` set
- lineHeight variables store pixel values (not percentages)
- Light and Dark modes configured and tested
- Components built with Auto Layout, bound to Semantic variables
- All text nodes in components have TEXT component properties
- Naming convention documented and consistent
- Component numbering applied
- Spec wrapper frames with state/size labels for each component (fixed width: 996px)
- At least one full page assembled from system components only
- All variants include all required states

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

**Example 3: Existing file with partial work**

User says: "I have a Figma file with 175 variables and 23 text styles already done. Need to audit it for issues, then build the components."

**Actions:**

1. Discovery: Run audit on existing file — flag ALL_SCOPES violations, missing codeSyntax, unbound values, duplicate variables
2. Foundations: Fix audit findings (add scopes, set codeSyntax WEB, remove duplicates). Skip creation since tokens already exist.
3. File Structure: Create component pages with wrapper structure
4. Components: Derive component list from the user's actual inventory, not the default core 10. Build with spec wrapper frames.
5. QA: Full audit, test page, summary

**Example 4: Variables exist, need components only**

User says: "Variables and text styles are set up. I need to build 7 components with proper bindings."

**Actions:**

1. Discovery: Run Phase 1c audit to verify variable quality. Build state ledger of existing tokens.
2. Skip Phase 2 (foundations exist and pass audit).
3. File Structure: Create component pages if needed, or skip if not required.
4. Components: Build each component one at a time. Bind all fills/strokes/spacing to existing variables. Validate after each component with get_metadata + get_screenshot.
5. QA: Audit bindings, test page, summary.

---

## Common edge cases

**Missing font:** If `figma.loadFontAsync()` fails, call `figma.listAvailableFontsAsync()` to find available alternatives. Fall back to "Inter" as the default.

**Token conflicts:** If codebase tokens use different naming than Figma conventions (e.g., `$gray-100` vs `gray/100`), document the mapping in a comment and follow the Figma `/`-separated convention for variable names.

**Existing components in the file:** If the file already has components, inspect their structure first. Update in place where possible rather than recreating — this preserves instance overrides.

**Too many variants:** If a component would have 50+ variant combinations, break it into a base component and composed components (e.g., `_ButtonBase` + `IconButton`, `ButtonGroup`).

**Mode mismatch:** If the codebase uses 3+ themes (e.g., Light, Dark, High Contrast), create all modes in the Semantic collection upfront. Don't add modes retroactively — it creates empty values.

**Large file performance:** Keep each `use_figma` call focused on one task. If creating 100+ variables, batch them in groups of 20–30 per call.

**Flat token architecture:** If the existing file uses flat domain-based collections (Colors, Spacing, Radius, Typography) instead of Primitives/Semantic/Component tiers, work with the existing structure. Don't restructure into 3 tiers unless the user explicitly requests it.

**Component-specific dimensions:** Some component internals have pixel values outside the spacing scale (e.g., 3px toggle track padding when the scale has 2 and 4). These are acceptable as hardcoded values — forcing the nearest scale value would change the visual. Document in the component's description.

**Component numbering divergence:** When rebuilding an existing file, Figma page/component names may follow different numbering than the organizational plan. Both are valid. Document the mapping: plan says "C2.2 Toggle Switch" but Figma name is "C4.0 Toggle Switch" → add a note in the plan entry.

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
