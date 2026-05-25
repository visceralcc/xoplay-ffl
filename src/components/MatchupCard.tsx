import { Pressable, StyleSheet, View } from 'react-native';
import { gray, spacing } from '@/theme';
import { Card } from './Card';
import { Label } from './Label';
import { LiveDot } from './LiveDot';
import { Mono } from './Mono';
import { ScoreDisplay } from './ScoreDisplay';

// Two-franchise head-to-head matchup display — the emotional center of
// the product. Composes two ScoreDisplays inside a Card with shared
// matchup metadata (week number, status, projected/final label). Spec:
// specs/foundation/components/Component_MatchupCard.md.
//
// Side order is "away left, home right" per the spec. Winning side is
// determined by parsing the score strings and comparing — ties light up
// both sides as winning. When onPress is provided, the entire card is the
// tap target; pressed state shifts the card surface to gray-25.

type MatchupStatus = 'upcoming' | 'live' | 'final';
type Variant = 'standard' | 'compact';

type FranchiseInput = {
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
};

type Side = {
  franchise: FranchiseInput;
  score: string;
};

type MatchupCardProps = {
  homeTeam: Side;
  awayTeam: Side;
  weekNumber: number;
  status?: MatchupStatus;
  onPress?: () => void;
  variant?: Variant;
};

export function MatchupCard({
  homeTeam,
  awayTeam,
  weekNumber,
  status = 'upcoming',
  onPress,
  variant = 'standard',
}: MatchupCardProps) {
  const homeScore = parseFloat(homeTeam.score);
  const awayScore = parseFloat(awayTeam.score);
  // >= on both sides covers the tied case (both win) without a separate
  // equality branch — exactly as the spec prescribes.
  const homeIsWinning = homeScore >= awayScore;
  const awayIsWinning = awayScore >= homeScore;
  const isLive = status === 'live';

  const content =
    variant === 'standard' ? (
      <StandardContent
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        weekNumber={weekNumber}
        status={status}
        isLive={isLive}
        homeIsWinning={homeIsWinning}
        awayIsWinning={awayIsWinning}
      />
    ) : (
      <CompactContent
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        weekNumber={weekNumber}
        isLive={isLive}
        homeIsWinning={homeIsWinning}
        awayIsWinning={awayIsWinning}
      />
    );

  const cardPadding = variant === 'standard' ? spacing.lg : spacing.sm;

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {({ pressed }) => (
          <Card
            padding={cardPadding}
            backgroundColor={pressed ? gray[25] : gray[0]}
          >
            {content}
          </Card>
        )}
      </Pressable>
    );
  }

  return <Card padding={cardPadding}>{content}</Card>;
}

// ─── standard variant ────────────────────────────────────────────────────────

type StandardContentProps = {
  homeTeam: Side;
  awayTeam: Side;
  weekNumber: number;
  status: MatchupStatus;
  isLive: boolean;
  homeIsWinning: boolean;
  awayIsWinning: boolean;
};

function StandardContent({
  homeTeam,
  awayTeam,
  weekNumber,
  status,
  isLive,
  homeIsWinning,
  awayIsWinning,
}: StandardContentProps) {
  return (
    <View style={styles.standardRoot}>
      <View style={styles.metadataRow}>
        <Label size="sm">{`WEEK ${weekNumber}`}</Label>
        {isLive ? (
          <>
            <Label size="sm">·</Label>
            <LiveDot size={8} />
            <Label size="sm">LIVE</Label>
          </>
        ) : null}
      </View>

      <View style={styles.scoresRow}>
        <View style={styles.scoreCell}>
          <ScoreDisplay
            franchise={awayTeam.franchise}
            score={awayTeam.score}
            isLive={isLive}
            isWinning={awayIsWinning}
            scoreSize="lg"
            layout="full"
          />
        </View>
        <View style={styles.scoreCell}>
          <ScoreDisplay
            franchise={homeTeam.franchise}
            score={homeTeam.score}
            isLive={isLive}
            isWinning={homeIsWinning}
            scoreSize="lg"
            layout="full"
          />
        </View>
      </View>

      {isLive ? null : (
        <View style={styles.statusRow}>
          <Label>{status === 'final' ? 'FINAL' : 'PROJECTED'}</Label>
        </View>
      )}
    </View>
  );
}

// ─── compact variant ─────────────────────────────────────────────────────────

type CompactContentProps = {
  homeTeam: Side;
  awayTeam: Side;
  weekNumber: number;
  isLive: boolean;
  homeIsWinning: boolean;
  awayIsWinning: boolean;
};

function CompactContent({
  homeTeam,
  awayTeam,
  weekNumber,
  isLive,
  homeIsWinning,
  awayIsWinning,
}: CompactContentProps) {
  return (
    <View style={styles.compactRoot}>
      <Mono>{`WK ${weekNumber}`}</Mono>
      {isLive ? <LiveDot size={6} /> : null}
      <View style={styles.compactCell}>
        <ScoreDisplay
          franchise={awayTeam.franchise}
          score={awayTeam.score}
          isLive={isLive}
          isWinning={awayIsWinning}
          scoreSize="sm"
          layout="compact"
        />
      </View>
      <Label size="sm">–</Label>
      <View style={styles.compactCell}>
        <ScoreDisplay
          franchise={homeTeam.franchise}
          score={homeTeam.score}
          isLive={isLive}
          isWinning={homeIsWinning}
          scoreSize="sm"
          layout="compact"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  standardRoot: {
    gap: spacing.md,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  scoresRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // Equal-width score cells so the two ScoreDisplays divvy the card
  // width regardless of franchise name length or score magnitude.
  scoreCell: {
    flex: 1,
  },
  statusRow: {
    alignItems: 'center',
  },

  compactRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // flex: 1 on each compact cell lets the franchise blocks split the
  // remaining row width after the week label and dash separator.
  compactCell: {
    flex: 1,
  },
});
