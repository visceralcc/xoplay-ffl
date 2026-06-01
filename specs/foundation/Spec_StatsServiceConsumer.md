# XO Play — NFL Stats Service Consumer

**Status:** Draft
**Parent:** [Spec_XOPlay_PRD.md](../Spec_XOPlay_PRD.md) §18 (Live Scoring), §23.1 (External data dependency)
**Related specs:** [Spec_ScoringEngine.md](../scoring/Spec_ScoringEngine.md); [Spec_RosterManagement.md](../roster/Spec_RosterManagement.md); [Spec_CalendarAndLifecycle.md](../calendar/Spec_CalendarAndLifecycle.md); [Spec_DataModel.md](../Spec_DataModel.md) §4.9 (Player), §4.10 (Stats)
**External dependency:** `nfl-stats-service/docs/Spec_NflStatsService.md` (standalone service spec)
**Last updated:** May 2026

---

## Purpose

This document defines how XO Play connects to the standalone NFL Stats Service as a consumer. It replaces the previous `Spec_StatsService.md` which scoped the entire data pipeline inside XO Play's codebase.

The NFL Stats Service is now a separate project — its own repo, database, and deployment. It ingests, normalizes, caches, and distributes NFL data. XO Play subscribes to that data and applies its own domain logic (fantasy scoring, roster management, lineup locking, notifications). This spec covers XO Play's side of that handshake.

**What this spec covers:**
- Which Stats Service events XO Play subscribes to
- How XO Play maps Stats Service player IDs to its own Player entity
- What XO Play does when each event fires
- How XO Play's existing entities change under the new architecture
- The initial player sync process

**What this spec does NOT cover:**
- How the Stats Service itself works (see `Spec_NflStatsService.md`)
- Provider adapters, caching, reconciliation (all Stats Service concerns)
- WebSocket push to XO Play's end users (see future `Spec_LiveScoring.md`)
- Win probability computation (see future `Spec_LiveScoring.md`)

---

## PRD Anchor

| PRD Section | What it says | What this spec changes |
|---|---|---|
| §23.1 | sportsdata.io is the primary data source | Replaced. XO Play's data source is the NFL Stats Service, not any external provider directly. |
| §18.2 | Ingestion pipeline: sportsdata.io → queue → compute → cache → push | XO Play no longer owns ingestion. It receives events from the Stats Service and handles compute → cache → push. |
| §18.7 | Stat correction handling | XO Play receives a `STATS_CORRECTED` event and triggers its own recomputation. It does not poll for corrections. |
| §18.8 | Fault tolerance | XO Play monitors the Stats Service `/health` endpoint. "Data delayed" indicator driven by Stats Service status, not by XO Play's own polling. |

---

## 1. Event Subscriptions

XO Play registers with the NFL Stats Service as a consumer and subscribes to the following events. (Event definitions are in `Spec_NflStatsService.md §11.2`.)

| Event | XO Play subscribes? | Why |
|---|---|---|
| `PLAYER_UPDATED` | ✅ | Sync player bio changes (team, position, name, retirement) to XO Play's Player entity |
| `STATS_UPDATED` | ✅ | Write new stat lines into XO Play's Stats entity; trigger live scoring recomputation |
| `STATS_CORRECTED` | ✅ | Recompute fantasy points, matchup scores, standings; notify affected owners |
| `INJURY_CHANGED` | ✅ | Update Player.injuryStatus; trigger IR eligibility checks; notify roster owners |
| `GAME_STATUS_CHANGED` | ✅ | Drive live scoring UI state (game start/end); trigger lineup lock enforcement |
| `SCHEDULE_UPDATED` | ✅ | Update kickoff times for lineup lock calculations; recalculate calendar events |
| `INGESTION_FAILED` | ✅ | Trigger commissioner alerts for sustained data outages |

---

## 2. Player ID Mapping

### 2.1 The relationship

The NFL Stats Service owns the canonical NFL player directory. XO Play has its own `Player` entity (see `Spec_DataModel.md §4.9`) which includes both feed-backed players and custom commissioner-created players.

Every feed-backed XO Play Player record has a foreign key to the Stats Service:

| Field | Type | Notes |
|---|---|---|
| `statsServicePlayerId` | UUID | FK → Stats Service `Player.id`. Null for custom players (`isCustom = true`). |

This field is added to the existing `Player` entity. It replaces the current `externalId` field's role as the link to external data.

### 2.2 What stays on XO Play's Player entity

XO Play's `Player` entity continues to exist with all its current fields and relationships (Contracts, RosterEntries, LineupEntries, etc.). The Stats Service sync updates a subset of fields:

| Field | Updated from Stats Service? | Notes |
|---|---|---|
| `firstName`, `lastName`, `fullName` | ✅ | Synced on `PLAYER_UPDATED` |
| `nflTeam` | ✅ | Trade/signing updates |
| `position` | ✅ | Position reclassifications |
| `rookieYear` | ✅ | Set once |
| `dateOfBirth`, `heightInches`, `weightLbs`, `collegeName` | ✅ | Bio data |
| `injuryStatus` | ✅ | Synced on `INJURY_CHANGED` |
| `isActive` | ✅ | Retirement/activation |
| `externalId` | ✅ | Now stores the nflverse `gsis_id` (via Stats Service) |
| `isCustom` | ❌ | XO Play-only concept |
| `headshotUrl` | ❌ | Removed from v1 (no headshots without NFLPA license) |
| `lastSyncedAt` | ✅ | Updated on every sync from Stats Service |
| Contracts, RosterEntries, etc. | ❌ | XO Play domain — Stats Service has no knowledge of these |

### 2.3 Custom player merge

Custom players (`isCustom = true`, `statsServicePlayerId = null`) are commissioner-created XO Play records with no Stats Service counterpart. When the NFL feed later adds the real player, the commissioner merges the custom record into the feed-backed record (PRD §22.17). At merge time, `statsServicePlayerId` is set on the surviving record.

### 2.4 Initial player sync

When XO Play first connects to the Stats Service (or when a new league is created):

```
Step 1: Call Stats Service REST API: GET /players (bulk export)
Step 2: For each Stats Service player:
  - Check if XO Play already has a Player with matching externalId (gsis_id)
  - If yes: set statsServicePlayerId = Stats Service player.id
  - If no: create new XO Play Player record with statsServicePlayerId set
Step 3: Subscribe to PLAYER_UPDATED events for ongoing sync
```

---

## 3. Event Handlers

### 3.1 STATS_UPDATED

**Received when:** A new or updated stat line is available (during live games, or post-game updates).

**XO Play action:**

```
1. Look up XO Play playerId via statsServicePlayerId
2. Write/update XO Play Stats entity (Spec_DataModel.md §4.10):
   - statValues = event.statValues
   - sourceVersion = event.sourceVersion
   - isReconciled = !event.isProvisional
3. For each league where this player has a LineupEntry for this week:
   a. Recompute fantasy points: Stats × League.ScoringRules
      (per Spec_ScoringEngine.md)
   b. Update LineupEntry.fantasyPoints
   c. Recompute Matchup.score (sum of starter LineupEntry.fantasyPoints)
   d. Push updated score to connected clients via WebSocket
      (future Spec_LiveScoring.md)
```

**Performance note:** During live games, this fires every 15 seconds per active game. The recomputation path must be fast — read scoring rules from cache, compute, write. No database joins in the hot path.

### 3.2 STATS_CORRECTED

**Received when:** Thursday reconciliation found stat changes.

**XO Play action:**

```
1. Look up XO Play playerId via statsServicePlayerId
2. Update XO Play Stats entity with corrected values
   - Increment sourceVersion
   - Set lastCorrectionAt = now()
   - Set isReconciled = true
3. For each league where this player had a LineupEntry for the affected week:
   a. Recompute fantasy points
   b. Recompute Matchup.score
   c. If matchup outcome changed (winner flipped):
      - Update standings
      - Fire STATS_CORRECTION event (XO Play's internal event, per PRD §6.7)
      - Notify both franchise owners
      - If correction affects playoff seeding, notify commissioner
```

### 3.3 INJURY_CHANGED

**Received when:** A player's injury status changed.

**XO Play action:**

```
1. Look up XO Play playerId via statsServicePlayerId
2. Update Player.injuryStatus with newStatus
3. For each league where this player is on a roster:
   a. Check IR eligibility against league's irEligibilityLevel setting
      (per Spec_RosterManagement.md)
   b. If player is starting and newStatus = OUT:
      - Trigger lineup validation (informational, not blocking)
   c. Fire INJURY_STATUS_CHANGE notification per owner preferences
```

### 3.4 PLAYER_UPDATED

**Received when:** Player bio or status changed (trade, position change, retirement).

**XO Play action:**

```
1. Look up XO Play playerId via statsServicePlayerId
2. Update changed fields on XO Play Player entity
3. If position changed:
   - Log historical position in Transaction records
     (so reports can show "drafted as DE, now DT")
4. If isActive changed to false (retirement/cut):
   - No automatic roster removal (commissioner handles per league rules)
   - Fire notification to franchise owners who roster this player
5. If nflTeam changed (trade/signing):
   - Update Player.nflTeam
   - Fire notification to roster owners
```

### 3.5 GAME_STATUS_CHANGED

**Received when:** An NFL game started, ended, was postponed, etc.

**XO Play action:**

```
1. If newStatus = IN_PROGRESS:
   - Start live scoring UI state for this game
   - Enforce lineup lock for players in this game
     (per Spec_RosterManagement.md §2 lock mode)
2. If newStatus = FINAL:
   - Mark game as complete in live scoring UI
   - Begin post-game stat finalization
3. If newStatus = POSTPONED:
   - Suspend lineup lock for players in this game
   - Notify commissioners of affected leagues
4. If newStatus = CANCELLED:
   - Notify commissioners
   - Players in this game receive no stats (absence = bye)
```

### 3.6 SCHEDULE_UPDATED

**Received when:** Kickoff time moved or game added/removed.

**XO Play action:**

```
1. Update NflSchedule cache used by lineup lock logic
2. Recalculate lineup lock times for affected games
   (per Spec_RosterManagement.md §2)
3. Recalculate CalendarEvent timing if NFL week boundaries shifted
   (per Spec_CalendarAndLifecycle.md)
```

### 3.7 INGESTION_FAILED

**Received when:** The Stats Service failed to ingest from a provider.

**XO Play action:**

```
1. If provider = API_SPORTS and failure persists > 5 minutes:
   - Show "Data Delayed" indicator in live scoring UI
   - Send commissioner alert to all active leagues
2. If provider = NFLVERSE:
   - No user-facing action (nflverse is non-critical for live ops)
   - Log for internal monitoring
```

---

## 4. Data Model Changes

### 4.1 Player entity modifications

| Change | Detail |
|---|---|
| **Add field** | `statsServicePlayerId` (UUID, nullable) — FK to Stats Service Player.id |
| **Redefine field** | `externalId` — now stores nflverse `gsis_id` (sourced via Stats Service, not directly from sportsdata.io) |
| **Remove field** | `headshotUrl` — no headshots in v1 |
| **Update docs** | `lastSyncedAt` — now reflects last sync from Stats Service, not from sportsdata.io |

### 4.2 Stats entity modifications

| Change | Detail |
|---|---|
| **Add field** | `isReconciled` (boolean, default false) — true after Thursday authoritative data applied |

This field was already proposed in the original `Spec_StatsService.md` and carries forward.

### 4.3 XO Play no longer owns NflSchedule

The NFL Stats Service owns the `NflSchedule` entity. XO Play reads schedule data via the Stats Service REST API and caches it locally for lineup lock calculations. XO Play does NOT maintain its own schedule table — it queries the Stats Service or reads from the Stats Service's read replica.

### 4.4 XO Play no longer owns ingestion infrastructure

The following components from the original `Spec_StatsService.md` are NOT built inside XO Play:
- Provider adapters (nflverse, API-Sports)
- Background polling worker
- Redis cache layer for raw NFL data
- Stat type mapping configurations
- Reconciliation engine
- IngestionLog entity
- ProviderIdMap entity

All of these live in the `nfl-stats-service` repo.

---

## 5. What XO Play Still Owns

To be clear about the boundary, XO Play continues to own and operate:

| System | Why it stays in XO Play |
|---|---|
| **Scoring engine** | Fantasy point computation is league-specific (different scoring rules per league). The Stats Service has no concept of leagues. |
| **Roster management** | Rosters, IR/taxi buckets, and lineup validation are XO Play domain. The Stats Service supplies injury status; XO Play decides what to do with it. |
| **Lineup locking** | Depends on league settings (per-kickoff vs. first-kickoff) which are XO Play concepts. |
| **Matchup computation** | Score aggregation across starters, tiebreakers, standings — all league-specific. |
| **Notifications to users** | The Stats Service fires events to XO Play; XO Play decides which owners to notify and via which channels. |
| **Commissioner alerts** | XO Play translates `INGESTION_FAILED` into commissioner-facing notifications. The Stats Service doesn't know what a commissioner is. |
| **WebSocket push to clients** | XO Play pushes live scores to its own connected users. The Stats Service doesn't talk to end users. |
| **Custom players** | Commissioner-created players with no NFL feed backing. Pure XO Play concept. |
| **Score adjustments** | Manual point adjustments by commissioners. |
| **Transaction history** | Adds, drops, trades, waivers — all XO Play domain. |

---

## 6. Edge Cases

### 6.1 Stats Service is down during live games

XO Play shows "Data Delayed" indicator (triggered by `INGESTION_FAILED` event or by checking Stats Service `/health` endpoint). Live scoring pauses — last-known-good data is displayed. Lineup locks, waiver processing, and other scheduled actions continue using last-known data. When the Stats Service recovers, XO Play receives a burst of `STATS_UPDATED` events and processes them in order.

### 6.2 Consumer webhook is unreachable

The Stats Service retries 3× with exponential backoff, then queues missed events in a dead-letter table (per `Spec_NflStatsService.md §13.7`). XO Play should poll `/events/missed?consumerId={id}` on startup and periodically (every 5 minutes) to catch any events lost during downtime.

### 6.3 Stats Service player not in XO Play

If a `STATS_UPDATED` event arrives for a `statsServicePlayerId` that XO Play doesn't recognize (new player not yet synced):

1. Call Stats Service REST API: `GET /players/{id}`
2. Create XO Play Player record with `statsServicePlayerId` set
3. Process the stat update normally

### 6.4 Custom player merge timing

A commissioner merges a custom player into a feed-backed player. At merge time:

1. Set `statsServicePlayerId` on the surviving Player record
2. Re-point all Contracts, RosterEntries, LineupEntries from the custom record to the merged record
3. Soft-delete the custom record with `mergedIntoPlayerId`
4. Future Stats Service events for this player now resolve correctly

### 6.5 Stat correction changes playoff outcome

Handled identically to regular stat corrections (§3.2), but with an additional commissioner notification. The commissioner may need to manually re-seed brackets if the correction affects playoff standings after brackets were generated.

---

## 7. Relationship to Other Systems

| System / File | Effect / Dependency | Section Reference |
|---|---|---|
| `nfl-stats-service` | XO Play's data source. All NFL data flows through it. | Entire spec |
| `Spec_ScoringEngine.md` | Reads Stats to compute fantasy points. Triggered by `STATS_UPDATED` and `STATS_CORRECTED`. | §3.1, §3.2 |
| `Spec_RosterManagement.md` | Reads Player.injuryStatus for IR eligibility. Triggered by `INJURY_CHANGED`. | §3.3 |
| `Spec_CalendarAndLifecycle.md` | Uses schedule data for week boundaries and lineup locks. Triggered by `SCHEDULE_UPDATED`. | §3.6 |
| `Spec_DataModel.md` | Player and Stats entities modified per §4. | §4 |
| Future `Spec_LiveScoring.md` | Consumes live stat updates, pushes to clients via WebSocket. Triggered by `STATS_UPDATED` + `GAME_STATUS_CHANGED`. | §3.1, §3.5 |

### 7.1 No direct interaction

- **Salary Cap & Contracts** — Unaffected by the Stats Service extraction. Cap math reads Contracts, not Stats.
- **Transactions** — Unaffected. Transaction validation reads rosters and contracts, not raw NFL stats.
- **Social & Communication** — Unaffected.
- **Narrative (v2)** — Will consume Stats data, but as a separate consumer of the Stats Service, not through XO Play's pipeline.

---

## 8. Build Sequence (Preview)

### Phase 1 — Player ID mapping

1. Add `statsServicePlayerId` field to XO Play Player entity
2. Add `isReconciled` field to XO Play Stats entity
3. Remove `headshotUrl` from Player entity
4. Build initial player sync process (§2.4): bulk import from Stats Service, map by gsis_id
5. Write integration test: sync 100 players, verify all fields populated

### Phase 2 — Event subscription + handlers

1. Register XO Play as a consumer with the Stats Service
2. Implement webhook receiver endpoint
3. Implement `PLAYER_UPDATED` handler (§3.4)
4. Implement `INJURY_CHANGED` handler (§3.3)
5. Implement `SCHEDULE_UPDATED` handler (§3.6)
6. Implement `GAME_STATUS_CHANGED` handler (§3.5)
7. Implement `INGESTION_FAILED` handler (§3.7)
8. Write integration tests: mock each event, verify correct downstream action

### Phase 3 — Live stat flow

1. Implement `STATS_UPDATED` handler (§3.1)
2. Wire to scoring engine recomputation
3. Wire to matchup score aggregation
4. Performance test: simulate 15-second stat bursts, verify recomputation completes in < 2 seconds
5. Implement missed-event polling (§6.2)

### Phase 4 — Reconciliation flow

1. Implement `STATS_CORRECTED` handler (§3.2)
2. Wire to full recomputation chain (fantasy points → matchup scores → standings)
3. Wire to notification system (affected owners, commissioners if outcome changed)
4. Integration test: inject a stat correction that flips a matchup, verify standings update and notification

---

## 9. Files Affected (Summary)

| Path | Change |
|---|---|
| `schemas/` | Migration: add `statsServicePlayerId` to Player; add `isReconciled` to Stats; drop `headshotUrl` from Player |
| `src/engine/ingest/` | **Delete entirely.** Ingestion is now the Stats Service's job. Replace with webhook receiver. |
| `src/engine/sync/` | New: Stats Service consumer registration, webhook handler, event dispatcher, missed-event poller |
| `src/engine/scoring/` | No structural change — scoring engine is unchanged, just triggered by new event source |
| `src/engine/roster/` | No structural change — injury checks triggered by new event source |
| `docs/Spec_DataModel.md` | Update Player (add statsServicePlayerId, redefine externalId, remove headshotUrl) and Stats (add isReconciled) |

---

## 10. Open Questions

### OQ1: Read replica vs. REST API for schedule data

Should XO Play connect to the Stats Service's Postgres read replica for schedule queries, or use the REST API? Read replica is faster and supports complex joins, but adds an infrastructure dependency. **Recommendation:** REST API for v1 with local caching. Read replica access if performance demands it later.

### OQ2: Live stat update path

During live games, should XO Play receive `STATS_UPDATED` via webhook (HTTP POST) or via Redis pub/sub subscription? Webhooks are simpler but have higher latency (~100ms). Redis pub/sub is faster (~10ms) but requires XO Play to maintain a Redis connection to the Stats Service's cache. **Recommendation:** Redis pub/sub for live game data; webhooks for everything else. This gives sub-second live scoring without overcomplicating the non-live event flow.

### OQ3: Projections

The Stats Service does not provide projections (deferred in `Spec_NflStatsService.md` OQ3). XO Play needs projections for win probability (PRD §18.5) and lineup auto-fill fallback (PRD §15.7). Options: (a) XO Play sources projections independently, (b) wait for Stats Service to add projections later. **Recommendation:** XO Play sources projections independently for v1. If the Stats Service adds projections later, XO Play switches to that source.
