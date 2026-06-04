import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gray, spacing, type as typo } from '@/theme';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { FranchiseMark } from '@/components/FranchiseMark';
import { Label } from '@/components/Label';
import { LiveDot } from '@/components/LiveDot';
import { MatchupCard } from '@/components/MatchupCard';
import { Mono } from '@/components/Mono';
import { PositionBadge } from '@/components/PositionBadge';
import { Section } from '@/components/Section';
import { Stack } from '@/components/Stack';
import { TransactionRow } from '@/components/TransactionRow';
import {
  CURRENT_WEEK_NUMBER,
  computePlayerPoints,
  computeStandings,
  describeTransaction,
  FRANCHISE_IDS,
  getFranchiseIdentity,
  getRosterByFranchise,
  league,
  LEAGUE_ID,
  matchups,
  tierLabel,
  transactions,
  type MatchupStatus,
  type StandingsRow,
} from '@/data';

// LeagueHome — the league surface (Navigation "League Home",
// /:leagueSlug/league/home). Mixed mood (Wireframes §3): league-neutral, no
// single franchise's colors dominate — a compact league header over a vertical
// stack of module Sections (this-week matchups → standings → recent activity →
// top performers), in the Wireframes §3.2 mobile stacking order, all sourced
// from the normalized fixture via derive helpers. Composes the built
// design-system components unmodified (placeholder UI — visual refinement comes
// later). Spec: Wireframes §3 (no Screen_LeagueHome.md yet).
//
// Module framing: Wireframes §3 calls the body "a grid of Cards," but per the
// Placeholder Render Convention §2 the two-column desktop grid is a responsive
// refinement deferred to the design pass — the mobile single-column placeholder
// uses titled Sections (matching FranchiseHome), and the card-bearing children
// (MatchupCard) bring their own elevation.
//
// Viewer context: an optional viewerFranchiseId (the logged-in owner's
// franchise) lifts that owner's matchup to the top of the list and tints their
// standings row. When absent the screen is fully league-neutral — nothing is
// highlighted.
//
// Outbound navigation is delivered as optional callbacks. Until the league
// route shell exists, callers (the preview) leave them undefined, so the
// affordances render but the press is a no-op — stubbed, not wired (flagged in
// BUILD_STATUS).
//
// Blocks deferred for missing fixture data (Wireframes §3 modules with no
// backing entity yet): Lineup Deadline Countdown (no lineup-lock timestamp),
// League Chat Preview (no chat entity), Active Poll (no poll entity), Power
// Rankings (no power-ranking model — its trend arrows need prior-week ranks).
// Also deferred: the §3.4 Dynasty cap-room standings column and the per-matchup
// win-probability bar (no win-probability model). Add as those areas land.

type LeagueHomeProps = {
  leagueId?: string;
  /** The logged-in owner's franchise — highlights their matchup + standings
   *  row. Optional; omitted → fully league-neutral, nothing highlighted. */
  viewerFranchiseId?: string;
  // Outbound links the League Home calls for. Stubbed (undefined) until the
  // league route shell is in place.
  onViewMatchup?: (matchupId: string) => void;
  onViewStandings?: () => void;
  onViewActivity?: () => void;
};

// Mock MatchupStatus → MatchupCard status prop (mirrors FranchiseHome). VOIDED
// displays as 'final'.
const STATUS_MAP: Record<MatchupStatus, 'live' | 'final' | 'upcoming'> = {
  IN_PROGRESS: 'live',
  COMPLETED: 'final',
  SCHEDULED: 'upcoming',
  VOIDED: 'final',
};

const TOP_PERFORMER_COUNT = 5;
const RECENT_ACTIVITY_COUNT = 10;

// ─── STANDINGS COLUMN CONFIG — single source of truth for the table layout ────
// The compact League Home standings card (Wireframes §3 block 2b): Rank,
// Franchise (mark + name), W-L-T, PF, PA, Streak. This one array feeds DataTable
// twice — `columns` drives the header (DataTable owns it; no hand-rolled header
// per the Placeholder Render Convention §3) and `render` draws each body cell in
// `renderRow` — so the header and rows share a single source and can't drift.
// Widths mirror the Standings screen (they fit the longest name at 390px); tune
// geometry here only. `width` is the sanctioned table-geometry px exception (§1).
type StandingsColumn = DataTableColumn<StandingsRow> & {
  render: (e: StandingsRow) => ReactNode;
};

const STANDINGS_COLUMNS: StandingsColumn[] = [
  {
    key: 'rank',
    label: '#',
    width: 22,
    align: 'right',
    render: (e) => <Text style={styles.num}>{e.rank}</Text>,
  },
  {
    key: 'franchise',
    label: 'Franchise',
    render: (e) => {
      const franchise = getFranchiseIdentity(e.franchiseId);
      return (
        <View style={styles.franchiseCell}>
          {franchise ? <FranchiseMark franchise={franchise} size={20} /> : null}
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
    width: 40,
    align: 'right',
    // Always show ties (e.g. "8-2-0") — never special-case zero.
    render: (e) => (
      <Text style={styles.num}>{`${e.wins}-${e.losses}-${e.ties}`}</Text>
    ),
  },
  {
    key: 'pointsFor',
    label: 'PF',
    width: 44,
    align: 'right',
    render: (e) => <Text style={styles.num}>{e.pointsFor.toFixed(1)}</Text>,
  },
  {
    key: 'pointsAgainst',
    label: 'PA',
    width: 44,
    align: 'right',
    render: (e) => <Text style={styles.num}>{e.pointsAgainst.toFixed(1)}</Text>,
  },
  {
    key: 'streak',
    label: 'STRK',
    width: 30,
    align: 'right',
    render: (e) => <Text style={styles.num}>{e.streak}</Text>,
  },
];

export function LeagueHome({
  leagueId = LEAGUE_ID,
  viewerFranchiseId,
  onViewMatchup,
  onViewStandings,
  onViewActivity,
}: LeagueHomeProps) {
  // ── This week's matchups — every game in the current week. The viewer's own
  //    matchup is lifted to the top (Wireframes §3 block 2a "owner's own matchup
  //    highlighted … or top placement"); otherwise schedule order is preserved.
  const involvesViewer = (m: (typeof matchups)[number]): boolean =>
    viewerFranchiseId != null &&
    (m.homeFranchiseId === viewerFranchiseId ||
      m.awayFranchiseId === viewerFranchiseId);

  const weekMatchups = matchups
    .filter((m) => m.leagueId === leagueId && m.week === CURRENT_WEEK_NUMBER)
    .sort((a, b) => Number(involvesViewer(b)) - Number(involvesViewer(a)));

  const gamesInProgress = weekMatchups.some((m) => m.status === 'IN_PROGRESS');

  // ── Standings — full league, rank order (8 franchises fit the compact card).
  const standings = computeStandings(leagueId);

  // ── Recent activity — last N transactions across the whole league, newest
  //    first. Each row carries the initiating franchise's color dot (league-wide
  //    feed, unlike FranchiseHome which omits it — every row is one franchise).
  const recentActivity = [...transactions]
    .filter((t) => t.leagueId === leagueId)
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .slice(0, RECENT_ACTIVITY_COUNT);

  // ── Top performers — highest-scoring rostered players this (live) week across
  //    every franchise. Computed on read: flatten all rosters, score each player
  //    for the current week, take the top N. Franchise attribution is kept so
  //    the league-wide list can show whose player it is.
  const topPerformers = FRANCHISE_IDS.flatMap((franchiseId) =>
    getRosterByFranchise(franchiseId).map((row) => ({
      franchiseId,
      player: row.player,
      weekPoints: computePlayerPoints(row.player.id, CURRENT_WEEK_NUMBER),
    })),
  )
    .sort((a, b) => b.weekPoints - a.weekPoints)
    .slice(0, TOP_PERFORMER_COUNT);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1 · League header — league-neutral identity: name, season/week, tier,
            and a live indicator when games are in progress. No franchise colors
            (Wireframes §3 block 1). */}
        <View style={styles.header}>
          <Text style={styles.leagueName} numberOfLines={1}>
            {league.name}
          </Text>
          <View style={styles.headerMeta}>
            <Mono>{`${league.seasonYear} SEASON · WEEK ${CURRENT_WEEK_NUMBER}`}</Mono>
            <Mono color={gray[400]}>{tierLabel()}</Mono>
          </View>
          {gamesInProgress ? (
            <View style={styles.liveRow}>
              <LiveDot size={8} />
              <Label size="sm">Games in progress</Label>
            </View>
          ) : null}
        </View>

        <View style={styles.regions}>
          {/* 2 · This week's matchups — every game this week, each pressable
              through to the Matchup screen. Compact cards read as a list. */}
          <Section title={`Week ${CURRENT_WEEK_NUMBER} Matchups`}>
            {weekMatchups.length > 0 ? (
              <Stack gap={spacing.md}>
                {weekMatchups.map((m) => {
                  // awayFranchiseId is nullable (bye weeks) — skip a matchup
                  // that can't resolve both sides.
                  const away = m.awayFranchiseId
                    ? getFranchiseIdentity(m.awayFranchiseId)
                    : undefined;
                  const home = getFranchiseIdentity(m.homeFranchiseId);
                  if (!away || !home) return null;
                  return (
                    <MatchupCard
                      key={m.id}
                      awayTeam={{ franchise: away, score: (m.awayScore ?? 0).toFixed(2) }}
                      homeTeam={{ franchise: home, score: (m.homeScore ?? 0).toFixed(2) }}
                      weekNumber={m.week}
                      status={STATUS_MAP[m.status]}
                      variant="compact"
                      onPress={onViewMatchup ? () => onViewMatchup(m.id) : undefined}
                    />
                  );
                })}
              </Stack>
            ) : (
              <Text style={styles.empty}>No matchups this week</Text>
            )}
          </Section>

          {/* 3 · Standings — full league, rank order; the viewer's row is tinted.
              DataTable owns the header (compact, no density toggle); rows render
              through renderRow off the SAME column config. The table bleeds to
              full width so the header fill and the viewer-row tint reach both
              screen edges and DataTable's own md gutter sets the inset (matching
              the Standings screen). Cap-room column (§3.4 Dynasty) deferred to
              the cap surface. */}
          <Section
            title="Standings"
            action={<LinkAction label="Full Standings" onPress={onViewStandings} />}
          >
            {standings.length > 0 ? (
              <View style={styles.tableBleed}>
                <DataTable<StandingsRow>
                  columns={STANDINGS_COLUMNS}
                  data={standings}
                  density="compact"
                  showDensityToggle={false}
                  renderRow={(entry) => (
                    <View
                      style={[
                        styles.row,
                        entry.franchiseId === viewerFranchiseId && styles.viewerRow,
                      ]}
                    >
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

          {/* 4 · Recent activity — last 10 transactions league-wide, newest
              first, each with the initiating franchise's color dot. */}
          <Section
            title="Recent Activity"
            action={<LinkAction label="View All" onPress={onViewActivity} />}
          >
            {recentActivity.length > 0 ? (
              recentActivity.map((tx) => {
                const franchise = tx.initiatedByFranchiseId
                  ? getFranchiseIdentity(tx.initiatedByFranchiseId)
                  : undefined;
                return (
                  <TransactionRow
                    key={tx.id}
                    type={tx.type}
                    description={describeTransaction(tx)}
                    timestamp={tx.occurredAt}
                    franchise={
                      franchise
                        ? {
                            abbreviation: franchise.abbreviation,
                            primaryColor: franchise.primaryColor,
                          }
                        : undefined
                    }
                  />
                );
              })
            ) : (
              <Text style={styles.empty}>No recent activity</Text>
            )}
          </Section>

          {/* 5 · Top performers — highest-scoring players this week, league-wide
              (Wireframes §3 block 2h): rank, position, player, franchise, pts. */}
          <Section title={`Top Performers · Week ${CURRENT_WEEK_NUMBER}`}>
            {topPerformers.length > 0 ? (
              <View>
                {topPerformers.map((p, i) => {
                  const franchise = getFranchiseIdentity(p.franchiseId);
                  return (
                    <View key={p.player.id} style={styles.performerRow}>
                      <Text style={styles.performerRank}>{i + 1}</Text>
                      <PositionBadge position={p.player.position} size="sm" />
                      <View style={styles.performerNameWrap}>
                        <Text style={styles.performerName} numberOfLines={1}>
                          {p.player.fullName}
                        </Text>
                      </View>
                      {franchise ? (
                        <FranchiseMark franchise={franchise} size={16} />
                      ) : null}
                      <Text style={styles.performerPts}>
                        {p.weekPoints.toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.empty}>No scores yet</Text>
            )}
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── action affordance (placeholder UI) ──────────────────────────────────────
// No Button component is specced yet, so this mirrors FranchiseHome's minimal
// token-built text link for the Sections' "View …" affordances; it gets
// replaced when the design system's LinkAction lands. Pressing a stubbed
// (undefined) handler is a no-op.
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: gray[0],
  },
  scrollContent: {
    // Header sits full-bleed; regions below get the page gutter.
    paddingBottom: spacing.lg,
  },

  // league header — full-width, league-neutral. Bottom rule anchors it over the
  // module stack (mirrors RosterView's context bar).
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: gray[200],
    gap: spacing.sm,
  },
  // League name: Barlow Condensed display scale (Wireframes §3 "display weight"),
  // weight carried by the family — no separate fontWeight (DESIGN.md).
  leagueName: {
    ...typo.displaySm,
    color: gray[900],
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  // Modules 2–5 sit in a spacing.lg gutter with spacing.lg rhythm between them.
  regions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },

  // ── standings table ──
  // Cancels the region's lg gutter so the DataTable spans edge-to-edge; the
  // header's and rows' internal md padding then becomes the table gutter
  // (matches the Standings screen, so the viewer-row tint bleeds to both edges).
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
  // The viewer's own standings row — subtle gray-25 fill (the same token the
  // DataTable header uses), so "my row" reads without a custom emphasis color.
  viewerRow: {
    backgroundColor: gray[25],
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
    alignSelf: 'stretch',
    minWidth: 0,
  },
  franchiseNameWrap: {
    flex: 1,
    minWidth: 0,
  },
  franchiseName: {
    ...typo.data,
    color: gray[900],
  },
  num: {
    ...typo.dataSm,
    color: gray[900],
  },

  // ── top performers ──
  performerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: gray[100],
  },
  performerRank: {
    ...typo.dataSm,
    color: gray[400],
    width: 16,
    textAlign: 'right',
  },
  performerNameWrap: {
    flex: 1,
    minWidth: 0,
  },
  performerName: {
    ...typo.data,
    color: gray[900],
  },
  performerPts: {
    ...typo.dataSm,
    color: gray[900],
    width: 56,
    textAlign: 'right',
  },

  empty: {
    ...typo.bodySm,
    color: gray[500],
  },

  // text link affordance — Section actions ("View …"). Barlow label scale in
  // gray-600; dims on press.
  link: {
    ...typo.bodyXs,
    color: gray[600],
  },
  linkPressed: {
    color: gray[400],
  },
});
