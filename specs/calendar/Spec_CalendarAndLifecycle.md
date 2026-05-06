# Calendar & Season Lifecycle

**Status:** Draft
**Parent:** [Spec_XOPlay_PRD.md §8](../Spec_XOPlay_PRD.md#8-league-calendar--season-lifecycle)
**Related specs:** [Spec_DataModel.md §4.33–4.34](../Spec_DataModel.md), [Spec_Tiers.md §3.1](../Spec_Tiers.md), [Spec_ScoringEngine.md](../scoring/Spec_ScoringEngine.md), [Spec_SalaryCapAndContracts.md](../salary-cap/Spec_SalaryCapAndContracts.md)
**Last updated:** May 2026

---

## Purpose

The calendar and lifecycle system is the orchestration layer for the entire platform. It manages when things happen — from waiver processing to lineup locks to offseason rollover — and controls which league phase is active at any moment. Every automated action in XO Play is anchored to a calendar event. There is no hidden clock, no hardcoded schedule, no magic trigger. If something fires automatically, a CalendarEvent record exists for it, and an owner or commissioner can look at the calendar and see it coming.

**Design principle: The calendar is the spine of the season.** Every transaction rule, every automated job, every narrative trigger is anchored to a calendar event. Commissioners control their league's rhythm by editing the calendar, not by memorizing obscure settings pages.

**Tier relevance.** The calendar engine is fully tier-agnostic — the same event types, scheduling, and execution system works across Redraft, Keeper, and Dynasty. The difference is how many events a league uses. A Redraft league might have 30 calendar events per season (weekly waivers + playoffs). A Dynasty league like FLAG has 100+ (auctions, rookie drafts, tag deadlines, roster compliance, rollover). The engine doesn't care — it executes whatever events exist.

## PRD anchor

This spec expands on PRD §8 (League Calendar & Season Lifecycle), with additional context from:

- §8.1 — Design principle (calendar as spine)
- §8.2 — CalendarEvent entity
- §8.3 — System-enforced event types (14 types)
- §8.4 — Display-only event types
- §8.5 — Season phases and state machine
- §8.6 — Calendar view (list and grid)
- §8.7 — Charlie's FLAG calendar example
- §7.14 — Offseason rollover (triggered by calendar)
- §7.15 — Pre/post rollover roster rules
- §11.1–11.4 — Waiver processing schedule
- §18.3 — Polling cadence during/outside game windows

What this spec adds: the complete event execution engine, the season phase state machine with guard conditions, the calendar generation algorithm for new leagues, recurrence expansion logic, conflict detection rules, and the interaction between calendar events and the transaction blocking system.

---

## Entities & data shapes

### CalendarEvent (§4.33)

The core entity. Each record represents something that will happen (or has happened) at a specific time.

Key fields:
- `eventType` — one of 14 system-enforced types or `CUSTOM`
- `startAt` / `endAt` — when the event fires (or the range it covers)
- `recurrence` — ONCE / WEEKLY / DAILY
- `recurrenceCount` — how many occurrences for recurring events
- `anchorWeek` — ties the event to a fantasy week (for relative scheduling)
- `systemEnforced` — if true, the system takes automated action; if false, display-only
- `status` — SCHEDULED / COMPLETED / CANCELLED

### Season (§4.34)

A per-league, per-year snapshot. Preserves historical values (cap amount, champion, etc.) so that league history survives across rollovers.

Key fields:
- `seasonYear`, `salaryCapAmount`, `championFranchiseId`, `status`
- Status values: SETUP / ACTIVE / POSTSEASON / COMPLETED

### League status field

The `League.status` field (SETUP / ACTIVE / POSTSEASON / OFFSEASON / ARCHIVED) is the master switch that determines what actions are available. Calendar events drive transitions between these states.

---

## Rules & logic

### 1. Season phase state machine

Leagues progress through a defined lifecycle. Each transition has guard conditions that must be met before the transition fires.

```
SETUP ──────→ ACTIVE
ACTIVE ─────→ POSTSEASON
POSTSEASON ──→ OFFSEASON
OFFSEASON ───→ ACTIVE (new season)
OFFSEASON ───→ ARCHIVED (terminal)
ARCHIVED      (no transitions out)
```

**Transition details:**

| From | To | Trigger | Guard conditions |
|---|---|---|---|
| SETUP | ACTIVE | Commissioner activates league | All franchises created. Rosters populated (via draft, auction, import, or manual load). Scoring rules configured. Schedule generated. |
| ACTIVE | POSTSEASON | `PLAYOFFS_START` event fires | Regular season complete (all matchups for configured weeks are COMPLETED). Standings finalized. Playoff bracket generated with seedings. |
| POSTSEASON | OFFSEASON | `SEASON_END` event fires OR commissioner manually advances | Championship matchup COMPLETED. Season record created with champion/runner-up. All playoff brackets resolved. |
| OFFSEASON | ACTIVE | Commissioner activates new season | Rollover complete (if Dynasty/Keeper). New season's calendar events generated. Rosters compliant with in-season limits (or compliance deadline set). Schedule generated for new season. |
| OFFSEASON | ARCHIVED | Commissioner archives league | Confirmation required. Irreversible. All data preserved read-only. |

**Redraft lifecycle:** Typically SETUP → ACTIVE → POSTSEASON → ARCHIVED (single season). If the commissioner renews, it goes POSTSEASON → OFFSEASON → SETUP (new league clone) rather than cycling.

**Keeper lifecycle:** SETUP → ACTIVE → POSTSEASON → OFFSEASON → ACTIVE (repeating). The offseason includes keeper selection, then a new draft.

**Dynasty lifecycle:** SETUP → ACTIVE → POSTSEASON → OFFSEASON → ACTIVE (repeating). The offseason is the most event-dense period: rollover, franchise tags, auctions, rookie draft, roster compliance.

### 2. System-enforced event types and their execution

Each event type has a specific action that fires when `startAt` arrives and `status = SCHEDULED`.

```
function executeCalendarEvent(event):
  if event.status != SCHEDULED:
    return  // already processed or cancelled

  switch event.eventType:

    case DRAFT_START:
      openDraftRoom(event.leagueId)
      startDraftTimer()
      notifyAllOwners("Draft is starting now")
      event.status = COMPLETED

    case AUCTION_START:
      openAuction(event.leagueId)
      notifyAllOwners("Auction is now open")
      event.status = COMPLETED
      // Auction closing is handled by AuctionPlayerState expiration, not a calendar event

    case PLACE_FREE_AGENTS_ON_WAIVERS:
      lockFreeAgents(event.leagueId)  // All unowned players become waiver-locked
      notifyAllOwners("Free agents are on waivers. Submit blind bids before processing.")
      event.status = COMPLETED

    case PROCESS_BLIND_BID_WAIVERS:
      results = processWaiverClaims(event.leagueId)  // See Spec_Transactions.md
      notifyAllOwners("Waiver results posted", results)
      unlockRemainingFreeAgents(event.leagueId)  // Unclaimed players become FCFS
      event.status = COMPLETED

    case NO_TRADES_ALLOWED:
      // Range event: startAt → endAt
      setTransactionBlock(event.leagueId, TRADE, event.startAt, event.endAt)
      event.status = COMPLETED  // The block persists via the date range

    case NO_ADD_DROPS_ALLOWED:
      setTransactionBlock(event.leagueId, ADD_DROP, event.startAt, event.endAt)
      event.status = COMPLETED

    case NO_IR_MOVES_ALLOWED:
      setTransactionBlock(event.leagueId, IR_MOVE, event.startAt, event.endAt)
      event.status = COMPLETED

    case NO_TAXI_MOVES_ALLOWED:
      setTransactionBlock(event.leagueId, TAXI_MOVE, event.startAt, event.endAt)
      event.status = COMPLETED

    case LINEUP_LOCK:
      // Per-game lock: each NFL game has its own LINEUP_LOCK event
      lockPlayersForGame(event)  // Locks all rostered players in the NFL game
      event.status = COMPLETED

    case TRADE_DEADLINE:
      setTransactionBlock(event.leagueId, TRADE, event.startAt, null)  // Block persists until offseason
      notifyAllOwners("Trade deadline has passed. No more trades until offseason.")
      event.status = COMPLETED

    case ROSTER_COMPLIANCE_DEADLINE:
      violations = checkRosterCompliance(event.leagueId)
      for each violation:
        notifyOwner(violation.franchise, "Roster exceeds in-season limit")
        notifyCommissioner(violation)
      // Enforcement: block lineup submission for non-compliant franchises
      event.status = COMPLETED

    case OFFSEASON_ROLLOVER:
      // This is a marker — the actual rollover requires commissioner confirmation
      notifyCommissioner("Offseason rollover is due. Review and confirm.")
      // Status stays SCHEDULED until commissioner triggers the rollover
      // See Spec_SalaryCapAndContracts.md §6 for the rollover sequence

    case PLAYOFFS_START:
      freezeStandings(event.leagueId)
      generatePlayoffBrackets(event.leagueId)
      transitionLeagueStatus(event.leagueId, ACTIVE, POSTSEASON)
      notifyAllOwners("Playoffs have begun!")
      event.status = COMPLETED

    case SEASON_END:
      recordSeasonResults(event.leagueId)
      transitionLeagueStatus(event.leagueId, POSTSEASON, OFFSEASON)
      notifyAllOwners("Season complete. Offseason begins.")
      event.status = COMPLETED
```

**Key distinction: immediate vs. range events.** Most events fire at `startAt` and complete. The `NO_*_ALLOWED` events are range events — they set a block from `startAt` to `endAt`. The block is checked on every transaction attempt during that window.

**OFFSEASON_ROLLOVER is special.** It's the only system event that doesn't auto-execute. It notifies the commissioner that rollover is due, but the commissioner must confirm before the actual rollover runs (because rollover is irreversible and involves contract/salary changes). See [Spec_SalaryCapAndContracts.md §6](../salary-cap/Spec_SalaryCapAndContracts.md) for the rollover algorithm.

### 3. Transaction blocking system

Calendar events create transaction blocks. The blocking system is checked on every transaction attempt.

```
function isTransactionAllowed(leagueId, transactionType, timestamp):
  // Check for active blocks
  activeBlocks = TransactionBlock.where(
    leagueId = leagueId,
    transactionType = transactionType,
    startAt <= timestamp,
    (endAt is null OR endAt > timestamp)
  )

  if activeBlocks.any():
    return { allowed: false, reason: activeBlocks.first().reason }

  // Check league status
  if league.status == ARCHIVED:
    return { allowed: false, reason: "League is archived." }

  if league.status == SETUP:
    // Only commissioner actions allowed during setup
    if transactionType != COMMISSIONER_ACTION:
      return { allowed: false, reason: "League is still in setup." }

  return { allowed: true }
```

**Block types and their sources:**

| Transaction type | Blocked by | Unblocked by |
|---|---|---|
| TRADE | `NO_TRADES_ALLOWED` range event or `TRADE_DEADLINE` event | End of range, or new season |
| ADD_DROP | `NO_ADD_DROPS_ALLOWED` range event | End of range |
| IR_MOVE | `NO_IR_MOVES_ALLOWED` range event | End of range |
| TAXI_MOVE | `NO_TAXI_MOVES_ALLOWED` range event | End of range |
| All types | League status = ARCHIVED | Never |

**Commissioner override:** Commissioners can execute transactions through blocks. The block check returns `allowed: false` for owners but `allowed: true` for commissioners with a warning: "This transaction violates the current calendar block. Proceed as commissioner override?"

### 4. Lineup locking

Two modes, configured per league:

**LOCK_AT_KICKOFF (default):** Each player locks individually when their NFL game kicks off. A lineup can be partially locked — the Thursday Night Football players are locked while the Sunday players are still editable.

```
function generateLineupLockEvents(league, week):
  nflGames = getNFLGamesForWeek(week)
  for each game in nflGames:
    CalendarEvent.create({
      leagueId: league.id,
      eventType: LINEUP_LOCK,
      title: "{game.awayTeam} @ {game.homeTeam} kickoff lock",
      startAt: game.kickoffTime,
      recurrence: ONCE,
      systemEnforced: true,
      anchorWeek: week,
      metadata: { nflGameId: game.id, teams: [game.homeTeam, game.awayTeam] }
    })
```

**LOCK_AT_FIRST_KICKOFF:** All players lock at the first kickoff of the week (typically Thursday 8:15pm ET). Simpler but less flexible.

```
function generateFirstKickoffLockEvent(league, week):
  firstGame = getNFLGamesForWeek(week).sortBy(kickoffTime).first()
  CalendarEvent.create({
    leagueId: league.id,
    eventType: LINEUP_LOCK,
    title: "Week {week} lineup lock (all players)",
    startAt: firstGame.kickoffTime,
    recurrence: ONCE,
    systemEnforced: true,
    anchorWeek: week
  })
```

**Lock enforcement:** When a LINEUP_LOCK event fires, the system marks affected LineupEntry records with `lockedAt = now()`. Any subsequent attempt to move a locked player out of a starter slot (or swap a locked player) is rejected: "Player is locked — their game has started."

### 5. Calendar generation for new leagues

When a commissioner activates a league or starts a new season, the system generates the default calendar based on the league's configuration.

```
function generateSeasonCalendar(league, seasonYear):
  events = []

  nflSchedule = getNFLSchedule(seasonYear)
  regularSeasonWeeks = league.regularSeasonWeeks  // e.g., 14

  // --- Waiver events (weekly, tied to NFL schedule) ---
  if league.waiverSystem IN (BLIND_BID_WITH_FCFS, WAIVER_ORDER_ONLY):
    for week in 1..regularSeasonWeeks:
      weekStart = nflSchedule.getWeekStart(week)

      // Place FA on waivers
      events.append({
        eventType: PLACE_FREE_AGENTS_ON_WAIVERS,
        title: "Week {week}: Free agents locked for waivers",
        startAt: weekStart.tuesday(16:00, league.timezone),  // Tue 4pm
        recurrence: ONCE,
        anchorWeek: week
      })

      // Process waivers
      events.append({
        eventType: PROCESS_BLIND_BID_WAIVERS,
        title: "Week {week}: Waiver claims processed",
        startAt: weekStart.tuesday(20:00, league.timezone),  // Tue 8pm
        recurrence: ONCE,
        anchorWeek: week
      })

  // --- Lineup lock events (per NFL game) ---
  for week in 1..regularSeasonWeeks + playoffWeeks:
    if league.lineupLockMode == LOCK_AT_KICKOFF:
      generateLineupLockEvents(league, week)
    else:
      generateFirstKickoffLockEvent(league, week)

  // --- Playoffs ---
  events.append({
    eventType: PLAYOFFS_START,
    title: "Playoffs begin",
    startAt: nflSchedule.getWeekStart(regularSeasonWeeks + 1).monday(0:00, league.timezone),
    recurrence: ONCE
  })

  // --- Season end ---
  events.append({
    eventType: SEASON_END,
    title: "Season ends",
    startAt: nflSchedule.getWeekEnd(regularSeasonWeeks + league.playoffWeeks),
    recurrence: ONCE
  })

  // --- Trade deadline (if configured) ---
  if league.tradeDeadlineWeek:
    events.append({
      eventType: TRADE_DEADLINE,
      title: "Trade deadline",
      startAt: nflSchedule.getWeekStart(league.tradeDeadlineWeek).sunday(12:00, league.timezone),
      recurrence: ONCE
    })

  // --- Dynasty/Keeper-specific ---
  if league.tier IN (KEEPER, DYNASTY):
    // Offseason rollover marker
    events.append({
      eventType: OFFSEASON_ROLLOVER,
      title: "Offseason rollover due",
      startAt: estimatedOffseasonStart(league, seasonYear),
      recurrence: ONCE
    })

  if league.tier == DYNASTY:
    // Roster compliance deadline
    events.append({
      eventType: ROSTER_COMPLIANCE_DEADLINE,
      title: "Roster compliance deadline (reduce to {league.rosterSpots} players)",
      startAt: estimatedPreseasonStart(league, seasonYear),
      recurrence: ONCE
    })

  // Bulk create all events
  CalendarEvent.bulkCreate(events)
```

**After generation, the commissioner can edit.** Generated events are starting points, not locked constraints. The commissioner can move dates, add custom events, delete events they don't need, and adjust recurrence. The calendar is theirs to own.

### 6. Recurrence expansion

Recurring events (WEEKLY, DAILY) are stored as a single CalendarEvent record with `recurrence` and `recurrenceCount`. The system expands these into individual occurrences for execution.

```
function getNextOccurrence(event, afterTimestamp):
  if event.recurrence == ONCE:
    return event.startAt if event.startAt > afterTimestamp else null

  interval = switch event.recurrence:
    WEEKLY: 7 days
    DAILY: 1 day

  for i in 0..event.recurrenceCount - 1:
    occurrenceTime = event.startAt + (interval * i)
    if occurrenceTime > afterTimestamp:
      return occurrenceTime

  return null  // all occurrences in the past
```

**Expansion approach:** The system does not pre-create individual records for each occurrence. Instead, the scheduler queries for events where `getNextOccurrence(event, now()) <= now() + lookAheadWindow` and executes them. After execution, the event tracks how many occurrences have completed. When `completedOccurrences == recurrenceCount`, the event transitions to COMPLETED.

**Why not pre-expand?** A league with 20 weeks of weekly waivers would need 40 records (2 events × 20 weeks) instead of 2. Pre-expansion makes the calendar cluttered and harder for commissioners to edit. If a commissioner wants to change all waiver times from 8pm to 9pm, editing one recurring event is simpler than editing 20 individual events.

### 7. Event scheduling and the scheduler

The scheduler is a background process that polls for upcoming events and executes them.

```
function runScheduler():
  // Poll every 30 seconds
  upcomingEvents = CalendarEvent.where(
    status = SCHEDULED,
    nextOccurrence <= now()
  )

  for each event in upcomingEvents:
    try:
      executeCalendarEvent(event)
      logExecution(event, SUCCESS)
    catch error:
      logExecution(event, FAILED, error)
      notifyCommissioner(event.leagueId, "Calendar event failed: {event.title}")
      // Event stays SCHEDULED for retry; commissioner can also cancel
```

**Idempotency:** Every event execution must be idempotent — running the same event twice should not produce duplicate side effects. The waiver processor checks if it has already processed this batch; the lineup lock checks if the players are already locked; the phase transition checks if the league is already in the target phase.

**Missed events:** If the scheduler was down and an event's `startAt` is in the past, it executes immediately on next poll. The system catches up rather than skipping. This is the correct behavior for waiver processing and lineup locks (better late than never). The one exception is LINEUP_LOCK for past NFL games — if a game already ended, the lock is moot and the event is auto-completed without action.

### 8. Calendar conflict detection

When a commissioner creates or edits events, the system checks for conflicts.

```
function detectCalendarConflicts(league, proposedEvent):
  conflicts = []

  existingEvents = CalendarEvent.where(leagueId = league.id, status = SCHEDULED)

  for each existing in existingEvents:
    // Conflict 1: Draft during a transaction block
    if proposedEvent.eventType == DRAFT_START
       and existing.eventType IN (NO_ADD_DROPS_ALLOWED, NO_TRADES_ALLOWED)
       and timeOverlap(proposedEvent, existing):
      conflicts.append("Draft scheduled during a transaction freeze period.")

    // Conflict 2: Waiver processing before waiver lock
    if proposedEvent.eventType == PROCESS_BLIND_BID_WAIVERS:
      matchingLock = existingEvents.find(
        e => e.eventType == PLACE_FREE_AGENTS_ON_WAIVERS
             and e.anchorWeek == proposedEvent.anchorWeek
      )
      if matchingLock and matchingLock.startAt > proposedEvent.startAt:
        conflicts.append("Waiver processing scheduled before FA lock for Week {week}.")

    // Conflict 3: Duplicate event types for same week
    if existing.eventType == proposedEvent.eventType
       and existing.anchorWeek == proposedEvent.anchorWeek
       and existing.id != proposedEvent.id:
      conflicts.append("Duplicate {eventType} for Week {week}.")

    // Conflict 4: Playoffs before regular season ends
    if proposedEvent.eventType == PLAYOFFS_START:
      lastRegularWeek = max(e.anchorWeek for e in existingEvents where e.eventType == PROCESS_BLIND_BID_WAIVERS)
      if proposedEvent.anchorWeek <= lastRegularWeek:
        conflicts.append("Playoffs start before regular season waiver processing ends.")

  return conflicts
```

Conflicts are warnings, not hard blocks (except for truly impossible scenarios like waiver processing before the lock). The commissioner can override warnings with confirmation.

### 9. NFL schedule dependency

The calendar system depends on the NFL schedule for:
- Lineup lock times (per-game kickoff times)
- Week boundaries (when does "Week 1" start and end?)
- Bye week identification (for `allowByeWeekStarters` validation)

```
function syncNFLSchedule(seasonYear):
  schedule = sportsdata.fetchNFLSchedule(seasonYear)

  for each game in schedule:
    // Update or create lineup lock events for leagues using this week
    updateLineupLockEvents(game)

  // Handle schedule changes (NFL flex scheduling moves games)
  for each changedGame in schedule.changes:
    existingLocks = CalendarEvent.where(
      metadata.nflGameId = changedGame.id,
      eventType = LINEUP_LOCK
    )
    for each lock in existingLocks:
      lock.startAt = changedGame.newKickoffTime
      notifyAffectedOwners(lock, "Kickoff time changed for {game}. Lock time updated.")
```

**NFL flex scheduling:** When the NFL moves a game (e.g., from 1pm to 4:25pm, or to Sunday Night Football), the system automatically updates the corresponding LINEUP_LOCK event and notifies owners whose players are affected. This is checked daily during the season.

### 10. Charlie's FLAG calendar — worked example

A complete Dynasty league calendar for one season, showing the density of events:

| Time | Event type | Notes |
|---|---|---|
| Feb 15 | OFFSEASON_ROLLOVER | Commissioner triggers rollover. Contracts decrement, salaries escalate, cap increases. |
| Feb 16–Mar 1 | CUSTOM | "Franchise tag window" — display-only reminder |
| Mar 1 | CUSTOM | "Franchise tag deadline" |
| Mar 15 | CUSTOM | "Rookie contract posting deadline" |
| May 2 | AUCTION_START | NFC offseason auction opens |
| May 2 | AUCTION_START | AFC offseason auction opens |
| May 16 | CUSTOM | "Auction closes" (actual close handled by bid expiration) |
| May 23 | DRAFT_START | NFC rookie draft |
| May 23 | DRAFT_START | AFC rookie draft |
| Jun 1 | CUSTOM | "Taxi assignment deadline" |
| Aug 15 | ROSTER_COMPLIANCE_DEADLINE | Rosters must be ≤53. Violations flagged. |
| Sep 5 (Week 1 Thu) | LINEUP_LOCK | TNF kickoff lock |
| Sep 7 (Week 1 Sun 1pm) | LINEUP_LOCK | Early Sunday lock |
| Sep 7 (Week 1 Sun 4:25pm) | LINEUP_LOCK | Late Sunday lock |
| Sep 7 (Week 1 Sun 8:20pm) | LINEUP_LOCK | SNF lock |
| Sep 8 (Week 1 Mon 8:15pm) | LINEUP_LOCK | MNF lock |
| Sep 9 (Tue 4pm) | PLACE_FREE_AGENTS_ON_WAIVERS | Weekly waiver lock |
| Sep 9 (Tue 8pm) | PROCESS_BLIND_BID_WAIVERS | Weekly waiver processing |
| *...repeats weekly for 20 weeks...* | | |
| Dec 7 (Sun 12pm) | TRADE_DEADLINE | No more trades |
| Dec 22 | PLAYOFFS_START | Regular season standings frozen, brackets generated |
| Jan 19 | SEASON_END | Championship complete, league enters OFFSEASON |

That's roughly 120+ events for a single Dynasty season, all visible on the calendar, all editable by the commissioner.

---

## Inputs & outputs

### Triggers

| Trigger | Source | What fires |
|---|---|---|
| Scheduled time arrives | Scheduler (polls every 30 seconds) | `executeCalendarEvent` for the matching event |
| Commissioner creates/edits event | Calendar editor UI | Conflict detection, then save |
| NFL schedule update | sportsdata.io sync (daily) | Update LINEUP_LOCK times for affected games |
| Commissioner activates league | Setup flow | `generateSeasonCalendar` |
| Commissioner triggers rollover | Rollover confirmation UI | Marks OFFSEASON_ROLLOVER as COMPLETED, runs rollover sequence |
| Season phase transition | Event execution | Updates `League.status`, creates/updates `Season` record |

### Outputs

| Output | Destination | Description |
|---|---|---|
| Transaction blocks | TransactionBlock table | Created by NO_*_ALLOWED and TRADE_DEADLINE events |
| Lineup locks | LineupEntry.lockedAt | Set by LINEUP_LOCK events |
| League status transitions | League.status | Driven by PLAYOFFS_START and SEASON_END events |
| Season records | Season table | Created/updated at phase transitions |
| Waiver results | WaiverClaim table | Produced by PROCESS_BLIND_BID_WAIVERS |
| Notifications | Notification system | Every event fires relevant notifications |
| Audit log | CalendarEventLog table | Every execution logged with timestamp and outcome |

---

## Edge cases

### E1. Commissioner cancels a recurring event mid-season

**Scenario:** Commissioner cancels the weekly waiver processing event after Week 8.

**Behavior:** The event is marked CANCELLED. Remaining occurrences (Weeks 9+) do not fire. Free agents placed on waivers in Week 9+ are never processed — they remain locked. The commissioner must either reinstate the event, create new one-off events, or manually unlock free agents.

**System warning:** "Cancelling this recurring event will stop waiver processing for the remaining {N} weeks. Continue?"

### E2. NFL game postponed or cancelled

**Scenario:** An NFL game is postponed to a different day (e.g., weather delay).

**Behavior:** The sportsdata.io sync detects the schedule change and updates the LINEUP_LOCK event. Affected owners are notified: "Kickoff for {game} moved to {newTime}. Your players remain editable until the new kickoff."

If a game is cancelled entirely (no makeup date), the LINEUP_LOCK event is cancelled. Players from those teams score 0 for that week.

### E3. Scheduler downtime during waiver processing window

**Scenario:** The scheduler is down from Tue 7:55pm to Tue 8:10pm, missing the 8pm waiver processing event.

**Behavior:** When the scheduler comes back online, it detects the missed event (startAt is in the past, status still SCHEDULED) and executes immediately. Waiver results are posted at 8:10pm instead of 8:00pm. All owners receive normal waiver result notifications. The 10-minute delay is logged but generally inconsequential.

### E4. Commissioner tries to activate league without a schedule

**Scenario:** Commissioner clicks "Activate League" but no matchup schedule has been generated.

**Behavior:** Transition from SETUP → ACTIVE is blocked: "Cannot activate league: no matchup schedule exists. Generate a schedule first." The commissioner is directed to the schedule generation tool.

### E5. Trade deadline event set for a week that's already past

**Scenario:** Commissioner creates a TRADE_DEADLINE event dated two weeks ago.

**Behavior:** The event executes immediately on next scheduler poll (it's in the past, still SCHEDULED). Trades are blocked from that point forward. A warning is shown at creation: "This date is in the past. The trade block will take effect immediately."

### E6. Multiple leagues sharing NFL schedule changes

**Scenario:** NFL flexes a Week 14 game. 500 leagues have LINEUP_LOCK events for that game.

**Behavior:** The NFL schedule sync job updates all affected events in a single batch. Notifications are sent to owners in all affected leagues. This is a bulk operation — the sync job processes all leagues, not one at a time.

### E7. Overlapping transaction block periods

**Scenario:** A NO_ADD_DROPS_ALLOWED event runs from Week 14 to Week 17, and a separate NO_TRADES_ALLOWED event runs from the trade deadline (Week 12) indefinitely.

**Behavior:** Both blocks are active simultaneously. During Weeks 14–17, both add/drops AND trades are blocked. The blocks are independent — each has its own start/end, and neither cancels the other.

### E8. Commissioner edits a recurring event after some occurrences have fired

**Scenario:** After Week 5's waivers process, the commissioner changes the waiver processing time from 8pm to 9pm.

**Behavior:** Future occurrences (Week 6+) use the new time. Past occurrences (Weeks 1–5) are unaffected — they already completed. The `completedOccurrences` counter is preserved.

### E9. PLAYOFFS_START fires but not all regular season matchups are complete

**Scenario:** The PLAYOFFS_START event fires, but Week 14 has a MNF game still in progress.

**Behavior:** The event's guard condition fails: "Cannot start playoffs — Week 14 matchups still IN_PROGRESS." The event stays SCHEDULED and retries on next poll. Once all Week 14 matchups are COMPLETED, the event fires normally.

### E10. League in OFFSEASON with no OFFSEASON_ROLLOVER event

**Scenario:** A Redraft league reaches OFFSEASON but has no rollover event (because Redraft doesn't roll over).

**Behavior:** Correct. Redraft leagues don't cycle — they go OFFSEASON → ARCHIVED (or the commissioner clones the league for a new season). No rollover event is generated for Redraft leagues.

### E11. Calendar event for a conference-specific auction in a 32-team league

**Scenario:** FLAG league has separate NFC and AFC auctions on the same date.

**Behavior:** Two separate AUCTION_START events, each with metadata indicating which conference it covers. The auction engine uses the conference metadata to determine which player pool and which franchises are eligible. Both events can have the same `startAt` — they're independent auctions.

---

## Open questions

### OQ1. Timezone handling for calendar events

All `startAt` / `endAt` values are stored as UTC timestamps. But commissioners think in their local timezone ("Waivers process at 8pm Central"). Should the calendar editor show times in the commissioner's timezone with a UTC indicator? Or should the league have a single `leagueTimezone` setting that all events display in?

**Recommendation:** `leagueTimezone` setting on the League entity (default: commissioner's timezone at creation). All event times display in the league timezone. Storage is UTC. Owners in different timezones see the league timezone by default but can toggle to their own.

### OQ2. How far ahead should lineup lock events be generated?

LINEUP_LOCK events depend on the NFL schedule, which isn't finalized until late spring and gets flexed during the season. Should we generate locks for the full season at league activation, or generate them week-by-week as the NFL schedule firms up?

**Recommendation:** Generate for all known weeks at league activation. Update as the NFL releases flex scheduling changes (typically announced 6–12 days before the game). The daily sportsdata.io sync handles updates automatically.

### OQ3. Should calendar events be versioned for audit?

When a commissioner changes an event time, should we keep the old value? This matters if an owner claims "the waiver was supposed to process at 8pm, not 9pm."

**Recommendation:** Yes. Store a `previousStartAt` and `editedByUserId` on each edit. Not a full version history (overkill), but a single "last changed from" record.

### OQ4. Batch vs. individual event creation for waivers

The current design generates individual waiver events per week. An alternative: a single recurring event with `recurrence = WEEKLY, recurrenceCount = 20`. The recurring approach is cleaner for commissioner editing but harder to cancel individual weeks (e.g., "skip waivers during bye week").

**Recommendation:** Use the recurring approach as the default. Add a `skippedOccurrences` array to the CalendarEvent entity so commissioners can skip individual weeks without cancelling the whole series.

---

## Related buildable units

Per [Structure_Map.md](../../documents/Structure_Map.md), the `calendar/` folder anticipates these Level 3 units:

| Unit | Type | Purpose |
|---|---|---|
| `Screen_Calendar.md` | Screen | Calendar view (list + grid) with event creation/editing for commissioners |
| `Logic_SeasonPhaseTransitions.md` | Logic | State machine implementation — guard conditions, transitions, side effects |
| `Logic_ScheduledEventRunner.md` | Logic | The scheduler — polling, execution, retry, idempotency |
| `Component_CalendarGrid.md` | Component | Month/week grid view with event display |
| `Component_EventCard.md` | Component | Individual event display card with edit/cancel controls |

These will be written when the calendar feature moves to build phase.

---

**END OF SPECIFICATION**
