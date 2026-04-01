# Framework mappings reference

Load this during Phase 1 (Discovery) when syncing a design system from an existing codebase. Defines where to find tokens and components for each framework.

## React + Tailwind CSS

### Token sources
- **Primary:** `tailwind.config.js` or `tailwind.config.ts` → `theme.extend.colors`, `theme.extend.spacing`, `theme.extend.borderRadius`, `theme.extend.fontSize`
- **CSS variables:** Check `globals.css` or `app.css` for `@layer base { :root { ... } }` definitions
- **shadcn/ui style:** Look for `--background`, `--foreground`, `--primary`, etc. in CSS, mapped via `hsl(var(--primary))` in Tailwind config

### Component sources
- `src/components/ui/` (shadcn/ui convention)
- `src/components/` (general)
- `packages/ui/src/` (monorepo)

### Mapping pattern
```
Tailwind config                    →  Figma Variables
─────────────────────────────────────────────────────
colors.blue.500                    →  Primitives/color/blue-500
colors.primary (alias)             →  Semantic/color/interactive/primary
spacing.4 (16px)                   →  Primitives/spacing/16
borderRadius.lg (0.5rem)           →  Primitives/radius/lg

React component                    →  Figma Component
─────────────────────────────────────────────────────
<Button variant="primary" size="sm"> → Type=Primary, Size=Small
<Input error={true}>               →  State=Error
className="bg-primary text-white"  →  Fill: color/interactive/primary
```

### shadcn/ui specific
Components using `cva` (class-variance-authority):
- `variants` object keys → Figma variant properties
- `defaultVariants` → Figma default variant combination
- Example: `variants: { variant: { default, destructive, outline }, size: { sm, md, lg } }`

---

## React + CSS Modules / styled-components

### Token sources
- **CSS Modules:** `src/styles/tokens.css`, `src/styles/variables.css`, or per-component `.module.css`
- **styled-components:** `src/theme.ts` or `src/styles/theme.js` → typically a theme object
- **CSS-in-JS:** Look for `ThemeProvider` usage and the theme object it wraps

### Component sources
- `src/components/` with co-located styles
- Each component folder: `Button/Button.tsx`, `Button/Button.module.css`

### Mapping pattern
```
Theme object                       →  Figma Variables
─────────────────────────────────────────────────────
theme.colors.primary               →  Semantic/color/interactive/primary
theme.space[4]                     →  Semantic/space/md
theme.radii.md                     →  Semantic/radius/component

CSS Variable                       →  Figma Variable
─────────────────────────────────────────────────────
--color-bg-primary                 →  Semantic/color/bg/primary
--space-md                         →  Semantic/space/md
```

---

## Vue (2/3) + any CSS approach

### Token sources
- **Tailwind:** Same as React + Tailwind section
- **Custom:** `src/styles/variables.scss`, `src/assets/scss/_tokens.scss`
- **CSS vars:** `src/styles/tokens.css` with `:root { }` declarations

### Component sources
- `src/components/` — Single File Components (`.vue`)
- `src/components/ui/` — design system components
- Props defined in `defineProps<>()` (Vue 3) or `props: {}` (Vue 2)

### Mapping pattern
```
Vue props                          →  Figma Variants
─────────────────────────────────────────────────────
defineProps<{ 
  variant: 'primary' | 'secondary', → Type=Primary, Type=Secondary
  size: 'sm' | 'md' | 'lg'          → Size=Small, Size=Medium, Size=Large
}>()
```

---

## Svelte

### Token sources
- **Tailwind:** Same pattern
- **CSS vars:** `src/app.css` or `src/styles/tokens.css`
- **Design token files:** `src/lib/tokens.ts`

### Component sources
- `src/lib/components/` — component library
- `src/lib/ui/` — design system components
- Props defined via `export let prop: type` or `$props()` rune (Svelte 5)

---

## Angular

### Token sources
- `src/styles.scss` — global styles
- `src/styles/tokens/` — token SCSS files
- `angular.json` → `styles` array for global style entry points

### Component sources
- `src/app/shared/components/` or `src/app/ui/`
- Component inputs: `@Input() variant: string`
- Check for `@angular/cdk` usage for overlay/dialog patterns

---

## Design Tokens JSON (W3C DTCG format)

If the project uses W3C Design Tokens Community Group format:

```json
{
  "color": {
    "primary": {
      "$value": "#6366F1",
      "$type": "color"
    }
  },
  "spacing": {
    "md": {
      "$value": "16px",
      "$type": "dimension"
    }
  }
}
```

Mapping: JSON path → Figma variable name
- `color.primary.$value` → `Semantic/color/interactive/primary`
- `spacing.md.$value` → `Semantic/space/md`

Figma's native Variable import (2025+) supports this format directly. If available, use `Figma > Variables > Import` instead of manual creation.

---

## Tokens Studio (Figma plugin) format

If the project uses Tokens Studio JSON:

```json
{
  "global": {
    "colors": {
      "blue-500": { "value": "#3B82F6", "type": "color" }
    }
  },
  "semantic": {
    "bg-primary": { "value": "{colors.blue-500}", "type": "color" }
  }
}
```

Maps 1:1 to the Primitive → Semantic tier structure. References (`{colors.blue-500}`) become variable aliases in Figma.

---

## When no framework is detected

If the codebase has no clear token or component system:
1. Ask the user for brand colors (minimum: primary, neutral, success, warning, error)
2. Propose a default spacing scale (4px base)
3. Propose Inter as the default font
4. Build the system from scratch using the defaults in `token-taxonomy.md`
