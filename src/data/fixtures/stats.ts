import type { Position, Stats, StatType } from '../types';
import { int, makeRng, type Rng } from '../rng';
import { SEASON_YEAR } from './league';
import { players } from './players';

// Generated weekly stat lines (§4.10): one Stats row per player per week for a
// short window (weeks 9–11). statValues are keyed by Stat Type (§5.50) and are
// position-appropriate. derive.ts turns these into fantasy points via the
// scoring rules; nothing here stores points.

const WEEKS = [9, 10, 11];

function statsForPosition(rng: Rng, position: Position): Partial<Record<StatType, number>> {
  switch (position) {
    case 'QB':
      return {
        PASSING_YARDS: int(rng, 170, 350),
        PASSING_TDS: int(rng, 0, 4),
        PASSING_INTS: int(rng, 0, 2),
        RUSHING_YARDS: int(rng, 0, 32),
        RUSHING_TDS: rng() < 0.2 ? 1 : 0,
      };
    case 'RB':
      return {
        RUSHING_YARDS: int(rng, 18, 130),
        RUSHING_TDS: int(rng, 0, 2),
        RECEPTIONS: int(rng, 1, 6),
        RECEIVING_YARDS: int(rng, 4, 60),
        RECEIVING_TDS: rng() < 0.18 ? 1 : 0,
        FUMBLES_LOST: rng() < 0.12 ? 1 : 0,
      };
    case 'WR':
      return {
        RECEPTIONS: int(rng, 2, 10),
        RECEIVING_YARDS: int(rng, 18, 132),
        RECEIVING_TDS: int(rng, 0, 2),
      };
    case 'TE':
      return {
        RECEPTIONS: int(rng, 1, 7),
        RECEIVING_YARDS: int(rng, 8, 82),
        RECEIVING_TDS: rng() < 0.22 ? 1 : 0,
      };
    case 'PK':
      return {
        FG_MADE: int(rng, 0, 4),
        FG_MISSED: rng() < 0.3 ? 1 : 0,
        XP_MADE: int(rng, 0, 5),
      };
    default:
      // IDP (DT, DE, LB, CB, S)
      return {
        DEF_TACKLES_SOLO: int(rng, 1, 9),
        DEF_SACKS: rng() < 0.35 ? int(rng, 1, 2) : 0,
        DEF_INTERCEPTIONS: rng() < 0.12 ? 1 : 0,
        DEF_FORCED_FUMBLES: rng() < 0.12 ? 1 : 0,
        DEF_PASSES_DEFENDED: int(rng, 0, 3),
      };
  }
}

const allStats: Stats[] = [];

players.forEach((player, pi) => {
  // Players who are IR or OUT did not produce stats in the current window.
  const sidelined = player.injuryStatus === 'IR' || player.injuryStatus === 'OUT';
  WEEKS.forEach((week) => {
    const rng = makeRng(20000 + pi * 31 + week);
    const statValues = sidelined ? {} : statsForPosition(rng, player.position);
    allStats.push({
      id: `stat-${player.id.slice(4)}-w${week}`,
      playerId: player.id,
      seasonYear: SEASON_YEAR,
      week,
      statValues,
      sourceVersion: 1,
      isReconciled: week < 11, // current week not yet authoritative
      lastCorrectionAt: null,
    });
  });
});

export const stats: Stats[] = allStats;

// The weeks this fixture covers — derive.ts uses the max as "last week".
export const STAT_WEEKS = WEEKS;
