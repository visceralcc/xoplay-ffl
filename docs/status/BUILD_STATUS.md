# XO Play — Build Status

**Feature map and completion tracker. Surfaced in Command Center.**

Last updated: 2026-05-26

| System | Status |
|---|---|
| PRD (`Spec_XOPlay_PRD.md`) | ✅ Complete (Level 1, 26 sections) |
| MFL Gap Analysis (`Spec_XOPlay_MFL_Gap_Analysis.md`) | ✅ Complete (Level 1, competitive teardown + P0 backlog) |
| Data Model (`Spec_DataModel.md`) | ✅ Complete (v0.2 — 45 entities, 58 enums) |
| Tiers (`Spec_Tiers.md`) | ✅ Complete (3 tiers × 10 behavioral dimensions) |
| Design System — structural (`Spec_DesignSystem.md`) | ✅ Complete (principles, tokens, 80+ components, responsive framework, franchise theming) |
| Scoring Engine (`Spec_ScoringEngine.md`) | ✅ Complete (rule evaluation, 7 presets, Best Ball, edge cases) |
| Salary Cap & Contracts (`Spec_SalaryCapAndContracts.md`) | ✅ Complete (cap math, drop penalties, franchise tags, rookie scale, rollover) |
| Calendar & Lifecycle (`Spec_CalendarAndLifecycle.md`) | ✅ Complete (event engine, season state machine, NFL schedule sync) |
| Transactions (`Spec_Transactions.md`) | ✅ Complete (14-check pipeline, FCFS, blind bid, trade state machine, 12 edge cases) |
| Draft (`Spec_Draft.md`) | ✅ Complete (live + email, 4 order types, timer engine, auto-pick, 10 edge cases) |
| Auction (`Spec_Auction.md`) | ✅ Complete (proxy bidding, available funds, nomination slots, 12 edge cases) |
| Roster Management (`Spec_RosterManagement.md`) | ✅ Complete (9-check lineup validation, IR/taxi, atomic swaps, 12 edge cases) |
| Stats Service Consumer (`foundation/Spec_StatsServiceConsumer.md`) | ✅ Complete (7 event subscriptions, ID mapping, 4-phase build sequence) |
| Navigation (`foundation/Spec_Navigation.md`) | ✅ Complete (4-layer nav, ~80 routes, per-screen data map, role visibility) |
| Templates (`Templates_SpecDocs.md`) | ✅ Complete |
| Structure Map (`documents/Structure_Map.md`) | ✅ Complete |
| Expo scaffold + fonts + tokens (Step 1) | ✅ Complete |
| Component preview system (Step 2) | ✅ Complete |
| Mock data (Step 3) | ✅ Complete |
| Component Batch 1 — Label / Mono / PositionBadge / InjuryIndicator / Headshot / FranchiseMark / LiveDot / StatValue | ✅ Complete |
| Component Batch 2 — SegmentControl / PlayerRow / DataTable | ✅ Complete |
| Component Batch 3 — Layout containers (Card / Section / Stack / PageShell) | 🔲 In progress (Card spec written; Section/Stack/PageShell specs needed) |
| Component Batch 4 — Scoring & matchup (ScoreDisplay / ScoreNum / MatchupCard / CapMeter / TransactionRow / ScoreNum / FranchiseHeader) | 🔲 Not started (specs needed first) |
| Component Batch 5 — Screen compositions | 🔲 Not started (specs needed first) |
| Franchise Screens spec (`franchise/Spec_FranchiseScreens.md`) | 🔲 Not started |
| League Screens spec (`league/Spec_LeagueScreens.md`) | 🔲 Not started |
| Commissioner Tools spec (`commissioner/Spec_CommissionerTools.md`) | 🔲 Not started |
| Live Scoring spec (`live-scoring/Spec_LiveScoring.md`) | 🔲 Not started |
| Social + Communication spec | 🔲 Not started |
| Accounting spec | 🔲 Not started |
| Playoffs spec | 🔲 Not started |
| Narrative readiness / engine specs (v2) | 🔲 Not started |
| Supabase project + DB tables for XO Play | 🔲 Not started (blocks Stats Service consumer build) |

## Sprint 05.26.26 — Dashboard status files

Set up `docs/status/BUILD_STATUS.md` and `BACKLOG.md` for the Command Center dashboard. The original spec-tracking file at `documents/BUILD_STATUS.md` stays as the authoritative source of decision history; this file is the at-a-glance system view.

- Captured all 14 Level-2 specs as completed systems
- Logged the design-system visual build at the current step (Batch 3 layout containers)
- Surfaced the four open threads (CLOSED_AWARD_FAILED, Lineup DRAFT/SUBMITTED, foundation folder migration, Stats Service consumer build awaiting Supabase)

## History

### Design System Visual Build — in progress

Bottom-up component development using the Expo component-preview system. Build real components with real tokens and mock data, iterate visually in the browser, lock in visual decisions, then update specs. Sequence: text primitives → player row + data table → layout containers → scoring/matchup → screen compositions. Build sequence documented in `documents/Prompt_DesignSystem_BuildSequence.md`.

Components shipped in code: `Card`, `DataTable`, `FranchiseHeader`, `FranchiseMark`, `GlobalNav`, `Headshot`, `InjuryIndicator`, `Label`, `LeagueNav`, `LiveDot`, `MatchupCard`, `Mono`, `PageShell`, `PlayerRow`, `PositionBadge`, `ScoreDisplay`, `ScoreNum`, `Section`, `SegmentControl`, `Stack`, `StatValue`.

### Decisions made

- **Stats Service extraction.** The NFL Stats Service is a standalone project (`nfl-stats-service` repo, Supabase project `wshhehpkwuxbmxkyhoot`, us-east-2). 6 phases complete, 123 tests passing, 182K stat rows, 20K players, 3K games backfilled 2015–2025. XO Play is a consumer of this service, not an owner of NFL data ingestion.
- **Data Model v0.2.** Player gains `statsServicePlayerId` (UUID FK to Stats Service); `externalId` redefined as nflverse `gsis_id`; `headshotUrl` removed. Stats gain `isReconciled` (boolean).
- **Design approach rejected → bottom-up rebuild.** Claude Design output reviewed and rejected — taking a different visual design approach (TBD). Bottom-up component development using Expo preview locks in visual decisions before screen specs are written.
- **No spectator/public view.** All pages require authentication. No public-facing nav layer or SEO concern.
- **Navigation: 4-layer model.** Global → League → Section → Screen. `/my-team` magic route resolves to current user's franchise. Tiers hide nav tabs entirely (not grayed out). Abilities disable actions within visible screens (not hide screens). Mobile bottom bar: 5 slots with "More" overflow; Gameday replaces middle tab when active.
- **Transactions: shared validation pipeline.** One 14-check pipeline composable across three transaction types. Cap check runs last (most expensive). Waiver drop lock checked at processing time. Counter-proposals create new Trade records.
- **Draft: state derived from picks.** Live drafts force IMMEDIATE trade processing. Drafted players always land in ACTIVE bucket.
- **Auction: separate validation.** Does NOT use the shared transaction pipeline (different check profile: no player locks, no Can't Add/Can't Drop, no calendar blocking beyond auction lifecycle). Proxy bids commit at standing value, not max.
- **Roster Management: validate always, block selectively.** Validation engine is strict; enforcement policy is configurable per rule. No direct IR ↔ taxi transitions (must go through ACTIVE). Best Ball leagues skip lineup submission entirely.

### Open threads

- **Data Model update needed** — Auction spec recommends adding `CLOSED_AWARD_FAILED` to `AuctionPlayerState.status` enum (§5.32). Roster Management spec introduces `DRAFT` / `SUBMITTED` states for LineupEntry (OQ2). Fold both into `Spec_DataModel.md` when those open questions resolve.
- **Stats Service Consumer build blocked on XO Play Supabase project** — Phase 1 (player ID mapping + initial sync) needs the database to exist. When the Supabase project is created, build Player and Stats tables with the v0.2 schema from day one (no migration needed).
- **Navigation open questions** — OQ1 Player Profile URL placement; OQ2 Accounting screen placement; OQ3 Notification center panel vs. screen; OQ4 Keeper selection screen placement.
- **Foundation folder migration** — `Spec_DataModel.md`, `Spec_Tiers.md`, `Spec_DesignSystem.md` still at `specs/` root. Consider moving into `specs/foundation/` to match the Structure Map tree.

### Plan

- **Phase 1 — Core Engine Specs** ✅ Scoring / Salary Cap / Calendar
- **Phase 2 — Transaction Systems** ✅ Transactions / Draft / Auction / Roster Management
- **Phase 3 — Sitemap, Navigation & Surfaces** 🟡 Navigation ✅; Design System visual build in progress; Franchise / League / Commissioner screens next
- **Phase 4 — Supporting Systems** Live Scoring / Social / Accounting / Playoffs
- **Phase 5 — v2 Prep** Narrative readiness + Narrative engine

For the authoritative spec-tracker and decision history, see `documents/BUILD_STATUS.md`.
