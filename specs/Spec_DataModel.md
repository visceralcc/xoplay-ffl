# XO Play — Data Model Specification

**Canonical reference for every entity, relationship, and enum in the XO Play platform**

Version 0.1 | April 2026 | Charlie Denison | XO Play (xoplay.co)

**CONFIDENTIAL**

---

**Status:** Draft
**Parent:** [Spec_XOPlay_PRD.md](../Spec_XOPlay_PRD.md) (especially §3–§17 for entity definitions and §20 for data model summary)
**Related specs:** `foundation/Spec_Tiers.md`, `scoring/Spec_ScoringEngine.md`, `salary-cap/Spec_ContractsAndCap.md`, `transactions/Spec_TransactionEngine.md`
**Last updated:** April 2026

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | Apr 2026 | Initial consolidation. All entities from PRD §3–§17 gathered into a single reference, with join entities, JSON field shapes, cross-entity constraints, and enum tables added. |

---

## 1. Purpose

This document is the single source of truth for the XO Play data model. Every other spec in the project — scoring, salary cap, transactions, draft, auction, live scoring, narrative — will reference the entities, relationships, and enums defined here.

The PRD (`Spec_XOPlay_PRD.md`) introduces entities scattered across ~20 sections as needed to explain feature behavior. This spec consolidates those definitions in one place, adds the join entities and JSON field shapes the PRD leaves implicit, and makes explicit which concepts are entities versus which are configuration fields on existing entities.

**What this document is.** A lookup reference. If another spec needs to know what fields a `Contract` has, what enum values `status` can take, or how `Trade` connects to `Contract`, the answer is here.

**What this document is not.** Business logic, formulas, algorithms, or UI behavior. Those belong in feature-level specs. The data model describes *shape*, not *behavior*.

---

## 2. Design Principles

The data model follows a small number of non-negotiable conventions. Every entity definition in §4 conforms to these.

### 2.1 Identifiers are UUIDs, always

Every entity's primary key is a UUID (v4). No auto-incrementing integers, no natural keys as primary keys, no composite primary keys. Foreign keys are always UUIDs pointing at another entity's `id`.

**Why.** UUIDs allow records to be created client-side before server round-trip (useful for optimistic UI), allow sharding without coordination, and prevent ID collisions across environments (dev/staging/prod).

**Exception.** External IDs from sportsdata.io are stored as strings in an `externalId` field alongside the internal UUID — never used as the primary key. Draft pick `overallNumber`, season year, round, and similar derived identifiers are stored as integers for convenience but are not primary keys.

### 2.2 Timestamps are UTC with timezone, stored to the second

Every entity has `createdAt` and (where mutable) `updatedAt` as `timestamp with time zone`. All timestamps are persisted in UTC. Display conversion happens at the presentation layer using the League's or User's IANA timezone.

**Why.** Dynasty leagues span years; daylight saving transitions and timezone moves break naïve local-time storage.

### 2.3 Foreign keys are named `<entity>Id`

A foreign key to `Franchise` is `franchiseId`. A foreign key to `User` is `userId`. A foreign key to `Player` is `playerId`. No exceptions. When an entity has two foreign keys to the same target, disambiguate with a prefix: `proposerFranchiseId`, `receiverFranchiseId`.

### 2.4 Soft enums, not magic strings

Every field with a finite set of discrete values is an enum, defined in §5 and referenced by name. Enum values use `SCREAMING_SNAKE_CASE`. The database stores the string value (not an integer code), so that ad-hoc queries are human-readable.

### 2.5 Event sourcing for transactions; state for everything else

Transactions — the things that change rosters, contracts, cap space, or league dues — are append-only. Reversing a trade does not mutate the original `Trade` record; it creates a compensating `TRADE_REVERSAL` record. The original is preserved for audit and for "as-of" queries ("what did the Seahawks' roster look like on October 3rd?").

Non-transactional state — League configuration, Franchise branding, Scoring rules, Calendar events — is mutable. These are read-heavy, rarely-audited records where an update-in-place is acceptable. Commissioner rule changes that matter for audit are recorded separately in a future `ConfigChangeLog` entity (placeholder, not in v1).

### 2.6 Denormalize sparingly, and only for the hot path

A few fields are denormalized for performance on paths that run during live games — `Contract.currentRosterBucket` is copied from the roster state to avoid a join on every cap calculation. These denormalized fields must be kept consistent by the write path (transaction handlers own this). Every denormalized field is explicitly called out in the entity definition.

### 2.7 JSON fields are versioned and schema'd

Some fields are JSON blobs (`abilities`, `tradeAssets`, `startingLineup`). Each JSON field has a documented shape (see §4) and includes a `schemaVersion` integer at its root. When the shape changes, the version increments and read code handles both shapes during migration.

**Constraint.** JSON fields must be serializable — no circular references, no class instances, only primitive values, arrays, and plain objects. This applies to all JSON state in the system.

### 2.8 Historical immutability after archive

Once a League's `status` transitions to `ARCHIVED`, all its entities become read-only. No mutations allowed, even by superusers, without an explicit "unseal" action logged as an event.

### 2.9 What is NOT an entity

The following are *configuration fields* on existing entities, not separate entities. This is called out explicitly because it's the most common modeling question during this spec's development.

| Concept | Lives as | On entity | Why not a separate entity |
|---|---|---|---|
| Salary cap settings | Fields | `League` | One set per league; no cross-league sharing; no history table needed beyond audit log |
| Scoring presets | Hardcoded constants + UI defaults | N/A (app layer) | Presets are read-once at league creation; stored rules are per-league `ScoringRule` records |
| Waiver config | Fields | `League` | Same reasoning as cap settings |
| Playoff format | Fields | `League` (for defaults) + `PlayoffBracket` (per-bracket overrides) | Brackets are the entity; format is configuration |
| Franchise abilities | JSON field `abilities` | `Franchise` | Small, fixed set of boolean flags; no need for a normalized permission table |
| League bylaws | Free text on `League` OR structured doc (future) | `League` | See PRD Gap §3.7 — structured bylaws are a v2 feature |
| Injury status | Field on `Player` | `Player` | Current status only; history is in sportsdata.io, not our system |

Conversely, these *do* become entities because they have independent lifecycle, foreign keys pointing at them, or audit/history requirements: `Contract`, `SalaryAdjustment`, `RookieSalaryScale`, `PayoutStructure`, `CalendarEvent`, `ScoringRule`, `Notification`, `Invitation`.

---

## 3. Entity Relationship Map

This map shows every entity and how it connects. Cardinalities use `1`, `0..1`, `1..*` (one-or-more), `*` (zero-or-more). Join entities are marked with `◆`.

### 3.1 High-level diagram

```
User ────owns (via FranchiseOwner ◆)──── Franchise ────belongs to──── League
                                            │                           │
                                            │                           ├── Conference (0..2)
                                            │                           │     └── Division (0..*)
                                            │                           │
                                            │                           ├── ScoringRule (*)
                                            │                           ├── CalendarEvent (*)
                                            │                           ├── RookieSalaryScale (*)
                                            │                           ├── PayoutStructure (*)
                                            │                           └── PlayoffBracket (*)
                                            │
                                            ├── Contract (*) ──── Player
                                            ├── RosterEntry (*) ── Player
                                            ├── LineupEntry (*) ── Player (per Matchup, per week)
                                            ├── DraftPick (*)
                                            ├── AccountingEntry (*)
                                            ├── SalaryAdjustment (*)
                                            ├── FranchiseAbilities (1, JSON on Franchise)
                                            ├── WaiverClaim (*)
                                            ├── Bid (*)
                                            └── participates in Trade (*, as proposer or receiver)

Trade ──── TradeAsset (*) ◆ ──── { Player, DraftPick, BBD amount, SalaryAdjustment }

Matchup ──── LineupEntry (*) ◆ ──── Player
         └── belongs to PlayoffBracket (0..1)

Transaction (abstract — polymorphic across):
  AddDropTransaction
  WaiverTransaction
  TradeTransaction
  IRTransaction
  TaxiTransaction
  AuctionTransaction
  DraftPickTransaction
  SalaryAdjustmentTransaction
  RolloverTransaction

Stats ──── Player (per week, per season)

Notification ──── User (delivery target) + source reference (polymorphic)

Invitation ──── Franchise (target) + User (invitee, after accept)

LeagueRole ◆ ──── User × League × role (`COMMISSIONER` / `CO_COMMISSIONER` / `MODERATOR`)

MessageBoardPost ──── User (author) + League
ChatMessage ──── User (author) + League + optional Franchise (DM target)
Poll ──── League + Poll options + PollVote (*)
Article ──── User (author) + League + optional Franchise (branding)
```

### 3.2 Entity categories

For navigation, entities group into these categories. Each is detailed in §4.

| Category | Entities |
|---|---|
| **Identity & access** | `User`, `Franchise`, `FranchiseOwner`, `LeagueRole`, `Invitation`, `FranchiseAbilities` (JSON) |
| **League structure** | `League`, `Conference`, `Division` |
| **Players & rosters** | `Player`, `CustomPlayer` (variant of `Player`), `RosterEntry`, `LineupEntry`, `Stats`, `InjuryStatusHistory` |
| **Scoring** | `ScoringRule`, `ScoreAdjustment` |
| **Salary cap & contracts** | `Contract`, `SalaryAdjustment`, `RookieSalaryScale`, `FranchiseSalaryCapOverride` |
| **Calendar & lifecycle** | `CalendarEvent`, `Season` |
| **Draft** | `DraftPick`, `DraftWorklistEntry`, `MyDraftListEntry` |
| **Auction** | `Auction`, `AuctionPlayerState`, `Bid` |
| **Transactions** | `Transaction` (polymorphic), subtypes listed in §4.18 |
| **Trades** | `Trade`, `TradeAsset`, `TradeVote`, `TradeComment` |
| **Waivers** | `WaiverClaim` |
| **Matchups & playoffs** | `Matchup`, `PlayoffBracket` |
| **Accounting** | `AccountingEntry`, `PayoutStructure` |
| **Social** | `MessageBoardTopic`, `MessageBoardPost`, `ChatMessage`, `Poll`, `PollOption`, `PollVote`, `Article`, `Newsletter` |
| **System** | `Notification`, `NotificationPreference`, `AuditLogEntry` |
| **Narrative (v2)** | `NarrativeContent`, `NarrativeTone` (JSON on League) — not detailed in v1, noted for completeness |
| **Standardized variants (v2)** | `StandardizedVariant`, `VariantCompliance` — not detailed in v1 |

---

## 4. Entity Definitions

Every entity is defined with: fields table (name, type, nullable, notes), relationships, constraints, and notes on JSON fields or derived state.

Conventions for the fields tables:
- **Type** uses common SQL-ish names: `UUID`, `string`, `int`, `bool`, `decimal(p,s)`, `timestamp`, `date`, `enum`, `JSON`, `string[]`, `UUID[]`. `string` without a length is presumed ≤ 255 chars; longer is called out.
- **?** column marks nullability: blank = NOT NULL, `?` = nullable.
- Every non-join entity has `createdAt` and, where mutable, `updatedAt`. These are omitted from field tables to save space unless they have unusual semantics; assume they exist.

---

### 4.1 User

A person with an XO Play account. Users may own franchises across many leagues and serve as commissioner of multiple leagues.

**PRD reference:** §4.1

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | Primary key |
| `email` | string | | Unique globally. Login identifier. |
| `displayName` | string | | Public name, ≤ 80 chars |
| `phoneNumber` | string | ? | E.164 format. Used for SMS invites and optional 2FA. |
| `timezone` | string | | IANA timezone (e.g., `America/Chicago`). Default from signup geolocation. |
| `avatarUrl` | string | ? | URL to profile image; system supplies placeholder if null |
| `emailVerifiedAt` | timestamp | ? | Null until email is verified |
| `phoneVerifiedAt` | timestamp | ? | Null until phone is verified |
| `lastLoginAt` | timestamp | ? | Updated on each successful login |

**Relationships:**
- Owns Franchises via `FranchiseOwner` (many-to-many)
- Holds `LeagueRole` records (commissioner, co-commissioner, moderator)
- Authors `Article`, `MessageBoardPost`, `ChatMessage`, `PollVote`
- Receives `Notification` records
- Target of `Invitation` (when accepted, links User to Franchise via FranchiseOwner)

**Constraints:**
- `email` unique index
- `phoneNumber` unique index when not null
- No cascading delete from User — a deleted user becomes `deletedAt`-timestamped; historical attribution is preserved

---

### 4.2 League

The top-level container for a fantasy football competition. Each league has one tier, one season year cadence, and one configuration set.

**PRD reference:** §3.1 (core fields), §3.2 (structural hierarchy), §3.3 (player pool), §3.4 (tier activation), §8 (calendar), §10 (auction config), §11 (waiver config), §12 (trade config), §13 (IR/taxi config), §17 (accounting config)

The League entity is by far the largest in the system — it carries dozens of configuration fields. For readability, the fields are grouped into logical sections. Every field here lives on the single `League` row.

#### 4.2.1 League — core identity fields

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | | | Primary key |
| `slug` | string | | | URL-safe, unique globally, ≤ 60 chars |
| `name` | string | | | Display name, ≤ 80 chars |
| `tier` | enum | | | `REDRAFT` / `KEEPER` / `DYNASTY` |
| `sport` | enum | | `NFL` | Fixed to `NFL` in v1 (see PRD §1.4, §26.6) |
| `seasonYear` | int | | | NFL season year, e.g., 2026 |
| `status` | enum | | `SETUP` | `SETUP` / `ACTIVE` / `POSTSEASON` / `OFFSEASON` / `ARCHIVED` |
| `timezone` | string | | | IANA timezone |
| `commissionerUserId` | UUID | | | FK to User; primary commissioner |
| `scoringDecimalPlaces` | int | | 2 | 1 or 2 |

#### 4.2.2 League — structure fields

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `franchiseCount` | int | | | 4–32; must be even if `scheduleMode = HEAD_TO_HEAD` |
| `conferenceCount` | int | | 0 | 0, 1, or 2. Requires `franchiseCount >= 8` and `divisionCount >= 4` if ≥ 1. |
| `divisionCount` | int | | 0 | 0, 2, 4, 6, or 8 |
| `playerPoolIsolation` | enum | | `SHARED_LEAGUE` | `SHARED_LEAGUE` / `ISOLATED_PER_CONFERENCE` |
| `scheduleMode` | enum | | `HEAD_TO_HEAD` | `HEAD_TO_HEAD` / `ALL_PLAY` / `TOTAL_POINTS_ONLY` |
| `initialRosterMode` | enum | | `DRAFT` | `DRAFT` / `AUCTION` / `DRAFT_AND_AUCTION` / `THIRD_PARTY_DRAFT` / `MANUAL_LOAD` |

#### 4.2.3 League — roster structure fields

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `rosterSpots` | int | | | In-season active roster cap; 1–100 |
| `rosterSpotsOffseason` | int | ? | | Optional larger cap for offseason window (see PRD §7.15) |
| `irSpots` | int | | 0 | 0–30 |
| `taxiSquadSpots` | int | | 0 | 0–20 |
| `totalStarters` | int | | 9 | Target starter count |
| `startingLineup` | JSON | | | Per-position min/max. See §4.2.3a for shape. |
| `rosterPositionLimits` | JSON | | `{}` | Optional per-position max on active roster. See §4.2.3a. |
| `allowPartialLineups` | bool | | false | |
| `allowByeWeekStarters` | bool | | true | |
| `lineupLockMode` | enum | | `LOCK_AT_KICKOFF` | `LOCK_AT_KICKOFF` / `LOCK_AT_FIRST_KICKOFF` |

##### 4.2.3a — `startingLineup` and `rosterPositionLimits` JSON shapes

```json
{
  "schemaVersion": 1,
  "positions": {
    "QB": { "min": 1, "max": 1 },
    "RB": { "min": 1, "max": 6 },
    "WR": { "min": 2, "max": 7 },
    "TE": { "min": 1, "max": 6 },
    "PK": { "min": 1, "max": 1 },
    "DT": { "min": 1, "max": 4 },
    "DE": { "min": 1, "max": 4 },
    "LB": { "min": 3, "max": 5 },
    "CB": { "min": 1, "max": 4 },
    "S":  { "min": 1, "max": 4 }
  }
}
```

`rosterPositionLimits` has the same shape but describes limits on the full active roster (not just starters). Absence of a position key means no limit.

#### 4.2.4 League — salary cap & contracts fields

All fields here are used only when `trackSalaries = true` and/or `trackContracts = true`.

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `trackSalaries` | bool | | false | Master switch for salary system |
| `trackContracts` | bool | | false | Master switch for contract system |
| `salaryCapAmount` | decimal(8,2) | | 200.00 | Per-franchise cap |
| `salaryCapType` | enum | | `HARD` | `HARD` / `SOFT` |
| `salaryCapEscalatorPercent` | decimal(5,2) | | 5.0 | Applied to cap at offseason rollover |
| `minimumPlayerSalary` | decimal(8,2) | | 0.50 | |
| `salaryIncrement` | decimal(5,2) | | 0.10 | All salaries/bids are multiples of this |
| `startingLineupSalaryCap` | decimal(8,2) | ? | | Optional cap on the sum of starter salaries |
| `blockLineupWhenOverCap` | bool | | true | |
| `irSalaryPercent` | decimal(5,2) | | 20.0 | |
| `taxiSalaryPercent` | decimal(5,2) | | 10.0 | |
| `playerSalaryEscalatorPercent` | decimal(5,2) | | 10.0 | Default per-contract raise (overridable per contract) |
| `salaryDisplayFormat` | enum | | `WITH_CENTS` | `DOLLARS_ONLY` / `WITH_CENTS` / `WITH_COMMAS` / `MILLIONS_ABBR` |
| `dropPenaltyBasePercent` | decimal(5,2) | | 75.0 | |
| `dropPenaltyPerAdditionalYearPercent` | decimal(5,2) | | 33.0 | |
| `dropPenaltyMode` | enum | | `CURRENT_SEASON_ONLY` | `CURRENT_SEASON_ONLY` / `AMORTIZED` |
| `defaultSalaryAssignment` | enum | | `ALWAYS` | `ALWAYS` / `NEVER` / `WAIVER_ONLY` |
| `salaryResetOnDrop` | enum | | `NEVER` | `ALWAYS` / `NEVER` / `PROMPT_COMMISSIONER` |

#### 4.2.5 League — franchise tag fields

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `franchiseTagsEnabled` | bool | | true (Dynasty) | |
| `franchiseTagsPerFranchisePerSeason` | int | | 1 | |
| `franchiseTagIsUseItOrLoseIt` | bool | | true | |
| `franchiseTagValuationMethod` | enum | | `TOP_N_AT_POSITION_AVG` | See §5 enums |
| `franchiseTagTopN` | int | | 10 | |
| `franchiseTagRenewalYear2Percent` | decimal(5,2) | | 25.0 | |
| `franchiseTagRenewalYear3Percent` | decimal(5,2) | | 30.0 | |
| `franchiseTagRenewalYear4Percent` | decimal(5,2) | | 35.0 | |
| `franchiseTagRenewalYear5Percent` | decimal(5,2) | | 40.0 | |

#### 4.2.6 League — draft fields

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `draftMode` | enum | | `EMAIL` | `LIVE` / `EMAIL` |
| `pickTimerSeconds` | int | | 43200 | 12 hours default (email drafts) |
| `timerSuspendEnabled` | bool | | true | |
| `timerSuspendStart` | string | ? | `"23:00"` | "HH:MM" in league timezone |
| `timerSuspendEnd` | string | ? | `"07:00"` | "HH:MM" in league timezone |
| `timerExpirationBehavior` | enum | | `USE_DRAFT_LIST_THEN_SKIP` | See §5 |
| `autoPickAfterConsecutiveTimeouts` | int | ? | 3 | Null disables |
| `availablePlayerPool` | enum | | `BOTH_ROOKIES_AND_VETERANS` | `BOTH` / `ROOKIES_ONLY` / `VETERANS_ONLY` |
| `forceFullRosterAtEnd` | bool | | false | |
| `draftRounds` | int | | 8 (Dynasty) / 15 (Redraft) | |
| `draftOrderType` | enum | | `LINEAR` | `LINEAR` / `SNAKE` / `THIRD_ROUND_REVERSAL` / `CUSTOM` |

#### 4.2.7 League — auction fields

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `auctionMode` | enum | | `EMAIL` | `LIVE` / `EMAIL` |
| `minimumOpeningBid` | decimal(8,2) | | 0.50 | |
| `bidIncrement` | decimal(5,2) | | 0.10 | |
| `playerAuctionExpirationHours` | decimal(6,3) | | 15.840 | |
| `useProxyBidding` | bool | | true | |
| `proxyBiddingIsPrivate` | bool | | true | |
| `maxConcurrentPlayerAuctions` | int | | 100 | |
| `nominationsPerFranchise` | int | | 7 | |
| `auctionAvailablePlayerPool` | enum | | `VETERANS_ONLY` | `VETERANS_ONLY` / `ROOKIES_ONLY` / `BOTH` |
| `auctionForceFullRosterAtEnd` | bool | | false | |
| `allowCommentsOnBids` | bool | | true | |
| `chargeWinningBidsToAccountingBalance` | bool | | false | |
| `startingFundsMode` | enum | | `SAME_FOR_ALL` | `SAME_FOR_ALL` / `PER_FRANCHISE` / `USE_ACCOUNTING_BALANCE` |
| `startingFundsAmount` | decimal(8,2) | | 200.00 | Applies when `SAME_FOR_ALL` |
| `availableFundsReducedBy` | enum | | `OPEN_BIDS_PLUS_CURRENT_SALARIES` | See §5 |

#### 4.2.8 League — waiver fields

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `waiverSystem` | enum | | `BLIND_BID_WITH_FCFS` | See §5 |
| `waiverOrderType` | enum | | `INVERSE_STANDINGS` | See §5 |
| `blindBidMinimum` | decimal(8,2) | | 0.50 | |
| `blindBidIncrement` | decimal(5,2) | | 0.10 | |
| `blindBidSalaryLinked` | bool | | true | If true, BBD $ = salary cap $ |
| `blindBidStartingFunds` | decimal(8,2) | | 100.00 | When BBD is a separate pool |
| `allowConditionalBids` | bool | | false | v2 feature |
| `blindBidTiebreaker` | enum | | `EARLIEST_BID_WINS` | See §5 |
| `chargeBlindBidsToAccounting` | bool | | false | |
| `droppedPlayerLockHours` | int | | 48 | |
| `droppedPlayerLockUntil` | string | ? | | Alternative: "Mon 23:00" style anchor |
| `noAddDropBetweenKickoffAndEndOfWeek` | bool | | true | |
| `cantDropListEnabled` | bool | | false | |
| `cantAddListEnabled` | bool | | false | |

#### 4.2.9 League — trade fields

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `tradeProcessing` | enum | | `IMMEDIATE` | `IMMEDIATE` / `COMMISSIONER_REVIEW` / `LEAGUE_VOTE` |
| `votingPollDurationDays` | int | | 2 | |
| `votingPollIsPublic` | bool | | false | |
| `votingRequired` | bool | | false | |
| `autoRejectVoteThreshold` | int | ? | | Reject votes that auto-fail the trade |
| `tradeFuturePicksEnabled` | bool | | true | |
| `tradeFuturePicksYearsAhead` | int | | 2 | 1–5 |
| `tradeFuturePicksRoundLimit` | int | | 8 | |
| `tradeBlindBidDollars` | bool | | false | |
| `tradeDisplayCommentsPublicly` | bool | | true | |
| `allowInvalidRosterTrades` | bool | | false | |
| `allowLineupSubmitWithInvalidRoster` | bool | | false | |
| `preventTradeDuringGames` | bool | | true | |
| `tradeProposalDefaultExpirationDays` | int | | 7 | |
| `crossConferenceTradesEnabled` | bool | | false (isolated) / true (shared) | Derived default from `playerPoolIsolation` |
| `tradeReversalWindowMinutes` | int | | 10 | |

#### 4.2.10 League — IR/taxi fields

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `irEligibilityMinimum` | enum | | `IR_OR_OUT` | See §5 |
| `irAllowSuspended` | bool | | true | |
| `irAllowHoldout` | bool | | true | |
| `irAllowCovid` | bool | | true | Legacy option |
| `irBlockLineupOnViolation` | bool | | true | |
| `irActivationCooldownDays` | int | | 0 | |
| `taxiEligibility` | enum | | `ROOKIES_ONLY` | See §5 |
| `taxiAllowByeWeekAdditionally` | bool | | false | |
| `taxiAllowCovidAdditionally` | bool | | false | |
| `taxiPromotionCooldownDays` | int | | 0 | |
| `taxiBlockLineupOnViolation` | bool | | false | |
| `taxiDefaultContractYears` | int | | 3 | |

#### 4.2.11 League — accounting fields

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `accountingEnabled` | bool | | false | |
| `entryFeeAmount` | decimal(10,2) | | 0.00 | |
| `feeWaiverAdd` | decimal(10,2) | | 0.00 | |
| `feeWaiverDrop` | decimal(10,2) | | 0.00 | |
| `feeFcfsAdd` | decimal(10,2) | | 0.00 | |
| `feeFcfsDrop` | decimal(10,2) | | 0.00 | |
| `feeTradeGive` | decimal(10,2) | | 0.00 | |
| `feeTradeReceive` | decimal(10,2) | | 0.00 | |
| `feePerTradeEnvelope` | decimal(10,2) | | 0.00 | |
| `feeIrActivate` | decimal(10,2) | | 0.00 | |
| `feeIrDeactivate` | decimal(10,2) | | 0.00 | |
| `feeTaxiPromote` | decimal(10,2) | | 0.00 | |
| `feeTaxiDemote` | decimal(10,2) | | 0.00 | |
| `creditWeeklyWin` | decimal(10,2) | | 0.00 | |
| `debitWeeklyLoss` | decimal(10,2) | | 0.00 | |
| `creditWeeklyHighScorer` | decimal(10,2) | | 0.00 | |
| `debitWeeklyLowScorer` | decimal(10,2) | | 0.00 | |
| `blockActionsBelowBalance` | decimal(10,2) | ? | | Threshold for locking actions |
| `earlyBuyInEnabled` | bool | | false | |
| `earlyBuyInMaxRound` | int | | 3 | |
| `earlyBuyInDeadlineDays` | int | | 7 | |

#### 4.2.12 League — scoring & tiebreaker fields

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `tieHandling` | enum | | `ALLOW_TIES` | See §5 |
| `standingsTiebreakerChain` | string[] | | | Ordered list of tiebreaker names; see §5 |
| `playoffTiebreakerChain` | string[] | | | Separate chain for playoff seeding |
| `playoffTieBreaker` | enum | | `HIGHEST_SEED_WINS` | Tiebreaker for individual playoff matchup scores |

#### 4.2.13 League — narrative fields (v2)

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `narrativeEnabled` | bool | | false | v2 |
| `narrativeTone` | JSON | | `{}` | Commissioner-default tone; see PRD §19.3 |
| `narrativeRequireApproval` | bool | | false | |

**Relationships:**
- Has many `Conference`, `Division`, `Franchise`, `ScoringRule`, `CalendarEvent`, `RookieSalaryScale`, `PayoutStructure`, `PlayoffBracket`, `Matchup`, `Season`, `Article`, `MessageBoardTopic`, `Poll`
- Belongs to (via `commissionerUserId`) one `User`
- Participants (via `LeagueRole`) many `User`

**Constraints:**
- `slug` unique globally
- If `conferenceCount = 0`, no Conference records may exist for this League
- If `playerPoolIsolation = ISOLATED_PER_CONFERENCE`, then `conferenceCount >= 1` is required
- Tier can change only when `status = OFFSEASON` (PRD §22.18)

---

### 4.3 Conference

A subdivision of a League, used to group divisions for scheduling and playoff seeding. A League may have 0, 1, or 2 Conferences.

**PRD reference:** §3.2

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `name` | string | | e.g., "AFC", "NFC" |
| `abbreviation` | string | ? | ≤ 6 chars |
| `displayOrder` | int | | For consistent UI ordering |

**Relationships:**
- Belongs to one `League`
- Has many `Division`
- Indirectly has many `Franchise` (via Divisions)

---

### 4.4 Division

A grouping of franchises within a League (or within a Conference if conferences are enabled). Drives scheduling and divisional tiebreakers.

**PRD reference:** §3.2

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `conferenceId` | UUID | ? | FK, null iff `League.conferenceCount = 0` |
| `name` | string | | |
| `displayOrder` | int | | |

**Relationships:**
- Belongs to one `League` (and, if applicable, one `Conference`)
- Has many `Franchise`

**Constraints:**
- If `League.conferenceCount >= 1`, `conferenceId` must be non-null
- Every Franchise in a League belongs to exactly one Division

---

### 4.5 Franchise

A team within a League. The PRD uses "franchise" (not "team") throughout to avoid confusion with NFL teams; this spec follows that convention.

**PRD reference:** §4.2

| Field | Type | ? | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | | | |
| `leagueId` | UUID | | | FK |
| `divisionId` | UUID | ? | | FK, nullable if league is flat |
| `name` | string | | | ≤ 80 chars |
| `slug` | string | | | URL-safe, unique within league |
| `logoUrl` | string | ? | | Defaults to placeholder |
| `primaryColor` | string | ? | | Hex color |
| `secondaryColor` | string | ? | | Hex color |
| `primaryOwnerUserId` | UUID | ? | | Null if orphaned |
| `accessCode` | string | | | Per-franchise invite secret; rotatable |
| `abilities` | JSON | | (all true) | See §4.5a |
| `status` | enum | | `ACTIVE` | `ACTIVE` / `INACTIVE` / `ORPHANED` |
| `lastSeenAt` | timestamp | ? | | Max of all owners' last activity on this league |
| `amnestyDropsRemaining` | int | | 0 | Granted by commissioner on orphan-replacement; see PRD §22.3 |

#### 4.5a — `abilities` JSON shape

Each ability defaults to `true`. When set to `false`, the corresponding UI/action is disabled for this franchise. Matches PRD §4.4.

```json
{
  "schemaVersion": 1,
  "canSubmitLineup": true,
  "canPerformAddDrops": true,
  "canDropWithoutAdding": true,
  "canProposeOrAcceptTrades": true,
  "canTradeFutureDraftPicks": true,
  "canMakeIrMoves": true,
  "canMakeTaxiMoves": true,
  "canWriteLeagueArticles": true,
  "canPostToMessageBoard": true,
  "canPostToLeagueChat": true,
  "canCreateLeaguePolls": true,
  "canCustomizeFranchise": true,
  "canCustomizeHomePage": true,
  "canNominateForAuction": true
}
```

**Decision note.** The PRD describes abilities as "per-franchise ability flags" (§4.4). This is modeled as a JSON field on Franchise rather than a separate `FranchiseAbility` entity because (a) the set of flags is small and fixed, (b) there is no need for audit trail on individual flag changes beyond the general audit log, and (c) all flags are read together whenever a franchise is loaded. Versioning is handled via `schemaVersion`.

**Relationships:**
- Belongs to one `League`, optionally one `Division`
- Has many `User` owners via `FranchiseOwner` (many-to-many)
- Has many `Contract`, `RosterEntry`, `LineupEntry`, `WaiverClaim`, `Bid`, `AccountingEntry`, `SalaryAdjustment`, `DraftPick` (as `currentFranchiseId` or `originalFranchiseId`), `Trade` (as proposer or receiver), `PollVote`
- Participates in `Matchup` (as homeFranchiseId or awayFranchiseId)

**Constraints:**
- `slug` unique within the league
- When `status = ORPHANED`, `primaryOwnerUserId` is null and no `FranchiseOwner` records exist
- `amnestyDropsRemaining >= 0`
- Franchise cannot be deleted once it has participated in any matchup; use `status = INACTIVE` instead

---

### 4.6 FranchiseOwner (join entity)

Links Users to Franchises. Many-to-many so co-owners are supported.

**PRD reference:** §4.3 (the Owner ↔ Franchise relationship)

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `userId` | UUID | | FK |
| `franchiseId` | UUID | | FK |
| `joinedAt` | timestamp | | When this ownership began |
| `leftAt` | timestamp | ? | When this ownership ended (null = current) |
| `isPrimary` | bool | | If true, this user is the primary owner (denormalizes `Franchise.primaryOwnerUserId`) |

**Constraints:**
- A User cannot have two current (i.e., `leftAt IS NULL`) records for the same Franchise
- At most one FranchiseOwner per Franchise may have `isPrimary = true` at a time
- An owner can only be removed (set `leftAt`) after they have accessed their franchise at least once (PRD §4.8). Invitees who never accessed are handled via `Invitation` revocation instead.

**Decision note.** This is a separate entity (not a Franchise field) because ownership is historical — we need to know who owned a franchise when, for audit and narrative purposes. Past ownership is a first-class record.

---

### 4.7 LeagueRole (join entity)

Privileged-access role per user per league. Replaces "commissioner" as a single-field relationship; supports commissioner + multiple co-commissioners + multiple moderators.

**PRD reference:** §4.5

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `userId` | UUID | | FK |
| `leagueId` | UUID | | FK |
| `role` | enum | | `COMMISSIONER` / `CO_COMMISSIONER` / `MODERATOR` |
| `grantedByUserId` | UUID | ? | Who granted this role |
| `grantedAt` | timestamp | | |
| `revokedAt` | timestamp | ? | Null = active |

**Constraints:**
- Exactly one active (`revokedAt IS NULL`) `COMMISSIONER` record per League
- `CO_COMMISSIONER` and `MODERATOR` may have multiple active records
- A User may hold at most one active role per League (a commissioner is implicitly also co-commissioner and moderator)

**Note.** `League.commissionerUserId` is a denormalized pointer to the current active commissioner for fast lookup; the LeagueRole record is the source of truth.

---

### 4.8 Invitation

A pending invitation to join a Franchise. Exists between invite creation and accept/revoke/expire.

**PRD reference:** §4.6

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `franchiseId` | UUID | | FK |
| `invitedByUserId` | UUID | | FK (typically the commissioner) |
| `channel` | enum | | `EMAIL` / `SMS` / `DIRECT_CODE` |
| `targetEmail` | string | ? | Required if `channel = EMAIL` |
| `targetPhone` | string | ? | Required if `channel = SMS` |
| `inviteCode` | string | | Unique signed token |
| `status` | enum | | `PENDING` / `ACCEPTED` / `EXPIRED` / `REVOKED` |
| `expiresAt` | timestamp | | Default: 30 days after creation |
| `acceptedAt` | timestamp | ? | |
| `acceptedByUserId` | UUID | ? | FK; null until accept |

**Constraints:**
- `inviteCode` unique globally
- Accepting creates a `FranchiseOwner` record

---

### 4.9 Player

The NFL player. Sourced from sportsdata.io; cached/mirrored in XO Play.

**PRD reference:** §5.1

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `externalId` | string | ? | sportsdata.io player ID; null for custom players |
| `isCustom` | bool | | True for commissioner-created pre-release rookies, etc. |
| `firstName` | string | | |
| `lastName` | string | | |
| `fullName` | string | | Denormalized for search |
| `nflTeam` | string | | Three-letter NFL code, or `FA` |
| `position` | enum | | See §5 Position enum |
| `rookieYear` | int | ? | First NFL season |
| `dateOfBirth` | date | ? | |
| `heightInches` | int | ? | |
| `weightLbs` | int | ? | |
| `collegeName` | string | ? | |
| `injuryStatus` | enum | | See §5 — current status only |
| `isActive` | bool | | NFL-active vs retired/cut |
| `headshotUrl` | string | ? | |
| `lastSyncedAt` | timestamp | | Last sportsdata.io sync |

**Relationships:**
- Has many `Contract` (across leagues, past and current)
- Has many `Stats` records (per season, per week)
- Referenced by `RosterEntry`, `LineupEntry`, `WaiverClaim`, `Bid`, `DraftPick` (when pick is used), `TradeAsset` (when asset type is `PLAYER`)

**Constraints:**
- `externalId` unique when not null
- `externalId = null` implies `isCustom = true`
- Custom player merge (PRD §22.17) unifies a custom player into an externalId-backed player: the custom record's Contract/Roster references are re-pointed to the merged record; the custom record is soft-deleted.

**Note on position changes.** Position is authoritative from sportsdata.io. When it changes, the `Player.position` field updates on next sync. Historical position-at-time-of-transaction is captured in `Transaction` records (see §4.18) so reports can show "drafted as DE, now DT."

---

### 4.10 Stats

A player's weekly statistical line. One row per player per league week per season. Sourced from sportsdata.io.

**PRD reference:** §6 (scoring depends on this), §23.1

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `playerId` | UUID | | FK |
| `seasonYear` | int | | |
| `week` | int | | 1–22 (covering regular season + playoffs) |
| `statValues` | JSON | | Map of `statType` (see §5) → numeric value |
| `sourceVersion` | int | | Incremented on each correction from sportsdata.io |
| `lastCorrectionAt` | timestamp | ? | |

**Relationships:**
- Belongs to `Player`
- Consumed by the scoring engine (see `Spec_ScoringEngine.md`)

**Constraints:**
- Unique on `(playerId, seasonYear, week)`
- `statValues` JSON keys must be members of the Stat Type enum (§5)

**Decision note.** Stats is its own entity (not denormalized onto LineupEntry) because a single stat line is consumed by many fantasy leagues, and because corrections must propagate to every league's matchup that used the player. LineupEntry stores the *resulting fantasy points* computed from Stats × League's ScoringRules.

---

### 4.11 ScoringRule

A rule that translates a statistical event to fantasy points. Each League has many rules; each rule describes how one stat type scores for one subset of positions.

**PRD reference:** §6.2

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `statType` | enum | | See §5 Stat Type enum |
| `positionScope` | string[] | | Array of position enums this rule applies to |
| `rangeLow` | int | | Inclusive minimum stat count this rule triggers at |
| `rangeHigh` | int | | Inclusive maximum stat count |
| `pointsPerUnit` | decimal(6,3) | ? | Points per occurrence |
| `perUnit` | int | | Occurrences equal to one unit; default 1 |
| `flatPoints` | decimal(6,3) | ? | Optional flat bonus when stat falls in range |
| `displayOrder` | int | | For UI sorting |

**Relationships:**
- Belongs to `League`

**Constraints:**
- `pointsPerUnit` or `flatPoints` must be non-null (at least one scoring effect)
- `perUnit >= 1`
- `rangeLow <= rangeHigh`
- For a given `statType`, no position may appear in more than one rule's `positionScope` where the rule's ranges overlap (validated at rule creation). This prevents ambiguous double-counting.

---

### 4.12 ScoreAdjustment

A manual adjustment to a franchise's or player's weekly score. Kept separate from `Stats` and `LineupEntry` so the audit trail remains intact.

**PRD reference:** §6.6

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `scope` | enum | | `FRANCHISE` / `PLAYER` |
| `franchiseId` | UUID | ? | Required if `scope = FRANCHISE` |
| `playerId` | UUID | ? | Required if `scope = PLAYER` |
| `seasonYear` | int | | |
| `week` | int | | |
| `pointAdjustment` | decimal(6,2) | | Signed; positive adds, negative subtracts |
| `reason` | string | | |
| `createdByUserId` | UUID | | FK — commissioner who made adjustment |

**Constraints:**
- Either `franchiseId` or `playerId` is non-null based on `scope`, never both

---

### 4.13 Contract

Links a Player to a Franchise for a specific period and defines the economic terms. The heart of the Dynasty tier data.

**PRD reference:** §7.2

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `franchiseId` | UUID | | FK |
| `playerId` | UUID | | FK |
| `baseSalary` | decimal(8,2) | | |
| `contractYearsTotal` | int | | Original years at signing |
| `contractYearsRemaining` | int | | Decrements at rollover |
| `acquiredVia` | enum | | `DRAFT` / `AUCTION` / `WAIVER` / `FCFS` / `TRADE` / `COMMISSIONER` |
| `acquiredAt` | timestamp | | |
| `acquiredSeason` | int | | |
| `status` | enum | | `ACTIVE` / `FRANCHISE_TAGGED` / `EXTENDED` / `EXPIRED` |
| `salaryEscalatorPercent` | decimal(5,2) | | Overrides `League.playerSalaryEscalatorPercent` if set |
| `otherContractInfo` | string | ? | Freeform, ≤ 500 chars. Migration field for MFL import. |
| `contractStatusLabel` | string | ? | Optional custom label (e.g., "Rookie Scale") |
| `currentRosterBucket` | enum | | `ACTIVE` / `INJURED_RESERVE` / `TAXI_SQUAD` — **denormalized** from RosterEntry |
| `franchiseTagRenewalYear` | int | ? | 1–5, null if not tagged; replaces MFL's freeform "Y1/Y2/..." in `otherContractInfo` |

**Relationships:**
- Belongs to `League`, `Franchise`, `Player`
- Referenced by `Transaction` records, `TradeAsset` (when traded)

**Constraints:**
- `contractYearsRemaining <= contractYearsTotal`
- `contractYearsRemaining >= 0`; when 0, contract expires at rollover
- `baseSalary >= League.minimumPlayerSalary` (unless commissioner override)
- `baseSalary` is a multiple of `League.salaryIncrement`
- When `status = FRANCHISE_TAGGED`, `contractYearsRemaining` must be exactly 1
- A Player may have at most one active Contract per League at a time (enforced via roster uniqueness; see §6.1)
- When `playerPoolIsolation = ISOLATED_PER_CONFERENCE`, a Player may have at most one active Contract *per Conference* within the League

**Denormalization.** `currentRosterBucket` is copied from the active `RosterEntry` on every roster transition. This lets cap calculations run without joining RosterEntry. The write path (transaction handlers) owns consistency.

---

### 4.14 SalaryAdjustment

A manual or system-generated cap modification not tied to a specific Contract. Used for drop penalties, rule violations, handicap modifiers, and one-time credits/debits.

**PRD reference:** §7.8 (drop penalties populate these), §7.11

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `franchiseId` | UUID | | FK |
| `amount` | decimal(8,2) | | Signed; positive = charge against cap, negative = cap credit |
| `reason` | string | | |
| `category` | enum | | `DROP_PENALTY` / `RULE_VIOLATION` / `BONUS` / `HANDICAP` / `OTHER` |
| `effectiveDate` | date | | When the adjustment begins to count against cap |
| `expirationDate` | date | ? | When the adjustment stops counting; null = indefinite |
| `sourceTransactionId` | UUID | ? | Optional link to the triggering transaction (e.g., the drop that generated this penalty) |
| `createdByUserId` | UUID | ? | Null if system-generated |

**Relationships:**
- Belongs to `League`, `Franchise`
- May link back to a `Transaction`

---

### 4.15 FranchiseSalaryCapOverride

Per-franchise, per-season cap override. Used for handicap leagues or persistent penalties.

**PRD reference:** §7.4

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `franchiseId` | UUID | | FK |
| `seasonYear` | int | | |
| `overrideCapAmount` | decimal(8,2) | | Replaces `League.salaryCapAmount` for this franchise in this season |
| `reason` | string | | |

**Constraints:**
- Unique on `(franchiseId, seasonYear)`

---

### 4.16 RookieSalaryScale

Per-league rookie salary scale. One row per pick position; salaries are assigned automatically when a rookie is drafted.

**PRD reference:** §7.6

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `round` | int | | |
| `pickInRound` | int | ? | If null, applies to all picks in the round not matched by a more-specific row |
| `baseSalary` | decimal(8,2) | | |
| `defaultContractYears` | int | | Usually 3 for taxi, 1–5 for active |

**Constraints:**
- Unique on `(leagueId, round, pickInRound)`; the null-pickInRound row is the catch-all for unmatched picks in that round

---

### 4.17 RosterEntry

A player's current position on a franchise's roster. One row per player per franchise at any time.

**PRD reference:** §5.3 (roster structure)

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `franchiseId` | UUID | | FK |
| `playerId` | UUID | | FK |
| `contractId` | UUID | ? | FK; null for leagues that don't track contracts |
| `bucket` | enum | | `ACTIVE` / `INJURED_RESERVE` / `TAXI_SQUAD` |
| `enteredBucketAt` | timestamp | | When the player entered the current bucket |

**Relationships:**
- Belongs to `League`, `Franchise`, `Player`
- Optionally links to `Contract`

**Constraints:**
- Unique on `(leagueId, playerId)` when `playerPoolIsolation = SHARED_LEAGUE`
- Unique on `(leagueId, conferenceId, playerId)` when `playerPoolIsolation = ISOLATED_PER_CONFERENCE` (conference is inferred via `franchise.division.conference`)
- Roster composition must satisfy `League.rosterSpots`, `League.irSpots`, `League.taxiSquadSpots` — validated on every write
- A player not on any RosterEntry is a free agent in the league

**Decision note.** RosterEntry is a thin join rather than a collection on Franchise because (a) lookup "who owns Player X in League Y" must be O(1), (b) roster transitions are frequent enough to warrant a dedicated record with its own timestamp.

---

### 4.18 Transaction (polymorphic)

The append-only record of every state-changing action in a League. Transactions are the event log.

**PRD reference:** §20.3 (event sourcing)

Every Transaction has these common fields, regardless of subtype:

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `type` | enum | | See subtypes below |
| `seasonYear` | int | | |
| `week` | int | ? | Null for offseason transactions |
| `initiatedByUserId` | UUID | ? | Null if system-initiated (e.g., rollover) |
| `initiatedByFranchiseId` | UUID | ? | The franchise whose action this is (null for league-wide) |
| `occurredAt` | timestamp | | |
| `reversalOfTransactionId` | UUID | ? | If this is a compensating transaction, points at the original |
| `payload` | JSON | | Subtype-specific data (see below) |
| `effects` | JSON | | Resolved effects — what actually changed (roster entries created, contracts updated, etc.) |

**Subtypes** (stored as `type` values; each has its own `payload` shape):

| Subtype | `type` | Payload shape |
|---|---|---|
| Add/drop | `ADD_DROP` | `{ playerAddedId, playerDroppedId?, contractCreated?, dropPenaltyApplied? }` |
| Waiver claim processed | `WAIVER_CLAIM` | `{ claimId, playerAddedId, playerDroppedId?, bidAmount?, successful }` |
| Trade completed | `TRADE_COMPLETED` | `{ tradeId, proposerAssets, receiverAssets }` |
| Trade reversed | `TRADE_REVERSAL` | `{ originalTradeId, originalTransactionId, reason }` |
| IR move | `IR_MOVE` | `{ playerId, direction: "IN"|"OUT" }` |
| Taxi move | `TAXI_MOVE` | `{ playerId, direction: "PROMOTE"|"DEMOTE" }` |
| Auction award | `AUCTION_AWARD` | `{ playerId, bidAmount, contractYears, contractId }` |
| Draft pick made | `DRAFT_PICK_MADE` | `{ pickId, playerId, contractId }` |
| Salary adjustment | `SALARY_ADJUSTMENT` | `{ adjustmentId }` |
| Rollover | `ROLLOVER` | `{ fromSeason, toSeason, contractsUpdated, capEscalated }` |
| Score adjustment | `SCORE_ADJUSTMENT` | `{ adjustmentId }` |
| Lineup set | `LINEUP_SET` | `{ franchiseId, week, lineup: [{playerId, starter: bool}] }` |
| Commissioner action | `COMMISSIONER_ACTION` | `{ action, targetEntity, before, after }` |

**Relationships:**
- Belongs to `League`
- May reference `Franchise` (initiating and/or affected)
- May reference `Contract`, `Player`, `Trade`, `WaiverClaim`, `DraftPick`, `SalaryAdjustment`, `ScoreAdjustment` via payload/effects

**Constraints:**
- Transactions are append-only — no updates or deletes after creation
- Reversal creates a new transaction with `reversalOfTransactionId` set; the original is unchanged
- Historical "as-of" queries replay transactions up to a point in time to reconstruct state

**Decision note.** The PRD lists subtypes as separate entity names (`AddDropTransaction`, `WaiverTransaction`, etc.) in §20.1. This spec consolidates them into a single `Transaction` table with a `type` discriminator and subtype-specific `payload` JSON, rather than separate tables per subtype. Rationale: reporting often needs to query *all* transactions across types; a single table simplifies this. Subtype-specific validation happens at the application layer based on the `type` enum.

---

### 4.19 LineupEntry (join entity)

A player's slot in a franchise's lineup for a specific matchup. Per-matchup, per-franchise, per-player.

**PRD reference:** Implied by §5.4 (starting lineup config) and §6 (scoring); consolidated here.

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `matchupId` | UUID | | FK |
| `franchiseId` | UUID | | FK |
| `playerId` | UUID | | FK |
| `slotPosition` | enum | | Position this player occupies in the lineup (e.g., `RB`, `WR`, `FLEX`); may be `BENCH` or `IR` or `TAXI` |
| `isStarter` | bool | | Denormalized: `true` if `slotPosition != BENCH && != IR && != TAXI` |
| `fantasyPoints` | decimal(8,3) | ? | Computed from Stats × ScoringRule; null until stats land |
| `lockedAt` | timestamp | ? | When this player's slot locked (kickoff) |
| `submittedAt` | timestamp | | When the lineup containing this entry was submitted |

**Relationships:**
- Belongs to `Matchup`, `Franchise`, `Player`
- Scoring engine writes `fantasyPoints` as Stats arrive

**Constraints:**
- Unique on `(matchupId, franchiseId, playerId)`
- A player can appear in at most one LineupEntry per franchise per matchup
- The full set of LineupEntry for a franchise × matchup must satisfy `League.startingLineup` min/max rules

**Decision note.** The PRD §20.1 mentions "LineupEntry (per franchise, per player)" under Matchup. It's made first-class here because (a) fantasy points per slot are queried frequently, (b) lock timestamps vary per slot (each player locks at their NFL game's kickoff under `LOCK_AT_KICKOFF` mode), (c) historical lineups are audited.

---

### 4.20 Matchup

A head-to-head game between two franchises in a given week. Also used in all-play formats (one Matchup per franchise per week, with the "opponent" being the league average).

**PRD reference:** §14 (playoffs), implied by §15 (standings)

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `seasonYear` | int | | |
| `week` | int | | |
| `homeFranchiseId` | UUID | | FK |
| `awayFranchiseId` | UUID | ? | Null in `ALL_PLAY` or `TOTAL_POINTS_ONLY` modes |
| `homeScore` | decimal(8,2) | ? | Computed from LineupEntries; null until games start |
| `awayScore` | decimal(8,2) | ? | |
| `isPlayoff` | bool | | false for regular season |
| `playoffBracketId` | UUID | ? | FK if playoff |
| `playoffRound` | int | ? | |
| `status` | enum | | `SCHEDULED` / `IN_PROGRESS` / `COMPLETED` / `VOIDED` |
| `winnerFranchiseId` | UUID | ? | Resolved at completion; null for tie (if ties allowed) or not-yet-complete |

**Relationships:**
- Has many `LineupEntry` (one per franchise side, many players)
- Optionally belongs to `PlayoffBracket`

**Constraints:**
- `(leagueId, seasonYear, week, homeFranchiseId)` unique when `awayFranchiseId` is present (prevents a franchise from playing two matchups in the same week)

---

### 4.21 PlayoffBracket

A postseason bracket within a League. A League may have multiple brackets (main championship, consolation, toilet bowl).

**PRD reference:** §14.1

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `seasonYear` | int | | |
| `name` | string | | e.g., "Super Bowl," "Consolation" |
| `teamCount` | int | | Must be a power of 2 |
| `startWeek` | int | | Fantasy week playoffs begin |
| `gamesInFirstWeek` | int | | Typically `teamCount / 2` |
| `bracketWinnerTitle` | string | | "Champion," "Consolation Winner" |
| `thirdPlaceGameEnabled` | bool | | |
| `addToHomePage` | bool | | |
| `seedingMode` | enum | | See §5 Seeding Mode enum |
| `reseedEachRound` | bool | | If false, bracket is fixed from round 1 |
| `status` | enum | | `SCHEDULED` / `IN_PROGRESS` / `COMPLETED` |
| `winnerFranchiseId` | UUID | ? | Null until bracket completes |

**Relationships:**
- Belongs to `League`
- Has many `Matchup` (the bracket games)

**Constraints:**
- Up to 15 simultaneous brackets per League per season (PRD §14.1)

---

### 4.22 DraftPick

A single draft pick. First-class because picks are tradeable assets in Dynasty leagues.

**PRD reference:** §9.9

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `seasonYear` | int | | NFL season the pick is for |
| `round` | int | | |
| `pickInRound` | int | | Position within the round |
| `overallNumber` | int | | Across all rounds |
| `originalFranchiseId` | UUID | | Who the pick naturally belonged to |
| `currentFranchiseId` | UUID | | Who owns the pick now |
| `isFuturePick` | bool | | True until the season of the pick arrives |
| `playerSelectedId` | UUID | ? | Set when pick is used |
| `contractId` | UUID | ? | Contract created when pick was used |
| `pickStartedAt` | timestamp | ? | |
| `pickCompletedAt` | timestamp | ? | |
| `pickElapsedSeconds` | int | ? | Denormalized for reports |
| `wasAutoPicked` | bool | | True if timer expired and system made the pick |

**Relationships:**
- Belongs to `League`, `originalFranchiseId` Franchise, `currentFranchiseId` Franchise
- Optionally references `playerSelectedId`, `contractId`
- May appear as a `TradeAsset`

**Constraints:**
- `(leagueId, seasonYear, round, pickInRound)` unique
- Future picks with round ≤ `League.earlyBuyInMaxRound` trigger early buy-in logic on trade (PRD §17.4)

---

### 4.23 DraftWorklistEntry

An owner's queued pre-draft pick for a specific round. System selects from Worklist first when it's their turn.

**PRD reference:** §9.6

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `franchiseId` | UUID | | FK |
| `leagueId` | UUID | | FK |
| `seasonYear` | int | | |
| `round` | int | | |
| `playerId` | UUID | | FK |
| `priority` | int | | Within the round |

**Constraints:**
- Unique on `(franchiseId, seasonYear, round, priority)`

---

### 4.24 MyDraftListEntry

An owner's personal ranked list of players for auto-draft fallback. Separate from Worklist because it's round-agnostic.

**PRD reference:** §9.5

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `franchiseId` | UUID | | FK |
| `leagueId` | UUID | | FK |
| `playerId` | UUID | | FK |
| `rank` | int | | 1 = highest preference |

**Constraints:**
- Unique on `(franchiseId, leagueId, playerId)` (no duplicate rankings of the same player)
- Unique on `(franchiseId, leagueId, rank)` (one player per rank)

---

### 4.25 Auction

A league's auction event (one per auction calendar event). Typically offseason free-agent auction.

**PRD reference:** §10

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `seasonYear` | int | | |
| `name` | string | | e.g., "2026 Free Agent Auction — NFC" |
| `conferenceId` | UUID | ? | FK if the auction is conference-scoped |
| `status` | enum | | `SCHEDULED` / `OPEN` / `CLOSED` |
| `startsAt` | timestamp | | |
| `endsAt` | timestamp | ? | Nominal end; actual close depends on bid activity |

**Relationships:**
- Has many `AuctionPlayerState`, `Bid`
- Belongs to `League`, optionally `Conference`

---

### 4.26 AuctionPlayerState

The current state of a single player's auction within an Auction. Separated from Auction because each nominated player has its own expiration clock.

**PRD reference:** §10.4 (auction lifecycle)

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `auctionId` | UUID | | FK |
| `playerId` | UUID | | FK |
| `nominatedByFranchiseId` | UUID | | FK |
| `currentHighBidId` | UUID | ? | FK to `Bid` |
| `currentBidAmount` | decimal(8,2) | | |
| `lastBidAt` | timestamp | | Drives the expiration clock |
| `expiresAt` | timestamp | | Computed from `lastBidAt + League.playerAuctionExpirationHours` |
| `status` | enum | | `OPEN` / `CLOSED_AWARDED` / `CLOSED_NO_BIDS` |
| `awardedContractId` | UUID | ? | Set when auction closes and contract is created |

**Constraints:**
- Unique on `(auctionId, playerId)` — a player can only be auctioned once per auction

---

### 4.27 Bid

A single bid on an auction player. Both live-placed bids and proxy max bids are represented.

**PRD reference:** §10.5, §10.6

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `auctionPlayerStateId` | UUID | | FK |
| `franchiseId` | UUID | | FK |
| `playerId` | UUID | | FK (denormalized from AuctionPlayerState for indexing) |
| `amount` | decimal(8,2) | | The amount the bidder leads at |
| `maxProxyAmount` | decimal(8,2) | ? | The bidder's secret max |
| `comment` | string | ? | |
| `placedAt` | timestamp | | |
| `status` | enum | | `ACTIVE` / `OUTBID` / `WINNING` / `WITHDRAWN` |

**Constraints:**
- At most one `ACTIVE` or `WINNING` bid per franchise per AuctionPlayerState at any moment
- `maxProxyAmount >= amount` when not null

---

### 4.28 WaiverClaim

A pending or processed waiver claim. One per franchise per player per week.

**PRD reference:** §11.3

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `franchiseId` | UUID | | FK |
| `playerToAddId` | UUID | | FK |
| `playerToDropId` | UUID | ? | FK |
| `bidAmount` | decimal(8,2) | ? | Null for non-blind-bid systems |
| `priority` | int | | Franchise's priority within its own claim list (lower = higher priority) |
| `submittedAt` | timestamp | | |
| `status` | enum | | `PENDING` / `SUCCESSFUL` / `FAILED` / `CANCELLED` |
| `failureReason` | string | ? | Human-readable |
| `processedAt` | timestamp | ? | When the waiver cycle processed this claim |
| `contractYearsRequested` | int | ? | Owner's requested contract length for the claimed player |

**Relationships:**
- Belongs to `Franchise`, `League`

---

### 4.29 Trade

A trade proposal between two franchises. State machine from proposal through completion or reversal.

**PRD reference:** §12.3

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `proposerFranchiseId` | UUID | | FK |
| `receiverFranchiseId` | UUID | | FK |
| `status` | enum | | See §5 Trade Status enum |
| `proposedAt` | timestamp | | |
| `acceptedAt` | timestamp | ? | |
| `rejectedAt` | timestamp | ? | |
| `completedAt` | timestamp | ? | |
| `reversedAt` | timestamp | ? | |
| `expiresAt` | timestamp | | |
| `autoExpireDays` | int | | Snapshot of `League.tradeProposalDefaultExpirationDays` at proposal |
| `requiresEarlyBuyIn` | bool | | True if any asset is a future pick in round ≤ `earlyBuyInMaxRound` |
| `earlyBuyInPaidAt` | timestamp | ? | |
| `earlyBuyInDeadline` | timestamp | ? | |

**Relationships:**
- Has many `TradeAsset` (split by side — proposer and receiver)
- Has many `TradeVote` (during `PENDING_VOTE`)
- Has many `TradeComment`

**Constraints:**
- `proposerFranchiseId != receiverFranchiseId`
- Trade can only be accepted when `status = PROPOSED` and not expired
- Reversal within `tradeReversalWindowMinutes` requires both parties' consent (see PRD §12.6)

---

### 4.30 TradeAsset (join entity)

An individual asset in a trade. Assets are typed — a trade with "Player A + pick + $5 BBD for Player B" generates four TradeAsset records.

**PRD reference:** §12.4

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `tradeId` | UUID | | FK |
| `side` | enum | | `PROPOSER` / `RECEIVER` — which side is giving this asset |
| `assetType` | enum | | `PLAYER` / `DRAFT_PICK` / `BLIND_BID_DOLLARS` / `SALARY_ADJUSTMENT` |
| `playerId` | UUID | ? | Required if `assetType = PLAYER` |
| `contractId` | UUID | ? | Required if `assetType = PLAYER`; contract transfers entirely |
| `draftPickId` | UUID | ? | Required if `assetType = DRAFT_PICK` |
| `bbdAmount` | decimal(8,2) | ? | Required if `assetType = BLIND_BID_DOLLARS` |
| `salaryAdjustmentAmount` | decimal(8,2) | ? | Required if `assetType = SALARY_ADJUSTMENT`; signed |

**Constraints:**
- Exactly one of `playerId`, `draftPickId`, `bbdAmount`, `salaryAdjustmentAmount` is non-null, matching `assetType`

**Worked example — connecting Trade → TradeAsset → Contract:**

A trade where Franchise A gives Ja'Marr Chase + their 2027 1st-round pick to Franchise B for Justin Jefferson + $10 BBD:

```
Trade { id: T1, proposerFranchiseId: A, receiverFranchiseId: B }

TradeAsset { tradeId: T1, side: PROPOSER, assetType: PLAYER,
             playerId: chase, contractId: chaseContract }
TradeAsset { tradeId: T1, side: PROPOSER, assetType: DRAFT_PICK,
             draftPickId: pickA2027R1 }
TradeAsset { tradeId: T1, side: RECEIVER, assetType: PLAYER,
             playerId: jefferson, contractId: jeffersonContract }
TradeAsset { tradeId: T1, side: RECEIVER, assetType: BLIND_BID_DOLLARS,
             bbdAmount: 10.00 }

On completion:
  - chaseContract.franchiseId changes from A to B
  - jeffersonContract.franchiseId changes from B to A
  - pickA2027R1.currentFranchiseId changes to B
  - BBD balances adjust
  - Transaction record of type TRADE_COMPLETED is created
```

---

### 4.31 TradeVote

A vote on a trade that is in `PENDING_VOTE` status. One per franchise per trade.

**PRD reference:** §12.5 (league vote flow)

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `tradeId` | UUID | | FK |
| `franchiseId` | UUID | | FK |
| `vote` | enum | | `ACCEPT` / `REJECT` / `ABSTAIN` |
| `voterUserId` | UUID | | FK — which user cast it |
| `castAt` | timestamp | | |

**Constraints:**
- Unique on `(tradeId, franchiseId)`

---

### 4.32 TradeComment

A comment on a trade. Threaded, for discussion.

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `tradeId` | UUID | | FK |
| `authorUserId` | UUID | | FK |
| `body` | string | | ≤ 2000 chars |
| `postedAt` | timestamp | | |

---

### 4.33 CalendarEvent

A scheduled or recurring event in a League's season calendar.

**PRD reference:** §8.2, §8.3, §8.4

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `eventType` | enum | | See §5 Calendar Event Type enum |
| `title` | string | | Display label |
| `startAt` | timestamp | | |
| `endAt` | timestamp | ? | For ranges |
| `recurrence` | enum | | `ONCE` / `WEEKLY` / `DAILY` |
| `recurrenceCount` | int | ? | How many times the event repeats |
| `anchorWeek` | int | ? | For events anchored to fantasy week N |
| `systemEnforced` | bool | | If true, the event fires system actions |
| `status` | enum | | `SCHEDULED` / `COMPLETED` / `CANCELLED` |

**Relationships:**
- Belongs to `League`

---

### 4.34 Season

A snapshot of a League's per-season state. One row per League per season. Distinct from `League` because it preserves historical values that change with rollover.

**PRD reference:** Implied by §7.14 (rollover), §16.7 (league history)

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `seasonYear` | int | | |
| `salaryCapAmount` | decimal(8,2) | ? | Snapshot of the cap for this season |
| `entryFeeAmount` | decimal(10,2) | ? | |
| `championFranchiseId` | UUID | ? | |
| `runnerUpFranchiseId` | UUID | ? | |
| `regularSeasonPointsLeaderId` | UUID | ? | |
| `status` | enum | | `SETUP` / `ACTIVE` / `POSTSEASON` / `COMPLETED` |
| `startedAt` | timestamp | ? | |
| `completedAt` | timestamp | ? | |

**Constraints:**
- Unique on `(leagueId, seasonYear)`

**Decision note.** A separate Season entity lets a Dynasty league accumulate history across many seasons — each Season row is immutable once `COMPLETED` and drives the history display (PRD §16.7).

---

### 4.35 PayoutStructure

Describes how the league's prize pool distributes at season end. One row per placement.

**PRD reference:** §17.5

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `seasonYear` | int | | |
| `placement` | string | | "Champion," "Runner-up," "Bye winner," "Wildcard winner," etc. |
| `amount` | decimal(10,2) | ? | Fixed amount; mutually exclusive with `percentage` |
| `percentage` | decimal(5,2) | ? | % of pot; mutually exclusive with `amount` |
| `conditions` | JSON | ? | E.g., `{ bracketName: "Super Bowl", conference: "AFC" }` |
| `displayOrder` | int | | |

**Constraints:**
- Exactly one of `amount` or `percentage` is non-null

---

### 4.36 AccountingEntry

A single line in a franchise's accounting ledger.

**PRD reference:** §17.3

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `franchiseId` | UUID | | FK |
| `eventType` | enum | | See §5 Accounting Event Type enum |
| `amount` | decimal(10,2) | | Signed; positive = credit, negative = debit |
| `referencedTransactionId` | UUID | ? | Link to triggering Transaction |
| `description` | string | | |

**Relationships:**
- Belongs to `League`, `Franchise`
- Optionally references a `Transaction`

---

### 4.37 MessageBoardTopic / MessageBoardPost

Threaded discussion forum. One board per league. Topics contain posts.

**PRD reference:** §16.1

**MessageBoardTopic**

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `authorUserId` | UUID | | FK |
| `title` | string | | ≤ 120 chars |
| `isPinned` | bool | | Commissioner pin |
| `isLocked` | bool | | No new replies allowed |
| `lastPostAt` | timestamp | | Denormalized for sorting |

**MessageBoardPost**

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `topicId` | UUID | | FK |
| `authorUserId` | UUID | | FK |
| `body` | string | | Markdown, ≤ 10000 chars |
| `parentPostId` | UUID | ? | For threaded replies |
| `editedAt` | timestamp | ? | Null if never edited |

---

### 4.38 ChatMessage

Real-time chat message. Lighter than message board.

**PRD reference:** §16.2

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `authorUserId` | UUID | | FK |
| `targetFranchiseId` | UUID | ? | FK for DMs; null = league-wide |
| `body` | string | | ≤ 2000 chars |
| `postedAt` | timestamp | | |

**Note.** Chat history retention defaults to 30 days (PRD §16.2). Old chat is hard-deleted after retention.

---

### 4.39 Poll / PollOption / PollVote

Commissioner- or owner-created poll within a League.

**PRD reference:** §16.3

**Poll**

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `authorUserId` | UUID | | FK |
| `question` | string | | ≤ 500 chars |
| `voteVisibility` | enum | | `PUBLIC` / `ANONYMOUS` / `ANONYMOUS_UNTIL_CLOSE` |
| `closesAt` | timestamp | | |
| `requiredForLineupSubmit` | bool | | Rare setting |

**PollOption**

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `pollId` | UUID | | FK |
| `label` | string | | |
| `displayOrder` | int | | |

**PollVote**

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `pollId` | UUID | | FK |
| `pollOptionId` | UUID | | FK |
| `voterUserId` | UUID | | FK |
| `castAt` | timestamp | | |

**Constraints:**
- Unique on `(pollId, voterUserId)` — one vote per user per poll

---

### 4.40 Article

Long-form content authored by an owner or commissioner. Distinct from v2 AI narrative content.

**PRD reference:** §16.4

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `authorUserId` | UUID | | FK |
| `franchiseBrandingId` | UUID | ? | Optional franchise to brand with |
| `title` | string | | ≤ 200 chars |
| `body` | string | | Markdown, ≤ 50000 chars |
| `publishedAt` | timestamp | ? | Null = draft |
| `tags` | string[] | | |

---

### 4.41 Newsletter

A composed newsletter, either commissioner-authored or auto-generated from templates.

**PRD reference:** §16.5

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `authorUserId` | UUID | ? | Null if auto-generated |
| `subject` | string | | |
| `body` | string | | HTML for email delivery |
| `scheduledFor` | timestamp | ? | When to send |
| `sentAt` | timestamp | ? | When actually sent |
| `templateSlug` | string | ? | Template key if auto-generated |

---

### 4.42 Notification / NotificationPreference

**Notification** — a single delivered or deliverable notification to a user.

**PRD reference:** §18.6

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `userId` | UUID | | FK — recipient |
| `leagueId` | UUID | ? | Optional league scope |
| `category` | enum | | `ROSTER_EVENT` / `MATCHUP_EVENT` / `LEAGUE_EVENT` / `DEADLINE` |
| `subcategory` | string | | E.g., `"TRADE_PROPOSAL_RECEIVED"`, `"WAIVER_RESULT"`, `"SCORING_PLAY"` |
| `title` | string | | |
| `body` | string | | |
| `referenceEntityType` | string | ? | E.g., `"Trade"`, `"WaiverClaim"` |
| `referenceEntityId` | UUID | ? | |
| `deliveryChannel` | enum | | `IN_APP` / `EMAIL` / `SMS` / `PUSH` |
| `deliveredAt` | timestamp | ? | |
| `readAt` | timestamp | ? | Null until user reads |

**NotificationPreference** — per-user, per-league preference for notification delivery.

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `userId` | UUID | | FK |
| `leagueId` | UUID | ? | Null = global default |
| `category` | enum | | Same as Notification |
| `subcategory` | string | ? | |
| `channels` | string[] | | Subset of `["IN_APP", "EMAIL", "SMS", "PUSH"]` |
| `frequency` | enum | | `IMMEDIATE` / `DIGEST` / `DAILY_SUMMARY` / `OFF` |

---

### 4.43 AuditLogEntry

A generic audit log entry for sensitive commissioner actions. Distinct from `Transaction` — Transactions record *game state* changes; AuditLogEntry records *meta-actions* like "commissioner changed scoring rule."

**PRD reference:** PRD Gap §3.10 (commissioner action audit log)

| Field | Type | ? | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `leagueId` | UUID | | FK |
| `actorUserId` | UUID | | FK |
| `action` | string | | E.g., `"SCORING_RULE_UPDATED"`, `"FRANCHISE_ABILITY_CHANGED"` |
| `targetEntityType` | string | | E.g., `"ScoringRule"`, `"Franchise"` |
| `targetEntityId` | UUID | ? | |
| `before` | JSON | ? | Previous state |
| `after` | JSON | ? | New state |
| `occurredAt` | timestamp | | |

---

### 4.44 Narrative entities (v2 — placeholder)

To be fully specified in `narrative/Spec_NarrativeEngine.md`. Placeholder entities noted here:

- **NarrativeContent** — generated articles, headlines, recaps. Fields: `leagueId`, `scope` (`FRANCHISE` / `MATCHUP` / `LEAGUE` / `PLAYER`), `subjectEntityId`, `contentType`, `body`, `toneSnapshot`, `generatedAt`, `publishedAt`, `approvedByUserId`.
- **NarrativeTone** — stored as JSON on League (commissioner default) and optionally per-Franchise override. Shape described in PRD §19.3.

Narrative entities are explicitly v2 (PRD §19.8) and not part of v1.

---

### 4.45 Standardized Variant entities (v2 — placeholder)

To be fully specified in `foundation/Spec_StandardizedVariants.md`. Placeholder entities:

- **StandardizedVariant** — canonical variant configurations (e.g., "XO Dynasty Classic"). Fields: `name`, `tier`, `scoringRuleSet` (JSON), `rosterStructure` (JSON), `startingLineup` (JSON), `playoffFormat` (JSON), `otherLockedSettings` (JSON), `allowedDeviations` (JSON).
- **VariantCompliance** — per-league compliance status with a variant. Fields: `leagueId`, `variantId`, `seasonYear`, `isCompliant`, `lastCheckedAt`, `driftFields` (JSON list of fields that diverge).

v2 (PRD §21.7).

---

## 5. Enum Reference

All enums collected in one place. Values use `SCREAMING_SNAKE_CASE`.

### 5.1 Tier

```
REDRAFT
KEEPER
DYNASTY
```

### 5.2 Sport

```
NFL   (v1 only)
```

### 5.3 League Status

```
SETUP
ACTIVE
POSTSEASON
OFFSEASON
ARCHIVED
```

### 5.4 Franchise Status

```
ACTIVE
INACTIVE
ORPHANED
```

### 5.5 Player Position

```
QB
RB
WR
TE
PK        (placekicker)
DT
DE
LB
CB
S
```

Additional positions may be added via migration as needed; positions are sourced from sportsdata.io.

### 5.6 Injury Status

```
HEALTHY
QUESTIONABLE
DOUBTFUL
OUT
IR
SUSPENDED
HOLDOUT
COVID     (legacy)
```

### 5.7 IR Eligibility Level

```
NO_PLAYERS
IR_ONLY
IR_OR_OUT
IR_OR_OUT_OR_DOUBTFUL
IR_OR_OUT_OR_DOUBTFUL_OR_Q
NO_REQUIREMENT
```

### 5.8 Taxi Eligibility

```
NO_PLAYERS
ROOKIES_ONLY
LT_2_YEARS
LT_3_YEARS
ALL_PLAYERS
```

### 5.9 Roster Bucket

```
ACTIVE
INJURED_RESERVE
TAXI_SQUAD
```

### 5.10 Contract Status

```
ACTIVE
FRANCHISE_TAGGED
EXTENDED
EXPIRED
```

### 5.11 Contract Acquired Via

```
DRAFT
AUCTION
WAIVER
FCFS
TRADE
COMMISSIONER
```

### 5.12 Salary Cap Type

```
HARD
SOFT
```

### 5.13 Drop Penalty Mode

```
CURRENT_SEASON_ONLY
AMORTIZED
```

### 5.14 Default Salary Assignment

```
ALWAYS
NEVER
WAIVER_ONLY
```

### 5.15 Salary Reset on Drop

```
ALWAYS
NEVER
PROMPT_COMMISSIONER
```

### 5.16 Salary Display Format

```
DOLLARS_ONLY
WITH_CENTS
WITH_COMMAS
MILLIONS_ABBR
```

### 5.17 Franchise Tag Valuation Method

```
TOP_N_AT_POSITION_AVG
TOP_N_AT_POSITION_MEDIAN
TOP_N_AT_POSITION_MAX
FIXED_MULTIPLIER_ON_CURRENT
```

### 5.18 SalaryAdjustment Category

```
DROP_PENALTY
RULE_VIOLATION
BONUS
HANDICAP
OTHER
```

### 5.19 Schedule Mode

```
HEAD_TO_HEAD
ALL_PLAY
TOTAL_POINTS_ONLY
```

### 5.20 Player Pool Isolation

```
SHARED_LEAGUE
ISOLATED_PER_CONFERENCE
```

### 5.21 Initial Roster Mode

```
DRAFT
AUCTION
DRAFT_AND_AUCTION
THIRD_PARTY_DRAFT
MANUAL_LOAD
```

### 5.22 Lineup Lock Mode

```
LOCK_AT_KICKOFF
LOCK_AT_FIRST_KICKOFF
```

### 5.23 Tie Handling

```
ALLOW_TIES
MANUAL_BREAK
COIN_FLIP
MOST_BENCH_POINTS
HIGHEST_STARTER
```

### 5.24 Standings Tiebreaker Names

Used inside the `standingsTiebreakerChain` string[]. Ordered list.

```
OVERALL_WIN_PCT
CONFERENCE_WIN_PCT
DIVISION_WIN_PCT
HEAD_TO_HEAD
TOTAL_POINTS_SCORED
POWER_RANK
DIVISION_POINTS
CONFERENCE_POINTS
COIN_FLIP
```

### 5.25 Playoff Tiebreaker (per-matchup)

```
HIGHEST_SEED_WINS
MOST_BENCH_POINTS
HIGHEST_SCORING_STARTER
COIN_FLIP
MANUAL_COMMISSIONER
```

### 5.26 Draft Mode / Auction Mode

```
LIVE
EMAIL
```

### 5.27 Draft Order Type

```
LINEAR
SNAKE
THIRD_ROUND_REVERSAL
CUSTOM
```

### 5.28 Available Player Pool

```
BOTH_ROOKIES_AND_VETERANS
ROOKIES_ONLY
VETERANS_ONLY
```

### 5.29 Timer Expiration Behavior

```
SKIP_ONLY
USE_DRAFT_LIST_THEN_SKIP
USE_DRAFT_LIST_THEN_EXPERT
USE_DRAFT_LIST_THEN_ADP
```

### 5.30 Auction Starting Funds Mode

```
SAME_FOR_ALL
PER_FRANCHISE
USE_ACCOUNTING_BALANCE
```

### 5.31 Auction Available Funds Reduced By

```
OPEN_BIDS_PLUS_CURRENT_SALARIES
OPEN_BIDS_ONLY
CURRENT_SALARIES_ONLY
```

### 5.32 AuctionPlayerState Status

```
OPEN
CLOSED_AWARDED
CLOSED_NO_BIDS
```

### 5.33 Bid Status

```
ACTIVE
OUTBID
WINNING
WITHDRAWN
```

### 5.34 Auction Status

```
SCHEDULED
OPEN
CLOSED
```

### 5.35 Waiver System

```
BLIND_BID_WITH_FCFS
WAIVER_ORDER_ONLY
FCFS_ONLY
```

### 5.36 Waiver Order Type

```
INVERSE_STANDINGS
RESET_WEEKLY
ROLLING
CUSTOM
```

### 5.37 Blind Bid Tiebreaker

```
EARLIEST_BID_WINS
WAIVER_ORDER
RANDOM
```

### 5.38 WaiverClaim Status

```
PENDING
SUCCESSFUL
FAILED
CANCELLED
```

### 5.39 Trade Processing Mode

```
IMMEDIATE
COMMISSIONER_REVIEW
LEAGUE_VOTE
```

### 5.40 Trade Status

```
PROPOSED
ACCEPTED
REJECTED
EXPIRED
PENDING_VOTE
PENDING_COMMISSIONER
COMPLETED
REVERSED
AUTO_REJECTED
```

### 5.41 Trade Asset Type

```
PLAYER
DRAFT_PICK
BLIND_BID_DOLLARS
SALARY_ADJUSTMENT
```

### 5.42 Trade Asset Side

```
PROPOSER
RECEIVER
```

### 5.43 TradeVote Vote

```
ACCEPT
REJECT
ABSTAIN
```

### 5.44 Calendar Event Type

System-enforced events (drive automation):
```
DRAFT_START
AUCTION_START
PLACE_FREE_AGENTS_ON_WAIVERS
PROCESS_BLIND_BID_WAIVERS
NO_TRADES_ALLOWED
NO_ADD_DROPS_ALLOWED
NO_IR_MOVES_ALLOWED
NO_TAXI_MOVES_ALLOWED
LINEUP_LOCK
TRADE_DEADLINE
ROSTER_COMPLIANCE_DEADLINE
OFFSEASON_ROLLOVER
PLAYOFFS_START
SEASON_END
```

Display-only events:
```
CUSTOM
```

### 5.45 Calendar Event Recurrence

```
ONCE
WEEKLY
DAILY
```

### 5.46 Calendar Event Status

```
SCHEDULED
COMPLETED
CANCELLED
```

### 5.47 Matchup Status

```
SCHEDULED
IN_PROGRESS
COMPLETED
VOIDED
```

### 5.48 Playoff Seeding Mode

```
AUTO_FROM_STANDINGS
MANUAL
DIVISION_WINNERS_PLUS_WILDCARDS
CONFERENCE_SPLIT
```

### 5.49 PlayoffBracket Status

```
SCHEDULED
IN_PROGRESS
COMPLETED
```

### 5.50 Stat Type

Grouped for readability (PRD §6.3). All stored in a single enum at the application level.

Passing:
```
PASSING_TDS
PASSING_YARDS
PASSING_INTS
PASSING_2PT
PASSING_FIRST_DOWNS
PASSING_COMPLETIONS
PASSING_ATTEMPTS
PASSING_SACKS_TAKEN
```

Rushing:
```
RUSHING_TDS
RUSHING_YARDS
RUSH_ATTEMPTS
RUSHING_2PT
RUSHING_FIRST_DOWNS
RUSHING_FUMBLES
```

Receiving:
```
RECEIVING_TDS
RECEIVING_YARDS
RECEPTIONS
RECEIVING_2PT
RECEIVING_FIRST_DOWNS
RECEIVING_TARGETS
```

Kicking:
```
FG_MADE
FG_MADE_LENGTH
FG_MISSED
XP_MADE
XP_MISSED
FG_BLOCKED
```

Return game:
```
PUNT_RETURN_TDS
PUNT_RETURN_YARDS
KICK_RETURN_TDS
KICK_RETURN_YARDS
```

Offensive turnovers:
```
FUMBLES
FUMBLES_LOST
```

Defensive:
```
DEF_TACKLES_SOLO
DEF_TACKLES_ASSIST
DEF_SACKS
DEF_SACK_YARDS
DEF_QB_HITS
DEF_TACKLES_FOR_LOSS
DEF_SAFETIES
DEF_PASSES_DEFENDED
DEF_INTERCEPTIONS
DEF_INT_RETURN_YARDS
DEF_INT_RETURN_TDS
DEF_FORCED_FUMBLES
DEF_FUMBLE_RECOVERIES
DEF_FUMBLE_RECOVERY_TDS
DEF_FUMBLE_RECOVERY_YARDS
DEF_OFFENSIVE_FUMBLE_RECOVERY_TDS
DEF_BLOCKED_KICK_TDS
DEF_BLOCKED_PUNT_TDS
DEF_MISSED_FG_RETURN_TDS
DEF_BLOCKED_PUNTS
DEF_BLOCKED_XP
DEF_PENALTIES
DEF_PENALTY_YARDS
```

Composites (computed):
```
DEF_TOTAL_TACKLES       (solo + assist)
TOTAL_TDS               (rush + rec + return)
```

### 5.51 ScoreAdjustment Scope

```
FRANCHISE
PLAYER
```

### 5.52 Accounting Event Type

```
ENTRY_FEE
WAIVER_ADD_FEE
WAIVER_DROP_FEE
FCFS_ADD_FEE
FCFS_DROP_FEE
TRADE_GIVE_FEE
TRADE_RECEIVE_FEE
TRADE_ENVELOPE_FEE
IR_ACTIVATE_FEE
IR_DEACTIVATE_FEE
TAXI_PROMOTE_FEE
TAXI_DEMOTE_FEE
WEEKLY_WIN_CREDIT
WEEKLY_LOSS_DEBIT
WEEKLY_HIGH_SCORER_CREDIT
WEEKLY_LOW_SCORER_DEBIT
EARLY_BUY_IN_CHARGE
SEASON_PAYOUT
MANUAL_ADJUSTMENT
```

### 5.53 LeagueRole

```
COMMISSIONER
CO_COMMISSIONER
MODERATOR
```

### 5.54 Invitation Channel / Status

```
# Channel
EMAIL
SMS
DIRECT_CODE

# Status
PENDING
ACCEPTED
EXPIRED
REVOKED
```

### 5.55 Transaction Type

See §4.18 for the full list; included here as an enum reference:

```
ADD_DROP
WAIVER_CLAIM
TRADE_COMPLETED
TRADE_REVERSAL
IR_MOVE
TAXI_MOVE
AUCTION_AWARD
DRAFT_PICK_MADE
SALARY_ADJUSTMENT
ROLLOVER
SCORE_ADJUSTMENT
LINEUP_SET
COMMISSIONER_ACTION
```

### 5.56 Notification Category / Delivery Channel / Frequency

```
# Category
ROSTER_EVENT
MATCHUP_EVENT
LEAGUE_EVENT
DEADLINE

# Delivery Channel
IN_APP
EMAIL
SMS
PUSH

# Frequency
IMMEDIATE
DIGEST
DAILY_SUMMARY
OFF
```

### 5.57 Poll Vote Visibility

```
PUBLIC
ANONYMOUS
ANONYMOUS_UNTIL_CLOSE
```

### 5.58 Narrative Voice / Intensity / Length / Humor / References (v2)

Referenced for completeness (PRD §19.3):

```
# voice
NEWSPAPER / HOMER / ROAST / NOIR / SPORTSTALK / CUSTOM

# intensity
SUBTLE / MODERATE / HEIGHTENED

# length
BRIEF / STANDARD / FEATURE

# humor
NONE / LIGHT / MODERATE / HEAVY

# references
STRAIGHT / POP_CULTURE / HISTORICAL
```

---

## 6. Cross-Entity Constraints

Rules that span more than one entity. Enforced at the application layer (transaction handlers own these checks).

### 6.1 Player uniqueness across rosters

- When `League.playerPoolIsolation = SHARED_LEAGUE`: a Player may appear in at most one `RosterEntry` in the League at a time. Equivalent statement: at most one active `Contract` per Player per League.
- When `League.playerPoolIsolation = ISOLATED_PER_CONFERENCE`: a Player may appear in at most one `RosterEntry` *per Conference* in the League. So a 32-team league with NFC+AFC can have Ja'Marr Chase on one NFC franchise *and* one AFC franchise simultaneously.

### 6.2 Contract ↔ RosterEntry consistency

- A `Contract.currentRosterBucket` must match the `bucket` of the `RosterEntry` that references the same `(leagueId, franchiseId, playerId)`.
- When a `RosterEntry` is deleted (player dropped), the corresponding `Contract.status` does not change to `EXPIRED` — the contract persists as a dropped contract, and a `SalaryAdjustment` of category `DROP_PENALTY` is created. The next read that finds no `RosterEntry` for the contract considers it "dropped"; after offseason rollover, the contract may be truly expired.

### 6.3 Starting lineup validity

For any `Matchup`, the set of `LineupEntry` records where `isStarter = true` for a given franchise must satisfy:
- For each position `P`: `startingLineup.positions[P].min <= count(P) <= startingLineup.positions[P].max`
- Sum of all starter counts equals `League.totalStarters`
- If `League.allowPartialLineups = false`, every starter slot must be filled

### 6.4 Cap room check

For leagues with `trackSalaries = true`:
```
capUsage(franchise) = sum(contract.baseSalary × bucketMultiplier(contract.currentRosterBucket))
                    + sum(salaryAdjustment.amount where now ∈ [effectiveDate, expirationDate])
```
where `bucketMultiplier`:
- `ACTIVE` → 1.0
- `INJURED_RESERVE` → `League.irSalaryPercent / 100`
- `TAXI_SQUAD` → `League.taxiSalaryPercent / 100`

Constraint: `capUsage <= (FranchiseSalaryCapOverride for this season, if exists, else League.salaryCapAmount)` for hard-cap leagues. Violations block lineup submission if `blockLineupWhenOverCap = true`.

### 6.5 Trade validity

A proposed trade is valid iff, for both sides, post-trade:
- Roster spot counts ≤ league caps
- Position counts within `rosterPositionLimits`
- Cap room ≥ 0 (hard cap)
- No asset is a locked player (game in progress)
- Any Player-asset's Contract has `contractYearsRemaining > 0` OR `status = FRANCHISE_TAGGED`
- Draft pick assets satisfy `tradeFuturePicksYearsAhead` and `tradeFuturePicksRoundLimit`
- In `ISOLATED_PER_CONFERENCE` mode with `crossConferenceTradesEnabled = false`, both franchises in same conference

### 6.6 Franchise tag constraints

- `franchiseTagsPerFranchisePerSeason` limit enforced per franchise per season
- A player can only be re-tagged by the *same* franchise that last tagged them; if traded while tagged, the acquiring franchise cannot re-tag (PRD §22.14)
- Tag computation requires at least `franchiseTagTopN` active contracts at the player's position in the league; if fewer, fall back to next-best valuation method

### 6.7 Draft pick tradeability

- A pick can be traded only if:
  - `League.tradeFuturePicksEnabled = true` (for future picks)
  - Pick's season ≤ current season + `tradeFuturePicksYearsAhead`
  - Pick's round ≤ `tradeFuturePicksRoundLimit`
  - Franchise trading the pick has it as `currentFranchiseId`
- When traded, `DraftPick.currentFranchiseId` updates; `originalFranchiseId` never changes (it's the source of truth for tiebreakers and history)

### 6.8 Accounting balance and action blocking

- Franchise balance = sum of `AccountingEntry.amount` for that franchise
- If `League.blockActionsBelowBalance` is set and balance < threshold, enumerated actions are blocked (configurable list; defaults to lineup submission and transactions)

### 6.9 LeagueRole uniqueness

- Exactly one active `COMMISSIONER` per League at all times. Transferring commissioner role is a single atomic transaction: revoke old, grant new.

### 6.10 Orphan franchise handling

When a Franchise transitions to `ORPHANED`:
- All `WaiverClaim` records in `PENDING` status are set to `CANCELLED`
- All `Trade` records where this franchise is proposer in `PROPOSED` status are set to `EXPIRED`
- All `Trade` records where this franchise is receiver in `PROPOSED` status are auto-rejected (`REJECTED`)
- `FranchiseOwner` records are updated with `leftAt`; `primaryOwnerUserId` cleared
- Roster and Contract records are preserved; a future owner inherits them

### 6.11 Tier change restrictions

- A League's `tier` field can only be modified when `status = OFFSEASON` (PRD §22.18)
- Valid transitions: Redraft → Keeper → Dynasty (upgrade), Dynasty → Keeper → Redraft (downgrade with data loss warning)
- Downgrade requires commissioner confirmation of data loss (salaries, contracts, future picks dropped)

### 6.12 Historical immutability

When `League.status = ARCHIVED`:
- No inserts, updates, or deletes allowed on any entity scoped to this League
- `Season` records for this league remain readable but immutable
- Re-activation requires an explicit "unseal" admin action logged to `AuditLogEntry`

---

## 7. Derived / Computed Fields

Fields that are NOT stored and are computed on read. These are the most frequently referenced by other specs for reporting and UI.

| Derived field | Computed from | Notes |
|---|---|---|
| `Franchise.capUsage` | Contracts + SalaryAdjustments + bucket multipliers | See §6.4 formula |
| `Franchise.capRoom` | `effectiveCap - capUsage` | Effective cap = override if exists, else League cap |
| `Franchise.effectiveCap` | `FranchiseSalaryCapOverride` if exists for season, else `League.salaryCapAmount` | |
| `Franchise.projectedCapUsage[year]` | Contracts with escalators applied for future years | Powers the forward cap projection (PRD Gap §1.8) |
| `Franchise.record` | Win/loss/tie counts from completed Matchups | Per season |
| `Franchise.pointsFor` | Sum of `homeScore` (when home) + `awayScore` (when away) from completed Matchups | |
| `Franchise.pointsAgainst` | Sum of opponent scores | |
| `Franchise.divisionRecord` | Record against divisional opponents | |
| `Franchise.conferenceRecord` | Record against conferential opponents | |
| `Franchise.powerRank` | Formula from PRD §15.1 using normalized points, recent form, SOS | |
| `Franchise.standingsPosition` | Sort all franchises by `standingsTiebreakerChain` | |
| `Franchise.currentStreak` | Parse the last N matchup outcomes | |
| `Franchise.victoryPoints` | Per PRD §15.3 (W/L/T + weekly top-half bonus) | |
| `Franchise.lastSeenAt` | MAX across `FranchiseOwner.user.lastLoginAt` for active owners | Simplified: max of owners' last league-page access |
| `Franchise.accountingBalance` | Sum of AccountingEntry amounts | |
| `Franchise.futureAssetScore` | Sum of DraftPick value estimates where `currentFranchiseId = franchise.id` | Gap §2.5 |
| `Franchise.balanceOwed` | Entry fee − accounting balance (if negative, balance owed) | |
| `League.currentWeek` | Derived from NFL schedule + League calendar | |
| `League.freeAgents` | Players in league (per pool isolation) not on any RosterEntry | |
| `League.totalCapCommitted` | Sum of Franchise capUsage | |
| `League.averageCapUsage` | `totalCapCommitted / franchiseCount` | |
| `Matchup.score` | Sum of starter `LineupEntry.fantasyPoints` per franchise | |
| `Matchup.winProbability` | Monte Carlo over remaining player projections (PRD §18.5) | Live during game |
| `Player.fantasyPoints[league][week]` | Stats × League's ScoringRules | Cached onto `LineupEntry.fantasyPoints` after matchup write |
| `Contract.projectedSalaryAtYear[N]` | `baseSalary * (1 + salaryEscalatorPercent/100)^N` capped at `contractYearsRemaining` | For forward projections |
| `Contract.dropPenaltyIfDroppedNow` | Formula from PRD §7.8 | Shown in "what-if I drop" UI |
| `Contract.computedTagValue` | Top-N-at-position method (for valuation check) | Only computed on demand |
| `DraftPick.estimatedValue` | Lookup from standard draft pick value chart (to be defined) | Gap §2.5 |
| `Trade.capImpactPreview` | Projected cap for both sides post-trade | Shown in trade UI |
| `WaiverClaim.capImpactIfWon` | Projected cap if bid succeeds | Shown in waiver UI |
| `PlayoffBracket.seeds` | Standings snapshot at `PLAYOFFS_START` event | |

---

## 8. Open Questions

Data model decisions that require product input before finalizing.

### 8.1 Stats storage per-league vs. global

The current design stores `Stats` globally (one record per player per week) and scoring rules per-league. An alternative is to compute and cache `fantasyPoints` per-league per-player per-week in a dedicated `PlayerLeagueWeekScore` table. The current design keeps Stats normalized; the alternative speeds up per-league reports at the cost of more rows and more cache invalidation on stat corrections.

**Recommendation.** Stay with global Stats + compute-on-read fantasyPoints (materialized into `LineupEntry`) for v1. Revisit if scoring recomputation after corrections becomes a bottleneck.

### 8.2 LineupEntry shape for non-starters

Should bench/IR/taxi players also have `LineupEntry` records, or only starters? The current spec includes all roster players as LineupEntry with `slotPosition = BENCH/IR/TAXI` so that bench scores can be computed (needed for the `MOST_BENCH_POINTS` tiebreaker). Alternative: only store starters, compute bench scores on the fly from roster + stats.

**Recommendation.** Store all roster players as LineupEntry. Storage cost is negligible; query simplicity matters.

### 8.3 How much transaction history is "searchable forever"?

Dynasty leagues run for years. A 10-season league with 32 franchises generates potentially 100K+ transactions. Do we index all of them for full-text and filter search, or is recent-season search sufficient?

**Recommendation.** Full search across current + previous season in hot storage; older seasons in cold storage requiring explicit load.

### 8.4 Versioning of JSON field shapes

Each JSON field (`abilities`, `startingLineup`, `rosterPositionLimits`, narrative tone) includes `schemaVersion`. How do we handle migration — lazy (read code handles both) or eager (offline migration job)?

**Recommendation.** Lazy for v1 — ship with version 1 for all fields; commit to eager migration only when version ≥ 3 (i.e., two generations of change).

### 8.5 Do custom players persist after merge?

PRD §22.17 says custom players merge into feed-backed players. Does the custom record hard-delete, soft-delete (with `mergedIntoPlayerId`), or remain as an alias?

**Recommendation.** Soft-delete with `mergedIntoPlayerId` so that historical references to the custom ID continue to resolve.

### 8.6 Draft pick value chart

Referenced in §7 (derived field `estimatedValue`) and PRD Gap §2.5. We need a standard chart (e.g., Jimmy Johnson chart, or a dynasty-specific equivalent). Is this a hardcoded constant table, a `DraftPickValueChart` entity per league, or a platform-global default with per-league override?

**Recommendation.** Platform-global default chart for v1; per-league override in v2.

### 8.7 Narrative entities — when to finalize

Placeholder entities in §4.44 are marked v2. The narrative team will need the data model formalized before building generation. Block this spec's finalization on narrative, or defer?

**Recommendation.** Defer. Ship v1 data model without narrative entities; add them in a future revision of this spec when narrative work begins.

### 8.8 Standardized variant configuration storage

Placeholder §4.45 describes standardized variants as entities. Alternative is to store them as JSON seed data alongside the application rather than as database rows. Since variants are platform-operated (not user-editable), JSON-in-repo may be simpler.

**Recommendation.** JSON seed data in v2; promote to entity only if variants become user-editable.

### 8.9 Event-sourcing granularity

Transactions are the event log. Should non-transactional config changes (League settings edits) also be event-sourced? The current design records them in `AuditLogEntry`, not `Transaction`. Is this a strong enough audit trail?

**Recommendation.** Yes — AuditLogEntry covers the audit need without conflating "what happened in the game" with "what the commissioner configured." Revisit if commissioner disputes become common.

---

**END OF DATA MODEL SPECIFICATION**

*This is version 0.1. This document will be updated in lockstep with changes to the PRD and as feature-level specs make new data model requirements explicit. Any new entity or field introduced in a feature spec must be reflected here.*
