# XO Play — Backlog

Open work tracked for the dashboard. Source of truth for spec completion is `BUILD_STATUS.md`.

---

## Up Next

- 🔲 Write the one-page placeholder render convention (so screen builds stop making per-screen design micro-decisions) [ui] [docs]
- 🔲 Stamp screens area by area off Navigation §6 — start with Franchise + League (unlocked by the foundation fixture), reviewed on data-completeness [ui]
- 🔲 Extend the fixture per area (transactions / draft / auction / social / accounting / playoffs / notifications / audit) as each area's screens are built [data]
- 🔲 AddDrop + remaining transaction screens — now built as part of the Transactions area, not a standalone "Batch 5" screen [ui]

## Patterns / Tech Debt

- 🔲 Apply the config-driven column pattern (one config + one shared layout fn for header & rows) to RosterView and future tables [ui]
- 🔲 `computeStandings` should read `League.standingsTiebreakerChain` instead of a hardcoded sort order — fold into the real standings logic [data]
- 🔲 `computeCapUsage` sums contracts only until `SalaryAdjustment` is added to the fixture [data]

## Specs — Phase 3 (Surfaces)

- 🔲 `franchise/Spec_FranchiseScreens.md` [spec]
- 🔲 `league/Spec_LeagueScreens.md` [spec]
- 🔲 `commissioner/Spec_CommissionerTools.md` [spec]

## Specs — Phase 4 (Supporting Systems)

- 🔲 `live-scoring/Spec_LiveScoring.md` [spec]
- 🔲 `social/Spec_SocialAndCommunication.md` [spec]
- 🔲 `accounting/Spec_Accounting.md` [spec]
- 🔲 `playoffs/Spec_Playoffs.md` [spec]

## Specs — Phase 5 (v2 Prep)

- 🔲 `narrative/Spec_NarrativeReadiness.md` [spec]
- 🔲 `narrative/Spec_NarrativeLayer.md` [spec]

## Data Model — Pending Updates

- 🔲 Add `CLOSED_AWARD_FAILED` to `AuctionPlayerState.status` enum (Auction spec §5.32) [data] [spec]
- 🔲 Add `DRAFT` / `SUBMITTED` states to LineupEntry (Roster Management OQ2) [data] [spec]

## Navigation — Open Questions

- 🔲 OQ1 — Player Profile URL placement [spec]
- 🔲 OQ2 — Accounting screen placement (deferred until Accounting spec exists) [spec]
- 🔲 OQ3 — Notification center: panel vs. screen [spec]
- 🔲 OQ4 — Keeper selection screen placement [spec]

## Infrastructure

- 🔲 Create XO Play Supabase project — blocks Stats Service Consumer Phase 1 [infra] [blocked]
- 🔲 Build Player + Stats tables with Data Model v0.2 schema (no migration; new project) [data] [infra]
- 🔲 Implement Stats Service Consumer 4-phase build sequence once DB exists [data] [infra]
- 🔲 Wire screens to real Supabase data once tables exist (mechanical swap — fixture already matches the schema) [data] [infra]

## Documentation

- 🔲 Move `Spec_DataModel.md` / `Spec_Tiers.md` / `Spec_DesignSystem.md` into `specs/foundation/` per Structure Map [docs]

---

## Done

- ✅ Config-driven Standings columns — header/row alignment + full franchise names [ui] [fix]
- ✅ Rewire PlayerRow (RosterRow view model) + RosterView / FranchiseHome / Standings to the normalized fixture; delete mockData shim [data] [ui]
- ✅ Normalized schema-shaped data fixture + derived helpers (`src/data/` module) [data]
- ✅ `foundation/Spec_MockFixture.md` — normalized-fixture buildable unit [spec]
- ✅ Build Standings — third composition screen [ui]
- ✅ `league/screens/Screen_Standings.md` — third Batch 5 screen spec [spec]
- ✅ Build RosterView + FranchiseHome screen compositions [ui]
- ✅ `roster/screens/Screen_RosterView.md` + `franchise/screens/Screen_FranchiseHome.md` [spec]
- ✅ Build CapMeter component [ui]
- ✅ Build TransactionRow component [ui]
- ✅ Sub-component — FranchiseHeader [ui]
- ✅ Component Batch 4 — ScoreNum / ScoreDisplay / MatchupCard [ui]
- ✅ Component Batch 3 — Card / Section / Stack / PageShell (+ GlobalNav / LeagueNav stubs) [ui]
- ✅ `foundation/Spec_Navigation.md` — 4-layer nav, ~80 routes, per-screen data map [spec]
- ✅ `foundation/Spec_StatsServiceConsumer.md` — 7 event subscriptions, ID mapping, 4-phase build [spec]
- ✅ `roster/Spec_RosterManagement.md` — 9-check lineup validation, IR/taxi, 12 edge cases [spec]
- ✅ `auction/Spec_Auction.md` — proxy bidding, available funds, nomination slots, 12 edge cases [spec]
- ✅ `draft/Spec_Draft.md` — live + email modes, 4 order types, timer engine, 10 edge cases [spec]
- ✅ `transactions/Spec_Transactions.md` — 14-check pipeline, trade state machine, 12 edge cases [spec]
- ✅ `calendar/Spec_CalendarAndLifecycle.md` — event engine, season state machine, NFL schedule sync [spec]
- ✅ `salary-cap/Spec_SalaryCapAndContracts.md` — cap math, franchise tags, rookie scale, rollover [spec]
- ✅ `scoring/Spec_ScoringEngine.md` — rule evaluation, 7 presets, Best Ball, edge cases [spec]
- ✅ `Spec_DesignSystem.md` — structural spec (principles, tokens, 80+ components) [spec]
- ✅ `Spec_Tiers.md` — 3 tiers × 10 behavioral dimensions [spec]
- ✅ `Spec_DataModel.md` v0.2 — 45 entities, 58 enums [spec]
- ✅ `Spec_XOPlay_MFL_Gap_Analysis.md` — competitive teardown + P0 backlog [spec]
- ✅ `Spec_XOPlay_PRD.md` — 26-section master product architecture [spec]
- ✅ Expo scaffold + fonts + tokens (Step 1) [infra]
- ✅ Component preview system (Step 2) [infra]
- ✅ Component Batch 1 — Label / Mono / PositionBadge / InjuryIndicator / Headshot / FranchiseMark / LiveDot / StatValue [ui]
- ✅ Component Batch 2 — SegmentControl / PlayerRow / DataTable [ui]
