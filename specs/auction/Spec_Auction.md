# Auction System

**Status:** Draft
**Parent:** [Spec_XOPlay_PRD.md §10](../Spec_XOPlay_PRD.md#10-auction-system)
**Related specs:** [Spec_DataModel.md §4.25–4.27, §5.30–5.34](../Spec_DataModel.md), [Spec_Tiers.md §4.5](../Spec_Tiers.md), [Spec_SalaryCapAndContracts.md](../salary-cap/Spec_SalaryCapAndContracts.md), [Spec_CalendarAndLifecycle.md](../calendar/Spec_CalendarAndLifecycle.md), [Spec_Transactions.md](../transactions/Spec_Transactions.md)
**Last updated:** May 2026

---

## Purpose

The auction system manages the nomination, bidding, and awarding of players through a competitive bidding process. It handles two auction modes (live and email), the proxy bidding engine, per-player expiration clocks, available funds tracking, nomination slot management, post-auction contract creation, and conference-scoped auctions. It coordinates with the salary cap system for budget enforcement and with the calendar system for auction scheduling and lifecycle.

**Design principle: Resource transparency over surprise.** An auction is a resource-allocation game. At every moment, an owner must be able to answer four questions: how much money do I have left, how many players can I still afford, how many roster slots do I need to fill, and what is the market paying for similar players. The system enforces resource constraints in real time and never allows a bid that would leave a franchise in an impossible state.

**Tier relevance.** The auction engine is tier-agnostic at the mechanical level. It reads league configuration flags (`startingFundsMode`, `auctionAvailablePlayerPool`, `trackSalaries`, etc.) to determine behavior. What varies by tier is the auction's *role* in the season:

| Tier | Auction role | Player pool | Frequency |
|---|---|---|---|
| **Redraft** | Optional. If `initialRosterMode = AUCTION`, the auction populates the entire roster at season start. Budget is a one-time allocation — not a persistent salary cap. | `BOTH_ROOKIES_AND_VETERANS` | Once (season start) |
| **Keeper** | Optional. If enabled, fills remaining roster slots after keepers are declared. | `BOTH` (or `VETERANS_ONLY` if separate rookie draft exists) | Once per season (pre-draft or standalone) |
| **Dynasty** | Required each offseason. The primary mechanism for acquiring veteran free agents. Separate from the rookie draft. | `VETERANS_ONLY` (default) | Every offseason |

The engine doesn't branch on tier — it reads `auctionAvailablePlayerPool`, `startingFundsMode`, and `availableFundsReducedBy` and behaves accordingly.

## PRD anchor

This spec expands on PRD §10 (Auction System), with additional context from:

- §10.1 — Design principle (resource transparency)
- §10.2 — Auction types (live vs. email)
- §10.3 — Auction configuration (15 settings)
- §10.4 — Auction lifecycle (nomination → bidding → awarding → close)
- §10.5 — Proxy bidding mechanics with worked example
- §10.6 — Bid entity
- §10.7 — Available funds calculation
- §10.8 — Roster validity during auction
- §10.9 — Auction nomination process
- §10.10 — Auction awarding and contract creation
- §10.11 — Conditional bids (not in v1)
- §10.12 — Commissioner auction controls
- §7.6 — Rookie salary scale (relevant for rookie auctions, if configured)
- §8.7 — FLAG calendar example (conference-scoped auction date ranges)
- §22.8 — Auction bid race condition edge case

What this spec adds beyond the PRD: the complete proxy bidding algorithm with multi-bidder worked examples, the available funds calculation with all three reduction modes, the nomination lifecycle with slot management, the auction state machine, bid validation with the full check sequence, the expiration clock engine with live vs. email differences, conference-scoped auction isolation rules, post-auction contract creation lifecycle including the contract length declaration window, and edge cases the PRD flags but doesn't fully resolve.

---

## Entities & data shapes

Full field definitions live in [Spec_DataModel.md](../Spec_DataModel.md). This section documents how the auction system uses each entity.

### Entities the system reads

| Entity | Fields used | How used |
|---|---|---|
| **League** (§4.2.7) | All auction fields: `auctionMode`, `minimumOpeningBid`, `bidIncrement`, `playerAuctionExpirationHours`, `useProxyBidding`, `proxyBiddingIsPrivate`, `maxConcurrentPlayerAuctions`, `nominationsPerFranchise`, `auctionAvailablePlayerPool`, `auctionForceFullRosterAtEnd`, `allowCommentsOnBids`, `chargeWinningBidsToAccountingBalance`, `startingFundsMode`, `startingFundsAmount`, `availableFundsReducedBy`. Also: `trackSalaries`, `trackContracts`, `rosterSpots`, `rosterSpotsOffseason`, `rosterPositionLimits`, `salaryCapAmount`, `minimumPlayerSalary`, `playerPoolIsolation` | Configuration source for every auction operation. Loaded once when the auction opens. |
| **Franchise** (§4.3) | `id`, `conferenceId`, `divisionId`, cap usage data | Identifies bidders. Conference used for pool isolation. Cap data used when `availableFundsReducedBy` includes salaries. |
| **Player** (§4.9) | `position`, `rookieYear`, `nflStatus` | Player pool filtering (`VETERANS_ONLY` filters by `rookieYear < currentSeasonYear`). Position used for roster limit validation on bid. |
| **RosterEntry** (§4.17) | `franchiseId`, `playerId`, `bucket` | Current roster state. Prevents nominating/bidding on already-rostered players. Counts roster spots for validation. |
| **Contract** (§4.13) | `baseSalary`, `status` | When `availableFundsReducedBy` includes `CURRENT_SALARIES`, existing contract salaries reduce available funds. |
| **CalendarEvent** (§4.33) | `eventType = AUCTION_START` | Triggers auction opening. Date range defines the nominal auction window. |
| **FranchiseSalaryCapOverride** (§4.16) | `overrideAmount` | Per-franchise cap override affects available funds when salary-linked. |

### Entities the system writes

| Entity | Fields written | When |
|---|---|---|
| **Auction** (§4.25) | All fields | Created when the `AUCTION_START` calendar event fires. `status` transitions through `SCHEDULED → OPEN → CLOSED`. |
| **AuctionPlayerState** (§4.26) | All fields | Created when a player is nominated. Updated on every bid (new high bid, expiration recalculation). Updated on close (status → `CLOSED_AWARDED` or `CLOSED_NO_BIDS`). |
| **Bid** (§4.27) | All fields | Created on every bid action (manual or proxy-generated). Status updated when outbid or when auction closes. |
| **RosterEntry** (§4.17) | Create row | When a player auction closes and is awarded, a RosterEntry is created for the winning franchise. |
| **Contract** (§4.13) | Create row | When `trackContracts = true`, a Contract is created with the winning bid as `baseSalary`. |
| **Transaction** (§4.18) | `type = AUCTION_AWARD` | Every awarded player creates a Transaction record. |
| **AccountingEntry** (§4.35) | `amount`, `eventType` | When `chargeWinningBidsToAccountingBalance = true`, winning bids create accounting entries. |

---

## Auction lifecycle

An auction progresses through a defined state machine driven by calendar events and bidding activity.

### Auction states

| State | How determined | What's allowed |
|---|---|---|
| **SCHEDULED** | Auction entity exists; `AUCTION_START` calendar event has not yet fired. | Commissioner can edit configuration. Owners can browse the player pool but cannot nominate or bid. |
| **OPEN** | `AUCTION_START` calendar event has fired. At least one nomination slot is available. | Owners nominate players, place bids. Commissioner can manage bids, pause/resume, end early. |
| **CLOSED** | All active AuctionPlayerStates are `CLOSED_*`, AND either: (a) the calendar end date has passed, or (b) commissioner has ended the auction, or (c) no franchise has nominated for `auctionInactivityCloseHours` (configurable, default: 48). | Results are final. Commissioner can reopen individual players or void bids for correction. |

### Opening the auction

When the `AUCTION_START` calendar event fires:

```
1. Create (or verify) the Auction entity for this season/conference.
   Auction {
     leagueId, seasonYear, conferenceId (if scoped),
     status: OPEN,
     startsAt: calendarEvent.startAt,
     endsAt: calendarEvent.endAt (nominal — actual close depends on activity)
   }

2. Compute starting funds for each franchise (see §Available Funds).

3. Notify all franchise owners: "The [Auction Name] is now open. You may
   begin nominating players."

4. Open the nomination window — franchises can immediately nominate
   up to nominationsPerFranchise players.
```

The commissioner can also open the auction manually before the calendar event (e.g., if all owners are ready early). Manual open follows the same sequence.

### Closing the auction

The auction closes when ANY of these conditions is met:

```
Condition A: Calendar end date
  - now > Auction.endsAt AND no AuctionPlayerState has status = OPEN
  - If OPEN player auctions remain at calendar end, they run to
    completion (their individual expiration clocks continue).
    The auction transitions to CLOSED only after the last player
    auction resolves.

Condition B: Commissioner ends early
  - Commissioner triggers "End auction." All OPEN player auctions
    are immediately awarded to their current high bidder.
    Player auctions with no bids are marked CLOSED_NO_BIDS.

Condition C: Inactivity timeout
  - No franchise has submitted a new nomination for
    auctionInactivityCloseHours (default: 48 hours in email mode,
    disabled in live mode).
  - All existing OPEN player auctions have closed naturally.
  - System auto-closes the auction and notifies the league.
```

**Design note on calendar end vs. player expiration:** The calendar end date is a *nominal* boundary, not a hard cutoff. If a player was nominated 2 hours before the calendar end with a 16-hour expiration clock, that player's auction continues past the calendar end date. The only hard cutoff is the commissioner's "End auction early" action. This matches how MFL's auction works and prevents owners from losing bids to an arbitrary clock.

---

## Nomination

Nominations are how players enter the auction. Only franchise owners can nominate; the system does not auto-nominate players.

### Nomination process

```
1. Owner selects a player from the available pool and submits a
   nomination with an opening bid.

2. System validates:
   a. Is the auction OPEN?
   b. Is the player in the available pool (per auctionAvailablePlayerPool)?
   c. Is the player already nominated in this auction
      (AuctionPlayerState exists for this player)? If yes, reject.
   d. Is the player already rostered in this league? If yes, reject.
   e. Has this franchise reached its nominationsPerFranchise limit
      (count of OPEN AuctionPlayerStates where nominatedByFranchiseId
      = this franchise)? If yes, reject.
   f. Has the league reached maxConcurrentPlayerAuctions
      (count of all OPEN AuctionPlayerStates)? If yes, reject.
   g. Is the opening bid ≥ minimumOpeningBid? If not, reject.
   h. Is the opening bid a multiple of bidIncrement? If not, reject.
   i. Can this franchise afford the opening bid?
      (See §Available Funds — the bid must not push availableFunds below
      the minimum reserve needed to fill remaining roster slots.)
   j. Would winning this player produce a valid roster?
      (See §Roster Validity During Auction.)

3. If all checks pass:
   a. Create AuctionPlayerState {
        auctionId: this auction,
        playerId: nominated player,
        nominatedByFranchiseId: this franchise,
        currentHighBidId: null (set in step c),
        currentBidAmount: opening bid amount,
        lastBidAt: now,
        expiresAt: now + playerAuctionExpirationHours,
        status: OPEN,
        awardedContractId: null
      }
   b. Create Bid {
        auctionPlayerStateId: from step a,
        franchiseId: this franchise,
        playerId: nominated player,
        amount: opening bid,
        maxProxyAmount: owner's proxy max (if proxy bidding enabled
                        and owner submits one; otherwise null),
        comment: owner's comment (if allowCommentsOnBids),
        placedAt: now,
        status: WINNING
      }
   c. Update AuctionPlayerState.currentHighBidId = new Bid.id.
   d. Notify all league members: "[Franchise] nominates [Player] at $[amount]."
```

### Nomination slot management

Each franchise has `nominationsPerFranchise` nomination slots. A slot is "occupied" when the franchise has an OPEN AuctionPlayerState as the nominator. When one of their nominated players' auctions closes (awarded or expired), the slot frees up and the franchise can nominate another player.

The slot count is tracked by query, not by a counter field:

```
occupiedSlots = COUNT(AuctionPlayerState WHERE
  auctionId = this auction AND
  nominatedByFranchiseId = this franchise AND
  status = OPEN)

availableSlots = nominationsPerFranchise - occupiedSlots
```

**Important:** The nomination slot limit applies only to the *nominating* franchise, not to how many player auctions a franchise can be *bidding on*. A franchise can bid on unlimited player auctions simultaneously — only their nomination output is capped.

---

## Bidding

### Placing a bid

When an owner places a bid on an active player auction:

```
1. VALIDATE
   a. Is the player auction OPEN (AuctionPlayerState.status = OPEN)?
   b. Has the player auction expired (now > expiresAt)?
      If yes, close the auction first (see §Expiration), then reject the bid.
   c. Is the bidder the current high bidder? If yes, reject:
      "You already have the high bid." (Exception: if proxy bidding is
      enabled, the bidder can UPDATE their proxy max — see §Proxy Bidding.)
   d. Is the bid amount > currentBidAmount? If not, reject.
   e. Is the bid amount a valid increment above currentBidAmount?
      nextValidBid = currentBidAmount + bidIncrement
      If bid < nextValidBid, reject: "Minimum bid is $[nextValidBid]."
   f. Is the bid a multiple of bidIncrement? If not, reject.
   g. Can this franchise afford the bid? (See §Available Funds.)
   h. Would winning this player produce a valid roster?
      (See §Roster Validity During Auction.)

2. If proxy bidding is OFF (useProxyBidding = false):
   a. Create Bid {
        amount: submitted bid,
        maxProxyAmount: null,
        status: WINNING
      }
   b. Update previous high bid: status → OUTBID.
   c. Update AuctionPlayerState:
      currentHighBidId = new Bid.id,
      currentBidAmount = submitted bid,
      lastBidAt = now,
      expiresAt = now + playerAuctionExpirationHours
   d. Notify: "[Franchise B] bids $[amount] on [Player]. Auction expires [expiresAt]."

3. If proxy bidding is ON (useProxyBidding = true):
   → Run the proxy bidding engine (see §Proxy Bidding).
```

### Proxy bidding

With proxy bidding enabled, owners submit a *maximum* they're willing to pay. The system bids on their behalf up to that maximum, always placing the minimum necessary bid to stay in the lead.

#### Proxy bidding algorithm

```
When a new bid arrives (amount, maxProxyAmount) from Franchise B
on a player auction where Franchise A is the current high bidder:

1. Let currentStandingBid = AuctionPlayerState.currentBidAmount
   Let A_max = current high bid's maxProxyAmount (may be null if A has no proxy)
   Let B_bid = submitted amount
   Let B_max = submitted maxProxyAmount (may be null if B declines proxy)
   Let inc = League.bidIncrement

2. If A has no proxy (A_max is null):
   → B leads at B_bid.
   → A is OUTBID.
   → (Normal non-proxy bid resolution.)

3. If A has a proxy (A_max is not null):
   a. Can A's proxy beat B?
      If A_max >= B_bid + inc:
        → A's proxy auto-bids to (B_bid + inc) or B_bid if
          B_bid + inc > A_max (i.e., A bids the minimum needed to lead).
        → A remains WINNING at the new standing amount.
        → B is OUTBID.
        → AuctionPlayerState.currentBidAmount = A's new standing bid.
        → lastBidAt = now, expiresAt recalculated.
        → Notify B: "You have been outbid on [Player]. Current bid: $[A's new standing bid]."
        → If proxyBiddingIsPrivate: B sees "Outbid at $[A's standing bid]" but NOT A's max.

      If A_max >= B_bid but A_max < B_bid + inc:
        → A auto-bids to A_max (their maximum). A leads at A_max.
        → B is OUTBID.
        → (A is now at their ceiling — any subsequent bid above A_max will take the lead.)

      If A_max < B_bid:
        → B leads at B_bid. A is OUTBID.
        → If B has a proxy (B_max is not null): B leads at B_bid (not B_max).
          B's proxy will defend starting from B_bid.

   b. Proxy vs. proxy collision (both A and B have proxy maxes):
      If B_max > A_max:
        → B wins the proxy war. B leads at A_max + inc (or B_max if
          A_max + inc > B_max — i.e., B pays the minimum to beat A).
        → A is OUTBID at A_max.

      If B_max = A_max:
        → Current holder wins ties. A leads at A_max.
        → B is OUTBID.

      If B_max < A_max:
        → A's proxy defends. A leads at B_max + inc (or A_max if
          B_max + inc > A_max).
        → B is OUTBID.
```

#### Worked example — proxy bidding with three bidders

**Setup:**
- `bidIncrement = $0.10`
- Player X nominated at $1.00 by Franchise A.
- A sets `maxProxyAmount = $5.00`.

**Sequence:**

```
Step 1: Nomination.
  A leads at $1.00. A's proxy max = $5.00.
  Standing bid: $1.00 (A).

Step 2: Franchise B bids $2.00 (no proxy).
  A has proxy. A_max ($5.00) >= B_bid + inc ($2.10).
  A auto-bids to $2.10. A leads.
  B is OUTBID.
  Standing bid: $2.10 (A).

Step 3: Franchise B bids $4.00 (no proxy).
  A_max ($5.00) >= B_bid + inc ($4.10).
  A auto-bids to $4.10. A leads.
  B is OUTBID.
  Standing bid: $4.10 (A).

Step 4: Franchise C bids $4.50 with proxy max = $6.00.
  A_max ($5.00) vs. C_max ($6.00).
  Proxy vs. proxy: C_max ($6.00) > A_max ($5.00).
  C leads at A_max + inc = $5.10.
  A is OUTBID at $5.00 (their max).
  Standing bid: $5.10 (C).

Step 5: Franchise B bids $5.50 (no proxy).
  C has proxy. C_max ($6.00) >= B_bid + inc ($5.60).
  C auto-bids to $5.60. C leads.
  B is OUTBID.
  Standing bid: $5.60 (C).

Step 6: No more bids. Expiration clock runs from Step 5's timestamp.
  Player X awarded to Franchise C at $5.60.
```

**What each franchise sees (when `proxyBiddingIsPrivate = true`):**

| Step | A sees | B sees | C sees |
|---|---|---|---|
| 1 | "Leading at $1.00" | — | — |
| 2 | "Leading at $2.10" | "Outbid at $2.10" | — |
| 3 | "Leading at $4.10" | "Outbid at $4.10" | — |
| 4 | "Outbid at $5.10" | "Outbid at $5.10" | "Leading at $5.10" |
| 5 | "Outbid at $5.60" | "Outbid at $5.60" | "Leading at $5.60" |

No franchise ever sees another franchise's proxy max. A doesn't know C's max is $6.00; C doesn't know A's max was $5.00. They see only the current standing bid.

#### Updating a proxy max

The current high bidder can increase (but not decrease) their proxy max at any time while their bid is WINNING. This does NOT change the standing bid — it only raises the ceiling at which the system will auto-defend.

```
Validation:
  - Is the bidder the current high bidder? If not, reject.
  - Is the new proxy max > current proxy max? If not, reject:
    "You can only increase your proxy maximum."
  - Can the franchise afford the new proxy max? Check availableFunds
    against (newProxyMax - currentStandingBid) as the incremental
    commitment. (See §Available Funds for how proxy maxes interact
    with committed funds.)

If valid:
  - Update the existing Bid.maxProxyAmount to the new value.
  - Do NOT update lastBidAt or expiresAt (the standing bid hasn't changed).
  - Do NOT notify other franchises (no visible change occurred).
```

#### Proxy visibility modes

| Setting | Behavior |
|---|---|
| `proxyBiddingIsPrivate = true` | Other franchises see only the standing bid amount. The proxy max is visible only to the bidder who set it. Default. |
| `proxyBiddingIsPrivate = false` | All proxy max amounts are visible to all franchises. Creates a different strategic dynamic — bidders can see exactly how much room remains under a competitor's proxy. |

---

## Available funds

At any moment during the auction, a franchise's available funds determine what they can bid. The calculation depends on the `startingFundsMode` and `availableFundsReducedBy` league settings.

### Starting funds computation

```
If startingFundsMode = SAME_FOR_ALL:
  totalFunds = League.startingFundsAmount

If startingFundsMode = PER_FRANCHISE:
  totalFunds = Franchise.auctionBudget
  (Set by commissioner per franchise — stored on a per-franchise
  override field or a dedicated AuctionBudget entity.)

If startingFundsMode = USE_ACCOUNTING_BALANCE:
  totalFunds = Franchise.accountingBalance
  (Real dollars from the accounting system. Winning bids deduct
  from this balance when chargeWinningBidsToAccountingBalance = true.)
```

### Committed funds computation

The `availableFundsReducedBy` setting controls what counts as "spoken for":

```
If availableFundsReducedBy = OPEN_BIDS_PLUS_CURRENT_SALARIES:
  committed = sum(standing bids where this franchise is WINNING)
            + sum(baseSalary for all current Contract where
                  franchiseId = this franchise AND status = ACTIVE)

If availableFundsReducedBy = OPEN_BIDS_ONLY:
  committed = sum(standing bids where this franchise is WINNING)

If availableFundsReducedBy = CURRENT_SALARIES_ONLY:
  committed = sum(baseSalary for all current Contract where
                  franchiseId = this franchise AND status = ACTIVE)
```

### Available funds formula

```
availableFunds = totalFunds - committed
```

### Minimum reserve (when `auctionForceFullRosterAtEnd = true`)

When this flag is on, the system enforces that a franchise must be able to fill all remaining roster slots at minimum salary. Before accepting a bid:

```
openRosterSlots = rosterSpots - count(RosterEntry where
                    franchiseId = this franchise AND bucket = ACTIVE)
                - count(WINNING bids for this franchise on other players)

minimumReserve = (openRosterSlots - 1) * minimumOpeningBid
// "-1" because the current bid fills one of those slots.

maxAllowableBid = availableFunds - minimumReserve

If bid > maxAllowableBid:
  reject: "Bid of $[bid] would leave insufficient funds to fill your
           remaining [openRosterSlots - 1] roster slot(s). Maximum
           bid: $[maxAllowableBid]."
```

### Worked example — available funds with roster reserve

**Setup:**
- `startingFundsMode = SAME_FOR_ALL`, `startingFundsAmount = $200.00`
- `availableFundsReducedBy = OPEN_BIDS_PLUS_CURRENT_SALARIES`
- `auctionForceFullRosterAtEnd = true`
- `minimumOpeningBid = $0.50`
- `rosterSpots = 25`
- Franchise has 20 players rostered at combined salaries of $120.00
- Franchise is currently winning 2 other player auctions at $8.00 and $5.00

```
totalFunds = $200.00

committed = WINNING bids ($8.00 + $5.00) + current salaries ($120.00)
          = $133.00

availableFunds = $200.00 - $133.00 = $67.00

openRosterSlots = 25 - 20 (rostered) - 2 (winning bids on others) = 3
minimumReserve = (3 - 1) * $0.50 = $1.00

maxAllowableBid = $67.00 - $1.00 = $66.00

Owner tries to bid $70.00 → REJECTED:
  "Bid of $70.00 would leave insufficient funds to fill your
   remaining 2 roster slot(s). Maximum bid: $66.00."

Owner bids $50.00 → ACCEPTED. New available = $67.00 - $50.00 = $17.00.
```

### Proxy bids and committed funds

**Critical design point:** A franchise's committed funds include their current *standing* bid on each player auction, not their proxy maximum. This means setting a high proxy max does not lock up funds.

```
Example:
  Franchise A is winning Player X at a standing bid of $3.00
  with a proxy max of $15.00.

  A's committed amount for Player X = $3.00 (not $15.00).

  If someone outbids A and the proxy auto-defends to $7.00,
  A's committed amount increases to $7.00. The availableFunds
  recalculation happens immediately on every proxy defense.
```

**Risk implication:** A franchise can set proxy maxes that, in aggregate, exceed their available funds. If multiple proxies fire simultaneously, a later proxy defense might fail due to insufficient funds. When a proxy defense would push availableFunds below zero (or below the minimum reserve), the proxy defense does NOT fire. The franchise is outbid despite having a proxy max above the incoming bid. The franchise is notified: "Your proxy bid on [Player] could not be defended — insufficient available funds."

---

## Roster validity during auction

Every bid must result in a valid roster *if that bid wins*. The system projects a hypothetical post-win state and checks:

```
1. ROSTER SPOTS
   projectedRosterCount = currentActiveRosterCount
                        + count(other WINNING bids for this franchise)
                        + 1 (this bid)
   If projectedRosterCount > rosterSpots (or rosterSpotsOffseason
   if the auction runs during offseason):
     reject: "Winning this player would exceed your roster limit
              ([projectedRosterCount]/[rosterSpots])."

2. POSITION LIMITS
   If the league has rosterPositionLimits for this player's position:
     projectedPositionCount = currentPositionCount
                            + count(other WINNING bids on same position)
                            + 1 (this bid)
     If projectedPositionCount > positionMax:
       reject: "Winning this player would exceed your [position]
                limit ([projectedPositionCount]/[positionMax])."

3. SALARY CAP (when trackSalaries = true and cap is HARD)
   projectedCapUsage = currentCapUsage
                     + sum(standing bids for WINNING auctions)
                     + this bid amount
   If projectedCapUsage > salaryCapAmount:
     reject: "Winning this player at $[bid] would put you over the
              salary cap ($[projectedCapUsage]/$[salaryCapAmount])."

   Note: For leagues where the auction budget is SEPARATE from the
   salary cap (Redraft auctions where trackSalaries = false), the
   salary cap check is skipped entirely. Only the auction budget
   (available funds) constraint applies.
```

**Important:** These checks use *projected* state, not current state. A franchise currently at 23/25 roster spots with 1 winning bid might seem to have room for 1 more, but if they win the current bid that would be 25/25 — any further bids would be blocked.

---

## Expiration clock

Each nominated player has its own independent expiration clock. This is the core timing mechanism that determines when a player auction closes.

### Clock mechanics

```
When a player is nominated:
  AuctionPlayerState.lastBidAt = now
  AuctionPlayerState.expiresAt = now + playerAuctionExpirationHours

When a new high bid is placed (or a proxy defense raises the standing bid):
  AuctionPlayerState.lastBidAt = now
  AuctionPlayerState.expiresAt = now + playerAuctionExpirationHours
  // The clock RESETS on every new high bid.

When expiresAt is reached with no new bid:
  → Close this player's auction (see §Awarding).
```

### Live vs. email expiration

The `playerAuctionExpirationHours` setting controls the clock for both modes, but typical values differ:

| Mode | Typical expiration | Effect |
|---|---|---|
| `LIVE` | 0.5–2 minutes (expressed as hours: 0.0083–0.033) | Fast-paced, all-hands event. Owners must be present. |
| `EMAIL` | 12–24 hours (default: 15.84 hours = ~16 hours) | Asynchronous. Owners check in periodically. |

The system does not enforce different logic for live vs. email — the only difference is the timer duration configured by the commissioner. All other mechanics (proxy bidding, nomination slots, funds tracking) work identically.

### Expiration processing

The system must check for expired player auctions. Two approaches, depending on mode:

**Live mode:** A real-time countdown runs client-side with server-side verification. When the client timer hits zero, it calls the server to close the auction. The server re-checks `expiresAt` against the current server time before closing (in case a last-second bid reset the clock).

**Email mode:** A scheduled job runs periodically (every 1–5 minutes) and queries for AuctionPlayerStates where `status = OPEN AND expiresAt <= now`. Each match triggers the awarding process. Alternatively, the check runs on-demand whenever any bid is placed or any owner views the auction page (lazy evaluation with server-side guard).

**Race condition handling (PRD §22.8):** The server timestamp is authoritative. If a bid request arrives at the server BEFORE `expiresAt`, the bid is accepted and the clock resets. If the bid arrives AFTER `expiresAt`, the bid is rejected with "Auction for [Player] has closed." The client should show a "verifying..." state during the last few seconds to manage user expectations.

---

## Awarding

When a player's auction expires (no new bid before `expiresAt`), the player is awarded to the high bidder.

### Award process

```
1. LOCK the AuctionPlayerState (prevent concurrent bids during processing).

2. VERIFY the player auction is still OPEN and expiresAt <= now.
   (Guard against race conditions where a bid snuck in.)

3. If currentHighBidId exists (someone bid):
   a. Identify the winning franchise from the WINNING Bid record.

   b. RE-VALIDATE the winning franchise's state:
      - Can they still afford this bid? (Funds may have changed since
        the bid was placed — other auctions they were winning may have
        been outbid, freeing funds, or other auctions they won may
        have consumed funds.)
      - Does the roster still have room? (Other auctions may have
        awarded players to this franchise since the bid was placed.)

      If re-validation FAILS:
        → This is an exceptional situation. The winning bid was valid
          when placed but is no longer valid at award time.
        → Mark AuctionPlayerState as CLOSED_NO_BIDS (or a new status
          CLOSED_AWARD_FAILED — see Open Question OQ1).
        → Notify the franchise: "Your winning bid on [Player] could not
          be processed — [reason]. The player has been returned to the
          free agent pool."
        → Notify the league: "[Player]'s auction closed without award."
        → Do NOT cascade to the next bidder (simplicity > correctness
          in this edge case — see OQ1).

   c. If re-validation PASSES:
      - Update AuctionPlayerState.status = CLOSED_AWARDED.
      - Update winning Bid.status = WINNING (already set, but confirm).
      - Update all other Bids for this player: status = OUTBID.

      CREATE ROSTER ENTRY:
        RosterEntry {
          franchiseId: winning franchise,
          playerId: awarded player,
          bucket: ACTIVE,
          contractId: null (populated in step d if tracked)
        }

      d. CREATE CONTRACT (if trackContracts = true):
         Contract {
           franchiseId: winning franchise,
           playerId: awarded player,
           baseSalary: winning Bid.amount,
           contractYearsTotal: 1 (default — see §Contract Length Declaration),
           contractYearsRemaining: 1,
           salaryEscalatorPercent: League.salaryEscalatorPercent (if applicable),
           status: ACTIVE,
           currentRosterBucket: ACTIVE
         }
         Update RosterEntry.contractId.
         Update AuctionPlayerState.awardedContractId.

      e. CREATE TRANSACTION:
         Transaction {
           type: AUCTION_AWARD,
           payload: { playerId, bidAmount, contractId, auctionId }
         }

      f. UPDATE FUNDS:
         The franchise's committed funds now permanently include this
         player's salary (instead of the standing bid amount). The
         available funds recalculation happens automatically on the
         next query.

      g. FREE NOMINATION SLOT:
         The nominating franchise's slot count decreases by 1 (the
         AuctionPlayerState is no longer OPEN, so it stops counting
         against their nominationsPerFranchise limit).

      h. ACCOUNTING (if chargeWinningBidsToAccountingBalance = true):
         Create AccountingEntry {
           franchiseId: winning franchise,
           amount: -(winning Bid.amount),
           eventType: AUCTION_WIN
         }

      i. NOTIFY:
         - Winning franchise: "You won [Player] for $[amount]."
         - Losing bidders: "Auction for [Player] has closed. [Winning Franchise]
           wins at $[amount]."
         - League feed: "[Franchise] acquires [Player] via auction for $[amount]."

4. If NO bids exist (nomination with no competing bids — the nominator
   is the only bidder at their opening bid):
   → The nominator wins at their opening bid.
   → Same award process as step 3.

5. If the AuctionPlayerState somehow has no bids at all (data error
   or commissioner voided all bids):
   → Mark CLOSED_NO_BIDS.
   → Player returns to the free agent pool.
   → Notify league.
```

### Contract length declaration

Per PRD §10.10, the default contract length on auction award is 1 year. The winning owner has a configurable window (default: 48 hours from award) to declare a different contract length.

```
Contract length declaration rules:
  - Owner submits desired contractYearsTotal (within league-allowed range,
    e.g., 1–5 years).
  - The contract's baseSalary does NOT change — only the duration.
  - If the owner takes no action by the deadline, the 1-year default stands.
  - The declaration can be made via a dedicated form on the auction results
    page or via a message board post (commissioner-verified).
  - Commissioner can override the contract length at any time.

Deadline tracking:
  contractDeclarationDeadline = awardedAt + contractDeclarationWindowHours
  (default: 48 hours)

  A scheduled check (or on-access check) after the deadline confirms the
  contract. No penalty for missing the deadline — the default simply applies.
```

**Salary cap interaction:** If an owner declares a multi-year contract, this affects future cap projections (escalators over multiple years) but does NOT change the current-year cap hit. The current-year cap hit is always the `baseSalary` = winning bid amount.

---

## Conference-scoped auctions

In leagues with `playerPoolIsolation = ISOLATED_PER_CONFERENCE`, separate auctions run for each conference. Each auction:

- Contains only the franchises in that conference
- Has its own player pool (filtered by conference assignment — see [Spec_DataModel.md §4.4–4.5](../Spec_DataModel.md))
- Has its own Auction entity with `conferenceId` set
- Has its own `AUCTION_START` calendar event (or a shared event that spawns two Auctions)
- Tracks nominations, bids, and funds independently per conference

```
Isolation rules:
  - A franchise in Conference A cannot nominate or bid on a player
    assigned to Conference B's pool.
  - A player can only appear in one conference's auction.
  - If a player is not assigned to either conference (mid-season
    acquisition, custom player), the commissioner assigns them
    to a conference before the auction opens.
  - The two auctions may run simultaneously, sequentially, or at
    different times — the commissioner controls this via calendar events.
```

Per the FLAG calendar example (PRD §8.7), both conference auctions typically run simultaneously (e.g., "Auction for NFC: May 2–16" and "Auction for AFC: May 2–16").

---

## Commissioner auction controls

| Action | When available | Behavior |
|---|---|---|
| **End auction early** | Auction is OPEN | All OPEN player auctions are immediately awarded to current high bidders. Players with no bids are marked `CLOSED_NO_BIDS`. Auction status → CLOSED. |
| **Extend auction** | Auction is OPEN | Update `Auction.endsAt` to a later date. Does not affect individual player expiration clocks — only extends the window during which new nominations can be submitted. |
| **Pause auction** | Auction is OPEN (email mode only) | All expiration clocks are frozen. No new bids or nominations accepted. Useful for holidays or league disputes. Paused time does not count toward expiration. |
| **Resume auction** | Auction is PAUSED | All expiration clocks resume. Remaining time on each player's clock is recalculated: `expiresAt = now + remainingTimeWhenPaused`. |
| **Void bid** | Any time during OPEN auction | Remove a specific bid. If it was the high bid, the previous bid becomes the new high bid (or the player returns to the opening bid if no other bids exist). Expiration clock resets to `now + playerAuctionExpirationHours`. Audit logged. |
| **Reopen player auction** | After a player auction has CLOSED | Reset the AuctionPlayerState to OPEN with a new expiration clock. Previous award (if any) is reversed: RosterEntry deleted, Contract deleted, Transaction reversed. Nomination slot re-occupied. |
| **Delete auction** | SCHEDULED only (before any bids) | Remove the Auction and all associated AuctionPlayerState and Bid records. Pre-season setup cleanup only. |
| **Set franchise budget** | SCHEDULED or OPEN (when `startingFundsMode = PER_FRANCHISE`) | Override a specific franchise's starting funds. Takes effect immediately. |
| **Force-nominate player** | Auction is OPEN | Commissioner nominates a player on behalf of a franchise (or with no franchise affiliation — the player enters with `nominatedByFranchiseId = commissioner's franchise`). |

All commissioner actions create a Transaction record with `type = COMMISSIONER_ACTION` for audit trail.

---

## Interaction with other systems

### Salary cap system

When `trackSalaries = true`, the auction and salary cap systems interact in two ways:

**During the auction:** The `availableFundsReducedBy = OPEN_BIDS_PLUS_CURRENT_SALARIES` mode means existing player salaries count against auction funds. This creates a unified budget where cap room and auction dollars are the same pool.

**After the auction:** Awarded players' contracts (bid amount = base salary) are picked up by the salary cap system immediately. The cap usage for the franchise includes the new contract's salary from the moment of award.

For Redraft leagues with auction drafts where `trackSalaries = false`, the auction budget exists independently of any salary cap. The `startingFundsAmount` is a one-time allocation that has no downstream salary cap implications — it's a draft-only resource.

### Transaction system

Auction awards use the same Transaction entity as all other roster changes. The `AUCTION_AWARD` transaction type feeds the transaction feed, audit log, and (in v2) the narrative engine.

The auction does NOT use the shared validation pipeline from [Spec_Transactions.md](../transactions/Spec_Transactions.md). The auction has its own validation sequence (funds check, roster check, position limits) that is optimized for the auction context. The shared pipeline is designed for add/drop, waivers, and trades — auction bids have a different validation profile (e.g., no player lock checks, no Can't Add/Can't Drop lists, no calendar blocking checks beyond the auction's own lifecycle).

**Decision note:** The auction is its own blocking context. While an auction is OPEN, regular FCFS add/drop for players in the auction pool is blocked — those players are only available via the auction. Players NOT in the auction pool (e.g., rookies during a `VETERANS_ONLY` auction) remain available for FCFS transactions normally.

### Calendar system

The auction depends on the calendar for opening events (`AUCTION_START`) and interacts with blocking events:

- `NO_ADD_DROPS_ALLOWED` does NOT block auction bids (the auction is a separate system).
- `NO_TRADES_ALLOWED` does NOT block auction bids.
- If a `LINEUP_LOCK` event fires for a player who is mid-auction, the auction continues normally — lineup locks don't affect auction bids.

The auction IS sensitive to the season phase: auctions can only run during `OFFSEASON` or `SETUP` phases. An auction cannot open during `ACTIVE` or `POSTSEASON` (though an existing auction that started in `OFFSEASON` and spans into `ACTIVE` — unlikely but technically possible — will complete normally).

### Draft system

In Dynasty leagues, the offseason auction and rookie draft are separate events that run sequentially (typically auction first, then rookie draft). Players acquired via auction are rostered before the rookie draft begins, so they count toward roster limits during the draft.

In Redraft leagues where `initialRosterMode = AUCTION`, the auction replaces the draft entirely. No DraftPick records are generated.

---

## Inputs & outputs

### Triggers

| Trigger | Source | Action |
|---|---|---|
| Calendar event: `AUCTION_START` | Calendar system | Open auction, enable nominations |
| Commissioner: "Open auction" | Commissioner tools | Open auction early |
| Owner: nominate player | Auction UI | Create AuctionPlayerState and opening Bid |
| Owner: place bid | Auction UI | Create Bid, run proxy engine if applicable |
| Owner: update proxy max | Auction UI | Update existing Bid.maxProxyAmount |
| Expiration clock fires | Timer engine (scheduled job or lazy eval) | Award player to high bidder |
| Commissioner: end/pause/resume/void/reopen | Commissioner tools | Auction management |
| Owner: declare contract length | Auction results UI | Update Contract.contractYearsTotal |

### Outputs

| Output | Downstream consumer |
|---|---|
| AuctionPlayerState updates | Auction UI (bid board, player status, expiration countdown) |
| Bid records | Auction UI (bid history per player), bid activity feed |
| RosterEntry creation | Roster display, cap usage, lineup validation, draft validation |
| Contract creation | Cap math, salary cap reports, franchise profile, offseason rollover |
| Transaction records | Transaction feed, audit log, narrative engine (v2) |
| Notifications | In-app, email, push (per owner preference) |
| AccountingEntry (if applicable) | Accounting ledger, balance checks |

---

## Edge cases

### E1. Bid submitted at the exact moment of expiration (race condition)

**Scenario:** Player X's auction expires at 8:00:00.000pm. Owner submits a bid at 7:59:59.950pm. Server receives the request at 8:00:00.050pm.

**Behavior:** Server timestamp is authoritative (PRD §22.8). If the server processes the bid request and the current server time is past `expiresAt`, the bid is rejected: "Auction for [Player] has closed." If the server begins processing before `expiresAt` and acquires a lock, the bid is accepted and the clock resets. The system must use atomic compare-and-swap or row-level locking on `AuctionPlayerState.status` to prevent concurrent award + bid processing.

### E2. Proxy defense fails due to insufficient funds

**Scenario:** Franchise A has a proxy max of $20 on Player X (standing bid: $8). Franchise A is also winning Player Y at $12. Player Y is awarded, consuming $12. Meanwhile, Franchise B bids $15 on Player X. A's proxy should defend to $15.10, but A's available funds are now only $10.

**Behavior:** The proxy defense check runs the available funds calculation BEFORE auto-bidding. If the defense amount ($15.10) exceeds available funds ($10), the proxy does not fire. Franchise A is outbid at their current standing bid ($8). A is notified: "Your proxy bid on [Player X] could not be defended — insufficient available funds." B leads at $15.

### E3. Two player auctions expire simultaneously

**Scenario:** Player X and Player Y both expire at 8:00pm. The same franchise is the high bidder on both. Their available funds are sufficient for either but not both.

**Behavior:** The expiration processor handles one player auction at a time. The first one processed awards normally. The second one's re-validation at award time (step 3b in §Awarding) detects that the franchise can no longer afford the bid (or exceeds roster limits). The second award fails per the re-validation failure path. Processing order is deterministic (by AuctionPlayerState.id or by playerId, alphabetically) so results are reproducible.

### E4. Owner nominates a player, then gets outbid on all other auctions — now can't afford their own nomination

**Scenario:** Franchise A has $50 available. They nominate Player X at $1.00 (winning). They're also winning Player Y at $20 and Player Z at $25. Both Y and Z are outbid by other franchises, freeing $45. But then A wins a different auction for $48. Now A only has $2 available, but they're winning Player X at $1 — which is fine. No issue here.

**Behavior:** No edge case — the nomination at $1.00 is still affordable. The system recalculates available funds dynamically. The edge case only arises if a SUBSEQUENT bid on Player X by another franchise triggers a proxy defense that A can no longer afford (see E2).

### E5. `auctionForceFullRosterAtEnd` blocks a nomination

**Scenario:** Franchise has 24/25 roster spots filled, 0 winning bids, and $10 available. They try to nominate Player X at $10.

**Behavior:** The minimum reserve check: `openRosterSlots = 25 - 24 - 0 = 1`. Since the nomination fills the last slot, `minimumReserve = (1 - 1) * $0.50 = $0.00`. The $10 bid is allowed — the franchise is spending their last dollar on their last slot. But if they had 23/25 spots, `openRosterSlots = 2`, `minimumReserve = (2-1) * $0.50 = $0.50`, and `maxAllowableBid = $10.00 - $0.50 = $9.50`. A $10 bid would be rejected.

### E6. Commissioner voids the high bid — who leads now?

**Scenario:** Player X has 3 bids: A at $5 (OUTBID), B at $8 (OUTBID), C at $12 (WINNING). Commissioner voids C's bid.

**Behavior:** C's bid is marked WITHDRAWN. The system walks back to the most recent non-voided, non-withdrawn bid: B at $8. B's bid status → WINNING. AuctionPlayerState updates: `currentHighBidId = B's bid`, `currentBidAmount = $8.00`. Expiration clock resets: `expiresAt = now + playerAuctionExpirationHours`. All franchises notified: "Commissioner voided a bid on [Player]. [Franchise B] now leads at $8.00." If B also had a proxy max that was previously exceeded by C, B's proxy is irrelevant here — B's standing bid is restored to $8 and B's proxy will defend future bids normally.

### E7. Auction runs during offseason — roster limit is `rosterSpotsOffseason`

**Scenario:** Dynasty league with `rosterSpots = 53` and `rosterSpotsOffseason = 70`. Auction runs in offseason. Franchise has 68 players.

**Behavior:** The roster validation uses `rosterSpotsOffseason` (70) during the offseason phase, not `rosterSpots` (53). The franchise can acquire 2 more players via auction. When the `ROSTER_COMPLIANCE_DEADLINE` calendar event fires later, the franchise must cut down to 53 — but that's a separate system handled by [Spec_RosterManagement.md](../roster/Spec_RosterManagement.md).

### E8. Conference-scoped auction where a player has no conference assignment

**Scenario:** A custom player (added by commissioner mid-offseason) has no conference assignment. The conference-scoped auctions open.

**Behavior:** The unassigned player appears in NEITHER conference's auction pool. The system does not auto-assign. Commissioner must assign the player to a conference before they can be nominated. The auction UI can flag "X unassigned players exist — assign them to make them available." This prevents a player from accidentally being auctioned in the wrong conference.

### E9. Owner bids on a player they already roster (via trade during auction)

**Scenario:** Franchise A trades Player X to Franchise B during the offseason while the auction is running. Player X is not in the auction — they're on a roster. This is fine. But what if the auction's `auctionAvailablePlayerPool` is misconfigured or a player is dropped during the auction?

**Behavior:** A player can only be nominated if they are NOT rostered (no RosterEntry exists). If a player is dropped during the auction, they become eligible for nomination. However, the same franchise that dropped them cannot nominate or bid on them during the `droppedPlayerLockHours` window (if applicable — this depends on whether the lock applies to auction bids; see OQ2).

### E10. Multiple franchises race to nominate the same player

**Scenario:** Two owners click "Nominate" on the same player within milliseconds.

**Behavior:** The nomination process uses the unique constraint on `(auctionId, playerId)` in AuctionPlayerState. The first nomination to commit creates the record. The second nomination fails the uniqueness check and is rejected: "[Player] has already been nominated by [other Franchise]." The losing nominator's opening bid is not placed. Database-level concurrency (unique constraint or row-level locking) prevents double-nomination.

### E11. Auction closes with unclaimed nomination slots — should remaining players be auto-nominated?

**Scenario:** The auction inactivity timeout fires. Several franchises still have open nomination slots and roster spots to fill.

**Behavior:** The system does NOT auto-nominate. Franchise owners are responsible for nominating players they want. If they choose not to nominate, their roster spots remain unfilled and they can fill them via FCFS add/drop after the auction closes. The inactivity timeout is precisely about detecting that owners are *done* nominating.

### E12. Live auction — all bids on a player happen within seconds, proxy wars cascade

**Scenario:** In a live auction (1-minute expiration), three franchises place proxy bids within seconds. The proxy engine cascades: A's proxy defends against B, then C outbids A's proxy, then A increases their proxy, which auto-defends against C.

**Behavior:** Each bid submission is processed sequentially. The proxy engine runs synchronously within the bid processing transaction. There is no batching or concurrent proxy resolution — each bid is a self-contained transaction that resolves all proxy interactions before returning. The expiration clock resets after each proxy defense (because the standing bid changed), giving all bidders a fresh window to respond. In a 1-minute expiration live auction, this means rapid proxy cascades extend the clock with each resolution.

---

## Open questions

### OQ1. Should award failure cascade to the next bidder?

**Context:** When the winning bidder fails re-validation at award time (E3), the current design returns the player to the free agent pool rather than awarding to the next-highest bidder. Cascading to the next bidder would be more fair but adds complexity: the second bidder's state may also have changed, creating a recursive validation loop.

**Recommendation:** Do NOT cascade in v1. Return the player to the free agent pool. This is rare (it requires a franchise's state to change between their last bid and the expiration deadline) and the simple behavior is easier to explain to owners. If demand emerges, cascading can be added later.

### OQ2. Should `droppedPlayerLockHours` apply to auction nominations?

**Context:** If a franchise drops a player during an active auction, should that player be immediately available for nomination, or should the drop lock apply?

**Recommendation:** Apply the drop lock. The lock exists to prevent roster churning, and that rationale applies equally to auction nominations. An owner who drops a player shouldn't be able to force other owners to bid for that player immediately. After the lock expires, any franchise can nominate the player normally.

### OQ3. Should there be a `CLOSED_AWARD_FAILED` status for AuctionPlayerState?

**Context:** Currently the data model defines three statuses: `OPEN`, `CLOSED_AWARDED`, `CLOSED_NO_BIDS`. The edge case where a winning bid fails re-validation at award time (E3) doesn't fit cleanly into either `CLOSED` status.

**Recommendation:** Add `CLOSED_AWARD_FAILED` as a fourth status. This makes reporting clearer: the league can see which players' auctions didn't result in a roster move, and the commissioner can reopen those player auctions if desired. Update [Spec_DataModel.md §5.32](../Spec_DataModel.md) accordingly.

### OQ4. Should live auctions support the inactivity timeout?

**Context:** The `auctionInactivityCloseHours` timeout makes sense for email auctions (days-long events), but live auctions are typically 2–4 hour events that close via commissioner action or when all players are nominated.

**Recommendation:** Disable the inactivity timeout for live auctions by default (set to `null` when `auctionMode = LIVE`). The commissioner ends the live auction manually when the event is over. If a league wants auto-close in live mode, they can set the timeout explicitly.

### OQ5. Can trades occur during an active auction?

**Context:** The PRD doesn't explicitly address whether trades are allowed while an auction is running. In Charlie's FLAG league, the auction runs during the offseason, which is typically a period where trades ARE allowed.

**Recommendation:** Trades should be allowed during the auction. The two systems are independent — trading players who are already rostered doesn't interfere with auction bidding on free agents. However, a traded player's salary moves between franchises, which affects `availableFundsReducedBy = OPEN_BIDS_PLUS_CURRENT_SALARIES` calculations. The available funds recalculation is dynamic, so this is handled automatically.

### OQ6. Should the auction support a "nomination order" (round-robin forced nomination)?

**Context:** Some fantasy platforms require franchises to take turns nominating in a set order (like a draft, but for nominations). MFL supports this optionally. The current spec allows any franchise to nominate at any time up to their slot limit.

**Recommendation:** Not in v1. Open nomination (any franchise, any time) is simpler and more common. If demand emerges for ordered nomination, it can be added as a `nominationOrderType` setting (`OPEN` vs. `ROUND_ROBIN`) with the same nomination slot mechanics.

---

## Related buildable units

*To be populated as Level 3 docs are written.*

Anticipated units:
- `Logic_ProxyBidding.md` — proxy bid engine, cascade resolution, fund defense check
- `Logic_AvailableFunds.md` — funds computation across all three modes, minimum reserve
- `Logic_AuctionExpiration.md` — expiration clock, scheduled job, race condition handling
- `Logic_AuctionAward.md` — award process, re-validation, contract creation
- `Logic_NominationValidation.md` — nomination checks, slot management, pool filtering
- `Screen_AuctionRoom.md` — bid board, player list, funds dashboard, timer displays
- `Screen_AuctionSetup.md` — commissioner configuration before auction opens
- `Screen_AuctionResults.md` — post-auction results, contract declaration UI
- `Component_BidBoard.md` — active player auctions grid with bid amounts and expiration countdowns
- `Component_FundsMeter.md` — real-time available funds display with committed breakdown
- `Component_PlayerAuctionCard.md` — individual player auction detail with bid history
- `Component_NominationForm.md` — player search, opening bid input, proxy max input

---

**END OF SPEC**
