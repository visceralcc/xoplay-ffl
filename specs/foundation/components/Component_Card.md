# Component_Card

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.1
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Elevated container for grouped content. Used on home pages, dashboards, and anywhere content needs to be visually separated into distinct blocks.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `ReactNode` | Yes | — | Card content. |
| `padding` | `number` | No | `spacing.lg` (16) | Inner padding. |
| `backgroundColor` | `string` | No | `gray-0` (#ffffff) | Card fill color. |

## Visual rules

- Background: `gray-0` (white) by default.
- Border: 1px `gray-100`.
- Border radius: `radius-md` (6px).
- Shadow: subtle drop shadow (use `{ shadowColor: gray-950, shadowOpacity: 0.06, shadowOffset: { height: 2 }, shadowRadius: 8 }` as a starting point — adjust visually in preview).
- Overflow: hidden.

## Done criteria

- Renders children inside a bordered, shadowed, rounded container.
- Accepts padding and backgroundColor overrides.
- Preview: category "Layout", naked frame, componentWidth 360, with sample content inside.
