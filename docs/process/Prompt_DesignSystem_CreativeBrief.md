# Creative Brief: XO Play Design System Exploration

> **⚠️ DEPRECATED — historical reference only.** This brief fed the Claude Design exploration that was rejected. The design system is now being built bottom-up in code (see `Prompt_DesignSystem_BuildSequence.md`). Notably stale: it lists a "Spectator (read-only, no login)" role, but XO Play has since decided **all pages require authentication — no spectator view**.

## What is XO Play?

XO Play (xoplay.co) is a fantasy football platform with three complexity tiers — Redraft (simple), Keeper (moderate), and Dynasty (advanced). It sits between ESPN/Yahoo (too simple) and MyFantasyLeague (powerful but ugly and manual). The differentiator is AI-generated "team newspaper" editorial content that makes fantasy teams feel alive — but the core platform must be excellent on its own.

## What I need

Explore visual design directions for the XO Play design system. I'm looking for design concepts that establish the visual language — not a complete component library, but enough to see the personality and prove the system works across the product's range of surfaces.

## The range of surfaces to design for

XO Play has two very different modes that the design system must handle:

**Editorial/consumption surfaces** — franchise home pages, AI-generated newspaper articles, matchup previews, league home page. These should feel like a premium sports publication. Rich, editorial, alive.

**Operational/data surfaces** — roster tables with 15+ columns, salary cap reports, draft boards, transaction history, commissioner setup forms. These should feel like a Bloomberg terminal — dense, precise, scannable, comfortable at high data volumes.

The design system needs to bridge both of these without feeling like two different products.

## Key design principles (from the spec)

1. **Data density is a feature.** Fantasy football is a data sport. Dense tables are the norm, not the exception. Make them comfortable, not sparse.
2. **Franchise identity is first-class.** Every franchise has custom colors (any hex value) and a logo. The design must let franchise colors tint surfaces and accents while maintaining readability and contrast safety.
3. **Mobile is a context, not a viewport.** Mobile users are checking lineups at lunch and watching live scores during games — not browsing. Prioritize actions over information on mobile.
4. **Live data feels different from static data.** During NFL games, scores update every 15 seconds. The design needs a clear visual distinction between "this is live" and "this is a snapshot."
5. **Commissioner controls overlay, not separate.** Commissioners see management tools layered on the same screens owners see — not a separate admin portal.

## Competitive positioning

**Should NOT feel like:**
- ESPN/Yahoo — generic sports app, hero images, loud gradients
- MyFantasyLeague — web 1.0 density without visual hierarchy
- Sleeper — gamified, neon, achievement-badge energy

**SHOULD feel like:**
- A premium sports publication meets a Bloomberg terminal
- Adjectives: authoritative, clean, dense-but-readable, editorially alive, franchise-proud

## Specific design questions to explore

1. **Type pairing:** Should XO Play use a single type family or a pair? A serif for editorial/narrative content + a sans-serif for data/UI could be powerful for the newspaper differentiation — but needs to not feel dated. Test both approaches.

2. **Color system:** The platform needs a neutral system palette that lets franchise colors (any arbitrary hex) pop as accents. What's the right foundation — warm neutral, cool neutral, true neutral?

3. **The franchise theming challenge:** Show how one screen (like a franchise home page) adapts to different franchise color schemes — including tricky ones like near-white, near-black, or clashing pairs. Prove the theming system works.

4. **Data table treatment:** Show a dense roster table (player name, position, salary, contract years, injury status, bye week, points) that feels clean and scannable at both "standard" and "compact" density modes.

5. **The editorial ↔ operational bridge:** Show how the design transitions from a newspaper-feel franchise home page to a data-dense roster management screen. They should feel like the same product.

6. **Live scoring mood:** How does the Gameday/live scoring view feel different from static screens? What visual cues signal "this data is updating right now"?

## Surfaces to explore (pick 3-5)

In rough priority order:

1. **Franchise home page** — the emotional center. Logo, colors, roster summary, upcoming matchup, recent transactions. This is where the newspaper vibe lives.
2. **Roster table** — the operational workhorse. Dense, sortable, filterable. Show both standard and compact density.
3. **Matchup / Gameday view** — two franchises head-to-head with live scores, scoring play feed, win probability. The most exciting screen in the product.
4. **League home page** — modular layout with configurable tiles (standings, transactions, calendar, polls, etc.)
5. **Draft board** — grid of picks by round and franchise with color coding. A unique data visualization challenge.

## What I'm NOT looking for

- A complete component library or full Figma kit
- Pixel-perfect production-ready designs
- Mobile layouts (desktop-first for exploration; mobile follows)
- The full 30+ screen inventory — just enough surfaces to prove the visual language

## Technical context

- Web app (responsive, not native mobile)
- Three user roles: Commissioner (power user), Owner (regular user), Spectator (read-only, no login)
- The tier system means some screens show more or fewer features (Redraft is simple, Dynasty shows everything including salary caps and contracts)
- Dark mode is future — but the color system should be structured for it

## Attached

The full `Spec_DesignSystem.md` is attached. It has the complete component inventory, token architecture, responsive framework, and franchise theming rules. Use it as reference — but don't feel bound by every detail. The spec defines what the system needs to solve for; you define how it looks.
