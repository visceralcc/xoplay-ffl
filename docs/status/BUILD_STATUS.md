# XO Play — Build Status

Last updated: 2026-06-01

Feature map and completion tracker. Surfaced in the Command Center dashboard.
Legend: ✅ Complete · 🔲 Not started / in progress

## Next Steps

- **Franchise Overview (interactive) is built** — Franchise Screens build sequence step 1 done: `FranchiseHome` promoted from read-only composition to the live Overview (Wireframes §1.2 stacking, outbound links, owner/visitor hide-don't-disable, tier-gated cap). Outbound links are **stubbed** (route shell not built); three blocks deferred (see Open Threads)
- **Next: Franchise Roster (interactive)** — build sequence step 2: promote `RosterView` to add owner actions (drop, IR/taxi, propose trade, set-lineup entry) AND port the Standings config-driven column pattern to the roster table
- Approach pivot landed (see Key Decisions): placeholder-coverage UI on a schema-shaped data fixture — screens get stamped area by area off Navigation §6 and reviewed on data-completeness, not visual polish (Charlie owns visual design, applied later)
- Data foundation is in: a normalized fixture + derived helpers, with PlayerRow and the three composition screens (RosterView / FranchiseHome / Standings) reading it
- Write the one-page placeholder render convention so screen builds stop making per-screen design micro-decisions
- Then continue stamping screens area by area off Navigation §6 — Franchise + League areas the foundation fixture already unlocks
- Extend the fixture per area (transactions / draft / auction / social / accounting / playoffs) as each area's screens are built
- Then wire the XO Play Supabase project + tables — the fixture is shaped so this swap is mechanical

## Build Progress

| System | Status |
|---|---|
| PRD / MFL Gap Analysis (Level 1) | ✅ |
| Data Model v0.2 / Tiers / Templates / Structure Map | ✅ |
| Design System — structural spec | ✅ |
| Scoring / Salary Cap / Calendar (core engines) | ✅ |
| Transactions / Draft / Auction / Roster Management | ✅ |
| Stats Service Consumer spec | ✅ |
| Navigation spec | ✅ |
| Expo scaffold + fonts + tokens | ✅ |
| Component preview system | ✅ |
| Component Batches 1–4 + FranchiseHeader / CapMeter / TransactionRow | ✅ |
| Composition screens — RosterView / FranchiseHome / Standings | ✅ |
| Franchise Overview — interactive (build seq. step 1) | ✅ |
| Screen_Standings spec | ✅ |
| Normalized schema-shaped data fixture + derived helpers | ✅ |
| Spec_MockFixture (fixture spec) | ✅ |
| Placeholder render convention | 🔲 |
| Screen coverage — area by area (Navigation §6) | 🔲 |
| AddDrop + remaining transaction screens | 🔲 |
| Franchise / League / Commissioner screen specs | 🔲 |
| Live Scoring / Social / Accounting / Playoffs specs | 🔲 |
| Narrative readiness / engine specs (v2) | 🔲 |
| XO Play Supabase project + DB tables | 🔲 |

## Key Decisions

- **Approach pivot (this session): coverage over polish.** Get every component and screen up as placeholder design with ALL metadata accounted for, rather than perfecting each screen's visuals. Visual design is Charlie's call and is applied later; the build's job is accurate, complete, correctly-shaped content. Screens are stamped area by area off the Navigation §6 per-screen data map and reviewed on data-completeness. This supersedes the earlier "lock visual decisions in the preview, then write screen specs" approach. **In short: the component library is the placeholder UI for now — we'll refine the visual design later.**
- **Match the real data shape now.** The mock fixture is normalized to mirror `Spec_DataModel.md` — one collection per entity, joined by IDs, with derived values computed by pure helpers and never stored — so the eventual Supabase swap is mechanical rather than a re-plumb. Replaces the earlier flat mock. See `foundation/Spec_MockFixture.md`.
- **Config-driven table columns.** A table's header and rows render from one column config through one shared layout function, so headers can't drift out of alignment and widths are tunable in a single commented block (established on Standings; extend to other tables).
- **Stats Service extraction.** NFL Stats Service is a standalone project (`nfl-stats-service`, Supabase `wshhehpkwuxbmxkyhoot`, us-east-2; 6 phases, 123 tests, backfilled 2015–2025). XO Play is a consumer, not an owner of NFL data ingestion.
- **Data Model v0.2.** Player gains `statsServicePlayerId`; `externalId` redefined as nflverse `gsis_id`; `headshotUrl` removed. Stats gain `isReconciled`.
- **No spectator/public view.** All pages require authentication.
- **Navigation: 4-layer model** (Global → League → Section → Screen). `/my-team` magic route. Tiers hide nav tabs; abilities disable actions. Mobile bottom bar: 5 slots + "More"; Gameday replaces middle tab when active.
- **Transactions: one shared 14-check pipeline** across three transaction types; cap check runs last. Counter-proposals create new Trade records.
- **Draft: state derived from picks.** Live drafts force immediate trade processing; drafted players land in ACTIVE.
- **Auction: separate validation** (no shared pipeline). Proxy bids commit at standing value, not max.
- **Roster: validate always, block selectively.** No direct IR ↔ taxi (route through ACTIVE). Best Ball skips lineup submission.

## Open Threads

- **Placeholder render convention not yet written** — needed before stamping screens area by area so builds don't re-litigate per-screen design.
- **Fixture covers the foundation batch only** — transactions(detail) / draft / auction / social / accounting / playoffs / notifications / audit entities get added as each area's screens are built. `computeCapUsage` sums contracts only until `SalaryAdjustment` lands.
- **Standings sort hardcodes its tiebreaker order** — `computeStandings` does not yet read `League.standingsTiebreakerChain`; the real chain-driven sort belongs in the standings logic. Keep the league's chain value matching the hardcoded order meanwhile.
- **Config-driven column pattern** established on Standings (shared `cellStyle` driving both header and rows; commit `07aaa78`). Porting it to the RosterView table is **folded into the Franchise Roster screen build** (Franchise Screens build sequence step 2), not a standalone task. Apply to other tables as they're next touched.
- **Stats Service Consumer build blocked** on the XO Play Supabase project existing; build Player + Stats tables with the v0.2 schema from day one.
- **Navigation open questions** — Player Profile URL placement; Accounting screen placement; Notification center panel vs. screen; Keeper selection screen placement.
- **Franchise Overview outbound links are stubbed** — `FranchiseHome` takes optional `onViewMatchup` / `onViewRoster` / `onViewCap` / `onViewActivity` / `onSetLineup` / `onProposeTrade` callbacks; the preview leaves them undefined because the franchise route shell / `FranchiseSectionNav` isn't built. Wire them when the nav shell lands.
- **Overview blocks deferred for missing fixture data** — Upcoming Schedule (fixture has no week > current), Trade Bait (no player-available flag), Owner Articles (no social/articles entity) are omitted from the Overview. Add when the fixture is extended for those areas.
- **"Power Rank" quick-stat sourced from standings position** — the Overview quick-stat "Rank" uses the computed standings rank (Nav §6.1 "standings position"); there's no separate power-ranking model yet. Wireframes §1 calls it "Power Rank".
- **Placeholder action affordances** — `FranchiseHome` ships a minimal local `ActionButton` / `LinkAction` (tokens-only) because no `Button` component is specced yet; replace when the design-system Button lands.
- **Foundation folder migration** — `Spec_DataModel.md` / `Spec_Tiers.md` / `Spec_DesignSystem.md` still at `specs/` root; consider moving into `specs/foundation/`.
- **Data Model updates pending** — add `CLOSED_AWARD_FAILED` to `AuctionPlayerState.status` (Auction §5.32); add `DRAFT` / `SUBMITTED` LineupEntry states (Roster OQ2).
