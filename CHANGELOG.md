# Changelog

## 1.1.0 — 2026-04-01

Updated based on testing with a real S&P Global design system rebuild (175 variables, 23 text styles, 50+ components).

- Added audit workflow for existing files (Phase 1c): ALL_SCOPES detection, codeSyntax coverage, duplicate variables, unbound fills, missing TEXT properties
- Component list is now a suggestion, not hardcoded — agent asks user to confirm/modify based on actual inventory
- Added spec wrapper frames with state/size labels for component documentation
- Added TEXT component property requirement for all customizable text nodes
- Added component numbering convention (C1.0, C1.1, C2.0 pattern)
- Added codeSyntax WEB requirement for all variables
- Added page wrapper structure for component pages (title header + specs container)
- Updated checklist with new quality gates
- Added Example 3: existing file with partial work

## 1.0.0 — 2026-04-01

Initial release.

- 5-phase workflow: Discovery → Foundations → File Structure → Components → QA
- 3-tier token architecture (Primitives → Semantic → Component)
- 10 core component specs with full state matrices
- Multi-framework support: React/Tailwind, Vue, Svelte, Angular, DTCG JSON, Tokens Studio
- QA validation script for automated audits
- Light/Dark mode setup with explicit variable scopes
- Works from scratch and from existing codebases
