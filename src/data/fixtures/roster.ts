import type { RosterEntry } from '../types';
import { league } from './league';
import { contractIdFor, rosterAssignments } from './players';

// One RosterEntry per rostered player (§4.17), linking player → franchise →
// contract with the current bucket. Bucket matches the contract's denormalized
// currentRosterBucket (§6.2). A player on no RosterEntry is a free agent.

export const rosterEntries: RosterEntry[] = rosterAssignments.map((a, i) => ({
  id: `rost-${String(i + 1).padStart(3, '0')}`,
  leagueId: league.id,
  franchiseId: a.franchiseId,
  playerId: a.playerId,
  contractId: contractIdFor(a.playerId),
  bucket: a.bucket,
  enteredBucketAt: '2025-09-02T00:00:00Z',
}));
