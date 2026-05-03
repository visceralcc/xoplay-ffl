# XO Play — Tier Model Specification

**Configuration Architecture for Redraft, Keeper & Dynasty**

Version 0.1 | April 2026 | Charlie Denison | XO Play (xoplay.co)

**CONFIDENTIAL**

---

**Status:** Draft
**Parent:** [Spec_XOPlay_PRD.md](../Spec_XOPlay_PRD.md) §2
**Related specs:** `Spec_XOPlay_PRD.md` §3.4, §7, §9, §10, §13, §14, §20, §22.18
**Last updated:** April 2026

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | Apr 2026 | Initial tier model spec. Expands PRD §2 comparison matrix into full field-level gating, transition mechanics, UI surface inventory, and default tables. |

---

## 1. Overview

This document is the canonical reference for how XO Play's three tiers — Redraft, Keeper, and Dynasty — differ in configuration, behavior, and user experience. Every feature-level spec in the project should reference this document when answering "does this apply in Redraft?" rather than re-deriving the answer from the PRD.

**Design principle: tier is configuration, not code.** All three tiers share a single data model, a single scoring engine, and a single transaction system. The `tier` field on the League entity acts as a master switch that determines which fields are populated, which rules are enforced, and which UI surfaces appear. There is no `if tier == DYNASTY` branching in business logic — instead, tier sets defaults for lower-level boolean and enum fields (like `trackSalaries`, `trackContracts`, `franchiseTagsEnabled`) and those fields drive behavior directly.

**Who uses this document:**
- Feature spec authors — to determine tier gating for any new feature
- UI/design spec authors — to determine which screens and modules exist per tier
- Build engineers — to implement tier-aware defaults and validation
- QA — to verify tier boundaries are enforced

**What this document does NOT cover:**
- Entity definitions and field types — those belong in the Data Model spec (when written; until then, reference PRD §3, §5, §7, §20)
- Scoring formulas, cap math, transaction algorithms — those belong in feature-level specs
- UI designs or wireframes — those belong in Design Specs
- Standardized Variants within tiers — those are a post-v1 feature (PRD §21)

---

## 2. Design Principles

### 2.1 The data model is tier-agnostic

Every entity (League, Franchise, Player, Contract, Transaction, ScoringRule, Matchup) exists in the schema regardless of tier. A Redraft league still has a `Contract` table — it's just empty. A Redraft league still has `salaryCapAmount` on the League record — it's just `null` or unused.

This means no tier-specific database schemas, no tier-specific API endpoints, and no tier-specific data access layers. The only tier-specific code is in the **defaults engine** (what values to pre-fill at league creation) and the **validation layer** (what combinations are invalid for a given tier).

### 2.2 Tier is locked at creation, changeable only at offseason

The `tier` field is set when a league is created. It cannot change while the league's `status` is `ACTIVE` or `POSTSEASON`. Changes are permitted only during `OFFSEASON` or `SETUP`, and require explicit commissioner confirmation because they have data implications (see §5).

### 2.3 Tier gates defaults and visibility, not capability

A Redraft league that enables `trackSalaries` via an advanced toggle gains access to salary cap features — the tier doesn't hard-block the capability, it simply hides it from the default setup flow. The exception is Keeper-specific features (keeper count, keeper selection rules) which are only meaningful in Keeper tier, and Dynasty-required features (franchise tags, offseason auction, full taxi squad) which are auto-enabled in Dynasty and not available in Redraft.

The practical effect: Redraft is a constrained experience by default but can be loosened. Dynasty is a fully-loaded experience by default. Keeper sits in between.

### 2.4 Commissioner complexity scales with tier

Redraft commissioners see ~6 setup screens. Keeper commissioners see ~8. Dynasty commissioners see ~15. This is achieved by conditionally showing setup steps based on tier, not by having three different setup flows.

---

## 3. Expanded Tier Comparison

The PRD §2.1 provides a summary matrix. This section expands each row with exact behavior.

### 3.1 Season lifecycle

| Behavior | Redraft | Keeper | Dynasty |
|---|---|---|---|
| Season spans | One season. League is `SETUP → ACTIVE → POSTSEASON → ARCHIVED` (or `OFFSEASON` if commissioner chooses to renew). | Multi-season. Full lifecycle: `SETUP → ACTIVE → POSTSEASON → OFFSEASON → ACTIVE → ...` repeating. | Same as Keeper — full lifecycle repeating indefinitely. |
| Offseason exists? | Only if commissioner explicitly renews. Most Redraft leagues archive after the championship. | Yes, always. The offseason is where keepers are selected and the new draft/auction occurs. | Yes, always. The offseason is the most feature-dense period (rollover, tags, auction, rookie draft). |
| Rollover behavior | If renewed: rosters are cleared entirely. All players return to the free agent pool. No contract or salary data carries over (because none existed). | Keepers retained per keeper selection rules. Non-keepers cleared. If contracts were tracked, keeper contracts carry over; non-keeper contracts are deleted. Cap (if tracked) resets per league config. | Full rollover per PRD §7.14: contract years decrement, expiring contracts release players to FA pool, salary escalators apply to surviving contracts, cap amount escalates. Nothing is cleared — the entire roster persists. |

### 3.2 Roster retention

| Behavior | Redraft | Keeper | Dynasty |
|---|---|---|---|
| Offseason roster | Empty (cleared at season end or renewal). | Keepers only. Commissioner configures `keeperCount` (1–6) and selection rules (e.g., "keep up to 3 players drafted in rounds 1–10"). Rest of roster cleared. | Full roster retained. `rosterSpotsOffseason` (default 70) applies during offseason; `rosterSpots` (default 53) applies once roster compliance deadline passes. |
| Roster size range | 10–20 typical. Default: 15. | 15–25 typical. Default: 20. | 40–70 typical. Default: 53 in-season, 70 offseason. |

### 3.3 Contracts and salaries

| Behavior | Redraft | Keeper | Dynasty |
|---|---|---|---|
| `trackContracts` | `false` (locked). No Contract records are created. | Optional. If enabled, contracts track years only (no salary). Default: `false`. | `true` (locked on). Every rostered player has a Contract with salary, years, and status. |
| `trackSalaries` | `false` (locked — unless commissioner enables auction draft, in which case auction budgets exist but salary cap does not persist post-draft). | Optional. If enabled, contracts include salary and the salary cap system activates. Default: `false`. | `true` (locked on). Full salary cap system is always active. |
| Contract fields populated | None. | If enabled: `baseSalary` (optional), `contractYearsTotal`, `contractYearsRemaining`, `acquiredVia`, `status`. Salary fields may be null. | All fields: `baseSalary` (required), `contractYearsTotal`, `contractYearsRemaining`, `acquiredVia`, `status`, `salaryEscalatorPercent`, `contractStatusLabel`, `currentRosterBucket`. |
| Salary cap | Not applicable (no cap screen shown). Exception: if auction draft is used, `startingFundsAmount` exists as a draft budget but is not a persistent cap. | Optional. If `trackSalaries=true`, full cap system activates: `salaryCapAmount`, `salaryCapType`, cap math per PRD §7.5. Default: off. | Required. `salaryCapAmount` (default $200), `salaryCapType` (default `HARD`), all cap math active. |
| Salary escalators | N/A | N/A (even if salaries tracked, escalators don't apply because keepers are re-selected, not rolled over). | Active. `playerSalaryEscalatorPercent` (default 10%) applied at rollover per PRD §7.7. `salaryCapEscalatorPercent` (default 5%) applied to the cap itself. |
| Drop penalties | N/A | N/A (drops are free even if contracts exist, because the contract is cleared at season end anyway). | Active. Full penalty math per PRD §7.8: `dropPenaltyBasePercent` (default 75%) + `dropPenaltyPerAdditionalYearPercent` (default 33%) × additional years. |
| Franchise tags | N/A | N/A | Required. `franchiseTagsEnabled=true` (locked on). Full tag system per PRD §7.10. |
| Rookie salary scale | N/A (single draft, no salary assignment). | N/A (even if salaries tracked, rookie draft is optional and salary scale is a Dynasty feature). | Active. `RookieSalaryScale` table populated per league config. Salaries auto-assigned on draft pick per PRD §7.6. |

### 3.4 Draft and acquisition

| Behavior | Redraft | Keeper | Dynasty |
|---|---|---|---|
| Initial roster mode | Single draft or auction at season start. `initialRosterMode` = `DRAFT` or `AUCTION`. | Same as Redraft for the first season. Subsequent seasons: keeper selection → draft/auction for remaining slots. | First season: auction or draft to populate full rosters. Subsequent seasons: offseason auction (required) + rookie draft (required). |
| Rookie draft | N/A. There is only one draft, and it includes all players. | Optional. If enabled, a separate draft for rookies occurs after keeper selection. `draftRounds` default: 4. | Required. Separate rookie draft each offseason. `draftRounds` default: 8. |
| Free agent auction | Optional (at season start only). | Optional (at season start only). | Required each offseason. The offseason auction is how Dynasty teams acquire veteran free agents. |
| Draft order | Random or commissioner-set. | Random, commissioner-set, or inverse standings (for rookie draft). | Inverse standings for rookie draft (worst record picks first, champion picks last). Per PRD §9.3. |
| Trade depth — picks | Current season picks only. `tradeFuturePicksEnabled=false`. | Up to 1 year ahead. `tradeFuturePicksYearsAhead=1`. | Up to N years ahead. `tradeFuturePicksYearsAhead` default: 2, max: 5. |
| Draft pick entity | Picks exist for the current season's draft only. Not tradeable as standalone assets. | Picks exist for current + 1 future season. Tradeable. | Picks exist for current + N future seasons. First-class tradeable assets with value tracking. |

### 3.5 IR and Taxi Squad

| Behavior | Redraft | Keeper | Dynasty |
|---|---|---|---|
| IR spots | `irSpots` default: 2. Minimal. | `irSpots` default: 3. | `irSpots` default: 20. Full IR management. |
| IR salary impact | N/A (no salaries). | If salaries tracked: `irSalaryPercent` applies (default 20%). Otherwise N/A. | `irSalaryPercent` (default 20%) always applies. |
| IR eligibility | `irEligibilityMinimum` default: `IR_OR_OUT`. | Same as Redraft. | Same default, but more likely to be configured to a permissive level given larger rosters. |
| Taxi squad | `taxiSquadSpots=0` (locked). No taxi squad in Redraft. | `taxiSquadSpots` default: 0. Optional — commissioner can enable. | `taxiSquadSpots` default: 10. Full taxi squad with contract lifecycle per PRD §7.9. |
| Taxi salary impact | N/A | If enabled and salaries tracked: `taxiSalaryPercent` (default 10%). | `taxiSalaryPercent` (default 10%) always applies. |
| Taxi eligibility | N/A | If enabled: `taxiEligibility` default `ROOKIES_ONLY`. | `taxiEligibility` default `ROOKIES_ONLY`. Full taxi rules: 3-year default contract, promotion/demotion lifecycle. |

### 3.6 Trades

| Behavior | Redraft | Keeper | Dynasty |
|---|---|---|---|
| Trade processing | `tradeProcessing` default: `IMMEDIATE`. | Default: `IMMEDIATE`. | Default: `COMMISSIONER_REVIEW` (Dynasty leagues tend to want review given the stakes). |
| Tradeable assets | Players only. No picks, no blind bid dollars. | Players + current and next-season picks. BBD optional. | Players + multi-year future picks + BBD (if enabled). Full asset types per PRD §12.4. |
| Trade cap preview | N/A (no cap). | If cap enabled: shows cap impact. Otherwise N/A. | Always shows cap impact for both teams, current and projected future seasons. |
| Cross-conference trades | Follows `crossConferenceTradesEnabled`. Default: `true` (most Redraft leagues are single-conference). | Same. | Default: `false` when `playerPoolIsolation=ISOLATED_PER_CONFERENCE`. |

### 3.7 Playoffs

Playoff structure is largely tier-agnostic — all three tiers use the same bracket entity, seeding logic, and matchup mechanics (PRD §14). The differences are contextual:

| Behavior | Redraft | Keeper | Dynasty |
|---|---|---|---|
| Default team count | 6 (of 10–12 teams). | 6–8. | 14 (for a 32-team league like FLAG: 7 per conference). |
| Seeding mode | `AUTO_FROM_STANDINGS` or `DIVISION_WINNERS_PLUS_WILDCARDS`. | Same. | `CONFERENCE_SPLIT` common for large leagues. |
| Consolation bracket | Optional. | Optional. | Common (toilet bowl, consolation, etc. — up to 15 brackets). |
| Draft pick implications | None. | Playoff finish may affect next season's draft order. | Playoff finish determines next season's rookie draft order (champion picks last). |

### 3.8 Scoring

**Scoring is entirely tier-agnostic.** The scoring engine, stat types, rule evaluation, presets, and corrections work identically across all three tiers. The only tier-correlated difference is which **preset** a commissioner is likely to start from:

| Tier | Typical preset | IDP support |
|---|---|---|
| Redraft | `STANDARD`, `PPR`, `HALF_PPR` | Optional (usually off). |
| Keeper | `PPR`, `HALF_PPR` | Optional. |
| Dynasty | `IDP_DEEP`, `IDP_STANDARD` | Fully supported and common. |

But a Redraft league can use `IDP_DEEP` and a Dynasty league can use `STANDARD`. The tier doesn't constrain the scoring configuration.

### 3.9 Narrative content (v2)

Narrative depth scales with tier because more data is available to generate stories:

| Tier | Available narrative types | Reason |
|---|---|---|
| Redraft | Weekly recap, matchup preview. | No cross-season history; no contract/salary drama; limited storyline depth. |
| Keeper | Weekly recap, matchup preview, player storylines, trade coverage. | Keeper decisions create storylines ("Will they keep Chase at round 2 value?"). |
| Dynasty | All types: daily headlines, rivalry coverage, franchise histories, draft narratives, offseason drama, contract stories. | Full history, full contract data, full transaction depth — maximum narrative fuel. |

Narrative is v2. This table documents the *intended* tier scaling, not current functionality.

### 3.10 Accounting

| Behavior | Redraft | Keeper | Dynasty |
|---|---|---|---|
| `accountingEnabled` default | `false` | `false` | `false` (but commonly enabled by commissioners of money leagues). |
| Transaction fees | If enabled: simple per-transaction fees. | Same. | Full fee schedule including IR/taxi move fees, trade fees, waiver fees. |
| Early buy-in | N/A (no future picks). | If future picks enabled: `earlyBuyInEnabled` optional. | `earlyBuyInEnabled` optional. Common for leagues trading high-value future picks. |

---

## 4. Per-Tier Field Inventory

This section enumerates every tier-sensitive field on the League entity (and selected other entities). For each field, the table shows whether it is **Required** (must be set), **Optional** (shown in setup, commissioner can enable/disable), **Hidden** (not shown in setup, not populated), or **Locked** (set to a specific value, not changeable by commissioner).

### 4.1 League core fields

These fields exist and are required across all tiers. No tier gating.

`id`, `slug`, `name`, `tier`, `sport`, `seasonYear`, `status`, `timezone`, `franchiseCount`, `conferenceCount`, `divisionCount`, `scheduleMode`, `commissionerUserId`, `createdAt`, `updatedAt`

### 4.2 Roster and lineup fields

| Field | Redraft | Keeper | Dynasty |
|---|---|---|---|
| `rosterSpots` | Required. Default: 15. | Required. Default: 20. | Required. Default: 53. |
| `rosterSpotsOffseason` | Hidden. N/A. | Optional. Default: same as `rosterSpots`. | Required. Default: 70. |
| `irSpots` | Optional. Default: 2. | Optional. Default: 3. | Required. Default: 20. |
| `taxiSquadSpots` | Locked: 0. | Optional. Default: 0. | Required. Default: 10. |
| `playerPoolIsolation` | Optional. Default: `SHARED_LEAGUE`. | Optional. Default: `SHARED_LEAGUE`. | Optional. Default: `SHARED_LEAGUE` (but `ISOLATED_PER_CONFERENCE` for FLAG-style leagues). |
| Starting lineup positions | Required. Default: standard 9-starter (1QB/2RB/2WR/1TE/1FLEX/1DEF/1K). | Required. Default: standard 9-starter. | Required. Default: 22-starter IDP lineup per PRD §5.4. |
| `lineupLockMode` | Required. Default: `LOCK_AT_KICKOFF`. | Same. | Same. |
| `allowPartialLineups` | Optional. Default: `false`. | Same. | Same. |
| `allowByeWeekStarters` | Optional. Default: `true`. | Same. | Same. |

### 4.3 Salary cap and contract fields

| Field | Redraft | Keeper | Dynasty |
|---|---|---|---|
| `trackSalaries` | Locked: `false`.¹ | Optional. Default: `false`. | Locked: `true`. |
| `trackContracts` | Locked: `false`. | Optional. Default: `false`. | Locked: `true`. |
| `salaryCapAmount` | Hidden. | If `trackSalaries=true`: Required. Default: $200. | Required. Default: $200. |
| `salaryCapType` | Hidden. | If `trackSalaries=true`: Optional. Default: `HARD`. | Required. Default: `HARD`. |
| `salaryCapEscalatorPercent` | Hidden. | Hidden (no rollover in Keeper). | Required. Default: 5.0. |
| `minimumPlayerSalary` | Hidden. | If `trackSalaries=true`: Optional. Default: $0.50. | Required. Default: $0.50. |
| `salaryIncrement` | Hidden. | If `trackSalaries=true`: Optional. Default: $0.10. | Required. Default: $0.10. |
| `playerSalaryEscalatorPercent` | Hidden. | Hidden (no escalator in Keeper). | Required. Default: 10.0. |
| `dropPenaltyBasePercent` | Hidden. | Hidden (no drop penalty in Keeper). | Required. Default: 75.0. |
| `dropPenaltyPerAdditionalYearPercent` | Hidden. | Hidden. | Required. Default: 33.0. |
| `irSalaryPercent` | Hidden. | If `trackSalaries=true`: Optional. Default: 20.0. | Required. Default: 20.0. |
| `taxiSalaryPercent` | Hidden. | If `trackSalaries=true` and `taxiSquadSpots>0`: Optional. Default: 10.0. | Required. Default: 10.0. |
| `franchiseTagsEnabled` | Hidden. | Hidden. | Locked: `true`. |
| `franchiseTagsPerFranchisePerSeason` | Hidden. | Hidden. | Required. Default: 1. |
| `franchiseTagValuationMethod` | Hidden. | Hidden. | Required. Default: `TOP_N_AT_POSITION_AVG`. |
| `franchiseTagTopN` | Hidden. | Hidden. | Required. Default: 10. |
| `blockLineupWhenOverCap` | Hidden. | If cap active: Optional. Default: `true`. | Required. Default: `true`. |
| `salaryDisplayFormat` | Hidden. | If salaries active: Optional. Default: `WITH_CENTS`. | Required. Default: `WITH_CENTS`. |

¹ Exception: if `initialRosterMode=AUCTION`, a draft budget (`startingFundsAmount`) exists for the auction, but this is a one-time draft budget — not a persistent salary cap. `trackSalaries` remains `false`; the budget is tracked on the Auction entity, not the League's cap system.

### 4.4 Keeper-specific fields

These fields only exist on Keeper-tier leagues. They are Hidden in Redraft and not applicable in Dynasty (which retains full rosters, not selected keepers).

| Field | Redraft | Keeper | Dynasty |
|---|---|---|---|
| `keeperCount` | Hidden. | Required. Default: 3. Range: 1–6. | Hidden (full roster retained; no "keeper selection" step). |
| `keeperSelectionRules` | Hidden. | Required. JSON describing selection constraints (e.g., "only players drafted in rounds 1–10 eligible," "max 1 per position," "keeper costs escalate by 1 round per year kept"). | Hidden. |
| `keeperSelectionDeadlineDays` | Hidden. | Required. Default: 14. Number of days before draft that keepers must be declared. | Hidden. |

### 4.5 Draft and auction fields

| Field | Redraft | Keeper | Dynasty |
|---|---|---|---|
| `initialRosterMode` | Required. Default: `DRAFT`. Options: `DRAFT`, `AUCTION`, `MANUAL_LOAD`. | Required. Default: `DRAFT`. First season only; subsequent seasons use keeper + draft/auction. | Required. Default: `AUCTION` (first season) or `DRAFT_AND_AUCTION` (offseason auction + rookie draft). |
| `draftRounds` (main draft) | Required. Default: 15. | Required. Default: 12 (fewer rounds because keepers fill some slots). | N/A for main draft (auction fills veteran roster). Rookie draft rounds: default 8. |
| `draftOrderType` | Required. Default: `SNAKE`. | Required. Default: `SNAKE`. | For rookie draft: `LINEAR` (inverse standings). |
| `availablePlayerPool` (draft) | Default: `BOTH_ROOKIES_AND_VETERANS`. | Default: `BOTH`. | Rookie draft: `ROOKIES_ONLY`. Offseason auction: `VETERANS_ONLY` (or `BOTH` if configurable). |
| `tradeFuturePicksEnabled` | Locked: `false`. | Optional. Default: `true`. | Required. Default: `true`. |
| `tradeFuturePicksYearsAhead` | N/A. | Optional. Default: 1. | Required. Default: 2. Max: 5. |
| `earlyBuyInEnabled` | Hidden. | Optional. Default: `false`. | Optional. Default: `false`. |

### 4.6 Waiver fields

Waiver configuration is tier-agnostic in structure but defaults differ:

| Field | Redraft default | Keeper default | Dynasty default |
|---|---|---|---|
| `waiverSystem` | `WAIVER_ORDER_ONLY` | `BLIND_BID_WITH_FCFS` | `BLIND_BID_WITH_FCFS` |
| `blindBidSalaryLinked` | N/A (no salaries). | If salaries: `true`. Otherwise: `false` (separate BBD pool). | `true` (blind bid dollars = salary cap dollars). |
| `droppedPlayerLockHours` | 24 | 48 | 48 |

All other waiver fields (bid minimums, increments, tiebreakers) have the same defaults across tiers.

### 4.7 Trade fields

| Field | Redraft default | Keeper default | Dynasty default |
|---|---|---|---|
| `tradeProcessing` | `IMMEDIATE` | `IMMEDIATE` | `COMMISSIONER_REVIEW` |
| `tradeFuturePicksEnabled` | `false` | `true` | `true` |
| `tradeBlindBidDollars` | `false` | `false` | `false` (optional) |
| `crossConferenceTradesEnabled` | `true` | `true` | Depends on `playerPoolIsolation`. If `ISOLATED_PER_CONFERENCE`: `false`. Otherwise: `true`. |
| `tradeProposalDefaultExpirationDays` | 3 | 5 | 7 |

### 4.8 Playoff fields

Playoff configuration is largely tier-agnostic. Defaults that vary:

| Field | Redraft default | Keeper default | Dynasty default |
|---|---|---|---|
| Bracket team count | 6 | 6 | 14 (7 per conference for 32-team leagues). Scales with `franchiseCount`. |
| `playoffTiebreaker` | `HIGHEST_SEED_WINS` | `HIGHEST_SEED_WINS` | `HIGHEST_SEED_WINS` |
| `thirdPlaceGameEnabled` | `false` | `false` | `true` |

### 4.9 Social and communication fields

All social features (message board, chat, polls, articles) are tier-agnostic. The only tier-correlated difference is the `canWriteLeagueArticles` ability flag, which defaults to `true` across all tiers.

### 4.10 Commissioner setup screen count

| Tier | Approx. setup screens | Screens shown |
|---|---|---|
| Redraft | 6 | League basics → Roster structure → Scoring preset → Draft setup → Schedule → Confirm |
| Keeper | 8 | League basics → Roster structure → Keeper rules → Scoring preset → Draft setup → (Optional: Salary cap) → Schedule → Confirm |
| Dynasty | ~15 | League basics → Conference/Division structure → Roster structure → Scoring preset → Salary cap → Contract rules → Rookie salary scale → Franchise tag rules → Drop penalty rules → Draft setup → Auction setup → Waiver setup → Trade rules → Calendar → Confirm |

---

## 5. Tier Transitions

Tier changes are only permitted when the league's `status` is `OFFSEASON` or `SETUP`. Attempting a tier change during `ACTIVE` or `POSTSEASON` is blocked with an error (PRD §22.18).

### 5.1 Upgrade: Redraft → Keeper

**When permitted:** `OFFSEASON` or `SETUP` (before any season has started).

**What happens:**
1. Commissioner confirms the upgrade and is presented with the Keeper configuration screens (keeper count, selection rules).
2. `tier` changes to `KEEPER`.
3. `trackContracts` becomes available (optional toggle). If enabled, the commissioner must assign contract years to all currently rostered players or accept a default (1 year).
4. `keeperCount` must be set (required).
5. `tradeFuturePicksEnabled` defaults to `true`.
6. All existing roster data is preserved. No players are cleared or modified.
7. Scoring rules, playoff settings, and all other configuration is preserved unchanged.

**Data created:** Keeper-specific fields (`keeperCount`, `keeperSelectionRules`, `keeperSelectionDeadlineDays`) are initialized with defaults.

**Data destroyed:** None.

### 5.2 Upgrade: Keeper → Dynasty

**When permitted:** `OFFSEASON` only (not `SETUP`, because Dynasty assumes existing rosters and history).

**What happens:**
1. Commissioner confirms the upgrade. System displays a summary of implications.
2. `tier` changes to `DYNASTY`.
3. `trackSalaries` is set to `true` (locked on).
4. `trackContracts` is set to `true` (locked on).
5. **Critical step — salary assignment:** Every rostered player needs a salary. The commissioner chooses one of:
   - **Flat default:** All players receive `minimumPlayerSalary` ($0.50). Simple but unrealistic.
   - **Position-based defaults:** System assigns salaries based on a position/ADP-based scale (e.g., top-10 QBs get $20, mid-tier RBs get $8, etc.). Commissioner reviews and adjusts.
   - **CSV import:** Commissioner uploads a salary assignment CSV (format per PRD §7.12).
   - **Manual assignment:** Commissioner assigns each salary individually through the UI.
6. Contract years must be assigned to all players (default: 1 year for all, commissioner can bulk-edit).
7. `salaryCapAmount` is initialized (default $200).
8. Rookie salary scale must be configured (or accept the FLAG default).
9. Keeper-specific fields (`keeperCount`, `keeperSelectionRules`) become hidden — they're no longer relevant because Dynasty retains full rosters.
10. Franchise tag, drop penalty, and salary escalator settings are initialized with defaults.

**Data created:** Contract records for every rostered player. Salary cap configuration. Franchise tag configuration. Rookie salary scale table.

**Data destroyed:** Keeper selection rules (hidden, not deleted — preserved in case of downgrade).

### 5.3 Upgrade: Redraft → Dynasty

**When permitted:** `OFFSEASON` or `SETUP`.

**What happens:** Effectively combines §5.1 and §5.2 — skips the Keeper step. Same salary assignment requirement as §5.2 step 5. Keeper-specific fields are never created.

### 5.4 Downgrade: Dynasty → Keeper

**When permitted:** `OFFSEASON` only.

**What happens:**
1. Commissioner confirms. System displays a warning: "Downgrading to Keeper will disable salary caps, drop penalties, franchise tags, and salary escalators. Contract salary data will be preserved but inactive."
2. `tier` changes to `KEEPER`.
3. `trackSalaries` becomes optional (unlocked). If commissioner disables it, salary fields on contracts remain stored but are hidden from the UI and excluded from all calculations.
4. `trackContracts` remains `true` (contracts are useful in Keeper for tracking years).
5. Franchise tags are disabled (`franchiseTagsEnabled=false`).
6. Drop penalties are disabled.
7. Salary escalators are disabled.
8. Keeper-specific fields are initialized: commissioner must set `keeperCount` and selection rules.
9. Existing contract data (salaries, years) is preserved in the database but salary-dependent features are deactivated.

**Data created:** Keeper configuration fields.

**Data destroyed:** Nothing is deleted. Salary data goes dormant (queryable for history, not used in active calculations).

### 5.5 Downgrade: Keeper → Redraft

**When permitted:** `OFFSEASON` only.

**What happens:**
1. Commissioner confirms. Warning: "Downgrading to Redraft will clear all roster data at the start of next season. Contract and keeper data will be preserved for historical reference but will not carry forward."
2. `tier` changes to `REDRAFT`.
3. `trackContracts` locked to `false`.
4. `trackSalaries` locked to `false`.
5. `taxiSquadSpots` locked to 0.
6. `tradeFuturePicksEnabled` locked to `false`.
7. All keeper-specific fields hidden.
8. At next season start, rosters are cleared (all players return to FA pool for a fresh draft).
9. Historical data (past seasons' rosters, contracts, standings) remains accessible in the archive.

**Data created:** None.

**Data destroyed:** Nothing deleted. Current roster data becomes historical when the new season starts with a clean slate.

### 5.6 Downgrade: Dynasty → Redraft

**When permitted:** `OFFSEASON` only.

**What happens:** Combines §5.4 and §5.5. Everything goes dormant/historical. Fresh draft at next season start.

### 5.7 Transition validation

Before any tier change is committed, the system validates:

| Check | Failure behavior |
|---|---|
| League status is `OFFSEASON` or `SETUP` | Block with error: "Tier changes are only allowed during offseason." |
| Upgrade to Dynasty: all players have salary assignments | Block until commissioner completes salary assignment step. |
| Upgrade to Keeper: `keeperCount` is set | Block until commissioner sets keeper rules. |
| Downgrade from Dynasty: commissioner has confirmed data implications | Block until confirmation. |

---

## 6. Tier-Gated UI Surfaces

This section defines which major screens and modules are visible per tier. This is a surface inventory, not a design spec — it answers "does this screen exist?" not "what does it look like?"

### 6.1 Screens by tier

| Screen / Surface | Redraft | Keeper | Dynasty |
|---|---|---|---|
| League home page | ✓ | ✓ | ✓ |
| Franchise home page | ✓ | ✓ | ✓ |
| Roster view | ✓ | ✓ | ✓ |
| Lineup submission | ✓ | ✓ | ✓ |
| Standings | ✓ | ✓ | ✓ |
| Matchup / Gameday | ✓ | ✓ | ✓ |
| Add/Drop | ✓ | ✓ | ✓ |
| Waiver claims | ✓ | ✓ | ✓ |
| Trade proposal | ✓ | ✓ | ✓ |
| Draft room | ✓ | ✓ (keeper draft + optional rookie draft) | ✓ (rookie draft) |
| Auction room | If `initialRosterMode=AUCTION` | Same | ✓ (offseason auction always exists) |
| IR management | If `irSpots > 0` | If `irSpots > 0` | ✓ |
| Taxi squad management | ✗ (hidden) | If `taxiSquadSpots > 0` | ✓ |
| Salary cap overview | ✗ (hidden) | If `trackSalaries=true` | ✓ |
| Contract report | ✗ (hidden) | If `trackContracts=true` | ✓ |
| Cap usage report | ✗ (hidden) | If `trackSalaries=true` | ✓ |
| Franchise tag screen | ✗ (hidden) | ✗ (hidden) | ✓ |
| Rookie salary scale config | ✗ (hidden) | ✗ (hidden) | ✓ |
| Drop penalty preview | ✗ (hidden) | ✗ (hidden) | ✓ |
| Offseason rollover tool | ✗ (hidden) | ✓ (simplified: keeper selection + draft) | ✓ (full rollover per PRD §7.14) |
| Keeper selection screen | ✗ (hidden) | ✓ | ✗ (hidden — full rosters retained) |
| Future picks inventory | ✗ (hidden) | If `tradeFuturePicksEnabled=true` | ✓ |
| Trade cap preview | ✗ (hidden) | If cap active | ✓ |
| Accounting ledger | If `accountingEnabled` | If `accountingEnabled` | If `accountingEnabled` |
| Message board | ✓ | ✓ | ✓ |
| League chat | ✓ | ✓ | ✓ |
| Polls | ✓ | ✓ | ✓ |
| League articles | ✓ | ✓ | ✓ |
| Newspaper view (v2 narrative) | ✓ (light) | ✓ (medium) | ✓ (full) |
| Commissioner setup wizard | ✓ (6 screens) | ✓ (8 screens) | ✓ (~15 screens) |
| Commissioner tools | ✓ (basic) | ✓ (moderate) | ✓ (full) |
| League health check | ✓ | ✓ | ✓ |

### 6.2 Home page modules by tier

The league home page has configurable modules (PRD §15.5). Some modules are tier-gated:

| Module | Redraft | Keeper | Dynasty |
|---|---|---|---|
| League Standings | ✓ | ✓ | ✓ |
| 10 Newest Transactions | ✓ | ✓ | ✓ |
| Message Board Topics | ✓ | ✓ | ✓ |
| League Chat | ✓ | ✓ | ✓ |
| League Poll | ✓ | ✓ | ✓ |
| Playoff Bracket | ✓ | ✓ | ✓ |
| League Champions | ✗ (single season) | ✓ | ✓ |
| Franchise Owner Activity | ✓ | ✓ | ✓ |
| Monthly Calendar | ✓ | ✓ | ✓ |
| Top Performers | ✓ | ✓ | ✓ |
| Top 10 Free Agents | ✓ | ✓ | ✓ |
| Player News | ✓ | ✓ | ✓ |
| Trade Bait | ✓ | ✓ | ✓ |
| Matchup Chart | ✓ | ✓ | ✓ |
| My Roster Summary | ✓ | ✓ | ✓ |
| Cap Usage Summary | ✗ | If cap active | ✓ |
| Contract Expiration Countdown | ✗ | If contracts active | ✓ |
| Future Draft Picks Summary | ✗ | If future picks enabled | ✓ |

---

## 7. Tier Defaults — Consolidated Tables

All tier-specific defaults in one place. Feature specs should reference this section rather than embedding their own default values.

### 7.1 Redraft defaults

| Setting | Default value |
|---|---|
| `rosterSpots` | 15 |
| `irSpots` | 2 |
| `taxiSquadSpots` | 0 (locked) |
| `trackSalaries` | `false` (locked) |
| `trackContracts` | `false` (locked) |
| Starting lineup | 9 starters: 1QB / 2RB / 2WR / 1TE / 1FLEX / 1DEF / 1K |
| `draftRounds` | 15 |
| `draftOrderType` | `SNAKE` |
| `waiverSystem` | `WAIVER_ORDER_ONLY` |
| `droppedPlayerLockHours` | 24 |
| `tradeProcessing` | `IMMEDIATE` |
| `tradeFuturePicksEnabled` | `false` (locked) |
| `tradeProposalDefaultExpirationDays` | 3 |
| Scoring preset | `STANDARD` or `PPR` |
| Playoff bracket teams | 6 |
| `lineupLockMode` | `LOCK_AT_KICKOFF` |
| `tieHandling` | `ALLOW_TIES` |
| Setup screens | ~6 |

### 7.2 Keeper defaults

| Setting | Default value |
|---|---|
| `rosterSpots` | 20 |
| `irSpots` | 3 |
| `taxiSquadSpots` | 0 (optional) |
| `trackSalaries` | `false` (optional) |
| `trackContracts` | `false` (optional) |
| `keeperCount` | 3 |
| `keeperSelectionDeadlineDays` | 14 |
| Starting lineup | 9 starters (same as Redraft) |
| `draftRounds` | 12 |
| `draftOrderType` | `SNAKE` |
| `waiverSystem` | `BLIND_BID_WITH_FCFS` |
| `droppedPlayerLockHours` | 48 |
| `tradeProcessing` | `IMMEDIATE` |
| `tradeFuturePicksEnabled` | `true` |
| `tradeFuturePicksYearsAhead` | 1 |
| `tradeProposalDefaultExpirationDays` | 5 |
| Scoring preset | `PPR` or `HALF_PPR` |
| Playoff bracket teams | 6 |
| `lineupLockMode` | `LOCK_AT_KICKOFF` |
| `tieHandling` | `ALLOW_TIES` |
| Setup screens | ~8 |

### 7.3 Dynasty defaults

| Setting | Default value |
|---|---|
| `rosterSpots` | 53 |
| `rosterSpotsOffseason` | 70 |
| `irSpots` | 20 |
| `taxiSquadSpots` | 10 |
| `trackSalaries` | `true` (locked) |
| `trackContracts` | `true` (locked) |
| `salaryCapAmount` | $200.00 |
| `salaryCapType` | `HARD` |
| `salaryCapEscalatorPercent` | 5.0% |
| `minimumPlayerSalary` | $0.50 |
| `salaryIncrement` | $0.10 |
| `playerSalaryEscalatorPercent` | 10.0% |
| `dropPenaltyBasePercent` | 75.0% |
| `dropPenaltyPerAdditionalYearPercent` | 33.0% |
| `irSalaryPercent` | 20.0% |
| `taxiSalaryPercent` | 10.0% |
| `taxiEligibility` | `ROOKIES_ONLY` |
| `taxiDefaultContractYears` | 3 |
| `franchiseTagsEnabled` | `true` (locked) |
| `franchiseTagsPerFranchisePerSeason` | 1 |
| `franchiseTagValuationMethod` | `TOP_N_AT_POSITION_AVG` |
| `franchiseTagTopN` | 10 |
| Starting lineup | 22 starters (IDP): 1QB / 1–6RB / 2–7WR / 1–6TE / 1PK / 1–4DT / 1–4DE / 3–5LB / 1–4CB / 1–4S |
| Rookie draft rounds | 8 |
| Rookie draft order | `LINEAR` (inverse standings) |
| Rookie draft player pool | `ROOKIES_ONLY` |
| Offseason auction player pool | `VETERANS_ONLY` |
| `waiverSystem` | `BLIND_BID_WITH_FCFS` |
| `blindBidSalaryLinked` | `true` |
| `droppedPlayerLockHours` | 48 |
| `tradeProcessing` | `COMMISSIONER_REVIEW` |
| `tradeFuturePicksEnabled` | `true` (locked) |
| `tradeFuturePicksYearsAhead` | 2 |
| `tradeProposalDefaultExpirationDays` | 7 |
| Scoring preset | `IDP_DEEP` |
| Playoff bracket teams | 14 (7 per conference for 32-team leagues) |
| `lineupLockMode` | `LOCK_AT_KICKOFF` |
| `tieHandling` | `ALLOW_TIES` |
| `blockLineupWhenOverCap` | `true` |
| `salaryDisplayFormat` | `WITH_CENTS` |
| Setup screens | ~15 |

---

## 8. What Is NOT Tier-Specific

These systems work identically regardless of tier. Feature specs for these areas should NOT add tier-gating unless a specific, documented reason emerges.

| System | Why it's tier-agnostic |
|---|---|
| **Scoring engine** | Same rule evaluation, same stat types, same presets, same corrections. The preset a commissioner selects may correlate with tier (Dynasty commissioners tend toward IDP), but the engine itself doesn't know what tier it's in. |
| **Matchup logic** | Head-to-head, all-play, and total-points-only work the same across tiers. Schedule generation, lineup locking, and score computation are tier-blind. |
| **Standings computation** | Same criteria chain, same power rank formula, same tiebreakers. The columns displayed may differ (Dynasty shows cap info), but the computation is identical. |
| **Player entity** | Players are global. Position, stats, injury status, headshot — all tier-agnostic. A player doesn't know which tier of league they're in. |
| **User entity** | Accounts, authentication, profiles — fully tier-agnostic. |
| **Franchise entity** | Name, logo, colors, owner links, abilities — all tier-agnostic. The franchise doesn't carry tier information; the league does. |
| **Calendar engine** | Event types, scheduling, recurrence — all tier-agnostic. Which events a league uses varies by tier (Dynasty uses more calendar events), but the calendar system itself is universal. |
| **Message board, chat, polls** | All social features are tier-agnostic. |
| **Notification system** | Same channels, same preferences, same delivery. The events that trigger notifications may be more numerous in Dynasty (contract events, tag events), but the notification infrastructure is tier-blind. |
| **Reports** | The report types available may vary by tier (cap usage report only in Dynasty), but the reporting engine and display framework are shared. |
| **Live scoring pipeline** | Same polling, same WebSocket push, same Gameday UI. Tier doesn't affect how fast stats arrive. |

---

## 9. Edge Cases

### 9.1 Mid-season tier change attempt

**Scenario:** Commissioner tries to change tier while league status is `ACTIVE` or `POSTSEASON`.

**Behavior:** Blocked with error: "Tier changes are only allowed during offseason." Commissioner can prepare a draft configuration for the new tier, saved separately, to be applied at rollover. (PRD §22.18)

### 9.2 Downgrade with active contracts

**Scenario:** Dynasty league downgrades to Keeper. Players have multi-year contracts with salaries.

**Behavior:** Contract records persist in the database. The salary cap system deactivates (if commissioner turns off `trackSalaries`), meaning cap-related calculations stop, but the data remains queryable for historical reports. Contract years continue to function if `trackContracts` remains enabled. If contracts are also disabled, all contract data goes dormant.

No contract data is deleted. A subsequent re-upgrade to Dynasty would find all historical contract data intact.

### 9.3 Upgrade with empty rosters

**Scenario:** Redraft league in `SETUP` upgrades to Dynasty before any players are rostered.

**Behavior:** Upgrade proceeds normally. The salary assignment step (§5.2 step 5) is skipped because there are no rostered players. The commissioner configures cap settings, rookie salary scale, etc. Players will get contracts assigned as they're drafted or acquired.

### 9.4 Keeper league enables then disables salaries

**Scenario:** Keeper commissioner enables `trackSalaries`, assigns salaries for a season, then disables `trackSalaries` in the following offseason.

**Behavior:** Salary data on existing contracts is preserved but becomes invisible in the UI and excluded from cap calculations. If re-enabled later, the stored salaries reappear. This is a "soft disable" — the data doesn't vanish.

### 9.5 Dynasty league with zero franchise count at tag time

**Scenario:** A very small Dynasty league (4 teams) tries to compute franchise tag values. The "top 10 at position average" requires 10 players at a position — but 4 teams may not have 10 WRs under contract.

**Behavior:** If fewer than `franchiseTagTopN` players exist at a position, the system uses all available players at that position for the average. If zero players exist at a position, the tag value falls back to `minimumPlayerSalary`. Commissioner can override any tag value manually.

### 9.6 Keeper count exceeds roster size

**Scenario:** Keeper league has `keeperCount=6` but a franchise only has 4 players on their roster at keeper selection time (due to drops, trades, etc.).

**Behavior:** The franchise keeps all 4 players. Keeper count is a maximum, not a requirement. Franchises may keep fewer than `keeperCount` players. The remaining draft/auction slots are adjusted accordingly.

---

## 10. Open Questions

### 10.1 Keeper contract escalation

The PRD doesn't specify whether keeper contracts in Keeper tier should escalate in cost (e.g., a player kept for a second year costs a higher draft pick or salary). Many real-world keeper leagues use escalating keeper costs. This should be defined in the `keeperSelectionRules` JSON schema. Deferred to the Keeper-specific feature spec.

### 10.2 Tier downgrade notification

Should owners be notified when a commissioner changes the tier? Currently the spec only requires commissioner confirmation. Adding owner notification (or even owner vote) for tier changes could prevent commissioner abuse but adds friction.

### 10.3 Hybrid tier configurations

Some leagues want "Keeper with salary cap but without franchise tags" — effectively a Keeper+ that's not quite Dynasty. The current model supports this via Keeper tier with `trackSalaries=true`, which unlocks cap features without enabling tags. This should be validated as sufficient or whether a fourth tier is warranted. Current recommendation: no fourth tier; the optional toggles within Keeper handle this.

### 10.4 Data Model spec dependency

This document references PRD sections for entity definitions. Once `foundation/Spec_DataModel.md` is written, cross-references should be updated to point there instead (e.g., "see `Spec_DataModel.md` §X.Y" rather than "see PRD §7.2").

---

**END OF TIER MODEL SPECIFICATION**
