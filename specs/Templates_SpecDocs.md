# XO Play — Spec Document Templates

**This document defines the three templates used across the XO Play documentation pyramid.** Every spec written for this project follows one of these molds. The goal is consistency: a Tech Spec written for the salary cap should feel structurally identical to a Tech Spec written for the scoring engine, so that anyone (human or Claude Code) reading them knows where to find what.

**Status:** Draft v0.1
**Parent:** [Spec_XOPlay_PRD.md](./Spec_XOPlay_PRD.md)
**Last updated:** April 2026

---

## The pyramid, briefly

- **Level 1 — PRD.** The vision. One document. Source of truth for *what we're building and why.*
- **Level 2 — Specs.** Tech Specs (systems/engines) and Design Specs (surfaces/flows). The bridge between vision and buildable units. Reorganizes and deepens the PRD.
- **Level 3 — Buildable Units.** Screens, Components, and Logic Modules. Tight handoff packets meant to be acted on directly by Claude Code.

File organization is **by feature**, not by level. Each feature folder (`draft/`, `salary-cap/`, `franchise/`, etc.) contains its own Level 2 spec at the top and `screens/`, `components/`, `logic/` subfolders for its Level 3 units. Cross-cutting concerns live in `foundation/`.

---

## Template 1 — Tech Spec

A Tech Spec defines a **system**: an engine, a state machine, a body of rules. Its job is to be the canonical reference for how that system works, deeply enough that buildable units underneath it can be written without re-deriving context from the PRD.

### Template

```markdown
# [System Name]

**Status:** [Draft | Reviewed | Locked]
**Parent:** [link to PRD section, e.g., Spec_XOPlay_PRD.md §7]
**Related specs:** [links to other Level 2 specs that touch this system]
**Last updated:** [Month Year]

---

## Purpose

One paragraph. What this system is responsible for. If a reader only reads
this section, they should know what the system does and why it exists.

## PRD anchor

Which PRD sections this expands on. Brief notes on what this spec adds
beyond the PRD (deeper rules, worked examples, edge case handling).

## Entities & data shapes

The structured data this system reads, writes, and owns. Field names,
types, and a sentence of context per field. Not full database schemas
(those live in foundation/Spec_DataModel.md) — just what this system
needs to talk about.

## Rules & logic

The actual algorithms, formulas, and state transitions. Worked examples
are mandatory wherever math is involved. The PRD §7 (cap math) is the
quality bar — show the formula, then run a real number through it.

## Inputs & outputs

What triggers this system, and what it produces.
- Triggers: events, user actions, scheduled jobs
- Outputs: state changes, downstream events, notifications

## Edge cases

Explicit handling of weird scenarios. Use the PRD §22 format: scenario,
behavior. One per case. Don't bury edge cases in prose.

## Open questions

Honest list of what's not decided yet. Each question should be
answerable — vague questions hide problems.

## Related buildable units

Forward links to the Level 3 docs that implement this system. Updated
as Level 3 docs are written.
```

### Notes on writing a good Tech Spec

- **Worked examples beat prose.** When the PRD says "drop penalty is 75% + 33% per additional year," that's the rule. The Tech Spec should also show: *$10 contract, 5 years remaining → $20.70.* Pasting numbers into the formula proves the formula and catches errors.
- **Don't repeat the PRD verbatim.** Cite it and add depth. If the spec is just the PRD section copy-pasted, delete it and reference the PRD directly.
- **Edge cases are first-class.** A Tech Spec without an Edge Cases section is incomplete. If you can't think of edge cases, you don't understand the system yet.

---

## Template 2 — Design Spec

A Design Spec defines a **surface area**: a set of screens, a flow, a coherent slice of UI. Its job is to define *what experience the user gets* on that surface, deeply enough that individual screen and component docs can be written without re-deriving the design intent.

### Template

```markdown
# [Surface Name]

**Status:** [Draft | Reviewed | Locked]
**Parent:** [link to PRD section]
**Related specs:** [links to Tech Specs this surface depends on, plus
                    any related Design Specs]
**Last updated:** [Month Year]

---

## Purpose

One paragraph. What experience this surface delivers and to whom.

## PRD anchor

Which PRD sections this expands on.

## User goals

What someone is trying to accomplish on these screens. Three to seven
jobs-to-be-done, written as outcomes ("see whether my lineup is legal
for this week" not "use the lineup checker"). These justify the design
choices that follow.

## Surface inventory

The screens and major components in scope. One line per item. This is
the bridge to Level 3 — every item here will get its own buildable unit
doc eventually.

Example:
- Screen_FranchiseHome — landing page for a franchise
- Screen_RosterEdit — drag-to-edit roster management
- Component_RosterTable — the reusable roster grid
- Component_CapMeter — visual cap usage display

## Information hierarchy

What's prioritized, what's secondary, what's hidden by default. The key
design decisions for this surface — written so the *why* is clear, not
just the *what*. If a designer or Claude Code would have to guess at a
priority, write it down here.

## Interaction patterns

Recurring patterns used across these screens (modals vs. drawers, inline
edit vs. dedicated edit screens, confirmation dialogs vs. undo). Not
pixel-perfect specs — just the conventions this surface follows.

## Tier variations

How Redraft / Keeper / Dynasty change what's shown on these screens.
Examples: "Cap meter only renders when trackSalaries is true." "Franchise
tag controls hidden outside Dynasty tier."

## Data dependencies

Which Tech Specs feed this surface. Forces the design to be honest about
what data exists and where it comes from. Cross-references to
Tech Specs use relative paths.

## Open questions

## Related buildable units

Forward links to Level 3 docs. Updated as written.
```

### Notes on writing a good Design Spec

- **Surface inventory is the most important section.** Everything else exists to set up the buildable units listed there. If the inventory is wrong, the rest cascades.
- **Don't design pixels here.** Design Specs describe *what the surface does and what's on it*, not what it looks like. Pixel-level decisions live in the buildable unit docs (and ultimately in Figma or in code).
- **Tier variations cannot be skipped for XO Play.** Every UI surface in this product has different rules across the three tiers. Naming this explicitly here prevents the tier logic from being scattered into individual screen docs.

---

## Template 3 — Buildable Unit

A Buildable Unit is the handoff packet for Claude Code. It defines **one screen, one component, or one logic module** — small enough to be acted on without further decomposition.

The same template covers all three flavors with marked variation points. Three near-identical templates would invite drift; one template with branches is cleaner.

### Template

```markdown
# [Screen | Component | Logic]_[UnitName]

**Status:** [Draft | Reviewed | Locked]
**Parent specs:** [links to Level 2 specs this unit lives under]
**Type:** [Screen | Component | Logic]
**Last updated:** [Month Year]

---

## Purpose

One sentence. What this unit does.

## Behavior

What this unit does, observable from the outside.

  ── If Screen ──
  - Layout regions (header, primary content, sidebar, etc.)
  - What the user sees in each region
  - What the user can do (actions, navigation, interactions)
  - States (loading, empty, error, populated)

  ── If Component ──
  - Props (name, type, required/optional, default)
  - Visual states (default, hover, active, disabled, error, loading)
  - Internal interactions (what happens when clicked, edited, etc.)
  - What it emits (events, callbacks)

  ── If Logic ──
  - Function signature (inputs, outputs, types)
  - Step-by-step algorithm
  - Side effects (database writes, events fired, notifications sent)
  - Worked examples with real numbers

## Rules

The specific logic this unit owns. For screens: validation rules,
permission checks, conditional rendering rules. For components:
prop validation, internal state rules. For logic modules: the
formulas and decision rules.

Worked examples wherever math or branching is involved.

## Dependencies

Other units this needs:
- Components used (link to Component_X docs)
- Logic modules called (link to Logic_X docs)
- Data sources (link to Tech Specs)
- Design system tokens or patterns (link to Spec_DesignSystem.md)

## Edge cases

Local edge cases. Cases that affect the broader system live in the
parent Tech Spec; this section is for cases this specific unit
must handle.

## Out of scope

Explicit list of what this unit does NOT do. This is the most
under-used section in spec writing and the one that keeps Claude
Code on-task. If the cap meter doesn't handle multi-year projections,
say so here.

## Done criteria

Concrete, testable. How will we know this unit is built correctly?
Each item should be a thing someone could verify by looking at or
using the result.

  ── If Screen ──
  - "Renders all regions described in Behavior section"
  - "All listed actions function correctly"
  - "Empty/loading/error states render appropriately"
  - "Tier variations behave per parent Design Spec"

  ── If Component ──
  - "Accepts all listed props with correct types"
  - "Renders all visual states correctly"
  - "Emits expected events on user interaction"

  ── If Logic ──
  - "Returns correct output for each worked example"
  - "Handles all listed edge cases"
  - "Side effects fire as documented"
```

### Notes on writing a good Buildable Unit

- **Out of scope is mandatory, not optional.** It is the single section that most prevents Claude Code from over-building or wandering. Even if it feels obvious, write it down. "Does not handle authentication." "Does not validate cap; assumes valid roster on input." "Does not persist state; parent component owns persistence."
- **Done criteria must be testable.** "Looks good" is not done criteria. "Renders three columns on desktop, one column on mobile" is.
- **Worked examples for any math.** A logic module that calculates cap room without showing a worked example will be implemented wrong.
- **Tight is better than complete.** A buildable unit that fits on two screens of text is easier to act on than one that runs five pages. If a unit is getting too big, it's probably actually two units.

---

## How specs reference each other

Cross-references use relative markdown links with file paths and section anchors where relevant.

Examples:
- From `draft/screens/Screen_DraftRoom.md` to its parent: `[Spec_Draft.md](../Spec_Draft.md)`
- From `draft/screens/Screen_DraftRoom.md` to a logic module in another feature: `[Logic_DropPenaltyCalc.md](../../salary-cap/logic/Logic_DropPenaltyCalc.md)`
- To a specific section: `[Spec_SalaryCapAndContracts.md §3](../../salary-cap/Spec_SalaryCapAndContracts.md#salary-cap-configuration)`
- To the PRD: `[Spec_XOPlay_PRD.md §7](../../Spec_XOPlay_PRD.md#7-salary-cap--contracts)`

The "At a glance" block at the top of every doc should include all parent and related spec links so a reader can navigate the pyramid in either direction without searching.

---

## What "done" looks like for a spec doc

A spec doc is ready for use when:

1. Every section in its template is filled (or explicitly marked "N/A — [reason]" if it genuinely doesn't apply).
2. All cross-references resolve to real files.
3. Worked examples (where applicable) have been run end-to-end and the numbers check out.
4. The "Out of scope" list (Buildable Units only) is non-empty and specific.
5. Open questions are either answered or escalated.

A spec doc is **not** ready when it's missing edge cases, when it just paraphrases the PRD, or when its done criteria are vague.

---

**END OF TEMPLATES**
