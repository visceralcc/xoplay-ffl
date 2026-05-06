# Component_FranchiseMark

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.3, §8 (Franchise Theming)
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Visual identity mark for a franchise. Renders either a franchise's uploaded logo or a generated geometric mark using the franchise's colors. Appears in nav headers, matchup cards, standings rows, trade interfaces, and anywhere a franchise needs to be visually identified.

## Behavior

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `franchise` | `{ id: string, primaryColor: string, secondaryColor: string, logoUrl?: string }` | Yes | — | Franchise identity data. |
| `size` | `number` | No | `64` | Width and height in pixels. Always square. |

### Visual states

| State | Appearance |
|-------|------------|
| With logo (`logoUrl` provided) | Square image cropped to fit, with `radius-sm` corners. |
| Without logo (default, v1) | Square SVG with franchise `primaryColor` fill background, containing a geometric mark in `secondaryColor`. Shape varies by franchise — each franchise gets a unique geometric pattern. |

### Dimensions

- Width: `size` prop value
- Height: `size` prop value (always square)
- Border radius: `radius-sm` (3px)
- Component is a block-level element (`display: 'block'`).

### Geometric marks (v1)

In v1, all franchises use generated geometric marks. Each mark is an SVG that fills the square with `primaryColor` and draws a simple geometric shape in `secondaryColor`. The five reference marks from the design exploration:

| Franchise ID | Shape description |
|---|---|
| `oak` | Triangle (tree) + trunk rectangle |
| `mia` | Two overlapping circles |
| `bro` | Nested squares (outer stroke, inner fill) |
| `san` | Rolling hills + sun circle |
| `prt` | Zigzag mountain range |

For franchises without a predefined mark, use a default: a centered diamond shape in `secondaryColor` on `primaryColor` background.

## Rules

- Border radius is `radius-sm` (3px) at all sizes.
- The SVG viewBox matches the `size` prop — shapes scale proportionally.
- When `logoUrl` is provided, the image is displayed with `resizeMode: 'cover'` and clipped to the rounded square. No geometric mark is shown.
- The mark should feel "stamp-like" — bold, simple, high contrast between primary and secondary.
- Near-white franchises (detected via `safeBlock()` with `veryLight: true`): add a 1px `gray-200` border so the mark doesn't disappear against a white background.
- Near-black franchises (`veryDark: true`): no special treatment needed — the dark background creates its own edge.

## Dependencies

- `src/theme/tokens` — `radius.sm`, `gray[200]`
- `src/theme/helpers` — `safeBlock()` for near-white detection

## Edge cases

- `logoUrl` that fails to load: fall back to the geometric mark. Do not show a broken image icon.
- Very small sizes (< 20px): the geometric mark becomes unreadable, but the primary color fill still provides franchise identification through color alone.
- Franchise with identical primary and secondary colors: the geometric mark disappears visually. This is the franchise owner's problem — the system allows it but the mark won't be distinctive.

## Out of scope

- Logo upload UI — that's a franchise settings screen concern.
- Animated marks — static only in v1.
- Circular variant — all marks are rounded squares.

## Done criteria

- Renders geometric marks for all 5 sample franchises with correct colors.
- Renders a default diamond mark for unknown franchise IDs.
- Respects the `size` prop at various values (24, 36, 44, 64, 96).
- Applies `radius-sm` corners.
- Adds a 1px `gray-200` border for near-white franchises (test with Santa Fe Dust).
- Uses `safeBlock()` helper for edge detection.
- Registered in preview with prop controls for franchise (`select`: OAK/MIA/BRO/SAN/PRT) and size (`stepper`: 24–96, step 8).
