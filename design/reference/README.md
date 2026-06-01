# Design Reference Artifacts

This folder preserves the output of the Claude Design exploration that informed `specs/Spec_DesignSystem.md` v0.2. These files are **reference only** — they are not production code and should not be imported or bundled into the eventual application.

## What's here

- `tokens.js` — concrete grayscale, status, position, injury, radius, and franchise color values. The `onColor()` and `safeBlock()` utility functions are also here. This is the closest thing to production-ready code in the folder.
- `primitives.jsx` — reference implementations of the small shared components: `Mono`, `FranchiseMark`, `Pos`, `Injury`, `LiveDot`, `Label`, `ScoreNum`, `Headshot`. Use these as API contracts when building the real (React Native) versions.
- `franchise-home.jsx` — reference layout for the franchise home page, covering all five test franchises (safe/classic, bold clashing, near-black, near-white, unexpected).
- `roster-table.jsx` — reference layout for the roster table, showing both standard (44px rows) and compact (32px rows) density modes.
- `league-home.jsx` — reference layout for the league home page (modular tiles, system-neutral with per-row franchise accents).
- `mobile.jsx` — reference layout for the mobile franchise home.
- `data.js` — mock roster, headline, and standings data used to populate the showcase.
- `XO Play Design System.html` — the showcase. Open in a browser to view all artboards in a pan/zoom canvas.
- `design-canvas.jsx` — the pan/zoom viewport component the showcase uses. Pure infrastructure, not XO Play–specific.

## How to use these

**When writing a buildable unit (Level 3 spec):**
Reference both `specs/Spec_DesignSystem.md` (for tokens and rules) and the corresponding reference file (for visual layout). Example — when speccing `Component_RosterTable`:

> **Visual reference:** `design/reference/roster-table.jsx`
> **Tokens:** `specs/Spec_DesignSystem.md` §3 (color, type, radius), §5 (density)

**When building the component in the real codebase:**
The JSX here uses inline styles and browser-React. The real build will use React Native with StyleSheet (or a design-token layer like Tamagui / Restyle / whatever the actual framework turns out to be). Copy the **structure and values**, not the style syntax.

**What NOT to do:**
- Don't import these files into the eventual app
- Don't treat the JSX as production components — the prop APIs are decent but the implementations are shortcuts
- Don't modify these files to fix issues — they're a snapshot. If something needs to change, update the spec instead and let the spec drive the rebuild.

## Finishing the copy

The first two files (`tokens.js`, `primitives.jsx`) were copied during the spec upgrade session. The remaining six files (`data.js`, `design-canvas.jsx`, `franchise-home.jsx`, `roster-table.jsx`, `league-home.jsx`, `mobile.jsx`, and the HTML) still live inside the uploaded `XO_Play_v2.zip`. To copy them in one step, run this from the project root:

```bash
cd /Users/charliedenison-mini/dev/xoplay-ffl
unzip -o -j path/to/XO_Play_v2.zip \
  'data.js' 'design-canvas.jsx' 'franchise-home.jsx' \
  'roster-table.jsx' 'league-home.jsx' 'mobile.jsx' \
  'XO Play Design System.html' \
  -d design/reference/
```

(Replace `path/to/XO_Play_v2.zip` with the actual zip location — likely somewhere in your Downloads or the Claude uploads folder.)

## Running the showcase locally

```bash
cd design/reference/
python3 -m http.server 8000
# Then open http://localhost:8000/XO%20Play%20Design%20System.html
```

The showcase is a self-contained HTML file that loads React + Babel from unpkg and compiles the JSX in-browser. No build step required.

---

*Source: Claude Design exploration, April 2026. Creative brief in `docs/process/Prompt_DesignSystem_CreativeBrief.md`.*
