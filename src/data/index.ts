// Public API for the normalized fixture. Consumers import entities + derived
// helpers from `@/data`; the eventual Supabase layer replaces the fixture
// modules behind this same barrel. Types come from ./types; derived values come
// from ./derive (never stored on the entities below).

export * from './types';

// ─── entity collections (one per Data Model §4 entity in scope) ──────────────
export { league, LEAGUE_ID, SEASON_YEAR, COMMISSIONER_USER_ID } from './fixtures/league';
export { conferences, divisions } from './fixtures/structure';
export {
  franchises,
  franchiseAbbreviations,
  FRANCHISE_IDS,
} from './fixtures/franchises';
export { users, franchiseOwners, leagueRoles } from './fixtures/identity';
export { players, rosterAssignments, contractIdFor } from './fixtures/players';
export { contracts } from './fixtures/contracts';
export { rosterEntries } from './fixtures/roster';
export { stats, STAT_WEEKS } from './fixtures/stats';
export { scoringRules } from './fixtures/scoring';
export { matchups, CURRENT_WEEK_NUMBER } from './fixtures/matchups';
export { lineupEntries } from './fixtures/lineups';
export { seasons } from './fixtures/seasons';
export { transactions } from './fixtures/transactions';

// ─── derived helpers (pure) ──────────────────────────────────────────────────
export {
  getFranchiseById,
  getPlayerById,
  getContractById,
  getUserById,
  getFranchiseIdentity,
  getOwnerName,
  getStatsForPlayer,
  getLineupForMatchup,
  computePlayerPoints,
  getRosterByFranchise,
  getStartersByFranchise,
  computeRecord,
  formatRecord,
  computePointsFor,
  computePointsAgainst,
  computeDivisionRecord,
  computeConferenceRecord,
  computeStreak,
  computeCapUsage,
  effectiveCap,
  computeCapRoom,
  computeCapUsageSummary,
  capTracked,
  contractsTracked,
  tierLabel,
  computeStandings,
  getStandingsRow,
  describeTransaction,
  getTransactionsByFranchise,
} from './derive';
