import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { gray, spacing, type as typo } from '@/theme';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { FranchiseMark } from '@/components/FranchiseMark';
import { Section } from '@/components/Section';
import {
  getFranchiseById,
  standings,
  type StandingsEntry,
} from '@/data/mockData';

// Standings — Batch 5 screen composition for the league Standings surface
// (Navigation "Standings", /:leagueSlug/league/standings). Read-only and
// league-scoped: a titled Section (no franchise masthead — the screen heads no
// single franchise) wrapping a rank-ordered DataTable. Rows are composed inline
// inside renderRow from existing primitives — there is no StandingsRow
// component. Composes the existing design-system components unmodified. Spec:
// specs/league/screens/Screen_Standings.md.

type StandingsProps = {
  // Override defaults to the full mock standings; the preview swaps in `[]` to
  // exercise the empty state.
  entries?: StandingsEntry[];
};

// One shared column definition feeds both the DataTable header and the inline
// rows below, so the header cells line up over the row cells — the same
// discipline RosterView uses with its ColumnDef[]. Each column carries its own
// cell renderer via DataTableColumn's `render` contract; renderRow maps this
// array and lays each cell out by the column's width/align. Compact, 6-column
// phone set per the spec; all numeric cells right-aligned.
type StandingsColumn = DataTableColumn<StandingsEntry> & {
  render: (entry: StandingsEntry) => ReactNode;
};

const STANDINGS_COLUMNS: StandingsColumn[] = [
  {
    key: 'rank',
    label: '#',
    width: 28,
    align: 'right',
    render: (e) => <Text style={styles.num}>{e.rank}</Text>,
  },
  {
    key: 'franchise',
    label: 'Franchise',
    render: (e) => {
      // Resolve identity for the mark + name; the flex column.
      const franchise = getFranchiseById(e.franchiseId);
      return (
        <View style={styles.franchiseCell}>
          {franchise ? <FranchiseMark franchise={franchise} size={20} /> : null}
          <Text style={styles.franchiseName} numberOfLines={1}>
            {franchise?.name ?? e.franchiseId}
          </Text>
        </View>
      );
    },
  },
  {
    key: 'record',
    label: 'W-L-T',
    width: 56,
    align: 'right',
    // Always show ties (e.g. "8-2-0") — never special-case zero.
    render: (e) => (
      <Text style={styles.num}>{`${e.wins}-${e.losses}-${e.ties}`}</Text>
    ),
  },
  {
    key: 'pointsFor',
    label: 'PF',
    width: 64,
    align: 'right',
    render: (e) => <Text style={styles.num}>{e.pointsFor.toFixed(1)}</Text>,
  },
  {
    key: 'pointsAgainst',
    label: 'PA',
    width: 64,
    align: 'right',
    render: (e) => <Text style={styles.num}>{e.pointsAgainst.toFixed(1)}</Text>,
  },
  {
    key: 'streak',
    label: 'STRK',
    width: 40,
    align: 'right',
    // Verbatim, neutral — win/loss coloring is out of scope.
    render: (e) => <Text style={styles.num}>{e.streak}</Text>,
  },
];

// Cell geometry mirrors DataTable's own cellLayout so inline row cells size and
// align exactly like the header cells above them.
function cellStyle(col: StandingsColumn) {
  const alignItems = col.align === 'right' ? 'flex-end' : 'flex-start';
  return col.width != null
    ? ({ width: col.width, alignItems } as const)
    : ({ flex: 1, alignItems } as const);
}

export function Standings({ entries = standings }: StandingsProps) {
  const populated = entries.length > 0;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.region}>
          <Section title="Standings">
            {populated ? (
              // Bleed the table back to full width so its own spacing.md gutter
              // — not the section's lg gutter — sets the table edge, matching
              // RosterView's full-bleed table and giving the franchise column
              // room. Rows render in rank order (the mock is pre-sorted).
              <View style={styles.tableBleed}>
                <DataTable<StandingsEntry>
                  columns={STANDINGS_COLUMNS}
                  data={entries}
                  density="compact"
                  showDensityToggle={false}
                  renderRow={(entry) => (
                    <View style={styles.row}>
                      {STANDINGS_COLUMNS.map((col) => (
                        <View key={col.key} style={cellStyle(col)}>
                          {col.render(entry)}
                        </View>
                      ))}
                    </View>
                  )}
                />
              </View>
            ) : (
              <Text style={styles.empty}>No standings yet</Text>
            )}
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: gray[0],
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  // The section sits in the spacing.lg gutter with spacing.lg top rhythm,
  // matching the sibling screens.
  region: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  // Cancels the region's lg gutter so the table spans edge-to-edge; the table's
  // internal spacing.md padding then becomes its gutter.
  tableBleed: {
    marginHorizontal: -spacing.lg,
  },
  // Mirrors PlayerRow's compact row: 32px tall, spacing.md gutter / spacing.sm
  // gap so cells align with DataTable's header, 1px gray-100 bottom rule.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: gray[100],
  },
  franchiseCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  franchiseName: {
    ...typo.body,
    color: gray[900],
    flexShrink: 1,
  },
  // Numeric cells: compact data token (tabular-nums baked into the theme),
  // neutral gray-900.
  num: {
    ...typo.dataSm,
    color: gray[900],
  },
  empty: {
    ...typo.bodySm,
    color: gray[500],
  },
});
