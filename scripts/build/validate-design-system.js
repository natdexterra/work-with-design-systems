/**
 * QA Validation Script for Design System — v1.3.1
 *
 * Audits a Figma design system file and returns a structured report.
 * Designed to run inside the Figma MCP server's `use_figma` context.
 *
 * Read-only: inspects but does not modify the file.
 *
 * Checks:
 *  - Variable collections (Primitives required; Semantic recommended)
 *  - Variable scopes (ALL_SCOPES violations)
 *  - codeSyntax.WEB coverage
 *  - Duplicate primitive values (grouped by name domain — spacing, radius, type, color separately)
 *  - Mode parity (values present in all modes)
 *  - Semantic Light/Dark mode presence
 *  - Text styles count and variable bindings
 *  - Effect styles count
 *  - Expected library pages (Cover, Foundations, Components) — informational, does not warn
 *  - Hardcoded color fills and strokes inside component trees
 *  - Missing Auto Layout on components
 *  - Text nodes without TEXT component properties
 *  - WCAG AA contrast for color/text × color/bg pairs in Light and Dark,
 *    scoped so that `color/text/on-{surface}` is only tested against
 *    backgrounds whose name contains `{surface}` as a segment.
 *
 * Per SKILL.md Critical Rule #3: this script flags hardcoded *colors*
 * only (fills, strokes). Component-specific pixel dimensions outside
 * the spacing scale are permitted and NOT flagged here.
 *
 * ---
 *
 * Usage via `use_figma` (MCP):
 *   The script calls `runAudit()` and returns its result at the top level.
 *   The MCP runtime wraps the script in an async context, so the `return`
 *   below delivers the audit report directly to the caller.
 *
 * Usage as a standalone Figma plugin:
 *   Replace the final `return await runAudit();` with:
 *     runAudit().then(
 *       (result) => figma.closePlugin(JSON.stringify(result)),
 *       (err) => figma.closePluginWithFailure(err.toString())
 *     );
 */

async function runAudit() {
  // Dynamic-page mode requires explicit page loading before iteration.
  // Prefer loadAllPagesAsync when available; fall back to per-page loading.
  if (typeof figma.loadAllPagesAsync === "function") {
    await figma.loadAllPagesAsync();
  } else {
    for (const page of figma.root.children) {
      await figma.setCurrentPageAsync(page);
    }
  }

  const issues = [];
  const stats = {
    variableCollections: 0,
    variables: 0,
    textStyles: 0,
    effectStyles: 0,
    components: 0,
    componentSets: 0,
    pages: figma.root.children.length,
  };

  const addIssue = (severity, category, message) => {
    issues.push({ severity, category, message });
  };

  // ---------- Helpers ----------

  // WCAG relative luminance. Input: {r,g,b} in 0..1.
  const relativeLuminance = (c) => {
    const lin = (v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  };

  const contrastRatio = (c1, c2) => {
    const l1 = relativeLuminance(c1);
    const l2 = relativeLuminance(c2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  // Check whether a paint has a color variable binding.
  // Handles both per-paint (paint.boundVariables.color) and node-level
  // (node.boundVariables.fills[idx] / strokes[idx]) binding paths.
  const isPaintBound = (node, paintsKey, paint, paintIndex) => {
    if (paint && paint.boundVariables && paint.boundVariables.color) {
      return true;
    }
    const nodeBindings = node.boundVariables && node.boundVariables[paintsKey];
    if (Array.isArray(nodeBindings) && nodeBindings[paintIndex]) {
      return true;
    }
    return false;
  };

  // Resolve a variable's color value for a given mode, following alias chains.
  // Prefers modes with matching names across collections; falls back to default.
  const colorCache = new Map();
  const resolveColorValue = async (variable, modeId, visited = new Set()) => {
    const cacheKey = `${variable.id}::${modeId}`;
    if (colorCache.has(cacheKey)) return colorCache.get(cacheKey);
    if (visited.has(variable.id)) return null;
    visited.add(variable.id);

    const raw = variable.valuesByMode[modeId];
    if (raw === undefined) {
      colorCache.set(cacheKey, null);
      return null;
    }

    if (raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS") {
      const aliased = await figma.variables.getVariableByIdAsync(raw.id);
      if (!aliased) {
        colorCache.set(cacheKey, null);
        return null;
      }
      const aliasedCol =
        await figma.variables.getVariableCollectionByIdAsync(
          aliased.variableCollectionId
        );
      const origCol = await figma.variables.getVariableCollectionByIdAsync(
        variable.variableCollectionId
      );
      const origModeName = origCol?.modes.find(
        (m) => m.modeId === modeId
      )?.name;
      const target =
        aliasedCol?.modes.find((m) => m.name === origModeName) ||
        aliasedCol?.modes.find(
          (m) => m.modeId === aliasedCol.defaultModeId
        ) ||
        aliasedCol?.modes[0];
      if (!target) {
        colorCache.set(cacheKey, null);
        return null;
      }
      const resolved = await resolveColorValue(
        aliased,
        target.modeId,
        visited
      );
      colorCache.set(cacheKey, resolved);
      return resolved;
    }

    if (raw && typeof raw === "object" && "r" in raw) {
      colorCache.set(cacheKey, raw);
      return raw;
    }

    colorCache.set(cacheKey, null);
    return null;
  };

  // Extract the top-level domain from a variable name (first segment before /).
  // "spacing/16" → "spacing", "color/text/primary" → "color", "radius/button" → "radius"
  const getDomain = (name) => {
    const idx = name.indexOf("/");
    return idx >= 0 ? name.slice(0, idx).toLowerCase() : name.toLowerCase();
  };

  // ---------- 1. Variable collections ----------
  const collections =
    await figma.variables.getLocalVariableCollectionsAsync();
  stats.variableCollections = collections.length;

  const lowerNames = collections.map((c) => c.name.toLowerCase());
  if (!lowerNames.some((n) => n.includes("primitiv"))) {
    addIssue("error", "tokens", 'Missing "Primitives" variable collection');
  }
  // Per v1.2.0 flexible architecture: flat domain-based collections are valid.
  if (!lowerNames.some((n) => n.includes("semantic"))) {
    addIssue(
      "warning",
      "tokens",
      'No "Semantic" collection found. If using flat domain-based architecture (Colors, Spacing, Radius), this is expected.'
    );
  }

  // ---------- 2. Variables: scopes, codeSyntax, mode parity, duplicates ----------
  const variables = await figma.variables.getLocalVariablesAsync();
  stats.variables = variables.length;

  let allScopesCount = 0;
  let missingCodeSyntaxCount = 0;
  // Duplicate detection is scoped by (mode, domain) pair. Variables from
  // different domains that happen to share a numeric value (e.g. spacing/16
  // and type/size/body, both = 16) are NOT considered duplicates.
  const primitiveValueMap = new Map();

  for (const v of variables) {
    if (v.scopes && v.scopes.length === 1 && v.scopes[0] === "ALL_SCOPES") {
      allScopesCount++;
    }
    if (
      !v.codeSyntax ||
      !v.codeSyntax.WEB ||
      v.codeSyntax.WEB.trim() === ""
    ) {
      missingCodeSyntaxCount++;
    }

    const collection = collections.find(
      (c) => c.id === v.variableCollectionId
    );
    if (!collection) continue;

    // Mode parity
    for (const mode of collection.modes) {
      if (v.valuesByMode[mode.modeId] === undefined) {
        addIssue(
          "warning",
          "tokens",
          `Variable "${v.name}" missing value in mode "${mode.name}"`
        );
      }
    }

    // Duplicate detection — only for Primitives with raw values (not aliases).
    // Grouped by domain so cross-domain collisions (spacing × type-size) don't fire.
    if (collection.name.toLowerCase().includes("primitiv")) {
      const domain = getDomain(v.name);
      for (const mode of collection.modes) {
        const val = v.valuesByMode[mode.modeId];
        if (val === undefined || val === null) continue;
        let key = null;
        if (typeof val === "object" && "r" in val) {
          key = `${mode.modeId}::${domain}::color::${val.r.toFixed(
            4
          )}:${val.g.toFixed(4)}:${val.b.toFixed(4)}:${(val.a ?? 1).toFixed(
            4
          )}`;
        } else if (typeof val === "number") {
          key = `${mode.modeId}::${domain}::number::${val}`;
        } else if (typeof val === "string") {
          key = `${mode.modeId}::${domain}::string::${val}`;
        }
        if (key) {
          if (!primitiveValueMap.has(key)) primitiveValueMap.set(key, []);
          primitiveValueMap.get(key).push(v.name);
        }
      }
    }
  }

  if (allScopesCount > 0) {
    addIssue(
      "warning",
      "tokens",
      `${allScopesCount} variables have ALL_SCOPES (should be explicitly scoped)`
    );
  }
  if (missingCodeSyntaxCount > 0) {
    addIssue(
      "warning",
      "tokens",
      `${missingCodeSyntaxCount} variables missing codeSyntax.WEB (breaks design-to-code bridge)`
    );
  }

  for (const [, names] of primitiveValueMap.entries()) {
    const unique = [...new Set(names)];
    if (unique.length > 1) {
      const shown = unique.slice(0, 4).join(", ");
      const more = unique.length > 4 ? `, +${unique.length - 4} more` : "";
      addIssue(
        "warning",
        "tokens",
        `Duplicate value within same domain, shared by ${unique.length} variables: ${shown}${more}`
      );
    }
  }

  // ---------- 3. Semantic Light/Dark modes ----------
  const semanticCollection = collections.find((c) =>
    c.name.toLowerCase().includes("semantic")
  );
  if (semanticCollection) {
    const modeNames = semanticCollection.modes.map((m) =>
      m.name.toLowerCase()
    );
    if (!modeNames.some((n) => n.includes("light"))) {
      addIssue(
        "warning",
        "tokens",
        'Semantic collection missing "Light" mode'
      );
    }
    if (!modeNames.some((n) => n.includes("dark"))) {
      addIssue("warning", "tokens", 'Semantic collection missing "Dark" mode');
    }
  }

  // ---------- 4. Text styles ----------
  const textStyles = await figma.getLocalTextStylesAsync();
  stats.textStyles = textStyles.length;
  if (textStyles.length === 0) {
    addIssue("error", "typography", "No text styles defined");
  }

  // Flag text styles with zero variable bindings.
  // Per Critical Rule #4: lineHeight percentages can't be bound to variables,
  // so we only warn when NONE of the bindable fields are bound.
  let unboundTextStyleCount = 0;
  for (const ts of textStyles) {
    const bv = ts.boundVariables || {};
    if (!bv.fontSize && !bv.lineHeight && !bv.fontFamily && !bv.fontWeight) {
      unboundTextStyleCount++;
    }
  }
  if (unboundTextStyleCount > 0) {
    addIssue(
      "warning",
      "typography",
      `${unboundTextStyleCount} text styles have no variable bindings on fontSize/lineHeight/fontFamily/fontWeight`
    );
  }

  // ---------- 5. Effect styles ----------
  const effectStyles = await figma.getLocalEffectStylesAsync();
  stats.effectStyles = effectStyles.length;

  // ---------- 6. Pages (informational) ----------
  // Library-style files typically have Cover / Foundations / Components pages.
  // Product design files often don't. These are reported as info, not warnings.
  const pageNames = figma.root.children.map((p) => p.name);
  const expectedPages = ["Cover", "Foundations", "Components"];
  for (const expected of expectedPages) {
    if (
      !pageNames.some((n) =>
        n.toLowerCase().includes(expected.toLowerCase())
      )
    ) {
      addIssue(
        "info",
        "structure",
        `Missing optional page: "${expected}" (standard for library files; product files often skip this)`
      );
    }
  }

  // ---------- 7. Component-tree walking ----------
  // Scope hardcoded-color checks to component trees only. Documentation
  // frames on Foundations pages often use literal colors intentionally.
  const FILLABLE_TYPES = new Set([
    "RECTANGLE",
    "FRAME",
    "TEXT",
    "VECTOR",
    "ELLIPSE",
    "STAR",
    "POLYGON",
    "BOOLEAN_OPERATION",
    "INSTANCE",
    "COMPONENT",
    "COMPONENT_SET",
  ]);

  const allComponents = [];
  const allComponentSets = [];
  for (const page of figma.root.children) {
    allComponents.push(
      ...page.findAllWithCriteria({ types: ["COMPONENT"] })
    );
    allComponentSets.push(
      ...page.findAllWithCriteria({ types: ["COMPONENT_SET"] })
    );
  }
  stats.components = allComponents.length;
  stats.componentSets = allComponentSets.length;

  const hardcodedFillCounts = new Map();
  const hardcodedStrokeCounts = new Map();
  const missingAutoLayout = [];
  const componentsWithUnboundText = [];

  const auditComponent = (rootNode) => {
    const label = rootNode.name;
    let hcFills = 0;
    let hcStrokes = 0;
    const unboundTextNodes = [];

    const walk = (node) => {
      if (FILLABLE_TYPES.has(node.type)) {
        // Fills
        if (Array.isArray(node.fills)) {
          node.fills.forEach((fill, idx) => {
            if (fill.type !== "SOLID") return;
            if (fill.visible === false) return;
            if (fill.opacity === 0) return;
            if (isPaintBound(node, "fills", fill, idx)) return;
            // Skip pure white (common default frame fill that often stays unbound)
            const c = fill.color;
            const isWhite = c.r === 1 && c.g === 1 && c.b === 1;
            if (isWhite) return;
            hcFills++;
          });
        }
        // Strokes
        if (Array.isArray(node.strokes)) {
          node.strokes.forEach((stroke, idx) => {
            if (stroke.type !== "SOLID") return;
            if (stroke.visible === false) return;
            if (isPaintBound(node, "strokes", stroke, idx)) return;
            hcStrokes++;
          });
        }
      }

      // TEXT component property check.
      // Skip nodes whose name starts with "." or "_" (private/decorative by convention)
      // and very short strings (icons, glyphs, single-char labels).
      if (node.type === "TEXT") {
        const hasCharRef =
          node.componentPropertyReferences &&
          node.componentPropertyReferences.characters;
        const nodeName = node.name || "";
        const isPrivate =
          nodeName.startsWith(".") || nodeName.startsWith("_");
        const isTinyText =
          typeof node.characters === "string" && node.characters.length <= 2;
        if (
          !hasCharRef &&
          !isPrivate &&
          !isTinyText &&
          node.characters &&
          node.characters.length > 0
        ) {
          unboundTextNodes.push(nodeName || node.characters.slice(0, 20));
        }
      }

      if ("children" in node) {
        for (const child of node.children) walk(child);
      }
    };

    walk(rootNode);

    if (rootNode.type === "COMPONENT" && rootNode.layoutMode === "NONE") {
      missingAutoLayout.push(label);
    }

    if (hcFills > 0) hardcodedFillCounts.set(label, hcFills);
    if (hcStrokes > 0) hardcodedStrokeCounts.set(label, hcStrokes);
    if (unboundTextNodes.length > 0) {
      componentsWithUnboundText.push({
        name: label,
        sample: unboundTextNodes.slice(0, 3),
      });
    }
  };

  for (const cs of allComponentSets) auditComponent(cs);
  for (const c of allComponents) {
    // Skip components that are children of a Component Set — already audited.
    if (!c.parent || c.parent.type !== "COMPONENT_SET") {
      auditComponent(c);
    }
  }

  for (const [name, count] of hardcodedFillCounts) {
    addIssue("warning", "components", `"${name}" has ${count} hardcoded fill(s)`);
  }
  for (const [name, count] of hardcodedStrokeCounts) {
    addIssue(
      "warning",
      "components",
      `"${name}" has ${count} hardcoded stroke(s)`
    );
  }
  for (const name of missingAutoLayout) {
    addIssue(
      "warning",
      "components",
      `Component "${name}" missing Auto Layout`
    );
  }
  for (const entry of componentsWithUnboundText) {
    addIssue(
      "warning",
      "components",
      `"${entry.name}" has text nodes without TEXT component property (overrides lost on update): ${entry.sample.join(", ")}`
    );
  }

  // ---------- 8. WCAG contrast ----------
  // Check all semantic color/text/* × color/bg/* pairs in Light and Dark.
  // Scope-aware: `color/text/on-{surface}` tokens are inverse text tokens
  // designed to sit on a filled surface of the same family. They are tested
  // ONLY against backgrounds whose name contains `{surface}` as a name segment
  // (split by "/" or "-"). This avoids false positives like pairing
  // "color/text/on-wine" with "color/bg/card".
  const contrastReport = { light: [], dark: [], failures: 0, skipped: 0 };

  const textVars = variables.filter((v) => /^color\/text\//i.test(v.name));
  const bgVars = variables.filter((v) => /^color\/bg\//i.test(v.name));

  const pickModes = (collection) => {
    if (!collection) return { light: null, dark: null };
    const light = collection.modes.find((m) =>
      m.name.toLowerCase().includes("light")
    );
    const dark = collection.modes.find((m) =>
      m.name.toLowerCase().includes("dark")
    );
    return { light, dark };
  };

  // Use the collection of the first text variable as the mode anchor.
  let anchorCollection = null;
  if (textVars.length > 0) {
    anchorCollection = await figma.variables.getVariableCollectionByIdAsync(
      textVars[0].variableCollectionId
    );
  }
  const { light: lightMode, dark: darkMode } = pickModes(anchorCollection);

  // Returns true if `bvName` should be paired with the given `on-{surface}` text var.
  const isCompatibleInverseSurface = (surface, bvName) => {
    const segments = bvName.toLowerCase().split(/[/\-]/);
    return segments.includes(surface);
  };

  const checkMode = async (mode, label) => {
    if (!mode) return;
    for (const tv of textVars) {
      // Detect inverse text tokens: color/text/on-wine, color/text/on-brand, etc.
      const onMatch = /^color\/text\/on-([a-z0-9-]+)$/i.exec(tv.name);
      const surface = onMatch ? onMatch[1].toLowerCase() : null;

      const tColor = await resolveColorValue(tv, mode.modeId);
      if (!tColor) continue;

      for (const bv of bgVars) {
        if (surface && !isCompatibleInverseSurface(surface, bv.name)) {
          contrastReport.skipped++;
          continue;
        }

        const bColor = await resolveColorValue(bv, mode.modeId);
        if (!bColor) continue;

        const ratio = contrastRatio(tColor, bColor);
        const entry = {
          text: tv.name,
          bg: bv.name,
          ratio: Math.round(ratio * 100) / 100,
          passAA: ratio >= 4.5,
          passAALarge: ratio >= 3,
        };
        contrastReport[label].push(entry);
        if (!entry.passAALarge) {
          contrastReport.failures++;
          if (contrastReport.failures <= 10) {
            addIssue(
              "warning",
              "accessibility",
              `${label}: "${tv.name}" on "${bv.name}" — contrast ${entry.ratio}:1 (fails WCAG AA Large 3:1)`
            );
          }
        }
      }
    }
  };

  await checkMode(lightMode, "light");
  await checkMode(darkMode, "dark");

  if (contrastReport.failures > 10) {
    addIssue(
      "warning",
      "accessibility",
      `+${contrastReport.failures - 10} more contrast failures (see contrast.worstLight / worstDark in output)`
    );
  }

  // ---------- Output ----------
  const CAP = 100;
  const cappedIssues = issues.slice(0, CAP);
  const hasMore = issues.length > CAP;

  return {
    stats,
    issueCount: issues.length,
    issues: cappedIssues,
    hasMore,
    summary: {
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      info: issues.filter((i) => i.severity === "info").length,
    },
    contrast: {
      lightPairs: contrastReport.light.length,
      darkPairs: contrastReport.dark.length,
      skippedInverseMismatches: contrastReport.skipped,
      failures: contrastReport.failures,
      worstLight: contrastReport.light
        .filter((p) => !p.passAA)
        .sort((a, b) => a.ratio - b.ratio)
        .slice(0, 10),
      worstDark: contrastReport.dark
        .filter((p) => !p.passAA)
        .sort((a, b) => a.ratio - b.ratio)
        .slice(0, 10),
    },
  };
}

// Entry point for `use_figma` (MCP): invoke runAudit and return the result.
// The MCP runtime wraps this script in an async context, so top-level `return`
// delivers the audit report to the caller.
return await runAudit();
