import type { Franchise, FranchiseAbilities } from '../types';
import { LEAGUE_ID } from './league';

// 8 franchises, 2 per division (§4.5). The five themed franchises from the
// original fixture keep their ids + colors so FranchiseMark renders unchanged;
// three new franchises fill the league out to 8. No derived fields (record,
// pointsFor, capUsed) live here — those come from derive.ts.

// §4.5a — every ability flag on; a franchise with all actions available.
const ALL_ABILITIES: FranchiseAbilities = {
  schemaVersion: 1,
  canSubmitLineup: true,
  canPerformAddDrops: true,
  canDropWithoutAdding: true,
  canProposeOrAcceptTrades: true,
  canTradeFutureDraftPicks: true,
  canMakeIrMoves: true,
  canMakeTaxiMoves: true,
  canWriteLeagueArticles: true,
  canPostToMessageBoard: true,
  canPostToLeagueChat: true,
  canCreateLeaguePolls: true,
  canCustomizeFranchise: true,
  canCustomizeHomePage: true,
  canNominateForAuction: true,
};

type Seed = {
  id: string;
  divisionId: string;
  name: string;
  slug: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  ownerUserId: string;
  accessCode: string;
};

// abbreviation isn't a Franchise field (FranchiseMark reads it off the object
// in the view layer), so it's carried here only to derive the access code label
// and kept out of the emitted entity. The mark maps by the `fr-XXX` id suffix.
const SEEDS: Seed[] = [
  { id: 'fr-bro', divisionId: 'dv-east-atlantic', name: 'Bronxville Iron', slug: 'bronxville-iron', abbreviation: 'BRO', primaryColor: '#0f1626', secondaryColor: '#3a3f4a', ownerUserId: 'usr-bro', accessCode: 'IRON-7741' },
  { id: 'fr-cas', divisionId: 'dv-east-atlantic', name: 'Cascade Kingfishers', slug: 'cascade-kingfishers', abbreviation: 'CAS', primaryColor: '#0d5c63', secondaryColor: '#e8b04b', ownerUserId: 'usr-cas', accessCode: 'FISH-3092' },
  { id: 'fr-oak', divisionId: 'dv-east-metro', name: 'Oakdale Timberwolves', slug: 'oakdale-timberwolves', abbreviation: 'OAK', primaryColor: '#1b4332', secondaryColor: '#d4c79a', ownerUserId: 'usr-oak', accessCode: 'WOLF-5518' },
  { id: 'fr-gal', divisionId: 'dv-east-metro', name: 'Galveston Surge', slug: 'galveston-surge', abbreviation: 'GAL', primaryColor: '#b5341f', secondaryColor: '#f0d27a', ownerUserId: 'usr-gal', accessCode: 'SURG-2266' },
  { id: 'fr-mia', divisionId: 'dv-west-pacific', name: 'Miami Tempo', slug: 'miami-tempo', abbreviation: 'MIA', primaryColor: '#e0266f', secondaryColor: '#ff8a2d', ownerUserId: 'usr-mia', accessCode: 'TMPO-9043' },
  { id: 'fr-aur', divisionId: 'dv-west-pacific', name: 'Aurora Voltage', slug: 'aurora-voltage', abbreviation: 'AUR', primaryColor: '#2d2a6e', secondaryColor: '#5ce0c6', ownerUserId: 'usr-aur', accessCode: 'VOLT-6610' },
  { id: 'fr-san', divisionId: 'dv-west-summit', name: 'Santa Fe Dust', slug: 'santa-fe-dust', abbreviation: 'SAN', primaryColor: '#efe7cf', secondaryColor: '#d9b86b', ownerUserId: 'usr-san', accessCode: 'DUST-4187' },
  { id: 'fr-prt', divisionId: 'dv-west-summit', name: 'Portland Rainwater', slug: 'portland-rainwater', abbreviation: 'PRT', primaryColor: '#4c2a6e', secondaryColor: '#2ba59a', ownerUserId: 'usr-prt', accessCode: 'RAIN-8829' },
];

export const franchises: Franchise[] = SEEDS.map((s, i) => ({
  id: s.id,
  leagueId: LEAGUE_ID,
  divisionId: s.divisionId,
  name: s.name,
  slug: s.slug,
  logoUrl: null,
  primaryColor: s.primaryColor,
  secondaryColor: s.secondaryColor,
  primaryOwnerUserId: s.ownerUserId,
  accessCode: s.accessCode,
  abilities: ALL_ABILITIES,
  status: 'ACTIVE',
  lastSeenAt: `2025-11-1${i}T12:00:00Z`,
  amnestyDropsRemaining: 0,
}));

// abbreviation lookup kept aside for the view layer (FranchiseMark + masthead
// read it; it is not a stored Franchise field per §4.5).
export const franchiseAbbreviations: Record<string, string> = Object.fromEntries(
  SEEDS.map((s) => [s.id, s.abbreviation]),
);

// Ordered franchise ids — the generators and schedule index franchises by this
// stable order.
export const FRANCHISE_IDS = SEEDS.map((s) => s.id);
