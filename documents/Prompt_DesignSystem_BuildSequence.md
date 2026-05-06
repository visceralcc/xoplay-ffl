# XO Play — Design System Build Sequence

**Claude Code Handoff Prompts for Bottom-Up Component Development**

Created: May 2026 | Charlie Denison | XO Play (xoplay.co)

---

## How to use this document

This document contains a sequence of Claude Code prompts that build the XO Play design system from the ground up. Each prompt is a self-contained session — copy the fenced block and paste it as your opening message in a new Claude Code session.

**The sequence matters.** Each step builds on what the previous step created. Don't skip ahead.

**Spec files come back through Claude.ai first.** Steps that produce `.md` spec files are marked with ⚠️ SPEC REVIEW. Before running those prompts in Claude Code, bring them to the Claude.ai thread for drafting — Claude.ai writes the spec, you review it, then Claude Code implements it. The prompts below tell Claude Code where to find the spec file, assuming it's already been written and saved.

---

## Overview of Steps

| Step | What it does | Produces | ⚠️ Spec? |
|------|-------------|----------|-----------|
| 1 | Scaffold Expo project + fonts + tokens | Project skeleton, theme file, font loading | No |
| 2 | Set up component preview system | `app/preview.tsx` with empty registry | No |
| 3 | Create mock data | `src/data/mockData.ts` | No |
| 4 | Build Batch 1 — text & identity primitives | 8 components + preview entries | ⚠️ Yes — Component specs |
| 5 | Build Batch 2 — player row & data table | 3 components + preview entries | ⚠️ Yes — Component specs |
| 6 | Build Batch 3 — layout containers | 4 components + preview entries | ⚠️ Yes — Component specs |
| 7 | Build Batch 4 — scoring & matchup | 3 components + preview entries | ⚠️ Yes — Component specs |
| 8 | Build Batch 5 — screen compositions | 4 screen compositions + preview entries | ⚠️ Yes — Screen specs |

---

## Step 1 — Scaffold Expo Project + Fonts + Tokens

This creates the minimal Expo Router project with the XO Play design tokens and fonts loaded. No screens, no components — just the foundation that makes everything else work.

```claude-code-handoff
Project: XO Play (xoplay-ffl) | Root: ~/dev/xoplay-ffl/ | Branch: main

Task: Scaffold a minimal Expo Router project inside the existing repo at ~/dev/xoplay-ffl/. 
This repo already has specs/, documents/, design/, and research/ folders — DO NOT touch those. 
The Expo project lives alongside them.

Phase 1 — Initialize Expo project:
1. Run `npx create-expo-app@latest . --template blank-typescript` from the repo root 
   (or the equivalent that works inside an existing folder). If there's a conflict with 
   existing files, create the Expo files without overwriting specs/, documents/, design/, 
   or research/.
2. Install Expo Router: `npx expo install expo-router expo-linking expo-constants`
3. Create the app/ directory with a minimal `app/_layout.tsx` and `app/index.tsx` 
   (just a "Hello XO Play" placeholder).
4. Verify it runs: `npx expo start --web` should show the placeholder.

Phase 2 — Load fonts:
1. Install expo-font and the three Google Fonts packages:
   - @expo-google-fonts/barlow (weights: 300, 400, 500, 600, 700)
   - @expo-google-fonts/barlow-condensed (weights: 500, 600, 700)
   - expo-google-fonts/jetbrains-mono (weights: 400, 500)
2. Load fonts in _layout.tsx using useFonts(). Show a loading screen until fonts are ready.
3. Verify fonts load in the browser.

Phase 3 — Port design tokens:
1. Read the existing token file at design/reference/tokens.js for reference values.
2. Read the Design System spec at specs/Spec_DesignSystem.md — sections §3 (Tokens) and 
   §8 (Franchise Theming) are the source of truth. The tokens.js file is a reference 
   implementation; the spec values override if they disagree.
3. Create src/theme/tokens.ts with typed exports:
   - gray (13-step ramp: 0, 25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950)
   - status colors (success, successBg, warning, warningBg, error, errorBg, info, live)
   - position colors (QB, RB, WR, TE, K, DEF, FLEX)
   - injury colors (Q, D, O, IR)
   - radius scale (none, sm, md, lg, xl, full)
   - spacing scale (xs=4, sm=8, md=12, lg=16, xl=24, xxl=32, xxxl=40, xxxxl=48)
   - typography scale with font family references, sizes, weights, line heights
4. Create src/theme/franchiseColors.ts with the 5 sample franchises from tokens.js.
5. Create src/theme/helpers.ts with the onColor() and safeBlock() utility functions.
6. Create src/theme/index.ts that re-exports everything.

Key constraints:
- TypeScript throughout — no .js files in src/
- All token values must match Spec_DesignSystem.md §3 exactly
- Spacing scale: xs=4, sm=8, md=12, lg=16, xl=24, xxl=32, xxxl=40, xxxxl=48
- Font families reference the expo-google-fonts loaded names (not CSS strings)
- DO NOT create any UI components yet — this is infrastructure only

Work phase by phase. After completing each phase, stop and check in.
Commit after each phase: "chore: Phase N — [description]"
```

---

## Step 2 — Set Up Component Preview System

This adds the preview route so we have a visual sandbox for building components.

```claude-code-handoff
Project: XO Play (xoplay-ffl) | Root: ~/dev/xoplay-ffl/ | Branch: main

Read the component-preview skill at: 
~/.claude/skills/user/component-preview/SKILL.md
(If not found there, check ~/Library/Application Support/Claude/skills/)

Task: Add the Component Preview System to the XO Play Expo Router project.

Steps:
1. Read the project's theme setup at src/theme/ — understand the token structure, 
   font loading, and color system.
2. Create app/preview.tsx following the skill's pattern:
   - Web-only platform guard
   - Sidebar (280px, dark background using gray-900 from tokens) + Canvas layout
   - Component registry structure with phone/naked frame modes
   - Prop control system (stepper, toggle, select types)
   - Import and apply the project's real fonts and theme tokens
3. Start the registry EMPTY — no component entries yet. Just verify the shell renders:
   sidebar with "No components registered" message, blank canvas.
4. Style the sidebar using the project's gray scale (gray-950 bg, gray-0 text, 
   gray-700 borders). The canvas should use gray-100 as default background.
5. Verify it works: `npx expo start --web` → navigate to localhost:8081/preview

Key constraints:
- Single file: everything in app/preview.tsx
- Must use the REAL theme tokens from src/theme/ — no hardcoded colors
- Web-only — guard against native rendering
- naked frame mode requires componentWidth
- No API calls or side effects — preview is a design tool

Commit: "feat: add component preview system"
```

---

## Step 3 — Create Mock Data

This creates realistic fantasy football data that every component will use.

```claude-code-handoff
Project: XO Play (xoplay-ffl) | Root: ~/dev/xoplay-ffl/ | Branch: main

Task: Create a mock data file at src/data/mockData.ts with realistic fantasy football 
data for populating component previews.

Read these files for the exact data shapes:
- specs/Spec_DataModel.md — §4 for entity definitions, §5 for enum values
- specs/Spec_DesignSystem.md — §8.5 for the 5 sample franchises
- design/reference/tokens.js — for franchise color values

Create src/data/mockData.ts with TypeScript types and sample data:

1. Player data — at least 25 players covering:
   - All offensive positions (QB, RB, WR, TE, PK) — at least 2 of each
   - At least 5 IDP players (mix of DT, DE, LB, CB, S)
   - Mix of injury statuses: most HEALTHY, a few QUESTIONABLE, one DOUBTFUL, one OUT, one IR
   - Realistic names (use fictional but realistic-sounding names, not joke names)
   - Each player has: id, firstName, lastName, position, nflTeam (real NFL team abbrev), 
     injuryStatus, byeWeek (number), salary (decimal, range $0.50-$45.00), 
     contractYears (1-5), contractStatus, acquiredVia, 
     weeklyScores (array of ~4 recent weeks, decimal), seasonTotal (decimal),
     projectedPoints (decimal), rosterBucket (ACTIVE/IR/TAXI)
   - At least 3 players on TAXI, 2 on IR

2. Franchise data — the 5 sample franchises from tokens.js, each with:
   - id, name, slug, abbreviation, primaryColor, secondaryColor
   - owner name, record (wins-losses), pointsFor, pointsAgainst
   - capUsed, capTotal (use $222.75 as cap, vary usage 85%-102%)
   - Players assigned to franchises (5 players each, roughly)

3. Standings data — all 5 franchises ranked with:
   - rank, franchiseId, wins, losses, ties, pointsFor, pointsAgainst, 
     streak (like "W3" or "L1"), divisionRecord

4. Matchup data — 2 sample matchups:
   - Each has: homeTeam, awayTeam (franchise refs), homeScore, awayScore, 
     weekNumber, isLive (one true, one false), 
     scoringPlays (array of 5-8 plays with player, points, timestamp, description)

5. Transaction data — 5 sample recent transactions:
   - Mix of ADD, DROP, WAIVER_CLAIM, TRADE types
   - Each with: id, type, timestamp, franchise, player(s), details

Export everything as named exports with proper TypeScript types.
Use realistic NFL team abbreviations (KC, BUF, PHI, SF, etc.).
All salary values should use 2 decimal places.

Key constraints:
- Types must align with Spec_DataModel.md entity shapes — use the same field names
- Enum values must match Spec_DataModel.md §5 exactly (SCREAMING_SNAKE_CASE)
- The 5 franchises must use the exact color values from tokens.js
- This is MOCK data for previews — no API calls, no dynamic behavior
- Keep the file self-contained — no imports from the theme (data is pure)

Commit: "feat: add mock data for component previews"
```

---

## Step 4 — Batch 1: Text & Identity Primitives

⚠️ **SPEC REVIEW:** Before running this prompt, bring the following component specs back 
to the Claude.ai thread for drafting:
- `Component_Label.md`
- `Component_Mono.md`
- `Component_PositionBadge.md`
- `Component_InjuryIndicator.md`
- `Component_Headshot.md`
- `Component_FranchiseMark.md`
- `Component_LiveDot.md`
- `Component_StatValue.md`

Ask in the Claude.ai thread: "Ready to write the Batch 1 component specs — Label, Mono, 
PositionBadge, InjuryIndicator, Headshot, FranchiseMark, LiveDot, and StatValue."

Once the specs are written and saved to specs/foundation/components/, run this prompt:

```claude-code-handoff
Project: XO Play (xoplay-ffl) | Root: ~/dev/xoplay-ffl/ | Branch: main

Task: Build the first batch of design system components — the text and identity primitives 
that everything else composes.

Read these specs for exact requirements:
- specs/foundation/components/Component_Label.md
- specs/foundation/components/Component_Mono.md
- specs/foundation/components/Component_PositionBadge.md
- specs/foundation/components/Component_InjuryIndicator.md
- specs/foundation/components/Component_Headshot.md
- specs/foundation/components/Component_FranchiseMark.md
- specs/foundation/components/Component_LiveDot.md
- specs/foundation/components/Component_StatValue.md

Also read for context:
- specs/Spec_DesignSystem.md — §3 (tokens), §4.2-4.3 (component inventory entries)
- design/reference/primitives.jsx — visual reference (NOT production code)
- src/theme/ — use these tokens, not hardcoded values

Phase 1 — Build each component as a standalone file:
1. Create src/components/ directory
2. For each component, create src/components/[ComponentName].tsx
3. Follow the component spec for props, states, and visual rules
4. Use tokens from src/theme/ — never hardcode colors, sizes, or fonts
5. Reference design/reference/primitives.jsx for visual guidance, but the component 
   specs are the source of truth when they disagree

Phase 2 — Register in preview:
1. Import all 8 components into app/preview.tsx
2. Add a registry entry for each component with:
   - category: "Primitives"
   - frameMode: "naked"
   - Appropriate componentWidth for each (Label ~200, Badge ~60, Headshot ~80, etc.)
   - Mock data from src/data/mockData.ts for defaultProps
   - Prop controls where useful (e.g., position selector for PositionBadge, 
     injury status selector for InjuryIndicator, size stepper for Headshot)
3. Verify all 8 render correctly in the preview at localhost:8081/preview

Key constraints:
- TypeScript + React Native components (not web-only HTML)
- All styles via StyleSheet.create — no inline style objects
- All colors/sizes/fonts come from src/theme/tokens — zero hardcoded values
- Each component in its own file — no barrel exports yet
- The component specs are the authority — primitives.jsx is visual reference only
- fontVariantNumeric: 'tabular-nums' on ALL numeric displays

Work phase by phase. After completing each phase, stop and check in.
Commit after each phase: "feat(design-system): Batch 1 Phase N — [description]"
```

---

## Step 5 — Batch 2: Player Row & Data Table

⚠️ **SPEC REVIEW:** Before running this prompt, bring these component specs to the 
Claude.ai thread:
- `Component_PlayerRow.md`
- `Component_DataTable.md`
- `Component_SegmentControl.md`

Ask in the Claude.ai thread: "Ready to write the Batch 2 component specs — PlayerRow, 
DataTable, and SegmentControl."

```claude-code-handoff
Project: XO Play (xoplay-ffl) | Root: ~/dev/xoplay-ffl/ | Branch: main

Task: Build the second batch — the player row, data table, and segment control. These 
are the most-used components in the product.

Read these specs for exact requirements:
- specs/foundation/components/Component_PlayerRow.md
- specs/foundation/components/Component_DataTable.md
- specs/foundation/components/Component_SegmentControl.md

Also read:
- specs/Spec_DesignSystem.md — §4.2 (data display), §4.5 (roster), §4.11 (controls), 
  §5 (data density strategy)
- src/components/ — the Batch 1 primitives this batch composes

Phase 1 — PlayerRow:
1. Create src/components/PlayerRow.tsx
2. PlayerRow composes: PositionBadge, InjuryIndicator, Headshot, Mono (for salary), 
   StatValue (for score). Follow the component spec for exact layout.
3. Two density modes: standard (44px row height) and compact (32px row height)
4. Add preview entry with category "Data Display", several player variants from mockData

Phase 2 — SegmentControl:
1. Create src/components/SegmentControl.tsx
2. Follow the component spec — active segment uses gray-950 bg with gray-0 text
3. Add preview entry with prop controls for number of segments, active index

Phase 3 — DataTable:
1. Create src/components/DataTable.tsx
2. Sortable columns (tap header to sort), configurable column definitions
3. Two density modes matching PlayerRow (standard 44px / compact 32px)
4. Uses SegmentControl for density toggle in its toolbar
5. Add preview entry with category "Data Display", populated with player data 
   from mockData, showing a full roster table with 8+ columns

Key constraints:
- PlayerRow must work both standalone AND inside DataTable rows
- DataTable column definitions are data-driven (array of column configs), 
  not hardcoded to roster columns
- Compact mode: 32px rows, smaller font sizes, tighter padding — per §5 of 
  Spec_DesignSystem.md
- Sort is client-side for preview — no API calls
- All tabular numbers use tabular-nums

Work phase by phase. After completing each phase, stop and check in.
Commit after each phase: "feat(design-system): Batch 2 Phase N — [description]"
```

---

## Step 6 — Batch 3: Layout Containers

⚠️ **SPEC REVIEW:** Before running this prompt, bring these component specs to the 
Claude.ai thread:
- `Component_Card.md`
- `Component_Section.md`
- `Component_Stack.md`
- `Component_PageShell.md`

Ask in the Claude.ai thread: "Ready to write the Batch 3 component specs — Card, Section, 
Stack, and PageShell (including GlobalNav and LeagueNav stubs)."

```claude-code-handoff
Project: XO Play (xoplay-ffl) | Root: ~/dev/xoplay-ffl/ | Branch: main

Task: Build the layout containers that organize content on every screen.

Read these specs for exact requirements:
- specs/foundation/components/Component_Card.md
- specs/foundation/components/Component_Section.md
- specs/foundation/components/Component_Stack.md
- specs/foundation/components/Component_PageShell.md

Also read:
- specs/Spec_DesignSystem.md — §4.1 (layout primitives)
- specs/foundation/Spec_Navigation.md — §2 (navigation hierarchy) for how 
  GlobalNav and LeagueNav work structurally

Phase 1 — Card, Section, Stack:
1. Create src/components/Card.tsx — elevated container with shadow-card, radius-md
2. Create src/components/Section.tsx — titled section with optional collapse
3. Create src/components/Stack.tsx — vertical or horizontal flex with spacing tokens
4. Add preview entries for each, category "Layout"

Phase 2 — PageShell with nav stubs:
1. Create src/components/PageShell.tsx — top-level page wrapper
2. Create src/components/GlobalNav.tsx — stub with league switcher placeholder and 
   user menu placeholder. Uses gray-950 background.
3. Create src/components/LeagueNav.tsx — stub with section tabs (My Team, League, 
   Transactions, Draft, Social, Commissioner). Uses franchise color accent.
4. PageShell composes GlobalNav (top bar) + LeagueNav (sidebar or secondary bar) + 
   content area with ContentArea max-width wrapper
5. Add preview entry for PageShell in "phone" frame mode showing the full shell 
   with placeholder content

Key constraints:
- Nav components are STUBS — they render visually but don't navigate anywhere
- PageShell must work in the preview's "phone" frame (390×844)
- LeagueNav should accept a franchise prop to show franchise color accent
- Card shadow values: use a reasonable default since shadow tokens are TBD in the spec
- Stack spacing uses the spacing scale from tokens (xs through xxxxl)

Work phase by phase. After completing each phase, stop and check in.
Commit after each phase: "feat(design-system): Batch 3 Phase N — [description]"
```

---

## Step 7 — Batch 4: Scoring & Matchup

⚠️ **SPEC REVIEW:** Before running this prompt, bring these component specs to the 
Claude.ai thread:
- `Component_ScoreNum.md`
- `Component_ScoreDisplay.md`
- `Component_MatchupCard.md`

Ask in the Claude.ai thread: "Ready to write the Batch 4 component specs — ScoreNum, 
ScoreDisplay, and MatchupCard."

```claude-code-handoff
Project: XO Play (xoplay-ffl) | Root: ~/dev/xoplay-ffl/ | Branch: main

Task: Build the scoring and matchup components — the emotional center of the product.

Read these specs for exact requirements:
- specs/foundation/components/Component_ScoreNum.md
- specs/foundation/components/Component_ScoreDisplay.md
- specs/foundation/components/Component_MatchupCard.md

Also read:
- specs/Spec_DesignSystem.md — §4.4 (scoring & matchup components)
- design/reference/primitives.jsx — ScoreNum reference implementation

Phase 1 — ScoreNum and ScoreDisplay:
1. Create src/components/ScoreNum.tsx — large formatted score number. 
   Barlow Condensed 700, tabular-nums, configurable size.
2. Create src/components/ScoreDisplay.tsx — full matchup score block with 
   franchise context (marks, names, records alongside scores)
3. Add preview entries for both, category "Scoring"

Phase 2 — MatchupCard:
1. Create src/components/MatchupCard.tsx — two-franchise head-to-head card
2. Composes: FranchiseMark, ScoreNum, LiveDot (when live), franchise color accents
3. Two states: live (with LiveDot and pulsing accent) and final
4. Add preview entry with both a live matchup and a final matchup from mockData
5. Add prop controls: toggle live/final state, adjust scores

Key constraints:
- ScoreNum MUST use Barlow Condensed 700 with tabular-nums — this is the most 
  typographically critical component in the system
- MatchupCard uses franchise colors for team identity (color stripe or block)
- Live state shows LiveDot + "LIVE" label
- Scores must align vertically even when digit counts differ (tabular-nums)

Work phase by phase. After completing each phase, stop and check in.
Commit after each phase: "feat(design-system): Batch 4 Phase N — [description]"
```

---

## Step 8 — Batch 5: Screen Compositions

⚠️ **SPEC REVIEW:** Before running this prompt, bring these screen specs to the 
Claude.ai thread:
- `Screen_RosterView.md`
- `Screen_FranchiseHome.md`
- `Screen_Standings.md`
- `Screen_AddDrop.md`

Ask in the Claude.ai thread: "Ready to write the Batch 5 screen specs — RosterView, 
FranchiseHome, Standings, and AddDrop."

```claude-code-handoff
Project: XO Play (xoplay-ffl) | Root: ~/dev/xoplay-ffl/ | Branch: main

Task: Compose the existing components into full screen previews. These are NOT real 
app screens — they're preview compositions that prove the components work together.

Read these specs for layout and content requirements:
- specs/franchise/screens/Screen_RosterView.md
- specs/franchise/screens/Screen_FranchiseHome.md
- specs/league/screens/Screen_Standings.md
- specs/transactions/screens/Screen_AddDrop.md

Also read:
- specs/foundation/Spec_Navigation.md — §2.2 for how screens nest inside PageShell
- specs/Spec_Tiers.md — §6 for which elements appear per tier

Phase 1 — Roster View:
1. Create src/previews/RosterPreview.tsx
2. Compose: PageShell > Section > SegmentControl (Active/IR/Taxi) > DataTable 
   with PlayerRow children
3. Show all columns: position, name, NFL team, injury, salary, contract years, 
   bye week, last week score, season total
4. Populate with mockData players, filter by rosterBucket based on active segment
5. Add preview entry in "phone" frame mode, category "Screens"

Phase 2 — Franchise Home:
1. Create src/previews/FranchiseHomePreview.tsx
2. Compose: PageShell > FranchiseHeader (franchise color block with mark, name, 
   record, key stats) > Grid of Cards (upcoming matchup, roster summary, 
   recent transactions, cap usage)
3. Use franchise colors from mockData for the header block
4. Add preview entry in "phone" frame mode

Phase 3 — Standings:
1. Create src/previews/StandingsPreview.tsx
2. Compose: PageShell > Section > DataTable with franchise rows
3. Columns: rank, franchise (with FranchiseMark), record, PF, PA, streak
4. Populate with mockData standings
5. Add preview entry in "phone" frame mode

Phase 4 — Add/Drop:
1. Create src/previews/AddDropPreview.tsx
2. Compose: PageShell > two-panel layout:
   - Left/top: "Available Players" — DataTable with PlayerRow, search input
   - Right/bottom: "My Roster" — compact DataTable with current roster
3. Add preview entry in "phone" frame mode

Key constraints:
- These are PREVIEW compositions, not real app screens — no routing, no data 
  fetching, no state management beyond the preview's prop controls
- All data comes from mockData — no API calls
- Screen specs define layout and content; component specs define how each piece 
  renders. Both are needed.
- Tier variations: show Dynasty tier (most complete) as the default preview. 
  Add a prop control to toggle tier visibility where relevant.
- Put these in src/previews/ (not src/components/) to distinguish compositions 
  from reusable components

Work phase by phase. After completing each phase, stop and check in.
Commit after each phase: "feat(design-system): Batch 5 Phase N — [description]"
```

---

## What Happens After Step 8

Once all 5 batches are built and previewing:

1. **Review in the preview tool.** Walk through every component and screen composition. 
   Note what works, what needs adjustment.
2. **Update Spec_DesignSystem.md.** Lock in the visual decisions that came out of building 
   real components — concrete spacing values, shadow values, any color adjustments.
3. **Write the remaining component specs** for [Feature]-tagged components as those 
   features come up for build.
4. **Begin real screen specs** (Screen_FranchiseHome.md, Screen_RosterEdit.md, etc.) 
   that reference the now-proven component library.

---

**END OF BUILD SEQUENCE**
