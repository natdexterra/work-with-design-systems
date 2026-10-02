/**
 * formatTokensCSS.js: Phase 6d. tokens.css from the JSON that
 * scripts/build/exportTokensToCSS.js returns. Runs in Node, not in use_figma;
 * no dependencies; the same input gives the same bytes.
 *
 *   node formatTokensCSS.js <export.json> [<targets.json>] > tokens.css
 *
 * exported  the exporter's JSON text, or the parsed array of collections.
 * targets   { [collection]: { [mode]: target } }, the strategy from Phase 1e / 6c.
 *           A target is a selector, { media, selector }, an array of those (the
 *           "both" strategy), or null (mode left out of this file). A default
 *           mode goes to ":root" unless listed; every other mode MUST be listed,
 *           so no mode is exported under a guessed selector.
 * Returns   { ok, errors, css, declarations: [{ target, name, value }], skipped }.
 *           The CLI prints css and exits 0, or prints the errors and exits 1.
 *
 * Values: a color is its hex (rgba when a < 1), an alpha token the exporter's
 * `css`, an alias var() of its target's codeSyntax.WEB. A FLOAT takes px when
 * scoped to a dimension, % when scoped to an opacity (Figma stores both
 * opacities as a percent), a bare number when scoped to FONT_WEIGHT. A
 * FONT_FAMILY string is quoted.
 * Refuses: a codeSyntax.WEB that is not a CSS custom property, one CSS name on
 * two variables, an alias target missing or ambiguous (the export carries the
 * target's NAME, not its id), an unresolved alpha opacity, a FLOAT whose scopes
 * name no unit (ALL_SCOPES and [] among them), a non-default mode with no
 * target, a target naming a collection or mode the export lacks.
 * Limits: one layer (no upstream --ds- layer), no clamp() for responsive type.
 */

const PX_SCOPES = new Set(["CORNER_RADIUS", "WIDTH_HEIGHT", "GAP", "STROKE_FLOAT", "EFFECT_FLOAT",
  "FONT_SIZE", "LINE_HEIGHT", "LETTER_SPACING", "PARAGRAPH_SPACING", "PARAGRAPH_INDENT"]);
const PERCENT_SCOPES = new Set(["OPACITY", "COLOR_OPACITY"]);

// codeSyntax.WEB in either spelling, "--name" or "var(--name)"; null otherwise.
function cssNameOf(variable) {
  const web = ((variable.codeSyntax || {}).WEB || "").trim();
  const bare = web.startsWith("var(") && web.endsWith(")") ? web.slice(4, -1).trim() : web;
  return /^--[A-Za-z0-9_-]+$/.test(bare) ? bare : null;
}

function formatTokensCSS(exported, targets = {}) {
  let collections = exported;
  while (typeof collections === "string") collections = JSON.parse(collections);
  const errors = [];
  const skipped = [];
  const byName = new Map(); // Figma variable name -> variables carrying it
  const owners = new Map(); // CSS name -> Figma variable names

  for (const c of collections) {
    for (const v of c.variables) {
      byName.set(v.name, (byName.get(v.name) || []).concat(v));
      const name = cssNameOf(v);
      if (v.resolvedType === "BOOLEAN") skipped.push({ name: v.name, reason: "BOOLEAN has no CSS value" });
      else if (!name) errors.push(`${c.name} / ${v.name}: codeSyntax.WEB "${(v.codeSyntax || {}).WEB || ""}" is not a CSS custom property`);
      else owners.set(name, (owners.get(name) || []).concat(v.name));
    }
  }
  for (const [name, list] of owners) {
    if (list.length > 1) errors.push(`${name} is the codeSyntax.WEB of ${list.length} variables: ${list.join(", ")}`);
  }
  for (const [colName, modes] of Object.entries(targets)) {
    const c = collections.find((x) => x.name === colName);
    for (const modeName of Object.keys(modes || {})) {
      if (!c || !c.modes.some((m) => m.name === modeName)) {
        errors.push(`targets name ${colName} / ${modeName}, which the export does not have`);
      }
    }
  }

  const valueOf = (v, entry) => {
    if (entry.css) return entry.css;
    if ("opacity" in entry) throw new Error(`${v.name}: alpha token whose opacity did not resolve`);
    if (entry.type === "color") return entry.rgba || entry.hex;
    if (entry.type === "alias") {
      const refs = byName.get(entry.ref) || [];
      const ref = refs.length === 1 ? cssNameOf(refs[0]) : null;
      if (!ref) throw new Error(`${v.name}: alias to "${entry.ref}" matches ${refs.length} variables in the export, need one with a CSS name`);
      return `var(${ref})`;
    }
    const scopes = v.scopes || [];
    if (entry.type === "number") {
      const n = +Number(entry.value).toFixed(4); // FLOATs are 32-bit: 22.4 may read back as 22.399999618530273
      if (scopes.some((s) => PERCENT_SCOPES.has(s))) return `${n}%`;
      if (scopes.some((s) => PX_SCOPES.has(s))) return `${n}px`;
      if (scopes.includes("FONT_WEIGHT")) return String(n);
      // ALL_SCOPES, [] or a scope with no CSS unit: any unit picked here is a guess.
      throw new Error(`${v.name}: FLOAT scoped ${JSON.stringify(scopes)} has no unit rule; scope it explicitly (Critical Rule #6)`);
    }
    return scopes.includes("FONT_FAMILY") ? JSON.stringify(String(entry.value)) : String(entry.value);
  };

  const targetsFor = (c, mode) => {
    const listed = targets[c.name] || {};
    if (Object.prototype.hasOwnProperty.call(listed, mode.name)) {
      return listed[mode.name] === null ? [] : [].concat(listed[mode.name]);
    }
    if (mode.id === c.defaultMode) return [":root"];
    errors.push(`${c.name}: mode "${mode.name}" has no target; choose its strategy in Phase 1e`);
    return [];
  };

  const blocks = new Map(); // target label -> { media, selector, lines }
  const declarations = [];
  for (const c of collections) {
    for (const mode of c.modes) {
      for (const t of targetsFor(c, mode)) {
        const media = typeof t === "object" ? t.media : null;
        const selector = typeof t === "object" ? t.selector : t;
        const label = media ? `@media ${media} ${selector}` : selector;
        if (!blocks.has(label)) blocks.set(label, { media, selector, lines: [] });
        const block = blocks.get(label);
        block.lines.push(`/* ${c.name} / ${mode.name} */`);
        for (const v of c.variables) {
          const name = cssNameOf(v);
          if (v.resolvedType === "BOOLEAN" || !name) continue;
          const entry = v.valuesByMode[mode.name];
          if (!entry) {
            skipped.push({ name: v.name, mode: mode.name, reason: "no value in this mode" });
            continue;
          }
          try {
            const value = valueOf(v, entry);
            block.lines.push(`${name}: ${value};`);
            declarations.push({ target: label, name, value });
          } catch (err) {
            errors.push(err.message);
          }
        }
      }
    }
  }

  if (errors.length) return { ok: false, errors, css: null, declarations: [], skipped };
  const indent = (lines, pad) => lines.map((l) => pad + l).join("\n");
  const body = [...blocks.values()].map((b) => (b.media
    ? `@media ${b.media} {\n  ${b.selector} {\n${indent(b.lines, "    ")}\n  }\n}`
    : `${b.selector} {\n${indent(b.lines, "  ")}\n}`));
  const header = "/* Generated by formatTokensCSS.js from the exportTokensToCSS.js JSON. Regenerate, never edit by hand. */";
  return { ok: true, errors, css: [header, ...body].join("\n\n") + "\n", declarations, skipped };
}

if (require.main === module) {
  const fs = require("fs");
  const [exportPath, targetsPath] = process.argv.slice(2);
  if (!exportPath) { console.error("usage: node formatTokensCSS.js <export.json> [<targets.json>]"); process.exit(2); }
  const targets = targetsPath ? JSON.parse(fs.readFileSync(targetsPath, "utf8")) : {};
  const out = formatTokensCSS(fs.readFileSync(exportPath, "utf8"), targets);
  if (!out.ok) {
    for (const e of out.errors) console.error(e);
    process.exit(1);
  }
  for (const s of out.skipped) console.error(`skipped ${s.name}${s.mode ? ` (${s.mode})` : ""}: ${s.reason}`);
  process.stdout.write(out.css);
}

module.exports = { formatTokensCSS };
