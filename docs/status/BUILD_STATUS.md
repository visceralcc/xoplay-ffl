# XO Play — Build Status

Last updated: 2026-06-04

Feature map and completion tracker. Surfaced in the Command Center dashboard.
Legend: ✅ Complete · 🔲 Not started / in progress

## Next Steps

- **League Home (placeholder) is built, signed off, and committed** (2026-06-04). First League-area placeholder screen off Wireframes §3: `src/screens/LeagueHome.tsx`, registered in the preview (Screens → "LeagueHome", with a `neutral` toggle that clears the viewer franchise). Built blocks in §3.2 mobile stacking order: league-neutral **header** (name / season·week / tier / live indicator when games are in progress), **This Week's Matchups** (every current-week game as compact MatchupCards; the viewer's matchup lifts to the top), **Standings** (full league compact table — now rendered through the shared `DataTable` header; the viewer's row gets a subtle gray-25 tint), **Recent Activity** (last 10 league-wide transactions, newest first, each with the initiating franchise's color dot), **Top Performers** (top 5 by current-week points, league-wide, computed on read). Outbound links are **stubbed** (see Open Threads); four §3 modules deferred for missing fixture data (see Open Threads)
- **Franchise Roster (interactive) is built** — Franchise Screens build sequence step 2 done, in two commits: (A) `refactor(roster)` ported the Standings config-driven column pattern to the roster table — header + PlayerRow rows render from one tier-aware column array through one shared `cellStyle` (extracted from `PlayerRow`); (B) `feat(roster)` added owner action affordances under hide-don't-disable (slim context bar with Set Lineup / Propose Trade, per-row bucket-aware ActionMenu, Add Player, DropPenaltyPreview with the real computed penalty), bucket tabs tier-gated. Owner actions are **stubbed** callbacks (no persistence yet); the masthead was replaced with the operational context bar per Wireframes §2.1
- **Next: Lineup Submission (interactive)** — build sequence step 3: the most important mobile screen; depends on Roster Management §3 lineup-lock rules and per-player projections (Stats Service consumer, blocked on the Supabase project). Confirm scope at session start
- **Franchise Overview (interactive)** — build sequence step 1 done: `FranchiseHome` promoted to the live Overview (Wireframes §1.2 stacking, outbound links, owner/visitor hide-don't-disable, tier-gated cap). Outbound links are **stubbed** (route shell not built); three blocks deferred (see Open Threads)
- Approach pivot landed (see Key Decisions): placeholder-coverage UI on a schema-shaped data fixture — screens get stamped area by area off Navigation §6 and reviewed on data-completeness, not visual polish (Charlie owns visual design, applied later)
- Data foundation is in: a normalized fixture + derived helpers, with PlayerRow and the three composition screens (RosterView / FranchiseHome / Standings) reading it
- Continue stamping screens area by area off Navigation §6 — Franchise + League areas the foundation fixture already unlocks
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
| Franchise Roster — interactive (build seq. step 2) | ✅ |
| League Home — placeholder (Wireframes §3) | ✅ |
| Screen_Standings spec | ✅ |
| Normalized schema-shaped data fixture + derived helpers | ✅ |
| Spec_MockFixture (fixture spec) | ✅ |
| Placeholder render convention | ✅ |
| Screen coverage — area by area (Navigation §6) | 🔲 |
| AddDrop + remaining transaction screens | 🔲 |
| Franchise / League / Commissioner screen specs | 🔲 |
| Live Scoring / Social / Accounting / Playoffs specs | 🔲 |
| Narrative readiness / engine specs (v2) | 🔲 |
| XO Play Supabase project + DB tables | 🔲 |

## Key Decisions

- **Approach pivot (this session): coverage over polish.** Get every component and screen up as placeholder design with ALL metadata accounted for, rather than perfecting each screen's visuals. Visual design is Charlie's call and is applied later; the build's job is accurate, complete, correctly-shaped content. Screens are stamped area by area off the Navigation §6 per-screen data map and reviewed on data-completeness. This supersedes the earlier "lock visual decisions in the preview, then write screen specs" approach. **In short: the component library is the placeholder UI for now — we'll refine the visual design later.**
- **Match the real data shape now.** The mock fixture is normalized to mirror `Spec_DataModel.md` — one collection per entity, joined by IDs, with derived values computed by pure helpers and never stored — so the eventual Supabase swap is mechanical rather than a re-plumb. Replaces the earlier flat mock. See `foundation/Spec_MockFixture.md`.
- **Config-driven table columns, on one shared `DataTable` header.** Every table renders its header and rows from one column config; the header is drawn by the shared `DataTable` component (its `cellLayout` carries `minWidth:0` on the flex column so header and rows resolve to identical widths and can't drift), and rows render through `renderRow` off the same config. Per-row treatment (e.g. the viewer-row tint, full-width bleed) lives inside `renderRow`, not in a rebuilt table. Standardized across `Standings` and `LeagueHome` (2026-06-04); screens do not hand-roll their own header. Apply to other tables (cap, contracts, transactions) as they're touched.
- **Stats Service extraction.** NFL Stats Service is a standalone project (`nfl-stats-service`, Supabase `wshhehpkwuxbmxkyhoot`, us-east-2; 6 phases, 123 tests, backfilled 2015–2025). XO Play is a consumer, not an owner of NFL data ingestion.
- **Data Model v0.2.** Player gains `statsServicePlayerId`; `externalId` redefined as nflverse `gsis_id`; `headshotUrl` removed. Stats gain `isReconciled`.
- **No spectator/public view.** All pages require authentication.
- **Navigation: 4-layer model** (Global → League → Section → Screen). `/my-team` magic route. Tiers hide nav tabs; abilities disable actions. Mobile bottom bar: 5 slots + "More"; Gameday replaces middle tab when active.
- **Transactions: one shared 14-check pipeline** across three transaction types; cap check runs last. Counter-proposals create new Trade records.
- **Draft: state derived from picks.** Live drafts force immediate trade processing; drafted players land in ACTIVE.
- **Auction: separate validation** (no shared pipeline). Proxy bids commit at standing value, not max.
- **Roster: validate always, block selectively.** No direct IR ↔ taxi (route through ACTIVE). Best Ball skips lineup submission.

## Open Threads

- **Placeholder render convention written** (`specs/foundation/Spec_PlaceholderRenderConvention.md`, 2026-06-04) — screens are chrome-less (route/preview frame supplies `PageShell`), composed only from existing components + tokens, tables go through `DataTable`. Has a per-screen §7 checklist. Use it as the standard for every new placeholder screen.
- **Fixture covers the foundation batch only** — transactions(detail) / draft / auction / social / accounting / playoffs / notifications / audit entities get added as each area's screens are built. `computeCapUsage` sums contracts only until `SalaryAdjustment` lands.
- **Standings sort hardcodes its tiebreaker order** — `computeStandings` does not yet read `League.standingsTiebreakerChain`; the real chain-driven sort belongs in the standings logic. Keep the league's chain value matching the hardcoded order meanwhile.
- **Config-driven column pattern — now unified on `DataTable`'s header.** Originally established on Standings with a hand-rolled header + shared `cellStyle` (commit `07aaa78`) and ported to RosterView (step 2 PART A). As of 2026-06-04 the standings tables (`Standings`, `LeagueHome`) no longer hand-roll a header — they use `DataTable`'s built-in header, hardened with `minWidth:0` on the flex column so header and rows can't drift. RosterView still uses the exported `cellStyle` from `PlayerRow`; fold it onto `DataTable`'s header too when next touched, for full consistency. **Layer hardened (structural cleanup):** the trailing action column is now reserved in BOTH owner and visitor views (visitor renders an empty spacer of the same width — `ACTION_COL_WIDTH`, exported from `PlayerRow`) so toggling `isOwner` moves nothing but the affordance; the flex name column truncates with an ellipsis before the numeric block (`nameTeam` stretches + `minWidth:0`); the 16px injury badge holds a fixed slot immediately after the name; numerics are clustered via a tightened `COLUMN_GAP` (PlayerRow gained an optional `gap` prop) + trimmed widths; ~20px right-edge gutter carried inside the reserved action cell so the header fill still bleeds to the edge. Gap / widths / gutter are **PLACEHOLDER spacing — Figma supersedes**; header typography + action-menu visual design still await Figma.
- **Roster screen — deferred coverage** (not in step 2's two parts; pick up when next touching the screen or when the data/components exist): the **roster summary footer** (Wireframes §2.4 — counts vs. limits, total salary / cap room, position counts) is not built; the toolbar lacks the **density toggle** and **position filter** (Wireframes §2.2); the table uses the PlayerRow-supported column keys only — the **full Dynasty column set** (Bye, Projected, Contract Status, Acquired Via) + horizontal scroll needs a PlayerRow extension; per-row menu enforces the **no-direct-IR↔taxi** transition rule but not finer gates (injury-status IR eligibility, move cooldowns) — those need `irEligibilityMinimum` / cooldown League config added to the fixture. Tier-set alignment was verified for Dynasty only (single-league fixture); narrower sets are correct by construction (same `cellStyle`, columns omitted).
- **Stats Service Consumer build blocked** on the XO Play Supabase project existing; build Player + Stats tables with the v0.2 schema from day one.
- **Navigation open questions** — Player Profile URL placement; Accounting screen placement; Notification center panel vs. screen; Keeper selection screen placement.
- **Franchise Overview outbound links are stubbed** — `FranchiseHome` takes optional `onViewMatchup` / `onViewRoster` / `onViewCap` / `onViewActivity` / `onSetLineup` / `onProposeTrade` callbacks; the preview leaves them undefined because the franchise route shell / `FranchiseSectionNav` isn't built. Wire them when the nav shell lands.
- **Overview blocks deferred for missing fixture data** — Upcoming Schedule (fixture has no week > current), Trade Bait (no player-available flag), Owner Articles (no social/articles entity) are omitted from the Overview. Add when the fixture is extended for those areas.
- **"Power Rank" quick-stat sourced from standings position** — the Overview quick-stat "Rank" uses the computed standings rank (Nav §6.1 "standings position"); there's no separate power-ranking model yet. Wireframes §1 calls it "Power Rank".
- **Placeholder action affordances** — `FranchiseHome` ships a minimal local `ActionButton` / `LinkAction` (tokens-only) because no `Button` component is specced yet; replace when the design-system Button lands.
- **League Home outbound links are stubbed** — `LeagueHome` takes optional `onViewMatchup(matchupId)` / `onViewStandings` / `onViewActivity` callbacks; the preview leaves them undefined because the league route shell isn't built, so the affordances render but the press is a no-op. Wire them when the league nav shell lands. (Top Performers and the header carry no nav per Wireframes §3.)
- **League Home blocks deferred for missing fixture data** — four Wireframes §3 modules are omitted because no backing entity/model exists yet: **Lineup Deadline Countdown** (no lineup-lock timestamp + no "now" notion in the fixture), **League Chat Preview** (no chat entity), **Active Poll** (no poll entity), **Power Rankings** (no power-ranking model — its trend arrows need prior-week ranks; Rank is sourced from standings position as on the Overview). Also deferred: the §3.4 **Dynasty cap-room standings column** (the compact card follows block 2b's core column set; cap detail lives on the cap/standings surface) and the per-matchup **win-probability bar** (no win-probability model). Add as each area's fixture/components land. A `Screen_LeagueHome.md` spec does not exist yet — built off Wireframes §3 directly.
- **Top Performers computed inline (no helper yet)** — `LeagueHome` flattens all franchise rosters and scores each player for the current week on read (via `getRosterByFranchise` + `computePlayerPoints`), rather than a dedicated `getTopPerformers` derive helper. Promote to a helper in `derive.ts` if another screen needs the same league-wide leaderboard. Current week (11) is live, so the scores are partial — matches the live-games framing.
- **Foundation folder migration** — `Spec_DataModel.md` / `Spec_Tiers.md` / `Spec_DesignSystem.md` still at `specs/` root; consider moving into `specs/foundation/`.
- **Data Model updates pending** — add `CLOSED_AWARD_FAILED` to `AuctionPlayerState.status` (Auction §5.32); add `DRAFT` / `SUBMITTED` LineupEntry states (Roster OQ2).
