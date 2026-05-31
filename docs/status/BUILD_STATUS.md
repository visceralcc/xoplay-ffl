# XO Play — Build Status

Last updated: 2026-05-31

Feature map and completion tracker. Surfaced in the Command Center dashboard.
Legend: ✅ Complete · 🔲 Not started / in progress

## Next Steps

- RosterView screen composition is built (first of the four Batch 5 screens)
- Build FranchiseHome — the next Batch 5 screen composition (depends on CapMeter + TransactionRow, both built)
- Then build the remaining Batch 5 compositions: Standings, AddDrop
- Then begin Phase 3 surface specs: Franchise, League, Commissioner screens

## Build Progress

| System | Status |
|---|---|
| PRD / MFL Gap Analysis (Level 1) | ✅ |
| Data Model v0.2 / Tiers / Templates / Structure Map | ✅ |
| Design System — structural spec | ✅ |
| Scoring / Salary Cap / Calendar (core engines) | ✅ |
| Transactions / Draft / Auction / Roster Management | ✅ |
| Stats Service Consumer spec | ✅ |
| Navigation spec | ✅ |
| Expo scaffold + fonts + tokens | ✅ |
| Component preview system + mock data | ✅ |
| Component Batch 1 — text & identity primitives (8) | ✅ |
| Component Batch 2 — SegmentControl / PlayerRow / DataTable | ✅ |
| Component Batch 3 — Card / Section / Stack / PageShell | ✅ |
| Component Batch 4 — ScoreNum / ScoreDisplay / MatchupCard | ✅ |
| Sub-component — FranchiseHeader | ✅ |
| Sub-component — CapMeter | ✅ |
| Sub-component — TransactionRow | ✅ |
| Batch 5 — screen composition specs | 🔲 |
| Batch 5 — screen compositions (preview) | 🔲 |
| Franchise / League / Commissioner screen specs | 🔲 |
| Live Scoring / Social / Accounting / Playoffs specs | 🔲 |
| Narrative readiness / engine specs (v2) | 🔲 |
| XO Play Supabase project + DB tables | 🔲 |

## Key Decisions

- **Stats Service extraction.** NFL Stats Service is a standalone project (`nfl-stats-service`, Supabase `wshhehpkwuxbmxkyhoot`, us-east-2; 6 phases, 123 tests, backfilled 2015–2025). XO Play is a consumer, not an owner of NFL data ingestion.
- **Data Model v0.2.** Player gains `statsServicePlayerId`; `externalId` redefined as nflverse `gsis_id`; `headshotUrl` removed. Stats gain `isReconciled`.
- **Design approach: bottom-up rebuild.** Claude Design output rejected. Build real components with real tokens and mock data in the Expo preview, lock in visual decisions, then write screen specs.
- **No spectator/public view.** All pages require authentication.
- **Navigation: 4-layer model** (Global → League → Section → Screen). `/my-team` magic route. Tiers hide nav tabs; abilities disable actions. Mobile bottom bar: 5 slots + "More"; Gameday replaces middle tab when active.
- **Transactions: one shared 14-check pipeline** across three transaction types; cap check runs last. Counter-proposals create new Trade records.
- **Draft: state derived from picks.** Live drafts force immediate trade processing; drafted players land in ACTIVE.
- **Auction: separate validation** (no shared pipeline). Proxy bids commit at standing value, not max.
- **Roster: validate always, block selectively.** No direct IR ↔ taxi (route through ACTIVE). Best Ball skips lineup submission.

## Open Threads

- **Data Model updates pending** — add `CLOSED_AWARD_FAILED` to `AuctionPlayerState.status` (Auction §5.32); add `DRAFT` / `SUBMITTED` LineupEntry states (Roster OQ2).
- **Stats Service Consumer build blocked** on the XO Play Supabase project existing; build Player + Stats tables with the v0.2 schema from day one.
- **Navigation open questions** — Player Profile URL placement; Accounting screen placement; Notification center panel vs. screen; Keeper selection screen placement.
- **Foundation folder migration** — `Spec_DataModel.md` / `Spec_Tiers.md` / `Spec_DesignSystem.md` still at `specs/` root; consider moving into `specs/foundation/`.
