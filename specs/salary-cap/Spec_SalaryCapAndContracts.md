# Salary Cap & Contracts

**Status:** Draft
**Parent:** [Spec_XOPlay_PRD.md §7](../Spec_XOPlay_PRD.md#7-salary-cap--contracts)
**Related specs:** [Spec_DataModel.md §4.13–4.16](../Spec_DataModel.md), [Spec_Tiers.md §3.3](../Spec_Tiers.md), [Spec_ScoringEngine.md](../scoring/Spec_ScoringEngine.md)
**Last updated:** May 2026

---

## Purpose

The salary cap and contracts system manages the economic layer of fantasy football leagues. It tracks player contracts (salary, years, status), enforces salary cap limits, computes drop penalties, handles franchise tag valuations, manages rookie salary scales, and orchestrates the offseason rollover sequence that advances all contracts between seasons. This is the system that replaces the spreadsheets, manual calculations, and error-prone commissioner workflows that plague platforms like MyFantasyLeague.

**Design principle: Commissioners should never perform multiplication in a spreadsheet to enforce bylaws.** Every cap calculation, penalty formula, escalator application, and tag valuation is automated, auditable, and reversible. The commissioner's role shifts from data entry to oversight and confirmation.

**Tier relevance.** The salary cap system is fully active in Dynasty (locked on), optionally active in Keeper (commissioner's choice), and inactive in Redraft. The system itself doesn't branch on tier — it checks `trackSalaries` and `trackContracts` flags. When those flags are off, this entire system is dormant. See [Spec_Tiers.md §3.3](../Spec_Tiers.md) for the full tier matrix.

## PRD anchor

This spec expands on PRD §7 (Salary Cap & Contracts), with additional context from:

- §7.2 — Contract entity and field definitions
- §7.3 — League-level salary cap configuration
- §7.4 — Per-franchise cap overrides
- §7.5 — Cap usage computation (with the Seahawks worked example)
- §7.6 — Rookie salary scale (with FLAG league example)
- §7.7 — Annual salary escalator
- §7.8 — Drop penalty formula and worked examples
- §7.9 — Taxi squad contracts
- §7.10 — Franchise tag (valuation, renewal escalators, trade rules)
- §7.11 — Salary adjustments
- §7.12 — Salary import/export
- §7.13 — Default salary assignment
- §7.14 — Offseason rollover sequence
- §7.15 — Pre/post rollover roster rules
- §22.9 — Cap violation at lineup time
- §22.10 — Contract rollover for retired/cut player
- §22.12 — Rookie contract assignment deadline
- §22.13 — Franchise tag on uncommon player
- §22.14 — Trade of franchise-tagged player

What this spec adds: the complete computation pipeline for every formula, interaction rules between subsystems (e.g., how a drop triggers both a roster change and a cap adjustment simultaneously), the full rollover algorithm with ordering constraints, and edge cases the PRD flags but doesn't fully resolve.

---

## Entities & data shapes

Full field definitions live in [Spec_DataModel.md](../Spec_DataModel.md). This section documents how the cap system uses each entity.

### Contract (§4.13)

The central entity. Links a Player to a Franchise with economic terms.

Key fields for cap math:
- `baseSalary` — the per-season cost, subject to escalators
- `contractYearsRemaining` — decrements at rollover; 0 triggers expiration
- `currentRosterBucket` — denormalized from RosterEntry for fast cap math (ACTIVE / INJURED_RESERVE / TAXI_SQUAD)
- `status` — ACTIVE / FRANCHISE_TAGGED / EXTENDED / EXPIRED
- `salaryEscalatorPercent` — per-contract override of the league default (default 10%)
- `franchiseTagRenewalYear` — structured tracking of tag renewal (1–5), replacing MFL's freeform text

### SalaryAdjustment (§4.14)

Cap modifications not tied to a specific contract. Used for drop penalties, rule violations, bonuses, and handicaps.

Key fields:
- `amount` — signed decimal; positive charges against cap, negative grants credit
- `category` — DROP_PENALTY / RULE_VIOLATION / BONUS / HANDICAP / OTHER
- `effectiveDate` / `expirationDate` — defines when the adjustment counts against cap
- `sourceTransactionId` — optional link back to the triggering event (e.g., the drop that generated a penalty)

### FranchiseSalaryCapOverride (§4.15)

Per-franchise, per-season cap override. Replaces the league default cap for a specific franchise.

### RookieSalaryScale (§4.16)

Per-league salary schedule for rookie draft picks. One row per pick position; applied automatically at draft time.

---

## Rules & logic

### 1. Cap usage computation

The fundamental calculation. At any moment, a franchise's cap usage is:

```
function computeCapUsage(franchise, league):
  // Step 1: Sum weighted contract salaries
  contractCost = 0
  for each contract on franchise.roster where status IN (ACTIVE, FRANCHISE_TAGGED, EXTENDED):
    weight = bucketMultiplier(contract.currentRosterBucket, league)
    contractCost += contract.baseSalary * weight

  // Step 2: Sum active salary adjustments
  adjustmentCost = sum(
    adj.amount
    for adj in SalaryAdjustment.where(
      franchiseId = franchise.id,
      effectiveDate <= today,
      (expirationDate is null OR expirationDate > today)
    )
  )

  capUsage = contractCost + adjustmentCost
  return capUsage

function bucketMultiplier(bucket, league):
  switch bucket:
    ACTIVE:          return 1.0
    INJURED_RESERVE: return league.irSalaryPercent / 100  // default 0.20
    TAXI_SQUAD:      return league.taxiSalaryPercent / 100 // default 0.10
```

```
function computeCapRoom(franchise, league):
  effectiveCap = FranchiseSalaryCapOverride.find(franchise.id, league.seasonYear)
                   ?.overrideCapAmount
                 ?? league.salaryCapAmount

  capUsage = computeCapUsage(franchise, league)
  return effectiveCap - capUsage
```

### Worked example — FLAG Seahawks roster

From PRD §7.5, verified against actual league data:

```
ACTIVE contracts:
  Chase, Ja'Marr:           $25.08 × 1.00 = $25.08
  Ridley, Calvin:           $17.71 × 1.00 = $17.71
  Stevenson, Rhamondre:      $2.41 × 1.00 =  $2.41
  Gray, Eric:                $1.46 × 1.00 =  $1.46
  Hutchinson, Xavier:        $1.33 × 1.00 =  $1.33
  Bell, Ronnie:              $0.80 × 1.00 =  $0.80
  Sweat, T'Vondre:           $1.21 × 1.00 =  $1.21
  Bertrand, JD:              $1.33 × 1.00 =  $1.33
  Deablo, Divine:            $1.77 × 1.00 =  $1.77
  McKinstry, Kool-Aid:       $0.97 × 1.00 =  $0.97
                                  subtotal: $54.07

TAXI contracts (10% weight):
  Rourke, Kurtis:            $1.43 × 0.10 =  $0.14
  Williams, Caleb:           $4.24 × 0.10 =  $0.42
  Carter, Abdul:             $2.75 × 0.10 =  $0.28
  Hairston, Maxwell:         $1.10 × 0.10 =  $0.11
  Moore, Malachi:            $0.88 × 0.10 =  $0.09
                                  subtotal:  $1.04

No active salary adjustments.

Cap usage:    $54.07 + $1.04 = $55.11
Effective cap: $222.75
Cap room:     $222.75 - $55.11 = $167.64
```

### 2. Drop penalty computation

When an owner drops a player, a cap penalty reflects the remaining contract obligation.

```
function computeDropPenalty(contract, league):
  basePenalty = contract.baseSalary * (league.dropPenaltyBasePercent / 100)
  additionalYears = max(0, contract.contractYearsRemaining - 1)
  additionalPenalty = contract.baseSalary * (league.dropPenaltyPerAdditionalYearPercent / 100) * additionalYears
  return round(basePenalty + additionalPenalty, 2)
```

**Configuration:**

| Field | Default | Notes |
|---|---|---|
| `dropPenaltyBasePercent` | 75.0 | Charged on any drop regardless of years remaining |
| `dropPenaltyPerAdditionalYearPercent` | 33.0 | Per year beyond year 1 |
| `dropPenaltyMode` | `CURRENT_SEASON_ONLY` | `CURRENT_SEASON_ONLY` or `AMORTIZED` |

### Worked examples — FLAG bylaws table

| baseSalary | Years Remaining | Calculation | Penalty |
|---|---|---|---|
| $1.00 | 1 | $1.00 × 0.75 + $1.00 × 0.33 × 0 | $0.75 |
| $1.00 | 2 | $1.00 × 0.75 + $1.00 × 0.33 × 1 | $1.08 |
| $1.00 | 3 | $1.00 × 0.75 + $1.00 × 0.33 × 2 | $1.41 |
| $1.00 | 4 | $1.00 × 0.75 + $1.00 × 0.33 × 3 | $1.74 |
| $1.00 | 5 | $1.00 × 0.75 + $1.00 × 0.33 × 4 | $2.07 |
| $10.00 | 2 | $10.00 × 0.75 + $10.00 × 0.33 × 1 | $10.83 |
| $10.00 | 5 | $10.00 × 0.75 + $10.00 × 0.33 × 4 | $20.70 |

**Drop penalty application flow:**

```
function applyDropPenalty(contract, league, droppingUserId):
  penalty = computeDropPenalty(contract, league)

  // Create a SalaryAdjustment
  SalaryAdjustment.create({
    leagueId: league.id,
    franchiseId: contract.franchiseId,
    amount: penalty,            // positive = charge against cap
    reason: "Drop penalty: {player.fullName} (${contract.baseSalary}, {contract.contractYearsRemaining}yr)",
    category: DROP_PENALTY,
    effectiveDate: today,
    expirationDate: dropPenaltyMode == CURRENT_SEASON_ONLY
                      ? league.seasonEndDate
                      : null,   // AMORTIZED: no expiration, split logic TBD
    sourceTransactionId: transaction.id,
    createdByUserId: null  // system-generated
  })
```

**AMORTIZED mode:** When `dropPenaltyMode = AMORTIZED`, the penalty is split across the remaining contract years. A $20.70 penalty on a 5-year contract would create 5 SalaryAdjustment records at $4.14 each, with staggered expiration dates aligned to each season boundary. This is uncommon but supported.

### 3. Salary escalator computation

Applied at offseason rollover to contracts with `contractYearsRemaining > 1` (after decrement — see §6 for ordering).

```
function applyEscalator(contract, league):
  // Use per-contract override if set, otherwise league default
  escalatorPercent = contract.salaryEscalatorPercent
                     ?? league.playerSalaryEscalatorPercent  // default 10.0

  newSalary = contract.baseSalary * (1 + escalatorPercent / 100)
  contract.baseSalary = round(newSalary, 2)  // round to nearest penny
```

### Worked examples

```
Contract: Chase, Ja'Marr, baseSalary=$25.08, yearsRemaining=2 (after decrement → 1)
  Since yearsRemaining is now 1 (final year), escalator does NOT apply.
  baseSalary remains $25.08.

Contract: Jefferson, Justin, baseSalary=$18.50, yearsRemaining=4 (after decrement → 3)
  yearsRemaining > 1, so escalator applies.
  newSalary = $18.50 × 1.10 = $20.35
  baseSalary becomes $20.35.

Contract: Smith, DeVonta, baseSalary=$12.00, custom escalator 5%, yearsRemaining=3 (after decrement → 2)
  yearsRemaining > 1, custom escalator applies.
  newSalary = $12.00 × 1.05 = $12.60
  baseSalary becomes $12.60.
```

**Why final-year contracts don't escalate:** The player is about to become a free agent. Escalating a salary that will never be paid under this contract wastes cap room and confuses owners. This matches Charlie's FLAG bylaws.

### 4. Franchise tag valuation

The franchise tag extends an expiring contract for one year at a computed salary.

**Step 1: Compute tag value**

```
function computeTagValue(player, league):
  switch league.franchiseTagValuationMethod:

    case TOP_N_AT_POSITION_AVG:
      salaries = getAllContractSalaries(league, player.position)
        .sort(descending)
        .take(league.franchiseTagTopN)  // default 10
      tagValue = average(salaries)
      return round(tagValue, 2)

    case TOP_N_AT_POSITION_MEDIAN:
      salaries = getAllContractSalaries(league, player.position)
        .sort(descending)
        .take(league.franchiseTagTopN)
      tagValue = median(salaries)
      return round(tagValue, 2)

    case TOP_N_AT_POSITION_MAX:
      salaries = getAllContractSalaries(league, player.position)
        .sort(descending)
        .take(league.franchiseTagTopN)
      tagValue = max(salaries)
      return round(tagValue, 2)

    case FIXED_MULTIPLIER_ON_CURRENT:
      tagValue = contract.baseSalary * league.franchiseTagMultiplier
      return round(tagValue, 2)
```

**Step 2: Apply renewal escalator (if same player tagged in consecutive years)**

```
function applyRenewalEscalator(tagValue, contract, league):
  renewalYear = (contract.franchiseTagRenewalYear ?? 0) + 1

  switch renewalYear:
    case 1: return tagValue                                    // first tag, no escalator
    case 2: return tagValue * (1 + league.franchiseTagRenewalYear2Percent / 100)  // default +25%
    case 3: return tagValue * (1 + league.franchiseTagRenewalYear3Percent / 100)  // default +30%
    case 4: return tagValue * (1 + league.franchiseTagRenewalYear4Percent / 100)  // default +35%
    case 5: return tagValue * (1 + league.franchiseTagRenewalYear5Percent / 100)  // default +40%
    default: REJECTED — "Maximum franchise tag renewals (5) exceeded."
```

### Worked example — FLAG WR franchise tag

```
League: 32 franchises. Collecting all WR salaries from active contracts:
Top 10 WR salaries: [$25.08, $22.00, $18.50, $17.71, $15.00, $14.20, $12.80, $11.90, $11.00, $10.50]

Tag value = average = $158.69 / 10 = $15.87

Player X (WR), first-time tag (renewalYear = 1):
  Tag salary = $15.87

Player X, re-tagged next year (renewalYear = 2, new base tag = $16.20):
  Tag salary = $16.20 × 1.25 = $20.25

Player X, tagged a third consecutive year (renewalYear = 3, new base tag = $17.00):
  Tag salary = $17.00 × 1.30 = $22.10
```

**Step 3: Apply the tag**

```
function applyFranchiseTag(franchise, player, league):
  contract = player.activeContract(league)

  // Validate
  if franchise.tagsUsedThisSeason >= league.franchiseTagsPerFranchisePerSeason:
    REJECT "Franchise tag limit reached."
  if contract.status == FRANCHISE_TAGGED and league.franchiseTagIsUseItOrLoseIt:
    REJECT "Player is already tagged this season."

  tagValue = computeTagValue(player, league)
  finalValue = applyRenewalEscalator(tagValue, contract, league)

  // Warn if tag value exceeds current salary (unusual but legal)
  if finalValue > contract.baseSalary:
    requireConfirmation("Tag value (${finalValue}) exceeds current salary (${contract.baseSalary}).")

  // Apply
  contract.baseSalary = finalValue
  contract.contractYearsRemaining = 1
  contract.contractYearsTotal = 1
  contract.status = FRANCHISE_TAGGED
  contract.franchiseTagRenewalYear = (contract.franchiseTagRenewalYear ?? 0) + 1

  franchise.tagsUsedThisSeason += 1

  // Log
  createTransaction(COMMISSIONER_ACTION, "Franchise tag applied: {player.fullName} at ${finalValue}")
```

**Tag trade rules:**
- Tagged players can be traded. The tag contract transfers with the player.
- The acquiring franchise cannot re-tag the same player in the same season (anti-exploit).
- After the 1-year tag expires, the player is a normal free agent for the acquiring franchise.

### 5. Rookie salary scale assignment

When a rookie is drafted, the system automatically creates a contract using the league's salary scale.

```
function assignRookieSalary(player, franchise, league, draftRound, pickInRound):
  // Look up specific pick first, then fall back to round-level default
  scaleEntry = RookieSalaryScale.find(league.id, draftRound, pickInRound)
               ?? RookieSalaryScale.find(league.id, draftRound, null)  // null = round catch-all

  if scaleEntry is null:
    // No scale configured for this round — use league minimum
    salary = league.minimumPlayerSalary
    years = 1
  else:
    salary = scaleEntry.baseSalary
    years = scaleEntry.defaultContractYears

  Contract.create({
    leagueId: league.id,
    franchiseId: franchise.id,
    playerId: player.id,
    baseSalary: salary,
    contractYearsTotal: years,
    contractYearsRemaining: years,
    acquiredVia: DRAFT,
    acquiredAt: now(),
    acquiredSeason: league.seasonYear,
    status: ACTIVE,
    contractStatusLabel: "Rookie Scale"
  })
```

**Taxi assignment:** If the owner places the rookie on the taxi squad, the contract's `currentRosterBucket` changes to `TAXI_SQUAD` and the cap weight drops to `taxiSalaryPercent` (default 10%). The contract years and salary are unchanged — taxi is a roster bucket, not a contract type.

**Contract assignment deadline:** After drafting, the owner has 48 hours (configurable) to specify their preferred contract length (1–5 years) and declare taxi vs. active. If the deadline passes without action, the system applies the default from the salary scale and places the player on the active roster. The commissioner is notified. The owner has a 72-hour grace window (total from draft) to correct.

### 6. Offseason rollover sequence

The most complex operation in the cap system. The commissioner triggers this; the system executes atomically.

```
function executeRollover(league, confirmingUserId):
  // Pre-check
  if league.status != POSTSEASON and league.status != OFFSEASON:
    REJECT "Rollover can only run in POSTSEASON or OFFSEASON status."

  // Begin atomic transaction
  auditLog = []

  // Step 1: Decrement contract years
  for each contract in league.activeContracts:
    contract.contractYearsRemaining -= 1
    auditLog.append("DECREMENT: {player.fullName} years {old} → {new}")

  // Step 2: Expire contracts at 0 years
  for each contract where contractYearsRemaining == 0:
    contract.status = EXPIRED
    removeFromRoster(contract.player, contract.franchise)
    auditLog.append("EXPIRED: {player.fullName} released to FA pool")

  // Step 3: Apply salary escalators to surviving contracts
  // IMPORTANT: Only contracts with yearsRemaining > 1 (after decrement)
  for each contract where status == ACTIVE and contractYearsRemaining > 1:
    oldSalary = contract.baseSalary
    applyEscalator(contract, league)
    auditLog.append("ESCALATOR: {player.fullName} salary ${oldSalary} → ${contract.baseSalary}")

  // Step 4: Escalate the salary cap itself
  oldCap = league.salaryCapAmount
  league.salaryCapAmount = round(
    league.salaryCapAmount * (1 + league.salaryCapEscalatorPercent / 100), 2
  )
  auditLog.append("CAP ESCALATED: ${oldCap} → ${league.salaryCapAmount}")

  // Step 5: Expire season-scoped salary adjustments
  for each adjustment where expirationDate <= league.seasonEndDate:
    adjustment.status = EXPIRED
    auditLog.append("ADJUSTMENT EXPIRED: {adjustment.reason} (${adjustment.amount})")

  // Step 6: Advance season
  league.seasonYear += 1
  league.status = OFFSEASON

  // Step 7: Apply offseason roster limit
  // rosterSpotsOffseason (default 70) now governs; rosterSpots (default 53) re-applies
  // at ROSTER_COMPLIANCE_DEADLINE calendar event

  // Step 8: Generate audit record
  RolloverAudit.create({
    leagueId: league.id,
    seasonYearFrom: league.seasonYear - 1,
    seasonYearTo: league.seasonYear,
    confirmedByUserId: confirmingUserId,
    auditLog: auditLog,
    contractsExpired: count(expired),
    contractsEscalated: count(escalated),
    newCapAmount: league.salaryCapAmount,
    executedAt: now()
  })

  // Step 9: Fire events
  fireEvent(OFFSEASON_ROLLOVER, { leagueId, auditLog })
  // v2: generate narrative content summarizing team-by-team changes

  // Commit transaction
```

**Ordering matters.** The steps must execute in this exact sequence:
1. **Decrement first** — so we know which contracts are expiring (hit 0) vs. surviving.
2. **Expire second** — before escalators run, so expired contracts don't get escalated.
3. **Escalate third** — only surviving contracts with years remaining > 1 (final-year contracts don't escalate).
4. **Cap escalation fourth** — the league cap goes up, creating new room.
5. **Expire adjustments fifth** — season-scoped penalties clear out.
6. **Season advance last** — after all contract math is done.

### Worked example — full rollover for one franchise

```
Pre-rollover state (Season 2025):
  League cap: $200.00
  Cap escalator: 5%
  Player escalator: 10%

  Franchise contracts:
    Player A: $20.00, 1 year remaining
    Player B: $15.00, 3 years remaining
    Player C: $8.00, 2 years remaining
    Player D: $1.50, 1 year remaining (taxi squad, 10% weight)

  Salary adjustments:
    Drop penalty: $5.25 (expires end of season)

Step 1 — Decrement:
    A: 1 → 0
    B: 3 → 2
    C: 2 → 1
    D: 1 → 0

Step 2 — Expire:
    A: EXPIRED (released to FA)
    D: EXPIRED (released to FA)

Step 3 — Escalate:
    B: yearsRemaining = 2 (>1), escalate: $15.00 × 1.10 = $16.50
    C: yearsRemaining = 1 (final year), NO escalation: $8.00 stays

Step 4 — Cap escalation:
    League cap: $200.00 × 1.05 = $210.00

Step 5 — Expire adjustments:
    Drop penalty $5.25: expired (season-scoped)

Step 6 — Advance:
    seasonYear: 2025 → 2026
    status: OFFSEASON

Post-rollover state (Season 2026):
  League cap: $210.00
  Franchise contracts:
    Player B: $16.50, 2 years remaining
    Player C: $8.00, 1 year remaining
  Cap usage: $16.50 + $8.00 = $24.50
  Cap room: $210.00 - $24.50 = $185.50
```

### 7. Cap validation

Cap validation runs as a gate on transactions and lineup submission.

```
function validateCapCompliance(franchise, league, proposedChange):
  currentUsage = computeCapUsage(franchise, league)
  proposedUsage = currentUsage + proposedChange.capImpact

  effectiveCap = FranchiseSalaryCapOverride.find(franchise.id, league.seasonYear)
                   ?.overrideCapAmount
                 ?? league.salaryCapAmount

  if proposedUsage > effectiveCap:
    switch league.salaryCapType:
      case HARD:
        REJECT "Transaction would exceed hard cap. Cap room: ${effectiveCap - currentUsage}. Transaction cost: ${proposedChange.capImpact}."
      case SOFT:
        WARN "Transaction exceeds soft cap. Proceed? (Commissioner override may be required.)"
        // Transaction proceeds but franchise is flagged

  return APPROVED
```

**Cap validation triggers:**
- Add/drop transactions (adding a player's salary, subtracting a dropped player's salary + adding any drop penalty)
- Waiver claims (bid amount = new player's salary if `blindBidSalaryLinked`)
- Trade acceptance (net cap impact of incoming vs. outgoing contracts)
- Lineup submission (if `blockLineupWhenOverCap = true`)
- IR/Taxi bucket transitions (salary weight changes)

### 8. Cap impact previews

Three "what-if" calculations that display to owners before they commit to an action.

**Trade cap preview:**

```
function computeTradeCapImpact(franchise, incomingContracts, outgoingContracts, league):
  outgoingCap = sum(c.baseSalary * bucketMultiplier(c.currentRosterBucket, league) for c in outgoingContracts)
  incomingCap = sum(c.baseSalary * bucketMultiplier(c.currentRosterBucket, league) for c in incomingContracts)
  netImpact = incomingCap - outgoingCap
  newCapUsage = computeCapUsage(franchise, league) + netImpact
  newCapRoom = franchise.effectiveCap - newCapUsage
  return { netImpact, newCapUsage, newCapRoom }
```

**Drop cap preview:**

```
function computeDropCapImpact(contract, league):
  salaryRelief = contract.baseSalary * bucketMultiplier(contract.currentRosterBucket, league)
  penalty = computeDropPenalty(contract, league)
  netImpact = penalty - salaryRelief  // positive = net cap charge, negative = net relief
  return { salaryRelief, penalty, netImpact }
```

**Worked example — drop preview for a $10 player with 3 years remaining:**

```
Salary relief: $10.00 × 1.0 (active) = $10.00
Drop penalty:  $10.00 × 0.75 + $10.00 × 0.33 × 2 = $14.10
Net impact:    $14.10 - $10.00 = +$4.10 (dropping this player COSTS $4.10 in net cap)
```

This is the kind of surprise that catches owners off guard on MFL. XO Play shows it before the drop happens.

**Waiver bid cap preview:**

```
function computeWaiverBidCapImpact(franchise, bidAmount, playerToDropContract, league):
  addCost = bidAmount  // if blindBidSalaryLinked, bid = salary
  dropRelief = 0
  dropPenalty = 0
  if playerToDropContract:
    dropRelief = playerToDropContract.baseSalary * bucketMultiplier(...)
    dropPenalty = computeDropPenalty(playerToDropContract, league)
  netImpact = addCost + dropPenalty - dropRelief
  return { addCost, dropRelief, dropPenalty, netImpact }
```

### 9. Forward cap projection

A read-only projection showing a franchise's cap situation 1, 2, and 3 years out under current contracts.

```
function projectCapForward(franchise, league, yearsAhead):
  projections = []
  simulatedContracts = deepCopy(franchise.contracts)
  simulatedCap = league.salaryCapAmount

  for year in 1..yearsAhead:
    // Simulate rollover
    for each contract in simulatedContracts:
      contract.contractYearsRemaining -= 1

    // Remove expired
    simulatedContracts = simulatedContracts.filter(c => c.contractYearsRemaining > 0)

    // Apply escalators to surviving (>1 year after decrement)
    for each contract where contractYearsRemaining > 1:
      escalator = contract.salaryEscalatorPercent ?? league.playerSalaryEscalatorPercent
      contract.baseSalary = round(contract.baseSalary * (1 + escalator / 100), 2)

    // Escalate cap
    simulatedCap = round(simulatedCap * (1 + league.salaryCapEscalatorPercent / 100), 2)

    // Compute projected usage
    usage = sum(c.baseSalary * bucketMultiplier(c.currentRosterBucket, league) for c in simulatedContracts)
    room = simulatedCap - usage

    projections.append({
      year: league.seasonYear + year,
      projectedCap: simulatedCap,
      projectedUsage: usage,
      projectedRoom: room,
      contractsExpiring: count(contracts that hit 0 this iteration),
      contractsRemaining: count(simulatedContracts)
    })

  return projections
```

**Note:** Forward projections don't account for future acquisitions, drops, or trades — they show "what happens if you do nothing." This is the most common use case: "Can I afford to keep this roster for 3 years?"

### 10. Taxi squad contract lifecycle

Taxi contracts are structurally the same as active contracts but with distinct lifecycle rules.

**Creation:** When a rookie is drafted and assigned to taxi, the contract is created with `currentRosterBucket = TAXI_SQUAD` and `contractYearsRemaining` per the league's taxi default (typically 3 years).

**Promotion to active roster:**

```
function promoteTaxiToActive(contract, franchise, league, newContractYears):
  // Validate
  if contract.currentRosterBucket != TAXI_SQUAD:
    REJECT "Player is not on taxi squad."

  // Update roster bucket
  contract.currentRosterBucket = ACTIVE

  // Owner specifies new contract length (1–5 years)
  contract.contractYearsTotal = newContractYears
  contract.contractYearsRemaining = newContractYears

  // Cap weight changes from 10% to 100%
  // This may trigger a cap violation — validate after
  validateCapCompliance(franchise, league, {
    capImpact: contract.baseSalary * (1.0 - league.taxiSalaryPercent / 100)
  })

  createTransaction(TAXI_MOVE, "Promoted {player.fullName} to active roster, {newContractYears}-year contract")
```

**Key taxi rules:**
- Once promoted, cannot be demoted back to taxi (one-way transition)
- Taxi players can be waived with no cap penalty (distinct from active roster drops)
- At taxi contract expiration (years hit 0 at rollover), player must be promoted or released to FA
- Taxi eligibility is configurable: ROOKIES_ONLY (default), LT_2_YEARS, LT_3_YEARS, ALL_PLAYERS

### 11. Salary import/export

**Import format** (CSV, semicolon-delimited, MFL-compatible):

```
Player;Salary;ContractYear;ContractInfo
"Chase, Ja'Marr";25.08;2;
"Ridley, Calvin";17.71;3;Acquired via trade 2024
```

**Parse rules:**
- Player field accepts: "Last, First" or "First Last" or sportsdata.io externalId
- Blank salary field → no change to existing salary
- Blank contract year → no change
- Unlisted players → no change
- Invalid rows → flagged in preview, not applied

**Import flow:**
1. Commissioner uploads CSV
2. System parses and displays a preview: matched players, unmatched players, proposed changes
3. Commissioner reviews and confirms
4. System creates/updates Contract records
5. Audit log generated

**Export:** Produces the same semicolon-delimited format for portability.

### 12. Default salary assignment

Controls what happens when a player is acquired without explicit salary/contract terms.

| Setting | Value | Behavior |
|---|---|---|
| `defaultSalaryAssignment` | `ALWAYS` | System assigns minimum salary ($0.50) and 1-year contract on any acquisition |
| | `NEVER` | Commissioner must manually assign salary/contract |
| | `WAIVER_ONLY` | Only waiver-won players get automatic defaults |
| `salaryResetOnDrop` | `ALWAYS` | Dropped player's salary is wiped; next owner gets default |
| | `NEVER` | Salary persists; next owner inherits |
| | `PROMPT_COMMISSIONER` | System asks commissioner on each drop |

---

## Inputs & outputs

### Triggers

| Trigger | Source | What fires |
|---|---|---|
| Player drop | Owner or commissioner | `computeDropPenalty` → create SalaryAdjustment → remove contract → update cap |
| Waiver claim won | Waiver processing engine | Create contract at bid amount (if salary-linked) → validate cap |
| Trade accepted | Trade workflow | Transfer contracts between franchises → validate cap for both sides |
| Rookie drafted | Draft engine | `assignRookieSalary` from scale → create contract |
| Franchise tag applied | Commissioner | `computeTagValue` → `applyRenewalEscalator` → update contract |
| Offseason rollover | Commissioner confirms | Full `executeRollover` sequence |
| IR/Taxi move | Owner | Update `currentRosterBucket` on contract → cap weight changes |
| Commissioner adjustment | Commissioner | Create SalaryAdjustment → update cap |
| Salary import | Commissioner | Bulk create/update contracts from CSV |
| Lineup submission | Owner | Validate cap compliance (if `blockLineupWhenOverCap`) |

### Outputs

| Output | Destination | Description |
|---|---|---|
| `Contract` records | Database | Created, updated, or expired on every salary-related action |
| `SalaryAdjustment` records | Database | Drop penalties, manual adjustments |
| `RolloverAudit` record | Database | Complete log of every rollover change |
| Cap validation result | Transaction workflow | APPROVED / REJECTED / WARNED |
| Cap impact previews | UI (trade, drop, waiver screens) | Before/after cap numbers |
| Forward projections | UI (cap projection view) | 1–3 year cap outlook |
| `OFFSEASON_ROLLOVER` event | Event bus | Consumed by notification system, narrative engine (v2) |
| `CAP_VIOLATION` event | Event bus | When a franchise exceeds cap (soft cap mode) |

---

## Edge cases

### E1. Drop penalty exceeds remaining cap room

**Scenario:** An owner wants to drop a player but the drop penalty would push them over the hard cap.

**Behavior:** The drop is allowed. Drop penalties always apply regardless of cap status — otherwise an owner could never get under the cap by dropping expensive players. The franchise enters a cap violation state and must resolve before lineup submission (if `blockLineupWhenOverCap = true`).

**Rationale:** Blocking the drop would create a deadlock: owner can't submit a lineup because they're over cap, but can't drop a player to get under cap because the drop penalty would exceed cap. Allowing the drop with a temporary violation breaks the deadlock.

### E2. Franchise tag when fewer than N players exist at position

**Scenario:** `franchiseTagTopN = 10` but only 7 WRs are on contracts league-wide.

**Behavior:** Use all available salaries. Tag value = average of the 7 existing WR salaries. The system does not pad with zeros or minimum salaries.

### E3. Cap violation from IR activation (player returning from injury)

**Scenario:** A player on IR (20% cap weight) returns to active roster (100% cap weight), pushing the franchise over cap.

**Behavior:** The activation is allowed (can't leave a healthy player on IR indefinitely). Franchise enters cap violation state. Owner must make a move to get under cap before next lineup lock.

### E4. Rollover when franchise has pending trades

**Scenario:** Commissioner triggers rollover while a trade proposal is pending.

**Behavior:** All pending trades are auto-cancelled before rollover begins. The rollover preview screen shows a warning: "N pending trades will be cancelled." Rollover does not proceed until confirmed.

### E5. Commissioner grants "retirement amnesty"

**Scenario:** A player retires mid-season. The owner wants to drop them without a cap penalty.

**Behavior:** Commissioner uses the "retirement amnesty" action, which drops the player and creates a SalaryAdjustment with `amount = 0` and `category = OTHER`, `reason = "Retirement amnesty: {player.fullName}"`. The contract is expired. No drop penalty is generated. The action is logged and visible to the league.

### E6. Franchise tag on a player the franchise just acquired via trade

**Scenario:** A franchise trades for a player and immediately tries to tag them.

**Behavior:** Allowed. The anti-exploit rule only prevents the *acquiring* franchise from tagging a player who was *already tagged by the previous franchise*. If the traded player had an expiring (non-tagged) contract, the new franchise can tag them normally.

### E7. Salary below minimum after import

**Scenario:** Commissioner imports a CSV with a salary of $0.25 when `minimumPlayerSalary = $0.50`.

**Behavior:** The import preview flags the row as a validation error: "Salary $0.25 is below minimum ($0.50)." The commissioner can either fix the CSV or override the minimum for the import (logged as a commissioner action).

### E8. Salary increment violation

**Scenario:** A bid or salary is $5.15 when `salaryIncrement = $0.10`.

**Behavior:** Rejected. "Salary must be a multiple of $0.10. Nearest valid values: $5.10 or $5.20."

### E9. Blind bid salary linked — bid exceeds remaining cap room

**Scenario:** Owner bids $15.00 on a waiver player when they only have $10.00 in cap room.

**Behavior:** If `blindBidSalaryLinked = true`, the bid is the player's salary. The waiver claim is recorded but will fail at processing time when cap validation runs. The system should warn at bid submission: "This bid would exceed your cap room by $5.00. Claim will fail unless you free cap space before processing."

### E10. Per-franchise cap override in combination with cap escalation at rollover

**Scenario:** A franchise has a custom cap override of $180.00 (handicap). The league cap escalates from $200 → $210. Does the override escalate too?

**Behavior:** No. Overrides are absolute values, not relative. The franchise's cap remains $180.00 unless the commissioner creates a new override for the next season. The rollover audit log notes which franchises have overrides that did not escalate.

### E11. Player with 0 years remaining cannot be traded

**Scenario:** Owner tries to trade a player whose contract expires at end of season (`contractYearsRemaining = 1` during the season, meaning 0 after rollover).

**Behavior:** During the season, `contractYearsRemaining = 1` means the contract is still active — trade is allowed. The acquiring franchise inherits the expiring contract. After rollover, if the contract hits 0, the player becomes an FA for the acquiring franchise. The PRD rule "0 years remaining cannot be traded unless tagged" applies only to contracts that are *currently* at 0, which would only happen post-rollover in offseason — at which point the contract is already expired and the player is a free agent, so trading doesn't apply.

### E12. Keeper tier with salaries enabled — no escalators, no drop penalties

**Scenario:** A Keeper league enables `trackSalaries = true`. Does the full cap system activate?

**Behavior:** Cap math activates (cap usage, cap validation, cap previews). But per [Spec_Tiers.md §3.3](../Spec_Tiers.md), **salary escalators and drop penalties do NOT apply in Keeper tier**, even with salaries tracked. This is because Keeper resets rosters each season — there's no multi-year contract obligation to penalize. Franchise tags are also disabled in Keeper.

---

## Open questions

### OQ1. Amortized drop penalty — exact split mechanics

When `dropPenaltyMode = AMORTIZED`, how is the penalty split? Options:
1. **Equal annual installments** — $20.70 over 5 years = $4.14/year
2. **Front-loaded** — higher charge in year 1, declining
3. **Tied to original contract years** — each installment corresponds to one year the contract would have been active

**Recommendation:** Option 1 (equal installments) for simplicity. Create multiple SalaryAdjustment records with staggered `expirationDate` values.

### OQ2. Starting lineup salary cap — enforcement details

PRD §7.3 mentions an optional `startingLineupSalaryCap` that caps the sum of starter salaries (separate from the roster cap). When exactly is this enforced? At lineup submission? At lineup lock? What happens if a stat correction changes which Best Ball starters were optimal and the optimal lineup exceeds the starter cap?

**Recommendation:** Enforce at lineup submission only. Best Ball leagues should not use the starting lineup cap (the two features are incompatible). If both are enabled, the starting lineup cap is ignored for Best Ball leagues.

### OQ3. Per-contract escalator override — UI implications

Every contract can have a custom `salaryEscalatorPercent` that overrides the league default. How does a commissioner set this? Per-player inline edit? Bulk editor? Import-only?

**Recommendation:** Per-player inline edit in the contract management screen, plus CSV import support. Bulk editor is a v2 nice-to-have.

### OQ4. Franchise tag — what counts as "at position" for salary collection?

When computing TOP_N_AT_POSITION_AVG, do we include only active-roster contracts, or also taxi and IR? Including taxi (at 10% weight) would skew the average downward since taxi rookies have low salaries but are weighted at 10%.

**Recommendation:** Active roster contracts only. Use the full `baseSalary`, not the weighted cap charge. The tag value represents what a player is "worth" at that position, not what they cost against the cap.

---

## Related buildable units

Per [Structure_Map.md](../../documents/Structure_Map.md), the `salary-cap/` folder anticipates these Level 3 units:

| Unit | Type | Purpose |
|---|---|---|
| `Logic_CapUsageCalc.md` | Logic | `computeCapUsage`, `computeCapRoom`, `validateCapCompliance` |
| `Logic_DropPenaltyCalc.md` | Logic | `computeDropPenalty`, `applyDropPenalty`, drop preview |
| `Logic_SalaryEscalator.md` | Logic | `applyEscalator` and the rollover escalation loop |
| `Logic_FranchiseTagValuation.md` | Logic | `computeTagValue`, `applyRenewalEscalator`, `applyFranchiseTag` |
| `Logic_RookieSalaryScale.md` | Logic | `assignRookieSalary` and scale lookup |
| `Logic_OffseasonRollover.md` | Logic | `executeRollover` — the full atomic sequence |
| `Component_CapMeter.md` | Component | Visual cap usage display (bar/gauge) |
| `Component_ContractCard.md` | Component | Per-player contract summary card |
| `Component_CapProjection.md` | Component | Forward 1–3 year cap projection view |

These will be written when the salary-cap feature moves to build phase.

---

**END OF SPECIFICATION**
