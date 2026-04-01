/**
 * QA Validation Script for Design System
 * Run via use_figma to audit the current Figma file.
 * Returns a structured report of issues found.
 *
 * Usage: Execute this script in Phase 5 (QA) via use_figma.
 * The script is read-only — it inspects but does not modify the file.
 */

(async () => {
  try {
    const issues = [];
    const stats = {
      variableCollections: 0,
      variables: 0,
      textStyles: 0,
      effectStyles: 0,
      components: 0,
      componentSets: 0,
      pages: 0,
    };

    // 1. Check Variable Collections
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    stats.variableCollections = collections.length;

    const collectionNames = collections.map((c) => c.name);
    if (!collectionNames.some((n) => n.toLowerCase().includes("primitiv"))) {
      issues.push({
        severity: "error",
        category: "tokens",
        message: 'Missing "Primitives" variable collection',
      });
    }
    if (!collectionNames.some((n) => n.toLowerCase().includes("semantic"))) {
      issues.push({
        severity: "error",
        category: "tokens",
        message: 'Missing "Semantic" variable collection',
      });
    }

    // 2. Check variables and scopes
    const variables = await figma.variables.getLocalVariablesAsync();
    stats.variables = variables.length;

    let allScopesCount = 0;
    for (const v of variables) {
      if (v.scopes && v.scopes.length === 1 && v.scopes[0] === "ALL_SCOPES") {
        allScopesCount++;
      }
    }
    if (allScopesCount > 0) {
      issues.push({
        severity: "warning",
        category: "tokens",
        message: `${allScopesCount} variables have ALL_SCOPES (should be explicitly scoped)`,
      });
    }

    // 3. Check for Light/Dark modes in Semantic collection
    const semanticCollection = collections.find((c) =>
      c.name.toLowerCase().includes("semantic")
    );
    if (semanticCollection) {
      const modeNames = semanticCollection.modes.map((m) => m.name);
      if (!modeNames.some((n) => n.toLowerCase().includes("light"))) {
        issues.push({
          severity: "warning",
          category: "tokens",
          message: 'Semantic collection missing "Light" mode',
        });
      }
      if (!modeNames.some((n) => n.toLowerCase().includes("dark"))) {
        issues.push({
          severity: "warning",
          category: "tokens",
          message: 'Semantic collection missing "Dark" mode',
        });
      }
    }

    // 4. Check Text Styles
    const textStyles = figma.getLocalTextStyles();
    stats.textStyles = textStyles.length;
    if (textStyles.length === 0) {
      issues.push({
        severity: "error",
        category: "typography",
        message: "No text styles defined",
      });
    }

    // 5. Check Effect Styles
    const effectStyles = figma.getLocalEffectStyles();
    stats.effectStyles = effectStyles.length;

    // 6. Check pages
    stats.pages = figma.root.children.length;
    const pageNames = figma.root.children.map((p) => p.name);
    const expectedPages = ["Cover", "Foundations", "Components"];
    for (const expected of expectedPages) {
      if (
        !pageNames.some((n) => n.toLowerCase().includes(expected.toLowerCase()))
      ) {
        issues.push({
          severity: "warning",
          category: "structure",
          message: `Missing expected page: "${expected}"`,
        });
      }
    }

    // 7. Walk components on all pages
    for (const page of figma.root.children) {
      await figma.setCurrentPageAsync(page);

      // Count components
      const walkNode = (node) => {
        if (node.type === "COMPONENT") stats.components++;
        if (node.type === "COMPONENT_SET") stats.componentSets++;

        // Check for hardcoded fills on components
        if (
          (node.type === "COMPONENT" || node.type === "INSTANCE") &&
          node.fills &&
          Array.isArray(node.fills)
        ) {
          for (const fill of node.fills) {
            if (
              fill.type === "SOLID" &&
              fill.boundVariables &&
              Object.keys(fill.boundVariables).length === 0
            ) {
              // Solid fill without variable binding
              // Only flag if it is not white or transparent
              if (fill.opacity > 0 && !(fill.color.r === 1 && fill.color.g === 1 && fill.color.b === 1)) {
                issues.push({
                  severity: "warning",
                  category: "components",
                  message: `Hardcoded fill on "${node.name}" in page "${page.name}"`,
                });
              }
            }
          }
        }

        // Check Auto Layout
        if (
          node.type === "COMPONENT" &&
          node.layoutMode === "NONE"
        ) {
          issues.push({
            severity: "warning",
            category: "components",
            message: `Component "${node.name}" missing Auto Layout`,
          });
        }

        if ("children" in node) {
          for (const child of node.children) {
            walkNode(child);
          }
        }
      };

      for (const child of page.children) {
        walkNode(child);
      }
    }

    // Cap issues to avoid giant output
    const cappedIssues = issues.slice(0, 50);
    const hasMore = issues.length > 50;

    figma.closePlugin(
      JSON.stringify({
        stats,
        issueCount: issues.length,
        issues: cappedIssues,
        hasMore,
        summary: {
          errors: issues.filter((i) => i.severity === "error").length,
          warnings: issues.filter((i) => i.severity === "warning").length,
        },
      })
    );
  } catch (e) {
    figma.closePluginWithFailure(e.toString());
  }
})();
