# XO Play — Documentation Structure Map

**This document defines the feature folder structure for the XO Play docs pyramid.** It maps every Level 2 spec and anticipated Level 3 buildable unit to its home in the file tree. Use it as the index when creating new spec files — if a doc doesn't have a home here, either add it or question whether it's needed.

**Status:** Draft
**Parent:** [Spec_XOPlay_PRD.md](../../specs/Spec_XOPlay_PRD.md), [Templates_SpecDocs.md](../../specs/Templates_SpecDocs.md)
**Last updated:** May 2026

---

## File tree overview

```
docs/
├── Spec_XOPlay_PRD.md                    ← Level 1 (the north star)
├── Spec_XOPlay_MFL_Gap_Analysis.md       ← Level 1 companion
├── Templates_SpecDocs.md                 ← This methodology reference
├── Structure_Map.md                      ← You are here
│
├── foundation/                           ← Cross-cutting specs (no single feature owns these)
│   ├── Spec_DataModel.md
│   ├── Spec_Tiers.md
│   ├── Spec_DesignSystem.md
│   ├── Spec_Navigation.md
│   ├── Spec_StatsServiceConsumer.md
│   └── Spec_MockFixture.md         ← normalized mock fixture (mirrors Data Model; feeds all screens)
│
├── scoring/
│   ├── Spec_ScoringEngine.md
│   ├── logic/
│   │   ├── Logic_RuleEvaluation.md
│   │   ├── Logic_StatCorrections.md
│   │   └── Logic_ScoreAdjustments.md
│   └── components/
│       └── Component_ScoringBreakdown.md
│
├── salary-cap/
│   ├── Spec_SalaryCapAndContracts.md
│   ├── logic/
│   │   ├── Logic_CapUsageCalc.md
│   │   ├── Logic_DropPenaltyCalc.md
│   │   ├── Logic_SalaryEscalator.md
│   │   ├── Logic_FranchiseTagValuation.md
│   │   ├── Logic_RookieSalaryScale.md
│   │   └── Logic_OffseasonRollover.md
│   └── components/
│       ├── Component_CapMeter.md
│       ├── Component_ContractCard.md
│       └── Component_CapProjection.md
│
├── transactions/
│   ├── Spec_Transactions.md
│   ├── screens/
│   │   ├── Screen_AddDrop.md
│   │   ├── Screen_WaiverClaims.md
│   │   ├── Screen_TradeBuilder.md
│   │   ├── Screen_TradeReview.md
│   │   └── Screen_TradeBait.md
│   ├── logic/
│   │   ├── Logic_TransactionValidation.md
│   │   ├── Logic_WaiverProcessing.md
│   │   ├── Logic_TradeExecution.md
│   │   └── Logic_ContractAssignment.md
│   └── components/
│       ├── Component_TradeCapPreview.md
│       ├── Component_WaiverBidForm.md
│       ├── Component_TransactionFeed.md
│       └── Component_PlayerSelector.md
│
├── draft/
│   ├── Spec_Draft.md
│   ├── screens/
│   │   ├── Screen_DraftRoom.md
│   │   ├── Screen_DraftSetup.md
│   │   └── Screen_DraftResults.md
│   ├── logic/
│   │   ├── Logic_PickGeneration.md
│   │   ├── Logic_TimerEngine.md
│   │   ├── Logic_AutoPick.md
│   │   └── Logic_DraftOrderComputation.md
│   └── components/
│       ├── Component_DraftBoard.md
│       ├── Component_DraftTimer.md
│       ├── Component_DraftList.md
│       └── Component_AvailablePlayers.md
│
├── auction/
│   ├── Spec_Auction.md
│   ├── screens/
│   │   ├── Screen_AuctionRoom.md
│   │   ├── Screen_AuctionSetup.md
│   │   └── Screen_AuctionResults.md
│   ├── logic/
│   │   ├── Logic_ProxyBidding.md
│   │   ├── Logic_AvailableFunds.md
│   │   ├── Logic_AuctionExpiration.md
│   │   ├── Logic_AuctionAward.md
│   │   └── Logic_NominationValidation.md
│   └── components/
│       ├── Component_BidBoard.md
│       ├── Component_FundsMeter.md
│       ├── Component_PlayerAuctionCard.md
│       └── Component_NominationForm.md
│
├── roster/
│   ├── Spec_RosterManagement.md
│   ├── screens/
│   │   ├── Screen_RosterView.md
│   │   ├── Screen_RosterEdit.md
│   │   ├── Screen_LineupSubmit.md
│   │   └── Screen_RosterCompliance.md
│   ├── logic/
│   │   ├── Logic_LineupValidation.md
│   │   ├── Logic_LineupCarryover.md
│   │   ├── Logic_IRTransition.md
│   │   ├── Logic_TaxiTransition.md
│   │   ├── Logic_RosterValidation.md
│   │   └── Logic_RosterCompliance.md
│   └── components/
│       ├── Component_RosterTable.md
│       ├── Component_LineupSlots.md
│       ├── Component_IRTaxiPanel.md
│       └── Component_ViolationBanner.md
│
├── franchise/
│   ├── Spec_FranchiseScreens.md
│   ├── screens/
│   │   ├── Screen_FranchiseHome.md
│   │   ├── Screen_FranchiseHistory.md
│   │   └── Screen_FranchiseSettings.md
│   └── components/
│       ├── Component_FranchiseBranding.md
│       ├── Component_RecentTransactions.md
│       └── Component_UpcomingMatchup.md
│
├── league/
│   ├── Spec_LeagueScreens.md
│   ├── screens/
│   │   ├── Screen_LeagueHome.md
│   │   ├── Screen_Standings.md
│   │   ├── Screen_Reports.md
│   │   ├── Screen_Schedule.md
│   │   ├── Screen_LeagueHistory.md
│   │   └── Screen_PlayerNews.md
│   └── components/
│       ├── Component_StandingsTable.md
│       ├── Component_MatchupChart.md
│       ├── Component_PowerRankings.md
│       ├── Component_HomePageModule.md
│       └── Component_WeekSelector.md
│
├── commissioner/
│   ├── Spec_CommissionerTools.md
│   ├── screens/
│   │   ├── Screen_LeagueSetup.md
│   │   ├── Screen_FranchiseManagement.md
│   │   ├── Screen_ScoringRuleEditor.md
│   │   ├── Screen_CalendarEditor.md
│   │   ├── Screen_CommissionerOverrides.md
│   │   └── Screen_AuditLog.md
│   ├── logic/
│   │   └── Logic_LeagueHealthCheck.md
│   └── components/
│       ├── Component_AbilitiesGrid.md
│       ├── Component_InvitationManager.md
│       └── Component_SettingsPanel.md
│
├── live-scoring/
│   ├── Spec_LiveScoring.md
│   ├── screens/
│   │   └── Screen_Gameday.md
│   ├── logic/
│   │   ├── Logic_RealtimePipeline.md
│   │   ├── Logic_WinProbability.md
│   │   └── Logic_Notifications.md
│   └── components/
│       ├── Component_LiveMatchup.md
│       ├── Component_ScoringPlay.md
│       └── Component_WinProbabilityMeter.md
│
├── calendar/
│   ├── Spec_CalendarAndLifecycle.md
│   ├── screens/
│   │   └── Screen_Calendar.md
│   ├── logic/
│   │   ├── Logic_SeasonPhaseTransitions.md
│   │   └── Logic_ScheduledEventRunner.md
│   └── components/
│       ├── Component_CalendarGrid.md
│       └── Component_EventCard.md
│
├── social/
│   ├── Spec_SocialAndCommunication.md
│   ├── screens/
│   │   ├── Screen_MessageBoard.md
│   │   ├── Screen_LeagueChat.md
│   │   └── Screen_Polls.md
│   ├── logic/
│   │   └── Logic_NotificationPreferences.md
│   └── components/
│       ├── Component_MessageThread.md
│       ├── Component_ChatWindow.md
│       └── Component_PollCard.md
│
├── accounting/
│   ├── Spec_Accounting.md
│   ├── screens/
│   │   └── Screen_AccountingLedger.md
│   ├── logic/
│   │   ├── Logic_TransactionFees.md
│   │   └── Logic_EarlyBuyIn.md
│   └── components/
│       ├── Component_LedgerTable.md
│       └── Component_BalanceSummary.md
│
├── narrative/                            ← v2, but folder exists now
│   ├── Spec_NarrativeLayer.md
│   ├── Spec_NarrativeReadiness.md        ← What v1 systems must capture for v2
│   ├── screens/
│   │   └── Screen_NewspaperView.md
│   ├── logic/
│   │   ├── Logic_ContentGeneration.md
│   │   ├── Logic_ToneSystem.md
│   │   └── Logic_ContentSafety.md
│   └── components/
│       ├── Component_HeadlineCard.md
│       ├── Component_ArticleView.md
│       └── Component_ToneSelector.md
│
└── playoffs/
    ├── Spec_Playoffs.md
    ├── screens/
    │   └── Screen_PlayoffBracket.md
    ├── logic/
    │   ├── Logic_PlayoffSeeding.md
    │   └── Logic_BracketGeneration.md
    └── components/
        ├── Component_BracketView.md
        └── Component_PlayoffMatchup.md
```

---

## Feature folder rationale

Why these folders, and not others.

### foundation/

Four specs that don't belong to any single feature but are referenced by everything:

| Spec | Why it's foundational |
|---|---|
| **Spec_DataModel.md** | Canonical entity definitions. Every Tech Spec references this for its entities rather than redefining them. Contains the full entity list, relationships, field types, and constraints. |
| **Spec_Tiers.md** | Short but load-bearing. Defines what Redraft / Keeper / Dynasty each turn on and off. Every Design Spec references this for its tier variations. |
| **Spec_DesignSystem.md** | Tokens (colors, spacing, typography), shared components, responsive patterns. Every screen and component references this. |
| **Spec_StatsServiceConsumer.md** | XO Play's contract with the standalone NFL Stats Service. Event subscriptions, player ID mapping, event handlers, data model deltas. Replaces the retired `Spec_StatsService.md`. |
| **Spec_Navigation.md** | The information architecture — what screens exist, how they connect, the global navigation model. This is the map of the UI. Every screen doc references this for where it sits in the app. |

### scoring/ vs. live-scoring/

Separate because they're different systems with different infrastructure:
- **scoring/** is the formula engine. Batch, retroactive, stateless. Built in Phase 1.
- **live-scoring/** is the real-time pipeline. Polling, WebSocket, Gameday UI. Built in Phase 5. The Stats Service Consumer (`foundation/Spec_StatsServiceConsumer.md`) defines how stat events enter XO Play; the live-scoring spec defines how computed scores reach end users.

The scoring engine doesn't know about WebSockets; the live scoring pipeline calls the scoring engine but adds real-time delivery on top.

### transactions/

One folder covering adds, drops, waivers, trades, and the shared validation layer (roster checks, cap checks, contract assignment). These are grouped because:
- They share `Logic_TransactionValidation.md` and `Logic_ContractAssignment.md`
- A trade proposal triggers the same cap-check logic as a waiver bid
- The commissioner overrides for all transaction types live in one place

If this folder gets too big later, trades could split out — but start together.

### roster/

Separate from `franchise/` because roster management is a system with logic (lineup validation, locking, IR eligibility), not just a display surface. The franchise folder shows the roster; the roster folder manages it.

### franchise/ vs. league/

Different user goals:
- **franchise/** is "my team" — the owner's home base, their roster, their history
- **league/** is "the league" — standings, reports, the schedule, league-wide news

The newspaper view (narrative differentiation) lives in `narrative/`, not `franchise/`, because it's a v2 feature with its own logic layer.

### narrative/

Exists now even though it's v2, for two reasons:
1. `Spec_NarrativeReadiness.md` documents what v1 systems must capture so narrative can be built later without retrofitting.
2. The screens and components are sketched so that franchise and league screen designs can leave space for narrative integration points.

### playoffs/

Its own folder because the bracket system is self-contained — seeding logic, bracket generation, playoff matchups. It references the scoring engine but doesn't share much else.

---

## What's NOT a folder (and why)

| Considered | Decision | Reason |
|---|---|---|
| **Players** | No folder. Player entity lives in `foundation/Spec_DataModel.md`. Player data sync lives in `foundation/Spec_StatsServiceConsumer.md`. Player-related UI (search, news, profile) is split across the features that use it. | There's no "player management" system — players are consumed by roster, transactions, draft, etc. The Stats Service Consumer handles data flow; it's not a standalone feature folder because it's foundational infrastructure. |
| **Permissions** | No folder. Abilities matrix lives in `commissioner/`. Auth lives in `foundation/Spec_DataModel.md` (User entity). | Not enough standalone logic to justify its own feature boundary. |
| **IR/Taxi** | Part of `roster/`, not its own folder. | IR and Taxi are roster bucket transitions, not independent systems. The logic and screen live in `roster/`. |
| **Standardized Variants** | No folder yet. Post-v1. When needed, it'll get a `variants/` folder. | Not in scope for v1 per PRD §21.7. |
| **Onboarding** | Part of `commissioner/Screen_LeagueSetup.md`. | League creation is the onboarding flow. It's one screen (multi-step), not its own feature. |

---

## Writing order

Not every folder needs its specs at the same time. The order follows the build sequence from PRD §24, adapted for the docs pyramid:

**Write first (foundation):**
1. ✅ `foundation/Spec_DataModel.md`
2. ✅ `foundation/Spec_Tiers.md`

**Write second (core engines — these are the hardest specs):**
3. ✅ `scoring/Spec_ScoringEngine.md`
4. ✅ `salary-cap/Spec_SalaryCapAndContracts.md`
5. ✅ `calendar/Spec_CalendarAndLifecycle.md`

**Write third (transaction systems):**
6. ✅ `transactions/Spec_Transactions.md`
7. ✅ `draft/Spec_Draft.md`
8. ✅ `auction/Spec_Auction.md`
9. ✅ `roster/Spec_RosterManagement.md`

**Write fourth (surfaces — once the systems are specced, design the UI):**
10. ✅ `foundation/Spec_Navigation.md`
11. `foundation/Spec_DesignSystem.md`
12. `franchise/Spec_FranchiseScreens.md`
13. `league/Spec_LeagueScreens.md`
14. `commissioner/Spec_CommissionerTools.md`

**Write fifth (supporting systems):**
15. `live-scoring/Spec_LiveScoring.md`
16. `social/Spec_SocialAndCommunication.md`
17. `accounting/Spec_Accounting.md`
18. `playoffs/Spec_Playoffs.md`

**Write last (v2 prep):**
19. `narrative/Spec_NarrativeReadiness.md`
20. `narrative/Spec_NarrativeLayer.md`

Level 3 docs (buildable units) get written when we're ready to build each feature, not before. The Level 2 spec must exist first.

---

## How this connects to the build

When it's time to build a feature, the workflow is:

1. **Verify the Level 2 spec is complete** (all template sections filled, edge cases listed, open questions resolved).
2. **Write the Level 3 buildable units** for the feature (screens, components, logic — following the Buildable Unit template).
3. **Hand the feature folder to Claude Code.** Point it at the folder root and say: "Build everything in this folder. The Level 2 spec is the context; the Level 3 docs are the requirements."
4. **Review what Claude Code produces** against the Done Criteria in each buildable unit.
5. **Update specs** if implementation revealed gaps or forced design changes.

The specs are living documents, not artifacts that freeze at sign-off. When a buildable unit turns out to need a new edge case or an extra component, add it to the spec and the structure map.

---

**END OF STRUCTURE MAP**
