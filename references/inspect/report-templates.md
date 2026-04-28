# Report templates

Templates for inspect-mode output. Three formats — markdown, JSON, AI prompt. The user picks one or more during the pre-flight checklist.

## Markdown report template

Default format. Human-readable, paste-ready into PR descriptions or design reviews.

```markdown
# Design system audit report

**File:** {file_name}
**Date:** {audit_date}
**Overall score:** {overall_score}/100 ({score_label})

---

## Executive summary

{summary_paragraph — 2–3 sentences summarizing the file's health}

**Top issues by impact:**

1. {highest_impact_issue}
2. {second_highest_impact_issue}
3. {third_highest_impact_issue}

---

## File-wide issues

| Issue | Count | Severity |
|---|---|---|
| Variables with ALL_SCOPES | {count} | Error |
| Variables missing codeSyntax.WEB | {count} | Error |
| Detached instances | {count} | Warning |
| Duplicate variables | {count} | Warning |

---

## Component scorecards

### {component_name}

**Score: {score}/100** ({score_label})

| Module | Result | Score |
|---|---|---|
| Token compliance | {errors} errors, {warnings} warnings out of {totalChecked} checks | {weighted_score} |
| Interactive states | {found}/{expected} present | {weighted_score} |
| Accessibility | {passed}/{total} checks | {score} |
| Naming quality | {semantic}/{total} semantic ({percentage}%) | {weighted_score} |

**Issues:**

- {issue_1}
- {issue_2}

#### Token errors (must fix before code export)

| Layer | Variant | Property | Value | Suggested binding |
|---|---|---|---|---|
| {node_name} | {variant} | {property} | {value} | {fuzzy_match_or_TBD} |

#### Token warnings (review)

| Layer | Variant | Property | Value | Note |
|---|---|---|---|---|
| {node_name} | {variant} | {property} | {value} | {issue_text} |

**Missing states:** {list_of_missing_states}

**Accessibility findings:**

| Check | Result | Details |
|---|---|---|
| Contrast | {pass/fail} | {details} |
| Touch target | {pass/fail} | {width}×{height}px |
| Font size | {pass/fail} | {details} |
| Focus indicator | {pass/fail} | {details} |

---

_(repeat for each component)_

---

## Priority fix list

Sorted by impact (states ×3, token errors ×2, accessibility ×1, naming ×0.5, token warnings ×0.6).

| Priority | Component | Issue | Module | Impact |
|---|---|---|---|---|
| 1 | {component} | {issue} | States | High |
| 2 | {component} | {issue} | Tokens (error) | High |
| 3 | {component} | {issue} | A11y | Medium |
| 4 | {component} | {issue} | Tokens (warning) | Low |

---

## Component descriptions

_(included only if Module 6 was run)_

### {component_name}

**PURPOSE:** {purpose}

**BEHAVIOR:** {behavior_description}

**COMPOSITION:** {internal_structure}

**USAGE:** {usage_notes}

**CODE GENERATION NOTES:** {code_notes}

**Property suggestions:**
1. {suggestion_1}
2. {suggestion_2}
```

---

## JSON report template

For programmatic consumers — CI gates, dashboards, Slack bots. Mirrors the markdown content exactly.

```json
{
  "file": {
    "name": "string",
    "auditedAt": "ISO 8601 timestamp",
    "score": 0,
    "scoreLabel": "Production ready | Nearly ready | Needs work | Not ready"
  },
  "fileWideIssues": {
    "allScopesViolations": 0,
    "missingCodeSyntaxWeb": 0,
    "detachedInstances": [
      { "name": "string", "nodeId": "string", "page": "string", "parentPath": "string" }
    ],
    "duplicateVariables": []
  },
  "components": [
    {
      "name": "string",
      "nodeId": "string",
      "score": 0,
      "scoreLabel": "string",
      "modules": {
        "tokenCompliance": {
          "errors":   [ { "variant": "string", "node": "string", "property": "string", "value": "string", "issue": "string" } ],
          "warnings": [ { "variant": "string", "node": "string", "property": "string", "value": "string", "issue": "string" } ],
          "summary": { "errorCount": 0, "warningCount": 0, "totalChecked": 0 }
        },
        "interactiveStates": {
          "componentType": "string",
          "expectedStates": [],
          "foundStates": [],
          "missingStates": [],
          "percentage": 0
        },
        "accessibility": {
          "checks": [ { "name": "string", "passed": false, "details": "string" } ],
          "passed": 0,
          "total": 0,
          "percentage": 0
        },
        "namingQuality": {
          "semantic": 0,
          "total": 0,
          "percentage": 0,
          "genericNames": []
        }
      },
      "description": {
        "purpose":      "string",
        "behavior":     "string",
        "composition":  "string",
        "usage":        "string",
        "codeNotes":    "string",
        "propertySuggestions": []
      }
    }
  ],
  "priorityFixList": [
    { "priority": 1, "component": "string", "issue": "string", "module": "string", "impact": "High|Medium|Low" }
  ]
}
```

Errors and warnings are explicitly separate keys so consumers can gate (e.g., "fail CI if errorCount > 0, warn if warningCount > 5").

---

## AI prompt export template

Use this when the user asks for component specs to feed into Claude Code, Cursor, or another AI generator. One prompt block per component.

```markdown
# Component specification: {component_name}

## Overview
{purpose_from_description}

## Variants
{variant_property_table}

## Props API
| Prop | Type | Default | Description |
|---|---|---|---|
| {prop_name} | {type} | {default} | {description} |

## Design tokens
| Property | Token | CSS variable | Value (light) | Value (dark) |
|---|---|---|---|---|
| Background | {variable_name} | {codeSyntax_WEB} | {light_value} | {dark_value} |

## Hard-coded values to fix before code generation
| Layer | Property | Value | Suggested binding |
|---|---|---|---|
| {node} | {property} | {value} | {token_or_TBD} |

## Hard-coded values flagged for review (warnings)
| Layer | Property | Value | Note |
|---|---|---|---|
| {node} | {property} | {value} | {issue_text} |

## States
| State | Visual changes | Trigger |
|---|---|---|
| Default | — | Initial render |
| Hover | {changes} | Mouse enter |
| Pressed | {changes} | Mouse down |
| Focused | {changes} | Tab / focus() |
| Disabled | {changes} | disabled prop |

## Accessibility requirements
- Role: {role}
- Aria attributes: {aria_attrs}
- Keyboard: {keyboard_behavior}
- Contrast: {contrast_status}
- Touch target: {target_size}

## Composition
{internal_structure_with_slot_descriptions}

## Implementation notes
- {note_1}
- {note_2}
```

The AI prompt format keeps errors and warnings in separate tables. AI generators that don't natively understand severity will treat the error table as the "must fix" set and the warning table as "review during implementation."

---

## Score label mapping

Use these labels consistently across all formats:

| Range | Label | Color hint |
|---|---|---|
| 90–100 | Production ready | Green |
| 75–89  | Nearly ready     | Yellow |
| 50–74  | Needs work       | Orange |
| 0–49   | Not ready        | Red |

Color hints are advisory — markdown shouldn't include color, JSON includes it as string for clients that want to render badges.

## Format selection rules

- Default to markdown if the user doesn't specify
- If asked "give me JSON" or "I need this for CI" → JSON only
- If asked "give me both" → emit both, side by side
- If asked for AI prompt or "spec for Claude" → AI prompt format only, one block per component the user picked

When emitting markdown, never paste the JSON inside it. When emitting both, write them as separate fenced blocks with a header indicating which is which.
