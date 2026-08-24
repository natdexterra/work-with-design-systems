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

## File organization & presentation

- [ ] **Sticker-sheet / overview board as a first-class artifact.** Today Phase 3
  ("File structure") only produces multi-page *documentation* (Cover, Getting
  Started, Foundations, Components, Patterns, Utilities), and its "Components"
  page is per-component spec stacks (name + description + variants + states +
  sizes laid out vertically). There is **no compact, category-grouped specimen
  board** ("sticker sheet") that gathers every component set onto one frame for a
  screenshot / handoff / social post. Proposed: add an optional Phase 3
  deliverable — one auto-layout board (canvas background, brand display-font
  title, UPPERCASE category labels + thin dividers, wrap rows) that lays out all
  component sets grouped by category (Actions, Cards, Inputs, Feedback,
  Disclosure, Navigation, …) using the system's own tokens. Reason: this is the
  artifact people actually screenshot to show "I have a design system", building
  it by hand is repetitive, and the skill already knows the component inventory
  and the tokens, so it can generate it deterministically. Design note — the
  trade-off is **instances vs. reparenting**: dropping *instances* of each
  component set onto the board keeps the source library page untouched (safer,
  recommended default); *reparenting* the real sets gives a cleaner single-frame
  screenshot but empties the source page. Default to instances; offer reparent as
  an opt-in "presentation export". To revisit / validate: add an eval whose prompt
  is "give me a one-frame overview of all my components" and check the board is
  generated with correct grouping, token-driven styling, and no detached content.
  Source: hand-built for a real UI kit (2026-06-18) to screenshot for a
  skill post — the gap was obvious precisely because the skill could not generate it.

- [ ] **QA + inspect should cover file structure & page organization.** Phase 5 QA
  validates tokens, scopes, codeSyntax, descriptions, slots, and auto-layout — but
  nothing about whether the file is actually *organized*: standard pages present
  (or a documented override), page naming, component numbering (`C{section}.{number}`)
  applied, and whether an overview board exists. Inspect mode likewise has six
  modules (token compliance, interactive states, accessibility, detached instances,
  naming quality, descriptions) but **no "file organization" module**. Proposed: a
  lightweight structure check that flags missing standard pages, ungrouped /
  scattered components on the canvas, missing component numbering, and absence of a
  sticker sheet. Reason: "is this design system organized?" is a real handoff
  readiness signal, and right now the skill can output a perfectly-tokened file
  that is still a scattered mess on the canvas (exactly the starting state of a
  real Components page before manual cleanup). Keep findings as **warnings, not
  errors** — file/page structure is team-dependent and Phase 3 is explicitly
  skippable. To revisit / validate: add an eval whose prompt is "is my design
  system file well-organized?" and confirm the audit surfaces missing pages and
  scattered components without false-failing a deliberately minimal file.
