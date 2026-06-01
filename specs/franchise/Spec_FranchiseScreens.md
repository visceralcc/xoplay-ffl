# Franchise Screens

**Status:** Draft
**Parent:** [Spec_XOPlay_PRD.md](../Spec_XOPlay_PRD.md) §15 (Standings, Reports & Displays), §15.5 (home modules), §15.7 (Mobile) — *franchise-specific PRD section numbers to be confirmed against the PRD TOC; Navigation §4.1 / §6.1 is the authoritative screen map for this surface.*
**Related specs:** [Spec_Navigation.md](../foundation/Spec_Navigation.md) (screen map, URLs, data maps), [Spec_DesignSystem.md](../Spec_DesignSystem.md) (tokens, components, editorial↔operational bridge), [Spec_Tiers.md](../Spec_Tiers.md) (tier gating), [Spec_DataModel.md](../Spec_DataModel.md) (entities), [Spec_RosterManagement.md](../roster/Spec_RosterManagement.md), [Spec_SalaryCapAndContracts.md](../salary-cap/Spec_SalaryCapAndContracts.md), [Spec_ScoringEngine.md](../scoring/Spec_ScoringEngine.md), [Spec_Transactions.md](../transactions/Spec_Transactions.md), [Spec_CalendarAndLifecycle.md](../calendar/Spec_CalendarAndLifecycle.md), [Spec_StatsServiceConsumer.md](../foundation/Spec_StatsServiceConsumer.md)
**Last updated:** June 2026

---

## Purpose

The franchise surface is an owner's home base: the screens where a single team is viewed and managed. It spans two related contexts — **My Franchise** (the user's own team, with action controls) and **Other Franchise** (any other team, read-only) — which render the same components from the same data, differing only in whether action affordances appear.

This surface is where XO Play's two moods meet inside one navigation area. The **Franchise Home** (Overview) is editorial: a full-bleed franchise-colored masthead, spacious cards, identity-forward. The **operational** screens beneath it (Roster, Cap, Contracts, Transactions) are a Bloomberg-terminal: dense grayscale tables where the franchise color survives only as a small marker. Both are the same product because they share one type system, one color foundation, and one set of component primitives (Design System §11.4).

This spec defines *what experience each franchise screen delivers and what's on it* — the surface inventory, information hierarchy, interaction patterns, tier behavior, and data sources. It does not define pixel layout (that lives in the Level 3 `Screen_*.md` buildable units) or screen business logic (that lives in the system specs).

## PRD anchor

This spec expands the franchise/team-facing portions of the PRD into a coherent surface definition. It draws specifically on:

- **§15.5 (configurable home modules)** — the Franchise Overview's module-style composition.
- **§15.7 (mobile / above-the-fold priority)** — the per-screen mobile stacking and priority rules.
- The franchise-identity principle the Design System formalizes in **§2.3 / §8** (franchise colors as first-class identity, rendered as bold blocks).

What this spec adds beyond the PRD: it consolidates the **Navigation §6.1 per-screen data maps** and the **Wireframes** content blocks into a single surface definition, applies the Design System's editorial↔operational bridge to each screen, and resolves the owner-vs-visitor and tier-gating behavior consistently across the whole area.

## User goals

What an owner is trying to accomplish on these screens, written as outcomes:

1. **"See how my team is doing without reading a table."** A glanceable home — record, this week's matchup, cap health, recent activity — in the franchise's own colors.
2. **"Know whether my lineup is legal and locked in for this week."** Clear lineup status and a fast path to fix it before the deadline.
3. **"Manage my roster"** — decide who to start, who to drop, who to move to IR or taxi, and what each move costs.
4. **"Follow this week's matchup"** — see the head-to-head and how my players are scoring, live during game windows.
5. **"Understand my money"** (cap tiers) — how much cap room I have, what my contracts cost now and in future years, and what dropping a player would cost.
6. **"Review my team's history"** — past transactions, season records, draft history, championships.
7. **"Plan ahead"** (dynasty) — what future draft picks I hold and which were traded.
8. **"Make my franchise mine"** — set the name, logo, and colors that drive the identity treatment everywhere else.
9. **"Scout an opponent before I deal with them"** — view any other franchise's roster, cap, and history read-only, then jump straight into a trade.

## Surface inventory

Every screen and major component in the My Franchise / Other Franchise surface. Each screen here becomes a Level 3 `Screen_*.md` buildable unit. **Status** marks what already exists.

### Screens

| Screen unit | Route (Navigation §3.2) | Mood | Status |
|---|---|---|---|
| `Screen_FranchiseHome` (Overview) | `/my-team` · `/franchise/:slug` | Editorial | **Exists** — read-only Batch-5 composition built; interactive build pending |
| `Screen_RosterView` | `/my-team/roster` · `/franchise/:slug/roster` | Operational | **Exists** — read-only Batch-5 composition built (under `roster/screens/`); owner-action build pending |
| `Screen_LineupSubmission` | `/my-team/lineup` | Operational | To write |
| `Screen_Matchup` (current + historical) | `/my-team/matchup` · `/my-team/matchup/:weekNumber` · `/franchise/:slug/matchup` | Mixed (editorial header, operational scoring detail) | To write |
| `Screen_CapOverview` | `/my-team/cap` · `/franchise/:slug/cap` | Operational | To write — tier-gated |
| `Screen_ContractReport` | `/my-team/contracts` · `/franchise/:slug/contracts` | Operational | To write — tier-gated |
| `Screen_FranchiseTransactions` | `/my-team/transactions` · `/franchise/:slug/transactions` | Operational | To write |
| `Screen_FranchiseHistory` | `/my-team/history` · `/franchise/:slug/history` | Mixed | To write |
| `Screen_FuturePicks` | `/my-team/picks` | Operational | To write — tier-gated |
| `Screen_FranchiseSettings` | `/my-team/settings` | System (form) | To write — ability-gated |
| Keeper selection flow | banner on Overview → `/my-team/keepers` | Operational | To write — Keeper tier only, seasonal (see OQ2) |

### Components consumed

Drawn from the Design System inventory (§4). **Built** = a Level 3 component spec exists in `foundation/components/`.

- **Identity / editorial:** `FranchiseHeader` *(built)*, `FranchiseMark` *(built)*, `StatValue` *(built)*, `StatRow`, `MatchupCard` *(built)*, `ScoreDisplay` *(built)*, `ScoreNum` *(built)*, `CapMeter` *(built)*, `HeadlineCard`, `LiveDot` *(built)*.
- **Operational:** `DataTable` *(built)* / `RosterTable`, `PlayerRow` *(built)*, `PositionBadge` *(built)*, `InjuryIndicator` *(built)*, `Headshot` *(built)*, `SegmentControl` *(built)* (density + bucket tabs), `TransactionRow` *(built)* / `TransactionFeed`, `Label` *(built)*, `Mono` *(built)*.
- **Cap / contracts:** `ContractCard`, `CapProjection`, `DropPenaltyPreview`, `SalaryTag`.
- **Lineup:** `LineupSlot`, `LineupGrid`, `RosterBucketTabs`.
- **Layout / chrome:** `Section` *(built)*, `Stack` *(built)*, `Card` *(built)*, `PageShell` *(built)*, `FranchiseSectionNav`, `Breadcrumb`, `ActionMenu`, `Modal`, `Drawer`, `EmptyState`, `Alert`, `ConfirmDialog`, `Toast`.

## Information hierarchy

The organizing rule for the whole surface is the **editorial↔operational split** (Design System §11.4): the color treatment tells the user which mode they're in. Big franchise color blocks = editorial (Overview). All-grayscale with a small franchise marker = operational (everything else). There is no middle ground by design.

**Franchise Overview (editorial).** Identity leads. Order of priority: masthead (name, mark, owner, record) → quick-stat row (PF, PA, streak, power rank; + cap room/usage in cap tiers) → this-week matchup → roster summary (starters only) and recent activity → cap snapshot, upcoming schedule, trade bait, owner articles in the sidebar. The Overview is a *consumption* screen; it links out to the operational screens rather than embedding their full detail. Content blocks and the full mobile stacking order are defined in `Wireframes.md` §1.

**Roster (operational).** Data leads. A slim context bar (franchise marker + name + tier label + record, plus "Set Lineup" for the owner) sits above a sticky toolbar (bucket tabs Active/IR/Taxi, density toggle, position filter) above the roster table. A summary footer answers "am I compliant?" at a glance. Defined in `Wireframes.md` §2.

**Lineup.** Above-the-fold priority is the lineup itself and its lock/deadline status — on mobile this is the single most important franchise screen (Design System §2.5). Bench and recommendations are secondary.

**Matchup.** An editorial header (the two franchises, the score) over operational scoring detail (per-player point breakdown). Live treatment takes over during game windows (LiveDot, animated score changes, relative timestamps).

**Cap / Contracts / Transactions / History / Picks.** Operational tables. Primary value visible without scrolling; projections, escalators, and acquisition history are progressive (expandable rows / P3 columns per Design System §5.2).

**Per-screen above-the-fold priorities** are owned by each Level 3 screen spec; this spec only fixes the ordering principle and the mood per screen.

## Interaction patterns

Conventions that recur across the franchise surface.

**Owner vs. visitor — hide, don't disable.** `/my-team` resolves to the user's own franchise and shows action affordances; `/franchise/:slug` renders the same screen read-only with those affordances **hidden** (not greyed out), per Design System §9.2 and Navigation's `/my-team` design note. A hidden button says "this isn't your capability"; a disabled one wrongly implies "you could do this." The one affordance that *appears* on another franchise's screens is "Propose Trade," which deep-links to the Trade Builder pre-populated with that franchise as partner (Navigation §9.2).

**Ability-gated actions also hide.** Franchise abilities (`Franchise.abilities`) never hide a screen — they hide the action inside it (Navigation §11.6). Examples on this surface: `canSubmitLineup = false` → the Lineup screen shows the carried-over lineup but no Submit button; `canCustomizeFranchise = false` → Franchise Settings is read-only; `canProposeOrAcceptTrades = false` → the "Propose Trade" affordance is absent.

**Section navigation hides tier-gated tabs entirely.** The `FranchiseSectionNav` tabs (Overview / Roster / Lineup / Matchup / Cap / Contracts / Transactions / Picks / History) are removed — not greyed — when a tier doesn't include them (Navigation §8.2). A Redraft franchise shows ~5 tabs; a Dynasty franchise shows up to 9.

**Roster management actions** surface as a per-row `ActionMenu` (Drop, Move to IR, Move to Taxi, Propose Trade) plus an inline "Add Player" entry point that routes to the Add/Drop screen. Drop actions in cap tiers show a `DropPenaltyPreview` before confirming.

**Destructive / costly actions confirm.** Drop (with penalty), IR/taxi moves that change eligibility, and lineup submission near a deadline use a `ConfirmDialog` describing the consequence. Reversible UI changes prefer toast-with-undo over a pre-confirm.

**Focused tasks use overlays, not new routes.** Drop-penalty preview, keeper selection, and franchise color/logo editing open as a `Modal` or `Drawer` with explicit Cancel/Close (no history entry), per Navigation §9.4.

**Tables carry a density toggle.** Standard (44px) / Compact (32px) via `SegmentControl`, persisted per-device (Design System §5.1).

**Live treatment is automatic.** During NFL game windows the Matchup and Overview matchup card switch to live styling without user action (Design System §9.3).

## Tier variations

How Redraft / Keeper / Dynasty change this surface. This applies Tiers §6.1 to the franchise screens. The pattern throughout: **operational screens degrade columns; whole money/keeper screens hide.**

| Element | Redraft | Keeper | Dynasty |
|---|---|---|---|
| Cap / Contracts / Picks tabs | Hidden | Shown only if `trackSalaries` / `trackContracts` / `tradeFuturePicksEnabled` respectively | Always shown |
| Overview quick-stat cap fields (Cap Room, Usage %) | Hidden | Shown if `trackSalaries` | Always shown |
| Overview cap snapshot card | Hidden | Shown if `trackSalaries` | Always shown |
| Roster table salary column | Hidden | Shown if `trackSalaries` | Always shown |
| Roster table contract columns (Years, Status, Acquired Via) | Hidden | Contract Years if `trackContracts` | All shown |
| Roster summary footer cap line | Hidden | Shown if `trackSalaries` | Always shown |
| Drop action | Simple drop | Drop (penalty preview if cap active) | Drop with penalty preview |
| Taxi bucket tab | Hidden | Shown if `taxiSquadSpots > 0` | Shown if `taxiSquadSpots > 0` |
| IR bucket tab | Shown if `irSpots > 0` | Shown if `irSpots > 0` | Shown if `irSpots > 0` |
| Lineup screen | Shown (hidden entirely in **Best Ball**, any tier) | Same | Same |
| Keeper selection flow | N/A | Shown during keeper-selection window | N/A |
| Masthead tier label | `REDRAFT` | `KEEPER` | `DYNASTY · SALARY · CONTRACT` |

The Best Ball exception cuts across tiers: in a Best Ball league the Lineup screen and its nav tab do not exist for any tier (lineups are auto-optimized; Roster Management §Best Ball).

## Data dependencies

Each screen's data sources, from Navigation §6.1, mapped to the Tech Spec that owns the data. The franchise design depends on these specs being honest about what data exists.

| Screen | Primary entities | Owning / derived-by spec |
|---|---|---|
| Franchise Overview | `Franchise`, `RosterEntry[]`+`Player`, `Contract[]`, current `Matchup`, last-10 `Transaction[]`, standings position, next `CalendarEvent` | Roster Mgmt, Salary Cap, Scoring, Transactions, Calendar |
| Roster | `RosterEntry[]`+`Player`, `Contract[]`, `LineupEntry[]`, position counts vs. `League` limits, IR/taxi eligibility, `Franchise.abilities` | Roster Mgmt §4–5 |
| Lineup | `LineupEntry[]`, `RosterEntry[]`+`Player`, slot config, per-slot lock status, **player projections** | Roster Mgmt §3; projections via **Stats Service** (see OQ3) |
| Matchup | `Matchup`, both lineups+`Player` scores, `ScoringRule[]`, totals, win probability (Phase 4) | Scoring; Live Scoring (Phase 4) |
| Cap Overview | `Franchise` cap fields, `Contract[]`, per-bucket cap breakdown, dead money, cap room | Salary Cap §3 |
| Contract Report | `Contract[]` (all statuses), escalator projections (Dynasty) | Salary Cap §4 |
| Transactions | `Transaction[]` filtered to franchise, joined per-type detail | Transactions |
| History | `Season[]` records, historical `DraftPick[]`, awards, `FranchiseOwner[]` | Calendar/Lifecycle, Draft, Data Model |
| Future Picks | `DraftPick[]` where `currentFranchiseId` = this franchise AND `season > current` | Draft, Data Model |
| Settings | `Franchise` editable fields, `Franchise.abilities` (read-only display) | Data Model |

## Open questions

**OQ1 — Roster screen folder ownership.** `Screen_RosterView` lives under `roster/screens/` but renders inside the My Franchise nav area. *Recommendation:* leave the operational spec under `roster/` (its behavior is owned by Roster Management) and have this design spec reference it; do not duplicate or move it. The franchise surface owns *placement and editorial framing*; the roster feature folder owns *validation behavior*. Cross-link both directions.

**OQ2 — Keeper selection placement.** Mirrors Navigation OQ4. *Recommendation:* surface as a banner/CTA on Franchise Overview during the keeper-selection window, opening a dedicated flow at `/my-team/keepers`; do **not** add a permanent section tab. Confirm when the keeper system is specced.

**OQ3 — Stale projection source (`sportsdata.io`).** Navigation §6.1 (Lineup Submission) and the Wireframes still reference `sportsdata.io` for projections, but the architecture has moved to the NFL Stats Service (`Spec_StatsService.md`, `Spec_StatsServiceConsumer.md`). *Recommendation:* update Lineup data dependencies (and audit other specs) to read projections/stats through the Stats Service consumer, and correct Navigation §6.1. Logged rather than silently changed because it touches multiple specs.

**OQ4 — One roster screen or two (`View` vs. `Edit`).** The existing `Screen_RosterView` is a read-only composition. *Recommendation:* keep a **single** Roster screen that adds owner action affordances conditionally (the hide-don't-disable pattern), rather than a separate `Screen_RosterEdit` — consistent with the `/my-team` vs `/franchise/:slug` model. The interactive build extends the existing composition; it does not fork it.

**OQ5 — Matchup current vs. historical.** *Recommendation:* one `Screen_Matchup` screen parameterized by optional `:weekNumber` (absent = current week), not two screens. Live treatment applies only when the parameter resolves to an in-progress week.

**OQ6 — "My ledger" accounting tab.** Mirrors Navigation OQ2. Accounting is unspecced; if `accountingEnabled`, a per-franchise ledger tab likely belongs on this surface. *Recommendation:* defer until `Spec_Accounting.md` exists, then add as a tier-/flag-gated tab.

## Related buildable units

Level 3 screen specs beneath this design spec. Updated as written.

- [`Screen_FranchiseHome.md`](./screens/Screen_FranchiseHome.md) — **exists** (read-only composition); interactive build pending.
- [`Screen_RosterView.md`](../roster/screens/Screen_RosterView.md) — **exists** (read-only composition); owner-action build pending.
- `screens/Screen_LineupSubmission.md` — to write.
- `screens/Screen_Matchup.md` — to write.
- `screens/Screen_CapOverview.md` — to write (tier-gated).
- `screens/Screen_ContractReport.md` — to write (tier-gated).
- `screens/Screen_FranchiseTransactions.md` — to write.
- `screens/Screen_FranchiseHistory.md` — to write.
- `screens/Screen_FuturePicks.md` — to write (tier-gated).
- `screens/Screen_FranchiseSettings.md` — to write (ability-gated).
- `screens/Screen_KeeperSelection.md` — to write (Keeper tier, seasonal).

## Build sequence (preview)

This is a design spec, not an implementation spec, but it implies an order for writing the Level 3 screen specs and building screens. Recommended sequence (each is a small, self-contained Claude Code session):

1. **Franchise Overview — interactive.** Promote the existing composition to a live screen (real data off the fixture, deadline awareness, navigation, owner action affordances). Highest-traffic screen; anchors the editorial mood.
2. **Roster — interactive.** Promote `Screen_RosterView` to add owner actions (drop, IR/taxi, propose trade, set-lineup entry). Anchors the operational mood. **Also port the Standings config-driven column pattern to the roster table here** — render header and rows from one shared `cellStyle(col)` / column-config array (the pattern hardened on Standings, commit `07aaa78`) so header and row widths can't drift.
3. **Lineup Submission.** The most important mobile screen; depends on Roster Management §3 lock rules.
4. **Matchup** (current + historical), with the live-treatment hooks reserved for Phase 4.
5. **Cap Overview** and **Contract Report** (cap tiers).
6. **Transactions**, **History**, **Future Picks**.
7. **Franchise Settings**; **Keeper Selection** when the keeper system is specced.

## Files affected (summary)

| File / area | Change |
|---|---|
| `specs/franchise/Spec_FranchiseScreens.md` | This spec (new). |
| `specs/franchise/screens/Screen_*.md` | New Level 3 screen specs per the inventory. |
| `specs/franchise/screens/Screen_FranchiseHome.md` | Update parent link to this spec (currently notes "not yet written"). |
| `specs/roster/screens/Screen_RosterView.md` | Add cross-link to this spec as franchise-surface parent. |
| `specs/foundation/Spec_Navigation.md` | OQ3: correct §6.1 Lineup projection source from sportsdata.io → Stats Service. |
| `docs/status/BUILD_STATUS.md` | Mark Franchise Screens spec complete in Build Progress. |
| `docs/process/Structure_Map.md` | Check off the franchise Level 2 spec in the writing-order tree. |

---

**END OF SPECIFICATION**
