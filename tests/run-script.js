/**
 * tests/run-script.js — Node harness for the use_figma scripts.
 *
 * The scripts under scripts/ are not modules: they end in a top-level
 * `return await runAudit();` (or a bare top-level `return`) and read a `figma`
 * global that only exists inside the use_figma runtime, so they cannot be
 * require()d. This harness reads a script's text, wraps it in an
 * AsyncFunction, and calls it with a mock `figma` built from a JSON fixture.
 *
 * What the mock provides — exactly what the four scripts touch. When a script
 * needs something the mock lacks, extend the mock; never stub the script.
 *
 *   figma.variables.getLocalVariablesAsync()
 *   figma.variables.getLocalVariableCollectionsAsync()
 *   figma.variables.getVariableByIdAsync(id)
 *   figma.variables.getVariableCollectionByIdAsync(id)
 *   figma.variables.setBoundVariableForPaint(paint, field, variable)
 *   figma.currentPage                 — page node (children, findAll, findAllWithCriteria)
 *   figma.root.children               — the fixture's pages
 *   figma.setCurrentPageAsync(page)
 *   figma.getNodeByIdAsync(id)        — any page or node declared in the fixture
 *   figma.getLocalTextStylesAsync() / getLocalEffectStylesAsync() / getLocalPaintStylesAsync()
 *
 * Node objects carry id, name, type, children, parent, findAll(fn),
 * findAllWithCriteria({ types }), setBoundVariable(prop, variable), plus every
 * property the fixture declares on them (fills, strokes, effects,
 * boundVariables, layoutMode, cornerRadius, …).
 *
 * Script parameters (COMPONENT_SET_ID, componentSetIds, threshold, PAGE_ID) are
 * passed as function parameters, which is how the use_figma runtime injects
 * them. A parameter the caller omits is `undefined` — the same state the
 * scripts guard with `typeof PAGE_ID !== "undefined"`.
 *
 * Every run gets a fresh deep clone of the fixture: the auto-fix script writes.
 */

const fs = require("fs");
const path = require("path");

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// Parameter names injected into every script, in this order. Scripts read only
// the ones they need; the rest stay undefined.
const SCRIPT_PARAMS = [
  "figma",
  "PAGE_ID",
  "COMPONENT_SET_ID",
  "componentSetIds",
  "threshold",
];

function loadFixture(fixturePath) {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

// Build node objects from the fixture tree: wire parents, add the traversal
// helpers, and index every node by id for getNodeByIdAsync.
function buildNodes(rawNodes, index, parent) {
  const nodes = [];
  for (const raw of rawNodes || []) {
    const node = { ...raw };
    node.children = buildNodes(raw.children, index, node);
    Object.defineProperty(node, "parent", { value: parent || null, enumerable: false });
    node.findAll = (predicate) => descendants(node).filter(predicate || (() => true));
    node.findAllWithCriteria = ({ types }) =>
      descendants(node).filter((n) => types.includes(n.type));
    node.setBoundVariable = (prop, variable) => {
      node.boundVariables = node.boundVariables || {};
      node.boundVariables[prop] = { type: "VARIABLE_ALIAS", id: variable.id };
    };
    index.set(node.id, node);
    nodes.push(node);
  }
  return nodes;
}

function descendants(node) {
  const out = [];
  for (const child of node.children || []) {
    out.push(child);
    out.push(...descendants(child));
  }
  return out;
}

function buildMockFigma(fixture) {
  const index = new Map();
  const pages = buildNodes(
    (fixture.pages || []).map((p) => ({ type: "PAGE", ...p })),
    index,
    null
  );

  const collections = (fixture.collections || []).map((c) => ({ ...c }));
  const variables = (fixture.variables || []).map((v) => ({ ...v }));
  const variableById = new Map(variables.map((v) => [v.id, v]));
  const collectionById = new Map(collections.map((c) => [c.id, c]));

  let currentPage =
    pages.find((p) => p.id === fixture.currentPageId) || pages[0] || null;

  return {
    root: { children: pages },
    get currentPage() {
      return currentPage;
    },
    setCurrentPageAsync: async (page) => {
      currentPage = page;
    },
    getNodeByIdAsync: async (id) => index.get(id) || null,
    getLocalTextStylesAsync: async () => fixture.textStyles || [],
    getLocalEffectStylesAsync: async () => fixture.effectStyles || [],
    getLocalPaintStylesAsync: async () => fixture.paintStyles || [],
    variables: {
      getLocalVariablesAsync: async () => variables,
      getLocalVariableCollectionsAsync: async () => collections,
      getVariableByIdAsync: async (id) => variableById.get(id) || null,
      getVariableCollectionByIdAsync: async (id) => collectionById.get(id) || null,
      setBoundVariableForPaint: (paint, field, variable) => ({
        ...paint,
        boundVariables: {
          ...(paint.boundVariables || {}),
          [field]: { type: "VARIABLE_ALIAS", id: variable.id },
        },
      }),
    },
  };
}

/**
 * Run one use_figma script against one fixture.
 * @param {string} scriptPath absolute path to the script file
 * @param {object} fixture    parsed fixture JSON (cloned here)
 * @param {object} args       { PAGE_ID, COMPONENT_SET_ID, componentSetIds, threshold }
 * @returns {Promise<*>}      whatever the script returns
 */
async function runScript(scriptPath, fixture, args = {}) {
  const text = fs.readFileSync(scriptPath, "utf8");
  const fresh = structuredClone(fixture);
  const figma = buildMockFigma(fresh);
  const fn = new AsyncFunction(...SCRIPT_PARAMS, text);
  return fn(
    figma,
    args.PAGE_ID,
    args.COMPONENT_SET_ID,
    args.componentSetIds,
    args.threshold
  );
}

module.exports = { runScript, loadFixture, buildMockFigma, SCRIPT_PARAMS, path };
