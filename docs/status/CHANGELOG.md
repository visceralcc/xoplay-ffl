# XO Play — Changelog

All notable changes, logged per session. Tags: `[ui]` `[data]` `[infra]` `[spec]` `[fix]` `[docs]`

---

## 2026-05-31

- [docs] Updated `BUILD_STATUS` / `BACKLOG` / `CHANGELOG` / `Structure_Map` / `Component_PlayerRow` / `DESIGN` to reflect the approach pivot and the fixture + Standings work
- [fix] `Standings` columns are now config-driven — header and rows render from one `STANDINGS_COLUMNS` array through one shared `cellStyle`, so headers can no longer drift out of alignment; tightened numeric widths + a Barlow Condensed name token so all eight franchise names show in full; widths/align/gap tunable in one commented config block (07aaa78)
- [data] [ui] Rewired `PlayerRow` (now takes a `RosterRow` view model) plus `RosterView` / `FranchiseHome` / `Standings` to read the normalized fixture through helpers; deleted the `mockData.ts` compat shim (5009dbc)
- [data] Replaced the flat `mockData.ts` with a normalized, schema-shaped fixture mirroring `Spec_DataModel.md` — new `src/data/` module (types, seeded rng, 13 entity fixtures, derived helpers, barrel). Singletons hand-authored, high-volume entities generated; derived values (record, PF/PA, cap usage, standings + victory points, streak) are computed by pure helpers, never stored on base entities (ee8cc87)
- [spec] Wrote `foundation/Spec_MockFixture.md` — the normalized-fixture buildable unit (shape rules, foundation-batch entities, derived helpers, rewire scope)
- [docs] Approach pivot — coverage over polish: placeholder UI + schema-complete data, screens stamped area by area off Navigation §6; "match the real data shape now" so the Supabase swap is mechanical
- [ui] Built `Standings` — third composition screen (new `specs/league/screens/`). League-scoped read-only standings: a titled `Section` (no masthead) over a rank-ordered table; rank, franchise mark + name, W-L-T, PF, PA, streak, with victory points / streak / division records from computed helpers; inline rows from primitives (no StandingsRow); empty state
- [spec] Wrote `league/screens/Screen_Standings.md` — third Batch 5 screen; inline-from-primitives rows, 6-column phone set, empty state, deferring sort / grouping / VP / tooltips to the interactive screen
- [ui] Built `FranchiseHome` — second Batch 5 screen composition. Read-only franchise home composing a `FranchiseHeader` masthead, a "This Week" `MatchupCard` (status mapped from the matchup record — `IN_PROGRESS`→live / `COMPLETED`→final / `SCHEDULED`→upcoming / `VOIDED`→final — and not pressable), a tier-gated "Salary Cap" `CapMeter` (`md`), and a "Recent Activity" `TransactionRow` feed filtered to the franchise, newest-first, with the franchise color dot omitted. No-matchup and no-transactions empty states each render a `bodySm`/`gray-500` line while the section title still shows. Composes existing components unmodified; tokens-only, no PageShell. Preview entry under "Screens" — phone frame, default `fr-bro`, franchise select with `fr-san` (no-matchup) and `fr-mia` (no-transactions, over-cap) for the empty-state demos
- [ui] Built `RosterView` — first Batch 5 screen composition (new `src/screens/`). Read-only roster surface composing `FranchiseHeader` masthead, an Active/IR/Taxi `SegmentControl` with per-bucket counts, and a compact roster table (`DataTable` header + `PlayerRow` body sharing one `ColumnDef[]`) filtered to the selected bucket; empty buckets render a `bodySm`/`gray-500` empty-state line. Dynasty column set (position, headshot, nameTeam, injury, salary, seasonTotal). Composes existing components unmodified. Preview entry under a new "Screens" category — phone frame, default `fr-prt`, franchise select including `fr-mia` for the empty-state demo

## 2026-05-30

- [ui] Built `CapMeter` — salary cap usage bar with healthy / warning / over-cap states, optional labels + room text, and a bar-only `sm` variant; preview entry under a new "Cap" category with state/size controls and a full-state stack
- [ui] Built `TransactionRow` — compact feed item with type icon, optional franchise color dot, truncating description, and relative-time timestamp via `Mono`; preview entry stacks the five mockData transactions (the last two Batch 5 sub-component prerequisites — both now ✅)
- [ui] Added three synthetic preview-only rows to the TransactionRow preview (30m/6h/3d ago) so the relative-time branches show alongside the Nov short-date rows; `mockData.ts` untouched
- [docs] Synced `BUILD_STATUS.md` to actual repo state (Batches 1–4 + FranchiseHeader complete; CapMeter / TransactionRow specced-not-built)
- [docs] Added a `## Next Steps` section to `BUILD_STATUS.md` so the Command Center surfaces XO Play's next steps
- [docs] Reconciled `BACKLOG.md` — corrected "Up Next," moved finished batches to "Done"
- [docs] Added `CHANGELOG.md` per the project-setup convention
- [docs] Consolidated docs to the project-setup structure: moved planning docs into `docs/process/` (parent links fixed), added root `CLAUDE.md`, added `docs/design/DESIGN.md`; retired the legacy `documents/` folder (pending manual delete)
