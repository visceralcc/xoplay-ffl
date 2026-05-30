import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { gray, spacing, type as typo } from '@/theme';
import { FranchiseHeader } from '@/components/FranchiseHeader';
import { SegmentControl } from '@/components/SegmentControl';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { PlayerRow, type ColumnDef } from '@/components/PlayerRow';
import {
  getFranchiseById,
  getPlayersByFranchise,
  type Player,
  type RosterBucket,
} from '@/data/mockData';

// RosterView — Batch 5 screen composition for the roster surface
// (Navigation "Roster Management", /:leagueSlug/my-team/roster). Read-only:
// franchise masthead, an Active/IR/Taxi segment control with per-bucket
// counts, and a roster table filtered to the selected bucket. Composes the
// existing design-system components unmodified. Spec:
// specs/roster/screens/Screen_RosterView.md.

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

// Dynasty (cap-tracking) compact column set for the 390px phone frame — the
// reduced six-column layout the spec specifies, not PlayerRow's wide
// eight-column default. DataTable header and PlayerRow body share this one
// array so the columns line up.
const ROSTER_COLUMNS: ColumnDef[] = [
  { key: 'position', label: 'POS', width: 36 },
  { key: 'headshot', label: '', width: 28 },
  { key: 'nameTeam', label: 'Player' },
  { key: 'injury', label: '', width: 16 },
  { key: 'salary', label: 'Sal', width: 56, align: 'right' },
  { key: 'seasonTotal', label: 'Total', width: 60, align: 'right' },
];

export function RosterView({ franchiseId }: RosterViewProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const franchise = getFranchiseById(franchiseId);
  const roster = getPlayersByFranchise(franchiseId);

  if (!franchise) {
    return (
      <View style={styles.screen}>
        <Text style={styles.empty}>Franchise not found.</Text>
      </View>
    );
  }

  // Counts render for every segment, including empty buckets (shows "0").
  const segments = SEGMENTS.map(
    ({ label, bucket }) =>
      `${label} ${roster.filter((p) => p.rosterBucket === bucket).length}`,
  );

  const selected = SEGMENTS[activeIndex];
  const bucketPlayers = roster.filter((p) => p.rosterBucket === selected.bucket);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FranchiseHeader
          franchise={franchise}
          ownerName={franchise.ownerName}
          record={franchise.record}
          tierLabel="DYNASTY · SALARY · CONTRACT"
          pointsFor={franchise.pointsFor.toFixed(2)}
          pointsAgainst={franchise.pointsAgainst.toFixed(2)}
        />

        <View style={styles.controls}>
          <SegmentControl
            segments={segments}
            activeIndex={activeIndex}
            onChangeIndex={setActiveIndex}
          />
        </View>

        {bucketPlayers.length > 0 ? (
          <DataTable<Player>
            columns={ROSTER_COLUMNS as DataTableColumn<Player>[]}
            data={bucketPlayers}
            density="compact"
            showDensityToggle={false}
            renderRow={(player) => (
              <PlayerRow
                player={player}
                density="compact"
                columns={ROSTER_COLUMNS}
              />
            )}
          />
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
  emptyWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  empty: {
    ...typo.bodySm,
    color: gray[500],
  },
});
