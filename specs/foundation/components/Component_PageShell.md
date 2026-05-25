# Component_PageShell

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.1, §6 (Responsive), [Spec_Navigation.md](../Spec_Navigation.md) §2
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Top-level page wrapper that provides the navigation chrome and content area for every authenticated screen in XO Play. PageShell composes GlobalNav (top bar) and LeagueNav (section navigation) around a scrollable content area. In Batch 3, GlobalNav and LeagueNav are visual stubs — they render but don't navigate. Full navigation behavior will be wired in a later batch.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `ReactNode` | Yes | — | Page content, rendered inside the content area. |
| `leagueName` | `string` | No | `'My League'` | Displayed in GlobalNav's league context area. |
| `franchise` | `{ primaryColor: string; secondaryColor: string; name: string }` | No | `undefined` | If provided, LeagueNav shows the franchise color accent per the franchise theming rules. |
| `activeSection` | `string` | No | `undefined` | Which LeagueNav tab is currently active (e.g., `'My Team'`, `'League'`, `'Transactions'`). Highlights that tab. |

---

## Sub-components

### GlobalNav (stub)

The fixed top bar that persists across all screens.

**Visual rules:**
- Full-width, 48px height.
- Background: `gray-950`.
- Left side: XO Play logo/wordmark placeholder (text "XO" in Barlow Condensed 700, 18px, `gray-0`). Then a vertical divider (1px `gray-700`, 24px tall). Then the `leagueName` in Barlow 400, 14px, `gray-400`.
- Right side: user avatar placeholder (24×24 circle, `gray-700` fill) with 16px right margin.
- Bottom border: 1px `gray-800`.

### LeagueNav (stub)

Section-level navigation rendered below GlobalNav.

**Visual rules:**
- Full-width, 40px height.
- Background: `gray-900`.
- Horizontal row of tab labels: "My Team", "League", "Transactions", "Draft", "Social", "Commissioner".
- Tab labels: Barlow Condensed 500, 12px, uppercase, letter-spacing 1px.
- Inactive tabs: `gray-500` text.
- Active tab: `gray-0` text with a 2px bottom border in `franchise.primaryColor` (if franchise prop is provided) or `gray-400` (if no franchise context).
- Tabs are horizontally scrollable if they overflow.
- Left padding: `spacing.lg` (16px).
- Gap between tabs: `spacing.xl` (24px).

### ContentArea

The scrollable region below the nav bars.

**Visual rules:**
- Background: `gray-50`.
- Horizontal padding: `spacing.lg` (16px).
- Top padding: `spacing.lg` (16px).
- Content max-width: 960px, centered (for desktop readability — in the preview phone frame this won't kick in, but the constraint should exist).
- Scrollable vertically (ScrollView wrapping children).

---

## Layout structure

```
┌─────────────────────────────────────┐
│            GlobalNav (48px)         │
├─────────────────────────────────────┤
│            LeagueNav (40px)         │
├─────────────────────────────────────┤
│                                     │
│          ContentArea (flex 1)       │
│         (scrollable, padded)        │
│                                     │
│              [children]             │
│                                     │
└─────────────────────────────────────┘
```

## Done criteria

- Renders GlobalNav + LeagueNav + ContentArea in a vertical stack filling the screen.
- GlobalNav shows the league name and placeholder elements.
- LeagueNav highlights the active section with appropriate styling.
- LeagueNav uses franchise primary color for the active tab indicator when a franchise is provided.
- Content area scrolls and constrains width.
- No navigation behavior — tabs render but don't route anywhere.
- Preview: category "Layout", phone frame (390×844), with sample content (a few Cards in a Stack) inside the shell, showing the Oakland franchise color accent on the "My Team" tab.
