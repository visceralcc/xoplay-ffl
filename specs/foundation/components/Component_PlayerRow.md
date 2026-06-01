# Component_PlayerRow

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.2, §4.5, §5
**Type:** Component
**Last updated:** May 2026 (rev: RosterRow view-model prop)

---

## Purpose

The single most reused element in the product. A horizontal row displaying a player's key information — appears in roster tables, add/drop lists, waivers, trade builders, draft boards, player search, and scoring breakdowns. Composes the Batch 1 primitives.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `row` | `RosterRow` | Yes | — | Joined roster view model from the data layer (`getRosterByFranchise`): player identity + contract + computed season / last-week points + roster bucket + injury. Replaces the former flattened `MockPlayer` prop. |
| `density` | `'standard' \| 'compact'` | No | `'standard'` | Row height mode. |
| `columns` | `ColumnDef[]` | No | Default set | Which data columns to show and in what order. |
| `onPress` | `() => void` | No | — | Tap handler for row selection/expansion. |

## Data source

PlayerRow reads a roster **view model** assembled by the data-layer helpers (`getRosterByFranchise` in `src/data`), not a flat player object. Salary and contract years come from the joined `Contract`; season and last-week points are computed from `Stats` × scoring rules; bucket and injury come off the `RosterEntry` / `Player`. None of these are stored on a flat player — see `foundation/Spec_MockFixture.md`.

## Visual rules

- **Standard density:** 44px row height, `type-data-md` for values, 10px vertical / 12px horizontal cell padding.
- **Compact density:** 32px row height, `type-data-sm` for values, 6px vertical / 12px horizontal cell padding.
- Row separator: 1px `gray-100` bottom border.
- Hover: `gray-50` background (standard), `gray-25` background (compact).
- Player name uses `type-body` (Barlow 400, 14px) — the one non-Condensed element in the row.
- NFL team abbreviation uses Mono component.

## Composition

Left to right, the default column layout:
1. **PositionBadge** — position code
2. **Headshot** — 32px in standard, 24px in compact
3. **Name + team** — player name (Barlow 400) over NFL team (Mono), stacked vertically
4. **InjuryIndicator** — only renders when not healthy
5. **Salary** — Mono or data token, right-aligned
6. **Contract years** — data token, right-aligned
7. **Weekly score** — StatValue-style, right-aligned, tabular-nums
8. **Season total** — data token, right-aligned, tabular-nums

Columns are configurable via the `columns` prop so consuming components can show subsets (e.g., Add/Drop doesn't show contract info).

## Column definition shape

```typescript
type ColumnDef = {
  key: string;        // e.g., 'position', 'name', 'salary', 'weekScore'
  label: string;      // Column header text
  width?: number;     // Fixed width, or flex if omitted
  align?: 'left' | 'right';
};
```

## Done criteria

- Renders a player row at both density modes with correct heights and type sizes.
- Composes PositionBadge, Headshot, InjuryIndicator, Mono from Batch 1.
- All numeric values use tabular-nums.
- Hover state works on web.
- Preview: category "Data Display", naked frame, componentWidth 700, density toggle, multiple player variants from mockData.
