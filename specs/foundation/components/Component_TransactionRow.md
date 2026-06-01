# Component_TransactionRow

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.7
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Single transaction in a feed — the building block of the Recent Transactions section on both Franchise Home and League Home. Each row shows what happened, who did it, and when. TransactionRow is a compact, scannable list item designed to be stacked in a feed. It does not expand or navigate — it's a read-only summary.

Reference: Design System §4.7, Data Model §4.18 (Transaction entity), Wireframes §1.1 block 3c, §3.1 block 2c.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `type` | `TransactionType` | Yes | — | Transaction type enum (ADD_DROP, WAIVER_CLAIM, TRADE_COMPLETED, IR_MOVE, etc.). Determines the icon. |
| `description` | `string` | Yes | — | Human-readable description (e.g., "Added RB Marvin Cobb (BAL); dropped K Liam Vance (HOU)"). In the preview this maps from mockData `Transaction.details` (the entity field is named `details`, not `description`). |
| `timestamp` | `string` | Yes | — | ISO timestamp. Displayed as relative time ("2h ago", "3d ago"). |
| `franchise` | `{ abbreviation: string; primaryColor: string }` | No | `undefined` | If provided, shows a small franchise color dot before the description. Used in league-wide feeds where multiple franchises appear. |

## Visual rules

### Layout

```
┌────────────────────────────────────────────────────────┐
│  [icon]  [●] Added RB Marvin Cobb (BAL); dropped...  2h ago │
└────────────────────────────────────────────────────────┘
```

- Single horizontal row, vertically centered.
- Minimum height: 40px (touch target compliance).
- Bottom border: 1px `gray-100` (divider between rows in a feed).

### Type icon

- 16×16 icon area, left-aligned.
- Color: `gray-500`.
- Icon mapping (use simple geometric shapes or Unicode symbols as placeholders until an icon library is chosen):

| Type | Icon concept | Placeholder |
|------|-------------|-------------|
| `ADD_DROP` | Swap arrows | ↕ |
| `WAIVER_CLAIM` | Gavel / bid | ◆ |
| `TRADE_COMPLETED` | Handshake / exchange | ⇄ |
| `TRADE_REVERSAL` | Undo arrow | ↺ |
| `IR_MOVE` | Medical cross | + |
| `TAXI_MOVE` | Up/down arrow | ↕ |
| `AUCTION_AWARD` | Hammer | ◆ |
| `DRAFT_PICK_MADE` | Star / pick | ★ |
| `SALARY_ADJUSTMENT` | Dollar sign | $ |
| `COMMISSIONER_ACTION` | Shield | ◇ |

- For types not in the mapping, use a neutral circle (●) in `gray-400`.

### Franchise dot

- If `franchise` is provided: 8px circle filled with `franchise.primaryColor`, positioned after the icon and before the description text.
- Gap: `spacing.xs` (4px) between dot and description.
- If no franchise: dot is not rendered, description starts immediately after the icon.

### Description text

- Type token `bodySm` (Barlow, 13px). Note: this is the only 13px body token and it is the *light* weight — acceptable for a dense feed row.
- `gray-700`.
- Single line, truncated with ellipsis if it overflows.
- Flex: 1 (takes remaining space).

### Timestamp

- Renders via the `Mono` primitive (JetBrains Mono 11px). Pass `color={gray-400}` explicitly — `Mono` defaults to `gray-500`.
- Right-aligned, flex-shrink 0.
- Display as relative time. **`Mono` uppercases its text**, so the rendered output is "2H AGO", "3D AGO", "NOV 10" (not lowercase). This keeps the timestamp consistent with the design system's mono-meta treatment.
- Rules: < 1 hour → "Xm ago", < 24 hours → "Xh ago", < 7 days → "Xd ago", >= 7 days → short date "Nov 10" (all rendered uppercase by Mono).

## Dependencies

- `Component_Mono` — renders the timestamp

## Done criteria

- Renders a compact single-line transaction with icon, optional franchise dot, description, and relative timestamp.
- All transaction types show the correct icon placeholder.
- Description truncates cleanly on overflow.
- Timestamp displays in relative format.
- Preview: category "Transactions", naked frame, componentWidth 380, showing 5 sample transactions from mockData stacked in a list with different types and franchises.
