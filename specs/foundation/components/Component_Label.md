# Component_Label

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.2
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Uppercase meta label used for section headers, column headers, tab labels, and category identifiers throughout the product. This is the design system's primary "labeling voice" — it names things.

## Behavior

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `string` | Yes | — | Label text. Rendered uppercase automatically. |
| `size` | `'md' \| 'sm'` | No | `'md'` | `md` uses `type-label` (13px). `sm` uses `type-label-sm` (11px). |
| `color` | `string` | No | `gray-500` | Text color. Accepts any token color value. |

### Visual states

| State | Appearance |
|-------|------------|
| Default | Uppercase text in Barlow Condensed 600, letter-spacing 1.2, color per `color` prop. |

There is only one visual state — Label has no interactive behavior. It is purely presentational.

### Typography mapping

| Size | Token | Family | Weight | Size | Line-height | Letter-spacing | Case |
|------|-------|--------|--------|------|-------------|----------------|------|
| `md` | `type-label` | Barlow Condensed | 600 | 13px | 1 | 1.2 | UPPER |
| `sm` | `type-label-sm` | Barlow Condensed | 700 | 11px | 1 | 1.2 | UPPER |

## Rules

- Text is ALWAYS rendered uppercase via `textTransform: 'uppercase'`. The consumer does not need to pass uppercase text.
- Font family is ALWAYS Barlow Condensed, never Barlow. Barlow in all-caps reads stretched; Condensed was built for it (Spec_DesignSystem.md §3.8 mandatory rule).
- Label does NOT use `fontVariantNumeric: 'tabular-nums'`. It is a labeling element, not a data element.

## Dependencies

- `src/theme/tokens` — `type.label`, `type.labelSm`, `gray` color ramp

## Edge cases

- Empty string: renders nothing (zero height, zero width).
- Very long text: does not wrap. Single line only. If the text overflows its container, it clips (container's responsibility to size appropriately).

## Out of scope

- Interactive behavior (hover, press, focus) — Label is not clickable.
- Multi-line rendering — Label is always a single line.
- Icon slots — Label does not include icons. If an icon is needed next to a label, compose them in a parent layout.

## Done criteria

- Renders uppercase text in Barlow Condensed at both `md` and `sm` sizes.
- Uses `type-label` token values for `md` and `type-label-sm` for `sm`.
- Accepts and applies a custom `color` prop.
- Defaults to `gray-500` when no color is provided.
- All styles come from theme tokens — no hardcoded values.
- Registered in preview with prop controls for size (`select`: md/sm) and color.
