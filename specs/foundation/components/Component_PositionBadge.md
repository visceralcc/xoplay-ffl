# Component_PositionBadge

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.5
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Displays a player's position as a compact text badge. Appears in roster tables, player rows, draft boards, trade builders, and anywhere a player's position needs to be quickly identified. This is one of the most frequently rendered elements in the product.

## Behavior

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `position` | `string` | Yes | — | Position code: `QB`, `RB`, `WR`, `TE`, `PK`, `DT`, `DE`, `LB`, `CB`, `S`, `FLEX`. |
| `size` | `'sm' \| 'md' \| 'lg'` | No | `'sm'` | Controls font size and badge dimensions. |

### Visual states

| State | Appearance |
|-------|------------|
| Default | Position code text in Barlow Condensed 600, `gray-700` color. No background fill — this is a text-only badge with a minimum width so badges align in columns. |

### Size mapping

| Size | Font size | Height | Min width | Padding |
|------|-----------|--------|-----------|---------|
| `sm` | 15px | 20px | 32px | 0 4px |
| `md` | 16px | 22px | 36px | 0 4px |
| `lg` | 18px | 26px | 40px | 0 4px |

## Rules

- Text is the raw position code — no transformation needed (position codes are already uppercase).
- Font is ALWAYS Barlow Condensed 600. Never Barlow regular.
- Color is ALWAYS `gray-700`. Position colors from the token system (`pos-qb`, `pos-rb`, etc.) are NOT used on the badge text — those colors are reserved for accent dots or background fills on other components. The PositionBadge itself is neutral.
- The badge is horizontally centered within its min-width, so badges align vertically in table columns regardless of code length (2-char "QB" vs 4-char "FLEX").
- Line-height is 1 (no extra leading).
- Letter-spacing is 0.4.

## Dependencies

- `src/theme/tokens` — `gray[700]`, Barlow Condensed 600 font family, `spacing.xs`

## Edge cases

- Unknown position code: renders whatever string is passed. Does not validate against a known set.
- `FLEX` is the longest standard code (4 chars). Min-width at each size accommodates this.

## Out of scope

- Position-colored backgrounds — if a colored badge is needed (e.g., on a draft board), that's a separate component or a wrapper.
- Tooltip showing full position name — not part of this component.

## Done criteria

- Renders position code in Barlow Condensed 600 at all three sizes.
- Text color is `gray-700` from tokens.
- Badge has a minimum width that keeps badges aligned in columns.
- Registered in preview with prop controls for position (`select`: QB/RB/WR/TE/PK/DT/DE/LB/CB/S/FLEX) and size (`select`: sm/md/lg).
