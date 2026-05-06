# Component_Headshot

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.3
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Player photo placeholder. In v1, XO Play does not have real player headshot images, so this component renders a silhouette placeholder. It's designed so that when real photos are added later, the component's external API stays the same — only the internal rendering changes.

## Behavior

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `size` | `number` | No | `44` | Width and height in pixels. Always square. |
| `backgroundColor` | `string` | No | `gray-200` | Background fill color. |
| `foregroundColor` | `string` | No | `gray-500` | Silhouette fill color. |

### Visual states

| State | Appearance |
|-------|------------|
| Default (placeholder) | Rounded square (radius-md) filled with `backgroundColor`. Contains an SVG silhouette (head circle + shoulder arc) in `foregroundColor` at 70% opacity. |

### Dimensions

- Width: `size` prop value
- Height: `size` prop value (always square)
- Border radius: `radius-md` (6px)
- The silhouette SVG scales proportionally to fit within the square.
- Component has `flexShrink: 0` — it never compresses in a flex layout.

### Silhouette SVG

The SVG uses a 44×44 viewBox regardless of rendered size (SVG scales):
- Head: circle at cx=22, cy=16, r=8
- Shoulders: path from (6, 44) curving up through (22, 28) and back down to (38, 44)
- Both shapes filled with `foregroundColor` at opacity 0.7

## Rules

- Always renders as a square. There is no rectangular variant.
- Border radius is always `radius-md` (6px), regardless of size. Does NOT scale the radius with size.
- Overflow is hidden — the silhouette can extend to the edges without bleeding out.
- No border. If a border is needed in context (e.g., on a dark background), the consuming component wraps it.

## Dependencies

- `src/theme/tokens` — `gray[200]`, `gray[500]`, `radius.md`

## Edge cases

- Very small sizes (< 24px): the silhouette becomes unreadable, but the component still renders. Minimum recommended size is 32px.
- Very large sizes (> 120px): works fine. The silhouette scales smoothly.
- Future: when real headshot images are available, this component will accept an optional `imageUrl` prop. The silhouette becomes the fallback when no image is provided or when the image fails to load.

## Out of scope

- Image loading (v1 — all players use placeholder).
- Circular variant — all headshots are rounded squares.
- Jersey number overlay — not part of this component.

## Done criteria

- Renders a rounded square with silhouette at the default 44px size.
- Accepts and respects custom `size`, `backgroundColor`, and `foregroundColor` props.
- Silhouette scales proportionally with size.
- Uses `radius-md` from tokens.
- Has `flexShrink: 0`.
- Registered in preview with prop controls for size (`stepper`: 24–120, step 8).
