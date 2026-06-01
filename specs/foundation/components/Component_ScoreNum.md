# Component_ScoreNum

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.4
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Large formatted score number. The typographic centerpiece of matchup displays — this is the number that owners stare at on game day. ScoreNum is a pure display primitive: it renders a number in Barlow Condensed 700 with tabular-nums at a configurable size. It has no opinion about context, franchise colors, or layout — those are ScoreDisplay's job.

Reference: `ScoreNum` in `design/reference/primitives.jsx`.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `string` | Yes | — | Formatted score string (e.g., "142.36", "0.00"). Consumer handles formatting. |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | No | `'lg'` | Controls font size. |
| `color` | `string` | No | `gray-950` | Text color. Used by ScoreDisplay to show scores on franchise-colored backgrounds via `onColor()`. |

## Visual rules

- Font: Barlow Condensed 700 at all sizes.
- `fontVariantNumeric: 'tabular-nums'` — always. Scores must align vertically in side-by-side matchup layouts.
- `letterSpacing: -1` — tight tracking at display sizes keeps numbers feeling like a unit, not a string of digits.
- `lineHeight: 0.9` — tight leading so the number sits snugly within color blocks.
- No background, border, or padding — ScoreNum is naked type.

### Size mapping

| Size | Font size | Use case |
|------|-----------|----------|
| `sm` | 24px | Inline scores in standings, compact matchup lists |
| `md` | 36px | Matchup cards in league home grid |
| `lg` | 56px | Primary matchup view, franchise home upcoming matchup |
| `xl` | 72px | Gameday hero matchup, full-screen live scoring |

## Done criteria

- Renders the value string in Barlow Condensed 700 with tabular-nums and tight tracking.
- All four sizes render at the correct font size.
- Accepts a color override.
- Preview: category "Scoring", naked frame, componentWidth 200, with size selector and sample score values ("142.36", "0.00", "87.50").
