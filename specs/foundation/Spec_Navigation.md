# XO Play — Navigation & Information Architecture Specification

**UX Specification**

Version 0.1 | May 2026 | Claude | XO Play

**CONFIDENTIAL**

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | May 2026 | Initial draft. Full sitemap, navigation hierarchy, URL structure, per-screen data map, role-based visibility, mobile patterns. |

---

## 1. Overview

This spec defines the information architecture of XO Play: what screens exist, how they're organized, how users navigate between them, and what data each screen needs. It is the map of the UI — every future screen spec references this document for where it sits in the app.

**Design principle: league-first, franchise-focused.** The navigation model assumes a user's primary intent is always tied to a specific league and franchise. Every session begins by resolving "which league?" and then defaults to "my franchise in that league." From there, the user can explore league-wide surfaces or drill into other franchises. This means the app never presents a league-agnostic home — the global layer exists only to choose a league.

**Who uses this:** Every screen spec, component spec, and buildable unit references this document for navigation placement, URL patterns, and breadcrumb context. Developers reference it for route definitions and data-fetching requirements.

**What this spec does NOT cover:**

- Visual design of navigation components — that's `Spec_DesignSystem.md` §4.10
- Screen layout and content design — those are per-feature screen specs (e.g., `Screen_FranchiseHome.md`)
- Business logic for any screen — that's in the system specs (Scoring, Transactions, etc.)
- Authentication flow (login, signup, password reset) — treated as a pre-navigation concern; this spec assumes the user is authenticated
- Spectator / public views — all pages require authentication; there is no public-facing layer

---

## 2. Navigation Hierarchy

XO Play uses a four-layer navigation model. Each layer narrows context from global to screen-specific.

### 2.1 Layer model

```
Layer 0 — Global          "Which league?"
Layer 1 — League           "What area of this league?"
Layer 2 — Section          "What part of this area?"
Layer 3 — Screen           "What am I looking at?"
```

**Layer 0 — Global.** The outermost shell. Contains the league switcher, user account menu, and notification center. Visible on every page. Resolves the user to a single league context. Maps to the `GlobalNav` component.

**Layer 1 — League.** The primary navigation within a league. Surfaces the major areas: My Franchise, League, Transactions, Draft/Auction, Social, Commissioner (if applicable). Maps to the `LeagueNav` component. This is the main menu — sidebar on desktop, bottom tabs or hamburger on mobile.

**Layer 2 — Section.** Sub-navigation within a major area. For example, within "My Franchise," section tabs split into Overview / Roster / Matchup / Cap / Transactions / History. Maps to `FranchiseSectionNav`, `TabBar`, or in-page tabs depending on the area. Not every Layer 1 area has a Layer 2 — some go directly to a screen.

**Layer 3 — Screen.** The actual page content. Each screen has a unique URL, a defined data requirement, and a place in the breadcrumb trail. Screens may contain sub-views (e.g., a roster screen with Active/IR/Taxi segment control), but sub-views are not separate routes — they're in-page state.

### 2.2 How the layers nest

```
GlobalNav (persistent)
└── LeagueNav (persistent within league context)
    ├── My Franchise
    │   └── FranchiseSectionNav (section tabs)
    │       ├── Overview (screen)
    │       ├── Roster (screen)
    │       ├── Matchup (screen)
    │       ├── Cap (screen, tier-gated)
    │       ├── Transactions (screen)
    │       └── History (screen)
    ├── League
    │   └── Section tabs
    │       ├── Home (screen)
    │       ├── Standings (screen)
    │       ├── Schedule (screen)
    │       ├── Reports (screen, with sub-filters)
    │       ├── Players (screen)
    │       └── History (screen)
    ├── Transactions
    │   └── Section tabs
    │       ├── Add/Drop (screen)
    │       ├── Waivers (screen)
    │       ├── Trades (screen)
    │       └── Trade Bait (screen)
    ├── Draft / Auction (contextual — shows whichever is active)
    │   └── Draft Room or Auction Room (screen)
    ├── Social
    │   └── Section tabs
    │       ├── Message Board (screen)
    │       ├── Chat (screen)
    │       ├── Polls (screen)
    │       └── Articles (screen)
    └── Commissioner (role-gated)
        └── Section tabs
            ├── Settings (screen group)
            ├── Franchises (screen)
            ├── Calendar (screen)
            ├── Overrides (screen)
            └── Audit Log (screen)
```

### 2.3 Context persistence

When a user switches between Layer 1 areas, the app remembers the last-visited screen within each area for that session. For example, if a user is on the Roster screen under My Franchise, switches to League > Standings, then switches back to My Franchise, they return to Roster — not the Overview default.

This is session-only memory, not persisted across sessions. On fresh login, each area defaults to its primary screen (see §4 for defaults).

---

## 3. URL Structure

URLs are human-readable, bookmarkable, and shareable. They use entity slugs (not UUIDs) for readability.

### 3.1 URL pattern

```
/:leagueSlug/:area/:section/:detail?
```

The `leagueSlug` is always present in the URL once a league context is established. This means every page within a league is independently addressable and shareable.

### 3.2 Complete URL map

#### Global (no league context)

| URL | Screen | Notes |
|-----|--------|-------|
| `/` | League selector | Redirects to default league if user has exactly one |
| `/account` | Account settings | Email, password, timezone, display name |
| `/account/notifications` | Notification preferences | Global defaults |
| `/join/:inviteCode` | Invitation acceptance | Resolves invite, creates FranchiseOwner |

#### My Franchise

| URL | Screen | Notes |
|-----|--------|-------|
| `/:leagueSlug/my-team` | Franchise Overview | Default landing page for a league |
| `/:leagueSlug/my-team/roster` | Roster Management | Active/IR/Taxi via segment control (in-page state, not URL) |
| `/:leagueSlug/my-team/lineup` | Lineup Submission | Current week lineup editor |
| `/:leagueSlug/my-team/matchup` | Current Matchup | This week's head-to-head or points view |
| `/:leagueSlug/my-team/matchup/:weekNumber` | Historical Matchup | View a past week's matchup |
| `/:leagueSlug/my-team/cap` | Salary Cap Overview | Tier-gated: Dynasty always, Keeper if `trackSalaries` |
| `/:leagueSlug/my-team/contracts` | Contract Report | Tier-gated: Dynasty always, Keeper if `trackContracts` |
| `/:leagueSlug/my-team/transactions` | My Transaction History | Filtered to this franchise |
| `/:leagueSlug/my-team/history` | Franchise History | Season-over-season record, awards, draft history |
| `/:leagueSlug/my-team/picks` | Future Picks Inventory | Tier-gated: Dynasty always, Keeper if `tradeFuturePicksEnabled` |
| `/:leagueSlug/my-team/settings` | Franchise Settings | Name, logo, colors (ability-gated) |

#### Other Franchise (viewing someone else's team)

| URL | Screen | Notes |
|-----|--------|-------|
| `/:leagueSlug/franchise/:franchiseSlug` | Franchise Overview | Read-only version of another team |
| `/:leagueSlug/franchise/:franchiseSlug/roster` | Franchise Roster | Read-only |
| `/:leagueSlug/franchise/:franchiseSlug/matchup` | Franchise Matchup | Read-only |
| `/:leagueSlug/franchise/:franchiseSlug/cap` | Franchise Cap | Read-only, tier-gated |
| `/:leagueSlug/franchise/:franchiseSlug/contracts` | Franchise Contracts | Read-only, tier-gated |
| `/:leagueSlug/franchise/:franchiseSlug/transactions` | Franchise Transactions | Read-only |
| `/:leagueSlug/franchise/:franchiseSlug/history` | Franchise History | Read-only |

**Design note.** "My Franchise" (`/my-team`) and "Other Franchise" (`/franchise/:slug`) render the same screen components, but `/my-team` includes action controls (edit lineup, propose trade, manage IR) while `/franchise/:slug` is read-only. The router resolves `/my-team` to the current user's franchise slug internally.

#### League

| URL | Screen | Notes |
|-----|--------|-------|
| `/:leagueSlug/league` | League Home | Configurable module grid (PRD §15.5) |
| `/:leagueSlug/league/standings` | Standings | With VP, division, conference filters |
| `/:leagueSlug/league/schedule` | Schedule | By week or by franchise view |
| `/:leagueSlug/league/schedule/:weekNumber` | Week Detail | Single week schedule view |
| `/:leagueSlug/league/reports` | Reports Hub | Landing page linking to report types |
| `/:leagueSlug/league/reports/rosters` | Rosters Report | All franchises, all players |
| `/:leagueSlug/league/reports/transactions` | Transactions Report | League-wide transaction history |
| `/:leagueSlug/league/reports/top-performers` | Top Performers | Weekly and season leaderboards |
| `/:leagueSlug/league/reports/power-rankings` | Power Rankings | XO Play formula |
| `/:leagueSlug/league/reports/cap-usage` | Cap Usage Report | Tier-gated: Dynasty, Keeper if cap active |
| `/:leagueSlug/league/reports/contracts` | Contract Report | Tier-gated |
| `/:leagueSlug/league/reports/draft-results` | Draft Results | Per §9.11 of PRD |
| `/:leagueSlug/league/reports/auction-results` | Auction Results | Per-player bid history |
| `/:leagueSlug/league/reports/locked-players` | Locked Players | Recently dropped, with unlock time |
| `/:leagueSlug/league/players` | Player Directory | Search, filter, sort all NFL players |
| `/:leagueSlug/league/players/:playerId` | Player Profile | Stats, ownership, news, contract |
| `/:leagueSlug/league/playoffs` | Playoff Bracket | When bracket exists |
| `/:leagueSlug/league/history` | League History | Champions, records, historical standings |
| `/:leagueSlug/league/calendar` | League Calendar | Visual calendar of all events |

#### Transactions

| URL | Screen | Notes |
|-----|--------|-------|
| `/:leagueSlug/transactions/add-drop` | Add/Drop | FCFS player acquisition |
| `/:leagueSlug/transactions/waivers` | Waiver Claims | My pending claims + waiver results |
| `/:leagueSlug/transactions/trades` | Trades Hub | Incoming, outgoing, completed |
| `/:leagueSlug/transactions/trades/new` | Trade Builder | Compose a new trade proposal |
| `/:leagueSlug/transactions/trades/:tradeId` | Trade Detail | Single trade with cap preview, comments, voting |
| `/:leagueSlug/transactions/trade-bait` | Trade Bait | Players on the block |

#### Draft

| URL | Screen | Notes |
|-----|--------|-------|
| `/:leagueSlug/draft` | Draft Room | Live or email draft interface |
| `/:leagueSlug/draft/board` | Draft Board | Grid of all picks |
| `/:leagueSlug/draft/my-list` | My Draft List | Personal ranked player list |

#### Auction

| URL | Screen | Notes |
|-----|--------|-------|
| `/:leagueSlug/auction` | Auction Room | Live or email auction interface |
| `/:leagueSlug/auction/results` | Auction Results | Award history |

#### Social

| URL | Screen | Notes |
|-----|--------|-------|
| `/:leagueSlug/social/board` | Message Board | Threaded forum |
| `/:leagueSlug/social/board/:topicId` | Topic Detail | Single thread |
| `/:leagueSlug/social/board/new` | New Topic | Compose a new topic |
| `/:leagueSlug/social/chat` | League Chat | Real-time chat |
| `/:leagueSlug/social/polls` | Polls | Active and closed polls |
| `/:leagueSlug/social/polls/:pollId` | Poll Detail | Vote and results |
| `/:leagueSlug/social/articles` | Articles | League articles feed |
| `/:leagueSlug/social/articles/:articleId` | Article Detail | Single article |
| `/:leagueSlug/social/articles/new` | New Article | Compose (ability-gated) |

#### Commissioner

| URL | Screen | Notes |
|-----|--------|-------|
| `/:leagueSlug/commissioner` | Commissioner Dashboard | Overview of league health, pending actions |
| `/:leagueSlug/commissioner/settings` | League Settings | Tier, scoring, roster, cap, trade, waiver, etc. |
| `/:leagueSlug/commissioner/settings/scoring` | Scoring Rules Editor | |
| `/:leagueSlug/commissioner/settings/roster` | Roster Settings | Position counts, IR/Taxi config |
| `/:leagueSlug/commissioner/settings/salary` | Salary & Cap Settings | Tier-gated |
| `/:leagueSlug/commissioner/settings/trades` | Trade Settings | Review windows, voting |
| `/:leagueSlug/commissioner/settings/waivers` | Waiver Settings | Processing schedule, bid rules |
| `/:leagueSlug/commissioner/settings/calendar` | Calendar Settings | Season phases, event scheduling |
| `/:leagueSlug/commissioner/settings/accounting` | Accounting Settings | Fees, payouts |
| `/:leagueSlug/commissioner/franchises` | Franchise Management | Invite, reassign, orphan handling |
| `/:leagueSlug/commissioner/franchises/:franchiseSlug` | Franchise Detail | Per-franchise abilities, override actions |
| `/:leagueSlug/commissioner/calendar` | Calendar Editor | Create/edit calendar events |
| `/:leagueSlug/commissioner/overrides` | Commissioner Overrides | Force transactions, adjust scores, manage IR |
| `/:leagueSlug/commissioner/audit` | Audit Log | Immutable action history |
| `/:leagueSlug/commissioner/health` | League Health Check | Automated consistency validation |
| `/:leagueSlug/commissioner/setup` | League Setup Wizard | Multi-step initial configuration (only during SETUP status) |

#### Gameday (live scoring — Phase 4)

| URL | Screen | Notes |
|-----|--------|-------|
| `/:leagueSlug/gameday` | Gameday Dashboard | All matchups with live scores |
| `/:leagueSlug/gameday/:matchupId` | Live Matchup | Single matchup with scoring plays, win probability |

### 3.3 URL conventions

- **Slugs over IDs.** League and franchise URLs use slugs (`flag-football-league`, `dynasty-destroyers`) for human readability. Entity-specific URLs where no slug exists (trades, topics, polls) use the entity UUID.
- **Trailing slashes are not significant.** `/flag/league/standings` and `/flag/league/standings/` resolve identically.
- **Case-insensitive matching.** URLs are lowercased on resolution.
- **Unknown routes.** Any unmatched URL within a league context shows a 404 page with navigation back to the league home. Unknown routes outside a league context redirect to `/`.
- **Deep link support.** Every URL in §3.2 is a valid entry point. The app resolves league context, checks auth, checks role/tier visibility, and either renders the screen or redirects with an appropriate message.

### 3.4 Redirect rules

| Condition | Redirect |
|-----------|----------|
| User visits `/` with exactly one league | → `/:leagueSlug/my-team` |
| User visits `/` with multiple leagues | Show league selector |
| User visits `/` with zero leagues | Show "create or join a league" landing |
| User visits a tier-gated URL they can't access | → `/:leagueSlug/my-team` with toast: "That feature isn't available in this league" |
| User visits a role-gated URL without permission | → `/:leagueSlug/my-team` with toast: "You don't have access to that page" |
| User visits an ability-gated URL they're blocked from | → `/:leagueSlug/my-team` with toast: "Your commissioner has restricted that feature for your franchise" |
| User visits `/:leagueSlug` (no path after slug) | → `/:leagueSlug/my-team` |
| Orphaned franchise owner visits own franchise | Show read-only franchise with "Contact your commissioner" banner |

---

## 4. Sitemap — Complete Screen Inventory

Every screen in XO Play, organized by navigation area with its tier visibility, role requirement, and default state.

### 4.1 My Franchise screens

| Screen | URL suffix | Tier Visibility | Role | Default for area? |
|--------|-----------|----------------|------|-------------------|
| Franchise Overview | `/my-team` | All | Owner | ✓ (landing page) |
| Roster Management | `/my-team/roster` | All | Owner | |
| Lineup Submission | `/my-team/lineup` | All (except Best Ball) | Owner | |
| Current Matchup | `/my-team/matchup` | All | Owner | |
| Salary Cap Overview | `/my-team/cap` | Dynasty; Keeper if `trackSalaries` | Owner | |
| Contract Report | `/my-team/contracts` | Dynasty; Keeper if `trackContracts` | Owner | |
| My Transactions | `/my-team/transactions` | All | Owner | |
| Franchise History | `/my-team/history` | All | Owner | |
| Future Picks | `/my-team/picks` | Dynasty; Keeper if `tradeFuturePicksEnabled` | Owner | |
| Franchise Settings | `/my-team/settings` | All | Owner (ability-gated: `canCustomizeFranchise`) | |

### 4.2 Other Franchise screens

Same as §4.1 minus action-only screens (Lineup Submission, Franchise Settings) and minus ability-gated restrictions (everyone can view any franchise's public data). Tier gating still applies — you can't view another franchise's cap page in Redraft.

### 4.3 League screens

| Screen | URL suffix | Tier Visibility | Role | Default? |
|--------|-----------|----------------|------|----------|
| League Home | `/league` | All | Any | ✓ |
| Standings | `/league/standings` | All | Any | |
| Schedule | `/league/schedule` | All | Any | |
| Reports Hub | `/league/reports` | All | Any | |
| Rosters Report | `/league/reports/rosters` | All | Any | |
| Transactions Report | `/league/reports/transactions` | All | Any | |
| Top Performers | `/league/reports/top-performers` | All | Any | |
| Power Rankings | `/league/reports/power-rankings` | All | Any | |
| Cap Usage Report | `/league/reports/cap-usage` | Dynasty; Keeper if cap | Any | |
| Contract Report | `/league/reports/contracts` | Dynasty; Keeper if contracts | Any | |
| Draft Results | `/league/reports/draft-results` | All | Any | |
| Auction Results | `/league/reports/auction-results` | Where auction exists | Any | |
| Locked Players | `/league/reports/locked-players` | All | Any | |
| Player Directory | `/league/players` | All | Any | |
| Player Profile | `/league/players/:playerId` | All | Any | |
| Playoff Bracket | `/league/playoffs` | All (when bracket exists) | Any | |
| League History | `/league/history` | All | Any | |
| League Calendar | `/league/calendar` | All | Any | |

### 4.4 Transaction screens

| Screen | URL suffix | Tier Visibility | Role | Default? |
|--------|-----------|----------------|------|----------|
| Add/Drop | `/transactions/add-drop` | All | Owner (ability: `canPerformAddDrops`) | ✓ |
| Waiver Claims | `/transactions/waivers` | All | Owner (ability: `canPerformAddDrops`) | |
| Trades Hub | `/transactions/trades` | All | Owner (ability: `canProposeOrAcceptTrades`) | |
| Trade Builder | `/transactions/trades/new` | All | Owner (ability: `canProposeOrAcceptTrades`) | |
| Trade Detail | `/transactions/trades/:tradeId` | All | Any (view); Owner for actions | |
| Trade Bait | `/transactions/trade-bait` | All | Any | |

### 4.5 Draft screens

| Screen | URL suffix | Tier Visibility | Role | Default? |
|--------|-----------|----------------|------|----------|
| Draft Room | `/draft` | All (when draft exists) | Any | ✓ |
| Draft Board | `/draft/board` | All (when draft exists) | Any | |
| My Draft List | `/draft/my-list` | All (when draft exists) | Owner | |

### 4.6 Auction screens

| Screen | URL suffix | Tier Visibility | Role | Default? |
|--------|-----------|----------------|------|----------|
| Auction Room | `/auction` | Where auction exists | Any | ✓ |
| Auction Results | `/auction/results` | Where auction exists | Any | |

### 4.7 Social screens

| Screen | URL suffix | Tier Visibility | Role | Default? |
|--------|-----------|----------------|------|----------|
| Message Board | `/social/board` | All | Any (ability: `canPostToMessageBoard` for posting) | ✓ |
| Topic Detail | `/social/board/:topicId` | All | Any | |
| New Topic | `/social/board/new` | All | Owner (ability: `canPostToMessageBoard`) | |
| League Chat | `/social/chat` | All | Any (ability: `canPostToLeagueChat` for sending) | |
| Polls | `/social/polls` | All | Any (ability: `canCreateLeaguePolls` for creating) | |
| Poll Detail | `/social/polls/:pollId` | All | Any | |
| Articles | `/social/articles` | All | Any | |
| Article Detail | `/social/articles/:articleId` | All | Any | |
| New Article | `/social/articles/new` | All | Owner (ability: `canWriteLeagueArticles`) | |

### 4.8 Commissioner screens

| Screen | URL suffix | Tier Visibility | Role | Default? |
|--------|-----------|----------------|------|----------|
| Commissioner Dashboard | `/commissioner` | All | Commissioner / Co-Commissioner | ✓ |
| League Settings | `/commissioner/settings` | All | Commissioner / Co-Commissioner | |
| Scoring Rules Editor | `/commissioner/settings/scoring` | All | Commissioner / Co-Commissioner | |
| Roster Settings | `/commissioner/settings/roster` | All | Commissioner / Co-Commissioner | |
| Salary & Cap Settings | `/commissioner/settings/salary` | Dynasty; Keeper if cap | Commissioner / Co-Commissioner | |
| Trade Settings | `/commissioner/settings/trades` | All | Commissioner / Co-Commissioner | |
| Waiver Settings | `/commissioner/settings/waivers` | All | Commissioner / Co-Commissioner | |
| Calendar Settings | `/commissioner/settings/calendar` | All | Commissioner / Co-Commissioner | |
| Accounting Settings | `/commissioner/settings/accounting` | If `accountingEnabled` | Commissioner / Co-Commissioner | |
| Franchise Management | `/commissioner/franchises` | All | Commissioner / Co-Commissioner | |
| Franchise Detail | `/commissioner/franchises/:slug` | All | Commissioner / Co-Commissioner | |
| Calendar Editor | `/commissioner/calendar` | All | Commissioner / Co-Commissioner | |
| Commissioner Overrides | `/commissioner/overrides` | All | Commissioner / Co-Commissioner | |
| Audit Log | `/commissioner/audit` | All | Any (read-only for all league members) | |
| League Health Check | `/commissioner/health` | All | Commissioner / Co-Commissioner | |
| League Setup Wizard | `/commissioner/setup` | All (SETUP status only) | Commissioner | |

**Note on Moderator role.** Moderators have access to moderation tools within the Social area (delete posts, lock topics, manage polls) but do NOT see the Commissioner nav area. Their elevated powers surface as action controls within the Social screens, not as separate pages.

### 4.9 Gameday screens (Phase 4 — live scoring)

| Screen | URL suffix | Tier Visibility | Role | Default? |
|--------|-----------|----------------|------|----------|
| Gameday Dashboard | `/gameday` | All (during NFL game windows) | Any | ✓ |
| Live Matchup | `/gameday/:matchupId` | All | Any | |

---

## 5. Navigation Component Behavior

This section defines how the navigation components behave. Visual design (colors, typography, spacing) is in `Spec_DesignSystem.md` §4.10. This spec defines the functional rules.

### 5.1 GlobalNav

**Always visible.** Pinned to the top of every page, including during draft and auction.

**Contents:**

| Element | Behavior |
|---------|----------|
| XO Play logo / wordmark | Links to `/` (league selector) |
| League switcher | Dropdown showing all leagues the user belongs to. Each entry shows league name, tier badge, and franchise name. Current league is highlighted. Selecting a league navigates to `/:leagueSlug/my-team`. |
| Notification bell | Opens notification panel. Badge count shows unread. Panel groups by league. |
| User avatar / menu | Opens dropdown: Account Settings, Notification Preferences, Log Out. |

**League switcher ordering.** Leagues are sorted by the user's most recent activity (last page view timestamp per league), most recent first. No manual reordering in v1.

**Mobile behavior.** The GlobalNav collapses to: league name (tappable to open switcher) + notification bell + hamburger menu. The hamburger contains user menu items and the LeagueNav items (see §5.4).

### 5.2 LeagueNav

**Visible within any league context.** This is the primary navigation for moving between areas of a league.

**Items:**

| Item | Icon concept | URL | Visible when |
|------|-------------|-----|-------------|
| My Team | Shield / jersey | `/my-team` | Always |
| League | Trophy | `/league` | Always |
| Transactions | Arrows / exchange | `/transactions/add-drop` | Always |
| Draft | Board / grid | `/draft` | Draft exists and status ≠ COMPLETE (or within 7 days of completion for results viewing) |
| Auction | Gavel | `/auction` | Auction exists and status ≠ COMPLETE (or within 7 days of completion) |
| Gameday | Play button / live | `/gameday` | During NFL game windows (Phase 4) |
| Social | Speech bubble | `/social/board` | Always |
| Commissioner | Gear / shield | `/commissioner` | User has Commissioner or Co-Commissioner role |

**Active state.** The current area is highlighted. Active state is determined by URL prefix matching: any URL starting with `/:leagueSlug/my-team` highlights "My Team," any URL starting with `/:leagueSlug/league` highlights "League," etc.

**Draft vs. Auction.** These are mutually exclusive in the nav at any given time — a league doesn't run a draft and auction simultaneously. When neither is active, both items are hidden. The nav item appears when a draft or auction is in `SETUP` or `OPEN` state, and persists for 7 days after completion for results viewing, after which the results are accessible via the Reports Hub.

**Desktop layout.** Vertical sidebar, left side of viewport.

**Mobile layout.** Bottom tab bar with the 5 most important items: My Team, League, Transactions, Social, and a "More" overflow. Draft/Auction and Commissioner move into the "More" menu. Gameday, when active, replaces the middle tab position (pushing Transactions into More).

### 5.3 Section navigation

Within each Layer 1 area, section navigation provides the sub-level tabs.

**My Franchise section tabs:**

| Tab | URL suffix | Visible when |
|-----|-----------|-------------|
| Overview | (default — no suffix needed) | Always |
| Roster | `/roster` | Always |
| Lineup | `/lineup` | Not Best Ball |
| Matchup | `/matchup` | Always |
| Cap | `/cap` | Dynasty; Keeper if `trackSalaries` |
| Contracts | `/contracts` | Dynasty; Keeper if `trackContracts` |
| Transactions | `/transactions` | Always |
| Picks | `/picks` | Dynasty; Keeper if `tradeFuturePicksEnabled` |
| History | `/history` | Always |

**League section tabs:**

| Tab | URL suffix | Visible when |
|-----|-----------|-------------|
| Home | (default) | Always |
| Standings | `/standings` | Always |
| Schedule | `/schedule` | Always |
| Reports | `/reports` | Always |
| Players | `/players` | Always |
| Playoffs | `/playoffs` | Bracket exists |
| History | `/history` | Always |
| Calendar | `/calendar` | Always |

**Transaction section tabs:**

| Tab | URL suffix | Visible when |
|-----|-----------|-------------|
| Add/Drop | `/add-drop` | Always |
| Waivers | `/waivers` | Always |
| Trades | `/trades` | Always |
| Trade Bait | `/trade-bait` | Always |

**Social section tabs:**

| Tab | URL suffix | Visible when |
|-----|-----------|-------------|
| Board | `/board` | Always |
| Chat | `/chat` | Always |
| Polls | `/polls` | Always |
| Articles | `/articles` | Always |

**Commissioner section tabs:**

| Tab | URL suffix | Visible when |
|-----|-----------|-------------|
| Dashboard | (default) | Always |
| Settings | `/settings` | Always |
| Franchises | `/franchises` | Always |
| Calendar | `/calendar` | Always |
| Overrides | `/overrides` | Always |
| Audit Log | `/audit` | Always |
| Health Check | `/health` | Always |
| Setup Wizard | `/setup` | League status = SETUP only |

**Desktop rendering.** Horizontal tabs below the page header, within the content area (to the right of the sidebar).

**Mobile rendering.** Scrollable horizontal tab bar at the top of the content area. Active tab is centered when possible.

### 5.4 Mobile navigation detail

Mobile navigation uses three mechanisms:

1. **Bottom tab bar** — persistent, 5 slots. Provides Layer 1 navigation (equivalent to LeagueNav on desktop).
2. **Section tabs** — scrollable horizontal strip at top of content area. Provides Layer 2 navigation.
3. **Hamburger / "More" menu** — slide-out drawer containing: overflow LeagueNav items (Draft, Auction, Commissioner), league switcher, user menu, and notification access.

**Transitions.** Tapping a bottom tab switches the Layer 1 area. Tapping a section tab switches the Layer 2 section within the current area. Both are instant navigations (no slide animation between areas).

**Critical mobile constraint: above-the-fold priority.** Per PRD §15.7, on mobile the most important information must be visible without scrolling. For each screen, the relevant screen spec defines what's above the fold. This nav spec only requires that the bottom tab bar + section tabs consume no more than ~110px of vertical space combined, preserving the rest for content.

---

## 6. Per-Screen Data Map

This section defines what data each screen loads. It bridges the system specs (which define the data) to the screen specs (which define how it's displayed). Each entry lists the primary entities and derived values the screen requires.

### 6.1 My Franchise screens

**Franchise Overview**
- `Franchise` (name, logo, colors, status)
- `RosterEntry[]` with joined `Player` data (name, position, NFL team, injury status)
- `Contract[]` for each rostered player (if tier supports)
- Current week `Matchup` with opponent franchise
- `Transaction[]` (last 10, filtered to this franchise)
- `Standings` position (derived: W-L-T record, VP if enabled)
- Next `CalendarEvent` (deadline awareness)

**Roster Management**
- `RosterEntry[]` with full `Player` join (all fields)
- `Contract[]` per player (if tier supports)
- `LineupEntry[]` for current week
- Roster position counts (current vs. configured limits from `League`)
- IR/Taxi eligibility per player (derived per `Spec_RosterManagement.md` §4–5)
- `Franchise.abilities` (determines which actions are available)

**Lineup Submission**
- `LineupEntry[]` for selected week
- `RosterEntry[]` with `Player` (position, injury, bye week)
- Lineup slot configuration from `League` (starting positions, flex rules)
- Lock status per slot (derived from `Spec_RosterManagement.md` §3)
- `Player.stats` projections from sportsdata.io (for auto-fill / recommendations)

**Current Matchup**
- `Matchup` for current week
- Both franchises' `LineupEntry[]` with `Player` and per-player scores
- `ScoringRule[]` for score breakdown
- Matchup total scores (derived)
- Win probability (Phase 4 — live scoring)

**Salary Cap Overview**
- `Franchise` cap fields (cap ceiling from `League`, current usage)
- `Contract[]` with salary, years, status
- Cap breakdown by roster bucket: ACTIVE / IR / TAXI (derived per `Spec_SalaryCapAndContracts.md` §3)
- Dead money total (derived)
- Cap room (derived)

**Contract Report**
- `Contract[]` for this franchise, all statuses
- Sortable/filterable by salary, years remaining, player position, contract status
- Salary escalator projections (Dynasty only, derived per `Spec_SalaryCapAndContracts.md` §4)

**My Transactions**
- `Transaction[]` filtered to `franchiseId` (all types)
- Joined entity details per type: `WaiverClaim`, `Trade`, player involved, contract changes
- Date range filter, type filter

**Franchise History**
- `Season[]` with W-L-T, final standings position, playoff result per season
- Historical `DraftPick[]` (picks this franchise made, by season)
- Awards / championships (derived from playoff results)
- Franchise ownership history via `FranchiseOwner[]`

**Future Picks**
- `DraftPick[]` where `currentFranchiseId` = this franchise AND `season` > current
- Shows: season, round, original franchise (if traded), provisional pick position

**Franchise Settings**
- `Franchise` editable fields: name, slug, logo, colors
- `Franchise.abilities` (read-only display of what's enabled/disabled)

### 6.2 League screens

**League Home**
- Configurable module list from `League.homePageModules` (or default set)
- Each module has its own data requirement:
  - Standings module → top-level standings data
  - Transactions module → last 10 league-wide `Transaction[]`
  - Calendar module → next 5 `CalendarEvent[]`
  - Matchup Chart module → all `Matchup[]` for current week
  - Top Performers module → stat leaders from current week
  - (Full module list per PRD §15.5)

**Standings**
- All `Franchise[]` with current W-L-T, VP, points for/against
- Division and conference grouping (if enabled)
- Tiebreaker chain from `League` (for tooltip/explanation)
- Sortable by any standings column

**Schedule**
- `Matchup[]` for all weeks of current season
- View modes: by-week (all matchups for week N) and by-franchise (one franchise's full schedule)
- Bye weeks indicated

**Reports Hub**
- Static list of available reports, filtered by tier (hide cap/contract reports in Redraft)
- No data loaded on the hub itself — it's a navigation page

**Individual Report screens** — each loads its specific dataset as defined in PRD §15.4. Data sources are the same entities listed elsewhere in this section; the reports are read-only aggregate views.

**Player Directory**
- `Player[]` with search, position filter, NFL team filter, availability filter (rostered/free agent)
- For each player: ownership status (which franchise, if any), contract (if tier supports), recent stats

**Player Profile**
- `Player` full record
- `Stats[]` for current and historical seasons
- `Contract` (if rostered and tier supports)
- `RosterEntry` (current franchise, if any)
- `Transaction[]` involving this player (acquisition history)
- Injury history via `InjuryStatusHistory[]`
- News/articles referencing this player

**Playoff Bracket**
- `PlayoffBracket` structure
- `Matchup[]` within bracket rounds
- Seeding derivation from standings

**League History**
- `Season[]` with champions, final standings, notable records
- Historical standings per season

**League Calendar**
- `CalendarEvent[]` for the full season
- Grouped by month, with event type indicators

### 6.3 Transaction screens

**Add/Drop**
- Available `Player[]` (free agents, filtered by position, NFL team)
- Current `RosterEntry[]` for the user's franchise (drop candidates)
- `Contract[]` for drop candidates (if tier supports — shows drop penalty)
- Calendar blocking status (is add/drop currently allowed?)
- Locked player list (recently dropped players with unlock times)

**Waiver Claims**
- My pending `WaiverClaim[]` with priority/bid amounts
- Waiver processing schedule from `League` config
- Available `Player[]` on waivers
- Waiver results (most recent processing run)

**Trades Hub**
- `Trade[]` where user's franchise is proposer or receiver
- Grouped: Pending Incoming, Pending Outgoing, Completed, Rejected/Expired
- Trade vote status (if league uses voting)

**Trade Builder**
- All `Franchise[]` in league (as trade partners)
- Selected partner's `RosterEntry[]` with `Player` and `Contract`
- User's `RosterEntry[]` with `Player` and `Contract`
- `DraftPick[]` for both franchises (if future pick trading enabled)
- Cap impact preview (derived per `Spec_SalaryCapAndContracts.md`)
- Validation result (derived per `Spec_Transactions.md` §3)

**Trade Detail**
- `Trade` with all `TradeAsset[]`
- `TradeComment[]`
- `TradeVote[]` (if voting enabled)
- Cap impact for both parties (derived)
- Trade state and available actions per role

**Trade Bait**
- `RosterEntry[]` flagged as trade bait, across all franchises
- Player details, contract details, franchise identity

### 6.4 Draft screens

**Draft Room**
- `DraftPick[]` for all rounds (complete pick order)
- Available `Player[]` (undrafted)
- `MyDraftListEntry[]` (user's personal rankings)
- `DraftWorklistEntry[]` (user's shortlist)
- Current pick: whose turn, timer state
- Pick history: completed picks with player, franchise, round
- Draft state (derived from picks per `Spec_Draft.md` §2)

**Draft Board**
- `DraftPick[]` rendered as grid: rows = rounds, columns = franchises
- Color coding by position
- Filter by position

**My Draft List**
- `MyDraftListEntry[]` (user's ranked player list)
- Available `Player[]` (for adding to list)
- Drag-and-drop reordering

### 6.5 Auction screens

**Auction Room**
- `Auction` state (SETUP / OPEN / PAUSED / CLOSED)
- Current `AuctionPlayerState` being auctioned (if any): player, current bid, timer, nominator
- `Bid[]` history for current player
- Available funds for user's franchise (derived per `Spec_Auction.md` §4)
- Nomination slot: is it the user's turn?
- `AuctionPlayerState[]` results (awarded players)

**Auction Results**
- `AuctionPlayerState[]` with final prices, winning franchise
- Sortable by price, position, franchise

### 6.6 Social screens

**Message Board**
- `MessageBoardTopic[]` sorted by `lastPostAt`
- Pinned topics first
- Post count, last poster, last post time per topic
- User's ability flags for posting

**Topic Detail**
- `MessageBoardTopic` with all `MessageBoardPost[]`
- Threaded reply structure (via `parentPostId`)
- Author franchise branding per post

**League Chat**
- `ChatMessage[]` (last 30 days or configured retention)
- Presence indicators (who's online)
- DM thread selector (franchise-to-franchise)

**Polls**
- `Poll[]` with `PollOption[]` and aggregate `PollVote` counts
- User's own vote status per poll
- Active vs. closed grouping

**Articles**
- `Article[]` sorted by `publishedAt`
- Author, franchise branding, tags

### 6.7 Commissioner screens

**Commissioner Dashboard**
- Pending actions summary:
  - Trades awaiting commissioner review
  - Unresolved waiver processing results
  - Orphaned franchises
  - Upcoming calendar events requiring attention
  - League health check result (pass/warn/fail)
- Quick links to most-used tools

**League Settings**
- Full `League` entity (all configuration fields, grouped into sections per §3.3)
- Section-by-section editor: scoring, roster, salary, trades, waivers, calendar, accounting

**Franchise Management**
- All `Franchise[]` with owner info, status, abilities summary
- `Invitation[]` with statuses
- Orphan indicators

**Calendar Editor**
- `CalendarEvent[]` with full editing (create, modify, delete)
- Visual calendar view with drag-and-drop scheduling

**Commissioner Overrides**
- Override action forms: force add/drop, force trade, adjust score, manage IR/taxi, adjust salary
- Each override creates an `AuditLogEntry`

**Audit Log**
- `AuditLogEntry[]` with actor, action, timestamp, before/after state
- Filterable by action type, actor, date range

**League Health Check**
- Validation results from consistency checks (per PRD §3.5, §5.7)
- Each result: pass/warn/fail with explanation and suggested fix

---

## 7. Role-Based Visibility

### 7.1 Role definitions

| Role | How assigned | Scope |
|------|-------------|-------|
| Commissioner | One per league. Set at league creation. Transferable. | Full access to all screens including commissioner tools. |
| Co-Commissioner | Appointed by commissioner. Multiple allowed. | Same as commissioner EXCEPT: cannot remove commissioner, delete league, or transfer ownership. |
| Moderator | Appointed by commissioner. Multiple allowed. | Normal owner access + moderation actions within Social screens. No commissioner area access. |
| Owner | Joins via invitation. One or more per franchise. | Access to all non-commissioner screens. Actions gated by franchise abilities. |

### 7.2 Visibility matrix

| Navigation area | Owner | Moderator | Co-Commissioner | Commissioner |
|----------------|-------|-----------|-----------------|-------------|
| My Team | ✓ | ✓ | ✓ | ✓ |
| League | ✓ | ✓ | ✓ | ✓ |
| Transactions | ✓ (ability-gated) | ✓ (ability-gated) | ✓ | ✓ |
| Draft / Auction | ✓ | ✓ | ✓ | ✓ |
| Gameday | ✓ | ✓ | ✓ | ✓ |
| Social | ✓ (ability-gated) | ✓ + moderation | ✓ | ✓ |
| Commissioner | ✗ | ✗ | ✓ | ✓ |
| Audit Log | ✓ (read-only) | ✓ (read-only) | ✓ | ✓ |

**Note on Audit Log.** The Audit Log is listed under Commissioner in the nav hierarchy, but it's readable by all league members. The URL `/:leagueSlug/commissioner/audit` works for all roles. Non-commissioner users see it as a standalone page accessible via a link from the League Home or the League nav's "More" section — it does not require the Commissioner nav area to be visible.

### 7.3 Commissioner lockout

When `League.commissionerLockout = true`, the commissioner cannot see pending owner-initiated transactions (waiver claims, trade proposals) until they're finalized. This affects:

- Trade Detail screen: commissioner sees "hidden until resolution" placeholder instead of trade assets
- Waiver Claims screen: commissioner sees claim count per player but not individual bidders or amounts
- Commissioner Override screen: force-trade and force-waiver actions are disabled while lockout is active

The lockout does NOT affect: Add/Drop (these are instant, not pending), Auction (commissioner can see bids), or Draft (commissioner can see picks).

---

## 8. Tier-Gated Navigation

The tier system affects navigation by hiding screens and tabs that aren't relevant to the league's tier. This is a summary of the visibility rules from `Spec_Tiers.md` §6.1, applied to the navigation model.

### 8.1 Screens hidden per tier

**Redraft hides:**
- Cap, Contracts, Picks tabs under My Franchise / Other Franchise
- Cap Usage Report, Contract Report under League Reports
- Salary & Cap Settings under Commissioner Settings
- Keeper Selection screen (no keepers)
- Franchise Tag screen

**Keeper hides:**
- Franchise Tag screen
- Cap / Contracts / Picks — only visible if the corresponding league flag is enabled (`trackSalaries`, `trackContracts`, `tradeFuturePicksEnabled`)

**Dynasty shows everything.** All tabs, all reports, all settings are visible.

### 8.2 How hiding works

Hidden tabs are removed from the section navigation entirely — they are not shown as disabled or grayed out. If a user bookmarks or shares a URL for a tier-gated screen, the redirect rule from §3.4 applies (redirect to `/my-team` with a toast).

This means the navigation adapts to the league's complexity. A Redraft league's My Team section might show 5 tabs (Overview, Roster, Lineup, Matchup, Transactions) while a Dynasty league shows 9.

---

## 9. Contextual Navigation

### 9.1 Breadcrumbs

Breadcrumbs appear on every screen except the league-level landing pages (League Home, Franchise Overview). They show the path from the current Layer 1 area to the current screen.

**Format:** `Area > Section > Detail`

**Examples:**
- League > Reports > Cap Usage
- My Team > Roster
- Commissioner > Settings > Scoring Rules
- League > Players > Patrick Mahomes
- Transactions > Trades > Trade #a1b2c3

Breadcrumbs are navigable — each segment is a link. The first segment always links to the area's default screen.

### 9.2 Cross-area links

Some screens need to link to screens in other navigation areas. These are handled as in-page links, not navigation state changes.

**Common cross-area links:**
- Player name anywhere → Player Profile (`/league/players/:playerId`)
- Franchise name anywhere → Franchise Overview (`/franchise/:franchiseSlug`)
- Transaction reference anywhere → appropriate transaction screen
- "Propose Trade" button on another franchise's roster → Trade Builder, pre-populated with that franchise as partner
- "View Schedule" from Matchup → League Schedule
- "Set Lineup" from Franchise Overview → Lineup Submission

When following a cross-area link, the LeagueNav active state updates to reflect the destination area. Breadcrumbs rebuild from the destination's perspective.

### 9.3 Deep linking

Every URL in §3.2 is a valid deep link. The app handles deep links by:

1. Checking authentication (redirect to login if needed, with return URL preserved)
2. Resolving league context from the URL slug
3. Verifying the user has a franchise in that league (redirect to `/` if not)
4. Checking tier and role visibility (redirect per §3.4 if blocked)
5. Loading the screen with its data requirements from §6

**Email and notification links.** Notifications and emails include deep links to the relevant screen. Examples:
- "You received a trade proposal" → `/:leagueSlug/transactions/trades/:tradeId`
- "Waiver results are in" → `/:leagueSlug/transactions/waivers`
- "Your lineup deadline is approaching" → `/:leagueSlug/my-team/lineup`
- "Draft starts in 1 hour" → `/:leagueSlug/draft`

### 9.4 Back navigation

The browser's back button works normally (URL history). The app does not override back-button behavior. Within the app, there is no explicit "back" button — breadcrumbs and section tabs serve this purpose.

**Exception:** modal/overlay flows (Trade Builder, Commissioner Override forms) include an explicit "Cancel" / "Close" that returns to the previous screen without adding a history entry.

---

## 10. Multi-League Handling

### 10.1 League context isolation

Each league is a fully isolated context. When a user switches leagues via the league switcher:
- The URL changes to the new league's slug
- All screen state resets (session memory per §2.3 is per-league)
- The LeagueNav re-renders with the new league's tier-appropriate items
- The franchise context switches to the user's franchise in the new league

A user cannot view two leagues simultaneously. Multi-league comparison features are explicitly out of scope for v1.

### 10.2 League switcher behavior

The league switcher in GlobalNav shows:

| Field | Source |
|-------|--------|
| League name | `League.name` |
| Tier badge | `League.tier` (Redraft / Keeper / Dynasty, with tier-specific color) |
| Franchise name | User's `Franchise.name` in that league |
| League status indicator | `League.status` (e.g., "In Season," "Offseason," "Setup") |
| Season year | `League.seasonYear` |

**Sorting:** Most recently active first (based on user's last page view per league).

**"Create or Join" entry:** Always present at the bottom of the switcher. Links to league creation flow or invite code entry.

### 10.3 Default league on login

When a user logs in:
- If they have exactly one league → navigate directly to `/:leagueSlug/my-team`
- If they have multiple leagues → navigate to `/` (league selector)
- If they have zero leagues → navigate to `/` which shows the "create or join" state

The app remembers the last-visited league in local storage. On next login with multiple leagues, it auto-navigates to the last-visited league instead of showing the selector. The selector is always accessible via the league switcher.

---

## 11. Edge Cases

### 11.1 Orphaned franchise

When a franchise's status is `ORPHANED` (all owners removed), the franchise's screens are still accessible to the commissioner for management purposes. Other owners can still view the orphaned franchise's public pages (roster, matchup, history) — these show a subtle "This franchise is currently unowned" banner.

If the user's own franchise becomes orphaned (they were removed), they lose access to the `/my-team` routes for that league. The LeagueNav still shows the league, but "My Team" links to a "You no longer own a franchise in this league" message with a "Contact your commissioner" prompt.

### 11.2 League in SETUP status

During `SETUP`, most screens are empty or show placeholder content. The navigation model is the same, but:
- Commissioner is directed to the Setup Wizard as the primary flow
- Owner screens show "Your league is being configured" messages
- Transaction, Draft, Auction, and Social areas are hidden (no data to show)
- Only visible: My Team (minimal), League Home (minimal), Commissioner tools

### 11.3 Season phase transitions

When the league transitions between phases (e.g., `ACTIVE` → `POSTSEASON` → `OFFSEASON`), the navigation doesn't change structurally — the same screens exist. What changes is the data on each screen and which actions are available. For example:
- During `OFFSEASON`, the Lineup Submission screen shows "No active matchups" instead of a lineup editor
- During `POSTSEASON`, the Playoff Bracket appears in the League nav section tabs
- Transaction availability is controlled by `CalendarEvent` blocking, not by navigation hiding

### 11.4 Co-owned franchises

When multiple users co-own a franchise, they all see the same `/my-team` routes and can all take actions (subject to franchise abilities). There is no "primary vs. secondary owner" distinction in the nav — both see identical interfaces. The `primaryOwnerUserId` on `Franchise` only matters for tiebreak purposes (e.g., which email gets league communications), not for UI access.

### 11.5 Draft/Auction visibility lifecycle

Draft and Auction nav items follow this lifecycle:

| State | Nav item visible? | Screen accessible? |
|-------|------------------|-------------------|
| Not yet created | No | No (404) |
| SETUP | Yes | Yes (shows "Draft not started yet" or setup info for commissioner) |
| OPEN / IN_PROGRESS | Yes | Yes (active draft/auction room) |
| PAUSED | Yes | Yes (shows paused state) |
| COMPLETE (< 7 days) | Yes | Yes (shows results) |
| COMPLETE (≥ 7 days) | No | Yes (via `/league/reports/draft-results` or `/auction/results` direct URL) |

### 11.6 Ability-gated actions vs. ability-gated navigation

Franchise abilities (from `Franchise.abilities` JSON) do NOT hide screens — they disable action controls within screens. For example:
- `canProposeOrAcceptTrades = false` → The Trades Hub is still visible, but the "New Trade" button is hidden and incoming trade proposals show as read-only with a "Your commissioner has restricted your trading ability" message.
- `canPostToMessageBoard = false` → Message Board is visible (the user can read), but the "New Topic" and "Reply" buttons are hidden.
- `canSubmitLineup = false` → Lineup screen shows the current lineup (last week's carryover) but the "Submit" button is hidden.

This is intentional — hiding the screen entirely would make it unclear whether the feature exists. Showing the screen with disabled controls communicates "this exists but you can't use it right now."

---

## 12. Relationship to Other Specs

| Spec | Relationship |
|------|-------------|
| `Spec_DesignSystem.md` | Defines the visual appearance and token usage for all nav components (GlobalNav, LeagueNav, FranchiseSectionNav, Breadcrumb, TabBar). This spec defines *where they go and what they do*; Design System defines *how they look*. |
| `Spec_Tiers.md` | §6.1 defines tier-gated screen visibility. This spec applies those rules to the navigation model (§8). |
| `Spec_DataModel.md` | Provides entity definitions for `League.slug`, `Franchise.slug`, `League.status`, `Franchise.abilities`, and all entities referenced in the per-screen data map (§6). |
| `Spec_ScoringEngine.md` | Supplies scoring data for Matchup, Top Performers, and scoring breakdown screens. |
| `Spec_SalaryCapAndContracts.md` | Supplies cap and contract data for cap-related screens. Defines the derived values (cap room, dead money) referenced in §6.1. |
| `Spec_CalendarAndLifecycle.md` | Defines season phases and calendar events that affect screen state (§11.3) and transaction availability. |
| `Spec_Transactions.md` | Defines transaction types and validation pipeline used by Transaction screens (§6.3). |
| `Spec_Draft.md` | Defines draft state model and pick data used by Draft screens (§6.4). |
| `Spec_Auction.md` | Defines auction state model and bid data used by Auction screens (§6.5). |
| `Spec_RosterManagement.md` | Defines roster validation, lineup locking, and IR/taxi eligibility used by Roster and Lineup screens (§6.1). |
| All future Screen specs | Each Screen_*.md doc references this spec for: URL (§3.2), breadcrumb path (§9.1), data requirements (§6), tier visibility (§8), and role requirements (§7). |

### 12.1 No direct interaction

| Spec | Why no interaction |
|------|-------------------|
| `Spec_LiveScoring.md` (future) | Live scoring adds the Gameday screens but doesn't change the navigation model — it just adds a Layer 1 entry. This spec already reserves the Gameday URL pattern and nav item (§5.2). |
| `Spec_NarrativeLayer.md` (v2) | Narrative will add a Newspaper tab to the Franchise section nav. This spec doesn't define it because it's v2, but the section tab model (§5.3) is extensible. |

---

## 13. Open Questions

### OQ1 — Player Profile placement

The Player Profile screen is currently under `/league/players/:playerId`. An alternative is to make it a global route (`/:leagueSlug/player/:playerId`) since players are referenced from many areas (trades, roster, waivers). The current placement works because all cross-area links resolve correctly regardless of URL hierarchy. Deferring unless user testing reveals friction.

### OQ2 — Accounting screens

The PRD mentions an Accounting Ledger screen (§17.3) gated by `accountingEnabled`. This spec doesn't place it in the navigation hierarchy because `Spec_Accounting.md` hasn't been written yet. When it is, the Accounting screen should be added — likely as a tab under My Franchise (my ledger) and a report under League Reports (all franchises' ledgers). The commissioner settings for accounting are already placed at `/commissioner/settings/accounting`.

### OQ3 — Notification center as a screen vs. panel

The current spec treats notifications as a panel (dropdown from the bell icon in GlobalNav). An alternative is a dedicated notification screen at `/:leagueSlug/notifications` or even a global `/notifications`. A panel keeps the user in context; a screen provides more room for filtering and history. Recommendation: start with panel, add screen if the panel proves too constrained.

### OQ4 — Keeper selection screen placement

Keeper leagues need a "select keepers" flow during offseason. This is a franchise-level action, so it logically lives under My Team. But it's a seasonal, one-time flow — not a persistent tab. Recommendation: it surfaces as a banner/CTA on the Franchise Overview screen during the keeper selection window, linking to a modal or dedicated flow at `/:leagueSlug/my-team/keepers`. The nav tab list does not include it permanently.

---

## 14. Build Sequence (Preview)

This spec is a design/architecture document, not an implementation spec. However, it informs the following build work:

### Phase 1 — Route definitions and layout shell
1. Define all routes from §3.2 in the router
2. Implement the four-layer layout shell: GlobalNav, LeagueNav sidebar, section tabs, content area
3. Implement redirect rules from §3.4
4. Implement tier-gated route visibility (§8)
5. Implement role-gated route visibility (§7)

### Phase 2 — Navigation components
1. Build GlobalNav with league switcher, notification bell, user menu
2. Build LeagueNav with conditional items (Draft/Auction lifecycle, Commissioner role check)
3. Build section tab bars for each area
4. Build breadcrumb component with auto-generation from route path

### Phase 3 — Mobile adaptation
1. Implement bottom tab bar with "More" overflow
2. Implement scrollable section tabs
3. Implement hamburger drawer with league switcher and overflow items
4. Test Gameday tab insertion behavior

### Phase 4 — Deep linking and edge cases
1. Implement deep link resolution flow (§9.3)
2. Implement ability-gated action controls (§11.6)
3. Implement orphan franchise handling (§11.1)
4. Implement SETUP status empty states (§11.2)

---

## 15. Files Affected (Summary)

| File / Area | Change |
|-------------|--------|
| Router configuration | All routes from §3.2 |
| Layout shell components | GlobalNav, LeagueNav, SectionNav, Breadcrumb |
| Auth middleware | League membership check, role check, tier check per route |
| League context provider | Resolves slug → League entity, provides to all child routes |
| Franchise context provider | Resolves current user → Franchise within league |
| Redirect logic | All rules from §3.4 |
| Mobile layout components | Bottom tabs, hamburger drawer, scrollable section tabs |

---

**END OF SPECIFICATION**