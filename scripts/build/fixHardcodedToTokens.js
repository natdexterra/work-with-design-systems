/**
 * fixHardcodedToTokens.js
 *
 * Module: Build / Auto-fix
 * Input:  {
 *   componentSetIds: string[],          // component sets to process
 *   threshold?: number                  // similarity threshold, default 0.85
 * }
 * Output: { applied: [...], skipped: [...], summary: {...} }
 *
 * Reads existing variables, finds the best fuzzy match for each hardcoded
 * value in the listed component sets, and applies bindings above threshold.
 *
 * Usage: Run via use_figma with the figma-use skill loaded first.
 * Pass skillNames: "work-with-design-systems" for logging.
 *
 * Pre-conditions:
 * - Variables must have explicit scopes (no ALL_SCOPES) — Phase 1c health check
 * - Variables must have codeSyntax.WEB
 * - The user must have explicitly opted in
 *
 * Read references/build/auto-fix-guide.md before running.
 */

const THRESHOLD = (typeof threshold === 'number') ? threshold : 0.85;
const SEMANTIC_BOOST = 0.1;

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const varsByScope = {
  FRAME_FILL: [], SHAPE_FILL: [], TEXT_FILL: [], STROKE_COLOR: [],
  GAP: [], WIDTH_HEIGHT: [], CORNER_RADIUS: []
};

for (const collection of collections) {
  const isSemantic = /semantic|alias|tokens?/i.test(collection.name);
  for (const variableId of collection.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(variableId);
    if (!v) continue;
    if (/^_deprecated/.test(v.name)) continue;
    for (const scope of v.scopes) {
      if (varsByScope[scope]) {
        varsByScope[scope].push({
          id: v.id,
          name: v.name,
          variable: v,
          isSemantic,
          resolvedType: v.resolvedType,
          defaultMode: collection.defaultModeId
        });
      }
    }
  }
}

const applied = [];
const skipped = [];

for (const csId of componentSetIds) {
  const cs = figma.getNodeById(csId);
  if (!cs || cs.type !== 'COMPONENT_SET') continue;

  for (const variant of cs.children) {
    const allNodes = [variant, ...variant.findAll(() => true)];
    for (const node of allNodes) {
      // Fills
      if (Array.isArray(node.fills)) {
        for (let i = 0; i < node.fills.length; i++) {
          const fill = node.fills[i];
          if (fill.type !== 'SOLID' || fill.visible === false) continue;
          if (node.boundVariables?.fills?.[i]) continue;
          const isText = node.type === 'TEXT';
          const candidates = isText
            ? varsByScope.TEXT_FILL
            : [...varsByScope.FRAME_FILL, ...varsByScope.SHAPE_FILL];
          await tryBindColor(node, 'fill', i, fill.color, candidates);
        }
      }
      // Strokes
      if (Array.isArray(node.strokes)) {
        for (let i = 0; i < node.strokes.length; i++) {
          const stroke = node.strokes[i];
          if (stroke.type !== 'SOLID' || stroke.visible === false) continue;
          if (node.boundVariables?.strokes?.[i]) continue;
          await tryBindColor(node, 'stroke', i, stroke.color, varsByScope.STROKE_COLOR);
        }
      }
      // Paddings, itemSpacing
      if (node.layoutMode && node.layoutMode !== 'NONE') {
        for (const prop of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'itemSpacing']) {
          if (typeof node[prop] !== 'number' || node[prop] === 0) continue;
          if (node.boundVariables?.[prop]) continue;
          await tryBindNumber(node, prop, node[prop],
            [...varsByScope.GAP, ...varsByScope.WIDTH_HEIGHT]);
        }
      }
      // Corner radius
      if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
        const isBound = node.boundVariables?.cornerRadius
          || node.boundVariables?.topLeftRadius;
        if (!isBound) {
          await tryBindNumber(node, 'cornerRadius', node.cornerRadius,
            varsByScope.CORNER_RADIUS);
        }
      }
    }
  }
}

return {
  applied,
  skipped,
  summary: {
    applied: applied.length,
    skipped: skipped.length,
    totalProcessed: applied.length + skipped.length
  }
};

// --- Helpers ---

async function tryBindColor(node, kind, idx, color, candidates) {
  if (!candidates.length) {
    return record(node, kind, idx, rgbHex(color), 'no candidates in scope', []);
  }
  const ranked = [];
  for (const c of candidates) {
    if (c.resolvedType !== 'COLOR') continue;
    const candVal = c.variable.valuesByMode[c.defaultMode];
    if (!candVal || typeof candVal !== 'object') continue;
    if (candVal.type === 'VARIABLE_ALIAS' || !('r' in candVal)) continue;
    let score = 1 - colorDistance(color, candVal) / 100;
    if (score < 0) score = 0;
    if (c.isSemantic) score = Math.min(1, score + SEMANTIC_BOOST);
    ranked.push({ name: c.name, id: c.id, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  await applyOrSkip(node, kind, idx, rgbHex(color), ranked);
}

async function tryBindNumber(node, prop, value, candidates) {
  if (!candidates.length) {
    return record(node, prop, null, `${value}px`, 'no candidates in scope', []);
  }
  const ranked = [];
  for (const c of candidates) {
    const candVal = c.variable.valuesByMode[c.defaultMode];
    if (typeof candVal !== 'number') continue;
    let score = 1 - Math.abs(value - candVal) / Math.max(value, candVal, 1);
    if (score < 0) score = 0;
    if (c.isSemantic) score = Math.min(1, score + SEMANTIC_BOOST);
    ranked.push({ name: c.name, id: c.id, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  await applyOrSkip(node, prop, null, `${value}px`, ranked);
}

async function applyOrSkip(node, prop, idx, value, ranked) {
  const top = ranked[0];
  if (top && top.score >= THRESHOLD) {
    const variable = await figma.variables.getVariableByIdAsync(top.id);
    if (prop === 'fill') {
      const fills = [...node.fills];
      fills[idx] = figma.variables.setBoundVariableForPaint(fills[idx], 'color', variable);
      node.fills = fills;
    } else if (prop === 'stroke') {
      const strokes = [...node.strokes];
      strokes[idx] = figma.variables.setBoundVariableForPaint(strokes[idx], 'color', variable);
      node.strokes = strokes;
    } else {
      node.setBoundVariable(prop, variable);
    }
    applied.push({
      node: node.name,
      nodeId: node.id,
      property: prop,
      value,
      boundTo: top.name,
      confidence: Math.round(top.score * 100) / 100
    });
  } else {
    skipped.push({
      node: node.name,
      nodeId: node.id,
      property: prop,
      value,
      reason: 'no candidate above threshold',
      candidates: ranked.slice(0, 3).map(r => ({
        name: r.name,
        score: Math.round(r.score * 100) / 100
      }))
    });
  }
}

function record(node, prop, idx, value, reason, candidates) {
  skipped.push({ node: node.name, nodeId: node.id, property: prop, value, reason, candidates });
}

function rgbHex(c) {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function colorDistance(a, b) {
  // Simplified RGB distance scaled to ~0-100. For production-grade matching,
  // replace with ΔE2000 in CIELAB.
  const dr = (a.r - b.r) * 255;
  const dg = (a.g - b.g) * 255;
  const db = (a.b - b.b) * 255;
  return Math.sqrt(dr * dr + dg * dg + db * db) / Math.sqrt(3 * 255 * 255) * 100;
}
