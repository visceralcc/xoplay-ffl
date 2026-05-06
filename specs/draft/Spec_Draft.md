# Draft System

**Status:** Draft
**Parent:** [Spec_XOPlay_PRD.md §9](../Spec_XOPlay_PRD.md#9-draft-system)
**Related specs:** [Spec_DataModel.md §4.22–4.24](../Spec_DataModel.md), [Spec_Tiers.md §3.4, §4.5](../Spec_Tiers.md), [Spec_SalaryCapAndContracts.md](../salary-cap/Spec_SalaryCapAndContracts.md), [Spec_CalendarAndLifecycle.md](../calendar/Spec_CalendarAndLifecycle.md), [Spec_Transactions.md](../transactions/Spec_Transactions.md)
**Last updated:** May 2026

---

## Purpose

The draft system manages the sequential selection of players by franchises. It handles two draft modes (live and email), four pick order patterns (linear, snake, third-round reversal, custom), the timer and auto-pick fallback chain, pre-draft preparation tools (My Draft List, Work List), pick generation for new and recurring seasons, and contract creation on pick completion. It coordinates with the calendar system for scheduling and with the salary cap system for rookie salary assignment.

**Design principle: One pick engine, two timer modes.** Live drafts and email drafts use identical pick-making logic. The only difference is how fast the clock ticks and how aggressively the system notifies. This means every feature built for the draft works in both modes without branching — worklist picks, auto-pick, commissioner controls, draft board display, all of it.

**Tier relevance.** The draft engine is tier-agnostic at the mechanical level. What varies by tier is the draft's *role* in the season:

| Tier | Draft role | Player pool | Order type |
|---|---|---|---|
| **Redraft** | Single draft populates the entire roster at season start. | All players (`BOTH_ROOKIES_AND_VETERANS`). | Snake (default), commissioner-set or random. |
| **Keeper** | Draft fills remaining roster slots after keepers are declared. Fewer rounds (default 12). Optional separate rookie draft. | All players (main draft) or `ROOKIES_ONLY` (rookie draft). | Snake (default) or inverse standings (rookie draft). |
| **Dynasty** | Rookie draft only — veterans are acquired via auction. Required every offseason. | `ROOKIES_ONLY`. | Linear, inverse standings. |

The engine doesn't branch on tier — it reads `availablePlayerPool`, `draftOrderType`, and `draftRounds` and behaves accordingly.

## PRD anchor

This spec expands on PRD §9 (Draft System), with additional context from:

- §9.1 — Draft types (live vs. email)
- §9.2 — Draft configuration (13 settings)
- §9.3 — Draft order computation and tiebreakers
- §9.4 — Timer expiration behavior (4-mode fallback chain)
- §9.5 — My Draft List
- §9.6 — Pre-draft picks (Work List)
- §9.7 — Draft room UI
- §9.8 — Commissioner draft controls
- §9.9 — Draft pick entity
- §9.10 — Trade of draft picks
- §9.11 — Draft results display
- §7.6 — Rookie salary scale (contract creation on draft)
- §22.11 — Missed draft pick edge case
- §22.12 — Rookie contract assignment deadline

What this spec adds beyond the PRD: the complete pick generation algorithm for all order types, the timer engine with suspend/resume mechanics, the full auto-pick fallback chain with worked examples, the draft state machine, conference-scoped draft handling, pick-to-contract lifecycle, and edge cases around traded picks, paused drafts, and concurrent worklist conflicts.

---

## Entities & data shapes

Full field definitions live in [Spec_DataModel.md](../Spec_DataModel.md). This section documents how the draft system uses each entity.

### Entities the system reads

| Entity | Fields used | How used |
|---|---|---|
| **League** (§4.2.6) | `draftMode`, `pickTimerSeconds`, `timerSuspendEnabled`, `timerSuspendStart`, `timerSuspendEnd`, `timerExpirationBehavior`, `autoPickAfterConsecutiveTimeouts`, `availablePlayerPool`, `forceFullRosterAtEnd`, `draftRounds`, `draftOrderType`, `autoPickFranchises` | Draft configuration. Loaded once when the draft starts. |
| **Franchise** (§4.3) | `id`, `divisionId`, standings data | Draft order computation. Franchises are sorted by standings for inverse-standing order types. |
| **Player** (§4.9) | `position`, `rookieYear`, `nflStatus` | Player pool filtering (`ROOKIES_ONLY` filters by `rookieYear = currentSeasonYear`). Position used for roster limit validation during pick. |
| **RosterEntry** (§4.17) | `franchiseId`, `playerId` | Checks whether a player is already rostered (in this league). Prevents double-picking. |
| **RookieSalaryScale** (§4.15) | `round`, `pickInRound`, `baseSalary`, `defaultContractYears` | Contract creation on rookie draft pick. Looked up by pick position. |
| **CalendarEvent** (§4.33) | `eventType = DRAFT_START` | Triggers draft opening. |

### Entities the system writes

| Entity | Fields written | When |
|---|---|---|
| **DraftPick** (§4.22) | All fields | Pick generation (pre-draft) creates the full grid of picks. Pick execution updates `playerSelectedId`, `contractId`, `pickStartedAt`, `pickCompletedAt`, `pickElapsedSeconds`, `wasAutoPicked`. |
| **RosterEntry** (§4.17) | Create row | When a pick is made, a RosterEntry is created for the selected player. |
| **Contract** (§4.13) | Create row | When `trackContracts = true`, a Contract is created per the rookie salary scale or league defaults. |
| **Transaction** (§4.18) | `type = DRAFT_PICK_MADE` | Every completed pick creates a Transaction record. |
| **DraftWorklistEntry** (§4.23) | Read and consume | Worklist entries are consumed (not deleted) when a pick is made from the worklist. |
| **MyDraftListEntry** (§4.24) | Read | My Draft List entries are read for auto-pick fallback. Not modified by the draft engine. |

---

## Draft lifecycle

A draft progresses through a defined state machine. The draft doesn't have its own status entity — its state is derived from the collective state of its DraftPick records and the triggering CalendarEvent.

### Draft states (derived)

| State | How determined | What's allowed |
|---|---|---|
| **NOT_STARTED** | CalendarEvent exists with `status = SCHEDULED`. No DraftPick has `pickStartedAt` set. | Commissioner can edit configuration, order, rounds. Owners can build My Draft List and Work Lists. |
| **IN_PROGRESS** | At least one DraftPick has `pickStartedAt` set. At least one DraftPick has `playerSelectedId = null`. | Active picking. Commissioner can pause, skip, change picks. Owners make picks and manage worklists. |
| **PAUSED** | Commissioner has triggered pause. Timer is halted. | Commissioner can resume, revert, change picks. No new picks can be made by owners. |
| **COMPLETED** | All DraftPicks have `playerSelectedId` set (or are marked as skipped). | Results are final (unless commissioner uses Revert). Commissioner can archive. |

### Starting the draft

When the `DRAFT_START` calendar event fires:

```
1. Verify all DraftPicks are generated for this season (see §Pick Generation).
2. Set the first pick's pickStartedAt = now.
3. Start the timer for the first pick (pickTimerSeconds countdown).
4. Notify all franchise owners: "Draft has started. [Franchise Name] is on the clock."
5. If the on-the-clock franchise is in autoPickFranchises, execute auto-pick immediately.
```

The draft can also be started manually by the commissioner before the calendar event fires (e.g., if all owners are ready early). Manual start follows the same sequence.

---

## Pick generation

Before a draft can start, the system generates all DraftPick records for the season. This happens automatically when the commissioner finalizes draft settings, or manually via commissioner action.

### Pick order algorithms

The pick order within each round depends on the `draftOrderType` setting. All algorithms start with a **base order** — the sequence of franchises from first pick to last pick in Round 1.

**Base order sources:**

| Source | When used | How computed |
|---|---|---|
| Inverse standings | Dynasty rookie draft, Keeper rookie draft | Sort franchises by previous season's standings, worst record first. Playoff teams ordered by playoff finish (champion picks last). Ties broken by draft tiebreaker chain (see §Tiebreakers). |
| Random | Redraft (default) | Deterministic random shuffle seeded by `hash(leagueId + seasonYear)` for reproducibility. Commissioner can re-randomize. |
| Commissioner-set | Any tier, when `draftOrderType = CUSTOM` | Commissioner manually arranges the order via drag-and-drop. Stored as an ordered array on the DraftPick records. |

### Order type algorithms

Given a base order of N franchises [F1, F2, ..., FN]:

**LINEAR:**
Every round uses the same base order. F1 picks first in every round.

```
Round 1: F1, F2, F3, ..., FN
Round 2: F1, F2, F3, ..., FN
Round 3: F1, F2, F3, ..., FN
```

Used for Dynasty rookie drafts. Gives the worst team a persistent advantage across all rounds.

**SNAKE:**
Odd rounds use the base order; even rounds use the reverse.

```
Round 1: F1, F2, F3, ..., FN
Round 2: FN, FN-1, ..., F2, F1
Round 3: F1, F2, F3, ..., FN
Round 4: FN, FN-1, ..., F2, F1
```

Default for Redraft and Keeper. Balances pick value across franchises.

**THIRD_ROUND_REVERSAL:**
Rounds 1 and 2 use base order. Round 3 reverses. Then continues snake from there.

```
Round 1: F1, F2, F3, ..., FN
Round 2: F1, F2, F3, ..., FN     ← NOT reversed (unlike snake)
Round 3: FN, FN-1, ..., F2, F1   ← reversal starts here
Round 4: F1, F2, F3, ..., FN
Round 5: FN, FN-1, ..., F2, F1
```

Gives the team picking first extra value in Round 2 as compensation for draft position uncertainty. Less common but supported by MFL.

**CUSTOM:**
Commissioner defines the exact franchise for each pick slot. No algorithmic pattern. Stored directly as `(round, pickInRound) → franchiseId` on each DraftPick.

### Worked example — snake order with 4 teams

Base order: [Alpha, Beta, Gamma, Delta]

```
Pick  1 (R1P1): Alpha      overallNumber=1
Pick  2 (R1P2): Beta       overallNumber=2
Pick  3 (R1P3): Gamma      overallNumber=3
Pick  4 (R1P4): Delta      overallNumber=4
Pick  5 (R2P1): Delta      overallNumber=5   ← reversed
Pick  6 (R2P2): Gamma      overallNumber=6
Pick  7 (R2P3): Beta       overallNumber=7
Pick  8 (R2P4): Alpha      overallNumber=8
Pick  9 (R3P1): Alpha      overallNumber=9   ← back to base
Pick 10 (R3P2): Beta       overallNumber=10
Pick 11 (R3P3): Gamma      overallNumber=11
Pick 12 (R3P4): Delta      overallNumber=12
```

Total picks generated: `draftRounds × franchiseCount` = 3 × 4 = 12.

### Conference-scoped drafts

In leagues with `playerPoolIsolation = ISOLATED_PER_CONFERENCE`, two separate drafts run — one per conference. Each draft:
- Contains only the franchises in that conference
- Has its own base order (computed from conference standings)
- Has its own player pool (filtered by conference assignment)
- Generates its own set of DraftPick records
- Has its own `DRAFT_START` calendar event

The two drafts may run simultaneously, sequentially, or at different times — the commissioner controls this via the calendar.

### Traded picks

When a DraftPick has been traded (i.e., `currentFranchiseId ≠ originalFranchiseId`), the pick's position in the order is unchanged — it stays in its original slot. Only the franchise that makes the pick changes.

```
Example: Alpha traded their R1P1 pick to Beta.

Pick 1 (R1P1): Beta selects    ← Beta now owns this slot
Pick 2 (R1P2): Beta selects    ← Beta's original pick
```

Beta now has two first-round picks. Alpha has none. The pick's `pickInRound` and `overallNumber` don't change — they reflect the original positional value of the pick.

### Future pick generation

For tiers where `tradeFuturePicksEnabled = true`, the system generates placeholder DraftPick records for future seasons at league creation and at each offseason rollover:

```
For each season in range [currentSeason + 1, currentSeason + tradeFuturePicksYearsAhead]:
  For each round in [1, draftRounds]:
    For each franchise:
      Create DraftPick {
        seasonYear: futureSeason,
        round: round,
        pickInRound: franchise's projected position (TBD at season start),
        overallNumber: computed when order is finalized,
        originalFranchiseId: franchise.id,
        currentFranchiseId: franchise.id,
        isFuturePick: true,
        playerSelectedId: null
      }
```

Future picks have `isFuturePick = true` and `pickInRound` is provisional (based on franchise order from the most recent completed season). When the season arrives and standings finalize draft order, `pickInRound` and `overallNumber` are updated to their actual values.

---

## Timer engine

The timer is the heartbeat of the draft. It tracks how long each franchise has to make their pick and enforces expiration behavior.

### Timer mechanics

When a pick becomes active (the previous pick was completed or it's the first pick):

```
1. Set DraftPick.pickStartedAt = now.
2. Calculate deadline:
   a. If timerSuspendEnabled = false:
      deadline = now + pickTimerSeconds
   b. If timerSuspendEnabled = true:
      deadline = now + pickTimerSeconds, BUT time during suspend
      windows does not count (see §Timer Suspension).
3. Start countdown. Broadcast "on the clock" notification.
4. If franchise is in autoPickFranchises, skip timer — execute
   auto-pick immediately.
```

### Timer suspension (email drafts)

For email drafts, the timer pauses overnight so owners aren't penalized for sleeping. Suspension is controlled by `timerSuspendEnabled`, `timerSuspendStart`, and `timerSuspendEnd` (expressed in the league's timezone).

**How suspension works:**

The timer tracks *active seconds*, not wall-clock seconds. When the current time falls within the suspend window (`timerSuspendStart` to `timerSuspendEnd`), the countdown freezes. When the window ends, the countdown resumes.

```
Worked example:
  pickTimerSeconds = 43200 (12 hours)
  timerSuspendStart = "23:00"
  timerSuspendEnd = "07:00"
  League timezone: America/Chicago

  Pick starts at Mon 6:00pm CT.
  
  Mon 6:00pm – Mon 11:00pm: 5 hours of active time elapse.
    Remaining: 12h - 5h = 7h
  
  Mon 11:00pm – Tue 7:00am: timer is SUSPENDED (8 hours, not counted).
  
  Tue 7:00am – Tue 2:00pm: 7 hours of active time elapse.
    Remaining: 7h - 7h = 0h → TIMER EXPIRES at Tue 2:00pm CT.
  
  Total wall-clock time: Mon 6pm → Tue 2pm = 20 hours
  Total active time: 12 hours (matches pickTimerSeconds)
```

### Timer expiration and auto-pick

When the timer expires, the system attempts to make a pick on the franchise's behalf, following the configurable fallback chain:

```
Auto-pick fallback chain:

1. CHECK WORKLIST
   Load DraftWorklistEntry records for this franchise, this round,
   sorted by priority ascending.
   For each entry:
     a. Is the player still available (not picked, not rostered)?
     b. Is the player in the allowed pool (ROOKIES_ONLY etc.)?
     c. Would rostering the player violate position limits?
        (Only if forceFullRosterAtEnd = true.)
     d. If all checks pass → SELECT this player. Done.
     e. If not → continue to next worklist entry.

2. CHECK MY DRAFT LIST
   Load MyDraftListEntry records for this franchise,
   sorted by rank ascending.
   Same checks as worklist. If a valid player is found → SELECT. Done.

3. FALLBACK (depends on timerExpirationBehavior):
   
   SKIP_ONLY:
     → Pick is skipped. DraftPick.playerSelectedId remains null.
       DraftPick.wasAutoPicked = false. Commissioner notified.
   
   USE_DRAFT_LIST_THEN_SKIP:
     → (Steps 1-2 already attempted.) Skip the pick.
   
   USE_DRAFT_LIST_THEN_EXPERT:
     → Query sportsdata.io expert projections for the league's
       scoring format. Select the highest-projected available player
       that passes validation.
   
   USE_DRAFT_LIST_THEN_ADP:
     → Query ADP (average draft position) data from sportsdata.io.
       Select the player with the highest ADP rank who is still
       available and passes validation.

4. If a player is selected via auto-pick:
   DraftPick.wasAutoPicked = true.
   Normal pick completion sequence executes (RosterEntry, Contract, Transaction).
   Franchise owner notified: "Auto-pick: [Player Name] was selected for you."
```

### Consecutive timeout escalation

When `autoPickAfterConsecutiveTimeouts` is set (e.g., 3), the system tracks consecutive timeouts per franchise. After N consecutive timeouts, the franchise is added to `autoPickFranchises` for the remainder of the draft. This prevents an absent owner from grinding the draft to a halt in email mode.

```
Tracking:
  consecutiveTimeouts[franchiseId] = 0  (reset at draft start)
  
  On timeout:
    consecutiveTimeouts[franchiseId] += 1
    If consecutiveTimeouts[franchiseId] >= autoPickAfterConsecutiveTimeouts:
      Add franchiseId to autoPickFranchises (runtime only, not persisted to League).
      All subsequent picks for this franchise are auto-picked immediately.
  
  On manual pick (owner makes a pick themselves):
    consecutiveTimeouts[franchiseId] = 0  (reset)
```

---

## Pick execution

When a franchise makes a pick (manually or via auto-pick), the system executes this sequence:

```
1. VALIDATE
   a. Is the draft IN_PROGRESS (not PAUSED or COMPLETED)?
   b. Is it this franchise's turn (current pick's currentFranchiseId)?
   c. Is the selected player available?
      - Not already picked in this draft (no DraftPick.playerSelectedId = this player)
      - Not already rostered in this league (no RosterEntry for this player)
   d. Is the player in the allowed pool?
      - If availablePlayerPool = ROOKIES_ONLY: player.rookieYear = currentSeasonYear
      - If availablePlayerPool = VETERANS_ONLY: player.rookieYear < currentSeasonYear
      - If availablePlayerPool = BOTH: no filter
   e. Position limits check (only if forceFullRosterAtEnd = true):
      Would picking this player make it impossible to fill all required
      positions with remaining picks? If so, block with warning.

2. RECORD THE PICK
   a. Update DraftPick:
      - playerSelectedId = selected player
      - pickCompletedAt = now
      - pickElapsedSeconds = (pickCompletedAt - pickStartedAt) in seconds
        (excluding suspended time)
      - wasAutoPicked = false (or true if auto-picked)

3. CREATE ROSTER ENTRY
   a. Create RosterEntry {
        franchiseId: currentFranchiseId,
        playerId: selected player,
        bucket: ACTIVE,   ← always ACTIVE on draft; owner moves to taxi later
        contractId: null   ← populated in step 4 if applicable
      }

4. CREATE CONTRACT (if trackContracts = true)
   a. Lookup RookieSalaryScale for this league, round, pickInRound.
   b. If scale entry exists:
      Create Contract {
        baseSalary: scale.baseSalary,
        contractYearsTotal: scale.defaultContractYears,
        contractYearsRemaining: scale.defaultContractYears,
        status: ACTIVE
      }
   c. If no scale entry (league doesn't have a scale, or non-rookie draft):
      Create Contract {
        baseSalary: League.minimumPlayerSalary,
        contractYearsTotal: 1,
        contractYearsRemaining: 1,
        status: ACTIVE
      }
   d. Update RosterEntry.contractId with the new contract.

5. CREATE TRANSACTION
   Transaction {
     type: DRAFT_PICK_MADE,
     payload: { pickId, playerId, contractId }
   }

6. ADVANCE DRAFT
   a. If there is a next pick (overallNumber + 1):
      - Start timer for next pick (set pickStartedAt = now on next DraftPick).
      - Notify next franchise: "You're on the clock."
      - If next franchise is in autoPickFranchises, execute auto-pick immediately.
   b. If this was the last pick:
      - Draft state becomes COMPLETED.
      - Broadcast: "Draft is complete."
      - Trigger post-draft processing (see §Post-Draft Processing).

7. BROADCAST
   Notify all league members: "[Franchise] selects [Player] with pick [round].[pickInRound]."
```

### Worked example — rookie draft with salary scale

**Setup:**
- Dynasty league, 16 teams per conference, 8-round rookie draft
- `availablePlayerPool = ROOKIES_ONLY`
- `draftOrderType = LINEAR` (inverse standings)
- Rookie salary scale per FLAG league example (see PRD §7.6)

**Pick execution — Round 1, Pick 3 (overall #3):**

Franchise: Panthers (3rd-worst record)
Player selected: Travis Hunter (WR)

```
1. Validate: Draft is IN_PROGRESS, it's Panthers' turn, Hunter is available,
   Hunter is a rookie (rookieYear = 2026), position limits OK.

2. Record: DraftPick R1P3 updated. playerSelectedId = Hunter.
   pickElapsedSeconds = 1847 (about 31 minutes).

3. RosterEntry created: Panthers now roster Hunter (bucket: ACTIVE).

4. Contract created from salary scale:
   RookieSalaryScale lookup: round=1, pickInRound=3 → baseSalary=$4.60, defaultContractYears=3
   Contract {
     baseSalary: $4.60,
     contractYearsTotal: 3,
     contractYearsRemaining: 3,
     salaryEscalatorPercent: 10.0% (league default),
     status: ACTIVE
   }
   
   Projected cap hits:
     Year 1: $4.60
     Year 2: $4.60 × 1.10 = $5.06
     Year 3: $5.06 × 1.10 = $5.57

5. Transaction created: DRAFT_PICK_MADE.

6. Timer starts for Pick 4 (next franchise on the clock).
```

---

## Post-draft processing

When the draft completes:

```
1. ROOKIE CONTRACT ASSIGNMENT DEADLINE (Dynasty/Keeper with contracts)
   For each pick where trackContracts = true:
   - Owner has a grace period (configurable, default 48 hours from draft
     completion) to:
     a. Move the player to taxi squad (if eligible)
     b. Specify a different contract length (within allowed range)
   - If the owner takes no action by the deadline:
     a. Player stays on active roster with the default contract from
        the salary scale.
     b. Commissioner is notified.
   - Per PRD §22.12: no penalty for late assignment; the default is
     simply applied.

2. DRAFT RESULTS ARCHIVAL
   All DraftPick records are frozen. The `DRAFT_START` calendar event
   is marked `COMPLETED`.

3. POST-DRAFT NOTIFICATIONS
   - League-wide: draft results summary (grid format)
   - Per franchise: "Your draft picks" summary with contracts

4. NARRATIVE EVENT (v2)
   Fire narrative trigger for draft recap generation.
```

---

## Commissioner draft controls

Commissioners have elevated controls during and after the draft:

| Action | When available | Behavior |
|---|---|---|
| **Change pick** | After a pick is made (IN_PROGRESS or COMPLETED) | Replace the selected player with a different player. Old player is un-rostered, old contract deleted. New player rostered, new contract created. Transaction record updated. Audit logged. |
| **Skip pick** | IN_PROGRESS, current pick only | Mark the current DraftPick as skipped (`playerSelectedId` remains null, `wasAutoPicked = false`). Advance to next pick. Commissioner must resolve skipped picks after the draft. |
| **Pause draft** | IN_PROGRESS | Halt the timer. Draft state → PAUSED. Current pick's remaining time is preserved. All owners notified. |
| **Resume draft** | PAUSED | Restart the timer from where it left off. Draft state → IN_PROGRESS. All owners notified. |
| **Revert draft** | IN_PROGRESS or COMPLETED | Undo all picks back to a specific pick number. All subsequent picks are un-done: `playerSelectedId` set to null, RosterEntries deleted, Contracts deleted, Transactions reversed. **Destructive** — requires confirmation. Picks that involved traded players downstream cannot be reverted (system warns). |
| **Archive draft** | COMPLETED | Lock draft results permanently. No further changes allowed. |
| **Make pick for franchise** | IN_PROGRESS, current pick only | Commissioner selects a player on behalf of the on-the-clock franchise. Pick records `initiatedByUserId` as the commissioner but `currentFranchiseId` as the franchise. |
| **Edit draft order** | NOT_STARTED only | Rearrange the base order. Regenerates all DraftPick records. |
| **Add/remove rounds** | NOT_STARTED only | Change `draftRounds`. Regenerates DraftPick records. |

All commissioner actions create a Transaction record with `type = COMMISSIONER_ACTION` for audit trail.

---

## Pre-draft preparation tools

### My Draft List

A personal ranked list of players an owner wants. Used as the primary auto-pick source.

**Rules:**
- Each franchise has one list per league per season
- Players are ranked 1 through N (no gaps, no ties)
- A player can appear on the list only once per franchise
- Players already rostered in the league are automatically grayed out (but not removed — in case the rostering franchise drops them before the draft)
- The list persists across draft sessions (for email drafts that span days)
- Dynasty leagues support "clone from last year" to pre-populate with the previous season's list, minus players who are already rostered

### Work List (Pre-draft picks)

Round-specific queued picks. When the franchise's turn comes up in a specific round, the system checks the worklist for that round first.

**Rules:**
- Each franchise has one worklist per league per season
- Entries are scoped to a specific round
- Within a round, entries have a priority order (1 = first choice)
- If the top-priority player in the worklist is available and valid, they are auto-selected — even in live drafts. This lets owners pre-queue picks when they know what they want.
- If no worklist entry for the current round is valid, the system falls to the normal timer/auto-pick chain

**Worklist vs. My Draft List:**

| Feature | Work List | My Draft List |
|---|---|---|
| Scope | Per-round | All rounds |
| When checked | First, before timer starts counting | After timer expires |
| Purpose | "I know exactly who I want at this pick" | "If I'm not around, pick from this list" |
| Typical use | Email drafts, pre-queued selections | Auto-pick fallback |

### Draft-time pick trading

If `tradeFuturePicksEnabled = true` (or for current-season picks), owners can trade picks during the draft. A trade of a pick that hasn't been used yet updates `DraftPick.currentFranchiseId`. The trade uses the standard trade workflow from [Spec_Transactions.md](../transactions/Spec_Transactions.md), with one constraint: trades during a live draft use `IMMEDIATE` processing regardless of the league's `tradeProcessing` setting. Commissioner review or league vote would freeze the draft — not practical during a timed event.

**Decision note:** This override only applies during a LIVE draft (`draftMode = LIVE` AND draft state = IN_PROGRESS). Email drafts, which can span days, use the league's normal `tradeProcessing` setting.

---

## Draft tiebreakers

When computing draft order from standings (for `INVERSE_STANDINGS` or `ROLLING` order types), ties between franchises with identical records are broken using a configurable tiebreaker chain. These tiebreakers are **distinct from standings tiebreakers** — draft tiebreakers assign the higher pick (better draft position) to the tiebreak *loser*, because draft order is inverted from standings.

**Default chain:**
1. Head-to-head record (loser gets higher pick)
2. Total points scored (lower points gets higher pick)
3. Coin flip — deterministic seed: `hash(leagueId + seasonYear + "draft")`. The same seed always produces the same result, so the order is reproducible.

**Playoff team ordering:**
Teams that made the playoffs are ordered by playoff finish, champion picking last. Within a round (e.g., two teams eliminated in the same playoff round), the tiebreaker chain above applies.

```
Worked example — 8-team league:

Regular season finish (worst to best):
  1. Dolphins (2-11)  → Pick 1
  2. Jets (3-10)      → Pick 2
  3. Raiders (5-8)    → Pick 3
  4. Bears (5-8)      → Tied with Raiders
  5. Chargers (7-6)   → Pick 5 (missed playoffs)

  Tiebreaker: Raiders vs Bears, both 5-8
    H2H: Bears won 2-0 → Bears is the tiebreak WINNER
    → Raiders get Pick 3 (higher pick = worse team)
    → Bears get Pick 4

Playoff teams (by finish):
  6. Cardinals (lost divisional round)    → Pick 6
  7. Bills (lost championship)           → Pick 7
  8. Chiefs (champion)                   → Pick 8 (last pick)
```

---

## Inputs & outputs

### Triggers

| Trigger | Source | Action |
|---|---|---|
| Calendar event: `DRAFT_START` | Calendar system | Open draft, start first pick timer |
| Commissioner: "Start draft" | Commissioner tools | Open draft early |
| Owner: select player | Draft room UI | Execute pick |
| Timer expiration | Timer engine | Execute auto-pick chain |
| Commissioner: pause/resume/skip/change/revert | Commissioner tools | Draft management |
| Owner: update My Draft List | Draft room UI | Persist list changes |
| Owner: update Work List | Draft room UI | Persist worklist changes |

### Outputs

| Output | Downstream consumer |
|---|---|
| DraftPick updates | Draft board UI, draft results display, pick trading |
| RosterEntry creation | Roster display, cap usage, lineup validation |
| Contract creation | Cap math, salary cap reports, franchise profile |
| Transaction records | Transaction feed, audit log, narrative engine (v2) |
| Notifications | In-app, email, push (per owner preference) |

---

## Edge cases

### E1. Traded pick — owner picks out of turn

**Scenario:** Alpha traded R1P3 to Beta. When R1P3 comes up, Alpha's owner (not realizing the pick was traded) tries to make a pick.

**Behavior:** The system checks `currentFranchiseId` on the DraftPick, which is Beta. Alpha's pick attempt is rejected: "This is not your pick. [Beta] owns this selection." Alpha must wait for their next pick.

### E2. Player drafted who was just added via FCFS

**Scenario:** During an email draft that spans days, Owner A adds Player X via FCFS add/drop on Tuesday. On Wednesday, Owner B tries to draft Player X.

**Behavior:** The validation check "is the player already rostered in this league?" catches this. Pick is blocked: "[Player X] is already on [Franchise A]'s roster." Player X is not available in the draft.

### E3. Worklist conflict — same player in two franchises' worklists

**Scenario:** Both Alpha and Beta have Player X as their #1 worklist pick for Round 3. Alpha picks at R3P1, Beta picks at R3P2.

**Behavior:** Alpha's pick fires first (it's their turn). Player X is selected for Alpha. When Beta's turn arrives, the worklist attempts Player X, finds they're unavailable, moves to Beta's #2 worklist entry. No conflict — the system processes picks sequentially, and availability is checked at pick time.

### E4. Timer expires during suspend window

**Scenario:** A pick has 30 minutes of active time remaining. The suspend window starts. 30 minutes pass during the suspend window.

**Behavior:** The timer does NOT expire during the suspend window — suspended time doesn't count. The 30 minutes of remaining active time resume when the suspend window ends. The pick expires 30 minutes after `timerSuspendEnd`.

### E5. All worklist and My Draft List entries exhausted

**Scenario:** Owner's timer expires. Their worklist for this round is empty. Their My Draft List has 3 entries, all of whom have been picked already. Fallback is `USE_DRAFT_LIST_THEN_SKIP`.

**Behavior:** The pick is skipped. Commissioner is notified. The skipped pick slot can be resolved after the draft via "Change pick."

### E6. Commissioner reverts a pick after the drafted player was traded

**Scenario:** In round 1, Alpha drafts Player X. In round 3, Alpha trades Player X to Beta. Commissioner tries to revert back to round 1.

**Behavior:** Revert is blocked: "Cannot revert past pick R1P3 — Player X has been traded to [Beta] since being drafted. Resolve the trade first." The system checks every pick being undone for downstream entanglements (trades, drops, IR moves).

### E7. `forceFullRosterAtEnd` blocks a pick

**Scenario:** League requires 1 QB, and `forceFullRosterAtEnd = true`. In the last round, a franchise that hasn't drafted a QB tries to pick a WR.

**Behavior:** Pick is blocked: "You must draft a QB with your remaining pick(s) to meet roster requirements." The owner must pick a QB. If auto-pick runs into this constraint, it selects the highest-ranked QB available.

### E8. Email draft spans a roster compliance deadline

**Scenario:** An email draft starts in the offseason when `rosterSpotsOffseason = 70`. Midway through the draft, a `ROSTER_COMPLIANCE_DEADLINE` fires, switching the active roster limit to `rosterSpots = 53`. Franchise has already drafted 50 players.

**Behavior:** The roster limit used for validation is the CURRENT limit at the time of each pick. After the compliance deadline, picks are validated against the in-season `rosterSpots = 53`. The franchise can only draft 3 more players. This is unlikely in practice (drafts should complete before compliance deadlines), but the system handles it gracefully.

### E9. Two conference drafts with overlapping player pools

**Scenario:** League uses `ISOLATED_PER_CONFERENCE` but a commissioner accidentally sets both conference drafts to `BOTH_ROOKIES_AND_VETERANS` player pool.

**Behavior:** Each conference's draft operates on its own player pool scoped to that conference. Even if the setting says "BOTH," the conference isolation filter still applies — a player can only be drafted by franchises in their conference. The two drafts can't pick the same player because they're operating on separate player pools.

### E10. Draft pick used as trade asset after the player has already been selected

**Scenario:** A future pick (2027 R1P5) has been traded to Beta. In the 2027 draft, Beta uses the pick to select Player X. After the draft, Alpha (who doesn't realize the pick was used) tries to trade "their 2027 R1P5" in a different trade.

**Behavior:** The pick no longer belongs to Alpha (`currentFranchiseId = Beta`) AND it has been used (`playerSelectedId` is set). The trade validation rejects the asset: "Pick 2027 R1P5 is not owned by [Alpha]." Even if Alpha somehow referenced the pick ID, the system would catch that the pick has been used and is not tradeable.

---

## Open questions

### OQ1. Should the system support supplemental drafts?

**Context:** Some Dynasty leagues hold mid-season supplemental drafts for players who enter the NFL late (e.g., USFL/XFL players, late free agent signings). This would require generating additional DraftPick records mid-season.

**Recommendation:** Not in v1. The commissioner can handle supplemental drafts via FCFS add/drop or commissioner override. If demand emerges, a "mini-draft" feature could be added later as a calendar-triggered event.

### OQ2. Should draft pick trading be blocked during the draft in email mode?

**Context:** Currently, pick trading during live drafts uses IMMEDIATE processing. Email drafts use the league's normal `tradeProcessing` setting. But what if a traded pick's turn comes up while the trade is still in `PENDING_COMMISSIONER` state?

**Recommendation:** If a pick is involved in a pending (not yet completed) trade when its turn arrives, the system should treat it as still belonging to the current `currentFranchiseId` (the pre-trade owner). The trade will update ownership when/if it completes, but the draft doesn't wait. This may mean a pick gets used by the pre-trade owner while the trade is pending — the trade would then fail validation because the pick is now used. Document this clearly in the UI: "Warning: this pick's turn may arrive before the trade completes."

### OQ3. How should ADP data be sourced for the `USE_DRAFT_LIST_THEN_ADP` fallback?

**Context:** ADP (Average Draft Position) data comes from external sources (sportsdata.io, FantasyPros, etc.) and varies by scoring format. The system needs to use ADP data that matches the league's scoring configuration.

**Recommendation:** Use sportsdata.io projections (already an integrated data source) as the primary ADP fallback. Map the league's scoring preset to the closest sportsdata.io ranking format. If no close match exists, fall back to overall ADP regardless of scoring format — an imperfect pick is better than a skipped pick.

### OQ4. Should worklist picks execute instantly in live drafts, or give the owner a confirmation window?

**Context:** When a live draft owner's turn arrives and they have a worklist entry for that round, the system could auto-select instantly (saving time) or show a 10-second confirmation window ("Your worklist pick is [Player X]. Confirm or change?").

**Recommendation:** Add a league-level setting `worklistAutoConfirmSeconds` (default: 10 for live drafts, 0 for email drafts). Live draft owners get a brief window to override their pre-queued pick. Email draft owners get instant execution (since they've had days to edit their worklist).

---

## Related buildable units

*To be populated as Level 3 docs are written.*

Anticipated units:
- `Logic_PickGeneration.md` — pick order algorithms, pick record creation
- `Logic_TimerEngine.md` — timer countdown, suspension, expiration
- `Logic_AutoPick.md` — worklist → draft list → fallback chain
- `Logic_DraftOrderComputation.md` — standings-based order with tiebreakers
- `Screen_DraftRoom.md` — live draft experience (board, players, timer, chat)
- `Screen_DraftSetup.md` — commissioner configuration before draft
- `Screen_DraftResults.md` — post-draft results display (grid, list, by-franchise, by-position)
- `Component_DraftBoard.md` — round × franchise pick grid
- `Component_DraftTimer.md` — countdown with urgency states
- `Component_AvailablePlayers.md` — filterable player list
- `Component_DraftList.md` — drag-and-drop ranked list editor

---

**END OF SPEC**
