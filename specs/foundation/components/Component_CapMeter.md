# Component_CapMeter

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.6
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Visual salary cap usage bar showing how much of a franchise's cap is consumed. The key financial health indicator for Dynasty and Keeper leagues. CapMeter communicates three states at a glance: under cap (healthy), near cap (warning), and over cap (error). Hidden entirely in Redraft leagues (tier gating via the Hidden strategy, Design System §7.1).

Reference: Design System §4.6, Wireframes §1.1 block 3d (Cap Snapshot Card).

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `capUsed` | `number` | Yes | — | Total salary cap currently consumed. |
| `capTotal` | `number` | Yes | — | Total salary cap available. |
| `showLabels` | `boolean` | No | `true` | Whether to show the "Used / Total" text labels above the bar. |
| `showRoom` | `boolean` | No | `true` | Whether to show the "Cap Room: $X.XX" or "Over Cap: $X.XX" text below the bar. |
| `size` | `'sm' \| 'md'` | No | `'md'` | `sm` for inline use (e.g., inside a standings table cell). `md` for standalone display (e.g., Cap Snapshot Card). |

## Visual rules

### Layout (md size)

```
$202.70 / $222.75                    ← labels row (if showLabels)
┌────────────────────────────────┬─────┐
│█████████████████████████████████│     │  ← usage bar
└────────────────────────────────┴─────┘
Cap Room: $20.05                     ← room text (if showRoom)
```

### Usage bar

- Full width of container.
- Height: 12px (md), 6px (sm).
- Border radius: `radius-sm` (3px).
- Track (background): `gray-100`.
- Fill: width = `(capUsed / capTotal) * 100%`, capped at 100% visually.

### Fill color (state-driven)

| Usage % | State | Fill color | Room text color |
|---------|-------|-----------|-----------------|
| < 85% | Healthy | `status-success` | `gray-700` |
| 85–100% | Warning | `status-warning` | `status-warning` |
| > 100% | Over cap | `status-error` | `status-error` |

> Boundaries are exclusive on the low end: healthy is *strictly* below 85%; a franchise at exactly 85% reads as Warning.

### Labels row (if showLabels)

- Type token `data` (Barlow Condensed Medium, carries tabular-nums) — the dollar figures must use a tabular-nums token so digits align.
- Format: "$202.70 / $222.75"
- Left-aligned above the bar.
- Color: `gray-700`.

### Room text (if showRoom)

- Type token `bodyXs` (Barlow regular, 12px); apply tabular-nums to the dollar amount.
- Under cap: "Cap Room: $20.05" in `gray-700`.
- Over cap: "Over Cap: $4.45" in `status-error`.
- Centered below the bar.

### Small size (sm)

- Bar height: 6px.
- No labels row, no room text (regardless of prop values).
- Just the colored bar in its track.

## Dependencies

- `src/theme/tokens` — status colors, gray scale, radius, spacing

## Done criteria

- Renders a horizontal bar showing cap usage as a proportion of total.
- Fill color transitions through healthy → warning → over cap states.
- Labels and room text render when enabled.
- Small size renders a minimal bar-only variant.
- Preview: category "Cap", naked frame, componentWidth 300, with three CapMeters showing healthy (75%), warning (92%), and over-cap (105%) states, plus a small-size variant.
