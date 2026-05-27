# Common edge cases

Load this reference when you hit an unusual situation not covered by the main workflow paths.

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

**Large file performance:** Critical Rule #1 controls call scope (structural = one per call, idempotent batches allowed). For variables: batch in groups of 20–30 per call.

**Slot API not available:** If Plugin API doesn't expose slot creation in current version, fall back to documented boolean + instance swap pattern. Document in component description that this will migrate to slots when API support lands. Never detach as workaround.

**Legacy components without descriptions:** When extending a file where existing components lack descriptions, do NOT overwrite silently. Present user with list, ask before adding. Offer batch mode for large files.

**Storybook stories not matching variants:** When codebase has Storybook stories that don't map 1:1 to Figma variants (either direction), list mismatches in Phase 1b. Resolve with user before Phase 4.

**Component-specific dimensions:** Critical Rule #3 allows hardcoded values for dimensions outside the spacing scale. Document in description.

**Numbering divergence:** When rebuilding, plan numbers may differ from existing Figma names. Document mapping (e.g., plan "C2.2 Toggle" → Figma "C4.0 Toggle").

**Figma description round-trip encoding:** Never assign one component's description to another (`setB.description = setA.description`) — Figma round-trip HTML-encodes `&` → `&amp;amp;`, growing the description on every write. Declare the description text as a local const at the top of your script and write the literal string to each set.

**Hitting Figma MCP rate limit (~15 calls/min):** Symptoms include silent failures or "service unavailable" errors. Cause is usually too many `get_screenshot` / `get_metadata` calls during a binding pass. Critical Rule #2's depth ladder prevents this — verify in-script, screenshot only at end-of-batch. If you've already triggered the limit, pause for 60s before retrying.

**Project override file exists but conflicts with Critical Rule:** Project overrides extend, not replace. If a project override would *weaken* a Critical Rule (e.g., "skip validation"), refuse and surface to user. If it *strengthens* (e.g., adds extra required field), apply.
