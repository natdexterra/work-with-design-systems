/**
 * audit-naming.js
 *
 * Module: 5 — Naming quality
 * Input:  COMPONENT_SET_ID (string)
 * Output: {
 *           componentName, componentId,
 *           semantic, total, percentage,
 *           genericNames: [{ name, type, nodeId }]
 *         }
 *
 * Flags layers inside a component set that still carry Figma's auto-generated
 * names ("Frame 12", "Rectangle 4", etc.). Names are deduplicated across
 * variants so a shared layer is only counted once.
 *
 * Usage: Run via use_figma with the figma-use skill loaded first.
 * Pass skillNames: "work-with-design-systems" for logging.
 */

const cs = figma.getNodeById(COMPONENT_SET_ID);
if (!cs || cs.type !== 'COMPONENT_SET') {
  return { error: `Node ${COMPONENT_SET_ID} is not a component set` };
}

const genericPattern = /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Text|Instance|Component|Polygon|Star|Boolean|Union|Subtract|Intersect|Exclude|Slice|Image)\s+\d+$/;

const genericNames = [];
const allNames = new Set();

for (const variant of cs.children) {
  const allNodes = variant.findAll(() => true);
  for (const node of allNodes) {
    if (allNames.has(node.name)) continue;
    allNames.add(node.name);

    if (genericPattern.test(node.name)) {
      genericNames.push({
        name: node.name,
        type: node.type,
        nodeId: node.id
      });
    }
  }
}

const total = allNames.size;
const semantic = total - genericNames.length;
const percentage = total > 0 ? Math.round((semantic / total) * 1000) / 10 : 100;

return {
  componentName: cs.name,
  componentId: cs.id,
  semantic,
  total,
  percentage,
  genericNames
};
