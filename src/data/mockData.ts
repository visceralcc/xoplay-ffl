// Mock fantasy football data for component previews. Field names and enum
// values mirror Spec_DataModel.md §4-§5 so the same components can later be
// pointed at real query results without renaming. Self-contained — no theme
// imports. Salaries are decimal(8,2); cap is $222.75 per Dynasty defaults.

// ─── enum types (mirror Spec_DataModel.md §5) ────────────────────────────────

export type PlayerPosition =
  | 'QB' | 'RB' | 'WR' | 'TE' | 'PK'
  | 'DT' | 'DE' | 'LB' | 'CB' | 'S';

export type InjuryStatus =
  | 'HEALTHY'
  | 'QUESTIONABLE'
  | 'DOUBTFUL'
  | 'OUT'
  | 'IR'
  | 'SUSPENDED'
  | 'HOLDOUT'
  | 'COVID';

export type RosterBucket = 'ACTIVE' | 'INJURED_RESERVE' | 'TAXI_SQUAD';

export type ContractStatus =
  | 'ACTIVE'
  | 'FRANCHISE_TAGGED'
  | 'EXTENDED'
  | 'EXPIRED';

export type AcquiredVia =
  | 'DRAFT'
  | 'AUCTION'
  | 'WAIVER'
  | 'FCFS'
  | 'TRADE'
  | 'COMMISSIONER';

export type TransactionType =
  | 'ADD_DROP'
  | 'WAIVER_CLAIM'
  | 'TRADE_COMPLETED'
  | 'TRADE_REVERSAL'
  | 'IR_MOVE'
  | 'TAXI_MOVE'
  | 'AUCTION_AWARD'
  | 'DRAFT_PICK_MADE'
  | 'SALARY_ADJUSTMENT'
  | 'ROLLOVER'
  | 'SCORE_ADJUSTMENT'
  | 'LINEUP_SET'
  | 'COMMISSIONER_ACTION';

export type MatchupStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'VOIDED';

// ─── entity types ────────────────────────────────────────────────────────────

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  position: PlayerPosition;
  nflTeam: string;
  injuryStatus: InjuryStatus;
  byeWeek: number;
  salary: number;
  contractYears: number;
  contractStatus: ContractStatus;
  acquiredVia: AcquiredVia;
  weeklyScores: number[];
  seasonTotal: number;
  projectedPoints: number;
  rosterBucket: RosterBucket;
  franchiseId: string;
};

export type Franchise = {
  id: string;
  name: string;
  slug: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  ownerName: string;
  record: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  capUsed: number;
  capTotal: number;
};

export type StandingsEntry = {
  rank: number;
  franchiseId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
  divisionRecord: string;
};

export type ScoringPlay = {
  id: string;
  playerId: string;
  playerName: string;
  franchiseId: string;
  points: number;
  timestamp: string;
  description: string;
};

export type Matchup = {
  id: string;
  weekNumber: number;
  homeFranchiseId: string;
  awayFranchiseId: string;
  homeScore: number;
  awayScore: number;
  status: MatchupStatus;
  isLive: boolean;
  scoringPlays: ScoringPlay[];
};

export type Transaction = {
  id: string;
  type: TransactionType;
  timestamp: string;
  franchiseId: string;
  playerIds: string[];
  details: string;
};

// ─── franchises ──────────────────────────────────────────────────────────────
// Colors come directly from design/reference/tokens.js. Records and points
// come from Spec_DesignSystem.md sample tiles — they don't conserve across
// the league because the spec only documents 5 example franchises, not a
// closed-loop schedule.

const SALARY_CAP = 222.75;

export const franchises: Franchise[] = [
  {
    id: 'fr-oak',
    name: 'Oakdale Timberwolves',
    slug: 'oakdale-timberwolves',
    abbreviation: 'OAK',
    primaryColor: '#1b4332',
    secondaryColor: '#d4c79a',
    ownerName: 'M. Torres',
    record: '7-3',
    wins: 7,
    losses: 3,
    ties: 0,
    pointsFor: 1180.45,
    pointsAgainst: 1085.20,
    capUsed: 202.70,
    capTotal: SALARY_CAP,
  },
  {
    id: 'fr-mia',
    name: 'Miami Tempo',
    slug: 'miami-tempo',
    abbreviation: 'MIA',
    primaryColor: '#e0266f',
    secondaryColor: '#ff8a2d',
    ownerName: 'J. Whitaker',
    record: '6-4',
    wins: 6,
    losses: 4,
    ties: 0,
    pointsFor: 1095.80,
    pointsAgainst: 1110.15,
    capUsed: 227.20,
    capTotal: SALARY_CAP,
  },
  {
    id: 'fr-bro',
    name: 'Bronxville Iron',
    slug: 'bronxville-iron',
    abbreviation: 'BRO',
    primaryColor: '#0f1626',
    secondaryColor: '#3a3f4a',
    ownerName: 'D. Kovac',
    record: '8-2',
    wins: 8,
    losses: 2,
    ties: 0,
    pointsFor: 1230.90,
    pointsAgainst: 980.55,
    capUsed: 218.30,
    capTotal: SALARY_CAP,
  },
  {
    id: 'fr-san',
    name: 'Santa Fe Dust',
    slug: 'santa-fe-dust',
    abbreviation: 'SAN',
    primaryColor: '#efe7cf',
    secondaryColor: '#d9b86b',
    ownerName: 'A. Brennan',
    record: '5-5',
    wins: 5,
    losses: 5,
    ties: 0,
    pointsFor: 1010.25,
    pointsAgainst: 1100.40,
    capUsed: 189.34,
    capTotal: SALARY_CAP,
  },
  {
    id: 'fr-prt',
    name: 'Portland Rainwater',
    slug: 'portland-rainwater',
    abbreviation: 'PRT',
    primaryColor: '#4c2a6e',
    secondaryColor: '#2ba59a',
    ownerName: 'K. Oshiro',
    record: '4-6',
    wins: 4,
    losses: 6,
    ties: 0,
    pointsFor: 950.10,
    pointsAgainst: 1180.65,
    capUsed: 211.61,
    capTotal: SALARY_CAP,
  },
];

// ─── players ─────────────────────────────────────────────────────────────────
// 25 players, 5 per franchise. Position coverage: 5 QB, 5 RB, 5 WR, 3 TE,
// 2 PK, 5 IDP (1 each of LB, DE, CB, S, DT). Injury mix: 18 HEALTHY,
// 3 QUESTIONABLE, 1 DOUBTFUL, 1 OUT, 2 IR. Roster mix: 20 ACTIVE,
// 2 INJURED_RESERVE, 3 TAXI_SQUAD.

export const players: Player[] = [
  // ── OAK (5) ──
  {
    id: 'plr-davis-carter',
    firstName: 'Davis',
    lastName: 'Carter',
    position: 'QB',
    nflTeam: 'KC',
    injuryStatus: 'HEALTHY',
    byeWeek: 10,
    salary: 38.50,
    contractYears: 4,
    contractStatus: 'ACTIVE',
    acquiredVia: 'DRAFT',
    weeklyScores: [24.80, 31.20, 18.45, 27.90],
    seasonTotal: 248.65,
    projectedPoints: 25.40,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-oak',
  },
  {
    id: 'plr-deshaun-williams',
    firstName: 'DeShaun',
    lastName: 'Williams',
    position: 'RB',
    nflTeam: 'KC',
    injuryStatus: 'QUESTIONABLE',
    byeWeek: 10,
    salary: 42.25,
    contractYears: 3,
    contractStatus: 'ACTIVE',
    acquiredVia: 'AUCTION',
    weeklyScores: [18.20, 22.50, 9.80, 15.65],
    seasonTotal: 178.90,
    projectedPoints: 14.80,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-oak',
  },
  {
    id: 'plr-jalen-hampton',
    firstName: 'Jalen',
    lastName: 'Hampton',
    position: 'WR',
    nflTeam: 'CIN',
    injuryStatus: 'HEALTHY',
    byeWeek: 12,
    salary: 28.75,
    contractYears: 2,
    contractStatus: 'ACTIVE',
    acquiredVia: 'TRADE',
    weeklyScores: [16.40, 11.20, 19.80, 22.10],
    seasonTotal: 165.30,
    projectedPoints: 17.50,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-oak',
  },
  {
    id: 'plr-trey-donaldson',
    firstName: 'Trey',
    lastName: 'Donaldson',
    position: 'TE',
    nflTeam: 'KC',
    injuryStatus: 'HEALTHY',
    byeWeek: 10,
    salary: 14.00,
    contractYears: 2,
    contractStatus: 'EXTENDED',
    acquiredVia: 'AUCTION',
    weeklyScores: [9.40, 12.80, 6.20, 14.50],
    seasonTotal: 102.45,
    projectedPoints: 10.80,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-oak',
  },
  {
    id: 'plr-mason-reilly',
    firstName: 'Mason',
    lastName: 'Reilly',
    position: 'PK',
    nflTeam: 'BAL',
    injuryStatus: 'HEALTHY',
    byeWeek: 14,
    salary: 1.00,
    contractYears: 1,
    contractStatus: 'ACTIVE',
    acquiredVia: 'WAIVER',
    weeklyScores: [8.00, 11.00, 9.00, 13.00],
    seasonTotal: 94.00,
    projectedPoints: 9.50,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-oak',
  },

  // ── MIA (5) ──
  {
    id: 'plr-trent-vasquez',
    firstName: 'Trent',
    lastName: 'Vasquez',
    position: 'QB',
    nflTeam: 'MIA',
    injuryStatus: 'HEALTHY',
    byeWeek: 6,
    salary: 32.00,
    contractYears: 3,
    contractStatus: 'ACTIVE',
    acquiredVia: 'AUCTION',
    weeklyScores: [22.40, 19.80, 26.50, 21.10],
    seasonTotal: 218.90,
    projectedPoints: 23.10,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-mia',
  },
  {
    id: 'plr-cam-bridgewater',
    firstName: 'Cam',
    lastName: 'Bridgewater',
    position: 'RB',
    nflTeam: 'DAL',
    injuryStatus: 'HEALTHY',
    byeWeek: 7,
    salary: 36.75,
    contractYears: 4,
    contractStatus: 'ACTIVE',
    acquiredVia: 'DRAFT',
    weeklyScores: [14.80, 21.30, 17.50, 19.40],
    seasonTotal: 172.60,
    projectedPoints: 17.20,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-mia',
  },
  {
    id: 'plr-andre-ortiz',
    firstName: 'Andre',
    lastName: 'Ortiz',
    position: 'WR',
    nflTeam: 'LAR',
    injuryStatus: 'DOUBTFUL',
    byeWeek: 6,
    salary: 24.50,
    contractYears: 2,
    contractStatus: 'ACTIVE',
    acquiredVia: 'AUCTION',
    weeklyScores: [12.20, 8.40, 14.10, 5.80],
    seasonTotal: 128.45,
    projectedPoints: 11.40,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-mia',
  },
  {
    id: 'plr-spencer-lange',
    firstName: 'Spencer',
    lastName: 'Lange',
    position: 'TE',
    nflTeam: 'ATL',
    injuryStatus: 'HEALTHY',
    byeWeek: 12,
    salary: 11.25,
    contractYears: 1,
    contractStatus: 'FRANCHISE_TAGGED',
    acquiredVia: 'DRAFT',
    weeklyScores: [10.80, 8.20, 11.40, 9.60],
    seasonTotal: 88.20,
    projectedPoints: 9.80,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-mia',
  },
  {
    id: 'plr-carlo-espinoza',
    firstName: 'Carlo',
    lastName: 'Espinoza',
    position: 'PK',
    nflTeam: 'PIT',
    injuryStatus: 'HEALTHY',
    byeWeek: 9,
    salary: 1.00,
    contractYears: 1,
    contractStatus: 'ACTIVE',
    acquiredVia: 'WAIVER',
    weeklyScores: [7.00, 10.00, 12.00, 8.00],
    seasonTotal: 87.00,
    projectedPoints: 9.00,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-mia',
  },

  // ── BRO (5) ──
  {
    id: 'plr-jake-ramsey',
    firstName: 'Jake',
    lastName: 'Ramsey',
    position: 'QB',
    nflTeam: 'BUF',
    injuryStatus: 'HEALTHY',
    byeWeek: 12,
    salary: 45.50,
    contractYears: 5,
    contractStatus: 'ACTIVE',
    acquiredVia: 'DRAFT',
    weeklyScores: [28.40, 32.10, 25.80, 30.50],
    seasonTotal: 285.40,
    projectedPoints: 28.90,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-bro',
  },
  {
    id: 'plr-tyree-patterson',
    firstName: 'Tyree',
    lastName: 'Patterson',
    position: 'RB',
    nflTeam: 'DET',
    injuryStatus: 'HEALTHY',
    byeWeek: 5,
    salary: 39.25,
    contractYears: 3,
    contractStatus: 'EXTENDED',
    acquiredVia: 'TRADE',
    weeklyScores: [20.80, 24.50, 16.40, 22.90],
    seasonTotal: 198.30,
    projectedPoints: 19.60,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-bro',
  },
  {
    id: 'plr-brandon-whitley',
    firstName: 'Brandon',
    lastName: 'Whitley',
    position: 'WR',
    nflTeam: 'MIA',
    injuryStatus: 'HEALTHY',
    byeWeek: 6,
    salary: 31.50,
    contractYears: 3,
    contractStatus: 'ACTIVE',
    acquiredVia: 'AUCTION',
    weeklyScores: [19.40, 23.10, 17.80, 21.50],
    seasonTotal: 192.65,
    projectedPoints: 19.40,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-bro',
  },
  {
    id: 'plr-jordan-becker',
    firstName: 'Jordan',
    lastName: 'Becker',
    position: 'LB',
    nflTeam: 'LAC',
    injuryStatus: 'HEALTHY',
    byeWeek: 5,
    salary: 6.50,
    contractYears: 2,
    contractStatus: 'ACTIVE',
    acquiredVia: 'AUCTION',
    weeklyScores: [11.20, 14.80, 9.40, 12.60],
    seasonTotal: 118.20,
    projectedPoints: 12.10,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-bro',
  },
  {
    id: 'plr-anton-givens',
    firstName: 'Anton',
    lastName: 'Givens',
    position: 'DE',
    nflTeam: 'DEN',
    injuryStatus: 'IR',
    byeWeek: 14,
    salary: 4.25,
    contractYears: 2,
    contractStatus: 'ACTIVE',
    acquiredVia: 'WAIVER',
    weeklyScores: [8.40, 10.20, 0.00, 0.00],
    seasonTotal: 64.80,
    projectedPoints: 0.00,
    rosterBucket: 'INJURED_RESERVE',
    franchiseId: 'fr-bro',
  },

  // ── SAN (5) ──
  {
    id: 'plr-marcus-pena',
    firstName: 'Marcus',
    lastName: 'Pena',
    position: 'QB',
    nflTeam: 'PHI',
    injuryStatus: 'HEALTHY',
    byeWeek: 5,
    salary: 28.00,
    contractYears: 2,
    contractStatus: 'ACTIVE',
    acquiredVia: 'AUCTION',
    weeklyScores: [21.40, 17.80, 23.50, 19.20],
    seasonTotal: 195.40,
    projectedPoints: 20.80,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-san',
  },
  {
    id: 'plr-marvin-cobb',
    firstName: 'Marvin',
    lastName: 'Cobb',
    position: 'RB',
    nflTeam: 'BAL',
    injuryStatus: 'QUESTIONABLE',
    byeWeek: 14,
    salary: 22.75,
    contractYears: 2,
    contractStatus: 'ACTIVE',
    acquiredVia: 'WAIVER',
    weeklyScores: [12.40, 8.80, 16.20, 11.50],
    seasonTotal: 124.30,
    projectedPoints: 12.50,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-san',
  },
  {
    id: 'plr-dre-foster',
    firstName: 'Dre',
    lastName: 'Foster',
    position: 'WR',
    nflTeam: 'TB',
    injuryStatus: 'HEALTHY',
    byeWeek: 11,
    salary: 18.50,
    contractYears: 3,
    contractStatus: 'ACTIVE',
    acquiredVia: 'DRAFT',
    weeklyScores: [14.80, 11.20, 13.40, 16.10],
    seasonTotal: 138.50,
    projectedPoints: 13.80,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-san',
  },
  {
    id: 'plr-caleb-holmes',
    firstName: 'Caleb',
    lastName: 'Holmes',
    position: 'CB',
    nflTeam: 'NE',
    injuryStatus: 'HEALTHY',
    byeWeek: 14,
    salary: 3.75,
    contractYears: 1,
    contractStatus: 'ACTIVE',
    acquiredVia: 'WAIVER',
    weeklyScores: [9.20, 7.40, 11.80, 8.60],
    seasonTotal: 88.40,
    projectedPoints: 9.20,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-san',
  },
  {
    id: 'plr-quentin-marsh',
    firstName: 'Quentin',
    lastName: 'Marsh',
    position: 'S',
    nflTeam: 'GB',
    injuryStatus: 'HEALTHY',
    byeWeek: 10,
    salary: 1.00,
    contractYears: 3,
    contractStatus: 'ACTIVE',
    acquiredVia: 'DRAFT',
    weeklyScores: [6.40, 8.80, 7.20, 9.40],
    seasonTotal: 78.20,
    projectedPoints: 8.40,
    rosterBucket: 'TAXI_SQUAD',
    franchiseId: 'fr-san',
  },

  // ── PRT (5) ──
  {
    id: 'plr-chase-hollander',
    firstName: 'Chase',
    lastName: 'Hollander',
    position: 'QB',
    nflTeam: 'SF',
    injuryStatus: 'HEALTHY',
    byeWeek: 9,
    salary: 26.50,
    contractYears: 4,
    contractStatus: 'ACTIVE',
    acquiredVia: 'DRAFT',
    weeklyScores: [18.40, 20.80, 16.20, 22.50],
    seasonTotal: 184.40,
    projectedPoints: 19.40,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-prt',
  },
  {
    id: 'plr-devon-mitchell',
    firstName: 'Devon',
    lastName: 'Mitchell',
    position: 'RB',
    nflTeam: 'CHI',
    injuryStatus: 'OUT',
    byeWeek: 13,
    salary: 19.25,
    contractYears: 2,
    contractStatus: 'ACTIVE',
    acquiredVia: 'AUCTION',
    weeklyScores: [11.40, 14.80, 0.00, 8.20],
    seasonTotal: 102.40,
    projectedPoints: 0.00,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-prt',
  },
  {
    id: 'plr-kayden-brooks',
    firstName: 'Kayden',
    lastName: 'Brooks',
    position: 'WR',
    nflTeam: 'NYJ',
    injuryStatus: 'QUESTIONABLE',
    byeWeek: 12,
    salary: 16.00,
    contractYears: 1,
    contractStatus: 'EXPIRED',
    acquiredVia: 'TRADE',
    weeklyScores: [9.40, 13.20, 7.80, 11.50],
    seasonTotal: 105.40,
    projectedPoints: 10.20,
    rosterBucket: 'ACTIVE',
    franchiseId: 'fr-prt',
  },
  {
    id: 'plr-lamar-knox',
    firstName: 'Lamar',
    lastName: 'Knox',
    position: 'DT',
    nflTeam: 'IND',
    injuryStatus: 'IR',
    byeWeek: 11,
    salary: 2.50,
    contractYears: 1,
    contractStatus: 'ACTIVE',
    acquiredVia: 'WAIVER',
    weeklyScores: [5.40, 7.20, 0.00, 0.00],
    seasonTotal: 42.60,
    projectedPoints: 0.00,
    rosterBucket: 'INJURED_RESERVE',
    franchiseId: 'fr-prt',
  },
  {
    id: 'plr-brock-sterling',
    firstName: 'Brock',
    lastName: 'Sterling',
    position: 'TE',
    nflTeam: 'SEA',
    injuryStatus: 'HEALTHY',
    byeWeek: 10,
    salary: 1.00,
    contractYears: 3,
    contractStatus: 'ACTIVE',
    acquiredVia: 'DRAFT',
    weeklyScores: [4.80, 6.40, 5.20, 7.10],
    seasonTotal: 52.80,
    projectedPoints: 6.20,
    rosterBucket: 'TAXI_SQUAD',
    franchiseId: 'fr-prt',
  },
];

// One additional taxi-squad rookie to bring TAXI_SQUAD count to 3.
players.push({
  id: 'plr-rico-alvarado',
  firstName: 'Rico',
  lastName: 'Alvarado',
  position: 'WR',
  nflTeam: 'HOU',
  injuryStatus: 'HEALTHY',
  byeWeek: 14,
  salary: 1.00,
  contractYears: 3,
  contractStatus: 'ACTIVE',
  acquiredVia: 'DRAFT',
  weeklyScores: [3.40, 5.80, 4.20, 6.50],
  seasonTotal: 48.40,
  projectedPoints: 5.50,
  rosterBucket: 'TAXI_SQUAD',
  franchiseId: 'fr-oak',
});

// ─── standings ───────────────────────────────────────────────────────────────

export const standings: StandingsEntry[] = [
  {
    rank: 1,
    franchiseId: 'fr-bro',
    wins: 8,
    losses: 2,
    ties: 0,
    pointsFor: 1230.90,
    pointsAgainst: 980.55,
    streak: 'W4',
    divisionRecord: '4-0',
  },
  {
    rank: 2,
    franchiseId: 'fr-oak',
    wins: 7,
    losses: 3,
    ties: 0,
    pointsFor: 1180.45,
    pointsAgainst: 1085.20,
    streak: 'W2',
    divisionRecord: '3-1',
  },
  {
    rank: 3,
    franchiseId: 'fr-mia',
    wins: 6,
    losses: 4,
    ties: 0,
    pointsFor: 1095.80,
    pointsAgainst: 1110.15,
    streak: 'L1',
    divisionRecord: '3-1',
  },
  {
    rank: 4,
    franchiseId: 'fr-san',
    wins: 5,
    losses: 5,
    ties: 0,
    pointsFor: 1010.25,
    pointsAgainst: 1100.40,
    streak: 'W1',
    divisionRecord: '2-2',
  },
  {
    rank: 5,
    franchiseId: 'fr-prt',
    wins: 4,
    losses: 6,
    ties: 0,
    pointsFor: 950.10,
    pointsAgainst: 1180.65,
    streak: 'L3',
    divisionRecord: '0-4',
  },
];

// ─── matchups ────────────────────────────────────────────────────────────────

export const matchups: Matchup[] = [
  {
    id: 'mu-2025-w11-bro-oak',
    weekNumber: 11,
    homeFranchiseId: 'fr-oak',
    awayFranchiseId: 'fr-bro',
    homeScore: 78.40,
    awayScore: 92.10,
    status: 'IN_PROGRESS',
    isLive: true,
    scoringPlays: [
      {
        id: 'sp-001',
        playerId: 'plr-jake-ramsey',
        playerName: 'Jake Ramsey',
        franchiseId: 'fr-bro',
        points: 6.40,
        timestamp: '2025-11-16T18:12:00Z',
        description: '38-yard TD pass to Brandon Whitley',
      },
      {
        id: 'sp-002',
        playerId: 'plr-davis-carter',
        playerName: 'Davis Carter',
        franchiseId: 'fr-oak',
        points: 4.80,
        timestamp: '2025-11-16T18:24:00Z',
        description: '12-yard rushing TD',
      },
      {
        id: 'sp-003',
        playerId: 'plr-tyree-patterson',
        playerName: 'Tyree Patterson',
        franchiseId: 'fr-bro',
        points: 8.20,
        timestamp: '2025-11-16T18:41:00Z',
        description: '24-yard rush, into the end zone',
      },
      {
        id: 'sp-004',
        playerId: 'plr-jalen-hampton',
        playerName: 'Jalen Hampton',
        franchiseId: 'fr-oak',
        points: 7.10,
        timestamp: '2025-11-16T19:02:00Z',
        description: '52-yard reception, big gain',
      },
      {
        id: 'sp-005',
        playerId: 'plr-brandon-whitley',
        playerName: 'Brandon Whitley',
        franchiseId: 'fr-bro',
        points: 6.00,
        timestamp: '2025-11-16T19:18:00Z',
        description: '6-yard receiving TD',
      },
      {
        id: 'sp-006',
        playerId: 'plr-deshaun-williams',
        playerName: 'DeShaun Williams',
        franchiseId: 'fr-oak',
        points: 5.40,
        timestamp: '2025-11-16T19:33:00Z',
        description: '18-yard rushing TD',
      },
      {
        id: 'sp-007',
        playerId: 'plr-jordan-becker',
        playerName: 'Jordan Becker',
        franchiseId: 'fr-bro',
        points: 3.50,
        timestamp: '2025-11-16T19:47:00Z',
        description: 'Sack and forced fumble',
      },
    ],
  },
  {
    id: 'mu-2025-w11-prt-mia',
    weekNumber: 11,
    homeFranchiseId: 'fr-mia',
    awayFranchiseId: 'fr-prt',
    homeScore: 118.65,
    awayScore: 102.40,
    status: 'COMPLETED',
    isLive: false,
    scoringPlays: [
      {
        id: 'sp-008',
        playerId: 'plr-trent-vasquez',
        playerName: 'Trent Vasquez',
        franchiseId: 'fr-mia',
        points: 6.80,
        timestamp: '2025-11-16T13:08:00Z',
        description: '42-yard TD pass to Andre Ortiz',
      },
      {
        id: 'sp-009',
        playerId: 'plr-chase-hollander',
        playerName: 'Chase Hollander',
        franchiseId: 'fr-prt',
        points: 5.60,
        timestamp: '2025-11-16T13:22:00Z',
        description: '8-yard TD pass to Kayden Brooks',
      },
      {
        id: 'sp-010',
        playerId: 'plr-cam-bridgewater',
        playerName: 'Cam Bridgewater',
        franchiseId: 'fr-mia',
        points: 7.20,
        timestamp: '2025-11-16T13:51:00Z',
        description: '14-yard rushing TD',
      },
      {
        id: 'sp-011',
        playerId: 'plr-andre-ortiz',
        playerName: 'Andre Ortiz',
        franchiseId: 'fr-mia',
        points: 6.00,
        timestamp: '2025-11-16T14:18:00Z',
        description: '6-yard receiving TD',
      },
      {
        id: 'sp-012',
        playerId: 'plr-kayden-brooks',
        playerName: 'Kayden Brooks',
        franchiseId: 'fr-prt',
        points: 4.80,
        timestamp: '2025-11-16T14:42:00Z',
        description: '32-yard reception',
      },
      {
        id: 'sp-013',
        playerId: 'plr-spencer-lange',
        playerName: 'Spencer Lange',
        franchiseId: 'fr-mia',
        points: 6.50,
        timestamp: '2025-11-16T15:05:00Z',
        description: '11-yard receiving TD',
      },
      {
        id: 'sp-014',
        playerId: 'plr-carlo-espinoza',
        playerName: 'Carlo Espinoza',
        franchiseId: 'fr-mia',
        points: 4.00,
        timestamp: '2025-11-16T15:38:00Z',
        description: '47-yard field goal',
      },
    ],
  },
];

// ─── transactions ────────────────────────────────────────────────────────────

export const transactions: Transaction[] = [
  {
    id: 'tx-001',
    type: 'ADD_DROP',
    timestamp: '2025-11-15T14:32:00Z',
    franchiseId: 'fr-san',
    playerIds: ['plr-marvin-cobb'],
    details: 'Added RB Marvin Cobb (BAL); dropped K Liam Vance (HOU)',
  },
  {
    id: 'tx-002',
    type: 'WAIVER_CLAIM',
    timestamp: '2025-11-13T09:00:00Z',
    franchiseId: 'fr-prt',
    playerIds: ['plr-kayden-brooks'],
    details: 'Waiver claim awarded — WR Kayden Brooks (NYJ), bid $14',
  },
  {
    id: 'tx-003',
    type: 'TRADE_COMPLETED',
    timestamp: '2025-11-10T20:14:00Z',
    franchiseId: 'fr-bro',
    playerIds: ['plr-tyree-patterson', 'plr-jalen-hampton'],
    details:
      'Trade complete — BRO sends 2026 1st-round pick to OAK for RB Tyree Patterson; OAK sends WR Jalen Hampton to BRO',
  },
  {
    id: 'tx-004',
    type: 'IR_MOVE',
    timestamp: '2025-11-09T11:48:00Z',
    franchiseId: 'fr-bro',
    playerIds: ['plr-anton-givens'],
    details: 'DE Anton Givens (DEN) moved to Injured Reserve — torn meniscus',
  },
  {
    id: 'tx-005',
    type: 'ADD_DROP',
    timestamp: '2025-11-07T16:21:00Z',
    franchiseId: 'fr-oak',
    playerIds: ['plr-mason-reilly'],
    details: 'Added K Mason Reilly (BAL) from free agency; no drop required',
  },
];

// ─── derived helpers (pure, no side effects) ─────────────────────────────────

export const getFranchiseById = (id: string): Franchise | undefined =>
  franchises.find((f) => f.id === id);

export const getPlayerById = (id: string): Player | undefined =>
  players.find((p) => p.id === id);

export const getPlayersByFranchise = (franchiseId: string): Player[] =>
  players.filter((p) => p.franchiseId === franchiseId);
