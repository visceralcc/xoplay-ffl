# XO Play — MyFantasyLeague Gap Analysis

**Companion document to Spec_XOPlay_PRD.md — automation opportunities and feature deltas**

Version 0.1 | April 2026 | Charlie Denison | XO Play (xoplay.co)

**CONFIDENTIAL**

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | Apr 2026 | Initial gap analysis. Maps MyFantasyLeague manual workflows (as enforced by FLAG Dynasty bylaws and common dynasty league conventions) to XO Play automated equivalents. Organized as a prioritized backlog with PRD cross-references. |

---

## How to read this document

This is an **engineering backlog masquerading as prose.** For each row, I identify:

1. **The MFL reality** — what a commissioner or owner must do manually today
2. **The pain** — why this is operationally expensive or error-prone
3. **The XO Play automation** — what the platform will do instead
4. **PRD reference** — the section of `Spec_XOPlay_PRD.md` that specifies the solution
5. **Priority** — how critical this gap is for the Dynasty tier MVP

**Priority scale:**
- **P0** — Must-have for Dynasty tier MVP. Without this, XO Play is not differentiated from MFL.
- **P1** — High value, should ship with Dynasty tier launch.
- **P2** — Should ship in the first year; acceptable to defer to post-launch.
- **P3** — Nice-to-have, can ship later.

---

## Part I — The Core Automation Gaps (P0)

These are the workflows where MyFantasyLeague's manual-enforcement model causes the most direct pain in Dynasty leagues. They are the backbone of the "automate the tedium" differentiation.

### 1.1 Annual salary escalator

**MFL reality.** There is a "Increase All Player Salaries by X%" commissioner tool, but it's a one-time bulk operation that must be run manually at the right moment, and it applies uniformly to every player — no per-contract granularity. Per Charlie's FLAG bylaws: "Players salaries will increase by 10% every year they are on a team's roster with a contract." The commissioner has to remember to run this, at the right time, and verify the math afterward.

**The pain.** If the commissioner forgets, runs it twice, or runs it before the rollover completes, every contract in the league is wrong. There's no undo. Players with 1 year remaining should NOT escalate (expiring contracts), but MFL's tool doesn't distinguish — the commissioner has to exclude them manually or back out the change.

**The XO Play automation.** At offseason rollover, the system automatically:
1. Decrements `contractYearsRemaining` for every active contract
2. Identifies contracts with 0 years remaining → expires them (player becomes FA)
3. Applies `salaryEscalatorPercent` (default 10%) only to contracts with years remaining
4. Logs every change to an audit record

Commissioner pushes one button, confirms, done. Per-contract escalator overrides exist for custom scenarios.

**PRD reference.** §7.7 (Annual salary escalator) and §7.14 (Offseason rollover sequence)

**Priority.** P0

---

### 1.2 Contract year decrements

**MFL reality.** The "Increase All Contract Years by N" tool exists but is a global bulk operation. To advance all contracts by -1 year at rollover, the commissioner runs this with N = -1. Same problem: manual, easily missed, and affects the "Other Contract Information" field (franchise tag tracking, acquisition year notes) unless the commissioner is careful.

**The pain.** Contracts silently drift if the decrement is skipped, run twice, or applied to the wrong field. Charlie's FLAG league tracks franchise tag year in "Other Contract Information" as freeform text — which is illegible to any automation because MFL treats it as a string.

**The XO Play automation.** Contract years are a first-class integer field on the Contract entity. Decrement happens atomically at rollover. Franchise tag state lives in its own fields (`status`, `contractStatusLabel`), not in a string. Expired contracts are identified by `contractYearsRemaining = 0`, not by parsing text.

**PRD reference.** §7.2 (Contract entity), §7.14 (Offseason rollover sequence)

**Priority.** P0

---

### 1.3 Multi-year drop penalty

**MFL reality.** MFL supports a single "drop penalty percent" setting (default 75% of salary) with an optional "multiply by years remaining" toggle. But Charlie's bylaws specify a more nuanced structure: 75% for year 1 + 33% per additional year remaining. That formula is not directly expressible in MFL's settings — the commissioner either approximates with the multiplier (which doesn't match the bylaws) or computes the correct penalty by hand and applies it via a salary adjustment.

**The pain.** Every player drop in a Dynasty league is a mini accounting exercise. For a $10 contract with 5 years left, the penalty is $20.70 (75% + 33% × 4). A busy commissioner under time pressure is going to make mistakes. Worse, owners second-guess the commissioner's math and it becomes a recurring friction point.

**The XO Play automation.** Drop penalties are computed from the exact bylaws formula:
```
dropPenalty = baseSalary × (basePercent/100)
            + baseSalary × (additionalYearPercent/100) × max(0, yearsRemaining − 1)
```
with `basePercent` and `additionalYearPercent` as league-configurable values (defaults 75% and 33%). Applied automatically on every drop; reflected in cap usage instantly; audit trail preserved.

**PRD reference.** §7.8 (Drop penalty), with worked examples matching Charlie's bylaws table exactly.

**Priority.** P0

---

### 1.4 Rookie draft salary assignment

**MFL reality.** There's no native rookie salary scale in MFL. After the rookie draft completes, the commissioner must manually enter each rookie's salary per the league's scale. In Charlie's league that's 8 rounds × 16 picks × 2 conferences = 256 individual salary entries per year, each one looked up against a table.

**The pain.** This is hours of data entry, error-prone, and has to happen immediately after the draft so owners can set their taxi/active decisions. Any mistake is discovered days later when an owner notices their rookie's salary doesn't match the scale.

**The XO Play automation.** A `RookieSalaryScale` configuration table per league. When a rookie is selected in the draft:
1. System looks up salary by round + pick position
2. Creates the Contract automatically with base salary + default contract years
3. Notifies the owner they have N hours to assign a longer contract length if desired
4. Fires a narrative event if enabled

**PRD reference.** §7.6 (Rookie salary scale), with Charlie's FLAG scale documented as a reference example.

**Priority.** P0

---

### 1.5 Franchise tag valuation

**MFL reality.** MFL has no native franchise tag feature. Commissioners implement tags entirely outside the platform:
1. At season end, commissioner manually calculates the "top 10 at position average" for each position by exporting roster data, sorting in a spreadsheet, and averaging
2. Owners post on the message board to declare which player they're tagging
3. Commissioner manually edits the tagged player's salary to the computed tag value
4. Commissioner manually edits the "Other Contract Information" field to note the tag year (e.g., "2026-Franchise Y1")
5. Next year, if the same player is re-tagged, commissioner manually applies the +25% / +30% / +35% / +40% renewal escalators

**The pain.** This is the single most labor-intensive dynasty commissioner task. A 32-team league has up to 32 tags per year. The math is recomputed every offseason because salaries change. The renewal tracking is in freeform text, so if a commissioner misreads "2026-Franchise Y1" as "Y2" the renewal escalator is wrong.

**The XO Play automation.** Franchise tags are a first-class feature:
- `franchiseTagValuationMethod` configurable (default `TOP_N_AT_POSITION_AVG`, with median/max/fixed-multiplier alternatives)
- At season end, system computes the tag value for every eligible player automatically
- Owner clicks "Tag" on a player; contract is re-signed for 1 year at the tag value
- `status` updates to `FRANCHISE_TAGGED`; renewal year tracked as a proper integer field
- Renewal escalators applied automatically on re-tag

**PRD reference.** §7.10 (Franchise tag)

**Priority.** P0

---

### 1.6 Contract length assignment for new acquisitions

**MFL reality.** Per Charlie's bylaws, an owner has 48 hours after acquiring a player (via waiver, FCFS, or auction) to assign a contract length (1–5 years) by posting on the league message board. The commissioner then edits the contract years field manually. If the owner doesn't post, the default is 1 year — but MFL doesn't automatically apply that default either; the commissioner has to notice and set it.

**The pain.** Every waiver processing day generates a dozen messages like "Eagles signing Purdy to 3 years." The commissioner reads the message board, updates each contract, and hopes they don't miss one. Owners forget to post; commissioners forget to check; contract lengths drift.

**The XO Play automation.** When a player is acquired, the owner sees an inline prompt: "Select contract length: 1 / 2 / 3 / 4 / 5 years." The selection is captured in the transaction itself — no message board post required. If the owner doesn't select within 48 hours (configurable), the system auto-applies the 1-year default and notifies everyone. Contract record is written directly.

**PRD reference.** §10.10 (Auction awarding), §11.4 (Waiver processing algorithm), and §22.12 (Rookie contract assignment deadline) for the grace window pattern.

**Priority.** P0

---

### 1.7 Early buy-in for traded future picks

**MFL reality.** Charlie's bylaws: trading a future 1st-3rd-round pick requires the trading franchise to immediately pay next season's league dues, or the trade reverses. MFL doesn't know anything about league dues; it has no link to LeagueSafe payment status within transactions. So the commissioner manually tracks which trades require buy-in, manually verifies payment via LeagueSafe's dashboard, and manually reverses trades for non-payment.

**The pain.** Easy for this to slip. A trade happens, nobody pays, and a year later everyone realizes the acquiring team shouldn't have had that pick. Reversing a year-old trade is a political disaster.

**The XO Play automation.** When a trade proposal includes a future pick in round ≤ `earlyBuyInMaxRound` (default 3), the system:
1. Flags the trade as requiring buy-in
2. On acceptance, creates a pending accounting charge for the next season's entry fee
3. Sets a deadline (configurable, default 7 days)
4. If unpaid by deadline, automatically reverses the trade and records the violation in the league calendar

**PRD reference.** §17.4 (Early buy-in for future picks), §12.8 (Future pick trade validation)

**Priority.** P0

---

### 1.8 Cap situation transparency

**MFL reality.** MFL shows each franchise's total salary and cap on the rosters report, but doesn't clearly expose:
- The impact of a proposed trade on both teams' cap situations
- The impact of a waiver bid on cap room
- The impact of a potential drop on cap (including the penalty)
- Forward-looking cap projections (what will your cap look like in 2 years?)

Owners calculate this by hand. A common pattern: export the league roster to Excel, build a spreadsheet, maintain it through the season.

**The pain.** Cap-blind decision-making. Owners get surprised by penalties, trades fall through at the last minute when one side realizes they can't absorb the contract, auction bidders accidentally blow their remaining budget on a mid-tier player.

**The XO Play automation.**
- **Trade cap preview:** every trade proposal shows both teams' cap situation before and after, including projected future seasons.
- **Waiver bid cap preview:** submitting a bid shows "if you win, your cap room will be $X."
- **Drop cap preview:** a "what if I drop this player?" button shows the penalty and the net cap change.
- **Forward cap projection:** a dedicated view shows each franchise's projected cap usage 1, 2, and 3 years out under current contracts (with escalators applied).

**PRD reference.** §7.5 (Cap usage computation), §12.7 (Trade validation), §15.4 (Cap usage report), §20.2 (Key derived values)

**Priority.** P0

---

### 1.9 Taxi squad contract lifecycle

**MFL reality.** Taxi squad support exists in MFL but the contract lifecycle is manual:
- Rookie drafted → commissioner decides if they go to taxi or active (based on owner's message board post) → edits contract field
- Taxi rookie assigned 3-year taxi contract (tracked where? In "Other Contract Info" as text)
- Promotion to active → commissioner notices the move and updates contract
- Owner posts active contract length → commissioner updates again

**The pain.** Same pattern as contract length assignment. Message-board-driven, commissioner-data-entry. With 10 taxi slots per team × 32 teams = up to 320 taxi moves per year to track.

**The XO Play automation.** Taxi is a roster bucket (§5.3) with its own contract lifecycle (§7.9):
- Rookie drafted → owner clicks "Active" or "Taxi" in the draft UI
- Taxi contract auto-created with 3-year default (configurable)
- Promotion to active → owner selects active contract length inline (1–5 years)
- All state tracked in structured fields; no message board dependency

**PRD reference.** §5.3 (Roster structure), §7.9 (Taxi squad contracts), §13 (IR & Taxi)

**Priority.** P0

---

### 1.10 "Legal tanking" lineup enforcement

**MFL reality.** Charlie's bylaws define "legal tanking" with specific rules: owner must start their best non-taxi players, must submit a full starting lineup, cannot start bye-week or injured players. If violated, the penalty escalates (warning → loss of 4th-round pick → removal). MFL has no concept of "best available" enforcement — it just accepts whatever lineup the owner submits. Commissioners manually eyeball lineups each week and compare to the owner's available players.

**The pain.** Commissioners either don't check (tanking goes unenforced) or spend hours each week reviewing 32 lineups against 32 rosters. In either case, a bad actor can intentionally start a subpar player for a week and nobody notices until the results are in.

**The XO Play automation.** An optional "Best Available Lineup Enforcement" setting that:
1. Computes the projected best lineup for each franchise (based on projections and eligibility)
2. On lineup submission, compares submitted to best-available
3. If submitted lineup is > X points lower than best available (configurable threshold, default 20%), flags the lineup for commissioner review
4. Provides a side-by-side comparison in the commissioner's review tool

This doesn't automatically override lineups — owner autonomy is preserved — but it eliminates the "I didn't notice" failure mode.

**PRD reference.** §5.7 (Roster validation), §22.6 (Dormant owner detection) for the adjacent pattern

**Priority.** P1 (not strictly required for MVP, but a differentiator)

---

## Part II — High-Value Automation (P1)

Gaps that aren't MVP-blocking but add substantial commissioner-time savings.

### 2.1 Offseason roster size transition

**MFL reality.** Charlie's bylaws allow 70-player offseason rosters vs. 53 in-season, with the transition happening at or before the auction. MFL has a single roster size setting — no seasonal variation. The commissioner must manually enforce that rosters are below 53 by the deadline, by posting warnings and, if needed, penalizing.

**The pain.** Every offseason, the commissioner chases down franchises over the limit. Owners procrastinate dropping players because drops trigger cap penalties (§1.3 above).

**The XO Play automation.** `rosterSpotsOffseason` field separate from in-season `rosterSpots`. At the league's "Roster Compliance Deadline" calendar event, the system:
1. Checks every franchise's roster count
2. Flags violations
3. Notifies owners with a countdown warning
4. At the deadline, if still over, blocks lineup submission and alerts commissioner

**PRD reference.** §7.15 (Pre-rollover and post-rollover roster rules)

**Priority.** P1

---

### 2.2 Playoff seeding tiebreaker chains

**MFL reality.** MFL supports a primary tiebreaker chain for standings but applies the same chain to both regular season standings and playoff seeding. Leagues often want different tiebreakers for playoffs (e.g., head-to-head weighted more heavily in seeding than in standings display).

**The pain.** Workarounds involve the commissioner manually overriding seedings at playoff time, which is a visible and auditable action that invites "why did you seed X above Y?" arguments.

**The XO Play automation.** Separate `playoffTiebreaker` configuration from `standingsTiebreaker` (§14.6). Playoff seeding uses its own ordered chain. Owners can see the tiebreaker rule in the settings; seedings are deterministic and transparent.

**PRD reference.** §14.6 (Ties in playoffs)

**Priority.** P1

---

### 2.3 Division realignment without schedule regeneration

**MFL reality.** If a commissioner realigns divisions mid-offseason, MFL displays a warning that the existing schedule won't reflect the new alignment. The schedule must be regenerated from a packaged schedule option, which wipes any custom adjustments the commissioner made.

**The pain.** Losing the custom schedule. Realignment is rare but when it happens, the schedule work gets thrown out.

**The XO Play automation.** Realignment detection:
1. System detects the alignment has changed
2. Prompts commissioner: "Regenerate schedule? Auto-adjust? Keep as-is (not recommended)?"
3. Auto-adjust attempts to preserve the matchup weights (how many times each pair plays) while fixing divisional/conference labels
4. Full regeneration available as fallback

**PRD reference.** §22.15 (League schedule change after divisional realignment)

**Priority.** P1

---

### 2.4 Trade "fairness" assessment

**MFL reality.** When trades go to commissioner review or league vote, there's no structured context. Voters see the names and picks and decide vibes-based. Commissioners reviewing trades make gut calls.

**The pain.** Perception of unfair commissioner decisions; uninformed voting; long forum threads debating trade value.

**The XO Play automation.** Every trade proposal auto-generates a "trade context" card:
- Current season projected points value on each side
- Cap impact on both teams (current and future years)
- Age/experience profile of players exchanged
- Draft pick value (estimated using a standard draft pick value chart)
- Recent trade comparables (other trades involving similar assets)

This doesn't make decisions — it informs them.

**PRD reference.** §12 (Trades) can be extended in v0.2 with this spec

**Priority.** P1

---

### 2.5 Automated draft pick value tracker

**MFL reality.** Owners maintain spreadsheets of traded future picks and their perceived value. MFL's interface lists picks but doesn't assess them. If you want to know "how many 1sts do the Packers have in 2027?" you count rows manually.

**The pain.** Spreadsheet dependency; owners who aren't spreadsheet-inclined lose out on information.

**The XO Play automation.** A "Future Assets" report per franchise, showing:
- All future picks owned (by season and round)
- Picks owed (traded away)
- Estimated value per pick (using standard chart)
- Net future asset score

Per-league and league-wide views available.

**PRD reference.** §9.9 (Draft pick entity), §15.4 (Report types) extended

**Priority.** P1

---

### 2.6 Notification rhythm tuning

**MFL reality.** MFL's notifications are on/off per category with limited tuning. Owners get either too many emails (everything) or too few (nothing useful).

**The pain.** Notification fatigue leads to opt-outs, which leads to missing critical events (trade proposals expiring, waiver deadlines).

**The XO Play automation.** Per-owner notification preferences with granular control:
- Roster events (injury, scoring, status)
- Matchup events (lead change, big play)
- League events (new transaction, trade proposal)
- Deadlines (lineup, waiver)

Each with channel selection (in-app / email / SMS / push) and frequency (immediate / digest / daily summary).

**PRD reference.** §18.6 (Notifications)

**Priority.** P1

---

### 2.7 Historical roster replay

**MFL reality.** Weekly roster snapshots exist in MFL but the UI for navigating historical rosters is clunky. "What did the Eagles look like in week 6 of 2022?" requires URL gymnastics.

**The pain.** Historical questions are frequent in dynasty contexts. Settling bets, analyzing past trades, writing league histories — all blocked by poor historical UX.

**The XO Play automation.** Every roster has a "View on date" feature. Pick any date or week → see the roster as it existed at that moment. Includes contracts, salaries, transactions pending at that time.

**PRD reference.** §15.4 (Rosters report with week selector), §20.3 (Event sourcing for transactions)

**Priority.** P1

---

### 2.8 Accounting ledger visibility for owners

**MFL reality.** MFL's accounting is commissioner-only. Owners see their balance but not the ledger detail — no "here's why my balance dropped by $2.50 last week."

**The pain.** Opaque balances lead to accounting disputes. "Why did I get charged for that trade?"

**The XO Play automation.** Every owner sees their own accounting ledger in full — every credit, every debit, with reason and reference transaction. Transparency by default.

**PRD reference.** §17.3 (Accounting ledger)

**Priority.** P1

---

### 2.9 League-wide consistency validation

**MFL reality.** There's no "are my league rules internally consistent?" check. A commissioner can accidentally set the salary cap to $200, give each franchise $250 in auction funds, and not realize the incoherence until the auction breaks.

**The pain.** Rule inconsistencies surface late, under time pressure, in front of owners.

**The XO Play automation.** A "League health check" tool the commissioner can run anytime that flags:
- Starting lineup sums that don't match `totalStarters`
- Salary cap below sum of minimum player salaries × roster size
- Auction funds inconsistent with cap
- Calendar events that conflict (e.g., draft scheduled during a "no transactions" window)
- Missing payouts for a defined prize pool
- Scoring rules with overlapping position scope on the same stat type

Runs automatically on key save actions and flags issues pre-commit.

**PRD reference.** §3.5 (League creation flow), §5.7 (Roster validation)

**Priority.** P1

---

### 2.10 Onboarding defaults per tier

**MFL reality.** Every league starts the same way regardless of format. A Redraft commissioner and a Dynasty commissioner see the same ~50 setup screens. This is where Charlie's "too complex to set up" pain originates.

**The pain.** New commissioners give up before finishing setup. Veterans create their own setup shortcuts.

**The XO Play automation.** Tier-aware onboarding:
- Redraft sees 6 setup screens
- Keeper sees 8 setup screens
- Dynasty sees 14 setup screens

Each screen has sensible defaults for the tier. A Dynasty commissioner doesn't see "Track salaries? Yes/No" — salaries are assumed yes because the tier implies it.

**PRD reference.** §3.4 (Tier-driven field activation), §3.5 (League creation flow)

**Priority.** P1

---

## Part III — Quality-of-Life Improvements (P2)

Not differentiators, but they add up to a meaningfully better experience.

### 3.1 Custom player merge with feed player

**MFL reality.** Custom players remain separate from the feed forever. If a commissioner created "Rookie X" before the feed added them, and sportsdata.io later adds them with an official ID, the two records exist in parallel and the owner's stats don't update.

**The XO Play automation.** Automated merge suggestions when a custom player matches a feed addition. Commissioner confirms; records merge; stats flow.

**PRD reference.** §5.2 (Custom players), §22.17 (Custom player merge)

**Priority.** P2

---

### 3.2 Mobile-optimized commissioner tools

**MFL reality.** Commissioner tools are desktop-only in practice. Mobile usage is read-only for administrative actions.

**The XO Play automation.** Every commissioner action works on mobile. Key workflows (review trade, process waiver exception, adjust cap) are specifically mobile-optimized.

**PRD reference.** §15.7 (Mobile considerations)

**Priority.** P2

---

### 3.3 Bulk player news subscriptions

**MFL reality.** News is delivered league-wide or not at all.

**The XO Play automation.** Owners subscribe to news for specific players on their roster + watchlist. Personal news digest delivered per preference.

**PRD reference.** §18.6 (Notifications)

**Priority.** P2

---

### 3.4 Trade bait intelligent matching

**MFL reality.** Trade bait is a text field — owner types "Looking for RB depth, offering WR Y." Other owners scan manually.

**The XO Play automation.** Structured trade bait with position tags + asset tags. System surfaces suggested matches ("Eagles are offering an RB that matches your WR request").

**PRD reference.** §12.10 (Trade bait)

**Priority.** P2

---

### 3.5 Dormant owner auto-management

**MFL reality.** Dormant owners mean dead lineups every week. Commissioner manually submits a reasonable lineup.

**The XO Play automation.** Dormancy detection triggers auto-lineup submission (best available per projections) after N days of inactivity. Commissioner gets a summary each week of auto-managed franchises.

**PRD reference.** §22.6 (Dormant owner detection)

**Priority.** P2

---

### 3.6 Franchise branding consistency across history

**MFL reality.** When a franchise renames ("Seahawks" → "Vancouver Volcanoes"), history may or may not link cleanly across name changes depending on commissioner configuration.

**The XO Play automation.** Franchise ID is the invariant; name is an attribute with history. Historical views always show the franchise's name as-of that date.

**PRD reference.** §16.8 (Franchise lineage)

**Priority.** P2

---

### 3.7 Structured league bylaws document

**MFL reality.** Bylaws live in a free-text league rules section. If a commissioner wants to change a rule, they edit the document — there's no link between the text and the system's actual enforcement.

**The XO Play automation.** League bylaws are a structured document (sections: roster, transactions, salary cap, playoffs, etc.) with each section optionally linked to a specific system setting. Changing the underlying setting shows a diff against the bylaws text, prompting the commissioner to update the bylaws accordingly.

**PRD reference.** §16.6 (Custom message blocks) extended with a new "bylaws" document type

**Priority.** P2

---

### 3.8 Score adjustment history

**MFL reality.** Manual score adjustments are applied but their history is opaque. If the commissioner awarded 5 bonus points for winning the league pool, there's no easy way to find that adjustment 3 months later.

**The XO Play automation.** All adjustments in a searchable ledger with reason, author, and timestamp. Filterable and exportable.

**PRD reference.** §6.6 (Score adjustments)

**Priority.** P2

---

### 3.9 Matchup chart readability

**MFL reality.** The weekly matchup chart shows games in order but doesn't indicate importance (playoff implications, rivalry, etc.).

**The XO Play automation.** Matchups tagged with context (playoff implications, rivalry, first meeting, last meeting before trade deadline). Visual indicators in the chart.

**PRD reference.** §15.5 (Matchup Chart module)

**Priority.** P2

---

### 3.10 Commissioner action audit log

**MFL reality.** Commissioner actions are logged but the audit interface is minimal. Finding "who made what change when" can require support tickets.

**The XO Play automation.** Full commissioner action audit log visible to all co-commissioners (and optionally to all owners). Every setting change, every override, every adjustment.

**PRD reference.** §20.3 (Event sourcing for transactions) extended to all commissioner actions

**Priority.** P2

---

## Part IV — Narrative & Social Gaps (mostly v2 — Narrative layer)

These are the gaps where XO Play's narrative layer provides the answer. Listed here for completeness; implementation is v2 per PRD §19.8.

### 4.1 Weekly matchup recap

**MFL reality.** No native recap generation. Some commissioners write recaps manually; most leagues have nothing.

**The XO Play automation.** AI-generated weekly recap per league, with owner-level detail (what happened to each team) and league-level narrative (standings implications, playoff race).

**PRD reference.** §19.2 (Narrative content types)

**Priority.** P1 for narrative launch (v2)

---

### 4.2 Rivalry tracking

**MFL reality.** "Division rivalry" is inherent in the schedule but there's no tracking of memorable past matchups, historical head-to-head records, or rivalry lore.

**The XO Play automation.** Rivalry data is tracked automatically from cross-season records. Matchup previews and recaps reference rivalry context. League home page surfaces "Top rivalries this week."

**PRD reference.** §19.5 (Narrative data requirements)

**Priority.** P1 for narrative launch (v2)

---

### 4.3 Player storyline generation

**MFL reality.** Player news is sourced from external providers (Fantasy Sharks, etc.) and is generic NFL news, not league-contextual.

**The XO Play automation.** Player storylines that integrate league context ("Chase is having his best season for the Seahawks since his 2023 acquisition; contract expires after 2026").

**PRD reference.** §19.2 (Narrative content types)

**Priority.** P2 for narrative launch (v2)

---

### 4.4 Trade coverage articles

**MFL reality.** Trades appear as text lines in the transaction log. Major trades get message board discussion but no formal write-up.

**The XO Play automation.** Every trade above a significance threshold generates a narrative article: context for both teams, why the move makes sense, historical comparables.

**PRD reference.** §19.2 (Narrative content types)

**Priority.** P2 for narrative launch (v2)

---

### 4.5 Franchise-specific newspapers

**MFL reality.** No such thing. Each franchise sees the same league home page.

**The XO Play automation.** Each franchise has its own newspaper page, with content tailored to that franchise's players, matchups, rivalries, and recent transactions. Tone customizable per franchise.

**PRD reference.** §19.3 (Narrative tone system), §19.6 (Delivery surfaces)

**Priority.** P0 for narrative launch (v2 — this IS the narrative differentiation)

---

### 4.6 Draft and auction coverage

**MFL reality.** Draft results are a table. No narrative summary.

**The XO Play automation.** Post-draft and post-auction articles: grades per franchise, best value picks, reaches, narrative arcs ("Rebuilding Panthers locked in 3 high picks; now comes the hard part").

**PRD reference.** §19.2 (Narrative content types)

**Priority.** P2 for narrative launch (v2)

---

### 4.7 Power rankings with commentary

**MFL reality.** Static standings table. No analysis.

**The XO Play automation.** Weekly power rankings article with commentary: why each team moved up or down, key drivers, outlook.

**PRD reference.** §19.2 (Narrative content types)

**Priority.** P2 for narrative launch (v2)

---

## Part V — Architectural Differentiation (foundational)

These aren't feature gaps per se — they're differences in how the systems are built that cascade into every user experience.

### 5.1 Data-driven scoring vs. form-driven scoring

**MFL reality.** Scoring rules are configured through a series of forms with dozens of fields. Adding a new scoring variant requires the commissioner to fill in the form correctly.

**The XO Play approach.** Scoring rules are first-class database entities. Presets exist as a starting point. Commissioners customize by editing rules, not filling forms. New rules can be added without form changes.

**PRD reference.** §6.1 (Scoring engine design principle)

---

### 5.2 Tier as configuration, not three products

**MFL reality.** Every league is configurable to be anything, which means every setup screen has to handle every tier's needs. Simple leagues see too many options; complex leagues feel under-supported.

**The XO Play approach.** Three explicit tiers with tier-aware defaults and UI. Same underlying data model; different active surfaces.

**PRD reference.** §1.1 (Design principles), §2 (Tier model)

---

### 5.3 Event sourcing for auditability

**MFL reality.** Transactions are stored as final states. Undoing is destructive.

**The XO Play approach.** Transactions are append-only. Every state change is preserved. Reversals create compensating transactions, not mutations. Historical queries ("what did the roster look like on X date?") are trivial.

**PRD reference.** §20.3 (Event sourcing for transactions)

---

### 5.4 Real-time as a first-class concern

**MFL reality.** Stats update on a polling schedule with visible lag. No live matchup notifications.

**The XO Play approach.** Live scoring pipeline with WebSocket push. Gameday UI updates in seconds. Notifications for key events.

**PRD reference.** §18 (Live scoring & real-time data)

---

### 5.5 Mobile parity

**MFL reality.** Desktop-first, mobile adapted. Key flows (draft, commissioner tools) are difficult or broken on mobile.

**The XO Play approach.** Mobile parity from day one. Every workflow designed for both.

**PRD reference.** §15.7 (Mobile considerations)

---

## Summary: prioritized implementation backlog

Rolled up:

| Priority | Count | Theme |
|---|---|---|
| P0 | 10 | Core Dynasty automation that replaces MFL manual workflows |
| P1 | 10 | Quality-of-life wins that meaningfully reduce commissioner time |
| P2 | 10 | Polish and consistency improvements |
| v2 Narrative | 7 | Editorial/narrative differentiation (separate launch) |
| Architectural | 5 | Foundational differences (realized across many features) |

**The P0 list is the "Dynasty MVP" checklist.** If XO Play ships with all ten P0 items plus the foundational architectural choices, it meaningfully beats MyFantasyLeague for dynasty leagues even without the narrative layer. The narrative layer then compounds that advantage in v2.

**The P1 list is the "first-year roadmap"** after launch. These are where XO Play starts pulling away decisively.

**The P2 list is the "polish" backlog** that can ship opportunistically.

---

**END OF GAP ANALYSIS**
