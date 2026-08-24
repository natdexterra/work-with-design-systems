/**
 * audit-detached.js
 *
 * Module: 4 — Detached instances scanner
 * Input:  PAGE_ID (string, optional) — page to scan; defaults to the current
 *         page. One page per call: fan out one call per page and merge.
 * Output: { detachedInstances: [...], count, scannedPage, otherPages }
 *
 * Walks one page and collects FRAME nodes that Figma itself flags as
 * previously-instances via the canonical `node.detachedInfo` property
 * (Plugin API — InstanceNode). Avoids the false positives that name-matching
 * heuristics produce on documentation/spec frames.
 *
 * Per the Plugin API: `detachedInfo` is `{ id }` for local components,
 * `{ key }` for library components, and `null` if the node was never an
 * instance.
 *
 * Usage: Run via use_figma with the figma-use skill loaded first.
 * Pass skillNames: "work-with-design-systems" for logging.
 */

// Page scope. The use_figma runtime allows at most one page switch per call and
// has no loadAllPagesAsync (looping setCurrentPageAsync reloads the file each
// time). Scan ONE page: PAGE_ID when the caller defines it, else the current
// page. Fan out one call per page (in one message) and merge the results.
let page = figma.currentPage;
if (typeof PAGE_ID !== 'undefined' && PAGE_ID) {
  const target = await figma.getNodeByIdAsync(PAGE_ID);
  if (!target || target.type !== 'PAGE') {
    return { error: `PAGE_ID ${PAGE_ID} is not a page` };
  }
  await figma.setCurrentPageAsync(target);
  page = target;
}
const otherPages = figma.root.children
  .filter(p => p.id !== page.id)
  .map(p => ({ id: p.id, name: p.name }));

const detached = [];

{
  // Canonical detection: only frames Figma itself flags as previously-instances.
  const candidates = page.findAll(n =>
    n.type === 'FRAME' && n.detachedInfo !== null && n.detachedInfo !== undefined
  );

  for (const frame of candidates) {
    const info = frame.detachedInfo || {};

    // Resolve original component name where possible (id is local, key is library).
    let sourceName = frame.name;
    if (info.id) {
      const source = await figma.getNodeByIdAsync(info.id);
      if (source && (source.type === 'COMPONENT' || source.type === 'COMPONENT_SET')) {
        sourceName = source.name;
      }
    }

    const parentPath = [];
    let p = frame.parent;
    while (p && p.type !== 'PAGE') {
      parentPath.unshift(p.name);
      p = p.parent;
    }

    detached.push({
      frameName: frame.name,
      sourceComponent: sourceName,
      sourceId: info.id || null,
      sourceKey: info.key || null,
      nodeId: frame.id,
      page: page.name,
      parentPath: parentPath.join(' / ') || '(top level)',
      x: Math.round(frame.x),
      y: Math.round(frame.y)
    });
  }
}

return {
  detachedInstances: detached,
  count: detached.length,
  scannedPage: { id: page.id, name: page.name },
  otherPages
};
