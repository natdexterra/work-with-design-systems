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

**Hitting Figma MCP rate limit:** Symptoms include silent failures or "service unavailable" errors. Limits are per plan and seat (Figma `rate-limits-access` doc, 2026-08): Professional Full/Dev **10/min, 200/day**; Organization 15/min, 200/day; Enterprise 20/min, 600/day; Starter 20/month; View/Collab seats 6/month. Exempt: `whoami`, `create_new_file`, `add_code_connect_map`. Cause is usually too many `get_screenshot` / `get_metadata` calls during a binding pass. Critical Rule #2's depth ladder prevents this — verify in-script, screenshot only at end-of-batch, and prefer `await node.screenshot()` inside a `use_figma` call you are making anyway over a separate `get_screenshot`. Per-minute limit hit: pause 60s. Daily limit hit: nothing resets until the next day — scope inspect runs (subset of component sets) before starting, not after. `whoami` tells you the tier.

**Reading `componentPropertyDefinitions`:** it throws on a variant `COMPONENT`, even through optional chaining (figma-use Rule #18, 2026-08). Narrow the owner first — the node itself when it is a `COMPONENT_SET`; a `COMPONENT` only when its parent is not a `COMPONENT_SET`; otherwise promote the variant to its parent set. The skill's inspect scripts read variant names, not property definitions, so they are unaffected; any ad-hoc property read must narrow.

**Font missing on the agent's machine (the agent-side Figma has only a metric-compatible substitute family):** `loadFontAsync` fails, but a bind that does not touch text content or font does not need the load — rebinding a TEXT node's **fill** or **stroke** variable works without it (verified 2026-08-23). Only `characters`, `fontName`, `fontSize`, `lineHeight`, `letterSpacing`, `textCase` and FONT_FAMILY-scoped bindings need the font. Try the bind without the load first; never substitute the font family to get past the error — that rewrites the user's style.

**MCP read disagrees with itself:** `get_metadata` / a Plugin-API traversal can return nodes the user's layer panel does not show (observed 2026-08-12: 8 bullet instances reported, 4 real; the tell was two different item spacings inside one auto-layout frame — impossible). An internally inconsistent read is a bad read, not a bad file: re-read after the user reloads the file, or confirm with `get_screenshot`, and never "fix" what the panel doesn't show.

**Remote MCP auth fails (OAuth "Invalid redirect uri" or similar):** the desktop Dev Mode MCP (`http://127.0.0.1:3845/mcp`, needs the file open as the active tab) still serves **reads** — `get_design_context`, `get_metadata`, `get_variable_defs`. Inspect mode can run on it; build mode (`use_figma`) needs the remote server. Say which path you used in the report.

**Renaming variables / collections during a taxonomy restructure:** safe for the file — bindings are by ID and codeSyntax keeps the CSS names — but anything generated *from* the old names (a `design-system.md`, `tokens.css`, a renderer's token table) is now stale. List those consumers in the report and regenerate or update them in the same session; and if the file is a published library, the user must Publish before consumer files see the new names and scopes.

**Project override file exists but conflicts with Critical Rule:** Project overrides extend, not replace. If a project override would *weaken* a Critical Rule (e.g., "skip validation"), refuse and surface to user. If it *strengthens* (e.g., adds extra required field), apply.
