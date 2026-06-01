import type { AcquiredVia, Contract, ContractStatus, Position } from '../types';
import { int, makeRng, pick, roundToIncrement, type Rng } from '../rng';
import { league } from './league';
import { contractIdFor, rosterAssignments } from './players';

// One Contract per rostered player (§4.13), generated deterministically.
// baseSalary is a multiple of League.salaryIncrement and ≥ minimumPlayerSalary;
// currentRosterBucket is denormalized from the player's RosterEntry bucket
// (§2.6 / §6.2). No cap total is stored — cap usage is computed in derive.ts.

// Per-position salary band [min, max] before increment rounding. Tuned so a
// 16-man roster (12 active + IR×0.2 + taxi×0.1) lands a little under the
// $222.75 cap, the way real franchises carry a few dollars of room.
const SALARY_BANDS: Record<Position, [number, number]> = {
  QB: [6, 46],
  RB: [3, 38],
  WR: [5, 36],
  TE: [3, 16],
  PK: [1, 4],
  LB: [2, 11],
  DE: [2, 10],
  DT: [2, 10],
  CB: [1, 7],
  S: [1, 7],
};

// Fraction of the band a contract reaches, by depth: starters near the top,
// depth players near the floor.
const DEPTH_FRACTION: [number, number][] = [
  [0.55, 0.98], // depth 0 — starter
  [0.18, 0.4], // depth 1 — primary backup
  [0.08, 0.22], // depth 2+ — deep bench
];

const ACQUIRED: AcquiredVia[] = ['DRAFT', 'AUCTION', 'WAIVER', 'FCFS', 'TRADE'];

function salaryFor(rng: Rng, position: Position, depth: number): number {
  const [lo, hi] = SALARY_BANDS[position];
  const [fLo, fHi] = DEPTH_FRACTION[Math.min(depth, DEPTH_FRACTION.length - 1)];
  const base = lo + (hi - lo) * (fLo + rng() * (fHi - fLo));
  return Math.max(
    league.minimumPlayerSalary,
    roundToIncrement(base, league.salaryIncrement),
  );
}

export const contracts: Contract[] = rosterAssignments.map((a, i) => {
  const rng = makeRng(5000 + i * 13);
  const total = int(rng, 1, 5);
  let remaining = int(rng, 1, total);

  // Status mix: mostly ACTIVE, a few extended / tagged / expiring.
  let status: ContractStatus = 'ACTIVE';
  let franchiseTagRenewalYear: number | null = null;
  const r = rng();
  if (r < 0.08) {
    status = 'FRANCHISE_TAGGED';
    remaining = 1;
    franchiseTagRenewalYear = int(rng, 1, 3);
  } else if (r < 0.2) {
    status = 'EXTENDED';
  } else if (remaining === 0) {
    status = 'EXPIRED';
  }

  const acquiredSeason = int(rng, 2022, 2025);

  return {
    id: contractIdFor(a.playerId),
    leagueId: league.id,
    franchiseId: a.franchiseId,
    playerId: a.playerId,
    baseSalary: salaryFor(rng, a.position, a.depth),
    contractYearsTotal: total,
    contractYearsRemaining: remaining,
    acquiredVia: pick(rng, ACQUIRED),
    acquiredAt: `${acquiredSeason}-09-01T00:00:00Z`,
    acquiredSeason,
    status,
    salaryEscalatorPercent: league.playerSalaryEscalatorPercent,
    otherContractInfo: null,
    contractStatusLabel: a.bucket === 'TAXI_SQUAD' ? 'Rookie Scale' : null,
    currentRosterBucket: a.bucket,
    franchiseTagRenewalYear,
  };
});
