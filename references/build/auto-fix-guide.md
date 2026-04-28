# Auto-fix guide

How to bind hardcoded values in existing components to design system variables, automatically. This is a build-mode operation that consumes the issues list from inspect mode (`audit-tokens.js` errors).

## When auto-fix runs

Auto-fix is NEVER triggered automatically — only when the user explicitly says one of:

- "auto-fix the token issues"
- "bind the hardcoded values to the nearest tokens"
- "fuzzy-fix the ALL_SCOPES violations"
- "apply auto-fix from the audit report"

If the user just says "fix the issues", ASK whether they want fuzzy auto-fix (binds to nearest match by similarity) or interactive review (you confirm each binding). Default to interactive review for low-trust scenarios — first run on a file, foundations not validated, multiple competing semantic candidates per value.

## Pre-conditions

Before running fuzzy auto-fix:

- Phase 1c health check must pass — variables must have explicit scopes (no ALL_SCOPES) and codeSyntax.WEB. Without scopes, scope-filtered candidate selection cannot work.
- Inspect mode must have produced an `errors[]` list from `audit-tokens.js`. Auto-fix consumes this list as input.
- The user must have explicitly opted in.

If pre-conditions fail, refuse to run auto-fix and recommend fixing foundations first.

## What auto-fix can and cannot do

**Can:**
- Bind unbound fills to color variables (scope-filtered: TEXT_FILL for text nodes, FRAME_FILL/SHAPE_FILL for frames)
- Bind unbound stroke colors to color variables with STROKE_COLOR scope
- Bind unbound paddings, item spacing to spacing variables (GAP/WIDTH_HEIGHT scope)
- Bind unbound corner radii to radius variables (CORNER_RADIUS scope)

**Cannot (require manual decision):**
- Choose between competing semantic tokens when scores are close (e.g., `--color/primary/500` vs `--color/blue/500` — semantic vs primitive layer; the script applies a Semantic-layer preference boost but doesn't override the user's intent if both are plausible)
- Add new variables — only binds to existing ones
- Resolve cases where the hardcoded value doesn't match any existing token within tolerance
- Modify text styles — only binds direct variable bindings on fills, strokes, spacing, radii
- Decide whether a Critical Rule #3 exception (component-specific dimension outside the spacing scale) is intentional — the script skips nodes whose parent component description documents the exception

## Algorithm: property-aware fuzzy matching

For each unbound node-property pair from inspect:

1. **Filter candidates by variable scope.**
   - `fill` on a frame → variables with FRAME_FILL or SHAPE_FILL
   - `fill` on a text node → variables with TEXT_FILL
   - `stroke` → variables with STROKE_COLOR
   - `paddingTop|paddingBottom|paddingLeft|paddingRight|itemSpacing` → variables with GAP or WIDTH_HEIGHT
   - `cornerRadius` and per-corner radii → variables with CORNER_RADIUS

2. **Compute similarity score per candidate.**
   - Colors: `1 - (RGB_distance / max_RGB_distance)`. Pure hex match = 1.0. For production-grade matching, ΔE2000 in CIELAB is preferable; the included script uses a simplified RGB distance for portability.
   - Numeric (spacing, radius): `1 - |value - candidate| / max(value, candidate, 1)`. Exact match = 1.0.

3. **Apply scope preference boost.**
   When multiple candidates pass the similarity threshold, prefer Semantic-layer tokens (e.g., `color/bg/primary`) over Primitive-layer (`color/blue/500`). Components should reference Semantic per Critical Rule from `token-taxonomy.md`. The script adds +0.1 to candidates that come from a collection whose name matches `/semantic|alias|tokens?/i`.

4. **Pick best match.**
   - If best match score ≥ 0.95 → bind directly (high confidence)
   - If 0.85 ≤ score < 0.95 → bind, but flag for review in report (medium confidence)
   - If score < 0.85 → do NOT bind. Add to "manual review needed" list with top 3 candidates.

## Confidence threshold

Default threshold: **0.85**. Below this, the script doesn't bind — it reports the unbound value with the top 3 candidates and their scores, leaving the decision to the user.

For first-time fuzzy auto-fix on an unfamiliar file, raise the threshold to 0.95 (only bind exact matches). Drop unmatched issues into a follow-up list. The script accepts a `threshold` parameter to override the default.

## Output format

```js
{
  applied: [
    {
      node: "Button/Primary/Default > BG",
      nodeId: "1:23",
      property: "fill",
      value: "#2563EB",
      boundTo: "color/primary/500",
      confidence: 1.0
    }
  ],
  skipped: [
    {
      node: "Card > Container",
      nodeId: "5:67",
      property: "fill",
      value: "#F8F9FA",
      reason: "no candidate above threshold",
      candidates: [
        { name: "color/bg/subtle", score: 0.78 },
        { name: "color/neutral/100", score: 0.74 },
        { name: "color/surface/raised", score: 0.71 }
      ]
    }
  ],
  summary: { applied: 14, skipped: 3, totalProcessed: 17 }
}
```

## Workflow integration

After inspect, when the user requests auto-fix:

1. Run Phase 1c health check on foundations. If it fails, refuse and recommend fixing foundations first.
2. Read inspect report's `errors[]` from `audit-tokens.js`.
3. Run `scripts/build/fixHardcodedToTokens.js` with the issues array (and optional threshold override).
4. Review the script's output report with the user. Show:
   - How many bindings applied directly (high confidence)
   - How many applied with medium confidence (flag for review)
   - How many skipped, with top candidates per skipped item
5. For skipped items, ask the user per item: skip permanently (component-specific exception), manually pick one of the candidates, or create a new token in foundations.
6. Run Phase 5 verification (`validate-design-system.js`) after the user signs off.

## Edge cases

- **Component-specific dimensions (Critical Rule #3 exception).** If a 3px toggle padding is intentional and documented in the component description, the script's heuristic should skip it. Detection: walk up to the nearest `COMPONENT_SET` ancestor; if its `description` contains the substring `Critical Rule #3` or `intentional` near the property name, skip. As a last resort, the script can be passed an `excludeNodeIds` list.
- **Frames inside Patterns page** (composition specs, not components) — auto-fix should not run there. Restrict input to component sets only.
- **Nodes inside example/demo frames on Cover page** — same exclusion.
- **Variables marked deprecated** — if a candidate variable's name starts with `_deprecated/` or its description contains `deprecated`, exclude it from candidates.

## Never auto-fix

- Detached instances (Critical Rule #11). Auto-fix only operates inside `COMPONENT_SET` nodes.
- Text style properties (fontSize, lineHeight, fontFamily, letterSpacing) — these go through text styles, not direct bindings. Auto-fix does not touch them.
- Effects (shadows, blurs) — these go through effect styles.
