# Examples — extended

Load this reference when the user's request is ambiguous and you need more than the SKILL.md inline example (Example 1) to determine mode or workflow path.

## Example 2: Pure build — new design system from scratch

User: "Create a design system for a fintech app. Brand color #6366F1 (indigo). Inter font. Light + Dark modes."

Mode: Build, full build path. Phase 6 not requested.

1. Discovery: Confirm specs with user
2. Foundations: 3-tier variables, Light/Dark modes, text styles
3. File structure: standard pages
4. Components: build core 10 with slots for Card and Modal
5. QA: validation script, test page
6. Phase 5 closing prompt: user replies "done"

## Example 3: Inspect → build (most common paired flow)

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

## Example 4: Build mode — extending existing file

User: "Variables and text styles are set up. Need to build 7 components with proper bindings."

Mode: Build, extend path.

1. Phase 1c health check on variables (verify quality)
2. Skip Phase 2 (foundations exist)
3. Skip Phase 3 (file structure exists)
4. Phase 4: build each of 7 components, including slot decision for compound ones
5. Phase 5: verify

## Example 5: Build mode — slot retrofit

User: "Our Card component keeps getting detached because users need different inner content. Add slots to it."

Mode: Build, slot retrofit path. Phase 6 NOT triggered (retrofit is excluded from Phase 6 default offer).

1. Read current Card via `get_metadata`
2. Phase 4c: slot decision (Leading, Body, Footer typical)
3. Update Card in place, preserve variants and booleans
4. Update component description to document slots
5. Verify existing instances don't break

## Example 6: Inspect mode — narrow scope

User: "Just check WCAG compliance on Button and Input."

Mode: Inspect, narrow scope.

1. Skip inventory (user specified components)
2. Run only Module 3 (Accessibility) on Button and Input
3. Report: contrast ratios, touch targets, font sizes, focus indicators
4. List specific WCAG criteria pass/fail
5. STOP.

## Example 7: Build → Phase 6 (end-to-end)

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

## Example 8: Code export only

User: "My Figma DS is solid. Just generate tokens.css and CLAUDE.md for my repo."

Mode: Build, code export only path.

1. Phase 1c health check: verify variables have scopes and codeSyntax (Phase 6 needs this)
2. If health check fails: pause, recommend fixing foundations first
3. If health check passes: skip Phases 2-5 entirely
4. Phase 6: run as in Example 7

