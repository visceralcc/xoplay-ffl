# Component_InjuryIndicator

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.5, §3.5
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Compact visual indicator for a player's injury status. Renders as a small colored square with a single-letter code. Appears in roster tables, player rows, matchup views, and anywhere injury status needs to be surfaced at a glance.

## Behavior

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `status` | `'Q' \| 'D' \| 'O' \| 'IR' \| null` | No | `null` | Injury status code. `null` or `undefined` means healthy — component renders nothing. |

### Visual states

| State | Appearance |
|-------|------------|
| Healthy (`null`) | Nothing rendered. Component returns null — no empty box, no placeholder. |
| Questionable (`Q`) | 16×16 rounded square, `injury-Q` background (#9c6a00), white "Q" text. |
| Doubtful (`D`) | 16×16 rounded square, `injury-D` background (#b82727), white "D" text. |
| Out (`O`) | 16×16 rounded square, `injury-O` background (#b82727), white "O" text. |
| IR (`IR`) | 16×16 rounded square, `injury-IR` background (#141414), white "IR" text. |

### Dimensions

- Width: 16px
- Height: 16px
- Border radius: 2px (close to `radius-sm` but slightly smaller for this micro element)
- Text: Barlow Condensed 700, 9px, white (#ffffff), centered both axes
- Letter-spacing: 0.3

## Rules

- When `status` is `null`, `undefined`, or any value not in the known set, the component renders nothing. It does NOT render an empty square or a "HEALTHY" indicator.
- Text color is ALWAYS white (#ffffff), regardless of background color. All injury background colors pass contrast checks against white at this size.
- The "IR" code is two characters in the same 16px space. The 9px font size accommodates both characters without overflow.
- This component has no interactive behavior — it's informational only.

## Dependencies

- `src/theme/tokens` — `injury` color map (Q, D, O, IR), Barlow Condensed 700 font family

## Edge cases

- `SUSPENDED`, `HOLDOUT`, `COVID` statuses from the data model: these are not displayed by InjuryIndicator. If the data model expands the injury set, a mapping layer in the consuming component should convert to Q/D/O/IR/null for display, or a new indicator component should be created.
- Adjacent to PositionBadge: in PlayerRow, InjuryIndicator sits next to PositionBadge with `spacing-xs` (4px) gap. This is the consuming component's responsibility, not InjuryIndicator's.

## Out of scope

- Tooltip explaining injury details (game, body part) — that's a hover/tap interaction on the parent component.
- Full-word rendering ("Questionable", "Doubtful") — that's a different display context, not this component.

## Done criteria

- Renders nothing when status is null/undefined.
- Renders a 16×16 colored square with correct letter for Q, D, O, IR.
- Background colors match the injury token values exactly.
- Text is white, 9px, Barlow Condensed 700, centered.
- Registered in preview with prop control for status (`select`: Q/D/O/IR/none).
