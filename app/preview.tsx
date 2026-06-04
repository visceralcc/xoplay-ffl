import { useMemo, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { gray, radius, spacing, type as typo } from '@/theme';
import { Label } from '@/components/Label';
import { Mono } from '@/components/Mono';
import { PositionBadge } from '@/components/PositionBadge';
import { InjuryIndicator } from '@/components/InjuryIndicator';
import { Headshot } from '@/components/Headshot';
import { FranchiseHeader } from '@/components/FranchiseHeader';
import { FranchiseMark } from '@/components/FranchiseMark';
import { LiveDot } from '@/components/LiveDot';
import { MatchupCard } from '@/components/MatchupCard';
import { ScoreDisplay } from '@/components/ScoreDisplay';
import { ScoreNum } from '@/components/ScoreNum';
import { StatValue } from '@/components/StatValue';
import { SegmentControl } from '@/components/SegmentControl';
import { PlayerRow, type PlayerRowColumnKey } from '@/components/PlayerRow';
import { DataTable, type DataTableColumn, type Density } from '@/components/DataTable';
import { Card } from '@/components/Card';
import { CapMeter } from '@/components/CapMeter';
import { Section } from '@/components/Section';
import { Stack } from '@/components/Stack';
import { PageShell } from '@/components/PageShell';
import { TransactionRow } from '@/components/TransactionRow';
import { RosterView } from '@/screens/RosterView';
import { FranchiseHome } from '@/screens/FranchiseHome';
import { Standings } from '@/screens/Standings';
import { LeagueHome } from '@/screens/LeagueHome';
import {
  franchises,
  franchiseAbbreviations,
  transactions,
  computeCapUsage,
  computePointsAgainst,
  computePointsFor,
  computeRecord,
  computeStandings,
  describeTransaction,
  effectiveCap,
  formatRecord,
  getOwnerName,
  getRosterByFranchise,
  LEAGUE_ID,
  type RosterRow,
  type TransactionType,
} from '@/data';
import type { InjuryStatus } from '@/theme';

// ─── preview data adapters ───────────────────────────────────────────────────
// The component demos were written against the old flat mock (franchise rows
// carrying record/pointsFor/capUsed and an abbreviation). The normalized
// fixture computes those, so we project a display-shaped franchise array once
// and the demos read it the same way they used to. Roster/standings demos use
// the derive helpers directly.

type DisplayFranchise = {
  id: string;
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  ownerName: string;
  record: string;
  pointsFor: number;
  pointsAgainst: number;
  capTotal: number;
};

const DISPLAY_FRANCHISES: DisplayFranchise[] = franchises.map((f) => ({
  id: f.id,
  name: f.name,
  abbreviation: franchiseAbbreviations[f.id] ?? f.id.replace(/^fr-/, '').toUpperCase(),
  primaryColor: f.primaryColor ?? gray[800],
  secondaryColor: f.secondaryColor ?? gray[400],
  ownerName: getOwnerName(f.id),
  record: formatRecord(computeRecord(f.id)),
  pointsFor: computePointsFor(f.id),
  pointsAgainst: computePointsAgainst(f.id),
  capTotal: effectiveCap(f.id),
}));

const displayFranchiseById = (id: string): DisplayFranchise | undefined =>
  DISPLAY_FRANCHISES.find((f) => f.id === id);

// Component preview system — see ~/.claude/skills/component-preview/SKILL.md.
// Web-only design tool. Routes inherit fonts loaded by app/_layout.tsx, so
// type tokens render with the real Barlow / Barlow Condensed / JetBrains Mono.

// ─── registry types ──────────────────────────────────────────────────────────

type StepperControl = {
  key: string;
  type: 'stepper';
  min: number;
  max: number;
  step: number;
};
type ToggleControl = { key: string; type: 'toggle' };
type SelectControl = { key: string; type: 'select'; options: string[] };
type PropControl = StepperControl | ToggleControl | SelectControl;

type FrameMode = 'phone' | 'naked';

type ComponentEntry = {
  id: string;
  label: string;
  category: string;
  backgroundColor: string;
  frameMode: FrameMode;
  /** Required for naked mode; ignored for phone mode (uses 390 fixed). */
  componentWidth?: number;
  componentHeight?: number;
  defaultProps: Record<string, unknown>;
  propControls?: PropControl[];
  render: (props: Record<string, unknown>) => ReactNode;
};

// ─── registry ────────────────────────────────────────────────────────────────

// Color options surfaced to the select control. Keys are the labels the user
// sees in the sidebar; values resolve to actual theme hex when passed into
// the component. Keeping the list short keeps the canvas legible against the
// default light canvas background.
const COLOR_OPTIONS: Record<string, string> = {
  'gray-300': gray[300],
  'gray-500': gray[500],
  'gray-700': gray[700],
  'gray-900': gray[900],
};
const COLOR_KEYS = Object.keys(COLOR_OPTIONS);

// Demo wrapper for SegmentControl — the component is controlled, but in the
// preview the consumer is the registry render closure, which doesn't have a
// place to hold state. Wrapping in a small local component gives us that
// state slot so tapping a segment actually flips the active visual.
function SegmentControlDemo({ segments }: { segments: string[] }) {
  const [active, setActive] = useState(0);
  return (
    <SegmentControl
      segments={segments}
      activeIndex={Math.min(active, segments.length - 1)}
      onChangeIndex={setActive}
    />
  );
}

// Shared column array — DataTable uses it for headers + sort metadata,
// PlayerRow uses it for cell layout/widths. Keys are typed as
// PlayerRowColumnKey so the same array satisfies PlayerRow's tighter
// ColumnDef while still being a valid DataTableColumn[] (PlayerRowColumnKey
// extends string).
const ROSTER_COLUMNS: Array<{
  key: PlayerRowColumnKey;
  label: string;
  width?: number;
  align?: 'left' | 'right';
  sortable?: boolean;
}> = [
  { key: 'position', label: 'POS', width: 40, sortable: true },
  { key: 'headshot', label: '', width: 32 },
  { key: 'nameTeam', label: 'Player', sortable: true },
  { key: 'injury', label: '', width: 16 },
  { key: 'salary', label: 'Salary', width: 60, align: 'right', sortable: true },
  { key: 'contractYears', label: 'Yrs', width: 36, align: 'right' },
  { key: 'weekScore', label: 'Wk', width: 50, align: 'right' },
  { key: 'seasonTotal', label: 'Total', width: 64, align: 'right', sortable: true },
];

function sortRows(
  arr: RosterRow[],
  key: string,
  dir: 'asc' | 'desc',
): RosterRow[] {
  const copy = [...arr];
  copy.sort((a, b) => {
    let cmp = 0;
    if (key === 'nameTeam') cmp = a.player.lastName.localeCompare(b.player.lastName);
    else if (key === 'position') cmp = a.player.position.localeCompare(b.player.position);
    else if (key === 'salary') cmp = (a.contract?.baseSalary ?? 0) - (b.contract?.baseSalary ?? 0);
    else if (key === 'seasonTotal') cmp = a.seasonPoints - b.seasonPoints;
    return dir === 'asc' ? cmp : -cmp;
  });
  return copy;
}

// Layout previews need small visual "blocks" to demonstrate spacing/wrap
// behavior without depending on real content. Color-coded so each child is
// distinguishable in the canvas.
function LayoutBlock({
  width = 60,
  height = 32,
  color,
  label,
}: {
  width?: number;
  height?: number;
  color: string;
  label?: string;
}) {
  return (
    <View style={[styles.layoutBlock, { width, height, backgroundColor: color }]}>
      {label ? <Text style={styles.layoutBlockLabel}>{label}</Text> : null}
    </View>
  );
}

function DataTableDemo() {
  const [density, setDensity] = useState<Density>('standard');
  const [sortKey, setSortKey] = useState<string>('seasonTotal');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // Slice to 8 rows so the canvas stays a reasonable height; the table
  // mechanics are the point, not the full roster.
  const data = sortRows(getRosterByFranchise('fr-bro').slice(0, 8), sortKey, sortDir);

  return (
    <DataTable<RosterRow>
      columns={ROSTER_COLUMNS as DataTableColumn<RosterRow>[]}
      data={data}
      renderRow={(row) => (
        <PlayerRow
          row={row}
          density={density}
          columns={ROSTER_COLUMNS}
        />
      )}
      density={density}
      onDensityChange={setDensity}
      sortKey={sortKey}
      sortDirection={sortDir}
      onSort={handleSort}
    />
  );
}

const REGISTRY: ComponentEntry[] = [
  {
    id: 'label',
    label: 'Label',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 240,
    defaultProps: {
      children: 'Section Header',
      size: 'md',
      color: 'gray-500',
    },
    propControls: [
      { key: 'size', type: 'select', options: ['md', 'sm'] },
      { key: 'color', type: 'select', options: COLOR_KEYS },
    ],
    render: (props) => (
      <Label
        size={props.size as 'md' | 'sm'}
        color={COLOR_OPTIONS[props.color as string]}
      >
        {props.children as string}
      </Label>
    ),
  },
  {
    id: 'mono',
    label: 'Mono',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 240,
    defaultProps: {
      children: 'OAK · M. TORRES',
      color: 'gray-500',
    },
    propControls: [
      { key: 'color', type: 'select', options: COLOR_KEYS },
    ],
    render: (props) => (
      <Mono color={COLOR_OPTIONS[props.color as string]}>
        {props.children as string}
      </Mono>
    ),
  },
  {
    id: 'position-badge',
    label: 'PositionBadge',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 80,
    defaultProps: {
      position: 'QB',
      size: 'sm',
    },
    propControls: [
      {
        key: 'position',
        type: 'select',
        options: ['QB', 'RB', 'WR', 'TE', 'PK', 'LB', 'CB', 'S', 'FLEX'],
      },
      { key: 'size', type: 'select', options: ['sm', 'md', 'lg'] },
    ],
    render: (props) => (
      <PositionBadge
        position={props.position as string}
        size={props.size as 'sm' | 'md' | 'lg'}
      />
    ),
  },
  {
    id: 'injury-indicator',
    label: 'InjuryIndicator',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 40,
    defaultProps: {
      status: 'Q',
    },
    propControls: [
      { key: 'status', type: 'select', options: ['Q', 'D', 'O', 'IR', 'none'] },
    ],
    render: (props) => {
      const raw = props.status as string;
      const status = raw === 'none' ? null : (raw as InjuryStatus);
      return <InjuryIndicator status={status} />;
    },
  },
  {
    id: 'headshot',
    label: 'Headshot',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 120,
    defaultProps: {
      size: 64,
    },
    propControls: [
      { key: 'size', type: 'stepper', min: 24, max: 96, step: 8 },
    ],
    render: (props) => <Headshot size={props.size as number} />,
  },
  {
    id: 'franchise-mark',
    label: 'FranchiseMark',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 120,
    defaultProps: {
      franchise: 'OAK',
      size: 64,
    },
    propControls: [
      {
        key: 'franchise',
        type: 'select',
        options: ['OAK', 'MIA', 'BRO', 'SAN', 'PRT'],
      },
      { key: 'size', type: 'stepper', min: 24, max: 96, step: 8 },
    ],
    render: (props) => {
      const abbr = props.franchise as string;
      const match = DISPLAY_FRANCHISES.find((f) => f.abbreviation === abbr);
      // Mock data is the source of truth here; the component only needs the
      // colors and abbreviation to pick its mark.
      const franchise = match ?? {
        abbreviation: abbr,
        primaryColor: gray[300],
        secondaryColor: gray[700],
      };
      return <FranchiseMark franchise={franchise} size={props.size as number} />;
    },
  },
  {
    id: 'live-dot',
    label: 'LiveDot',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 40,
    defaultProps: {
      size: 8,
    },
    propControls: [
      { key: 'size', type: 'stepper', min: 6, max: 16, step: 2 },
    ],
    render: (props) => <LiveDot size={props.size as number} />,
  },
  {
    id: 'score-num',
    label: 'ScoreNum',
    category: 'Scoring',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 200,
    defaultProps: {
      value: '142.36',
      size: 'lg',
    },
    propControls: [
      { key: 'size', type: 'select', options: ['sm', 'md', 'lg', 'xl'] },
      { key: 'value', type: 'select', options: ['142.36', '0.00', '87.50'] },
    ],
    render: (props) => (
      <ScoreNum
        value={props.value as string}
        size={props.size as 'sm' | 'md' | 'lg' | 'xl'}
      />
    ),
  },
  {
    id: 'score-display',
    label: 'ScoreDisplay',
    category: 'Scoring',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 200,
    defaultProps: {
      franchise: 'OAK',
      score: '142.36',
      layout: 'full',
      scoreSize: 'md',
      isLive: false,
      isWinning: true,
    },
    propControls: [
      {
        key: 'franchise',
        type: 'select',
        options: ['OAK', 'MIA', 'BRO', 'SAN', 'PRT'],
      },
      { key: 'layout', type: 'select', options: ['full', 'compact'] },
      { key: 'scoreSize', type: 'select', options: ['sm', 'md', 'lg', 'xl'] },
      { key: 'isLive', type: 'toggle' },
      { key: 'isWinning', type: 'toggle' },
    ],
    render: (props) => {
      const abbr = props.franchise as string;
      const match = DISPLAY_FRANCHISES.find((f) => f.abbreviation === abbr);
      // Fallback keeps the preview alive if the selector is ever pointed at
      // a franchise that's been removed from the fixture — uses §8.6 generic.
      const franchise = match ?? {
        name: 'Generic Franchise',
        abbreviation: abbr,
        primaryColor: gray[800],
        secondaryColor: gray[400],
      };
      return (
        <ScoreDisplay
          franchise={franchise}
          score={props.score as string}
          layout={props.layout as 'full' | 'compact'}
          scoreSize={props.scoreSize as 'sm' | 'md' | 'lg' | 'xl'}
          isLive={Boolean(props.isLive)}
          isWinning={Boolean(props.isWinning)}
        />
      );
    },
  },
  {
    id: 'matchup-card',
    label: 'MatchupCard',
    category: 'Scoring',
    backgroundColor: gray[100],
    frameMode: 'naked',
    componentWidth: 380,
    defaultProps: {
      status: 'live',
      variant: 'standard',
    },
    propControls: [
      {
        key: 'status',
        type: 'select',
        options: ['upcoming', 'live', 'final'],
      },
      { key: 'variant', type: 'select', options: ['standard', 'compact'] },
    ],
    // Two matchups exercise the spec's franchise-pair edge cases:
    // Oakland (dark green) vs Miami (hot pink) — classic clashing pair,
    // and Brooklyn (near-black navy) vs San Antonio (near-white cream) —
    // both contrast extremes in one card.
    render: (props) => {
      const status = props.status as 'upcoming' | 'live' | 'final';
      const variant = props.variant as 'standard' | 'compact';
      const oak = DISPLAY_FRANCHISES.find((f) => f.abbreviation === 'OAK')!;
      const mia = DISPLAY_FRANCHISES.find((f) => f.abbreviation === 'MIA')!;
      const bro = DISPLAY_FRANCHISES.find((f) => f.abbreviation === 'BRO')!;
      const san = DISPLAY_FRANCHISES.find((f) => f.abbreviation === 'SAN')!;
      return (
        <Stack gap={spacing.lg}>
          <MatchupCard
            awayTeam={{ franchise: oak, score: '142.36' }}
            homeTeam={{ franchise: mia, score: '128.90' }}
            weekNumber={11}
            status={status}
            variant={variant}
            onPress={() => {}}
          />
          <MatchupCard
            awayTeam={{ franchise: bro, score: '118.45' }}
            homeTeam={{ franchise: san, score: '124.10' }}
            weekNumber={11}
            status={status}
            variant={variant}
            onPress={() => {}}
          />
        </Stack>
      );
    },
  },
  {
    id: 'stat-value',
    label: 'StatValue',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 200,
    defaultProps: {
      label: 'Cap Room',
      value: '$23.50',
      size: 'md',
      layout: 'vertical',
    },
    propControls: [
      { key: 'size', type: 'select', options: ['sm', 'md', 'lg'] },
      { key: 'layout', type: 'select', options: ['vertical', 'horizontal'] },
      { key: 'value', type: 'select', options: ['$23.50', '1,432.8', '7-3', '0.00'] },
    ],
    render: (props) => (
      <StatValue
        label={props.label as string}
        value={props.value as string}
        size={props.size as 'sm' | 'md' | 'lg'}
        layout={props.layout as 'vertical' | 'horizontal'}
      />
    ),
  },
  {
    id: 'segment-control',
    label: 'SegmentControl',
    category: 'Controls',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 300,
    defaultProps: {
      preset: 'Roster',
    },
    propControls: [
      {
        key: 'preset',
        type: 'select',
        options: ['Roster', 'Density', 'Quarter'],
      },
    ],
    render: (props) => {
      const preset = props.preset as string;
      const segments =
        preset === 'Density'
          ? ['Standard', 'Compact']
          : preset === 'Quarter'
            ? ['Q1', 'Q2', 'Q3', 'Q4']
            : ['Active', 'IR', 'Taxi'];
      // The preset string changes the segments array; using preset as the
      // key remounts the demo so internal activeIndex resets to 0 — avoids
      // an out-of-range index when shrinking from 4 segments to 2.
      return <SegmentControlDemo key={preset} segments={segments} />;
    },
  },
  {
    id: 'player-row',
    label: 'PlayerRow',
    category: 'Data Display',
    backgroundColor: gray[0],
    frameMode: 'naked',
    componentWidth: 700,
    defaultProps: {
      density: 'standard',
    },
    propControls: [
      { key: 'density', type: 'select', options: ['standard', 'compact'] },
    ],
    // Picks roster rows that exercise the injury-indicator cases: a healthy
    // starter (no indicator), a non-healthy active player (Q/D/O badge), and an
    // IR player (IR badge — two-letter variant). Falls back to the first rows
    // if a category isn't present for this franchise.
    render: (props) => {
      const roster = getRosterByFranchise('fr-bro');
      const firstWhere = (pred: (r: RosterRow) => boolean) =>
        roster.find(pred);
      const picks = [
        firstWhere((r) => r.bucket === 'ACTIVE' && r.injuryStatus === 'HEALTHY'),
        firstWhere(
          (r) =>
            r.bucket === 'ACTIVE' &&
            ['QUESTIONABLE', 'DOUBTFUL', 'OUT'].includes(r.injuryStatus),
        ),
        firstWhere((r) => r.bucket === 'INJURED_RESERVE'),
        firstWhere((r) => r.bucket === 'TAXI_SQUAD'),
      ].filter((r): r is RosterRow => r != null);
      const rows = picks.length > 0 ? picks : roster.slice(0, 4);
      const density = props.density as 'standard' | 'compact';
      return (
        <View>
          {rows.map((row) => (
            <PlayerRow key={row.player.id} row={row} density={density} />
          ))}
        </View>
      );
    },
  },
  {
    id: 'card',
    label: 'Card',
    category: 'Layout',
    backgroundColor: gray[100],
    frameMode: 'naked',
    componentWidth: 360,
    defaultProps: {
      padding: spacing.lg,
    },
    propControls: [
      { key: 'padding', type: 'stepper', min: 0, max: 32, step: 4 },
    ],
    render: (props) => (
      <Card padding={props.padding as number}>
        <Stack gap={spacing.sm}>
          <Label>Week 11 Matchup</Label>
          <Text style={{ ...typo.headlineSm, color: gray[950] }}>
            Oakdale Timberwolves
          </Text>
          <Text style={{ ...typo.body, color: gray[600] }}>
            Card is an elevated surface — border, shadow, radius-md, overflow
            hidden. Use it to separate grouped content on a page.
          </Text>
        </Stack>
      </Card>
    ),
  },
  {
    id: 'section',
    label: 'Section',
    category: 'Layout',
    backgroundColor: gray[0],
    frameMode: 'naked',
    componentWidth: 360,
    defaultProps: {},
    render: () => (
      <Stack gap={spacing.xl}>
        <Section
          title="Starters"
          action={
            <Text style={{ ...typo.bodyXs, color: gray[500] }}>View All</Text>
          }
        >
          <Stack gap={spacing.sm}>
            <Text style={{ ...typo.body, color: gray[800] }}>
              D. Carter — QB
            </Text>
            <Text style={{ ...typo.body, color: gray[800] }}>
              T. Patterson — RB
            </Text>
            <Text style={{ ...typo.body, color: gray[800] }}>
              J. Hampton — WR
            </Text>
          </Stack>
        </Section>
        <Section title="Bench" collapsible>
          <Stack gap={spacing.sm}>
            <Text style={{ ...typo.body, color: gray[800] }}>
              A. Ortiz — WR
            </Text>
            <Text style={{ ...typo.body, color: gray[800] }}>
              M. Givens — TE
            </Text>
          </Stack>
        </Section>
        <Section title="Injured Reserve" collapsible defaultCollapsed>
          <Stack gap={spacing.sm}>
            <Text style={{ ...typo.body, color: gray[800] }}>
              A. Givens — DE (IR)
            </Text>
          </Stack>
        </Section>
      </Stack>
    ),
  },
  {
    id: 'stack',
    label: 'Stack',
    category: 'Layout',
    backgroundColor: gray[100],
    frameMode: 'naked',
    componentWidth: 360,
    defaultProps: {},
    render: () => (
      <Stack gap={spacing.xl}>
        <Stack gap={spacing.xs}>
          <Label size="sm">Vertical · gap md</Label>
          <Stack gap={spacing.md}>
            <LayoutBlock color={gray[700]} width={120} label="1" />
            <LayoutBlock color={gray[600]} width={160} label="2" />
            <LayoutBlock color={gray[500]} width={100} label="3" />
          </Stack>
        </Stack>
        <Stack gap={spacing.xs}>
          <Label size="sm">Horizontal · gap sm · align center</Label>
          <Stack direction="horizontal" gap={spacing.sm} align="center">
            <LayoutBlock color={gray[700]} width={60} label="1" />
            <LayoutBlock color={gray[600]} width={60} height={48} label="2" />
            <LayoutBlock color={gray[500]} width={60} label="3" />
            <LayoutBlock color={gray[400]} width={60} height={40} label="4" />
          </Stack>
        </Stack>
        <Stack gap={spacing.xs}>
          <Label size="sm">Horizontal · wrap · gap md</Label>
          <Stack direction="horizontal" gap={spacing.md} wrap>
            <LayoutBlock color={gray[700]} width={100} label="1" />
            <LayoutBlock color={gray[600]} width={100} label="2" />
            <LayoutBlock color={gray[500]} width={100} label="3" />
            <LayoutBlock color={gray[400]} width={100} label="4" />
            <LayoutBlock color={gray[300]} width={100} label="5" />
          </Stack>
        </Stack>
      </Stack>
    ),
  },
  {
    id: 'page-shell',
    label: 'PageShell',
    category: 'Layout',
    backgroundColor: gray[100],
    frameMode: 'phone',
    defaultProps: {},
    render: () => {
      const oakland = DISPLAY_FRANCHISES.find((f) => f.abbreviation === 'OAK');
      return (
        <PageShell
          leagueName={oakland?.name ?? 'Oakdale Timberwolves'}
          franchise={oakland}
          activeSection="My Team"
        >
          <Stack gap={spacing.lg}>
            <Card>
              <Stack gap={spacing.sm}>
                <Label>This Week</Label>
                <Text style={{ ...typo.headlineSm, color: gray[950] }}>
                  Week 11 · vs Miami Tempo
                </Text>
                <Text style={{ ...typo.body, color: gray[600] }}>
                  Lock your starters before Sunday 1:00 PM. Three players are
                  on bye and one is questionable.
                </Text>
              </Stack>
            </Card>
            <Card>
              <Stack gap={spacing.sm}>
                <Label>Record</Label>
                <Text style={{ ...typo.headlineMd, color: gray[950] }}>
                  7 – 3
                </Text>
                <Text style={{ ...typo.body, color: gray[600] }}>
                  Currently 2nd in division. PF 1,180.45 · PA 1,085.20.
                </Text>
              </Stack>
            </Card>
            <Card>
              <Stack gap={spacing.sm}>
                <Label>Recent Activity</Label>
                <Text style={{ ...typo.body, color: gray[800] }}>
                  Trade complete — BRO sends 2026 1st-round pick to OAK for
                  RB T. Patterson.
                </Text>
                <Text style={{ ...typo.body, color: gray[800] }}>
                  Waiver claim processed — added WR J. Hampton.
                </Text>
              </Stack>
            </Card>
          </Stack>
        </PageShell>
      );
    },
  },
  {
    id: 'franchise-header',
    label: 'FranchiseHeader',
    category: 'Franchise',
    backgroundColor: gray[100],
    frameMode: 'naked',
    componentWidth: 390,
    defaultProps: {},
    // Stacks all five sample franchises so the canvas exercises the full
    // safeBlock() range — dark green, hot pink, near-black navy, near-white
    // cream (gets the gray-300 border), and deep purple — in one shot.
    render: () => (
      <Stack gap={spacing.md}>
        {DISPLAY_FRANCHISES.map((f) => (
          <FranchiseHeader
            key={f.id}
            franchise={f}
            ownerName={f.ownerName}
            record={f.record}
            divisionRecord="3-1 DIV"
            tierLabel="DYNASTY · SALARY · CONTRACT"
            pointsFor={f.pointsFor.toFixed(2)}
            pointsAgainst={f.pointsAgainst.toFixed(2)}
            streak="W2"
          />
        ))}
      </Stack>
    ),
  },
  {
    id: 'cap-meter',
    label: 'CapMeter',
    category: 'Cap',
    backgroundColor: gray[0],
    frameMode: 'naked',
    componentWidth: 300,
    defaultProps: {
      state: 'near-cap',
      size: 'md',
      showLabels: true,
      showRoom: true,
    },
    propControls: [
      { key: 'state', type: 'select', options: ['under-cap', 'near-cap', 'over-cap'] },
      { key: 'size', type: 'select', options: ['md', 'sm'] },
      { key: 'showLabels', type: 'toggle' },
      { key: 'showRoom', type: 'toggle' },
    ],
    // capTotal is the real Dynasty cap ($222.75) from the fixture; capUsed is
    // derived from the selected state so the control sweeps healthy (75%),
    // warning (92%), and over-cap (105%). The static stack beneath the
    // interactive meter shows all three full-size states plus the bar-only
    // small variant at once (Spec §4.6 done-criteria).
    render: (props) => {
      const capTotal = DISPLAY_FRANCHISES[0].capTotal;
      const pctByState: Record<string, number> = {
        'under-cap': 0.75,
        'near-cap': 0.92,
        'over-cap': 1.05,
      };
      const pct = pctByState[props.state as string] ?? 0.92;
      return (
        <Stack gap={spacing.xl}>
          <CapMeter
            capUsed={capTotal * pct}
            capTotal={capTotal}
            size={props.size as 'sm' | 'md'}
            showLabels={Boolean(props.showLabels)}
            showRoom={Boolean(props.showRoom)}
          />
          <Stack gap={spacing.lg}>
            <Stack gap={spacing.xs}>
              <Label size="sm">Healthy · 75%</Label>
              <CapMeter capUsed={capTotal * 0.75} capTotal={capTotal} />
            </Stack>
            <Stack gap={spacing.xs}>
              <Label size="sm">Warning · 92%</Label>
              <CapMeter capUsed={capTotal * 0.92} capTotal={capTotal} />
            </Stack>
            <Stack gap={spacing.xs}>
              <Label size="sm">Over cap · 105%</Label>
              <CapMeter capUsed={capTotal * 1.05} capTotal={capTotal} />
            </Stack>
            <Stack gap={spacing.xs}>
              <Label size="sm">Small · bar only</Label>
              <CapMeter capUsed={capTotal * 0.92} capTotal={capTotal} size="sm" />
            </Stack>
          </Stack>
        </Stack>
      );
    },
  },
  {
    id: 'transaction-row',
    label: 'TransactionRow',
    category: 'Transactions',
    backgroundColor: gray[0],
    frameMode: 'naked',
    componentWidth: 380,
    defaultProps: {},
    // The five mockData transactions stacked as a feed — exercises four
    // distinct icons (ADD_DROP ↕, WAIVER_CLAIM ◆, TRADE_COMPLETED ⇄,
    // IR_MOVE +), the franchise color dot per row, single-line truncation on
    // the long trade description, and relative-time formatting.
    //
    // The mockData rows are all dated Nov 2025, so they all render via the
    // short-date branch. The three synthetic fixtures above them are
    // preview-only demo data (NOT in mockData.ts) with timestamps computed
    // from now, so they exercise the "Xm/Xh/Xd ago" branches the dataset
    // otherwise can't reach.
    render: () => {
      const MINUTE = 60_000;
      const HOUR = 60 * MINUTE;
      const DAY = 24 * HOUR;
      const recent: Array<{
        id: string;
        type: TransactionType;
        timestamp: string;
        details: string;
        franchiseId?: string;
      }> = [
        {
          id: 'demo-recent-1',
          type: 'ADD_DROP',
          timestamp: new Date(Date.now() - 30 * MINUTE).toISOString(),
          details: 'Added WR Rico Alvarado (HOU); dropped TE Brock Sterling (SEA)',
          franchiseId: 'fr-oak',
        },
        {
          id: 'demo-recent-2',
          type: 'WAIVER_CLAIM',
          timestamp: new Date(Date.now() - 6 * HOUR).toISOString(),
          details: 'Waiver claim awarded — RB Devon Mitchell (CHI), bid $8',
        },
        {
          id: 'demo-recent-3',
          type: 'TRADE_COMPLETED',
          timestamp: new Date(Date.now() - 3 * DAY).toISOString(),
          details:
            'Trade complete — MIA sends WR Andre Ortiz to SAN for a 2027 2nd-round pick',
          franchiseId: 'fr-mia',
        },
      ];
      const rows = [
        ...recent,
        ...transactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          timestamp: tx.occurredAt,
          details: describeTransaction(tx),
          franchiseId: tx.initiatedByFranchiseId ?? undefined,
        })),
      ];
      return (
        <View>
          {rows.map((tx) => {
            const f = tx.franchiseId ? displayFranchiseById(tx.franchiseId) : undefined;
            return (
              <TransactionRow
                key={tx.id}
                type={tx.type}
                description={tx.details}
                timestamp={tx.timestamp}
                franchise={
                  f
                    ? { abbreviation: f.abbreviation, primaryColor: f.primaryColor }
                    : undefined
                }
              />
            );
          })}
        </View>
      );
    },
  },
  {
    id: 'data-table',
    label: 'DataTable',
    category: 'Data Display',
    backgroundColor: gray[0],
    frameMode: 'naked',
    componentWidth: 800,
    defaultProps: {},
    // Density + sort are managed inside DataTableDemo because the registry's
    // render closure can't hold state. Tapping a sortable header flips the
    // sort direction (or switches the active column); tapping the toolbar's
    // Standard/Compact segments toggles both header height and row density
    // because the same density value is passed to PlayerRow.
    render: () => <DataTableDemo />,
  },
  {
    id: 'roster-view',
    label: 'RosterView',
    category: 'Screens',
    backgroundColor: gray[100],
    frameMode: 'phone',
    defaultProps: {
      franchiseId: 'fr-prt',
      isOwner: true,
    },
    propControls: [
      {
        key: 'franchiseId',
        type: 'select',
        // fr-prt (default) is the only franchise with all three buckets
        // populated (3 Active / 1 IR / 1 Taxi); fr-mia has empty IR + Taxi so
        // the empty-state line is demonstrable. The rest round out the picker.
        options: ['fr-prt', 'fr-mia', 'fr-oak', 'fr-bro', 'fr-san'],
      },
      // Owner (/my-team) shows the context-bar "Set Lineup", the per-row
      // action menu, and "Add Player"; visitor (/franchise/:slug) hides them
      // and shows "Propose Trade" instead — hide-don't-disable.
      { key: 'isOwner', type: 'toggle' },
    ],
    // Segment switching is interactive via RosterView's own state. Keying on
    // franchiseId + isOwner remounts the screen when either changes so the
    // bucket selection (and any open action menu) resets cleanly. The owner
    // action callbacks are left undefined — no backend yet, so the affordances
    // render but pressing them is a no-op (stubbed, not wired).
    render: (props) => (
      <RosterView
        key={`${props.franchiseId as string}-${String(props.isOwner)}`}
        franchiseId={props.franchiseId as string}
        isOwner={props.isOwner as boolean}
      />
    ),
  },
  {
    id: 'franchise-home',
    label: 'FranchiseHome',
    category: 'Screens',
    backgroundColor: gray[100],
    frameMode: 'phone',
    defaultProps: {
      franchiseId: 'fr-bro',
      isOwner: true,
    },
    propControls: [
      {
        key: 'franchiseId',
        type: 'select',
        // fr-bro (default) has a live matchup vs OAK, two transactions, and a
        // near-cap meter. fr-mia has no transactions → Recent Activity empty
        // state (and is over cap). fr-oak, fr-san, and fr-prt round out the
        // picker.
        options: ['fr-bro', 'fr-mia', 'fr-oak', 'fr-san', 'fr-prt'],
      },
      // Owner (/my-team) shows the "Set Lineup" affordance; visitor
      // (/franchise/:slug) hides it and shows "Propose Trade" instead —
      // hide-don't-disable.
      { key: 'isOwner', type: 'toggle' },
    ],
    // Keying on franchiseId + isOwner remounts the screen when either changes
    // so the composition rebuilds cleanly. Outbound-link callbacks are left
    // undefined here — the franchise route shell isn't built yet, so the
    // affordances render but pressing them is a no-op (stubbed, not wired).
    render: (props) => (
      <FranchiseHome
        key={`${props.franchiseId as string}-${String(props.isOwner)}`}
        franchiseId={props.franchiseId as string}
        isOwner={props.isOwner as boolean}
      />
    ),
  },
  {
    id: 'league-home',
    label: 'LeagueHome',
    category: 'Screens',
    backgroundColor: gray[100],
    frameMode: 'phone',
    defaultProps: {
      // fr-bro (the league leader) is the viewer by default so its live matchup
      // vs OAK lifts to the top of the list and its standings row is tinted.
      // The `neutral` toggle clears the viewer for the fully league-neutral view
      // (no highlight, schedule-order matchups).
      neutral: false,
    },
    propControls: [{ key: 'neutral', type: 'toggle' }],
    // Outbound-link callbacks are left undefined — the league route shell isn't
    // built yet, so the affordances render but pressing them is a no-op
    // (stubbed, not wired). Keying on `neutral` remounts so the composition
    // rebuilds cleanly when the viewer is cleared.
    render: (props) => (
      <LeagueHome
        key={String(props.neutral)}
        viewerFranchiseId={(props.neutral as boolean) ? undefined : 'fr-bro'}
      />
    ),
  },
  {
    id: 'standings',
    label: 'Standings',
    category: 'Screens',
    backgroundColor: gray[100],
    frameMode: 'phone',
    // League-wide and tier-agnostic, so no franchise/tier select. The `empty`
    // toggle swaps the computed league standings (all eight franchises) for `[]`
    // to exercise the empty state.
    defaultProps: {
      empty: false,
    },
    propControls: [{ key: 'empty', type: 'toggle' }],
    render: (props) => (
      <Standings
        entries={(props.empty as boolean) ? [] : computeStandings(LEAGUE_ID)}
      />
    ),
  },
];

// ─── frame constants ─────────────────────────────────────────────────────────

const SIDEBAR_WIDTH = 280;
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const PHONE_RADIUS = 44;

// ─── root ────────────────────────────────────────────────────────────────────

export default function Preview() {
  if (Platform.OS !== 'web') {
    return <WebOnly />;
  }

  const [selectedId, setSelectedId] = useState<string | null>(
    REGISTRY[0]?.id ?? null,
  );
  const [propOverrides, setPropOverrides] = useState<
    Record<string, Record<string, unknown>>
  >({});

  const selected = useMemo(
    () => REGISTRY.find((c) => c.id === selectedId) ?? null,
    [selectedId],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ComponentEntry[]>();
    for (const entry of REGISTRY) {
      const list = map.get(entry.category) ?? [];
      list.push(entry);
      map.set(entry.category, list);
    }
    return Array.from(map.entries());
  }, []);

  const currentProps = useMemo(() => {
    if (!selected) return {};
    return { ...selected.defaultProps, ...(propOverrides[selected.id] ?? {}) };
  }, [selected, propOverrides]);

  const setPropValue = (componentId: string, key: string, value: unknown) => {
    setPropOverrides((prev) => ({
      ...prev,
      [componentId]: { ...(prev[componentId] ?? {}), [key]: value },
    }));
  };

  return (
    <View style={styles.root}>
      <Sidebar
        grouped={grouped}
        registryEmpty={REGISTRY.length === 0}
        selectedId={selectedId}
        onSelect={setSelectedId}
        selected={selected}
        currentProps={currentProps}
        onPropChange={setPropValue}
      />
      <Canvas selected={selected} props={currentProps} />
    </View>
  );
}

// ─── sidebar ─────────────────────────────────────────────────────────────────

type SidebarProps = {
  grouped: Array<[string, ComponentEntry[]]>;
  registryEmpty: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  selected: ComponentEntry | null;
  currentProps: Record<string, unknown>;
  onPropChange: (componentId: string, key: string, value: unknown) => void;
};

function Sidebar({
  grouped,
  registryEmpty,
  selectedId,
  onSelect,
  selected,
  currentProps,
  onPropChange,
}: SidebarProps) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitleEyebrow}>XO PLAY</Text>
        <Text style={styles.sidebarTitle}>Components</Text>
      </View>

      <ScrollView style={styles.sidebarScroll} contentContainerStyle={styles.sidebarScrollContent}>
        {registryEmpty ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No components registered</Text>
            <Text style={styles.emptyStateHint}>
              Add entries to REGISTRY in app/preview.tsx
            </Text>
          </View>
        ) : (
          grouped.map(([category, entries]) => (
            <View key={category} style={styles.categoryBlock}>
              <Text style={styles.categoryLabel}>{category}</Text>
              {entries.map((entry) => {
                const active = entry.id === selectedId;
                return (
                  <Pressable
                    key={entry.id}
                    onPress={() => onSelect(entry.id)}
                    style={[styles.componentItem, active && styles.componentItemActive]}
                  >
                    <Text
                      style={[
                        styles.componentItemText,
                        active && styles.componentItemTextActive,
                      ]}
                    >
                      {entry.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}

        {selected?.propControls && selected.propControls.length > 0 ? (
          <View style={styles.controlsBlock}>
            <Text style={styles.categoryLabel}>Props</Text>
            {selected.propControls.map((control) => (
              <ControlRow
                key={control.key}
                control={control}
                value={currentProps[control.key]}
                onChange={(v) => onPropChange(selected.id, control.key, v)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── prop controls ───────────────────────────────────────────────────────────

type ControlRowProps = {
  control: PropControl;
  value: unknown;
  onChange: (value: unknown) => void;
};

function ControlRow({ control, value, onChange }: ControlRowProps) {
  if (control.type === 'stepper') {
    const numeric = typeof value === 'number' ? value : control.min;
    return (
      <View style={styles.controlRow}>
        <Text style={styles.controlKey}>{control.key}</Text>
        <View style={styles.stepperGroup}>
          <Pressable
            onPress={() => onChange(Math.max(control.min, numeric - control.step))}
            style={styles.stepperButton}
          >
            <Text style={styles.stepperButtonText}>−</Text>
          </Pressable>
          <Text style={styles.stepperValue}>{String(numeric)}</Text>
          <Pressable
            onPress={() => onChange(Math.min(control.max, numeric + control.step))}
            style={styles.stepperButton}
          >
            <Text style={styles.stepperButtonText}>+</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (control.type === 'toggle') {
    const bool = Boolean(value);
    return (
      <View style={styles.controlRow}>
        <Text style={styles.controlKey}>{control.key}</Text>
        <Switch
          value={bool}
          onValueChange={onChange}
          trackColor={{ false: gray[700], true: gray[400] }}
          thumbColor={gray[0]}
        />
      </View>
    );
  }

  // select
  const current = typeof value === 'string' ? value : control.options[0];
  const idx = control.options.indexOf(current);
  const next = control.options[(idx + 1) % control.options.length];
  return (
    <View style={styles.controlRow}>
      <Text style={styles.controlKey}>{control.key}</Text>
      <Pressable onPress={() => onChange(next)} style={styles.selectButton}>
        <Text style={styles.selectButtonText}>{current}</Text>
      </Pressable>
    </View>
  );
}

// ─── canvas ──────────────────────────────────────────────────────────────────

type CanvasProps = {
  selected: ComponentEntry | null;
  props: Record<string, unknown>;
};

function Canvas({ selected, props }: CanvasProps) {
  if (!selected) {
    return (
      <View style={[styles.canvas, { backgroundColor: gray[100] }]}>
        <Text style={styles.canvasEmpty}>Select a component to preview</Text>
      </View>
    );
  }

  return (
    <View style={[styles.canvas, { backgroundColor: selected.backgroundColor }]}>
      {selected.frameMode === 'phone' ? (
        <PhoneFrame>{selected.render(props)}</PhoneFrame>
      ) : (
        <NakedFrame
          width={selected.componentWidth}
          height={selected.componentHeight}
        >
          {selected.render(props)}
        </NakedFrame>
      )}
    </View>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <View style={styles.phoneFrame}>
      <View style={styles.phoneInner}>{children}</View>
    </View>
  );
}

function NakedFrame({
  width,
  height,
  children,
}: {
  width?: number;
  height?: number;
  children: ReactNode;
}) {
  if (width == null) {
    return (
      <View style={styles.nakedError}>
        <Text style={styles.nakedErrorText}>
          naked frame requires componentWidth in the registry entry
        </Text>
      </View>
    );
  }
  return <View style={[styles.nakedFrame, { width, height }]}>{children}</View>;
}

// ─── web-only fallback ───────────────────────────────────────────────────────

function WebOnly() {
  return (
    <View style={styles.webOnly}>
      <Text style={styles.webOnlyTitle}>Web only</Text>
      <Text style={styles.webOnlyBody}>
        The component preview runs only in a browser. Open
        http://localhost:8081/preview.
      </Text>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: gray[100],
  },

  // sidebar
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: gray[950],
    borderRightWidth: 1,
    borderRightColor: gray[700],
  },
  sidebarHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: gray[700],
    gap: spacing.xs,
  },
  sidebarTitleEyebrow: {
    ...typo.mono,
    color: gray[400],
  },
  sidebarTitle: {
    ...typo.headlineXs,
    color: gray[0],
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarScrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  categoryBlock: {
    marginBottom: spacing.lg,
  },
  categoryLabel: {
    ...typo.label,
    color: gray[400],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  componentItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  componentItemActive: {
    backgroundColor: gray[800],
  },
  componentItemText: {
    ...typo.body,
    color: gray[300],
  },
  componentItemTextActive: {
    color: gray[0],
  },
  emptyState: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  emptyStateText: {
    ...typo.body,
    color: gray[300],
  },
  emptyStateHint: {
    ...typo.bodyXs,
    color: gray[500],
  },

  // controls
  controlsBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: gray[700],
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  controlKey: {
    ...typo.mono,
    color: gray[300],
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepperButton: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: gray[800],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    ...typo.label,
    color: gray[0],
    lineHeight: 24,
  },
  stepperValue: {
    ...typo.data,
    color: gray[0],
    minWidth: 32,
    textAlign: 'center',
  },
  selectButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: gray[800],
  },
  selectButtonText: {
    ...typo.data,
    color: gray[0],
  },

  // canvas
  canvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  canvasEmpty: {
    ...typo.body,
    color: gray[500],
  },

  // phone frame
  phoneFrame: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    borderRadius: PHONE_RADIUS,
    borderWidth: 1,
    borderColor: gray[300],
    backgroundColor: gray[0],
    overflow: 'hidden',
  },
  phoneInner: {
    flex: 1,
  },

  // naked frame
  nakedFrame: {
    backgroundColor: 'transparent',
  },
  nakedError: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: gray[900],
  },
  nakedErrorText: {
    ...typo.body,
    color: gray[0],
  },

  // layout previews
  layoutBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  layoutBlockLabel: {
    ...typo.mono,
    color: gray[0],
  },

  // web-only
  webOnly: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: gray[100],
    gap: spacing.sm,
  },
  webOnlyTitle: {
    ...typo.headlineMd,
    color: gray[900],
  },
  webOnlyBody: {
    ...typo.body,
    color: gray[600],
    textAlign: 'center',
    maxWidth: 400,
  },
});
