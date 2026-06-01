import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { gray, onColor, radius, spacing, type as typo } from '@/theme';
import { FranchiseHeader } from '@/components/FranchiseHeader';
import { MatchupCard } from '@/components/MatchupCard';
import { CapMeter } from '@/components/CapMeter';
import { Section } from '@/components/Section';
import { Stack } from '@/components/Stack';
import { StatValue } from '@/components/StatValue';
import { TransactionRow } from '@/components/TransactionRow';
import { PlayerRow, type ColumnDef } from '@/components/PlayerRow';
import {
  CURRENT_WEEK_NUMBER,
  capTracked,
  computeCapRoom,
  computeCapUsage,
  computeDivisionRecord,
  computePointsAgainst,
  computePointsFor,
  computeRecord,
  computeStreak,
  describeTransaction,
  effectiveCap,
  formatRecord,
  getFranchiseIdentity,
  getOwnerName,
  getStandingsRow,
  getStartersByFranchise,
  getTransactionsByFranchise,
  matchups,
  tierLabel,
  type MatchupStatus,
  type RosterRow,
} from '@/data';

// FranchiseHome — the interactive Franchise Overview screen (Navigation
// "Franchise Overview", /:leagueSlug/my-team and the read-only
// /:leagueSlug/franchise/:slug). Promotes the Batch-5 read-only composition to
// a live screen: masthead → quick-stat row → this-week matchup → roster summary
// → tier-gated cap snapshot → recent activity, in the Wireframes §1.2 mobile
// stacking order, all sourced from the normalized fixture via derive helpers.
// Composes the built design-system components unmodified (placeholder UI —
// visual refinement comes later). Spec: specs/franchise/Spec_FranchiseScreens.md,
// specs/franchise/screens/Screen_FranchiseHome.md.
//
// Owner vs. visitor follows the "hide, don't disable" rule (Spec
// "Interaction patterns"): on /my-team (isOwner) the owner action affordances
// render; on /franchise/:slug they are HIDDEN — not greyed — and the single
// visitor affordance "Propose Trade" appears instead.
//
// Outbound navigation is delivered as optional callbacks. Until the franchise
// route shell / FranchiseSectionNav exists, callers (the preview) leave them
// undefined, so the affordances render but the press is a no-op — the links are
// stubbed, not wired (flagged in BUILD_STATUS).

type FranchiseHomeProps = {
  franchiseId: string;
  /** /my-team → true (own team, action affordances shown); /franchise/:slug →
   *  false (read-only visitor view, owner actions hidden). Defaults to true. */
  isOwner?: boolean;
  // Outbound links the Overview calls for (consumption screen → operational
  // screens). Stubbed (undefined) until the route shell is in place.
  onViewMatchup?: () => void;
  onViewRoster?: () => void;
  onViewCap?: () => void;
  onViewActivity?: () => void;
  // Owner action (hidden for visitors).
  onSetLineup?: () => void;
  // The one visitor affordance (hidden for the owner).
  onProposeTrade?: () => void;
};

// Mock MatchupStatus → MatchupCard status prop (Spec "Status mapping").
// VOIDED is displayed as 'final'.
const STATUS_MAP: Record<MatchupStatus, 'live' | 'final' | 'upcoming'> = {
  IN_PROGRESS: 'live',
  COMPLETED: 'final',
  SCHEDULED: 'upcoming',
  VOIDED: 'final',
};

// Roster-summary table is starters only, slimmed to the Wireframes §1 (3b)
// column set — POS, Player (+ NFL team), injury, last-week points. The full
// roster table (salary, contracts, all buckets) lives on the Roster screen,
// which this block links out to.
const STARTER_COLUMNS: ColumnDef[] = [
  { key: 'position', label: 'POS', width: 36 },
  { key: 'nameTeam', label: 'Player' },
  { key: 'injury', label: '', width: 16 },
  { key: 'weekScore', label: 'Wk', width: 52, align: 'right' },
];

const money = (n: number) => `$${n.toFixed(2)}`;

// 1 → "1st", 2 → "2nd", 11 → "11th". Standings position for the quick-stat row.
function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function FranchiseHome({
  franchiseId,
  isOwner = true,
  onViewMatchup,
  onViewRoster,
  onViewCap,
  onViewActivity,
  onSetLineup,
  onProposeTrade,
}: FranchiseHomeProps) {
  const franchise = getFranchiseIdentity(franchiseId);

  if (!franchise) {
    return (
      <View style={styles.screen}>
        <Text style={styles.empty}>Franchise not found.</Text>
      </View>
    );
  }

  const showCap = capTracked();

  // Current-week matchup for this franchise (Spec "Current matchup lookup").
  // Both sides resolve to identities so MatchupCard renders away-left /
  // home-right straight from the record.
  const matchup = matchups.find(
    (m) =>
      m.week === CURRENT_WEEK_NUMBER &&
      (m.homeFranchiseId === franchiseId || m.awayFranchiseId === franchiseId),
  );
  const awayFranchise = matchup?.awayFranchiseId
    ? getFranchiseIdentity(matchup.awayFranchiseId)
    : undefined;
  const homeFranchise = matchup
    ? getFranchiseIdentity(matchup.homeFranchiseId)
    : undefined;
  const hasMatchup = matchup && awayFranchise && homeFranchise;

  const starters = getStartersByFranchise(franchiseId);

  // Last 10 transactions for this franchise, newest first (Nav §6.1). Helper
  // already sorts newest-first; cap to the feed length here.
  const recentTransactions = getTransactionsByFranchise(franchiseId).slice(0, 10);

  const standingsRow = getStandingsRow(franchiseId);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1 · Masthead — identity, owner, record + division record. PF/PA/
            streak live in the quick-stat row below, not the masthead. */}
        <FranchiseHeader
          franchise={franchise}
          ownerName={getOwnerName(franchiseId)}
          record={formatRecord(computeRecord(franchiseId))}
          divisionRecord={`${formatRecord(computeDivisionRecord(franchiseId))} DIV`}
          tierLabel={tierLabel()}
        />

        <View style={styles.regions}>
          {/* 2 · Quick-stat row — PF, PA, streak, standings position; cap room
              and usage added in cap tiers (Wireframes §1, block 2). */}
          <Stack direction="horizontal" gap={spacing.xl} wrap>
            <StatValue
              label="PF"
              value={computePointsFor(franchiseId).toFixed(2)}
              size="sm"
            />
            <StatValue
              label="PA"
              value={computePointsAgainst(franchiseId).toFixed(2)}
              size="sm"
            />
            <StatValue label="Streak" value={computeStreak(franchiseId)} size="sm" />
            <StatValue
              label="Rank"
              value={standingsRow ? ordinal(standingsRow.rank) : '—'}
              size="sm"
            />
            {showCap ? (
              <>
                <StatValue
                  label="Cap Room"
                  value={money(computeCapRoom(franchiseId))}
                  size="sm"
                />
                <StatValue
                  label="Cap Usage"
                  value={`${(
                    (computeCapUsage(franchiseId) / effectiveCap(franchiseId)) *
                    100
                  ).toFixed(1)}%`}
                  size="sm"
                />
              </>
            ) : null}
          </Stack>

          {/* Visitor-only affordance — scout, then deal (Spec §"Interaction
              patterns"). Hidden for the owner. */}
          {!isOwner ? (
            <ActionButton label="Propose Trade" onPress={onProposeTrade} />
          ) : null}

          {/* 3 · This Week — current matchup, pressable through to the Matchup
              screen. */}
          <Section
            title="This Week"
            action={<LinkAction label="View Matchup" onPress={onViewMatchup} />}
          >
            {hasMatchup ? (
              <MatchupCard
                awayTeam={{
                  franchise: awayFranchise,
                  score: (matchup.awayScore ?? 0).toFixed(2),
                }}
                homeTeam={{
                  franchise: homeFranchise,
                  score: (matchup.homeScore ?? 0).toFixed(2),
                }}
                weekNumber={matchup.week}
                status={STATUS_MAP[matchup.status]}
                onPress={onViewMatchup}
              />
            ) : (
              <Text style={styles.empty}>No matchup this week</Text>
            )}
          </Section>

          {/* 4 · Roster summary — starters only; links out to the full Roster
              screen. Owner gets the "Set Lineup" entry point beneath. */}
          <Section
            title="Roster"
            action={<LinkAction label="View Full Roster" onPress={onViewRoster} />}
          >
            {starters.length > 0 ? (
              <View>
                {starters.map((row: RosterRow) => (
                  <PlayerRow
                    key={row.player.id}
                    row={row}
                    density="compact"
                    columns={STARTER_COLUMNS}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.empty}>No starters set</Text>
            )}
            {isOwner ? (
              <View style={styles.rosterAction}>
                <ActionButton label="Set Lineup" onPress={onSetLineup} />
              </View>
            ) : null}
          </Section>

          {/* 5 · Cap snapshot — tier-gated (Dynasty always, Keeper if
              trackSalaries, hidden in Redraft). Region removed entirely, not
              greyed, when not cap-tracked. */}
          {showCap ? (
            <Section
              title="Salary Cap"
              action={<LinkAction label="View Cap Details" onPress={onViewCap} />}
            >
              <CapMeter
                capUsed={computeCapUsage(franchiseId)}
                capTotal={effectiveCap(franchiseId)}
                size="md"
              />
            </Section>
          ) : null}

          {/* 6 · Recent activity — last 10 transactions, newest first. Franchise
              color dot omitted: every row belongs to the viewed franchise, so
              the dot carries no signal (Spec "Transaction feed"). */}
          <Section
            title="Recent Activity"
            action={<LinkAction label="View All" onPress={onViewActivity} />}
          >
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  type={tx.type}
                  description={describeTransaction(tx)}
                  timestamp={tx.occurredAt}
                />
              ))
            ) : (
              <Text style={styles.empty}>No recent activity</Text>
            )}
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── action affordances (placeholder UI) ─────────────────────────────────────
// No Button component is specced yet, so these are minimal token-built
// placeholders for the Overview's affordances; they get replaced when the
// design system's Button/LinkAction land. Pressing a stubbed (undefined)
// handler is a no-op.

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

function ActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      {({ pressed }) => (
        <Text style={[styles.buttonText, pressed && styles.buttonTextPressed]}>
          {label}
        </Text>
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
    // Masthead sits full-bleed; regions below get the page gutter.
    paddingBottom: spacing.lg,
  },
  // Regions 2–6 sit in a spacing.lg horizontal gutter with spacing.lg vertical
  // rhythm between them.
  regions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  rosterAction: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  empty: {
    ...typo.bodySm,
    color: gray[500],
  },
  // Text link affordance — Section actions ("View …"). Barlow label scale in
  // gray-600; dims on press.
  link: {
    ...typo.bodyXs,
    color: gray[600],
  },
  linkPressed: {
    color: gray[400],
  },
  // Primary action placeholder — dark fill, onColor text.
  button: {
    alignSelf: 'flex-start',
    backgroundColor: gray[900],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  buttonText: {
    ...typo.label,
    color: onColor(gray[900]),
  },
  buttonTextPressed: {
    opacity: 0.7,
  },
});
