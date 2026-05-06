# Roster Management

**Status:** Draft
**Parent:** [Spec_XOPlay_PRD.md §5, §13](../Spec_XOPlay_PRD.md#5-players--roster-construction)
**Related specs:** [Spec_DataModel.md §4.17, §4.19–4.20, §4.2.3–4.2.10](../Spec_DataModel.md), [Spec_Tiers.md §3.5, §4.2](../Spec_Tiers.md), [Spec_SalaryCapAndContracts.md](../salary-cap/Spec_SalaryCapAndContracts.md), [Spec_CalendarAndLifecycle.md](../calendar/Spec_CalendarAndLifecycle.md), [Spec_Transactions.md](../transactions/Spec_Transactions.md), [Spec_Auction.md](../auction/Spec_Auction.md), [Spec_Draft.md](../draft/Spec_Draft.md)
**Last updated:** May 2026

---

## Purpose

The roster management system handles everything that happens to a player after they arrive on a franchise's roster: lineup submission, bucket transitions (active ↔ IR ↔ taxi squad), roster validation, position limit enforcement, offseason vs. in-season roster size switching, and the roster compliance deadline. It does NOT handle how players arrive on or leave rosters — that's the domain of the transaction system (add/drop, waivers, trades), draft system, and auction system. This system manages the internal organization and weekly submission of the roster once populated.

**Design principle: Validate always, block selectively.** The system continuously validates roster state against league rules, but whether a violation *blocks* an action (like lineup submission) is configurable per rule. Some leagues want hard enforcement; others want warnings with commissioner discretion. The validation engine is strict; the enforcement policy is flexible.

**Tier relevance.** The roster management engine is tier-agnostic at the mechanical level. It reads league configuration flags (`rosterSpots`, `irSpots`, `taxiSquadSpots`, `irEligibilityMinimum`, `taxiEligibility`, `lineupLockMode`, etc.) to determine behavior. What varies by tier is the complexity of what's being managed:

| Tier | Roster complexity | Key features |
|---|---|---|
| **Redraft** | Small rosters (10–20 players), 0–5 IR spots, no taxi squad. Lineup submission is the primary weekly action. | Lineup submission, basic IR moves, position limit enforcement. |
| **Keeper** | Medium rosters (15–25 players), optional IR and taxi. Keeper selection is the main offseason roster action (covered by a future spec). | Everything in Redraft + optional taxi moves, optional offseason roster sizes. |
| **Dynasty** | Large rosters (40–70 players), 20 IR spots, 10 taxi squad spots. Full offseason roster management with compliance deadlines. | Everything in Keeper + full IR/taxi lifecycle, offseason ↔ in-season roster size transitions, roster compliance deadline enforcement. |

The engine doesn't branch on tier — it reads the configuration and activates the appropriate features.

## PRD anchor

This spec expands on:

- §5.3 — Roster structure (three buckets: active, IR, taxi)
- §5.4 — Starting lineup configuration (per-position min/max)
- §5.5 — Lineup locking modes (per-kickoff vs. first-kickoff)
- §5.6 — Roster-level position limits
- §5.7 — Roster validation (7-point checklist)
- §5.8 — Partial lineups
- §5.9 — Bye week players as starters
- §13.1 — IR configuration (eligibility levels, cooldown, salary impact)
- §13.2 — Taxi squad configuration (eligibility, promotion/demotion, salary impact)
- §13.3 — IR/Taxi state transitions (the bucket transition diagram)
- §13.4 — IR/Taxi moves and contracts
- §13.5 — Automatic IR enforcement (injury status sync)
- §7.5 — Cap usage formula (bucket multipliers for IR and taxi salary weighting)
- §8.3 — Calendar events: `LINEUP_LOCK`, `ROSTER_COMPLIANCE_DEADLINE`, `NO_IR_MOVES_ALLOWED`, `NO_TAXI_MOVES_ALLOWED`
- §22.1 — Player position change mid-season
- §22.2 — Injury status transition to/from IR
- §22.9 — Salary cap violation at lineup time

What this spec adds beyond the PRD: the complete lineup submission algorithm with validation steps, the IR eligibility check with all six levels, the taxi eligibility check, the cooldown enforcement engine, the full roster compliance deadline workflow, the bucket transition state machine with cap impact calculations, lineup carryover logic for dormant owners, and edge cases around cross-system interactions.

---

## Entities & data shapes

Full field definitions live in [Spec_DataModel.md](../Spec_DataModel.md). This section documents how the roster management system uses each entity.

### Entities the system reads

| Entity | Fields used | How used |
|---|---|---|
| **League** (§4.2.3, §4.2.10) | `rosterSpots`, `rosterSpotsOffseason`, `irSpots`, `taxiSquadSpots`, `startingLineup` (JSON), `rosterPositionLimits` (JSON), `lineupLockMode`, `allowPartialLineups`, `allowByeWeekStarters`, `irEligibilityMinimum`, `irAllowSuspended`, `irAllowHoldout`, `irAllowCovid`, `irBlockLineupOnViolation`, `irActivationCooldownDays`, `taxiEligibility`, `taxiAllowByeWeekAdditionally`, `taxiAllowCovidAdditionally`, `taxiPromotionCooldownDays`, `taxiBlockLineupOnViolation`, `taxiDefaultContractYears`, `trackSalaries`, `trackContracts`, `salaryCapAmount`, `salaryCapType`, `irSalaryPercent`, `taxiSalaryPercent`, `blockLineupWhenOverCap`, `allowLineupSubmitWithInvalidRoster` | Configuration source for all roster operations. |
| **Franchise** (§4.3) | `id`, cap data | Identifies the roster owner. Cap usage computed for salary validation. |
| **Player** (§4.9) | `position`, `injuryStatus`, `rookieYear`, `nflTeam`, `isActive` | Position for lineup validation. Injury status for IR eligibility. Rookie year for taxi eligibility. NFL team for bye week and kickoff time lookups. |
| **RosterEntry** (§4.17) | All fields | Current roster state. The central record this system manages. |
| **Contract** (§4.13) | `baseSalary`, `currentRosterBucket`, `status` | Cap impact calculation when players move between buckets. `currentRosterBucket` is the denormalized bucket value updated on every transition. |
| **Matchup** (§4.20) | `week`, `status`, `homeFranchiseId`, `awayFranchiseId` | Identifies which matchup a lineup submission applies to. |
| **CalendarEvent** (§4.33) | `eventType`, `startAt`, `endAt` | `LINEUP_LOCK` events for per-player lockout. `ROSTER_COMPLIANCE_DEADLINE` for offseason → in-season transition. `NO_IR_MOVES_ALLOWED` and `NO_TAXI_MOVES_ALLOWED` for blocking periods. |
| **Season** (§4.34) | `status` | Determines whether offseason or in-season roster limits apply. |

### Entities the system writes

| Entity | Fields written | When |
|---|---|---|
| **RosterEntry** (§4.17) | `bucket`, `enteredBucketAt` | On every bucket transition (active ↔ IR ↔ taxi). |
| **Contract** (§4.13) | `currentRosterBucket` | Updated on every bucket transition to keep the denormalized field in sync. |
| **LineupEntry** (§4.19) | All fields | Created or updated on lineup submission. One row per player per franchise per matchup. |
| **Transaction** (§4.18) | `type = IR_MOVE`, `TAXI_MOVE`, `LINEUP_SET` | Every bucket transition and lineup submission creates a Transaction record. |

---

## Lineup submission

Lineup submission is the most frequent owner action in the system. Each week, owners assign their rostered players to starting and bench slots for that week's matchup.

### Submission workflow

```
1. Owner selects starters from their ACTIVE roster for the upcoming
   matchup week.

2. System runs lineup validation (see §Lineup Validation).

3. If all checks pass:
   a. Create or update LineupEntry records for this franchise × matchup.
      - Each rostered player gets a LineupEntry with:
        slotPosition: the position slot they occupy (QB, RB, WR, etc.)
                      or BENCH for non-starters
        isStarter: true if slotPosition is a starting position
        submittedAt: now
        lockedAt: null (set when the player's game kicks off)

   b. Create Transaction {
        type: LINEUP_SET,
        payload: { franchiseId, week, lineup: [{playerId, starter: bool}] }
      }

   c. Confirm to owner: "Lineup submitted for Week [N]."

4. If any check fails: return validation errors. Do NOT partially save
   the lineup — it's all or nothing.
```

### Lineup validation

The lineup validation runs these checks in order:

```
1. ROSTER VALIDITY
   Is the franchise's overall roster currently valid?
   - count(ACTIVE) <= rosterSpots
   - count(INJURED_RESERVE) <= irSpots
   - count(TAXI_SQUAD) <= taxiSquadSpots
   
   If invalid AND allowLineupSubmitWithInvalidRoster = false:
     reject: "Your roster is invalid. [specific violation]."
   If invalid AND allowLineupSubmitWithInvalidRoster = true:
     warn but allow submission.

2. STARTER COUNT
   Does the lineup have the correct number of starters?
   totalStarters = count(players where isStarter = true)
   If totalStarters != League.startingLineup.totalStarters:
     If totalStarters < required AND allowPartialLineups = true:
       allow (empty slots score 0).
     If totalStarters < required AND allowPartialLineups = false:
       reject: "Lineup requires [N] starters; you have [M]."
     If totalStarters > required:
       reject: "Too many starters ([M]/[N])."

3. POSITION MIN/MAX
   For each position in League.startingLineup:
     positionCount = count(starters at this position)
     If positionCount < position.min:
       reject: "Need at least [min] [position] starter(s); you have [count]."
     If positionCount > position.max:
       reject: "Maximum [max] [position] starter(s); you have [count]."

4. PLAYER ELIGIBILITY
   For each starter:
     a. Is the player on the ACTIVE roster (bucket = ACTIVE)?
        IR and taxi players cannot be started.
        If not: reject: "[Player] is on [IR/Taxi] and cannot start."
     
     b. Is the player locked (game already kicked off)?
        If lineupLockMode = LOCK_AT_KICKOFF:
          Check if this player's NFL game has kicked off.
          If locked: this player's slot cannot be changed. The player
          remains in whatever slot they were in at lock time.
        If lineupLockMode = LOCK_AT_FIRST_KICKOFF:
          Check if ANY NFL game has kicked off this week.
          If locked: entire lineup is frozen. No changes allowed.

5. BYE WEEK CHECK
   If allowByeWeekStarters = false:
     For each starter:
       Is the player's NFL team on bye this week?
       If yes: reject: "[Player] is on bye and cannot start."

6. IR VIOLATION CHECK
   If irBlockLineupOnViolation = true:
     Are any players on IR who no longer meet IR eligibility?
     (e.g., player was IR'd when OUT, now marked HEALTHY)
     If yes: reject: "[Player] is on IR but is no longer eligible
              (status: HEALTHY). Activate or drop before submitting."

7. TAXI VIOLATION CHECK
   If taxiBlockLineupOnViolation = true:
     Are any players on taxi who no longer meet taxi eligibility?
     (e.g., player aged out of ROOKIES_ONLY eligibility)
     If yes: reject: "[Player] is on taxi but is no longer eligible.
              Promote or drop before submitting."

8. CAP CHECK
   If trackSalaries = true AND blockLineupWhenOverCap = true:
     Is the franchise's current cap usage > effective cap?
     If yes: reject: "Your roster exceeds the salary cap
              ($[usage]/$[cap]). Drop a player or request a
              commissioner adjustment."

9. VOTING CHECK
   If a trade poll exists with votingRequired = true
   AND this franchise hasn't voted:
     reject: "You must vote on the pending trade before submitting
              your lineup."
```

### Lineup locking

Lineup locking prevents owners from changing their starting lineup once NFL games begin. Two modes:

**`LOCK_AT_KICKOFF` (default):**
Each player locks individually when their NFL game kicks off. An owner can still swap players whose games haven't started, even after Thursday Night Football has kicked off.

```
For each player in the lineup:
  kickoffTime = NFL schedule lookup for player.nflTeam, this week
  If now >= kickoffTime:
    LineupEntry.lockedAt = kickoffTime
    This player's slot is frozen — cannot be moved or swapped.
  Else:
    Player can still be moved.
```

**`LOCK_AT_FIRST_KICKOFF`:**
The entire lineup locks when the first NFL game of the week kicks off (typically Thursday night).

```
firstKickoff = earliest kickoff time across all NFL games this week
If now >= firstKickoff:
  All LineupEntry records for this franchise × matchup get
  lockedAt = firstKickoff.
  No lineup changes allowed for the rest of the week.
```

### Lineup carryover

If an owner doesn't submit a lineup by the lock time, the system carries over their most recent valid lineup. The carryover process:

```
1. At lock time, check if a lineup exists for this franchise × matchup.

2. If no lineup exists:
   a. Copy the most recent lineup from the previous week.
   b. If a player from the previous lineup has been dropped, traded,
      or moved to IR/taxi since then: mark their slot as empty.
   c. If the carried-over lineup is invalid (fewer than required starters),
      attempt to fill empty slots with bench players by position priority:
      highest-projected player at each needed position.
   d. If still invalid and allowPartialLineups = false:
      the lineup is submitted as-is with empty slots scoring 0.
      Commissioner is notified.

3. Mark all LineupEntry records as lockedAt = now.
   Set submittedAt = now (indicates auto-carryover, not owner action).
```

This also applies to dormant/orphaned franchises (see PRD §22.3, §22.6).

---

## Bucket transitions

A rostered player is always in exactly one bucket: `ACTIVE`, `INJURED_RESERVE`, or `TAXI_SQUAD`. Moving between buckets is a "bucket transition." Each direction has its own eligibility checks and side effects.

### Transition map

```
                        activate
    INJURED_RESERVE  ←──────────  ACTIVE
                     ──────────→
                       deactivate (IR)

                         promote
      TAXI_SQUAD     ←──────────  ACTIVE
                     ──────────→
                        demote

    INJURED_RESERVE  ✗           TAXI_SQUAD
      (no direct transition between IR and taxi)
```

A player cannot move directly between IR and taxi. They must be activated to ACTIVE first, then demoted to taxi (or vice versa). This keeps the transition logic simple and auditable.

### Dropping from any bucket

A player can be dropped from any bucket (active, IR, or taxi). Dropping removes the RosterEntry entirely — the player returns to the free agent pool. Drop logic is handled by the transaction system ([Spec_Transactions.md](../transactions/Spec_Transactions.md)), not by the roster management system. However, when a player is dropped from IR or taxi:

- The Contract's `currentRosterBucket` becomes irrelevant (contract may enter drop penalty processing)
- The cap impact changes: the bucket-weighted salary is removed, but any drop penalty dead cap charge is added (see [Spec_SalaryCapAndContracts.md](../salary-cap/Spec_SalaryCapAndContracts.md))

---

## IR (Injured Reserve) moves

### Deactivating to IR (ACTIVE → INJURED_RESERVE)

When an owner moves a player from active roster to IR:

```
1. VALIDATE
   a. Is a NO_IR_MOVES_ALLOWED calendar event active?
      If yes: reject: "IR moves are currently blocked."
   
   b. Does the franchise have IR spots available?
      count(RosterEntry WHERE franchiseId = this AND bucket = INJURED_RESERVE) < irSpots
      If not: reject: "No IR spots available ([count]/[irSpots])."
   
   c. Is the player eligible for IR?
      Run IR eligibility check (see §IR Eligibility).
      If not: reject: "[Player] does not meet IR eligibility
               (status: [injuryStatus], minimum: [irEligibilityMinimum])."
   
   d. Is the player in a cooldown period?
      If irActivationCooldownDays > 0:
        Check if this player was activated FROM IR within the last
        irActivationCooldownDays days.
        If yes: reject: "[Player] was activated [N] days ago.
                 Cooldown: [irActivationCooldownDays] days."

2. EXECUTE
   a. Update RosterEntry.bucket = INJURED_RESERVE.
   b. Update RosterEntry.enteredBucketAt = now.
   c. Update Contract.currentRosterBucket = INJURED_RESERVE
      (denormalized field for cap math).
   d. Create Transaction { type: IR_MOVE, payload: { playerId, direction: "IN" } }.
   e. Notify owner: "[Player] moved to Injured Reserve."
```

### IR eligibility check

The player's current `injuryStatus` (from sportsdata.io sync) is checked against the league's `irEligibilityMinimum` setting. Additionally, supplemental flags control suspended/holdout/COVID eligibility.

```
IR eligibility matrix:

| irEligibilityMinimum          | Qualifying injury statuses        |
|-------------------------------|-----------------------------------|
| NO_PLAYERS                    | None — IR is disabled              |
| IR_ONLY                       | IR                                 |
| IR_OR_OUT                     | IR, OUT                            |
| IR_OR_OUT_OR_DOUBTFUL         | IR, OUT, DOUBTFUL                  |
| IR_OR_OUT_OR_DOUBTFUL_OR_Q    | IR, OUT, DOUBTFUL, QUESTIONABLE    |
| NO_REQUIREMENT                | Any status (HEALTHY included)      |

Supplemental checks (always run if eligibility level is not NO_PLAYERS):
  If player.injuryStatus = SUSPENDED:
    Eligible only if irAllowSuspended = true.
  If player.injuryStatus = HOLDOUT:
    Eligible only if irAllowHoldout = true.
  If player.injuryStatus = COVID:
    Eligible only if irAllowCovid = true.
```

### Activating from IR (INJURED_RESERVE → ACTIVE)

When an owner activates a player from IR back to the active roster:

```
1. VALIDATE
   a. Is a NO_IR_MOVES_ALLOWED calendar event active?
      If yes: reject.
   
   b. Does the active roster have room?
      count(RosterEntry WHERE franchiseId = this AND bucket = ACTIVE) < rosterSpots
      (or rosterSpotsOffseason if in offseason)
      If not: reject: "Active roster is full ([count]/[rosterSpots]).
               Drop or deactivate a player first."
   
   c. Position limits check:
      Would activating this player exceed the position limit for
      their position?
      If yes: reject: "Activating [Player] would exceed your
               [position] limit."
   
   d. Cap check (if trackSalaries = true AND salaryCapType = HARD):
      projectedCapUsage = currentCapUsage
        - (player.baseSalary * irSalaryPercent / 100)   // remove IR-weighted cost
        + (player.baseSalary * 1.0)                     // add full active cost
      Net cap change = player.baseSalary * (1.0 - irSalaryPercent / 100)
      If projectedCapUsage > effectiveCap:
        reject: "Activating [Player] would put you over the salary cap.
                 Current cap usage: $[usage]. After activation: $[projected].
                 Cap: $[cap]."

2. EXECUTE
   a. Update RosterEntry.bucket = ACTIVE.
   b. Update RosterEntry.enteredBucketAt = now.
   c. Update Contract.currentRosterBucket = ACTIVE.
   d. Create Transaction { type: IR_MOVE, payload: { playerId, direction: "OUT" } }.
   e. Notify owner: "[Player] activated from Injured Reserve."
```

### Worked example — IR activation cap impact

**Setup:**
- Player salary: $10.00
- `irSalaryPercent = 20`
- Current cap usage: $190.00 (includes this player at $10 × 0.20 = $2.00)
- Effective cap: $200.00

```
Cap usage while on IR:
  This player's contribution: $10.00 * 0.20 = $2.00

Cap usage after activation:
  This player's contribution: $10.00 * 1.00 = $10.00
  Net increase: $10.00 - $2.00 = $8.00

Projected cap usage: $190.00 + $8.00 = $198.00
Cap room: $200.00 - $198.00 = $2.00 ✓ Valid (under cap)
```

### IR violation enforcement

When sportsdata.io syncs player injury statuses, a player on IR may become ineligible (e.g., status changes from OUT to HEALTHY). The system handles this as follows:

```
On injury status sync:
  For each player on IR in any league:
    Run IR eligibility check against current injuryStatus.
    If player is NO LONGER eligible:
      a. Flag the franchise with an IR_VIOLATION.
      b. Notify the owner: "[Player] is on IR but no longer eligible
         (status: [HEALTHY]). You must activate or drop [Player]
         before lineup submission."
      c. If irBlockLineupOnViolation = true:
         Lineup submission is blocked until the violation is resolved.
      d. If irBlockLineupOnViolation = false:
         Warning only — owner can submit lineups, but the violation
         appears as a persistent banner.
```

The system does NOT auto-activate players. The owner must take action. This prevents unintended roster state changes (e.g., activating a player when the active roster is full would require an auto-drop, which is too destructive to automate).

---

## Taxi squad moves

### Demoting to taxi (ACTIVE → TAXI_SQUAD)

When an owner demotes a player from the active roster to the taxi squad:

```
1. VALIDATE
   a. Is a NO_TAXI_MOVES_ALLOWED calendar event active?
      If yes: reject.
   
   b. Does the franchise have taxi spots available?
      count(RosterEntry WHERE franchiseId = this AND bucket = TAXI_SQUAD) < taxiSquadSpots
      If not: reject: "Taxi squad is full ([count]/[taxiSquadSpots])."
   
   c. Is the player eligible for taxi?
      Run taxi eligibility check (see §Taxi Eligibility).
      If not: reject: "[Player] does not meet taxi eligibility
               ([reason])."
   
   d. Is the player in a cooldown period?
      If taxiPromotionCooldownDays > 0:
        Check if this player was promoted FROM taxi within the last
        taxiPromotionCooldownDays days.
        If yes: reject: "[Player] was promoted [N] days ago.
                 Cooldown: [taxiPromotionCooldownDays] days."

2. EXECUTE
   a. Update RosterEntry.bucket = TAXI_SQUAD.
   b. Update RosterEntry.enteredBucketAt = now.
   c. Update Contract.currentRosterBucket = TAXI_SQUAD.
   d. Create Transaction { type: TAXI_MOVE, payload: { playerId, direction: "DEMOTE" } }.
   e. Notify owner: "[Player] moved to Taxi Squad."
```

### Taxi eligibility check

```
Taxi eligibility matrix:

| taxiEligibility | Qualifying players |
|-----------------|--------------------|
| NO_PLAYERS      | None — taxi squad disabled |
| ROOKIES_ONLY    | player.rookieYear = currentSeasonYear |
| LT_2_YEARS      | currentSeasonYear - player.rookieYear < 2 |
| LT_3_YEARS      | currentSeasonYear - player.rookieYear < 3 |
| ALL_PLAYERS     | Any player |

Supplemental checks:
  If taxiAllowByeWeekAdditionally = true:
    Players whose NFL team is on bye this week are ALSO eligible,
    regardless of the main eligibility setting. This lets owners
    stash bye-week players on taxi temporarily.

  If taxiAllowCovidAdditionally = true:
    Players with injuryStatus = COVID are ALSO eligible.
```

**Important:** Taxi eligibility is checked at demotion time. A player who was eligible when demoted (e.g., a rookie) does NOT automatically become ineligible when their status changes (e.g., they age into year 2). The `taxiBlockLineupOnViolation` setting determines whether aged-out players on taxi block lineup submission.

### Promoting from taxi (TAXI_SQUAD → ACTIVE)

When an owner promotes a player from taxi to the active roster:

```
1. VALIDATE
   a. Is a NO_TAXI_MOVES_ALLOWED calendar event active?
      If yes: reject.
   
   b. Does the active roster have room?
      count(ACTIVE) < rosterSpots (or rosterSpotsOffseason if offseason)
      If not: reject: "Active roster is full."
   
   c. Position limits check.
   
   d. Cap check (if trackSalaries = true AND salaryCapType = HARD):
      Net cap change = player.baseSalary * (1.0 - taxiSalaryPercent / 100)
      If projectedCapUsage > effectiveCap: reject.

2. EXECUTE
   a. Update RosterEntry.bucket = ACTIVE.
   b. Update RosterEntry.enteredBucketAt = now.
   c. Update Contract.currentRosterBucket = ACTIVE.
   d. Create Transaction { type: TAXI_MOVE, payload: { playerId, direction: "PROMOTE" } }.
   e. Notify owner: "[Player] promoted from Taxi Squad."
```

### Worked example — taxi promotion cap impact

**Setup:**
- Player salary: $4.24 (Caleb Williams on taxi, from PRD §7.5 example)
- `taxiSalaryPercent = 10`
- Current cap usage: $55.11 (includes Williams at $4.24 × 0.10 = $0.42)
- Effective cap: $222.75

```
Cap usage while on taxi:
  Williams' contribution: $4.24 * 0.10 = $0.42

Cap usage after promotion:
  Williams' contribution: $4.24 * 1.00 = $4.24
  Net increase: $4.24 - $0.42 = $3.82

Projected cap usage: $55.11 + $3.82 = $58.93
Cap room: $222.75 - $58.93 = $163.82 ✓ Valid
```

### Taxi violation enforcement

Similar to IR violations, taxi eligibility can become invalid over time:

```
Scenario: ROOKIES_ONLY eligibility, player was demoted as a rookie.
Season rolls over — player is now in year 2.

On season rollover or on-access check:
  For each player on taxi:
    Run taxi eligibility check against current season year.
    If player is NO LONGER eligible:
      a. Flag the franchise with a TAXI_VIOLATION.
      b. Notify owner: "[Player] is on taxi but is no longer eligible
         (now in year [N], eligibility: [ROOKIES_ONLY]).
         Promote or drop before lineup submission."
      c. If taxiBlockLineupOnViolation = true:
         Lineup submission blocked until resolved.
      d. If taxiBlockLineupOnViolation = false:
         Warning only.
```

**Design note:** Most Dynasty leagues set `taxiBlockLineupOnViolation = false` because taxi eligibility violations are expected at season boundaries — the commissioner typically sets a deadline for resolving them. Blocking lineup submission for a taxi violation in week 1 because a player aged out during the offseason would be unnecessarily punitive.

---

## Roster validation

Roster validation is the central check that determines whether a franchise's roster is in a legal state. It runs at multiple trigger points throughout the system.

### Validation checks

```
A roster is VALID if and only if ALL of the following are true:

1. ACTIVE COUNT
   count(RosterEntry WHERE bucket = ACTIVE) <= rosterSpots
   (or rosterSpotsOffseason if Season.status = OFFSEASON)

2. IR COUNT
   count(RosterEntry WHERE bucket = INJURED_RESERVE) <= irSpots

3. TAXI COUNT
   count(RosterEntry WHERE bucket = TAXI_SQUAD) <= taxiSquadSpots

4. POSITION LIMITS (active roster only)
   For each position in rosterPositionLimits:
     positionCount = count(ACTIVE players at this position)
     positionCount >= positionMin AND positionCount <= positionMax
   Note: positions not listed in rosterPositionLimits have no limit.

5. IR ELIGIBILITY
   Every player on IR currently meets the IR eligibility check
   (injuryStatus qualifies under irEligibilityMinimum, or supplemental
   flags allow their status).

6. TAXI ELIGIBILITY
   Every player on taxi currently meets the taxi eligibility check
   (per taxiEligibility setting and current season year).

7. SALARY CAP (when trackSalaries = true)
   capUsage = sum(
     contract.baseSalary * bucketMultiplier(contract.currentRosterBucket)
   ) + sum(active salary adjustments)
   capUsage <= franchise.effectiveCap
   
   This check is MODE-DEPENDENT:
   - HARD cap: violation makes the roster invalid.
   - SOFT cap: violation triggers a luxury tax (not a blocking violation).
   - NO_CAP: check is skipped.
```

### When validation runs

| Trigger | Checks run | Failure behavior |
|---|---|---|
| Transaction attempt (add, drop, trade) | Full validation on projected post-transaction state | Transaction blocked if invalid |
| Bucket transition (IR/taxi move) | Full validation on projected post-transition state | Move blocked if invalid |
| Lineup submission | Full validation + lineup-specific checks | Depends on `allowLineupSubmitWithInvalidRoster` and per-violation blocking flags |
| Roster compliance deadline | Full validation | Violations flagged; commissioner notified; optionally block transactions until resolved |
| Daily sweep (scheduled job) | Full validation for all franchises | Violations flagged in UI; commissioner notified |
| On-access (owner views roster page) | Lazy validation for display | Warnings shown in UI |

### Validation response format

Validation always returns a structured result, not just pass/fail:

```
{
  valid: boolean,
  violations: [
    {
      checkId: "ACTIVE_COUNT",
      severity: "ERROR" | "WARNING",
      message: "Active roster exceeds limit (54/53).",
      blocking: true | false
    },
    ...
  ]
}
```

The `blocking` flag determines whether the violation prevents the triggering action. Blocking behavior is configurable per check type (e.g., `irBlockLineupOnViolation`, `blockLineupWhenOverCap`). Violations with `blocking = false` are shown as warnings but don't prevent the action.

---

## Offseason vs. in-season roster sizes

Dynasty leagues (and optionally Keeper leagues) support different roster sizes for offseason and in-season.

### The two roster size fields

| Field | When active | Purpose |
|---|---|---|
| `rosterSpots` | During `ACTIVE` and `POSTSEASON` phases | In-season roster limit (e.g., 53) |
| `rosterSpotsOffseason` | During `OFFSEASON` phase | Expanded limit for offseason roster building (e.g., 70) |

### Roster compliance deadline

The transition from `rosterSpotsOffseason` to `rosterSpots` is governed by the `ROSTER_COMPLIANCE_DEADLINE` calendar event. This is typically a commissioner-scheduled date before the regular season begins.

```
When ROSTER_COMPLIANCE_DEADLINE fires:

1. The effective roster limit switches from rosterSpotsOffseason
   to rosterSpots.

2. For each franchise:
   a. Run roster validation against the IN-SEASON limits.
   b. If count(ACTIVE) > rosterSpots:
      - Flag the franchise with a ROSTER_COMPLIANCE_VIOLATION.
      - Notify owner: "Your active roster ([count] players) exceeds
        the in-season limit ([rosterSpots]). You must cut
        [count - rosterSpots] player(s) by [deadline]."
      - Commissioner is notified of all violations.
   
   c. Similarly check irSpots and taxiSquadSpots if those limits
      also differ between offseason and in-season (typically they don't,
      but the system should check).

3. Enforcement behavior (configurable):
   WARN_ONLY: violations are flagged in the UI. Owner can still
   submit lineups and make transactions. Commissioner must resolve
   manually.
   
   BLOCK_TRANSACTIONS: franchise is blocked from all add transactions
   (but can still drop) until roster is compliant. Lineup submission
   is allowed.
   
   BLOCK_LINEUP: franchise is blocked from lineup submission until
   roster is compliant. (Harsh — usually combined with a grace period.)
   
   Default: WARN_ONLY. Most commissioners handle compliance
   informally via the message board.
```

### Worked example — roster compliance

**Setup:**
- Dynasty league, `rosterSpotsOffseason = 70`, `rosterSpots = 53`
- Franchise has 68 players on active roster, 15 on IR, 8 on taxi
- `ROSTER_COMPLIANCE_DEADLINE` fires August 15

```
After deadline:
  Active: 68 players, limit now 53. Violation: 15 over.
  IR: 15 players, limit 20. OK.
  Taxi: 8 players, limit 10. OK.

Franchise must cut 15 players from the active roster.
Options:
  - Drop players (returns to FA pool, may incur drop penalty)
  - Move players to IR (if eligible and IR has room — 5 spots open)
  - Move players to taxi (if eligible and taxi has room — 2 spots open)
  - Trade players to other franchises

If the franchise moves 5 to IR and 2 to taxi: 68 - 5 - 2 = 61.
Still 8 over. Must drop or trade 8 more.
```

---

## Position limits

Position limits operate at two levels, and the distinction matters:

### Starting lineup position limits

Defined in `League.startingLineup` (JSON). These control how many of each position can START in a given week. They use min/max ranges to create implicit flex slots.

```
Example Dynasty startingLineup:
{
  "totalStarters": 22,
  "positions": [
    { "position": "QB",  "min": 1, "max": 1 },
    { "position": "RB",  "min": 1, "max": 6 },
    { "position": "WR",  "min": 2, "max": 7 },
    { "position": "TE",  "min": 1, "max": 6 },
    { "position": "PK",  "min": 1, "max": 1 },
    { "position": "DT",  "min": 1, "max": 4 },
    { "position": "DE",  "min": 1, "max": 4 },
    { "position": "LB",  "min": 3, "max": 5 },
    { "position": "CB",  "min": 1, "max": 4 },
    { "position": "S",   "min": 1, "max": 4 }
  ]
}

Validation: for each position, min <= starterCount <= max,
AND sum(all starterCounts) = totalStarters.

The gap between min and max creates implicit flex — an owner can
start 4 RBs and 5 WRs, or 2 RBs and 7 WRs, as long as every
position meets its min and the total equals 22.
```

### Roster-level position limits

Defined in `League.rosterPositionLimits` (JSON). These control how many of each position can be on the ACTIVE roster at all, regardless of starting. Default: no limit (empty object or all zeros). Applies only to the ACTIVE bucket.

```
Example rosterPositionLimits:
{
  "QB": { "min": 1, "max": 4 },
  "RB": { "min": 2, "max": 10 },
  "WR": { "min": 3, "max": 12 }
  // Positions not listed: no limit
}

These limits are checked on:
  - Every add/waiver/trade that adds a player to the active roster
  - Every bucket transition that moves a player TO active (IR activation, taxi promotion)
  - Roster validation sweep
```

**Important:** Roster-level position limits do NOT apply to IR or taxi. An owner can stash 10 QBs on IR if they have the spots. The limit only constrains the ACTIVE bucket.

---

## Interaction with other systems

### Transaction system

The transaction system (add/drop, waivers, trades) calls roster validation as part of its shared validation pipeline. The roster management system provides the validation logic; the transaction system provides the execution wrapper.

When a transaction creates or removes a RosterEntry, the roster management system's validation checks are invoked to verify the post-transaction state. If the projected state is invalid, the transaction is blocked (unless `allowInvalidRosterTrades = true` for trades).

**Bucket assignment on transaction:**
- Add/drop (FCFS): new players always land in `ACTIVE` bucket.
- Waiver claim: new players always land in `ACTIVE` bucket.
- Draft pick: new players always land in `ACTIVE` bucket (owner can move to taxi later).
- Auction award: new players always land in `ACTIVE` bucket.
- Trade (incoming player): if the player was on IR or taxi on the sending franchise, they land in `ACTIVE` on the receiving franchise. The receiving owner manages bucket assignment separately. (See [Spec_Transactions.md](../transactions/Spec_Transactions.md) trade execution step 1a.)

### Salary cap system

The roster management system interacts with the salary cap system on every bucket transition:

- Moving a player to IR reduces their cap hit to `baseSalary * irSalaryPercent / 100`
- Moving a player to taxi reduces their cap hit to `baseSalary * taxiSalaryPercent / 100`
- Activating from IR or promoting from taxi increases their cap hit to `baseSalary * 1.0`

The cap impact calculation is straightforward because `Contract.currentRosterBucket` is denormalized — the cap system reads this field to compute bucket-weighted salaries without joining RosterEntry.

### Calendar system

The roster management system depends on the calendar for:

| Calendar event | Effect on roster management |
|---|---|
| `LINEUP_LOCK` | Per-player or all-lineup lock at kickoff. Generated automatically from NFL schedule. |
| `ROSTER_COMPLIANCE_DEADLINE` | Triggers offseason → in-season roster size switch and violation flagging. |
| `NO_IR_MOVES_ALLOWED` | Blocks all IR bucket transitions during the event's date range. |
| `NO_TAXI_MOVES_ALLOWED` | Blocks all taxi bucket transitions during the event's date range. |

### Scoring system

The scoring system reads LineupEntry records to determine which players are starters and thus score fantasy points. The roster management system writes LineupEntry records on lineup submission. The scoring system is a downstream consumer — it never writes to LineupEntry (except for `fantasyPoints`, which it computes from Stats × ScoringRules).

### Injury status sync (sportsdata.io)

The sportsdata.io integration periodically syncs player injury statuses. When a player's status changes:

1. The `Player.injuryStatus` field updates.
2. The roster management system checks all leagues where this player is on IR.
3. If the new status makes the player IR-ineligible, the system creates an IR_VIOLATION flag and notifies affected franchise owners.

This sync is external to the roster management system — the system reacts to the updated `injuryStatus` field, it doesn't perform the sync.

---

## Inputs & outputs

### Triggers

| Trigger | Source | Action |
|---|---|---|
| Owner: submit lineup | Roster UI | Validate and create/update LineupEntry records |
| Owner: move to IR | Roster UI | Validate and update RosterEntry.bucket |
| Owner: activate from IR | Roster UI | Validate and update RosterEntry.bucket |
| Owner: demote to taxi | Roster UI | Validate and update RosterEntry.bucket |
| Owner: promote from taxi | Roster UI | Validate and update RosterEntry.bucket |
| NFL kickoff | Calendar system (`LINEUP_LOCK`) | Lock player slots or entire lineup |
| Injury status sync | sportsdata.io integration | Check for IR violations, notify owners |
| `ROSTER_COMPLIANCE_DEADLINE` | Calendar system | Switch to in-season limits, flag violations |
| Daily sweep | Scheduled job | Run roster validation for all franchises, flag violations |
| Transaction completion | Transaction/Draft/Auction systems | Trigger roster validation on post-transaction state |

### Outputs

| Output | Downstream consumer |
|---|---|
| LineupEntry records | Scoring engine (determines who scores), matchup display, historical lineups |
| RosterEntry.bucket updates | Cap usage calculation, roster display, transaction validation |
| Contract.currentRosterBucket updates | Cap math (bucket-weighted salary) |
| Transaction records (IR_MOVE, TAXI_MOVE, LINEUP_SET) | Transaction feed, audit log, narrative engine (v2) |
| Validation results | Roster UI (violation banners), commissioner alerts |
| Notifications | In-app, email, push (per owner preference) |

---

## Edge cases

### E1. Player position change violates starting lineup mid-week

**Scenario:** Owner has 4 DEs starting (max = 4). sportsdata.io reclassifies one DE as DT mid-week. Owner now has 3 DEs and 5 DTs (max = 4).

**Behavior:** Per PRD §22.1, the owner is warned but the lineup is NOT auto-corrected. The submitted lineup remains valid as of its submission time. For the NEXT week, the owner must adjust — they can only start 4 DTs. The position change is a Player-level update; it doesn't retroactively invalidate a submitted lineup.

### E2. Player on IR recovers to HEALTHY mid-game

**Scenario:** Player X is on IR with status OUT. During Sunday's games, the sportsdata.io sync updates X to HEALTHY. `irBlockLineupOnViolation = true`.

**Behavior:** The IR violation flag is created on the next sync. However, if the lineup for this week is already locked (games have kicked off), the violation does NOT retroactively block the current week's lineup. The blocking takes effect on the NEXT lineup submission. The owner sees a notification: "[Player X] is now HEALTHY and must be activated from IR or dropped."

### E3. Owner tries to IR a player to make room for a trade

**Scenario:** Active roster is at 53/53. A trade would add 2 players and remove 1. Owner tries to IR a player first to create a spot, but the player's injury status is HEALTHY and `irEligibilityMinimum = IR_OR_OUT`.

**Behavior:** IR move is rejected because the player doesn't qualify. The owner must drop a player to make room, or the trade must include an additional outgoing player. The system does not allow "strategic IR" of healthy players unless `irEligibilityMinimum = NO_REQUIREMENT`.

### E4. Lineup lock occurs with no lineup submitted and no previous lineup to carry over

**Scenario:** New franchise, week 1. Owner hasn't submitted a lineup. First kickoff happens (Thursday night).

**Behavior:** The carryover logic has no previous lineup to copy. The system attempts to auto-generate a lineup using the franchise's current active roster: fill starting slots by position, prioritizing players with the highest projected points (from sportsdata.io projections). If the auto-generated lineup satisfies the min/max rules, it's submitted. If not (e.g., the franchise doesn't have enough players at a position), a partial lineup is submitted (empty slots score 0). Commissioner is notified.

### E5. `rosterSpotsOffseason` is null — what limit applies during offseason?

**Scenario:** A Redraft league where `rosterSpotsOffseason` was never set (null). Season ends, league enters OFFSEASON.

**Behavior:** When `rosterSpotsOffseason` is null, the system falls back to `rosterSpots` during the offseason. There is no expanded window. This is the expected behavior for Redraft leagues, which typically don't have a meaningful offseason.

### E6. Taxi player is traded — receiving franchise has different taxi eligibility rules

**Scenario:** Franchise A has Player X (2nd-year WR) on their taxi squad (league uses `taxiEligibility = LT_3_YEARS`). A trade sends Player X to Franchise B.

**Behavior:** Per [Spec_Transactions.md](../transactions/Spec_Transactions.md), traded players from IR or taxi always land in the ACTIVE bucket on the receiving franchise. Franchise B receives Player X on their active roster. If B wants to put X on their taxi, they must pass the league's taxi eligibility check. Since both franchises are in the same league, the eligibility rules are the same — X is still under 3 years, so the demotion would succeed.

### E7. Cooldown period spans a season boundary

**Scenario:** `irActivationCooldownDays = 14`. Player is activated from IR on the last day of the season. 5 days into the offseason, owner tries to IR the same player again.

**Behavior:** The cooldown is absolute — it counts calendar days regardless of season boundaries. 5 days have passed, cooldown is 14 days, so 9 days remain. The IR move is rejected. The cooldown doesn't reset at season boundaries because the cooldown is attached to the player-franchise pair, not the season.

### E8. Owner submits lineup, then drops a starter before kickoff

**Scenario:** Owner submits a valid lineup on Wednesday. On Saturday, they drop their starting QB via add/drop. The lineup now has an invalid starter.

**Behavior:** The LineupEntry for the dropped QB becomes orphaned — the player is no longer on the roster. At the next lineup lock point, the system detects the orphaned slot and either: (a) auto-fills it with the next best bench QB if one exists, or (b) leaves it empty (scores 0) if no replacement exists. The owner should re-submit their lineup before lock, but the system handles the case gracefully if they don't.

### E9. Roster compliance deadline fires but no franchises are over the limit

**Scenario:** All 32 franchises already cut down to 53 before the compliance deadline.

**Behavior:** The system switches the effective limit from `rosterSpotsOffseason` to `rosterSpots`, runs validation for all franchises, finds zero violations, and does nothing. No notifications sent. This is the happy path.

### E10. Two bucket transitions in the same request (atomic swap)

**Scenario:** Owner wants to move Player A to IR and activate Player B from IR in a single action (common "swap" pattern).

**Behavior:** The system should support atomic IR swaps as a single operation. The validation checks both transitions against the PROJECTED state after both moves: Player A goes to IR (frees one active spot, uses one IR spot), Player B goes to active (uses one active spot, frees one IR spot). Net change: zero active spots, zero IR spots. Both moves must pass individually AND the combined projected state must be valid. If either move fails validation, neither executes.

This is a convenience feature — the owner could do the moves separately, but if the active roster is full, they'd need to deactivate first, which would temporarily put them at 52/53 active + 21/20 IR (over IR limit) before the activation brings them back to 53/53 + 20/20. The atomic swap avoids the invalid intermediate state.

### E11. `NO_IR_MOVES_ALLOWED` blocks activation, leaving an ineligible player stuck on IR

**Scenario:** A player on IR recovers to HEALTHY during a period when `NO_IR_MOVES_ALLOWED` is active. The owner can't activate them. `irBlockLineupOnViolation = true`.

**Behavior:** The system is in a bind — the player is ineligible for IR, the owner can't activate them, and lineup submission is blocked. Resolution: the `irBlockLineupOnViolation` check should NOT trigger when `NO_IR_MOVES_ALLOWED` is active. If the owner is mechanically prevented from resolving the violation, the violation shouldn't block them. The check resumes enforcing after the blocking event ends.

### E12. Best Ball leagues — no lineup submission needed

**Scenario:** League uses Best Ball scoring (PRD §6.3). There's no lineup submission — the system auto-selects the optimal lineup from the active roster after all games conclude.

**Behavior:** The lineup submission workflow is skipped entirely. The scoring engine (see [Spec_ScoringEngine.md](../scoring/Spec_ScoringEngine.md)) handles Best Ball optimization — it generates LineupEntry records retroactively by finding the highest-scoring combination that satisfies the startingLineup min/max constraints. Roster management still manages bucket transitions (IR, taxi), roster validation, and compliance deadlines. Only the weekly lineup submission step is bypassed.

---

## Open questions

### OQ1. Should the system support a "taxi protection" period during which other franchises cannot poach taxi squad players?

**Context:** Some Dynasty leagues allow other franchises to "promote" a player off a rival's taxi squad by paying a penalty or draft pick. MFL supports this optionally. The current spec treats taxi as fully protected — only the owning franchise can promote or drop taxi players.

**Recommendation:** Not in v1. Taxi poaching adds significant complexity (penalty negotiation, draft pick compensation, owner notification/response windows). Keep taxi fully protected for now. If demand emerges, add it as a `taxiPoachingEnabled` setting with configurable compensation rules.

### OQ2. Should lineup submission save partial progress?

**Context:** The current spec requires all-or-nothing lineup submission. An owner who sets 15 of 22 starters and navigates away loses their progress.

**Recommendation:** Save lineup state as a draft (not committed) on every change. The draft is auto-saved but doesn't pass validation or create a Transaction until the owner explicitly submits. This matches the UX expectation from other fantasy platforms. The LineupEntry records are created in a `DRAFT` state and transition to `SUBMITTED` on explicit submission.

### OQ3. How should the system handle the rare case where a player's NFL team is unknown (free agent, unsigned)?

**Context:** sportsdata.io may report a player with `nflTeam = FA` (free agent). These players have no bye week and no kickoff time. They can be started but never lock (no game to lock to).

**Recommendation:** Players with `nflTeam = FA` or null are startable but score 0 (no stats to pull). They never lock. They are not affected by bye week checks. This is the simplest behavior and matches real-world expectations — an NFL free agent isn't playing that week.

### OQ4. Should there be a maximum number of IR or taxi moves per week?

**Context:** Some leagues impose limits on IR/taxi moves to prevent gaming (e.g., cycling players on and off IR to manage salary cap). The current spec uses cooldown periods but doesn't cap total moves per week.

**Recommendation:** Not in v1. The cooldown mechanism (`irActivationCooldownDays`, `taxiPromotionCooldownDays`) already limits rapid cycling. A weekly move cap adds configuration complexity with marginal benefit. If commissioners want to restrict moves, they can use `NO_IR_MOVES_ALLOWED` calendar events during specific windows.

### OQ5. Should the atomic IR swap (E10) be extended to taxi swaps and mixed swaps?

**Context:** Edge case E10 describes an atomic IR swap. The same pattern could apply to taxi (demote A, promote B) or mixed transitions (IR one player, promote a different one from taxi).

**Recommendation:** Support all same-type atomic swaps (IR-for-IR, taxi-for-taxi) in v1. Mixed swaps (IR + taxi in one action) can wait — they're rarer and the intermediate state isn't usually invalid (since IR and taxi spots are independent pools).

---

## Related buildable units

*To be populated as Level 3 docs are written.*

Anticipated units:
- `Logic_LineupValidation.md` — the 9-check validation pipeline, partial lineup handling
- `Logic_LineupCarryover.md` — auto-generation when no lineup exists at lock time
- `Logic_IRTransition.md` — IR eligibility check, cooldown enforcement, violation detection
- `Logic_TaxiTransition.md` — taxi eligibility check, cooldown enforcement, violation detection
- `Logic_RosterValidation.md` — the 7-point roster validity checker
- `Logic_RosterCompliance.md` — offseason → in-season transition, violation enforcement
- `Screen_RosterEdit.md` — drag-and-drop roster management (active/IR/taxi buckets)
- `Screen_LineupSubmit.md` — weekly lineup builder with position constraints
- `Screen_RosterCompliance.md` — compliance deadline status and cutdown tracking
- `Component_RosterTable.md` — reusable roster grid with bucket sections
- `Component_LineupSlots.md` — position-by-position starter/bench assignment
- `Component_IRTaxiPanel.md` — IR and taxi squad management with eligibility indicators
- `Component_ViolationBanner.md` — roster/IR/taxi/cap violation warnings

---

**END OF SPEC**
