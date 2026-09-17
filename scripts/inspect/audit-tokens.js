/**
 * audit-tokens.js
 *
 * Module: 1 — Token compliance
 * Input:  COMPONENT_SET_ID (string)
 * Output: {
 *           componentName, componentId,
 *           errors:   [{ component, variant, node, nodeId, property, value, path, issue }],
 *           warnings: [{ component, variant, node, nodeId, property, value, path, issue }],
 *           summary:  { errorCount, warningCount, totalChecked }
 *         }
 *
 * Severity:
 *   - errors  → unbound fills, strokes, padding/itemSpacing on the common scale,
 *               corner radius, missing text styles on TEXT nodes
 *   - warnings → raw fill/stroke opacity (< 1) on a bound paint, raw blur effects
 *
 * A raw opacity on a bound paint has a remedy: a colour variable that aliases
 * another colour and carries its own opacity. The warning states it, and names
 * the token when the file holds one at the same colour and opacity, bindable in
 * the place the raw value was found.
 *
 * Spacing values outside the common scale are NOT flagged
 * (per Critical Rule #3 — component-specific dimensions are allowed).
 *
 * Usage: Run via use_figma with the figma-use skill loaded first.
 * Pass skillNames: "work-with-design-systems" for logging.
 */

const cs = await figma.getNodeByIdAsync(COMPONENT_SET_ID);
if (!cs || cs.type !== 'COMPONENT_SET') {
  return { error: `Node ${COMPONENT_SET_ID} is not a component set` };
}

const COMMON_SCALE = [2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96];

// Type guards — Figma's Plugin API throws (not returns undefined) when these
// properties are accessed on incompatible node types. Membership check first.
const LAYOUT_TYPES = new Set([
  'FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'
]);

const RADIUS_TYPES = new Set([
  'FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'RECTANGLE'
]);

const PAINT_TYPES = new Set([
  'FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE',
  'RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR',
  'VECTOR', 'BOOLEAN_OPERATION', 'TEXT', 'LINE'
]);

const errors = [];
const warnings = [];
let totalChecked = 0;

// Alpha tokens: colour variables whose value is an alias (or literal) carrying
// its own opacity — { color, opacity }, opacity being a percent that may itself
// alias a FLOAT variable (scoped COLOR_OPACITY). They are the remedy for a raw
// opacity on a bound paint, so the warning can now name one instead of calling
// the raw value "maybe intentional".
const alphaTokens = await collectAlphaTokens();

// Which scopes make a token bindable where the raw opacity was found. A file
// usually holds the same colour at the same opacity for text and for surfaces;
// naming the one that cannot be bound here would be a false lead.
const FILL_SCOPES = ['FRAME_FILL', 'SHAPE_FILL'];
const TEXT_SCOPES = ['TEXT_FILL'];
const STROKE_SCOPES = ['STROKE_COLOR'];

for (const variant of cs.children) {
  const allNodes = [variant, ...variant.findAll(() => true)];

  for (const node of allNodes) {
    const bindings = node.boundVariables || {};
    const path = getNodePath(node, variant);
    const ctx = {
      component: cs.name,
      variant: variant.name,
      node: node.name,
      nodeId: node.id,
      path
    };

    // --- Fills / Strokes / Effects — only paint-capable types ---
    if (PAINT_TYPES.has(node.type)) {
      if (Array.isArray(node.fills)) {
        for (let i = 0; i < node.fills.length; i++) {
          const fill = node.fills[i];
          if (fill.type !== 'SOLID' || fill.visible === false) continue;
          totalChecked++;

          const isBound = !!bindings.fills?.[i];
          if (!isBound) {
            errors.push({
              ...ctx,
              property: 'fill',
              value: rgbToHex(fill.color, fill.opacity),
              issue: 'unbound fill'
            });
          } else if (fill.opacity !== undefined && fill.opacity < 1) {
            warnings.push({
              ...ctx,
              property: 'fill.opacity',
              value: `${Math.round(fill.opacity * 100)}%`,
              issue: opacityRemedy(
                'fill',
                fill.color,
                fill.opacity,
                node.type === 'TEXT' ? TEXT_SCOPES : FILL_SCOPES
              )
            });
          }
        }
      }

      if (Array.isArray(node.strokes)) {
        for (let i = 0; i < node.strokes.length; i++) {
          const stroke = node.strokes[i];
          if (stroke.type !== 'SOLID' || stroke.visible === false) continue;
          totalChecked++;

          const isBound = !!bindings.strokes?.[i];
          if (!isBound) {
            errors.push({
              ...ctx,
              property: 'stroke',
              value: rgbToHex(stroke.color, stroke.opacity),
              issue: 'unbound stroke'
            });
          } else if (stroke.opacity !== undefined && stroke.opacity < 1) {
            warnings.push({
              ...ctx,
              property: 'stroke.opacity',
              value: `${Math.round(stroke.opacity * 100)}%`,
              issue: opacityRemedy('stroke', stroke.color, stroke.opacity, STROKE_SCOPES)
            });
          }
        }
      }

      if (Array.isArray(node.effects)) {
        for (let i = 0; i < node.effects.length; i++) {
          const effect = node.effects[i];
          if (!effect.visible) continue;
          if (effect.type !== 'LAYER_BLUR' && effect.type !== 'BACKGROUND_BLUR') continue;
          totalChecked++;
          const isBound = !!bindings.effects?.[i];
          if (!isBound) {
            warnings.push({
              ...ctx,
              property: 'effect.blur',
              value: `${effect.radius}px`,
              issue: 'raw blur radius'
            });
          }
        }
      }
    }

    // --- Spacing (padding + itemSpacing) — only auto-layout-capable types ---
    if (LAYOUT_TYPES.has(node.type) && node.layoutMode && node.layoutMode !== 'NONE') {
      for (const prop of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'itemSpacing']) {
        const value = node[prop];
        if (typeof value !== 'number' || value <= 0) continue;
        if (bindings[prop]) {
          totalChecked++;
          continue;
        }
        // Only flag when the raw value lands on the common scale —
        // those almost certainly should be tokens.
        if (COMMON_SCALE.includes(value)) {
          totalChecked++;
          errors.push({
            ...ctx,
            property: prop,
            value: `${value}px`,
            issue: `unbound ${prop} on common scale`
          });
        }
      }
    }

    // --- Corner radius — only radius-capable types ---
    if (RADIUS_TYPES.has(node.type) && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
      totalChecked++;
      const isBound = !!(bindings.cornerRadius || bindings.topLeftRadius);
      if (!isBound) {
        errors.push({
          ...ctx,
          property: 'cornerRadius',
          value: `${node.cornerRadius}px`,
          issue: 'unbound cornerRadius'
        });
      }
    }

    // --- Text styles ---
    if (node.type === 'TEXT') {
      totalChecked++;
      if (!node.textStyleId) {
        errors.push({
          ...ctx,
          property: 'textStyle',
          value: `${node.fontSize}px / ${node.fontName?.family || 'unknown'}`,
          issue: 'missing text style'
        });
      }
    }
  }
}

const dedupedErrors = dedupe(errors);
const dedupedWarnings = dedupe(warnings);

return {
  componentName: cs.name,
  componentId: cs.id,
  errors: dedupedErrors,
  warnings: dedupedWarnings,
  summary: {
    errorCount: dedupedErrors.length,
    warningCount: dedupedWarnings.length,
    totalChecked
  }
};

// --- Helpers ---

// Every colour variable in the file whose value is an alias-with-opacity,
// resolved to { name, scopes, r, g, b, percent } in its collection's default
// mode. Modes are not walked: a raw opacity on a paint has no mode either, and
// a token that matches in the default mode is the one to point the reader at.
async function collectAlphaTokens() {
  const tokens = [];
  const variables = await figma.variables.getLocalVariablesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const defaultModeOf = new Map(collections.map(c => [c.id, c.defaultModeId]));

  for (const v of variables) {
    if (v.resolvedType !== 'COLOR') continue;
    const value = v.valuesByMode[defaultModeOf.get(v.variableCollectionId)];
    if (!value || typeof value !== 'object' || value.color === undefined) continue;

    const color = await resolveColorLiteral(value.color);
    if (!color) continue;

    let percent = null;
    if (typeof value.opacity === 'number') {
      percent = value.opacity;
    } else if (value.opacity && value.opacity.type === 'VARIABLE_ALIAS') {
      const opacityVar = await figma.variables.getVariableByIdAsync(value.opacity.id);
      if (opacityVar) {
        const raw = opacityVar.valuesByMode[defaultModeOf.get(opacityVar.variableCollectionId)];
        if (typeof raw === 'number') percent = raw;
      }
    }
    if (percent === null) continue;

    tokens.push({
      name: v.name,
      scopes: v.scopes || [],
      r: color.r,
      g: color.g,
      b: color.b,
      percent: percent * (color.a === undefined ? 1 : color.a)
    });
  }
  return tokens;
}

// Follow a colour slot (literal or alias) to a literal, in each collection's
// default mode. Depth-capped: an alias cycle would otherwise never return.
async function resolveColorLiteral(value, depth = 0) {
  if (depth > 10 || !value || typeof value !== 'object') return null;
  if ('r' in value) return value;
  if (value.type !== 'VARIABLE_ALIAS') return null;
  const aliased = await figma.variables.getVariableByIdAsync(value.id);
  if (!aliased) return null;
  const collection = await figma.variables.getVariableCollectionByIdAsync(aliased.variableCollectionId);
  if (!collection) return null;
  const next = aliased.valuesByMode[collection.defaultModeId];
  if (next && typeof next === 'object' && next.color !== undefined) {
    return resolveColorLiteral(next.color, depth + 1);
  }
  return resolveColorLiteral(next, depth + 1);
}

// The warning text for a raw opacity on a bound paint: state the remedy, and
// name the token when the file already holds one at this colour and opacity.
function opacityRemedy(kind, color, opacity, scopes) {
  const percent = Math.round(opacity * 100);
  const match = alphaTokens.find(t =>
    t.scopes.some(s => scopes.includes(s))
    && Math.abs(t.r - color.r) <= 0.004
    && Math.abs(t.g - color.g) <= 0.004
    && Math.abs(t.b - color.b) <= 0.004
    && Math.abs(t.percent - percent) <= 0.5
  );
  return match
    ? `raw opacity on bound ${kind} — use the alias-with-opacity token "${match.name}" instead`
    : `raw opacity on bound ${kind} — add an alias-with-opacity token (alias + ${percent}% opacity) instead of the raw opacity`;
}

function getNodePath(node, root) {
  const parts = [];
  let current = node;
  while (current && current.id !== root.id) {
    parts.unshift(current.name);
    current = current.parent;
  }
  return parts.join(' / ');
}

function rgbToHex(color, opacity) {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  if (opacity !== undefined && opacity < 1) {
    return `${hex} (${Math.round(opacity * 100)}%)`;
  }
  return hex;
}

// Collapse the same issue when it repeats across variants — the fix
// will land on the shared layer regardless of which variant surfaced it.
function dedupe(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.node}|${item.property}|${item.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
