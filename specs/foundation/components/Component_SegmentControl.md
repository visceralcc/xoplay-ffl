# Component_SegmentControl

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.11, §11.4
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Toggle control for switching between views or modes. Used for roster bucket tabs (Active/IR/Taxi), density mode switching (Standard/Compact), and many other binary or multi-option selections throughout the product. This is the "operational mode" control — it appears in toolbars above tables and data views.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `segments` | `string[]` | Yes | — | Labels for each segment. |
| `activeIndex` | `number` | Yes | — | Currently active segment (0-based). |
| `onChangeIndex` | `(index: number) => void` | Yes | — | Called when user taps a segment. |

## Visual rules

- Active segment: `gray-950` background, `gray-0` text, Barlow Condensed 600.
- Inactive segments: transparent background, `gray-500` text, Barlow Condensed 500.
- Container: 1px `gray-200` border, `radius-sm` corners.
- Each segment has equal width (divide container evenly).
- Text uses `type-label` sizing (13px, uppercase, letter-spacing 1.2).
- Minimum segment height: 32px.
- No animation on switch — instant state change.

## Done criteria

- Renders N segments from the `segments` array.
- Active segment visually distinct per the rules above.
- Tapping an inactive segment fires `onChangeIndex`.
- Preview: category "Controls", naked frame, componentWidth 300, segment count prop control.
