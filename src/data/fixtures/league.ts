import type { League, StartingLineupConfig } from '../types';

// The single League row — a Dynasty league with salaries + contracts tracked.
// Field set and defaults follow Spec_DataModel.md §4.2; the salary cap is
// $222.75 (the Dynasty default this project has used since the first fixture).

export const LEAGUE_ID = 'lg-xo';
export const SEASON_YEAR = 2025;
export const COMMISSIONER_USER_ID = 'usr-commish';

// §4.2.3a — starting lineup min/max per position.
const STARTING_LINEUP: StartingLineupConfig = {
  schemaVersion: 1,
  positions: {
    QB: { min: 1, max: 1 },
    RB: { min: 1, max: 6 },
    WR: { min: 2, max: 7 },
    TE: { min: 1, max: 6 },
    PK: { min: 1, max: 1 },
    DT: { min: 1, max: 4 },
    DE: { min: 1, max: 4 },
    LB: { min: 3, max: 5 },
    CB: { min: 1, max: 4 },
    S: { min: 1, max: 4 },
  },
};

export const league: League = {
  // core identity (§4.2.1)
  id: LEAGUE_ID,
  slug: 'xo-play-dynasty',
  name: 'XO Play Dynasty',
  tier: 'DYNASTY',
  sport: 'NFL',
  seasonYear: SEASON_YEAR,
  status: 'ACTIVE',
  timezone: 'America/Chicago',
  commissionerUserId: COMMISSIONER_USER_ID,
  scoringDecimalPlaces: 2,
  // structure (§4.2.2)
  franchiseCount: 8,
  conferenceCount: 2,
  divisionCount: 4,
  playerPoolIsolation: 'SHARED_LEAGUE',
  scheduleMode: 'HEAD_TO_HEAD',
  initialRosterMode: 'AUCTION',
  // roster structure (§4.2.3)
  rosterSpots: 16,
  irSpots: 3,
  taxiSquadSpots: 3,
  totalStarters: 12,
  startingLineup: STARTING_LINEUP,
  rosterPositionLimits: {},
  allowPartialLineups: false,
  allowByeWeekStarters: true,
  lineupLockMode: 'LOCK_AT_KICKOFF',
  // salary cap & contracts (§4.2.4)
  trackSalaries: true,
  trackContracts: true,
  salaryCapAmount: 222.75,
  salaryCapType: 'HARD',
  salaryCapEscalatorPercent: 5.0,
  minimumPlayerSalary: 0.5,
  salaryIncrement: 0.1,
  startingLineupSalaryCap: null,
  blockLineupWhenOverCap: true,
  irSalaryPercent: 20.0,
  taxiSalaryPercent: 10.0,
  playerSalaryEscalatorPercent: 10.0,
  salaryDisplayFormat: 'WITH_CENTS',
  // scoring & tiebreakers (§4.2.12)
  tieHandling: 'ALLOW_TIES',
  standingsTiebreakerChain: [
    'OVERALL_WIN_PCT',
    'TOTAL_POINTS_SCORED',
    'DIVISION_WIN_PCT',
    'HEAD_TO_HEAD',
  ],
};
