# Component_FranchiseHeader

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.3, §8.5 (franchise block treatment)
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Bold franchise-colored masthead — the identity anchor at the top of the Franchise Home screen. This is the single most visually distinctive element in XO Play. A full-bleed block of `primaryColor` with the franchise name at display size, the FranchiseMark, owner name, record, and tier label — all rendered in `onColor()` text. The "franchise-proud" principle lives here: commitment, not timidity.

Reference: Design System §8.5 (franchise block treatment), §8.1 (where franchise colors appear), Wireframes §1.1 block 1.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `franchise` | `{ name: string; abbreviation: string; primaryColor: string; secondaryColor: string }` | Yes | — | Franchise identity data. |
| `ownerName` | `string` | Yes | — | Franchise owner's display name. |
| `record` | `string` | Yes | — | W-L(-T) record string (e.g., "7-3"). |
| `divisionRecord` | `string` | No | `undefined` | Division record (e.g., "3-1 DIV"). Shown below main record if provided. |
| `tierLabel` | `string` | No | `'DYNASTY'` | League tier descriptor (e.g., "DYNASTY · SALARY · CONTRACT" or "REDRAFT"). |
| `pointsFor` | `string` | No | `undefined` | Formatted PF total. If provided, renders in the stats cluster. |
| `pointsAgainst` | `string` | No | `undefined` | Formatted PA total. |
| `streak` | `string` | No | `undefined` | Current streak (e.g., "W2", "L3"). |

## Visual rules

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────┐                                               │
│  │ Mark │   OAKDALE TIMBERWOLVES          ← display name│
│  │64×64 │   M. Torres · 7-3 (3-1 DIV)    ← owner+record│
│  └──────┘   DYNASTY · SALARY · CONTRACT   ← tier label  │
│                                                         │
│         PF 1,180.45  ·  PA 1,085.20  ·  W2  ← stats    │
└─────────────────────────────────────────────────────────┘
```

- Background: `franchise.primaryColor` as a full-bleed block.
- All text: `onColor(franchise.primaryColor)` for contrast safety.
- Near-white franchise edge case: when `safeBlock().veryLight` is true, add a 1px `gray-300` border on all edges so the block is visible against the page background.
- Border radius: none — full-bleed means the masthead extends to the edges of the content area (or screen on mobile).
- Padding: `spacing.xl` (24px) top/bottom, `spacing.lg` (16px) horizontal.

### Typography

- Franchise name: Barlow Condensed 700, 32px, uppercase. The hero text.
- Owner name + record: Barlow 400, 14px. Owner name, then " · ", then record. Division record on same line in parentheses if provided.
- Tier label: JetBrains Mono 11px, letter-spacing 0.4px. Rendered at 0.7 opacity of the `onColor()` text — never `gray-500`, which would clash with franchise colors.
- Stats cluster: StatValue components in a horizontal Stack, using `size: 'sm'`. Labels and values both use `onColor()` text. Label opacity: 0.7. Value opacity: 1.0.

### FranchiseMark placement

- 64×64 FranchiseMark, top-left of the header.
- Gap between mark and text block: `spacing.lg` (16px).
- Mark and text are vertically centered relative to each other.

### Stats cluster

- Horizontal row below the name/record block, separated by `spacing.md` (12px) vertical gap.
- Items separated by " · " in `onColor()` text at 0.5 opacity.
- Only renders if at least one of `pointsFor`, `pointsAgainst`, `streak` is provided.

## Dependencies

- `Component_FranchiseMark` — renders the franchise mark
- `Component_StatValue` — renders PF/PA/streak (with color overrides for franchise block context)
- `src/theme/helpers` — `onColor()`, `safeBlock()`

## Done criteria

- Renders a full-bleed franchise-colored block with franchise name, mark, owner, record, tier label, and optional stats.
- All text uses `onColor()` — legible on all five sample franchises.
- Near-white franchise (San Antonio) gets a subtle border.
- Near-black franchise (Brooklyn) renders legibly with white text.
- Stats cluster renders only when stat props are provided.
- Preview: category "Franchise", naked frame, componentWidth 390, showing all five franchises in a vertical stack so color range is visible.
