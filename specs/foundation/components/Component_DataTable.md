# Component_DataTable

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.2, §5
**Type:** Component
**Last updated:** May 2026

---

## Purpose

The workhorse table component. Renders any array of data as a sortable, density-switchable table with column headers. Used for rosters, standings, player search results, transaction history, and every other list of structured data in the product.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `columns` | `ColumnDef[]` | Yes | — | Column definitions (key, label, width, align, sortable, render). |
| `data` | `any[]` | Yes | — | Array of row data objects. |
| `renderRow` | `(item: any, index: number) => ReactNode` | Yes | — | Render function for each row. Typically renders a PlayerRow or custom row. |
| `density` | `'standard' \| 'compact'` | No | `'standard'` | Density mode. |
| `sortKey` | `string` | No | — | Currently sorted column key. |
| `sortDirection` | `'asc' \| 'desc'` | No | `'desc'` | Sort direction. |
| `onSort` | `(key: string) => void` | No | — | Called when a column header is tapped. |
| `showDensityToggle` | `boolean` | No | `true` | Whether to show the Standard/Compact SegmentControl in the toolbar. |
| `showHeader` | `boolean` | No | `true` | Whether to render column headers. |

## Visual rules

- **Column headers:** `type-label` (Barlow Condensed 600, 13px, uppercase), `gray-500` text. Tappable headers show a sort indicator (▲/▼) when active.
- **Header row:** `gray-25` background, 1px `gray-200` bottom border, 36px height.
- **Toolbar** (when `showDensityToggle` is true): sits above the header row, contains a SegmentControl with "Standard" / "Compact" segments. Gray-50 background, bottom border.
- **Density modes:** passed through to child rows (the table itself adjusts header height and padding, rows handle their own density).
- **Sort indicator:** small ▲ or ▼ next to the active sort column label. Inactive sortable columns show no indicator.

## Column definition shape

```typescript
type ColumnDef = {
  key: string;
  label: string;
  width?: number | string;  // Fixed px or flex fraction
  align?: 'left' | 'right';
  sortable?: boolean;
  render?: (value: any, item: any) => ReactNode;  // Custom cell renderer
};
```

## Composition

DataTable provides the shell (toolbar, headers, scroll container) and delegates row rendering to the consumer via `renderRow`. This keeps DataTable generic — it doesn't know about players, franchises, or any specific data shape.

A typical usage:
```
<DataTable
  columns={rosterColumns}
  data={players}
  renderRow={(player) => <PlayerRow player={player} density={density} />}
/>
```

## Done criteria

- Renders column headers with sort indicators.
- Tapping a sortable header fires `onSort`.
- Density toggle (SegmentControl) switches between standard/compact.
- Rows render via the `renderRow` prop.
- Preview: category "Data Display", naked frame, componentWidth 800, populated with mockData players via PlayerRow, density and sort controls.
