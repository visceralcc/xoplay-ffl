# Scoring Engine

**Status:** Draft
**Parent:** [Spec_XOPlay_PRD.md §6](../Spec_XOPlay_PRD.md#6-scoring-engine)
**Related specs:** [Spec_DataModel.md §4.10–4.12](../Spec_DataModel.md), [Spec_Tiers.md §3.8](../Spec_Tiers.md)
**Last updated:** May 2026

---

## Purpose

The scoring engine translates NFL player statistics into fantasy points for every league on the platform. It is the single system responsible for turning raw stat data (from sportsdata.io) into the per-player, per-franchise, per-matchup scores that drive standings, playoffs, and all downstream reporting. It must be fast enough for live game scoring (sub-second per player per league), fully auditable (every point traceable to a rule and stat), and flexible enough to support the ~50+ scoring rules a deep Dynasty IDP league uses — all without code changes.

The scoring engine is **entirely tier-agnostic.** It does not know whether a league is Redraft, Keeper, or Dynasty. The commissioner's choice of preset may correlate with tier (Dynasty leagues tend toward `IDP_DEEP`), but the engine evaluates rules identically regardless of tier. See [Spec_Tiers.md §8](../Spec_Tiers.md) for confirmation.

## PRD anchor

This spec expands on PRD §6 (Scoring Engine), with additional context from:

- §6.1 — Design principle (data-driven scoring)
- §6.2 — ScoringRule entity definition and rule evaluation algorithm
- §6.3 — Full stat type enumeration
- §6.4 — Position-specific tackle rules (worked example)
- §6.5 — Packaged scoring presets
- §6.6 — Score adjustments (commissioner manual overrides)
- §18.7 — Stat correction handling
- §22.1 — Position change mid-season edge case

What this spec adds beyond the PRD: complete preset definitions with every rule specified, the full scoring computation pipeline from Stats to Matchup score, composite stat computation rules, the correction recomputation algorithm, Best Ball auto-optimization logic, and edge case handling for scenarios the PRD flags but doesn't resolve.

---

## Entities & data shapes

The scoring engine reads and writes these entities. Full field definitions live in [Spec_DataModel.md](../Spec_DataModel.md); this section documents how the engine uses them.

### Entities the engine reads

| Entity | Fields used | How used |
|---|---|---|
| **Stats** (§4.10) | `playerId`, `seasonYear`, `week`, `statValues`, `sourceVersion` | Source of truth for raw NFL stats. The engine reads `statValues` (a JSON map of statType → numeric value) and applies scoring rules against it. |
| **ScoringRule** (§4.11) | `statType`, `positionScope`, `rangeLow`, `rangeHigh`, `pointsPerUnit`, `perUnit`, `flatPoints` | The league's scoring configuration. The engine loads all rules for a league once per computation batch. |
| **Player** (§4.9) | `position` | Determines which rules apply (via `positionScope` matching). |
| **LineupEntry** (§4.8) | `playerId`, `slotPosition`, `matchupId` | Tells the engine which players are in which franchise's lineup and in which slot (starter vs. bench). |
| **Matchup** (§4.7) | `franchiseId`, `opponentFranchiseId`, `week`, `seasonYear` | Groups LineupEntries into a head-to-head matchup for franchise score computation. |
| **ScoreAdjustment** (§4.12) | `scope`, `franchiseId`, `playerId`, `week`, `pointAdjustment` | Commissioner overrides applied after rule-based scoring. |

### Entities the engine writes

| Entity | Fields written | When |
|---|---|---|
| **LineupEntry** | `fantasyPoints`, `pointBreakdown` | After computing a player's score for a given week. |
| **Matchup** | `homeScore`, `awayScore`, `outcome` | After summing all starter fantasy points + franchise-level adjustments. |

### `pointBreakdown` shape

Each `LineupEntry.pointBreakdown` stores a JSON array showing how the player's points were calculated, enabling the "explain this score" UI. Shape:

```json
[
  {
    "statType": "PASSING_YARDS",
    "statValue": 312,
    "ruleId": "uuid-of-rule",
    "pointsPerUnit": 0.05,
    "perUnit": 1,
    "flatPoints": null,
    "unitsApplied": 312,
    "pointsAwarded": 15.60
  },
  {
    "statType": "PASSING_TDS",
    "statValue": 3,
    "ruleId": "uuid-of-rule",
    "pointsPerUnit": 6.0,
    "perUnit": 1,
    "flatPoints": null,
    "unitsApplied": 3,
    "pointsAwarded": 18.00
  }
]
```

Every point the player earned is traceable to a specific rule and a specific stat value. If a stat correction later changes `statValue`, the breakdown is recomputed and the diff is visible.

---

## Rules & logic

### 1. Core rule evaluation algorithm

This is the heart of the engine. For a single player in a single week in a single league:

```
function computePlayerScore(player, weekStats, leagueRules):
  totalPoints = 0
  breakdown = []

  for each rule in leagueRules:
    // Step 1: Position gate
    if player.position NOT IN rule.positionScope:
      continue

    // Step 2: Get the raw stat value
    statValue = weekStats.statValues[rule.statType]
    if statValue is null or statValue == 0:
      continue

    // Step 3: Range gate
    if statValue < rule.rangeLow OR statValue > rule.rangeHigh:
      continue

    // Step 4: Compute points
    pointsFromThisRule = 0

    if rule.flatPoints is not null:
      pointsFromThisRule += rule.flatPoints

    if rule.pointsPerUnit is not null:
      units = floor(statValue / rule.perUnit)
      pointsFromThisRule += units * rule.pointsPerUnit

    totalPoints += pointsFromThisRule

    // Step 5: Record breakdown
    breakdown.append({
      statType: rule.statType,
      statValue: statValue,
      ruleId: rule.id,
      pointsPerUnit: rule.pointsPerUnit,
      perUnit: rule.perUnit,
      flatPoints: rule.flatPoints,
      unitsApplied: units (or null if only flatPoints),
      pointsAwarded: pointsFromThisRule
    })

  return { totalPoints, breakdown }
```

**Key behaviors:**

- **`floor()` on units, not `round()`.** A player with 99 rushing yards in a league that scores 1 point per 10 yards gets `floor(99/10) = 9` units = 9 points, not 10. This matches industry standard.
- **Both `flatPoints` and `pointsPerUnit` can fire on the same rule.** A rule can award "3 flat points for any FG made, plus 0.1 per yard of length" by setting both fields.
- **Multiple rules can contribute to the same player's score.** A QB with passing yards and a rushing TD fires separate rules for each stat type.
- **At most one rule per statType per position.** Validation at rule creation prevents ambiguous double-counting (see §3 below).

### Worked example — full QB scoring (PPR preset)

Player: Patrick Mahomes, Week 5
Stats: 312 passing yards, 3 passing TDs, 1 INT, 22 completions, 35 attempts, 1 rushing TD, 28 rushing yards, 0 receptions

Rules from PPR preset (QB-applicable):

| Rule | statType | pointsPerUnit | perUnit | flatPoints | rangeLow | rangeHigh |
|---|---|---|---|---|---|---|
| A | PASSING_YARDS | 0.05 | 1 | null | -50 | 999 |
| B | PASSING_TDS | 6.0 | 1 | null | 0 | 99 |
| C | PASSING_INTS | -2.0 | 1 | null | 0 | 99 |
| D | RUSHING_YARDS | 0.1 | 1 | null | -50 | 999 |
| E | RUSHING_TDS | 6.0 | 1 | null | 0 | 99 |
| F | RECEPTIONS | 1.0 | 1 | null | 0 | 99 |

Computation:

```
Rule A: 312 passing yards → floor(312/1) = 312 × 0.05 = 15.60
Rule B: 3 passing TDs   → floor(3/1)   = 3   × 6.0  = 18.00
Rule C: 1 INT           → floor(1/1)   = 1   × -2.0 = -2.00
Rule D: 28 rushing yards → floor(28/1)  = 28  × 0.1  = 2.80
Rule E: 1 rushing TD    → floor(1/1)   = 1   × 6.0  = 6.00
Rule F: 0 receptions    → statValue == 0, skip

Total: 15.60 + 18.00 + (-2.00) + 2.80 + 6.00 = 40.40 points
```

### Worked example — IDP position-specific tackles

Player: Roquan Smith (LB), Week 5
Stats: 11 solo tackles, 4 assisted tackles

Rules from IDP_DEEP preset:

| Rule | statType | positionScope | pointsPerUnit |
|---|---|---|---|
| T1 | DEF_TACKLES_SOLO | [DT, DE, CB, S] | 2.5 |
| T2 | DEF_TACKLES_SOLO | [LB] | 1.5 |
| T3 | DEF_TACKLES_SOLO | [QB, RB, WR, TE, PK] | 2.0 |
| T4 | DEF_TACKLES_ASSIST | [DT, DE, CB, S] | 1.25 |
| T5 | DEF_TACKLES_ASSIST | [LB] | 0.75 |
| T6 | DEF_TACKLES_ASSIST | [QB, RB, WR, TE, PK] | 1.0 |

Computation:

```
T1: LB not in [DT, DE, CB, S] → skip
T2: LB in [LB] → 11 × 1.5 = 16.50
T3: LB not in [QB, RB, WR, TE, PK] → skip
T4: LB not in [DT, DE, CB, S] → skip
T5: LB in [LB] → 4 × 0.75 = 3.00
T6: LB not in [QB, RB, WR, TE, PK] → skip

Total from tackles alone: 16.50 + 3.00 = 19.50 points
```

### Worked example — field goal tiered scoring

Player: Justin Tucker (PK), Week 5
Makes: one 52-yard FG, one 28-yard FG, 3 XPs

Rules:

| Rule | statType | rangeLow | rangeHigh | flatPoints | pointsPerUnit | perUnit |
|---|---|---|---|---|---|---|
| K1 | FG_MADE | 0 | 99 | 3.0 | null | 1 |
| K2 | FG_MADE_LENGTH | 40 | 49 | 1.0 | null | 1 |
| K3 | FG_MADE_LENGTH | 50 | 59 | 2.0 | null | 1 |
| K4 | FG_MADE_LENGTH | 60 | 99 | 3.0 | null | 1 |
| K5 | XP_MADE | 0 | 99 | null | 1.0 | 1 |
| K6 | FG_MISSED | 0 | 99 | null | -1.0 | 1 |

**Important note on FG_MADE_LENGTH:** This stat type requires special handling. sportsdata.io delivers individual field goal distances, not a single aggregate number. Each made field goal is evaluated independently against the FG_MADE_LENGTH rules. The `statValues` for a kicker with two made field goals would contain:

```json
{
  "FG_MADE": 2,
  "FG_MADE_LENGTH": [52, 28],
  "XP_MADE": 3
}
```

When `statValues[statType]` is an array (as with `FG_MADE_LENGTH`), the engine evaluates each element independently:

```
K1: FG_MADE = 2, range 0–99 → flatPoints 3.0 × 2 = 6.0
K2: FG_MADE_LENGTH[52] → 52 not in 40–49, skip
    FG_MADE_LENGTH[28] → 28 not in 40–49, skip
K3: FG_MADE_LENGTH[52] → 52 in 50–59, flatPoints = 2.0
    FG_MADE_LENGTH[28] → 28 not in 50–59, skip
K4: FG_MADE_LENGTH[52] → 52 not in 60–99, skip
    FG_MADE_LENGTH[28] → 28 not in 60–99, skip
K5: XP_MADE = 3 → floor(3/1) × 1.0 = 3.0
K6: FG_MISSED = 0 → skip

Total: 6.0 + 2.0 + 3.0 = 11.0 points
```

**Design note on FG_MADE vs FG_MADE_LENGTH:** `FG_MADE` is a count (how many field goals were made) and uses flatPoints per occurrence. `FG_MADE_LENGTH` is an array of distances. The flat 3-point base comes from `FG_MADE`; the distance bonus tiers come from `FG_MADE_LENGTH`. This separation avoids needing a single rule to express "3 points base plus bonus by distance."

### 2. Composite stat computation

Two stat types are computed from primitives before rule evaluation runs:

```
DEF_TOTAL_TACKLES = DEF_TACKLES_SOLO + DEF_TACKLES_ASSIST
TOTAL_TDS = RUSHING_TDS + RECEIVING_TDS + PUNT_RETURN_TDS + KICK_RETURN_TDS
```

**Computation order matters.** Composites must be computed and injected into `statValues` before the rule evaluation loop runs. If a league has rules for both `DEF_TACKLES_SOLO` (the primitive) and `DEF_TOTAL_TACKLES` (the composite), the player earns points from both — this is intentional and expected. The no-overlap constraint (§3) applies per statType, not across composites and their primitives.

**Worked example — composite double-counting (intended):**

A league with:
- Rule for DEF_TACKLES_SOLO at 1.5 per tackle (LB)
- Rule for DEF_TOTAL_TACKLES at 0.5 per tackle (all DEF positions)

Player (LB): 10 solo, 3 assists → DEF_TOTAL_TACKLES = 13

```
Solo rule:  10 × 1.5 = 15.0
Total rule: 13 × 0.5 = 6.5
Combined:   21.5 points from tackles
```

This is the commissioner's choice — if they don't want stacking, they use one or the other, not both. The engine doesn't second-guess the configuration.

### 3. Rule validation constraints

These are enforced at rule creation/edit time, not at scoring time. The engine assumes valid rules.

**Constraint 1: No position overlap within a statType where ranges overlap.**

For any given `statType`, a position must not appear in the `positionScope` of more than one rule whose `[rangeLow, rangeHigh]` intervals overlap. This prevents one stat counting twice under two different rules for the same player.

```
// Valid: same statType, different positionScopes, ranges don't matter
Rule A: DEF_TACKLES_SOLO, positionScope=[LB], range 0–99
Rule B: DEF_TACKLES_SOLO, positionScope=[DT,DE], range 0–99
// LB and [DT,DE] don't overlap → OK

// Invalid: same statType, overlapping positionScope AND range
Rule A: RUSHING_YARDS, positionScope=[QB,RB], range 0–999, 0.1 per yard
Rule B: RUSHING_YARDS, positionScope=[RB,WR], range 0–999, 0.15 per yard
// RB appears in both, ranges overlap → REJECTED
```

**Constraint 2: At least one scoring effect.**

Every rule must have a non-null `pointsPerUnit` or a non-null `flatPoints` (or both). A rule with both null has no scoring effect and is rejected.

**Constraint 3: `perUnit >= 1`.**

Division by zero is prevented.

**Constraint 4: `rangeLow <= rangeHigh`.**

### 4. Franchise score computation

After all players in a franchise's lineup are scored for a week:

```
function computeFranchiseScore(franchise, matchup, league):
  // Step 1: Sum starter fantasy points
  starterEntries = matchup.lineupEntries
    .filter(e => e.franchiseId == franchise.id)
    .filter(e => e.slotPosition is a starter slot, not BENCH/IR/TAXI)

  baseScore = sum(starterEntries.map(e => e.fantasyPoints))

  // Step 2: Apply player-level score adjustments
  playerAdjustments = ScoreAdjustment.where(
    leagueId = league.id,
    scope = PLAYER,
    week = matchup.week,
    seasonYear = matchup.seasonYear,
    playerId IN starterEntries.map(e => e.playerId)
  )
  adjustedScore = baseScore + sum(playerAdjustments.map(a => a.pointAdjustment))

  // Step 3: Apply franchise-level score adjustments
  franchiseAdjustments = ScoreAdjustment.where(
    leagueId = league.id,
    scope = FRANCHISE,
    franchiseId = franchise.id,
    week = matchup.week,
    seasonYear = matchup.seasonYear
  )
  finalScore = adjustedScore + sum(franchiseAdjustments.map(a => a.pointAdjustment))

  return finalScore
```

**Bench players are scored but don't contribute to the franchise score.** Their `LineupEntry.fantasyPoints` is computed and stored (needed for the `MOST_BENCH_POINTS` tiebreaker and for the "what if I had started X?" UI), but only starter-slot entries factor into matchup scoring.

### 5. Best Ball auto-optimization

Leagues using the `BEST_BALL` preset have `autoOptimizeLineup = true`. For these leagues, the engine does not use the owner's submitted lineup. Instead, it computes the optimal lineup after all stats are final:

```
function bestBallOptimize(franchise, week, leagueRules, startingLineupConfig):
  // Step 1: Score every rostered player
  allRosterPlayers = franchise.rosterEntries
    .filter(e => e.bucket == ACTIVE)  // exclude IR/Taxi
    .map(player => {
      score = computePlayerScore(player, weekStats, leagueRules)
      return { player, score }
    })

  // Step 2: Fill lineup slots optimally
  // startingLineupConfig defines slots like: 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 PK
  // FLEX can accept RB, WR, TE (per league's flex eligibility)

  // Solve as a constrained optimization:
  // Maximize total starter points, subject to:
  //   - Each slot filled by an eligible position
  //   - Each player used at most once
  //   - All mandatory slots filled (or empty if not enough eligible players)

  optimalLineup = solveLineupOptimization(allRosterPlayers, startingLineupConfig)

  // Step 3: Write LineupEntries with optimal assignments
  for each slot in optimalLineup:
    setLineupEntry(slot.player, slot.slotPosition, slot.score)
```

**Optimization algorithm note:** The lineup optimization is a variant of the assignment problem. For most league configurations (10–25 starter slots, 15–53 roster players), a greedy algorithm works: sort all players by score descending, assign each to their highest-priority eligible slot, skip if all eligible slots are full. This produces optimal results when flex slots accept strict supersets of dedicated slots (which is always true in NFL fantasy). If a future league format violates this assumption, a full integer programming solver would be needed — but this is not expected in v1.

**Best Ball timing:** Optimization runs after the final stats for the week are posted (typically Tuesday morning for a Sunday/Monday slate). During live games, the UI can show projected optimal lineups but these are not final.

### 6. Stat correction recomputation

When sportsdata.io issues a stat correction (typically Wednesday after Sunday games):

```
function handleStatCorrection(playerId, seasonYear, week, newStatValues):
  // Step 1: Update the Stats record
  stats = Stats.find(playerId, seasonYear, week)
  stats.statValues = newStatValues
  stats.sourceVersion += 1
  stats.lastCorrectionAt = now()

  // Step 2: Find every league that had this player in a lineup this week
  affectedEntries = LineupEntry.where(
    playerId = playerId,
    matchup.seasonYear = seasonYear,
    matchup.week = week
  )

  for each entry in affectedEntries:
    league = entry.matchup.league
    player = entry.player

    // Step 3: Recompute player score with corrected stats
    oldPoints = entry.fantasyPoints
    { newPoints, breakdown } = computePlayerScore(player, stats, league.scoringRules)
    entry.fantasyPoints = newPoints
    entry.pointBreakdown = breakdown

    // Step 4: Recompute franchise/matchup scores
    recomputeMatchupScore(entry.matchup)

    // Step 5: Check if matchup outcome changed
    if matchupOutcomeChanged(entry.matchup):
      // Recompute standings
      recomputeStandings(league, seasonYear)
      // Notify affected owners
      fireEvent(STATS_CORRECTION, {
        leagueId: league.id,
        matchupId: entry.matchup.id,
        playerId: playerId,
        oldPoints: oldPoints,
        newPoints: newPoints,
        outcomeChanged: true
      })
    else:
      fireEvent(STATS_CORRECTION, {
        leagueId: league.id,
        matchupId: entry.matchup.id,
        playerId: playerId,
        oldPoints: oldPoints,
        newPoints: newPoints,
        outcomeChanged: false
      })
```

**Correction window:** Stat corrections are processed for any week in the current season. Once a season enters `ARCHIVED` status, stat corrections are no longer applied (scores are frozen at that point). If a correction arrives for an archived season, it is logged but not applied.

**Best Ball re-optimization on correction:** If a corrected stat changes player scores in a Best Ball league, the lineup is re-optimized. The optimal lineup may change — a bench player who was previously lower-scoring may now be higher than a starter after the correction.

---

## Inputs & outputs

### Triggers

| Trigger | Source | What fires |
|---|---|---|
| Live stat update | sportsdata.io polling (every 15 seconds during games) | `computePlayerScore` for all players with updated stats, then `computeFranchiseScore` for affected matchups. |
| Stat correction | sportsdata.io (typically Wednesday) | `handleStatCorrection` — full recomputation pipeline for the corrected player across all leagues. |
| Lineup change | Owner submits lineup | Recompute franchise score for the affected matchup (player scores don't change, but which players are starters does). |
| Score adjustment | Commissioner creates a ScoreAdjustment record | Recompute franchise score for the affected matchup. Player-level adjustments also update the player's effective fantasy points for that matchup. |
| Rule change | Commissioner edits scoring rules mid-season | Recompute all matchup scores for the current season (or from a specified week forward, at commissioner discretion). **This is expensive and should trigger a confirmation dialog.** |
| Best Ball finalization | All games for the week are marked final | Run `bestBallOptimize` for all Best Ball leagues. |

### Outputs

| Output | Destination | Description |
|---|---|---|
| `LineupEntry.fantasyPoints` | Database | Cached player score per league per week. |
| `LineupEntry.pointBreakdown` | Database | JSON audit trail of how points were computed. |
| `Matchup.homeScore` / `Matchup.awayScore` | Database | Franchise scores for the matchup. |
| `Matchup.outcome` | Database | WIN / LOSS / TIE for each franchise. |
| `STATS_CORRECTION` event | Event bus | Consumed by notification system, standings recomputation, narrative engine (v2). |
| `SCORING_PLAY` event | Event bus (live) | Consumed by the live scoring pipeline (WebSocket push) and Gameday UI. |

---

## Scoring presets — full rule definitions

Each preset is a named collection of ScoringRule records that are copied into a league's rules when the commissioner selects the preset. After copying, rules belong to the league and can be customized.

### STANDARD preset

Non-PPR, no IDP. The baseline.

**Passing:**

| statType | positionScope | pointsPerUnit | perUnit | flatPoints | rangeLow | rangeHigh |
|---|---|---|---|---|---|---|
| PASSING_YARDS | [QB,RB,WR,TE] | 0.05 | 1 | null | -50 | 999 |
| PASSING_TDS | [QB,RB,WR,TE] | 6.0 | 1 | null | 0 | 99 |
| PASSING_INTS | [QB,RB,WR,TE] | -2.0 | 1 | null | 0 | 99 |
| PASSING_2PT | [QB,RB,WR,TE] | 2.0 | 1 | null | 0 | 99 |

**Rushing:**

| statType | positionScope | pointsPerUnit | perUnit | flatPoints | rangeLow | rangeHigh |
|---|---|---|---|---|---|---|
| RUSHING_YARDS | all offensive | 0.1 | 1 | null | -50 | 999 |
| RUSHING_TDS | all offensive | 6.0 | 1 | null | 0 | 99 |
| RUSHING_2PT | all offensive | 2.0 | 1 | null | 0 | 99 |
| RUSHING_FUMBLES | all offensive | -2.0 | 1 | null | 0 | 99 |

**Receiving:**

| statType | positionScope | pointsPerUnit | perUnit | flatPoints | rangeLow | rangeHigh |
|---|---|---|---|---|---|---|
| RECEIVING_YARDS | all offensive | 0.1 | 1 | null | -50 | 999 |
| RECEIVING_TDS | all offensive | 6.0 | 1 | null | 0 | 99 |
| RECEIVING_2PT | all offensive | 2.0 | 1 | null | 0 | 99 |

**Kicking:**

| statType | positionScope | pointsPerUnit | perUnit | flatPoints | rangeLow | rangeHigh |
|---|---|---|---|---|---|---|
| FG_MADE | [PK] | null | 1 | 3.0 | 0 | 99 |
| FG_MADE_LENGTH | [PK] | null | 1 | 1.0 | 40 | 49 |
| FG_MADE_LENGTH | [PK] | null | 1 | 2.0 | 50 | 59 |
| FG_MADE_LENGTH | [PK] | null | 1 | 3.0 | 60 | 99 |
| FG_MISSED | [PK] | -1.0 | 1 | null | 0 | 99 |
| XP_MADE | [PK] | 1.0 | 1 | null | 0 | 99 |
| XP_MISSED | [PK] | -1.0 | 1 | null | 0 | 99 |

**Turnovers:**

| statType | positionScope | pointsPerUnit | perUnit | flatPoints | rangeLow | rangeHigh |
|---|---|---|---|---|---|---|
| FUMBLES_LOST | all offensive | -2.0 | 1 | null | 0 | 99 |

*Note: `all offensive` = `[QB, RB, WR, TE, PK]` throughout this section.*

### PPR preset

All STANDARD rules, plus:

| statType | positionScope | pointsPerUnit | perUnit | flatPoints | rangeLow | rangeHigh |
|---|---|---|---|---|---|---|
| RECEPTIONS | all offensive | 1.0 | 1 | null | 0 | 99 |

### HALF_PPR preset

All STANDARD rules, plus:

| statType | positionScope | pointsPerUnit | perUnit | flatPoints | rangeLow | rangeHigh |
|---|---|---|---|---|---|---|
| RECEPTIONS | all offensive | 0.5 | 1 | null | 0 | 99 |

### SUPERFLEX preset

Identical to PPR. The "Superflex" distinction is a **lineup configuration** (a flex slot that accepts QB), not a scoring difference. The preset copies PPR rules and also sets the starting lineup to include a SUPERFLEX slot. The scoring engine itself has no concept of Superflex — it scores all players the same regardless of which slot they occupy.

### IDP_STANDARD preset

All PPR rules, plus:

| statType | positionScope | pointsPerUnit | perUnit | flatPoints | rangeLow | rangeHigh |
|---|---|---|---|---|---|---|
| DEF_TACKLES_SOLO | [DT,DE,LB,CB,S] | 1.5 | 1 | null | 0 | 99 |
| DEF_TACKLES_ASSIST | [DT,DE,LB,CB,S] | 0.75 | 1 | null | 0 | 99 |
| DEF_SACKS | [DT,DE,LB,CB,S] | 4.0 | 1 | null | 0 | 99 |
| DEF_INTERCEPTIONS | [DT,DE,LB,CB,S] | 6.0 | 1 | null | 0 | 99 |
| DEF_FORCED_FUMBLES | [DT,DE,LB,CB,S] | 4.0 | 1 | null | 0 | 99 |
| DEF_FUMBLE_RECOVERIES | [DT,DE,LB,CB,S] | 2.0 | 1 | null | 0 | 99 |
| DEF_INT_RETURN_TDS | [DT,DE,LB,CB,S] | 6.0 | 1 | null | 0 | 99 |
| DEF_FUMBLE_RECOVERY_TDS | [DT,DE,LB,CB,S] | 6.0 | 1 | null | 0 | 99 |
| DEF_SAFETIES | [DT,DE,LB,CB,S] | 4.0 | 1 | null | 0 | 99 |

### IDP_DEEP preset

All PPR rules, plus the full IDP suite with position-specific tackle weights (matching Charlie's FLAG league scoring):

**Tackles (position-weighted):**

| statType | positionScope | pointsPerUnit | perUnit | flatPoints | rangeLow | rangeHigh |
|---|---|---|---|---|---|---|
| DEF_TACKLES_SOLO | [DT,DE,CB,S] | 2.5 | 1 | null | 0 | 99 |
| DEF_TACKLES_SOLO | [LB] | 1.5 | 1 | null | 0 | 99 |
| DEF_TACKLES_SOLO | [QB,RB,WR,TE,PK] | 2.0 | 1 | null | 0 | 99 |
| DEF_TACKLES_ASSIST | [DT,DE,CB,S] | 1.25 | 1 | null | 0 | 99 |
| DEF_TACKLES_ASSIST | [LB] | 0.75 | 1 | null | 0 | 99 |
| DEF_TACKLES_ASSIST | [QB,RB,WR,TE,PK] | 1.0 | 1 | null | 0 | 99 |

**Big plays:**

| statType | positionScope | pointsPerUnit | perUnit | flatPoints | rangeLow | rangeHigh |
|---|---|---|---|---|---|---|
| DEF_SACKS | [DT,DE,LB,CB,S] | 4.0 | 1 | null | 0 | 99 |
| DEF_SACK_YARDS | [DT,DE,LB,CB,S] | 0.1 | 1 | null | 0 | 999 |
| DEF_QB_HITS | [DT,DE,LB,CB,S] | 1.0 | 1 | null | 0 | 99 |
| DEF_TACKLES_FOR_LOSS | [DT,DE,LB,CB,S] | 2.0 | 1 | null | 0 | 99 |
| DEF_PASSES_DEFENDED | [DT,DE,LB,CB,S] | 2.0 | 1 | null | 0 | 99 |

**Turnovers & touchdowns:**

| statType | positionScope | pointsPerUnit | perUnit | flatPoints | rangeLow | rangeHigh |
|---|---|---|---|---|---|---|
| DEF_INTERCEPTIONS | [DT,DE,LB,CB,S] | 6.0 | 1 | null | 0 | 99 |
| DEF_INT_RETURN_YARDS | [DT,DE,LB,CB,S] | 0.1 | 1 | null | -50 | 999 |
| DEF_INT_RETURN_TDS | [DT,DE,LB,CB,S] | 6.0 | 1 | null | 0 | 99 |
| DEF_FORCED_FUMBLES | [DT,DE,LB,CB,S] | 4.0 | 1 | null | 0 | 99 |
| DEF_FUMBLE_RECOVERIES | [DT,DE,LB,CB,S] | 2.0 | 1 | null | 0 | 99 |
| DEF_FUMBLE_RECOVERY_TDS | [DT,DE,LB,CB,S] | 6.0 | 1 | null | 0 | 99 |
| DEF_FUMBLE_RECOVERY_YARDS | [DT,DE,LB,CB,S] | 0.1 | 1 | null | -50 | 999 |
| DEF_OFFENSIVE_FUMBLE_RECOVERY_TDS | all | 6.0 | 1 | null | 0 | 99 |

**Special teams & miscellaneous:**

| statType | positionScope | pointsPerUnit | perUnit | flatPoints | rangeLow | rangeHigh |
|---|---|---|---|---|---|---|
| DEF_BLOCKED_KICK_TDS | [DT,DE,LB,CB,S] | 6.0 | 1 | null | 0 | 99 |
| DEF_BLOCKED_PUNT_TDS | [DT,DE,LB,CB,S] | 6.0 | 1 | null | 0 | 99 |
| DEF_MISSED_FG_RETURN_TDS | [DT,DE,LB,CB,S] | 6.0 | 1 | null | 0 | 99 |
| DEF_BLOCKED_PUNTS | [DT,DE,LB,CB,S] | 4.0 | 1 | null | 0 | 99 |
| DEF_BLOCKED_XP | [DT,DE,LB,CB,S] | 4.0 | 1 | null | 0 | 99 |
| DEF_SAFETIES | [DT,DE,LB,CB,S] | 4.0 | 1 | null | 0 | 99 |
| DEF_PENALTIES | [DT,DE,LB,CB,S] | -1.0 | 1 | null | 0 | 99 |
| PUNT_RETURN_TDS | all | 6.0 | 1 | null | 0 | 99 |
| PUNT_RETURN_YARDS | all | 0.05 | 1 | null | -50 | 999 |
| KICK_RETURN_TDS | all | 6.0 | 1 | null | 0 | 99 |
| KICK_RETURN_YARDS | all | 0.05 | 1 | null | -50 | 999 |

### BEST_BALL preset

Identical scoring rules to PPR. The distinction is behavioral:
- `autoOptimizeLineup = true`
- No roster changes (adds, drops, waivers, trades) after the draft
- Lineup is auto-optimized after each week's stats are final

---

## Edge cases

### E1. Player with zero stats for all scored categories

**Scenario:** A player is in the starting lineup but has zero for every stat type that has a rule (e.g., a WR on a bye who was mistakenly left in the lineup, or a player who was active but received no targets or touches).

**Behavior:** Score = 0.0 points. No breakdown entries are generated (every rule's `statValue == 0` check causes a skip). The player's LineupEntry still exists with `fantasyPoints = 0.0` and an empty `pointBreakdown` array.

### E2. Negative yards

**Scenario:** A player has -3 rushing yards for the week.

**Behavior:** If the league's RUSHING_YARDS rule has `rangeLow = -50` (which all presets do), the negative value is within range: `floor(-3 / 1) = -3 × 0.1 = -0.3 points`. The player loses 0.3 points from rushing yards. This is correct and expected — negative yardage should cost points.

**If `rangeLow = 0`:** The -3 would fall outside the range and the rule would not fire. The player would score 0 from rushing yards, not negative. This is why presets use `rangeLow = -50` — it ensures negative yardage is penalized.

### E3. Player position changes mid-season affecting scoring

**Scenario:** sportsdata.io reclassifies a player from DE to DT mid-season. In the IDP_DEEP preset, solo tackles score 2.5 for both DT and DE (they share the same positionScope), so this particular reclassification has no scoring impact.

**Scenario where it matters:** A player is reclassified from LB (1.5 per tackle) to DE (2.5 per tackle). The position change takes effect on the next stat sync. **Historical scores are NOT retroactively recomputed for position changes** — only stat corrections trigger recomputation. The player's past weeks retain their LB-based scoring. Going forward, they score as a DE.

**Rationale:** Position changes reflect real roster decisions by NFL teams. Retroactively recomputing would change outcomes of settled matchups, which is more disruptive than the scoring discrepancy.

### E4. Commissioner changes scoring rules mid-season

**Scenario:** A commissioner adds a new rule or modifies an existing rule after Week 3.

**Behavior:** The system presents two options:
1. **Apply forward only** (default) — new rules apply from the next unfinalized week forward. Past matchups retain their original scoring.
2. **Recompute from week N** — recompute all matchups from a specified week through the current week using the updated rules. This may change past outcomes and standings.

Both options require commissioner confirmation. Option 2 fires `SCORING_RULES_CHANGED` events and notifications to all owners.

### E5. ScoreAdjustment for a player not in the starting lineup

**Scenario:** Commissioner creates a player-level ScoreAdjustment for a player who was on the bench that week.

**Behavior:** The adjustment is recorded but does NOT affect the franchise's matchup score (since only starters contribute). The player's `LineupEntry.fantasyPoints` is updated to include the adjustment, but since the player is in a bench slot, it doesn't propagate to `Matchup.homeScore` or `Matchup.awayScore`. This is correct — if the commissioner intended to adjust the franchise's score, they should use a franchise-level adjustment instead.

### E6. `perUnit` greater than 1

**Scenario:** A league awards 0.1 points per 2 passing first downs (`pointsPerUnit = 0.1, perUnit = 2`).

**Behavior:** Player with 7 passing first downs: `floor(7 / 2) = 3 units × 0.1 = 0.3 points`. The remainder (1 first down) earns nothing — `floor()` truncates.

### E7. Both `flatPoints` and `pointsPerUnit` on the same rule

**Scenario:** A rule awards 3 flat points for any FG made AND 0.1 per yard of distance.

**Behavior:** Both fire: `flatPoints(3.0) + floor(distance/1) × 0.1`. A 45-yard FG = 3.0 + 4.5 = 7.5 points.

### E8. Stat correction that changes a matchup outcome after playoff seeding is set

**Scenario:** A correction arrives for a regular season game after playoff brackets are generated.

**Behavior:** The matchup score and outcome are updated. If standings change, the system flags the discrepancy to the commissioner with options:
1. **Accept revised standings** — playoff brackets are regenerated with new seedings.
2. **Lock original seedings** — standings update but playoff brackets are preserved as-is. This is the default recommendation because bracket regeneration mid-playoffs is extremely disruptive.

The system does NOT auto-regenerate playoff brackets. Commissioner must explicitly choose.

### E9. Array stat types for non-kicker positions

**Scenario:** Could a non-kicker position ever have an array-type stat?

**Behavior:** In v1, `FG_MADE_LENGTH` is the only array stat type. The engine handles arrays generically (evaluating each element independently), so if sportsdata.io or a future data source delivers array stats for other stat types, the engine supports it without code changes. But no such case is expected in v1.

### E10. Empty lineup (no starters)

**Scenario:** An owner submits no starters (or a Best Ball franchise has no active roster players).

**Behavior:** Franchise score = 0.0. If `allowPartialLineups = false`, the lineup submission is rejected at the roster validation layer (upstream of the scoring engine). If `allowPartialLineups = true`, empty slots score 0 and the matchup proceeds.

---

## Open questions

### OQ1. FG_MADE_LENGTH representation in sportsdata.io

The spec assumes `FG_MADE_LENGTH` arrives as an array of distances. Need to verify the exact format from the sportsdata.io API — it may arrive as individual play-by-play events that need aggregation. If so, the ingestion layer (not the scoring engine) is responsible for assembling the array. The engine's contract remains: "give me an array, I'll evaluate each element."

### OQ2. Custom scoring rule authoring depth (PRD §26.2)

How deep can commissioners go in editing rules? Three options:
1. **Full rule editor** — commissioners can create any ScoringRule from scratch (add new statTypes, arbitrary ranges, any position scopes). Most powerful, most complex UI.
2. **Preset + toggle** — commissioners pick a preset and can only turn rules on/off or adjust `pointsPerUnit` values. Cannot add new rules or change position scopes.
3. **Middle ground** — commissioners can edit existing rules (change values, adjust ranges) and add rules from a menu of available statTypes, but cannot create arbitrary combinations.

**Recommendation:** Option 3 for v1. Full flexibility exists in the data model; the UI is the constraint. The scoring engine itself supports any valid rule regardless of how it was authored.

### OQ3. Negative `pointsPerUnit` validation

Should the system prevent negative `pointsPerUnit` values for stats where negative points don't make intuitive sense (e.g., -2.0 per passing TD)? Or is all configuration the commissioner's responsibility?

**Recommendation:** Allow negative values. Some leagues intentionally penalize stats that others reward (e.g., negative points for incomplete passes). The engine is agnostic.

### OQ4. `DEF_PENALTY_YARDS` sign convention

Penalty yards are inherently negative for the player committing them. Should the stat value in `statValues` be stored as a positive number (representing "yards of penalty committed") with a negative `pointsPerUnit` rule, or as a negative number with a positive rule?

**Recommendation:** Store as positive (the raw count of penalty yards), apply a negative `pointsPerUnit`. This is consistent with how `PASSING_INTS` and `FUMBLES_LOST` work — the stat counts occurrences, the rule determines the point impact.

---

## Related buildable units

Per [Structure_Map.md](../../documents/Structure_Map.md), the `scoring/` folder anticipates these Level 3 units:

| Unit | Type | Purpose |
|---|---|---|
| `Logic_RuleEvaluation.md` | Logic | The core `computePlayerScore` function — rule iteration, position gating, range checking, point computation, breakdown generation. |
| `Logic_StatCorrections.md` | Logic | The `handleStatCorrection` pipeline — finding affected entries, recomputing, detecting outcome changes, firing events. |
| `Logic_ScoreAdjustments.md` | Logic | Commissioner adjustment application — scope routing, franchise vs. player, interaction with matchup scores. |
| `Component_ScoringBreakdown.md` | Component | The "explain this score" UI component that renders `pointBreakdown` data into a readable per-stat table. |

These will be written when the scoring feature moves to build phase.

---

**END OF SPECIFICATION**
