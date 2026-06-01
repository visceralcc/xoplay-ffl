// Normalized fixture types — mirror Spec_DataModel.md §4 (entities) and §5
// (enums). One TypeScript type per entity in the foundation batch
// (Spec_MockFixture.md). No derived values live on base entities; computed
// shapes (records, cap, standings, roster rows) are the *view-model* types at
// the bottom, produced by derive.ts.
//
// Field names and enum values match the Data Model exactly so the eventual
// Supabase swap is mechanical. IDs are stable strings; foreign keys are
// `<entity>Id` per §2.3.

// ─── enums (§5) ──────────────────────────────────────────────────────────────

export type Tier = 'REDRAFT' | 'KEEPER' | 'DYNASTY';
export type Sport = 'NFL';
export type LeagueStatus =
  | 'SETUP' | 'ACTIVE' | 'POSTSEASON' | 'OFFSEASON' | 'ARCHIVED';
export type FranchiseStatus = 'ACTIVE' | 'INACTIVE' | 'ORPHANED';

// §5.5 Player Position
export type Position =
  | 'QB' | 'RB' | 'WR' | 'TE' | 'PK'
  | 'DT' | 'DE' | 'LB' | 'CB' | 'S';

// §5.6 Injury Status
export type InjuryStatus =
  | 'HEALTHY' | 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT'
  | 'IR' | 'SUSPENDED' | 'HOLDOUT' | 'COVID';

// §5.9 Roster Bucket
export type RosterBucket = 'ACTIVE' | 'INJURED_RESERVE' | 'TAXI_SQUAD';

// §5.10 Contract Status
export type ContractStatus =
  | 'ACTIVE' | 'FRANCHISE_TAGGED' | 'EXTENDED' | 'EXPIRED';

// §5.11 Contract Acquired Via
export type AcquiredVia =
  | 'DRAFT' | 'AUCTION' | 'WAIVER' | 'FCFS' | 'TRADE' | 'COMMISSIONER';

// §5.47 Matchup Status
export type MatchupStatus =
  | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'VOIDED';

// §5.53 LeagueRole
export type LeagueRoleType = 'COMMISSIONER' | 'CO_COMMISSIONER' | 'MODERATOR';

// §5.55 Transaction Type
export type TransactionType =
  | 'ADD_DROP' | 'WAIVER_CLAIM' | 'TRADE_COMPLETED' | 'TRADE_REVERSAL'
  | 'IR_MOVE' | 'TAXI_MOVE' | 'AUCTION_AWARD' | 'DRAFT_PICK_MADE'
  | 'SALARY_ADJUSTMENT' | 'ROLLOVER' | 'SCORE_ADJUSTMENT' | 'LINEUP_SET'
  | 'COMMISSIONER_ACTION';

// §5.50 Stat Type — the position-relevant subset this fixture populates. The
// full enum is large; these are the keys our generated Stats use and the
// scoring rules reference.
export type StatType =
  | 'PASSING_TDS' | 'PASSING_YARDS' | 'PASSING_INTS'
  | 'RUSHING_TDS' | 'RUSHING_YARDS'
  | 'RECEIVING_TDS' | 'RECEIVING_YARDS' | 'RECEPTIONS'
  | 'FUMBLES_LOST'
  | 'FG_MADE' | 'FG_MISSED' | 'XP_MADE'
  | 'DEF_TACKLES_SOLO' | 'DEF_SACKS' | 'DEF_INTERCEPTIONS'
  | 'DEF_FORCED_FUMBLES' | 'DEF_PASSES_DEFENDED';

export type Season_Status = 'SETUP' | 'ACTIVE' | 'POSTSEASON' | 'COMPLETED';

// §5.24 Standings Tiebreaker Names (the subset used in the chain)
export type StandingsTiebreaker =
  | 'OVERALL_WIN_PCT' | 'TOTAL_POINTS_SCORED' | 'DIVISION_WIN_PCT'
  | 'HEAD_TO_HEAD' | 'CONFERENCE_WIN_PCT' | 'COIN_FLIP';

// ─── JSON field shapes ───────────────────────────────────────────────────────

export type PositionLimit = { min: number; max: number };

export type StartingLineupConfig = {
  schemaVersion: number;
  positions: Partial<Record<Position, PositionLimit>>;
};

// §4.5a — franchise abilities flag set (all default true).
export type FranchiseAbilities = {
  schemaVersion: number;
  canSubmitLineup: boolean;
  canPerformAddDrops: boolean;
  canDropWithoutAdding: boolean;
  canProposeOrAcceptTrades: boolean;
  canTradeFutureDraftPicks: boolean;
  canMakeIrMoves: boolean;
  canMakeTaxiMoves: boolean;
  canWriteLeagueArticles: boolean;
  canPostToMessageBoard: boolean;
  canPostToLeagueChat: boolean;
  canCreateLeaguePolls: boolean;
  canCustomizeFranchise: boolean;
  canCustomizeHomePage: boolean;
  canNominateForAuction: boolean;
};

// §4.18 — per-subtype payloads (only the subtypes this batch seeds are typed
// precisely; the rest fall back to a generic record).
export type TransactionPayload =
  | { playerAddedId: string; playerDroppedId?: string; contractCreated?: boolean; dropPenaltyApplied?: boolean }
  | { claimId: string; playerAddedId: string; playerDroppedId?: string; bidAmount?: number; successful: boolean }
  | { tradeId: string; proposerAssets: string[]; receiverAssets: string[] }
  | { playerId: string; direction: 'IN' | 'OUT' }
  | { playerId: string; direction: 'PROMOTE' | 'DEMOTE' }
  | { playerId: string; bidAmount: number; contractYears: number; contractId: string }
  | Record<string, unknown>;

// ─── entities (§4) ───────────────────────────────────────────────────────────

// §4.2 — only the config fields this batch reads or documents are typed; the
// League object in fixtures carries the full default set.
export type League = {
  id: string;
  slug: string;
  name: string;
  tier: Tier;
  sport: Sport;
  seasonYear: number;
  status: LeagueStatus;
  timezone: string;
  commissionerUserId: string;
  scoringDecimalPlaces: number;
  // structure
  franchiseCount: number;
  conferenceCount: number;
  divisionCount: number;
  playerPoolIsolation: 'SHARED_LEAGUE' | 'ISOLATED_PER_CONFERENCE';
  scheduleMode: 'HEAD_TO_HEAD' | 'ALL_PLAY' | 'TOTAL_POINTS_ONLY';
  initialRosterMode:
    | 'DRAFT' | 'AUCTION' | 'DRAFT_AND_AUCTION'
    | 'THIRD_PARTY_DRAFT' | 'MANUAL_LOAD';
  // roster structure
  rosterSpots: number;
  irSpots: number;
  taxiSquadSpots: number;
  totalStarters: number;
  startingLineup: StartingLineupConfig;
  rosterPositionLimits: StartingLineupConfig | Record<string, never>;
  allowPartialLineups: boolean;
  allowByeWeekStarters: boolean;
  lineupLockMode: 'LOCK_AT_KICKOFF' | 'LOCK_AT_FIRST_KICKOFF';
  // salary cap & contracts
  trackSalaries: boolean;
  trackContracts: boolean;
  salaryCapAmount: number;
  salaryCapType: 'HARD' | 'SOFT';
  salaryCapEscalatorPercent: number;
  minimumPlayerSalary: number;
  salaryIncrement: number;
  startingLineupSalaryCap: number | null;
  blockLineupWhenOverCap: boolean;
  irSalaryPercent: number;
  taxiSalaryPercent: number;
  playerSalaryEscalatorPercent: number;
  salaryDisplayFormat:
    | 'DOLLARS_ONLY' | 'WITH_CENTS' | 'WITH_COMMAS' | 'MILLIONS_ABBR';
  // scoring & tiebreakers
  tieHandling:
    | 'ALLOW_TIES' | 'MANUAL_BREAK' | 'COIN_FLIP'
    | 'MOST_BENCH_POINTS' | 'HIGHEST_STARTER';
  standingsTiebreakerChain: StandingsTiebreaker[];
};

export type Conference = {
  id: string;
  leagueId: string;
  name: string;
  abbreviation: string | null;
  displayOrder: number;
};

export type Division = {
  id: string;
  leagueId: string;
  conferenceId: string | null;
  name: string;
  displayOrder: number;
};

export type Franchise = {
  id: string;
  leagueId: string;
  divisionId: string | null;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  primaryOwnerUserId: string | null;
  accessCode: string;
  abilities: FranchiseAbilities;
  status: FranchiseStatus;
  lastSeenAt: string | null;
  amnestyDropsRemaining: number;
};

export type User = {
  id: string;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  timezone: string;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  lastLoginAt: string | null;
};

export type FranchiseOwner = {
  id: string;
  userId: string;
  franchiseId: string;
  joinedAt: string;
  leftAt: string | null;
  isPrimary: boolean;
};

export type LeagueRole = {
  id: string;
  userId: string;
  leagueId: string;
  role: LeagueRoleType;
  grantedByUserId: string | null;
  grantedAt: string;
  revokedAt: string | null;
};

export type Player = {
  id: string;
  statsServicePlayerId: string | null;
  externalId: string | null;
  isCustom: boolean;
  firstName: string;
  lastName: string;
  fullName: string;
  nflTeam: string;
  position: Position;
  rookieYear: number | null;
  dateOfBirth: string | null;
  heightInches: number | null;
  weightLbs: number | null;
  collegeName: string | null;
  injuryStatus: InjuryStatus;
  isActive: boolean;
  lastSyncedAt: string;
};

export type Contract = {
  id: string;
  leagueId: string;
  franchiseId: string;
  playerId: string;
  baseSalary: number;
  contractYearsTotal: number;
  contractYearsRemaining: number;
  acquiredVia: AcquiredVia;
  acquiredAt: string;
  acquiredSeason: number;
  status: ContractStatus;
  salaryEscalatorPercent: number;
  otherContractInfo: string | null;
  contractStatusLabel: string | null;
  currentRosterBucket: RosterBucket; // denormalized from RosterEntry (§2.6)
  franchiseTagRenewalYear: number | null;
};

export type RosterEntry = {
  id: string;
  leagueId: string;
  franchiseId: string;
  playerId: string;
  contractId: string | null;
  bucket: RosterBucket;
  enteredBucketAt: string;
};

export type Stats = {
  id: string;
  playerId: string;
  seasonYear: number;
  week: number;
  statValues: Partial<Record<StatType, number>>;
  sourceVersion: number;
  isReconciled: boolean;
  lastCorrectionAt: string | null;
};

export type ScoringRule = {
  id: string;
  leagueId: string;
  statType: StatType;
  positionScope: Position[];
  rangeLow: number;
  rangeHigh: number;
  pointsPerUnit: number | null;
  perUnit: number;
  flatPoints: number | null;
  displayOrder: number;
};

export type Matchup = {
  id: string;
  leagueId: string;
  seasonYear: number;
  week: number;
  homeFranchiseId: string;
  awayFranchiseId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  isPlayoff: boolean;
  playoffBracketId: string | null;
  playoffRound: number | null;
  status: MatchupStatus;
  winnerFranchiseId: string | null;
};

// slotPosition extends Position with the non-starting buckets (§4.19)
export type LineupSlot = Position | 'FLEX' | 'BENCH' | 'IR' | 'TAXI';

export type LineupEntry = {
  id: string;
  leagueId: string;
  matchupId: string;
  franchiseId: string;
  playerId: string;
  slotPosition: LineupSlot;
  isStarter: boolean;
  fantasyPoints: number | null;
  lockedAt: string | null;
  submittedAt: string;
};

export type Season = {
  id: string;
  leagueId: string;
  seasonYear: number;
  salaryCapAmount: number | null;
  entryFeeAmount: number | null;
  championFranchiseId: string | null;
  runnerUpFranchiseId: string | null;
  regularSeasonPointsLeaderId: string | null;
  status: Season_Status;
  startedAt: string | null;
  completedAt: string | null;
};

export type Transaction = {
  id: string;
  leagueId: string;
  type: TransactionType;
  seasonYear: number;
  week: number | null;
  initiatedByUserId: string | null;
  initiatedByFranchiseId: string | null;
  occurredAt: string;
  reversalOfTransactionId: string | null;
  payload: TransactionPayload;
  effects: Record<string, unknown>;
};

// ─── view models (produced by derive.ts; not stored) ─────────────────────────

// A joined roster row the way a DB query returns it: player identity + its
// contract terms + bucket + computed points. This is what PlayerRow consumes
// after the rewire (Spec_MockFixture "Components read view models").
export type RosterRow = {
  player: Player;
  contract: Contract | null;
  bucket: RosterBucket;
  injuryStatus: InjuryStatus;
  // computed from Stats × ScoringRule
  seasonPoints: number;
  lastWeekPoints: number;
};

export type WLT = { wins: number; losses: number; ties: number };

// Display-ready franchise identity (abbreviation joined, colors non-null) for
// FranchiseMark / FranchiseHeader / MatchupCard inputs.
export type FranchiseIdentity = {
  id: string;
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
};

// One computed standings row (replaces the old hand-typed StandingsEntry).
export type StandingsRow = {
  rank: number;
  franchiseId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  divisionRecord: WLT;
  conferenceRecord: WLT;
  streak: string;
  victoryPoints: number;
};

export type CapUsage = {
  capUsed: number;
  effectiveCap: number;
  capRoom: number;
};
