import type { FranchiseOwner, LeagueRole, User } from '../types';
import { COMMISSIONER_USER_ID, LEAGUE_ID } from './league';

// Identity & access (§4.1 / §4.6 / §4.7): one primary owner per franchise plus
// a separate commissioner = 9 users. FranchiseOwner is the join (one current,
// isPrimary). LeagueRole carries commissioner + co-commissioner + moderator.

type OwnerSeed = { userId: string; displayName: string; franchiseId: string };

// Owner display names keep the five original owners; three new owners fill out
// the league.
const OWNER_SEEDS: OwnerSeed[] = [
  { userId: 'usr-bro', displayName: 'D. Kovac', franchiseId: 'fr-bro' },
  { userId: 'usr-cas', displayName: 'R. Halvorsen', franchiseId: 'fr-cas' },
  { userId: 'usr-oak', displayName: 'M. Torres', franchiseId: 'fr-oak' },
  { userId: 'usr-gal', displayName: 'P. Okafor', franchiseId: 'fr-gal' },
  { userId: 'usr-mia', displayName: 'J. Whitaker', franchiseId: 'fr-mia' },
  { userId: 'usr-aur', displayName: 'L. Nakamura', franchiseId: 'fr-aur' },
  { userId: 'usr-san', displayName: 'A. Brennan', franchiseId: 'fr-san' },
  { userId: 'usr-prt', displayName: 'K. Oshiro', franchiseId: 'fr-prt' },
];

function emailFor(displayName: string): string {
  return (
    displayName.toLowerCase().replace(/[^a-z]/g, '.').replace(/\.+/g, '.') +
    '@xoplay.test'
  );
}

export const users: User[] = [
  ...OWNER_SEEDS.map((s) => ({
    id: s.userId,
    email: emailFor(s.displayName),
    displayName: s.displayName,
    phoneNumber: null,
    timezone: 'America/Chicago',
    avatarUrl: null,
    emailVerifiedAt: '2025-08-01T00:00:00Z',
    phoneVerifiedAt: null,
    lastLoginAt: '2025-11-16T08:30:00Z',
  })),
  {
    id: COMMISSIONER_USER_ID,
    email: 'commish@xoplay.test',
    displayName: 'T. Delacroix',
    phoneNumber: null,
    timezone: 'America/Chicago',
    avatarUrl: null,
    emailVerifiedAt: '2025-07-15T00:00:00Z',
    phoneVerifiedAt: null,
    lastLoginAt: '2025-11-16T09:05:00Z',
  },
];

export const franchiseOwners: FranchiseOwner[] = OWNER_SEEDS.map((s, i) => ({
  id: `fo-${i + 1}`,
  userId: s.userId,
  franchiseId: s.franchiseId,
  joinedAt: '2025-08-01T00:00:00Z',
  leftAt: null,
  isPrimary: true,
}));

// One commissioner + one co-commissioner (an owner) + one moderator (an owner).
export const leagueRoles: LeagueRole[] = [
  {
    id: 'role-1',
    userId: COMMISSIONER_USER_ID,
    leagueId: LEAGUE_ID,
    role: 'COMMISSIONER',
    grantedByUserId: null,
    grantedAt: '2025-07-15T00:00:00Z',
    revokedAt: null,
  },
  {
    id: 'role-2',
    userId: 'usr-bro',
    leagueId: LEAGUE_ID,
    role: 'CO_COMMISSIONER',
    grantedByUserId: COMMISSIONER_USER_ID,
    grantedAt: '2025-07-20T00:00:00Z',
    revokedAt: null,
  },
  {
    id: 'role-3',
    userId: 'usr-mia',
    leagueId: LEAGUE_ID,
    role: 'MODERATOR',
    grantedByUserId: COMMISSIONER_USER_ID,
    grantedAt: '2025-07-20T00:00:00Z',
    revokedAt: null,
  },
];
