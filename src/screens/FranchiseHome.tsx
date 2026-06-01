import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { gray, spacing, type as typo } from '@/theme';
import { FranchiseHeader } from '@/components/FranchiseHeader';
import { MatchupCard } from '@/components/MatchupCard';
import { CapMeter } from '@/components/CapMeter';
import { Section } from '@/components/Section';
import { TransactionRow } from '@/components/TransactionRow';
import {
  CURRENT_WEEK_NUMBER,
  computeCapUsage,
  computePointsAgainst,
  computePointsFor,
  computeRecord,
  describeTransaction,
  effectiveCap,
  formatRecord,
  getFranchiseIdentity,
  getOwnerName,
  getTransactionsByFranchise,
  matchups,
  type MatchupStatus,
} from '@/data';

// FranchiseHome — Batch 5 screen composition for the Franchise Overview surface
// (Navigation "Franchise Home", /:leagueSlug/my-team). Read-only: franchise
// masthead, this week's MatchupCard, a tier-gated salary-cap snapshot, and a
// recent-activity feed. Sourced from the normalized fixture via derive helpers.
// Composes the existing design-system components unmodified. Spec:
// specs/franchise/screens/Screen_FranchiseHome.md.

type FranchiseHomeProps = {
  franchiseId: string;
};

// Mock MatchupStatus → MatchupCard status prop (Spec "Status mapping").
// VOIDED is displayed as 'final'.
const STATUS_MAP: Record<MatchupStatus, 'live' | 'final' | 'upcoming'> = {
  IN_PROGRESS: 'live',
  COMPLETED: 'final',
  SCHEDULED: 'upcoming',
  VOIDED: 'final',
};

export function FranchiseHome({ franchiseId }: FranchiseHomeProps) {
  const franchise = getFranchiseIdentity(franchiseId);

  if (!franchise) {
    return (
      <View style={styles.screen}>
        <Text style={styles.empty}>Franchise not found.</Text>
      </View>
    );
  }

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

  // This franchise's transactions, newest first (helper already sorts).
  const franchiseTransactions = getTransactionsByFranchise(franchiseId);

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

        <View style={styles.regions}>
          <Section title="This Week">
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
              />
            ) : (
              <Text style={styles.empty}>No matchup this week</Text>
            )}
          </Section>

          {/* Tier-gated: cap region renders for cap-tracking leagues (Dynasty
              always; Keeper if trackSalaries). Redraft would hide this section
              entirely. The preview is Dynasty, so it always renders here. */}
          <Section title="Salary Cap">
            <CapMeter
              capUsed={computeCapUsage(franchiseId)}
              capTotal={effectiveCap(franchiseId)}
              size="md"
            />
          </Section>

          <Section title="Recent Activity">
            {franchiseTransactions.length > 0 ? (
              // Franchise color dot omitted — every row belongs to the viewed
              // franchise, so the dot carries no signal (Spec "Transaction feed").
              franchiseTransactions.map((tx) => (
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: gray[0],
  },
  scrollContent: {
    // Masthead sits full-bleed; regions below get the page gutter.
    paddingBottom: spacing.lg,
  },
  // Regions 2–4 sit in a spacing.lg horizontal gutter with spacing.lg vertical
  // rhythm between them.
  regions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  empty: {
    ...typo.bodySm,
    color: gray[500],
  },
});
