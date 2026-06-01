# Spec_MockFixture (Foundation)

**Status:** Draft
**Parent specs:** [Spec_DataModel.md](../Spec_DataModel.md) (the schema this mirrors), [Spec_Navigation.md](./Spec_Navigation.md) §6 (per-screen data map — what each screen must surface), [Spec_Tiers.md](../Spec_Tiers.md)
**Type:** Buildable Unit (data + logic)
**Last updated:** May 2026

---

## Purpose

Replace the flat `src/data/mockData.ts` with a **normalized fixture that mirrors `Spec_DataModel.md`** — one collection per entity, joined by IDs, with every derived value computed by pure helper functions rather than stored. This is the data foundation every screen reads, shaped so the eventual Supabase swap is mechanical (the whole point of the "match the real shape now" decision). This doc covers the **foundation batch** — the entities that unlock the Franchise and League screens (the bulk of the app). Later area batches (transactions detail, draft, auction, social, accounting, playoffs, commissioner) extend the same fixture.

## Shape rules (non-negotiable)

1. **One collection per entity**, named and fielded exactly per `Spec_DataModel.md` §4. String UUID-style `id`s; foreign keys named `<entity>Id`.
2. **No derived value is stored on a base entity.** `record`, `pointsFor`, `capUsed`, `streak`, the standings ranking — all computed by helpers in `derive.ts` per Data Model §7 and §6.4. (The old mock stored these on `Franchise`/`Player`; that is what we are removing.)
3. **No flattening.** A player's salary, roster bucket, and weekly stats live on `Contract`, `RosterEntry`, and `Stats` — joined to `Player` by id — never on `Player`.
4. **Enums use the exact `SCREAMING_SNAKE_CASE` values** from Data Model §5.
5. **Components read view models, not raw entities.** Helpers assemble joined "view" objects (e.g. a roster row = player + contract + bucket + computed points) the way a real DB query returns joined rows. Components take the view, not five separate entities. This is how `PlayerRow` gets refactored (see Rewire).
6. **Breadth over depth.** Every entity in scope is represented with complete fields; row counts stay modest.
7. **Generate the high-volume entities.** `Player`, `Contract`, `RosterEntry`, `Stats`, `LineupEntry` are produced by deterministic factory functions (loops with stable seeds), not hand-typed. Singletons and small sets (`League`, conferences, divisions, franchises, users, scoring rules, matchups, seasons, the small transaction set) are hand-authored. This keeps the file small at the source even when it emits many rows.

## Module structure

`src/data/` becomes a module:
- `fixtures/` — entity collections grouped sensibly (e.g. `league.ts`, `structure.ts` [conference/division], `identity.ts` [user/owner/role], `franchises.ts`, `players.ts` [+ generator], `contracts.ts`, `roster.ts`, `stats.ts`, `scoring.ts`, `matchups.ts`, `lineups.ts`, `seasons.ts`, `transactions.ts`)
- `derive.ts` — pure derived-value + view-model helpers
- `index.ts` — barrel re-export

Keep a barrel at `@/data` and a thin re-export at `@/data/mockData` so existing imports resolve; update only the consumers whose data changed shape (the standings array → `computeStandings`, and the flattened `PlayerRow` consumers).

## Entities in scope (foundation batch)

Counts are guidance, not exact. Refer to the cited Data Model section for the full field list of each.

| Entity | ~Count | Notes |
|---|---|---|
| `League` | 1 | Dynasty; `trackSalaries`+`trackContracts` true; full config from §4.2 defaults |
| `Conference` | 2 | §4.3 |
| `Division` | 4 | 2 per conference §4.4 |
| `Franchise` | 8 | 2 per division; keep the 5 existing themed franchises + 3 new; full fields incl. `divisionId`, `abilities` (all true), `status`, `accessCode`, `primaryOwnerUserId` §4.5 |
| `User` | ~9 | one primary owner per franchise + a commissioner §4.1 |
| `FranchiseOwner` | 8 | one current per franchise, `isPrimary` true §4.6 |
| `LeagueRole` | ~3 | 1 commissioner + 1 co-commissioner + 1 moderator §4.7 |
| `Player` | ~150 | shared pool: ~16 rostered per franchise + ~20 free agents; all 10 positions; varied injury/team; **generated**; full §4.9 fields |
| `Contract` | ~128 | one per rostered player; **generated**; `baseSalary` a multiple of `League.salaryIncrement`; `currentRosterBucket` matches its `RosterEntry` §4.13 |
| `RosterEntry` | ~128 | one per rostered player; **generated**; ACTIVE/IR/TAXI mix §4.17 |
| `Stats` | players × ~3 weeks | **generated**; `statValues` keyed by Stat Type §5.50, position-appropriate §4.10 |
| `ScoringRule` | ~20 | standard set across passing/rushing/receiving/kicking/defensive §4.11 |
| `Matchup` | weeks 1–11 | hand-authored schedule for the 8 franchises; past = COMPLETED with scores, current = IN_PROGRESS/SCHEDULED; `homeScore`/`awayScore` stored (they are stored fields) §4.20 |
| `LineupEntry` | current week (+1 prior) | **generated** per matchup × franchise-side × player; `fantasyPoints`, `isStarter`, `slotPosition` §4.19 |
| `Season` | 2 | current + last completed (for history) §4.34 |
| `Transaction` | ~12 | small set across subtypes (ADD_DROP, WAIVER_CLAIM, TRADE_COMPLETED, IR_MOVE, …); common fields + `payload` per §4.18; keeps FranchiseHome's activity feed working and seeds the transactions area |

Entities **not** in this batch (come with their area): `SalaryAdjustment`, `FranchiseSalaryCapOverride`, `RookieSalaryScale`, `DraftPick`/draft lists, `Auction`/`AuctionPlayerState`/`Bid`, `WaiverClaim`, `Trade`/`TradeAsset`/`TradeVote`/`TradeComment`, `CalendarEvent`, `PayoutStructure`/`AccountingEntry`, social entities, `Notification`/preference, `AuditLogEntry`, `PlayoffBracket`. Note: until `SalaryAdjustment` exists, `computeCapUsage` sums contracts only.

## Derived helpers (`derive.ts`) — pure, no stored state

- Lookups/joins: `getFranchiseById`, `getPlayerById`, `getContractById`, `getRosterByFranchise` (→ view model: player + contract + bucket + computed season/last-week points), `getLineupForMatchup`, `getStatsForPlayer`
- Records: `computeRecord(franchiseId, season)`, `computePointsFor`, `computePointsAgainst`, `computeDivisionRecord`, `computeConferenceRecord`, `computeStreak`
- Cap (§6.4): `computeCapUsage` (bucket multipliers: ACTIVE 1.0, IR `irSalaryPercent`, TAXI `taxiSalaryPercent`), `effectiveCap`, `computeCapRoom`
- Standings: `computeStandings(leagueId)` → ordered ranking with `victoryPoints` (§15.3), `streak`, division/conference records. **This replaces the hand-typed `standings` array.**

## Rewire (the existing build reads flattened data)

This is a data-source swap, **not** a redesign — the three screens look identical afterward.

- **`PlayerRow`** — change its prop from a flattened `Player` to a roster **view model** (player identity + contract salary/years + computed points + bucket + injury). It stops reading `player.salary` / `player.seasonTotal` / `player.weeklyScores` / `player.rosterBucket`.
- **`RosterView`** — feed rows from `getRosterByFranchise` (which returns the view models) instead of `getPlayersByFranchise` + flattened fields.
- **`FranchiseHome`** — masthead from `computeRecord`/`computePointsFor`/`computePointsAgainst`; cap meter from `computeCapUsage`/`computeCapRoom`; This Week from `matchups` + helpers; Recent Activity from the `Transaction` set.
- **`Standings`** — `computeStandings(leagueId)` instead of the `standings` array.
- **Preview demos** — update the `PlayerRow`, `DataTable`, and `Standings` preview entries to the new view-model / helper shapes so the sandbox still renders.

## Out of scope

- Any visual change to the three built screens or `PlayerRow` (data-source swap only; pixels unchanged).
- The area entities listed as "not in this batch."
- Real Supabase wiring — comes after the screens are up.
- Exhaustive depth: full-season `Stats`/`LineupEntry` for every week (generate ~1–3 weeks).

## Done criteria

- `src/data` is normalized: one collection per Data Model §4 entity in scope; **no derived value stored on a base entity**; enum values exact.
- High-volume entities come from factory generators; singletons/small sets hand-authored; every listed entity present with complete fields.
- `derive.ts` exposes the listed helpers; `computeStandings` reproduces a sensible ranking with victory points, streak, and division records.
- `PlayerRow` takes a view model; the three screens and the affected preview demos render **visually unchanged**, now sourced entirely from the normalized fixture + helpers; typecheck clean.
- Every collection and field maps back to a Data Model §4 entity — no flattened or invented fields.
