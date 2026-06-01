import type { Position, ScoringRule, StatType } from '../types';
import { LEAGUE_ID } from './league';

// A standard scoring rule set across passing / rushing / receiving / kicking /
// defensive stats (§4.11). derive.computePlayerPoints applies these to each
// Stats row: points += pointsPerUnit × (statValue / perUnit) for every rule
// whose statType matches and whose positionScope includes the player.

const OFFENSE_SKILL: Position[] = ['RB', 'WR', 'TE'];
const IDP: Position[] = ['DT', 'DE', 'LB', 'CB', 'S'];

type RuleSeed = {
  statType: StatType;
  scope: Position[];
  pointsPerUnit: number;
  perUnit?: number;
};

const SEEDS: RuleSeed[] = [
  // passing
  { statType: 'PASSING_YARDS', scope: ['QB'], pointsPerUnit: 1, perUnit: 25 },
  { statType: 'PASSING_TDS', scope: ['QB'], pointsPerUnit: 4 },
  { statType: 'PASSING_INTS', scope: ['QB'], pointsPerUnit: -2 },
  // rushing
  { statType: 'RUSHING_YARDS', scope: ['QB', 'RB', 'WR'], pointsPerUnit: 1, perUnit: 10 },
  { statType: 'RUSHING_TDS', scope: ['QB', 'RB', 'WR'], pointsPerUnit: 6 },
  // receiving (half-PPR)
  { statType: 'RECEIVING_YARDS', scope: OFFENSE_SKILL, pointsPerUnit: 1, perUnit: 10 },
  { statType: 'RECEIVING_TDS', scope: OFFENSE_SKILL, pointsPerUnit: 6 },
  { statType: 'RECEPTIONS', scope: OFFENSE_SKILL, pointsPerUnit: 0.5 },
  // turnovers
  { statType: 'FUMBLES_LOST', scope: ['QB', 'RB', 'WR', 'TE'], pointsPerUnit: -2 },
  // kicking
  { statType: 'FG_MADE', scope: ['PK'], pointsPerUnit: 3 },
  { statType: 'FG_MISSED', scope: ['PK'], pointsPerUnit: -1 },
  { statType: 'XP_MADE', scope: ['PK'], pointsPerUnit: 1 },
  // defensive (IDP)
  { statType: 'DEF_TACKLES_SOLO', scope: IDP, pointsPerUnit: 1 },
  { statType: 'DEF_SACKS', scope: IDP, pointsPerUnit: 2 },
  { statType: 'DEF_INTERCEPTIONS', scope: IDP, pointsPerUnit: 3 },
  { statType: 'DEF_FORCED_FUMBLES', scope: IDP, pointsPerUnit: 3 },
  { statType: 'DEF_PASSES_DEFENDED', scope: IDP, pointsPerUnit: 1 },
];

export const scoringRules: ScoringRule[] = SEEDS.map((s, i) => ({
  id: `sr-${String(i + 1).padStart(2, '0')}`,
  leagueId: LEAGUE_ID,
  statType: s.statType,
  positionScope: s.scope,
  rangeLow: 0,
  rangeHigh: 9999,
  pointsPerUnit: s.pointsPerUnit,
  perUnit: s.perUnit ?? 1,
  flatPoints: null,
  displayOrder: i,
}));
