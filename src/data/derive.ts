// Pure derived-value + view-model helpers. Nothing here is stored on a base
// entity — records, points, cap usage, standings, and the joined roster rows
// are all computed on read from the normalized fixture (Spec_DataModel.md §6.4
// / §7, Spec_MockFixture "Derived helpers"). Replaces the old hand-typed
// `franchises.record/pointsFor/capUsed` and `standings` array.

import { round1, round2 } from './rng';
import { league } from './fixtures/league';
import { franchises, franchiseAbbreviations } from './fixtures/franchises';
import { conferences, divisions } from './fixtures/structure';
import { users } from './fixtures/identity';
import { players } from './fixtures/players';
import { contracts } from './fixtures/contracts';
import { rosterEntries } from './fixtures/roster';
import { stats, STAT_WEEKS } from './fixtures/stats';
import { scoringRules } from './fixtures/scoring';
import { matchups } from './fixtures/matchups';
import { lineupEntries } from './fixtures/lineups';
import { transactions } from './fixtures/transactions';
import type {
  CapUsage,
  Contract,
  Franchise,
  FranchiseIdentity,
  LineupEntry,
  Player,
  RosterBucket,
  RosterRow,
  StandingsRow,
  Stats,
  Transaction,
  User,
  WLT,
} from './types';

const SEASON = league.seasonYear;
const LAST_WEEK = Math.max(...STAT_WEEKS);

// ─── lookups / joins ─────────────────────────────────────────────────────────

export const getFranchiseById = (id: string): Franchise | undefined =>
  franchises.find((f) => f.id === id);

export const getPlayerById = (id: string): Player | undefined =>
  players.find((p) => p.id === id);

export const getContractById = (id: string): Contract | undefined =>
  contracts.find((c) => c.id === id);

export const getUserById = (id: string | null | undefined): User | undefined =>
  id == null ? undefined : users.find((u) => u.id === id);

// Display-ready franchise identity: abbreviation joined in and colors coalesced
// to non-null, the shape FranchiseMark / FranchiseHeader / MatchupCard expect.
// (Abbreviation is not a stored Franchise field per §4.5; colors are nullable
// on the entity but always set in this fixture.)
export function getFranchiseIdentity(
  franchiseId: string,
): FranchiseIdentity | undefined {
  const f = getFranchiseById(franchiseId);
  if (!f) return undefined;
  return {
    id: f.id,
    name: f.name,
    abbreviation:
      franchiseAbbreviations[f.id] ?? f.id.replace(/^fr-/, '').toUpperCase(),
    primaryColor: f.primaryColor ?? '#262626',
    secondaryColor: f.secondaryColor ?? '#a0a0a0',
  };
}

// Owner display name for a franchise's primary owner.
export const getOwnerName = (franchiseId: string): string =>
  getUserById(getFranchiseById(franchiseId)?.primaryOwnerUserId)?.displayName ??
  '—';

export const getStatsForPlayer = (playerId: string, week?: number): Stats[] =>
  stats.filter(
    (s) => s.playerId === playerId && (week == null || s.week === week),
  );

export const getLineupForMatchup = (
  matchupId: string,
  franchiseId?: string,
): LineupEntry[] =>
  lineupEntries.filter(
    (l) =>
      l.matchupId === matchupId &&
      (franchiseId == null || l.franchiseId === franchiseId),
  );

// ─── scoring: Stats × ScoringRule ────────────────────────────────────────────

// Fantasy points for one player across the given week (or the whole tracked
// window if week omitted), applying every scoring rule whose statType matches
// and whose positionScope includes the player.
export function computePlayerPoints(playerId: string, week?: number): number {
  const player = getPlayerById(playerId);
  if (!player) return 0;
  let total = 0;
  for (const s of getStatsForPlayer(playerId, week)) {
    for (const [statType, value] of Object.entries(s.statValues)) {
      if (value == null) continue;
      for (const rule of scoringRules) {
        if (rule.statType !== statType) continue;
        if (!rule.positionScope.includes(player.position)) continue;
        if (value < rule.rangeLow || value > rule.rangeHigh) continue;
        total += (rule.pointsPerUnit ?? 0) * (value / rule.perUnit);
        total += rule.flatPoints ?? 0;
      }
    }
  }
  return round2(total);
}

// ─── roster view model ───────────────────────────────────────────────────────

// The joined roster the way a DB query returns it: player + contract + bucket +
// computed points. This is what PlayerRow consumes after the rewire.
export function getRosterByFranchise(franchiseId: string): RosterRow[] {
  return rosterEntries
    .filter((r) => r.franchiseId === franchiseId)
    .map((r) => {
      const player = getPlayerById(r.playerId)!;
      const contract = r.contractId ? getContractById(r.contractId) ?? null : null;
      return {
        player,
        contract,
        bucket: r.bucket,
        injuryStatus: player.injuryStatus,
        seasonPoints: computePlayerPoints(r.playerId),
        lastWeekPoints: computePlayerPoints(r.playerId, LAST_WEEK),
      };
    });
}

// ─── records / points / streak ───────────────────────────────────────────────

type MatchResult = {
  week: number;
  myScore: number;
  oppScore: number;
  oppFranchiseId: string | null;
  outcome: 'W' | 'L' | 'T';
};

// A franchise's completed matchups for a season, oldest first.
function franchiseResults(franchiseId: string, season = SEASON): MatchResult[] {
  const out: MatchResult[] = [];
  for (const m of matchups) {
    if (m.seasonYear !== season || m.status !== 'COMPLETED') continue;
    const isHome = m.homeFranchiseId === franchiseId;
    const isAway = m.awayFranchiseId === franchiseId;
    if (!isHome && !isAway) continue;
    const myScore = (isHome ? m.homeScore : m.awayScore) ?? 0;
    const oppScore = (isHome ? m.awayScore : m.homeScore) ?? 0;
    out.push({
      week: m.week,
      myScore,
      oppScore,
      oppFranchiseId: isHome ? m.awayFranchiseId : m.homeFranchiseId,
      outcome: myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'T',
    });
  }
  return out.sort((a, b) => a.week - b.week);
}

function tally(results: MatchResult[]): WLT {
  return results.reduce<WLT>(
    (acc, r) => {
      if (r.outcome === 'W') acc.wins += 1;
      else if (r.outcome === 'L') acc.losses += 1;
      else acc.ties += 1;
      return acc;
    },
    { wins: 0, losses: 0, ties: 0 },
  );
}

export const computeRecord = (franchiseId: string, season = SEASON): WLT =>
  tally(franchiseResults(franchiseId, season));

// "8-2" when no ties, "6-3-1" when there are — the masthead record string.
export const formatRecord = (r: WLT): string =>
  r.ties > 0 ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`;

export const computePointsFor = (franchiseId: string, season = SEASON): number =>
  round2(
    franchiseResults(franchiseId, season).reduce((s, r) => s + r.myScore, 0),
  );

export const computePointsAgainst = (franchiseId: string, season = SEASON): number =>
  round2(
    franchiseResults(franchiseId, season).reduce((s, r) => s + r.oppScore, 0),
  );

const divisionOf = (franchiseId: string): string | null =>
  getFranchiseById(franchiseId)?.divisionId ?? null;

const conferenceOf = (franchiseId: string): string | null => {
  const divId = divisionOf(franchiseId);
  return divisions.find((d) => d.id === divId)?.conferenceId ?? null;
};

export function computeDivisionRecord(franchiseId: string, season = SEASON): WLT {
  const myDiv = divisionOf(franchiseId);
  return tally(
    franchiseResults(franchiseId, season).filter(
      (r) => r.oppFranchiseId != null && divisionOf(r.oppFranchiseId) === myDiv,
    ),
  );
}

export function computeConferenceRecord(franchiseId: string, season = SEASON): WLT {
  const myConf = conferenceOf(franchiseId);
  return tally(
    franchiseResults(franchiseId, season).filter(
      (r) => r.oppFranchiseId != null && conferenceOf(r.oppFranchiseId) === myConf,
    ),
  );
}

// Trailing run of the same outcome, newest matchups first — "W4", "L3", "T1".
export function computeStreak(franchiseId: string, season = SEASON): string {
  const results = franchiseResults(franchiseId, season);
  if (results.length === 0) return '—';
  const last = results[results.length - 1].outcome;
  let count = 0;
  for (let i = results.length - 1; i >= 0 && results[i].outcome === last; i--) {
    count += 1;
  }
  return `${last}${count}`;
}

// ─── salary cap (§6.4) ───────────────────────────────────────────────────────

function bucketMultiplier(bucket: RosterBucket): number {
  if (bucket === 'INJURED_RESERVE') return league.irSalaryPercent / 100;
  if (bucket === 'TAXI_SQUAD') return league.taxiSalaryPercent / 100;
  return 1;
}

// Sum of contract salaries weighted by roster-bucket multiplier. SalaryAdjustments
// are not in this batch, so cap usage sums contracts only (per Spec_MockFixture).
export function computeCapUsage(franchiseId: string): number {
  const used = contracts
    .filter((c) => c.franchiseId === franchiseId)
    .reduce((sum, c) => sum + c.baseSalary * bucketMultiplier(c.currentRosterBucket), 0);
  return round2(used);
}

// No FranchiseSalaryCapOverride in this batch → the league cap is the effective
// cap for every franchise.
export const effectiveCap = (_franchiseId: string, _season = SEASON): number =>
  league.salaryCapAmount;

export const computeCapRoom = (franchiseId: string): number =>
  round2(effectiveCap(franchiseId) - computeCapUsage(franchiseId));

export const computeCapUsageSummary = (franchiseId: string): CapUsage => ({
  capUsed: computeCapUsage(franchiseId),
  effectiveCap: effectiveCap(franchiseId),
  capRoom: computeCapRoom(franchiseId),
});

// ─── standings (replaces the hand-typed array) ───────────────────────────────

const winPct = (r: WLT): number => {
  const games = r.wins + r.losses + r.ties;
  return games === 0 ? 0 : (r.wins + r.ties * 0.5) / games;
};

// Per completed week, the set of franchises in the top half of league scoring —
// each earns +1 victory point (§15.3).
function topHalfByWeek(leagueFranchiseIds: string[]): Map<number, Set<string>> {
  const byWeek = new Map<number, Map<string, number>>();
  for (const m of matchups) {
    if (m.seasonYear !== SEASON || m.status !== 'COMPLETED') continue;
    const wk = byWeek.get(m.week) ?? new Map<string, number>();
    if (m.homeScore != null) wk.set(m.homeFranchiseId, m.homeScore);
    if (m.awayFranchiseId != null && m.awayScore != null) {
      wk.set(m.awayFranchiseId, m.awayScore);
    }
    byWeek.set(m.week, wk);
  }
  const result = new Map<number, Set<string>>();
  const half = Math.floor(leagueFranchiseIds.length / 2);
  for (const [week, scores] of byWeek) {
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    result.set(week, new Set(ranked.slice(0, half).map(([id]) => id)));
  }
  return result;
}

function victoryPoints(
  franchiseId: string,
  topHalf: Map<number, Set<string>>,
): number {
  let vp = 0;
  for (const r of franchiseResults(franchiseId)) {
    vp += r.outcome === 'W' ? 2 : r.outcome === 'T' ? 1 : 0;
    if (topHalf.get(r.week)?.has(franchiseId)) vp += 1;
  }
  return vp;
}

// Ordered standings for a league: full W-L-T, PF/PA, division/conference
// records, streak, and victory points; sorted by the league tiebreaker chain
// (overall win% → total points → division win% → head-to-head approximation).
export function computeStandings(leagueId: string = league.id): StandingsRow[] {
  const leagueFranchises = franchises.filter((f) => f.leagueId === leagueId);
  const ids = leagueFranchises.map((f) => f.id);
  const topHalf = topHalfByWeek(ids);

  const rows = leagueFranchises.map((f) => {
    const record = computeRecord(f.id);
    return {
      franchiseId: f.id,
      ...record,
      pointsFor: computePointsFor(f.id),
      pointsAgainst: computePointsAgainst(f.id),
      divisionRecord: computeDivisionRecord(f.id),
      conferenceRecord: computeConferenceRecord(f.id),
      streak: computeStreak(f.id),
      victoryPoints: victoryPoints(f.id, topHalf),
      _winPct: winPct(record),
    };
  });

  rows.sort((a, b) => {
    if (b._winPct !== a._winPct) return b._winPct - a._winPct;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    const aDiv = winPct(a.divisionRecord);
    const bDiv = winPct(b.divisionRecord);
    if (bDiv !== aDiv) return bDiv - aDiv;
    return 0;
  });

  return rows.map(({ _winPct, ...row }, i) => ({ rank: i + 1, ...row }));
}

// ─── transaction summaries (human-readable feed line) ────────────────────────

const playerName = (id: string | undefined): string =>
  (id && getPlayerById(id)?.fullName) || 'a player';

// A short description for an activity-feed row, derived from type + payload
// (Transaction stores no description string).
export function describeTransaction(tx: Transaction): string {
  const p = tx.payload as Record<string, unknown>;
  switch (tx.type) {
    case 'ADD_DROP':
      return p.playerDroppedId
        ? `Added ${playerName(p.playerAddedId as string)}; dropped ${playerName(p.playerDroppedId as string)}`
        : `Added ${playerName(p.playerAddedId as string)} from free agency`;
    case 'WAIVER_CLAIM':
      return `Waiver claim — ${playerName(p.playerAddedId as string)}${p.bidAmount ? `, bid $${p.bidAmount}` : ''}`;
    case 'TRADE_COMPLETED': {
      const give = (p.proposerAssets as string[] | undefined)?.map(playerName).join(', ');
      const get = (p.receiverAssets as string[] | undefined)?.map(playerName).join(', ');
      return `Trade completed — sent ${give} for ${get}`;
    }
    case 'IR_MOVE':
      return `${playerName(p.playerId as string)} moved ${p.direction === 'IN' ? 'to Injured Reserve' : 'off Injured Reserve'}`;
    case 'TAXI_MOVE':
      return `${playerName(p.playerId as string)} ${p.direction === 'PROMOTE' ? 'promoted from' : 'demoted to'} taxi squad`;
    case 'AUCTION_AWARD':
      return `Won ${playerName(p.playerId as string)} at auction`;
    default:
      return tx.type.replace(/_/g, ' ').toLowerCase();
  }
}

export const getTransactionsByFranchise = (franchiseId: string): Transaction[] =>
  transactions
    .filter((t) => t.initiatedByFranchiseId === franchiseId)
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));

// Re-exported so callers can format weekly averages without re-deriving.
export { round1 };
