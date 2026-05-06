# Component_StatValue

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.2
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Displays a single stat with a label — the standard pattern for showing a key metric like "Cap Room: $23.50" or "PF: 1,432.8". Used on franchise home pages, matchup headers, standings details, and anywhere a labeled number needs to stand on its own. Composes Label (for the label) and a data-formatted value.

## Behavior

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | Yes | — | Descriptive label text (e.g., "Cap Room", "PF", "Record"). Rendered via the Label component. |
| `value` | `string` | Yes | — | Formatted value (e.g., "$23.50", "1,432.8", "7-3"). Consumer is responsible for formatting. |
| `size` | `'sm' \| 'md' \| 'lg'` | No | `'md'` | Controls the value text size. Label size adjusts accordingly. |
| `valueColor` | `string` | No | `gray-950` | Color of the value text. Useful for semantic coloring (e.g., red for cap overage). |
| `layout` | `'vertical' \| 'horizontal'` | No | `'vertical'` | Stacking direction. Vertical: label above value. Horizontal: label left, value right. |

### Visual states

| State | Appearance |
|-------|------------|
| Default | Label (uppercase, small, muted) + Value (larger, bold, dark). Stacked per `layout`. |

### Size mapping

| Size | Value token | Value size | Label size |
|------|-------------|------------|------------|
| `sm` | `type-data` | 14px, Barlow Condensed 500 | `type-label-sm` (11px) |
| `md` | `type-data-md` | 18px, Barlow Condensed 600 | `type-label` (13px) |
| `lg` | `type-stat-lg` | 44px, Barlow Condensed 700 | `type-label` (13px) |

### Layout

**Vertical** (default):
```
CAP ROOM          ← Label component, gray-500
$23.50            ← Value text, gray-950
```
Gap between label and value: `spacing-xs` (4px).

**Horizontal:**
```
CAP ROOM    $23.50
```
Label and value on the same baseline. Gap: `spacing-sm` (8px). Label left-aligned, value right-aligned if in a flex container.

## Rules

- The value text ALWAYS uses `fontVariantNumeric: 'tabular-nums'`. StatValue is a data element — numbers must align vertically when multiple StatValues are stacked.
- The value text uses Barlow Condensed at all sizes. Never Barlow regular for stat values.
- The label is rendered via the Label component (Barlow Condensed 600, uppercase, `gray-500`). StatValue does not reimplement Label — it composes it.
- The consumer formats the value string. StatValue does not format numbers, add dollar signs, or handle plurals. It renders exactly what it receives.
- `valueColor` overrides the value text color. The label color stays `gray-500` regardless.

## Dependencies

- `Component_Label` — used to render the label portion
- `src/theme/tokens` — `type.dataMd`, `type.data`, `type.statLg`, `gray[950]`, `spacing.xs`, `spacing.sm`

## Edge cases

- Empty value string: renders the label with no value (label is still visible). This can happen during loading states.
- Very long value string (e.g., "1,234,567.89"): does not wrap. Single line, clips if container is too narrow.
- Horizontal layout in a narrow container: label and value may overlap. Container sizing is the consumer's responsibility.

## Out of scope

- Trend indicators (up/down arrows) — not part of StatValue. A parent component can place an arrow icon next to StatValue.
- Formatting logic — StatValue renders the string as-is. Currency formatting, decimal handling, etc. are the consumer's job.
- Click/tap behavior — StatValue is not interactive.

## Done criteria

- Renders label + value in both vertical and horizontal layouts.
- Uses Label component for the label portion.
- Value text uses correct Barlow Condensed token for each size (sm/md/lg).
- `tabular-nums` is applied to value text.
- Accepts and applies `valueColor` prop.
- Defaults: `md` size, `vertical` layout, `gray-950` value color.
- Registered in preview with prop controls for size (`select`: sm/md/lg), layout (`select`: vertical/horizontal), and value text.
