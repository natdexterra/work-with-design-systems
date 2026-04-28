/**
 * audit-states.js
 *
 * Module: 2 — Interactive states
 * Input:  COMPONENT_SET_ID (string)
 * Output: {
 *           componentName, componentId, componentType,
 *           stateProperty, allVariantProperties,
 *           expectedStates, foundStates, missingStates,
 *           percentage, note?
 *         }
 *
 * Infers the component archetype from the component set name (longest match
 * wins, so "Radio Button" maps to `radio button` rather than `button`),
 * then checks whether the variants cover the states expected for that
 * archetype. Static archetypes (tooltip, spinner, badge, …) score N/A
 * since interactive states do not apply.
 *
 * Usage: Run via use_figma with the figma-use skill loaded first.
 * Pass skillNames: "work-with-design-systems" for logging.
 */

const cs = figma.getNodeById(COMPONENT_SET_ID);
if (!cs || cs.type !== 'COMPONENT_SET') {
  return { error: `Node ${COMPONENT_SET_ID} is not a component set` };
}

// Expected states per component archetype.
//
// Multi-word keys exist alongside single-word ones because a "Radio Button"
// is *not* a button (no Pressed) and an "Inline Link" needs Visited like a
// link rather than the field/picker fallback. Longest-match wins so the
// multi-word key is preferred when present.
//
// Toggle/Checkbox/Radio include both interaction states AND binary-axis
// state names (Off/On, Unchecked/Checked, Unselected/Selected). Industry
// DS (Material, IBM Carbon, Polaris, Apple HIG) treat these as two state
// dimensions; permissive matching keeps a binary-only DS from scoring 0%.
// Proper multi-axis modeling deferred to v2.1.
const stateMap = {
  // Multi-word archetypes — must come before single-word fallbacks.
  'inline link':   ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled', 'Visited'],
  'icon button':   ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'],
  'radio button':  ['Unselected', 'Selected', 'Default', 'Hover', 'Focused', 'Disabled'],
  'toggle switch': ['Off', 'On', 'Default', 'Hover', 'Focused', 'Disabled'],
  'text field':    ['Default', 'Hover', 'Focused', 'Filled', 'Disabled', 'Error'],
  'date picker':   ['Default', 'Hover', 'Focused', 'Disabled', 'Error'],

  // Single-word archetypes.
  button:    ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'],
  link:      ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled', 'Visited'],
  input:     ['Default', 'Hover', 'Focused', 'Filled', 'Disabled', 'Error', 'Success'],
  select:    ['Default', 'Hover', 'Focused', 'Open', 'Filled', 'Disabled', 'Error'],
  textarea:  ['Default', 'Hover', 'Focused', 'Filled', 'Disabled', 'Error'],
  checkbox:  ['Unchecked', 'Checked', 'Indeterminate', 'Default', 'Hover', 'Focused', 'Disabled'],
  radio:     ['Unselected', 'Selected', 'Default', 'Hover', 'Focused', 'Disabled'],
  toggle:    ['Off', 'On', 'Default', 'Hover', 'Focused', 'Disabled'],
  switch:    ['Default', 'Hover', 'Focused', 'Disabled'],
  tab:       ['Default', 'Hover', 'Active', 'Focused', 'Disabled'],
  toast:     ['Info', 'Warning', 'Error', 'Success'],
  alert:     ['Info', 'Warning', 'Error', 'Success'],
  badge:     ['Default'],
  avatar:    ['Default'],
  card:      ['Default'],
  modal:     ['Default'],
  dialog:    ['Default'],
  tooltip:   ['Default']
};

// Archetypes that legitimately don't have interactive states. Forcing a
// State property on these is incorrect per Material / Polaris / Carbon —
// state for pagination/breadcrumbs lives in the nested item, not the wrapper.
// Tabs are NOT here: tabs require Default/Hover/Active/Focused/Disabled.
const NO_STATE_REQUIRED = new Set([
  'tooltip', 'spinner', 'loader',
  'image', 'video', 'logo',
  'pagination', 'breadcrumbs',
  'badge', 'avatar', 'divider'
]);

// Strip non-letters so "Radio Button" → "radiobutton" and "icon-button"
// → "iconbutton". Apply same transform to keys when comparing so multi-word
// keys with spaces still match.
const normalize = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
const nameNorm = normalize(cs.name);
const archetypeKeys = Object.keys(stateMap);
const matches = archetypeKeys.filter(t => nameNorm.includes(normalize(t)));
const componentType = matches.sort((a, b) => b.length - a.length)[0] || 'unknown';
const expectedStates = componentType === 'unknown' ? ['Default'] : stateMap[componentType];

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

// Short-circuit: archetype legitimately has no interactive-state axis.
if (NO_STATE_REQUIRED.has(componentType)) {
  return {
    componentName: cs.name,
    componentId: cs.id,
    componentType,
    stateProperty: null,
    allVariantProperties: Object.fromEntries(
      Object.entries(variantProps).map(([k, v]) => [k, [...v]])
    ),
    expectedStates: [],
    foundStates: [],
    missingStates: [],
    percentage: 100,
    note: 'Archetype does not require interactive states — score N/A.'
  };
}

// Singular `State` is canonical (Figma's recommendation, all major DS).
// Plural `States` and `Status`/`Condition` accepted as real-world tolerance.
const stateKey = Object.keys(variantProps).find(k =>
  ['state', 'states', 'status', 'condition'].includes(k.toLowerCase())
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
