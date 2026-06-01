import type { LineupEntry, LineupSlot } from '../types';
import { makeRng, round2 } from '../rng';
import { LEAGUE_ID } from './league';
import { rosterAssignments, type RosterAssignment } from './players';
import { matchups } from './matchups';

// Generated lineups (§4.19) for the current week and one prior (weeks 10–11).
// Per matchup × franchise-side × rostered player: ACTIVE players start in their
// position slot; IR/TAXI players sit in IR/TAXI slots. fantasyPoints is the
// resulting score the entity stores (seeded here; the scoring engine writes it
// for real later). Not consumed by the three Batch-5 screens yet — present so
// the entity exists with complete fields for the upcoming lineup work.

const LINEUP_WEEKS = [10, 11];

// franchiseId → its rostered players, in template order.
const byFranchise = new Map<string, RosterAssignment[]>();
for (const a of rosterAssignments) {
  const list = byFranchise.get(a.franchiseId) ?? [];
  list.push(a);
  byFranchise.set(a.franchiseId, list);
}

function slotFor(a: RosterAssignment): { slot: LineupSlot; starter: boolean } {
  if (a.bucket === 'INJURED_RESERVE') return { slot: 'IR', starter: false };
  if (a.bucket === 'TAXI_SQUAD') return { slot: 'TAXI', starter: false };
  return { slot: a.position, starter: true };
}

const all: LineupEntry[] = [];

for (const matchup of matchups) {
  if (!LINEUP_WEEKS.includes(matchup.week)) continue;
  const inProgress = matchup.status === 'IN_PROGRESS';
  const sides = [matchup.homeFranchiseId, matchup.awayFranchiseId].filter(
    (id): id is string => id != null,
  );

  for (const franchiseId of sides) {
    const roster = byFranchise.get(franchiseId) ?? [];
    roster.forEach((a, idx) => {
      const { slot, starter } = slotFor(a);
      const rng = makeRng(40000 + matchup.week * 101 + idx + franchiseId.length);
      // Bench/IR/taxi don't accrue starter points; starters get a seeded line,
      // halved while the week is still in progress.
      const base = starter ? round2(2 + rng() * 26) : null;
      const fantasyPoints =
        base == null ? null : inProgress ? round2(base * 0.6) : base;

      all.push({
        id: `le-${matchup.id.slice(3)}-${a.playerId.slice(4)}`,
        leagueId: LEAGUE_ID,
        matchupId: matchup.id,
        franchiseId,
        playerId: a.playerId,
        slotPosition: slot,
        isStarter: starter,
        fantasyPoints,
        lockedAt: inProgress ? null : '2025-11-09T18:00:00Z',
        submittedAt: inProgress
          ? '2025-11-16T11:30:00Z'
          : '2025-11-09T11:30:00Z',
      });
    });
  }
}

export const lineupEntries: LineupEntry[] = all;
