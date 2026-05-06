# Transactions

**Status:** Draft
**Parent:** [Spec_XOPlay_PRD.md §11–12](../Spec_XOPlay_PRD.md#11-adddrop--waivers)
**Related specs:** [Spec_DataModel.md §4.17–4.32, §6.1–6.7](../Spec_DataModel.md), [Spec_Tiers.md §4.6–4.7](../Spec_Tiers.md), [Spec_SalaryCapAndContracts.md](../salary-cap/Spec_SalaryCapAndContracts.md), [Spec_CalendarAndLifecycle.md](../calendar/Spec_CalendarAndLifecycle.md)
**Last updated:** May 2026

---

## Purpose

The transactions system handles every way a player moves between rosters and the free agent pool: add/drop, waiver claims, and trades. It owns the shared validation layer (roster checks, cap checks, player lock enforcement, contract assignment) that every transaction type passes through before executing. It also owns the waiver processing algorithm, the trade state machine, and the rules for when transactions are blocked.

**Design principle: One validation pipeline, three transaction types.** Add/drop, waivers, and trades all funnel through the same roster and cap validation logic. There is no separate validation path per transaction type — the checks are composable, and each transaction type assembles the checks it needs. This prevents rule drift (where trades enforce a cap rule that waivers don't, or vice versa).

**Tier relevance.** The transaction system is tier-agnostic at the engine level. It reads league configuration flags (`trackSalaries`, `waiverSystem`, `tradeProcessing`, etc.) to decide which checks to run. A Redraft league skips cap checks because `trackSalaries = false`. A Dynasty league runs every check. The engine doesn't branch on tier — it branches on flags. See [Spec_Tiers.md §8](../Spec_Tiers.md) for confirmation.

## PRD anchor

This spec expands on:

- §11.1 — Two-phase waiver system (waiver lock → processing → FCFS)
- §11.2 — Waiver configuration fields
- §11.3 — WaiverClaim entity
- §11.4 — Blind bid processing algorithm
- §11.5 — Tiebreaker handling
- §11.6 — FCFS add/drop
- §11.7 — Can't Add / Can't Cut lists
- §11.8 — Custom waiver order
- §12.1 — Trade design principle
- §12.2 — Trade configuration fields
- §12.3–12.4 — Trade and TradeAsset entities
- §12.5 — Trade workflow (immediate, commissioner review, league vote)
- §12.6 — Trade reversal
- §12.7–12.8 — Trade validation and future pick validation
- §12.9 — Trade poll mechanics
- §12.10 — Trade bait
- §12.11 — Commissioner trade authority
- §20.3 — Event sourcing (append-only transaction log)
- §22.9 — Cap violation at lineup time (downstream of transactions)
- §22.14 — Trade of franchise-tagged player

What this spec adds beyond the PRD: the complete shared validation pipeline with check ordering and composability, the full waiver processing algorithm with worked examples, the trade state machine with guard conditions on every transition, contract assignment rules for each transaction type, interaction with the calendar blocking system, commissioner override mechanics, and edge cases the PRD flags but doesn't fully resolve.

---

## Entities & data shapes

Full field definitions live in [Spec_DataModel.md](../Spec_DataModel.md). This section documents how the transaction system uses each entity.

### Entities the system reads

| Entity | Fields used | How used |
|---|---|---|
| **League** (§4.2) | All waiver fields (§4.2.8), all trade fields (§4.2.9), `trackSalaries`, `trackContracts`, `rosterSpots`, `rosterSpotsOffseason`, `rosterPositionLimits`, `playerPoolIsolation` | Configuration source for every validation check. Loaded once per transaction batch. |
| **RosterEntry** (§4.17) | `franchiseId`, `playerId`, `bucket`, `contractId` | Current roster state. The validation pipeline reads roster entries to check spot counts, position limits, and player ownership. |
| **Contract** (§4.13) | `baseSalary`, `contractYearsRemaining`, `status`, `currentRosterBucket` | Cap math inputs. Read during cap validation to compute post-transaction cap usage. |
| **Player** (§4.9) | `position`, `injuryStatus`, `nflStatus` | Position limit validation, IR eligibility checks, Can't Add/Can't Cut list matching. |
| **CalendarEvent** (§4.33) | `eventType`, `startAt`, `endAt`, `status` | Transaction blocking. The system checks for active blocking events (`NO_TRADES_ALLOWED`, `NO_ADD_DROPS_ALLOWED`, etc.) before allowing any transaction. |
| **Season** (§4.34) | `status`, `seasonYear` | Season phase determines which transactions are allowed (e.g., no add/drops during `SETUP`). |
| **DraftPick** (§4.22) | `currentFranchiseId`, `seasonYear`, `round` | Trade validation for pick assets. |
| **FranchiseSalaryCapOverride** (§4.16) | `overrideAmount` | Per-franchise cap override for cap validation. |

### Entities the system writes

| Entity | Fields written | When |
|---|---|---|
| **Transaction** (§4.18) | All fields | Every completed transaction creates an append-only Transaction record. This is the event log. |
| **RosterEntry** (§4.17) | Create/delete rows | Add creates a RosterEntry; drop deletes one. Trades swap entries between franchises. |
| **Contract** (§4.13) | `franchiseId`, `status`, `baseSalary` (on new contracts) | Trades transfer contract ownership. Adds create new contracts (if `trackContracts = true`). Drops may trigger penalties via the cap system. |
| **WaiverClaim** (§4.28) | `status`, `failureReason`, `processedAt` | Waiver processing updates claim status from `PENDING` to `SUCCESSFUL` or `FAILED`. |
| **Trade** (§4.29) | `status`, timestamps (`acceptedAt`, `completedAt`, `reversedAt`, etc.) | Trade state machine transitions. |
| **DraftPick** (§4.22) | `currentFranchiseId` | Trades that include draft picks update ownership. |
| **AccountingEntry** (§4.35) | `amount`, `eventType` | When `accountingEnabled = true`, transactions generate fee entries (waiver add/drop fees, trade fees). |

---

## Shared validation pipeline

Every transaction — add/drop, waiver claim, and trade — passes through the same ordered set of checks before executing. Each transaction type specifies which checks it needs; the pipeline runs them in order and fails fast on the first violation.

### Check catalog

| Check ID | Check name | Description | Used by |
|---|---|---|---|
| `BLK` | Calendar blocking | Is a blocking calendar event active for this transaction type? | All |
| `PHASE` | Season phase | Is the league in a season phase that allows this transaction type? | All |
| `ACCT` | Accounting balance | Does the franchise's accounting balance meet the minimum threshold? | All (when `accountingEnabled`) |
| `OWN` | Player ownership | Does the franchise own (or not own) the player in question? | All |
| `LOCK` | Player lock | Is the player locked (game in progress, dropped player lock period)? | Add, waiver claim |
| `CANT_ADD` | Can't Add list | Is the player on the commissioner's Can't Add list? | Add, waiver claim |
| `CANT_DROP` | Can't Drop list | Is the player on the commissioner's Can't Drop list? | Drop (within add/drop and waiver) |
| `ROSTER` | Roster spot count | Will the post-transaction roster exceed `rosterSpots` (or `rosterSpotsOffseason`)? | All |
| `POS` | Position limits | Will the post-transaction roster violate `rosterPositionLimits`? | All |
| `CAP` | Salary cap room | Will the post-transaction cap usage exceed the franchise's cap? (Hard cap only.) | All (when `trackSalaries`) |
| `CONF` | Conference isolation | In `ISOLATED_PER_CONFERENCE` mode, is the player in the correct conference? | Add, waiver claim |
| `CONTRACT` | Contract validity | For trades: does the player's contract have years remaining (or franchise tag status)? | Trade |
| `PICK` | Draft pick tradeability | Is the pick within `tradeFuturePicksYearsAhead` and `tradeFuturePicksRoundLimit`? | Trade |
| `CROSS` | Cross-conference trade | When `crossConferenceTradesEnabled = false`, are both franchises in the same conference? | Trade |

### Check execution order

Checks run in this exact order. The ordering is intentional — cheaper and more common failures surface first, avoiding unnecessary cap math when the player is simply locked or on the Can't Add list.

```
1. BLK   — Calendar blocking (instant lookup)
2. PHASE — Season phase (instant lookup)
3. ACCT  — Accounting balance (fast sum query)
4. OWN   — Player ownership (roster entry lookup)
5. LOCK  — Player lock (timestamp check)
6. CANT_ADD / CANT_DROP — Commissioner lists (set membership)
7. CONF  — Conference isolation (franchise → division → conference lookup)
8. ROSTER — Roster spot count (count query)
9. POS   — Position limits (count-by-position query)
10. CONTRACT / PICK / CROSS — Trade-specific checks
11. CAP  — Salary cap room (most expensive check — computed last)
```

### Check composition by transaction type

| Transaction type | Checks applied |
|---|---|
| **FCFS add (no drop)** | BLK, PHASE, ACCT, OWN (must not own), LOCK, CANT_ADD, CONF, ROSTER, POS, CAP |
| **FCFS add with drop** | BLK, PHASE, ACCT, OWN (must not own added; must own dropped), LOCK, CANT_ADD, CANT_DROP, CONF, ROSTER, POS, CAP |
| **FCFS drop only** | BLK, PHASE, ACCT, OWN (must own), CANT_DROP, CAP (drop penalty check) |
| **Waiver claim** | BLK, PHASE, ACCT, OWN (must not own), CANT_ADD, CANT_DROP (if dropping), CONF, ROSTER, POS, CAP |
| **Trade (per side)** | BLK, PHASE, ACCT, OWN (must own outgoing assets), LOCK, CONTRACT, PICK, CROSS, ROSTER, POS, CAP |

**Note on `allowInvalidRosterTrades`.** When this league setting is `true`, the `ROSTER` and `POS` checks are skipped for trade proposals. The trade can still be proposed and accepted even if it creates an invalid roster. The franchise is then responsible for fixing their roster before lineup submission. This setting exists because some leagues want to allow "roster dump" trades where a contender absorbs extra players temporarily.

---

## Add/Drop (FCFS)

First-come-first-served add/drop is the simplest transaction. Owner selects a player to add and optionally a player to drop. The system validates and executes immediately.

### Workflow

```
1. Owner selects playerToAdd (required) and playerToDrop (optional).
2. System runs shared validation pipeline (FCFS add or FCFS add-with-drop).
3. If all checks pass:
   a. If dropping: remove RosterEntry for dropped player.
   b. If dropping + trackContracts: invoke drop penalty logic
      (see Spec_SalaryCapAndContracts.md §Drop Penalty).
   c. Create RosterEntry for added player (bucket = ACTIVE).
   d. If trackContracts: create Contract for added player (see §Contract Assignment below).
   e. If accountingEnabled: create AccountingEntry for add/drop fees.
   f. Create Transaction record (type = ADD_DROP).
   g. Send notification to franchise owner and league feed.
4. If any check fails: return validation error with specific check ID and message.
```

### Dropped player lock

When a player is dropped, they become unavailable for re-acquisition for `droppedPlayerLockHours` hours (default: 48). The lock applies to all franchises, including the one that dropped the player.

```
lockExpiresAt = droppedAt + (League.droppedPlayerLockHours * 3600 seconds)
```

If `droppedPlayerLockUntil` is set instead (e.g., "Mon 23:00 ET"), the lock expires at that fixed weekly time after the drop occurs. The fixed-time variant is useful for leagues that want all dropped players to clear waivers on the same schedule regardless of when they were dropped.

The lock is enforced by the `LOCK` check in the validation pipeline. During the lock period, the player appears as "On Waivers" in the UI, even in `FCFS_ONLY` leagues, because the intent is to prevent a franchise from churning players to deny opponents access.

### Drop-only transactions

An owner can drop a player without adding anyone. This is common in Dynasty leagues during roster cutdowns. The validation pipeline runs the "FCFS drop only" check set. Drop penalties still apply if `trackSalaries = true`.

---

## Waivers

The waiver system controls how free agent players are distributed when demand exceeds supply. It operates in two phases per week (or per processing cycle): a locked waiver period where claims are submitted, followed by batch processing that resolves claims by priority.

### Waiver system modes

| Mode | Behavior |
|---|---|
| `BLIND_BID_WITH_FCFS` | Phase 1: Blind bid claims submitted during waiver lock. Phase 2: After processing, remaining players available FCFS. Default for Keeper and Dynasty. |
| `WAIVER_ORDER_ONLY` | Claims processed by waiver priority order (no bidding). Remaining players stay on waivers until next processing cycle. Default for Redraft. |
| `FCFS_ONLY` | No waiver lock, no processing cycle. All free agents are always available for immediate add/drop. No priority ordering. |

### Weekly waiver cycle

For leagues using `BLIND_BID_WITH_FCFS` or `WAIVER_ORDER_ONLY`, the weekly cycle is driven by two calendar events:

```
PLACE_FREE_AGENTS_ON_WAIVERS (e.g., Tue 4pm CT)
  → All free agents become locked. No FCFS adds possible.
  → Owners can submit/edit/cancel waiver claims until processing.

PROCESS_BLIND_BID_WAIVERS (e.g., Tue 8pm CT)
  → System runs the waiver processing algorithm.
  → Successful claims execute; failed claims marked with reason.
  → After processing, remaining free agents become FCFS-available
    (in BLIND_BID_WITH_FCFS mode) or stay on waivers (in WAIVER_ORDER_ONLY mode).
```

These events can recur weekly (`recurrence = WEEKLY`) for the duration of the season. Charlie's FLAG league runs two processing cycles per week (Tue 8pm and Wed 8pm), which means two `PROCESS_BLIND_BID_WAIVERS` events per week.

### Waiver claim submission

An owner submits a waiver claim with:
- `playerToAddId` — required
- `playerToDropId` — optional (required if roster is full)
- `bidAmount` — required in `BLIND_BID_WITH_FCFS` mode; must be ≥ `blindBidMinimum` and a multiple of `blindBidIncrement`
- `priority` — the owner's ranking of this claim relative to their other pending claims (lower number = higher priority)
- `contractYearsRequested` — optional; if `trackContracts = true`, the owner can specify desired contract length

An owner can submit multiple claims on different players. Priority determines which claims are processed first for that franchise. If claim #1 succeeds and fills the franchise's last roster spot, claim #2 is automatically failed ("Roster full").

**Editing and canceling.** Owners can edit bid amounts, change the player to drop, or cancel pending claims at any time before the processing event fires. Once processing begins, all pending claims are locked.

### Bid validation

When `blindBidSalaryLinked = true`, the bid amount comes from the franchise's salary cap space. The validation check is:

```
maxAffordableBid = franchiseCapRoom - (sumOfAllOtherPendingBids)
```

In plain language: if a franchise has $20 in cap room and already has a pending $8 bid on another player, the most they can bid on a second player is $12. This prevents over-commitment — a franchise can't submit $20 bids on five players and hope only one wins.

When `blindBidSalaryLinked = false`, bids come from a separate blind bid dollar (BBD) pool. The validation is the same math but against the BBD balance instead of cap room:

```
maxAffordableBid = remainingBBD - (sumOfAllOtherPendingBids)
```

### Waiver processing algorithm

When the `PROCESS_BLIND_BID_WAIVERS` calendar event fires, the system runs this algorithm:

```
1. Load all PENDING claims for this league.
2. Group claims by playerToAddId.
3. For each player with pending claims (process players in no particular order —
   player processing order does not affect outcomes because each player's claims
   are resolved independently):

   a. Sort claims for this player by:
      i.  bidAmount descending (highest bid first)
      ii. Tiebreaker rule (see §Tiebreaker Handling below)

   b. Walk the sorted list. For each claim:
      i.   Has this franchise already exhausted its budget from prior
           successful claims in this cycle? If yes, FAILED ("Insufficient funds").
      ii.  Is the player still available? (Shouldn't happen within a single
           player group, but defensive check.) If not, FAILED ("Already claimed").
      iii. Run shared validation pipeline (waiver claim check set), using
           the franchise's PROJECTED post-claim state (accounting for all
           successful claims so far in this cycle).
      iv.  If validation passes: award the player.
           - Create RosterEntry, Contract (if tracked), update budget.
           - Mark claim SUCCESSFUL.
           - Mark all remaining claims for this player FAILED ("Outbid").
           - Move to the next player.
      v.   If validation fails: mark claim FAILED with specific reason.
           Continue to next claim for this player.

4. After all players processed:
   - For each franchise, check remaining pending claims (on other players)
     against updated roster/budget state. Cancel any that are no longer valid
     due to roster/budget changes from successful claims.
   - Mark cancelled claims as FAILED ("Roster full after prior claim" or
     "Insufficient funds after prior claim").

5. If waiverSystem = BLIND_BID_WITH_FCFS:
   - All unclaimed players become FCFS-available.
   - FCFS period runs until next PLACE_FREE_AGENTS_ON_WAIVERS event.

6. If waiverSystem = WAIVER_ORDER_ONLY:
   - Unclaimed players remain on waivers until next processing cycle.

7. Create Transaction records (type = WAIVER_CLAIM) for each processed claim.
8. Broadcast results: notify all franchise owners of their claim outcomes.
```

**Critical ordering note.** Step 3 processes players independently, but a franchise's claims span multiple players. When franchise A wins Player X in step 3, their roster and budget change, which affects their eligibility for Player Y. Step 4 handles this by re-checking remaining claims after all player groups are resolved. This is why claims have a `priority` field — within a franchise, higher-priority claims are checked first when multiple claims compete for limited roster/budget space.

### Worked example — blind bid processing

**Setup:**
- League with 3 franchises: Alpha, Beta, Gamma
- `blindBidSalaryLinked = true`
- Alpha has $15 cap room, Beta has $8 cap room, Gamma has $20 cap room
- `blindBidTiebreaker = EARLIEST_BID_WINS`

**Pending claims:**

| Franchise | Player | Bid | Priority | Submitted at |
|---|---|---|---|---|
| Alpha | Patrick Mahomes | $12 | 1 | Mon 2:00pm |
| Beta | Patrick Mahomes | $8 | 1 | Mon 1:00pm |
| Gamma | Patrick Mahomes | $12 | 1 | Mon 3:00pm |
| Alpha | Davante Adams | $3 | 2 | Mon 2:15pm |
| Gamma | Davante Adams | $5 | 2 | Mon 3:15pm |

**Processing:**

Player: Patrick Mahomes
- Sorted by bid desc, then tiebreaker: Alpha ($12, 2:00pm), Gamma ($12, 3:00pm), Beta ($8, 1:00pm)
- Alpha: $12 bid ≤ $15 cap room? Yes. Validation passes. → SUCCESSFUL.
- Gamma and Beta: FAILED ("Outbid").

Player: Davante Adams
- Sorted: Gamma ($5), Alpha ($3)
- Gamma: $5 bid ≤ $20 cap room? Yes. Validation passes. → SUCCESSFUL.
- Alpha: FAILED ("Outbid").

**Post-processing state:**
- Alpha spent $12, has $3 cap room remaining. Davante Adams claim was outbid anyway.
- Gamma spent $5, has $15 cap room remaining.
- Beta spent nothing.

### Worked example — multi-claim priority

**Setup:**
- Franchise Delta has 1 open roster spot and $10 cap room
- Delta submits 3 claims:

| Player | Bid | Priority |
|---|---|---|
| Player X | $6 | 1 |
| Player Y | $4 | 2 |
| Player Z | $3 | 3 |

**Processing:**
- Player X group: Delta wins (no competition). $6 spent, roster now full.
- Player Y group: Delta's claim exists, but roster is full. → FAILED ("Roster full after prior claim").
- Player Z group: same. → FAILED ("Roster full after prior claim").

If Delta had submitted a `playerToDropId` with claims #2 and #3, the system would evaluate whether dropping that player opens a roster spot and sufficient cap room for each subsequent claim.

### Tiebreaker handling

When two franchises submit identical bids on the same player:

| Tiebreaker setting | Resolution |
|---|---|
| `EARLIEST_BID_WINS` | The claim with the earliest `submittedAt` timestamp wins. Encourages early research. |
| `WAIVER_ORDER` | The franchise with better waiver priority wins. Priority is determined by the `waiverOrderType` setting. |
| `RANDOM` | Deterministic coin flip. Seeded by `hash(leagueId + seasonYear + week + playerId)` to ensure reproducibility. |

### Waiver order management

Waiver order (used by `WAIVER_ORDER_ONLY` mode and as a tiebreaker in blind bid mode) is managed per the `waiverOrderType` setting:

| Order type | Behavior |
|---|---|
| `INVERSE_STANDINGS` | Worst regular-season record = highest priority. Recomputed weekly from standings. |
| `ROLLING` | Starts at `INVERSE_STANDINGS`. When a franchise wins a waiver claim, they move to the bottom of the order. Order persists across weeks until reset. |
| `RESET_WEEKLY` | Resets to `INVERSE_STANDINGS` each week. Functionally identical to `INVERSE_STANDINGS` but makes the intent explicit. |
| `CUSTOM` | Commissioner sets the order manually. Order persists until the commissioner changes it. |

**Rolling order worked example:**

Pre-processing order (best to worst priority): [Delta, Alpha, Beta, Gamma]
- Delta wins a claim → moves to bottom: [Alpha, Beta, Gamma, Delta]
- Alpha wins a claim in the same cycle → moves to bottom: [Beta, Gamma, Delta, Alpha]

### Can't Add / Can't Drop lists

These are commissioner-maintained lists that override normal transaction rules.

**Can't Add list** (`cantAddListEnabled`): Players on this list cannot be added by any franchise through any mechanism — FCFS, waiver claim, or trade. Use cases: severely injured players the commissioner wants to keep off rosters, suspended players, custom league rule enforcement.

**Can't Drop list** (`cantDropListEnabled`): Players on this list cannot be dropped. Use cases: franchise-tagged players that bylaws prohibit dropping, keeper-designated players, commissioner-enforced holds.

Both lists are stored as arrays of player IDs on the League entity. Changes to these lists take effect immediately and block in-flight transactions retroactively (a pending waiver claim for a player added to the Can't Add list will fail at processing time).

---

## Trades

Trades are the most complex transaction type. They involve two franchises exchanging assets, multiple resolution models (immediate, commissioner review, league vote), a multi-state lifecycle, and the possibility of reversal.

### Trade state machine

```
                                 ┌──────────────┐
                          ┌─────→│   EXPIRED    │
                          │      └──────────────┘
                          │
┌──────────┐    ┌─────────┴──┐    ┌──────────────┐
│ (create) │───→│  PROPOSED   │───→│   REJECTED   │
└──────────┘    └─────┬──────┘    └──────────────┘
                      │
                      │ receiver accepts
                      ▼
              ┌──────────────────┐
              │    ACCEPTED      │──── (tradeProcessing = IMMEDIATE)
              └───────┬──┬──────┘         │
                      │  │                ▼
    (COMMISSIONER_    │  │         ┌──────────────┐     ┌──────────────┐
     REVIEW)          │  └────────→│  COMPLETED   │────→│  REVERSED    │
                      │            └──────────────┘     └──────────────┘
                      ▼                   ▲
          ┌───────────────────┐           │
          │PENDING_COMMISSIONER│──────────┘ (commissioner approves)
          └────────┬──────────┘
                   │ (commissioner rejects)
                   ▼
          ┌──────────────┐
          │  REJECTED    │
          └──────────────┘

    (LEAGUE_VOTE)
              │
              ▼
    ┌─────────────────┐
    │  PENDING_VOTE   │
    └────┬───────┬────┘
         │       │
         │       │ (autoRejectVoteThreshold met)
         │       ▼
         │  ┌──────────────┐
         │  │ AUTO_REJECTED │
         │  └──────────────┘
         │
         │ (poll closes, majority accepts)
         ▼
    ┌──────────────┐     ┌──────────────┐
    │  COMPLETED   │────→│  REVERSED    │
    └──────────────┘     └──────────────┘
```

### State transitions and guard conditions

| From | To | Guard condition |
|---|---|---|
| — | `PROPOSED` | Proposer creates trade. Validation pipeline runs for proposer's outgoing assets. Trade must have at least one asset per side. `expiresAt` set to `now + tradeProposalDefaultExpirationDays`. |
| `PROPOSED` | `REJECTED` | Receiver explicitly rejects. |
| `PROPOSED` | `EXPIRED` | `now > expiresAt` and no acceptance received. System checks via scheduled job or on-access. |
| `PROPOSED` | `ACCEPTED` | Receiver accepts. Validation pipeline runs for BOTH sides (full check). If validation fails, acceptance is blocked with error detail. |
| `ACCEPTED` | `COMPLETED` | When `tradeProcessing = IMMEDIATE`. Transition is instantaneous — `ACCEPTED` and `COMPLETED` timestamps are identical. Assets transfer, rosters update, contracts reassign. |
| `ACCEPTED` | `PENDING_COMMISSIONER` | When `tradeProcessing = COMMISSIONER_REVIEW`. Commissioner notified. |
| `ACCEPTED` | `PENDING_VOTE` | When `tradeProcessing = LEAGUE_VOTE`. Poll created, all franchise owners notified. |
| `PENDING_COMMISSIONER` | `COMPLETED` | Commissioner approves. Assets transfer. |
| `PENDING_COMMISSIONER` | `REJECTED` | Commissioner rejects. Reason recorded. |
| `PENDING_VOTE` | `COMPLETED` | Poll closes with majority `ACCEPT` votes (and `autoRejectVoteThreshold` not met). |
| `PENDING_VOTE` | `AUTO_REJECTED` | Number of `REJECT` votes ≥ `autoRejectVoteThreshold`. |
| `COMPLETED` | `REVERSED` | Within `tradeReversalWindowMinutes`: either party requests, both must consent. After window: commissioner-only. See §Trade Reversal. |

### Counter-proposals

The PRD mentions counter-proposals (§12.5). A counter-proposal is not a state transition on the existing trade — it creates a **new** Trade entity with a reference to the original. The original trade remains in `PROPOSED` state until explicitly rejected or expired. This keeps the data model clean: each Trade record has one proposer, one receiver, and one set of assets.

### Trade asset types

A trade proposal packages assets into `TradeAsset` records. Four types are supported:

| Asset type | What transfers | Validation |
|---|---|---|
| `PLAYER` | The player's RosterEntry and full Contract (salary, years, status — everything). | Contract must have `contractYearsRemaining > 0` OR `status = FRANCHISE_TAGGED`. |
| `DRAFT_PICK` | Ownership of a DraftPick (`currentFranchiseId` updates; `originalFranchiseId` never changes). | Pick must be within `tradeFuturePicksYearsAhead` and `tradeFuturePicksRoundLimit`. Franchise must be `currentFranchiseId`. |
| `BLIND_BID_DOLLARS` | A numeric amount transferred between BBD balances. Only available when `tradeBlindBidDollars = true`. | Sender must have sufficient BBD balance. |
| `SALARY_ADJUSTMENT` | A one-time cap credit or debit that adjusts the receiving franchise's cap. Signed value: positive = credit (receiving team gains cap room), negative = debit. | Net cap impact must leave both sides cap-compliant (hard cap). |

**Franchise tag trade rules.** When a franchise-tagged player is traded, the tag does NOT transfer to the acquiring franchise. The acquiring team receives the player on their tagged contract, but they cannot re-tag the player. Only the franchise that originally applied the tag can re-tag that player (see [Spec_DataModel.md §6.6](../Spec_DataModel.md)).

### Trade validation (detailed)

Trade validation runs the shared pipeline twice — once per side — with the projected post-trade roster state. The checks are:

```
For each side (proposer and receiver):
  1. BLK   — Is a NO_TRADES_ALLOWED calendar event active?
  2. PHASE — Is the season phase valid for trades?
  3. ACCT  — Accounting balance above threshold?
  4. OWN   — Does the franchise own all outgoing assets?
  5. LOCK  — Are any outgoing players locked (game in progress)?
             Checked only if preventTradeDuringGames = true.
  6. CONTRACT — Every outgoing player has contractYearsRemaining > 0
                or status = FRANCHISE_TAGGED.
  7. PICK  — Every outgoing pick satisfies futurePicksYearsAhead
             and roundLimit.
  8. CROSS — If crossConferenceTradesEnabled = false and
             playerPoolIsolation = ISOLATED_PER_CONFERENCE,
             both franchises must be in the same conference.
  9. ROSTER — Post-trade roster spot count ≤ league limit.
              (Skipped if allowInvalidRosterTrades = true.)
  10. POS  — Post-trade position counts within limits.
              (Skipped if allowInvalidRosterTrades = true.)
  11. CAP  — Post-trade cap usage ≤ franchise cap.
              Includes: incoming player salaries, outgoing player salaries,
              salary adjustment assets, BBD transfers (if salary-linked).
```

### Worked example — trade cap validation

**Setup:**
- Hard cap: $200.00
- Franchise A: current cap usage $185.00
- Franchise B: current cap usage $170.00
- Trade: A gives Player X ($15 salary) to B; B gives Player Y ($8 salary) + $5 salary adjustment credit to A.

**Post-trade cap calculation:**

Franchise A:
```
currentCapUsage                  $185.00
- outgoing Player X salary        -$15.00
+ incoming Player Y salary         +$8.00
- incoming salary adjustment       -$5.00  (credit reduces cap usage)
= post-trade cap usage            $173.00
Cap room: $200.00 - $173.00 =     $27.00  ✓ valid
```

Franchise B:
```
currentCapUsage                  $170.00
+ incoming Player X salary        +$15.00
- outgoing Player Y salary         -$8.00
+ outgoing salary adjustment       +$5.00  (giving credit increases own cap usage)
= post-trade cap usage            $182.00
Cap room: $200.00 - $182.00 =     $18.00  ✓ valid
```

Both sides pass. Trade is valid.

### Trade execution

When a trade transitions to `COMPLETED`, the system executes these steps atomically:

```
1. For each TradeAsset:
   a. PLAYER: 
      - Update Contract.franchiseId to receiving franchise
      - Delete old RosterEntry, create new RosterEntry for receiving franchise
      - If player was on IR/Taxi, new RosterEntry.bucket = ACTIVE
        (receiving franchise must manage bucket assignment separately)
   b. DRAFT_PICK:
      - Update DraftPick.currentFranchiseId to receiving franchise
   c. BLIND_BID_DOLLARS:
      - Deduct from sender's BBD balance, add to receiver's
   d. SALARY_ADJUSTMENT:
      - Create SalaryAdjustment record on receiving franchise

2. If requiresEarlyBuyIn = true:
   - Create AccountingEntry for early buy-in charge
   - Set earlyBuyInDeadline = now + configured deadline days
   - If unpaid by deadline, system auto-reverses the trade
     (see Spec_CalendarAndLifecycle.md for the scheduled check)

3. If accountingEnabled:
   - Create AccountingEntry records for trade fees
     (feeTradeGive for sender, feeTradeReceive for receiver,
      feePerTradeEnvelope if applicable)

4. Create Transaction record (type = TRADE_COMPLETED) with full
   payload documenting all assets exchanged.

5. Broadcast: notify both franchise owners, post to league transaction feed.
```

### Trade reversal

Trade reversal unwinds a completed trade. Two modes:

**Within `tradeReversalWindowMinutes` (default: 10 minutes):**
- Either party can REQUEST reversal.
- Both parties must CONSENT. The requesting party's consent is implicit; the other party must explicitly agree.
- If both consent within the window, the trade reverses.
- If the window expires without both consenting, the trade stands.

**After the reversal window:**
- Only the commissioner can reverse a trade.
- Commissioner reversal is unilateral (no party consent needed).
- Requires an audit trail entry with reason.

**Reversal execution:**
```
1. Create a new Transaction (type = TRADE_REVERSAL) with
   reversalOfTransactionId pointing to the original TRADE_COMPLETED transaction.
2. For each asset: reverse the transfer (move players back, picks back,
   BBD back, void salary adjustments).
3. Contracts return to original franchises with original terms.
4. If early buy-in charges were created, void them.
5. If accounting fees were charged, create offsetting entries.
6. Update Trade.status to REVERSED, set Trade.reversedAt.
```

**Constraints on reversal:**
- A trade can only be reversed once.
- If a player acquired in a trade has already been dropped or traded again, reversal is blocked. The commissioner must untangle the subsequent transactions first.
- If a draft pick acquired in a trade has already been used (player selected), reversal is blocked.

### Trade poll mechanics (LEAGUE_VOTE mode)

When a trade enters `PENDING_VOTE`:

1. A poll is created with duration `votingPollDurationDays`.
2. All franchise owners (except the two trading parties) can vote: `ACCEPT`, `REJECT`, or `ABSTAIN`.
3. The trading parties cannot vote on their own trade.

**Resolution rules:**

| Condition | Outcome |
|---|---|
| Poll closes and `ACCEPT` votes > `REJECT` votes | `COMPLETED` |
| Poll closes and `REJECT` votes ≥ `ACCEPT` votes | `REJECTED` |
| At any point during the poll: `REJECT` votes ≥ `autoRejectVoteThreshold` | `AUTO_REJECTED` immediately |
| `votingRequired = true` and a franchise hasn't voted | That franchise is blocked from lineup submission until they vote |

**Vote visibility:**
- When `votingPollIsPublic = true`: all voters' identities and votes are visible to the league.
- When `votingPollIsPublic = false`: only the aggregate counts are shown during the poll. Individual votes are never revealed.

### Trade bait

Each franchise has a "Trade Bait" section — a soft marketplace where owners list players and picks they're willing to trade and what they're looking for in return. This is not a formal trade offer; it's a signaling mechanism.

Trade bait is stored as a JSON blob on the Franchise entity (or a dedicated `TradeBait` entity — implementation detail). It contains free-form text and optional tagged player/pick IDs. Displayed on the league home page and the franchise's public profile.

This section is informational and does not trigger any validation or transaction logic.

### Commissioner trade authority

Commissioners have elevated trade powers:

| Action | Behavior |
|---|---|
| **Void a completed trade** | Equivalent to reversal, but unilateral. Creates Transaction (TRADE_REVERSAL) with `initiatedByUserId` = commissioner. Requires reason text. |
| **Force-process a stuck trade** | Move a trade in `PENDING_COMMISSIONER` or `PENDING_VOTE` directly to `COMPLETED`, bypassing normal resolution. Audit logged. |
| **Set per-trade expiration override** | Extend or shorten a specific trade proposal's `expiresAt`. |
| **Ban franchise pair from trading** | Block two specific franchises from proposing trades to each other. Anti-collusion tool. Stored as a list of `(franchiseA, franchiseB)` pairs on the League. |

All commissioner trade actions create a Transaction record with `type = COMMISSIONER_ACTION` for audit trail.

---

## Contract assignment

When a player is added to a roster (via add/drop, waiver claim, or trade), the system may need to create or transfer a contract. The rules depend on `trackContracts` and `trackSalaries`.

### When contracts are NOT tracked

If `trackContracts = false` (typical Redraft):
- No Contract is created on add.
- No contract transfers on trade.
- `RosterEntry.contractId` is null.
- Cap checks are skipped.

### When contracts ARE tracked

| Transaction type | Contract behavior |
|---|---|
| **FCFS add** | New Contract created with `baseSalary = League.minimumPlayerSalary`, `contractYearsTotal = 1`, `contractYearsRemaining = 1`, `status = ACTIVE`. |
| **Waiver claim (blind bid, salary-linked)** | New Contract created with `baseSalary = bidAmount`, `contractYearsRemaining` = `contractYearsRequested` (or league default if not specified). |
| **Waiver claim (blind bid, separate BBD)** | New Contract created with `baseSalary = League.minimumPlayerSalary` (BBD is a separate economy from salary). Contract years as above. |
| **Waiver claim (waiver order, no bidding)** | Same as FCFS add — minimum salary, 1-year contract. |
| **Trade** | Contract transfers intact. `Contract.franchiseId` updates to new owner. Salary, years, status, escalators — everything carries over. No new contract created. |
| **Drop** | Contract enters drop penalty processing (see [Spec_SalaryCapAndContracts.md](../salary-cap/Spec_SalaryCapAndContracts.md)). Dead cap hit applies if `dropPenaltyBasePercent > 0`. Contract status → `EXPIRED`. |

### Worked example — waiver claim contract creation (salary-linked)

**Setup:**
- Dynasty league, `blindBidSalaryLinked = true`
- Franchise wins a $7.50 blind bid for a player
- Owner requested 3-year contract

**Contract created:**
```
baseSalary:                $7.50
contractYearsTotal:        3
contractYearsRemaining:    3
salaryEscalatorPercent:    10.0% (league default)
status:                    ACTIVE
currentRosterBucket:       ACTIVE

Year 1 cap hit: $7.50
Year 2 cap hit: $7.50 * 1.10 = $8.25
Year 3 cap hit: $8.25 * 1.10 = $9.08
```

---

## Calendar interaction

The transaction system depends heavily on the calendar system (see [Spec_CalendarAndLifecycle.md](../calendar/Spec_CalendarAndLifecycle.md)) for two purposes: blocking transactions and triggering batch processing.

### Transaction blocking events

| Calendar event type | What it blocks |
|---|---|
| `NO_TRADES_ALLOWED` | All trade proposals, acceptances, and processing. Existing `PROPOSED` trades remain visible but cannot be accepted. |
| `NO_ADD_DROPS_ALLOWED` | All FCFS add/drop transactions. Waiver claims already submitted remain pending until the next processing event. |
| `NO_IR_MOVES_ALLOWED` | IR bucket transitions (covered in Spec_RosterManagement.md). |
| `NO_TAXI_MOVES_ALLOWED` | Taxi squad transitions (covered in Spec_RosterManagement.md). |
| `TRADE_DEADLINE` | Semantically equivalent to `NO_TRADES_ALLOWED` with `endAt = null` (indefinite). Typically marks the end-of-season trade window. |
| `LINEUP_LOCK` | Per-player lock at kickoff. Players whose games have started are locked from all transactions. |

The `BLK` check in the validation pipeline queries active calendar events for the league. An event is "active" when `now >= startAt AND (endAt IS NULL OR now < endAt) AND status = SCHEDULED`.

### Kickoff-based locking

When `noAddDropBetweenKickoffAndEndOfWeek = true`, players are locked from all add/drop and waiver transactions from their NFL game's kickoff until the end of the fantasy week. This is implemented via individual `LINEUP_LOCK` calendar events generated from the NFL schedule (see [Spec_CalendarAndLifecycle.md](../calendar/Spec_CalendarAndLifecycle.md)).

For trades, the `preventTradeDuringGames` setting controls whether players in active games can be traded. When `true`, the `LOCK` check in the trade validation pipeline rejects trades involving players whose games are in progress.

---

## Inputs & outputs

### Triggers

| Trigger | Source | Transaction type |
|---|---|---|
| Owner action: "Add player" / "Drop player" | UI / API | FCFS add/drop |
| Owner action: "Submit waiver claim" | UI / API | Waiver claim submission (creates WaiverClaim record) |
| Calendar event: `PROCESS_BLIND_BID_WAIVERS` | Calendar system | Waiver processing (batch) |
| Owner action: "Propose trade" | UI / API | Trade proposal |
| Owner action: "Accept trade" | UI / API | Trade acceptance → COMPLETED or PENDING_* |
| Commissioner action: "Approve/reject trade" | Commissioner tools | Trade resolution |
| Poll close (scheduled) | Calendar system | Trade resolution (LEAGUE_VOTE) |
| Owner/commissioner action: "Reverse trade" | UI / API | Trade reversal |
| Commissioner action: override | Commissioner tools | Commissioner forced transaction |

### Outputs

| Output | Downstream consumer |
|---|---|
| Transaction record (append-only) | Transaction feed, reporting, narrative engine (v2), audit log |
| RosterEntry changes | Roster display, lineup validation, standings |
| Contract changes | Cap usage computation, cap reports, franchise profile |
| AccountingEntry | Accounting ledger, balance checks |
| WaiverClaim status updates | Owner notification, waiver results display |
| Trade status updates | Trade UI, notification system |
| Notifications | In-app, email, push (per owner preference) |

---

## Edge cases

### E1. Owner submits add/drop for a player claimed in the same waiver cycle

**Scenario:** Waivers process at 8pm. At 8:01pm, owner tries to FCFS-add a player who was just awarded to another franchise in the 8pm processing.

**Behavior:** The `OWN` check catches this — the player now has a RosterEntry with a different franchise. FCFS add fails with "Player is on another roster." This is a normal validation failure, not an edge case from the system's perspective, but it will feel surprising to owners who don't realize waivers just processed.

**Mitigation:** After waiver processing, the system broadcasts results before opening FCFS. The UI should show a brief "Waivers processed — reviewing results" state before enabling the FCFS add button.

### E2. Trade proposed just before trade deadline

**Scenario:** Owner proposes a trade at 11:58pm. Trade deadline is midnight. Receiver tries to accept at 12:01am.

**Behavior:** The `BLK` check at acceptance time catches the active `NO_TRADES_ALLOWED` / `TRADE_DEADLINE` event. Acceptance is blocked. The trade remains in `PROPOSED` state and will eventually expire.

### E3. Waiver claim on a player who was dropped during the waiver lock period

**Scenario:** Owner drops Player X on Tuesday at 5pm (after the 4pm PLACE_FREE_AGENTS_ON_WAIVERS event). Another owner submits a blind bid for Player X. Waivers process at 8pm.

**Behavior:** This depends on `droppedPlayerLockHours`. If the lock period extends past the 8pm processing time, the `LOCK` check fails and the claim is marked FAILED ("Player in drop lock period"). If the lock period has already expired by processing time, the claim is eligible.

**Design decision:** The drop lock should be checked at PROCESSING time, not at claim submission time. This allows owners to submit "speculative" claims on recently dropped players, knowing the claim might fail if the lock hasn't cleared. The alternative (blocking claim submission) would require owners to time their claim submissions, which is unnecessarily punitive.

### E4. Cap violation caused by salary escalator between claim submission and processing

**Scenario:** Owner submits a blind bid during Week 1. By processing time, a salary escalator has been applied to an existing contract (unlikely mid-season, but possible during offseason waiver cycles near rollover), pushing the franchise over cap. The bid itself would still fit, but the franchise's baseline cap usage has changed.

**Behavior:** The `CAP` check at processing time uses the franchise's CURRENT cap state, not the state at claim submission. If the franchise is now over cap, the claim fails. This is correct — the cap check must be point-in-time accurate.

### E5. Trade involving a player who is injured between proposal and acceptance

**Scenario:** Trade is proposed on Monday. Player tears ACL on Sunday. Receiver accepts on Monday after the game.

**Behavior:** The system does NOT block this trade. Injury status is not a validation check — the system validates roster composition and cap, not player health. The receiver accepts knowing the player is injured. This matches real NFL trade behavior.

### E6. Simultaneous FCFS add/drop requests for the same free agent

**Scenario:** Two owners click "Add" on the same player within milliseconds of each other.

**Behavior:** The system must handle this with database-level concurrency control. The first transaction to commit creates a RosterEntry for the player. The second transaction's `OWN` check (or the unique constraint on RosterEntry) fails. The losing owner sees "Player is no longer available." This is the core "first-come-first-served" contract — no queueing, no priority. Whoever's request is processed first wins.

**Implementation note:** Use database row-level locking or optimistic concurrency (version field) on the RosterEntry table to prevent double-claiming.

### E7. Trade reversal after one party has already made roster moves

**Scenario:** Trade completes at noon. At 12:05pm (within the reversal window), the acquiring franchise drops one of the players they received. At 12:08pm, the other party requests reversal.

**Behavior:** Reversal is blocked. The system checks whether all assets from the original trade are still in their post-trade state. If any player has been dropped, traded again, or placed on IR/Taxi, the system returns "Cannot reverse: [Player Name] is no longer on [Franchise Name]'s active roster." Commissioner must intervene to untangle.

### E8. Blind bid exceeds franchise cap room but drop would create room

**Scenario:** Franchise has $5 cap room. Submits a $10 blind bid with a playerToDrop who has a $12 salary. Net cap change if successful: -$10 (new player) + $12 (freed salary) - drop penalty = net cap improvement.

**Behavior:** The `CAP` check must evaluate the POST-transaction state, not just the bid amount against current room. The check computes:
```
postTransactionCapUsage = currentCapUsage + newPlayerSalary - droppedPlayerSalary + dropPenalty
```
If `postTransactionCapUsage ≤ cap`, the bid is valid. This allows owners to "trade up" in salary by dropping higher-paid players — an important Dynasty strategy.

### E9. Waiver claim where the player-to-drop is on the Can't Drop list

**Scenario:** Owner submits a waiver claim nominating a Can't Drop player as the one to drop.

**Behavior:** The claim is submitted successfully (claims are speculative and only validated at processing time). At processing time, the `CANT_DROP` check fails. Claim is marked FAILED ("Cannot drop [Player Name] — player is on Can't Drop list").

**Alternative considered:** Block claim submission. Rejected because Can't Drop lists can change between submission and processing, and blocking submission adds unnecessary complexity.

### E10. League changes waiverSystem mid-season

**Scenario:** Commissioner switches from `BLIND_BID_WITH_FCFS` to `FCFS_ONLY` during Week 8.

**Behavior:** All `PENDING` waiver claims are automatically cancelled. The `PLACE_FREE_AGENTS_ON_WAIVERS` and `PROCESS_BLIND_BID_WAIVERS` calendar events are not deleted but become no-ops (the event handler checks the current `waiverSystem` setting). All free agents immediately become FCFS-available. Future calendar events for waiver processing should be manually cancelled by the commissioner or ignored by the event handler.

### E11. Multi-asset trade where only one side's validation fails

**Scenario:** A trade where Franchise A gives Player X + Pick Y, and Franchise B gives Player Z. Franchise A's post-trade roster is valid, but Franchise B would exceed position limits.

**Behavior:** The entire trade is rejected. Both sides must produce valid post-trade states. The error message identifies which side failed and which check: "Trade blocked: [Franchise B] would exceed maximum WR limit (7/6)."

### E12. Trade proposal sent to a franchise with no active owner

**Scenario:** An orphaned franchise (no assigned owner) receives a trade proposal.

**Behavior:** The trade remains in `PROPOSED` state and will expire after `tradeProposalDefaultExpirationDays`. No one can accept on behalf of an unowned franchise. The commissioner can force-assign an owner, who can then respond to pending proposals.

---

## Open questions

### OQ1. Should waiver claim submission validate bid amount against CURRENT cap room, or only at processing time?

**Current design:** Submission validates that the bid amount doesn't exceed the franchise's theoretical maximum (cap room minus other pending bids). This provides immediate feedback.

**Alternative:** Accept any bid amount at submission and only validate at processing time. This is simpler but lets owners submit impossible bids.

**Recommendation:** Keep current design (validate at submission). The immediate feedback is worth the implementation cost.

### OQ2. Should trade proposals show a "cap preview" before the proposer sends?

**Current design:** Validation runs at acceptance time, not proposal time. The proposer could send a trade that the receiver can't afford.

**Recommendation:** Run a soft validation (non-blocking) at proposal time and show a warning to the proposer: "Warning: this trade may put [Franchise B] over the salary cap." Don't block the proposal — let the proposer send it and let the receiver figure out their own cap situation.

### OQ3. How should the system handle trades during the reversal window for LEAGUE_VOTE trades?

**Context:** For LEAGUE_VOTE trades, the `COMPLETED` → `REVERSED` window starts when the poll closes and the trade completes. But the poll may take 2 days. Should the reversal window start from poll close or from the original acceptance?

**Recommendation:** Start from poll close (i.e., from `completedAt`). The reversal window is about buyer's remorse after the trade actually executes, not about second-guessing the vote.

### OQ4. Should `ROLLING` waiver order reset at the start of each season?

**Current design:** Not specified in the PRD.

**Recommendation:** Yes, reset to `INVERSE_STANDINGS` (based on previous season) at the start of each new season. Commissioner can manually override.

---

## Related buildable units

*To be populated as Level 3 docs are written.*

Anticipated units:
- `Logic_TransactionValidation.md` — the shared validation pipeline
- `Logic_WaiverProcessing.md` — the batch waiver processing algorithm
- `Logic_TradeExecution.md` — trade asset transfer and reversal logic
- `Logic_ContractAssignment.md` — contract creation rules per transaction type
- `Screen_AddDrop.md` — FCFS add/drop UI
- `Screen_WaiverClaims.md` — waiver claim submission and results UI
- `Screen_TradeBuilder.md` — trade proposal creation UI
- `Screen_TradeReview.md` — trade review, voting, and detail UI
- `Component_TradeCapPreview.md` — side-by-side cap impact display
- `Component_WaiverBidForm.md` — bid input with drop selector
- `Component_TransactionFeed.md` — chronological transaction list

---

**END OF SPEC**
