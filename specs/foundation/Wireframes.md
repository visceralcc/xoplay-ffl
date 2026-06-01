# XO Play — Screen Wireframes

**Lightweight layout definitions for core screens**

Version 0.1 | May 2026 | Charlie Denison | XO Play (xoplay.co)

**CONFIDENTIAL**

---

## Purpose

This document defines the content blocks, data requirements, and stacking order for XO Play's core screens. These are wireframes — they define *what* goes on each screen and *where*, not pixel-level visual design. Each wireframe will become a full Screen spec (e.g., `Screen_FranchiseHome.md`) when we're ready to build that screen.

**Three screen moods covered:**
- **Franchise Home** — editorial / consumption (the "team newspaper")
- **Roster View** — operational / data-dense (the "Bloomberg terminal")
- **League Home** — mixed (the "league newspaper front page")

---

## 1. Franchise Home

**Mood:** Editorial. Bold franchise colors, spacious, identity-forward.
**Route:** `/league/:slug/franchise/:franchiseSlug` (or `/league/:slug/my-team` for own franchise)
**Primary user intent:** "How's my team doing? What's happening with my franchise?"

### 1.1 Content blocks, top to bottom

**1. Masthead** (full-width, franchise-colored)

The identity anchor. Full-bleed `primaryColor` background with text in `onColor(primaryColor)`.

Data shown:
- Franchise name (large, Barlow Condensed display)
- FranchiseMark (logo or geometric mark)
- Owner name
- Record: W-L(-T), with division record beneath
- League tier label (e.g., "DYNASTY · SALARY · CONTRACT" in mono)

This is the `FranchiseHeader` component. Secondary color could appear as an adjacent panel or accent stripe — visual treatment is a design decision for later, but the data is fixed.

**2. Quick Stats Row** (full-width, below masthead)

A horizontal row of 4–6 StatValue components showing the franchise's key numbers at a glance. Tier-aware — Dynasty shows more than Redraft.

All tiers: Points For, Points Against, Current Streak, Power Rank

Dynasty/Keeper adds: Cap Room, Cap Usage %

This row bridges the editorial masthead above and the content cards below.

**3. Main content area** (card-based, responsive)

Below the stats row, the page switches to a card layout. On desktop: two-column arrangement (roughly 2fr / 1fr — main column left, sidebar right). On mobile: single vertical stack.

**Left column (main):**

**3a. Upcoming Matchup Card**
- Opponent franchise name + mark
- Week number
- Projected scores (if available)
- "View Matchup" link
- If game day and scores are live: LiveDot + current scores instead of projections
- Component: `UpcomingMatchup`

**3b. Roster Summary Section**
- Section header: "ROSTER" with "View Full Roster" action link
- Compact roster table showing starters only (not full roster)
- Columns: Player, Pos, NFL Team, Points (last week)
- Slimmed-down DataTable, not the full RosterTable
- Tier-aware: Dynasty shows salary column, Redraft does not

**3c. Recent Transactions Section**
- Section header: "RECENT ACTIVITY" with "View All" action link
- Last 5 transactions (TransactionRow components in a Stack)
- Each shows: type icon, description, timestamp
- Component: `RecentTransactions`

**Right column (sidebar):**

**3d. Cap Snapshot Card** (Dynasty/Keeper only — hidden in Redraft)
- CapMeter showing usage bar
- Cap used / Cap total numbers
- "View Cap Details" link

**3e. Upcoming Schedule Card**
- Next 3–4 matchups: week number, opponent name + mark, projected spread
- Compact list format

**3f. Trade Bait Card** (if franchise has players marked as available)
- Section header: "TRADE BAIT"
- List of players the owner has flagged as available
- Each shows: player name, position, salary (if Dynasty)

**3g. Owner Articles Card** (if owner has written articles)
- Latest 2–3 HeadlineCards
- Link to full article list

### 1.2 Mobile stacking order

1. Masthead
2. Quick Stats Row
3. Upcoming Matchup Card
4. Roster Summary
5. Cap Snapshot (if applicable)
6. Recent Transactions
7. Upcoming Schedule
8. Trade Bait
9. Owner Articles

### 1.3 Tier variations

| Block | Redraft | Keeper | Dynasty |
|-------|---------|--------|---------|
| Masthead tier label | "REDRAFT" | "KEEPER" | "DYNASTY · SALARY · CONTRACT" |
| Quick Stats: cap fields | Hidden | Shown if `trackSalaries` | Always shown |
| Roster Summary: salary col | Hidden | Shown if `trackSalaries` | Always shown |
| Cap Snapshot Card | Hidden | Shown if `trackSalaries` | Always shown |
| Trade Bait: salary | Hidden | Shown if `trackSalaries` | Always shown |

### 1.4 Owner vs. Visitor view

**Owner** (My Team route): All content shown plus action affordances — "Set Lineup" button near roster summary, "Propose Trade" on trade bait players, "Write Article" in articles section.

**Visitor** (viewing someone else's franchise): Same data, all action buttons hidden (not disabled — hidden, per Design System §9.2 permission conventions).

---

## 2. Roster View

**Mood:** Operational. Pure grayscale, franchise color only as a small marker. Dense, precise, scannable.
**Route:** `/league/:slug/franchise/:franchiseSlug/roster`
**Primary user intent:** "Who's on my team? What moves should I make?"

### 2.1 Content blocks, top to bottom

**1. Context Bar** (full-width, compact)

Slim horizontal bar establishing whose roster is displayed.

Data shown:
- FranchiseMark (36×36 color block)
- Franchise name in Barlow Condensed headline weight
- Tier label in mono (e.g., "DYNASTY · SALARY · CONTRACT")
- Record: W-L
- If owner's own roster: "Set Lineup" primary action button, right-aligned

No masthead — Franchise Home is the identity screen. Roster View is operational, so context bar is minimal.

**2. Toolbar** (full-width, sticky)

Horizontal row of controls that filter and configure the table below. Stays visible when scrolling.

- **Bucket tabs:** SegmentControl with Active / IR / Taxi. Taxi hidden in Redraft. IR hidden if `irSpots = 0`.
- **Density toggle:** SegmentControl with Standard / Compact (right side)
- **Position filter:** optional — filter to show only QB, RB, WR, etc.

**3. Roster Table** (full-width, scrollable)

DataTable configured with roster-specific columns. The core of the screen.

**Columns (tier-aware):**

All tiers: Player (PlayerRow with headshot, name, position badge, injury indicator, NFL team), Bye, Last Week Pts, Season Pts, Projected Pts

Keeper adds: Contract Years (if `trackContracts`)

Dynasty adds: Salary, Contract Years, Contract Status, Acquired Via

**Table behaviors:**
- Sortable by any column (tap header)
- Default sort: by position group (QB, RB, WR, TE, K, DEF), then by season points within group
- Expandable rows: tap a player row to reveal inline detail panel (full contract info, recent weekly scores, bye week, news snippet)
- Two density modes: Standard (44px rows), Compact (32px rows)
- Horizontal scroll on mobile for overflow columns

**4. Roster Summary Footer** (below table)

Compact stats bar showing roster-level aggregates:

- Roster count: "23 / 25 Active · 2 / 3 IR · 1 / 3 Taxi"
- Total salary (Dynasty): "$198.50 / $222.75"
- Cap room (Dynasty): "$24.25 remaining"
- Position counts: "2 QB · 4 RB · 5 WR · 2 TE · 1 K · 1 DEF"

StatRow of StatValues — quick "am I compliant" check without leaving roster view.

### 2.2 Mobile adaptation

- Player column pinned left (name, position badge, injury indicator — drops headshot to save space)
- Last Week Pts and Season Pts visible by default
- All other columns via horizontal scroll
- Toolbar stacks: bucket tabs on one row, density + position filter on second row
- Summary footer becomes a collapsible Section at the bottom

### 2.3 Owner vs. Visitor view

**Owner:**
- "Set Lineup" button in context bar
- Per-row action menu: Drop, Move to IR, Move to Taxi, Propose Trade
- Inline "Add Player" button/link (navigates to Add/Drop screen)

**Visitor:**
- Same data, no action buttons
- "Propose Trade" link in context bar (navigates to trade builder pre-populated with this franchise)

### 2.4 Tier variations

| Element | Redraft | Keeper | Dynasty |
|---------|---------|--------|---------|
| Bucket tabs | Active only (IR if configured) | Active + IR (+ Taxi if configured) | Active + IR + Taxi |
| Salary column | Hidden | Shown if `trackSalaries` | Always shown |
| Contract columns | Hidden | Contract Years if `trackContracts` | Salary, Years, Status, Acquired Via |
| Cap info in footer | Hidden | Shown if `trackSalaries` | Always shown |
| Drop action | Simple drop | Drop (may show penalty preview) | Drop with penalty preview |

---

## 3. League Home

**Mood:** Mixed — informational and social. Neutral system palette, no single franchise's colors dominate.
**Route:** `/league/:slug/home`
**Primary user intent:** "What's happening in the league right now?"

### 3.1 Content blocks, top to bottom

**1. League Header** (full-width, compact)

- League name in Barlow Condensed display weight
- Season / week context in mono: "2026 SEASON · WEEK 8"
- Tier label: "DYNASTY"
- If during game window: LiveDot + "GAMES IN PROGRESS" indicator

No franchise colors — league-neutral territory.

**2. Module Grid** (responsive card layout)

Modular — a configurable grid of Cards. Commissioner picks which modules appear and their order; owners can further reorder their own view. On desktop: two-column layout (main + sidebar or flexible grid). On mobile: single-column stack.

**Default left column (main):**

**2a. This Week's Matchups Card**
- Section header: "WEEK 8 MATCHUPS"
- List of all matchups for current week
- Each matchup: two franchise names with FranchiseMarks, projected or live scores, win probability bar
- If live: LiveDot, real scores, auto-updating
- Owner's own matchup highlighted (subtle background tint or top placement)
- Tap matchup → navigate to full matchup view

**2b. Standings Card**
- Section header: "STANDINGS" with "Full Standings" action link
- Compact standings table: Rank, Franchise (name + color dot), W-L, PF, PA, Streak
- Top 8 or full league depending on space
- Owner's franchise row highlighted

**2c. Recent Transactions Card**
- Section header: "RECENT ACTIVITY" with "View All" action link
- Last 10 transactions across the league
- Each: TransactionRow with type icon, franchise mark, description, relative timestamp

**Default right column (sidebar):**

**2d. League Chat Preview Card**
- Last 5–8 chat messages
- "Open Chat" link
- Compact: avatar, name, message preview, timestamp

**2e. Active Poll Card** (if any poll is open)
- Poll question
- Vote options with current tallies (if visibility allows)
- "Vote" button if owner hasn't voted

**2f. Lineup Deadline Countdown Card**
- Time remaining until next lineup lock
- "Set Lineup" action link
- Becomes urgent (status-warning color) when < 2 hours remain

**2g. Power Rankings Card**
- Ordered list: rank, franchise name + mark, trend arrow (up/down/steady)
- "Full Rankings" action link

**2h. Top Performers Card**
- Top 5 scoring players this week (or last completed week)
- Player name, position, franchise, points

### 3.2 Mobile stacking order

1. League Header
2. This Week's Matchups
3. Lineup Deadline Countdown
4. Standings
5. Recent Transactions
6. League Chat Preview
7. Active Poll
8. Power Rankings
9. Top Performers

### 3.3 Commissioner customization

Commissioner can reorder, hide, or add modules from the full PRD §15.5 list. Modules not in the default set ("League Champions," "Monthly Calendar," "Custom HTML," etc.) are available but not shown by default. Owners can reorder their own view without affecting other users.

### 3.4 Tier variations

Minimal — League Home is mostly tier-agnostic.

| Element | Redraft | Keeper | Dynasty |
|---------|---------|--------|---------|
| Standings columns | W-L, PF, PA | Same | Same + cap room column |
| Transaction descriptions | "added / dropped" | Same | Include salary values |

---

## Next steps

These wireframes define content blocks and data. The next phase is either:
- **Visual design exploration** — pick one screen (Franchise Home recommended) and design it with full visual fidelity, letting decisions cascade to the other screens.
- **Screen specs** — formalize each wireframe into a full `Screen_*.md` buildable unit with component composition, state handling, and data-fetching requirements.
