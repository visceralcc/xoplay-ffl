# Component_ScoreDisplay

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.4
**Type:** Component
**Last updated:** May 2026

---

## Purpose

A single franchise's score block within a matchup — the score number in the context of franchise identity. ScoreDisplay wraps a ScoreNum inside a franchise-colored background block with the franchise name and mark. It represents one "side" of a matchup. MatchupCard composes two ScoreDisplays side by side.

This is where the "franchise identity is first-class" principle (Design System §2.3) meets the scoring system. The franchise color block behind the score makes each side of a matchup immediately identifiable, even in a grid of 8+ simultaneous matchups on game day.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `franchise` | `{ name: string; abbreviation: string; primaryColor: string; secondaryColor: string }` | Yes | — | Franchise identity data. |
| `score` | `string` | Yes | — | Formatted score value (passed to ScoreNum). |
| `isWinning` | `boolean` | No | `false` | If `true`, the score renders at full opacity. If `false`, slightly muted. Only meaningful when both sides of a matchup are visible. |
| `isLive` | `boolean` | No | `false` | If `true`, shows a LiveDot next to the score. |
| `scoreSize` | `'sm' \| 'md' \| 'lg' \| 'xl'` | No | `'md'` | Passed through to ScoreNum's `size` prop. |
| `layout` | `'compact' \| 'full'` | No | `'full'` | `compact` shows abbreviation + score only. `full` shows franchise mark, name, and score. |

## Visual rules

### Full layout

```
┌──────────────────────────┐
│  [Mark]  FRANCHISE NAME  │  ← franchise name row
│         142.36           │  ← ScoreNum, centered
│                   ● LIVE │  ← LiveDot + label (if isLive)
└──────────────────────────┘
```

- Background: `franchise.primaryColor` as a solid block.
- All text uses `onColor(franchise.primaryColor)` for contrast safety.
- Franchise name: Barlow Condensed 600, 12px, uppercase, letter-spacing 1px.
- FranchiseMark: 24×24 size, to the left of the franchise name.
- ScoreNum: centered horizontally, below the name row.
- Border radius: `radius-sm` (3px).
- Padding: `spacing.md` (12px) all sides.
- Minimum width: 120px.

### Compact layout

```
┌────────────────┐
│  OAK   142.36  │
└────────────────┘
```

- Same franchise-colored background.
- Abbreviation (Barlow Condensed 600, 11px, uppercase) + ScoreNum on a single horizontal row.
- Tighter padding: `spacing.sm` (8px).

### Winning vs. losing

- `isWinning: true` — full opacity on all elements.
- `isWinning: false` — score text opacity 0.7, franchise name opacity 0.7. The color block remains full opacity (the muting is on the content, not the container).

## Dependencies

- `Component_ScoreNum` — renders the score value
- `Component_FranchiseMark` — renders the franchise mark (full layout only)
- `Component_LiveDot` — renders the live indicator (when `isLive`)
- `src/theme/helpers` — `onColor()` for text contrast

## Done criteria

- Renders a franchise-colored block with the score in contrasting text.
- Full and compact layouts both work.
- Winning/losing opacity difference is visible.
- LiveDot appears when `isLive` is true.
- Works with all five sample franchises (including edge cases like near-black Brooklyn and near-white San Antonio).
- Preview: category "Scoring", naked frame, componentWidth 200, with franchise selector and isLive/isWinning toggles.
