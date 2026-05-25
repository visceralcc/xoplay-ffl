import { StyleSheet, View } from 'react-native';
import { gray, onColor, radius, safeBlock, spacing } from '@/theme';
import { FranchiseMark } from './FranchiseMark';
import { Label } from './Label';
import { LiveDot } from './LiveDot';
import { ScoreNum } from './ScoreNum';

// One franchise's score block — the score number framed by franchise
// identity. ScoreDisplay wraps a ScoreNum inside a franchise-colored block
// with the franchise name and mark. MatchupCard composes two of these side
// by side. Spec: specs/foundation/components/Component_ScoreDisplay.md and
// Spec_DesignSystem.md §8.5 (franchise block treatment).
//
// Text contrast comes from onColor() — never hardcode white/black. Near-
// white franchise blocks get a 1px gray-300 border per §8.4 so they don't
// vanish on white card surfaces; near-dark blocks don't need one. The
// muting on the losing side is on the *content* (name + score opacity 0.7),
// not the container — the franchise block itself stays full-bleed.

type ScoreSize = 'sm' | 'md' | 'lg' | 'xl';
type Layout = 'compact' | 'full';

type FranchiseInput = {
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
};

type ScoreDisplayProps = {
  franchise: FranchiseInput;
  score: string;
  isWinning?: boolean;
  isLive?: boolean;
  scoreSize?: ScoreSize;
  layout?: Layout;
};

const MIN_WIDTH_FULL = 120;

export function ScoreDisplay({
  franchise,
  score,
  isWinning = false,
  isLive = false,
  scoreSize = 'md',
  layout = 'full',
}: ScoreDisplayProps) {
  const textColor = onColor(franchise.primaryColor);
  const safety = safeBlock(franchise.primaryColor);
  const borderStyle = safety.veryLight ? styles.veryLightBorder : null;
  const mutedStyle = isWinning ? null : styles.muted;

  if (layout === 'compact') {
    return (
      <View
        style={[
          styles.blockCompact,
          { backgroundColor: franchise.primaryColor },
          borderStyle,
        ]}
      >
        <View style={[styles.compactText, mutedStyle]}>
          <Label size="sm" color={textColor}>
            {franchise.abbreviation}
          </Label>
        </View>
        <View style={mutedStyle}>
          <ScoreNum value={score} size={scoreSize} color={textColor} />
        </View>
        {isLive ? <LiveDot size={6} /> : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.blockFull,
        { backgroundColor: franchise.primaryColor },
        borderStyle,
      ]}
    >
      <View style={[styles.headerRow, mutedStyle]}>
        <FranchiseMark franchise={franchise} size={24} />
        <View style={styles.nameWrap}>
          <Label color={textColor}>{franchise.name}</Label>
        </View>
      </View>
      <View style={[styles.scoreWrap, mutedStyle]}>
        <ScoreNum value={score} size={scoreSize} color={textColor} />
      </View>
      {isLive ? (
        <View style={styles.liveRow}>
          <LiveDot size={6} />
          <Label size="sm" color={textColor}>
            LIVE
          </Label>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blockFull: {
    borderRadius: radius.sm,
    padding: spacing.md,
    minWidth: MIN_WIDTH_FULL,
    gap: spacing.sm,
  },
  blockCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  veryLightBorder: {
    borderWidth: 1,
    borderColor: gray[300],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Name flexes so the franchise name truncates inside the block rather
  // than pushing the mark out — Label's numberOfLines={1} handles the clip.
  nameWrap: {
    flex: 1,
  },
  scoreWrap: {
    alignSelf: 'center',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
  },
  // Compact text wrap mirrors nameWrap — gives the abbreviation a left
  // anchor while the score sits to its right and the LiveDot trails.
  compactText: {
    flex: 1,
  },
  muted: {
    opacity: 0.7,
  },
});
