/**
 * audit-detached.js
 *
 * Module: 4 — Detached instances scanner
 * Input:  none (scans entire file)
 * Output: { detachedInstances: [...], count }
 *
 * Walks every page and flags FRAME nodes whose name matches a known
 * component or component-set name but which are not actually instances —
 * i.e. instances that were detached.
 *
 * Usage: Run via use_figma with the figma-use skill loaded first.
 * Pass skillNames: "work-with-design-systems" for logging.
 */

const originalPage = figma.currentPage;

if (typeof figma.loadAllPagesAsync === 'function') {
  await figma.loadAllPagesAsync();
}

// Step 1 — collect every component / component-set name in the file.
const componentNames = new Set();
for (const page of figma.root.children) {
  await figma.setCurrentPageAsync(page);

  const sets = page.findAll(n => n.type === 'COMPONENT_SET');
  const components = page.findAll(n =>
    n.type === 'COMPONENT' && n.parent?.type !== 'COMPONENT_SET'
  );

  for (const cs of sets) componentNames.add(cs.name);
  for (const c of components) componentNames.add(c.name);
}

// Step 2 — scan for FRAME nodes that share a name with a known component.
const detached = [];

for (const page of figma.root.children) {
  await figma.setCurrentPageAsync(page);

  const candidates = page.findAll(n =>
    n.type === 'FRAME' && componentNames.has(n.name)
  );

  for (const frame of candidates) {
    const parentPath = [];
    let p = frame.parent;
    while (p && p.type !== 'PAGE') {
      parentPath.unshift(p.name);
      p = p.parent;
    }

    detached.push({
      name: frame.name,
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
