import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { gray, spacing, type as typo } from '@/theme';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { FranchiseMark } from '@/components/FranchiseMark';
import { Section } from '@/components/Section';
import {
  computeStandings,
  getFranchiseIdentity,
  LEAGUE_ID,
  type StandingsRow,
} from '@/data';

// Standings — Batch 5 screen composition for the league Standings surface
// (Navigation "Standings", /:leagueSlug/league/standings). Read-only and
// league-scoped: a titled Section (no franchise masthead — the screen heads no
// single franchise) wrapping a rank-ordered table. Rows are composed inline —
// there is no StandingsRow component. Composes the existing design-system
// components unmodified. Spec: specs/league/screens/Screen_Standings.md.

type StandingsProps = {
  // Defaults to the computed league standings; the preview swaps in `[]` to
  // exercise the empty state.
  entries?: StandingsRow[];
};

type StandingsColumn = DataTableColumn<StandingsRow> & {
  render: (entry: StandingsRow) => ReactNode;
};

// ─── COLUMN CONFIG — single source of truth for the table layout ─────────────
// This one array feeds DataTable twice — `columns` drives the header (DataTable
// owns it; no hand-rolled header per the Placeholder Render Convention §3) and
// `render` draws each body cell in `renderRow` — so the header and rows share a
// single source and can't drift.
//
//   width  — fixed px for the numeric columns. OMIT on `franchise` to make it
//            the flexing column that absorbs the leftover width (the row cell
//            adds minWidth:0, and DataTable's header flex cell now matches).
//   align  — 'right' on every numeric so the digits form a tight right block.
//   label  — the header text.
//   render — the row cell for that column.
//
// At 390px the fixed widths + gaps leave ~150px for the franchise column, wide
// enough for the longest name ("Cascade Kingfishers") in the condensed name
// token. If a name ever clips, nudge the numeric widths down 2–4px here.

const STANDINGS_COLUMNS: StandingsColumn[] = [
  {
    key: 'rank',
    label: '#',
    width: 22, // rank — narrow, right-aligned
    align: 'right',
    render: (e) => <Text style={styles.num}>{e.rank}</Text>,
  },
  {
    key: 'franchise',
    label: 'Franchise',
    // no width → flex column (mark + name); absorbs leftover width
    render: (e) => {
      const franchise = getFranchiseIdentity(e.franchiseId);
      return (
        <View style={styles.franchiseCell}>
          {franchise ? <FranchiseMark franchise={franchise} size={20} /> : null}
          {/* numberOfLines is a safety net — at these widths the condensed name
              token fits in full, so it shouldn't actually truncate. */}
          <View style={styles.franchiseNameWrap}>
            <Text style={styles.franchiseName} numberOfLines={1}>
              {franchise?.name ?? e.franchiseId}
            </Text>
          </View>
        </View>
      );
    },
  },
  {
    key: 'record',
    label: 'W-L-T',
    width: 40, // record — fits "10-0-0", right-aligned
    align: 'right',
    // Always show ties (e.g. "8-2-0") — never special-case zero.
    render: (e) => (
      <Text style={styles.num}>{`${e.wins}-${e.losses}-${e.ties}`}</Text>
    ),
  },
  {
    key: 'pointsFor',
    label: 'PF',
    width: 44, // points for — fits "1227.6", right-aligned
    align: 'right',
    render: (e) => <Text style={styles.num}>{e.pointsFor.toFixed(1)}</Text>,
  },
  {
    key: 'pointsAgainst',
    label: 'PA',
    width: 44, // points against — fits "1123.6", right-aligned
    align: 'right',
    render: (e) => <Text style={styles.num}>{e.pointsAgainst.toFixed(1)}</Text>,
  },
  {
    key: 'streak',
    label: 'STRK',
    width: 30, // streak — fits "W10", right-aligned; neutral color
    align: 'right',
    render: (e) => <Text style={styles.num}>{e.streak}</Text>,
  },
];

export function Standings({
  entries = computeStandings(LEAGUE_ID),
}: StandingsProps) {
  const populated = entries.length > 0;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.region}>
          <Section title="Standings">
            {populated ? (
              // Bleed the table back to full width so DataTable's own spacing.md
              // gutter — not the section's lg gutter — sets the table edge,
              // matching RosterView's full-bleed table. DataTable owns the
              // header; rows render in rank order through renderRow off the SAME
              // column config.
              <View style={styles.tableBleed}>
                <DataTable<StandingsRow>
                  columns={STANDINGS_COLUMNS}
                  data={entries}
                  density="compact"
                  showDensityToggle={false}
                  renderRow={(entry) => (
                    <View style={styles.row}>
                      {STANDINGS_COLUMNS.map((col) => (
                        <View
                          key={col.key}
                          style={[
                            col.width != null
                              ? { width: col.width }
                              : styles.cellFlex,
                            col.align === 'right' && styles.cellRight,
                          ]}
                        >
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
  // Body-row scaffold. Geometry mirrors DataTable's header (paddingHorizontal
  // spacing.md, gap spacing.sm) so the body cells sit under their header labels;
  // height is the sanctioned table-geometry px exception (§1).
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: gray[100],
  },
  // The franchise column flexes to absorb leftover width (no fixed `width`),
  // mirroring DataTable's header cell for the same column.
  cellFlex: {
    flex: 1,
    minWidth: 0,
  },
  // Numeric cells right-align so the digits form a tight block under their
  // right-aligned header label.
  cellRight: {
    alignItems: 'flex-end',
  },
  franchiseCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    // Stretch to the cell's full width so the name wrapper below can bound the
    // name (the cell wrapper is a column with alignItems:flex-start).
    alignSelf: 'stretch',
    minWidth: 0,
  },
  franchiseNameWrap: {
    flex: 1,
    minWidth: 0,
  },
  // Franchise name: Barlow Condensed medium 14px (the `data` token). Condensed
  // so the longest names fit without truncating; weight lives in the family,
  // so no separate fontWeight (DESIGN.md).
  franchiseName: {
    ...typo.data,
    color: gray[900],
  },
  // Numeric cells: compact condensed data token (tabular-nums baked in),
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
