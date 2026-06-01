import type { Matchup, MatchupStatus } from '../types';
import { round2 } from '../rng';
import { LEAGUE_ID, SEASON_YEAR } from './league';
import { FRANCHISE_IDS, franchiseAbbreviations } from './franchises';

// The season schedule (§4.20). Hand-authored: each franchise has a base weekly
// strength and a shared per-week wobble (offset per franchise so upsets
// happen); a matchup's homeScore/awayScore are those franchises' weekly totals.
// homeScore/awayScore are real stored fields. Records / PF / PA derive from the
// COMPLETED matchups in derive.ts — nothing is precomputed here.
//
// Franchises are indexed by FRANCHISE_IDS order:
//   0 bro  1 cas  2 oak  3 gal  4 mia  5 aur  6 san  7 prt

// Average weekly fantasy points per franchise — the authored "strength."
const BASE = [121, 113, 117, 106, 110, 101, 104, 98];
// Per-week swing applied with a per-franchise phase offset.
const WOBBLE = [4.2, -3.1, 7.6, -5.4, 1.8, 6.3, -2.7, 3.9, -4.6, 5.1, 0.9];

function weeklyScore(fr: number, week: number): number {
  const w = week - 1;
  const jitter = ((fr * 7 + week * 3) % 10) / 10; // keeps scores off whole numbers
  return round2(BASE[fr] + WOBBLE[(w + fr * 4) % WOBBLE.length] + jitter);
}

// Round-robin pairings (circle method, team 0 fixed). Each round partitions all
// eight franchises into four games.
const ROUNDS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[0, 7], [1, 6], [2, 5], [3, 4]], // R1
  [[0, 6], [7, 5], [1, 4], [2, 3]], // R2
  [[0, 5], [6, 4], [7, 3], [1, 2]], // R3
  [[0, 4], [5, 3], [6, 2], [7, 1]], // R4
  [[0, 3], [4, 2], [5, 1], [6, 7]], // R5
  [[0, 2], [3, 1], [4, 7], [5, 6]], // R6
  [[0, 1], [2, 7], [3, 6], [4, 5]], // R7
];

// Weeks 1–7 run R1–R7; weeks 8–10 rematch R1–R3; week 11 (current, in progress)
// replays R6 so the league leader (BRO) faces OAK live — what FranchiseHome's
// "This Week" reads for the default franchise.
const WEEK_ROUNDS = [0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 5];
const CURRENT_WEEK = WEEK_ROUNDS.length; // 11
const LIVE_FRACTION = 0.62; // in-progress games show partial scores

const abbr = (i: number) =>
  (franchiseAbbreviations[FRANCHISE_IDS[i]] ?? FRANCHISE_IDS[i]).toLowerCase();

const all: Matchup[] = [];

WEEK_ROUNDS.forEach((roundIndex, wi) => {
  const week = wi + 1;
  const inProgress = week === CURRENT_WEEK;
  const status: MatchupStatus = inProgress ? 'IN_PROGRESS' : 'COMPLETED';

  ROUNDS[roundIndex].forEach(([home, away]) => {
    const fullHome = weeklyScore(home, week);
    const fullAway = weeklyScore(away, week);
    const homeScore = inProgress ? round2(fullHome * LIVE_FRACTION) : fullHome;
    const awayScore = inProgress ? round2(fullAway * LIVE_FRACTION) : fullAway;

    let winnerFranchiseId: string | null = null;
    if (!inProgress) {
      if (homeScore > awayScore) winnerFranchiseId = FRANCHISE_IDS[home];
      else if (awayScore > homeScore) winnerFranchiseId = FRANCHISE_IDS[away];
    }

    all.push({
      id: `mu-${SEASON_YEAR}-w${week}-${abbr(home)}-${abbr(away)}`,
      leagueId: LEAGUE_ID,
      seasonYear: SEASON_YEAR,
      week,
      homeFranchiseId: FRANCHISE_IDS[home],
      awayFranchiseId: FRANCHISE_IDS[away],
      homeScore,
      awayScore,
      isPlayoff: false,
      playoffBracketId: null,
      playoffRound: null,
      status,
      winnerFranchiseId,
    });
  });
});

export const matchups: Matchup[] = all;
export const CURRENT_WEEK_NUMBER = CURRENT_WEEK;
