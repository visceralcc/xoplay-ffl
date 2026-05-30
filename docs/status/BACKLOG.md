# XO Play — Backlog

Open work tracked for the dashboard. Source of truth for spec completion is `BUILD_STATUS.md`.

---

## Up Next

- 🔲 Write Batch 5 screen specs — RosterView / FranchiseHome / Standings / AddDrop [ui] [spec]
- 🔲 Build Batch 5 screen compositions in preview [ui]

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

## Documentation

- 🔲 Move `Spec_DataModel.md` / `Spec_Tiers.md` / `Spec_DesignSystem.md` into `specs/foundation/` per Structure Map [docs]

---

## Done

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
- ✅ Mock data (Step 3) [infra]
- ✅ Component Batch 1 — Label / Mono / PositionBadge / InjuryIndicator / Headshot / FranchiseMark / LiveDot / StatValue [ui]
- ✅ Component Batch 2 — SegmentControl / PlayerRow / DataTable [ui]
