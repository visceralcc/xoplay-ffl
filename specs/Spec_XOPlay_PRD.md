# XO Play — Fantasy Football Platform Specification

**Product Requirements & System Design — All Tiers**

Version 0.1 | April 2026 | Charlie Denison | XO Play (xoplay.co)

**CONFIDENTIAL**

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | Apr 2026 | Initial deep spec. Feature-parity baseline against MyFantasyLeague, tiered as Redraft / Keeper / Dynasty. Data model, scoring engine, transaction state machines, salary cap & contract math, draft & auction systems, playoffs, reports, and social layer. Narrative/editorial layer documented as differentiation but scoped as a later phase. |

---

## Table of Contents

1. Overview
2. Tier Model — Redraft, Keeper, Dynasty
3. League Architecture
4. People & Permissions
5. Players & Roster Construction
6. Scoring Engine
7. Salary Cap & Contracts
8. League Calendar & Season Lifecycle
9. Draft System
10. Auction System
11. Add/Drop & Waivers
12. Trades
13. Injured Reserve & Taxi Squad
14. Playoffs
15. Standings, Reports & Displays
16. Social, Communication & History
17. Accounting & Payments
18. Live Scoring & Real-Time Data
19. Narrative & Editorial Layer (Differentiation)
20. Data Model Summary
21. Cross-Tier Standardization & National Prizes
22. Edge Cases & Rules
23. Relationship to External Systems
24. Build Sequence
25. Open Questions

---

## 1. Overview

**XO Play is a fantasy football platform that delivers three distinct complexity tiers — Redraft, Keeper, and Dynasty — on a unified data foundation, with AI-generated editorial content creating a "team newspaper" experience that no other platform offers.**

The product sits in a gap between platforms that are too simple (ESPN, Yahoo, Sleeper redraft experiences) and platforms that are capable but operationally punishing (MyFantasyLeague for dynasty, specifically around manual salary cap, contract, and rule enforcement). XO Play's thesis: automate the operational tedium of advanced fantasy formats while preserving the strategic depth that makes them compelling, and transform the fantasy experience from a statistics ledger into an ongoing narrative.

### 1.1 Design principles

**The data model is tier-agnostic; the UX is tier-specific.** A single set of underlying entities (League, Franchise, Player, Roster, Contract, Transaction, Scoring Rule) must support all three tiers. What changes across tiers is which fields are populated, which rules are active, and what surfaces are visible to users. This prevents the "three products pretending to share a backend" problem and keeps the codebase maintainable.

**Automation is the differentiator — not configuration.** MyFantasyLeague's power is its configurability; its weakness is that nearly every advanced rule requires manual enforcement by a commissioner. XO Play inverts this: for each supported rule (rookie salary scales, contract escalators, franchise tag valuation, early-termination penalties), the system computes and enforces automatically, with commissioner override always available as an escape hatch.

**Narrative is additive, not mandatory.** AI-generated team newspapers, rivalry coverage, and daily headlines sit on top of the core data and are opt-in at the league level with tone defaults. The core platform must function completely without any narrative content, both because narrative requires upstream data stability and because some commissioners/owners will prefer a statistics-only experience.

**Commissioner defaults, owner override.** For any setting that affects presentation (narrative tone, page layout, notification rhythm), the commissioner sets a league default that owners may override for their own team pages. For any setting that affects competition rules, only the commissioner controls.

**Real-time during games; batch otherwise.** Live scoring during NFL games is a hot path; everything else (lineup changes, waivers, reports, salary rollovers) is async/batch. Infrastructure reflects this split.

### 1.2 Primary users

- **Commissioner** — sets up the league, enforces rules, resolves disputes, generates engagement. May be paid (incentive leagues) or unpaid (hobbyist). High skill required in Dynasty tier.
- **Owner** — manages one franchise. May own multiple franchises across leagues (one account, many teams).
- **Spectator** — non-paying reader of a league's public pages (friends, family, press). Has no login; sees only public content.

### 1.3 Explicit scope boundary

This spec defines the XO Play fantasy football platform. It does **NOT** cover:
- Fantasy sports other than NFL football (no basketball, baseball, soccer in v1)
- Mobile native apps (v1 is responsive web; native is a later phase)
- College football, dynasty prospect scouting, or IDP-specific analytics beyond what the scoring engine requires
- Public social features across leagues (XO Play is an in-league experience; cross-league competition is handled via the Standardized Variant system in §21, not social follows)
- Sports betting, DFS (daily fantasy), or prop bet integration
- User-generated scoring rule marketplaces
- The commissioner payment / billing model (separate business spec)

### 1.4 Data source

**sportsdata.io** is the primary data source for NFL player data, game data, stats, and injury reports. All references in this spec to "feed," "data source," or "stats provider" mean sportsdata.io unless otherwise specified. Secondary/fallback sources may be added later for redundancy but are not in scope for v1.

---

## 2. Tier Model — Redraft, Keeper, Dynasty

The three tiers are not three products. They are three **configuration presets** over a unified data model, with progressively more features unlocked.

### 2.1 Tier comparison matrix

| Capability | Tier 1: Redraft | Tier 2: Keeper | Tier 3: Dynasty |
|---|---|---|---|
| Season spans | One season | Multi-season with partial roster retention | Multi-season with full roster retention |
| Offseason roster | Cleared | Keepers retained (1–6 configurable), rest cleared | Full roster retained |
| Player contracts | None | Optional (contract years only) | Required (salary + years + status) |
| Salary cap | Optional (draft-only auction) | Optional | Required |
| Franchise tags | N/A | N/A | Required |
| Rookie draft | N/A (single draft) | Optional | Required |
| Free agent auction | Optional at start | Optional at start | Required each offseason |
| IDP | Optional | Optional | Fully supported |
| IR / taxi squad | Simplified | Simplified | Full rules |
| Roster size | 10–20 typical | 15–25 typical | 40–70 typical |
| Trade depth | Current season picks only | Up to 1 year ahead | Up to N years ahead (configurable, default 2) |
| Commissioner complexity | Minimal | Moderate | High |
| Narrative content | Light (weekly recap, matchup preview) | Medium (weekly recap, player storylines, trade coverage) | Full (daily headlines, rivalry coverage, franchise histories, draft narratives, offseason drama) |

### 2.2 Tier as configuration, not code

A League entity carries a `tier` field (`REDRAFT` | `KEEPER` | `DYNASTY`). This field gates which sub-systems are active and which UI surfaces appear. See §3.4 for the field-level implications.

**Key principle:** a commissioner must not be able to "upgrade" a Redraft league mid-season to Dynasty. Tier is locked at league creation and can only change at the offseason transition (between seasons), and only with explicit commissioner action and confirmation of downstream implications (e.g., upgrading Redraft → Keeper requires setting keeper count; upgrading Keeper → Dynasty requires assigning starting salaries to all rostered players).

### 2.3 Standardized variants (Future — planned post-v1)

Within each tier, XO Play will offer a small number of **Standardized Variants** — fixed-rule configurations that are eligible for cross-league competition and national prizes. See §21. Standardized variants lock certain settings (scoring rules, roster size, playoff format) so that comparisons across leagues are meaningful.

---

## 3. League Architecture

### 3.1 League entity — core fields

Every League has:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Internal primary key |
| `slug` | string | URL-safe identifier; unique globally |
| `name` | string | Display name, up to 80 chars |
| `tier` | enum | `REDRAFT` / `KEEPER` / `DYNASTY` |
| `sport` | enum | Fixed to `NFL` in v1 |
| `seasonYear` | int | The NFL season year this league config represents (e.g., 2026) |
| `status` | enum | `SETUP` / `ACTIVE` / `POSTSEASON` / `OFFSEASON` / `ARCHIVED` |
| `timezone` | string | IANA timezone (e.g., `America/Chicago`). Default from commissioner's account. |
| `franchiseCount` | int | 4–32, must be even if head-to-head is enabled |
| `conferenceCount` | int | 0, 1, or 2. Conferences allowed only if `franchiseCount >= 8` and `divisionCount >= 4`. |
| `divisionCount` | int | 0, 2, 4, 6, or 8 |
| `rosterSpots` | int | 1–100 |
| `irSpots` | int | 0–30 |
| `taxiSquadSpots` | int | 0–20 |
| `playerPoolIsolation` | enum | `SHARED_LEAGUE` / `ISOLATED_PER_CONFERENCE` — how many rosters can share a player |
| `scheduleMode` | enum | `HEAD_TO_HEAD` / `ALL_PLAY` / `TOTAL_POINTS_ONLY` |
| `initialRosterMode` | enum | `DRAFT` / `AUCTION` / `DRAFT_AND_AUCTION` / `THIRD_PARTY_DRAFT` / `MANUAL_LOAD` |
| `trackSalaries` | bool | If false, entire salary cap system is disabled |
| `trackContracts` | bool | If false, entire contract system is disabled |
| `commissionerUserId` | UUID | Primary commissioner |
| `createdAt` / `updatedAt` | timestamp | Audit |

### 3.2 League structural hierarchy

```
League
├── Conference (0, 1, or 2)
│   └── Division (0-4 per conference)
│       └── Franchise (N per division)
```

**Constraints:**
- If `conferenceCount = 0`, divisions are direct children of League.
- If `conferenceCount >= 1`, every Division belongs to exactly one Conference.
- Every Franchise belongs to exactly one Division (and transitively one Conference).
- Division and Conference are optional — a league can be flat (franchises only).

### 3.3 Player pool scope (the FLAG model)

MyFantasyLeague's "Each player can be on N rosters per Conference" setting is critical for Charlie's current league model: the 32-team FLAG league effectively runs as two parallel 16-team leagues (NFC and AFC), each with its own player universe. A single NFL player can be owned simultaneously by one franchise in NFC and one franchise in AFC.

XO Play supports this via the `playerPoolIsolation` field:

| Value | Behavior |
|---|---|
| `SHARED_LEAGUE` | A single player can be owned by at most 1 franchise in the entire league. Standard behavior. |
| `ISOLATED_PER_CONFERENCE` | A player can be owned by 1 franchise per conference. Only valid when `conferenceCount >= 1`. |

**Rationale:** this enables 32-franchise "league of leagues" formats without requiring users to literally set up two separate leagues. All transactions, schedules, and playoffs are tracked league-wide, but the player pool is segregated.

Trade restrictions follow pool isolation automatically: in `ISOLATED_PER_CONFERENCE` mode, trades between franchises in different conferences are prohibited by default (overridable by commissioner).

### 3.4 Tier-driven field activation

| Tier | Required fields | Locked/hidden fields |
|---|---|---|
| Redraft | Core league fields, roster structure, scoring | `trackSalaries=false`, `trackContracts=false`, `taxiSquadSpots=0`, `irSpots=0` or minimal |
| Keeper | Core + keeper count + keeper selection rules + `trackContracts` optional | `trackSalaries` optional |
| Dynasty | All fields required; `trackSalaries=true`, `trackContracts=true` | None locked; everything configurable |

### 3.5 League creation flow

Commissioner sees a tier selector first. Based on tier choice, subsequent setup steps are filtered. A Redraft commissioner sees 6 setup screens; a Dynasty commissioner sees ~15. This is the single biggest UX difference from MyFantasyLeague — no "which of these 45 settings do I need to touch?" problem.

**Default values are tier-appropriate.** A Dynasty commissioner does not see "Track salaries? Yes/No" — they see the salary cap setup screen directly, because Dynasty implies salaries. A Redraft commissioner never sees a salary cap screen at all unless they explicitly enable "Auction draft with budget."

### 3.6 League duplication

A commissioner may duplicate an existing league to seed a new season or spin up a sister league. The duplication action creates a new League with the same configuration, **but**:
- Franchise membership is NOT duplicated (new franchises must be set up).
- Rosters, scores, transactions, and history are NOT duplicated.
- Seasonal data (current standings, current calendar events) is NOT duplicated.
- Configuration (scoring rules, roster structure, playoff format, salary cap settings) IS duplicated.

### 3.7 League archival

Leagues never delete. When a league ends a season:
- `status` changes to `OFFSEASON`, then at commissioner action to a new seasonal clone or `ARCHIVED`.
- `ARCHIVED` leagues are read-only but permanently accessible for history purposes.
- History from archived leagues powers the cross-season features (championship history, franchise lineage) described in §16.

---

## 4. People & Permissions

### 4.1 User account model

A **User** is a person with a single XO Play account. A user may own franchises across many leagues and may be the commissioner of multiple leagues.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `email` | string | Unique. Login identifier. |
| `displayName` | string | Public name shown across XO Play |
| `phoneNumber` | string | Optional. Used for SMS invites and optional 2FA. |
| `timezone` | string | IANA timezone |
| `avatarUrl` | string | Profile image |
| `createdAt` | timestamp | |

### 4.2 Franchise entity

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `leagueId` | UUID | FK |
| `divisionId` | UUID | FK, nullable if league has no divisions |
| `name` | string | e.g., "Eagles." Commissioner or owner may edit. |
| `slug` | string | URL-safe, unique within league |
| `logoUrl` | string | Optional. Defaults to league-generated placeholder. |
| `primaryColor` / `secondaryColor` | hex | Team colors for UI theming |
| `ownerUserIds` | UUID[] | Array to support co-owners |
| `primaryOwnerUserId` | UUID | The owner considered "primary" for notifications |
| `accessCode` | string | Per-franchise secret used for invite links; rotatable |
| `abilities` | JSON | See §4.4 |
| `status` | enum | `ACTIVE` / `INACTIVE` / `ORPHANED` — an orphaned franchise is one whose owner left mid-season |
| `createdAt` | timestamp | |

### 4.3 The Owner ↔ Franchise relationship

A franchise may have multiple linked owners (co-owners). All linked owners receive the franchise's notifications, may perform transactions on the franchise's behalf, and are visible in the franchise roster as owners.

One owner is designated `primaryOwnerUserId` for tiebreak purposes (e.g., which email address is the default reply-to for league-generated communications about this franchise).

**Orphan handling.** If all owners are removed from a franchise, its status becomes `ORPHANED`. Orphaned franchises are visible to the commissioner for reassignment but do not participate in transactions until a new owner is assigned. See §22.3 for orphan rules during live seasons.

### 4.4 Permissions — the Abilities matrix

XO Play preserves MyFantasyLeague's per-franchise abilities grid, because it's the tool commissioners use to temporarily restrict problem owners without kicking them out.

**Per-franchise ability flags** (all default to `true`):

| Flag | Effect when `false` |
|---|---|
| `canSubmitLineup` | Owner cannot change lineup; previous week's lineup carries over |
| `canPerformAddDrops` | All add/drop actions blocked |
| `canDropWithoutAdding` | May only drop if simultaneously adding |
| `canProposeOrAcceptTrades` | Trade surfaces hidden; incoming trades auto-decline |
| `canTradeFutureDraftPicks` | Future picks excluded from trade surfaces |
| `canMakeIrMoves` | IR screen read-only |
| `canMakeTaxiMoves` | Taxi screen read-only |
| `canWriteLeagueArticles` | Editorial surface hidden |
| `canPostToMessageBoard` | Posting disabled; read-only |
| `canPostToLeagueChat` | Chat input disabled |
| `canCreateLeaguePolls` | Poll creation disabled |
| `canCustomizeFranchise` | Franchise appearance settings hidden |
| `canCustomizeHomePage` | Home page customization hidden |
| `canNominateForAuction` | Auction nomination disabled (bids allowed) |

### 4.5 Commissioner roles

Up to 3 levels of privileged access per league:

| Role | Scope |
|---|---|
| `COMMISSIONER` | Single user. Full rights. Tier-specific rule authority. |
| `CO_COMMISSIONER` | Multiple users. All commissioner rights EXCEPT: remove commissioner, delete league, transfer league ownership. Mirrors a "League Council" pattern used by mature leagues. |
| `MODERATOR` | Multiple users. Can moderate chat/message board and create polls; no rule-changing authority. |

The number of co-commissioners is not limited, but the UI should discourage large councils (common pattern is 2–4 total decision-makers).

**Commissioner Lockout setting:** a boolean that, when true, hides pending owner-initiated transactions (waiver claims, trade proposals) from the commissioner's view until they're finalized. Used in leagues that want commissioner impartiality. Default: `false`.

### 4.6 Invitations

Commissioners invite new owners via:
- Email (standard; sends a signed magic link)
- SMS (optional, requires phone number on file)
- Direct invite code (commissioner copies a code and shares it manually)

An invitation has a status (`PENDING` / `ACCEPTED` / `EXPIRED` / `REVOKED`) and an expiration (default 30 days). The commissioner sees a grid of franchises with invitation status.

### 4.7 Owner activity tracking

For each franchise, the system tracks `lastSeenAt` — the most recent time any owner of that franchise loaded any league page. This powers:
- The "Franchise Owner Activity" home page module (a presence/engagement signal).
- Commissioner alerts (e.g., "Team X hasn't logged in for 21 days; trade deadline in 7").
- Automated dormancy detection (§22.6).

### 4.8 Removing an owner

**Constraint from MyFantasyLeague:** an owner can only be removed after they have accessed their franchise at least once. This prevents removing an invited-but-not-yet-accepted owner (use "revoke invitation" instead).

When an owner is removed:
- They lose access to the franchise.
- If they were the only owner, franchise becomes `ORPHANED`.
- Historical attribution is preserved (past transactions, articles, etc. still show the original author).

---

## 5. Players & Roster Construction

### 5.1 Player entity

The Player entity is sourced from sportsdata.io and cached/mirrored in XO Play's database. Core fields:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Internal primary key |
| `externalId` | string | sportsdata.io player ID |
| `firstName` / `lastName` | string | |
| `nflTeam` | string | Three-letter NFL code, or `FA` for free agent |
| `position` | enum | `QB` / `RB` / `WR` / `TE` / `PK` / `DT` / `DE` / `LB` / `CB` / `S` (plus upcoming as needed) |
| `rookieYear` | int | First NFL season |
| `dateOfBirth` | date | |
| `heightInches` / `weightLbs` | int | |
| `collegeName` | string | |
| `injuryStatus` | enum | `HEALTHY` / `QUESTIONABLE` / `DOUBTFUL` / `OUT` / `IR` / `SUSPENDED` / `HOLDOUT` / `COVID` |
| `isActive` | bool | NFL-active vs retired/cut |
| `headshotUrl` | string | |
| `lastSyncedAt` | timestamp | |

**Position changes.** Positions are authoritative from sportsdata.io and may change (e.g., DE → DT reclassification). XO Play does not override. Historical position at time of any transaction is preserved in the transaction record, so reports can show "drafted as DE, now DT."

### 5.2 Custom players

Commissioners may add custom player records (for pre-release rookies not yet in the feed, international players, special event athletes, etc.). A custom player has `externalId = null` and `isCustom = true`. When the feed later adds the player, a commissioner can merge the custom record into the feed record (preserving roster ownership).

### 5.3 Roster structure

A Franchise's players are partitioned into three exclusive buckets:

| Bucket | Counts against roster cap? | Counts against salary cap? | Can be started? |
|---|---|---|---|
| `ACTIVE` | Yes (against `rosterSpots`) | Yes, 100% of salary | Yes |
| `INJURED_RESERVE` | No (against `irSpots`) | Yes, at `irSalaryPercent` (default 20%) | No |
| `TAXI_SQUAD` | No (against `taxiSquadSpots`) | Yes, at `taxiSalaryPercent` (default 10%) | No |

A player is in exactly one bucket at any time (or is a free agent, not on any roster).

### 5.4 Starting lineup configuration

Each league defines starting lineup requirements per position, with min and max:

| Position | Min (default for Dynasty) | Max (default) |
|---|---|---|
| QB | 1 | 1 |
| RB | 1 | 6 |
| WR | 2 | 7 |
| TE | 1 | 6 |
| PK | 1 | 1 |
| DT | 1 | 4 |
| DE | 1 | 4 |
| LB | 3 | 5 |
| CB | 1 | 4 |
| S | 1 | 4 |
| **Total starters** | **22** | |

**Flex positions** are modeled implicitly via position maxes that exceed mins. If `RB min = 1, RB max = 6` and `WR min = 2, WR max = 7` and `TE min = 1, TE max = 6`, then an owner can start any combination of RB/WR/TE up to their respective maxes as long as total = starters target. The constraint check is: for each position, `min <= count <= max`; for the full lineup, `sum(counts) = totalStarters`.

**Redraft default:** 9 total starters (1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 DEF, 1 PK) — a simpler standard.

### 5.5 Lineup locking

Two modes:

| Mode | Behavior |
|---|---|
| `LOCK_AT_KICKOFF` | Each player locks individually at the kickoff of their NFL game. Default for all tiers. |
| `LOCK_AT_FIRST_KICKOFF` | All players lock at the first NFL kickoff of the week (Thursday night or Sunday early). |

### 5.6 Roster-level position limits

Separate from starting lineup, the league may cap how many of each position can be on the active roster. Default: no limit (0 = no limit). Example: a league could require `WR min = 5, max = 10` on the active roster to prevent extreme hoarding of a position.

### 5.7 Roster validation

A roster is **valid** if and only if:
1. `count(ACTIVE) <= rosterSpots`
2. `count(INJURED_RESERVE) <= irSpots`
3. `count(TAXI_SQUAD) <= taxiSquadSpots`
4. Position counts on active roster respect roster-level position limits
5. All IR players have NFL status eligible per league rules (see §13.1)
6. All taxi players are eligible per taxi rules (see §13.2)
7. If salaries tracked: `sum(salaries, adjusted for IR% and Taxi%) <= salaryCap` (for hard cap)

Roster validation runs:
- On every transaction attempt (add, drop, trade, IR move, taxi move)
- On lineup submission
- Daily as a sweep check for leagues that allow invalid states

### 5.8 Partial lineups

A league setting `allowPartialLineups` (default `false`) determines whether an owner can submit fewer than `totalStarters` players. If `true`, empty slots score 0 and do not invalidate the lineup. If `false`, the roster submission is rejected when incomplete.

### 5.9 Bye week players as starters

A setting `allowByeWeekStarters` (default `true`) — if `false`, the system rejects a lineup with any player whose NFL team is on bye that week.

---

## 6. Scoring Engine

The scoring engine is the heart of the platform. It must be fast (live during games), auditable (every point explainable), and flexible (supporting the ~40 scoring rules a Dynasty IDP league uses).

### 6.1 Design principle

**Scoring is data-driven, not code-driven.** Every scoring rule lives in a configuration record, not in application code. Adding a new stat type, a new position scope, or a new scoring tier requires no code change — only a new configuration row.

### 6.2 Scoring rule entity

A **ScoringRule** defines how a statistical event translates to fantasy points. Each league has many rules.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `leagueId` | UUID | FK |
| `statType` | enum | See §6.3 |
| `positionScope` | string[] | Array of position codes this rule applies to |
| `rangeLow` | int | Minimum stat count this rule triggers at |
| `rangeHigh` | int | Maximum stat count (inclusive) |
| `pointsPerUnit` | decimal(6,3) | Points awarded per occurrence |
| `perUnit` | int | How many occurrences equal one `pointsPerUnit` (default 1). E.g., "0.1 point per 2 passing first downs" sets `pointsPerUnit=0.1, perUnit=2`. |
| `flatPoints` | decimal(6,3) | Optional flat bonus when the stat falls within range (e.g., "3 points for any FG of 0-30 yards") |
| `displayOrder` | int | For UI sorting |

**Rule evaluation** for a player in a week:
```
for each ScoringRule in league.scoringRules:
  if player.position not in rule.positionScope: continue
  stat_value = player.weekStats[rule.statType]
  if stat_value is null or stat_value == 0: continue
  if stat_value < rule.rangeLow or stat_value > rule.rangeHigh: continue
  if rule.flatPoints is not null:
    points += rule.flatPoints
  if rule.pointsPerUnit is not null:
    units = floor(stat_value / rule.perUnit)
    points += units * rule.pointsPerUnit
```

**Worked example — passing yards, 0.05 per yard:**
```
ScoringRule {
  statType: PASSING_YARDS,
  positionScope: [QB, RB, WR, TE, PK, DT, DE, LB, CB, S],
  rangeLow: -50,
  rangeHigh: 999,
  pointsPerUnit: 0.05,
  perUnit: 1,
  flatPoints: null
}

Player with 312 passing yards:
  units = floor(312 / 1) = 312
  points = 312 * 0.05 = 15.60
```

**Worked example — field goal tiered scoring:**
```
Rule A: FG_MADE, range 0-30, flatPoints=3.0, pointsPerUnit=null
Rule B: FG_MADE_LENGTH, range 31-59, pointsPerUnit=0.1, perUnit=1
Rule C: FG_MADE_LENGTH, range 60-99, pointsPerUnit=0.15, perUnit=1

Player with one 52-yard FG:
  Rule A doesn't apply (52 not in 0-30)
  Rule B applies: 52 units * 0.1 = 5.2 points
  Rule C doesn't apply (52 not in 60-99)
  Total: 5.2 points
```

### 6.3 Supported stat types

The full enumeration mirrors what sportsdata.io delivers plus a few composites. Each league can use any subset.

**Passing:** `PASSING_TDS`, `PASSING_YARDS`, `PASSING_INTS`, `PASSING_2PT`, `PASSING_FIRST_DOWNS`, `PASSING_COMPLETIONS`, `PASSING_ATTEMPTS`, `PASSING_SACKS_TAKEN`

**Rushing:** `RUSHING_TDS`, `RUSHING_YARDS`, `RUSH_ATTEMPTS`, `RUSHING_2PT`, `RUSHING_FIRST_DOWNS`, `RUSHING_FUMBLES`

**Receiving:** `RECEIVING_TDS`, `RECEIVING_YARDS`, `RECEPTIONS`, `RECEIVING_2PT`, `RECEIVING_FIRST_DOWNS`, `RECEIVING_TARGETS`

**Kicking:** `FG_MADE`, `FG_MADE_LENGTH`, `FG_MISSED`, `XP_MADE`, `XP_MISSED`, `FG_BLOCKED`

**Return game:** `PUNT_RETURN_TDS`, `PUNT_RETURN_YARDS`, `KICK_RETURN_TDS`, `KICK_RETURN_YARDS`

**Turnovers (offensive):** `FUMBLES`, `FUMBLES_LOST`

**Defensive:** `DEF_TACKLES_SOLO`, `DEF_TACKLES_ASSIST`, `DEF_SACKS`, `DEF_SACK_YARDS`, `DEF_QB_HITS`, `DEF_TACKLES_FOR_LOSS`, `DEF_SAFETIES`, `DEF_PASSES_DEFENDED`, `DEF_INTERCEPTIONS`, `DEF_INT_RETURN_YARDS`, `DEF_INT_RETURN_TDS`, `DEF_FORCED_FUMBLES`, `DEF_FUMBLE_RECOVERIES`, `DEF_FUMBLE_RECOVERY_TDS`, `DEF_FUMBLE_RECOVERY_YARDS`, `DEF_OFFENSIVE_FUMBLE_RECOVERY_TDS`, `DEF_BLOCKED_KICK_TDS`, `DEF_BLOCKED_PUNT_TDS`, `DEF_MISSED_FG_RETURN_TDS`, `DEF_BLOCKED_PUNTS`, `DEF_BLOCKED_XP`, `DEF_PENALTIES`, `DEF_PENALTY_YARDS`

**Composite (computed from primitives):** `DEF_TOTAL_TACKLES` (solo + assist), `TOTAL_TDS` (rush + rec + return)

### 6.4 Position-specific tackle rules

A key pattern Charlie's league uses: **tackles score differently by position.** DT/DE/CB/S get 2.5 per tackle; LB gets 1.5 per tackle; skill positions get 2 per tackle. This is modeled by having multiple ScoringRule records for the same `statType` with different `positionScope`:

```
Rule 1: DEF_TACKLES, positionScope=[DT, DE, CB, S], pointsPerUnit=2.5
Rule 2: DEF_TACKLES, positionScope=[LB], pointsPerUnit=1.5
Rule 3: DEF_TACKLES, positionScope=[QB, RB, WR, TE, PK], pointsPerUnit=2.0
```

The engine evaluates all rules; whichever has the player's position in scope applies. At most one rule per `statType` should include any given position (validation enforced at rule creation).

### 6.5 Packaged scoring presets

A commissioner can start from a preset and customize. v1 presets:

| Preset | Description |
|---|---|
| `STANDARD` | Non-PPR, no IDP. 6pt passing TD, standard yardage. |
| `PPR` | Standard + 1 point per reception |
| `HALF_PPR` | Standard + 0.5 per reception |
| `SUPERFLEX` | PPR with 2-QB lineup support |
| `IDP_STANDARD` | PPR + basic IDP scoring (solo tackles, sacks, INTs) |
| `IDP_DEEP` | PPR + full IDP scoring with position-specific tackle weights |
| `BEST_BALL` | PPR, auto-optimized lineups, no roster changes after draft |

### 6.6 Score adjustments

Commissioners may apply manual adjustments at two levels:

**Franchise-level adjustment.** Adds/subtracts points from a franchise's weekly score. Example: a commissioner awards 5 points for winning a league pool, or deducts 10 for a rule infraction.

| Field | Type |
|---|---|
| `id`, `leagueId`, `franchiseId`, `week`, `seasonYear` | UUID/int |
| `pointAdjustment` | decimal(6,2) |
| `reason` | string |
| `createdByUserId` | UUID |
| `createdAt` | timestamp |

**Player-level adjustment.** Adds/subtracts points from a player's weekly score (affects whoever has them on their roster). Example: sportsdata.io missed a stat correction.

Both types of adjustments are recorded in a separate table, not mutated into the primary scoring record, so the audit trail remains intact.

### 6.7 Statistics corrections

Stats may be corrected post-game by the league's source feed (usually Wednesday following Sunday games). When corrections land:
- The affected player's score recomputes automatically.
- Affected fantasy matchups have their results recomputed.
- Standings recompute.
- An event is logged (`STATS_CORRECTION`) visible to all owners.
- Narrative system (§19) may generate a "scoring correction affected the outcome of..." story.

**Rule:** stats corrections are applied without exception (mirroring MFL and the common FF league bylaws). Owners cannot dispute Elias Sports Bureau corrections.

### 6.8 Decimal precision

Scores are stored as `decimal(8,3)` internally and displayed as `decimal(x,2)` based on the league's `scoringDecimalPlaces` setting (1 or 2 decimal places). Display rounding uses banker's rounding (round-half-to-even) to avoid systematic bias.

### 6.9 Tie handling

League setting `tieHandling`:

| Value | Behavior |
|---|---|
| `ALLOW_TIES` | Ties recorded as ties. Win % = (W + 0.5T) / games. |
| `MANUAL_BREAK` | Commissioner breaks ties via UI. |
| `COIN_FLIP` | System auto-resolves with a deterministic seed per season. |
| `MOST_BENCH_POINTS` | Tiebreaker: team with more bench player points wins. |
| `HIGHEST_STARTER` | Tiebreaker: team whose highest-scoring starter scored more wins. |


---

## 7. Salary Cap & Contracts

This section is the heart of Dynasty tier. Every field, every formula, every rollover is documented here because this is the single largest automation opportunity vs. MyFantasyLeague.

### 7.1 Design principle

**Contracts are authoritative data; salary cap math is derived.** The system stores contract records (salary, years, status per player per franchise) and derives cap usage, penalties, and rollover adjustments. Commissioners should never be performing multiplication in a spreadsheet to enforce bylaws.

### 7.2 Contract entity

A **Contract** links a Player to a Franchise for a specific period and defines the economic terms.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `leagueId` | UUID | FK |
| `franchiseId` | UUID | FK |
| `playerId` | UUID | FK |
| `baseSalary` | decimal(8,2) | Per-season cost. Minimum configurable (default $0.50). |
| `contractYearsTotal` | int | Total years at signing (1–5 typical) |
| `contractYearsRemaining` | int | Decrements each offseason until 0 |
| `acquiredVia` | enum | `DRAFT` / `AUCTION` / `WAIVER` / `FCFS` / `TRADE` / `COMMISSIONER` |
| `acquiredAt` | timestamp | |
| `acquiredSeason` | int | NFL season year of acquisition |
| `status` | enum | `ACTIVE` / `FRANCHISE_TAGGED` / `EXTENDED` / `EXPIRED` |
| `salaryEscalatorPercent` | decimal(5,2) | Default 10. Applied at offseason rollover. Can be overridden per-contract. |
| `otherContractInfo` | string | Free text. Commonly tracks acquisition year, previous tag year, etc. Maps to MFL "Other Contract Information." |
| `contractStatusLabel` | string | Optional custom status text (e.g., "Rookie Scale," "Veteran Minimum") |
| `currentRosterBucket` | enum | `ACTIVE` / `INJURED_RESERVE` / `TAXI_SQUAD` — denormalized from Roster for fast cap math |
| `createdAt`, `updatedAt` | timestamp | |

### 7.3 Salary cap configuration — League level

| Field | Type | Default | Notes |
|---|---|---|---|
| `salaryCapAmount` | decimal(8,2) | 200.00 | Per-franchise cap. League-wide default; may be overridden per-franchise. |
| `salaryCapType` | enum | `HARD` | `HARD` (only commish transactions can exceed), `SOFT` (owners can exceed with warning) |
| `salaryCapEscalatorPercent` | decimal(5,2) | 5.0 | Applied each offseason to `salaryCapAmount` |
| `minimumPlayerSalary` | decimal(8,2) | 0.50 | Minimum salary for any owned player |
| `salaryIncrement` | decimal(5,2) | 0.10 | All bids/salaries must be in multiples of this |
| `startingLineupSalaryCap` | decimal(8,2) | null | Optional cap on the sum of salaries in the starting lineup (not just roster) |
| `blockLineupWhenOverCap` | bool | true | If over cap, prevent lineup submission (hard cap only) |
| `irSalaryPercent` | decimal(5,2) | 20.0 | What % of IR player salaries count toward cap |
| `taxiSalaryPercent` | decimal(5,2) | 10.0 | What % of taxi player salaries count toward cap |
| `playerSalaryEscalatorPercent` | decimal(5,2) | 10.0 | Default per-player annual raise (per-contract can override) |
| `salaryDisplayFormat` | enum | `WITH_CENTS` | `DOLLARS_ONLY` / `WITH_CENTS` / `WITH_COMMAS` / `MILLIONS_ABBR` |

### 7.4 Per-franchise salary cap override

A franchise may have a custom cap that overrides the league default. Used for handicap leagues, penalty adjustments that persist across seasons, or custom variants.

| Field | Type |
|---|---|
| `franchiseId` | UUID |
| `seasonYear` | int |
| `overrideCapAmount` | decimal(8,2) |
| `reason` | string |

### 7.5 Cap usage computation

At any moment, a franchise's **current cap usage** is:

```
capUsage = sum(
  contract.baseSalary * bucketMultiplier(contract.currentRosterBucket)
  for every contract on this franchise's roster
) + sum(salaryAdjustment.amount for every active adjustment)

bucketMultiplier(ACTIVE) = 1.0
bucketMultiplier(INJURED_RESERVE) = league.irSalaryPercent / 100
bucketMultiplier(TAXI_SQUAD) = league.taxiSalaryPercent / 100

capRoom = franchise.effectiveCap - capUsage
```

**Worked example — Seahawks current roster per the home page:**
```
ACTIVE contracts:
  Chase, Ja'Marr: $25.08 * 1.00 = 25.08
  Ridley, Calvin: $17.71 * 1.00 = 17.71
  Stevenson, Rhamondre: $2.41 * 1.00 = 2.41
  Gray, Eric: $1.46 * 1.00 = 1.46
  Hutchinson, Xavier: $1.33 * 1.00 = 1.33
  Bell, Ronnie: $0.80 * 1.00 = 0.80
  Sweat, T'Vondre: $1.21 * 1.00 = 1.21
  Bertrand, JD: $1.33 * 1.00 = 1.33
  Deablo, Divine: $1.77 * 1.00 = 1.77
  McKinstry, Kool-Aid: $0.97 * 1.00 = 0.97
  [subtotal: $54.07]

TAXI contracts (10% weight):
  Rourke, Kurtis: $1.43 * 0.10 = 0.14
  Williams, Caleb: $4.24 * 0.10 = 0.42
  Carter, Abdul: $2.75 * 0.10 = 0.28
  Hairston, Maxwell: $1.10 * 0.10 = 0.11
  Moore, Malachi: $0.88 * 0.10 = 0.09
  [subtotal: $1.04]

Total cap usage: $55.11
Effective cap: $222.75
Cap room: $167.64
```

This matches the screenshot exactly — verifying the math and the bucket weighting.

### 7.6 Rookie salary scale

Dynasty leagues universally assign salaries based on draft pick position. XO Play supports this as a first-class feature: when the rookie draft completes, salaries are automatically assigned per the league's rookie salary scale configuration.

**RookieSalaryScale entity** (one row per pick position per league):

| Field | Type |
|---|---|
| `leagueId` | UUID |
| `round` | int |
| `pickInRound` | int OR null (if null, applies to all picks in that round not otherwise mapped) |
| `baseSalary` | decimal(8,2) |
| `defaultContractYears` | int |

**Charlie's FLAG league example:**

| Round | Pick | Salary |
|---|---|---|
| 1 | 1 | $5.00 |
| 1 | 2 | $4.80 |
| 1 | 3 | $4.60 |
| 1 | 4 | $4.40 |
| 1 | 5 | $4.20 |
| 1 | 6 | $4.00 |
| 1 | 7 | $3.80 |
| 1 | 8 | $3.60 |
| 1 | 9 | $3.50 |
| 1 | 10–16 | $3.40 down by $0.10/pick |
| 2 | 1–4 | $2.50 |
| 2 | 5–8 | $2.20 |
| 2 | 9–16 | $2.00 |
| 3 | 1–16 | $1.50 |
| 4 | 1–16 | $1.30 |
| 5 | 1–16 | $1.10 |
| 6 | 1–16 | $1.00 |
| 7 | 1–16 | $0.80 |
| 8 | 1–16 | $0.60 |

When a rookie is drafted, the system creates a Contract with `baseSalary` from this scale and `contractYearsTotal` per the league's rookie default (typically 3 years for taxi-squaded rookies or 1–5 for active-roster rookies).

### 7.7 Annual salary escalator

At offseason rollover (see §8.5), every active contract with `contractYearsRemaining > 1` has its `baseSalary` increased by `salaryEscalatorPercent`. Contracts in their final year are not escalated.

**Worked example — 10% escalator:**
```
Contract: Chase, Ja'Marr, baseSalary=$25.08, yearsRemaining=1
At rollover: yearsRemaining becomes 0; contract expires. Salary not escalated.

Contract: Chase, Ja'Marr, baseSalary=$25.08, yearsRemaining=2
At rollover: yearsRemaining becomes 1; baseSalary becomes 25.08 * 1.10 = 27.59
  (stored as 27.59 after rounding to the nearest $0.01)
```

### 7.8 Drop penalty

When an owner drops a player mid-season or in the offseason, a cap penalty applies to account for the remaining contract obligation.

**League config:**
| Field | Default | Notes |
|---|---|---|
| `dropPenaltyBasePercent` | 75.0 | Percent of salary charged as penalty for dropping a player with 1 year remaining |
| `dropPenaltyPerAdditionalYearPercent` | 33.0 | Additional penalty per year of remaining contract beyond year 1 |
| `applyPenaltyMultiplier` | bool (default `true`) | Whether per-additional-year penalty compounds |

**Formula:**
```
dropPenalty = contract.baseSalary * (basePercent/100)
            + contract.baseSalary * (additionalYearPercent/100) * max(0, yearsRemaining - 1)
```

**Worked examples from Charlie's bylaws:**

| Contract | Years Remaining | Calculation | Penalty |
|---|---|---|---|
| $1.00 | 1 | $1.00 × 75% | $0.75 |
| $1.00 | 2 | $1.00 × 75% + $1.00 × 33% × 1 | $1.08 |
| $1.00 | 3 | $1.00 × 75% + $1.00 × 33% × 2 | $1.41 |
| $1.00 | 4 | $1.00 × 75% + $1.00 × 33% × 3 | $1.74 |
| $1.00 | 5 | $1.00 × 75% + $1.00 × 33% × 4 | $2.07 |
| $10.00 | 2 | $10.00 × 75% + $10.00 × 33% × 1 | $10.83 |
| $10.00 | 5 | $10.00 × 75% + $10.00 × 33% × 4 | $20.70 |

All match the bylaws table exactly. This is the kind of calculation that MFL forces commissioners to do by hand; in XO Play it's automatic.

**Drop penalty application.** The penalty is recorded as a salary adjustment against the franchise's cap. The adjustment persists for the duration it affects cap calculation. Two modes:
- `CURRENT_SEASON_ONLY` — penalty applied only in the current season, then expires
- `AMORTIZED` — penalty split across remaining years it would have been owed (less common)

Default: `CURRENT_SEASON_ONLY`.

### 7.9 Taxi squad contracts

Per Charlie's bylaws, taxi squad players are rookies placed on a developmental roster with distinct rules:

- Assigned a 3-year default taxi contract (not overlapping with active roster contract).
- Salary counts at 10% of base for cap purposes (see §5.3).
- Can be promoted to active roster at any point — at which point the owner has 48 hours to assign an active-roster contract (1–5 years).
- Once promoted, cannot be demoted back to taxi.
- At taxi contract expiration, player must be moved to active roster or becomes a free agent.
- Can be waived with no cap penalty (this is distinct from active roster cap penalty).

**Contract model for taxi:** a single Contract record with `currentRosterBucket = TAXI_SQUAD`, with a separate `taxiContractYearsRemaining` field and a "promoted" event that ends the taxi contract and creates a new active contract.

### 7.10 Franchise tag

The franchise tag is a one-year extension a franchise applies to an expiring contract to prevent that player from becoming a free agent. XO Play supports franchise tags as a first-class feature.

**League config:**
| Field | Default | Notes |
|---|---|---|
| `franchiseTagsEnabled` | true (Dynasty only) | Master switch |
| `franchiseTagsPerFranchisePerSeason` | 1 | How many players each franchise can tag |
| `franchiseTagIsUseItOrLoseIt` | true | If true, unused tags don't carry over |
| `franchiseTagValuationMethod` | `TOP_N_AT_POSITION_AVG` | See below |
| `franchiseTagTopN` | 10 | N for the top-N average |
| `franchiseTagRenewalYear2Percent` | 25.0 | Additional % added for renewing same player |
| `franchiseTagRenewalYear3Percent` | 30.0 | |
| `franchiseTagRenewalYear4Percent` | 35.0 | |
| `franchiseTagRenewalYear5Percent` | 40.0 | |

**Valuation methods:**

| Method | Formula |
|---|---|
| `TOP_N_AT_POSITION_AVG` | Average of top N salaries at the player's position league-wide |
| `TOP_N_AT_POSITION_MEDIAN` | Median of top N |
| `TOP_N_AT_POSITION_MAX` | Highest salary at position |
| `FIXED_MULTIPLIER_ON_CURRENT` | `currentSalary * N` where N is configurable |

**Worked example — top 10 at WR average:**
```
League has 32 franchises, each with several WRs under contract.
At end of season, collect salaries of all WRs on all rosters.
Sort descending, take top 10:
  [25.08, 22.00, 18.50, 17.71, 15.00, 14.20, 12.80, 11.90, 11.00, 10.50]
Average = 158.69 / 10 = 15.87

Player X (WR) whose contract expired gets franchise-tagged at $15.87 for 1 year.

If X was tagged last year for $13.00, this year's tag (Year 2) is:
  15.87 * (1 + 0.25) = 19.84
```

**Franchise tag application.** When a commissioner applies a tag:
- Contract is re-signed for 1 year at the tag value.
- `status` changes to `FRANCHISE_TAGGED`.
- `otherContractInfo` auto-updates to note tag year (e.g., "2026-Franchise Y1", "2027-Franchise Y2").
- League's franchise tag allowance for that franchise is consumed for the season.

**Trade of tagged players.** Traded-tagged players retain the tagged contract terms. The acquiring team cannot apply its own tag to a player it just acquired — this prevents "tag-and-trade" exploits.

**Expiration rule.** A player with 0 years remaining cannot be traded unless tagged first. This matches Charlie's bylaws and prevents trade-your-free-agents shenanigans.

### 7.11 Salary adjustments

A **SalaryAdjustment** entity is used for manual cap modifications that aren't tied to a specific contract.

| Field | Type |
|---|---|
| `id`, `leagueId`, `franchiseId` | UUID |
| `amount` | decimal(8,2) (positive = penalty against cap, negative = credit to cap) |
| `reason` | string |
| `effectiveDate` | date |
| `expirationDate` | date or null |
| `category` | enum | `DROP_PENALTY` / `RULE_VIOLATION` / `BONUS` / `HANDICAP` / `OTHER` |

These adjustments contribute to `capUsage` for their active period.

### 7.12 Salary import/export

Commissioners can import a full roster's worth of salaries and contracts via CSV. Format matches MFL's `Player;Salary;ContractYear;ContractInfo` semicolon-delimited structure for easy migration.

**Parse rules:**
- `Player` may be `Last, First` or `First Last` or a sportsdata.io player ID
- Blank fields clear existing data; unlisted players are left unchanged
- On parse error, commissioner gets a preview with validation before committing

Exports produce the same format for portability.

### 7.13 Default salary assignment

League setting `defaultSalaryAssignment`:
| Value | Behavior |
|---|---|
| `ALWAYS` | When a player is acquired without salary/contract, system assigns the league's default ($0.50, 1 year) |
| `NEVER` | Commissioner must manually assign |
| `WAIVER_ONLY` | Only waiver-acquired players get defaults |

League setting `salaryResetOnDrop`:
| Value | Behavior |
|---|---|
| `ALWAYS` | When a player is dropped, their salary data is wiped (player re-enters pool at default) |
| `NEVER` | Salary history persists; next owner inherits last salary |
| `PROMPT_COMMISSIONER` | System requests commissioner decision on each drop |

### 7.14 Offseason rollover sequence

At the end of the season, the commissioner triggers **rollover**. The system:

1. Decrements `contractYearsRemaining` for every active contract.
2. Expires contracts that hit 0 years remaining. Those players become free agents in the league's player pool.
3. Applies `salaryEscalatorPercent` to surviving contracts (those with years remaining after decrement).
4. Increments `salaryCapAmount` by `salaryCapEscalatorPercent`.
5. Advances league `seasonYear`.
6. Moves league `status` to `OFFSEASON`.
7. Generates an audit record of all contract changes.
8. Generates narrative content (§19) summarizing team-by-team offseason changes.

Rollover is atomic — if any step fails, the entire operation reverts. Commissioner must confirm.

### 7.15 Relationship: pre-rollover and post-rollover roster rules

Charlie's bylaws allow offseason rosters up to 70 players (before auction) vs. 53 in-season. XO Play supports this via a `rosterSpotsOffseason` field that applies between rollover and the season's "roster compliance deadline" (a calendar event). After the deadline, `rosterSpots` (in-season) applies; owners must get below the cap/count or incur penalties.

---

## 8. League Calendar & Season Lifecycle

### 8.1 Design principle

**The calendar is the spine of the season.** Every transaction rule, every automated job, every narrative trigger is anchored to a calendar event. There is no "hidden clock" — if something happens automatically, it's because a calendar event fires.

### 8.2 Calendar event entity

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `leagueId` | UUID | FK |
| `eventType` | enum | See §8.3 |
| `title` | string | Display label |
| `startAt` | timestamp | |
| `endAt` | timestamp or null | For date-range events |
| `recurrence` | enum | `ONCE` / `WEEKLY` / `DAILY` |
| `recurrenceCount` | int | How many times to repeat (e.g., 20 weeks) |
| `anchorWeek` | int or null | "Kickoff of Week N" anchor for relative scheduling |
| `systemEnforced` | bool | If true, the system takes automated action; if false, display-only |
| `status` | enum | `SCHEDULED` / `COMPLETED` / `CANCELLED` |

### 8.3 System-enforced event types

These events trigger automated actions:

| Event type | Action |
|---|---|
| `DRAFT_START` | Opens draft room, starts timer, notifies owners |
| `AUCTION_START` | Opens auction, starts timer, notifies owners |
| `PLACE_FREE_AGENTS_ON_WAIVERS` | Moves all free agents to waivers (locked) |
| `PROCESS_BLIND_BID_WAIVERS` | Runs waiver claim resolution |
| `NO_TRADES_ALLOWED` | Blocks trade UI during range |
| `NO_ADD_DROPS_ALLOWED` | Blocks add/drop UI during range |
| `NO_IR_MOVES_ALLOWED` | Blocks IR UI during range |
| `NO_TAXI_MOVES_ALLOWED` | Blocks taxi UI during range |
| `LINEUP_LOCK` | Individual player lock at kickoff (auto-generated per game) |
| `TRADE_DEADLINE` | One-time event marking end of trade period |
| `ROSTER_COMPLIANCE_DEADLINE` | Check rosters and flag violations |
| `OFFSEASON_ROLLOVER` | Triggers §7.14 rollover |
| `PLAYOFFS_START` | Locks regular season standings |
| `SEASON_END` | Moves league to `POSTSEASON` or `OFFSEASON` |

### 8.4 Display-only event types

Commissioner-named events that display on the calendar but don't trigger actions:
| Event type | Examples |
|---|---|
| `CUSTOM` | "Franchise tag deadline," "Rookie contract posting due," "League meeting" |

### 8.5 Season phases

Leagues progress through a defined lifecycle:

| Status | Valid transitions |
|---|---|
| `SETUP` | → `ACTIVE` (commissioner activates league, rosters populated) |
| `ACTIVE` | → `POSTSEASON` (playoffs begin) |
| `POSTSEASON` | → `OFFSEASON` (championship complete) |
| `OFFSEASON` | → `ACTIVE` (new season rollover, for multi-season tiers) OR → `ARCHIVED` (league ending) |
| `ARCHIVED` | Terminal |

Dynasty and Keeper leagues cycle `ACTIVE → POSTSEASON → OFFSEASON → ACTIVE` indefinitely. Redraft leagues typically go `SETUP → ACTIVE → POSTSEASON → ARCHIVED` (or `OFFSEASON` if the commissioner renews).

### 8.6 Calendar view

The calendar displays as both:
- A list view (chronological, with edit/delete per event for commissioners)
- A month/week grid view for at-a-glance

Both are accessible to all league members.

### 8.7 Charlie's FLAG calendar example

For reference, the kind of calendar a Dynasty league runs:

| Event | Date | Type |
|---|---|---|
| Auction for NFC | May 2 – May 16 | `AUCTION_START` (date range) |
| Auction for AFC | May 2 – May 16 | `AUCTION_START` |
| Rookie Draft (NFC) | May 23 | `DRAFT_START` |
| Rookie Draft (AFC) | May 23 | `DRAFT_START` |
| Put FA on Waivers (kickoff) | Tue Sep 8 4pm CT | `PLACE_FREE_AGENTS_ON_WAIVERS` |
| Process Blind Bid (kickoff) | Tue Sep 8 8pm CT | `PROCESS_BLIND_BID_WAIVERS` |
| Put FA on Waivers (weekly) | Mon Sep 14 8am CT | `PLACE_FREE_AGENTS_ON_WAIVERS`, repeat 20x |
| Process Blind Bid (weekly) | Wed Sep 16 8pm CT | `PROCESS_BLIND_BID_WAIVERS`, repeat 20x |
| Trade Deadline | Sun Dec 6 12pm CT | `NO_TRADES_ALLOWED` range |
| No Add/Drops | Wed Jan 13 12am CT | `NO_ADD_DROPS_ALLOWED` |


---

## 9. Draft System

### 9.1 Draft types

Two modes sharing the same underlying pick machinery:

| Mode | Characteristics |
|---|---|
| `LIVE` | Synchronous event, minutes-per-pick timer, all owners ideally online. Duration: 2–6 hours. |
| `EMAIL` | Asynchronous, days-per-pick timer, owners may go offline. Duration: days to weeks. |

The difference is entirely timer configuration and notification density — the pick workflow is identical.

### 9.2 Draft configuration

| Field | Default | Notes |
|---|---|---|
| `draftMode` | `EMAIL` | `LIVE` or `EMAIL` |
| `pickTimerSeconds` | 43200 (12h) | Per-pick clock |
| `timerSuspendEnabled` | true | Pause timer overnight (email drafts only) |
| `timerSuspendStart` | "23:00 ET" | |
| `timerSuspendEnd` | "07:00 ET" | |
| `timerExpirationBehavior` | `USE_DRAFT_LIST_THEN_SKIP` | See §9.4 |
| `autoPickAfterConsecutiveTimeouts` | 3 or null | Trigger auto-pick after N straight timeouts |
| `autoPickFranchises` | UUID[] | Franchises that always auto-pick (for absent owners) |
| `availablePlayerPool` | `BOTH_ROOKIES_AND_VETERANS` | `BOTH` / `ROOKIES_ONLY` / `VETERANS_ONLY` |
| `forceFullRosterAtEnd` | false | Prevent picking players that would make full roster impossible |
| `draftRounds` | 8 (Dynasty) / 15 (Redraft default) | |
| `draftOrderType` | `LINEAR` / `SNAKE` / `THIRD_ROUND_REVERSAL` / `CUSTOM` | |

### 9.3 Draft order

Draft order is computed from:
- **Redraft:** random, or manually set by commissioner.
- **Keeper/Dynasty rookie draft:** inverse of previous season's standings. Playoff teams receive picks based on playoff finish (championship winner picks last). Charlie's FLAG example: worst record picks 1st, champion picks 16th (per conference).

**Tiebreakers for identical regular-season records** (configurable order):
1. Head-to-head
2. Total points scored
3. Coin flip (deterministic seed)

These tiebreakers are distinct from standings tiebreakers, because draft tiebreakers assign the higher pick to the tiebreak loser (a reverse-luck scheme).

### 9.4 Timer expiration behavior

When an owner's timer expires, the system tries to make a pick on their behalf. Configurable fallback chain:

| Behavior | Sequence |
|---|---|
| `SKIP_ONLY` | Pick is skipped; commissioner must resolve later |
| `USE_DRAFT_LIST_THEN_SKIP` | Use owner's My Draft List; if no valid players on list, skip |
| `USE_DRAFT_LIST_THEN_EXPERT` | Use My Draft List; if empty, use expert ranks (sportsdata.io projections) |
| `USE_DRAFT_LIST_THEN_ADP` | Use My Draft List; if empty, use ADP from similar leagues |

### 9.5 My Draft List

Each owner maintains a personal pre-ranked list of players they want to auto-draft. The list is ordered; the system tries players in order until one is available and not in conflict with roster limits.

UI: drag-and-drop ordering, search/filter, clone from last year (Dynasty), import from common ranking services.

### 9.6 Pre-draft picks (Work List)

In email drafts especially, owners queue picks ahead of time. When an owner's pick comes up, the system checks their pre-draft list for the current round first.

**Worklist entity:**
| Field | Type |
|---|---|
| `franchiseId`, `round`, `playerId`, `priority` | UUID/int |

When it's an owner's turn:
1. Check Worklist for this round, in priority order.
2. If a queued player is available and rostering them is valid, select them.
3. If not, fall back per §9.4.

### 9.7 Draft room UI

A live draft page shows:
- Current pick (who's on the clock, time remaining, on-deck)
- Draft board (all picks so far, grid or list format)
- Available players (searchable, filterable by position, with projections)
- My Draft List and Work List editors
- Trade draft picks (if enabled)
- Live chat

### 9.8 Commissioner draft controls

| Action | Effect |
|---|---|
| `Change pick` | Replace a completed pick with a different player |
| `Skip pick` | Mark the current pick as skipped, advance |
| `Pause draft` | Halt the timer |
| `Resume draft` | Resume |
| `Revert draft` | Undo to a specific pick (destructive) |
| `Archive draft` | After completion, lock draft results permanently |
| `Import future picks` | Commissioner loads a list of traded picks from a third-party tracker |

### 9.9 Draft pick entity

A draft pick is its own entity (not just a transaction), because picks are tradeable assets in Dynasty.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `leagueId`, `seasonYear`, `round`, `overallNumber` | int | |
| `pickInRound` | int | |
| `originalFranchiseId` | UUID | Who the pick naturally belonged to |
| `currentFranchiseId` | UUID | Who owns the pick now (may differ after trades) |
| `isFuturePick` | bool | True for picks in future seasons |
| `playerSelected` | UUID or null | Player selected (null until pick made) |
| `pickStartedAt` / `pickCompletedAt` | timestamp | |
| `pickElapsedSeconds` | int | Pick duration |

### 9.10 Trade of draft picks

Future picks can be traded up to N years ahead (league config, default 2, max 5). For each traded pick, `currentFranchiseId` updates to the acquiring team. A trade involving a future first-round pick may trigger the "early buy-in" requirement (see §17.4).

### 9.11 Draft results display

Draft results are viewable in multiple formats:
- **Grid:** Round × Pick order (the classic draft board)
- **List:** Chronological with timestamps, elapsed time per pick, comments
- **By franchise:** Each franchise's picks together
- **By position:** Players grouped by position drafted

Filter by conference (for leagues using `ISOLATED_PER_CONFERENCE` player pool).

---

## 10. Auction System

### 10.1 Design principle

**Auctions are a resource-allocation game, and the system must expose resource state transparently.** At all times an owner must know: how much they have to spend, how many players they can still afford, how many slots they need to fill, and what the current market rates are.

### 10.2 Auction types

Same as draft:

| Mode | Characteristics |
|---|---|
| `LIVE` | Hours, all-hands auction event |
| `EMAIL` | Days-to-weeks async, most common for Dynasty |

### 10.3 Auction configuration

| Field | Default | Notes |
|---|---|---|
| `auctionMode` | `EMAIL` | |
| `minimumOpeningBid` | 0.50 | |
| `bidIncrement` | 0.10 | All bids must be multiples of this |
| `playerAuctionExpirationHours` | 15.84 (0.66 days) | After last high-bid change, how long until player is awarded |
| `useProxyBidding` | true | See §10.5 |
| `proxyBiddingIsPrivate` | true | Proxy bids visible only to the bidder until outbid |
| `maxConcurrentPlayerAuctions` | 100 | League-wide cap on simultaneous player auctions |
| `nominationsPerFranchise` | 7 | How many active nominations each franchise may have |
| `availablePlayerPool` | `VETERANS_ONLY` | `VETERANS_ONLY` / `ROOKIES_ONLY` / `BOTH` |
| `forceFullRosterAtEnd` | false | Prevent bids that would preclude a full roster |
| `allowCommentsOnBids` | true | |
| `chargeWinningBidsToAccountingBalance` | false | If true, winning bids deduct from owner's accounting balance as real $ |
| `startingFundsMode` | `SAME_FOR_ALL` | `SAME_FOR_ALL` / `PER_FRANCHISE` / `USE_ACCOUNTING_BALANCE` |
| `startingFundsAmount` | 200.00 | Applies when mode is `SAME_FOR_ALL` |
| `availableFundsReducedBy` | `OPEN_BIDS_PLUS_CURRENT_SALARIES` | How effective budget is computed |

### 10.4 The auction lifecycle

```
Auction opens (per calendar event)
  ↓
Owners nominate players (subject to per-franchise nomination cap)
  ↓
Each nominated player enters active auction
  ↓
Owners bid (subject to increment rules, roster validity, available funds)
  ↓
After X time with no new high bid, player is awarded to high bidder
  ↓
Winning franchise's budget is reduced; nomination slot freed
  ↓
(repeat until all franchises stop nominating for N hours, OR calendar end)
  ↓
Auction closes; all players awarded or returned to free agent pool
```

### 10.5 Proxy bidding

With proxy bidding on, an owner submits a maximum bid. The system bids on their behalf up to that max, always just above the current high bid.

**Worked example:**
```
Player X nominated at $1.00 by Franchise A.
Franchise A sets proxy max = $5.00.
Franchise B bids $2.00. System auto-bids $2.10 for A. A leads at $2.10.
Franchise B bids $4.00. System auto-bids $4.10 for A. A leads at $4.10.
Franchise B bids $5.50. A's proxy cap exceeded; B leads at $5.50.
```

When `proxyBiddingIsPrivate`, other franchises see only "A is leading at $2.10" — not A's max.

### 10.6 Bid entity

| Field | Type | Notes |
|---|---|---|
| `id`, `leagueId`, `franchiseId`, `playerId` | UUID | |
| `amount` | decimal(8,2) | |
| `maxProxyAmount` | decimal(8,2) or null | If proxy bidding |
| `comment` | string or null | |
| `placedAt` | timestamp | |
| `status` | enum | `ACTIVE` / `OUTBID` / `WINNING` / `WITHDRAWN` |

### 10.7 Available funds calculation

An owner's **available funds** at any moment:

```
totalFunds = startingFunds + accountingBalance (if mode=USE_ACCOUNTING_BALANCE)
committed = sum(active high bids) + sum(current salaries on roster)
availableFunds = totalFunds - committed
```

Bids that would push `availableFunds` below zero are rejected. Proxy bids are committed at their **current standing value**, not their maximum — so setting a high proxy doesn't lock up funds unnecessarily.

### 10.8 Roster validity during auction

Every bid must result in a valid roster if won. The system checks:
- Would winning this player put the franchise over its roster spot limit?
- Would winning this player put them over the salary cap?
- Would winning this player push position limits over max?

If `forceFullRosterAtEnd = true`, the system also forecasts: "can this franchise still fill remaining roster slots at minimum salary given their remaining budget?" Bids that would make a full roster impossible are rejected.

### 10.9 Auction nomination

Each franchise may have up to `nominationsPerFranchise` active nominations at once. To nominate a new player, the franchise must wait for one of their current nominations to close.

**Nomination process:**
- Owner submits a nomination with an opening bid (≥ `minimumOpeningBid`).
- Nomination becomes an active auction.
- Nominating franchise is the initial high bidder at opening bid.
- Other franchises may bid.

### 10.10 Auction awarding

When an auction closes (no bid change for `playerAuctionExpirationHours`):
1. Highest bidder wins the player.
2. A Contract is created with the winning bid as `baseSalary`.
3. `contractYearsTotal` defaults to 1 (offseason FA auction in Dynasty) or the league's default; owner has 48 hours (configurable) to declare a different contract length via a message board post or dedicated form.
4. Bidding franchise's available funds reduce; roster updates.
5. Losing bidders get their funds refunded.

### 10.11 Conditional bids

Not supported in v1 (MFL has this as optional; it's rarely used and complicates UX). Placeholder for future.

### 10.12 Commissioner auction controls

| Action | Effect |
|---|---|
| `End auction early` | Close all active auctions and award to current leaders |
| `Extend auction` | Add time to the calendar event |
| `Void bid` | Reverse an accidental or rule-violating bid |
| `Reopen auction for player` | After close, re-open a specific player's auction |
| `Delete auction` | Remove all auction records (pre-season setup use only) |

---

## 11. Add/Drop & Waivers

### 11.1 Two-phase system

Most leagues operate a hybrid add/drop system with two phases per week:

**Phase 1: Waiver period (players locked).**
After a player's NFL game kicks off, they're locked for a period. During this lock, blind bid claims can be submitted. At the scheduled waiver processing time, claims are resolved.

**Phase 2: Free agent period (first-come-first-served).**
After waivers process, remaining free agents are available via instant add/drop.

Charlie's FLAG schedule:
- Tue 4pm CT: All free agents go on waivers (lock begins)
- Tue 8pm CT: Blind bid waivers process
- Wed 8pm CT: Another waiver processing (weekly repeat)
- In between: FCFS add/drop

### 11.2 Waiver configuration

| Field | Default | Notes |
|---|---|---|
| `waiverSystem` | `BLIND_BID_WITH_FCFS` | `BLIND_BID_WITH_FCFS` / `WAIVER_ORDER_ONLY` / `FCFS_ONLY` |
| `waiverOrderType` | `INVERSE_STANDINGS` | `INVERSE_STANDINGS` / `RESET_WEEKLY` / `ROLLING` / `CUSTOM` |
| `blindBidMinimum` | 0.50 | Minimum bid |
| `blindBidIncrement` | 0.10 | Bid must be multiple of this |
| `blindBidSalaryLinked` | true | If true, blind bid $ = salary cap $. If false, BBD is a separate pool |
| `blindBidStartingFunds` | 100.00 | If BBD is separate pool |
| `allowConditionalBids` | false | "Bid X, and if I win, drop player Y" |
| `blindBidTiebreaker` | `EARLIEST_BID_WINS` | `EARLIEST_BID_WINS` / `WAIVER_ORDER` / `RANDOM` |
| `chargeBlindBidsToAccounting` | false | If true, winning bids deduct from real-money accounting balance |
| `droppedPlayerLockHours` | 48 | Dropped players locked from re-acquisition |
| `droppedPlayerLockUntil` | null | Alternative: lock until specific day/time (e.g., "Mon 11pm ET") |
| `noAddDropBetweenKickoffAndEndOfWeek` | true | Lock all add/drop during active games |
| `cantDropListEnabled` | false | Commissioner can designate players that cannot be dropped |
| `cantAddListEnabled` | false | Commissioner can designate players that cannot be added |

### 11.3 Waiver claim entity

| Field | Type | Notes |
|---|---|---|
| `id`, `leagueId`, `franchiseId` | UUID | |
| `playerToAddId` | UUID | FK |
| `playerToDropId` | UUID or null | If dropping with add |
| `bidAmount` | decimal(8,2) or null | If blind bid system |
| `priority` | int | Order in franchise's claim list (for multi-claim processing) |
| `submittedAt` | timestamp | |
| `status` | enum | `PENDING` / `SUCCESSFUL` / `FAILED` / `CANCELLED` |
| `failureReason` | string or null | "Outbid," "Player already claimed," "Roster full," "Over cap," etc. |

### 11.4 Waiver processing algorithm

When `PROCESS_BLIND_BID_WAIVERS` fires:

```
1. Load all PENDING claims for this league.
2. Sort by: (a) priority ascending per franchise, (b) bid amount descending across franchises, (c) tiebreaker rule.
3. For each claim in sorted order:
   a. Is the player still available? If not, mark FAILED.
   b. Would adding the player require dropping one? If drop is null, do roster check.
   c. Does the franchise have cap room? If not, mark FAILED.
   d. For blind bid: does the franchise still have budget for this bid? If not, mark FAILED.
   e. Award the player, create Contract (if salaries tracked), update roster, deduct budget.
   f. Mark SUCCESSFUL. Move to next claim for that franchise (priority order).
4. After all claims processed, all remaining free agents become FCFS available.
5. Broadcast results to all owners; generate narrative entry.
```

### 11.5 Tiebreaker handling

When two franchises submit identical bids on the same player:

| Tiebreaker | Resolution |
|---|---|
| `EARLIEST_BID_WINS` | Earliest `submittedAt` wins |
| `WAIVER_ORDER` | Lower waiver priority (worse team, inverse standings) wins |
| `RANDOM` | Coin flip (deterministic seed per league per week) |

### 11.6 FCFS add/drop

After waivers, add/drop is first-come-first-served:
- Owner selects player to add and optional player to drop.
- System validates roster/cap.
- Transaction is immediate.
- Dropped player is locked per `droppedPlayerLockHours`.

### 11.7 Can't Add / Can't Cut lists

A commissioner can configure:
- **Can't Add list:** players that cannot be added (used for severe-injury designations, suspension handling, or custom rule variants).
- **Can't Cut list:** players that cannot be dropped (used for franchise-tagged players, specific keeper designations, or commissioner-enforced holds).

These lists override normal transaction rules.

### 11.8 Custom waiver order

A commissioner can manually set waiver order (e.g., resetting weekly after a player claim, or using rolling priority). Ordering can be:
- `INVERSE_STANDINGS` — worst team gets priority
- `ROLLING` — franchise that wins a claim moves to back of order
- `CUSTOM` — commissioner sets the order manually
- `RESET_WEEKLY` — full reset each week to `INVERSE_STANDINGS`

---

## 12. Trades

### 12.1 Design principle

**Trades are the most social, most disputed, and most reversible transaction.** The system must support multiple resolution models (auto, commissioner review, league vote), expose trade state clearly, and make anti-collusion visible.

### 12.2 Trade configuration

| Field | Default | Notes |
|---|---|---|
| `tradeProcessing` | `IMMEDIATE` | `IMMEDIATE` / `COMMISSIONER_REVIEW` / `LEAGUE_VOTE` |
| `votingPollDurationDays` | 2 | Duration of league vote if `LEAGUE_VOTE` |
| `votingPollIsPublic` | false | If true, voters' identities visible |
| `votingRequired` | false | If true, owners must vote before submitting lineups |
| `autoRejectVoteThreshold` | null | Number of "reject" votes that auto-fail the trade |
| `tradeFuturePicksEnabled` | true | Allow trading picks in future seasons |
| `tradeFuturePicksYearsAhead` | 2 | Max years ahead |
| `tradeFuturePicksRoundLimit` | 8 | Deepest round of future picks that can be traded |
| `tradeBlindBidDollars` | false | Allow trading BBD |
| `tradeDisplayCommentsPublicly` | true | |
| `allowInvalidRosterTrades` | false | Reject trades that create invalid rosters |
| `allowLineupSubmitWithInvalidRoster` | false | After invalid roster trade, can owner still submit lineup? |
| `preventTradeDuringGames` | true | Block trades between player kickoff and end of week |
| `tradeProposalDefaultExpirationDays` | 7 | |
| `crossConferenceTradesEnabled` | false (when pool isolated) / true (shared pool) | |
| `tradeReversalWindowMinutes` | 10 | How long after acceptance a trade can be voided (both parties must agree) |

### 12.3 Trade entity

| Field | Type | Notes |
|---|---|---|
| `id`, `leagueId` | UUID | |
| `proposerFranchiseId`, `receiverFranchiseId` | UUID | |
| `proposedAt`, `acceptedAt`, `expiredAt`, `completedAt`, `reversedAt` | timestamp | |
| `status` | enum | `PROPOSED` / `ACCEPTED` / `REJECTED` / `EXPIRED` / `PENDING_VOTE` / `PENDING_COMMISSIONER` / `COMPLETED` / `REVERSED` / `AUTO_REJECTED` |
| `proposerSideAssets` | JSON | List of players, picks, BBD given by proposer |
| `receiverSideAssets` | JSON | List given by receiver |
| `comments` | Comment[] | Threaded discussion |
| `expiresAt` | timestamp | Auto-expire |

### 12.4 Trade asset types

Assets exchanged in a trade:
- **Player**: a specific contract (the full contract transfers, including years/salary/other info)
- **Draft pick**: a specific pick (current season or future, by round and original owner)
- **Blind bid dollars**: a numeric amount (only if `tradeBlindBidDollars = true`)
- **Salary adjustment**: a one-time cap credit or debit transferred with the trade

### 12.5 Trade workflow

**Immediate processing:**
```
Proposer creates trade → sends to receiver
Receiver reviews → accepts or rejects or counter-proposes
On accept: trade processes, rosters update, narrative fires
```

**Commissioner review:**
```
Proposer → Receiver → accept
↓
Trade enters PENDING_COMMISSIONER state
↓
Commissioner reviews, approves or rejects
```

**League vote:**
```
Proposer → Receiver → accept
↓
Trade enters PENDING_VOTE; poll opens for votingPollDurationDays
↓
All owners vote. If autoRejectVoteThreshold reached, trade AUTO_REJECTED.
If poll closes with majority accept (or no rejection threshold met), trade COMPLETED.
```

### 12.6 Trade reversal

Within `tradeReversalWindowMinutes` of acceptance, either party may request reversal. Reversal requires **both parties' consent** (recorded as acknowledgments in the trade record). After the window expires, reversal is commissioner-only.

### 12.7 Trade validation

Before a trade can be proposed or accepted, both sides must produce valid rosters. Validation checks:
- Roster spots: each side still within `rosterSpots` after the trade
- Position limits: each side's position counts within min/max
- Salary cap: each side within cap post-trade (hard cap only)
- Locked players: no player in the exchange is locked (in-game)
- Tagged players: franchise-tagged players can be traded, but the tag doesn't transfer — the acquiring team must respect tag rules (cannot re-tag)
- Contract years: a player with 0 years remaining cannot be traded unless tagged first (§7.10)

### 12.8 Future pick trade validation

Trading a future pick requires:
- The pick is within `tradeFuturePicksYearsAhead`.
- The pick round is within `tradeFuturePicksRoundLimit`.
- If the league enforces it, the trading franchise has paid their league dues for the relevant season (see §17.4 — "early buy-in for future picks").

### 12.9 Trade poll mechanics

| Setting | Behavior |
|---|---|
| Public vs. private voting | Who can see who voted which way |
| Required voting | If true, owners who don't vote before lineup deadline are locked out of lineup submission until they vote |
| Auto-reject threshold | If N reject votes, trade auto-fails |
| Majority required | Default: more than half of voters must accept |

### 12.10 Trade bait

Each franchise has a "Trade Bait" section where owners list players/picks they're willing to give up and what they're looking for. This is a soft marketplace, not a formal offer. Display on home page (§15.6).

### 12.11 Commissioner trade authority

Commissioners can:
- Void a completed trade (with audit trail)
- Force-process a trade stuck in review
- Set per-trade expiration override
- Ban two specific franchises from trading with each other (anti-collusion)

---

## 13. Injured Reserve & Taxi Squad

### 13.1 Injured Reserve configuration

| Field | Default | Notes |
|---|---|---|
| `irSpots` | 20 (Dynasty), 2–5 (Redraft) | Number of IR slots per franchise |
| `irEligibilityMinimum` | `IR_OR_OUT` | Minimum NFL injury status to qualify for IR |
| `irAllowSuspended` | true | Can suspended players be IR'd |
| `irAllowHoldout` | true | Can contract-dispute/holdout players be IR'd |
| `irAllowCovid` | true | Can COVID-list players be IR'd (legacy option) |
| `irBlockLineupOnViolation` | true | If ineligible player on IR, block lineup submission |
| `irActivationCooldownDays` | 0 | Once activated, can player be re-IR'd immediately |
| `irSalaryPercent` | 20.0 | % of salary counted against cap (see §7.5) |

**IR eligibility levels** (ordered least to most permissive):
| Level | Qualifies |
|---|---|
| `NO_PLAYERS` | IR disabled |
| `IR_ONLY` | NFL status must be IR |
| `IR_OR_OUT` | IR or OUT |
| `IR_OR_OUT_OR_DOUBTFUL` | IR, OUT, or Doubtful |
| `IR_OR_OUT_OR_DOUBTFUL_OR_Q` | IR, OUT, Doubtful, or Questionable |
| `NO_REQUIREMENT` | Any player may be IR'd (rarely used) |

### 13.2 Taxi Squad configuration

| Field | Default | Notes |
|---|---|---|
| `taxiSquadSpots` | 10 (Dynasty), 0 (Redraft) | |
| `taxiEligibility` | `ROOKIES_ONLY` | `ROOKIES` / `LT_2_YEARS` / `LT_3_YEARS` / `ALL_PLAYERS` / `NO_PLAYERS` |
| `taxiAllowByeWeekAdditionally` | false | Additionally allow bye-week players |
| `taxiAllowCovidAdditionally` | false | Additionally allow COVID-list players |
| `taxiPromotionCooldownDays` | 0 | Once promoted, can player be demoted immediately |
| `taxiBlockLineupOnViolation` | false | |
| `taxiSalaryPercent` | 10.0 | % of salary counted against cap |
| `taxiDefaultContractYears` | 3 | Default taxi contract duration |

### 13.3 IR/Taxi state transitions

A player on a roster is in exactly one of these states at any time:

```
                  (add)
Free Agent  ─────────────→  Active
                ↑ ↓         ↑ ↓ (activate) / (deactivate)
                │ │           │
              (drop)     Injured Reserve
                │ │           
                ↑ ↓ (promote) / (demote)
                │ │           
                │ │        Taxi Squad
```

**Rules:**
- Dropping from any state puts the player back in the free agent pool.
- Activating from IR requires meeting the cooldown (if any).
- Demoting from active to taxi requires the player to be eligible (per `taxiEligibility`) and the franchise to have taxi slots.
- Promoting from taxi to active is always allowed if active has room; cooldown may prevent re-demotion.

### 13.4 IR/Taxi moves and contracts

When a player moves between buckets, the Contract record's `currentRosterBucket` updates, but the contract itself doesn't change (salary, years, status all persist). This is critical: a $10M veteran doesn't become $1M by going on IR — they still cost $10M, just against the IR-weighted cap.

### 13.5 Automatic IR enforcement

When sportsdata.io updates a player's injury status:
- If player becomes eligible for IR and is on active roster, UI prompts the owner to consider IR'ing them.
- If player is on IR and their status recovers (becomes HEALTHY), system warns the owner they must activate before lineup deadline, or face a lineup validity violation.

---

## 14. Playoffs

### 14.1 Playoff bracket entity

| Field | Type | Notes |
|---|---|---|
| `id`, `leagueId`, `seasonYear` | UUID/int | |
| `name` | string | "Super Bowl Bracket," "Consolation," etc. |
| `teamCount` | int | |
| `startWeek` | int | Which fantasy week playoffs begin |
| `gamesInFirstWeek` | int | Typically = teamCount / 2 |
| `bracketWinnerTitle` | string | "Champion," "Consolation Winner" |
| `thirdPlaceGameEnabled` | bool | Whether a 3rd place game is played |
| `addToHomePage` | bool | Display bracket on league home |

A league can have up to 15 simultaneous brackets (main, consolation, toilet bowl, etc.).

### 14.2 Seeding

| Mode | Behavior |
|---|---|
| `AUTO_FROM_STANDINGS` | Top N teams by standings tiebreakers make playoffs; seeded 1–N |
| `MANUAL` | Commissioner assigns seeds directly |
| `DIVISION_WINNERS_PLUS_WILDCARDS` | Each division winner earns a seed; remaining spots to next-best teams |
| `CONFERENCE_SPLIT` | Playoffs run separately per conference (mirrors Charlie's FLAG model) |

**Charlie's FLAG playoffs:** 14-team bracket, 7 teams per conference (4 division winners + 3 wildcards). Top seed in each conference gets a bye.

### 14.3 Playoff matchup generation

Given a seeded bracket:
- Standard re-seeding: each round, the highest remaining seed plays the lowest remaining seed.
- Fixed bracket: the bracket is set from the start; no re-seeding.
- League selects between these modes.

### 14.4 Playoff matchup entity

Same as regular season matchup, but tagged with `isPlayoff = true` and `bracketId`, `bracketRound`.

### 14.5 Playoff scoring

Scoring uses the same engine as regular season. Lineup rules are the same. Matchups lock the same way.

### 14.6 Ties in playoffs

Playoff ties resolve per league's `playoffTieBreaker` setting (can differ from regular-season):
| Value | Behavior |
|---|---|
| `HIGHEST_SEED_WINS` | The better-seeded team advances |
| `MOST_BENCH_POINTS` | More bench points wins |
| `HIGHEST_SCORING_STARTER` | |
| `COIN_FLIP` | |
| `MANUAL_COMMISSIONER` | |

### 14.7 Championship and prize tracking

The championship winner is recorded in the league's history (§16.7). If the league has `payoutStructure` defined, prize allocations compute automatically at bracket completion.


---

## 15. Standings, Reports & Displays

### 15.1 Standings configuration

Standings are sorted by a configurable criteria chain. Default Dynasty chain (matches Charlie's FLAG):

1. Overall winning percentage
2. Conference winning percentage
3. Divisional winning percentage
4. Head-to-head record
5. Total points scored
6. Power rank

**Power rank** is a composite score blending recent performance and overall strength. XO Play's formula:

```
powerRank = 0.5 * totalPointsScoredNormalized
          + 0.3 * last3WeeksPointsNormalized
          + 0.2 * strengthOfScheduleNormalized

where *Normalized is z-scored within the league
```

This is XO Play's own metric — MFL's power rank is a black box. We document and expose ours, so owners understand and trust it.

### 15.2 Standings columns

Configurable list of columns shown. Available:
- Franchise (name, logo, owner)
- W-L-T
- PCT (winning percentage)
- GB (games back)
- STRK (current streak)
- PF (points for)
- AVG PF
- PA (points against)
- AVG PA
- DIV W-L-T
- CONF W-L-T
- VP (victory points, if enabled)
- POW (power rank)
- ACCT (accounting balance, if enabled)

### 15.3 Victory Points

An alternative standings currency used by some leagues. Each week, owners earn points based on both their head-to-head result AND their rank in league-wide weekly scoring.

**Example VP scheme:**
- 2 VP for a win
- 1 VP for a tie
- 0 VP for a loss
- +1 VP for being in the top half of league scoring that week

Standings can sort by VP instead of, or in addition to, W-L.

### 15.4 Report types

The following reports are first-class views in XO Play:

**Rosters report.** Every franchise's roster displayed side-by-side. Formats:
- Full format: all players with all fields (position, salary, contract, projection)
- Grid format: compact, sortable by position
- With stats format: includes current season stats per player

Filterable by conference, position, acquisition type. Viewable by week (historical).

**Transactions report.** Chronological list of all transactions. Filterable by:
- Type (add, drop, waiver, trade, IR, taxi, salary adjustment)
- Franchise (involves or belongs to)
- Date range
- Player

**Top performers.** Weekly and season leaderboards:
- Top Performers overall
- My Top Performers (for current user's franchise)
- My Top Performers and Free Agents
- Top Free Agents
- Top Passers / Rushers / Receivers / Kickers / Defenders / Defenses

All filterable by week range, position, conference.

**Standings report.** With all configured columns; filterable by conference/division.

**Draft results.** Per §9.11.

**Auction results.** Per-player bid history, winner, final price.

**Locked players.** Players recently dropped who are still locked from acquisition (with unlock timestamp).

**Schedule.** Full season schedule by franchise or by week.

**Power rankings.** Ordered list with XO Play power rank formula.

**Player news.** Aggregated news from sportsdata.io and, optionally, league-specific articles.

**Contract report** (Dynasty/Keeper only). Every contract on every roster with salary, years remaining, status. Sortable by salary, years, franchise.

**Cap usage report** (Dynasty only). Each franchise's current cap usage, breakdown by active/IR/taxi, cap room.

### 15.5 Home page modules

Configurable tiles on the league home page. Commissioner sets which modules appear and in what order; owners can further customize their own view.

**Available modules:**
- League Standings
- 10 Newest Transactions
- 10 Newest Message Board Topics
- League Chat
- League Poll
- Playoff Bracket
- League Champions (year-by-year history)
- Franchise Owner Activity
- Monthly Calendar
- Weekly Newsletter
- Top Performers
- Top 10 Free Agents
- Newest Player News
- Trade Bait
- Matchup Chart (current week)
- My 5 Newest News Articles
- My Options / My Team Actions
- My Roster Summary
- Lineup Deadline Countdown
- Twitter/YouTube Embed
- Custom HTML (commissioner-authored)

### 15.6 Franchise home page

Each franchise has its own landing page showing:
- Franchise branding (logo, colors, name)
- Current roster with contracts
- Recent transactions
- Upcoming matchups
- Trade bait
- Owner's news articles
- **Newspaper view** (narrative differentiation — see §19)

### 15.7 Mobile considerations

All reports must render cleanly at mobile width (320–420px viewports). Design principle: critical information priority — rosters, current matchup, lineup deadline — are above the fold on mobile; extended reports are reachable via deep links.

---

## 16. Social, Communication & History

### 16.1 Message board

Threaded discussion forum. One board per league. Features:
- Post new topic
- Reply
- Edit own post (within time limit, default 10 minutes)
- Quote another post
- Embed images
- Like/react
- Subscribe to topic (notifications on reply)
- Pin topic (commissioner)
- Lock topic (commissioner)
- Moderation tools (delete post, ban user from board)

### 16.2 League chat

Real-time chat, lighter than message board. Features:
- Target: everyone, or specific franchise (DM)
- Presence indicators (who's online)
- Message history (last 30 days by default)
- Emoji/reaction support
- Trash-talk video embeds (YouTube, etc.)

### 16.3 League polls

Commissioner or (if permitted) owners can create polls. Fields:
- Question
- Options (2–10)
- Vote visibility (public / anonymous / anonymous-until-close)
- Closes at: timestamp
- Required to submit lineup (rare; for critical league decisions)

### 16.4 League articles

Owners with `canWriteLeagueArticles = true` can write long-form articles visible on the league home page. Articles have:
- Title
- Body (Markdown with image support)
- Author
- Optional franchise branding
- Publish timestamp
- Tags

These are distinct from AI-generated narrative (§19) which appears in the newspaper view.

### 16.5 Newsletter

Commissioner (or automated system) composes a weekly newsletter. Email delivery to all league members on a schedule. Newsletter templates pull data from the platform (standings, transactions, etc.) to auto-populate.

### 16.6 Custom message blocks

Up to 20 editable message blocks on the home page, each independently editable by the commissioner. Common uses: league bylaws link, payment info, upcoming events, rule reminders.

### 16.7 League history

Every completed season becomes part of the league's history:
- Champion (with franchise + owner name)
- Runner-up
- Regular-season records
- Playoff results
- Awards (configurable)
- Transaction archive
- Contract archive (Dynasty)

History is displayed prominently on the home page and is searchable/filterable by year, franchise.

### 16.8 Franchise lineage

Franchises can change names and owners over time. The system tracks lineage so that historical records attribute to the franchise (not the specific name at the time). Example: "Seahawks" → renamed to "Vancouver Volcanoes" → new owner — all historical records remain linked to franchise ID.

### 16.9 Awards

Configurable awards given at season end:
- Regular season points leader
- Playoff MVP (if tracked)
- Trade of the year
- Waiver pickup of the year
- Best record
- Most points in a single week
- Custom awards (commissioner-defined)

Awards are automatically computed where possible; some require commissioner assignment.

---

## 17. Accounting & Payments

### 17.1 Design principle

**Accounting is optional but first-class when enabled.** Leagues that don't track money see no accounting UI. Leagues that do get real financial tracking — not spreadsheets.

### 17.2 Accounting configuration

| Field | Default | Notes |
|---|---|---|
| `accountingEnabled` | false | Master switch |
| `entryFeeAmount` | 0.00 | Per-franchise league fee |
| `feeWaiverAdd` | 0.00 | Per-transaction fee for waiver add |
| `feeWaiverDrop` | 0.00 | |
| `feeFcfsAdd` | 0.00 | |
| `feeFcfsDrop` | 0.00 | |
| `feeTradeGive` | 0.00 | Per asset given up in trade |
| `feeTradeReceive` | 0.00 | Per asset received in trade |
| `feePerTradeEnvelope` | 0.00 | Flat per-trade fee per franchise involved |
| `feeIrActivate` | 0.00 | |
| `feeIrDeactivate` | 0.00 | |
| `feeTaxiPromote` | 0.00 | |
| `feeTaxiDemote` | 0.00 | |
| `creditWeeklyWin` | 0.00 | Weekly H2H win credit |
| `debitWeeklyLoss` | 0.00 | |
| `creditWeeklyHighScorer` | 0.00 | |
| `debitWeeklyLowScorer` | 0.00 | |
| `blockActionsBelowBalance` | null | If set, block specified actions when balance ≤ threshold |

### 17.3 Accounting ledger

Every financial event creates an entry:

| Field | Type |
|---|---|
| `id`, `leagueId`, `franchiseId` | UUID |
| `eventType` | enum |
| `amount` | decimal(10,2) (positive = credit, negative = debit) |
| `referencedTransactionId` | UUID (nullable) |
| `description` | string |
| `createdAt` | timestamp |

A franchise's balance at any time is the sum of all entries.

### 17.4 Early buy-in for future picks

A rule some leagues enforce (including Charlie's FLAG): trading a future high pick requires paying the next season's dues immediately, or the trade reverses.

**Configuration:**
| Field | Default | Notes |
|---|---|---|
| `earlyBuyInEnabled` | false | Master switch |
| `earlyBuyInMaxRound` | 3 | Picks in this round or earlier trigger buy-in |
| `earlyBuyInDeadlineDays` | 7 | Days after trade for buy-in; trade reverses if unpaid |

When a qualifying trade is accepted, the system:
1. Computes the buy-in amount (next season's entry fee).
2. Creates a pending charge on the trading franchise's accounting balance.
3. Sets a deadline.
4. If unpaid at deadline, reverses the trade and records the violation.

### 17.5 External payment integration

**LeagueSafe** is the primary integration. The commissioner links the league to LeagueSafe; owners pay entry fees through LeagueSafe's interface. XO Play:
- Shows payment status per franchise (paid / unpaid / partial)
- Locks league actions for unpaid franchises when configured
- Distributes payout at season end based on `payoutStructure`

**Payout structure entity:**
| Field | Type |
|---|---|
| `placement` | string | "Champion," "Runner-up," "Regular season points leader," "Bye winner," "Division winner," "Wildcard winner" |
| `amount` | decimal(10,2) | Fixed amount OR percentage of pot |
| `conditions` | JSON | Which bracket, which conference, etc. |

Example (from Charlie's FLAG):
- 32 × $40 = $1,280 total pot
- MFL fees: $140
- Champion: $325
- Runner-up: $175
- Most overall points through regular season: $50
- Top playoff team each conference (bye earners): $70
- Each other division winner: $50 × 6
- Each wildcard winner: $25 × 6

---

## 18. Live Scoring & Real-Time Data

### 18.1 Design principle

**Real-time is the hot path; everything else is eventual.** During NFL games, scoring must update with <30 second latency. Outside of game windows, batch processing is acceptable.

### 18.2 Data ingestion pipeline

```
sportsdata.io (polling or push)
  ↓
Raw stats queue
  ↓
Player score computation (per-league, per-player)
  ↓
Franchise score computation (per-league, per-matchup)
  ↓
Cache update (fast read for UI)
  ↓
Push to connected clients (WebSocket)
```

### 18.3 Polling cadence

During game windows (Thursday 8pm ET through Monday midnight ET):
- Stats polled every 15 seconds
- Injury status polled every 60 seconds
- Lineup validation runs every 60 seconds

Outside game windows:
- Stats polled every 5 minutes (for ongoing corrections)
- Injury status polled every 15 minutes
- Lineup validation runs on-demand

### 18.4 Live scoring UI

A "Gameday" view per franchise shows:
- Current matchup (this franchise vs. opponent)
- Live score with each scoring play animating in
- Per-player scoring breakdown (tap a player for detailed stat contributions)
- Win probability (computed live)
- Time remaining in each NFL game
- Notifications: TDs, big plays, injuries to rostered players

### 18.5 Win probability

Computed using a simple simulation-based approach:
- Remaining players' projected points (from sportsdata.io projections, scaled by time elapsed in their NFL game)
- Monte Carlo over N=10,000 simulations
- Result: probability of each franchise winning the matchup

### 18.6 Notifications

Owners can subscribe to notifications for:
- Their roster: scoring plays, injuries, status changes
- Their matchup: lead changes, big plays
- League: transactions by other owners, trade proposals received, waiver results, message board activity

Delivery channels: in-app (web push), email, SMS (opt-in).

### 18.7 Data correction handling

When sportsdata.io issues a stat correction (typical Wednesday after Sunday games):
- System recomputes affected player scores
- Recomputes affected matchups
- Updates standings
- Fires `STATS_CORRECTION` event
- Sends notification to owners of affected matchups if the outcome changed

### 18.8 Fault tolerance

If sportsdata.io feed is delayed or interrupted:
- System shows last-known-good data with a "Data delayed" indicator.
- Scheduled actions (waiver processing, lineup locks) continue using last-known data.
- Commissioner receives an alert.
- Once feed recovers, automatic reconciliation.

---

## 19. Narrative & Editorial Layer (Differentiation)

### 19.1 Design principle

**Narrative is the XO Play differentiator, but it is scoped as a post-foundation phase.** The core data model and all features above this section must be production-ready before narrative goes live. This is consistent with Charlie's stated build order: solid data foundation → AI features on top.

### 19.2 Narrative content types

| Type | Frequency | Source data | Example |
|---|---|---|---|
| Daily headline | Daily during season | Roster, stats, transactions, injuries | "Chase goes off in Seahawks' wild comeback" |
| Matchup preview | Weekly | Both rosters, recent form, rivalry history | "Eagles and Cowboys renew their rivalry after Dallas's week-2 upset" |
| Matchup recap | Weekly post-game | Final scores, key plays | "Eagles fall short despite Chase's 38-point eruption" |
| Player storyline | As events occur | Breakout games, injuries, trades involving player | "Rhamondre Stevenson is emerging as the Seahawks' RB1" |
| Trade coverage | On trade | Players, picks, franchise context | "Bears pull off offseason's biggest shake-up" |
| Waiver roundup | Weekly | All waiver results | "Top waiver pickups of Week 6" |
| Power rankings article | Weekly | Standings, recent performance | "Why the Dolphins are untouchable at #1" |
| Draft recap | Post-draft | All picks | "Grading every franchise's rookie class" |
| Auction retrospective | Post-auction | All awarded contracts | "Biggest auction bargains and busts" |
| Offseason summary | Post-rollover | Contract changes, tags, drops | "Seahawks enter 2027 with $167 in cap room" |

### 19.3 Narrative tone system

Each league has a **commissioner-default tone** with **owner-override** on their own franchise page. Tone is a set of style parameters:

| Parameter | Values |
|---|---|
| `voice` | `NEWSPAPER` (AP-style, neutral) / `HOMER` (cheers for specific team) / `ROAST` (sarcastic, edgy) / `NOIR` (moody, metaphor-heavy) / `SPORTSTALK` (radio-host) / `CUSTOM` |
| `intensity` | `SUBTLE` / `MODERATE` / `HEIGHTENED` |
| `length` | `BRIEF` (1–2 paragraphs) / `STANDARD` (3–5) / `FEATURE` (long-form) |
| `humor` | `NONE` / `LIGHT` / `MODERATE` / `HEAVY` |
| `references` | `STRAIGHT` (sports only) / `POP_CULTURE` / `HISTORICAL` |

The tone applies to AI content generation as a system prompt layer. Owners can override tone for articles published on their franchise page; commissioner tone applies to league-wide content (power rankings, league-level recaps).

### 19.4 Content safety

AI-generated content must pass:
- Toxicity filter (no slurs, threats, personal attacks)
- Factual check (scores, stats, names match source data)
- Character validation (references to real NFL players only; no invented events)

Content with low confidence is flagged for commissioner review before publishing.

### 19.5 Narrative data requirements

For narrative generation to be coherent, the system needs:
- **Rivalry context:** cross-season head-to-head records, memorable past matchups
- **Player context:** a player's history with a franchise (draft info, contract history, performance trajectory)
- **Franchise context:** recent trades, draft haul, cap situation, playoff history
- **Owner context:** name, communication style (for quoted "owner reactions")

Much of this is derivable from existing data tables; some (owner communication style) is opt-in commissioner/owner input.

### 19.6 Delivery surfaces

Generated narrative appears on:
- **Team newspaper** (franchise home page's narrative view)
- **League front page** (headline stories)
- **Email digest** (daily or weekly)
- **Push notifications** (major events only)

### 19.7 Opt-out and moderation

Owners can opt out of narrative on their franchise page (shows stats only). Commissioners can:
- Disable narrative league-wide
- Enable narrative but require commissioner approval before publishing
- Mark specific generated content as "inappropriate" for feedback / retraining

### 19.8 Narrative is NOT in v1

To be explicit: **v1 of XO Play ships without AI-generated narrative.** The narrative layer is v2. v1 ships with the full data model, tier system, and all §3–§18 functionality, plus basic commissioner-authored newsletter and article surfaces. Narrative system builds on top once the data foundation is stable.

---

## 20. Data Model Summary

### 20.1 Core entities

```
User
  └── owns → Franchise (many-to-many)

League
  ├── has → Conference (0..2)
  │   └── has → Division (0..N)
  │       └── has → Franchise (N)
  ├── has → ScoringRule (many)
  ├── has → CalendarEvent (many)
  ├── has → Season (one current, many historical)
  └── has → PayoutStructure (one per season)

Franchise
  ├── belongs to → League
  ├── has owners → User (many-to-many)
  ├── has → Contract (many, current season)
  ├── has → RosterEntry (many, current)
  ├── has → WaiverClaim (many, current)
  ├── has → TradeProposal (both as proposer and receiver)
  ├── has → AccountingEntry (many)
  └── has → FranchiseAbilities (1, JSON-modeled)

Player
  ├── external_id → sportsdata.io ID
  ├── has → Contract (many, across leagues)
  ├── has → Stats (per week, per season)
  └── has → InjuryStatus (current)

Contract
  ├── belongs to → Franchise
  ├── refers to → Player
  ├── tracks → contractYears, baseSalary, status, rosterBucket
  └── triggers → SalaryAdjustment on drop

Transaction (polymorphic)
  ├── AddDropTransaction
  ├── WaiverTransaction
  ├── TradeTransaction
  ├── IrTransaction
  ├── TaxiTransaction
  ├── AuctionTransaction
  └── DraftPickTransaction

Matchup
  ├── belongs to → League, week, seasonYear
  ├── has → Franchise (away) and Franchise (home) [or all-play: all franchises]
  ├── has → LineupEntry (per franchise, per player)
  └── computes → score

DraftPick
  ├── belongs to → originalFranchise, currentFranchise
  ├── scoped to → season, round, pickInRound
  └── becomes → Contract when pick is made

Auction
  ├── per league, per season
  └── has → Bid (many), AuctionPlayerState (many)

Stats
  ├── playerId, seasonYear, week
  └── [full stat type fields per §6.3]
```

### 20.2 Key derived/computed fields

- `Franchise.capUsage` (derived from contracts + adjustments)
- `Franchise.capRoom` (derived from cap − usage)
- `Franchise.record` (derived from matchups)
- `Franchise.standingsPosition` (derived from standings criteria)
- `Franchise.lastSeenAt` (tracked via page load events)
- `League.currentWeek` (derived from NFL schedule + league calendar)
- `Matchup.score` (derived from lineup + stats + scoring rules)
- `Matchup.winProbability` (derived live during game)
- `Player.fantasyPoints` (per league, per week — derived from stats × scoring rules)

### 20.3 Event sourcing for transactions

All transactions are append-only. To reverse a trade, we don't mutate the original trade record — we create a compensating `TRADE_REVERSAL` transaction. This preserves the audit trail and makes "as-of" queries (what did the rosters look like on October 3rd?) possible.

### 20.4 Serialization constraints

- Contract records MUST NOT contain circular references to Franchise (store FK only).
- JSON fields (`franchiseAbilities`, `tradeAssets`) use versioned schemas for forward compatibility.
- Historical season data is immutable once the season enters `ARCHIVED` status.

---

## 21. Cross-Tier Standardization & National Prizes

### 21.1 The vision

Within each tier, XO Play offers a small number of **Standardized Variants** — fixed-rule configurations that make cross-league comparison meaningful. Leagues that adopt a standardized variant qualify for national prizes (XO Play-run competitions across all leagues using that variant).

### 21.2 Standardized variant entity

| Field | Type |
|---|---|
| `id`, `name`, `tier`, `description` | primary |
| `scoringRuleSet` | JSON (immutable per variant) |
| `rosterStructure` | JSON (immutable) |
| `startingLineup` | JSON (immutable) |
| `playoffFormat` | JSON (immutable) |
| `seasonLength` | int |
| `otherLockedSettings` | JSON |
| `allowedDeviations` | JSON (the narrow settings a league can customize within the variant) |

### 21.3 Example variants (v1 candidates)

**Tier 1 — Redraft Variants**
- **XO Classic** — 12-team, standard PPR, 15-round draft, standard lineup (1QB/2RB/2WR/1TE/1Flex/1DEF/1K), 3-round playoffs.
- **XO Superflex** — 12-team, PPR, superflex eligible, 2-QB capable.
- **XO Best Ball** — 12-team, PPR, 20-round draft, auto-optimized lineups, no roster changes post-draft.

**Tier 2 — Keeper Variants**
- **XO Keeper 3** — 12-team, 3 keepers, 2-year max retention, PPR.

**Tier 3 — Dynasty Variants**
- **XO Dynasty Classic** — 12-team, full dynasty, no salary cap, 1-round rookie draft per year.
- **XO Dynasty Cap** — 12-team, full dynasty with $200 cap, 5-year contracts, 3-round rookie draft.
- **XO Dynasty IDP** — 14-team, full dynasty with IDP, deep IDP scoring, 8-round rookie draft.

### 21.4 Compliance tracking

For each league using a standardized variant, the system continuously verifies:
- Are scoring rules unchanged from variant?
- Is roster structure unchanged?
- Is playoff format unchanged?

Drift from the variant (commissioner changes something) drops the league from the variant's national pool.

### 21.5 National prize pool

For each variant in each season, XO Play operates a national prize pool funded by:
- Entry fees from leagues that opt in (optional)
- Platform sponsorship revenue (subject to business deal)

Prizes are awarded to top-performing franchises across all leagues using the variant.

### 21.6 Competition format

Several formats possible:
- **Cumulative points leaderboard** — top N franchises across all variant-leagues by cumulative season points.
- **Playoff champions** — playoff winners from each variant-league enter a "champion of champions" tournament (played as a hypothetical matchup using stored rosters).
- **Week-by-week leaderboard** — highest scoring franchise each week gets a prize.

v1 launches with the cumulative points leaderboard only (simpler to operationalize).

### 21.7 This is post-v1

Standardized variants ship in v2 or later. v1 supports custom league configuration fully but does not offer national prize pools.


---

## 22. Edge Cases & Rules

This section documents explicit handling for boundary conditions, ambiguity, and scenarios that break the default flow.

### 22.1 Player position changes mid-season

**Scenario:** sportsdata.io reclassifies a player mid-season (e.g., DE → DT).

**Behavior:**
- Player's `position` field updates on next sync.
- All existing Contract records reflect updated position automatically (position is derived from Player, not copied).
- Historical scoring is recomputed ONLY IF a scoring rule would now apply differently (e.g., LB tackles at 1.5 vs. DE at 2.5).
- Lineup validation: if the new position violates starting lineup requirements (e.g., team has 4 DTs now and max is 4, and one was reclassified from DE), owner is warned but lineup is not auto-corrected.
- Narrative generation: a `POSITION_CHANGE` story may fire.

### 22.2 Injury status transition to/from IR

**Scenario:** A player on active roster becomes OUT, then IR, then HEALTHY.

**Behavior:**
- `OUT` status: no forced action; owner may choose to IR.
- `IR` status: owner sees prompt to IR the player; cap relief applies if IR'd.
- `HEALTHY` transition while player is on IR: system warns owner — player must be activated or dropped before lineup lock, or owner faces an IR violation.
- If not activated by lineup lock time: `irBlockLineupOnViolation` setting determines whether lineup submission is blocked.

### 22.3 Orphan franchise during active season

**Scenario:** Owner quits mid-season, franchise becomes `ORPHANED`.

**Behavior:**
- All pending transactions for the franchise (waiver claims, trade proposals as proposer) are auto-cancelled.
- Pending trade proposals as receiver: auto-rejected.
- Lineup carries over from the last valid submission. If no valid submission exists, `autoPickFranchises` behavior applies: projected-best-lineup is filled automatically.
- Commissioner may assign a temporary manager or new owner.
- New owner, per Charlie's bylaws example, may receive "amnesty drops" (commissioner configures count, default 5). These are free drops that don't incur cap penalty.

### 22.4 Orphan franchise during offseason

**Scenario:** Owner quits between seasons.

**Behavior:**
- Franchise held as `ORPHANED`.
- Commissioner recruits replacement; new owner inherits the roster.
- Amnesty drops available if configured.
- No penalty applied to the franchise for the previous owner's actions.

### 22.5 League dues not paid

**Scenario:** A franchise hasn't paid the league fee.

**Behavior (configurable):**
- Warning only (default).
- Block lineup submission.
- Block all transactions.
- Commissioner-initiated forfeit (franchise records count as losses).

### 22.6 Dormant owner detection

A franchise is **dormant** if `lastSeenAt` is more than N days in the past (commissioner-configurable, default 21). Effects:
- Commissioner alert sent.
- On lineup deadline, last valid lineup carries over.
- After M consecutive dormant weeks (default 3), commissioner can trigger an "inactive owner" flow: warning, temp manager, or removal.

### 22.7 Trade involving a locked player

**Scenario:** Two owners agree to a trade that includes a player whose NFL game has kicked off.

**Behavior:**
- Trade proposal is rejected with error: "Cannot trade locked players."
- Once the player's game ends (or the weekly kickoff-to-end-of-week period expires), trade becomes eligible.

### 22.8 Auction bid submitted after auction close

**Scenario:** Owner clicks "Bid" moments before auction closing; race condition.

**Behavior:**
- Server timestamp is authoritative.
- If the server receives the bid before the auction closing moment, bid is accepted and auction timer may reset (per `playerAuctionExpirationHours`).
- If bid arrives after close, it's rejected with "Auction has closed."

### 22.9 Salary cap violation at lineup time

**Scenario:** Franchise exceeds hard cap (through commissioner edit, or through roster bucket change mid-season).

**Behavior:**
- Lineup submission is blocked if `blockLineupWhenOverCap = true`.
- Owner sees cap violation banner with instructions to drop a player or request commissioner adjustment.
- Commissioner can grant a temporary exemption.

### 22.10 Contract year rollover for frozen player

**Scenario:** Player retires (or is cut by NFL team) mid-season. Contract is still active.

**Behavior:**
- Contract remains on franchise's cap until the owner drops the player.
- Drop penalty applies per §7.8 unless the commissioner grants a "retirement amnesty."
- System offers a "retirement amnesty" button that drops the player with zero penalty, logged as such.

### 22.11 Missed draft pick

**Scenario:** Owner's timer expires without a pick; auto-pick chain fails.

**Behavior:**
- Pick is skipped per league setting.
- Commissioner is notified.
- Commissioner can resolve via "Change Pick" after draft.
- Per Charlie's bylaw: missed rookie picks that are auto-filled get the salary that the original pick position would have earned.

### 22.12 Rookie contract assignment deadline

**Scenario:** Owner drafts a rookie but doesn't assign them to taxi/active or specify contract length within 48 hours.

**Behavior:**
- Default applied: rookie goes to active roster with 1-year contract.
- Commissioner alerted.
- Owner can still correct within a grace window (configurable, default 72 hours total from draft).
- Per Charlie's bylaw, no penalty for late assignment beyond the default being applied.

### 22.13 Franchise tag on an uncommon player

**Scenario:** Owner tries to franchise-tag a player whose expiring contract is below the calculated tag value (not economically logical, but legal).

**Behavior:**
- System warns: "Tag value ($15.87) is higher than player's current salary ($3.50). Confirm?"
- Owner confirms; tag applies.
- Contract updates to tag value for 1 year.

### 22.14 Attempt to trade a franchise-tagged player

**Scenario:** Owner wants to trade a player they've just tagged.

**Behavior:**
- Trade is allowed. Tag transfers with the player (acquiring team receives the tagged contract).
- Acquiring team cannot re-tag the player (anti-exploit rule).
- After the 1-year tag expires, player is a normal free agent (acquiring team can re-sign normally).

### 22.15 League schedule change after divisional realignment

**Scenario:** Commissioner changes division assignments mid-offseason after schedule was generated.

**Behavior:**
- Warning displayed: "Realigning divisions does not auto-regenerate the schedule."
- Commissioner must re-select packaged schedule or regenerate manually.
- If left unchanged, the schedule reflects the old divisional alignment.

### 22.16 Transfer rosters with existing roster data

**Scenario:** Commissioner attempts to transfer previous year's rosters into the new season, but the new season's rosters already contain drafted or added players.

**Behavior:**
- Operation blocked.
- Error: "Cannot transfer rosters — current rosters have players. Clear rosters first."
- Commissioner must run "Clear Rosters" before retrying.

### 22.17 Custom player merge with feed player

**Scenario:** Commissioner created a custom player for a pre-release rookie. Two weeks later, sportsdata.io adds that rookie with an official ID.

**Behavior:**
- Commissioner sees a "Potential match" suggestion on the Custom Players screen.
- Commissioner can merge: custom record's Contract and roster assignment transfer to the feed-backed record.
- After merge, stats automatically populate from feed.
- If not merged, custom player persists as an unofficial entity.

### 22.18 Tier change locked during season

**Scenario:** Commissioner wants to upgrade Redraft to Dynasty mid-season.

**Behavior:**
- Blocked. Error: "Tier changes are only allowed during offseason."
- Option: commissioner can prepare the new configuration, save as a draft, and apply at rollover.

### 22.19 Remove owner who never accessed franchise

**Scenario:** Commissioner wants to remove an invited owner who hasn't accepted the invite.

**Behavior:**
- The "Remove Owner" action is disabled for pending invitees.
- Commissioner uses "Revoke Invitation" instead.
- After revoke, the invitation record is expired and a new invite can be sent to a different person.

### 22.20 Zero-dollar salaries in strict leagues

**Scenario:** Commissioner manually edits a player's salary to $0.00, below league minimum.

**Behavior:**
- Warning: "Salary is below league minimum of $0.50. Confirm?"
- If commissioner confirms, salary is set (commissioner override allowed).
- If left unconfirmed, salary clamps to minimum.

### 22.21 Stacked multi-year rookie penalty (Future — Not in V1)

Some leagues want cut penalties that amortize across future seasons (not just the current season). This is a complex configuration that requires cap projection across seasons. Placeholder for v2.

### 22.22 Inter-league player trades (Future — Not in V1)

Some national-prize leagues might allow player trades across leagues (e.g., between two leagues using the same standardized variant). Placeholder — not in v1.

---

## 23. Relationship to External Systems

### 23.1 sportsdata.io (primary data source)

| Surface | Dependency |
|---|---|
| Player stats (weekly) | Primary source for all scoring computation |
| Player injury status | Drives IR eligibility and owner notifications |
| Player news | Optional feed for player news articles |
| Player headshots | Used in UI |
| NFL schedule | Used to determine weeks, kickoff times, lineup locks |
| Player ADP | Used for auto-pick fallback in drafts |
| Projections | Used for win probability, Gameday UI, and optional expert-rank auto-pick fallback |

**Failure mode:** If sportsdata.io is unreachable, XO Play uses last-known-good cached data. Scoring pauses, but owners can still view historical data. Commissioner is alerted. Automated actions that depend on live stats (e.g., stat-correction-triggered score recomputation) are queued until the feed returns.

### 23.2 LeagueSafe

| Surface | Dependency |
|---|---|
| Entry fee collection | Secondary; optional league integration |
| Payout distribution | At season end |
| Balance tracking | Displayed in accounting UI |

Not required for XO Play core functionality; leagues can track accounting manually without LeagueSafe.

### 23.3 Email / SMS provider

Used for:
- Invitations (email/SMS)
- Notifications (email, per owner preference)
- Weekly newsletters

Email must support templating and unsubscribe links (legally required). SMS used only for opted-in notifications.

### 23.4 Push notifications

Web push and (future) native mobile push for real-time events (scoring plays, trade proposals, waiver results).

### 23.5 Social/embed providers

YouTube and Twitter/X embeds supported in trash-talk video and custom HTML modules. No direct API integration beyond embed-level.

### 23.6 No direct interaction with

These are explicitly OUT of XO Play's scope and it must never expose or imply interaction with:
- Sports betting platforms
- DFS (daily fantasy) platforms
- College football scouting services (v1)
- Other fantasy platforms' data (no import from MFL/Sleeper/ESPN/Yahoo in v1 beyond manual CSV)

### 23.7 LLM provider (narrative only, v2+)

For narrative generation in v2. The LLM provider is a commodity integration point — the system must work with any OpenAI-compatible API (OpenAI, Anthropic, Azure, etc.). No single provider lock-in.

---

## 24. Build Sequence

### Phase 1 — Foundation (backend / no UI)

The data model and scoring engine must be stable before anything else is built.

1. User, League, Franchise, Division, Conference entities with full schema
2. Player entity + sportsdata.io sync job (daily baseline, cache layer)
3. Roster entity + bucket transitions (Active/IR/Taxi)
4. Contract entity + cap math
5. ScoringRule entity + scoring engine (batch-mode, retroactive)
6. Stats entity + historical ingestion
7. Matchup entity + schedule generation
8. Standings computation
9. Unit tests for every scoring formula, cap calculation, penalty formula
10. Integration test: replay a full past NFL season through the system, verify scores match expected fantasy totals

### Phase 2 — Tier-specific rules (backend)

Each tier gets its specific configuration and rule enforcement.

1. Redraft preset + validation (tier=REDRAFT)
2. Keeper logic + keeper selection flow
3. Dynasty preset + full cap/contract rule engine
4. Rookie salary scale + franchise tag computation
5. Annual offseason rollover logic
6. Drop penalty computation
7. Standardized variant schema (configuration only, not user-facing)

### Phase 3 — Transactions (backend)

1. Add/Drop + waiver processing
2. Blind bid processing algorithm
3. Trade workflow (immediate, commissioner review, league vote)
4. IR/Taxi move workflows
5. Draft pick entity + pick trading
6. Auction workflow + bid processing
7. Accounting ledger

### Phase 4 — UI foundation (frontend)

1. Design system (already partially in flight per nextgm-design-system skill)
2. League home page shell
3. Franchise home page shell
4. Roster view
5. Lineup submission
6. Add/Drop UI
7. Trade UI
8. Draft room
9. Auction room
10. Commissioner tools (setup, franchise management, rule edits)
11. Reports (standings, transactions, top performers)
12. Mobile responsive layouts

### Phase 5 — Live scoring (backend + frontend)

1. sportsdata.io real-time polling
2. WebSocket push layer
3. Live scoring UI (Gameday view)
4. Win probability computation
5. Notification system (in-app, email, SMS)

### Phase 6 — Social & history (backend + frontend)

1. Message board
2. League chat
3. Polls
4. Articles
5. Newsletter composition and delivery
6. History tracking and archival
7. Awards

### Phase 7 — Polish & launch (all)

1. Onboarding flow for commissioners (tier selector, setup wizard)
2. League creation flow
3. Invitation flow
4. LeagueSafe integration
5. Custom skinning / appearance settings
6. Mobile web optimization
7. Performance testing at scale (simulated 100 concurrent leagues during NFL games)
8. Beta with a small set of real leagues (Charlie's FLAG + 2–3 others)
9. Public launch

### Phase 8 — Narrative layer (v2)

1. LLM integration (abstracted provider)
2. Prompt engineering + tone system
3. Content safety / toxicity filter
4. Fact-check layer
5. Publishing workflow (auto-publish, commissioner-review modes)
6. Delivery surfaces (newspaper view, email digest, push)
7. A/B testing framework for narrative quality

### Phase 9 — Standardized variants & national prizes (v2+)

1. Variant schema enforcement
2. Cross-league leaderboard
3. National prize pool administration (business/legal)
4. Variant launch with 1–2 standardized configurations

---

## 25. Files Affected (Summary)

This is an all-new project. Expected top-level structure:

| Path | Purpose |
|---|---|
| `schemas/` | Postgres migrations; one file per entity introduction |
| `src/engine/scoring/` | Scoring engine |
| `src/engine/cap/` | Salary cap and contract math |
| `src/engine/transactions/` | Waiver processing, trade workflow, draft/auction engines |
| `src/engine/calendar/` | Scheduled job runner, calendar event fulfillment |
| `src/engine/ingest/` | sportsdata.io ingestion |
| `src/api/` | REST/GraphQL endpoints |
| `src/realtime/` | WebSocket layer for live scoring |
| `src/web/` | Next.js (or equivalent) web UI |
| `src/narrative/` | v2 LLM layer |
| `tests/fixtures/` | Test data, including Charlie's FLAG replayed seasons |
| `docs/Spec_XOPlay_PRD.md` | This document |
| `docs/Spec_XOPlay_Narrative.md` | v2 narrative spec (separate) |
| `docs/Spec_XOPlay_StandardizedVariants.md` | v2 variant spec (separate) |

---

## 26. Open Questions

Items that require product decisions before or during build.

### 26.1 Pricing model

Is XO Play subscription (commissioner pays monthly/yearly), per-league (one-time or seasonal), or free with premium features? This affects the commissioner onboarding flow and billing integration but does not affect the data model.

### 26.2 Custom scoring rule authoring UI

How deep should the commissioner be able to go in editing scoring rules? Full rule editor (like MFL), tier-bound (can only toggle presets), or middle ground (can edit within certain bounds)? Affects Phase 2 scope.

### 26.3 Narrative tone defaults

What are the 3–5 canonical tones shipped out of the box? (SPORTSWRITER, HOMER, ROAST, etc.) Affects narrative launch quality.

### 26.4 Commissioner AI assistant

Should XO Play offer an AI "commissioner's assistant" that answers questions like "how much cap room does each team have?" or drafts rule clarifications? Powerful differentiator but adds scope.

### 26.5 Free agent contract assignment window

Default 48 hours (per MFL). Should this be configurable per league, or standardized across the platform?

### 26.6 Multi-sport roadmap

v1 is NFL only. v2+ might include NBA, MLB, soccer. The data model should be sport-agnostic at the entity level (Player, Contract, Stat, ScoringRule) but v1 need not be proven against other sports.

### 26.7 Public league discovery

Should XO Play host a "Find a league" feature where commissioners can post open leagues and users can browse? Not in v1 per §1.3, but a future consideration.

### 26.8 Franchise branding depth

MFL allows URL-uploaded logos, team colors, and custom images on the home page. XO Play should at minimum match this. Do we offer built-in logo generation (AI, or template-based)? Affects Phase 7 scope.

---

**END OF SPECIFICATION**

*This is version 0.1. Significant open questions remain (see §26). Expected next revision: 0.2 after tier-level user flow mockups are complete, incorporating specific UI decisions that affect data model (e.g., whether franchise abilities are per-action-type or per-feature).*

