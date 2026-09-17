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
 * Colour values come in three shapes: a literal {r,g,b,a}, a bare alias, and an
 * alias (or literal) carrying its own opacity — { color, opacity }, where
 * opacity is a percent and may itself alias a FLOAT variable. The third is
 * emitted as an alias entry that keeps `ref` and adds `opacity` (+ `opacityRef`
 * when the percent is itself a token) and a ready `css` string.
 *
 * Note: This is a read-only script. It does NOT write files.
 * Claude formats the returned JSON into tokens.css using
 * references/build/code-export.md.
 */

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const result = [];

// The CSS custom property a variable is exported under: its codeSyntax.WEB in
// either spelling, else a name-derived fallback so the emitted CSS is never a
// dangling reference. Phase 6 refuses to run on a file without codeSyntax, so
// the fallback is a safety net, not a supported path.
function cssName(variable) {
  const web = variable && variable.codeSyntax ? (variable.codeSyntax.WEB || '').trim() : '';
  const bare = web.startsWith('var(') ? web.slice(4, -1).trim() : web;
  if (bare.startsWith('--')) return bare;
  return '--' + variable.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Which mode of the referenced variable's collection answers for `modeName` of
// the referring one — same rule the validator uses: match by mode name, else
// the collection default.
async function referencedModeId(referenced, modeName) {
  const col = await figma.variables.getVariableCollectionByIdAsync(referenced.variableCollectionId);
  if (!col) return null;
  const match = col.modes.find(m => m.name === modeName)
    || col.modes.find(m => m.modeId === col.defaultModeId)
    || col.modes[0];
  return match ? match.modeId : null;
}

function hexOf(color) {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// An alpha token's CSS. `color-mix` is chosen over relative colour syntax
// (`rgb(from var(--x) r g b / 10%)`) because it has the wider browser support
// today; both express the same thing and either can be swapped in one place.
function alphaCss(reference, percent) {
  return `color-mix(in srgb, ${reference} ${percent}%, transparent)`;
}

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

      // Alias-with-opacity: { color: <literal | alias>, opacity: <percent | alias> }.
      // Branch on `color` FIRST — this shape carries neither `type` nor `r`, so
      // the alias and literal branches below both miss it and it lands in the
      // string branch as "[object Object]".
      if (value && typeof value === 'object' && value.color !== undefined) {
        const entry = {};
        let reference = null;

        if (value.color && value.color.type === 'VARIABLE_ALIAS') {
          const referenced = await figma.variables.getVariableByIdAsync(value.color.id);
          entry.type = 'alias';
          entry.ref = referenced ? referenced.name : 'unknown';
          reference = referenced ? `var(${cssName(referenced)})` : null;
        } else if (value.color && 'r' in value.color) {
          entry.type = 'color';
          entry.hex = hexOf(value.color);
          reference = entry.hex;
        }

        let percent = null;
        if (typeof value.opacity === 'number') {
          percent = value.opacity;
        } else if (value.opacity && value.opacity.type === 'VARIABLE_ALIAS') {
          const opacityVar = await figma.variables.getVariableByIdAsync(value.opacity.id);
          if (opacityVar) {
            entry.opacityRef = opacityVar.name;
            const opacityModeId = await referencedModeId(opacityVar, mode.name);
            const raw = opacityModeId === null ? undefined : opacityVar.valuesByMode[opacityModeId];
            if (typeof raw === 'number') percent = raw;
          }
        }

        entry.opacity = percent;
        if (reference && percent !== null) entry.css = alphaCss(reference, percent);
        valuesByMode[mode.name] = entry;
      }
      // Resolve VARIABLE_ALIAS references
      else if (typeof value === 'object' && value.type === 'VARIABLE_ALIAS') {
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
