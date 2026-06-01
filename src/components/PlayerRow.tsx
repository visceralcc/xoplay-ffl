import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fontFamily, gray, spacing, type as typo } from '@/theme';
import type { InjuryStatus, RosterRow } from '@/data';
import { Headshot } from './Headshot';
import { InjuryIndicator } from './InjuryIndicator';
import { Mono } from './Mono';
import { PositionBadge } from './PositionBadge';

// The single most reused element in the product — composes the Batch 1
// primitives into a horizontal player row. Spec:
// specs/foundation/components/Component_PlayerRow.md.
//
// Standard density: 44px row, type.dataMd values, 32px headshot.
// Compact density:  32px row, type.dataSm values, 24px headshot.
// PositionBadge size and InjuryStatus mapping follow the density.
// Hover (web only via Pressable's onHoverIn/onHoverOut) tints the row
// background — gray.50 in standard, gray.25 in compact.

type Density = 'standard' | 'compact';

export type PlayerRowColumnKey =
  | 'position'
  | 'headshot'
  | 'nameTeam'
  | 'injury'
  | 'salary'
  | 'contractYears'
  | 'weekScore'
  | 'seasonTotal';

export type ColumnDef = {
  key: PlayerRowColumnKey;
  label: string;
  width?: number;
  align?: 'left' | 'right';
};

// Default column layout per spec §"Composition". Widths sum to ~300 so a
// 700-wide row has plenty of slack for the flexing name/team column.
const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'position', label: 'POS', width: 40 },
  { key: 'headshot', label: '', width: 32 },
  { key: 'nameTeam', label: 'Player' }, // flex
  { key: 'injury', label: '', width: 16 },
  { key: 'salary', label: 'Salary', width: 60, align: 'right' },
  { key: 'contractYears', label: 'Yrs', width: 36, align: 'right' },
  { key: 'weekScore', label: 'Wk', width: 50, align: 'right' },
  { key: 'seasonTotal', label: 'Total', width: 64, align: 'right' },
];

type PlayerRowProps = {
  // The joined roster row from getRosterByFranchise — player identity +
  // contract + bucket + computed points — not a flattened Player.
  row: RosterRow;
  density?: Density;
  columns?: ColumnDef[];
  /** Inter-column gap. Defaults to spacing.sm; a consuming table can tighten it
   *  (e.g. to cluster numeric columns) as long as it matches its header's gap so
   *  the two stay aligned. */
  gap?: number;
  onPress?: () => void;
};

export function PlayerRow({
  row,
  density = 'standard',
  columns = DEFAULT_COLUMNS,
  gap = spacing.sm,
  onPress,
}: PlayerRowProps) {
  const [hovered, setHovered] = useState(false);

  const standard = density === 'standard';
  const rowHeight = standard ? 44 : 32;
  const headshotSize = standard ? 32 : 24;
  const positionSize: 'sm' | 'md' = standard ? 'md' : 'sm';
  const valueStyle = standard ? typo.dataMd : typo.dataSm;
  const hoverBg = standard ? gray[50] : gray[25];

  const injury = toIndicatorStatus(row.injuryStatus);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.row,
        { height: rowHeight, gap },
        hovered && { backgroundColor: hoverBg },
      ]}
    >
      {columns.map((col, i) => (
        <View key={i} style={cellStyle(col)}>
          {renderCell(col.key, row, {
            valueStyle,
            positionSize,
            headshotSize,
            injury,
          })}
        </View>
      ))}
    </Pressable>
  );
}

// ─── cell rendering ──────────────────────────────────────────────────────────

type CellCtx = {
  valueStyle: typeof typo.dataMd | typeof typo.dataSm;
  positionSize: 'sm' | 'md';
  headshotSize: number;
  injury: 'Q' | 'D' | 'O' | 'IR' | null;
};

function renderCell(
  key: PlayerRowColumnKey,
  row: RosterRow,
  ctx: CellCtx,
): React.ReactNode {
  const { player, contract } = row;
  switch (key) {
    case 'position':
      return <PositionBadge position={player.position} size={ctx.positionSize} />;

    case 'headshot':
      return <Headshot size={ctx.headshotSize} />;

    case 'nameTeam':
      return (
        <View style={styles.nameTeam}>
          <Text style={styles.playerName} numberOfLines={1}>
            {player.firstName} {player.lastName}
          </Text>
          <Mono>{player.nflTeam}</Mono>
        </View>
      );

    case 'injury':
      return <InjuryIndicator status={ctx.injury} />;

    case 'salary':
      return (
        <Text style={ctx.valueStyle} numberOfLines={1}>
          {contract ? formatCurrency(contract.baseSalary) : '—'}
        </Text>
      );

    case 'contractYears':
      return (
        <Text style={ctx.valueStyle} numberOfLines={1}>
          {contract ? contract.contractYearsRemaining : '—'}
        </Text>
      );

    case 'weekScore':
      return (
        <Text style={ctx.valueStyle} numberOfLines={1}>
          {row.lastWeekPoints.toFixed(2)}
        </Text>
      );

    case 'seasonTotal':
      return (
        <Text style={ctx.valueStyle} numberOfLines={1}>
          {row.seasonPoints.toFixed(2)}
        </Text>
      );

    default:
      return null;
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

// Map the player's injuryStatus (full set) onto InjuryIndicator's supported
// codes. SUSPENDED / HOLDOUT / COVID collapse to null — per the Indicator
// spec, those statuses aren't visually represented by this component.
function toIndicatorStatus(s: InjuryStatus): 'Q' | 'D' | 'O' | 'IR' | null {
  if (s === 'QUESTIONABLE') return 'Q';
  if (s === 'DOUBTFUL') return 'D';
  if (s === 'OUT') return 'O';
  if (s === 'IR') return 'IR';
  return null;
}

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

// Cell geometry shared by PlayerRow's cells AND any table header rendered above
// the rows (e.g. RosterView's roster table). Exported so a screen can render its
// header from the SAME column-config array through the SAME function — header
// and row widths then can't drift (the config-driven column pattern hardened on
// Standings, commit 07aaa78). Fixed-width columns take their width; the flex
// column (no width — the name/team column) gets flex:1 + minWidth:0 so the
// header and the rows resolve it to the same width. Without minWidth:0 a long
// name pushes the row's flex cell wider than the empty-label header cell, and
// the two paths drift.
export function cellStyle(col: ColumnDef) {
  const alignItems = col.align === 'right' ? 'flex-end' : 'flex-start';
  return col.width != null
    ? ({ width: col.width, alignItems } as const)
    : ({ flex: 1, minWidth: 0, alignItems } as const);
}

// Canonical width of the trailing per-row action affordance (the "⋯" trigger)
// for roster-style tables. The owner view renders the trigger here; the visitor
// view renders an empty cell of the SAME width — so the data columns line up
// across owner and visitor and toggling owner moves nothing but the affordance.
// Shared so the cap / contracts / transactions tables reserve the same slot.
export const ACTION_COL_WIDTH = 36;

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    // gap is applied inline from the `gap` prop (default spacing.sm) so a
    // consuming table can tighten it.
    borderBottomWidth: 1,
    borderBottomColor: gray[100],
  },
  // Stretch to the cell's full width and allow shrink (minWidth:0) so the
  // single-line player name truncates within the flex name column instead of
  // overflowing into the injury badge / numeric block (mirrors Standings'
  // franchiseNameWrap). Without this a long name ("Devon Bridgewater") pushes
  // past the cell and collides with SAL.
  nameTeam: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignSelf: 'stretch',
    minWidth: 0,
  },
  // The spec's one non-Condensed type — Barlow 400 14px. tight lineHeight
  // keeps the name + team stack inside the row at compact density.
  playerName: {
    fontFamily: fontFamily.barlow.regular,
    fontSize: 14,
    lineHeight: 16,
    color: gray[900],
  },
});
