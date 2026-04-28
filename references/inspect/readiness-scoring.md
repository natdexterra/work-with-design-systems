# Readiness scoring

Each component gets a single 0–100 score. The file gets an aggregate score (mean of component scores). The score is a triage signal — it tells you which components need work first, not whether the design is "good."

## Formula

```
component_score = (
  (1 - errors_per_component  / max_errors)   * 2.0 * 100 +
  (1 - warnings_per_component / max_warnings) * 0.6 * 100 +
  states_coverage     * 3.0 +
  accessibility_score * 1.0 +
  naming_score        * 0.5
) / 7.1
```

### Term definitions

| Term | Source | Range |
|------|--------|-------|
| `errors_per_component`   | Module 1 — `errors.length`              | 0..max_errors |
| `warnings_per_component` | Module 1 — `warnings.length`            | 0..max_warnings |
| `max_errors`             | Largest `errors.length` across the file | ≥ 1 (use 1 if zero) |
| `max_warnings`           | Largest `warnings.length` across the file | ≥ 1 (use 1 if zero) |
| `states_coverage`        | Module 2 — `percentage`                  | 0..100 |
| `accessibility_score`    | Module 3 — `percentage`                  | 0..100 |
| `naming_score`           | Module 5 — `percentage`                  | 0..100 |

### Severity weights

The error/warning normalization folds severity into the score directly:

- **errors weight: 2.0** — a missing token binding is half as costly as a missing state, but twice as costly as an accessibility check
- **warnings weight: 0.6** — raw opacity / blur radii are flagged but rarely fatal

Total denominator: `2.0 + 0.6 + 3.0 + 1.0 + 0.5 = 7.1`. Result lands in 0–100.

### Why this weighting

| Weight | Module | Reasoning |
|--------|--------|-----------|
| 3.0 | Interactive states | Missing states force product code to invent state styles — most expensive failure to fix downstream |
| 2.0 | Token errors | Hardcoded values break theming and dark mode — second-most expensive |
| 1.0 | Accessibility | WCAG misses are real but typically fixable per-component without architectural change |
| 0.6 | Token warnings | Raw opacity/blur is sometimes intentional; flag for review, don't punish severely |
| 0.5 | Naming | Cosmetic — affects code-gen quality but doesn't break anything |

## Worked example

A Button component with:

- 3 errors out of 12 max-error file → `(1 - 3/12) * 2.0 * 100 = 150`
- 1 warning out of 4 max-warning file → `(1 - 1/4) * 0.6 * 100 = 45`
- States coverage: 60% → `60 * 3.0 = 180`
- Accessibility: 75% → `75 * 1.0 = 75`
- Naming: 80% → `80 * 0.5 = 40`

Sum: `150 + 45 + 180 + 75 + 40 = 490` / `7.1` = `69`.

Result: 69/100 → "Needs work" (see interpretation below).

## Interpretation

| Range | Label | Meaning |
|-------|-------|---------|
| 90–100 | **Production ready** | Pull into a product without reservations. Rare on first audit. |
| 75–89  | **Nearly ready**     | One or two focused passes resolves the gaps. |
| 50–74  | **Needs work**       | Multiple structural fixes required before production use. |
| 0–49   | **Not ready**        | Substantial rework. Treat as in-progress. |

## File-wide score

`file_score = mean(component_scores)`

Use the same label tiers. A file at 78 with all components in the 75–80 range is healthier than a file at 80 with one component at 95 and one at 60 — flag the variance in the report when std dev > 15.

## What the score deliberately does not measure

- Visual quality / brand consistency
- Whether the right components exist for the product (a perfectly-scored component library missing Modal is incomplete in a way the score won't show)
- Documentation / Storybook coverage
- Team adoption — components no one uses still score the same as ones used everywhere
- Performance — Auto Layout depth, instance counts, render cost

A high score means structural integrity. Pair it with manual review for the rest.

## Recalibration

If the file is small (1–3 components), `max_errors` / `max_warnings` lose meaning — every component is the worst by default. Use absolute thresholds in that case:

- `max_errors = max(actual_max, 5)`
- `max_warnings = max(actual_max, 3)`

This keeps single-component files from scoring 0 on the error term automatically.

## Score in the report

Report shows:

- File-wide score with label, prominently at the top
- Per-component score with label, one per scorecard
- Per-module breakdown inside each scorecard so users see where each component lost points

Don't show the raw formula in the report — show the inputs and the result.
