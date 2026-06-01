import type { InjuryStatus, Player, Position, RosterBucket } from '../types';
import { int, makeRng, pick, type Rng } from '../rng';
import { FRANCHISE_IDS, franchiseAbbreviations } from './franchises';

// Generated shared player pool (§4.9): ~16 rostered players per franchise plus
// a bank of free agents, all 10 positions, varied team/injury. Deterministic —
// seeded per franchise so the pool is byte-stable across runs.
//
// players.ts also emits `rosterAssignments`: the bridge table mapping each
// rostered player to its franchise + bucket. contracts.ts and roster.ts read
// this so the three collections stay consistent without one importing another's
// rows. (Salary/bucket are NOT stored on Player — they live on Contract /
// RosterEntry per the no-flattening rule.)

const FIRST_NAMES = [
  'Davis', 'DeShaun', 'Jalen', 'Trey', 'Mason', 'Trent', 'Cam', 'Andre',
  'Spencer', 'Carlo', 'Jake', 'Tyree', 'Brandon', 'Jordan', 'Anton', 'Marcus',
  'Marvin', 'Dre', 'Caleb', 'Quentin', 'Chase', 'Devon', 'Kayden', 'Lamar',
  'Brock', 'Rico', 'Elias', 'Nash', 'Cole', 'Zane', 'Malik', 'Bryce',
  'Damon', 'Reggie', 'Tobias', 'Khalil', 'Pierce', 'Garrett', 'Dominic', 'Roman',
];

const LAST_NAMES = [
  'Carter', 'Williams', 'Hampton', 'Donaldson', 'Reilly', 'Vasquez', 'Bridgewater',
  'Ortiz', 'Lange', 'Espinoza', 'Ramsey', 'Patterson', 'Whitley', 'Becker',
  'Givens', 'Pena', 'Cobb', 'Foster', 'Holmes', 'Marsh', 'Hollander', 'Mitchell',
  'Brooks', 'Knox', 'Sterling', 'Alvarado', 'Boone', 'Castillo', 'Drummond',
  'Ellison', 'Fairchild', 'Greer', 'Hutchins', 'Ishida', 'Jennings', 'Koenig',
  'Lockhart', 'Mercer', 'Nguyen', 'Okonkwo',
];

const NFL_TEAMS = [
  'KC', 'BUF', 'MIA', 'BAL', 'CIN', 'SF', 'DAL', 'PHI', 'DET', 'GB', 'LAR',
  'SEA', 'MIN', 'NYJ', 'HOU', 'LAC', 'DEN', 'CHI', 'TB', 'ATL', 'NE', 'PIT',
  'IND', 'NO', 'JAX', 'CLE', 'TEN', 'ARI', 'CAR', 'LV', 'WAS', 'NYG',
];

const COLLEGES = [
  'Alabama', 'Georgia', 'Ohio State', 'LSU', 'Michigan', 'Clemson', 'Oregon',
  'Texas', 'Notre Dame', 'Penn State', 'Florida', 'USC', 'Oklahoma', 'Tennessee',
];

// 16-slot roster template — every one of the 10 positions appears.
const ROSTER_TEMPLATE: Position[] = [
  'QB', 'QB', 'RB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE', 'TE',
  'PK', 'LB', 'DE', 'DT', 'CB', 'S',
];

// Bucket layout within the template: two IR, two taxi, the rest active.
const IR_SLOTS = new Set([4, 12]); // an RB and a DE
const TAXI_SLOTS = new Set([14, 15]); // CB + S, treated as rookies

export type RosterAssignment = {
  playerId: string;
  franchiseId: string;
  bucket: RosterBucket;
  position: Position;
  slot: number; // index in ROSTER_TEMPLATE
  depth: number; // 0 = first/starter at this position, 1 = second, …
};

// Depth rank of each template slot within its position (starters cost more than
// depth in contracts.ts).
const TEMPLATE_DEPTH: number[] = (() => {
  const seen: Partial<Record<Position, number>> = {};
  return ROSTER_TEMPLATE.map((pos) => {
    const d = seen[pos] ?? 0;
    seen[pos] = d + 1;
    return d;
  });
})();

function makePlayer(
  rng: Rng,
  id: string,
  position: Position,
  bucket: RosterBucket | 'FA',
): Player {
  const firstName = pick(rng, FIRST_NAMES);
  const lastName = pick(rng, LAST_NAMES);
  const isRookie = bucket === 'TAXI_SQUAD' || rng() < 0.12;
  const rookieYear = isRookie ? 2025 : int(rng, 2015, 2024);

  // Injury: IR-bucket players carry IR; everyone else is mostly healthy.
  let injuryStatus: InjuryStatus = 'HEALTHY';
  if (bucket === 'INJURED_RESERVE') {
    injuryStatus = rng() < 0.5 ? 'IR' : 'OUT';
  } else {
    const r = rng();
    if (r < 0.1) injuryStatus = 'QUESTIONABLE';
    else if (r < 0.14) injuryStatus = 'DOUBTFUL';
    else if (r < 0.17) injuryStatus = 'OUT';
  }

  return {
    id,
    statsServicePlayerId: `ssp-${id.slice(4)}`,
    externalId: `00-00${String(int(rng, 10000, 99999))}`,
    isCustom: false,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    nflTeam: pick(rng, NFL_TEAMS),
    position,
    rookieYear,
    dateOfBirth: null,
    heightInches: int(rng, 68, 78),
    weightLbs: int(rng, 180, 320),
    collegeName: pick(rng, COLLEGES),
    injuryStatus,
    isActive: true,
    lastSyncedAt: '2025-11-16T06:00:00Z',
  };
}

const allPlayers: Player[] = [];
const assignments: RosterAssignment[] = [];

// Rostered pool — one deterministic pass per franchise.
FRANCHISE_IDS.forEach((franchiseId, fi) => {
  const suffix = (franchiseAbbreviations[franchiseId] ?? franchiseId).toLowerCase();
  const rng = makeRng(1000 + fi * 17);
  ROSTER_TEMPLATE.forEach((position, slot) => {
    const bucket: RosterBucket = IR_SLOTS.has(slot)
      ? 'INJURED_RESERVE'
      : TAXI_SLOTS.has(slot)
        ? 'TAXI_SQUAD'
        : 'ACTIVE';
    const id = `plr-${suffix}-${String(slot + 1).padStart(2, '0')}`;
    allPlayers.push(makePlayer(rng, id, position, bucket));
    assignments.push({
      playerId: id,
      franchiseId,
      bucket,
      position,
      slot,
      depth: TEMPLATE_DEPTH[slot],
    });
  });
});

// Free-agent pool — unrostered players across all positions (§7 free agents).
const FA_POSITIONS: Position[] = [
  'QB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE', 'PK', 'LB', 'LB',
  'DE', 'DT', 'CB', 'CB', 'S', 'S', 'RB', 'WR', 'TE', 'QB',
];
const faRng = makeRng(9001);
FA_POSITIONS.forEach((position, i) => {
  const id = `plr-fa-${String(i + 1).padStart(2, '0')}`;
  allPlayers.push(makePlayer(faRng, id, position, 'FA'));
});

export const players: Player[] = allPlayers;
export const rosterAssignments: RosterAssignment[] = assignments;

// Shared id derivation so roster.ts can link a RosterEntry to its Contract
// without importing contracts.ts (avoids a fixture import cycle).
export const contractIdFor = (playerId: string): string =>
  `ctr-${playerId.slice(4)}`;
