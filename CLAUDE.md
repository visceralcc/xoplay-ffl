# XO Play

Fantasy football league platform (xoplay.co) — Redraft / Keeper / Dynasty tiers expressed as configuration, not separate products. Built with Expo / React Native / TypeScript. Consumes the standalone NFL Stats Service for player data.

## Quick Reference

| Info | Value |
|------|-------|
| Stack | Expo / React Native / TypeScript |
| Repo | xoplay-ffl |
| Branch | main |
| Component preview | `npx expo start --web` → localhost:8082/preview |

## Documentation Map

Read only what you need for the current task:

| Doc | Location | Read when... |
|-----|----------|--------------|
| Build Status | `docs/status/BUILD_STATUS.md` | Start of session — what's done / in progress / next |
| Backlog | `docs/status/BACKLOG.md` | Picking up open work (surfaced + editable in the Command Center) |
| Changelog | `docs/status/CHANGELOG.md` | Logging changes at end of session |
| Design System | `docs/design/DESIGN.md` | Touching any UI — tokens, type, spacing, components |
| Specs (Level 2) | `specs/` | Building a feature — find its spec |
| Component specs | `specs/foundation/components/` | Building or editing a design-system component |
| Planning docs | `docs/process/` | Structure map, build sequence, Claude Code handoff prompts |
| Token source of truth | `src/theme/tokens.ts` | Exact token values used by components |
| Visual reference | `design/reference/` | Reference JSX/tokens from the (retired) Claude Design exploration — reference only, never imported |

## Spec Organization

Specs live in `specs/` (not `docs/specs/`), organized by feature: `foundation/` (data model, tiers, design system, navigation, stats service consumer, and `components/`), plus `scoring/`, `salary-cap/`, `calendar/`, `transactions/`, `draft/`, `auction/`, `roster/`, and the future surface folders. See `docs/process/Structure_Map.md` for the full tree and `specs/Templates_SpecDocs.md` for the spec format.

## Command Center Conventions (do not break)

The dashboard at `cven.cc/central` reads two files from this repo and parses them strictly:

- `docs/status/BUILD_STATUS.md` must contain: a `Last updated: YYYY-MM-DD` line (ISO date), a `## Next Steps` section with bullet points (this is what the dashboard's Next Steps panel shows), and one markdown status table (rendered as the collapsible "Build Progress" panel — last column uses ✅ / 🔲).
- `docs/status/BACKLOG.md` uses `## ` for sections, items written as `- 🔲 …` or `- ✅ …` with optional trailing `[tags]`. The dashboard can write checkbox state and new items back to this file.

Keep these two files separate and in this format.

## Conventions

- **Naming:** PascalCase for components, camelCase for other files in `src/`
- **Commits:** conventional commits — `feat(scope):`, `fix(scope):`, `docs(scope):`
- **Specs before code:** PRD → Level 2 spec → Level 3 buildable unit → Claude Code handoff
- **Small sessions:** one or two components per Claude Code session to avoid context overload
- **End of session:** update `docs/status/BUILD_STATUS.md` and append to `docs/status/CHANGELOG.md`

## What NOT to Do

- Do not relocate existing specs without updating this map
- Do not re-create a `documents/` folder — planning docs live in `docs/process/`
- Do not add a second `BUILD_STATUS.md` anywhere; the canonical one is `docs/status/BUILD_STATUS.md`
- Do not import anything from `design/reference/` into the app — it is reference only
- Do not install dependencies without confirming first
