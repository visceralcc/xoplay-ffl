# XO Play — Placeholder Render Convention

**Status:** Draft
**Parent:** [Spec_DesignSystem.md](../Spec_DesignSystem.md)
**Related specs:** [Spec_Navigation.md](./Spec_Navigation.md); [Wireframes.md](./Wireframes.md); [Spec_MockFixture.md](./Spec_MockFixture.md); [Spec_Tiers.md](../Spec_Tiers.md)
**Last updated:** June 2026

---

## Purpose

This document defines how XO Play screens are rendered during the **placeholder phase** — the push to stand up *every* screen and component with correct data and structure, before final visual design is applied.

The goal is **coverage over polish**: get the whole product walkable, so design refinement and data-wiring can happen in parallel without blocking screen builds. The single biggest risk to that goal is Claude Code making per-screen design micro-decisions (a custom padding here, a hand-picked gray there, a one-off "Button" somewhere else) that all have to be found and undone later. This spec exists to remove those decisions.

The rule, in one sentence: **assemble screens from the existing component library using only design tokens — never invent styling, never invent components.**

**What this spec covers:**
- The fixed page skeleton every screen uses
- Which existing components to compose, and that new ones are not created in placeholder mode
- The token vocabulary (real names from `src/theme/tokens.ts`) and the semantic roles each token plays
- How to handle empty data, missing data, tier-gating, owner-vs-visitor, and stubbed actions
- A per-screen checklist
- When a screen graduates out of placeholder mode

**What this spec does NOT cover:**
- Final visual design (color treatments, spacing refinement, motion) — Charlie owns this, applied later against built screens
- What content goes on each screen — see [Wireframes.md](./Wireframes.md) and the per-screen specs
- Data shapes — see [Spec_MockFixture.md](./Spec_MockFixture.md) and [Spec_DataModel.md](../Spec_DataModel.md)

---

## 1. Core principle: compose, don't style

A placeholder screen is **assembled**, not **designed**. Concretely:

1. **Only tokens.** Every color, space, radius, and text style comes from `@/theme`. No literal hex colors, no inline `fontSize`, and no literal pixel values for padding/margin/gap. *Exception:* the per-column geometry inside a table (fixed column widths, the inter-column gap) may use literal pixels — a tight data table can't be built from the 8px spacing scale, and the existing tables (`Standings`, `PlayerRow`) already do this. That exception is **only** for table column sizing; everything else stays on tokens.
2. **Only existing components.** Build screens by composing the components that already exist in `src/components/` (listed in §3). Do **not** create new visual components during placeholder work. If a screen seems to need a component that doesn't exist, that's a flag to raise with Charlie — not a license to invent one inline.
3. **Real data, real shapes.** Screens read from the normalized fixture via the derive helpers in `@/data`. Derived values (records, cap usage, standings) are always computed by helpers, never hand-typed or stored.
4. **If you're making a visual judgment, stop.** Choosing a weight, a tint, a custom gap, or designing a brand-new control are all design decisions. They belong to a later pass that Charlie drives. When in doubt, use the plainest token-built option and move on.

> The two existing inline affordances `LinkAction` and `ActionButton` (see `FranchiseHome.tsx`) are the **only** sanctioned exception: there is no `Button` component specced yet, so screens may use those minimal token-built placeholders for tap targets. They get replaced when the design system's button lands. Do not create *other* inline components beyond these two.

---

## 2. The page skeleton

**Screens are chrome-less.** A screen component renders only its own content — it does **not** wrap itself in `PageShell`, navigation, or a max-width frame. The surrounding chrome is supplied by the layer above it: today the preview phone frame, and later the route shell. This matches every existing screen (`FranchiseHome`, `RosterView`, `Standings`): each is a plain `View` + `ScrollView`, nothing more.

So `PageShell` is a real component and the eventual home for `GlobalNav` + `LeagueNav` + the 960px centered content frame — but it is applied by the route layer, not by individual screens. When building a screen, do not add it; when building the route shell (a separate, later task), that is where `PageShell` wraps the screen.

```
[route shell / preview frame]   ← supplies PageShell + nav (NOT the screen's job)
└─ Screen                       ← what you build: View + ScrollView only
   ├─ Masthead (optional, full-bleed)
   ├─ Lead row (optional)
   └─ Regions (Sections / Cards)
```

The screen's own outermost `View` carries the page background and the `ScrollView` holds the content. Mirror the reference screens: full-bleed masthead (if any) sits flush, and the regions below get a `spacing.lg` horizontal gutter.

Inside the content, screens follow this vertical structure:

| Zone | What it holds | Convention |
|---|---|---|
| **Masthead** (optional) | Identity header — e.g. `FranchiseHeader` | Full-bleed; sits above the gutter. Only screens with a strong identity anchor use one. |
| **Lead row** (optional) | A horizontal `Stack` of `StatValue`s — the at-a-glance numbers | `gap={spacing.xl}`, `wrap` |
| **Regions** | The body: a vertical stack of `Section`s and/or `Card`s | `gap={spacing.lg}` between regions |

Surface roles are fixed (see §4): the eventual page chrome (route shell) sits on `gray[50]`, the screen's own background and content surfaces (`Card`) sit on `gray[0]`, and dividers/borders are `gray[100]` (with `gray[200]` acceptable for stronger structural rules — e.g. a header underline).

**Two-column vs. stacked.** Where a wireframe specifies a desktop two-column arrangement (e.g. Franchise Home main + sidebar), build the **single-column mobile stack first**, in the stacking order the wireframe gives. The two-column desktop split is a responsive refinement and may be deferred to the design pass unless the screen spec says otherwise. Coverage first.

---

## 3. The component library (reuse these)

These exist in `src/components/`. Compose them; do not duplicate or replace them.

**Layout & structure**
- `PageShell` — page frame (nav + scroll + max-width). Every authenticated screen.
- `Section` — titled grouping, no surface of its own (label-style title + divider). Has an optional `action` slot for "View →" links and optional `collapsible`.
- `Card` — elevated surface (border, radius, subtle shadow) for grouped content. Default padding `spacing.lg`, background `gray[0]`.
- `Stack` — flex primitive for consistent gaps. Default gap `spacing.md`.

**Identity & franchise**
- `FranchiseHeader` — masthead (name, mark, owner, record, tier label).
- `FranchiseMark` — logo / geometric mark.
- `Headshot` — player image with silhouette fallback.

**Data display**
- `DataTable` — the table shell. It owns the header row and (optional) density toggle, and delegates each row to a `renderRow` prop — so the **same** column config drives the header and the rows, and they cannot drift apart. **Use `DataTable` for every table; do not hand-roll a header row + cell-sizing function on a screen.** Per-row customization (e.g. tinting the viewer's own row, a full-width bleed) is done inside `renderRow`, not by rebuilding the table. `Standings` is the reference.
- `PlayerRow` — a player line; takes a `ColumnDef[]` and a `density`.
- `StatValue` — labeled stat (with `size`).
- `StatValue` / `ScoreNum` / `ScoreDisplay` — numeric displays.
- `CapMeter` — salary-cap usage bar.
- `TransactionRow` — one transaction-feed line.
- `MatchupCard` — one matchup (away-left / home-right, status-aware).

**Atoms & indicators**
- `Label`, `Mono` — text primitives in label / mono styles.
- `PositionBadge`, `InjuryIndicator`, `LiveDot` — status atoms.
- `SegmentControl` — segmented toggle (e.g. density, filter).

**Tables are config-driven.** Tables render from a `ColumnDef[]` array — `{ key, label, width?, align? }` — so headers and cells share one source of truth and cannot drift apart. Define the column config once per table; never lay out columns by hand. Use a slim column set for summary tables and the full set on the dedicated operational screen.

---

## 4. Token vocabulary

These are the **real** token names from `src/theme/tokens.ts`. Type tokens carry no color — color is applied separately, per use, from the grayscale/status sets below.

### 4.1 Color — surface & text roles

There is no separate "semantic surface" token layer; screens map the raw grayscale to these fixed roles:

| Role | Token | Notes |
|---|---|---|
| Page chrome background | `gray[50]` | Provided by `PageShell`. |
| Content surface (cards) | `gray[0]` | `Card` default. |
| Borders & dividers | `gray[100]` | Table rules, card borders, section dividers. |
| Primary text | `gray[900]` / `gray[950]` | Values, headings, body copy on light surfaces. |
| Secondary text | `gray[500]` / `gray[600]` | Section titles, labels, link affordances, metadata. |
| Faint / pressed / disabled-look | `gray[400]` | De-emphasized text, pressed link state. |
| Text on a colored surface | `onColor(hex)` | **Always** use the helper for text over a franchise color or dark fill — never hard-code white/black. |

### 4.2 Color — status, position, injury

- `status.success / successBg / warning / warningBg / error / errorBg / info / live`
- `position.QB / RB / WR / TE / K / DEF / FLEX`
- `injury.Q / D / O / IR`

Use the named status/position/injury tokens rather than re-deriving colors. Prefer the dedicated atoms (`PositionBadge`, `InjuryIndicator`, `LiveDot`) over applying these colors by hand.

### 4.3 Spacing

`spacing.xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `xxl` 32 · `xxxl` 40 · `xxxxl` 48

Defaults in practice: page/region gutter `spacing.lg`; gaps between regions `spacing.lg`; gaps inside a group `spacing.md`; tight atom gaps `spacing.xs`–`spacing.sm`; lead stat row `spacing.xl`. **Never** write a raw pixel value — pick the nearest token.

### 4.4 Radius

`radius.none 0 · sm 3 · md 6 · lg 10 · xl 16 · full 999`. Cards and inputs use `radius.md`.

### 4.5 Typography

Apply a type token by spreading it (`...type.headlineMd`) and then setting `color` separately.

| Token group | Members | Typical use |
|---|---|---|
| Display | `displayXxl/Xl/Lg/Md/Sm` | Hero numbers, big identity moments. |
| Headline | `headlineLg/Md/Sm/Xs` | Screen and section titles. |
| Stat | `statXl/Lg/Md` | Large standout numbers (carry tabular-nums). |
| Body | `bodyLg/body/bodySm/bodyXs` | Paragraphs, descriptions, helper/meta text. |
| Data | `dataMd/data/dataSm` | Table and list values (Barlow Condensed, tabular-nums). |
| Label | `label/labelSm` | Uppercase column headers, section titles, eyebrows. |
| Mono | `mono` | IDs, system labels, tier strings. |

Data and stat tokens already include `tabular-nums`; don't re-specify numeric variants.

---

## 5. Data, empty, and missing states

### 5.1 Reading data
Screens read from the normalized fixture through `@/data` derive helpers (e.g. `getFranchiseIdentity`, `computeRecord`, `getStartersByFranchise`, `describeTransaction`). Never denormalize into a row, never store a derived value, and resolve player references by ID through the helpers rather than embedding names.

Currency renders as `` `$${n.toFixed(2)}` ``.

### 5.2 Empty state (a collection has zero items)
Use a single short line, **not** a custom component (there is no `EmptyState` component): a `Text` in `...type.bodySm` colored `gray[500]`, e.g. `No matchup this week`, `No starters set`, `No recent activity`. Keep the copy specific to the region.

### 5.3 Missing field (a present record with a null field)
| Field type | Render |
|---|---|
| Required string / number / date | `—` (em dash) |
| Optional string | render nothing (reserve no space) |
| Image / avatar | silhouette fallback (`Headshot` handles this) |
| Currency | `$0.00` only if zero is a real value; otherwise `—` |
| Boolean flag | omit the element entirely when false |

Check `value === null` explicitly, not `!value` — `0` and `""` are real values.

### 5.4 Loading
Placeholder screens read synchronously from the fixture, so no loading/skeleton treatment is needed yet. Loading states arrive with the Supabase swap and are out of scope here.

---

## 6. Tier-gating, owner-vs-visitor, and stubbed actions

**Tier as configuration.** Compute a boolean from the tier/config and conditionally render the whole region; never branch into separate per-tier screens. Example: `const showCap = capTracked();` then render the cap `Section` only when `showCap`. A region that doesn't apply is **removed**, never greyed out.

**Owner vs. visitor: hide, don't disable.** On an owner view, render the owner affordances (e.g. "Set Lineup"). On a read-only/visitor view, those are **hidden** (not disabled), and any visitor-only affordance (e.g. "Propose Trade") appears instead.

**Stubbed actions.** Outbound navigation and actions are optional callback props (`onViewRoster?: () => void`, etc.). Until routes/handlers exist, callers leave them `undefined` — the affordance renders and the press is a no-op. This is expected during placeholder work; note any stubbed wiring in `BUILD_STATUS.md` rather than faking behavior.

---

## 7. Per-screen checklist

Before a placeholder screen is considered done:

- [ ] Chrome-less: a plain `View` + `ScrollView`, no self-wrapped `PageShell`/nav (the route/preview frame supplies chrome)
- [ ] Content composed only from existing `src/components/` (no new components; only `LinkAction`/`ActionButton` as inline affordances)
- [ ] Every color is a token / `onColor()` — no literal hex
- [ ] Every space and radius is a token — no literal pixels (except table column widths/gap, per §1)
- [ ] Every text style is a `type.*` token, with color applied separately
- [ ] Tables use the `DataTable` component (no hand-rolled header row / cell-sizing); per-row tint/bleed done in `renderRow`
- [ ] Data comes from `@/data` helpers; derived values computed, not stored
- [ ] Empty states are a short `bodySm` / `gray[500]` line
- [ ] Missing fields follow the §5.3 table (`—` etc.)
- [ ] Tier-specific regions gated by a computed boolean (removed, not greyed)
- [ ] Owner/visitor affordances hidden-not-disabled
- [ ] Mobile single-column stack built first, in wireframe stacking order
- [ ] Stubbed callbacks left `undefined`, noted in `BUILD_STATUS.md`

---

## 8. Graduating out of placeholder mode

A screen leaves placeholder mode when, in a later Charlie-driven pass:
1. Visual design is applied (final color treatments, spacing, motion, two-column desktop layouts).
2. Data is swapped from the fixture to Supabase / the Stats Service Consumer.
3. Actions are wired to real handlers and routes.
4. Mobile and desktop are both reviewed.

Until then: **compose from the library, use only tokens, move fast, don't custom-style.**

---

**END OF PLACEHOLDER RENDER CONVENTION**
