# Screen_RosterView

**Status:** Draft
**Parent specs:** [Spec_RosterManagement.md](../Spec_RosterManagement.md), [Spec_Navigation.md](../../foundation/Spec_Navigation.md) §3.2 / §6.1, [Spec_Tiers.md](../../Spec_Tiers.md), [Spec_DesignSystem.md](../../Spec_DesignSystem.md)
**Type:** Screen
**Last updated:** May 2026

---

## Purpose

A read-only composition of a franchise's roster — franchise masthead, an Active / IR / Taxi segment control, and a roster table — assembled from already-built design-system components against mock data. This is the Batch 5 visual-lock composition for the roster surface (the Navigation spec's "Roster Management" screen at `/:leagueSlug/my-team/roster`). It establishes the layout and proves the components compose, ahead of the interactive `Screen_RosterEdit` build that adds editing, roster moves, and validation.

## Behavior

### Layout regions

Single column, top to bottom:

```
┌──────────────────────────────────────────┐
│  FranchiseHeader (colored masthead)        │  ← identity, owner, record
├──────────────────────────────────────────┤
│  [ Active 3 ] [ IR 1 ] [ Taxi 1 ]          │  ← SegmentControl, counts in labels
├──────────────────────────────────────────┤
│  POS  Player        INJ   SAL    TOTAL     │  ← DataTable header
│  ──────────────────────────────────────   │
│  QB   Chase Hollander       $26.50  184.40 │  ← PlayerRow ×N (selected bucket)
│  RB   Devon Mitchell   O    $19.25  102.40 │
│  ...                                       │
└──────────────────────────────────────────┘
```

1. **Masthead** — `FranchiseHeader`, fed the franchise's name, abbreviation, colors, owner, and record.
2. **Bucket switcher** — `SegmentControl` with three segments: Active, IR, Taxi. Each label carries its count for the current franchise (e.g., "Active 3", "IR 1", "Taxi 1"). Selecting a segment is in-page state, not a route change (Navigation §2.1, §3.2 — "Active/IR/Taxi via segment control, in-page state, not URL").
3. **Roster table** — a column header row (`DataTable`) above a list of `PlayerRow` rows, both driven by one shared `ColumnDef[]`. Renders only the players whose `rosterBucket` matches the selected segment.

### What the user sees
- The franchise masthead in the franchise's colors.
- Per-bucket counts in the segment labels.
- A scannable roster table for the selected bucket: position, headshot, name/team, injury, season total, plus salary in cap-tracking tiers.

### What the user can do (in this composition)
- Switch buckets via the segment control.
- Nothing else — this is a read-only display. No editing, no roster moves, no off-screen navigation.

### States
- **Populated** — the selected bucket has players → render the table.
- **Empty bucket** — the selected bucket has zero players → in place of the table, render an empty-state line (e.g., "No players on IR") in `bodySm` / `gray-500`. The segment control and its counts still render.
- **Loading / error** — handled by the interactive screen (skeleton / retry), not exercised by this composition (it uses static mock data). Listed so the later build picks them up.

## Rules

- **Bucket filter.** A row appears iff `player.rosterBucket === selectedBucket`, mapping segments → buckets: Active → `ACTIVE`, IR → `INJURED_RESERVE`, Taxi → `TAXI_SQUAD`.
- **Counts.** Each segment label's count is the number of players in that bucket for the franchise; the count renders even when the bucket is empty (shows "0").
- **Shared columns.** The `DataTable` header and the `PlayerRow` body use the same `ColumnDef[]` so the columns line up. Follow the existing pattern in `app/preview.tsx` (the `ROSTER_COLUMNS` array that already feeds both `DataTable` and `PlayerRow`).
- **Density + columns for the phone frame.** At 390px wide, use `density="compact"` and a reduced column set so the table fits:
  - cap tiers (Dynasty, or Keeper with `trackSalaries`): `position, headshot, nameTeam, injury, salary, seasonTotal`
  - non-cap (Redraft): drop `salary` → `position, headshot, nameTeam, injury, seasonTotal`
  - `PlayerRow`'s full eight-column `DEFAULT_COLUMNS` is for wide viewports, not this composition.

### Tier variations (per Spec_Tiers.md)
- **Salary / contract columns** show only when the league tracks salaries (Dynasty always; Keeper if `trackSalaries`); hidden in Redraft.
- **Taxi segment** appears only where a taxi squad is configured (Dynasty / Keeper feature); otherwise the switcher shows Active + IR.
- The preview demonstrates the **Dynasty** case (all three segments, salary column present).

## Dependencies

- **Components:** [`FranchiseHeader`](../../foundation/components/Component_FranchiseHeader.md), [`SegmentControl`](../../foundation/components/Component_SegmentControl.md), [`PlayerRow`](../../foundation/components/Component_PlayerRow.md), [`DataTable`](../../foundation/components/Component_DataTable.md); layout via [`PageShell`](../../foundation/components/Component_PageShell.md) / [`Section`](../../foundation/components/Component_Section.md) / [`Stack`](../../foundation/components/Component_Stack.md).
- **Data:** `src/data/mockData.ts` — `getPlayersByFranchise(franchiseId)` for the roster, `franchises` for the masthead. Player `rosterBucket`, `position`, `injuryStatus`, `salary`, `seasonTotal` drive the table.
- **Data map:** Navigation §6.1 "Roster Management" defines the screen's full data requirement (RosterEntry + Player join, contracts, lineup, IR/taxi eligibility, abilities). This composition uses only the read-only display subset.
- **Tokens / patterns:** all colors, sizes, and fonts from `src/theme/tokens.ts`. No hardcoded values.

## Edge cases

- **Empty bucket.** Show the empty-state line, not a bare header with no rows.
- **Long player names.** Truncate via the `PlayerRow` name cell's existing `numberOfLines={1}`; don't widen the column.
- **Very-light franchise color.** Handled inside `FranchiseHeader` (it applies a `gray-300` border on near-white franchises) — nothing to do here.
- **Single-bucket franchises.** Counts of 0 are valid and must still render in the segment label.

## Out of scope

- Lineup editing, IR/Taxi moves, add/drop, or any roster mutation — that's `Screen_RosterEdit` and the roster `Logic_*` units.
- Roster compliance against configured position limits — that's `Screen_RosterCompliance`.
- The cap snapshot / `CapMeter` and contract detail — those live on the Salary Cap Overview screen (`/my-team/cap`) and Franchise Home. The roster table's salary column is this screen's only cap-awareness.
- Player Profile navigation — rows may be pressable later, but no navigation is wired in this composition.
- Live data, loading, and error states — static mock data only.
- Column sorting behavior — the `DataTable` header may show sort affordances, but sorting is not wired here.

## Done criteria

- Renders all three layout regions: `FranchiseHeader`, the Active/IR/Taxi `SegmentControl` with counts, and the roster table (`DataTable` header + `PlayerRow` body) for the selected bucket.
- Switching segments filters the table to that bucket; the row count matches the segment's count.
- An empty bucket renders the empty-state line; the segment control and counts still render.
- Salary column is present in the Dynasty preview and would drop in Redraft (tier rule documented above).
- Composes existing components without modifying them; all styling from tokens, zero hardcoded values.
- **Preview:** category "Screens", `phone` frame, rendering franchise `fr-prt` (Portland Rainwater — the one mock franchise with all three buckets populated: 3 Active / 1 IR / 1 Taxi). Compact density. Segment control is interactive (tapping switches the visible bucket). Optionally a franchise select control to show an empty-bucket franchise (e.g., `fr-mia`, which has empty IR and Taxi).
