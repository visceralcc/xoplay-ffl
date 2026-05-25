import { StyleSheet, Text } from 'react-native';
import { fontFamily, gray } from '@/theme';

// Large formatted score number. The typographic centerpiece of matchup
// displays. Pure display primitive — no opinion about context, franchise
// colors, or layout (ScoreDisplay handles that). Spec:
// specs/foundation/components/Component_ScoreNum.md.
//
// Barlow Condensed 700 at all four sizes with tabular-nums + tight tracking
// + tight leading (fontSize × 0.9) so the digits sit snugly within the
// franchise-colored block. The font family encodes the weight, so consumers
// must not pass fontWeight (would miss the @font-face match on RN-Web).

type ScoreNumSize = 'sm' | 'md' | 'lg' | 'xl';

type ScoreNumProps = {
  value: string;
  size?: ScoreNumSize;
  color?: string;
};

const SIZE_PX: Record<ScoreNumSize, number> = {
  sm: 24,
  md: 36,
  lg: 56,
  xl: 72,
};

export function ScoreNum({
  value,
  size = 'lg',
  color = gray[950],
}: ScoreNumProps) {
  const fontSize = SIZE_PX[size];
  return (
    <Text
      style={[
        styles.score,
        { fontSize, lineHeight: Math.round(fontSize * 0.9), color },
      ]}
    >
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  score: {
    fontFamily: fontFamily.barlowCondensed.bold,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
});
