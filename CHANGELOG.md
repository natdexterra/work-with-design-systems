# Changelog

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
