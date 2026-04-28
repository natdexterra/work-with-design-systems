/**
 * exportTokensToCSS.js
 *
 * Module: Build / Phase 6a — Token export for code generation
 * Input:  no parameters (reads all variables in current file)
 * Output: structured JSON describing all variables, their values per mode,
 *         their codeSyntax, and their scopes
 *
 * Usage: Run via use_figma with the figma-use skill loaded first.
 * Pass skillNames: "work-with-design-systems" for logging.
 *
 * Note: This is a read-only script. It does NOT write files.
 * Claude formats the returned JSON into tokens.css using
 * references/build/code-export.md.
 */

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const result = [];

for (const collection of collections) {
  const collectionData = {
    name: collection.name,
    modes: collection.modes.map(m => ({ id: m.modeId, name: m.name })),
    defaultMode: collection.defaultModeId,
    variables: []
  };

  for (const variableId of collection.variableIds) {
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    if (!variable) continue;

    const valuesByMode = {};
    for (const mode of collection.modes) {
      const value = variable.valuesByMode[mode.modeId];
      if (value === undefined) continue;

      // Resolve VARIABLE_ALIAS references
      if (typeof value === 'object' && value.type === 'VARIABLE_ALIAS') {
        const referenced = await figma.variables.getVariableByIdAsync(value.id);
        valuesByMode[mode.name] = {
          type: 'alias',
          ref: referenced ? referenced.name : 'unknown'
        };
      } else if (typeof value === 'object' && 'r' in value) {
        // Color value
        const r = Math.round(value.r * 255);
        const g = Math.round(value.g * 255);
        const b = Math.round(value.b * 255);
        const a = value.a !== undefined ? value.a : 1;
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        valuesByMode[mode.name] = {
          type: 'color',
          hex: hex,
          rgba: a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : null
        };
      } else {
        valuesByMode[mode.name] = {
          type: typeof value === 'number' ? 'number' : 'string',
          value: value
        };
      }
    }

    collectionData.variables.push({
      name: variable.name,
      resolvedType: variable.resolvedType,
      scopes: variable.scopes,
      codeSyntax: variable.codeSyntax || {},
      valuesByMode: valuesByMode
    });
  }

  result.push(collectionData);
}

return JSON.stringify(result, null, 2);
