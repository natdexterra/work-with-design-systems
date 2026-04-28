/**
 * audit-accessibility.js
 *
 * Module: 3 — Accessibility (WCAG 2.1 AA)
 * Input:  COMPONENT_SET_ID (string)
 * Output: {
 *           componentName, componentId,
 *           checks: [{ name, passed, details, ... }],
 *           passed, total, percentage
 *         }
 *
 * Checks:
 *   - Color contrast (WCAG 1.4.3) — text vs nearest ancestor background
 *   - Touch target (WCAG 2.5.5) — Default variant ≥ 44×44 for interactive types
 *   - Font size minimum — text ≥ 12px
 *   - Focus indicator (WCAG 2.4.7) — Focused state variant exists for interactive types
 *
 * Usage: Run via use_figma with the figma-use skill loaded first.
 * Pass skillNames: "work-with-design-systems" for logging.
 */

const cs = figma.getNodeById(COMPONENT_SET_ID);
if (!cs || cs.type !== 'COMPONENT_SET') {
  return { error: `Node ${COMPONENT_SET_ID} is not a component set` };
}

const checks = [];

// --- 1. Color contrast (WCAG 1.4.3) ---
const contrastIssues = [];

for (const variant of cs.children) {
  const textNodes = variant.findAll(n => n.type === 'TEXT');

  for (const textNode of textNodes) {
    const textFill = getFirstSolidFill(textNode);
    if (!textFill) continue;

    const bgColor = findAncestorBackground(textNode, variant);
    if (!bgColor) continue;

    const textLum = luminance(textFill.r * 255, textFill.g * 255, textFill.b * 255);
    const bgLum = luminance(bgColor.r * 255, bgColor.g * 255, bgColor.b * 255);
    const ratio = contrastRatio(textLum, bgLum);

    const fontSize = textNode.fontSize || 16;
    const isBold = isBoldStyle(textNode);
    const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && isBold);
    const requiredRatio = isLargeText ? 3 : 4.5;

    if (ratio < requiredRatio) {
      contrastIssues.push({
        node: textNode.name,
        variant: variant.name,
        ratio: Math.round(ratio * 100) / 100,
        required: requiredRatio,
        fontSize,
        isLargeText
      });
    }
  }
}

checks.push({
  name: 'Color contrast (WCAG 1.4.3)',
  passed: contrastIssues.length === 0,
  details: contrastIssues.length === 0
    ? 'All text nodes pass contrast requirements'
    : `${contrastIssues.length} nodes fail contrast`,
  issues: contrastIssues
});

// --- 2. Touch target (WCAG 2.5.5) ---
const nameLower = cs.name.toLowerCase();
const isInteractive = ['button', 'input', 'select', 'checkbox', 'radio', 'toggle', 'switch', 'link', 'tab']
  .some(t => nameLower.includes(t));

if (isInteractive) {
  // Find the actual Default variant by parsing variant names —
  // children[0] is whatever Figma emitted first, not necessarily Default.
  const defaultVariant = cs.children.find(v => {
    const pairs = v.name.split(',').map(p => p.trim());
    return pairs.some(pair => {
      const [key, val] = pair.split('=').map(s => s.trim());
      return key
        && ['state', 'status'].includes(key.toLowerCase())
        && val
        && val.toLowerCase() === 'default';
    });
  }) || cs.children[0];

  const width = defaultVariant.width || 0;
  const height = defaultVariant.height || 0;
  const passes = width >= 44 && height >= 44;

  checks.push({
    name: 'Touch target (WCAG 2.5.5)',
    passed: passes,
    details: passes
      ? `${Math.round(width)}×${Math.round(height)}px (passes 44×44 minimum)`
      : `${Math.round(width)}×${Math.round(height)}px (below 44×44 minimum)`,
    width: Math.round(width),
    height: Math.round(height),
    measuredVariant: defaultVariant.name
  });
}

// --- 3. Font size minimum ---
const smallFontIssues = [];

for (const variant of cs.children) {
  const textNodes = variant.findAll(n => n.type === 'TEXT');
  for (const textNode of textNodes) {
    const size = textNode.fontSize || 16;
    if (size < 12) {
      smallFontIssues.push({
        node: textNode.name,
        variant: variant.name,
        fontSize: size,
        severity: size < 10 ? 'error' : 'warning'
      });
    }
  }
}

const seenFontNodes = new Set();
const dedupedFontIssues = smallFontIssues.filter(i => {
  if (seenFontNodes.has(i.node)) return false;
  seenFontNodes.add(i.node);
  return true;
});

checks.push({
  name: 'Font size minimum',
  passed: dedupedFontIssues.length === 0,
  details: dedupedFontIssues.length === 0
    ? 'All text nodes are 12px or larger'
    : `${dedupedFontIssues.length} text nodes below 12px`,
  issues: dedupedFontIssues
});

// --- 4. Focus indicator (WCAG 2.4.7) — only meaningful for interactive components ---
if (isInteractive) {
  const variantNames = cs.children.map(v => v.name.toLowerCase());
  const hasFocusState = variantNames.some(n => n.includes('focus'));

  checks.push({
    name: 'Focus indicator (WCAG 2.4.7)',
    passed: hasFocusState,
    details: hasFocusState
      ? 'Focused state variant exists'
      : 'No Focused state variant found'
  });
}

const passed = checks.filter(c => c.passed).length;

return {
  componentName: cs.name,
  componentId: cs.id,
  checks,
  passed,
  total: checks.length,
  percentage: checks.length > 0
    ? Math.round((passed / checks.length) * 1000) / 10
    : 100
};

// --- Helpers ---

function getFirstSolidFill(node) {
  if (!node.fills || !Array.isArray(node.fills)) return null;
  const solid = node.fills.find(f => f.type === 'SOLID' && f.visible !== false);
  return solid ? solid.color : null;
}

function findAncestorBackground(node, root) {
  let current = node.parent;
  while (current && current.id !== root.parent?.id) {
    const fill = getFirstSolidFill(current);
    if (fill) return fill;
    current = current.parent;
  }
  return null;
}

// Figma TEXT nodes don't expose fontWeight — only fontName.style.
function isBoldStyle(textNode) {
  const style = textNode.fontName?.style?.toLowerCase() || '';
  return style.includes('bold') || style.includes('black') || style.includes('heavy');
}

function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
