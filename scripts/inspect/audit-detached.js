/**
 * audit-detached.js
 *
 * Module: 4 — Detached instances scanner
 * Input:  none (scans entire file)
 * Output: { detachedInstances: [...], count }
 *
 * Walks every page and collects FRAME nodes that Figma itself flags as
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

const originalPage = figma.currentPage;

const detached = [];

for (const page of figma.root.children) {
  await figma.setCurrentPageAsync(page);

  // Canonical detection: only frames Figma itself flags as previously-instances.
  const candidates = page.findAll(n =>
    n.type === 'FRAME' && n.detachedInfo !== null && n.detachedInfo !== undefined
  );

  for (const frame of candidates) {
    const info = frame.detachedInfo || {};

    // Resolve original component name where possible (id is local, key is library).
    let sourceName = frame.name;
    if (info.id) {
      const source = figma.getNodeById(info.id);
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

await figma.setCurrentPageAsync(originalPage);

return {
  detachedInstances: detached,
  count: detached.length
};
