/**
 * audit-states.js
 *
 * Module: 2 — Interactive states
 * Input:  COMPONENT_SET_ID (string)
 * Output: {
 *           componentName, componentId, componentType,
 *           stateProperty, allVariantProperties,
 *           expectedStates, foundStates, missingStates,
 *           percentage
 *         }
 *
 * Infers the component archetype from the component set name, then checks
 * whether the variants cover the states expected for that archetype.
 *
 * Usage: Run via use_figma with the figma-use skill loaded first.
 * Pass skillNames: "work-with-design-systems" for logging.
 */

const cs = figma.getNodeById(COMPONENT_SET_ID);
if (!cs || cs.type !== 'COMPONENT_SET') {
  return { error: `Node ${COMPONENT_SET_ID} is not a component set` };
}

// Expected states per component archetype.
const stateMap = {
  button:   ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'],
  link:     ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'],
  input:    ['Default', 'Hover', 'Focused', 'Filled', 'Disabled', 'Error', 'Success'],
  select:   ['Default', 'Hover', 'Focused', 'Filled', 'Disabled', 'Error'],
  textarea: ['Default', 'Hover', 'Focused', 'Filled', 'Disabled', 'Error'],
  checkbox: ['Default', 'Hover', 'Focused', 'Disabled'],
  radio:    ['Default', 'Hover', 'Focused', 'Disabled'],
  toggle:   ['Default', 'Hover', 'Focused', 'Disabled'],
  switch:   ['Default', 'Hover', 'Focused', 'Disabled'],
  tab:      ['Default', 'Hover', 'Active', 'Focused', 'Disabled'],
  toast:    ['Info', 'Warning', 'Error', 'Success'],
  alert:    ['Info', 'Warning', 'Error', 'Success'],
  badge:    ['Default'],
  avatar:   ['Default'],
  card:     ['Default'],
  modal:    ['Default'],
  dialog:   ['Default'],
  tooltip:  ['Default']
};

const nameLower = cs.name.toLowerCase().replace(/[^a-z]/g, '');
let componentType = 'unknown';
let expectedStates = ['Default'];

for (const [type, states] of Object.entries(stateMap)) {
  if (nameLower.includes(type)) {
    componentType = type;
    expectedStates = states;
    break;
  }
}

// Parse variant names ("Type=Primary, Size=Medium, State=Hover")
const variantProps = {};
for (const variant of cs.children) {
  if (!variant.name) continue;
  const pairs = variant.name.split(',').map(p => p.trim());
  for (const pair of pairs) {
    const [key, val] = pair.split('=').map(s => s.trim());
    if (!key || !val) continue;
    if (!variantProps[key]) variantProps[key] = new Set();
    variantProps[key].add(val);
  }
}

const stateKey = Object.keys(variantProps).find(k =>
  ['state', 'status', 'condition'].includes(k.toLowerCase())
);

const foundStates = stateKey ? [...variantProps[stateKey]] : ['Default'];
const foundNorm = new Set(foundStates.map(s => s.toLowerCase()));
const missingStates = expectedStates.filter(s => !foundNorm.has(s.toLowerCase()));
const percentage = expectedStates.length > 0
  ? Math.round(((expectedStates.length - missingStates.length) / expectedStates.length) * 1000) / 10
  : 100;

return {
  componentName: cs.name,
  componentId: cs.id,
  componentType,
  stateProperty: stateKey || null,
  allVariantProperties: Object.fromEntries(
    Object.entries(variantProps).map(([k, v]) => [k, [...v]])
  ),
  expectedStates,
  foundStates,
  missingStates,
  percentage
};
