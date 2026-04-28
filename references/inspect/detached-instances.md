# Module 4 — Detached instances scanner

Scans every page of the file for `FRAME` nodes whose name matches a known component or component-set name. These are almost always detached instances — copies of components edited locally, breaking the dependency chain and Critical Rule #11.

Source script: `scripts/inspect/audit-detached.js`.

## Goal

Detached instances poison every downstream tool: they don't update with the component, they don't surface variant info to `get_design_context`, and they hide breaking changes. A healthy file has zero detached frames matching component names.

## How it works

1. Save `figma.currentPage` so the scan doesn't strand the user on a different page when it finishes
2. Walk every page; collect names of all `COMPONENT_SET` and standalone `COMPONENT` nodes into a Set
3. Walk every page again; on each page find every `FRAME` whose `name` is in the Set
4. For each match, record name, nodeId, page, parent path (Auto Layout breadcrumbs), and `(x, y)` coordinates
5. Restore the user's original page

Page traversal needs `figma.loadAllPagesAsync()` if the runtime is in dynamic-page mode. The script calls it where supported.

## Output shape

```js
{
  detachedInstances: [
    {
      name: "Button",
      nodeId: "12:34",
      page: "Customer Portal — Onboarding",
      parentPath: "Onboarding flow / Step 2 / Action group",
      x: 480,
      y: 1200
    }
  ],
  count: 1
}
```

## Heuristic limitations

- **False positives.** A frame literally named `Button` that was always meant to be a frame (e.g., a section title that happens to read "Button") will be flagged. Rare for well-named frames; review the count and parent path before acting.
- **False negatives — renamed detached instances.** If a designer detached a Button and then renamed the frame to `Submit CTA`, this scanner won't catch it. There's no reliable way to detect renamed detached instances at scale.
- **False negatives — partial detaches via overrides.** Instances with heavy overrides aren't detected; only fully detached frames trigger the scan. That's fine — instances with overrides still update with the component.

## Recommended consumption

Detached instances appear in the file-wide issues block of the report, as a count plus a per-instance table sorted by page. Action items per row:

- Re-instance: select the frame, replace with an actual component instance (`Insert > Component`), and re-apply any intended overrides as proper variant or text-property values
- Investigate: if the frame is genuinely standalone (a one-off composition), rename it so the audit stops flagging it
- Refactor: if the same name keeps reappearing detached, the underlying component probably lacks a variant or slot the user needed — fix the component, not the instance

## Cost

Module 4 traverses every page twice. On large files with many pages, it is the slowest module. If audit time is a concern, run Module 4 on its own less frequently than the per-component modules.

## Why not check during component construction

The scan is file-wide, so it doesn't fit per-component pipelines. It catches problems caused outside design-system maintenance — usually downstream consumers detaching components in product files imported into the same Figma file. Run it as part of any DS health check, not just before a release.
