# Changelog

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
