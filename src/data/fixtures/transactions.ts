import type { Transaction } from '../types';
import { LEAGUE_ID, SEASON_YEAR } from './league';

// A small append-only transaction set across subtypes (§4.18). Common fields +
// a subtype `payload`; player/contract references use real generated ids. This
// keeps FranchiseHome's activity feed populated (the feed filters on
// initiatedByFranchiseId) and seeds the transactions area. Human-readable
// descriptions are derived from type + payload in derive.ts, not stored.

const owner: Record<string, string> = {
  'fr-bro': 'usr-bro', 'fr-oak': 'usr-oak', 'fr-mia': 'usr-mia',
  'fr-san': 'usr-san', 'fr-prt': 'usr-prt', 'fr-cas': 'usr-cas',
  'fr-gal': 'usr-gal', 'fr-aur': 'usr-aur',
};

type Seed = {
  id: string;
  type: Transaction['type'];
  franchiseId: string;
  week: number | null;
  occurredAt: string;
  payload: Transaction['payload'];
};

const SEEDS: Seed[] = [
  { id: 'tx-001', type: 'ADD_DROP', franchiseId: 'fr-san', week: 11, occurredAt: '2025-11-15T14:32:00Z',
    payload: { playerAddedId: 'plr-fa-02', playerDroppedId: 'plr-san-11', contractCreated: true } },
  { id: 'tx-002', type: 'WAIVER_CLAIM', franchiseId: 'fr-prt', week: 11, occurredAt: '2025-11-13T09:00:00Z',
    payload: { claimId: 'wc-014', playerAddedId: 'plr-fa-07', bidAmount: 14, successful: true } },
  { id: 'tx-003', type: 'TRADE_COMPLETED', franchiseId: 'fr-bro', week: 10, occurredAt: '2025-11-10T20:14:00Z',
    payload: { tradeId: 'trd-006', proposerAssets: ['plr-bro-05'], receiverAssets: ['plr-oak-03'] } },
  { id: 'tx-004', type: 'IR_MOVE', franchiseId: 'fr-bro', week: 10, occurredAt: '2025-11-09T11:48:00Z',
    payload: { playerId: 'plr-bro-13', direction: 'IN' } },
  { id: 'tx-005', type: 'ADD_DROP', franchiseId: 'fr-oak', week: 9, occurredAt: '2025-11-07T16:21:00Z',
    payload: { playerAddedId: 'plr-fa-11', contractCreated: true } },
  { id: 'tx-006', type: 'TAXI_MOVE', franchiseId: 'fr-mia', week: 9, occurredAt: '2025-11-06T10:05:00Z',
    payload: { playerId: 'plr-mia-15', direction: 'PROMOTE' } },
  { id: 'tx-007', type: 'WAIVER_CLAIM', franchiseId: 'fr-bro', week: 9, occurredAt: '2025-11-05T09:00:00Z',
    payload: { claimId: 'wc-009', playerAddedId: 'plr-fa-18', playerDroppedId: 'plr-bro-11', bidAmount: 6, successful: true } },
  { id: 'tx-008', type: 'IR_MOVE', franchiseId: 'fr-prt', week: 8, occurredAt: '2025-11-02T13:20:00Z',
    payload: { playerId: 'plr-prt-05', direction: 'OUT' } },
  { id: 'tx-009', type: 'ADD_DROP', franchiseId: 'fr-cas', week: 8, occurredAt: '2025-11-01T17:44:00Z',
    payload: { playerAddedId: 'plr-fa-04', playerDroppedId: 'plr-cas-08', contractCreated: true } },
  { id: 'tx-010', type: 'TAXI_MOVE', franchiseId: 'fr-gal', week: 7, occurredAt: '2025-10-26T12:10:00Z',
    payload: { playerId: 'plr-gal-16', direction: 'DEMOTE' } },
  { id: 'tx-011', type: 'TRADE_COMPLETED', franchiseId: 'fr-aur', week: 7, occurredAt: '2025-10-24T19:02:00Z',
    payload: { tradeId: 'trd-004', proposerAssets: ['plr-aur-06'], receiverAssets: ['plr-san-04'] } },
  { id: 'tx-012', type: 'ADD_DROP', franchiseId: 'fr-bro', week: 6, occurredAt: '2025-10-19T15:30:00Z',
    payload: { playerAddedId: 'plr-fa-09', contractCreated: true } },
];

export const transactions: Transaction[] = SEEDS.map((s) => ({
  id: s.id,
  leagueId: LEAGUE_ID,
  type: s.type,
  seasonYear: SEASON_YEAR,
  week: s.week,
  initiatedByUserId: owner[s.franchiseId] ?? null,
  initiatedByFranchiseId: s.franchiseId,
  occurredAt: s.occurredAt,
  reversalOfTransactionId: null,
  payload: s.payload,
  effects: {},
}));
