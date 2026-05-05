// Sample franchises covering the edge cases described in Spec_DesignSystem.md
// §8 — safe/classic, bold/clashing, near-black, near-white, and unexpected
// pairings. These exist to exercise the franchise theming + safeBlock paths;
// real franchise records come from the data model (Franchise.primaryColor /
// Franchise.secondaryColor) at runtime.

export type Franchise = {
  id: string;
  name: string;
  slug: string;
  abbr: string;
  primary: string;
  secondary: string;
  owner: string;
  record: string;
};

export const sampleFranchises: readonly Franchise[] = [
  {
    id: 'oak',
    name: 'Oakdale Timberwolves',
    slug: 'OAK',
    abbr: 'OAK',
    primary: '#1b4332',
    secondary: '#d4c79a',
    owner: 'M. Torres',
    record: '7-3',
  },
  {
    id: 'mia',
    name: 'Miami Tempo',
    slug: 'MIA',
    abbr: 'MIA',
    primary: '#e0266f',
    secondary: '#ff8a2d',
    owner: 'J. Whitaker',
    record: '6-4',
  },
  {
    id: 'bro',
    name: 'Bronxville Iron',
    slug: 'BRO',
    abbr: 'BRO',
    primary: '#0f1626',
    secondary: '#3a3f4a',
    owner: 'D. Kovac',
    record: '8-2',
  },
  {
    id: 'san',
    name: 'Santa Fe Dust',
    slug: 'SAN',
    abbr: 'SAN',
    primary: '#efe7cf',
    secondary: '#d9b86b',
    owner: 'A. Brennan',
    record: '5-5',
  },
  {
    id: 'prt',
    name: 'Portland Rainwater',
    slug: 'PRT',
    abbr: 'PRT',
    primary: '#4c2a6e',
    secondary: '#2ba59a',
    owner: 'K. Oshiro',
    record: '4-6',
  },
] as const;
