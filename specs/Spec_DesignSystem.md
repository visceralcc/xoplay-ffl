# XO Play — Design System Specification

**Design Principles, Token Architecture, Component Inventory & Responsive Strategy**

Version 0.2 | April 2026 | Charlie Denison | XO Play (xoplay.co)

**CONFIDENTIAL**

---

**Status:** Draft — Visual commitments applied (partial coverage)
**Parent:** [Spec_XOPlay_PRD.md](../Spec_XOPlay_PRD.md) §15 (Standings, Reports & Displays), §15.7 (Mobile), §19 (Narrative)
**Related specs:** `Spec_Tiers.md` (tier-gated surfaces), `Spec_DataModel.md` (entity definitions), `Spec_Navigation.md` (screen map — TBD)
**Last updated:** April 2026

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | Apr 2026 | Structural draft. Design principles, token categories, component inventory, data density strategy, responsive framework, tier-aware rendering conventions, and franchise theming system. No visual design applied — intended as a creative brief for design exploration. |
| 0.2 | Apr 2026 | First visual commitments. Type pairing locked (Barlow + Barlow Condensed + JetBrains Mono). Color foundation locked (true-neutral grayscale, 13-step ramp). Franchise theming approach revised from "accent tints" to "bold blocks" based on design exploration output. Concrete values for grayscale palette, status colors, position colors, radius scale. Contrast-safety rules formalized with the `onColor` and `safeBlock` algorithms. New §8.5 on "Franchise Block Treatment." New §11.4 on "The Editorial ↔ Operational Bridge." Open questions pruned; new open questions added for surfaces the exploration did not cover. |

---

## 1. Purpose

This document defines what the XO Play design system must solve for — the principles it follows, the tokens and components it provides, and the rules for how the UI adapts across devices, tiers, and franchise contexts. It is the canonical reference for anyone building or designing a screen in XO Play.

**What this document is.** A specification with committed visual foundations plus structural rules for everything built on top. Sections 3 (Tokens), 8 (Franchise Theming), and 11 (Competitive Positioning) now carry concrete visual decisions. Other sections remain structural — they define *what and how*, with visual specifics deferred to Level 3 component documents.

**What this document is not.** A complete component library with pixel-perfect specs for every component. Individual component visual details live in Level 3 Component buildable units. This spec provides the tokens and patterns those documents reference.

**Who uses this document:**
- Designers — as the requirements brief and design foundation
- Every screen and component buildable unit — references this for tokens, patterns, and conventions
- Claude Code — follows the token values and component APIs defined here when building UI

**Reference artifacts.** The design exploration that informed v0.2 lives in `design/reference/` and contains a prototype HTML showcase (`XO Play Design System.html`) with five franchise variants, two roster density modes, and five mobile layouts. These are non-production prototypes — they are visual references, not code to ship. Token values in §3 and franchise theming rules in §8 are drawn directly from that exploration.

---

## 2. Design Principles

These are philosophical guardrails, not visual choices. They constrain every design decision that follows.

### 2.1 Data density is a feature, not a bug

Fantasy football is a data sport. Owners live in tables — rosters, standings, scoring breakdowns, contract reports, cap usage. The design system must make dense data *scannable and comfortable*, not hide it behind progressive disclosure or sparse layouts.

**What this means in practice.** Tables with 15+ columns are normal. A roster view with player name, position, salary, contract years, injury status, bye week, and last week's score is the *default* view, not an "advanced" view. The design system has a Compact density mode (32px rows) that works at this density without feeling cramped.

**What this does NOT mean.** Every screen is a spreadsheet. The league home page, franchise home page, and narrative surfaces feel editorial and spacious. The density principle applies to *operational* screens (roster management, cap reports, draft boards, transaction history) — not to *consumption* screens (home pages, articles, matchup previews).

### 2.2 The UI is tier-specific; the design system is not

All three tiers share the same tokens, components, and patterns. What changes across tiers is which components *appear* — a Redraft owner never sees a CapMeter, but if they did, it would use the same component a Dynasty owner sees. The design system has no tier-specific variants of components. Tier logic lives in the screens that compose components, not in the components themselves.

### 2.3 Franchise identity is first-class

Every franchise has `primaryColor`, `secondaryColor`, `logoUrl`, and `name`. These aren't decoration — they're identity. The design system supports franchise-scoped theming so that a franchise's home page, newspaper view, and branding elements reflect that franchise's colors. This is central to the "team newspaper" differentiation.

**Revised approach (v0.2):** Franchise colors are used as **bold color blocks** on franchise-owned surfaces — not as low-opacity accents. A franchise home page leads with a full-bleed masthead in the franchise's primary color. The "franchise-proud" principle argues for commitment, not timidity. See §8.5 for the full treatment.

**Constraint.** Franchise colors are user-chosen and may be anything — including low-contrast pairs, near-white, near-black, or clashing combinations. The design system has a contrast-safety layer (§8.3) that ensures readability regardless of the franchise's color choices. Franchise colors never replace the system's text colors or backgrounds on system surfaces (nav, forms, commissioner tools).

### 2.4 Commissioner and owner see the same world differently

Commissioners see management tools layered on top of the same screens owners see — not a separate admin portal. Components support a "commissioner mode" where additional controls (edit buttons, override actions, moderation tools) appear in context, without restructuring the layout. Commissioner controls appear as secondary actions on existing surfaces, not as separate screens (with the exception of dedicated commissioner-only screens like League Setup and Audit Log).

### 2.5 Mobile is not a viewport — it's a context

Mobile users aren't using a "smaller version of the desktop." They're checking their lineup at lunch, reviewing a trade proposal on the bus, or watching live scores during a game. The responsive strategy optimizes for these tasks, not for shrinking desktop layouts to fit.

**Implication.** Mobile doesn't show everything desktop shows. It prioritizes: current matchup, lineup status, pending actions (trade proposals, waiver deadlines), and live scores. Reports, history, and configuration are reachable but not prominent.

### 2.6 Real-time and static are visually distinct

During NFL game windows, the platform shifts into a "live" mode where scores update every 15 seconds, win probabilities animate, and scoring plays stream in. The design system has a clear visual language for "this data is live" versus "this data is a snapshot." Live state feels *alive* — not through gratuitous animation, but through a distinct treatment (LiveDot pulse, timestamp relativity, animated score changes) that signals currency.

### 2.7 The editorial ↔ operational bridge

XO Play has two very different moods that must feel like the same product:
- **Editorial / consumption screens** (franchise home, newspaper, matchup previews) — premium sports publication. Rich, alive, typographically expressive.
- **Operational / data screens** (roster table, cap reports, draft board, transaction history) — Bloomberg terminal. Dense, precise, scannable, comfortable at high data volumes.

The same type system (§3.4), same color foundation (§3.2), and same component primitives must serve both modes. The difference is in *arrangement and density*, not in foundations. See §11.4 for the specific moves that create this bridge.

---

## 3. Token Architecture

Tokens are the named values every component references. This section now contains concrete values (v0.2 update) for color, radius, and typography. Spacing, elevation, and motion remain structural pending further design work.

### 3.1 Token naming convention

Tokens use a three-level naming hierarchy: `category-property-variant`.

Examples:
- `color-surface-raised`
- `color-text-primary`
- `color-franchise-primary` (dynamic, per-franchise)
- `spacing-md`
- `type-display-lg`
- `radius-md`
- `shadow-card`
- `motion-duration-fast`

### 3.2 Color tokens — system grayscale (committed)

The system palette is a **true-neutral grayscale** — chroma 0, no warm or cool tint. This is a deliberate choice: with every franchise contributing its own hues, the system must stay entirely out of the way. A warm-gray system would clash with cool franchise colors (and vice versa). True neutral is the only palette that flatters all 16M+ possible franchise color choices.

**The 13-step ramp:**

| Token | Hex | Primary use |
|---|---|---|
| `gray-0` | `#ffffff` | Page background (light mode), card surfaces on gray-25 pages |
| `gray-25` | `#fbfbfb` | Default page background on data screens |
| `gray-50` | `#f6f6f6` | Hover states on gray-25, zebra stripe alternate row |
| `gray-100` | `#ededed` | Borders (default), subtle dividers, logo placeholder backgrounds |
| `gray-200` | `#dcdcdc` | Borders (emphasized), input field borders |
| `gray-300` | `#c4c4c4` | Dividers, disabled element borders, near-white franchise fallback border |
| `gray-400` | `#a0a0a0` | Disabled text, tertiary metadata |
| `gray-500` | `#767676` | Secondary text, labels, metadata (e.g., "VIEWING AS OWNER") |
| `gray-600` | `#565656` | Body copy secondary, table cell secondary values |
| `gray-700` | `#3d3d3d` | Body copy, position labels (when not colored), table cell primary values |
| `gray-800` | `#262626` | Heavy text, emphasized values |
| `gray-900` | `#141414` | Primary text, headline display type, black-on-light |
| `gray-950` | `#0a0a0a` | Near-black surfaces (system masthead bg, dark mode future) |

**Notes:**
- `gray-900` is the default text color, not `gray-950`. `gray-950` is reserved for surfaces — it reads as "black" when used as a background behind light text.
- `gray-0` through `gray-100` are *near-white* and require explicit borders to read as surfaces on pages already using white.

### 3.3 Color tokens — status (committed, desaturated)

Status colors are desaturated to sit comfortably next to true-neutral grays and arbitrary franchise colors. Each status has a foreground (text/icon) and a background token.

| Token | Hex | Use |
|---|---|---|
| `status-success` | `#1d7d4c` | Success text/icons |
| `status-success-bg` | `#e8f1ec` | Success cell backgrounds, toasts |
| `status-warning` | `#9c6a00` | Warning text/icons, injury status Q |
| `status-warning-bg` | `#f6eedd` | Warning cell backgrounds |
| `status-error` | `#b82727` | Error text/icons, cap overage, injury status D/O |
| `status-error-bg` | `#f6e4e4` | Error cell backgrounds |
| `status-info` | `#2c5d8f` | Info text/icons (rare — prefer neutral gray) |
| `status-live` | `#d81c1c` | Live dot only — never for other live treatment |

**Rule.** Status colors exist to convey *meaning*, never for decoration. The cap-over state uses `status-error`; a franchise choosing red as their primary color still uses `status-error` (not their own red) for cap overage — the user must be able to distinguish "this is my team's color" from "this is an alert."

### 3.4 Color tokens — position (committed, muted)

Position color coding is saturated enough to distinguish quickly, muted enough not to compete with franchise colors.

| Token | Hex | Position |
|---|---|---|
| `pos-qb` | `#b8446b` | QB |
| `pos-rb` | `#1f7a4c` | RB |
| `pos-wr` | `#2656a5` | WR |
| `pos-te` | `#b36a1a` | TE |
| `pos-k` | `#6e4a9a` | K |
| `pos-def` | `#4a4a4a` | DEF / D/ST |
| `pos-flex` | `#565656` | FLEX (lineup slot) |

**Note.** The position color is used for a small pill or text treatment on the position label. The primary position display (§4.5 `PositionBadge`) is Barlow Condensed in `gray-700`, with the position color as an accent dot or the 2-character pill background. See the exploration's `Pos` primitive for the reference treatment.

### 3.5 Color tokens — injury status (committed)

| Token | Hex | Status |
|---|---|---|
| `injury-Q` | `#9c6a00` (=status-warning) | Questionable |
| `injury-D` | `#b82727` (=status-error) | Doubtful |
| `injury-O` | `#b82727` (=status-error) | Out |
| `injury-IR` | `#141414` (=gray-900) | Injured Reserve |

Injury indicators render as a 16×16 rounded square with the 1-letter code in white (`#ffffff`) at Barlow Condensed 700, 9px.

### 3.6 Color tokens — franchise (dynamic)

Dynamic color tokens sourced from `Franchise.primaryColor` and `Franchise.secondaryColor`. See §8 for the full franchise theming system.

| Generated token | Purpose | Method |
|---|---|---|
| `franchise-primary` | Direct user-chosen hex | Direct from `Franchise.primaryColor` |
| `franchise-secondary` | Direct user-chosen hex | Direct from `Franchise.secondaryColor` |
| `franchise-on-primary` | Text color on primary block | Computed via `onColor()` — returns `#0a0a0a` or `#ffffff` based on luminance threshold 0.62 |
| `franchise-on-secondary` | Text color on secondary block | Same computation, applied to secondary |
| `franchise-needs-border` | Whether near-white franchise needs outline | Computed via `safeBlock()` — true if luminance > 0.85 |

**Deprecated from v0.1:** `franchise-primary-tint` (8-12% opacity), `franchise-primary-subtle` (20-30% opacity). The exploration demonstrated that low-opacity franchise color treatments feel timid against the strong editorial/operational bridge. Franchise colors are now committed as bold blocks. See §8.5.

### 3.7 Spacing tokens

A spacing scale for consistent rhythm. Values remain TBD (to be finalized when writing first buildable unit specs). The token names and usage rules are fixed:

| Token | Use case | Approximate value |
|---|---|---|
| `spacing-xs` | Tight gaps within compact components (icon-label) | ~4px |
| `spacing-sm` | Default gap within a component (between table cells) | ~8px |
| `spacing-md` | Gap between sibling components | ~16px |
| `spacing-lg` | Section separation | ~24-32px |
| `spacing-xl` | Major section breaks, page-level padding | ~40-48px |

The exploration uses a loose 4px base (4/8/12/16/24/32/40/48) without a formal scale token. When writing the first buildable unit that depends on spacing, these values should be formalized.

### 3.8 Typography tokens — Barlow + Barlow Condensed + JetBrains Mono (committed)

**Type pairing locked.** The XO Play type system uses three families:

| Family | Role | Key weights |
|---|---|---|
| **Barlow** | Body UI, paragraphs, reading text, form labels | 300, 400, 500, 600, 700, 800 |
| **Barlow Condensed** | Display, headlines, large stats, data values, uppercase labels | 400, 500, 600, 700, 800 |
| **JetBrains Mono** | Meta labels, IDs, mono values, very small uppercase labels | 400, 500 |

**Why this pairing works for XO Play:**
- Barlow and Barlow Condensed share the same underlying letterforms — they pair naturally without feeling like two different fonts
- Barlow Condensed at display sizes (72-280px) does the newspaper-headline work that a serif would, without feeling dated
- Barlow Condensed's tabular-number support makes it the right choice for large scores and stat displays — same visual family, same alignment precision
- JetBrains Mono at 11px uppercase with +0.4 letter-spacing does the "data-terminal" meta work (timestamps, IDs, section labels like "FRANCHISE / OAK") that signals the Bloomberg-terminal side of the editorial/operational bridge
- Editorial voice inside body copy is carried by **italics in Barlow**, not by a serif family

**Type scale (committed from exploration):**

| Token | Family | Weight | Size / line-height | Letter-spacing | Case | Example use |
|---|---|---|---|---|---|---|
| `type-display-xxl` | Barlow Condensed | 700 | 280 / 0.8 | -6 | UPPER | Franchise abbreviation on home page masthead |
| `type-display-xl` | Barlow Condensed | 700 | 96 / 0.85 | -2 | UPPER | Primary page title (e.g., "Week Eleven") |
| `type-display-lg` | Barlow Condensed | 700 | 88 / 0.88 | -1.5 | UPPER | Franchise name on masthead |
| `type-display-md` | Barlow Condensed | 700 | 72 / 0.9 | -1.5 | UPPER | Spec title ("XO Play / Design System") |
| `type-display-sm` | Barlow Condensed | 700 | 64 / 0.9 | -1 | UPPER | League home masthead name |
| `type-headline-lg` | Barlow Condensed | 700 | 52 / 0.95 | -0.5 | Sentence | Lead newspaper headline |
| `type-headline-md` | Barlow Condensed | 700 | 38 / 1 | -0.5 | UPPER | Page title (Roster, Matchup) |
| `type-headline-sm` | Barlow Condensed | 700 | 24 / 1 | -0.2 | Sentence | Secondary headline, card title |
| `type-headline-xs` | Barlow Condensed | 700 | 22 / 1 | 0 | UPPER | Section header ("THE OAK DAILY") |
| `type-stat-xl` | Barlow Condensed | 700 | 72 / 0.9 | -1 | — | ScoreNum, matchup scores |
| `type-stat-lg` | Barlow Condensed | 700 | 44 / 1 | -0.5 | — | Franchise home stat values ("132.3") |
| `type-stat-md` | Barlow Condensed | 700 | 40 / 0.9 | -0.5 | — | Masthead record/PF/PA values |
| `type-body-lg` | Barlow | 400 | 18 / 1.5 | 0 | Sentence | Lead paragraph, article intro |
| `type-body` | Barlow | 400 | 14 / 1.57 | 0 | Sentence | Default body copy |
| `type-body-sm` | Barlow | 300 | 13 / 1.54 | 0 | Sentence | Captions, bylines, timestamps |
| `type-body-xs` | Barlow | 400 | 12 / 1.5 | 0 | Sentence | Footnotes, dense metadata |
| `type-data-md` | Barlow Condensed | 600 | 18 / 1.3 | 0 | — | Table cell primary values |
| `type-data` | Barlow Condensed | 500 | 14 / 1.4 | 0 | — | Table cell secondary values |
| `type-data-sm` | Barlow Condensed | 500 | 12 / 1.3 | 0 | — | Compact-density table cells |
| `type-label` | Barlow Condensed | 600 | 13 / 1 | 1.2 | UPPER | Section labels, column headers, tab labels |
| `type-label-sm` | Barlow Condensed | 700 | 11 / 1 | 1.2 | UPPER | Tiny section labels, badges |
| `type-mono` | JetBrains Mono | 400 | 11 / 1.4 | 0.4 | UPPER | Meta labels, IDs, "AI-WRITTEN · UPDATED 06:00" |

**Mandatory rules.**
- **Data values always use `fontVariantNumeric: 'tabular-nums'`** — stats, scores, cap values, and table numbers must align vertically even with proportional letters elsewhere.
- **All uppercase labels use Barlow Condensed, not Barlow** — Barlow in all-caps reads stretched; Condensed was built for it.
- **JetBrains Mono is capped at 11px** — any larger and it competes with Barlow Condensed for data-value attention. It exists to whisper, not to declare.

### 3.9 Elevation / shadow tokens

Three levels. Values TBD — the exploration does minimal shadow work (its hierarchy comes from color blocks and borders, not elevation).

| Token | Use case |
|---|---|
| `shadow-none` | Flat elements, table rows, most page content |
| `shadow-card` | Cards, modals, popovers |
| `shadow-elevated` | Dropdowns, tooltips, floating actions |

### 3.10 Border radius tokens (committed)

| Token | Value | Use |
|---|---|---|
| `radius-none` | 0 | Tables, data-dense elements — sharp corners read as "precise" |
| `radius-sm` | 3px | Buttons, inputs, small tags, logo placeholders, toggle group segments |
| `radius-md` | 6px | Cards, article blocks, modals |
| `radius-lg` | 10px | Franchise masthead, large imagery containers, featured blocks |
| `radius-xl` | 16px | Reserved (not currently used in exploration) |
| `radius-full` | 999px | Pills, circular badges, live-dot |

### 3.11 Motion tokens

Motion in XO Play serves two purposes: feedback (button press, form submit) and data updates (live score change, scoring play animation). Values TBD — the exploration is static.

| Token | Use case | Guidance |
|---|---|---|
| `motion-duration-instant` | Hover states, focus rings | ≤100ms |
| `motion-duration-fast` | Button feedback, tab switch | 100–200ms |
| `motion-duration-normal` | Card expand, modal open | 200–400ms |
| `motion-duration-slow` | Page transitions, live score cascade | 400–800ms |
| `motion-easing-default` | Most transitions | Ease-out (TBD specific curve) |
| `motion-easing-spring` | Playful elements, scoring play animation | Slight overshoot |

**Reduced motion.** All motion respects `prefers-reduced-motion`. When active, transitions become instant (opacity crossfade only, no spatial movement).

---

## 4. Component Inventory

Every shared component the design system provides, organized by function. Individual component specs (appearance, props, states) are Level 3 buildable units that reference this inventory.

Components are tagged with their primary usage context to help prioritize design work:

- **[Core]** — Used on 5+ screens, built first
- **[Feature]** — Used on 1–3 screens, built when that feature is built
- **[Live]** — Has real-time update behavior during game windows

### 4.1 Layout primitives

| Component | Purpose | Tag |
|---|---|---|
| `PageShell` | Top-level page wrapper — header, nav, content area, footer | [Core] |
| `ContentArea` | Main content container with max-width and responsive padding | [Core] |
| `Section` | Titled section with optional collapse | [Core] |
| `Card` | Elevated container for grouped content | [Core] |
| `Grid` | Responsive multi-column layout | [Core] |
| `Stack` | Vertical or horizontal flex with consistent spacing | [Core] |
| `Sidebar` | Collapsible side panel (desktop); drawer (mobile) | [Core] |
| `Modal` | Overlay dialog for focused tasks | [Core] |
| `Drawer` | Slide-in panel from edge (mobile commissioner tools, filters) | [Core] |

### 4.2 Data display

| Component | Purpose | Tag |
|---|---|---|
| `DataTable` | The workhorse — sortable, filterable, paginated table | [Core] |
| `CompactTable` | Dense variant for inline tables (e.g., scoring breakdown within a card) | [Core] |
| `StatValue` | Single stat with label (e.g., "Cap Room: $23.50") — see exploration's `Stat` and `MiniStat` primitives | [Core] |
| `StatRow` | Horizontal row of StatValues | [Core] |
| `Badge` | Small label — status tags, position labels, tier indicators | [Core] |
| `Meter` | Horizontal bar showing progress/usage (cap usage, roster fill) | [Feature] |
| `Tooltip` | Contextual info on hover/tap | [Core] |
| `EmptyState` | Placeholder when a list or table has no data | [Core] |
| `Label` | Uppercase meta label (Barlow Condensed, `type-label`) — reference in exploration `primitives.jsx` | [Core] |
| `Mono` | Inline mono label (JetBrains Mono, `type-mono`) — reference in exploration `primitives.jsx` | [Core] |

### 4.3 Player & franchise identity

| Component | Purpose | Tag |
|---|---|---|
| `PlayerRow` | Standard player display: name, position badge, team, injury indicator | [Core] |
| `PlayerCard` | Expanded player view: headshot, stats summary, contract info | [Feature] |
| `FranchiseMark` | Logo / abstract mark. Accepts franchise and size. Falls back to SVG geometric mark if no uploaded logo | [Core] |
| `FranchiseHeader` | Bold color-block masthead with logo, name, record, key stats — reference: `FranchiseHome` masthead region | [Feature] |
| `OwnerAvatar` | User avatar with presence indicator | [Core] |
| `TeamColorStripe` | Thin color bar using franchise colors (used in cards, list items) | [Core] |
| `Headshot` | Player photo placeholder — silhouette SVG when no photo | [Core] |

### 4.4 Scoring & matchup

| Component | Purpose | Tag |
|---|---|---|
| `ScoreNum` | Large formatted score. `type-stat-xl` Barlow Condensed 700 tabular — reference in exploration `primitives.jsx` | [Core] |
| `ScoreDisplay` | Full matchup score block with franchise context | [Core] |
| `MatchupCard` | Two-franchise head-to-head with scores | [Core] |
| `ScoringPlayFeed` | Streaming list of scoring plays with player, points, timestamp | [Live] |
| `WinProbabilityMeter` | Visual probability bar with percentage | [Live] |
| `WeekSelector` | Dropdown or tab bar for selecting fantasy week | [Core] |
| `LiveDot` | Pulsing dot in `status-live`. 8px with a 1px outer ring at 40% opacity | [Live] |
| `LiveIndicator` | `LiveDot` + "LIVE" label + timestamp. Combined live-state affordance | [Live] |

### 4.5 Roster & lineup

| Component | Purpose | Tag |
|---|---|---|
| `RosterTable` | Full roster with columns configurable by tier. Two density modes (standard 44px / compact 32px). Reference: exploration's `RosterTable` | [Core] |
| `LineupSlot` | Single lineup position with drag-to-fill or tap-to-select | [Feature] |
| `LineupGrid` | Full starting lineup arranged by position | [Feature] |
| `RosterBucketTabs` | Segment control: Active / IR / Taxi. Reference: exploration's toggle group pattern | [Feature] |
| `PositionBadge` | Position indicator. Barlow Condensed 600, `gray-700` text, 32-40px min width, inline. Reference: `Pos` primitive | [Core] |
| `InjuryIndicator` | 16×16 rounded square with letter code in white. Reference: `Injury` primitive | [Core] |

### 4.6 Salary cap & contracts

| Component | Purpose | Tag |
|---|---|---|
| `CapMeter` | Visual cap usage bar with usage/room/overage states | [Feature] |
| `ContractCard` | Player contract summary: salary, years, status, escalator | [Feature] |
| `CapProjection` | Multi-year cap projection table or chart | [Feature] |
| `DropPenaltyPreview` | "What if I drop this player?" cost preview | [Feature] |
| `SalaryTag` | Inline salary display (formatted per `League.salaryDisplayFormat`) | [Feature] |

### 4.7 Transactions

| Component | Purpose | Tag |
|---|---|---|
| `TransactionRow` | Single transaction in a feed: type icon, description, timestamp | [Core] |
| `TransactionFeed` | Chronological list of TransactionRows with filters | [Core] |
| `TradeBuilder` | Multi-asset trade composition interface | [Feature] |
| `TradeCapPreview` | Side-by-side cap impact for both trade parties | [Feature] |
| `WaiverBidForm` | Bid amount input with player-to-drop selector | [Feature] |
| `PlayerSelector` | Search + filter to select a player (used in trades, waivers, lineups) | [Core] |

### 4.8 Draft & auction

| Component | Purpose | Tag |
|---|---|---|
| `DraftBoard` | Grid of all picks by round and franchise with color coding | [Feature] |
| `DraftTimer` | Countdown clock with visual urgency escalation | [Feature] |
| `DraftList` | Owner's personal ranked player list | [Feature] |
| `AvailablePlayers` | Filterable, sortable list of undrafted/un-auctioned players | [Feature] |
| `AuctionPlayerCard` | Player being auctioned: current bid, timer, bid history | [Feature] |
| `BidHistory` | Chronological bid list for an auction player | [Feature] |
| `NominationForm` | Interface to nominate a player for auction | [Feature] |

### 4.9 Social & communication

| Component | Purpose | Tag |
|---|---|---|
| `MessageThread` | Threaded post display with reply, quote, react | [Feature] |
| `ChatWindow` | Real-time chat with presence indicators | [Feature] |
| `PollCard` | Poll question with options and vote counts/bars | [Feature] |
| `ArticleView` | Long-form article with franchise branding option | [Feature] |
| `HeadlineCard` | Newspaper-style headline card with tag, read-time, headline, dek. Reference: exploration's secondary headline pattern | [Feature] |

### 4.10 Navigation & chrome

| Component | Purpose | Tag |
|---|---|---|
| `GlobalNav` | Top-level navigation (league switcher, user menu) | [Core] |
| `LeagueNav` | In-league navigation (tabs or sidebar: Home, Roster, Matchup, etc.) | [Core] |
| `FranchiseSectionNav` | In-franchise section tabs (Overview / Roster / Newspaper / Cap / Transactions / History). Active tab gets a 2px top border in `franchise-primary`. Reference: exploration's franchise home | [Core] |
| `Breadcrumb` | Contextual breadcrumb trail | [Core] |
| `TabBar` | Horizontal tab navigation within a screen | [Core] |
| `ActionMenu` | Dropdown menu of contextual actions | [Core] |
| `CommissionerBadge` | Visual indicator that current user is commissioner on this surface | [Core] |

### 4.11 Forms & inputs

| Component | Purpose | Tag |
|---|---|---|
| `TextInput` | Standard text field with label, validation, error state | [Core] |
| `NumberInput` | Numeric input with increment/decrement — used for salary, years, bids | [Core] |
| `Select` | Dropdown selector | [Core] |
| `Toggle` | Boolean switch | [Core] |
| `Checkbox` / `Radio` | Multi/single choice | [Core] |
| `DatePicker` | Date/time selection for calendar events | [Feature] |
| `RangeSlider` | For setting ranges (roster position min/max) | [Feature] |
| `SearchInput` | Text input with live search behavior — used in PlayerSelector | [Core] |
| `SegmentControl` | Segmented toggle (e.g., Standard/Compact density, Active/IR/Taxi). Active segment in `gray-950` bg with `gray-0` text. Reference: exploration's toolbar | [Core] |

### 4.12 Feedback & status

| Component | Purpose | Tag |
|---|---|---|
| `Toast` | Non-blocking success/error/info notification | [Core] |
| `Alert` | In-page alert banner (e.g., "You are over the salary cap") | [Core] |
| `ConfirmDialog` | Action confirmation with description of consequences | [Core] |
| `LoadingSpinner` | Loading state indicator | [Core] |
| `SkeletonLoader` | Content placeholder during load | [Core] |
| `ProgressBar` | Step indicator for multi-step flows (league setup wizard) | [Feature] |

### 4.13 Commissioner-specific

| Component | Purpose | Tag |
|---|---|---|
| `SettingsPanel` | Form-based settings editor used across commissioner screens | [Feature] |
| `AbilitiesGrid` | Matrix of franchise ability toggles | [Feature] |
| `InvitationManager` | Franchise invite creation and status tracking | [Feature] |
| `HealthCheckReport` | League consistency validation results with fix suggestions | [Feature] |
| `AuditLogRow` | Single audit entry: actor, action, before/after state | [Feature] |

---

## 5. Data Density Strategy

XO Play's biggest design challenge: making dense data comfortable. This section establishes conventions for how data-heavy surfaces behave.

### 5.1 Density modes (committed dimensions)

Every DataTable and RosterTable supports two density modes, switchable by the user via a SegmentControl:

| Mode | Row height | Font | Cell padding | Use case |
|---|---|---|---|---|
| **Standard** | 44px | `type-data-md` (Barlow Condensed 600, 13px) | 10px 12px | Default for most users, comfortable scanning |
| **Compact** | 32px | `type-data-sm` (Barlow Condensed 500, 12px) | 6px 12px | Power users, large rosters (Dynasty 53+ players), commissioners reviewing league-wide reports |

The user's density preference persists per-device (stored locally). Commissioner tools default to Compact.

**Row separator.** 1px `gray-100` bottom border on every row. No alternating zebra stripe in either mode — the clean line separator + tabular numbers keep it scannable without visual noise. (Zebra stripes may be introduced in future if user testing shows scanning issues on very wide tables.)

**Hover.** `gray-50` row background on hover in Standard; `gray-25` in Compact (so the hover tint stays subtle at tight row heights).

### 5.2 Column prioritization

On screens narrower than the table's ideal width, columns collapse by priority. Every column in every table is assigned one of three priority tiers:

| Priority | Behavior | Example columns |
|---|---|---|
| **P1 — Always visible** | Never hidden, even on mobile | Player name, position, salary (in cap leagues) |
| **P2 — Visible on tablet+** | Hidden on phone, shown on tablet and desktop | Contract years, injury status, bye week |
| **P3 — Visible on desktop only** | Hidden below desktop width; accessible via "expand row" | Acquisition date, escalator %, draft history |

Each table's column priority assignments are defined in the relevant screen/component buildable unit, not in this design system spec.

### 5.3 Horizontal scroll on mobile

When a table has more P1 columns than can fit on a phone viewport, the leftmost column (typically player name) freezes and the remaining columns scroll horizontally. This is the standard pattern for RosterTable on mobile.

### 5.4 Expandable rows

Any table row can expand to show detail — full contract info, recent stat lines, linked transactions. Expansion is triggered by tap (mobile) or click (desktop). Expanded content renders below the row, pushing subsequent rows down. Only one row is expanded at a time per table.

---

## 6. Responsive Framework

### 6.1 Breakpoints

Three named breakpoints. Exact pixel values TBD by visual design, but the named tiers and their behavioral implications are fixed:

| Name | Typical range | Layout behavior |
|---|---|---|
| **Phone** | 320–479px | Single column. Bottom tab nav. Tables use horizontal scroll. Sidebar becomes drawer. |
| **Tablet** | 480–1023px | Flexible column count. Side nav or top tabs. Tables show P1+P2 columns. |
| **Desktop** | 1024px+ | Full multi-column layout. Persistent sidebar nav. Tables show all columns. Modals wider. |

The exploration mockups are at desktop 1440px and phone 390px.

### 6.2 Navigation adaptation

| Element | Phone | Tablet | Desktop |
|---|---|---|---|
| GlobalNav | Hidden behind hamburger menu | Compact top bar | Full top bar with league switcher |
| LeagueNav | Bottom tab bar (5 key destinations) | Top tab bar or compact sidebar | Persistent left sidebar |
| Breadcrumb | Hidden (back button instead) | Visible | Visible |
| Commissioner tools | In hamburger menu or action sheet | Tab in LeagueNav | Section in sidebar |

### 6.3 Content adaptation by screen type

**Operational screens** (roster, lineup, transactions, draft board):
- Phone: Prioritize the primary action. Roster view → lineup submission takes priority. Filter/sort accessible via a pull-down or sheet.
- Tablet: Show the full table with P1+P2 columns. Filters visible as a toolbar.
- Desktop: Show everything. Sidebar with filters, full table, detail panel.

**Consumption screens** (league home, franchise home, articles, newspaper):
- Phone: Vertical card stack. One module per viewport width. Mobile franchise home leads with a compressed version of the masthead (full-bleed color block, franchise name, record, key stats stacked).
- Tablet: Two-column card grid.
- Desktop: Three-column layout or main + sidebar (2fr 1fr main + rail in the exploration).

**Live scoring (Gameday)**:
- Phone: Current matchup fills the viewport. Scoring play feed is a scrolling list below. Win probability is a thin bar above the matchup.
- Tablet: Matchup + scoring feed side by side.
- Desktop: All league matchups visible in a grid, with the user's matchup expanded.

*(Note: Gameday/live-scoring visual language is unresolved — see §12.3.)*

### 6.4 Touch targets

All interactive elements must meet minimum touch target sizes:
- Buttons, links, tappable rows: minimum 44×44px tap area (even if the visual element is smaller)
- Form inputs: minimum 44px height
- Table rows (when tappable): minimum 44px height in Standard density; 40px acceptable in Compact density with adequate row spacing

---

## 7. Tier-Aware Rendering

Tier logic is defined in `Spec_Tiers.md`. This section establishes the design system's conventions for *how* tier gating manifests visually.

### 7.1 Three rendering strategies

When a feature is gated by tier, the component uses one of three strategies:

| Strategy | Behavior | When to use |
|---|---|---|
| **Hidden** | Component is not rendered at all. No DOM, no space reserved. | When the entire concept doesn't exist for this tier. Example: CapMeter in Redraft. |
| **Collapsed** | Component renders as a minimal placeholder with an explanation. | When the concept exists in the tier but is not currently active. Example: Taxi Squad tab in Keeper when `taxiSquadSpots = 0`. |
| **Degraded** | Component renders fully but with reduced columns or options. | When the concept exists but with fewer features. Example: RosterTable in Redraft shows player/position/stats but omits salary/contract columns. |

### 7.2 Tier indicator

The current league's tier is always visible in the LeagueNav area — a small Label (`REDRAFT`, `KEEPER`, `DYNASTY`). This gives users context for why certain features are or aren't visible.

The exploration shows this in the roster-table context bar: `DYNASTY · SALARY · CONTRACT` rendered in `type-mono`, gray-500.

### 7.3 Commissioner-facing vs. owner-facing tier behavior

On commissioner screens (League Setup, Settings), unavailable-due-to-tier features are shown as *disabled with explanation* — "Available in Dynasty tier" — so the commissioner understands what upgrading would unlock. On owner-facing screens, those same features are simply Hidden.

---

## 8. Franchise Theming System

The franchise theming system is how `Franchise.primaryColor` and `Franchise.secondaryColor` flow through the UI. **Major revision in v0.2:** franchise colors are now used as **bold blocks** on franchise-owned surfaces, not low-opacity accents. See §8.5.

### 8.1 Where franchise colors appear

| Surface | How franchise colors are used |
|---|---|
| Franchise home masthead | Full-bleed primary color block with franchise name, record, stats. Secondary color as adjacent panel. |
| Franchise newspaper lead story | Primary color block, body copy in `franchise-on-primary` |
| Franchise section navigation | Active tab has 2px top border in `franchise-primary` |
| Franchise marks / logos | Full-bleed primary with secondary geometric mark on top |
| Matchup cards | Thin color stripe on each franchise's side + full color block behind each score |
| Draft board | Cell background in franchise primary for each franchise's picks |
| Trade cards | Franchise color stripe identifying each party |
| Standings table | Small color dot next to franchise name, OR 2-3px left row border |
| Roster table (context bar) | 36×36 color block as franchise marker + franchise name in headline type |

### 8.2 Where franchise colors do NOT appear

- System navigation (GlobalNav, LeagueNav) — always system palette (`gray-950` backgrounds in the exploration)
- Forms and inputs — always system palette
- Status indicators (cap overage, injury status) — always system status colors (a red-themed franchise still uses `status-error` for cap overage)
- Commissioner tools — always system palette (neutral, not branded)
- League home page — neutral system palette; franchise colors appear only as per-row accents (color dot, stripe) because multiple franchises appear equally

### 8.3 Color-safety algorithms (committed)

The exploration defines two utility functions that every franchise-aware component must use:

**`onColor(hex)` → returns `'#0a0a0a'` or `'#ffffff'`**
```
Given a franchise hex color, return the text color to use on top of it.
1. Parse RGB from hex.
2. Compute luminance: (0.299*R + 0.587*G + 0.114*B) / 255
3. If luminance > 0.62, return gray-950 (dark text); else return #ffffff (light text).
```
This is a perceptual brightness calculation, not a WCAG contrast calculation. The 0.62 threshold was tuned on the five test franchises (OAK forest green, MIA hot pink, BRO near-black navy, SAN cream, PRT deep purple) and gives the correct answer for all of them.

**`safeBlock(hex)` → returns `{ color, veryLight, veryDark, lum }`**
```
Given a franchise hex color, identify edge cases.
1. Parse RGB and compute luminance as above.
2. veryLight = (lum > 0.85) — franchise color is nearly indistinguishable from page background
3. veryDark = (lum < 0.12) — franchise color is nearly indistinguishable from dark surfaces
4. Return the original color unchanged (do not auto-adjust) plus the flags.
```

### 8.4 Near-white and near-black franchise fallback

When `safeBlock(franchisePrimary).veryLight === true`:
- Any block using franchise primary color gets a 1px `gray-300` (or `gray-900`, depending on surrounding context) border so the block edges are visible against `gray-0` or `gray-25` page backgrounds
- Interior dividing borders (between primary block and secondary panel) also gain the fallback border

When `safeBlock(franchisePrimary).veryDark === true`:
- No border needed (near-black franchise colors are visible against light backgrounds)
- If the surrounding surface is also dark (e.g., system masthead in `gray-950`), a 1px `gray-800` or `gray-700` border may be needed — this is deferred to per-component judgment

The system never auto-adjusts a franchise's chosen color to fix contrast problems. Users chose the color on purpose; the system provides scaffolding (borders, on-color text selection) rather than overriding the choice.

### 8.5 Franchise block treatment (new in v0.2)

The defining visual move of the franchise identity system: **franchise colors are used as bold, full-bleed blocks on franchise-owned surfaces** — not as low-opacity tints.

**Where this applies:**
- Franchise home page masthead (large color block with franchise name, stats)
- Franchise home newspaper lead story (entire article block in franchise primary)
- Franchise mark / logo surfaces (full-bleed primary with geometric mark)
- Mobile franchise home hero
- Matchup cards (score block behind each team's number)

**Why this matters:**
- The "franchise-proud" principle argues for commitment, not timidity
- A franchise's home page should feel *owned* by that franchise, not tinted with a suggestion of their color
- Strong color blocks give the design system a distinctive visual identity — when a Claude Design-tier or competitor tried low-opacity accents, the result looked like every other sports dashboard
- The exploration proved this works across the full range of franchise colors, including edge cases (near-white, near-black, clashing pairs)

**Typography inside franchise blocks:**
- Headlines and stats use `franchise-on-primary` color (white or `gray-950` via `onColor()`)
- Meta labels use the same `franchise-on-primary` color at reduced opacity (typically 0.7 or 0.75) — never `gray-500` which would clash with the franchise color
- Dividers inside franchise blocks use `franchise-on-primary` at 0.2–0.3 opacity

**Contrast with operational surfaces:**
The stronger franchise blocks work *because* the operational surfaces are restrained. Roster tables, cap reports, and transaction logs are rendered in pure grayscale with franchise color appearing only as a small marker (36×36 color block in the context bar, 2-3px left border on relevant rows). The editorial surfaces get the color. The operational surfaces get out of the way. See §11.4.

### 8.6 Fallback behavior

If a franchise has no custom colors set (both null), the system uses `gray-800` as primary and `gray-400` as secondary — never another franchise's colors, never the system's primary action color. This produces a muted-but-coherent "generic franchise" look that still renders the block treatment legibly.

---

## 9. State Conventions

Every screen and component handles multiple states.

### 9.1 Data states

| State | Behavior |
|---|---|
| **Loading** | Show `SkeletonLoader` matching the component's layout shape. No spinner for content areas; spinners only for discrete actions (button submitting). |
| **Empty** | Show `EmptyState` component with context-appropriate message and primary action. Never show a blank area. |
| **Error** | Show `Alert` component with error description and retry action. Preserve any previously loaded data if possible (stale-while-revalidate). |
| **Populated** | Normal rendering. |

### 9.2 Permission states

| State | Behavior |
|---|---|
| **Authorized** | Normal rendering with all available actions. |
| **Read-only** | Data renders normally; action buttons are hidden (not disabled). Disabled buttons imply the action *could* be available; hiding them communicates that the user fundamentally doesn't have this capability. |
| **Commissioner-elevated** | Additional actions appear (edit, override, moderate). Visually secondary — outlined buttons, icon-only in toolbars — to avoid dominating the interface. |

### 9.3 Live states

| State | Behavior |
|---|---|
| **Static** | Default. Data was fetched at page load and doesn't update until refresh. |
| **Live** | `LiveIndicator` is visible. Data updates via WebSocket push. Score values animate on change. Timestamps show relative time ("2m ago"). |
| **Stale** | Data was live but the connection dropped. Show a "Data may be outdated" banner. Attempt reconnect. |

---

## 10. Accessibility Requirements

### 10.1 Standards

All components must meet WCAG 2.1 AA compliance. This is not negotiable.

### 10.2 Specific requirements

| Requirement | Implementation |
|---|---|
| Color contrast | All text meets 4.5:1 against its background (3:1 for large text). Franchise theming uses `onColor()` for contrast safety (§8.3). |
| Keyboard navigation | Every interactive element is reachable and operable via keyboard. Focus order follows visual order. Focus rings are visible. |
| Screen reader support | All images have alt text. Data tables use proper `<th>` markup. Dynamic content changes are announced via ARIA live regions. |
| Touch targets | Minimum 44×44px (see §6.4). |
| Reduced motion | All animation respects `prefers-reduced-motion`. Crossfade-only fallback for all transitions. |
| Color-independent meaning | Status is never conveyed by color alone — always paired with icon, label, or pattern. Important for colorblind users reviewing injury status, cap status, etc. |

**Known tension:** the `onColor()` algorithm uses perceptual luminance (0.62 threshold) rather than strict WCAG contrast calculation. This is deliberate — it produces better visual results across the five test franchises — but some edge-case franchise colors may pass the perceptual check while failing strict WCAG 4.5:1. When implementing `FranchiseHeader`, test the five reference franchises + a curated set of edge cases, and add specific carve-outs if any fail.

---

## 11. Competitive Positioning & Design Direction

This section captures what the design feels like relative to the competitive landscape. v0.2 upgrades this from "creative brief" to "design thesis."

### 11.1 What XO Play should NOT look like

| Platform | What to avoid | Why |
|---|---|---|
| ESPN/Yahoo Fantasy | Generic sports app aesthetic — big hero images, loud gradients, default-feeling UI | XO Play targets a more sophisticated user; the aesthetic is premium, not mass-market |
| MyFantasyLeague | Dense utility-first web 1.0 — unstyled tables, gray backgrounds, tiny text, no visual hierarchy | MFL's density is useful but its *presentation* is its weakness. XO Play keeps the density, adds the polish. |
| Sleeper | Gamified mobile-first with heavy dark mode, neon accents, achievement badges | Sleeper skews younger and more casual. XO Play feels serious/premium, not playful/gamified. |

### 11.2 What XO Play SHOULD feel like

**A premium sports publication meets a Bloomberg terminal** — editorially rich where content is king (franchise home, newspaper, articles), and ruthlessly functional where data work happens (roster management, cap reports, draft boards).

Key adjectives:
- **Authoritative** — This is a serious tool for serious leagues
- **Clean** — Visual noise is eliminated; every pixel earns its place
- **Dense-but-readable** — Tables are comfortable at high column counts
- **Editorially alive** — The narrative surfaces feel like a real sports page, not a dashboard
- **Franchise-proud** — Your team's identity is visible and respected

### 11.3 Four design principles (committed)

The exploration crystallized four principles — these now sit alongside the §2 design principles as visual (not just philosophical) commitments:

1. **Data is a feature.** Tables stay dense and readable at high column counts. Standard + compact modes.
2. **Franchise-proud.** Franchise colors do the shouting. System stays out of the way.
3. **Editorial ↔ operational.** Newspaper vibe on consumption screens. Terminal feel on data screens. Same DNA.
4. **Live ≠ static.** Distinct live-mode treatment. You always know what's updating.

### 11.4 The editorial ↔ operational bridge (new in v0.2)

The central structural question of the design system: XO Play has two very different moods (editorial and operational) that must feel like the same product. The exploration resolves this through a small number of specific moves:

**Shared foundations, different arrangements.**
- Same type system (Barlow + Barlow Condensed + JetBrains Mono). Editorial mode leans on display sizes (72-280px); operational mode leans on data sizes (12-14px). Same voice, different volume.
- Same color foundation (true-neutral grayscale + status + position). Editorial mode brings franchise color blocks; operational mode holds them in reserve (small marker only).
- Same components (`Mono`, `Label`, `ScoreNum`, `Pos`). The same primitives appear in both modes — they just compose differently.

**The structural signals that tell you which mode you're in:**

*Editorial mode (franchise home, newspaper, matchup):*
- Franchise primary color as large blocks
- Display-scale type (headlines at 52px+, franchise abbreviation at 280px)
- Newspaper rules (2px `gray-950` bottom border on section headers — "THE OAK DAILY" style)
- Generous spacing
- Content-driven asymmetric layouts (2fr 1fr main + rail)

*Operational mode (roster, cap, transactions, commissioner tools):*
- All grayscale; franchise color only as 36×36 marker in context bar
- Data-scale type (12-14px values, 11px meta labels)
- Thin `gray-100` row dividers
- Tight row heights (32-44px)
- Table-driven regular layouts
- Toolbar controls in `SegmentControl` style (active segment = `gray-950` bg, `gray-0` text)

**The bridge itself:**
- JetBrains Mono appears in both modes — "AI-WRITTEN · UPDATED 06:00" on a newspaper page has the same voice as "OAK · M. TORRES" on a roster table. The mono meta-label is the design system's consistent signature.
- Barlow Condensed appears in both modes — a 52px headline and a 13px column header are the same font, the same weight, the same spirit. The product is one product.
- Franchise color treatment is the *primary* switch. Big blocks = editorial. Small marker = operational. There is no middle ground by design.

### 11.5 Dark mode

Dark mode is a future consideration, not a v1 requirement. The token architecture supports it — swap the gray ramp (0 ↔ 950, 25 ↔ 900, etc.), darken status backgrounds, keep franchise colors unchanged. All color references in components must use tokens, never hardcoded values, so the swap is mechanical.

**Known unknowns for dark mode:** how franchise color blocks treat near-black franchises (BRO test case) on a near-black page. Also how the `onColor()` threshold needs to shift. Deferred until dark mode becomes a v1+N requirement.

---

## 12. Open Questions

Questions that remain open after v0.2. Resolved v0.1 questions are removed.

### 12.1 Iconography style

Line icons, filled icons, or a hybrid? What icon library (if any) as a starting point? Fantasy football has a lot of concept-specific icons (position indicators, transaction types, roster buckets, injury status) that may need custom work. The exploration is almost entirely icon-free — letter-based affordances (`Q`, `D`, `O`, `IR` for injury; 2-3 letter codes for positions) do the work icons usually would. Whether to extend this no-icon approach system-wide or introduce a minimal icon set is an open question.

### 12.2 Commissioner mode overlay treatment

The principle (§2.4) says commissioner tools layer on top of the same screens owners see. The exploration does not show what this looks like visually. When do commissioner actions appear — persistent secondary toolbar? Modal-triggered action menu? Inline edit buttons on hover? The `VIEWING AS OWNER` mono label on the franchise home section nav hints at a view-switching pattern, but the commissioner-mode side isn't shown. Needs dedicated exploration.

### 12.3 Gameday / live scoring visual language

The §2.6 and §11.3 principles commit to "live feels different from static." The exploration does not include a Gameday / live scoring view. Specific questions:
- How does the scoring play animation feel? Slide-in, fade, flash?
- Is there a full-screen Gameday mode that takes over the UI during NFL game windows, or does live state just overlay on existing screens?
- How does the `LiveDot` pulse — continuous or only on data change?
- What does a "stale connection" banner look like?

Recommend a dedicated Claude Design exploration for this surface before the first buildable unit is written. It's the most visually distinctive surface in the product.

### 12.4 Draft board visual treatment

The exploration does not cover the draft board. This is another candidate for dedicated exploration. Specific questions:
- Grid of picks by round × franchise, with each cell in the franchise primary color?
- How does a live auction UI differ from a snake-draft UI?
- How does the current pick highlight vs. historical picks?

### 12.5 Scoring play animation

How should live scoring plays animate in? Slide-in, fade, flash? The ScoringPlayFeed component is one of the most-watched surfaces during game windows — the animation needs to feel *exciting* without being distracting during sustained viewing.

### 12.6 Mobile navigation model

Bottom tab bar with 5 destinations is the current assumption. The exploration shows a top-nav mobile pattern, not a bottom tab bar. Which 5 destinations belong at the bottom? Candidates: Home, Roster, Matchup, Transactions, More. "More" is a grab-bag — is there a better decomposition?

### 12.7 Density mode default

Should new users start in Standard density and opt into Compact, or should the system auto-detect based on screen size (Compact on desktop with large monitors, Standard on laptops)? The exploration defaults to Standard. Commissioner tools default to Compact.

### 12.8 Franchise color palette limitations

Should XO Play restrict franchise color choices to a curated palette (preventing accessibility nightmares), or allow any hex value and handle contrast programmatically? The exploration commits to *any hex value*, with the `safeBlock()` fallback handling edge cases. This is the more expressive choice and pairs with the "franchise-proud" principle. Whether to add a "suggested palette" feature on top of free-form is open.

### 12.9 Design system tooling

Should the design system live in Figma (tokens + component library), in code (Storybook or equivalent), or both? The current state is: Claude Design exploration as reference artifact + this spec as canonical written reference. When the first buildable units are written, it will be worth deciding whether to formalize into Figma tokens, code tokens, or both.

### 12.10 Type weight coverage

The exploration uses Barlow weights 300-800 and Barlow Condensed 400-800. All weights are loaded from Google Fonts with a `display=swap` strategy. When implementing, confirm that loading all these weights doesn't cause unacceptable layout shift. If it does, prune to a smaller set (300/400/600/700 for Barlow; 500/600/700 for Barlow Condensed).

### 12.11 Spacing scale formalization

The exploration uses an informal 4/8/12/16/24/32/40/48 rhythm without named tokens. When the first buildable unit is written, these should be formalized as `spacing-xs` through `spacing-xxl` with specific pixel values.

---

## 13. Relationship to Other Specs

| Spec | Relationship |
|---|---|
| `Spec_Navigation.md` | Defines the screen map and navigation model. This spec defines how navigation components *look and behave*; Navigation defines *where they go*. |
| `Spec_Tiers.md` | Defines which features are active per tier. This spec defines *how* tier gating renders (§7). |
| `Spec_DataModel.md` | Defines entity fields. This spec defines how those fields are *displayed* (e.g., `salaryDisplayFormat` enum drives how SalaryTag renders). |
| Every Screen and Component buildable unit | References this spec for tokens, component APIs, density modes, responsive behavior, and state conventions. |

---

## 14. Related Buildable Units

When visual design is applied, each component in the inventory (§4) will get its own Level 3 Component doc. The highest-priority components for initial design work are the [Core]-tagged items:

1. `PageShell` / `ContentArea` / `Card` / `Stack` — layout foundation
2. `DataTable` / `CompactTable` — the most-used component in the product
3. `PlayerRow` / `PositionBadge` / `InjuryIndicator` / `Headshot` — player display primitives
4. `GlobalNav` / `LeagueNav` / `FranchiseSectionNav` / `TabBar` — navigation shell
5. `ScoreNum` / `ScoreDisplay` / `MatchupCard` — the emotional center of the product
6. `FranchiseMark` / `FranchiseHeader` / `TeamColorStripe` — franchise identity primitives
7. `Label` / `Mono` / `StatValue` — text primitives used everywhere
8. `SegmentControl` / `TextInput` / `Select` / `Toggle` / `SearchInput` — control primitives
9. `Toast` / `Alert` / `ConfirmDialog` — feedback layer

---

## 15. Reference Artifacts

The design exploration that informed v0.2 is preserved as reference. Location: `design/reference/` (recommended — to be created when this spec is committed).

**Files to preserve:**
- `XO Play Design System.html` — the showcase (can be rendered locally to browse all artboards with pan/zoom)
- `tokens.js` — concrete grayscale, status, position, injury, and franchise color values
- `primitives.jsx` — reference implementations of `Mono`, `Label`, `FranchiseMark`, `Pos`, `Injury`, `LiveDot`, `ScoreNum`, `Headshot`
- `franchise-home.jsx` — reference layout for the franchise home page (all five franchise variants)
- `roster-table.jsx` — reference layout for the roster table (standard + compact density)
- `league-home.jsx` — reference layout for the league home page
- `mobile.jsx` — reference layout for mobile franchise home
- `data.js` — mock data used to populate the showcase

**How these are used:**
- When writing a buildable unit for a component or screen, reference both this spec (for tokens and rules) and the corresponding reference file (for visual layout)
- The JSX files are NOT production code. They use inline styles, no React Native compatibility, no real component architecture. They are visual reference only, equivalent to a Figma mockup in code form.
- Tokens and rules in this spec override the reference files when they disagree (though v0.2 was written to match the reference).

---

**END OF DESIGN SYSTEM SPECIFICATION**

*This is version 0.2 — first visual commitments applied. Foundations (color, type, franchise theming, radius) are locked. Several surfaces remain unexplored (Gameday/live scoring, draft board, commissioner mode overlay) — these are flagged in §12 and warrant dedicated design exploration before their buildable units are written. Individual component visual details will be specified in Level 3 Component buildable units, which reference this spec for tokens and patterns.*
