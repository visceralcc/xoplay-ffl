# Component_Stack

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.1
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Flex container with consistent spacing between children. The most basic layout building block — used everywhere content needs to be arranged vertically or horizontally with predictable gaps. Stack replaces ad-hoc `marginBottom` / `marginRight` patterns with a single composable primitive.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `ReactNode` | Yes | — | Stack items. |
| `direction` | `'vertical' \| 'horizontal'` | No | `'vertical'` | Layout axis. |
| `gap` | `number` | No | `spacing.md` (12) | Space between children, in pixels. Use spacing tokens. |
| `align` | `'start' \| 'center' \| 'end' \| 'stretch'` | No | `'stretch'` | Cross-axis alignment (maps to `alignItems`). |
| `justify` | `'start' \| 'center' \| 'end' \| 'between' \| 'around'` | No | `'start'` | Main-axis distribution (maps to `justifyContent`). |
| `wrap` | `boolean` | No | `false` | Whether children wrap to the next line (horizontal only). |

## Visual rules

- Renders as a `View` with `flexDirection` set by `direction` (`column` for vertical, `row` for horizontal).
- Gap implemented via React Native's `gap` property (supported in RN 0.71+). No margin hacks.
- No background, border, padding, or visual treatment of its own — Stack is invisible infrastructure.
- When `wrap` is `true` and direction is horizontal, uses `flexWrap: 'wrap'`.

## Usage guidance

Common `gap` values tied to spacing tokens:
- `spacing.xs` (4) — tight clusters like icon + label.
- `spacing.sm` (8) — items within a Card or Section.
- `spacing.md` (12) — default, general-purpose.
- `spacing.lg` (16) — between Cards or major content blocks.
- `spacing.xl` (24) — between Sections on a page.

## Done criteria

- Renders children along the specified axis with consistent gap.
- All prop combinations work: direction, gap, align, justify, wrap.
- Preview: category "Layout", naked frame, componentWidth 360, with colored placeholder boxes showing vertical, horizontal, and wrapped layouts.
