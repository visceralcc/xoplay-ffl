import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { gray, spacing, type as typo } from '@/theme';
import { FranchiseHeader } from '@/components/FranchiseHeader';
import { SegmentControl } from '@/components/SegmentControl';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { PlayerRow, cellStyle, type ColumnDef } from '@/components/PlayerRow';
import {
  capTracked,
  computePointsFor,
  computePointsAgainst,
  computeRecord,
  contractsTracked,
  formatRecord,
  getFranchiseIdentity,
  getOwnerName,
  getRosterByFranchise,
  type RosterBucket,
  type RosterRow,
} from '@/data';

// RosterView — the roster surface (Navigation "Roster Management",
// /:leagueSlug/my-team/roster and the read-only /:leagueSlug/franchise/:slug/
// roster). Operational mood: an Active/IR/Taxi segment control with per-bucket
// counts above a roster table filtered to the selected bucket. Composes the
// built design-system components unmodified (placeholder UI). Spec:
// specs/roster/screens/Screen_RosterView.md, parent
// specs/franchise/Spec_FranchiseScreens.md.
//
// Table layout follows the config-driven column pattern (Spec build sequence
// step 2 / hardened on Standings, commit 07aaa78): the header cells AND the
// PlayerRow body cells lay out from ONE tier-aware ROSTER_COLUMNS array through
// the SAME cellStyle(col) (exported from PlayerRow), inside containers with the
// same paddingHorizontal (md) and gap (sm) — so every header label sits over
// its column and the two can't drift. DataTable's own header is turned off.

type RosterViewProps = {
  franchiseId: string;
};

// Segment → rosterBucket mapping (Spec "Bucket filter"). Order is the segment
// order shown in the control.
const SEGMENTS: ReadonlyArray<{ label: string; bucket: RosterBucket }> = [
  { label: 'Active', bucket: 'ACTIVE' },
  { label: 'IR', bucket: 'INJURED_RESERVE' },
  { label: 'Taxi', bucket: 'TAXI_SQUAD' },
];

// ─── COLUMN CONFIG — single source of truth for the roster table layout ──────
// Tier-aware: the salary column shows where the league tracks salaries
// (capTracked: Dynasty always, Keeper if trackSalaries, Redraft never) and the
// contract-years column where it tracks contracts (contractsTracked) —
// Spec_FranchiseScreens "Tier variations". Tier-gated columns are OMITTED, not
// rendered greyed. Headshot is dropped on this phone roster to give the flexing
// name column room (Wireframes §2.2 mobile adaptation). Widths are tuned for
// the 390px phone frame; the name column flexes to absorb the remainder.
//
// Returned to both the header and the PlayerRow body so a single array drives
// both. Tune column geometry here; nothing downstream changes.
function rosterColumns(): ColumnDef[] {
  const cols: ColumnDef[] = [
    { key: 'position', label: 'POS', width: 34 },
    { key: 'nameTeam', label: 'Player' }, // flex — absorbs leftover width
    { key: 'injury', label: '', width: 14 },
  ];
  if (capTracked()) {
    cols.push({ key: 'salary', label: 'Sal', width: 50, align: 'right' });
  }
  if (contractsTracked()) {
    cols.push({ key: 'contractYears', label: 'Yrs', width: 30, align: 'right' });
  }
  cols.push({ key: 'weekScore', label: 'Wk', width: 42, align: 'right' });
  cols.push({ key: 'seasonTotal', label: 'Total', width: 48, align: 'right' });
  return cols;
}

export function RosterView({ franchiseId }: RosterViewProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const franchise = getFranchiseIdentity(franchiseId);
  const roster = getRosterByFranchise(franchiseId);

  if (!franchise) {
    return (
      <View style={styles.screen}>
        <Text style={styles.empty}>Franchise not found.</Text>
      </View>
    );
  }

  const columns = rosterColumns();

  // Counts render for every segment, including empty buckets (shows "0").
  const segments = SEGMENTS.map(
    ({ label, bucket }) =>
      `${label} ${roster.filter((r) => r.bucket === bucket).length}`,
  );

  const selected = SEGMENTS[activeIndex];
  const bucketRows = roster.filter((r) => r.bucket === selected.bucket);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FranchiseHeader
          franchise={franchise}
          ownerName={getOwnerName(franchiseId)}
          record={formatRecord(computeRecord(franchiseId))}
          tierLabel="DYNASTY · SALARY · CONTRACT"
          pointsFor={computePointsFor(franchiseId).toFixed(2)}
          pointsAgainst={computePointsAgainst(franchiseId).toFixed(2)}
        />

        <View style={styles.controls}>
          <SegmentControl
            segments={segments}
            activeIndex={activeIndex}
            onChangeIndex={setActiveIndex}
          />
        </View>

        {bucketRows.length > 0 ? (
          <View>
            {/* Header — rendered from `columns` through the same cellStyle as
                the rows, inside the same md padding + sm gap, so every label
                sits over its column. DataTable's own header is off. */}
            <View style={styles.tableHeader}>
              {columns.map((col) => (
                <View key={col.key} style={cellStyle(col)}>
                  <Text style={styles.headerText} numberOfLines={1}>
                    {col.label}
                  </Text>
                </View>
              ))}
            </View>

            <DataTable<RosterRow>
              columns={columns as DataTableColumn<RosterRow>[]}
              data={bucketRows}
              density="compact"
              showHeader={false}
              showDensityToggle={false}
              renderRow={(row) => (
                <PlayerRow row={row} density="compact" columns={columns} />
              )}
            />
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>No players on {selected.label}</Text>
          </View>
        )}
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
    // Masthead and table sit full-bleed; only the inter-region rhythm is
    // managed here.
    paddingBottom: spacing.lg,
  },
  // The segment control is inset to the page gutter; the table below keeps
  // PlayerRow's own spacing.md gutter, so the two left edges read as aligned.
  controls: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  // Header shares paddingHorizontal (md) + gap (sm) with PlayerRow's row so
  // their cells line up exactly; only height / fill / rule differ.
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    backgroundColor: gray[25],
    borderBottomWidth: 1,
    borderBottomColor: gray[200],
  },
  headerText: {
    ...typo.label,
    color: gray[500],
  },
  emptyWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  empty: {
    ...typo.bodySm,
    color: gray[500],
  },
});
