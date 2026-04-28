# Changelog

## 2.0.1 — 2026-04-28

Patch release. Bug fixes surfaced by the first end-to-end inspect on a real production design system (~65 component sets, ~500 variants). No API changes; reports become accurate where v2.0.0 either crashed, over-flagged, or scored 0% on industry-correct components.

### Fixed

- **`audit-tokens.js` — type guards on TEXT/GROUP/etc. nodes.** Figma's Plugin API throws (rather than returns `undefined`) when `layoutMode`, `cornerRadius`, or `fills` are read on incompatible node types. The previous truthy guards evaluated the property access first and crashed. Added `LAYOUT_TYPES` / `RADIUS_TYPES` / `PAINT_TYPES` membership checks at each branch — the script now runs through component sets that contain TEXT or GROUP nodes (i.e. anything with labels, which is every real DS).
- **`audit-detached.js` — switched from name matching to `detachedInfo` API.** Previous heuristic flagged any FRAME whose name matched a known component, producing ~90% false positives on documentation/spec frames named after components ("Title", "Link", "Arrow"). Now uses `node.detachedInfo` — the canonical Plugin API property that Figma sets only on frames that were actually detached from instances. Resolves the original component name where possible (local `id` or library `key`).
- **`audit-states.js` — longest-match archetype detection.** Object-key iteration order made "Radio Button" match `button` first, leading to a false `Pressed` requirement (radios don't have Pressed in any industry DS). Now collects all matching keys and picks the longest, so multi-word archetypes (`radio button`, `inline link`, `icon button`, `toggle switch`, `text field`, `date picker`) win over single-word fallbacks.
- **`audit-states.js` — binary-state archetypes no longer score 0%.** Toggle, Checkbox, Radio have two state dimensions (binary on/off + interaction Default/Hover/Disabled), per Material, Apple HIG, Polaris, IBM Carbon. Expected-state lists now include both axes (`Off`/`On`, `Unchecked`/`Checked`/`Indeterminate`, `Unselected`/`Selected`) so a DS that correctly models the binary axis is no longer falsely flagged. Quick fix; proper multi-dimensional scoring deferred to v2.1.
- **`audit-states.js` — static archetypes treated as N/A instead of 0%.** Tooltip, Spinner, Loader, Image, Video, Logo, Pagination, Breadcrumbs, Badge, Avatar, Divider don't have interactive states by design (per Material/Polaris/Carbon — state for pagination/breadcrumbs lives in nested items). Added `NO_STATE_REQUIRED` set; these archetypes now return 100% with an explanatory note. Tabs are explicitly NOT in this set — flagging tabs without state remains correct.
- **`audit-states.js` — accept plural `States` as state property name.** Singular `State` is canonical (Figma's official guidance, every major DS). Plural is recognized for real-world tolerance only.
- **`inventory.js` and `audit-detached.js` — removed `loadAllPagesAsync` calls.** The MCP Plugin API doesn't expose this method. Per-page iteration with `setCurrentPageAsync` already loads page content as needed; the dead guard was misleading future maintainers.

### Why these and not other audit findings

The first real-world test surfaced ~30 distinct findings. Categorized as:

1. **Real bugs** (above) — fixed.
2. **Architectural gaps** — multi-dimensional state modeling for binary archetypes is patched here permissively; the proper multi-axis fix lands in v2.1.
3. **Correct flags on a non-standard DS** — components legitimately missing Focused (WCAG 2.1 AA 2.4.7), Tabs without State, etc. Skill behavior unchanged.

## 2.0.0 — 2026-04-28

Major release. The skill was renamed from `generate-design-system` to `work-with-design-systems` and now covers both inspecting (read-only audits) and building. The previous audit functionality (formerly planned as a separate `audit-design-system` skill) is now an integrated mode. Build mode optionally extends to a new Phase 6 — sync to code — that generates `tokens.css`, AI rules, and audit script for the user's codebase.

### Breaking change: skill renamed

The skill is now `work-with-design-systems`. The old name `generate-design-system` is no longer used.

### If you installed this skill before v2.0.0

The GitHub repo URL still works via redirect (old `generate-design-system` URL → new `work-with-design-systems`), so `git pull` continues to work. But to avoid the deprecation warning and stay aligned:

1. Update your git remote:
   ```bash
   cd path/to/your/local/clone
   git remote set-url origin https://github.com/natdexterra/work-with-design-systems.git
   ```

2. Rename your skill folder (Claude resolves skills by folder name):
   ```bash
   mv .claude/skills/generate-design-system .claude/skills/work-with-design-systems
   ```
   Or for global skills:
   ```bash
   mv ~/.claude/skills/generate-design-system ~/.claude/skills/work-with-design-systems
   ```

3. Update any references to `/generate-design-system` in your CLAUDE.md, scripts, or docs to `/work-with-design-systems`.

4. Pull the latest changes.

The skill description updates automatically once Claude reads the new SKILL.md.

### Added

#### Inspect mode (entirely new)

- **Six audit modules.** Token compliance (with severity tiers — errors and warnings), interactive states, WCAG 2.1 AA accessibility, detached instances, naming quality, component descriptions.
- **Weighted readiness scoring.** Per-component score 0–100 (states ×3, token errors ×2, token warnings ×0.6, accessibility ×1, naming ×0.5).
- **Three export formats.** Markdown report, JSON for programmatic use, AI prompt for direct input to code generators.
- **Six inspect scripts.** `scripts/inspect/inventory.js`, `audit-tokens.js` (with severity), `audit-states.js`, `audit-accessibility.js`, `audit-detached.js`, `audit-naming.js`. All read-only.
- **Mandatory pause after inspect.** Skill always stops with report and waits for explicit user decision before any build action.

#### Build mode additions

- **Phase 6 — Sync to code (optional, OFF by default).** New phase that exports `tokens.css` (three-layer indirection with Light/Dark strategies), AI rules file (`.claude/rules/design-system.md`, `.cursor/rules/design-system.mdc`, or scoped section in `AGENTS.md`), CI-ready Node.js audit script, and optional `specs/patterns/*.md` files. Closes the design-to-code loop end-to-end. Triggers only on explicit user request, accepted Phase 5 closing prompt, or upfront request like "build DS and generate tokens.css". Retrofit scenarios (slot retrofit, partial fixes) never trigger Phase 6.
- **Slots support (Critical Rule #9).** Compound components (Card, Modal, Dialog, ListItem, ReviewCard) use named slots instead of detach patterns. New Phase 4c "Slot decision" guides when to use variants vs booleans vs instance swap vs slots. New `references/build/slots-guide.md`.
- **Mandatory component descriptions (Critical Rule #10).** Every public component must have a PURPOSE/BEHAVIOR/COMPOSITION/USAGE/CODE NOTES description. Template in `references/build/component-description-template.md`.
- **No-detach rule (Critical Rule #11).** Explicit prohibition. If variation needed, use variant / boolean / instance swap / slot.
- **Patterns documentation (Phase 4d, optional).** Composition patterns (form layouts, page layouts, content flows) get their own page in Figma with annotated examples. New `references/build/patterns-guide.md`.
- **Story-to-variant parity check.** Phase 1b reads Storybook stories if present in codebase and flags mismatches between stories and Figma variants.
- **Auto-rename fallback in Phase 1c.** When generic layer names exceed 20% of layers in components, suggests Figma's built-in AI rename before manual work.
- **Fuzzy auto-fix for hardcoded values.** Optional build-mode operation that binds unbound fills, strokes, paddings, item spacing, and corner radii to existing variables using property-aware fuzzy matching (scope-filtered, similarity-scored, with a Semantic-layer preference boost). New `scripts/build/fixHardcodedToTokens.js` and `references/build/auto-fix-guide.md`. Confidence threshold (default 0.85) determines which bindings apply automatically vs are flagged for manual review. Triggers only when user explicitly requests "auto-fix" — never silently. Closes the inspect → build loop without forcing the user to decide every binding by hand.
- **Nested components inventory in descriptions.** Component descriptions now include a list of nested component instances (e.g., a Card that contains an Avatar and a Badge). Helps downstream AI tools reason about composition without traversing structure. Added to `references/build/component-description-template.md` as a dedicated section.
- **Property suggestions in Module 6 (inspect mode).** When generating component descriptions, the skill now reasons about missing component properties (variant vs boolean vs instance swap vs slot) and surfaces suggestions alongside the description. Catches cases like "two near-duplicate variants should be a State property" or "Body content varies between examples — should be a slot." Added as a new section in `references/inspect/component-descriptions.md`.

#### Code-side outputs (Phase 6)

- **`scripts/build/exportTokensToCSS.js`** — reads all variables and modes via Plugin API, returns structured JSON for `tokens.css` generation.
- **`references/build/code-export.md`** — full templates for: three-layer `tokens.css` with three Light/Dark strategies (`[data-theme]`, `@media (prefers-color-scheme)`, both), Node.js audit script with errors/warnings tiers, AI rules templates for Claude Code / Cursor / Codex, optional `specs/patterns/*.md` template.
- **Format detection in Phase 6a.** Auto-detects client by project structure (`.claude/` → Claude Code, `.cursor/` → Cursor, `AGENTS.md` → Codex).
- **Scoped output paths.** Never overwrites top-level `CLAUDE.md`, `AGENTS.md`, or full `.cursor/rules`. Writes to `.claude/rules/design-system.md`, `.cursor/rules/design-system.mdc`, or scoped section in `AGENTS.md` with explicit start/end markers.
- **Inline output fallback.** If running in environment without file write tools (Claude.ai web), Phase 6 outputs file contents in fenced code blocks with clear save-as headers.

#### Architecture

- **Two modes.** Inspect (read-only) and Build (write), with mandatory pause between them. Build optionally extends to Phase 6.
- **Subfolder structure.** `references/inspect/`, `references/build/`, `scripts/inspect/`, `scripts/build/`. Each mode loads only its own references and scripts.
- **Mode router in SKILL.md.** Auto-detects mode from request, asks if ambiguous, defaults to inspect-first when explicitly mixed.
- **New build workflow path: "Code export only."** For users with solid Figma DS who just want Phase 6 outputs.

### Changed

- **Renamed `references/audit-scripts.md`** (which previously contained all audit code as inline JS blocks) into individual `.js` files under `scripts/inspect/`. Old markdown file becomes overview-only documentation.
- **Renamed Phase 1c from "audit" to "quick health check".** Phase 1c is a fast sanity check during build mode, not a full audit. For comprehensive audits, switch to inspect mode.
- **Renamed workflow path "Audit only" to "Fix foundations only".** Matches the new scope split.
- **Updated description trigger list.** Now triggers on inspect keywords (audit, check, score, WCAG, find detached), build keywords (create, build, generate, sync, add slots), and Phase 6 keywords (export tokens, sync to code, generate CLAUDE.md).
- **Phase 4 component creation sequence.** Description writing is now an explicit step.
- **Examples expanded.** Added examples for inspect mode, inspect→build flow, slot retrofit, end-to-end build with Phase 6, code export only.
- **Module 1 (token compliance) now outputs errors and warnings separately.** Errors: unbound fills/strokes/spacing/radii. Warnings: raw opacity, blur, durations.
- **Existing build references moved to `references/build/`.** `token-taxonomy.md`, `component-spec.md`, `naming-conventions.md`, `framework-mappings.md` now live under the build subfolder. Git history preserved via `git mv`.
- **`scripts/validate-design-system.js` moved to `scripts/build/validate-design-system.js`.** Same content; only the path changed. Phase 5 still references it.
- **`component-spec.md` extended** with a "Slot decision" section covering compound components.
- **`naming-conventions.md` extended** with PascalCase slot names (Leading, Trailing, Header, Body, Footer, Actions) and pattern frame names (`P{section}.{number} {Name}`).
- **`framework-mappings.md` extended** with a Storybook stories detection section.

### Fixed

#### Audit scripts (carried over from internal audit-design-system development)

- **Template literal spacing.** Removed extraneous spaces inside `${...}` and trailing spaces before closing backticks throughout all audit scripts.
- **Touch target check now finds Default variant correctly.** Was previously using `cs.children[0]`, which is not necessarily the Default variant. Now searches by `State=Default` with fallback.
- **Detached instances scanner restores currentPage.** Was leaving the user on the last scanned page. Now saves and restores `figma.currentPage`.
- **Inventory script restores currentPage.** Same fix as above for consistency.
- **fontWeight check uses fontName.style only.** Removed incorrect `textNode.fontWeight >= 700` check (Figma TEXT nodes don't have a `fontWeight` property — only `fontName.style`).
- **Token compliance dedupe key now includes value.** Two distinct hex values on the same logical layer no longer collapse to a single entry.
- **Focus indicator check is gated to interactive components.** For non-interactive types (Card, Badge, Avatar) the check is no longer added to the totals — it would always fail and skew the percentage.

### Notes

- Existing build workflows continue to work. The renaming and reorganization don't change build behavior.
- Phase 6 is opt-in only. If you don't want code export, you'll never see it — the skill stops at Phase 5 unless you explicitly request more.
- For files that don't have compound components or Storybook, most new content is advisory and won't change the workflow materially.
- The previous v1.3.1 release of `generate-design-system` remains accessible via git tag `v1.3.1` if you need to roll back.

---

## 1.3.1 — 2026-04-17

### Fixed

- **Duplicate primitive detection now groups by name domain.** `spacing/16` and `type/size/body` happen to share the numeric value 16 but are not duplicates. Cross-domain collisions (spacing × radius × type) no longer trigger warnings. Same-domain duplicates (e.g., two spacing variables with the same value) are still flagged. On the Skill Translation Platform DS file (138 variables), this eliminated 6 false-positive warnings.
- **Scope-aware contrast pairing for inverse text tokens.** Text tokens matching `color/text/on-{surface}` are now tested only against background variables where `{surface}` appears as a name segment (e.g., `color/text/on-wine` × `color/bg/wine`, `color/bg/wine-subtle`). Pairing against unrelated surfaces like `color/bg/card` is skipped — these pairs are not design bugs, they're combinations that would never be used in practice. On the test file this eliminated 10 false-positive contrast failures. A new `contrast.skippedInverseMismatches` count is included in the output.
- **Foundations / Cover / Components page checks downgraded to info-level.** Product design files that don't follow library structure no longer receive warnings for missing documentation pages. The info-level output still surfaces when pages are absent, so teams building a library can still see the gap — it just doesn't inflate the warning count for product files.
- **`use_figma` compatibility.** The script is now structured as a named `runAudit()` async function with a top-level `return await runAudit()`. Under `use_figma`, which wraps scripts in an async context, this returns the audit report directly. No more need for agents to manually unwrap an IIFE or swap `closePlugin` calls. For standalone plugin usage, replace the final `return` with `runAudit().then((r) => figma.closePlugin(JSON.stringify(r)))`.
- **`figma.loadAllPagesAsync` fallback.** If the method is unavailable in the current API surface, the script falls back to iterating `figma.root.children` with `setCurrentPageAsync` per page. This was the adaptation Claude Code made manually during v1.3.0 testing — now it's built in.

### Changed

- **Added "info" severity level** to the audit output, in addition to "error" and "warning". Summary now reports errors, warnings, and info counts separately. Info items don't count against audit cleanliness.
- **SKILL.md and README.md cleaned up.** Removed references to four helper scripts (`createComponentWithVariants.js`, `bindVariablesToComponent.js`, `auditComponentBindings.js`, `validateCreation.js`) that were introduced as names in v1.2.0 text but never existed as files in the repo. Phase 4 workflow steps now describe what to do inline rather than pointing to non-existent files. The inline audit pattern from Phase 1c is now the single source for binding coverage checks. File structure tree in README corrected to show the one script that actually exists. Agents were already handling this correctly by writing ad-hoc scripts; the cleanup prevents confusion for new users reading the docs.
- **README gained two new "Design decisions" entries:** "Why scope-aware contrast pairing?" and "Why domain-grouped duplicate detection?" — documenting the rationale for the v1.3.1 audit logic changes.
- **SKILL.md gained one edge case:** "Inverse text tokens (color/text/on-{surface})" — explains the naming pattern the audit script recognizes and what happens when a token is named outside the pattern.

### Validated on

- Skill Translation Platform DS file (Case 2 Untranslated portfolio project): 138 variables, 77 components, 6 component sets, 10 pages. Audit completed without errors. After v1.3.1 fixes, the previous 16 false-positive warnings (6 cross-domain duplicates, 10 inverse-surface contrast mismatches) are eliminated.

### Notes

No workflow changes. v1.3.1 is a bug-fix release on top of v1.3.0 — all added checks (WCAG contrast, codeSyntax coverage, TEXT property audit) continue to work as described, just with fewer false positives.

## 1.3.0 — 2026-04-17

### Added

- **WCAG AA contrast validation** in `validate-design-system.js`. Checks all `color/text/*` × `color/bg/*` pairs in both Light and Dark modes. Surfaces up to 10 worst failures as individual warnings; the full contrast matrix is returned in the script output under `contrast.worstLight` / `contrast.worstDark` for detailed review.
- **codeSyntax.WEB coverage check.** Flags variables missing a WEB code alias — these break `get_design_context` and the design-to-code bridge.
- **Duplicate primitive detection.** Flags primitive variables sharing identical raw values under different names (surfaces the "we have 4 variables that all resolve to `#0000FF`" case).
- **Mode parity check.** Flags variables that lack a value in any mode of their collection.
- **Text style binding audit.** Flags text styles without variable bindings on `fontSize`, `lineHeight`, `fontFamily`, or `fontWeight`. Respects Critical Rule #4 (v1.2.0) — text styles using percent line-heights that can't bind are not false-flagged as long as at least one other field is bound.
- **TEXT component property audit.** Flags text nodes inside components without `componentPropertyReferences.characters` (label overrides revert on component update). Skips nodes whose names start with `.` or `_` (private/decorative by convention) and strings of 2 or fewer characters (icons, glyphs).
- **Hardcoded stroke detection.** Mirrors hardcoded fill detection for `node.strokes`.
- **Alias resolution** for contrast checks, with mode-name preference across collections, loop-safe via a visited set, memoized for performance.
- **Positioning section in README** clarifying when to use this skill vs Anthropic's Claude Design (launched 2026-04-17). Claude Design extracts an internal design system for its own prototyping environment; this skill puts the system into Figma with full Plugin API rigor for teams where Figma is the canonical source of truth.
- **WCAG contrast validation rationale** added to the "Design decisions" section in README.

### Changed

- **`validate-design-system.js` rewritten end-to-end.** All checks declared in SKILL.md Phase 1c are now implemented in the script. Previous versions covered roughly one third of the promised audit scope; the remainder was executed ad-hoc by the agent.
- **`figma.loadAllPagesAsync()` called before iteration.** Required for dynamic-page mode used by the Figma MCP server.
- **Component walking switched to `page.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })`.** Faster than full-tree recursion, and correctly scopes hardcoded-color checks to component trees. Removes false positives from documentation frames on Foundations pages that intentionally use literal colors (swatches, specimens).
- **Hardcoded fill detection now actually works.** The previous check inspected `node.fills[i].boundVariables` as an object with `Object.keys().length === 0` condition on the wrong node types (`COMPONENT` and `INSTANCE` roots, which rarely have direct fills). The new check inspects each paint via `paint.boundVariables.color` with a fallback to node-level `node.boundVariables.fills[idx]`, across all fillable node types (`RECTANGLE`, `FRAME`, `TEXT`, `VECTOR`, `ELLIPSE`, and others).
- **Missing "Semantic" collection downgraded from error to warning.** Aligns with v1.2.0 flexible architecture — flat domain-based collections (Colors, Spacing, Radius) are valid for single-brand systems and existing file rebuilds.
- **Hardcoded detection scope limited to colors.** Per Critical Rule #3 in v1.2.0, component-specific pixel dimensions outside the spacing scale are acceptable. The script flags unbound color fills and strokes only, not unbound spacing or radius values.
- **Issue cap raised from 50 to 100** to accommodate new check categories.

### Fixed

- **`figma.getLocalTextStyles()` → `getLocalTextStylesAsync()`**, and same for `getLocalEffectStyles()`. The sync versions throw in dynamic-page mode used by the MCP server.
- **Invisible fills and strokes** (`visible: false`, or `opacity: 0` on fills) no longer false-flagged as hardcoded.
- **Fills/strokes check now walks internal nodes**, not just the component root. Previously most hardcoded fills and strokes lived on internal `RECTANGLE` and `FRAME` nodes and were silently skipped.

### Notes

Version bumped to 1.3.0 reflecting broadened audit scope and the addition of accessibility validation. No breaking changes to SKILL.md workflow — the script is still invoked the same way in Phase 1c and Phase 5a.

## 1.2.0 — 2026-04-06

### Changed

- **Reframed skill description and positioning.** The skill now clearly communicates that it works for extending existing files (not just building from scratch). This fixes the primary issue where agents didn't load the skill when variables already existed.
- **Added "Extend" workflow path.** When foundations exist, agents can skip Phases 2-3 and go directly to components. The mandatory sequential phases are now three paths: Full build, Extend, Audit only.
- **3-tier token architecture is now a recommendation, not a requirement.** Flat domain-based collections (Colors, Spacing, Radius, Typography) are documented as equally valid for single-brand systems or rebuilds.
- **Relaxed "zero hardcoded values" rule.** Component-specific dimensions outside the spacing scale (e.g., 3px toggle track padding) are acceptable. Documented as Critical Rule #3.
- **Fixed-width page wrappers (996px).** All component pages now use consistent dimensions instead of AUTO width that shrinks to content.

### Added

- **Critical rules section.** Eight numbered rules at the top of Instructions covering: incremental work, validation before building, variable binding, lineHeight pixel gotcha, codeSyntax, scopes, TEXT property merge behavior, TEXT component properties.
- **lineHeight variable gotcha.** Documented that Figma variables interpret lineHeight as pixels, not percentages. Added conversion guidance.
- **TEXT property merge warning.** Documented that same-named TEXT properties merge across variants when using combineAsVariants.
- **Decision guide in Phase 1c.** After audit, the skill now recommends: build in place, new file, or hybrid path.
- **Reusable Page Title component.** Phase 3 now creates a shared Page Title component instead of manual frames per page.
- **Helper script references in Phase 4.** Workflow steps now point to specific scripts: createComponentWithVariants.js, bindVariablesToComponent.js, auditComponentBindings.js, validateCreation.js.
- **Audit script pattern.** Phase 1c now includes an inline binding audit script for checking variable coverage.
- **Supported inputs table in README.** Documents .md, .json, screenshots, URLs, verbal specs, codebases.
- **Compatibility section in README.** Lists confirmed and expected-to-work MCP clients.
- **Example 4 in SKILL.md.** "Variables exist, need components only" workflow.
- **Component numbering divergence.** Documented in Phase 1d and Common edge cases.

## 1.1.0 — 2026-03-31

### Added

- Phase 1c: Audit path for existing Figma files
- Component numbering convention (C{section}.{number} {Name})
- Spec wrapper frames with state/size labels
- TEXT component property requirement
- codeSyntax.WEB enforcement on all variables
- Page wrapper structure with consistent layout

### Changed

- Component list is now user-confirmed, not hardcoded
- File structure uses branded title headers per component page

## 1.0.0 — 2026-03-25

Initial release. Five-phase workflow: Discovery → Foundations → File Structure → Components → QA.
