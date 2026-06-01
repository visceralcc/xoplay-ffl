# Screen_Standings

**Status:** Draft
**Parent specs:** [Spec_Navigation.md](../../foundation/Spec_Navigation.md) §6.2 / §4.3 / §5.3 / §3.2, [Spec_Tiers.md](../../Spec_Tiers.md), [Spec_DesignSystem.md](../../Spec_DesignSystem.md), [Spec_XOPlay_PRD.md](../../Spec_XOPlay_PRD.md). (Eventual Level 2 parent: `Spec_LeagueScreens.md` — not yet written.)
**Type:** Screen
**Last updated:** May 2026

---

## Purpose

A read-only composition of the league standings — a titled section wrapping a ranking table of every franchise — assembled from already-built design-system components and primitives against mock data. This is the Batch 5 visual-lock composition for the Standings surface (the Navigation spec's "Standings" screen at `/:leagueSlug/league/standings`). It establishes the layout and proves the table composes, ahead of the interactive Standings build that adds sorting, division/conference grouping, victory points, and tiebreaker explanations. It is the third of the four Batch 5 screens, following [Screen_RosterView.md](../../roster/screens/Screen_RosterView.md) and [Screen_FranchiseHome.md](../../franchise/screens/Screen_FranchiseHome.md).

## Behavior

### Layout regions

Single column, top to bottom:

```
┌──────────────────────────────────────────┐
│  STANDINGS                                 │  ← Section title (league-scoped)
│  ┌────────────────────────────────────┐   │
│  │ #  Franchise      W-L-T   PF    PA  …│  │  ← DataTable header
│  │ ──────────────────────────────────  │  │
│  │ 1  ▣ Bronxville…  8-2-0 1230.9 980.6 │  │  ← standings row ×N (inline)
│  │ 2  ▣ Oakdale…     7-3-0 1180.5 1085.2│  │
│  │ 3  ▣ Miami Tempo  6-4-0 1095.8 1110.2│  │
│  │ …                                    │  │
│  └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

Unlike the two franchise-scoped siblings, Standings is **league-scoped** — there is no single franchise to head it, so there is **no `FranchiseHeader` masthead**. The screen leads instead with a titled `Section` ("Standings") wrapping the table.

1. **Section header** — a `Section` titled "Standings" (no franchise masthead). This is the league-scoped analog to the siblings' colored masthead.
2. **Standings table** — a column header row (`DataTable`) above a list of standings rows, both driven by one shared column definition. Each row is composed **inline** inside `DataTable`'s `renderRow` from existing primitives (franchise identity + numeric cells) — there is no pre-built standings row component, and none is built here (see Rules → Row composition). Rows render in rank order (the mock `standings` array is already rank-sorted).

The section sits in a `spacing.lg` horizontal gutter with `spacing.lg` vertical rhythm, matching the siblings. No `PageShell` — the global/league nav is composed at the route level later, exactly as in RosterView and FranchiseHome.

### What the user sees
- A section titled "Standings".
- A scannable, rank-ordered table: rank, franchise identity (mark + name), W-L-T record, points for, points against, and current streak — one row per franchise in the league.

### What the user can do (in this composition)
- Nothing — this is a read-only display. No sorting, no filtering, no off-screen navigation, no pressable rows.

### States
- **Populated** — the league has standings entries → render the table (the normal case; the mock has 5 entries).
- **Empty** — there are zero standings entries (e.g., preseason / `SETUP`, before any games) → in place of the table, render an empty-state line (e.g., "No standings yet") in `bodySm` / `gray-500`. The section title still renders.
- **Loading / error** — handled by the interactive screen (skeleton / retry), not exercised by this composition (it uses static mock data). Listed so the later build picks them up.

## Rules

- **Row composition (inline, no new component).** Each row is built inside `DataTable`'s `renderRow` from existing primitives — it does **not** introduce a `StandingsRow` or `Component_StandingsTable`. The header and the rows share one column-definition array so cells line up, following the RosterView discipline (where one `ColumnDef[]` feeds both `DataTable` and `PlayerRow`). Here the consumer-defined columns map to primitives per the cell map below. The eventual `Component_StandingsTable` (Structure Map, `league/components/`) is deferred to the interactive screen, where its sort / grouping / VP API can be designed against real requirements.
- **Franchise identity per row.** Each `StandingsEntry.franchiseId` is resolved via `getFranchiseById` to feed the franchise cell: a small `FranchiseMark` (franchise primary/secondary colors) followed by the franchise name. This is the flexing column.
- **Cell map (column key → primitive).**
  - `rank` → `Text` in a data type token (tabular-nums), e.g. "1".
  - `franchise` → horizontal group: `FranchiseMark` (small) + franchise name `Text` (Barlow Regular, single line, truncates). The flex column.
  - `record` → `Text`, data token, formatted `${wins}-${losses}-${ties}` (e.g. "8-2-0").
  - `pointsFor` → `Text`, data token, `toFixed(1)` (e.g. "1230.9").
  - `pointsAgainst` → `Text`, data token, `toFixed(1)`.
  - `streak` → `Text`, data token, the streak string verbatim (e.g. "W4"). Rendered neutral (`gray-900`); win/loss coloring is out of scope.
- **Column set + density for the phone frame.** At 390px wide, use `density="compact"` and this base column set:
  - `rank` (~28px), `franchise` (flex), `record` (~56px, right), `pointsFor` (~64px, right), `pointsAgainst` (~64px, right), `streak` (~40px, right).
  - `divisionRecord` exists in the data but is **held for the wide/interactive view** — it is most meaningful once rows are grouped by division, and grouping is deferred. If the six columns prove too tight at 390px, `pointsAgainst` is the column to drop first.
- **Numeric alignment.** All numeric cells (`rank`, `record`, `pointsFor`, `pointsAgainst`, `streak`) are right-aligned and use Barlow Condensed data tokens (tabular-nums baked into the theme) so columns align — consistent with how `PlayerRow` renders its numeric cells.
- **Tokens.** All colors, sizes, and fonts come from `src/theme/tokens.ts`. No hardcoded values. The section title and any empty-state copy are content strings, not style values.

### Tier variations (per Spec_Tiers.md)

- Standings is **tier-agnostic** — it shows the same columns across Redraft, Keeper, and Dynasty. There is no salary/contract/cap content on this screen, so there is no tier-gated region (unlike RosterView's salary column or FranchiseHome's cap section).
- Victory-point (VP) columns vary by league configuration, but VP is deferred to the interactive screen (see Out of scope), so no tier branch is exercised here.
- The preview therefore needs no tier toggle.

## Dependencies

- **Components:** [`DataTable`](../../foundation/components/Component_DataTable.md) (header + `renderRow` shell), [`FranchiseMark`](../../foundation/components/Component_FranchiseMark.md) (franchise identity); layout via [`Section`](../../foundation/components/Component_Section.md) / [`Stack`](../../foundation/components/Component_Stack.md). Numeric and name cells are plain `Text` styled with theme type tokens (the same approach `PlayerRow` uses for its value cells); `Mono` / `Label` / `StatValue` are available if a cleaner primitive read is wanted, but the base composition needs only `Text` + tokens.
- **Data:** `src/data/mockData.ts` — the `standings` array (`rank`, `franchiseId`, `wins`, `losses`, `ties`, `pointsFor`, `pointsAgainst`, `streak`, `divisionRecord`) drives the rows; `getFranchiseById(franchiseId)` resolves each row's franchise identity (name, colors, abbreviation) for the `FranchiseMark` + name cell.
- **Data map:** Navigation §6.2 "Standings" defines the screen's full data requirement (all `Franchise[]` with W-L-T, VP, points for/against; division and conference grouping if enabled; tiebreaker chain for tooltips; sortable by any column). This composition uses only the read-only display subset that exists in the mock data; VP, grouping, tiebreakers, and sorting are deferred (see Out of scope).
- **Tokens / patterns:** all colors, sizes, and fonts from `src/theme/tokens.ts`. No hardcoded values.

## Edge cases

- **Empty standings.** Show the empty-state line, not a bare header with no rows. (No mock franchise is needed to exercise this — it is the zero-entries case; the preview can expose it via a toggle.)
- **Long franchise names.** Truncate the franchise-name `Text` via `numberOfLines={1}`; don't widen the flex column. ("Bronxville Iron" / "Portland Rainwater" exercise realistic lengths.)
- **Ties present.** The record formatter always shows ties (`8-2-0`); the mock has all `ties: 0`, but the format must not special-case zero so a real `1` tie renders correctly.
- **Very-light / near-black franchise color.** Handled inside `FranchiseMark` (it applies a `gray-200` border on near-white marks) — nothing to do here. Santa Fe Dust (`fr-san`, near-white) and Bronxville Iron (`fr-bro`, near-black) exercise both ends.
- **Single-entry / small league.** A standings array with one row still renders header + one row; nothing assumes a minimum count.

## Out of scope

- **Sorting** — the `DataTable` header may show sort affordances, but no sort interaction is wired here. (Interactive Standings screen.)
- **Division / conference grouping** — rows render as one flat rank-ordered list; no grouped sections, no `divisionRecord` column. (Interactive Standings screen.)
- **Victory points (VP)** — no VP column; the mock data has no VP field. (Interactive Standings screen.)
- **Tiebreaker tooltips / explanations** — no tiebreaker chain display. (Interactive Standings screen.)
- **Highlighting the viewer's own franchise row** — requires "who is the viewer" context this league-wide read-only composition doesn't carry. (Interactive Standings screen.)
- **Navigation** — rows are not pressable; franchise names are not links to Franchise Overview; no cross-area jumps. Wiring comes with the real screen.
- **`StandingsRow` / `Component_StandingsTable`** — rows are composed inline; no standings row/table component is built. (Deferred to the interactive screen, per Rules.)
- **Live data, loading, and error states** — static mock data only.
- **A `PageShell` / global + league nav wrapper** — composed at the route level later, as in the sibling screens.

## Done criteria

- Renders both layout regions: the "Standings" `Section` title and the standings table (`DataTable` header + inline rows), with no franchise masthead.
- Rows render in rank order, one per franchise, each showing rank, franchise mark + name, W-L-T, PF, PA, and streak, with the header cells aligned over the row cells via one shared column definition.
- The franchise cell resolves identity through `getFranchiseById` and renders a `FranchiseMark` in the franchise's colors next to the name.
- The empty state renders the empty-state line (section title still showing) when there are zero standings entries.
- Numeric cells are right-aligned, tabular, and formatted per the cell map (record `W-L-T`, PF/PA to one decimal, streak verbatim).
- Composes existing components without modifying them; rows are built inline (no new component); all styling from tokens, zero hardcoded values.
- **Preview:** category "Screens", `phone` frame, compact density, rendering the full mock `standings` table (all five franchises, ranks 1–5, BRO → OAK → MIA → SAN → PRT). No franchise/tier select control is needed (the table is league-wide and tier-agnostic); optionally a toggle to show the empty state.
