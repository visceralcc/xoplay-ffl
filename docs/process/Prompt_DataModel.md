# Prompt: Write Spec_DataModel.md for XO Play

## Context

I'm building XO Play (xoplay.co), a fantasy football platform with three tiers (Redraft, Keeper, Dynasty). I have a comprehensive PRD (`Spec_XOPlay_PRD.md`) and a companion gap analysis (`Spec_XOPlay_MFL_Gap_Analysis.md`) — both are attached to this project.

I've established a documentation methodology where we break the PRD down into a pyramid:
- **Level 1** — The PRD (done)
- **Level 2** — Tech Specs and Design Specs per feature
- **Level 3** — Buildable Units (screens, components, logic modules) for Claude Code

The docs are organized **by feature** in this structure:

```
docs/
├── Spec_XOPlay_PRD.md
├── foundation/
│   ├── Spec_DataModel.md          ← THIS IS WHAT WE'RE WRITING
│   ├── Spec_Tiers.md
│   ├── Spec_DesignSystem.md
│   └── Spec_Navigation.md
├── scoring/
├── salary-cap/
├── transactions/
├── draft/
├── auction/
├── roster/
├── franchise/
├── league/
├── commissioner/
├── live-scoring/
├── calendar/
├── social/
├── accounting/
├── narrative/
└── playoffs/
```

## The task

Write `foundation/Spec_DataModel.md` — the canonical reference for every entity in XO Play. This is the bedrock document that every other spec will reference.

## What this document needs to do

1. **Consolidate every entity definition from the PRD into one place.** The PRD defines entities across §3 (League), §4 (User/Franchise), §5 (Player/Roster), §6 (ScoringRule), §7 (Contract, SalaryAdjustment, RookieSalaryScale), §8 (CalendarEvent), §9 (DraftPick), §10 (Auction, Bid), §11 (WaiverClaim), §12 (Trade), §14 (PlayoffBracket), §16 (social entities), and §17 (AccountingEntry, PayoutStructure). Pull them all together.

2. **Show how entities relate to each other.** Include a relationship map (the PRD §20.1 has a starting point, but it's incomplete — it's missing join entities, configuration entities, and the social layer).

3. **Add depth the PRD doesn't have.** Specifically:
   - Join entities that the PRD implies but doesn't define (FranchiseOwner, LeagueRole, LineupEntry, TradeAsset)
   - JSON field shapes (the PRD mentions `abilities` as JSON but doesn't show the shape; same for `startingLineup`, `tradeAssets`, etc.)
   - Constraints that cross entity boundaries (e.g., "a player can only appear on one roster per conference when playerPoolIsolation = ISOLATED_PER_CONFERENCE")
   - Enum value lists collected in one place (the PRD scatters these across sections)

4. **Define design principles for the data model.** Event sourcing for transactions, UUIDs for all IDs, timestamp conventions, foreign key conventions.

5. **List derived/computed fields.** These are NOT stored but are computed on read. The PRD §20.2 has a starting list; expand it.

6. **Call out what's NOT an entity.** Some things that feel like entities are actually configuration fields on League (e.g., salary cap settings are fields on League, not a separate SalaryCapConfig entity). Make these decisions explicit.

## Template to follow

Every doc follows this "At a glance" pattern at the top:

```markdown
# [Title]

**Status:** Draft
**Parent:** [link to PRD section]
**Related specs:** [links]
**Last updated:** April 2026

---

## Purpose
[one paragraph]
```

For the Data Model specifically, organize as:
1. Purpose
2. Design principles (event sourcing, ID conventions, timestamp conventions)
3. Entity relationship map (visual/text diagram)
4. Individual entity definitions (one section per entity, with fields table, relationships, constraints, and notes)
5. Enum reference (all enums collected in one place for quick lookup)
6. Derived/computed fields (not stored, computed on read)
7. Cross-entity constraints
8. Open questions

## Quality bar

- Every field the PRD mentions should appear here with type, constraints, and a note explaining what it's for
- JSON field shapes should be shown as example JSON
- Relationships should be explicit: "has many," "belongs to," "many-to-many via [join entity]"
- Where the PRD is ambiguous about whether something is a separate entity or a field on an existing entity, make a decision and note why
- Worked examples are welcome where they clarify a relationship (e.g., showing how a Trade entity connects to TradeAssets connects to Contracts)

## What NOT to include

- Business logic, algorithms, or formulas — those go in feature-level Tech Specs
- UI behavior or screen descriptions — those go in Design Specs
- Build sequence or implementation details — those go in the Structure Map
- Don't repeat PRD prose. Cite the PRD section and add the data-model-specific depth.

## Important: this should be thorough but not infinite

The PRD is ~2,600 lines. This data model doc will probably be 600–1,000 lines. That's fine — it's the single most-referenced doc in the project. But don't pad it. Every line should be something another spec would actually need to look up.

Please read the full PRD carefully before starting, paying special attention to the entity definitions in §3–§17 and the data model summary in §20.
