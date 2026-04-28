/**
 * inventory.js
 *
 * Module: 0 — Component inventory
 * Input:  none (scans entire file)
 * Output: {
 *           components: [{ name, nodeId, page, variantCount, isStandalone?,
 *                          hasDescription, descriptionLength }],
 *           totalComponents: number,
 *           totalVariants:   number
 *         }
 *
 * Run this first. The remaining audit modules consume the
 * `nodeId` of each component set returned here.
 *
 * Usage: Run via use_figma with the figma-use skill loaded first.
 * Pass skillNames: "work-with-design-systems" for logging.
 */

const originalPage = figma.currentPage;

const components = [];
let totalVariants = 0;

for (const page of figma.root.children) {
  await figma.setCurrentPageAsync(page);

  const sets = page.findAll(n => n.type === 'COMPONENT_SET');
  const standaloneComponents = page.findAll(n =>
    n.type === 'COMPONENT' && n.parent?.type !== 'COMPONENT_SET'
  );

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

await figma.setCurrentPageAsync(originalPage);

return {
  components,
  totalComponents: components.length,
  totalVariants
};
