# Backlog

Planned changes, not yet implemented. Move items to CHANGELOG.md once shipped.

## Documentation

- [ ] **README — make `git clone` the primary install method.** Promote the
  `git clone … <dest>` one-liner to the main recommendation in the Installation
  section; demote `cp -r` to a secondary "if you already downloaded the folder"
  note. Reason: the `cp -r` command confuses newcomers — it assumes the skill
  folder is already downloaded and that the terminal is sitting next to it.
  `git clone` with an explicit destination path works regardless of the current
  directory and creates the `.claude/skills/` folders automatically.
  Add an explicit Windows PowerShell variant
  (`$env:USERPROFILE\.claude\skills\…`) alongside the Mac/Linux one.
  Source: Reddit user feedback (new user struggled to install the skill in VS Code).

## Deferred from 2.0.3 eval-loop (2026-05-27)

Three changes proposed alongside the 2.0.3 release but not shipped — eval coverage was either missing or inconclusive. Each is plausible; none are validated. Reconsider when the underlying need recurs or when a dedicated test is set up.

- [ ] **Touch-up workflow path.** Proposed: a faster path for single-binding tweaks / description fixes / renames / scope updates — skip Phase 1c inspect gate + skip `get_screenshot`, verify via in-script reads, done. Reason for deferral: none of the three eval prompts triggered this path, so no evidence it actually saves what we think it saves or that it doesn't introduce a class of bugs. **To revisit:** add a dedicated eval where the prompt is "just change the description on these 3 component sets", measure `use_figma` calls + correctness vs full Phase 4 cadence. If it shows ≥30% call savings with no correctness regression, ship.

- [ ] **Loosen Critical Rule #1 to allow idempotent batches.** Proposed: structural changes stay one-per-call (variants, properties, auto-layout, `swapComponent`); idempotent batches (binding the same variable across N nodes via traversal, codeSyntax pass across a variable collection, description writes across a CS family, scope updates, renames) may share one `use_figma` call. Reason for deferral: the eval that would have tested this (eval-0, build variables + Button in a sandbox file) hit a contamination issue — both with-skill and old-skill subagents wrote to the same Figma file in parallel, the first subagent created the variables, and the second saw them as pre-existing and skipped that work. The call-count comparison is therefore not meaningful. **To revisit:** re-run with **two separate sandbox files** (one per condition), measure `use_figma` calls for the full variable-creation + Button-build flow.

- [ ] **«If you read nothing else» compact reference block at the end of SKILL.md.** Proposed: a 6-rule re-anchoring block for mid-session drift. Reason for deferral: no eval evidence that mid-session drift is actually a recurring problem; the block adds ~15 lines to every SKILL.md load for unclear benefit. **To revisit:** only if real-world use surfaces a pattern of agents losing thread and forgetting the load-bearing rules. If that happens, prefer prompting the model to re-read SKILL.md rather than maintaining a duplicate compact reference.
