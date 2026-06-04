import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gray, spacing, type as typo } from '@/theme';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Label } from '@/components/Label';
import { MatchupCard } from '@/components/MatchupCard';
import { PlayerRow, type ColumnDef } from '@/components/PlayerRow';
import { Section } from '@/components/Section';
import { Stack } from '@/components/Stack';
import {
  CURRENT_WEEK_NUMBER,
  getFranchiseIdentity,
  getLineupForMatchup,
  getPlayerById,
  matchups,
  type FranchiseIdentity,
  type LineupEntry,
  type MatchupStatus,
  type Player,
  type RosterRow,
} from '@/data';

// Matchup — the Current Matchup surface (Navigation "Current Matchup",
// /:leagueSlug/my-team/matchup and the read-only /franchise/:slug/matchup).
// A read-only head-to-head composition: a MatchupCard summary over the two
// franchises' starting lineups as stacked DataTables (away-then-home), each
// row a PlayerRow identity cell + the lineup entry's stored fantasyPoints.
// Composes the built design-system components unmodified (placeholder UI —
// visual refinement comes later). Spec: specs/franchise/screens/Screen_Matchup.md.
//
// No FranchiseHeader masthead — a matchup is a two-franchise surface, not a
// single-franchise identity surface, so the MatchupCard is the lead element.
//
// Two stacked lineup tables, NOT a paired/slot-by-slot comparison row — the
// aligned head-to-head layout is deferred (it would need a new comparison-row
// component, which placeholder mode does not introduce). Per-rule scoring
// breakdown, win probability, live refresh, bench, and week navigation are all
// out of scope (Screen_Matchup §"Out of scope").
//
// Totals come from the STORED Matchup.homeScore / awayScore — the screen does
// not re-sum the lineup for the headline. Per-player points come from each
// LineupEntry's stored fantasyPoints (a real field the scoring engine writes),
// not recomputed here; null renders "—" (checked === null, so a real 0.0 shows
// "0.0").

type MatchupProps = {
  /** The subject franchise — resolves which matchup is shown. */
  franchiseId: string;
  /** Defaults to the fixture's current week. A week parameter is accepted so a
   *  later build (and the preview's empty-state toggle) can drive the resolve. */
  week?: number;
  /** The logged-in owner's franchise — subtly marks the matching side's lineup
   *  section ("YOUR TEAM"). Optional; omitted → neither side marked. */
  viewerFranchiseId?: string;
  /** Owner affordance, shown only on the viewer's own side. Stubbed (undefined)
   *  until the route shell exists — renders but the press is a no-op. */
  onSetLineup?: () => void;
};

// Mock MatchupStatus → MatchupCard status prop (mirrors FranchiseHome /
// LeagueHome). VOIDED displays as 'final'.
const STATUS_MAP: Record<MatchupStatus, 'live' | 'final' | 'upcoming'> = {
  IN_PROGRESS: 'live',
  COMPLETED: 'final',
  SCHEDULED: 'upcoming',
  VOIDED: 'final',
};

// ─── LINEUP TABLE COLUMN CONFIG — drives DataTable's header ───────────────────
// Slim phone set (Screen_Matchup §"Column set"): player (flex identity cell) +
// points. Position, NFL team, and injury live INSIDE the PlayerRow identity cell
// (as on RosterView), not as separate columns, so the table stays readable at
// 390px. `width` is the sanctioned table-geometry px exception (§1).
const POINTS_COL_WIDTH = 56;

const LINEUP_COLUMNS: DataTableColumn<LineupEntry>[] = [
  { key: 'player', label: 'Player' }, // flex
  { key: 'points', label: 'Pts', width: POINTS_COL_WIDTH, align: 'right' },
];

// The identity columns PlayerRow renders inside the flex "player" cell — compact
// phone set with the headshot dropped, exactly as RosterView does. Widths match
// RosterView so the two screens read the same.
const IDENTITY_COLUMNS: ColumnDef[] = [
  { key: 'position', label: 'POS', width: 34 },
  { key: 'nameTeam', label: 'Player' }, // flex — absorbs leftover width
  { key: 'injury', label: '', width: 16 },
];

// Minimal RosterRow for PlayerRow's identity columns (position / nameTeam /
// injury). PlayerRow's numeric + contract cells aren't rendered here, so those
// fields carry inert defaults — per-player points come from the LineupEntry's
// stored fantasyPoints in a separate cell, never from this row.
function toStarterRow(player: Player): RosterRow {
  return {
    player,
    contract: null,
    bucket: 'ACTIVE',
    injuryStatus: player.injuryStatus,
    seasonPoints: 0,
    lastWeekPoints: 0,
  };
}

export function Matchup({
  franchiseId,
  week = CURRENT_WEEK_NUMBER,
  viewerFranchiseId,
  onSetLineup,
}: MatchupProps) {
  // Resolve the franchise's matchup for the week — the same access pattern
  // FranchiseHome's "This Week" and LeagueHome's matchups use (filter by week +
  // the franchise on either side).
  const matchup = matchups.find(
    (m) =>
      m.week === week &&
      (m.homeFranchiseId === franchiseId || m.awayFranchiseId === franchiseId),
  );

  const awayId = matchup?.awayFranchiseId ?? null;
  const homeId = matchup?.homeFranchiseId ?? null;
  const away = awayId ? getFranchiseIdentity(awayId) : undefined;
  const home = homeId ? getFranchiseIdentity(homeId) : undefined;

  // No matchup (bye / offseason / resolve-miss) or an unresolvable side → a
  // single empty-state line in place of the whole body, not an empty card.
  if (!matchup || !awayId || !homeId || !away || !home) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.regions}>
            <Text style={styles.empty}>No matchup this week</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const awayStarters = getLineupForMatchup(matchup.id, awayId).filter(
    (e) => e.isStarter,
  );
  const homeStarters = getLineupForMatchup(matchup.id, homeId).filter(
    (e) => e.isStarter,
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1 · Matchup summary — head-to-head anchor (away-left / home-right),
            status-aware (LiveDot + live totals when IN_PROGRESS). Totals are the
            stored matchup scores; null scores render "—", not a fabricated
            projection. No franchise masthead. */}
        <View style={styles.summary}>
          <MatchupCard
            awayTeam={{ franchise: away, score: scoreText(matchup.awayScore) }}
            homeTeam={{ franchise: home, score: scoreText(matchup.homeScore) }}
            weekNumber={matchup.week}
            status={STATUS_MAP[matchup.status]}
          />
        </View>

        {/* 2 · Away lineup, then 3 · Home lineup — order stays away-then-home so
            it agrees with the card's away-left / home-right reading; the viewer's
            own side is subtly marked rather than reordered to the top. */}
        <View style={styles.regions}>
          <LineupSection
            identity={away}
            starters={awayStarters}
            isViewer={viewerFranchiseId === awayId}
            onSetLineup={onSetLineup}
          />
          <LineupSection
            identity={home}
            starters={homeStarters}
            isViewer={viewerFranchiseId === homeId}
            onSetLineup={onSetLineup}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── one franchise's lineup section ──────────────────────────────────────────
// Screen-internal composition (not a design-system component): a Section titled
// with the franchise name wrapping a DataTable of that side's starters. When
// this is the viewer's side, the title carries a subtle "YOUR TEAM" marker and,
// if onSetLineup is supplied, the stubbed "Set Lineup" affordance.
function LineupSection({
  identity,
  starters,
  isViewer,
  onSetLineup,
}: {
  identity: FranchiseIdentity;
  starters: LineupEntry[];
  isViewer: boolean;
  onSetLineup?: () => void;
}) {
  return (
    <Section
      title={identity.name}
      action={
        isViewer ? (
          <Stack direction="horizontal" gap={spacing.sm} align="center">
            <Label size="sm">Your team</Label>
            {onSetLineup ? (
              <LinkAction label="Set Lineup" onPress={onSetLineup} />
            ) : null}
          </Stack>
        ) : undefined
      }
    >
      {starters.length > 0 ? (
        <DataTable<LineupEntry>
          columns={LINEUP_COLUMNS}
          data={starters}
          density="compact"
          showDensityToggle={false}
          renderRow={(entry) => {
            const player = getPlayerById(entry.playerId);
            if (!player) return null;
            return (
              // Mirrors RosterView's row scaffold: PlayerRow renders the identity
              // cell in the flex region (its own md gutter + rule), and the
              // trailing points cell carries the matching rule + right gutter, so
              // the body cells sit under DataTable's "Player" / "Pts" header.
              <View style={styles.lineupRow}>
                <View style={styles.identityCell}>
                  <PlayerRow
                    row={toStarterRow(player)}
                    density="compact"
                    columns={IDENTITY_COLUMNS}
                  />
                </View>
                <View style={styles.pointsCell}>
                  <Text style={styles.points} numberOfLines={1}>
                    {entry.fantasyPoints === null
                      ? '—'
                      : entry.fantasyPoints.toFixed(1)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <Text style={styles.empty}>No starters set</Text>
      )}
    </Section>
  );
}

// ─── action affordance (placeholder UI) ──────────────────────────────────────
// No Button component is specced yet, so this mirrors FranchiseHome / LeagueHome's
// minimal token-built text link; it gets replaced when the design system's
// LinkAction lands. Pressing a stubbed (undefined) handler is a no-op.
function LinkAction({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={spacing.sm}>
      {({ pressed }) => (
        <Text style={[styles.link, pressed && styles.linkPressed]}>{label}</Text>
      )}
    </Pressable>
  );
}

// Stored matchup score → MatchupCard score string. Null (SCHEDULED / no line
// yet) renders "—" rather than a fabricated 0.00 or projection.
const scoreText = (s: number | null): string => (s === null ? '—' : s.toFixed(2));

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: gray[0],
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  // The summary card leads in the page gutter; the lineup regions follow with
  // the standard lg rhythm.
  summary: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  regions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },

  // ── lineup row scaffold ──
  // No outer padding: PlayerRow owns the left gutter (its md padding) and the
  // points cell owns the right gutter, so the body aligns under DataTable's
  // md-padded header.
  lineupRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  identityCell: {
    flex: 1,
    minWidth: 0,
  },
  // Trailing points cell. Width = the header's points column + the md right
  // gutter (carried as paddingRight) so the right-aligned value lands under the
  // "Pts" header label; the matching gray-100 rule continues PlayerRow's.
  pointsCell: {
    width: POINTS_COL_WIDTH + spacing.md,
    paddingRight: spacing.md,
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: gray[100],
  },
  // Points value: compact condensed data token (tabular-nums baked in), neutral
  // gray-900, right-aligned by the cell.
  points: {
    ...typo.dataSm,
    color: gray[900],
  },

  empty: {
    ...typo.bodySm,
    color: gray[500],
  },

  // text link affordance — the stubbed "Set Lineup". Barlow label scale in
  // gray-600; dims on press.
  link: {
    ...typo.bodyXs,
    color: gray[600],
  },
  linkPressed: {
    color: gray[400],
  },
});
