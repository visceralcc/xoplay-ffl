# Component_Section

**Status:** Draft
**Parent specs:** [Spec_DesignSystem.md](../../Spec_DesignSystem.md) §4.1
**Type:** Component
**Last updated:** May 2026

---

## Purpose

Titled content block with an optional collapse toggle. Used to group related content within a page — roster sections, stat breakdowns, settings groups, transaction feeds. Section provides visual hierarchy without the elevation of a Card. Think of it as a labeled divider that owns the content below it.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Section heading text. Rendered as Barlow Condensed 600, uppercase. |
| `children` | `ReactNode` | Yes | — | Section content. |
| `collapsible` | `boolean` | No | `false` | Whether the section can be collapsed. |
| `defaultCollapsed` | `boolean` | No | `false` | Initial collapsed state (only relevant when `collapsible` is `true`). |
| `action` | `ReactNode` | No | `undefined` | Optional element rendered at the right edge of the header row (e.g., a "View All" link or a SegmentControl). |

## Visual rules

- Header row: horizontal layout with `title` on the left, `action` on the right (if provided), vertically centered.
- Title: Barlow Condensed 600, 13px, uppercase, `gray-500` text, letter-spacing 1.2px. Same treatment as the Label component.
- Divider: 1px `gray-100` line below the header row.
- Content area: starts `spacing-md` (12px) below the divider.
- Collapse chevron: when `collapsible` is `true`, render a small chevron (▸ / ▾) to the left of the title, `gray-400`. Points right when collapsed, down when expanded. No animation — instant state change.
- Collapsed state: only the header row + divider are visible; children are unmounted (not just hidden).
- No background color, no border, no shadow — Section is a structural grouping, not a container.

## Done criteria

- Renders title with Label-style typography and a divider below it.
- Children render below the divider with proper spacing.
- `collapsible` adds a chevron that toggles children visibility on tap.
- `action` renders right-aligned in the header row.
- Preview: category "Layout", naked frame, componentWidth 360, with sample content showing both expanded and collapsed states.
