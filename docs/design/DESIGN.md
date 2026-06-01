# XO Play — Design System

Visual reference for AI-assisted development. Read this before touching any UI.
**Token source of truth:** `src/theme/tokens.ts`. Values below are pulled from it — if they ever disagree, the code wins, and this file should be updated.

---

## Design Philosophy

XO Play should feel like **a premium sports publication meets a Bloomberg terminal** — authoritative, clean, dense-but-readable, editorially alive, and franchise-proud. It deliberately avoids the generic-sports-app look (ESPN/Yahoo), the web-1.0 density of MyFantasyLeague, and the gamified neon of Sleeper.

The system spans two surface modes and must bridge them without feeling like two products:
- **Editorial / consumption** — franchise home, matchup previews, league home, (future) AI newspaper. Rich, alive, publication-like.
- **Operational / data** — roster tables, cap reports, draft boards, transaction history, commissioner forms. Dense, precise, scannable at high data volume.

Guiding principles: **data density is a feature** (comfortable dense tables, not sparse ones); **franchise identity is first-class** (the system palette is true-neutral so any franchise hex pops as the accent); **live data looks different from static**; **commissioner controls overlay** the same screens owners see; and **dark mode is future** but the neutral system is structured for it.

---

## Color Tokens

### System grayscale — true neutral (13 steps)

| Step | Hex | Step | Hex |
|------|-----|------|-----|
| 0 | `#ffffff` | 500 | `#767676` |
| 25 | `#fbfbfb` | 600 | `#565656` |
| 50 | `#f6f6f6` | 700 | `#3d3d3d` |
| 100 | `#ededed` | 800 | `#262626` |
| 200 | `#dcdcdc` | 900 | `#141414` |
| 300 | `#c4c4c4` | 950 | `#0a0a0a` |
| 400 | `#a0a0a0` | | |

### Semantic usage (from the established build conventions)

| Role | Token | Hex |
|------|-------|-----|
| Page background (light surfaces) | gray-100 | `#ededed` |
| Card / panel surface | gray-0 | `#ffffff` |
| Dark chrome (GlobalNav, sidebar) | gray-950 | `#0a0a0a` |
| Text primary | gray-900 | `#141414` |
| Text secondary / muted | gray-500 | `#767676` |
| Divider / border | gray-200 | `#dcdcdc` |
| System emphasis / active state | gray-950 | `#0a0a0a` |
| Accent | franchise color | per-franchise (any hex) |

### Status — desaturated, muted

| Token | Hex | Background pair |
|-------|-----|-----------------|
| success | `#1d7d4c` | `#e8f1ec` |
| warning | `#9c6a00` | `#f6eedd` |
| error | `#b82727` | `#f6e4e4` |
| info | `#2c5d8f` | — |
| live | `#d81c1c` | live dot only — do not reuse elsewhere |

### Position color coding

| QB | RB | WR | TE | K | DEF | FLEX |
|----|----|----|----|----|-----|------|
| `#b8446b` | `#1f7a4c` | `#2656a5` | `#b36a1a` | `#6e4a9a` | `#4a4a4a` | `#565656` |

### Injury (reuses status/gray tokens)

| Q | D | O | IR |
|----|----|----|----|
| `#9c6a00` (warning) | `#b82727` (error) | `#b82727` (error) | `#141414` (gray-900) |

### Franchise theming

Franchise colors are arbitrary hex values (primary + secondary). The neutral system lets them tint headers and accents without clashing. Two helpers (`src/theme/helpers.ts`) keep them safe:
- `onColor(hex)` — returns `#0a0a0a` or `#ffffff` for text, by luminance (threshold ~0.62), so text stays legible on any franchise block.
- `safeBlock(hex)` — flags `veryLight` (luminance > 0.85) and `veryDark` (< 0.12) colors so near-white / near-black franchises get a border instead of vanishing.

Five sample franchises span the test range and should be used to validate any franchise-themed surface: Oakdale (safe/classic), Miami (bold clashing), Bronxville (near-black), Santa Fe (near-white), Portland (unexpected purple/teal).

---

## Typography

Three families, loaded via `@expo-google-fonts`. **Weight is encoded in the family name — never also set `fontWeight`** (RN-Web would miss the `@font-face` match and fall back). All numeric/data tokens carry `fontVariant: ['tabular-nums']`.

| Family | Weights | Used for |
|--------|---------|----------|
| Barlow | 300 / 400 / 500 / 600 / 700 | Body text, longform |
| Barlow Condensed | 500 / 600 / 700 | Display, headlines, stats, data, labels |
| JetBrains Mono | 400 / 500 | Mono/ticker-style metadata |

Representative roles from the committed scale (full set in `tokens.ts`):

| Role | Family | Size / line-height | Notes |
|------|--------|--------------------|-------|
| Display (xl→sm) | Barlow Condensed Bold | 96–64 | Uppercase, tight tracking; hero moments |
| Headline (lg→xs) | Barlow Condensed Bold | 52–22 | Section/page titles |
| Stat (xl→md) | Barlow Condensed Bold | 72–40 | Scores; tabular-nums; the most type-critical token |
| Body / Body Lg | Barlow Regular | 14 / 18 | Reading text |
| Data (md→sm) | Barlow Condensed med/semibold | 18–12 | Dense table values; tabular-nums |
| Label | Barlow Condensed Semibold | 13 | Uppercase, +1.2 letter-spacing |
| Mono | JetBrains Mono Regular | 11 | Uppercase, +0.4 tracking |

**Type rules:**
- All-caps for labels and most display tokens (letter-spacing carries the load at small sizes).
- Tabular-nums on every score, stat, salary, and data value so columns align.
- `ScoreNum` is Barlow Condensed Bold with tabular-nums — treat it as the signature element.

---

## Spacing & Layout

4px base scale (`tokens.ts` → `spacing`):

| Token | Value | Token | Value |
|-------|-------|-------|-------|
| xs | 4 | xl | 24 |
| sm | 8 | xxl | 32 |
| md | 12 | xxxl | 40 |
| lg | 16 | xxxxl | 48 |

Radius (`tokens.ts` → `radius`): none `0` · sm `3` · md `6` · lg `10` · xl `16` · full `999`.

**Layout rules:**
- Table density is a first-class control: **standard rows 44px, compact rows 32px** (smaller font, tighter padding).
- Dark chrome top/side (GlobalNav gray-950); light content canvas (gray-100); white cards.
- Mobile bottom bar: 5 slots with a "More" overflow; Gameday replaces the middle slot when a game is live.

---

## Component Patterns

These reflect what's built today in `src/components/` (specs in `specs/foundation/components/`).

### Cards & layout
`Card` — elevated container, radius-md (6). `Section` — titled, optionally collapsible. `Stack` — vertical/horizontal flex using spacing tokens. `PageShell` — wraps GlobalNav + LeagueNav + content. (Card shadow value is still TBD in the spec.)

### Navigation
`GlobalNav` — gray-950 top bar (league switcher + user menu). `LeagueNav` — section tabs (My Team, League, Transactions, Draft, Social, Commissioner) with a franchise-color accent.

### Data display
`DataTable` — sortable, data-driven column configs, standard/compact density via `SegmentControl`. Tables render their header and rows from one shared column config through a single layout function, so headers stay aligned to their columns and widths are tunable in one place. `PlayerRow` — composes `PositionBadge`, `InjuryIndicator`, `Headshot`, `Mono` (salary), `StatValue` (score). `SegmentControl` — active segment is gray-950 bg / gray-0 text.

### Scoring & matchup
`ScoreNum`, `ScoreDisplay`, `MatchupCard` — franchise-colored, with `LiveDot` + "LIVE" treatment when live.

### Buttons
**TBD** — no button component built yet. Define before building action-heavy screens.

---

## Do / Don't

**Do:**
- Pull every color, size, and font from `src/theme/tokens.ts` — zero hardcoded values.
- Use `tabular-nums` on all numeric displays.
- Let the franchise color be the accent on a neutral system; use `onColor()` / `safeBlock()` for contrast safety.
- Reserve `status.live` (`#d81c1c`) for the live dot only.

**Don't:**
- Don't set `fontWeight` alongside a Barlow family name — it breaks font matching on RN-Web.
- Don't use pure black; use gray-950 (`#0a0a0a`) or gray-900.
- Don't import anything from `design/reference/` into the app — reference only.
- Don't introduce a fixed brand accent that competes with franchise colors.
- Don't sparse out dense tables — density is a feature.

---

## Asset References

- **Token source of truth:** `src/theme/tokens.ts` (+ `franchiseColors.ts`, `helpers.ts`)
- **Structural spec:** `specs/Spec_DesignSystem.md`
- **Component specs:** `specs/foundation/components/`
- **Visual reference (retired Claude Design exploration — reference only, never imported):** `design/reference/`
- **Fonts:** Barlow, Barlow Condensed, JetBrains Mono (via `@expo-google-fonts`)
- **Icon set:** TBD
- **Dark mode:** future — the neutral system is structured for it, but no dark palette is committed yet
