import type { Season } from '../types';
import { LEAGUE_ID, SEASON_YEAR } from './league';

// Two seasons (§4.34): the current in-progress season and the last completed
// one (for history). Cap snapshot mirrors the League cap; the 2024 row records
// a champion so Franchise History has something to read later.

export const seasons: Season[] = [
  {
    id: 'sea-2025',
    leagueId: LEAGUE_ID,
    seasonYear: SEASON_YEAR,
    salaryCapAmount: 222.75,
    entryFeeAmount: 0,
    championFranchiseId: null,
    runnerUpFranchiseId: null,
    regularSeasonPointsLeaderId: null,
    status: 'ACTIVE',
    startedAt: '2025-09-04T00:00:00Z',
    completedAt: null,
  },
  {
    id: 'sea-2024',
    leagueId: LEAGUE_ID,
    seasonYear: 2024,
    salaryCapAmount: 212.15,
    entryFeeAmount: 0,
    championFranchiseId: 'fr-oak',
    runnerUpFranchiseId: 'fr-bro',
    regularSeasonPointsLeaderId: 'fr-bro',
    status: 'COMPLETED',
    startedAt: '2024-09-05T00:00:00Z',
    completedAt: '2025-01-12T00:00:00Z',
  },
];
