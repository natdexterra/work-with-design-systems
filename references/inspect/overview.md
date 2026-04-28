# Inspect mode overview

Inspect mode is a read-only audit of an existing Figma design system file. It produces a report and stops. Build mode never runs automatically afterwards — that requires explicit user opt-in.

## When to run inspect

- The user asks for an audit, health check, readiness score, or quality review
- A consuming team needs to know whether the DS is production-ready
- Before a major refactor, to baseline the current state
- Before exporting tokens or generating code (Phase 6) — surfaces issues that would otherwise leak into code

If the user asks "fix the issues," do NOT enter build mode. Show the report first and ask whether to fix manually or with fuzzy auto-fix (see `../build/auto-fix-guide.md`).

## Module list

| # | Module | Script | Scope |
|---|--------|--------|-------|
| 0 | Component inventory | `scripts/inspect/inventory.js` | File-wide |
| 1 | Token compliance | `scripts/inspect/audit-tokens.js` | Per component set |
| 2 | Interactive states | `scripts/inspect/audit-states.js` | Per component set |
| 3 | Accessibility | `scripts/inspect/audit-accessibility.js` | Per component set |
| 4 | Detached instances | `scripts/inspect/audit-detached.js` | File-wide, runs once |
| 5 | Naming quality | `scripts/inspect/audit-naming.js` | Per component set |
| 6 | Component descriptions | (no script — Claude reasoning) | Per component set |

## Run order

1. **Module 0** first — the inventory tells you what component sets exist and gives you their `nodeId`s. Modules 1, 2, 3, 5 consume these IDs.
2. **Module 4** runs once, file-wide — independent of the per-component pipeline.
3. **Modules 1, 2, 3, 5** run per component set, in any order. Group runs by component to keep context tight.
4. **Module 6** is reasoning, not a script — runs after structural audits because the description draft references the structure those modules surface.

Don't try to merge modules into a single pass. Each one has different scope assumptions and different output shape; running them separately keeps the report clean.

## Pre-flight checklist

Before starting an audit, confirm:

- The Figma file is open and `figma-use` skill is loaded
- The user has chosen scope: full file or a subset of component sets
- The user has chosen modules: default is all six
- The user has chosen export format(s): markdown (default), JSON, both, or AI prompt — see `report-templates.md`
- For dynamic-page mode files, scripts call `figma.loadAllPagesAsync()` upfront where needed; verify the runtime supports it, otherwise scripts fall back to per-page loading

After scope confirmation, run Module 0, present the inventory as a table, and ask the user to confirm before processing each component.

## Module dependencies

- Module 1 reads variable bindings; Module 1 alone doesn't require any other module to have run
- Module 2 reads variant property names from variant names; no dependency
- Module 3 walks ancestor frames for background colors when computing contrast; no dependency
- Module 4 reads file-level component name registry and frame-name matches; no dependency
- Module 5 reads node names; no dependency
- Module 6 (reasoning) reads variant counts, slot detection from structure, and Modules 1/2/3/5 outputs. Run last.

## What inspect does NOT do

- Modify the Figma file (no writes — strict read-only)
- Generate fixes (that's `auto-fix-guide.md` in build mode, opt-in)
- Validate against an external token registry (audit is local)
- Decide whether the design is "good" — only whether it's structurally consistent

## What to do with the report

The report ends with a priority fix list ordered by impact. Hand it to the user and stop. Three valid next steps for them:

1. Fix manually, re-run inspect to confirm
2. Opt into fuzzy auto-fix for token issues (`../build/auto-fix-guide.md`)
3. Accept the issues and move on (e.g., known-acceptable for an early-stage system)

Never enter build mode without explicit user opt-in.
