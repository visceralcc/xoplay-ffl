import { StyleSheet, Text } from 'react-native';
import { fontFamily, gray, spacing } from '@/theme';

// Compact position code text badge — rendered in roster tables, draft boards,
// trade builders, and player rows. Spec: specs/foundation/components/
// Component_PositionBadge.md.
//
// Always Barlow Condensed 600, always gray-700. Position-colored badges are
// a different element entirely — this one is intentionally neutral so it
// reads as data, not decoration. min-width per size keeps columns aligned
// even when codes vary in length (e.g. "QB" vs "FLEX").

type PositionBadgeSize = 'sm' | 'md' | 'lg';

type PositionBadgeProps = {
  position: string;
  size?: PositionBadgeSize;
};

export function PositionBadge({ position, size = 'sm' }: PositionBadgeProps) {
  return (
    <Text style={[styles.base, sizeStyles[size]]} numberOfLines={1}>
      {position}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fontFamily.barlowCondensed.semibold,
    color: gray[700],
    letterSpacing: 0.4,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
});

// lineHeight = height centers the glyph vertically without a wrapping View.
// Values per spec §"Size mapping".
const sizeStyles = StyleSheet.create({
  sm: { fontSize: 15, lineHeight: 20, height: 20, minWidth: 32 },
  md: { fontSize: 16, lineHeight: 22, height: 22, minWidth: 36 },
  lg: { fontSize: 18, lineHeight: 26, height: 26, minWidth: 40 },
});
