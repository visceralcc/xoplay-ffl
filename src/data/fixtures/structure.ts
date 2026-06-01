import type { Conference, Division } from '../types';
import { LEAGUE_ID } from './league';

// League structure: 2 conferences, 2 divisions each (§4.3 / §4.4). Franchises
// (franchises.ts) attach to these via divisionId; standings division/conference
// records resolve through this hierarchy.

export const conferences: Conference[] = [
  { id: 'cf-east', leagueId: LEAGUE_ID, name: 'Eastern Conference', abbreviation: 'EAST', displayOrder: 0 },
  { id: 'cf-west', leagueId: LEAGUE_ID, name: 'Western Conference', abbreviation: 'WEST', displayOrder: 1 },
];

export const divisions: Division[] = [
  { id: 'dv-east-atlantic', leagueId: LEAGUE_ID, conferenceId: 'cf-east', name: 'Atlantic', displayOrder: 0 },
  { id: 'dv-east-metro', leagueId: LEAGUE_ID, conferenceId: 'cf-east', name: 'Metro', displayOrder: 1 },
  { id: 'dv-west-pacific', leagueId: LEAGUE_ID, conferenceId: 'cf-west', name: 'Pacific', displayOrder: 2 },
  { id: 'dv-west-summit', leagueId: LEAGUE_ID, conferenceId: 'cf-west', name: 'Summit', displayOrder: 3 },
];
