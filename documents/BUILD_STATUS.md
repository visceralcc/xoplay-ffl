# XO Play — Build Status

**Purpose:** Track what's been written, what's in progress, and what's next. Read this at the start of every session to pick up where you left off.

**Last updated:** May 2026

---

## Completed

| Document | Level | Location | Notes |
|---|---|---|---|
| PRD | 1 | `specs/Spec_XOPlay_PRD.md` | 26-section master product architecture |
| MFL Gap Analysis | 1 | `specs/Spec_XOPlay_MFL_Gap_Analysis.md` | Competitive teardown / P0 backlog |
| Data Model | 2 (foundation) | `specs/Spec_DataModel.md` | 45 entities, 58 enums — canonical schema |
| Tiers | 2 (foundation) | `specs/Spec_Tiers.md` | 3 tiers × 10 behavioral dimensions, all config-driven |
| Design System (structural) | 2 (foundation) | `specs/Spec_DesignSystem.md` | Structural spec only — principles, tokens, 80+ components, responsive framework, franchise theming. No visual commitments yet. |
| Templates | Process | `specs/Templates_SpecDocs.md` | Tech Spec, Design Spec, and Buildable Unit templates |
| Structure Map | Process | `documents/Structure_Map.md` | Full file tree, feature folders, writing order |
| Scoring Engine | 2 (core engine) | `specs/scoring/Spec_ScoringEngine.md` | Rule evaluation algorithm, all 7 preset definitions, stat corrections, Best Ball optimization, edge cases |
| Salary Cap & Contracts | 2 (core engine) | `specs/salary-cap/Spec_SalaryCapAndContracts.md` | Cap math, drop penalties, franchise tags, rookie scale, escalators, full rollover sequence, cap previews |
| Calendar & Lifecycle | 2 (core engine) | `specs/calendar/Spec_CalendarAndLifecycle.md` | Event execution engine, season state machine, transaction blocking, lineup locking, calendar generation, NFL schedule sync |
| Transactions | 2 (transaction system) | `specs/transactions/Spec_Transactions.md` | Shared validation pipeline (14 checks, composable per transaction type), FCFS add/drop, blind bid waiver processing algorithm with worked examples, trade state machine (9 states), trade validation with cap math examples, reversal mechanics, commissioner overrides, contract assignment rules, 12 edge cases |
| Draft | 2 (transaction system) | `specs/draft/Spec_Draft.md` | Live + email modes (one pick engine, two timer modes), pick generation for all 4 order types with worked examples, timer engine with overnight suspension, auto-pick fallback chain (worklist → draft list → expert/ADP/skip), conference-scoped drafts, rookie salary scale integration, commissioner controls, 10 edge cases |
| Auction | 2 (transaction system) | `specs/auction/Spec_Auction.md` | Live + email modes, proxy bidding engine with multi-bidder cascade algorithm, available funds with 3 reduction modes and roster reserve, nomination slot management, per-player expiration clocks, conference-scoped auctions, post-auction contract creation with declaration window, commissioner controls (pause/resume/void/reopen), 12 edge cases |
| Roster Management | 2 (transaction system) | `specs/roster/Spec_RosterManagement.md` | 9-check lineup validation pipeline, two lineup lock modes (per-kickoff / first-kickoff), lineup carryover for dormant owners, IR bucket transitions with 6 eligibility levels and cooldown enforcement, taxi transitions with eligibility aging, atomic IR/taxi swaps, offseason → in-season roster size switching with compliance deadline workflow, roster validation with structured response format, Best Ball bypass, 12 edge cases |
| Navigation | 2 (foundation) | `specs/foundation/Spec_Navigation.md` | 4-layer nav hierarchy (Global → League → Section → Screen), complete URL map (~80 routes), per-screen data map for all screens, role-based visibility matrix, tier-gated nav hiding, mobile nav patterns (bottom tabs + scrollable section tabs + hamburger overflow), redirect rules, deep linking, cross-area links, league switcher behavior, 6 edge cases, 4 open questions |

## In Progress

**Design System Visual Build** — Bottom-up component development using the component-preview system.

Build sequence documented in `documents/Prompt_DesignSystem_BuildSequence.md`. Steps 1–3 (scaffold, preview, mock data) run directly in Claude Code. Steps 4–8 (component batches) require spec files to be drafted in Claude.ai first, then built in Claude Code.

Current step: **Step 1 — Scaffold Expo project + fonts + tokens**

## Decisions Made

- Claude Design output reviewed and **rejected** — taking a different visual design approach (TBD)
- **Design system build approach decided:** Bottom-up component development using the Expo component-preview system. Build real components with real tokens and mock data, iterate visually in the browser, lock in visual decisions, then update specs. Sequence: text primitives → player row + data table → layout containers → scoring/matchup → screen compositions.
- **No spectator/public view** — all pages require authentication. No public-facing nav layer or SEO concern.
- **Navigation spec:** 4-layer model (Global → League → Section → Screen). `/my-team` magic route resolves to current user's franchise (same components as `/franchise/:slug` but with action controls). Tiers hide nav tabs entirely (not grayed out). Abilities disable actions within visible screens (not hide screens). Draft/Auction nav items visible for 7 days after completion then move to Reports. Mobile bottom bar: 5 slots with "More" overflow; Gameday replaces middle tab when active. Session-only section memory (not persisted). League switcher sorted by most recent activity.
- **Transactions spec:** Shared validation pipeline with composable checks (one pipeline, three transaction types). Cap check runs last (most expensive). Waiver drop lock checked at processing time, not submission time. Counter-proposals create new Trade records. Traded IR/Taxi players land in ACTIVE bucket. Reversal blocked when downstream transactions exist.
- **Draft spec:** Draft state is derived from DraftPick records (no separate status entity). Live drafts force IMMEDIATE trade processing. Drafted players always land in ACTIVE bucket. Future picks have provisional pickInRound values updated when standings finalize. Commissioner revert checks for downstream entanglements.
- **Auction spec:** Auction has its own validation — does NOT use the shared transaction pipeline (different check profile: no player locks, no Can't Add/Can't Drop, no calendar blocking beyond auction lifecycle). Calendar end date is nominal, not a hard cutoff (player auctions run to natural expiration). Proxy bids commit at standing value, not max (franchise can be outbid if proxy defense exceeds available funds). Award failure does NOT cascade to next bidder (v1 — player returns to FA pool). Auction blocks FCFS for players in the auction pool while OPEN. New field introduced: `auctionInactivityCloseHours`. Recommended new enum value: `CLOSED_AWARD_FAILED` for AuctionPlayerState status.
- **Roster Management spec:** Validate always, block selectively (validation engine is strict; enforcement policy is configurable per rule via flags like `irBlockLineupOnViolation`, `blockLineupWhenOverCap`). No direct IR ↔ taxi transitions (must go through ACTIVE). Atomic IR/taxi swaps supported to avoid invalid intermediate states. Roster-level position limits apply only to ACTIVE bucket (not IR/taxi). IR violations don't block lineup when `NO_IR_MOVES_ALLOWED` prevents resolution. Lineup carryover uses sportsdata.io projections for auto-fill. Best Ball leagues skip lineup submission entirely.

## Current Plan

**Phase 1 — Core Engine Specs ✅ COMPLETE**
All three core engine specs are written.

1. ✅ `scoring/Spec_ScoringEngine.md`
2. ✅ `salary-cap/Spec_SalaryCapAndContracts.md`
3. ✅ `calendar/Spec_CalendarAndLifecycle.md`

**Phase 2 — Transaction Systems ✅ COMPLETE**
All four transaction system specs are written.

4. ✅ `transactions/Spec_Transactions.md`
5. ✅ `draft/Spec_Draft.md`
6. ✅ `auction/Spec_Auction.md`
7. ✅ `roster/Spec_RosterManagement.md`

**Phase 3 — Sitemap, Navigation & Surfaces**

8. ✅ `foundation/Spec_Navigation.md` — sitemap + navigation patterns + per-page data mapping
9. **IN PROGRESS** — Design System visual build (bottom-up component development)
   - [ ] Step 1: Scaffold Expo project + fonts + tokens
   - [ ] Step 2: Set up component preview system
   - [ ] Step 3: Create mock data
   - [ ] Step 4: Batch 1 — text & identity primitives (⚠️ specs first)
   - [ ] Step 5: Batch 2 — player row & data table (⚠️ specs first)
   - [ ] Step 6: Batch 3 — layout containers (⚠️ specs first)
   - [ ] Step 7: Batch 4 — scoring & matchup (⚠️ specs first)
   - [ ] Step 8: Batch 5 — screen compositions (⚠️ specs first)
10. `franchise/Spec_FranchiseScreens.md`
11. `league/Spec_LeagueScreens.md`
12. `commissioner/Spec_CommissionerTools.md`

**Phase 4 — Supporting Systems**
13. `live-scoring/Spec_LiveScoring.md`
14. `social/Spec_SocialAndCommunication.md`
15. `accounting/Spec_Accounting.md`
16. `playoffs/Spec_Playoffs.md`

**Phase 5 — v2 Prep**
17. `narrative/Spec_NarrativeReadiness.md`
18. `narrative/Spec_NarrativeLayer.md`

## Open Threads

- **Data Model update needed** — Auction spec recommends adding `CLOSED_AWARD_FAILED` to AuctionPlayerState status enum (§5.32). Roster Management spec introduces `DRAFT` / `SUBMITTED` states for LineupEntry (OQ2). These should be folded into `Spec_DataModel.md` when those open questions are resolved.
- **Navigation open questions** — OQ1: Player Profile URL placement. OQ2: Accounting screen placement (deferred until Spec_Accounting.md). OQ3: Notification center panel vs. screen. OQ4: Keeper selection screen placement.
- **Foundation folder migration** — Navigation spec is the first file in `specs/foundation/`. Data Model, Tiers, and Design System are still at `specs/` root. Consider moving them into `specs/foundation/` to match the Structure Map's defined tree.

---

## Notes

- Level 3 buildable units get written per-feature, only when ready to build that feature
- Specs are living documents — update when implementation reveals gaps
- AI narrative engine is explicitly v2 — data foundation first
