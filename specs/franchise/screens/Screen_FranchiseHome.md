# Screen_FranchiseHome

**Status:** Draft
**Parent specs:** [Spec_Navigation.md](../../foundation/Spec_Navigation.md) §6.1 / §4.1 / §5.3, [Spec_Tiers.md](../../Spec_Tiers.md), [Spec_DesignSystem.md](../../Spec_DesignSystem.md), [Spec_XOPlay_PRD.md](../../Spec_XOPlay_PRD.md). (Eventual Level 2 parent: `Spec_FranchiseScreens.md` — not yet written.)
**Type:** Screen
**Last updated:** May 2026

---

## Purpose

A read-only composition of a franchise's "home base" — franchise masthead, this week's matchup, a salary-cap snapshot, and a recent-activity feed — assembled from already-built design-system components against mock data. This is the Batch 5 visual-lock composition for the Franchise Overview surface (the Navigation spec's default landing screen at `/:leagueSlug/my-team`). It establishes the layout and proves the components compose, ahead of the interactive Franchise Home build that adds live data, deadline awareness, and navigation. It is the second of the four Batch 5 screens, following [Screen_RosterView.md](../../roster/screens/Screen_RosterView.md).

## Behavior

### Layout regions

Single column, top to bottom:

```
┌──────────────────────────────────────────┐
│  FranchiseHeader (colored masthead)        │  ← identity, owner, record, PF/PA
├──────────────────────────────────────────┤
│  THIS WEEK                                 │  ← Section
│  ┌────────────────────────────────────┐   │
│  │ MatchupCard (this week's matchup)   │   │  ← live / final / upcoming
│  └────────────────────────────────────┘   │
├──────────────────────────────────────────┤
│  SALARY CAP                                │  ← Section (tier-gated)
│  $218.30 / $222.75  ▓▓▓▓▓▓▓▓░  Cap Room…   │  ← CapMeter, md
├──────────────────────────────────────────┤
│  RECENT ACTIVITY                           │  ← Section
│  ⇄  Trade complete — BRO sends…    3d ago  │  ← TransactionRow ×N
│  +  DE Anton Givens moved to IR…   Nov 9   │
└──────────────────────────────────────────┘
```

1. **Masthead** — `FranchiseHeader`, full-bleed, fed the franchise's name, abbreviation, colors, owner, record, and points for / against. Same call shape as RosterView.
2. **This Week** — a titled `Section` ("This Week") wrapping one `MatchupCard` for the franchise's current-week matchup. The card shows the two franchises, scores, week number, and status (live / final / upcoming).
3. **Salary Cap** — a titled `Section` ("Salary Cap") wrapping one `CapMeter` (`md`), fed the franchise's cap used and cap total. Tier-gated (see Tier variations).
4. **Recent Activity** — a titled `Section` ("Recent Activity") wrapping a short list of `TransactionRow`s for this franchise, newest first.

The masthead is full-bleed; regions 2–4 sit in a `spacing.lg` horizontal gutter with `spacing.lg` vertical rhythm between them. No `PageShell` — the global/league nav is composed at the route level later, exactly as in RosterView.

### What the user sees
- The franchise masthead in the franchise's colors, with record and points for / against.
- This week's matchup as a single card — live styling when the game is in progress, otherwise the projected/final treatment.
- A cap usage bar with dollar labels and cap-room text (cap tiers only).
- A scannable list of the franchise's most recent transactions with relative timestamps.

### What the user can do (in this composition)
- Nothing — this is a read-only display. No editing, no actions, no off-screen navigation, no pressable matchup.

### States
- **Populated** — the franchise has a matchup and transactions → all four regions render.
- **No matchup** — the franchise is in no current matchup → in place of the card, the This Week section renders an empty-state line (e.g., "No matchup this week") in `bodySm` / `gray-500`. The section title still renders.
- **No recent activity** — the franchise has zero transactions → the Recent Activity section renders an empty-state line (e.g., "No recent activity") in `bodySm` / `gray-500`. The section title still renders.
- **Loading / error** — handled by the interactive screen (skeleton / retry), not exercised by this composition (it uses static mock data). Listed so the later build picks them up.

## Rules

- **Current matchup lookup.** The franchise's matchup is found in-screen from `matchups`: the first matchup where `homeFranchiseId === franchiseId` or `awayFranchiseId === franchiseId`. Both sides' `Franchise` records are resolved (via `getFranchiseById`) to feed `MatchupCard`'s `homeTeam` / `awayTeam`.
- **Status mapping.** Mock `MatchupStatus` maps to `MatchupCard`'s status prop: `IN_PROGRESS` → `live`, `COMPLETED` → `final`, `SCHEDULED` → `upcoming`. (`isLive` on the matchup and `IN_PROGRESS` agree in the mock data; the mapping uses `status`.) `VOIDED` is treated as `final` for display.
- **Matchup sides.** `MatchupCard` renders away-left / home-right as built — it is **not** re-oriented to put the viewed franchise on a fixed side. The screen passes `homeTeam` / `awayTeam` straight from the matchup record.
- **Transaction feed.** Rows are `transactions` filtered to `franchiseId`, rendered newest-first by `timestamp`. The franchise color dot is **omitted** (`franchise` prop not passed) because every row belongs to the viewed franchise, so the dot carries no signal here.
- **Empty states.** A missing matchup and an empty transaction list each render their own empty-state line in place of their content; the section title renders in both cases.
- **Tokens.** All colors, sizes, and fonts come from `src/theme/tokens.ts`. No hardcoded values. Section titles and the tier label are content strings, not style values.

### Tier variations (per Spec_Tiers.md)
- **Salary Cap region** renders only when the league tracks salaries (Dynasty always; Keeper if `trackSalaries`); hidden in Redraft. This mirrors RosterView's salary-column rule.
- The masthead `tierLabel` reflects the league configuration (the preview uses the Dynasty string, as RosterView does).
- The preview demonstrates the **Dynasty** case (cap region present).

## Dependencies

- **Components:** [`FranchiseHeader`](../../foundation/components/Component_FranchiseHeader.md), [`MatchupCard`](../../foundation/components/Component_MatchupCard.md) (which composes [`ScoreDisplay`](../../foundation/components/Component_ScoreDisplay.md) / [`Card`](../../foundation/components/Component_Card.md)), [`CapMeter`](../../foundation/components/Component_CapMeter.md), [`TransactionRow`](../../foundation/components/Component_TransactionRow.md); layout via [`Section`](../../foundation/components/Component_Section.md) / [`Stack`](../../foundation/components/Component_Stack.md).
- **Data:** `src/data/mockData.ts` — `getFranchiseById(franchiseId)` for the masthead and matchup sides, `matchups` for the current matchup, `transactions` for the feed. Franchise `capUsed` / `capTotal` drive the cap meter; `pointsFor` / `pointsAgainst` drive the masthead stats.
- **Data map:** Navigation §6.1 "Franchise Overview" defines the screen's full data requirement (Franchise, RosterEntry + Player join, Contract, current Matchup, last-10 Transactions, standings position, next CalendarEvent). This composition uses only the read-only display subset that has built components; standings position and calendar/deadline awareness are deferred (see Out of scope).
- **Tokens / patterns:** all colors, sizes, and fonts from `src/theme/tokens.ts`. No hardcoded values.

## Edge cases

- **No matchup for the franchise.** Show the This Week empty-state line, not a bare section with no card. (Demonstrated by `fr-san`, which is in no mock matchup.)
- **No transactions for the franchise.** Show the Recent Activity empty-state line. (Demonstrated by `fr-mia`, which has no mock transactions.)
- **Over-cap franchise.** Handled inside `CapMeter` (it switches to the error fill and "Over Cap" room text). `fr-mia` is over cap (227.20 / 222.75) and exercises this if its cap region is viewed.
- **Long transaction descriptions.** Truncate via `TransactionRow`'s existing `numberOfLines={1}`; don't widen anything.
- **Very-light / near-black franchise color.** Handled inside `FranchiseHeader` (border on near-white, `onColor` text on dark) — nothing to do here.
- **Live matchup.** `MatchupCard` applies its own live treatment when status is `live`; nothing to do here beyond passing the mapped status.

## Out of scope

- Any action or mutation — set lineup, propose trade, manage IR, edit franchise. Those belong to the interactive screens (`Screen_RosterEdit`, the Trade screens, `Screen_FranchiseSettings`).
- Navigation — the matchup card is not pressable, player/franchise names are not links, and there are no cross-area jumps. Wiring comes with the real screen.
- **Standings position detail** beyond the record already in the masthead — no `StandingsTable` / standings summary component is built yet (Level 3, unbuilt).
- **Next calendar event / deadline awareness** — no `EventCard` / calendar component is built yet (Level 3, unbuilt).
- Roster table, contract detail, future picks — those live on their own screens (`Screen_RosterView`, Contract Report, Future Picks).
- Configurable home-page modules (PRD §15.5) — this is the franchise home, not the League Home module grid; module configuration is out of scope.
- Live data, loading, and error states — static mock data only.

## Done criteria

- Renders all four layout regions: `FranchiseHeader` masthead, the This Week `MatchupCard`, the tier-gated Salary Cap `CapMeter`, and the Recent Activity `TransactionRow` list.
- The matchup card shows the franchise's current-week matchup with the correct status treatment (live / final / upcoming) derived from the matchup record.
- A franchise with no matchup renders the This Week empty-state line; a franchise with no transactions renders the Recent Activity empty-state line; both section titles still render.
- The cap region is present in the Dynasty preview and would be hidden in Redraft (tier rule documented above).
- Composes existing components without modifying them; all styling from tokens, zero hardcoded values.
- **Preview:** category "Screens", `phone` frame, default franchise `fr-bro` (Bronxville Iron — a live matchup vs OAK, two transactions, and a near-cap meter). A franchise select control includes `fr-san` (no-matchup empty state) and `fr-mia` (no-transactions empty state, also over-cap), plus `fr-oak` and `fr-prt`. The screen is keyed on `franchiseId` so switching franchises remounts it cleanly.
