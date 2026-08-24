/**
 * inventory.js
 *
 * Module: 0 — Component inventory
 * Input:  PAGE_ID (string, optional) — page to scan; defaults to the current
 *         page. One page per call: fan out one call per page and merge.
 * Output: {
 *           components: [{ name, nodeId, page, variantCount, isStandalone?,
 *                          hasDescription, descriptionLength }],
 *           totalComponents: number,
 *           totalVariants:   number,
 *           scannedPage: { id, name },
 *           otherPages:  [{ id, name }]   // pages NOT covered by this call
 *         }
 *
 * Run this first. The remaining audit modules consume the
 * `nodeId` of each component set returned here.
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

const components = [];
let totalVariants = 0;

{
  const sets = page.findAllWithCriteria({ types: ['COMPONENT_SET'] });
  const standaloneComponents = page
    .findAllWithCriteria({ types: ['COMPONENT'] })
    .filter(n => n.parent?.type !== 'COMPONENT_SET');

  for (const cs of sets) {
    const variantCount = cs.children.length;
    totalVariants += variantCount;
    components.push({
      name: cs.name,
      nodeId: cs.id,
      page: page.name,
      variantCount,
      hasDescription: !!cs.description,
      descriptionLength: cs.description?.length || 0
    });
  }

  for (const c of standaloneComponents) {
    totalVariants += 1;
    components.push({
      name: c.name,
      nodeId: c.id,
      page: page.name,
      variantCount: 1,
      isStandalone: true,
      hasDescription: !!c.description,
      descriptionLength: c.description?.length || 0
    });
  }
}

return {
  components,
  totalComponents: components.length,
  totalVariants,
  scannedPage: { id: page.id, name: page.name },
  otherPages
};
