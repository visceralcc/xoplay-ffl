# Component_LiveDot

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.4
**Type:** Component
**Last updated:** May 2026

---

## Purpose

A small pulsing dot that signals "this data is live / updating now." Used on matchup cards, scoring feeds, and the Gameday nav indicator. The visual language of liveness in XO Play.

## Behavior

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `size` | `number` | No | `8` | Diameter of the inner dot in pixels. |

### Visual states

| State | Appearance |
|-------|------------|
| Default | Solid circle in `status-live` (#d81c1c). Surrounded by a 1px outer ring at 40% opacity, offset 4px larger than the dot. The dot pulses with a subtle opacity animation (1.0 → 0.6 → 1.0 over ~2 seconds). |

### Dimensions

- Inner dot: `size` px diameter, fully circular (`radius-full`)
- Outer ring: `size + 8` px diameter (4px offset on each side), 1px border in `status-live` at 40% opacity, no fill
- Total space occupied: `size + 8` px square

### Animation

- The inner dot pulses opacity: 1.0 → 0.6 → 1.0
- Duration: ~2000ms per cycle
- Easing: ease-in-out
- Loops infinitely
- Respects `prefers-reduced-motion`: when active, the dot is static at full opacity (no pulse). The ring still renders.

## Rules

- Color is ALWAYS `status-live` (#d81c1c). This is a semantic color — it means "live" regardless of context.
- The component renders as an inline element sized to its total footprint (`size + 8` px).
- The outer ring uses the same `status-live` color at 40% opacity — NOT a separate color token.
- LiveDot has no interactive behavior — it's purely informational.
- The dot is `position: relative` with the ring `position: absolute` — this keeps the ring from affecting layout flow of surrounding elements.

## Dependencies

- `src/theme/tokens` — `status.live`, `radius.full`

## Edge cases

- Very small size (< 6px): still renders but the ring becomes difficult to see. Minimum recommended is 6px.
- Adjacent to text: LiveDot is commonly composed with a "LIVE" Label in the LiveIndicator pattern. The dot is vertically centered with the text by the parent — LiveDot itself has no text alignment logic.

## Out of scope

- "LIVE" text label — that's the consuming component's responsibility (e.g., LiveIndicator composes LiveDot + Label).
- Color variants — LiveDot is always red. Other status dots (e.g., online presence) would be a different component.

## Done criteria

- Renders an 8px (default) red dot with a pulsing outer ring.
- Pulse animation cycles smoothly at ~2s intervals.
- Animation stops (static dot) when reduced motion is preferred.
- Accepts a custom `size` prop.
- Total rendered footprint is `size + 8` px.
- Registered in preview with prop control for size (`stepper`: 6–16, step 2).
