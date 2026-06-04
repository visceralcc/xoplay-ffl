# Screen_Matchup

**Status:** Draft
**Parent specs:** [Spec_Navigation.md](../../foundation/Spec_Navigation.md) §6.1 ("Current Matchup") / §4.1 / §5.3 / §3.2, [Spec_PlaceholderRenderConvention.md](../../foundation/Spec_PlaceholderRenderConvention.md), [Spec_ScoringEngine.md](../../scoring/Spec_ScoringEngine.md), [Spec_RosterManagement.md](../../roster/Spec_RosterManagement.md) §3 (lineup / starters), [Spec_Tiers.md](../../Spec_Tiers.md), [Spec_DesignSystem.md](../../Spec_DesignSystem.md), [Spec_MockFixture.md](../../foundation/Spec_MockFixture.md). (Eventual Level 2 parent: `Spec_FranchiseScreens.md` — not yet written.)
**Type:** Screen
**Last updated:** June 2026

---

## Purpose

A read-only composition of one week's head-to-head matchup — a summary banner over the two competing franchises' starting lineups with per-player points and matchup totals — assembled from already-built design-system components against the normalized mock fixture. This is the placeholder stamp for the Navigation spec's "Current Matchup" screen (`/:leagueSlug/my-team/matchup`, and the read-only `/franchise/:slug/matchup` variant). It makes the fixture's `LineupEntry` + `Stats` data legible as a head-to-head, establishes the layout, and proves the two-lineup composition, ahead of the interactive build that adds slot-by-slot comparison, per-rule scoring breakdowns, live auto-updating scores, and win probability. It is the natural Franchise-area companion to the built [Screen_FranchiseHome.md](./Screen_FranchiseHome.md) (Overview) and [Screen_RosterView.md](../../roster/screens/Screen_RosterView.md) (Roster), and the eventual destination of the "View Matchup" / "Set Lineup → then view" flows.

## Behavior

### Layout regions

Single column, mobile stack first, top to bottom:

```
┌──────────────────────────────────────────┐
│  ┌────────────────────────────────────┐  │
│  │ ▣ Away Franchise   118.4  •  102.7 ▣ │  │  ← MatchupCard (head-to-head summary,
│  │   away-left / home-right · status    │  │     status-aware; LiveDot if IN_PROGRESS)
│  └────────────────────────────────────┘  │
│                                            │
│  AWAY FRANCHISE NAME                        │  ← Section title (away side)
│  ┌────────────────────────────────────┐   │
│  │ Player              Pos  NFL    Pts  │  │  ← DataTable header
│  │ ──────────────────────────────────  │  │
│  │ J. Allen            QB   BUF   26.1  │  │  ← starter row ×N (PlayerRow)
│  │ …                                    │  │
│  └────────────────────────────────────┘   │
│                                            │
│  HOME FRANCHISE NAME                        │  ← Section title (home side)
│  ┌────────────────────────────────────┐   │
│  │ Player              Pos  NFL    Pts  │  │  ← DataTable header
│  │ …                                    │  │  ← starter row ×N (PlayerRow)
│  └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

1. **Matchup summary** — a single `MatchupCard` (the same component League Home composes for each current-week game): away-left / home-right, each side's `FranchiseMark` + name, each side's total, and a status treatment (`LiveDot` + live totals when the matchup is `IN_PROGRESS`; final totals when `COMPLETED`; projected/`—` placeholder when `SCHEDULED`). This is the head-to-head anchor and the screen's lead element — there is **no `FranchiseHeader` masthead**, because a matchup is a two-franchise surface, not a single-franchise identity surface.
2. **Away lineup section** — a `Section` titled with the away franchise name, wrapping a `DataTable` of that franchise's **starters** for this matchup (header + rows from one shared column definition, exactly as RosterView / Standings do).
3. **Home lineup section** — the same `Section` + `DataTable` for the home franchise's starters.

When a viewer franchise is set and matches one side, that side's `Section` title carries a subtle viewer indicator (a small label — not a heavy treatment), mirroring how League Home tints the viewer's standings row. The section **order stays away-then-home** so it always agrees with the `MatchupCard`'s away-left / home-right reading; the screen does not reorder to put the viewer first.

The sections sit in a `spacing.lg` horizontal gutter with `spacing.lg` vertical rhythm, matching the built screens. No `PageShell` — global/league nav is composed at the route level later, as in every other placeholder screen.

### What the user sees
- A head-to-head summary card: both franchises (mark + name), both totals, and matchup status.
- Two labeled lineup tables — away then home — each listing that franchise's starters with position, NFL team, injury indicator, and this matchup's fantasy points; the viewer's own side is subtly marked.

### What the user can do (in this composition)
- Nothing required — this is a read-only display. **Optional, stubbed:** when the viewer is the owner of one side and a `onSetLineup` callback is supplied, a single "Set Lineup" affordance renders on the viewer's lineup section (hidden otherwise). Until the route shell exists callers leave it `undefined`, so the affordance renders but the press is a no-op (noted in `BUILD_STATUS.md`). No other navigation, sorting, or row expansion.

### States
- **Populated** — a matchup exists for the resolved franchise × week, with both lineups set → render the summary card and both lineup tables (the normal case; the fixture's current week, week 11, is live with both lineups generated).
- **No matchup** — the franchise has no matchup this week (bye, or `OFFSEASON` / `SCHEDULED`-only with nothing to show) → in place of the body, render a single empty-state line ("No matchup this week") in `bodySm` / `gray-500`. Nav §11.3 ("No active matchups" in offseason) is the same case.
- **One side has no starters set** — that side's `DataTable` is replaced by an empty-state line ("No starters set") inside its section; the other side and the summary card still render.
- **Loading / error** — handled by the interactive screen (skeleton / retry); not exercised here (static fixture). Listed so the later build picks them up.

## Rules

- **Compose only; no new component.** The screen is assembled from `MatchupCard`, `Section`, `DataTable`, and `PlayerRow` exactly as they exist — none are modified, and no paired/comparison-row component is introduced (see Out of scope). The slot-by-slot head-to-head layout that *would* need a new component is explicitly deferred.
- **Resolve the matchup, then the two lineups.** Resolve the current-week `Matchup` for the franchise from the `matchups` fixture (filter by current week and the franchise on either the home or away side), the same access pattern Franchise Home's "This Week" and League Home's matchups already use. The two competing franchises are `Matchup.awayFranchiseId` / `homeFranchiseId`, each resolved through `getFranchiseById` for the section title and the `MatchupCard` identity.
- **Starters come from the joined lineup view.** Each side's starter list comes from `getLineupForMatchup` (the joined view: player identity + `slotPosition` + `isStarter` + `fantasyPoints`), filtered to `isStarter === true`. Per-player points render from the lineup entry's `fantasyPoints` (a real stored field the scoring engine writes — not a hand-typed derived value); do **not** recompute per-player points inline on this screen.
- **Totals come from the stored matchup scores.** The `MatchupCard` totals are `Matchup.homeScore` / `Matchup.awayScore` (stored fields in the fixture). This screen does not sum the lineup itself for the headline total — it shows the matchup's stored score, consistent with how scores are persisted.
- **Cell map (lineup table column key → primitive).**
  - `player` → `PlayerRow` identity cell: name + `PositionBadge` + NFL team + `InjuryIndicator` (the flex column; reuses PlayerRow's existing identity rendering and `cellStyle`). Headshot dropped on the phone frame, as RosterView does.
  - `points` → `Text` in a data type token (Barlow Condensed, tabular-nums), `toFixed(1)` (e.g. "26.1"), right-aligned.
- **Column set + density for the phone frame.** At 390px wide, use `density="compact"` and a deliberately slim set — `player` (flex) and `points` (~56px, right). Position, NFL team, and injury live **inside** the `PlayerRow` identity cell (as on RosterView), not as separate columns, so the table stays readable on a phone. The richer column set (slot label, projected, opponent-relative deltas) is held for the wide/interactive view.
- **Numeric alignment.** The `points` cell is right-aligned and uses the Barlow Condensed data token (tabular-nums baked into the theme) so the column aligns down each side, consistent with `PlayerRow` and Standings.
- **Tokens.** All colors, sizes, and fonts come from `src/theme/tokens.ts`; `onColor()` for any text over a franchise color inside `MatchupCard` (the component already handles this). No hardcoded values. Section titles and empty-state copy are content strings, not style values.

### Tier variations (per Spec_Tiers.md)

- Current Matchup is **tier-agnostic** — points are points across Redraft, Keeper, and Dynasty. There is no salary / contract / cap content on this screen, so there is **no tier-gated region** (unlike RosterView's salary column or Franchise Home's cap section), and the preview needs no tier toggle.
- Best Ball: the screen still renders — Best Ball produces `LineupEntry` starters retroactively (per [Spec_RosterManagement.md](../../roster/Spec_RosterManagement.md) E12), so the same starter-list composition applies. The only difference is upstream (how starters are chosen), not in this view.

## Dependencies

- **Components:** [`MatchupCard`](../../foundation/components/Component_MatchupCard.md) (head-to-head summary, as composed in League Home), [`DataTable`](../../foundation/components/Component_DataTable.md) (header + `renderRow` shell), [`PlayerRow`](../../foundation/components/Component_PlayerRow.md) (starter identity cell + shared `cellStyle`), [`FranchiseMark`](../../foundation/components/Component_FranchiseMark.md) (inside `MatchupCard`); layout via [`Section`](../../foundation/components/Component_Section.md) / [`Stack`](../../foundation/components/Component_Stack.md). The `points` cell is plain `Text` styled with theme data tokens (PlayerRow's approach for value cells); `Mono` / `Label` / `LiveDot` / `PositionBadge` / `InjuryIndicator` are available where the composed components surface them.
- **Data (fixture + helpers):** the `matchups` collection (resolve the franchise's current-week `Matchup`; `homeFranchiseId` / `awayFranchiseId` / `homeScore` / `awayScore` / `week` / `status`); `getFranchiseById` for each side's identity; `getLineupForMatchup` for each side's joined starter list (`player`, `slotPosition`, `isStarter`, `fantasyPoints`).
- **Data map:** Navigation §6.1 "Current Matchup" defines the full data requirement (current-week `Matchup`; both franchises' `LineupEntry` with `Player` and per-player scores; `ScoringRule[]` for breakdown; derived matchup totals; win probability). This composition uses the read-only display subset the fixture provides; per-rule scoring breakdown and win probability are deferred (see Out of scope).
- **Tokens / patterns:** all colors, sizes, and fonts from `src/theme/tokens.ts`. No hardcoded values. Follows [Spec_PlaceholderRenderConvention.md](../../foundation/Spec_PlaceholderRenderConvention.md) (chrome-less, compose-don't-style, `DataTable` for tables, §5 empty/missing handling, §6 stubbed actions).

## Edge cases

- **No matchup this week.** Show the empty-state line ("No matchup this week"), not an empty card. Covers bye weeks, `OFFSEASON`, and the resolve-miss case. The preview exposes this via a toggle.
- **One side has not set a lineup.** That side's table is replaced by "No starters set"; the summary card and the other side still render. (A franchise with zero generated starters for the week exercises this.)
- **Live / partial scores.** When `status === IN_PROGRESS`, totals are partial and the `MatchupCard` shows the `LiveDot`; per-player `fantasyPoints` may be partial too. Render values as-is (no "final" framing). Week 11 in the fixture is live and exercises this.
- **Scheduled / future matchup with no scores.** When `status === SCHEDULED` and `homeScore` / `awayScore` are null, the `MatchupCard` shows projected/`—` per its own rules; the lineup tables still list starters if set. No projections exist in the fixture, so the headline shows `—`, not a fabricated projection.
- **Long franchise names.** Truncate to a single line in the `Section` title and inside `MatchupCard`; don't widen the flex column. The themed franchises (e.g. "Portland Rainwater", "Bronxville Iron") exercise realistic lengths.
- **Missing per-player points.** A starter whose `fantasyPoints` is null (no stat line yet this week) renders `—` per the render-convention §5.3 missing-field rule (checked as `=== null`, not falsy, so a real `0.0` shows as "0.0").
- **Tie / equal totals.** Equal `homeScore` / `awayScore` render without a special winner treatment; winner/leader styling is out of scope here.

## Out of scope

- **Slot-by-slot head-to-head comparison** — the paired layout (away player / slot label / home player on one aligned row) is deferred; it would require a new comparison-row component, which placeholder mode does not introduce. Here the two lineups render as separate stacked tables.
- **Per-scoring-rule breakdown** — no expandable per-player detail showing which `ScoringRule`s contributed which points. (Interactive screen.)
- **Win probability** — no win-probability bar or number; no model exists in the fixture. (Phase 4 — live scoring.)
- **Live auto-updating scores** — values are read once from the static fixture; no websocket/polling refresh. (Graduated screen, post-Supabase / Stats Service Consumer.)
- **Bench / IR / taxi display** — only starters (`isStarter === true`) are listed; non-starters are not shown. (A bench sub-section can be added with the interactive screen.)
- **Historical-week navigation** — current week only; no week selector and no `:weekNumber` routing exercised. The resolve-the-matchup logic is written so a week parameter can drive it later, but the placeholder shows the current week.
- **Sorting / pressable rows / cross-links** — lineup rows are not sortable or pressable; player names do not link to Player Profile and franchise names do not link to Franchise Overview. (Wiring comes with the real screen.)
- **Loading / error states** — static fixture only.
- **A `PageShell` / global + league nav wrapper** — composed at the route level later, as in the sibling screens.

## Done criteria

- Renders all three regions: the `MatchupCard` summary, the away lineup `Section` + table, and the home lineup `Section` + table — with no franchise masthead.
- The summary card shows both franchises (mark + name), both stored totals, and a status-aware treatment (`LiveDot` + live totals when `IN_PROGRESS`).
- Each lineup table lists that franchise's **starters only**, sourced through `getLineupForMatchup`, each row showing the `PlayerRow` identity cell (name, position, NFL team, injury) and the week's `fantasyPoints`, with header cells aligned over row cells via one shared column definition.
- The away/home `Section` order matches the `MatchupCard`'s away-left / home-right reading; when a viewer franchise is set and matches one side, that section is subtly marked (and, if `onSetLineup` is provided, shows the stubbed "Set Lineup" affordance).
- The empty state renders "No matchup this week" when no matchup resolves; a side with no starters renders "No starters set" in place of its table.
- Per-player points are right-aligned, tabular, `toFixed(1)`; null points render `—` (not "0.0"); a real `0.0` renders "0.0".
- Composes existing components without modifying them; no new component is introduced; all styling from tokens, zero hardcoded values.
- **Preview:** category "Screens", `phone` frame, compact density, rendering the current-week (week 11) matchup for a selected franchise, with a `neutral` toggle that clears the viewer franchise (matching League Home's preview pattern) and an optional toggle to show the "No matchup" empty state. No tier select control is needed (the screen is tier-agnostic).
