# Component_MatchupCard

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.4, [Wireframes.md](../Wireframes.md) §1 (Franchise Home), §3 (League Home)
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Two-franchise head-to-head matchup display. The emotional center of the product — this is what owners check obsessively on game day. MatchupCard composes two ScoreDisplays side by side with shared matchup metadata (week number, game status, projected/final label). Used on franchise home pages (upcoming matchup), league home (matchup grid), and the Gameday screen.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `homeTeam` | `{ franchise: FranchiseData; score: string }` | Yes | — | Home side franchise and score. |
| `awayTeam` | `{ franchise: FranchiseData; score: string }` | Yes | — | Away side franchise and score. |
| `weekNumber` | `number` | Yes | — | Fantasy week. |
| `status` | `'upcoming' \| 'live' \| 'final'` | No | `'upcoming'` | Game state. |
| `onPress` | `() => void` | No | `undefined` | If provided, the entire card is tappable (navigates to full matchup view). |
| `variant` | `'standard' \| 'compact'` | No | `'standard'` | `standard` for standalone display (franchise home, matchup detail). `compact` for grid display (league home matchup list). |

## Visual rules

### Standard variant

```
┌───────────────────────────────────────────┐
│              WEEK 8 · LIVE ●              │  ← metadata row
├──────────────────┬────────────────────────┤
│                  │                        │
│  [Away Score     │     Home Score]        │  ← two ScoreDisplays
│  [Display]       │     [Display]          │
│                  │                        │
├──────────────────┴────────────────────────┤
│           PROJECTED / FINAL               │  ← status label
└───────────────────────────────────────────┘
```

- Container: Card component (white background, border, shadow, radius-md).
- Metadata row: centered, Barlow Condensed 500, 11px, uppercase, `gray-500`. Week number, then a `·` separator, then status. If live, LiveDot replaces the status text.
- Score area: two ScoreDisplays side by side with `spacing.sm` (8px) gap between them. Each ScoreDisplay uses `scoreSize: 'lg'` and `layout: 'full'`.
- The ScoreDisplay with the higher score gets `isWinning: true`. If scores are tied, both get `isWinning: true`.
- Status label row: centered below scores. "PROJECTED" (upcoming), "LIVE" (live), "FINAL" (final) in Label style.
- If `status === 'live'`, both ScoreDisplays get `isLive: true`.

### Compact variant

```
┌───────────────────────────────────┐
│  WK 8  OAK 142.36 - MIA 128.90  │
└───────────────────────────────────┘
```

- Single row inside a Card.
- Week label in Mono (JetBrains Mono 11px, `gray-500`).
- Two ScoreDisplays in `compact` layout with a dash separator between them.
- ScoreDisplays use `scoreSize: 'sm'`.
- If live, a LiveDot appears after the week label.
- Card padding reduced to `spacing.sm` (8px).

### Status-specific behavior

| Status | Metadata | Score labels | ScoreDisplay `isLive` |
|--------|----------|-------------|----------------------|
| `upcoming` | "WEEK 8" | "PROJECTED" | `false` |
| `live` | "WEEK 8 · ● LIVE" | hidden (scores speak for themselves) | `true` |
| `final` | "WEEK 8" | "FINAL" | `false` |

### Tappable behavior

When `onPress` is provided, the Card shows a subtle hover/press state (background shifts to `gray-25` on press). The entire card is the tap target.

## Dependencies

- `Component_Card` — outer container
- `Component_ScoreDisplay` — one per side (away left, home right)
- `Component_LiveDot` — in metadata row when live
- `Component_Label` — for metadata and status text
- `Component_Mono` — for week label in compact variant

## Done criteria

- Renders two ScoreDisplays side by side inside a Card.
- Standard and compact variants both work.
- Winning side is visually emphasized via ScoreDisplay's `isWinning` prop.
- Live status shows LiveDots in both the metadata row and both ScoreDisplays.
- All three statuses (upcoming, live, final) render with correct labels and behavior.
- Works with any franchise color combination (test with Oakland vs. Miami, Brooklyn vs. San Antonio).
- `onPress` makes the card tappable with press feedback.
- Preview: category "Scoring", naked frame, componentWidth 380, with status selector (upcoming/live/final) and variant selector (standard/compact). Show two matchups with different franchise pairs.
